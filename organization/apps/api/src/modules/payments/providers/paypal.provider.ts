import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IPaymentProvider,
  PaymentProviderType,
  PaymentStatus,
  CreatePaymentRequest,
  PaymentResult,
  RefundRequest,
  RefundResult,
  WebhookValidationResult,
} from '../interfaces';

@Injectable()
export class PayPalProvider implements IPaymentProvider {
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
}
