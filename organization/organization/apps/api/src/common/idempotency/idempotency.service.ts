import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/common/redis/redis.service';

export interface IdempotencyRecord {
  status: 'processing' | 'completed' | 'failed';
  requestHash?: string;
  response?: any;
  statusCode?: number;
  startedAt: string;
  completedAt?: string;
  expiresAt?: string;
}

export interface IdempotencyOptions {
  ttlSeconds?: number;
  scope?: string;
  includeBody?: boolean;
  includeQuery?: boolean;
}

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly keyPrefix = 'idempotency:';
  private readonly defaultTtlSeconds = 86400; // 24 hours

  constructor(private readonly redisService: RedisService) {}

  /**
   * Generate a composite idempotency key
   * Includes user context to prevent cross-user conflicts
   */
  generateKey(
    idempotencyKey: string,
    userId: string,
    method: string,
    path: string,
    scope?: string,
  ): string {
    const parts = [
      this.keyPrefix,
      scope || 'default',
      userId,
      method,
      path,
      idempotencyKey,
    ];
    return parts.join(':');
  }

  /**
   * Try to acquire lock for an idempotency key
   * Returns true if lock was acquired (first request)
   * Returns false if key already exists (duplicate request)
   */
  async tryAcquireLock(
    compositeKey: string,
    requestHash?: string,
    ttlSeconds?: number,
  ): Promise<{ acquired: boolean; existingRecord?: IdempotencyRecord }> {
    const lockKey = `${compositeKey}:lock`;
    const ttl = ttlSeconds || this.defaultTtlSeconds;

    const record: IdempotencyRecord = {
      status: 'processing',
      requestHash,
      startedAt: new Date().toISOString(),
    };

    const acquired = await this.redisService.setNx(
      lockKey,
      record,
      ttl,
    );

    if (!acquired) {
      // Lock exists, check for cached response
      const existingRecord = await this.redisService.get<IdempotencyRecord>(lockKey);
      return { acquired: false, existingRecord: existingRecord ?? undefined };
    }

    return { acquired: true };
  }

  /**
   * Get cached response for an idempotency key
   */
  async getCachedResponse(compositeKey: string): Promise<any | null> {
    const responseKey = `${compositeKey}:response`;
    return this.redisService.get<any>(responseKey);
  }

  /**
   * Store successful response for an idempotency key
   */
  async storeResponse(
    compositeKey: string,
    response: any,
    statusCode: number,
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl = ttlSeconds || this.defaultTtlSeconds;
    const lockKey = `${compositeKey}:lock`;
    const responseKey = `${compositeKey}:response`;

    try {
      // Store response
      await this.redisService.set(
        responseKey,
        { data: response, statusCode },
        ttl,
      );

      // Update lock status
      const record: IdempotencyRecord = {
        status: 'completed',
        statusCode,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      await this.redisService.set(lockKey, record, ttl);

      this.logger.debug(`Cached idempotent response for key: ${compositeKey}`);
    } catch (error) {
      this.logger.error(`Failed to cache idempotent response: ${error.message}`);
      // Don't throw - caching failure shouldn't fail the request
    }
  }

  /**
   * Release lock on failure (allows retry)
   */
  async releaseLock(compositeKey: string): Promise<void> {
    const lockKey = `${compositeKey}:lock`;
    try {
      await this.redisService.del(lockKey);
      this.logger.debug(`Released idempotency lock for key: ${compositeKey}`);
    } catch (error) {
      this.logger.error(`Failed to release idempotency lock: ${error.message}`);
    }
  }

  /**
   * Mark request as failed (keeps lock but allows inspection)
   */
  async markFailed(
    compositeKey: string,
    errorMessage: string,
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl = ttlSeconds || 3600; // 1 hour for failed requests
    const lockKey = `${compositeKey}:lock`;

    const record: IdempotencyRecord = {
      status: 'failed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    await this.redisService.set(lockKey, record, ttl);
  }

  /**
   * Check if a request with this idempotency key is currently processing
   */
  async isProcessing(compositeKey: string): Promise<boolean> {
    const lockKey = `${compositeKey}:lock`;
    const record = await this.redisService.get<IdempotencyRecord>(lockKey);
    return record?.status === 'processing';
  }

  /**
   * Get the status of an idempotency key
   */
  async getStatus(compositeKey: string): Promise<IdempotencyRecord | null> {
    const lockKey = `${compositeKey}:lock`;
    return this.redisService.get<IdempotencyRecord>(lockKey);
  }

  /**
   * Create a hash of request body for comparison
   * Useful for detecting mismatched requests with same key
   */
  hashRequestBody(body: any): string {
    if (!body) return '';
    const str = JSON.stringify(body, Object.keys(body).sort());
    // Simple hash for comparison (not cryptographic)
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  /**
   * Clean up expired idempotency keys (for maintenance)
   */
  async cleanupExpiredKeys(): Promise<number> {
    // Redis handles TTL automatically, but this can be used for manual cleanup
    const pattern = `${this.keyPrefix}*`;
    const keys = await this.redisService.keys(pattern);

    let cleaned = 0;
    for (const key of keys) {
      const ttl = await this.redisService.ttl(key);
      if (ttl <= 0) {
        await this.redisService.del(key);
        cleaned++;
      }
    }

    this.logger.log(`Cleaned up ${cleaned} expired idempotency keys`);
    return cleaned;
  }
}
