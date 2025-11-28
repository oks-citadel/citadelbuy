import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  IPaymentProvider,
  ISubscriptionProvider,
  PaymentProviderType,
  PaymentStatus,
  CreatePaymentRequest,
  PaymentResult,
  RefundRequest,
  RefundResult,
  WebhookValidationResult,
  SubscriptionPlanConfig,
  CreateSubscriptionRequest,
  SubscriptionResult,
} from '../interfaces';

@Injectable()
export class StripeProvider implements IPaymentProvider, ISubscriptionProvider {
  private readonly logger = new Logger(StripeProvider.name);
  private stripe: Stripe | null = null;
  readonly providerType = PaymentProviderType.STRIPE;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2023-10-16',
      });
    }
  }

  isConfigured(): boolean {
    return !!this.stripe;
  }

  isEnabled(): boolean {
    const enabled = this.configService.get<string>('STRIPE_ENABLED', 'true');
    return enabled === 'true' && this.isConfigured();
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    if (!this.stripe) {
      return this.errorResult('Stripe not configured');
    }

    try {
      // Create or retrieve customer
      let customerId: string | undefined;
      if (request.customer.email) {
        const customers = await this.stripe.customers.list({
          email: request.customer.email,
          limit: 1,
        });

        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        } else {
          const customer = await this.stripe.customers.create({
            email: request.customer.email,
            name: request.customer.name,
            phone: request.customer.phone,
            address: request.customer.address ? {
              line1: request.customer.address.line1,
              line2: request.customer.address.line2,
              city: request.customer.address.city,
              state: request.customer.address.state,
              postal_code: request.customer.address.postalCode,
              country: request.customer.address.country,
            } : undefined,
          });
          customerId = customer.id;
        }
      }

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(request.amount * 100), // Convert to cents
        currency: request.currency.toLowerCase(),
        customer: customerId,
        description: request.description,
        metadata: {
          ...request.metadata,
          items: request.items ? JSON.stringify(request.items) : undefined,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        transactionId: paymentIntent.id,
        providerTransactionId: paymentIntent.id,
        provider: this.providerType,
        status: this.mapStripeStatus(paymentIntent.status),
        amount: request.amount,
        currency: request.currency,
        clientSecret: paymentIntent.client_secret || undefined,
        metadata: {
          customerId,
        },
      };
    } catch (error: any) {
      this.logger.error(`Stripe createPayment error: ${error.message}`);
      return this.errorResult(error.message, error.code);
    }
  }

  async capturePayment(transactionId: string, amount?: number): Promise<PaymentResult> {
    if (!this.stripe) {
      return this.errorResult('Stripe not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.capture(transactionId, {
        amount_to_capture: amount ? Math.round(amount * 100) : undefined,
      });

      return {
        success: true,
        transactionId: paymentIntent.id,
        providerTransactionId: paymentIntent.id,
        provider: this.providerType,
        status: this.mapStripeStatus(paymentIntent.status),
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
      };
    } catch (error: any) {
      this.logger.error(`Stripe capturePayment error: ${error.message}`);
      return this.errorResult(error.message, error.code);
    }
  }

  async refundPayment(request: RefundRequest): Promise<RefundResult> {
    if (!this.stripe) {
      return {
        success: false,
        refundId: '',
        providerRefundId: '',
        amount: 0,
        currency: '',
        status: 'FAILED',
        error: { code: 'NOT_CONFIGURED', message: 'Stripe not configured' },
      };
    }

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: request.providerTransactionId,
        amount: request.amount ? Math.round(request.amount * 100) : undefined,
        reason: request.reason as Stripe.RefundCreateParams.Reason || 'requested_by_customer',
        metadata: request.metadata,
      });

      return {
        success: true,
        refundId: refund.id,
        providerRefundId: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency.toUpperCase(),
        status: refund.status === 'succeeded' ? 'COMPLETED' : 'PENDING',
      };
    } catch (error: any) {
      this.logger.error(`Stripe refundPayment error: ${error.message}`);
      return {
        success: false,
        refundId: '',
        providerRefundId: '',
        amount: 0,
        currency: '',
        status: 'FAILED',
        error: { code: error.code || 'REFUND_ERROR', message: error.message },
      };
    }
  }

  async validateWebhook(
    payload: string | Buffer,
    signature: string,
  ): Promise<WebhookValidationResult> {
    if (!this.stripe) {
      return { isValid: false, error: 'Stripe not configured' };
    }

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      return { isValid: false, error: 'Webhook secret not configured' };
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );

      return {
        isValid: true,
        event: {
          id: event.id,
          type: event.type,
          provider: this.providerType,
          data: event.data.object,
          timestamp: new Date(event.created * 1000),
        },
      };
    } catch (error: any) {
      this.logger.error(`Stripe webhook validation error: ${error.message}`);
      return { isValid: false, error: error.message };
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentResult> {
    if (!this.stripe) {
      return this.errorResult('Stripe not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(transactionId);

      return {
        success: true,
        transactionId: paymentIntent.id,
        providerTransactionId: paymentIntent.id,
        provider: this.providerType,
        status: this.mapStripeStatus(paymentIntent.status),
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
      };
    } catch (error: any) {
      this.logger.error(`Stripe getPaymentStatus error: ${error.message}`);
      return this.errorResult(error.message, error.code);
    }
  }

  // Subscription methods
  async createPlan(config: SubscriptionPlanConfig): Promise<{ planId: string; providerPlanId: string }> {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      // Create product first
      const product = await this.stripe.products.create({
        name: config.name,
        description: config.description,
        metadata: config.metadata,
      });

      // Create price (plan)
      const price = await this.stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(config.amount * 100),
        currency: config.currency.toLowerCase(),
        recurring: {
          interval: config.interval,
          interval_count: config.intervalCount,
          trial_period_days: config.trialDays,
        },
        metadata: config.metadata,
      });

      return {
        planId: config.id,
        providerPlanId: price.id,
      };
    } catch (error: any) {
      this.logger.error(`Stripe createPlan error: ${error.message}`);
      throw error;
    }
  }

  async createSubscription(request: CreateSubscriptionRequest): Promise<SubscriptionResult> {
    if (!this.stripe) {
      return {
        success: false,
        subscriptionId: '',
        providerSubscriptionId: '',
        status: 'UNPAID',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        error: { code: 'NOT_CONFIGURED', message: 'Stripe not configured' },
      };
    }

    try {
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: request.customerId,
        items: [{ price: request.planId }],
        default_payment_method: request.paymentMethodId,
        metadata: request.metadata,
        trial_period_days: request.trialDays,
      };

      if (request.couponCode) {
        subscriptionParams.coupon = request.couponCode;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionParams);

      return {
        success: true,
        subscriptionId: subscription.id,
        providerSubscriptionId: subscription.id,
        status: this.mapStripeSubscriptionStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    } catch (error: any) {
      this.logger.error(`Stripe createSubscription error: ${error.message}`);
      return {
        success: false,
        subscriptionId: '',
        providerSubscriptionId: '',
        status: 'UNPAID',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        error: { code: error.code || 'SUBSCRIPTION_ERROR', message: error.message },
      };
    }
  }

  async cancelSubscription(subscriptionId: string, immediately = false): Promise<SubscriptionResult> {
    if (!this.stripe) {
      return {
        success: false,
        subscriptionId: '',
        providerSubscriptionId: '',
        status: 'CANCELLED',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        error: { code: 'NOT_CONFIGURED', message: 'Stripe not configured' },
      };
    }

    try {
      let subscription: Stripe.Subscription;

      if (immediately) {
        subscription = await this.stripe.subscriptions.cancel(subscriptionId);
      } else {
        subscription = await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }

      return {
        success: true,
        subscriptionId: subscription.id,
        providerSubscriptionId: subscription.id,
        status: this.mapStripeSubscriptionStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    } catch (error: any) {
      this.logger.error(`Stripe cancelSubscription error: ${error.message}`);
      return {
        success: false,
        subscriptionId: '',
        providerSubscriptionId: '',
        status: 'CANCELLED',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        error: { code: error.code || 'CANCEL_ERROR', message: error.message },
      };
    }
  }

  async updateSubscription(
    subscriptionId: string,
    updates: Partial<CreateSubscriptionRequest>,
  ): Promise<SubscriptionResult> {
    if (!this.stripe) {
      return {
        success: false,
        subscriptionId: '',
        providerSubscriptionId: '',
        status: 'UNPAID',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        error: { code: 'NOT_CONFIGURED', message: 'Stripe not configured' },
      };
    }

    try {
      const updateParams: Stripe.SubscriptionUpdateParams = {
        metadata: updates.metadata,
        default_payment_method: updates.paymentMethodId,
      };

      if (updates.planId) {
        // Get current subscription to get item ID
        const current = await this.stripe.subscriptions.retrieve(subscriptionId);
        updateParams.items = [{
          id: current.items.data[0].id,
          price: updates.planId,
        }];
      }

      const subscription = await this.stripe.subscriptions.update(subscriptionId, updateParams);

      return {
        success: true,
        subscriptionId: subscription.id,
        providerSubscriptionId: subscription.id,
        status: this.mapStripeSubscriptionStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    } catch (error: any) {
      this.logger.error(`Stripe updateSubscription error: ${error.message}`);
      return {
        success: false,
        subscriptionId: '',
        providerSubscriptionId: '',
        status: 'UNPAID',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        error: { code: error.code || 'UPDATE_ERROR', message: error.message },
      };
    }
  }

  async getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionResult> {
    if (!this.stripe) {
      return {
        success: false,
        subscriptionId: '',
        providerSubscriptionId: '',
        status: 'UNPAID',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        error: { code: 'NOT_CONFIGURED', message: 'Stripe not configured' },
      };
    }

    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

      return {
        success: true,
        subscriptionId: subscription.id,
        providerSubscriptionId: subscription.id,
        status: this.mapStripeSubscriptionStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    } catch (error: any) {
      this.logger.error(`Stripe getSubscriptionStatus error: ${error.message}`);
      return {
        success: false,
        subscriptionId: '',
        providerSubscriptionId: '',
        status: 'UNPAID',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        error: { code: error.code || 'STATUS_ERROR', message: error.message },
      };
    }
  }

  // Helper methods
  private mapStripeStatus(status: Stripe.PaymentIntent.Status): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      requires_payment_method: PaymentStatus.PENDING,
      requires_confirmation: PaymentStatus.PENDING,
      requires_action: PaymentStatus.PENDING,
      processing: PaymentStatus.PROCESSING,
      requires_capture: PaymentStatus.PROCESSING,
      canceled: PaymentStatus.CANCELLED,
      succeeded: PaymentStatus.COMPLETED,
    };
    return statusMap[status] || PaymentStatus.PENDING;
  }

  private mapStripeSubscriptionStatus(
    status: Stripe.Subscription.Status,
  ): 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'UNPAID' {
    const statusMap: Record<string, 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'UNPAID'> = {
      active: 'ACTIVE',
      trialing: 'TRIALING',
      past_due: 'PAST_DUE',
      canceled: 'CANCELLED',
      unpaid: 'UNPAID',
      incomplete: 'UNPAID',
      incomplete_expired: 'CANCELLED',
      paused: 'PAST_DUE',
    };
    return statusMap[status] || 'UNPAID';
  }

  private errorResult(message: string, code?: string): PaymentResult {
    return {
      success: false,
      transactionId: '',
      providerTransactionId: '',
      provider: this.providerType,
      status: PaymentStatus.FAILED,
      amount: 0,
      currency: '',
      error: {
        code: code || 'PAYMENT_ERROR',
        message,
      },
    };
  }

  // Utility methods for Apple Pay and Google Pay
  async createApplePaySession(
    amount: number,
    currency: string,
    metadata?: Record<string, any>,
  ): Promise<PaymentResult> {
    if (!this.stripe) {
      return this.errorResult('Stripe not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        payment_method_types: ['card'],
        metadata: {
          ...metadata,
          wallet_type: 'apple_pay',
        },
      });

      return {
        success: true,
        transactionId: paymentIntent.id,
        providerTransactionId: paymentIntent.id,
        provider: this.providerType,
        status: PaymentStatus.PENDING,
        amount,
        currency,
        clientSecret: paymentIntent.client_secret || undefined,
      };
    } catch (error: any) {
      this.logger.error(`Stripe Apple Pay session error: ${error.message}`);
      return this.errorResult(error.message, error.code);
    }
  }

  async createGooglePaySession(
    amount: number,
    currency: string,
    metadata?: Record<string, any>,
  ): Promise<PaymentResult> {
    if (!this.stripe) {
      return this.errorResult('Stripe not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        payment_method_types: ['card'],
        metadata: {
          ...metadata,
          wallet_type: 'google_pay',
        },
      });

      return {
        success: true,
        transactionId: paymentIntent.id,
        providerTransactionId: paymentIntent.id,
        provider: this.providerType,
        status: PaymentStatus.PENDING,
        amount,
        currency,
        clientSecret: paymentIntent.client_secret || undefined,
      };
    } catch (error: any) {
      this.logger.error(`Stripe Google Pay session error: ${error.message}`);
      return this.errorResult(error.message, error.code);
    }
  }
}
