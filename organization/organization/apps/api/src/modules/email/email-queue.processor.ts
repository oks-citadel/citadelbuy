import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EmailService } from './email.service';
import { EmailType, EmailStatus } from '@prisma/client';
import { AlertService, AlertLevel } from '@/common/alerts/alert.service';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export const EMAIL_QUEUE = 'email';

export enum EmailJobType {
  WELCOME = 'welcome',
  ORDER_CONFIRMATION = 'order-confirmation',
  PASSWORD_RESET = 'password-reset',
  PASSWORD_CHANGED = 'password-changed',
  MARKETING_CAMPAIGN = 'marketing-campaign',
  NEWSLETTER = 'newsletter',
  TRANSACTIONAL = 'transactional',
  SHIPPING_UPDATE = 'shipping-update',
  REVIEW_REQUEST = 'review-request',
  CART_ABANDONMENT = 'cart-abandonment',
  PROMO_CODE = 'promo-code',
  ACCOUNT_VERIFICATION = 'account-verification',
}

export interface BaseEmailJobData {
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  userId?: string;
  templateName?: string;
  metadata?: Record<string, any>;
  trackingEnabled?: boolean;
  priority?: number;
  scheduledFor?: Date;
}

export interface WelcomeEmailJobData extends BaseEmailJobData {
  userName: string;
  verificationUrl?: string;
}

export interface OrderConfirmationJobData extends BaseEmailJobData {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  items: Array<{
    name: string;
    image?: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface PasswordResetJobData extends BaseEmailJobData {
  resetToken: string;
  resetUrl: string;
  expiresIn?: string;
}

export interface MarketingCampaignJobData extends BaseEmailJobData {
  campaignId: string;
  campaignName: string;
  segmentId?: string;
  htmlContent: string;
  unsubscribeUrl: string;
}

/**
 * Enhanced Email Queue Processor
 *
 * Handles all types of email jobs with comprehensive error handling,
 * retry logic, dead letter queue, and detailed tracking.
 */
@Processor(EMAIL_QUEUE)
export class EmailQueueProcessor {
  private readonly logger = new Logger(EmailQueueProcessor.name);
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
   * Register custom Handlebars helpers for template rendering
   */
  private registerHandlebarsHelpers() {
    handlebars.registerHelper('currency', (value: number, currency = '$') => {
      return `${currency}${value.toFixed(2)}`;
    });

    handlebars.registerHelper('formatDate', (date: Date | string) => {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    handlebars.registerHelper('if_eq', function (a, b, opts) {
      return a === b ? opts.fn(this) : opts.inverse(this);
    });

    handlebars.registerHelper('add', (a: number, b: number) => a + b);
    handlebars.registerHelper('multiply', (a: number, b: number) => a * b);
  }

  /**
   * Load and cache email templates
   */
  private async loadTemplate(templateName: string): Promise<handlebars.TemplateDelegate> {
    if (this.templatesCache.has(templateName)) {
      return this.templatesCache.get(templateName)!;
    }

    const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);

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
    return `<img src="${baseUrl}/api/email/track/open/${trackingId}" alt="" width="1" height="1" style="display:block;width:1px;height:1px;" />`;
  }

  /**
   * Wrap links with tracking
   */
  private wrapLinksWithTracking(html: string, trackingId: string): string {
    const baseUrl = this.configService.get<string>('API_URL') || this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    return html.replace(
      /href="(https?:\/\/[^"]+)"/g,
      (match, url) => {
        const encodedUrl = encodeURIComponent(url);
        return `href="${baseUrl}/api/email/track/click/${trackingId}?url=${encodedUrl}"`;
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

    let trackedHtml = this.wrapLinksWithTracking(html, trackingId);
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
      return true;
    }

    try {
      const canReceive = await this.emailService.canReceiveNotification(userId, emailType);
      return canReceive;
    } catch (error) {
      this.logger.warn(`Failed to check user preferences for ${userId}, proceeding with send`, error);
      return true;
    }
  }

