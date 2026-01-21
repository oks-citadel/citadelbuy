import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
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

/**
 * Paystack Payment Provider
 * Primarily for Nigeria and Ghana markets
 *
 * Features:
 * - Card payments
 * - Bank transfers
 * - Mobile money
 * - USSD
 * - Subscriptions
 */
@Injectable()
export class PaystackProvider implements IPaymentProvider, ISubscriptionProvider {
  private readonly logger = new Logger(PaystackProvider.name);
  private readonly baseUrl = 'https://api.paystack.co';
  readonly providerType = PaymentProviderType.PAYSTACK;

  constructor(private configService: ConfigService) {}

  private get secretKey(): string {
    return this.configService.get<string>('PAYSTACK_SECRET_KEY', '');
  }

  private get publicKey(): string {
    return this.configService.get<string>('PAYSTACK_PUBLIC_KEY', '');
  }

  isConfigured(): boolean {
    return !!this.secretKey;
  }

  isEnabled(): boolean {
    const enabled = this.configService.get<string>('PAYSTACK_ENABLED', 'false');
    return enabled === 'true' && this.isConfigured();
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    if (!this.isConfigured()) {
      return this.errorResult('Paystack not configured');
    }

    try {
      const reference = `PSK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const payload: any = {
        email: request.customer.email,
        amount: Math.round(request.amount * 100), // Paystack uses kobo (smallest currency unit)
        currency: request.currency,
        reference,
        callback_url: request.returnUrl || `${this.configService.get('APP_URL')}/checkout/success`,
        metadata: {
          ...request.metadata,
          cancel_action: request.cancelUrl,
          custom_fields: [
            {
              display_name: 'Customer Name',
              variable_name: 'customer_name',
              value: request.customer.name || '',
            },
          ],
        },
      };

      // Add split payment if configured for marketplace
      const subaccountCode = request.metadata?.vendorSubaccountCode;
      if (subaccountCode) {
        payload.subaccount = subaccountCode;
        payload.bearer = 'subaccount'; // Subaccount bears transaction charges
      }

      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.status) {
        this.logger.error(`Paystack createPayment error: ${JSON.stringify(data)}`);
        return this.errorResult(data.message || 'Payment initialization failed');
      }

      return {
        success: true,
        transactionId: reference,
        providerTransactionId: data.data?.access_code || reference,
        provider: this.providerType,
        status: PaymentStatus.PENDING,
        amount: request.amount,
        currency: request.currency,
        checkoutUrl: data.data?.authorization_url,
        metadata: {
          accessCode: data.data?.access_code,
          reference,
        },
      };
    } catch (error: any) {
      this.logger.error(`Paystack createPayment error: ${error.message}`);
      return this.errorResult(error.message);
    }
  }

  async capturePayment(transactionId: string): Promise<PaymentResult> {
    // Paystack auto-captures, verify the payment instead
    return this.verifyPayment(transactionId);
  }

  async verifyPayment(reference: string): Promise<PaymentResult> {
    if (!this.isConfigured()) {
      return this.errorResult('Paystack not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
        },
      });

      const data = await response.json();

      if (!data.status) {
        return this.errorResult(data.message || 'Verification failed');
      }

      const transaction = data.data;

      return {
        success: true,
        transactionId: transaction.reference,
        providerTransactionId: transaction.id?.toString(),
        provider: this.providerType,
        status: this.mapPaystackStatus(transaction.status),
        amount: transaction.amount / 100, // Convert from kobo
        currency: transaction.currency,
        metadata: {
          paystackId: transaction.id,
          channel: transaction.channel,
          gatewayResponse: transaction.gateway_response,
          customerEmail: transaction.customer?.email,
          authorizationCode: transaction.authorization?.authorization_code,
          cardLast4: transaction.authorization?.last4,
          cardBrand: transaction.authorization?.brand,
          paidAt: transaction.paid_at,
        },
      };
    } catch (error: any) {
      this.logger.error(`Paystack verifyPayment error: ${error.message}`);
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
        error: { code: 'NOT_CONFIGURED', message: 'Paystack not configured' },
      };
    }

    try {
      const payload: any = {
        transaction: request.providerTransactionId,
        merchant_note: request.reason || 'Refund requested',
      };

      if (request.amount) {
        payload.amount = Math.round(request.amount * 100); // Convert to kobo
      }

      const response = await fetch(`${this.baseUrl}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.status) {
        return {
          success: false,
          refundId: '',
          providerRefundId: '',
          amount: 0,
          currency: '',
          status: 'FAILED',
          error: { code: 'REFUND_FAILED', message: data.message || 'Refund failed' },
        };
      }

      return {
        success: true,
        refundId: data.data?.id?.toString() || '',
        providerRefundId: data.data?.id?.toString() || '',
        amount: (data.data?.amount || 0) / 100,
        currency: data.data?.currency || 'NGN',
        status: data.data?.status === 'processed' ? 'COMPLETED' : 'PENDING',
      };
    } catch (error: any) {
      this.logger.error(`Paystack refundPayment error: ${error.message}`);
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
  ): Promise<WebhookValidationResult> {
    if (!this.isConfigured()) {
      return { isValid: false, error: 'Paystack not configured' };
    }

    try {
      const payloadString = typeof payload === 'string' ? payload : payload.toString();

      // Verify signature
      const hash = crypto
        .createHmac('sha512', this.secretKey)
        .update(payloadString)
        .digest('hex');

      if (hash !== signature) {
        return { isValid: false, error: 'Invalid webhook signature' };
      }

      const body = JSON.parse(payloadString);

      return {
        isValid: true,
        event: {
          id: body.data?.id?.toString() || body.id,
          type: body.event,
          provider: this.providerType,
          data: body.data,
          timestamp: new Date(),
        },
      };
    } catch (error: any) {
      this.logger.error(`Paystack webhook validation error: ${error.message}`);
      return { isValid: false, error: error.message };
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentResult> {
    return this.verifyPayment(transactionId);
  }

  // Subscription methods
  async createPlan(config: SubscriptionPlanConfig): Promise<{ planId: string; providerPlanId: string }> {
    if (!this.isConfigured()) {
      throw new Error('Paystack not configured');
    }

    try {
      const intervalMap: Record<string, string> = {
        day: 'daily',
        week: 'weekly',
        month: 'monthly',
        year: 'annually',
      };

      const payload = {
        name: config.name,
        description: config.description,
        amount: Math.round(config.amount * 100), // kobo
        interval: intervalMap[config.interval] || 'monthly',
        currency: config.currency,
      };

      const response = await fetch(`${this.baseUrl}/plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.status) {
        throw new Error(data.message || 'Failed to create plan');
      }

      return {
        planId: config.id,
        providerPlanId: data.data?.plan_code,
      };
    } catch (error: any) {
      this.logger.error(`Paystack createPlan error: ${error.message}`);
      throw error;
    }
  }

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
        error: { code: 'NOT_CONFIGURED', message: 'Paystack not configured' },
      };
    }

    try {
      // First, create a customer if needed
      const customerResponse = await fetch(`${this.baseUrl}/customer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: request.customerId, // Assuming customerId is email for Paystack
        }),
      });

      const customerData = await customerResponse.json();
      const customerCode = customerData.data?.customer_code;

      // Create subscription
      const payload = {
        customer: customerCode,
        plan: request.planId,
        authorization: request.paymentMethodId, // Authorization code from previous charge
      };

      const response = await fetch(`${this.baseUrl}/subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.status) {
        return {
          success: false,
          subscriptionId: '',
          providerSubscriptionId: '',
          status: 'UNPAID',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          error: { code: 'SUBSCRIPTION_ERROR', message: data.message || 'Subscription failed' },
        };
      }

      const subscription = data.data;
      const nextPaymentDate = new Date(subscription.next_payment_date || Date.now());
      const currentPeriodStart = new Date();

      return {
        success: true,
        subscriptionId: subscription.subscription_code,
        providerSubscriptionId: subscription.subscription_code,
        status: subscription.status === 'active' ? 'ACTIVE' : 'UNPAID',
        currentPeriodStart,
        currentPeriodEnd: nextPaymentDate,
        cancelAtPeriodEnd: false,
      };
    } catch (error: any) {
      this.logger.error(`Paystack createSubscription error: ${error.message}`);
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

  async cancelSubscription(subscriptionId: string): Promise<SubscriptionResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        subscriptionId: '',
        providerSubscriptionId: '',
        status: 'CANCELLED',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        error: { code: 'NOT_CONFIGURED', message: 'Paystack not configured' },
      };
    }

    try {
      // Get subscription details first
      const subResponse = await fetch(`${this.baseUrl}/subscription/${subscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
        },
      });

