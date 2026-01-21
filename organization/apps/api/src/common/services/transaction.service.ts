import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma, PrismaClient } from '@prisma/client';
import { OptimisticLockException, StaleUpdateException } from '@/common/exceptions/optimistic-lock.exception';

type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export interface TransactionOptions {
  maxRetries?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
  timeout?: number;
}

export interface OptimisticUpdateOptions<T> {
  entityName: string;
  entityId: string;
  expectedUpdatedAt: Date;
  updateFn: (tx: TransactionClient) => Promise<T>;
}

/**
 * Transaction Service
 *
 * Provides utilities for handling database transactions with:
 * - Automatic retry logic for deadlocks
 * - Optimistic locking support
 * - Configurable isolation levels
 */
@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Execute a transaction with automatic retry on deadlock
   * Supports configurable isolation level and retry count
   */
  async executeWithRetry<T>(
    operation: (tx: TransactionClient) => Promise<T>,
    options: TransactionOptions = {},
  ): Promise<T> {
    const { maxRetries = 3, isolationLevel, timeout = 5000 } = options;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.prisma.$transaction(
          operation,
          {
            isolationLevel,
            timeout,
          },
        );
        return result;
      } catch (error) {
        lastError = error;

        if (this.isDeadlockError(error) && attempt < maxRetries) {
          // Exponential backoff with jitter
          const baseDelay = Math.pow(2, attempt) * 100; // 200ms, 400ms, 800ms
          const jitter = Math.random() * 100;
          const delay = baseDelay + jitter;

          this.logger.warn(
            `Deadlock detected (attempt ${attempt}/${maxRetries}), retrying in ${delay.toFixed(0)}ms`,
          );

          await this.sleep(delay);
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Execute a serializable transaction (strongest isolation)
   * Use for critical operations like payment processing
   */
  async executeSerializable<T>(
    operation: (tx: TransactionClient) => Promise<T>,
    maxRetries: number = 3,
  ): Promise<T> {
    return this.executeWithRetry(operation, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxRetries,
    });
  }

  /**
   * Execute update with optimistic locking
   * Verifies the record hasn't been modified since it was read
   */
  async executeOptimisticUpdate<T>(
    options: OptimisticUpdateOptions<T>,
  ): Promise<T> {
    const { entityName, entityId, expectedUpdatedAt, updateFn } = options;

    return this.executeWithRetry(async (tx) => {
      // First verify the record hasn't been modified
      const tableName = this.getTableName(entityName);

      // Check current version
      const current = await (tx as any)[tableName].findUnique({
        where: { id: entityId },
        select: { updatedAt: true },
      });

      if (!current) {
        throw new Error(`${entityName} not found: ${entityId}`);
      }

      // Compare timestamps (allowing for small differences due to precision)
      const timeDiff = Math.abs(
        current.updatedAt.getTime() - expectedUpdatedAt.getTime(),
      );

      if (timeDiff > 1000) {
        // More than 1 second difference
        throw new OptimisticLockException(
          entityName,
          entityId,
          expectedUpdatedAt,
          current.updatedAt,
        );
      }

      // Proceed with update
      return updateFn(tx);
    });
  }

  /**
   * Lock a row for update using SELECT FOR UPDATE
   * Blocks other transactions from modifying the row until this transaction completes
   */
  async lockForUpdate<T>(
    entityName: string,
    entityId: string,
    operation: (tx: TransactionClient, entity: T) => Promise<T>,
  ): Promise<T> {
    return this.executeWithRetry(async (tx) => {
      const tableName = this.getTableName(entityName);

      // Use raw query for SELECT FOR UPDATE
      const entities = await tx.$queryRaw<T[]>`
        SELECT * FROM "${Prisma.raw(tableName)}"
        WHERE id = ${entityId}
        FOR UPDATE
      `;

      if (!entities || entities.length === 0) {
        throw new Error(`${entityName} not found: ${entityId}`);
      }

      return operation(tx, entities[0]);
    });
  }

  /**
   * Acquire a distributed lock for a resource
   * Uses advisory locks in PostgreSQL
   */
  async withAdvisoryLock<T>(
    lockKey: string,
    operation: () => Promise<T>,
    timeout: number = 5000,
  ): Promise<T> {
    const lockId = this.hashStringToInt(lockKey);

    try {
      // Try to acquire lock with timeout
      const acquired = await this.prisma.$queryRaw<[{ pg_try_advisory_lock: boolean }]>`
        SELECT pg_try_advisory_lock(${lockId})
      `;

      if (!acquired[0]?.pg_try_advisory_lock) {
        throw new StaleUpdateException(
          `Could not acquire lock for ${lockKey}. Another operation is in progress.`,
        );
      }

      // Execute the operation
      return await operation();
    } finally {
      // Always release the lock
      await this.prisma.$queryRaw`
        SELECT pg_advisory_unlock(${lockId})
      `.catch((err) => {
        this.logger.error(`Failed to release advisory lock: ${err.message}`);
      });
    }
  }

  /**
   * Check if an error is a deadlock error
   */
  private isDeadlockError(error: any): boolean {
    const message = error?.message?.toLowerCase() || '';
    const code = error?.code;

    // Prisma P2034 is "Transaction failed due to a write conflict or a deadlock"
    if (code === 'P2034') return true;

    // PostgreSQL deadlock error
    if (code === '40P01') return true;

    // Check message for deadlock indicators
    return (
      message.includes('deadlock') ||
      message.includes('could not serialize access') ||
      message.includes('lock timeout')
    );
  }

  /**
   * Allowlist of valid Prisma model names
   * SECURITY: Prevents SQL injection by validating entity names against known models
   */
  private readonly VALID_ENTITY_NAMES = [
    'User', 'Organization', 'Order', 'Product', 'Cart', 'CartItem',
    'Payment', 'Inventory', 'InventoryReservation', 'Subscription',
    'Coupon', 'GiftCard', 'Review', 'Category', 'Address', 'Session',
    'Vendor', 'Deal', 'Wishlist', 'WishlistItem', 'Notification',
    'OrganizationMember', 'OrganizationInvitation', 'OrganizationAuditLog',
  ] as const;

  /**
   * Convert entity name to table name
   * SECURITY: Validates entity name against allowlist to prevent SQL injection
   */
  private getTableName(entityName: string): string {
    // SECURITY: Validate entity name against allowlist
    if (!this.VALID_ENTITY_NAMES.includes(entityName as any)) {
      this.logger.error(`Invalid entity name attempted: ${entityName}`);
      throw new Error(`Invalid entity name: ${entityName}. Entity must be one of the allowed values.`);
    }

    // Convert PascalCase to snake_case
    return entityName
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .slice(1);
  }

  /**
   * Hash a string to an integer for advisory locks
   */
  private hashStringToInt(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
