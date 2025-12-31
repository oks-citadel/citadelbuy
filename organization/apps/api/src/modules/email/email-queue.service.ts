import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EmailType, EmailStatus } from '@prisma/client';
import { SendEmailDto } from './dto/send-email.dto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

export enum EmailPriority {
  HIGH = 1,
  NORMAL = 5,
  LOW = 10,
}

// COMPLIANCE: Rate limits to prevent abuse and protect AWS SES reputation
const RATE_LIMITS = {
  // Per-user limits (emails per hour)
  USER_PER_HOUR: 50,
  // Global marketing email limits
  MARKETING_PER_HOUR: 1000,
  MARKETING_PER_DAY: 10000,
  // Bulk email limits
  BULK_MAX_RECIPIENTS: 500,
  // Cart abandonment limits (prevent spam)
  CART_ABANDONMENT_PER_USER_DAY: 1,
};

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
    @InjectRedis() private redis: Redis,
  ) {}

  /**
   * COMPLIANCE: Check rate limit before sending
   * Returns true if within limits, false if rate limited
   */
  private async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    return current <= limit;
  }

  /**
   * COMPLIANCE: Check if user has given consent for marketing emails
   */
  private async hasMarketingConsent(userId?: string, email?: string): Promise<boolean> {
    if (!userId && !email) return false;

    try {
      // Check notification preferences
      if (userId) {
        const preferences = await this.prisma.notificationPreference.findUnique({
          where: { userId },
        });
        if (!preferences?.promotionalEmails) {
          this.logger.warn(`User ${userId} has not opted into promotional emails`);
          return false;
        }
      }

      // Check for unsubscribe record
      const unsubscribed = await this.prisma.emailUnsubscribe?.findFirst({
        where: {
          OR: [
            { userId: userId || undefined },
            { email: email || undefined },
          ],
          type: { in: ['MARKETING', 'ALL'] },
        },
      });

      if (unsubscribed) {
        this.logger.warn(`Email ${email || userId} is unsubscribed from marketing`);
        return false;
      }

      return true;
    } catch (error) {
      // If table doesn't exist or other error, be conservative
      this.logger.warn('Error checking marketing consent, defaulting to no consent', error);
      return false;
    }
  }

  /**
   * COMPLIANCE: Enforce rate limiting
   */
  private async enforceRateLimits(
    type: EmailType,
    userId?: string,
  ): Promise<void> {
    // User rate limit
    if (userId) {
      const userKey = `email:rate:user:${userId}:hourly`;
      const withinLimit = await this.checkRateLimit(userKey, RATE_LIMITS.USER_PER_HOUR, 3600);
      if (!withinLimit) {
        throw new HttpException(
          'Email rate limit exceeded. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Marketing email global limits
    if (type === EmailType.MARKETING) {
      const hourlyKey = 'email:rate:marketing:hourly';
      const dailyKey = 'email:rate:marketing:daily';

      const withinHourly = await this.checkRateLimit(hourlyKey, RATE_LIMITS.MARKETING_PER_HOUR, 3600);
      const withinDaily = await this.checkRateLimit(dailyKey, RATE_LIMITS.MARKETING_PER_DAY, 86400);

      if (!withinHourly || !withinDaily) {
        throw new HttpException(
          'Marketing email rate limit exceeded. Campaign will be queued.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

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
        subject: 'Welcome to Broxiva!',
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
   * COMPLIANCE: Requires user consent and enforces daily limit per user
   */
  async queueCartAbandonmentEmail(
    email: string,
    cartData: any,
    userId?: string,
    delayMinutes: number = 60,
  ): Promise<Job<EmailJobData> | null> {
    // COMPLIANCE: Check consent before sending cart abandonment emails
    const hasConsent = await this.hasMarketingConsent(userId, email);
    if (!hasConsent) {
      this.logger.log(`Skipping cart abandonment email - no consent: ${email}`);
      return null;
    }

    // COMPLIANCE: Limit cart abandonment emails to 1 per user per day
    if (userId) {
      const dailyKey = `email:cart:${userId}:daily`;
      const withinLimit = await this.checkRateLimit(dailyKey, RATE_LIMITS.CART_ABANDONMENT_PER_USER_DAY, 86400);
      if (!withinLimit) {
        this.logger.log(`Cart abandonment email already sent today for user: ${userId}`);
        return null;
      }
    }

    const delayMs = delayMinutes * 60 * 1000;

    return this.addEmailToQueue(
      {
        to: email,
        subject: 'You left items in your cart',
        htmlContent: '', // Will be populated by processor
        type: EmailType.MARKETING,
        userId,
        metadata: { ...cartData, templateName: 'cart-abandonment', consentVerified: true },
        trackingEnabled: true,
      },
      EmailPriority.LOW,
      delayMs,
    );
  }

  /**
   * Queue marketing/promotional email (LOW priority)
   * COMPLIANCE: Enforces recipient limit, rate limits, and consent checks
   */
  async queueMarketingEmail(
    recipients: string[],
    subject: string,
    htmlContent: string,
    metadata?: any,
  ): Promise<Job<EmailJobData>[]> {
    // COMPLIANCE: Enforce maximum recipients per batch
    if (recipients.length > RATE_LIMITS.BULK_MAX_RECIPIENTS) {
      throw new HttpException(
        `Maximum ${RATE_LIMITS.BULK_MAX_RECIPIENTS} recipients per batch. Use batchSendEmails for larger campaigns.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // COMPLIANCE: Check global rate limits
    await this.enforceRateLimits(EmailType.MARKETING);

    const jobs: Job<EmailJobData>[] = [];
    const skippedNoConsent: string[] = [];

    for (const recipient of recipients) {
      // COMPLIANCE: Verify consent for each recipient
      const hasConsent = await this.hasMarketingConsent(undefined, recipient);
      if (!hasConsent) {
        skippedNoConsent.push(recipient);
        continue;
      }

      const job = await this.addEmailToQueue(
        {
          to: recipient,
          subject,
          htmlContent,
          type: EmailType.MARKETING,
          metadata: { ...metadata, consentVerified: true },
          trackingEnabled: true,
        },
        EmailPriority.LOW,
      );
      jobs.push(job);
    }

    if (skippedNoConsent.length > 0) {
      this.logger.warn(`Skipped ${skippedNoConsent.length} recipients without marketing consent`);
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
