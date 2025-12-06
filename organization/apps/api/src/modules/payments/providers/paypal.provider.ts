import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
export class PayPalProvider implements IPaymentProvider, ISubscriptionProvider {
  private readonly logger = new Logger(PayPalProvider.name);
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  readonly providerType = PaymentProviderType.PAYPAL;

  constructor(private configService: ConfigService) {}

  private get clientId(): string {
    return this.configService.get<string>('PAYPAL_CLIENT_ID', '');
  }

  private get clientSecret(): string {
    return this.configService.get<string>('PAYPAL_CLIENT_SECRET', '');
  }

  private get baseUrl(): string {
    const mode = this.configService.get<string>('PAYPAL_MODE', 'sandbox');
    return mode === 'production'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  isConfigured(): boolean {
    return !!this.clientId && !!this.clientSecret;
  }

  isEnabled(): boolean {
    const enabled = this.configService.get<string>('PAYPAL_ENABLED', 'true');
    return enabled === 'true' && this.isConfigured();
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 5 min buffer)
    if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
      return this.accessToken!;
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`PayPal auth failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);

    return this.accessToken!;
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    if (!this.isConfigured()) {
      return this.errorResult('PayPal not configured');
    }

    try {
      const token = await this.getAccessToken();

      const items = request.items?.map(item => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity.toString(),
        unit_amount: {
          currency_code: request.currency,
          value: item.unitPrice.toFixed(2),
        },
        category: 'PHYSICAL_GOODS',
      })) || [];

      const itemTotal = request.items?.reduce(
        (sum, item) => sum + (item.unitPrice * item.quantity),
        0,
      ) || request.amount;

      const orderPayload: any = {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: request.metadata?.orderId || `order_${Date.now()}`,
          description: request.description || 'Purchase',
          amount: {
            currency_code: request.currency,
            value: request.amount.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: request.currency,
                value: itemTotal.toFixed(2),
              },
            },
          },
          items: items.length > 0 ? items : undefined,
        }],
        application_context: {
          brand_name: 'CitadelBuy',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
          return_url: request.returnUrl || `${this.configService.get('APP_URL')}/checkout/success`,
          cancel_url: request.cancelUrl || `${this.configService.get('APP_URL')}/checkout/cancel`,
        },
      };

      // Add payer info if available
      if (request.customer.email) {
        orderPayload.payer = {
          email_address: request.customer.email,
          name: request.customer.name ? {
            given_name: request.customer.name.split(' ')[0],
            surname: request.customer.name.split(' ').slice(1).join(' ') || '',
          } : undefined,
        };
      }

      const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `citadelbuy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`PayPal createOrder error: ${JSON.stringify(data)}`);
        return this.errorResult(data.message || 'PayPal order creation failed', data.name);
      }

      const approveLink = data.links?.find((link: any) => link.rel === 'approve');

      return {
        success: true,
        transactionId: data.id,
        providerTransactionId: data.id,
        provider: this.providerType,
        status: PaymentStatus.PENDING,
        amount: request.amount,
        currency: request.currency,
        checkoutUrl: approveLink?.href,
        metadata: {
          paypalOrderId: data.id,
          links: data.links,
        },
      };
    } catch (error: any) {
      this.logger.error(`PayPal createPayment error: ${error.message}`);
      return this.errorResult(error.message);
    }
  }

  async capturePayment(transactionId: string): Promise<PaymentResult> {
    if (!this.isConfigured()) {
      return this.errorResult('PayPal not configured');
    }

    try {
      const token = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${transactionId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`PayPal capture error: ${JSON.stringify(data)}`);
        return this.errorResult(data.message || 'PayPal capture failed', data.name);
      }

      const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

      return {
        success: true,
        transactionId: data.id,
        providerTransactionId: capture?.id || data.id,
        provider: this.providerType,
        status: data.status === 'COMPLETED' ? PaymentStatus.COMPLETED : PaymentStatus.PROCESSING,
        amount: parseFloat(capture?.amount?.value || '0'),
        currency: capture?.amount?.currency_code || 'USD',
        metadata: {
          paypalOrderId: data.id,
          captureId: capture?.id,
          payerEmail: data.payer?.email_address,
        },
      };
    } catch (error: any) {
      this.logger.error(`PayPal capturePayment error: ${error.message}`);
      return this.errorResult(error.message);
    }
  }

  async refundPayment(request: RefundRequest): Promise<RefundResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        refundId: '',
        providerRefundId: '',
        amount: 0,
        currency: '',
        status: 'FAILED',
        error: { code: 'NOT_CONFIGURED', message: 'PayPal not configured' },
      };
    }

    try {
      const token = await this.getAccessToken();

      const refundPayload: any = {
        note_to_payer: request.reason || 'Refund processed',
      };

      if (request.amount) {
        refundPayload.amount = {
          value: request.amount.toFixed(2),
          currency_code: 'USD', // Should be passed in metadata
        };
      }

      const response = await fetch(
        `${this.baseUrl}/v2/payments/captures/${request.providerTransactionId}/refund`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(refundPayload),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`PayPal refund error: ${JSON.stringify(data)}`);
        return {
          success: false,
          refundId: '',
          providerRefundId: '',
          amount: 0,
          currency: '',
          status: 'FAILED',
          error: { code: data.name || 'REFUND_ERROR', message: data.message || 'Refund failed' },
        };
      }

      return {
        success: true,
        refundId: data.id,
        providerRefundId: data.id,
        amount: parseFloat(data.amount?.value || request.amount?.toString() || '0'),
        currency: data.amount?.currency_code || 'USD',
        status: data.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
      };
    } catch (error: any) {
      this.logger.error(`PayPal refundPayment error: ${error.message}`);
      return {
        success: false,
        refundId: '',
        providerRefundId: '',
        amount: 0,
        currency: '',
        status: 'FAILED',
        error: { code: 'REFUND_ERROR', message: error.message },
      };
    }
  }

  async validateWebhook(
    payload: string | Buffer,
    signature: string,
    headers?: Record<string, string>,
  ): Promise<WebhookValidationResult> {
    if (!this.isConfigured()) {
      return { isValid: false, error: 'PayPal not configured' };
    }

    const webhookId = this.configService.get<string>('PAYPAL_WEBHOOK_ID');

    // In development, skip verification if webhook ID not set
    if (!webhookId) {
      const body = typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payload.toString());
      this.logger.warn('PayPal webhook ID not configured, skipping verification');
      return {
        isValid: true,
        event: {
          id: body.id,
          type: body.event_type,
          provider: this.providerType,
          data: body.resource,
          timestamp: new Date(body.create_time),
        },
      };
    }

    try {
      const token = await this.getAccessToken();

      const verifyPayload = {
        auth_algo: headers?.['paypal-auth-algo'],
        cert_url: headers?.['paypal-cert-url'],
        transmission_id: headers?.['paypal-transmission-id'],
        transmission_sig: headers?.['paypal-transmission-sig'],
        transmission_time: headers?.['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payload.toString()),
      };

      const response = await fetch(`${this.baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verifyPayload),
      });

      const data = await response.json();

      if (data.verification_status === 'SUCCESS') {
        const body = verifyPayload.webhook_event;
        return {
          isValid: true,
          event: {
            id: body.id,
            type: body.event_type,
            provider: this.providerType,
            data: body.resource,
            timestamp: new Date(body.create_time),
          },
        };
      }

      return { isValid: false, error: 'Webhook verification failed' };
    } catch (error: any) {
      this.logger.error(`PayPal webhook validation error: ${error.message}`);
      return { isValid: false, error: error.message };
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentResult> {
    if (!this.isConfigured()) {
      return this.errorResult('PayPal not configured');
    }

    try {
      const token = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return this.errorResult(data.message || 'Failed to get order status', data.name);
      }

      const statusMap: Record<string, PaymentStatus> = {
        CREATED: PaymentStatus.PENDING,
        SAVED: PaymentStatus.PENDING,
        APPROVED: PaymentStatus.PROCESSING,
        VOIDED: PaymentStatus.CANCELLED,
        COMPLETED: PaymentStatus.COMPLETED,
        PAYER_ACTION_REQUIRED: PaymentStatus.PENDING,
      };

      const purchaseUnit = data.purchase_units?.[0];

      return {
        success: true,
        transactionId: data.id,
        providerTransactionId: data.id,
        provider: this.providerType,
        status: statusMap[data.status] || PaymentStatus.PENDING,
        amount: parseFloat(purchaseUnit?.amount?.value || '0'),
        currency: purchaseUnit?.amount?.currency_code || 'USD',
        metadata: {
          paypalStatus: data.status,
          payerEmail: data.payer?.email_address,
        },
      };
    } catch (error: any) {
      this.logger.error(`PayPal getPaymentStatus error: ${error.message}`);
      return this.errorResult(error.message);
    }
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

  // Venmo support (through PayPal)
  async createVenmoPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    // Venmo is supported through PayPal's standard flow
    // The PayPal SDK on the client handles Venmo as a payment method
    return this.createPayment({
      ...request,
      metadata: {
        ...request.metadata,
        preferred_payment_method: 'VENMO',
      },
    });
  }

  // ==================== Subscription Methods ====================

  /**
   * Create a subscription plan in PayPal
   */
  async createPlan(config: SubscriptionPlanConfig): Promise<{ planId: string; providerPlanId: string }> {
    if (!this.isConfigured()) {
      throw new Error('PayPal not configured');
    }

    try {
      const token = await this.getAccessToken();

      // Create product first
      const productResponse = await fetch(`${this.baseUrl}/v1/catalogs/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: config.name,
          description: config.description || config.name,
          type: 'SERVICE',
          category: 'SOFTWARE',
        }),
      });

      const productData = await productResponse.json();

      if (!productResponse.ok) {
        this.logger.error(`PayPal create product error: ${JSON.stringify(productData)}`);
        throw new Error(productData.message || 'Failed to create product');
      }

      const productId = productData.id;

      // Create billing plan
      const intervalMap: Record<string, string> = {
        day: 'DAY',
        week: 'WEEK',
        month: 'MONTH',
        year: 'YEAR',
      };

      const planPayload = {
        product_id: productId,
        name: config.name,
        description: config.description,
        billing_cycles: [
          {
            frequency: {
              interval_unit: intervalMap[config.interval] || 'MONTH',
              interval_count: config.intervalCount || 1,
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // Infinite
            pricing_scheme: {
              fixed_price: {
                value: config.amount.toFixed(2),
                currency_code: config.currency,
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 3,
        },
      };

      // Add trial period if specified
      if (config.trialDays && config.trialDays > 0) {
        planPayload.billing_cycles.unshift({
          frequency: {
            interval_unit: 'DAY',
            interval_count: config.trialDays,
          },
          tenure_type: 'TRIAL',
          sequence: 1,
          total_cycles: 1,
          pricing_scheme: {
            fixed_price: {
              value: '0',
              currency_code: config.currency,
            },
          },
        });
        // Update regular cycle sequence
        planPayload.billing_cycles[1].sequence = 2;
      }

      const planResponse = await fetch(`${this.baseUrl}/v1/billing/plans`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planPayload),
      });

      const planData = await planResponse.json();

      if (!planResponse.ok) {
        this.logger.error(`PayPal create plan error: ${JSON.stringify(planData)}`);
        throw new Error(planData.message || 'Failed to create plan');
      }

      return {
        planId: config.id,
        providerPlanId: planData.id,
      };
    } catch (error: any) {
      this.logger.error(`PayPal createPlan error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a subscription for a customer
   */
  async createSubscription(request: CreateSubscriptionRequest): Promise<SubscriptionResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        subscriptionId: '',
        providerSubscriptionId: '',
        status: 'UNPAID',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        error: { code: 'NOT_CONFIGURED', message: 'PayPal not configured' },
      };
    }

    try {
      const token = await this.getAccessToken();

      const subscriptionPayload: any = {
        plan_id: request.planId,
        start_time: new Date().toISOString(),
        quantity: '1',
        custom_id: request.customerId,
      };

      const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`PayPal createSubscription error: ${JSON.stringify(data)}`);
        return {
          success: false,
          subscriptionId: '',
          providerSubscriptionId: '',
          status: 'UNPAID',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          error: { code: data.name || 'SUBSCRIPTION_ERROR', message: data.message || 'Subscription creation failed' },
        };
      }

      // Parse billing info
      const startTime = new Date(data.start_time || data.create_time);
      const billingInfo = data.billing_info;
      const nextBillingTime = billingInfo?.next_billing_time ? new Date(billingInfo.next_billing_time) : new Date(startTime.getTime() + 30 * 24 * 60 * 60 * 1000);

      return {
        success: true,
        subscriptionId: data.id,
        providerSubscriptionId: data.id,
        status: this.mapPayPalSubscriptionStatus(data.status),
        currentPeriodStart: startTime,
        currentPeriodEnd: nextBillingTime,
        cancelAtPeriodEnd: false,
      };
    } catch (error: any) {
      this.logger.error(`PayPal createSubscription error: ${error.message}`);
      return {
        success: false,
        subscriptionId: '',
        providerSubscriptionId: '',
        status: 'UNPAID',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        error: { code: 'SUBSCRIPTION_ERROR', message: error.message },
      };
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, immediately = false): Promise<SubscriptionResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        subscriptionId: '',
        providerSubscriptionId: '',
        status: 'CANCELLED',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        error: { code: 'NOT_CONFIGURED', message: 'PayPal not configured' },
      };
    }

    try {
      const token = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Customer requested cancellation',
        }),
      });

      if (!response.ok && response.status !== 204) {
        const error = await response.json();
        this.logger.error(`PayPal cancelSubscription error: ${JSON.stringify(error)}`);
        return {
          success: false,
          subscriptionId: '',
          providerSubscriptionId: '',
          status: 'CANCELLED',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          error: { code: error.name || 'CANCEL_ERROR', message: error.message || 'Cancellation failed' },
        };
      }

      // Get subscription details after cancellation
      const detailsResponse = await fetch(`${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const subscription = await detailsResponse.json();

      return {
        success: true,
        subscriptionId: subscription.id,
        providerSubscriptionId: subscription.id,
        status: 'CANCELLED',
        currentPeriodStart: new Date(subscription.start_time || subscription.create_time),
        currentPeriodEnd: new Date(subscription.billing_info?.next_billing_time || Date.now()),
        cancelAtPeriodEnd: true,
      };
    } catch (error: any) {
      this.logger.error(`PayPal cancelSubscription error: ${error.message}`);
      return {
        success: false,
        subscriptionId: '',
        providerSubscriptionId: '',
        status: 'CANCELLED',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        error: { code: 'CANCEL_ERROR', message: error.message },
      };
    }
  }

  /**
   * Update subscription (change plan, payment method, etc.)
   */
  async updateSubscription(
    subscriptionId: string,
    updates: Partial<CreateSubscriptionRequest>,
  ): Promise<SubscriptionResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        subscriptionId: '',
        providerSubscriptionId: '',
        status: 'UNPAID',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        error: { code: 'NOT_CONFIGURED', message: 'PayPal not configured' },
      };
    }

    try {
      const token = await this.getAccessToken();

      // PayPal requires plan revision for plan changes
      if (updates.planId) {
        const revisionPayload = {
          plan_id: updates.planId,
        };

        const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/revise`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(revisionPayload),
        });

        const data = await response.json();

        if (!response.ok) {
          this.logger.error(`PayPal updateSubscription error: ${JSON.stringify(data)}`);
          return {
            success: false,
            subscriptionId: '',
            providerSubscriptionId: '',
            status: 'UNPAID',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(),
            cancelAtPeriodEnd: false,
            error: { code: data.name || 'UPDATE_ERROR', message: data.message || 'Update failed' },
          };
        }
      }

      return this.getSubscriptionStatus(subscriptionId);
    } catch (error: any) {
      this.logger.error(`PayPal updateSubscription error: ${error.message}`);
      return {
        success: false,
        subscriptionId: '',
        providerSubscriptionId: '',
        status: 'UNPAID',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        error: { code: 'UPDATE_ERROR', message: error.message },
      };
    }
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        subscriptionId: '',
        providerSubscriptionId: '',
        status: 'UNPAID',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        error: { code: 'NOT_CONFIGURED', message: 'PayPal not configured' },
      };
    }

    try {
      const token = await this.getAccessToken();

      const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`PayPal getSubscriptionStatus error: ${JSON.stringify(data)}`);
        return {
          success: false,
          subscriptionId: '',
          providerSubscriptionId: '',
          status: 'UNPAID',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          error: { code: data.name || 'STATUS_ERROR', message: data.message || 'Failed to get status' },
        };
      }

      const startTime = new Date(data.start_time || data.create_time);
      const nextBillingTime = data.billing_info?.next_billing_time
        ? new Date(data.billing_info.next_billing_time)
        : new Date(startTime.getTime() + 30 * 24 * 60 * 60 * 1000);

      return {
        success: true,
        subscriptionId: data.id,
        providerSubscriptionId: data.id,
        status: this.mapPayPalSubscriptionStatus(data.status),
        currentPeriodStart: startTime,
        currentPeriodEnd: nextBillingTime,
        cancelAtPeriodEnd: data.status === 'CANCELLED',
      };
    } catch (error: any) {
      this.logger.error(`PayPal getSubscriptionStatus error: ${error.message}`);
      return {
        success: false,
        subscriptionId: '',
        providerSubscriptionId: '',
        status: 'UNPAID',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        error: { code: 'STATUS_ERROR', message: error.message },
      };
    }
  }

  // Helper methods
  private mapPayPalSubscriptionStatus(
    status: string,
  ): 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'UNPAID' {
    const statusMap: Record<string, 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'UNPAID'> = {
      APPROVAL_PENDING: 'UNPAID',
      APPROVED: 'ACTIVE',
      ACTIVE: 'ACTIVE',
      SUSPENDED: 'PAST_DUE',
      CANCELLED: 'CANCELLED',
      EXPIRED: 'CANCELLED',
    };
    return statusMap[status] || 'UNPAID';
  }
}