  /**
   * Create email log entry
   */
  private async createEmailLog(data: BaseEmailJobData, type: EmailType): Promise<string> {
    const emailLog = await this.prisma.emailLog.create({
      data: {
        userId: data.userId,
        to: data.to,
        cc: data.cc || [],
        bcc: data.bcc || [],
        subject: data.subject,
        htmlContent: '',
        type,
        status: EmailStatus.QUEUED,
        metadata: data.metadata,
      },
    });
    return emailLog.id;
  }

  /**
   * Update email log status
   */
  private async updateEmailLog(
    emailLogId: string,
    status: EmailStatus,
    additionalData?: Record<string, any>,
  ): Promise<void> {
    await this.prisma.emailLog.update({
      where: { id: emailLogId },
      data: {
        status,
        ...additionalData,
      },
    });
  }

  /**
   * Process Welcome Email
   */
  @Process(EmailJobType.WELCOME)
  async processWelcomeEmail(job: Job<WelcomeEmailJobData>) {
    this.logger.log(`Processing welcome email job ${job.id} for ${job.data.to}`);

    const emailLogId = await this.createEmailLog(job.data, EmailType.TRANSACTIONAL);

    try {
      await job.progress(20);

      const canSend = await this.checkUserPreferences(job.data.userId, 'welcome');
      if (!canSend) {
        await this.updateEmailLog(emailLogId, EmailStatus.FAILED, {
          errorMessage: 'User opted out of welcome emails',
        });
        return { success: false, reason: 'User opted out' };
      }

      await job.progress(40);

      const htmlContent = await this.renderTemplate('welcome', {
        userName: job.data.userName,
        verificationUrl: job.data.verificationUrl,
        ...job.data.metadata,
      });

      await job.progress(60);

      const trackedHtml = this.injectTracking(htmlContent, emailLogId, job.data.trackingEnabled ?? true);

      await this.emailService.sendEmail({
        to: job.data.to,
        subject: job.data.subject,
        html: trackedHtml,
      });

      await job.progress(90);

      await this.updateEmailLog(emailLogId, EmailStatus.SENT, {
        htmlContent: trackedHtml,
        sentAt: new Date(),
      });

      await job.progress(100);

      return {
        success: true,
        emailLogId,
        to: job.data.to,
      };
    } catch (error) {
      this.logger.error(`Failed to process welcome email job ${job.id}`, error.stack);
      await this.updateEmailLog(emailLogId, EmailStatus.FAILED, {
        errorMessage: error.message,
      });
      throw error;
    }
  }

  /**
   * Process Order Confirmation Email
   */
  @Process(EmailJobType.ORDER_CONFIRMATION)
  async processOrderConfirmation(job: Job<OrderConfirmationJobData>) {
    this.logger.log(`Processing order confirmation email job ${job.id} for order ${job.data.orderNumber}`);

    const emailLogId = await this.createEmailLog(job.data, EmailType.TRANSACTIONAL);

    try {
      await job.progress(20);

      const canSend = await this.checkUserPreferences(job.data.userId, 'order_confirmation');
      if (!canSend) {
        await this.updateEmailLog(emailLogId, EmailStatus.FAILED, {
          errorMessage: 'User opted out of order confirmation emails',
        });
        return { success: false, reason: 'User opted out' };
      }

      await job.progress(40);

      const htmlContent = await this.renderTemplate('order-confirmation', {
        orderNumber: job.data.orderNumber,
        orderDate: job.data.orderDate,
        items: job.data.items,
        subtotal: job.data.subtotal,
        shipping: job.data.shipping,
        tax: job.data.tax,
        total: job.data.total,
        shippingAddress: job.data.shippingAddress,
        ...job.data.metadata,
      });

      await job.progress(60);

      const trackedHtml = this.injectTracking(htmlContent, emailLogId, job.data.trackingEnabled ?? true);

      await this.emailService.sendEmail({
        to: job.data.to,
        subject: job.data.subject,
        html: trackedHtml,
      });

      await job.progress(90);

      await this.updateEmailLog(emailLogId, EmailStatus.SENT, {
        htmlContent: trackedHtml,
        sentAt: new Date(),
      });

      await job.progress(100);

      return {
        success: true,
        emailLogId,
        orderId: job.data.orderId,
      };
    } catch (error) {
      this.logger.error(`Failed to process order confirmation job ${job.id}`, error.stack);
      await this.updateEmailLog(emailLogId, EmailStatus.FAILED, {
        errorMessage: error.message,
      });

      // Critical email - send alert
      await this.sendCriticalEmailAlert(job, error);
      throw error;
    }
  }

