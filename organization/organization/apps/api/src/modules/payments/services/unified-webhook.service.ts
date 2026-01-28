import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  PaymentProviderType,
  PaymentStatus,
  WebhookEvent,
} from '../interfaces';
import { StripeProvider } from '../providers/stripe.provider';
import { PayPalProvider } from '../providers/paypal.provider';
import { FlutterwaveProvider } from '../providers/flutterwave.provider';
import { PaystackProvider } from '../providers/paystack.provider';
import { AppleIAPProvider } from '../providers/apple-iap.provider';
import { GoogleIAPProvider } from '../providers/google-iap.provider';

interface WebhookProcessResult {
  success: boolean;
  eventType?: string;
  error?: string;
}

/**
 * Unified Webhook Service
 *
 * Processes webhooks from all payment providers and updates the system accordingly.
 * Ensures idempotency by tracking processed webhook events.
 */
@Injectable()
export class UnifiedWebhookService {
  private readonly logger = new Logger(UnifiedWebhookService.name);
  private readonly processedEvents: Set<string> = new Set();

  constructor(
    private prisma: PrismaService,
    private stripeProvider: StripeProvider,
    private paypalProvider: PayPalProvider,
    private flutterwaveProvider: FlutterwaveProvider,
    private paystackProvider: PaystackProvider,
    private appleIAPProvider: AppleIAPProvider,
    private googleIAPProvider: GoogleIAPProvider,
  ) {}

