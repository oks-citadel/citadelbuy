import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

export interface WebhookEventRecord {
  eventId: string;
  provider: string;
  eventType: string;
  processedAt: Date;
  status: 'processing' | 'completed' | 'failed';
  metadata?: any;
}

/**
 * Webhook Idempotency Service
 *
 * Ensures that webhook events are processed exactly once, preventing duplicate
 * processing of the same event. Uses a dual-layer approach with Redis for fast
 * in-memory checks and database for persistence.
 *
 * Features:
 * - Dual-layer idempotency checking (Redis + Database)
 * - Automatic TTL for Redis entries to prevent memory bloat
 * - Database persistence for audit trail and long-term tracking
 * - Timeout protection with configurable processing window
 * - Thread-safe event locking to prevent concurrent processing
 *
 * Usage:
 * 1. Call checkAndLockEvent() before processing a webhook
 * 2. Process the webhook
 * 3. Call markEventCompleted() or markEventFailed() after processing
 */
@Injectable()
export class WebhookIdempotencyService {
  private readonly logger = new Logger(WebhookIdempotencyService.name);

  // TTL for Redis entries (7 days in seconds)
  private readonly REDIS_TTL = 7 * 24 * 60 * 60;

  // Processing timeout (5 minutes in milliseconds)
  private readonly PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;

  // Redis key prefix for webhook events
  private readonly WEBHOOK_EVENT_PREFIX = 'webhook:event:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Check if an event has been processed and lock it for processing
   *
   * @param eventId Unique event identifier from payment provider
   * @param provider Payment provider name (stripe, paypal, etc.)
   * @param eventType Type of event (payment_intent.succeeded, etc.)
   * @param metadata Additional metadata to store with the event
   * @returns True if event is new and locked for processing, false if already processed
   */
  async checkAndLockEvent(
    eventId: string,
    provider: string,
    eventType: string,
    metadata?: any,
  ): Promise<boolean> {
    const compositeKey = this.getCompositeKey(eventId, provider);

    try {
      // First, check Redis for fast lookup
      const redisCheck = await this.checkRedis(compositeKey);
      if (redisCheck !== null) {
        // Event exists in Redis
        if (redisCheck.status === 'completed') {
          this.logger.debug(
            `Event ${eventId} (${provider}) already completed (Redis)`,
          );
          return false;
        }

        // Check if processing timeout has expired
        if (redisCheck.status === 'processing') {
          const processingTime = Date.now() - new Date(redisCheck.processedAt).getTime();
          if (processingTime < this.PROCESSING_TIMEOUT_MS) {
            this.logger.warn(
              `Event ${eventId} (${provider}) is currently being processed`,
            );
            return false;
          }

          // Processing timeout expired, allow retry
          this.logger.warn(
            `Event ${eventId} (${provider}) processing timeout expired, allowing retry`,
          );
        }
      }

      // Check database for persistence
      const dbCheck = await this.checkDatabase(eventId, provider);
      if (dbCheck) {
        if (dbCheck.status === 'completed') {
          // Update Redis cache with completed status
          await this.setRedisCache(compositeKey, dbCheck);
          this.logger.debug(
            `Event ${eventId} (${provider}) already completed (Database)`,
          );
          return false;
        }

        // Check if processing timeout has expired
        if (dbCheck.status === 'processing') {
          const processingTime = Date.now() - dbCheck.processedAt.getTime();
          if (processingTime < this.PROCESSING_TIMEOUT_MS) {
            this.logger.warn(
              `Event ${eventId} (${provider}) is currently being processed (Database)`,
            );
            return false;
          }

          // Processing timeout expired, allow retry
          this.logger.warn(
            `Event ${eventId} (${provider}) processing timeout expired (Database), allowing retry`,
          );
        }
      }

      // Event is new or timeout expired, create lock
      const locked = await this.createEventLock(
        eventId,
        provider,
        eventType,
        metadata,
      );

      if (locked) {
        this.logger.log(
          `Event ${eventId} (${provider}) locked for processing`,
        );
      }

      return locked;
    } catch (error: any) {
      this.logger.error(
        `Error checking/locking event ${eventId} (${provider}): ${error.message}`,
        error.stack,
      );
      // On error, allow processing to prevent webhook failures
      return true;
    }
  }

