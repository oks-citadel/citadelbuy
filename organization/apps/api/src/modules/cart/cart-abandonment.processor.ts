import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { CartAbandonmentService } from './cart-abandonment.service';

export const CART_ABANDONMENT_QUEUE = 'cart-abandonment';

export enum CartAbandonmentJobType {
  DETECT_ABANDONED = 'detect-abandoned',
  SEND_REMINDER = 'send-reminder',
  PROCESS_EMAIL_QUEUE = 'process-email-queue',
  CLEANUP_OLD_RECORDS = 'cleanup-old-records',
}

export interface DetectAbandonedJobData {
  scheduledAt: Date;
}

export interface SendReminderJobData {
  abandonmentEmailId: string;
  cartId: string;
  email: string;
  reminderType: 'REMINDER_1HR' | 'REMINDER_24HR' | 'REMINDER_72HR';
}

export interface ProcessEmailQueueJobData {
  batchSize?: number;
}

export interface CleanupOldRecordsJobData {
  daysToKeep: number;
}

/**
 * Bull Queue Processor for Cart Abandonment
 *
 * This processor handles asynchronous cart abandonment tasks using Bull queues.
 * It provides better scalability and job management compared to simple cron jobs.
 *
 * Features:
 * - Detect abandoned carts
 * - Process reminder emails
 * - Handle email queue
 * - Cleanup old records
 * - Job retry with exponential backoff
 * - Job progress tracking
 * - Error handling and logging
 */
@Processor(CART_ABANDONMENT_QUEUE)
export class CartAbandonmentProcessor {
  private readonly logger = new Logger(CartAbandonmentProcessor.name);

  constructor(private readonly abandonmentService: CartAbandonmentService) {}

  /**
   * Process job to detect abandoned carts
   * Runs periodically to identify carts that have been inactive for too long
   */
  @Process(CartAbandonmentJobType.DETECT_ABANDONED)
  async handleDetectAbandoned(job: Job<DetectAbandonedJobData>) {
    this.logger.log(`Processing detect abandoned carts job ${job.id}`);

    try {
      const count = await this.abandonmentService.detectAbandonedCarts();

      await job.progress(100);

      return {
        success: true,
        cartsProcessed: count,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to detect abandoned carts in job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Process job to send individual reminder email
   * Used for scheduled reminder emails (1hr, 24hr, 72hr)
   */
  @Process(CartAbandonmentJobType.SEND_REMINDER)
  async handleSendReminder(job: Job<SendReminderJobData>) {
    this.logger.log(`Processing send reminder job ${job.id} for cart ${job.data.cartId}`);

    try {
      // The actual email sending is handled by processAbandonmentEmails
      // This job is primarily for tracking and scheduling
      const result = await this.abandonmentService.processAbandonmentEmails();

      await job.progress(100);

      return {
        success: true,
        emailsSent: result.sent,
        emailsFailed: result.failed,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to send reminder in job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Process job to handle email queue
   * Processes pending abandonment emails in batches
   */
  @Process(CartAbandonmentJobType.PROCESS_EMAIL_QUEUE)
  async handleProcessEmailQueue(job: Job<ProcessEmailQueueJobData>) {
    this.logger.log(`Processing email queue job ${job.id}`);

    try {
      const result = await this.abandonmentService.processAbandonmentEmails();

      await job.progress(100);

      return {
        success: true,
        sent: result.sent,
        failed: result.failed,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to process email queue in job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Process job to cleanup old abandonment records
   * Removes records older than specified retention period
   */
  @Process(CartAbandonmentJobType.CLEANUP_OLD_RECORDS)
  async handleCleanupOldRecords(job: Job<CleanupOldRecordsJobData>) {
    this.logger.log(`Processing cleanup job ${job.id}`);

    try {
      const { daysToKeep } = job.data;
      const count = await this.abandonmentService.cleanupOldAbandonments(daysToKeep);

      await job.progress(100);

      return {
        success: true,
        recordsDeleted: count,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to cleanup old records in job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Lifecycle hook: Called when a job becomes active
   */
  @OnQueueActive()
  onActive(job: Job) {
    this.logger.debug(
      `Processing job ${job.id} of type ${job.name} with data:`,
      JSON.stringify(job.data),
    );
  }

  /**
   * Lifecycle hook: Called when a job completes successfully
   */
  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(
      `Job ${job.id} of type ${job.name} completed successfully`,
      result,
    );
  }

  /**
   * Lifecycle hook: Called when a job fails
   */
  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} of type ${job.name} failed after ${job.attemptsMade} attempts:`,
      error.message,
    );

    // If job has exhausted all retries, log for manual intervention
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      this.logger.error(
        `Job ${job.id} has exhausted all retry attempts. Manual intervention may be required.`,
      );
    }
  }
}
