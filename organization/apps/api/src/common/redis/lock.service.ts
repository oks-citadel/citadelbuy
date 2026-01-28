import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import { REDIS_KEYS, CACHE_TTL } from './keys';
import { v4 as uuidv4 } from 'uuid';

/**
 * Lock acquisition result
 */
export interface LockResult {
  acquired: boolean;
  lockId?: string;
  expiresAt?: Date;
}

/**
 * Lock options
 */
export interface LockOptions {
  /** Time-to-live for the lock in seconds */
  ttlSeconds?: number;
  /** Maximum time to wait for lock acquisition in milliseconds */
  waitTimeMs?: number;
  /** Retry interval when waiting for lock in milliseconds */
  retryIntervalMs?: number;
  /** Unique identifier for this lock holder */
  ownerId?: string;
}

/**
 * Default lock options
 */
const DEFAULT_LOCK_OPTIONS: Required<LockOptions> = {
  ttlSeconds: 30, // 30 seconds default lock
  waitTimeMs: 0, // Don't wait by default (fail fast)
  retryIntervalMs: 100, // 100ms retry interval
  ownerId: '', // Will be generated if not provided
};

/**
 * Distributed Lock Service
 *
 * Provides Redis-based distributed locking for multi-instance safety.
 * Uses the Redlock algorithm principles for safe locking:
 * - SET NX (only set if not exists)
 * - Unique lock identifiers
 * - TTL to prevent deadlocks
 * - Safe release (only release if you own the lock)
 *
 * Features:
 * - Acquire lock with timeout
 * - Auto-release on TTL expiration
 * - Safe release (only owner can release)
 * - Lock extension for long-running operations
 * - withLock helper for automatic release
 */