  /**
   * Mark an event as successfully completed
   */
  async markEventCompleted(
    eventId: string,
    provider: string,
    metadata?: any,
  ): Promise<void> {
    const compositeKey = this.getCompositeKey(eventId, provider);

    try {
      // Update database
      await this.prisma.paymentWebhookEvent.update({
        where: {
          eventId_provider: {
            eventId,
            provider,
          },
        },
        data: {
          status: 'completed',
          metadata: metadata || {},
          updatedAt: new Date(),
        },
      });

      // Update Redis cache
      await this.setRedisCache(compositeKey, {
        eventId,
        provider,
        eventType: '',
        processedAt: new Date(),
        status: 'completed',
        metadata,
      });

      this.logger.log(
        `Event ${eventId} (${provider}) marked as completed`,
      );
    } catch (error: any) {
      this.logger.error(
        `Error marking event ${eventId} (${provider}) as completed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Mark an event as failed
   */
  async markEventFailed(
    eventId: string,
    provider: string,
    errorMessage?: string,
    metadata?: any,
  ): Promise<void> {
    const compositeKey = this.getCompositeKey(eventId, provider);

    try {
      // Update database
      await this.prisma.paymentWebhookEvent.update({
        where: {
          eventId_provider: {
            eventId,
            provider,
          },
        },
        data: {
          status: 'failed',
          metadata: {
            ...(metadata || {}),
            errorMessage,
            failedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        },
      });

      // Update Redis cache
      await this.setRedisCache(compositeKey, {
        eventId,
        provider,
        eventType: '',
        processedAt: new Date(),
        status: 'failed',
        metadata: { ...metadata, errorMessage },
      });

      this.logger.warn(
        `Event ${eventId} (${provider}) marked as failed: ${errorMessage}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Error marking event ${eventId} (${provider}) as failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get event processing history
   */
  async getEventHistory(
    eventId: string,
    provider: string,
  ): Promise<WebhookEventRecord | null> {
    try {
      const event = await this.prisma.paymentWebhookEvent.findUnique({
        where: {
          eventId_provider: {
            eventId,
            provider,
          },
        },
      });

      if (!event) {
        return null;
      }

      return {
        eventId: event.eventId,
        provider: event.provider,
        eventType: event.eventType,
        processedAt: event.processedAt,
        status: event.status as 'processing' | 'completed' | 'failed',
        metadata: event.metadata,
      };
    } catch (error: any) {
      this.logger.error(
        `Error getting event history for ${eventId} (${provider}): ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Clean up old events (called by cron job)
   * Removes events older than 30 days from the database
   */
  async cleanupOldEvents(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await this.prisma.paymentWebhookEvent.deleteMany({
        where: {
          processedAt: {
            lt: cutoffDate,
          },
          status: 'completed',
        },
      });

      this.logger.log(
        `Cleaned up ${result.count} webhook events older than ${daysToKeep} days`,
      );

      return result.count;
    } catch (error: any) {
      this.logger.error(
        `Error cleaning up old events: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Get statistics about webhook event processing
   */
  async getStatistics(provider?: string): Promise<{
    total: number;
    completed: number;
    failed: number;
    processing: number;
  }> {
    try {
      const where = provider ? { provider } : {};

      const [total, completed, failed, processing] = await Promise.all([
        this.prisma.paymentWebhookEvent.count({ where }),
        this.prisma.paymentWebhookEvent.count({
          where: { ...where, status: 'completed' },
        }),
        this.prisma.paymentWebhookEvent.count({
          where: { ...where, status: 'failed' },
        }),
        this.prisma.paymentWebhookEvent.count({
          where: { ...where, status: 'processing' },
        }),
      ]);

      return { total, completed, failed, processing };
    } catch (error: any) {
      this.logger.error(
        `Error getting webhook statistics: ${error.message}`,
      );
      return { total: 0, completed: 0, failed: 0, processing: 0 };
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * Generate composite key for Redis and database
   */
  private getCompositeKey(eventId: string, provider: string): string {
    return `${this.WEBHOOK_EVENT_PREFIX}${provider}:${eventId}`;
  }

  /**
   * Check Redis cache for event
   */
  private async checkRedis(
    compositeKey: string,
  ): Promise<WebhookEventRecord | null> {
    try {
      const cached = await this.redis.get<WebhookEventRecord>(compositeKey);
      return cached;
    } catch (error: any) {
      this.logger.error(
        `Redis check error for ${compositeKey}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Check database for event
   */
  private async checkDatabase(
    eventId: string,
    provider: string,
  ): Promise<WebhookEventRecord | null> {
    try {
      const event = await this.prisma.paymentWebhookEvent.findUnique({
        where: {
          eventId_provider: {
            eventId,
            provider,
          },
        },
      });

      if (!event) {
        return null;
      }

      return {
        eventId: event.eventId,
        provider: event.provider,
        eventType: event.eventType,
        processedAt: event.processedAt,
        status: event.status as 'processing' | 'completed' | 'failed',
        metadata: event.metadata,
      };
    } catch (error: any) {
      this.logger.error(
        `Database check error for ${eventId} (${provider}): ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Create event lock in database and Redis
   */
  private async createEventLock(
    eventId: string,
    provider: string,
    eventType: string,
    metadata?: any,
  ): Promise<boolean> {
    const compositeKey = this.getCompositeKey(eventId, provider);

    try {
      // Try to create in database (unique constraint ensures atomicity)
      const event = await this.prisma.paymentWebhookEvent.create({
        data: {
          eventId,
          provider,
          eventType,
          status: 'processing',
          processedAt: new Date(),
          metadata: metadata || {},
        },
      });

      // Cache in Redis
      await this.setRedisCache(compositeKey, {
        eventId: event.eventId,
        provider: event.provider,
        eventType: event.eventType,
        processedAt: event.processedAt,
        status: 'processing',
        metadata: event.metadata,
      });

      return true;
    } catch (error: any) {
      // Unique constraint violation means event already exists
      if (error.code === 'P2002') {
        this.logger.debug(
          `Event ${eventId} (${provider}) already exists in database`,
        );
        return false;
      }

      // Other errors
      this.logger.error(
        `Error creating event lock for ${eventId} (${provider}): ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Set Redis cache with TTL
   */
  private async setRedisCache(
    compositeKey: string,
    event: WebhookEventRecord,
  ): Promise<void> {
    try {
      await this.redis.set(compositeKey, event, this.REDIS_TTL);
    } catch (error: any) {
      // Redis errors shouldn't break the flow
      this.logger.error(
        `Error setting Redis cache for ${compositeKey}: ${error.message}`,
      );
    }
  }
}
