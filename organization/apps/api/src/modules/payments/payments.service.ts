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

      this.logger.log(`Payment intent created: ${paymentIntent.id} for amount ${amount} ${currency}`);

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

      this.logger.log(`Stripe refund created: ${refund.id} for amount ${refund.amount / 100}`);

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
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException('PayPal is not configured');
      }
      this.logger.warn('PayPal credentials not configured. Simulating refund in development.');
      return {
        refundId: `DEV_REFUND_${Date.now()}`,
        status: 'COMPLETED',
        amount: amount || 0,
      };
    }

    try {
      // Get PayPal access token
      const accessToken = await this.getPayPalAccessToken(clientId, clientSecret);

      // Determine PayPal API base URL
      const paypalMode = this.configService.get<string>('PAYPAL_MODE', 'sandbox');
      const baseUrl = paypalMode === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

      // Build refund request body
      const refundBody: Record<string, any> = {};
      if (amount) {
        refundBody.amount = {
          value: amount.toFixed(2),
          currency_code: currency,
        };
      }
      if (note) {
        refundBody.note_to_payer = note;
      }

      // Make refund API call
      const response = await fetch(`${baseUrl}/v2/payments/captures/${captureId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: Object.keys(refundBody).length > 0 ? JSON.stringify(refundBody) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error('PayPal refund failed', errorData);
        throw new BadRequestException(`PayPal refund failed: ${errorData.message || response.statusText}`);
      }

      const refundData: PayPalRefundResponse = await response.json();

      this.logger.log(`PayPal refund created: ${refundData.id}`);

      return {
        refundId: refundData.id,
        status: refundData.status,
        amount: parseFloat(refundData.amount.value),
      };
    } catch (error) {
      this.logger.error('Failed to create PayPal refund', error);
      throw error;
    }
  }

  private async getPayPalAccessToken(clientId: string, clientSecret: string): Promise<string> {
    // Return cached token if still valid
    if (this.paypalAccessToken && Date.now() < this.paypalTokenExpiry) {
      return this.paypalAccessToken;
    }

    const paypalMode = this.configService.get<string>('PAYPAL_MODE', 'sandbox');
    const baseUrl = paypalMode === 'production'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error('Failed to get PayPal access token');
    }

    const tokenData: PayPalAccessToken = await response.json();

    // Cache token with 5 minute buffer before expiry
    this.paypalAccessToken = tokenData.access_token;
    this.paypalTokenExpiry = Date.now() + (tokenData.expires_in - 300) * 1000;

    return tokenData.access_token;
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
        throw new BadRequestException(`Unsupported payment method: ${paymentMethod}`);
    }
  }

  isStripeConfigured(): boolean {
    return this.stripe !== null;
  }

  isPayPalConfigured(): boolean {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');
    return !!(clientId && clientSecret);
  }

  /**
   * Verify PayPal webhook signature
   * https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
   */
  async verifyPayPalWebhook(headers: Record<string, string>, body: any): Promise<boolean> {
    const webhookId = this.configService.get<string>('PAYPAL_WEBHOOK_ID');

    if (!webhookId) {
      this.logger.warn('PAYPAL_WEBHOOK_ID not configured. Skipping verification in development.');
      // In development, allow unverified webhooks
      return process.env.NODE_ENV !== 'production';
    }

    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      this.logger.error('PayPal credentials not configured for webhook verification');
      return false;
    }

    try {
      // Get access token
      const accessToken = await this.getPayPalAccessToken(clientId, clientSecret);

      // Prepare verification request
      const paypalMode = this.configService.get<string>('PAYPAL_MODE', 'sandbox');
      const baseUrl = paypalMode === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

      const verificationPayload = {
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: body,
      };

      const response = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(verificationPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error('PayPal webhook verification failed', errorData);
        return false;
      }

      const result = await response.json();
      const isValid = result.verification_status === 'SUCCESS';

      if (!isValid) {
        this.logger.warn(`PayPal webhook verification returned: ${result.verification_status}`);
      }

      return isValid;
    } catch (error: any) {
      this.logger.error('PayPal webhook verification error', error.message);
      return false;
    }
  }

  /**
   * Create a PayPal order for checkout
   */
  async createPayPalOrder(
    amount: number,
    currency: string = 'USD',
    orderId?: string,
    returnUrl?: string,
    cancelUrl?: string,
  ): Promise<{ orderId: string; approvalUrl: string }> {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException('PayPal is not configured');
      }
      this.logger.warn('PayPal credentials not configured. Returning mock order in development.');
      return {
        orderId: `DEV_ORDER_${Date.now()}`,
        approvalUrl: `${returnUrl || 'http://localhost:3000/checkout'}?mock=true`,
      };
    }

    try {
      const accessToken = await this.getPayPalAccessToken(clientId, clientSecret);

      const paypalMode = this.configService.get<string>('PAYPAL_MODE', 'sandbox');
      const baseUrl = paypalMode === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

      const orderPayload: any = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency.toUpperCase(),
              value: amount.toFixed(2),
            },
            ...(orderId && { custom_id: orderId, invoice_id: orderId }),
          },
        ],
        application_context: {
          brand_name: 'CitadelBuy',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
          ...(returnUrl && { return_url: returnUrl }),
          ...(cancelUrl && { cancel_url: cancelUrl }),
        },
      };

      const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error('PayPal order creation failed', errorData);
        throw new BadRequestException(`PayPal order creation failed: ${errorData.message || response.statusText}`);
      }

      const orderData = await response.json();

      // Find the approval URL
      const approvalLink = orderData.links.find((link: any) => link.rel === 'approve');
      const approvalUrl = approvalLink?.href || '';

      this.logger.log(`PayPal order created: ${orderData.id}`);

      return {
        orderId: orderData.id,
        approvalUrl,
      };
    } catch (error: any) {
      this.logger.error('Failed to create PayPal order', error.message);
      throw error;
    }
  }

  // ==================== Apple Pay / Google Pay ====================

  /**
   * Create a payment intent optimized for Apple Pay
   * Apple Pay uses Stripe's Payment Request API on the client side
   */
  async createApplePayIntent(
    amount: number,
    currency: string = 'usd',
    metadata?: Record<string, string>,
  ): Promise<{
    clientSecret: string;
    paymentIntentId: string;
    applePay: {
      merchantId: string;
      merchantName: string;
      countryCode: string;
    };
  }> {
    this.ensureStripeConfigured();

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    try {
      const paymentIntent = await this.stripe!.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        payment_method_types: ['card'], // Apple Pay uses card type
        metadata: {
          ...metadata,
          payment_method: 'apple_pay',
        },
      });

      this.logger.log(`Apple Pay payment intent created: ${paymentIntent.id}`);

      return {
        clientSecret: paymentIntent.client_secret as string,
        paymentIntentId: paymentIntent.id,
        applePay: {
          merchantId: this.configService.get<string>('APPLE_MERCHANT_ID') || 'merchant.com.citadelbuy',
          merchantName: this.configService.get<string>('APP_NAME') || 'CitadelBuy',
          countryCode: 'US',
        },
      };
    } catch (error) {
      this.logger.error('Failed to create Apple Pay payment intent', error);
      throw error;
    }
  }

  /**
   * Create a payment intent optimized for Google Pay
   * Google Pay also uses Stripe's Payment Request API
   */
  async createGooglePayIntent(
    amount: number,
    currency: string = 'usd',
    metadata?: Record<string, string>,
  ): Promise<{
    clientSecret: string;
    paymentIntentId: string;
    googlePay: {
      merchantId: string;
      merchantName: string;
      environment: 'TEST' | 'PRODUCTION';
      allowedCardNetworks: string[];
      allowedCardAuthMethods: string[];
    };
  }> {
    this.ensureStripeConfigured();

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    try {
      const paymentIntent = await this.stripe!.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        payment_method_types: ['card'], // Google Pay uses card type
        metadata: {
          ...metadata,
          payment_method: 'google_pay',
        },
      });

      this.logger.log(`Google Pay payment intent created: ${paymentIntent.id}`);

      const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

      return {
        clientSecret: paymentIntent.client_secret as string,
        paymentIntentId: paymentIntent.id,
        googlePay: {
          merchantId: this.configService.get<string>('GOOGLE_MERCHANT_ID') || 'BCR2DN4T6XXXXXXX',
          merchantName: this.configService.get<string>('APP_NAME') || 'CitadelBuy',
          environment: isProduction ? 'PRODUCTION' : 'TEST',
          allowedCardNetworks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA'],
          allowedCardAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
        },
      };
    } catch (error) {
      this.logger.error('Failed to create Google Pay payment intent', error);
      throw error;
    }
  }

  /**
   * Process a payment with Apple Pay or Google Pay token
   * The token is generated by the wallet on the client side
   */
  async processWalletPayment(
    walletType: 'apple_pay' | 'google_pay',
    paymentMethodId: string,
    amount: number,
    currency: string = 'usd',
    metadata?: Record<string, string>,
  ): Promise<{
    success: boolean;
    paymentIntentId: string;
    status: string;
  }> {
    this.ensureStripeConfigured();

    try {
      // Create and confirm payment intent with the wallet payment method
      const paymentIntent = await this.stripe!.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        payment_method: paymentMethodId,
        confirm: true,
        metadata: {
          ...metadata,
          payment_method: walletType,
        },
        // Disable redirect for wallet payments
        return_url: undefined,
      });

      this.logger.log(`${walletType} payment processed: ${paymentIntent.id}, status: ${paymentIntent.status}`);

      return {
        success: paymentIntent.status === 'succeeded',
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      };
    } catch (error: any) {
      this.logger.error(`${walletType} payment failed`, error);
      throw new BadRequestException(`Payment failed: ${error.message}`);
    }
  }

  /**
   * Verify Apple Pay merchant domain
   * This is required for Apple Pay to work on your domain
   */
  async verifyApplePayDomain(domain: string): Promise<{ success: boolean; domain: string }> {
    this.ensureStripeConfigured();

    try {
      // Register the domain with Stripe for Apple Pay
      const applePayDomain = await this.stripe!.applePayDomains.create({
        domain_name: domain,
      });

      this.logger.log(`Apple Pay domain verified: ${domain}`);

      return {
        success: true,
        domain: applePayDomain.domain_name,
      };
    } catch (error: any) {
      this.logger.error(`Apple Pay domain verification failed for ${domain}`, error);
      throw new BadRequestException(`Domain verification failed: ${error.message}`);
    }
  }

  /**
   * List verified Apple Pay domains
   */
  async listApplePayDomains(): Promise<string[]> {
    this.ensureStripeConfigured();

    try {
      const domains = await this.stripe!.applePayDomains.list({ limit: 100 });
      return domains.data.map(d => d.domain_name);
    } catch (error) {
      this.logger.error('Failed to list Apple Pay domains', error);
      return [];
    }
  }

  /**
   * Check if wallet payments (Apple Pay / Google Pay) are available
   */
  isWalletPaymentConfigured(): {
    applePay: boolean;
    googlePay: boolean;
  } {
    const stripeConfigured = this.stripe !== null;

    return {
      applePay: stripeConfigured && !!this.configService.get<string>('APPLE_MERCHANT_ID'),
      googlePay: stripeConfigured, // Google Pay only needs Stripe
    };
  }

  /**
   * Capture a PayPal order after customer approval
   */
  async capturePayPalOrder(paypalOrderId: string): Promise<{
    captureId: string;
    status: string;
    amount: number;
  }> {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException('PayPal is not configured');
      }
      this.logger.warn('PayPal credentials not configured. Returning mock capture in development.');
      return {
        captureId: `DEV_CAPTURE_${Date.now()}`,
        status: 'COMPLETED',
        amount: 0,
      };
    }

    try {
      const accessToken = await this.getPayPalAccessToken(clientId, clientSecret);

      const paypalMode = this.configService.get<string>('PAYPAL_MODE', 'sandbox');
      const baseUrl = paypalMode === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

      const response = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error('PayPal capture failed', errorData);
        throw new BadRequestException(`PayPal capture failed: ${errorData.message || response.statusText}`);
      }

      const captureData = await response.json();

      // Get the capture details from the first purchase unit
      const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0];

      this.logger.log(`PayPal order captured: ${captureData.id}, status: ${captureData.status}`);

      return {
        captureId: capture?.id || captureData.id,
        status: captureData.status,
        amount: parseFloat(capture?.amount?.value || '0'),
      };
    } catch (error: any) {
      this.logger.error('Failed to capture PayPal order', error.message);
      throw error;
    }
  }
}