      const subData = await subResponse.json();
      const emailToken = subData.data?.email_token;

      // Disable subscription
      const response = await fetch(`${this.baseUrl}/subscription/disable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: subscriptionId,
          token: emailToken,
        }),
      });

      const data = await response.json();

      return {
        success: data.status,
        subscriptionId,
        providerSubscriptionId: subscriptionId,
        status: 'CANCELLED',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(subData.data?.next_payment_date || Date.now()),
        cancelAtPeriodEnd: true,
        error: data.status ? undefined : { code: 'CANCEL_ERROR', message: data.message },
      };
    } catch (error: any) {
      this.logger.error(`Paystack cancelSubscription error: ${error.message}`);
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

  async updateSubscription(): Promise<SubscriptionResult> {
    // Paystack doesn't support updating subscriptions directly
    // You need to cancel and create a new one
    return {
      success: false,
      subscriptionId: '',
      providerSubscriptionId: '',
      status: 'UNPAID',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: false,
      error: { code: 'NOT_SUPPORTED', message: 'Paystack does not support subscription updates' },
    };
  }

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
        error: { code: 'NOT_CONFIGURED', message: 'Paystack not configured' },
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/subscription/${subscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
        },
      });

      const data = await response.json();

      if (!data.status) {
        return {
          success: false,
          subscriptionId: '',
          providerSubscriptionId: '',
          status: 'UNPAID',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          error: { code: 'STATUS_ERROR', message: data.message },
        };
      }

      const subscription = data.data;

      return {
        success: true,
        subscriptionId: subscription.subscription_code,
        providerSubscriptionId: subscription.subscription_code,
        status: this.mapPaystackSubscriptionStatus(subscription.status),
        currentPeriodStart: new Date(subscription.createdAt),
        currentPeriodEnd: new Date(subscription.next_payment_date || Date.now()),
        cancelAtPeriodEnd: subscription.status === 'cancelled',
      };
    } catch (error: any) {
      this.logger.error(`Paystack getSubscriptionStatus error: ${error.message}`);
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

  // Additional Paystack-specific methods

  /**
   * Create a dedicated virtual account for customer
   */
  async createDedicatedAccount(
    customerEmail: string,
    customerName: string,
    preferredBank?: 'wema-bank' | 'titan-paystack' | 'test-bank',
  ): Promise<{
    success: boolean;
    accountNumber?: string;
    bankName?: string;
    accountName?: string;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Paystack not configured' };
    }

    try {
      // First create customer
      const customerResponse = await fetch(`${this.baseUrl}/customer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: customerEmail,
          first_name: customerName.split(' ')[0],
          last_name: customerName.split(' ').slice(1).join(' ') || customerName.split(' ')[0],
        }),
      });

      const customerData = await customerResponse.json();

      if (!customerData.status) {
        return { success: false, error: customerData.message };
      }

      // Create dedicated account
      const response = await fetch(`${this.baseUrl}/dedicated_account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: customerData.data.customer_code,
          preferred_bank: preferredBank,
        }),
      });

      const data = await response.json();

      if (!data.status) {
        return { success: false, error: data.message };
      }

      return {
        success: true,
        accountNumber: data.data?.account_number,
        bankName: data.data?.bank?.name,
        accountName: data.data?.account_name,
      };
    } catch (error: any) {
      this.logger.error(`Paystack createDedicatedAccount error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Initiate bank transfer
   */
  async initiateTransfer(
    amount: number,
    recipientCode: string,
    reason?: string,
  ): Promise<{
    success: boolean;
    transferCode?: string;
    reference?: string;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Paystack not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/transfer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'balance',
          amount: Math.round(amount * 100),
          recipient: recipientCode,
          reason: reason || 'Payout',
        }),
      });

      const data = await response.json();

      if (!data.status) {
        return { success: false, error: data.message };
      }

      return {
        success: true,
        transferCode: data.data?.transfer_code,
        reference: data.data?.reference,
      };
    } catch (error: any) {
      this.logger.error(`Paystack initiateTransfer error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Helper methods
  private mapPaystackStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      success: PaymentStatus.COMPLETED,
      pending: PaymentStatus.PENDING,
      failed: PaymentStatus.FAILED,
      abandoned: PaymentStatus.CANCELLED,
      reversed: PaymentStatus.REFUNDED,
    };
    return statusMap[status.toLowerCase()] || PaymentStatus.PENDING;
  }

  private mapPaystackSubscriptionStatus(
    status: string,
  ): 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'UNPAID' {
    const statusMap: Record<string, 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'UNPAID'> = {
      active: 'ACTIVE',
      non_renewing: 'CANCELLED',
      attention: 'PAST_DUE',
      completed: 'CANCELLED',
      cancelled: 'CANCELLED',
    };
    return statusMap[status.toLowerCase()] || 'UNPAID';
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
}