  /**
   * Process Password Reset Email
   */
  @Process(EmailJobType.PASSWORD_RESET)
  async processPasswordReset(job: Job<PasswordResetJobData>) {
    this.logger.log(`Processing password reset email job ${job.id} for ${job.data.to}`);

    const emailLogId = await this.createEmailLog(job.data, EmailType.TRANSACTIONAL);

    try {
      await job.progress(20);

      // Password reset emails should always be sent regardless of preferences
      await job.progress(40);

      const htmlContent = await this.renderTemplate('password-reset', {
        resetUrl: job.data.resetUrl,
        resetToken: job.data.resetToken,
        expiresIn: job.data.expiresIn || '1 hour',
        ...job.data.metadata,
      });

      await job.progress(60);

      const trackedHtml = this.injectTracking(htmlContent, emailLogId, job.data.trackingEnabled ?? true);

      await this.emailService.sendEmail({
        to: job.data.to,
        subject: job.data.subject,
        html: trackedHtml,
      });

      await job.progress(90);

      await this.updateEmailLog(emailLogId, EmailStatus.SENT, {
        htmlContent: trackedHtml,
        sentAt: new Date(),
      });

      await job.progress(100);

      return {
        success: true,
        emailLogId,
        to: job.data.to,
      };
    } catch (error) {
      this.logger.error(`Failed to process password reset job ${job.id}`, error.stack);
      await this.updateEmailLog(emailLogId, EmailStatus.FAILED, {
        errorMessage: error.message,
      });

      // Critical email - send alert
      await this.sendCriticalEmailAlert(job, error);
      throw error;
    }
  }

  /**
   * Process Marketing Campaign Email
   */
  @Process(EmailJobType.MARKETING_CAMPAIGN)
  async processMarketingCampaign(job: Job<MarketingCampaignJobData>) {
    this.logger.log(`Processing marketing campaign email job ${job.id} for campaign ${job.data.campaignId}`);

    const emailLogId = await this.createEmailLog(job.data, EmailType.MARKETING);

    try {
      await job.progress(20);

      const canSend = await this.checkUserPreferences(job.data.userId, 'marketing');
      if (!canSend) {
        await this.updateEmailLog(emailLogId, EmailStatus.FAILED, {
          errorMessage: 'User opted out of marketing emails',
        });
        return { success: false, reason: 'User opted out' };
      }

      await job.progress(40);

      let htmlContent = job.data.htmlContent;

      // Add unsubscribe link if not present
      if (!htmlContent.includes(job.data.unsubscribeUrl)) {
        htmlContent += `<br/><br/><p style="font-size: 12px; color: #666;">
          <a href="${job.data.unsubscribeUrl}">Unsubscribe from marketing emails</a>
        </p>`;
      }

      await job.progress(60);

      const trackedHtml = this.injectTracking(htmlContent, emailLogId, job.data.trackingEnabled ?? true);

      await this.emailService.sendEmail({
        to: job.data.to,
        subject: job.data.subject,
        html: trackedHtml,
      });

      await job.progress(90);

      await this.updateEmailLog(emailLogId, EmailStatus.SENT, {
        htmlContent: trackedHtml,
        sentAt: new Date(),
        metadata: {
          campaignId: job.data.campaignId,
          campaignName: job.data.campaignName,
          segmentId: job.data.segmentId,
        },
      });

      await job.progress(100);

      return {
        success: true,
        emailLogId,
        campaignId: job.data.campaignId,
      };
    } catch (error) {
      this.logger.error(`Failed to process marketing campaign job ${job.id}`, error.stack);
      await this.updateEmailLog(emailLogId, EmailStatus.FAILED, {
        errorMessage: error.message,
      });
      throw error;
    }
  }

