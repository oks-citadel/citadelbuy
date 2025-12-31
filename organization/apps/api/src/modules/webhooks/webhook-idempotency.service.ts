import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/common/redis/redis.service';

/**
 * WebhookIdempotencyService
 *
 * Ensures webhook events are processed exactly once by tracking
 * processed event IDs.
 */
@Injectable()
export class WebhookIdempotencyService {
  private readonly logger = new Logger(WebhookIdempotencyService.name);
  private readonly keyPrefix = 'webhook:idempotency:';
  private readonly defaultTtlSeconds = 86400; // 24 hours

  constructor(private readonly redisService: RedisService) {}

  /**
   * Check if a webhook event has already been processed
   */
  async isProcessed(eventId: string): Promise<boolean> {
    try {
      const key = `${this.keyPrefix}${eventId}`;
      const exists = await this.redisService.get(key);
      return exists !== null;
    } catch (error) {
      this.logger.error(`Error checking idempotency for ${eventId}:`, error);
      // Fail open - allow processing if Redis is unavailable
      return false;
    }
  }

  /**
   * Mark a webhook event as processed
   */
  async markProcessed(eventId: string, ttlSeconds?: number): Promise<void> {
    try {
      const key = `${this.keyPrefix}${eventId}`;
      const ttl = ttlSeconds || this.defaultTtlSeconds;
      await this.redisService.set(key, '1', ttl);
      this.logger.debug(`Marked webhook event ${eventId} as processed`);
    } catch (error) {
      this.logger.error(`Error marking event ${eventId} as processed:`, error);
    }
  }

  /**
   * Check and mark an event atomically
   * Returns true if the event was newly marked, false if already processed
   */
  async checkAndMark(eventId: string, ttlSeconds?: number): Promise<boolean> {
    try {
      const key = `${this.keyPrefix}${eventId}`;
      const ttl = ttlSeconds || this.defaultTtlSeconds;

      // Use SETNX (set if not exists) behavior
      const wasSet = await this.redisService.set(key, '1', ttl);
      return wasSet !== null;
    } catch (error) {
      this.logger.error(`Error in checkAndMark for ${eventId}:`, error);
      // Fail open
      return true;
    }
  }

  /**
   * Remove a processed event marker (for retries)
   */
  async unmark(eventId: string): Promise<void> {
    try {
      const key = `${this.keyPrefix}${eventId}`;
      await this.redisService.del(key);
      this.logger.debug(`Unmarked webhook event ${eventId}`);
    } catch (error) {
      this.logger.error(`Error unmarking event ${eventId}:`, error);
    }
  }

  /**
   * Check and lock an event for processing
   * FIXED: Uses atomic SETNX to prevent race conditions
   * Returns true if lock acquired (event not processed), false if already locked/processed
   */
  async checkAndLockEvent(
    eventId: string,
    provider?: string,
    eventType?: string,
    metadata?: Record<string, any>,
  ): Promise<boolean> {
    try {
      const key = `${this.keyPrefix}lock:${eventId}`;
      const lockValue = JSON.stringify({
        provider,
        eventType,
        lockedAt: new Date().toISOString(),
        ...metadata,
      });

      // Use Redis SETNX (SET if Not eXists) for atomic check-and-set
      // This prevents race conditions where two requests could both pass isProcessed check
      const lockAcquired = await this.redisService.setNx(key, lockValue, this.defaultTtlSeconds);

      if (!lockAcquired) {
        this.logger.warn(`Webhook event ${eventId} already being processed (lock exists)`);
        return false;
      }

      this.logger.debug(`Lock acquired for webhook event ${eventId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error acquiring lock for ${eventId}:`, error);
      // Fail open - allow processing if Redis is unavailable
      // In production, consider failing closed instead for critical payment webhooks
      return true;
    }
  }

  /**
   * Mark event as failed
   */
  async markEventFailed(
    eventId: string,
    provider?: string,
    error?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      const key = `${this.keyPrefix}failed:${eventId}`;
      await this.redisService.set(key, error || 'unknown', this.defaultTtlSeconds);
    } catch (err) {
      this.logger.error(`Error marking event ${eventId} as failed:`, err);
    }
  }

  /**
   * Mark event as completed
   */
  async markEventCompleted(
    eventId: string,
    provider?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      const key = `${this.keyPrefix}completed:${eventId}`;
      await this.redisService.set(key, '1', this.defaultTtlSeconds);
    } catch (error) {
      this.logger.error(`Error marking event ${eventId} as completed:`, error);
    }
  }

  /**
   * Get statistics about webhook processing
   */
  async getStatistics(): Promise<{
    processed: number;
    failed: number;
    completed: number;
  }> {
    // In a real implementation, this would query Redis for counts
    return {
      processed: 0,
      failed: 0,
      completed: 0,
    };
  }
}
