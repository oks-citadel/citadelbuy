import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EmailType, EmailStatus } from '@prisma/client';
import { SendEmailDto } from './dto/send-email.dto';

export enum EmailPriority {
  HIGH = 1,
  NORMAL = 5,
  LOW = 10,
}

export interface EmailJobData {
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  type: EmailType;
  userId?: string;
  templateId?: string;
  metadata?: any;
  trackingEnabled?: boolean;
}

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    private prisma: PrismaService,
  ) {}

  /**
   * Add email to queue with priority
   */
  async addEmailToQueue(
    emailData: EmailJobData,
    priority: EmailPriority = EmailPriority.NORMAL,
    delay?: number,
  ): Promise<Job<EmailJobData>> {
    try {
      // Create email log in database
      const emailLog = await this.prisma.emailLog.create({
        data: {
          userId: emailData.userId,
          to: emailData.to,
          cc: emailData.cc || [],
          bcc: emailData.bcc || [],
          subject: emailData.subject,
          htmlContent: emailData.htmlContent,
          textContent: emailData.textContent,
          type: emailData.type,
          status: EmailStatus.QUEUED,
          metadata: emailData.metadata,
          templateId: emailData.templateId,
        },
      });

      // Add to Bull queue
      const job = await this.emailQueue.add(
        {
          ...emailData,
          emailLogId: emailLog.id,
        },
        {
          priority,
          delay,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2 seconds
          },
          removeOnComplete: false, // Keep completed jobs for analytics
          removeOnFail: false, // Keep failed jobs for debugging
        },
      );

      this.logger.log(
        `Email queued: ${job.id} (priority: ${priority}, to: ${emailData.to})`,
      );

      return job;
    } catch (error) {
      this.logger.error('Failed to queue email', error);
      throw error;
    }
  }

  /**
   * Queue welcome email (HIGH priority)
   */
  async queueWelcomeEmail(
    email: string,
    name: string,
    userId?: string,
  ): Promise<Job<EmailJobData>> {
    return this.addEmailToQueue(
      {
        to: email,
        subject: 'Welcome to CitadelBuy!',
        htmlContent: '', // Will be populated by processor using template
        type: EmailType.TRANSACTIONAL,
        userId,
        metadata: { name, templateName: 'welcome' },
        trackingEnabled: true,
      },
      EmailPriority.HIGH,
    );
  }

  /**
   * Queue password reset email (HIGH priority)
   */
  async queuePasswordResetEmail(
    email: string,
    resetToken: string,
    userId?: string,
  ): Promise<Job<EmailJobData>> {
    return this.addEmailToQueue(
      {
        to: email,
        subject: 'Reset Your Password',
        htmlContent: '', // Will be populated by processor
        type: EmailType.TRANSACTIONAL,
        userId,
        metadata: { resetToken, templateName: 'password-reset' },
        trackingEnabled: true,
      },
      EmailPriority.HIGH,
    );
  }

  /**
   * Queue order confirmation email (HIGH priority)
   */
  async queueOrderConfirmation(
    email: string,
    orderData: any,
    userId?: string,
  ): Promise<Job<EmailJobData>> {
    return this.addEmailToQueue(
      {
        to: email,
        subject: `Order Confirmed - #${orderData.orderNumber}`,
        htmlContent: '', // Will be populated by processor
        type: EmailType.TRANSACTIONAL,
        userId,
        metadata: { ...orderData, templateName: 'order-confirmation' },
        trackingEnabled: true,
      },
      EmailPriority.HIGH,
    );
  }

  /**
   * Queue shipping update email (NORMAL priority)
   */
  async queueShippingUpdate(
    email: string,
    shippingData: any,
    userId?: string,
  ): Promise<Job<EmailJobData>> {
    return this.addEmailToQueue(
      {
        to: email,
        subject: `Shipping Update - Order #${shippingData.orderNumber}`,
        htmlContent: '', // Will be populated by processor
        type: EmailType.NOTIFICATION,
        userId,
        metadata: { ...shippingData, templateName: 'shipping-update' },
        trackingEnabled: true,
      },
      EmailPriority.NORMAL,
    );
  }

  /**
   * Queue cart abandonment email (LOW priority, with delay)
   */
  async queueCartAbandonmentEmail(
    email: string,
    cartData: any,
    userId?: string,
    delayMinutes: number = 60,
  ): Promise<Job<EmailJobData>> {
    const delayMs = delayMinutes * 60 * 1000;

    return this.addEmailToQueue(
      {
        to: email,
        subject: 'You left items in your cart',
        htmlContent: '', // Will be populated by processor
        type: EmailType.MARKETING,
        userId,
        metadata: { ...cartData, templateName: 'cart-abandonment' },
        trackingEnabled: true,
      },
      EmailPriority.LOW,
      delayMs,
    );
  }

  /**
   * Queue marketing/promotional email (LOW priority)
   */
  async queueMarketingEmail(
    recipients: string[],
    subject: string,
    htmlContent: string,
    metadata?: any,
  ): Promise<Job<EmailJobData>[]> {
    const jobs: Job<EmailJobData>[] = [];

    for (const recipient of recipients) {
      const job = await this.addEmailToQueue(
        {
          to: recipient,
          subject,
          htmlContent,
          type: EmailType.MARKETING,
          metadata,
          trackingEnabled: true,
        },
        EmailPriority.LOW,
      );
      jobs.push(job);
    }

    return jobs;
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job<EmailJobData> | null> {
    return this.emailQueue.getJob(jobId);
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    state: string;
    progress: number;
    data: EmailJobData;
    returnvalue?: any;
    failedReason?: string;
  } | null> {
    const job = await this.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const progress = job.progress();

    return {
      state,
      progress: typeof progress === 'number' ? progress : 0,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  }> {
    const [waiting, active, completed, failed, delayed, paused] =
      await Promise.all([
        this.emailQueue.getWaitingCount(),
        this.emailQueue.getActiveCount(),
        this.emailQueue.getCompletedCount(),
        this.emailQueue.getFailedCount(),
        this.emailQueue.getDelayedCount(),
        this.emailQueue.getPausedCount(),
      ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    };
  }

  /**
   * Get failed jobs
   */
  async getFailedJobs(
    start: number = 0,
    end: number = 10,
  ): Promise<Job<EmailJobData>[]> {
    return this.emailQueue.getFailed(start, end);
  }

  /**
   * Retry failed job
   */
  async retryFailedJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    await job.retry();
    this.logger.log(`Retrying job: ${jobId}`);
  }

  /**
   * Clear completed jobs (for maintenance)
   */
  async clearCompleted(): Promise<void> {
    await this.emailQueue.clean(24 * 60 * 60 * 1000); // Clear jobs older than 24 hours
    this.logger.log('Cleared completed jobs older than 24 hours');
  }

  /**
   * Pause queue
   */
  async pauseQueue(): Promise<void> {
    await this.emailQueue.pause();
    this.logger.warn('Email queue paused');
  }

  /**
   * Resume queue
   */
  async resumeQueue(): Promise<void> {
    await this.emailQueue.resume();
    this.logger.log('Email queue resumed');
  }

  /**
   * Remove job from queue
   */
  async removeJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Removed job: ${jobId}`);
    }
  }

  /**
   * Bulk queue emails (for batch operations)
   * Creates email logs in database and adds to queue
   */
  async bulkAddEmails(
    emails: EmailJobData[],
    priority: EmailPriority = EmailPriority.NORMAL,
  ): Promise<Job<EmailJobData>[]> {
    try {
      // Create email logs in bulk
      const emailLogs = await this.prisma.$transaction(
        emails.map((emailData) =>
          this.prisma.emailLog.create({
            data: {
              userId: emailData.userId,
              to: emailData.to,
              cc: emailData.cc || [],
              bcc: emailData.bcc || [],
              subject: emailData.subject,
              htmlContent: emailData.htmlContent,
              textContent: emailData.textContent,
              type: emailData.type,
              status: EmailStatus.QUEUED,
              metadata: emailData.metadata,
              templateId: emailData.templateId,
            },
          }),
        ),
      );

      // Add to Bull queue in bulk
      const jobs = await this.emailQueue.addBulk(
        emails.map((email, index) => ({
          data: {
            ...email,
            emailLogId: emailLogs[index].id,
          },
          opts: {
            priority,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: false,
            removeOnFail: false,
          },
        })),
      );

      this.logger.log(`Bulk queued ${jobs.length} emails`);
      return jobs;
    } catch (error) {
      this.logger.error('Failed to bulk queue emails', error);
      throw error;
    }
  }

  /**
   * Batch send emails with rate limiting
   * Useful for marketing campaigns to avoid overwhelming email providers
   */
  async batchSendEmails(
    recipients: string[],
    subject: string,
    htmlContent: string,
    options: {
      type: EmailType;
      priority?: EmailPriority;
      batchSize?: number;
      delayBetweenBatches?: number; // milliseconds
      metadata?: any;
      trackingEnabled?: boolean;
    },
  ): Promise<{
    totalQueued: number;
    batches: number;
    jobs: Job<EmailJobData>[];
  }> {
    const {
      type,
      priority = EmailPriority.LOW,
      batchSize = 100,
      delayBetweenBatches = 1000,
      metadata,
      trackingEnabled = true,
    } = options;

    const totalRecipients = recipients.length;
    const batches = Math.ceil(totalRecipients / batchSize);
    const allJobs: Job<EmailJobData>[] = [];

    this.logger.log(
      `Starting batch send: ${totalRecipients} emails in ${batches} batches`,
    );

    for (let i = 0; i < batches; i++) {
      const batchStart = i * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, totalRecipients);
      const batchRecipients = recipients.slice(batchStart, batchEnd);

      // Create email data for this batch
      const emailData: EmailJobData[] = batchRecipients.map((recipient) => ({
        to: recipient,
        subject,
        htmlContent,
        type,
        metadata: {
          ...metadata,
          batchNumber: i + 1,
          totalBatches: batches,
        },
        trackingEnabled,
      }));

      // Queue this batch
      const batchJobs = await this.bulkAddEmails(emailData, priority);
      allJobs.push(...batchJobs);

      this.logger.log(
        `Batch ${i + 1}/${batches} queued: ${batchRecipients.length} emails`,
      );

      // Add delay between batches (except for the last batch)
      if (i < batches - 1 && delayBetweenBatches > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
      }
    }

    this.logger.log(
      `Batch send complete: ${allJobs.length} emails queued in ${batches} batches`,
    );

    return {
      totalQueued: allJobs.length,
      batches,
      jobs: allJobs,
    };
  }

  /**
   * Get queue health status
   */
  async getQueueHealth(): Promise<{
    healthy: boolean;
    stats: any;
    issues: string[];
  }> {
    const stats = await this.getQueueStats();
    const issues: string[] = [];

    // Check for potential issues
    if (stats.failed > 100) {
      issues.push(`High number of failed jobs: ${stats.failed}`);
    }

    if (stats.active > 50) {
      issues.push(`High number of active jobs: ${stats.active}`);
    }

    if (stats.delayed > 1000) {
      issues.push(`High number of delayed jobs: ${stats.delayed}`);
    }

    return {
      healthy: issues.length === 0,
      stats,
      issues,
    };
  }

  /**
   * Schedule recurring email (e.g., weekly newsletter)
   */
  async scheduleRecurringEmail(
    emailData: EmailJobData,
    cronExpression: string,
  ): Promise<any> {
    return this.emailQueue.add(emailData, {
      repeat: {
        cron: cronExpression,
      },
      removeOnComplete: true,
    });
  }
}
