import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

interface CreateCustomerParams {
  name: string;
  email: string;
  metadata?: Record<string, string>;
}

@Injectable()
export class StripeService {
  private stripe: Stripe | null = null;
  private readonly logger = new Logger(StripeService.name);

  constructor(private readonly configService: ConfigService) {
    this.initializeStripe();
  }

  /**
   * Initialize Stripe client
   */
  private initializeStripe(): void {
    const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!apiKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('STRIPE_SECRET_KEY environment variable is required in production');
      }
      this.logger.warn('STRIPE_SECRET_KEY not found. Stripe integration disabled in development.');
      return;
    }

    if (!apiKey.startsWith('sk_')) {
      this.logger.error('Invalid STRIPE_SECRET_KEY format. Must start with sk_');
      return;
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2024-12-18.acacia',
    });

    this.logger.log('Stripe initialized successfully');
  }

  /**
   * Ensure Stripe is configured before operations
   */
  private ensureStripeConfigured(): void {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured. Please set STRIPE_SECRET_KEY.');
    }
  }

  /**
   * Create a Stripe customer
   * @param params - Customer creation parameters
   * @returns Stripe customer object
   */
  async createCustomer(params: CreateCustomerParams): Promise<Stripe.Customer> {
    this.ensureStripeConfigured();

    try {
      const customer = await this.stripe!.customers.create({
        name: params.name,
        email: params.email,
        metadata: params.metadata || {},
      });

      this.logger.log(`Stripe customer created: ${customer.id}`);

      return customer;
    } catch (error: any) {
      this.logger.error('Failed to create Stripe customer', error);
      throw new BadRequestException(`Failed to create customer: ${error.message}`);
    }
  }

  /**
   * Create a subscription for a customer
   * @param customerId - Stripe customer ID
   * @param priceId - Stripe price ID
   * @returns Stripe subscription object
   */
  async createSubscription(
    customerId: string,
    priceId: string,
  ): Promise<Stripe.Subscription> {
    this.ensureStripeConfigured();

    try {
      const subscription = await this.stripe!.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      this.logger.log(`Stripe subscription created: ${subscription.id}`);

      return subscription;
    } catch (error: any) {
      this.logger.error('Failed to create Stripe subscription', error);
      throw new BadRequestException(`Failed to create subscription: ${error.message}`);
    }
  }

  /**
   * Update a subscription (change plan)
   * @param subscriptionId - Stripe subscription ID
   * @param newPriceId - New Stripe price ID
   * @returns Updated subscription object
   */
  async updateSubscription(
    subscriptionId: string,
    newPriceId: string,
  ): Promise<Stripe.Subscription> {
    this.ensureStripeConfigured();

    try {
      // Get current subscription
      const subscription = await this.stripe!.subscriptions.retrieve(subscriptionId);

      // Update subscription with new price
      const updatedSubscription = await this.stripe!.subscriptions.update(
        subscriptionId,
        {
          items: [
            {
              id: subscription.items.data[0].id,
              price: newPriceId,
            },
          ],
          proration_behavior: 'create_prorations',
        },
      );

      this.logger.log(`Stripe subscription updated: ${subscriptionId}`);

      return updatedSubscription;
    } catch (error: any) {
      this.logger.error('Failed to update Stripe subscription', error);
      throw new BadRequestException(`Failed to update subscription: ${error.message}`);
    }
  }

  /**
   * Cancel a subscription
   * @param subscriptionId - Stripe subscription ID
   * @returns Cancelled subscription object
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    this.ensureStripeConfigured();

    try {
      const subscription = await this.stripe!.subscriptions.cancel(subscriptionId);

      this.logger.log(`Stripe subscription cancelled: ${subscriptionId}`);

      return subscription;
    } catch (error: any) {
      this.logger.error('Failed to cancel Stripe subscription', error);
      throw new BadRequestException(`Failed to cancel subscription: ${error.message}`);
    }
  }

  /**
   * Attach a payment method to a customer
   * @param customerId - Stripe customer ID
   * @param paymentMethodId - Stripe payment method ID
   * @returns Payment method object
   */
  async attachPaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<Stripe.PaymentMethod> {
    this.ensureStripeConfigured();

    try {
      // Attach payment method to customer
      const paymentMethod = await this.stripe!.paymentMethods.attach(
        paymentMethodId,
        { customer: customerId },
      );

      // Set as default payment method
      await this.stripe!.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      this.logger.log(`Payment method attached to customer: ${customerId}`);

      return paymentMethod;
    } catch (error: any) {
      this.logger.error('Failed to attach payment method', error);
      throw new BadRequestException(`Failed to attach payment method: ${error.message}`);
    }
  }

  /**
   * Detach a payment method from a customer
   * @param paymentMethodId - Stripe payment method ID
   * @returns Detached payment method object
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    this.ensureStripeConfigured();

    try {
      const paymentMethod = await this.stripe!.paymentMethods.detach(paymentMethodId);

      this.logger.log(`Payment method detached: ${paymentMethodId}`);

      return paymentMethod;
    } catch (error: any) {
      this.logger.error('Failed to detach payment method', error);
      throw new BadRequestException(`Failed to detach payment method: ${error.message}`);
    }
  }

  /**
   * Create a payment intent
   * @param amount - Amount in cents
   * @param currency - Currency code (e.g., 'usd')
   * @returns Payment intent object
   */
  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
  ): Promise<Stripe.PaymentIntent> {
    this.ensureStripeConfigured();

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    try {
      const paymentIntent = await this.stripe!.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
      });

      this.logger.log(`Payment intent created: ${paymentIntent.id}`);

      return paymentIntent;
    } catch (error: any) {
      this.logger.error('Failed to create payment intent', error);
      throw new BadRequestException(`Failed to create payment intent: ${error.message}`);
    }
  }

  /**
   * Retrieve a payment intent
   * @param paymentIntentId - Payment intent ID
   * @returns Payment intent object
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    this.ensureStripeConfigured();

    try {
      return await this.stripe!.paymentIntents.retrieve(paymentIntentId);
    } catch (error: any) {
      this.logger.error('Failed to retrieve payment intent', error);
      throw new BadRequestException(`Failed to retrieve payment intent: ${error.message}`);
    }
  }

  /**
   * List all payment methods for a customer
   * @param customerId - Stripe customer ID
   * @returns List of payment methods
   */
  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    this.ensureStripeConfigured();

    try {
      const paymentMethods = await this.stripe!.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data;
    } catch (error: any) {
      this.logger.error('Failed to list payment methods', error);
      throw new BadRequestException(`Failed to list payment methods: ${error.message}`);
    }
  }

  /**
   * Construct webhook event from raw body and signature
   * @param payload - Raw request body
   * @param signature - Stripe signature header
   * @returns Stripe event object
   */
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    this.ensureStripeConfigured();

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    try {
      return this.stripe!.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error: any) {
      this.logger.error('Failed to construct webhook event', error);
      throw new BadRequestException(`Webhook signature verification failed: ${error.message}`);
    }
  }

  /**
   * Retrieve a subscription
   * @param subscriptionId - Stripe subscription ID
   * @returns Subscription object
   */
  async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    this.ensureStripeConfigured();

    try {
      return await this.stripe!.subscriptions.retrieve(subscriptionId);
    } catch (error: any) {
      this.logger.error('Failed to retrieve subscription', error);
      throw new BadRequestException(`Failed to retrieve subscription: ${error.message}`);
    }
  }

  /**
   * Retrieve an invoice
   * @param invoiceId - Stripe invoice ID
   * @returns Invoice object
   */
  async retrieveInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    this.ensureStripeConfigured();

    try {
      return await this.stripe!.invoices.retrieve(invoiceId);
    } catch (error: any) {
      this.logger.error('Failed to retrieve invoice', error);
      throw new BadRequestException(`Failed to retrieve invoice: ${error.message}`);
    }
  }

  /**
   * Check if Stripe is configured
   * @returns True if Stripe is configured
   */
  isConfigured(): boolean {
    return this.stripe !== null;
  }
}