  /**
   * Process webhook from payment provider
   */
  async processWebhook(
    provider: PaymentProviderType,
    payload: string | Buffer,
    signature: string,
    headers?: Record<string, string>,
  ): Promise<WebhookProcessResult> {
    try {
      // Validate webhook
      const validation = await this.validateWebhook(provider, payload, signature, headers);

      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      const event = validation.event!;

      // Check idempotency
      if (await this.isEventProcessed(event.id, provider)) {
        this.logger.debug(`Event ${event.id} already processed, skipping`);
        return { success: true, eventType: event.type };
      }

      // Process event based on type
      await this.handleEvent(provider, event);

      // Mark event as processed
      await this.markEventProcessed(event.id, provider);

      return { success: true, eventType: event.type };
    } catch (error: any) {
      this.logger.error(`Webhook processing error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process IAP notification
   */
  async processIAPNotification(
    platform: 'ios' | 'android',
    notification: any,
  ): Promise<WebhookProcessResult> {
    try {
      const provider = platform === 'ios' ? this.appleIAPProvider : this.googleIAPProvider;
      const result = await provider.processNotification(notification);

      // Check idempotency
      const eventId = `${platform}_${result.originalTransactionId}_${result.type}`;
      if (await this.isEventProcessed(eventId, platform === 'ios' ? PaymentProviderType.APPLE_IAP : PaymentProviderType.GOOGLE_IAP)) {
        return { success: true, eventType: result.type };
      }

      // Handle notification
      await this.handleIAPNotification(platform, result);

      // Mark as processed
      await this.markEventProcessed(
        eventId,
        platform === 'ios' ? PaymentProviderType.APPLE_IAP : PaymentProviderType.GOOGLE_IAP,
      );

      return { success: true, eventType: result.type };
    } catch (error: any) {
      this.logger.error(`IAP notification processing error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private async validateWebhook(
    provider: PaymentProviderType,
    payload: string | Buffer,
    signature: string,
    headers?: Record<string, string>,
  ) {
    switch (provider) {
      case PaymentProviderType.STRIPE:
        return this.stripeProvider.validateWebhook(payload, signature);
      case PaymentProviderType.PAYPAL:
        return this.paypalProvider.validateWebhook(payload, signature, headers);
      case PaymentProviderType.FLUTTERWAVE:
        return this.flutterwaveProvider.validateWebhook(payload, signature);
      case PaymentProviderType.PAYSTACK:
        return this.paystackProvider.validateWebhook(payload, signature);
      default:
        return { isValid: false, error: 'Unknown provider' };
    }
  }

  private async handleEvent(provider: PaymentProviderType, event: WebhookEvent): Promise<void> {
    this.logger.log(`Processing ${provider} event: ${event.type}`);

    switch (provider) {
      case PaymentProviderType.STRIPE:
        await this.handleStripeEvent(event);
        break;
      case PaymentProviderType.PAYPAL:
        await this.handlePayPalEvent(event);
        break;
      case PaymentProviderType.FLUTTERWAVE:
        await this.handleFlutterwaveEvent(event);
        break;
      case PaymentProviderType.PAYSTACK:
        await this.handlePaystackEvent(event);
        break;
    }
  }

  // ==================== Stripe Event Handlers ====================

  private async handleStripeEvent(event: WebhookEvent): Promise<void> {
    const data = event.data;

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(PaymentProviderType.STRIPE, data.id, data);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(PaymentProviderType.STRIPE, data.id, data);
        break;

      case 'charge.refunded':
        await this.handleRefund(PaymentProviderType.STRIPE, data.payment_intent, data);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(PaymentProviderType.STRIPE, data);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancelled(PaymentProviderType.STRIPE, data);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(PaymentProviderType.STRIPE, data);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(PaymentProviderType.STRIPE, data);
        break;

      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }

  // ==================== PayPal Event Handlers ====================

  private async handlePayPalEvent(event: WebhookEvent): Promise<void> {
    const data = event.data;

    switch (event.type) {
      case 'CHECKOUT.ORDER.APPROVED':
        // Order approved, ready for capture
        this.logger.log(`PayPal order approved: ${data.id}`);
        break;

      case 'PAYMENT.CAPTURE.COMPLETED':
        await this.handlePaymentSucceeded(PaymentProviderType.PAYPAL, data.id, data);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
        await this.handlePaymentFailed(PaymentProviderType.PAYPAL, data.id, data);
        break;

      case 'PAYMENT.CAPTURE.REFUNDED':
        await this.handleRefund(PaymentProviderType.PAYPAL, data.id, data);
        break;

      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.UPDATED':
        await this.handleSubscriptionUpdated(PaymentProviderType.PAYPAL, data);
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await this.handleSubscriptionCancelled(PaymentProviderType.PAYPAL, data);
        break;

      default:
        this.logger.debug(`Unhandled PayPal event: ${event.type}`);
    }
  }

  // ==================== Flutterwave Event Handlers ====================

  private async handleFlutterwaveEvent(event: WebhookEvent): Promise<void> {
    const data = event.data;

    switch (event.type) {
      case 'charge.completed':
        if (data.status === 'successful') {
          await this.handlePaymentSucceeded(PaymentProviderType.FLUTTERWAVE, data.tx_ref || data.id, data);
        } else {
          await this.handlePaymentFailed(PaymentProviderType.FLUTTERWAVE, data.tx_ref || data.id, data);
        }
        break;

      case 'transfer.completed':
        await this.handleTransferCompleted(PaymentProviderType.FLUTTERWAVE, data);
        break;

      default:
        this.logger.debug(`Unhandled Flutterwave event: ${event.type}`);
    }
  }

  // ==================== Paystack Event Handlers ====================

  private async handlePaystackEvent(event: WebhookEvent): Promise<void> {
    const data = event.data;

    switch (event.type) {
      case 'charge.success':
        await this.handlePaymentSucceeded(PaymentProviderType.PAYSTACK, data.reference, data);
        break;

      case 'charge.failed':
        await this.handlePaymentFailed(PaymentProviderType.PAYSTACK, data.reference, data);
        break;

      case 'refund.processed':
        await this.handleRefund(PaymentProviderType.PAYSTACK, data.transaction_reference, data);
        break;

      case 'subscription.create':
      case 'subscription.not_renew':
        await this.handleSubscriptionUpdated(PaymentProviderType.PAYSTACK, data);
        break;

      case 'subscription.disable':
        await this.handleSubscriptionCancelled(PaymentProviderType.PAYSTACK, data);
        break;

      case 'transfer.success':
        await this.handleTransferCompleted(PaymentProviderType.PAYSTACK, data);
        break;

      default:
        this.logger.debug(`Unhandled Paystack event: ${event.type}`);
    }
  }

  // ==================== IAP Notification Handlers ====================

  private async handleIAPNotification(
    platform: 'ios' | 'android',
    notification: {
      type: string;
      productId: string;
      originalTransactionId: string;
      transactionId?: string;
      expiresDate?: Date;
      environment: string;
    },
  ): Promise<void> {
    this.logger.log(`Processing ${platform} IAP notification: ${notification.type}`);

    switch (notification.type) {
      case 'INITIAL_BUY':
        // New purchase - handled by client-side validation
        this.logger.log(`New IAP purchase: ${notification.productId}`);
        break;

      case 'RENEWAL':
        await this.handleIAPRenewal(platform, notification);
        break;

      case 'CANCEL':
        await this.handleIAPCancellation(platform, notification);
        break;

      case 'DID_FAIL_TO_RENEW':
        await this.handleIAPRenewalFailure(platform, notification);
        break;

      case 'REFUND':
      case 'REVOKE':
        await this.handleIAPRefund(platform, notification);
        break;

      default:
        this.logger.debug(`Unhandled IAP notification type: ${notification.type}`);
    }
  }

  // ==================== Common Event Handlers ====================

  private async handlePaymentSucceeded(
    provider: PaymentProviderType,
    transactionId: string,
    data: any,
  ): Promise<void> {
    this.logger.log(`Payment succeeded: ${provider} - ${transactionId}`);

    // Find order by payment intent ID
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { paymentIntentId: transactionId },
          { paymentIntentId: data.payment_intent },
        ],
      },
    });

