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

  // ==================== Core Email Methods ====================

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Welcome to CitadelBuy - Your Shopping Journey Starts Here!',
      template: 'welcome',
      context: {
        name,
        shopUrl: `${this.configService.get('FRONTEND_URL')}`,
        helpUrl: `${this.configService.get('FRONTEND_URL')}/help`,
        unsubscribeUrl: `${this.configService.get('FRONTEND_URL')}/account/notifications`,
      },
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, data: {
    name: string;
    resetToken: string;
    expiryMinutes?: number;
    ipAddress?: string;
  }): Promise<void> {
    const expiryTime = data.expiryMinutes || 60;
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/auth/reset-password?token=${data.resetToken}`;

    await this.sendEmail({
      to: email,
      subject: 'Reset Your CitadelBuy Password',
      template: 'password-reset',
      context: {
        name: data.name,
        email,
        resetUrl,
        expiryTime,
        requestDate: new Date().toLocaleString(),
        ipAddress: data.ipAddress || 'Unknown',
        supportUrl: `${this.configService.get('FRONTEND_URL')}/support`,
      },
    });
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(email: string, data: {
    customerName: string;
    orderNumber: string;
    orderDate: string;
    items: Array<{
      name: string;
      image?: string;
      variant?: string;
      quantity: number;
      price: number;
    }>;
    subtotal: number;
    discount?: number;
    discountCode?: string;
    shipping: number;
    shippingFree?: boolean;
    tax: number;
    total: number;
    currency?: string;
    shippingAddress: {
      name: string;
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    paymentMethod: {
      brand: string;
      last4: string;
      email?: string;
    };
    estimatedDelivery: string;
  }): Promise<void> {
    const currency = data.currency || '$';

    await this.sendEmail({
      to: email,
      subject: `Order Confirmed - #${data.orderNumber}`,
      template: 'order-confirmation',
      context: {
        ...data,
        currency,
        itemCount: data.items.length,
        trackingUrl: `${this.configService.get('FRONTEND_URL')}/orders/${data.orderNumber}`,
        helpUrl: `${this.configService.get('FRONTEND_URL')}/help`,
        supportEmail: this.configService.get('SUPPORT_EMAIL') || 'support@citadelbuy.com',
        unsubscribeUrl: `${this.configService.get('FRONTEND_URL')}/account/notifications`,
        privacyUrl: `${this.configService.get('FRONTEND_URL')}/privacy`,
      },
    });
  }

  /**
   * Send order status update email
   */
  async sendOrderStatusUpdate(email: string, data: {
    customerName: string;
    orderNumber: string;
    orderDate: string;
    status: 'processing' | 'shipped' | 'delivered' | 'cancelled';
    statusMessage: string;
    trackingNumber?: string;
    carrier?: string;
    trackingUrl?: string;
    estimatedDelivery?: string;
    items: Array<{
      name: string;
      image?: string;
      quantity: number;
    }>;
  }): Promise<void> {
    const statusConfig = {
      processing: {
        statusClass: 'processing',
        statusIcon: '&#9881;&#65039;',
        statusTitle: 'Order Being Prepared',
      },
      shipped: {
        statusClass: 'shipped',
        statusIcon: '&#128230;',
        statusTitle: 'Your Order Has Shipped!',
      },
      delivered: {
        statusClass: 'delivered',
        statusIcon: '&#10004;&#65039;',
        statusTitle: 'Order Delivered!',
      },
      cancelled: {
        statusClass: 'cancelled',
        statusIcon: '&#10060;',
        statusTitle: 'Order Cancelled',
      },
    };

    const config = statusConfig[data.status];

    // Build progress steps based on status
    const progressSteps = [
      {
        stepNumber: 1,
        title: 'Order Placed',
        date: data.orderDate,
        completed: true,
      },
      {
        stepNumber: 2,
        title: 'Processing',
        completed: ['processing', 'shipped', 'delivered'].includes(data.status),
        current: data.status === 'processing',
      },
      {
        stepNumber: 3,
        title: 'Shipped',
        completed: ['shipped', 'delivered'].includes(data.status),
        current: data.status === 'shipped',
        description: data.trackingNumber ? `Tracking: ${data.trackingNumber}` : undefined,
      },
      {
        stepNumber: 4,
        title: 'Delivered',
        completed: data.status === 'delivered',
        current: false,
      },
    ];

    await this.sendEmail({
      to: email,
      subject: `Order Update - #${data.orderNumber} - ${config.statusTitle}`,
      template: 'order-status-update',
      context: {
        ...data,
        ...config,
        progressSteps,
        orderUrl: `${this.configService.get('FRONTEND_URL')}/orders/${data.orderNumber}`,
        helpUrl: `${this.configService.get('FRONTEND_URL')}/help`,
        returnUrl: `${this.configService.get('FRONTEND_URL')}/returns`,
        contactUrl: `${this.configService.get('FRONTEND_URL')}/support`,
        unsubscribeUrl: `${this.configService.get('FRONTEND_URL')}/account/notifications`,
      },
    });
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
          htmlContent: email.htmlContent ?? '',
          textContent: email.textContent || undefined,
          type: email.type ?? ('DEFAULT' as EmailType),
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

  // ==================== KYC Notification Methods ====================

  /**
   * Send KYC verification approved email
   */
  async sendKycApproved(data: {
    email: string;
    organizationName: string;
    applicationId: string;
    verificationScore?: number;
    approvedDate: string;
    idVerified?: boolean;
    addressVerified?: boolean;
    businessVerified?: boolean;
  }): Promise<void> {
    try {
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://citadelbuy.com';
      const supportEmail = this.configService.get('SUPPORT_EMAIL') || 'support@citadelbuy.com';

      await this.sendEmail({
        to: data.email,
        subject: `KYC Verification Approved - ${data.organizationName}`,
        template: 'kyc-approved',
        context: {
          organizationName: data.organizationName,
          applicationId: data.applicationId,
          verificationScore: data.verificationScore || 'N/A',
          approvedDate: data.approvedDate,
          idVerified: data.idVerified,
          addressVerified: data.addressVerified,
          businessVerified: data.businessVerified,
          verifiedComponents: data.idVerified || data.addressVerified || data.businessVerified,
          dashboardUrl: `${frontendUrl}/org/dashboard`,
          supportEmail,
          currentYear: new Date().getFullYear(),
        },
      });

      this.logger.log(`KYC approved email sent to ${data.email} for ${data.organizationName}`);
    } catch (error) {
      this.logger.error(`Failed to send KYC approved email to ${data.email}`, error);
      // Don't throw error - email failures shouldn't break the KYC process
    }
  }

  /**
   * Send KYC verification rejected email
   */
  async sendKycRejected(data: {
    email: string;
    organizationName: string;
    applicationId: string;
    submittedDate: string;
    reviewedDate: string;
    rejectionReasons?: string[];
  }): Promise<void> {
    try {
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://citadelbuy.com';
      const supportEmail = this.configService.get('SUPPORT_EMAIL') || 'support@citadelbuy.com';

      await this.sendEmail({
        to: data.email,
        subject: `KYC Verification Update - ${data.organizationName}`,
        template: 'kyc-rejected',
        context: {
          organizationName: data.organizationName,
          applicationId: data.applicationId,
          submittedDate: data.submittedDate,
          reviewedDate: data.reviewedDate,
          rejectionReasons: data.rejectionReasons || [
            'Document verification did not meet requirements',
            'Please ensure all documents are clear, valid, and match your organization information',
          ],
          resubmitUrl: `${frontendUrl}/org/kyc`,
          supportUrl: `${frontendUrl}/support`,
          supportEmail,
          currentYear: new Date().getFullYear(),
        },
      });

      this.logger.log(`KYC rejected email sent to ${data.email} for ${data.organizationName}`);
    } catch (error) {
      this.logger.error(`Failed to send KYC rejected email to ${data.email}`, error);
      // Don't throw error - email failures shouldn't break the KYC process
    }
  }

  /**
   * Send KYC verification pending review email
   */
  async sendKycPendingReview(data: {
    email: string;
    organizationName: string;
    applicationId: string;
    submittedDate: string;
    estimatedReviewTime?: string;
  }): Promise<void> {
    try {
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'https://citadelbuy.com';
      const supportEmail = this.configService.get('SUPPORT_EMAIL') || 'support@citadelbuy.com';

      await this.sendEmail({
        to: data.email,
        subject: `KYC Verification Under Review - ${data.organizationName}`,
        template: 'kyc-pending-review',
        context: {
          organizationName: data.organizationName,
          applicationId: data.applicationId,
          submittedDate: data.submittedDate,
          estimatedReviewTime: data.estimatedReviewTime || '1-3 business days',
          statusUrl: `${frontendUrl}/org/kyc/status`,
          supportEmail,
          currentYear: new Date().getFullYear(),
        },
      });

      this.logger.log(`KYC pending review email sent to ${data.email} for ${data.organizationName}`);
    } catch (error) {
      this.logger.error(`Failed to send KYC pending review email to ${data.email}`, error);
      // Don't throw error - email failures shouldn't break the KYC process
    }
  }
}
