import { Process, Processor, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EmailService } from './email.service';
import { EmailJobData } from './email-queue.service';
import { EmailStatus } from '@prisma/client';
import { AlertService, AlertLevel } from '@/common/alerts/alert.service';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);
  private templatesCache: Map<string, handlebars.TemplateDelegate> = new Map();

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private alertService: AlertService,
    private configService: ConfigService,
  ) {
    this.registerHandlebarsHelpers();
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHandlebarsHelpers() {
    // Currency formatting helper
    handlebars.registerHelper('currency', (value: number, currency = '$') => {
      return `${currency}${value.toFixed(2)}`;
    });

    // Date formatting helper
    handlebars.registerHelper('formatDate', (date: Date | string) => {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // Conditional helper
    handlebars.registerHelper('if_eq', function (a, b, opts) {
      return a === b ? opts.fn(this) : opts.inverse(this);
    });

    // Math helpers
    handlebars.registerHelper('add', (a: number, b: number) => a + b);
    handlebars.registerHelper('multiply', (a: number, b: number) => a * b);
  }

  /**
   * Load template from file system
   */
  private async loadTemplate(templateName: string): Promise<handlebars.TemplateDelegate> {
    // Check cache first
    if (this.templatesCache.has(templateName)) {
      return this.templatesCache.get(templateName)!;
    }

    const templatePath = path.join(
      __dirname,
      'templates',
      `${templateName}.hbs`,
    );

    try {
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      const template = handlebars.compile(templateContent);
      this.templatesCache.set(templateName, template);
      this.logger.debug(`Template loaded and cached: ${templateName}`);
      return template;
    } catch (error) {
      this.logger.error(`Failed to load template: ${templateName}`, error.stack);
      throw new Error(`Template ${templateName} not found`);
    }
  }

  /**
   * Render template with context data
   */
  private async renderTemplate(
    templateName: string,
    context: Record<string, any>,
  ): Promise<string> {
    const template = await this.loadTemplate(templateName);
    return template(context);
  }

  /**
   * Generate tracking pixel HTML
   */
  private generateTrackingPixel(trackingId: string): string {
    const baseUrl = this.configService.get<string>('API_URL') || this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    return `<img src="${baseUrl}/email/track/open/${trackingId}" alt="" width="1" height="1" style="display:block;width:1px;height:1px;" />`;
  }

  /**
   * Wrap links with tracking
   */
  private wrapLinksWithTracking(html: string, trackingId: string): string {
    const baseUrl = this.configService.get<string>('API_URL') || this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

    // Replace all href attributes with tracked links
    return html.replace(
      /href="(https?:\/\/[^"]+)"/g,
      (match, url) => {
        const encodedUrl = encodeURIComponent(url);
        return `href="${baseUrl}/email/track/click/${trackingId}?url=${encodedUrl}"`;
      },
    );
  }

  /**
   * Inject tracking into HTML content
   */
  private injectTracking(html: string, trackingId: string, trackingEnabled: boolean): string {
    if (!trackingEnabled) {
      return html;
    }

    // Wrap links with tracking
    let trackedHtml = this.wrapLinksWithTracking(html, trackingId);

    // Inject tracking pixel before closing body tag
    const trackingPixel = this.generateTrackingPixel(trackingId);
    trackedHtml = trackedHtml.replace('</body>', `${trackingPixel}</body>`);

    return trackedHtml;
  }

  /**
   * Check if user can receive email based on preferences
   */
  private async checkUserPreferences(
    userId: string | undefined,
    emailType: string,
  ): Promise<boolean> {
    if (!userId) {
      return true; // No user ID means it's a guest, send anyway
    }

    try {
      const canReceive = await this.emailService.canReceiveNotification(
        userId,
        emailType,
      );
      return canReceive;
    } catch (error) {
      this.logger.warn(
        `Failed to check user preferences for ${userId}, proceeding with send`,
        error,
      );
      return true; // Default to sending if check fails
    }
  }

  /**
   * Main job processor
   */
  @Process({ concurrency: 5 })
  async processEmail(job: Job<EmailJobData & { emailLogId?: string }>) {
    const { data } = job;
    const emailLogId = data.emailLogId;

    this.logger.log(
      `Processing email job ${job.id}: ${data.subject} to ${data.to}`,
    );

    try {
      // Update job progress
      await job.progress(10);

      // Update email log status to PENDING
      if (emailLogId) {
        await this.prisma.emailLog.update({
          where: { id: emailLogId },
          data: { status: EmailStatus.PENDING },
        });
      }

      // Check user preferences
      await job.progress(20);
      const emailTypeKey = data.type.toLowerCase().replace(/_/g, '_');
      const canSend = await this.checkUserPreferences(
        data.userId,
        emailTypeKey,
      );

      if (!canSend) {
        this.logger.log(
          `User ${data.userId} has opted out of ${data.type} emails`,
        );

        if (emailLogId) {
          await this.prisma.emailLog.update({
            where: { id: emailLogId },
            data: {
              status: EmailStatus.FAILED,
              errorMessage: 'User opted out of this email type',
            },
          });
        }

        return { success: false, reason: 'User opted out' };
      }

      // Render HTML content
      await job.progress(40);
      let htmlContent = data.htmlContent;

      // If template name is provided in metadata, render it
      if (data.metadata?.templateName && !htmlContent) {
        this.logger.debug(
          `Rendering template: ${data.metadata.templateName}`,
        );
        htmlContent = await this.renderTemplate(
          data.metadata.templateName,
          data.metadata,
        );
      }

      if (!htmlContent) {
        throw new Error('No HTML content or template provided');
      }

      // Generate tracking ID if tracking is enabled
      await job.progress(60);
      const trackingId = emailLogId;

      if (data.trackingEnabled && emailLogId) {
        // Update metadata with tracking information
        await this.prisma.emailLog.update({
          where: { id: emailLogId },
          data: {
            metadata: {
              ...(data.metadata || {}),
              trackingEnabled: true,
              trackingId: emailLogId,
            },
          },
        });

        // Inject tracking pixel and wrap links
        htmlContent = this.injectTracking(htmlContent, emailLogId, true);
      }

      // Send email
      await job.progress(80);
      await this.emailService.sendEmail({
        to: data.to,
        subject: data.subject,
        html: htmlContent,
      });

      // Update email log status to SENT
      await job.progress(90);
      if (emailLogId) {
        await this.prisma.emailLog.update({
          where: { id: emailLogId },
          data: {
            status: EmailStatus.SENT,
            sentAt: new Date(),
          },
        });
      }

      // Complete
      await job.progress(100);
      this.logger.log(`Email sent successfully: ${job.id}`);

      return {
        success: true,
        emailLogId,
        to: data.to,
        subject: data.subject,
        sentAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to process email job ${job.id}`,
        error.stack,
      );

      // Update email log with error
      if (emailLogId) {
        await this.prisma.emailLog.update({
          where: { id: emailLogId },
          data: {
            status: EmailStatus.FAILED,
            errorMessage: error.message || 'Unknown error',
          },
        });
      }

      // Determine if we should retry
      const shouldRetry = this.shouldRetryError(error);

      if (!shouldRetry) {
        this.logger.error(
          `Non-retryable error for job ${job.id}, moving to failed`,
        );
        await job.moveToFailed({ message: error.message }, true);
      }

      throw error; // Re-throw to trigger Bull's retry mechanism
    }
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetryError(error: any): boolean {
    // Don't retry on these errors
    const nonRetryableErrors = [
      'User opted out',
      'Template not found',
      'No HTML content',
      'Invalid email address',
      'User not found',
    ];

    const errorMessage = error.message || '';
    return !nonRetryableErrors.some((msg) =>
      errorMessage.toLowerCase().includes(msg.toLowerCase()),
    );
  }

  /**
   * Event handler: Job becomes active
   */
  @OnQueueActive()
  onActive(job: Job<EmailJobData>) {
    this.logger.debug(
      `Processing job ${job.id} of type ${job.name} with data:`,
      {
        to: job.data.to,
        subject: job.data.subject,
        type: job.data.type,
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts,
      },
    );
  }

  /**
   * Event handler: Job completed successfully
   */
  @OnQueueCompleted()
  async onCompleted(job: Job<EmailJobData>, result: any) {
    this.logger.log(
      `Job ${job.id} completed successfully: ${job.data.subject} to ${job.data.to}`,
    );

    // Optional: Track completion metrics
    try {
      // You could send metrics to a monitoring service here
      // Example: this.metricsService.incrementEmailsSent()
    } catch (error) {
      this.logger.warn('Failed to track completion metrics', error);
    }
  }

  /**
   * Event handler: Job failed
   */
  @OnQueueFailed()
  async onFailed(job: Job<EmailJobData>, error: Error) {
    const attempt = job.attemptsMade;
    const maxAttempts = job.opts.attempts || 1;

    this.logger.error(
      `Job ${job.id} failed (attempt ${attempt}/${maxAttempts}): ${error.message}`,
      {
        to: job.data.to,
        subject: job.data.subject,
        error: error.message,
        stack: error.stack,
      },
    );

    // If this was the last attempt, move to dead letter queue
    if (attempt >= maxAttempts) {
      this.logger.error(
        `Job ${job.id} exhausted all retry attempts, moving to dead letter queue`,
      );
      await this.moveToDeadLetterQueue(job, error);
    }

    // Optional: Send alert for critical email failures
    if (this.isCriticalEmail(job.data)) {
      await this.sendFailureAlert(job, error);
    }
  }

  /**
   * Check if email is critical (requires immediate attention)
   */
  private isCriticalEmail(data: EmailJobData): boolean {
    const criticalTypes = ['TRANSACTIONAL'];
    const criticalTemplates = [
      'password-reset',
      'order-confirmation',
      'payment-failed',
    ];

    return (
      criticalTypes.includes(data.type) ||
      (data.metadata?.templateName &&
        criticalTemplates.includes(data.metadata.templateName))
    );
  }

  /**
   * Send failure alert for critical emails
   */
  private async sendFailureAlert(job: Job<EmailJobData>, error: Error) {
    try {
      this.logger.error(
        `CRITICAL EMAIL FAILURE: Job ${job.id} failed for ${job.data.to}`,
        {
          subject: job.data.subject,
          type: job.data.type,
          error: error.message,
          attemptsMade: job.attemptsMade,
        },
      );

      // Send alert notification via AlertService
      await this.alertService.sendAlert({
        level: AlertLevel.CRITICAL,
        title: 'Critical Email Delivery Failure',
        message: `Failed to deliver critical email: ${job.data.subject}`,
        details: {
          jobId: job.id.toString(),
          recipient: job.data.to,
          subject: job.data.subject,
          emailType: job.data.type,
          error: error.message,
          attemptsMade: job.attemptsMade,
          maxAttempts: job.opts.attempts || 1,
          failedAt: new Date().toISOString(),
        },
        source: 'EmailProcessor',
      });
    } catch (alertError) {
      this.logger.error('Failed to send failure alert', alertError);
    }
  }

  /**
   * Move failed job to dead letter queue for manual review
   */
  private async moveToDeadLetterQueue(
    job: Job<EmailJobData>,
    error: Error,
  ) {
    try {
      // Create a dead letter queue entry in the database
      // Note: This requires the EmailDeadLetter model in Prisma schema
      // and running: npx prisma generate
      await (this.prisma as any).emailDeadLetter.create({
        data: {
          originalJobId: job.id.toString(),
          to: job.data.to,
          subject: job.data.subject,
          htmlContent: job.data.htmlContent,
          type: job.data.type,
          metadata: {
            ...job.data.metadata,
            failureReason: error.message,
            attemptsMade: job.attemptsMade,
            failedAt: new Date(),
          },
          errorMessage: error.message,
          attemptsMade: job.attemptsMade,
        },
      });

      this.logger.log(
        `Job ${job.id} moved to dead letter queue for manual review`,
      );
    } catch (dlqError) {
      this.logger.error(
        `Failed to move job ${job.id} to dead letter queue`,
        dlqError,
      );
    }
  }

  /**
   * Manual retry from dead letter queue
   */
  async retryFromDeadLetterQueue(deadLetterId: string) {
    // Note: This requires the EmailDeadLetter model in Prisma schema
    // and running: npx prisma generate
    const deadLetter = await (this.prisma as any).emailDeadLetter.findUnique({
      where: { id: deadLetterId },
    });

    if (!deadLetter) {
      throw new Error('Dead letter entry not found');
    }

    this.logger.log(`Retrying email from dead letter queue: ${deadLetterId}`);

    // Re-queue the email
    const emailJobData: EmailJobData = {
      to: deadLetter.to,
      subject: deadLetter.subject,
      htmlContent: deadLetter.htmlContent,
      type: deadLetter.type,
      metadata: deadLetter.metadata as any,
    };

    // Create new email log
    const emailLog = await this.prisma.emailLog.create({
      data: {
        to: deadLetter.to,
        subject: deadLetter.subject,
        htmlContent: deadLetter.htmlContent,
        type: deadLetter.type,
        status: EmailStatus.QUEUED,
        metadata: {
          ...(deadLetter.metadata as any),
          retriedFromDeadLetter: true,
          originalDeadLetterId: deadLetterId,
        },
      },
    });

    // Mark dead letter as processed
    await (this.prisma as any).emailDeadLetter.update({
      where: { id: deadLetterId },
      data: {
        processedAt: new Date(),
      },
    });

    return { success: true, emailLogId: emailLog.id };
  }
}
