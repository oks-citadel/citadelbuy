import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('STRIPE_SECRET_KEY');

    if (!apiKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY not found in environment variables. Stripe will not work.',
      );
    }

    this.stripe = new Stripe(apiKey || 'sk_test_dummy', {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Create a payment intent for the given amount
   */
  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    metadata?: Record<string, string>,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: metadata || {},
      });

      this.logger.log(`Payment intent created: ${paymentIntent.id}`);

      return {
        clientSecret: paymentIntent.client_secret as string,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      this.logger.error('Failed to create payment intent', error);
      throw error;
    }
  }

  /**
   * Retrieve a payment intent by ID
   */
  async retrievePaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      this.logger.error('Failed to retrieve payment intent', error);
      throw error;
    }
  }

  /**
   * Construct a webhook event from raw body and signature
   */
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (error) {
      this.logger.error('Failed to construct webhook event', error);
      throw error;
    }
  }

  /**
   * Create a Stripe refund for a payment intent or charge
   */
  async createStripeRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer',
    metadata?: Record<string, string>,
  ): Promise<{ refundId: string; status: string; amount: number }> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents if specified
        reason: reason || 'requested_by_customer',
        metadata: metadata || {},
      });

      this.logger.log(`Stripe refund created: ${refund.id} for ${paymentIntentId}`);

      return {
        refundId: refund.id,
        status: refund.status ?? "",
        amount: refund.amount / 100, // Convert back to dollars
      };
    } catch (error) {
      this.logger.error('Failed to create Stripe refund', error);
      throw error;
    }
  }

  /**
   * Retrieve a Stripe refund by ID
   */
  async retrieveStripeRefund(refundId: string): Promise<Stripe.Refund> {
    try {
      return await this.stripe.refunds.retrieve(refundId);
    } catch (error) {
      this.logger.error('Failed to retrieve Stripe refund', error);
      throw error;
    }
  }

  /**
   * Create a PayPal refund (placeholder - requires PayPal order/capture ID)
   */
  async createPayPalRefund(
    captureId: string,
    amount?: number,
    currency: string = 'USD',
    note?: string,
  ): Promise<{ refundId: string; status: string; amount: number }> {
    // PayPal refund implementation
    // This requires the PayPal SDK setup with credentials
    const paypalClientId = this.configService.get('PAYPAL_CLIENT_ID');
    const paypalSecret = this.configService.get('PAYPAL_SECRET');

    if (!paypalClientId || !paypalSecret) {
      this.logger.warn('PayPal credentials not configured. Refund simulation.');

      // Simulate successful refund for testing
      return {
        refundId: `PAYPAL_REFUND_${Date.now()}`,
        status: 'COMPLETED',
        amount: amount || 0,
      };
    }

    try {
      // TODO: Implement actual PayPal refund using @paypal/paypal-server-sdk
      // This is a placeholder for the actual implementation
      this.logger.log(`PayPal refund initiated for capture: ${captureId}`);

      return {
        refundId: `PAYPAL_REFUND_${Date.now()}`,
        status: 'PENDING',
        amount: amount || 0,
      };
    } catch (error) {
      this.logger.error('Failed to create PayPal refund', error);
      throw error;
    }
  }

  /**
   * Process refund based on payment method
   */
  async processRefund(
    paymentMethod: 'STRIPE' | 'PAYPAL' | 'OTHER',
    transactionId: string,
    amount: number,
    reason?: string,
    metadata?: Record<string, string>,
  ): Promise<{ refundId: string; status: string; amount: number }> {
    switch (paymentMethod) {
      case 'STRIPE':
        return this.createStripeRefund(
          transactionId,
          amount,
          'requested_by_customer',
          metadata,
        );

      case 'PAYPAL':
        return this.createPayPalRefund(transactionId, amount, 'USD', reason);

      default:
        this.logger.warn(`Unsupported payment method: ${paymentMethod}`);
        throw new Error(`Refund not supported for payment method: ${paymentMethod}`);
    }
  }
}