    if (order) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PROCESSING',
          statusHistory: {
            push: {
              status: 'PROCESSING',
              timestamp: new Date().toISOString(),
              note: `Payment completed via ${provider}`,
            },
          },
        },
      });
    }

    // Record revenue
    await this.recordRevenue({
      provider,
      transactionId,
      amount: this.extractAmount(data, provider),
      currency: this.extractCurrency(data, provider),
      type: 'PAYMENT',
      orderId: order?.id,
    });
  }

  private async handlePaymentFailed(
    provider: PaymentProviderType,
    transactionId: string,
    data: any,
  ): Promise<void> {
    this.logger.warn(`Payment failed: ${provider} - ${transactionId}`);

    const order = await this.prisma.order.findFirst({
      where: { paymentIntentId: transactionId },
    });

    if (order) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          statusHistory: {
            push: {
              status: 'CANCELLED',
              timestamp: new Date().toISOString(),
              note: `Payment failed via ${provider}: ${data.failure_message || data.gateway_response || 'Unknown error'}`,
            },
          },
        },
      });
    }
  }

  private async handleRefund(
    provider: PaymentProviderType,
    transactionId: string,
    data: any,
  ): Promise<void> {
    this.logger.log(`Refund processed: ${provider} - ${transactionId}`);

    // Find order
    const order = await this.prisma.order.findFirst({
      where: { paymentIntentId: transactionId },
    });

    if (order) {
      // Update any related refund records
      await this.prisma.refund.updateMany({
        where: {
          orderId: order.id,
          status: 'PROCESSING',
        },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
        },
      });
    }

    // Record negative revenue
    await this.recordRevenue({
      provider,
      transactionId,
      amount: -this.extractAmount(data, provider),
      currency: this.extractCurrency(data, provider),
      type: 'REFUND',
      orderId: order?.id,
    });
  }

  private async handleSubscriptionUpdated(
    provider: PaymentProviderType,
    data: any,
  ): Promise<void> {
    const subscriptionId = this.extractSubscriptionId(data, provider);
    this.logger.log(`Subscription updated: ${provider} - ${subscriptionId}`);

    // Find subscription by provider ID
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        OR: [
          { stripeSubscriptionId: subscriptionId },
          { id: subscriptionId },
        ],
      },
    });

    if (subscription) {
      const periodEnd = this.extractPeriodEnd(data, provider);

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'ACTIVE',
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: data.cancel_at_period_end || false,
        },
      });
    }
  }

  private async handleSubscriptionCancelled(
    provider: PaymentProviderType,
    data: any,
  ): Promise<void> {
    const subscriptionId = this.extractSubscriptionId(data, provider);
    this.logger.log(`Subscription cancelled: ${provider} - ${subscriptionId}`);

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        OR: [
          { stripeSubscriptionId: subscriptionId },
          { id: subscriptionId },
        ],
      },
    });

    if (subscription) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });
    }
  }

  private async handleInvoicePaid(
    provider: PaymentProviderType,
    data: any,
  ): Promise<void> {
    this.logger.log(`Invoice paid: ${provider} - ${data.id}`);

    // Update subscription invoice if exists
    await this.prisma.subscriptionInvoice.updateMany({
      where: { stripeInvoiceId: data.id },
      data: {
        status: 'paid',
        paidAt: new Date(),
      },
    });
  }

  private async handleInvoicePaymentFailed(
    provider: PaymentProviderType,
    data: any,
  ): Promise<void> {
    this.logger.warn(`Invoice payment failed: ${provider} - ${data.id}`);

    await this.prisma.subscriptionInvoice.updateMany({
      where: { stripeInvoiceId: data.id },
      data: {
        status: 'failed',
        attemptedAt: new Date(),
      },
    });

    // Update subscription status
    if (data.subscription) {
      await this.prisma.subscription.updateMany({
        where: { stripeSubscriptionId: data.subscription },
        data: {
          status: 'SUSPENDED',
        },
      });
    }
  }

  private async handleTransferCompleted(
    provider: PaymentProviderType,
    data: any,
  ): Promise<void> {
    this.logger.log(`Transfer completed: ${provider} - ${data.id || data.transfer_code}`);

    // Update vendor payout if exists
    const reference = data.reference || data.transfer_code;
    if (reference) {
      await this.prisma.vendorPayout.updateMany({
        where: { reference },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
        },
      });
    }
  }

  // ==================== IAP Handlers ====================

  private async handleIAPRenewal(
    platform: string,
    notification: any,
  ): Promise<void> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        metadata: {
          path: ['iapOriginalTransactionId'],
          equals: notification.originalTransactionId,
        },
      },
    });

    if (subscription && notification.expiresDate) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'ACTIVE',
          currentPeriodEnd: notification.expiresDate,
        },
      });
    }
  }

  private async handleIAPCancellation(
    platform: string,
    notification: any,
  ): Promise<void> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        metadata: {
          path: ['iapOriginalTransactionId'],
          equals: notification.originalTransactionId,
        },
      },
    });

    if (subscription) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelAtPeriodEnd: true,
        },
      });
    }
  }

  private async handleIAPRenewalFailure(
    platform: string,
    notification: any,
  ): Promise<void> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        metadata: {
          path: ['iapOriginalTransactionId'],
          equals: notification.originalTransactionId,
        },
      },
    });

    if (subscription) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'SUSPENDED',
        },
      });
    }
  }

  private async handleIAPRefund(
    platform: string,
    notification: any,
  ): Promise<void> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        metadata: {
          path: ['iapOriginalTransactionId'],
          equals: notification.originalTransactionId,
        },
      },
    });

    if (subscription) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      // Record refund in revenue
      await this.recordRevenue({
        provider: platform === 'ios' ? PaymentProviderType.APPLE_IAP : PaymentProviderType.GOOGLE_IAP,
        transactionId: notification.transactionId || notification.originalTransactionId,
        amount: 0, // Amount unknown from notification
        currency: 'USD',
        type: 'REFUND',
      });
    }
  }

  // ==================== Helper Methods ====================

  private async isEventProcessed(eventId: string, provider: PaymentProviderType): Promise<boolean> {
    // Check in-memory cache first
    const cacheKey = `${provider}_${eventId}`;
    if (this.processedEvents.has(cacheKey)) {
      return true;
    }

    // Check database (if tracking table exists)
    try {
      const existing = await this.prisma.$queryRaw<any[]>`
        SELECT id FROM webhook_events
        WHERE event_id = ${eventId} AND provider = ${provider}
        LIMIT 1
      `;
      return existing.length > 0;
    } catch {
      // Table doesn't exist, use in-memory only
      return false;
    }
  }

  private async markEventProcessed(eventId: string, provider: PaymentProviderType): Promise<void> {
    const cacheKey = `${provider}_${eventId}`;
    this.processedEvents.add(cacheKey);

    // Limit cache size
    if (this.processedEvents.size > 10000) {
      const iterator = this.processedEvents.values();
      for (let i = 0; i < 5000; i++) {
        this.processedEvents.delete(iterator.next().value);
      }
    }

    // Try to persist to database
    try {
      await this.prisma.$executeRaw`
        INSERT INTO webhook_events (event_id, provider, processed_at)
        VALUES (${eventId}, ${provider}, NOW())
        ON CONFLICT (event_id, provider) DO NOTHING
      `;
    } catch {
      // Table doesn't exist, in-memory only
    }
  }

  private async recordRevenue(data: {
    provider: PaymentProviderType;
    transactionId: string;
    amount: number;
    currency: string;
    type: 'PAYMENT' | 'REFUND' | 'SUBSCRIPTION';
    orderId?: string;
  }): Promise<void> {
    // Log for now - in production, store in RevenueReport table
    this.logger.log(`Revenue: ${data.provider} ${data.type} ${data.amount} ${data.currency}`);
  }

  private extractAmount(data: any, provider: PaymentProviderType): number {
    switch (provider) {
      case PaymentProviderType.STRIPE:
        return (data.amount || data.amount_received || 0) / 100;
      case PaymentProviderType.PAYPAL:
        return parseFloat(data.amount?.value || data.seller_receivable_breakdown?.gross_amount?.value || '0');
      case PaymentProviderType.FLUTTERWAVE:
        return data.amount || data.charged_amount || 0;
      case PaymentProviderType.PAYSTACK:
        return (data.amount || 0) / 100;
      default:
        return 0;
    }
  }

  private extractCurrency(data: any, provider: PaymentProviderType): string {
    switch (provider) {
      case PaymentProviderType.STRIPE:
        return (data.currency || 'usd').toUpperCase();
      case PaymentProviderType.PAYPAL:
        return data.amount?.currency_code || 'USD';
      case PaymentProviderType.FLUTTERWAVE:
        return data.currency || 'NGN';
      case PaymentProviderType.PAYSTACK:
        return data.currency || 'NGN';
      default:
        return 'USD';
    }
  }

  private extractSubscriptionId(data: any, provider: PaymentProviderType): string {
    switch (provider) {
      case PaymentProviderType.STRIPE:
        return data.id;
      case PaymentProviderType.PAYPAL:
        return data.id;
      case PaymentProviderType.PAYSTACK:
        return data.subscription_code;
      default:
        return data.id;
    }
  }

  private extractPeriodEnd(data: any, provider: PaymentProviderType): Date {
    switch (provider) {
      case PaymentProviderType.STRIPE:
        return new Date(data.current_period_end * 1000);
      case PaymentProviderType.PAYPAL:
        return new Date(data.billing_info?.next_billing_time || Date.now() + 30 * 24 * 60 * 60 * 1000);
      case PaymentProviderType.PAYSTACK:
        return new Date(data.next_payment_date || Date.now() + 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  }
}
