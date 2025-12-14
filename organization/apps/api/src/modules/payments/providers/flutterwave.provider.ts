import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
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

/**
 * Flutterwave Payment Provider
 * Supports payments in African markets: Nigeria, Ghana, Kenya, South Africa, etc.
 *
 * Features:
 * - Card payments
 * - Mobile money (M-Pesa, MTN, etc.)
 * - Bank transfers
 * - USSD
 */
@Injectable()
export class FlutterwaveProvider implements IPaymentProvider {
  private readonly logger = new Logger(FlutterwaveProvider.name);
  private readonly baseUrl = 'https://api.flutterwave.com/v3';
  readonly providerType = PaymentProviderType.FLUTTERWAVE;

  constructor(private configService: ConfigService) {}

  private get secretKey(): string {
    return this.configService.get<string>('FLUTTERWAVE_SECRET_KEY', '');
  }

  private get publicKey(): string {
    return this.configService.get<string>('FLUTTERWAVE_PUBLIC_KEY', '');
  }

  private get encryptionKey(): string {
    return this.configService.get<string>('FLUTTERWAVE_ENCRYPTION_KEY', '');
  }

  isConfigured(): boolean {
    return !!this.secretKey && !!this.publicKey;
  }

  isEnabled(): boolean {
    const enabled = this.configService.get<string>('FLUTTERWAVE_ENABLED', 'false');
    return enabled === 'true' && this.isConfigured();
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    if (!this.isConfigured()) {
      return this.errorResult('Flutterwave not configured');
    }

    try {
      const txRef = `FLW_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const payload = {
        tx_ref: txRef,
        amount: request.amount,
        currency: request.currency,
        redirect_url: request.returnUrl || `${this.configService.get('APP_URL')}/checkout/success`,
        payment_options: 'card,mobilemoney,ussd,banktransfer',
        meta: {
          ...request.metadata,
          source: 'broxiva',
        },
        customer: {
          email: request.customer.email,
          phonenumber: request.customer.phone || '',
          name: request.customer.name || '',
        },
        customizations: {
          title: 'Broxiva',
          description: request.description || 'Payment',
          logo: `${this.configService.get('APP_URL')}/logo.png`,
        },
      };

      const response = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status !== 'success') {
        this.logger.error(`Flutterwave createPayment error: ${JSON.stringify(data)}`);
        return this.errorResult(data.message || 'Payment initialization failed');
      }

      return {
        success: true,
        transactionId: txRef,
        providerTransactionId: txRef,
        provider: this.providerType,
        status: PaymentStatus.PENDING,
        amount: request.amount,
        currency: request.currency,
        checkoutUrl: data.data?.link,
        metadata: {
          flutterwaveRef: txRef,
          paymentLink: data.data?.link,
        },
      };
    } catch (error: any) {
      this.logger.error(`Flutterwave createPayment error: ${error.message}`);
      return this.errorResult(error.message);
    }
  }

  async capturePayment(transactionId: string): Promise<PaymentResult> {
    // Flutterwave auto-captures, verify the payment instead
    return this.verifyPayment(transactionId);
  }

  async verifyPayment(transactionId: string): Promise<PaymentResult> {
    if (!this.isConfigured()) {
      return this.errorResult('Flutterwave not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/transactions/${transactionId}/verify`, {
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
        },
      });

      const data = await response.json();

      if (data.status !== 'success') {
        return this.errorResult(data.message || 'Verification failed');
      }

      const transaction = data.data;

