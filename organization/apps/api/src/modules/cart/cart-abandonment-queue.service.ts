import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, JobOptions } from 'bull';
import {
  CART_ABANDONMENT_QUEUE,
  CartAbandonmentJobType,
  DetectAbandonedJobData,
  SendReminderJobData,
  ProcessEmailQueueJobData,
  CleanupOldRecordsJobData,
} from './cart-abandonment.processor';

/**
 * Cart Abandonment Queue Service
 *
 * Manages Bull queue jobs for cart abandonment processing.
 * Provides methods to schedule and manage abandonment-related jobs.
 *
 * Features:
 * - Job scheduling with delays
 * - Retry logic with exponential backoff
 * - Priority-based job processing
 * - Job status monitoring
 * - Queue cleanup and management
 */
@Injectable()
export class CartAbandonmentQueueService {
  private readonly logger = new Logger(CartAbandonmentQueueService.name);

  constructor(
    @InjectQueue(CART_ABANDONMENT_QUEUE)
    private readonly abandonmentQueue: Queue,
  ) {}

  /**
   * Default job options with retry logic
   */
  private getDefaultJobOptions(): JobOptions {
    return {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000, // Start with 2 seconds
      },
      removeOnComplete: true,
      removeOnFail: false, // Keep failed jobs for debugging
    };
  }

  /**
   * Schedule a job to detect abandoned carts
   */
  async scheduleDetectAbandoned(delay: number = 0): Promise<void> {
    const jobData: DetectAbandonedJobData = {
      scheduledAt: new Date(),
    };

    await this.abandonmentQueue.add(
      CartAbandonmentJobType.DETECT_ABANDONED,
      jobData,
      {
        ...this.getDefaultJobOptions(),
        delay,
        priority: 5, // Medium priority
      },
    );

    this.logger.log(`Scheduled detect abandoned carts job with delay ${delay}ms`);
  }

  /**
   * Schedule a reminder email to be sent
   */
  async scheduleSendReminder(
    abandonmentEmailId: string,
    cartId: string,
    email: string,
    reminderType: 'REMINDER_1HR' | 'REMINDER_24HR' | 'REMINDER_72HR',
    delay: number,
  ): Promise<void> {
    const jobData: SendReminderJobData = {
      abandonmentEmailId,
      cartId,
      email,
      reminderType,
    };

    await this.abandonmentQueue.add(
      CartAbandonmentJobType.SEND_REMINDER,
      jobData,
      {
        ...this.getDefaultJobOptions(),
        delay,
        priority: this.getReminderPriority(reminderType),
        jobId: `reminder-${abandonmentEmailId}`, // Prevent duplicate jobs
      },
    );

    this.logger.log(
      `Scheduled ${reminderType} reminder for cart ${cartId} with delay ${delay}ms`,
    );
  }

  /**
   * Get priority level for different reminder types
   */
  private getReminderPriority(
    reminderType: 'REMINDER_1HR' | 'REMINDER_24HR' | 'REMINDER_72HR',
  ): number {
    switch (reminderType) {
      case 'REMINDER_1HR':
        return 8; // High priority - first reminder
      case 'REMINDER_24HR':
        return 5; // Medium priority
      case 'REMINDER_72HR':
        return 3; // Low priority - last chance
      default:
        return 5;
    }
  }

  /**
   * Schedule a job to process email queue
   */
  async scheduleProcessEmailQueue(
    batchSize?: number,
    delay: number = 0,
  ): Promise<void> {
    const jobData: ProcessEmailQueueJobData = { batchSize };

    await this.abandonmentQueue.add(
      CartAbandonmentJobType.PROCESS_EMAIL_QUEUE,
      jobData,
      {
        ...this.getDefaultJobOptions(),
        delay,
        priority: 6, // Medium-high priority
      },
    );

    this.logger.log(`Scheduled process email queue job with delay ${delay}ms`);
  }

  /**
   * Schedule a job to cleanup old records
   */
  async scheduleCleanupOldRecords(
    daysToKeep: number = 90,
    delay: number = 0,
  ): Promise<void> {
    const jobData: CleanupOldRecordsJobData = { daysToKeep };

    await this.abandonmentQueue.add(
      CartAbandonmentJobType.CLEANUP_OLD_RECORDS,
      jobData,
      {
        ...this.getDefaultJobOptions(),
        delay,
        priority: 1, // Low priority - maintenance task
      },
    );

    this.logger.log(
      `Scheduled cleanup job for records older than ${daysToKeep} days with delay ${delay}ms`,
    );
  }

  /**
   * Add recurring job to detect abandoned carts
   * Runs every 15 minutes
   */
  async addRecurringDetectAbandoned(): Promise<void> {
    await this.abandonmentQueue.add(
      CartAbandonmentJobType.DETECT_ABANDONED,
      { scheduledAt: new Date() },
      {
        ...this.getDefaultJobOptions(),
        repeat: {
          every: 15 * 60 * 1000, // Every 15 minutes
        },
        jobId: 'recurring-detect-abandoned',
      },
    );

    this.logger.log('Added recurring detect abandoned carts job (every 15 minutes)');
  }

  /**
   * Add recurring job to process email queue
   * Runs every 5 minutes
   */
  async addRecurringProcessEmailQueue(): Promise<void> {
    await this.abandonmentQueue.add(
      CartAbandonmentJobType.PROCESS_EMAIL_QUEUE,
      {},
      {
        ...this.getDefaultJobOptions(),
        repeat: {
          every: 5 * 60 * 1000, // Every 5 minutes
        },
        jobId: 'recurring-process-email-queue',
      },
    );

    this.logger.log('Added recurring process email queue job (every 5 minutes)');
  }

  /**
   * Add recurring job to cleanup old records
   * Runs monthly at 3 AM on the 1st
   */
  async addRecurringCleanup(): Promise<void> {
    await this.abandonmentQueue.add(
      CartAbandonmentJobType.CLEANUP_OLD_RECORDS,
      { daysToKeep: 90 },
      {
        ...this.getDefaultJobOptions(),
        repeat: {
          cron: '0 3 1 * *', // 3 AM on the 1st of each month
        },
        jobId: 'recurring-cleanup-old-records',
      },
    );

    this.logger.log('Added recurring cleanup job (monthly at 3 AM on the 1st)');
  }

  /**
   * Initialize all recurring jobs
   */
  async initializeRecurringJobs(): Promise<void> {
    this.logger.log('Initializing recurring cart abandonment jobs...');

    try {
      // Remove existing recurring jobs to avoid duplicates
      const repeatableJobs = await this.abandonmentQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        await this.abandonmentQueue.removeRepeatableByKey(job.key);
      }

      // Add recurring jobs
      await this.addRecurringDetectAbandoned();
      await this.addRecurringProcessEmailQueue();
      await this.addRecurringCleanup();

      this.logger.log('Successfully initialized recurring cart abandonment jobs');
    } catch (error) {
      this.logger.error('Failed to initialize recurring jobs:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.abandonmentQueue.getWaitingCount(),
      this.abandonmentQueue.getActiveCount(),
      this.abandonmentQueue.getCompletedCount(),
      this.abandonmentQueue.getFailedCount(),
      this.abandonmentQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Get failed jobs for monitoring
   */
  async getFailedJobs(limit: number = 10) {
    return this.abandonmentQueue.getFailed(0, limit - 1);
  }

  /**
   * Retry a failed job
   */
  async retryFailedJob(jobId: string): Promise<void> {
    const job = await this.abandonmentQueue.getJob(jobId);
    if (job) {
      await job.retry();
      this.logger.log(`Retrying failed job ${jobId}`);
    } else {
      throw new Error(`Job ${jobId} not found`);
    }
  }

  /**
   * Remove a failed job
   */
  async removeFailedJob(jobId: string): Promise<void> {
    const job = await this.abandonmentQueue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Removed failed job ${jobId}`);
    }
  }

  /**
   * Clean old jobs from the queue
   */
  async cleanQueue(
    gracePeriod: number = 24 * 60 * 60 * 1000, // 24 hours
  ): Promise<void> {
    await this.abandonmentQueue.clean(gracePeriod, 'completed');
    await this.abandonmentQueue.clean(gracePeriod * 7, 'failed'); // Keep failed jobs longer
    this.logger.log(`Cleaned queue jobs older than ${gracePeriod}ms`);
  }

  /**
   * Pause the queue
   */
  async pauseQueue(): Promise<void> {
    await this.abandonmentQueue.pause();
    this.logger.log('Cart abandonment queue paused');
  }

  /**
   * Resume the queue
   */
  async resumeQueue(): Promise<void> {
    await this.abandonmentQueue.resume();
    this.logger.log('Cart abandonment queue resumed');
  }

  /**
   * Get queue health status
   */
  async getQueueHealth() {
    const stats = await this.getQueueStats();
    const isPaused = await this.abandonmentQueue.isPaused();

    return {
      healthy: !isPaused && stats.active < 100 && stats.failed < 50,
      isPaused,
      stats,
      message: isPaused
        ? 'Queue is paused'
        : stats.failed > 50
          ? 'High failure rate detected'
          : stats.active > 100
            ? 'Queue is overloaded'
            : 'Queue is healthy',
    };
  }
}
