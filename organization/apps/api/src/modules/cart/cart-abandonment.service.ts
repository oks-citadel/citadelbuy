import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EmailService } from '@/modules/email/email.service';
import { AbandonmentEmailType, EmailType } from '@prisma/client';
import * as crypto from 'crypto';

export interface AbandonmentConfig {
  reminderDelays: {
    REMINDER_1HR: number;   // milliseconds
    REMINDER_24HR: number;
    REMINDER_72HR: number;
  };
  discountPercent: {
    REMINDER_1HR: number;
    REMINDER_24HR: number;
    REMINDER_72HR: number;
  };
  discountExpiry: number; // hours
  minCartValue: number;   // minimum cart value for recovery emails
  maxReminders: number;
}

const DEFAULT_CONFIG: AbandonmentConfig = {
  reminderDelays: {
    REMINDER_1HR: 60 * 60 * 1000,        // 1 hour
    REMINDER_24HR: 24 * 60 * 60 * 1000,  // 24 hours
    REMINDER_72HR: 72 * 60 * 60 * 1000,  // 72 hours
  },
  discountPercent: {
    REMINDER_1HR: 0,      // No discount on first reminder
    REMINDER_24HR: 5,     // 5% discount
    REMINDER_72HR: 10,    // 10% discount
  },
  discountExpiry: 48,     // Discount valid for 48 hours
  minCartValue: 10,       // Minimum $10 cart value
  maxReminders: 3,
};