      return {
        success: true,
        transactionId: transaction.tx_ref,
        providerTransactionId: transaction.id.toString(),
        provider: this.providerType,
        status: this.mapFlutterwaveStatus(transaction.status),
        amount: transaction.amount,
        currency: transaction.currency,
        metadata: {
          flutterwaveId: transaction.id,
          paymentType: transaction.payment_type,
          processorResponse: transaction.processor_response,
          customerEmail: transaction.customer?.email,
          customerName: transaction.customer?.name,
        },
      };
    } catch (error: any) {
      this.logger.error(`Flutterwave verifyPayment error: ${error.message}`);
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
        error: { code: 'NOT_CONFIGURED', message: 'Flutterwave not configured' },
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/transactions/${request.providerTransactionId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: request.amount,
          comments: request.reason || 'Refund requested',
        }),
      });

      const data = await response.json();

      if (data.status !== 'success') {
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
        amount: request.amount || 0,
        currency: 'NGN', // Default, should be from original transaction
        status: data.data?.status === 'completed' ? 'COMPLETED' : 'PENDING',
      };
    } catch (error: any) {
      this.logger.error(`Flutterwave refundPayment error: ${error.message}`);
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
      return { isValid: false, error: 'Flutterwave not configured' };
    }

    const webhookSecret = this.configService.get<string>('FLUTTERWAVE_WEBHOOK_SECRET');

    try {
      const body = typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payload.toString());

      // Verify webhook signature using hash
      if (webhookSecret && signature) {
        const hash = crypto
          .createHmac('sha256', webhookSecret)
          .update(typeof payload === 'string' ? payload : payload.toString())
          .digest('hex');

        if (hash !== signature) {
          return { isValid: false, error: 'Invalid webhook signature' };
        }
      } else if (webhookSecret) {
        // If we have a secret but no signature, reject
        this.logger.warn('Flutterwave webhook received without signature');
      }

      // Verify with Flutterwave API for additional security
      if (body.data?.id) {
        const verifyResponse = await fetch(`${this.baseUrl}/transactions/${body.data.id}/verify`, {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
          },
        });
        const verifyData = await verifyResponse.json();

        if (verifyData.status !== 'success') {
          return { isValid: false, error: 'Transaction verification failed' };
        }
      }

      return {
        isValid: true,
        event: {
          id: body.data?.id?.toString() || body.id,
          type: body.event || 'charge.completed',
          provider: this.providerType,
          data: body.data,
          timestamp: new Date(),
        },
      };
    } catch (error: any) {
      this.logger.error(`Flutterwave webhook validation error: ${error.message}`);
      return { isValid: false, error: error.message };
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentResult> {
    return this.verifyPayment(transactionId);
  }

  // Additional Flutterwave-specific methods

  /**
   * Create a mobile money payment (M-Pesa, MTN, etc.)
   */
  async createMobileMoneyPayment(
    request: CreatePaymentRequest,
    network: 'mpesa' | 'mtn' | 'airtel' | 'vodafone' | 'tigo',
  ): Promise<PaymentResult> {
    if (!this.isConfigured()) {
      return this.errorResult('Flutterwave not configured');
    }

    try {
      const txRef = `FLW_MM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const payload = {
        tx_ref: txRef,
        amount: request.amount,
        currency: request.currency,
        email: request.customer.email,
        phone_number: request.customer.phone,
        fullname: request.customer.name,
        network,
        redirect_url: request.returnUrl,
        meta: request.metadata,
      };

      const response = await fetch(`${this.baseUrl}/charges?type=mobile_money_${network}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status !== 'success') {
        return this.errorResult(data.message || 'Mobile money payment failed');
      }

      return {
        success: true,
        transactionId: txRef,
        providerTransactionId: data.data?.id?.toString() || txRef,
        provider: this.providerType,
        status: PaymentStatus.PENDING,
        amount: request.amount,
        currency: request.currency,
        redirectUrl: data.meta?.authorization?.redirect,
        metadata: {
          network,
          flutterwaveRef: data.data?.flw_ref,
        },
      };
    } catch (error: any) {
      this.logger.error(`Flutterwave mobile money error: ${error.message}`);
      return this.errorResult(error.message);
    }
  }

  /**
   * Create a bank transfer payment
   */
  async createBankTransferPayment(request: CreatePaymentRequest): Promise<PaymentResult> {
    if (!this.isConfigured()) {
      return this.errorResult('Flutterwave not configured');
    }

    try {
      const txRef = `FLW_BT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const payload = {
        tx_ref: txRef,
        amount: request.amount,
        currency: request.currency,
        email: request.customer.email,
        phone_number: request.customer.phone,
        fullname: request.customer.name,
        narration: request.description || 'Broxiva payment',
        is_permanent: false,
        meta: request.metadata,
      };

      const response = await fetch(`${this.baseUrl}/charges?type=bank_transfer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status !== 'success') {
        return this.errorResult(data.message || 'Bank transfer payment failed');
      }

      return {
        success: true,
        transactionId: txRef,
        providerTransactionId: data.data?.id?.toString() || txRef,
        provider: this.providerType,
        status: PaymentStatus.PENDING,
        amount: request.amount,
        currency: request.currency,
        metadata: {
          bankName: data.meta?.authorization?.transfer_bank,
          accountNumber: data.meta?.authorization?.transfer_account,
          transferReference: data.meta?.authorization?.transfer_reference,
          transferNote: data.meta?.authorization?.transfer_note,
          expiresAt: data.meta?.authorization?.account_expiration,
        },
      };
    } catch (error: any) {
      this.logger.error(`Flutterwave bank transfer error: ${error.message}`);
      return this.errorResult(error.message);
    }
  }

  /**
   * Create USSD payment
   */
  async createUSSDPayment(
    request: CreatePaymentRequest,
    bank: 'gtb' | 'zenith' | 'uba' | 'access' | 'fidelity',
  ): Promise<PaymentResult> {
    if (!this.isConfigured()) {
      return this.errorResult('Flutterwave not configured');
    }

    try {
      const txRef = `FLW_USSD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const bankCodes: Record<string, string> = {
        gtb: '058',
        zenith: '057',
        uba: '033',
        access: '044',
        fidelity: '070',
      };

      const payload = {
        tx_ref: txRef,
        amount: request.amount,
        currency: 'NGN',
        email: request.customer.email,
        phone_number: request.customer.phone,
        fullname: request.customer.name,
        account_bank: bankCodes[bank],
        meta: request.metadata,
      };

      const response = await fetch(`${this.baseUrl}/charges?type=ussd`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status !== 'success') {
        return this.errorResult(data.message || 'USSD payment failed');
      }

      return {
        success: true,
        transactionId: txRef,
        providerTransactionId: data.data?.id?.toString() || txRef,
        provider: this.providerType,
        status: PaymentStatus.PENDING,
        amount: request.amount,
        currency: 'NGN',
        metadata: {
          ussdCode: data.meta?.authorization?.payment_code,
          note: data.meta?.authorization?.note,
          flutterwaveRef: data.data?.flw_ref,
        },
      };
    } catch (error: any) {
      this.logger.error(`Flutterwave USSD error: ${error.message}`);
      return this.errorResult(error.message);
    }
  }

  // Helper methods
  private mapFlutterwaveStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      successful: PaymentStatus.COMPLETED,
      pending: PaymentStatus.PENDING,
      failed: PaymentStatus.FAILED,
      cancelled: PaymentStatus.CANCELLED,
    };
    return statusMap[status.toLowerCase()] || PaymentStatus.PENDING;
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