@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);
  private readonly instanceId: string;

  constructor(private readonly redisService: RedisService) {
    // Generate unique instance ID for this worker/pod
    this.instanceId = `worker:${process.pid}:${uuidv4().substring(0, 8)}`;
    this.logger.log(`Lock service initialized with instance ID: ${this.instanceId}`);
  }

  /**
   * Acquire a distributed lock
   *
   * @param key - The lock key (will be prefixed with 'lock:')
   * @param options - Lock options
   * @returns Lock result with lockId if successful
   */
  async acquireLock(key: string, options?: LockOptions): Promise<LockResult> {
    const opts = { ...DEFAULT_LOCK_OPTIONS, ...options };
    const lockKey = REDIS_KEYS.LOCK(key);
    const lockId = opts.ownerId || `${this.instanceId}:${uuidv4()}`;
    const startTime = Date.now();

    // Try to acquire the lock
    const tryAcquire = async (): Promise<boolean> => {
      const lockValue = JSON.stringify({
        lockId,
        instanceId: this.instanceId,
        acquiredAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + opts.ttlSeconds * 1000).toISOString(),
      });

      return this.redisService.setNx(lockKey, lockValue, opts.ttlSeconds);
    };

    // First attempt
    if (await tryAcquire()) {
      this.logger.debug(`Lock acquired: ${lockKey} (ID: ${lockId})`);
      return {
        acquired: true,
        lockId,
        expiresAt: new Date(Date.now() + opts.ttlSeconds * 1000),
      };
    }

    // If no wait time, fail immediately
    if (opts.waitTimeMs <= 0) {
      this.logger.debug(`Lock not available (no wait): ${lockKey}`);
      return { acquired: false };
    }

    // Wait and retry
    while (Date.now() - startTime < opts.waitTimeMs) {
      await this.sleep(opts.retryIntervalMs);

      if (await tryAcquire()) {
        this.logger.debug(`Lock acquired after waiting: ${lockKey} (ID: ${lockId})`);
        return {
          acquired: true,
          lockId,
          expiresAt: new Date(Date.now() + opts.ttlSeconds * 1000),
        };
      }
    }

    this.logger.debug(`Lock acquisition timed out: ${lockKey}`);
    return { acquired: false };
  }

  /**
   * Release a distributed lock
   *
   * Only releases if the lock is owned by the provided lockId.
   * This prevents accidentally releasing locks held by other processes.
   *
   * @param key - The lock key
   * @param lockId - The lock ID returned from acquireLock
   * @returns true if lock was released, false otherwise
   */
  async releaseLock(key: string, lockId: string): Promise<boolean> {
    const lockKey = REDIS_KEYS.LOCK(key);

    try {
      // Get current lock value
      const currentValue = await this.redisService.get<{
        lockId: string;
        instanceId: string;
      }>(lockKey);

      if (!currentValue) {
        this.logger.debug(`Lock already released or expired: ${lockKey}`);
        return true; // Lock doesn't exist, consider it released
      }

      // Only release if we own the lock
      if (currentValue.lockId !== lockId) {
        this.logger.warn(
          `Cannot release lock ${lockKey}: owned by ${currentValue.lockId}, attempted by ${lockId}`,
        );
        return false;
      }

      // Delete the lock
      await this.redisService.del(lockKey);
      this.logger.debug(`Lock released: ${lockKey} (ID: ${lockId})`);
      return true;
    } catch (error) {
      this.logger.error(`Error releasing lock ${lockKey}:`, error);
      return false;
    }
  }

  /**
   * Extend a lock's TTL
   *
   * Useful for long-running operations that need more time.
   *
   * @param key - The lock key
   * @param lockId - The lock ID returned from acquireLock
   * @param additionalSeconds - Additional seconds to add to TTL
   * @returns true if lock was extended, false otherwise
   */
  async extendLock(
    key: string,
    lockId: string,
    additionalSeconds: number,
  ): Promise<boolean> {
    const lockKey = REDIS_KEYS.LOCK(key);

    try {
      // Get current lock value
      const currentValue = await this.redisService.get<{
        lockId: string;
        instanceId: string;
        acquiredAt: string;
      }>(lockKey);

      if (!currentValue || currentValue.lockId !== lockId) {
        this.logger.warn(`Cannot extend lock ${lockKey}: not owned`);
        return false;
      }

      // Update the lock with new expiration
      const newValue = {
        ...currentValue,
        expiresAt: new Date(Date.now() + additionalSeconds * 1000).toISOString(),
        extendedAt: new Date().toISOString(),
      };

      await this.redisService.set(lockKey, newValue, additionalSeconds);
      this.logger.debug(`Lock extended: ${lockKey} by ${additionalSeconds}s`);
      return true;
    } catch (error) {
      this.logger.error(`Error extending lock ${lockKey}:`, error);
      return false;
    }
  }

  /**
   * Check if a lock exists
   *
   * @param key - The lock key
   * @returns Lock info if exists, null otherwise
   */
  async getLockInfo(key: string): Promise<{
    lockId: string;
    instanceId: string;
    acquiredAt: string;
    expiresAt: string;
  } | null> {
    const lockKey = REDIS_KEYS.LOCK(key);
    return this.redisService.get(lockKey);
  }

  /**
   * Execute a function with a lock
   *
   * Automatically acquires the lock before execution and releases after.
   * If lock cannot be acquired, throws an error.
   *
   * @param key - The lock key
   * @param fn - The function to execute
   * @param options - Lock options
   * @returns The result of the function
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    options?: LockOptions,
  ): Promise<T> {
    const lockResult = await this.acquireLock(key, options);

    if (!lockResult.acquired || !lockResult.lockId) {
      throw new Error(`Failed to acquire lock for key: ${key}`);
    }

    try {
      // Execute the function
      const result = await fn();
      return result;
    } finally {
      // Always release the lock
      await this.releaseLock(key, lockResult.lockId);
    }
  }

  /**
   * Execute a function with a lock, returning null if lock cannot be acquired
   *
   * @param key - The lock key
   * @param fn - The function to execute
   * @param options - Lock options
   * @returns The result of the function, or null if lock not acquired
   */
  async tryWithLock<T>(
    key: string,
    fn: () => Promise<T>,
    options?: LockOptions,
  ): Promise<T | null> {
    const lockResult = await this.acquireLock(key, options);

    if (!lockResult.acquired || !lockResult.lockId) {
      this.logger.debug(`Skipping execution, lock not available: ${key}`);
      return null;
    }

    try {
      const result = await fn();
      return result;
    } finally {
      await this.releaseLock(key, lockResult.lockId);
    }
  }

  /**
   * Force release a lock (admin operation)
   *
   * Use with caution - this will release the lock regardless of ownership.
   *
   * @param key - The lock key
   */
  async forceReleaseLock(key: string): Promise<void> {
    const lockKey = REDIS_KEYS.LOCK(key);
    await this.redisService.del(lockKey);
    this.logger.warn(`Lock force released: ${lockKey}`);
  }

  /**
   * Get all active locks (admin operation)
   *
   * @returns List of active lock keys
   */
  async getActiveLocks(): Promise<string[]> {
    return this.redisService.keys('lock:*');
  }

  /**
   * Helper sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
