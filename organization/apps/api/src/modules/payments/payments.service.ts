import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

interface PayPalAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalRefundResponse {
  id: string;
  status: string;
  amount: {
    value: string;
    currency_code: string;
  };
}

@Injectable()
export class PaymentsService {
  private stripe: Stripe | null = null;
  private readonly logger = new Logger(PaymentsService.name);
  private paypalAccessToken: string | null = null;
  private paypalTokenExpiry: number = 0;

  constructor(private configService: ConfigService) {
    this.initializeStripe();
  }

  private initializeStripe(): void {
    const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!apiKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('STRIPE_SECRET_KEY environment variable is required in production');
      }
      this.logger.warn('STRIPE_SECRET_KEY not found. Stripe payments disabled in development.');
      return;
    }

    if (!apiKey.startsWith('sk_')) {
      this.logger.error('Invalid STRIPE_SECRET_KEY format. Must start with sk_');
      return;
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2023-10-16',
    });

    this.logger.log('Stripe initialized successfully');
  }

  private ensureStripeConfigured(): void {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured. Please set STRIPE_SECRET_KEY.');
    }
  }

  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    metadata?: Record<string, string>,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    this.ensureStripeConfigured();

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    try {
      const paymentIntent = await this.stripe!.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: metadata || {},
      });

      this.logger.log();

      return {
        clientSecret: paymentIntent.client_secret as string,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      this.logger.error('Failed to create payment intent', error);
      throw error;
    }
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    this.ensureStripeConfigured();
    try {
      return await this.stripe!.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      this.logger.error('Failed to retrieve payment intent', error);
      throw error;
    }
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    this.ensureStripeConfigured();
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    try {
      return this.stripe!.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      this.logger.error('Failed to construct webhook event', error);
      throw error;
    }
  }

  async createStripeRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer',
    metadata?: Record<string, string>,
  ): Promise<{ refundId: string; status: string; amount: number }> {
    this.ensureStripeConfigured();

    try {
      const refund = await this.stripe!.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason: reason || 'requested_by_customer',
        metadata: metadata || {},
      });

      this.logger.log();

      return {
        refundId: refund.id,
        status: refund.status ?? 'pending',
        amount: refund.amount / 100,
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe refund', error);
      throw error;
    }
  }

  async retrieveStripeRefund(refundId: string): Promise<Stripe.Refund> {
    this.ensureStripeConfigured();
    try {
      return await this.stripe!.refunds.retrieve(refundId);
    } catch (error) {
      this.logger.error('Failed to retrieve Stripe refund', error);
      throw error;
    }
  }

  async createPayPalRefund(
    captureId: string,
    amount?: number,
    currency: string = 'USD',
    note?: string,
  ): Promise<{ refundId: string; status: string; amount: number }> {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_SECRET');

    if (!clientId || !clientSecret) {
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException('PayPal is not configured');
      }
      this.logger.warn('PayPal credentials not configured. Simulating refund in development.');
      return {
        refundId: ,
        status: 'COMPLETED',
        amount: amount || 0,
      };
    }

    this.logger.log();
    
    // PayPal API implementation would go here
    // For now, return a simulated response with actual API call structure
    return {
      refundId: ,
      status: 'PENDING',
      amount: amount || 0,
    };
  }

  async processRefund(
    paymentMethod: 'STRIPE' | 'PAYPAL' | 'OTHER',
    transactionId: string,
    amount: number,
    reason?: string,
    metadata?: Record<string, string>,
  ): Promise<{ refundId: string; status: string; amount: number }> {
    if (amount <= 0) {
      throw new BadRequestException('Refund amount must be greater than 0');
    }

    switch (paymentMethod) {
      case 'STRIPE':
        return this.createStripeRefund(transactionId, amount, 'requested_by_customer', metadata);
      case 'PAYPAL':
        return this.createPayPalRefund(transactionId, amount, 'USD', reason);
      default:
        throw new BadRequestException();
    }
  }

  isStripeConfigured(): boolean {
    return this.stripe !== null;
  }

  isPayPalConfigured(): boolean {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_SECRET');
    return !!(clientId && clientSecret);
  }
}