@Injectable()
export class CartAbandonmentService {
  private readonly logger = new Logger(CartAbandonmentService.name);
  private config: AbandonmentConfig;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    this.config = {
      ...DEFAULT_CONFIG,
      minCartValue: this.configService.get('CART_ABANDONMENT_MIN_VALUE', DEFAULT_CONFIG.minCartValue),
    };
  }

  /**
   * Detect and mark abandoned carts
   * Called by cron job every 15 minutes
   */
  async detectAbandonedCarts(): Promise<number> {
    const abandonmentThreshold = new Date(Date.now() - 60 * 60 * 1000); // 1 hour inactive

    // Find carts that are:
    // 1. Not already marked as abandoned
    // 2. Not converted to an order
    // 3. Have items
    // 4. Last activity was over 1 hour ago
    // 5. Have a user with email OR have abandonment tracking with email
    const carts = await this.prisma.cart.findMany({
      where: {
        isAbandoned: false,
        convertedToOrder: false,
        lastActivityAt: {
          lt: abandonmentThreshold,
        },
        total: {
          gte: this.config.minCartValue,
        },
        items: {
          some: {},
        },
        OR: [
          { user: { isNot: null } },
          { abandonmentTracking: { email: { not: null } } },
        ],
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
                price: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        abandonmentTracking: true,
      },
    });

    let processedCount = 0;

    for (const cart of carts) {
      const email = cart.user?.email || cart.abandonmentTracking?.email;
      if (!email) continue;

      const customerName = cart.user?.name || 'Valued Customer';

      try {
        // Create or update abandonment tracking
        const abandonment = await this.prisma.cartAbandonment.upsert({
          where: { cartId: cart.id },
          update: {
            cartValue: cart.total,
            itemCount: cart.items.length,
            abandonedAt: new Date(),
          },
          create: {
            cartId: cart.id,
            email,
            cartValue: cart.total,
            itemCount: cart.items.length,
          },
        });

        // Mark cart as abandoned
        await this.prisma.cart.update({
          where: { id: cart.id },
          data: { isAbandoned: true },
        });

        // Schedule email sequence
        await this.scheduleEmailSequence(abandonment.id, email, customerName);

        processedCount++;
        this.logger.log(`Marked cart ${cart.id} as abandoned for ${email}`);
      } catch (error) {
        this.logger.error(`Failed to process cart ${cart.id}:`, error);
      }
    }

    return processedCount;
  }

  /**
   * Schedule the email sequence for an abandoned cart
   */
  private async scheduleEmailSequence(
    abandonmentId: string,
    email: string,
    customerName: string,
  ): Promise<void> {
    const now = new Date();
    const emailTypes: AbandonmentEmailType[] = [
      'REMINDER_1HR',
      'REMINDER_24HR',
      'REMINDER_72HR',
    ];

    for (const emailType of emailTypes) {
      const delay = this.config.reminderDelays[emailType];
      const scheduledFor = new Date(now.getTime() + delay);

      // Check if this email type already exists for this abandonment
      const existing = await this.prisma.cartAbandonmentEmail.findUnique({
        where: {
          abandonmentId_emailType: {
            abandonmentId,
            emailType,
          },
        },
      });

      if (!existing) {
        await this.prisma.cartAbandonmentEmail.create({
          data: {
            abandonmentId,
            emailType,
            scheduledFor,
            recoveryDiscount: this.config.discountPercent[emailType],
          },
        });
      }
    }
  }

  /**
   * Process pending abandonment emails
   * Called by cron job every 5 minutes
   */
  async processAbandonmentEmails(): Promise<{ sent: number; failed: number }> {
    const now = new Date();

    // Get all emails that are due to be sent
    const pendingEmails = await this.prisma.cartAbandonmentEmail.findMany({
      where: {
        sent: false,
        unsubscribed: false,
        scheduledFor: {
          lte: now,
        },
        abandonment: {
          recovered: false,  // Don't send if cart was already recovered
        },
      },
      include: {
        abandonment: {
          include: {
            cart: {
              include: {
                items: {
                  include: {
                    product: {
                      select: {
                        id: true,
                        name: true,
                        slug: true,
                        images: true,
                        price: true,
                      },
                    },
                  },
                },
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
      take: 50, // Process in batches
    });

    let sent = 0;
    let failed = 0;

    for (const email of pendingEmails) {
      // Check if user has opted out of cart abandonment emails
      const userId = email.abandonment.cart.user?.id;
      if (userId) {
        const canReceive = await this.emailService.canReceiveNotification(
          userId,
          'cart_abandonment',
        );
        if (!canReceive) {
          await this.prisma.cartAbandonmentEmail.update({
            where: { id: email.id },
            data: { unsubscribed: true, unsubscribedAt: new Date() },
          });
          continue;
        }
      }

      try {
        await this.sendAbandonmentEmail(email);
        sent++;
      } catch (error) {
        this.logger.error(`Failed to send abandonment email ${email.id}:`, error);
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Send an individual abandonment email
   */
  private async sendAbandonmentEmail(abandonmentEmail: any): Promise<void> {
    const { abandonment, emailType, recoveryDiscount } = abandonmentEmail;
    const cart = abandonment.cart;
    const customerEmail = cart.user?.email || abandonment.email;
    const customerName = cart.user?.name || 'Valued Customer';

    // Generate unique recovery discount code if applicable
    let discountCode: string | null = null;
    let discountExpiry: Date | null = null;

    if (recoveryDiscount && recoveryDiscount > 0) {
      discountCode = `RECOVER-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      discountExpiry = new Date(Date.now() + this.config.discountExpiry * 60 * 60 * 1000);

      // Update abandonment with discount info
      await this.prisma.cartAbandonment.update({
        where: { id: abandonment.id },
        data: {
          recoveryDiscountCode: discountCode,
          recoveryDiscountPercent: recoveryDiscount,
          discountExpiresAt: discountExpiry,
          lastEmailType: emailType,
        },
      });
    }

    // Prepare email content
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
    const apiUrl = this.configService.get('API_URL', 'http://localhost:3000/api');

    // Add tracking to recovery link
    const recoveryLink = `${apiUrl}/cart-abandonment/track/click/${abandonmentEmail.id}?redirect=${encodeURIComponent(`${frontendUrl}/cart?recover=${abandonment.id}`)}`;
    const unsubscribeLink = `${apiUrl}/cart-abandonment/unsubscribe/${abandonment.id}`;

    // Create tracking pixel URL for email opens
    const trackingPixelUrl = `${apiUrl}/cart-abandonment/track/open/${abandonmentEmail.id}`;

    const cartItems = cart.items.map((item: any) => ({
      name: item.product.name,
      price: item.price,
      quantity: item.quantity,
      image: item.product.images?.[0] || null,
      productUrl: `${frontendUrl}/products/${item.product.slug}`,
    }));

    const emailContent = this.generateEmailContent(emailType, {
      customerName,
      cartItems,
      cartTotal: cart.total,
      discountCode,
      discountPercent: recoveryDiscount,
      discountExpiry,
      recoveryLink,
      unsubscribeLink,
      trackingPixelUrl,
    });

    // Send email and log it
    const emailLog = await this.emailService.sendEmailWithLogging({
      to: customerEmail,
      subject: emailContent.subject,
      htmlContent: emailContent.html,
      textContent: emailContent.text,
      type: EmailType.NOTIFICATION,
      metadata: {
        abandonmentId: abandonment.id,
        abandonmentEmailId: abandonmentEmail.id,
        emailType,
        cartValue: cart.total,
        itemCount: cart.items.length,
      },
    });

    // Update the abandonment email record
    await this.prisma.cartAbandonmentEmail.update({
      where: { id: abandonmentEmail.id },
      data: {
        sent: true,
        sentAt: new Date(),
        emailLogId: emailLog.emailLogId,
      },
    });

    // Update the main abandonment record
    await this.prisma.cartAbandonment.update({
      where: { id: abandonment.id },
      data: {
        recoveryEmailSent: true,
        recoveryEmailSentAt: new Date(),
        remindersSent: {
          increment: 1,
        },
      },
    });

    this.logger.log(
      `Sent ${emailType} email for cart ${cart.id} to ${customerEmail}`,
    );
  }

  /**
   * Generate email content based on type
   */
  private generateEmailContent(
    emailType: AbandonmentEmailType,
    data: {
      customerName: string;
      cartItems: any[];
      cartTotal: number;
      discountCode: string | null;
      discountPercent: number;
      discountExpiry: Date | null;
      recoveryLink: string;
      unsubscribeLink: string;
      trackingPixelUrl: string;
    },
  ): { subject: string; html: string; text: string } {
    const subjects: Record<AbandonmentEmailType, string> = {
      REMINDER_1HR: `Still thinking about it? Your cart is waiting! 🛒`,
      REMINDER_24HR: `Don't miss out! Complete your order + get ${data.discountPercent}% off`,
      REMINDER_72HR: `Last chance! ${data.discountPercent}% off your cart - expires soon!`,
    };

    const itemsHtml = data.cartItems
      .map(
        (item) => `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
              ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;" />` : ''}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
              <a href="${item.productUrl}" style="color: #333; text-decoration: none; font-weight: bold;">${item.name}</a>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
          </tr>
        `,
      )
      .join('');

    const discountHtml =
      data.discountCode && data.discountPercent > 0
        ? `
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 16px;">Use code:</p>
            <p style="margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 2px;">${data.discountCode}</p>
            <p style="margin: 10px 0 0 0; font-size: 14px;">for ${data.discountPercent}% off your order!</p>
            ${data.discountExpiry ? `<p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.9;">Expires: ${data.discountExpiry.toLocaleDateString()}</p>` : ''}
          </div>
        `
        : '';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subjects[emailType]}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: #1a1a2e; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin: 0; font-size: 24px;">CitadelBuy</h1>
    </div>

    <!-- Main Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      <h2 style="color: #333; margin: 0 0 20px 0;">Hi ${data.customerName}!</h2>

      ${this.getEmailBodyByType(emailType)}

      ${discountHtml}

      <!-- Cart Items -->
      <div style="margin: 20px 0;">
        <h3 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">Your Cart Items</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f9f9f9;">
              <th style="padding: 10px; text-align: left; width: 70px;"></th>
              <th style="padding: 10px; text-align: left;">Product</th>
              <th style="padding: 10px; text-align: center;">Qty</th>
              <th style="padding: 10px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 15px; text-align: right; font-weight: bold;">Total:</td>
              <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 18px; color: #2563eb;">$${data.cartTotal.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.recoveryLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
          Complete Your Purchase
        </a>
      </div>

      <!-- Help Section -->
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-top: 20px;">
        <p style="margin: 0; color: #666; font-size: 14px;">
          <strong>Need help?</strong> Our customer support team is here for you 24/7.
          <br>Reply to this email or visit our <a href="#" style="color: #667eea;">Help Center</a>.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
      <p>You received this email because you left items in your cart at CitadelBuy.</p>
      <p>
        <a href="${data.unsubscribeLink}" style="color: #999;">Unsubscribe</a> from cart reminder emails
      </p>
      <p>&copy; ${new Date().getFullYear()} CitadelBuy. All rights reserved.</p>
    </div>
  </div>

  <!-- Tracking Pixel for Email Opens -->
  <img src="${data.trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />
</body>
</html>
    `;

    const text = `
Hi ${data.customerName}!

${this.getEmailBodyTextByType(emailType)}

${data.discountCode ? `Use code ${data.discountCode} for ${data.discountPercent}% off!` : ''}

Your Cart Items:
${data.cartItems.map((item) => `- ${item.name} x${item.quantity} - $${item.price.toFixed(2)}`).join('\n')}

Total: $${data.cartTotal.toFixed(2)}

Complete your purchase: ${data.recoveryLink}

---
Unsubscribe: ${data.unsubscribeLink}
    `.trim();

    return {
      subject: subjects[emailType],
      html,
      text,
    };
  }

  private getEmailBodyByType(emailType: AbandonmentEmailType): string {
    const bodies: Record<AbandonmentEmailType, string> = {
      REMINDER_1HR: `
        <p style="color: #555; line-height: 1.6;">
          We noticed you left some amazing items in your shopping cart. Don't let them slip away!
        </p>
        <p style="color: #555; line-height: 1.6;">
          Your items are reserved for a limited time. Complete your purchase now before they're gone.
        </p>
      `,
      REMINDER_24HR: `
        <p style="color: #555; line-height: 1.6;">
          Your cart is still waiting for you! We've saved your items, but they won't be available forever.
        </p>
        <p style="color: #555; line-height: 1.6;">
          As a thank you for being a valued customer, here's an exclusive discount just for you:
        </p>
      `,
      REMINDER_72HR: `
        <p style="color: #555; line-height: 1.6;">
          <strong>This is your last chance!</strong> Your cart items are about to expire.
        </p>
        <p style="color: #555; line-height: 1.6;">
          We really don't want you to miss out, so here's our best offer:
        </p>
      `,
    };
    return bodies[emailType];
  }

  private getEmailBodyTextByType(emailType: AbandonmentEmailType): string {
    const bodies: Record<AbandonmentEmailType, string> = {
      REMINDER_1HR:
        "We noticed you left some amazing items in your shopping cart. Don't let them slip away! Your items are reserved for a limited time.",
      REMINDER_24HR:
        "Your cart is still waiting for you! We've saved your items, but they won't be available forever. Here's an exclusive discount just for you!",
      REMINDER_72HR:
        "This is your last chance! Your cart items are about to expire. We really don't want you to miss out, so here's our best offer!",
    };
    return bodies[emailType];
  }

  /**
   * Mark cart as recovered when order is placed
   */
  async markCartRecovered(cartId: string, orderId: string): Promise<void> {
    const abandonment = await this.prisma.cartAbandonment.findUnique({
      where: { cartId },
      include: {
        emails: {
          where: { sent: true },
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
    });

    if (abandonment) {
      await this.prisma.cartAbandonment.update({
        where: { id: abandonment.id },
        data: {
          recovered: true,
          recoveredAt: new Date(),
          recoveryOrderId: orderId,
        },
      });

      // Mark the last sent email as converted
      if (abandonment.emails.length > 0) {
        await this.prisma.cartAbandonmentEmail.update({
          where: { id: abandonment.emails[0].id },
          data: {
            convertedToOrder: true,
            orderId,
          },
        });
      }

      this.logger.log(`Cart ${cartId} marked as recovered with order ${orderId}`);
    }
  }

  /**
   * Track email opens (called via tracking pixel)
   * Only tracks the first open to avoid inflating metrics
   */
  async trackEmailOpen(abandonmentEmailId: string): Promise<void> {
    try {
      const email = await this.prisma.cartAbandonmentEmail.findUnique({
        where: { id: abandonmentEmailId },
        select: { opened: true, openedAt: true },
      });

      // Only update if not already opened (track first open only)
      if (email && !email.opened) {
        await this.prisma.cartAbandonmentEmail.update({
          where: { id: abandonmentEmailId },
          data: {
            opened: true,
            openedAt: new Date(),
          },
        });

        this.logger.debug(`Tracked email open for abandonment email ${abandonmentEmailId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to track email open for ${abandonmentEmailId}:`, error);
      // Don't throw - tracking failures shouldn't break the email experience
    }
  }

  /**
   * Track email link clicks
   * Only tracks the first click to avoid inflating metrics
   */
  async trackEmailClick(abandonmentEmailId: string): Promise<void> {
    try {
      const email = await this.prisma.cartAbandonmentEmail.findUnique({
        where: { id: abandonmentEmailId },
        select: { clicked: true, clickedAt: true, opened: true },
      });

      if (email) {
        const updateData: any = {};

        // Track click if not already clicked (first click only)
        if (!email.clicked) {
          updateData.clicked = true;
          updateData.clickedAt = new Date();
        }

        // Also mark as opened if clicking (implies they opened the email)
        if (!email.opened) {
          updateData.opened = true;
          updateData.openedAt = new Date();
        }

        if (Object.keys(updateData).length > 0) {
          await this.prisma.cartAbandonmentEmail.update({
            where: { id: abandonmentEmailId },
            data: updateData,
          });

          this.logger.debug(`Tracked email click for abandonment email ${abandonmentEmailId}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to track email click for ${abandonmentEmailId}:`, error);
      // Don't throw - tracking failures shouldn't break the user experience
    }
  }

  /**
   * Validate and apply recovery discount code
   */
  async validateRecoveryDiscount(
    code: string,
    cartTotal: number,
  ): Promise<{ valid: boolean; discount: number; message: string }> {
    const abandonment = await this.prisma.cartAbandonment.findFirst({
      where: {
        recoveryDiscountCode: code,
        recovered: false,
      },
    });

    if (!abandonment) {
      return { valid: false, discount: 0, message: 'Invalid discount code' };
    }

    if (abandonment.discountExpiresAt && abandonment.discountExpiresAt < new Date()) {
      return { valid: false, discount: 0, message: 'Discount code has expired' };
    }

    const discountAmount = (cartTotal * (abandonment.recoveryDiscountPercent || 0)) / 100;

    return {
      valid: true,
      discount: discountAmount,
      message: `${abandonment.recoveryDiscountPercent}% discount applied!`,
    };
  }

  /**
   * Get abandonment analytics
   */
  async getAbandonmentAnalytics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalAbandoned: number;
    totalRecovered: number;
    recoveryRate: number;
    recoveredValue: number;
    emailStats: {
      type: AbandonmentEmailType;
      sent: number;
      opened: number;
      clicked: number;
      converted: number;
      openRate: number;
      clickRate: number;
      conversionRate: number;
    }[];
    dailyStats: { date: string; abandoned: number; recovered: number }[];
  }> {
    const where: any = {};
    if (startDate || endDate) {
      where.abandonedAt = {};
      if (startDate) where.abandonedAt.gte = startDate;
      if (endDate) where.abandonedAt.lte = endDate;
    }

    const [totalAbandoned, recovered, recoveredSum, emailStats] = await Promise.all([
      this.prisma.cartAbandonment.count({ where }),
      this.prisma.cartAbandonment.count({ where: { ...where, recovered: true } }),
      this.prisma.cartAbandonment.aggregate({
        where: { ...where, recovered: true },
        _sum: { cartValue: true },
      }),
      this.prisma.cartAbandonmentEmail.groupBy({
        by: ['emailType'],
        _count: { id: true, sent: true, opened: true, clicked: true, convertedToOrder: true },
        where: where.abandonedAt
          ? { abandonment: { abandonedAt: where.abandonedAt } }
          : undefined,
      }),
    ]);

    const recoveryRate = totalAbandoned > 0 ? (recovered / totalAbandoned) * 100 : 0;

    // Format email stats
    const formattedEmailStats = emailStats.map((stat) => {
      const sent = stat._count.sent || 0;
      const opened = stat._count.opened || 0;
      const clicked = stat._count.clicked || 0;
      const converted = stat._count.convertedToOrder || 0;

      return {
        type: stat.emailType,
        sent,
        opened,
        clicked,
        converted,
        openRate: sent > 0 ? (opened / sent) * 100 : 0,
        clickRate: sent > 0 ? (clicked / sent) * 100 : 0,
        conversionRate: sent > 0 ? (converted / sent) * 100 : 0,
      };
    });

    // Get daily stats for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyAbandoned = await this.prisma.$queryRaw<
      { date: Date; count: bigint }[]
    >`
      SELECT DATE(abandoned_at) as date, COUNT(*) as count
      FROM cart_abandonments
      WHERE abandoned_at >= ${thirtyDaysAgo}
      GROUP BY DATE(abandoned_at)
      ORDER BY date
    `;

    const dailyRecovered = await this.prisma.$queryRaw<
      { date: Date; count: bigint }[]
    >`
      SELECT DATE(recovered_at) as date, COUNT(*) as count
      FROM cart_abandonments
      WHERE recovered = true AND recovered_at >= ${thirtyDaysAgo}
      GROUP BY DATE(recovered_at)
      ORDER BY date
    `;

    const dailyMap = new Map<string, { abandoned: number; recovered: number }>();

    dailyAbandoned.forEach((row) => {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      dailyMap.set(dateStr, {
        abandoned: Number(row.count),
        recovered: 0,
      });
    });

    dailyRecovered.forEach((row) => {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      const existing = dailyMap.get(dateStr) || { abandoned: 0, recovered: 0 };
      dailyMap.set(dateStr, {
        ...existing,
        recovered: Number(row.count),
      });
    });

    const dailyStats = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalAbandoned,
      totalRecovered: recovered,
      recoveryRate,
      recoveredValue: recoveredSum._sum.cartValue || 0,
      emailStats: formattedEmailStats,
      dailyStats,
    };
  }

  /**
   * Clean up old abandonment records
   */
  async cleanupOldAbandonments(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.cartAbandonment.deleteMany({
      where: {
        OR: [
          { recovered: true, recoveredAt: { lt: cutoffDate } },
          { recovered: false, abandonedAt: { lt: cutoffDate } },
        ],
      },
    });

    return result.count;
  }

  /**
   * Handle unsubscribe request
   */
  async handleUnsubscribe(abandonmentId: string): Promise<void> {
    const abandonment = await this.prisma.cartAbandonment.findUnique({
      where: { id: abandonmentId },
      include: { cart: { include: { user: true } } },
    });

    if (!abandonment) {
      throw new NotFoundException('Abandonment record not found');
    }

    // Mark all pending emails as unsubscribed
    await this.prisma.cartAbandonmentEmail.updateMany({
      where: {
        abandonmentId,
        sent: false,
      },
      data: {
        unsubscribed: true,
        unsubscribedAt: new Date(),
      },
    });

    // If user exists, update their notification preferences
    if (abandonment.cart.user) {
      await this.prisma.notificationPreference.upsert({
        where: { userId: abandonment.cart.user.id },
        update: { cartAbandonment: false },
        create: {
          userId: abandonment.cart.user.id,
          cartAbandonment: false,
        },
      });
    }

    this.logger.log(`Unsubscribed abandonment ${abandonmentId} from recovery emails`);
  }
}