  /**
   * Send critical email failure alert
   */
  private async sendCriticalEmailAlert(job: Job, error: Error) {
    try {
      await this.alertService.sendAlert({
        level: AlertLevel.CRITICAL,
        title: 'Critical Email Delivery Failure',
        message: `Failed to deliver critical email: ${job.data.subject}`,
        details: {
          jobId: job.id.toString(),
          jobType: job.name,
          recipient: job.data.to,
          subject: job.data.subject,
          error: error.message,
          attemptsMade: job.attemptsMade,
          maxAttempts: job.opts.attempts || 1,
        },
        source: 'EmailQueueProcessor',
      });
    } catch (alertError) {
      this.logger.error('Failed to send critical email alert', alertError);
    }
  }

  /**
   * Move failed job to dead letter queue (logged only, no database storage)
   */
  private async moveToDeadLetterQueue(job: Job, error: Error) {
    // Log the dead letter queue entry
    this.logger.warn(`Job ${job.id} moved to dead letter queue`, {
      originalJobId: job.id.toString(),
      jobType: job.name,
      to: job.data.to,
      subject: job.data.subject,
      failureReason: error.message,
      attemptsMade: job.attemptsMade,
      failedAt: new Date(),
    });
  }

  /**
   * Map job type to email type
   */
  private mapJobTypeToEmailType(jobType: string): EmailType {
    const mapping: Record<string, EmailType> = {
      [EmailJobType.WELCOME]: EmailType.TRANSACTIONAL,
      [EmailJobType.ORDER_CONFIRMATION]: EmailType.TRANSACTIONAL,
      [EmailJobType.PASSWORD_RESET]: EmailType.TRANSACTIONAL,
      [EmailJobType.PASSWORD_CHANGED]: EmailType.TRANSACTIONAL,
      [EmailJobType.SHIPPING_UPDATE]: EmailType.NOTIFICATION,
      [EmailJobType.REVIEW_REQUEST]: EmailType.NOTIFICATION,
      [EmailJobType.MARKETING_CAMPAIGN]: EmailType.MARKETING,
      [EmailJobType.NEWSLETTER]: EmailType.MARKETING,
      [EmailJobType.CART_ABANDONMENT]: EmailType.MARKETING,
      [EmailJobType.PROMO_CODE]: EmailType.MARKETING,
    };

    return mapping[jobType] || EmailType.TRANSACTIONAL;
  }

  /**
   * Determine if error should trigger retry
   */
  private shouldRetryError(error: any): boolean {
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
  onActive(job: Job) {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`, {
      to: job.data.to,
      subject: job.data.subject,
      attempt: job.attemptsMade + 1,
      maxAttempts: job.opts.attempts,
    });
  }

  /**
   * Event handler: Job completed successfully
   */
  @OnQueueCompleted()
  async onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} of type ${job.name} completed successfully`, result);
  }

  /**
   * Event handler: Job failed
   */
  @OnQueueFailed()
  async onFailed(job: Job, error: Error) {
    const attempt = job.attemptsMade;
    const maxAttempts = job.opts.attempts || 1;

    this.logger.error(`Job ${job.id} of type ${job.name} failed (attempt ${attempt}/${maxAttempts})`, {
      to: job.data.to,
      subject: job.data.subject,
      error: error.message,
    });

    // If exhausted all retries, move to dead letter queue
    if (attempt >= maxAttempts) {
      this.logger.error(`Job ${job.id} exhausted all retry attempts, moving to dead letter queue`);
      await this.moveToDeadLetterQueue(job, error);
    }
  }
}
