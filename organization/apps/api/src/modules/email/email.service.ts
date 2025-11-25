import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { SendEmailDto } from './dto/send-email.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { EmailType, EmailStatus } from '@prisma/client';

export interface EmailOptions {
  to: string;
  subject: string;
  template?: string;
  context?: Record<string, any>;
  html?: string; // For backwards compatibility
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private templatesCache: Map<string, handlebars.TemplateDelegate> = new Map();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailHost = this.configService.get('EMAIL_HOST');
    const emailPort = this.configService.get('EMAIL_PORT');
    const emailUser = this.configService.get('EMAIL_USER');
    const emailPassword = this.configService.get('EMAIL_PASSWORD');

    if (!emailHost || !emailUser || !emailPassword) {
      this.logger.warn(
        'Email configuration is missing. Emails will be logged instead of sent.',
      );
      // Create a test transporter for development
      this.transporter = nodemailer.createTransport({
        host: 'localhost',
        port: 1025,
        ignoreTLS: true,
      });
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: emailHost,
      port: parseInt(emailPort || '587'),
      secure: emailPort === '465',
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });

    this.logger.log('Email transporter initialized');
  }

  private async loadTemplate(templateName: string): Promise<handlebars.TemplateDelegate> {
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
      return template;
    } catch (error) {
      this.logger.error(`Failed to load template: ${templateName}`, error);
      throw new Error(`Template ${templateName} not found`);
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      let html: string;

      if (options.html) {
        // Direct HTML provided
        html = options.html;
      } else if (options.template) {
        // Use template
        const template = await this.loadTemplate(options.template);
        html = template(options.context || {});
      } else {
        throw new Error('Either template or html must be provided');
      }

      const mailOptions = {
        from: this.configService.get('EMAIL_FROM') || 'noreply@citadelbuy.com',
        to: options.to,
        subject: options.subject,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent: ${info.messageId} to ${options.to}`);
    } catch (error) {
      this.logger.error('Failed to send email', error);
      // Don't throw error in production, just log it
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
    }
  }

  // ==================== Return-specific Email Methods ====================

  async sendReturnRequestConfirmation(data: {
    email: string;
    customerName: string;
    rmaNumber: string;
    orderNumber: string;
    items: Array<{ name: string; quantity: number }>;
    totalRefund: number;
  }): Promise<void> {
    await this.sendEmail({
      to: data.email,
      subject: `Return Request Confirmed - RMA ${data.rmaNumber}`,
      template: 'return-confirmation',
      context: data,
    });
  }

  async sendReturnApproved(data: {
    email: string;
    customerName: string;
    rmaNumber: string;
    approvedAmount: number;
    nextSteps: string;
  }): Promise<void> {
    await this.sendEmail({
      to: data.email,
      subject: `Return Approved - RMA ${data.rmaNumber}`,
      template: 'return-approved',
      context: data,
    });
  }

  async sendReturnRejected(data: {
    email: string;
    customerName: string;
    rmaNumber: string;
    reason: string;
  }): Promise<void> {
    await this.sendEmail({
      to: data.email,
      subject: `Return Request Declined - RMA ${data.rmaNumber}`,
      template: 'return-rejected',
      context: data,
    });
  }

  async sendReturnLabelReady(data: {
    email: string;
    customerName: string;
    rmaNumber: string;
    trackingNumber: string;
    carrier: string;
    labelUrl?: string;
  }): Promise<void> {
    await this.sendEmail({
      to: data.email,
      subject: `Return Shipping Label Ready - RMA ${data.rmaNumber}`,
      template: 'return-label',
      context: data,
    });
  }

  async sendRefundProcessed(data: {
    email: string;
    customerName: string;
    rmaNumber: string;
    refundAmount: number;
    refundMethod: string;
    estimatedDays: number;
  }): Promise<void> {
    await this.sendEmail({
      to: data.email,
      subject: `Refund Processed - RMA ${data.rmaNumber}`,
      template: 'refund-processed',
      context: data,
    });
  }

  async sendStoreCreditIssued(data: {
    email: string;
    customerName: string;
    rmaNumber: string;
    creditAmount: number;
    expiresAt?: Date;
  }): Promise<void> {
    await this.sendEmail({
      to: data.email,
      subject: `Store Credit Issued - RMA ${data.rmaNumber}`,
      template: 'store-credit-issued',
      context: data,
    });
  }

  // ==================== Other Email Methods (Stubs for other modules) ====================

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    this.logger.log(`Welcome email would be sent to ${email}`);
    // TODO: Implement welcome email template
  }

  async sendPasswordResetEmail(email: string, data: any): Promise<void> {
    this.logger.log(`Password reset email would be sent to ${email}`);
    // TODO: Implement password reset email template
  }

  async sendOrderConfirmation(email: string, data: any): Promise<void> {
    this.logger.log(`Order confirmation email would be sent to ${email}`);
    // TODO: Implement order confirmation email template
  }

  async sendOrderStatusUpdate(email: string, data: any): Promise<void> {
    this.logger.log(`Order status update email would be sent to ${email}`);
    // TODO: Implement order status update email template
  }

  // ==================== Enhanced Email System Methods ====================

  /**
   * Send email with database logging
   */
  async sendEmailWithLogging(dto: SendEmailDto, userId?: string) {
    try {
      // Create email log
      const emailLog = await this.prisma.emailLog.create({
        data: {
          userId,
          to: dto.to,
          cc: dto.cc || [],
          bcc: dto.bcc || [],
          subject: dto.subject,
          htmlContent: dto.htmlContent,
          textContent: dto.textContent,
          type: dto.type,
          status: EmailStatus.PENDING,
          metadata: dto.metadata,
        },
      });

      // Send email using existing method
      await this.sendEmail({
        to: dto.to,
        subject: dto.subject,
        html: dto.htmlContent,
      });

      // Update log
      await this.prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: EmailStatus.SENT,
          sentAt: new Date(),
        },
      });

      return { success: true, emailLogId: emailLog.id };
    } catch (error) {
      this.logger.error('Failed to send email with logging', error);
      throw error;
    }
  }

  /**
   * Send email using database template
   */
  async sendTemplateEmail(
    templateName: string,
    to: string,
    variables: Record<string, any>,
    userId?: string,
  ) {
    // Get template from database
    const template = await this.prisma.emailTemplate.findUnique({
      where: { name: templateName },
    });

    if (!template || !template.isActive) {
      throw new NotFoundException('Email template not found or inactive');
    }

    // Compile templates
    const subjectTemplate = handlebars.compile(template.subject);
    const htmlTemplate = handlebars.compile(template.htmlContent);
    const textTemplate = template.textContent
      ? handlebars.compile(template.textContent)
      : null;

    // Render templates
    const subject = subjectTemplate(variables);
    const htmlContent = htmlTemplate(variables);
    const textContent = textTemplate ? textTemplate(variables) : undefined;

    // Send email with logging
    return this.sendEmailWithLogging(
      {
        to,
        subject,
        htmlContent,
        textContent,
        type: template.type,
        metadata: { templateName, variables },
      },
      userId,
    );
  }

  /**
   * Queue email for later sending
   */
  async queueEmail(
    dto: SendEmailDto,
    userId?: string,
    priority: number = 5,
    scheduledFor?: Date,
  ) {
    return this.prisma.emailQueue.create({
      data: {
        to: dto.to,
        subject: dto.subject,
        htmlContent: dto.htmlContent,
        textContent: dto.textContent,
        type: dto.type,
        userId,
        priority,
        scheduledFor,
        metadata: dto.metadata,
      },
    });
  }

  /**
   * Process email queue
   */
  async processQueue(limit: number = 10) {
    const now = new Date();

    const queuedEmails = await this.prisma.emailQueue.findMany({
      where: {
        status: EmailStatus.QUEUED,
        OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }],
      },
      take: limit,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    const results = [];

    for (const email of queuedEmails) {
      try {
        await this.prisma.emailQueue.update({
          where: { id: email.id },
          data: {
            attempts: { increment: 1 },
            status: EmailStatus.PENDING,
          },
        });

        await this.sendEmailWithLogging({
          to: email.to,
          subject: email.subject,
          htmlContent: email.htmlContent,
          textContent: email.textContent || undefined,
          type: email.type,
          metadata: email.metadata,
        });

        await this.prisma.emailQueue.update({
          where: { id: email.id },
          data: {
            status: EmailStatus.SENT,
            processedAt: new Date(),
          },
        });

        results.push({ id: email.id, success: true });
      } catch (error) {
        await this.prisma.emailQueue.update({
          where: { id: email.id },
          data: {
            status:
              email.attempts + 1 >= email.maxAttempts
                ? EmailStatus.FAILED
                : EmailStatus.QUEUED,
            errorMessage: error.message,
          },
        });

        results.push({ id: email.id, success: false, error: error.message });
      }
    }

    return { processed: results.length, results };
  }

  // ==================== Template Management ====================

  async createTemplate(dto: CreateTemplateDto) {
    return this.prisma.emailTemplate.create({
      data: dto,
    });
  }

  async getTemplates(type?: EmailType) {
    return this.prisma.emailTemplate.findMany({
      where: type ? { type } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTemplate(id: string) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async updateTemplate(id: string, dto: Partial<CreateTemplateDto>) {
    await this.getTemplate(id);

    return this.prisma.emailTemplate.update({
      where: { id },
      data: dto,
    });
  }

  async deleteTemplate(id: string) {
    await this.getTemplate(id);

    await this.prisma.emailTemplate.delete({
      where: { id },
    });

    return { message: 'Template deleted successfully' };
  }

  // ==================== Notification Preferences ====================

  async getPreferences(userId: string) {
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      preferences = await this.prisma.notificationPreference.create({
        data: { userId },
      });
    }

    return preferences;
  }

  async updatePreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    await this.getPreferences(userId);

    return this.prisma.notificationPreference.update({
      where: { userId },
      data: dto,
    });
  }

  async canReceiveNotification(userId: string, notificationType: string): Promise<boolean> {
    const preferences = await this.getPreferences(userId);

    if (!preferences.emailEnabled) {
      return false;
    }

    const typeMap: Record<string, keyof typeof preferences> = {
      order_confirmation: 'orderConfirmation',
      shipping_update: 'shippingUpdates',
      delivery_notification: 'deliveryNotifications',
      newsletter: 'newsletters',
      promotional: 'promotionalEmails',
      product_recommendation: 'productRecommendations',
      cart_abandonment: 'cartAbandonment',
      price_drop: 'priceDropAlerts',
      back_in_stock: 'backInStockAlerts',
      wishlist_update: 'wishlistUpdates',
      review_reminder: 'reviewReminders',
      security_alert: 'securityAlerts',
      account_update: 'accountUpdates',
    };

    const preferenceField = typeMap[notificationType];
    if (!preferenceField) {
      return true;
    }

    return preferences[preferenceField] as boolean;
  }

  // ==================== Email Analytics ====================

  async getEmailStats(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [total, sent, failed, pending, byType] = await Promise.all([
      this.prisma.emailLog.count({ where }),
      this.prisma.emailLog.count({
        where: { ...where, status: EmailStatus.SENT },
      }),
      this.prisma.emailLog.count({
        where: { ...where, status: EmailStatus.FAILED },
      }),
      this.prisma.emailLog.count({
        where: { ...where, status: EmailStatus.PENDING },
      }),
      this.prisma.emailLog.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      sent,
      failed,
      pending,
      successRate: total > 0 ? (sent / total) * 100 : 0,
      byType: byType.map((t) => ({
        type: t.type,
        count: t._count,
      })),
    };
  }

  async getEmailLogs(params: {
    page?: number;
    limit?: number;
    userId?: string;
    status?: EmailStatus;
    type?: EmailType;
  }) {
    const { page = 1, limit = 20, userId, status, type } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (type) where.type = type;

    const [logs, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          template: {
            select: {
              name: true,
              type: true,
            },
          },
        },
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== Transactional Email Helpers ====================

  async sendCartAbandonmentEmail(email: string, cartData: any) {
    return this.sendTemplateEmail('cart_abandonment', email, {
      cartItems: cartData.items,
      cartTotal: cartData.total,
      recoveryLink: `${process.env.FRONTEND_URL}/cart`,
    });
  }

  async sendPriceDropAlert(userId: string, productData: any) {
    const canSend = await this.canReceiveNotification(userId, 'price_drop');
    if (!canSend) return;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    return this.sendTemplateEmail(
      'price_drop_alert',
      user.email,
      {
        userName: user.name,
        productName: productData.name,
        oldPrice: productData.oldPrice,
        newPrice: productData.newPrice,
        productLink: `${process.env.FRONTEND_URL}/products/${productData.slug}`,
      },
      userId,
    );
  }

  async sendBackInStockAlert(userId: string, productData: any) {
    const canSend = await this.canReceiveNotification(userId, 'back_in_stock');
    if (!canSend) return;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    return this.sendTemplateEmail(
      'back_in_stock_alert',
      user.email,
      {
        userName: user.name,
        productName: productData.name,
        productLink: `${process.env.FRONTEND_URL}/products/${productData.slug}`,
      },
      userId,
    );
  }
}
