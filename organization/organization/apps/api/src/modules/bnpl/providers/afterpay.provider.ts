/**
 * Afterpay BNPL Provider Integration
 *
 * Implements Buy Now Pay Later functionality using Afterpay's API.
 * Supports 4 interest-free installments.
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BnplProvider } from '@prisma/client';
import { lastValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import {
  BaseBnplProvider,
  BnplSessionRequest,
  BnplSession,
  BnplEligibilityRequest,
  BnplEligibilityResponse,
  BnplAuthorizationResult,
  BnplCaptureResult,
  BnplRefundRequest,
  BnplRefundResult,
  BnplWebhookEvent,
  BnplProviderConfig,
} from './base-bnpl.provider';

@Injectable()
export class AfterpayProvider extends BaseBnplProvider {
  private readonly logger = new Logger(AfterpayProvider.name);

  constructor(
    private readonly httpService: HttpService,
    config: BnplProviderConfig,
  ) {
    super(config, BnplProvider.AFTERPAY);
  }

  // =============================================================================
  // ELIGIBILITY CHECK
  // =============================================================================

  async checkEligibility(
    request: BnplEligibilityRequest,
  ): Promise<BnplEligibilityResponse> {
    // Afterpay eligibility limits
    const MIN_AMOUNT = 1;
    const MAX_AMOUNT = 2000;
    const AVAILABLE_TERMS = [4]; // Afterpay offers 4 installments

    const eligible = request.amount >= MIN_AMOUNT && request.amount <= MAX_AMOUNT;

    return {
      eligible,
      minAmount: MIN_AMOUNT,
      maxAmount: MAX_AMOUNT,
      availableTerms: AVAILABLE_TERMS,
      currency: request.currency,
      message: !eligible
        ? request.amount < MIN_AMOUNT
          ? `Minimum order amount is $${MIN_AMOUNT}`
          : `Maximum order amount is $${MAX_AMOUNT}`
        : undefined,
    };
  }

  // =============================================================================
  // SESSION CREATION
  // =============================================================================

  async createSession(request: BnplSessionRequest): Promise<BnplSession> {
    try {
      const items = request.items.map((item) => ({
        name: item.name,
        sku: item.sku || item.name.replace(/\s+/g, '-').toLowerCase(),
        quantity: item.quantity,
        price: {
          amount: (item.unitPrice / 100).toFixed(2), // Afterpay uses decimal format
          currency: request.currency.toUpperCase(),
        },
        imageUrl: item.imageUrl,
        productUrl: item.productUrl,
      }));

      const payload = {
        amount: {
          amount: request.orderTotal.toFixed(2),
          currency: request.currency.toUpperCase(),
        },
        consumer: {
          phoneNumber: request.customer.phone || '',
          givenNames: request.customer.firstName || '',
          surname: request.customer.lastName || '',
          email: request.customer.email,
        },
        billing: {
          name: `${request.customer.firstName || ''} ${request.customer.lastName || ''}`,
          line1: request.billingAddress.line1,
          line2: request.billingAddress.line2 || '',
          area1: request.billingAddress.city,
          region: request.billingAddress.state,
          postcode: request.billingAddress.postalCode,
          countryCode: request.billingAddress.country,
          phoneNumber: request.customer.phone || '',
        },
        shipping: {
          name: `${request.customer.firstName || ''} ${request.customer.lastName || ''}`,
          line1: request.shippingAddress.line1,
          line2: request.shippingAddress.line2 || '',
          area1: request.shippingAddress.city,
          region: request.shippingAddress.state,
          postcode: request.shippingAddress.postalCode,
          countryCode: request.shippingAddress.country,
          phoneNumber: request.customer.phone || '',
        },
        items,
        merchant: {
          redirectConfirmUrl: request.returnUrl,
          redirectCancelUrl: request.cancelUrl,
        },
        merchantReference: request.orderId,
        taxAmount: {
          amount: '0.00',
          currency: request.currency.toUpperCase(),
        },
        shippingAmount: {
          amount: '0.00',
          currency: request.currency.toUpperCase(),
        },
      };

      const auth = Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64');

      const response = await lastValueFrom(
        this.httpService.post(`${this.config.baseUrl}/v2/checkouts`, payload, {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }),
      );

      this.logger.log(`Afterpay session created: ${response.data.token}`);

      return {
        provider: BnplProvider.AFTERPAY,
        sessionId: response.data.token,
        redirectUrl: response.data.redirectCheckoutUrl,
        expiresAt: new Date(response.data.expires),
        clientToken: response.data.token,
      };
    } catch (error: any) {
      this.logger.error('Afterpay session creation failed', error.response?.data || error.message);
      throw new HttpException(
        `Afterpay session creation failed: ${error.response?.data?.message || error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  // =============================================================================
  // PAYMENT AUTHORIZATION
  // =============================================================================

  async authorizePayment(
    sessionId: string,
    checkoutToken?: string,
  ): Promise<BnplAuthorizationResult> {
    const auth = Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64');

    try {
      const token = checkoutToken || sessionId;

      const response = await lastValueFrom(
        this.httpService.post(
          `${this.config.baseUrl}/v2/payments/capture`,
          { token },
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Afterpay payment authorized: ${response.data.id}`);

      return {
        authorized: true,
        authorizationToken: response.data.id,
        providerOrderId: response.data.id,
        orderId: response.data.merchantReference,
        fraudResult: {
          status: response.data.status === 'APPROVED' ? 'ACCEPTED' : 'PENDING',
        },
      };
    } catch (error: any) {
      this.logger.error('Afterpay authorization failed', error.response?.data || error.message);
      return {
        authorized: false,
        errorMessage: error.response?.data?.message || error.message,
      };
    }
  }

  // =============================================================================
  // PAYMENT CAPTURE
  // =============================================================================

  async capturePayment(
    authorizationToken: string,
    amount?: number,
  ): Promise<BnplCaptureResult> {
    // Afterpay captures immediately on authorization
    // This method is for compatibility with the interface
    this.logger.log(`Afterpay payment already captured on authorization: ${authorizationToken}`);

    return {
      captured: true,
      captureId: authorizationToken,
      amount: amount,
    };
  }

  // =============================================================================
  // REFUNDS
  // =============================================================================

  async processRefund(request: BnplRefundRequest): Promise<BnplRefundResult> {
    const auth = Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64');

    try {
      const payload = {
        amount: {
          amount: request.amount.toFixed(2),
          currency: request.currency || 'USD',
        },
        merchantReference: request.orderId || request.providerOrderId,
        requestId: `refund_${Date.now()}`, // Unique idempotency key
      };

      const response = await lastValueFrom(
        this.httpService.post(
          `${this.config.baseUrl}/v2/payments/${request.providerOrderId}/refund`,
          payload,
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Afterpay refund processed: ${response.data.refundId}`);

      return {
        refunded: true,
        refundId: response.data.refundId,
        amount: request.amount,
      };
    } catch (error: any) {
      this.logger.error('Afterpay refund failed', error.response?.data || error.message);
      return {
        refunded: false,
        errorMessage: error.response?.data?.message || error.message,
      };
    }
  }

  // =============================================================================
  // WEBHOOKS
  // =============================================================================

  async handleWebhook(
    payload: any,
    headers: Record<string, string>,
  ): Promise<BnplWebhookEvent> {
    // Verify webhook signature
    const signature = headers['x-afterpay-signature'] || headers['X-Afterpay-Signature'];
    if (signature && !this.verifyWebhookSignature(payload, signature)) {
      throw new HttpException('Invalid webhook signature', HttpStatus.UNAUTHORIZED);
    }

    // Parse Afterpay webhook event
    const eventType = payload.eventType || 'unknown';
    const orderId = payload.id || payload.orderId;

    return {
      eventType,
      provider: BnplProvider.AFTERPAY,
      providerOrderId: orderId,
      orderId: payload.merchantReference,
      status: this.mapAfterpayStatus(payload.status || eventType),
      amount: payload.amount?.amount ? parseFloat(payload.amount.amount) : undefined,
      currency: payload.amount?.currency,
      timestamp: new Date(payload.created || Date.now()),
      rawData: payload,
    };
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    // Afterpay uses HMAC-SHA256 for webhook signatures
    try {
      const hmac = crypto.createHmac('sha256', this.config.apiSecret || '');
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const expectedSignature = hmac.update(payloadString).digest('hex');

      return signature.toLowerCase() === expectedSignature.toLowerCase();
    } catch (error) {
      this.logger.error('Failed to verify Afterpay webhook signature', error);
      return false;
    }
  }

  // =============================================================================
  // ORDER MANAGEMENT
  // =============================================================================

  async cancelOrder(orderId: string): Promise<{ success: boolean; message?: string }> {
    const auth = Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64');

    try {
      await lastValueFrom(
        this.httpService.post(
          `${this.config.baseUrl}/v2/payments/${orderId}/void`,
          {},
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Afterpay order cancelled: ${orderId}`);

      return {
        success: true,
        message: 'Order cancelled successfully',
      };
    } catch (error: any) {
      this.logger.error('Afterpay cancellation failed', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  async getOrderStatus(orderId: string): Promise<{
    status: string;
    amount?: number;
    currency?: string;
    paidAmount?: number;
    refundedAmount?: number;
  }> {
    const auth = Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64');

    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.config.baseUrl}/v2/payments/${orderId}`, {
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: 'application/json',
          },
        }),
      );

      const payment = response.data;

      return {
        status: this.mapAfterpayStatus(payment.status),
        amount: payment.amount?.amount ? parseFloat(payment.amount.amount) : undefined,
        currency: payment.amount?.currency,
        paidAmount: payment.amount?.amount ? parseFloat(payment.amount.amount) : undefined,
        refundedAmount: payment.refundedAmount?.amount ? parseFloat(payment.refundedAmount.amount) : 0,
      };
    } catch (error: any) {
      this.logger.error('Failed to get Afterpay order status', error.response?.data || error.message);
      throw new HttpException(
        `Failed to get order status: ${error.response?.data?.message || error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private mapAfterpayStatus(status: string): string {
    // Map Afterpay statuses to standardized statuses
    const statusMap: Record<string, string> = {
      APPROVED: 'AUTHORIZED',
      CAPTURED: 'CAPTURED',
      DECLINED: 'DECLINED',
      VOIDED: 'CANCELLED',
      REFUNDED: 'REFUNDED',
      PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
      PENDING: 'PENDING',
      AUTH_APPROVED: 'AUTHORIZED',
      COMPLETE: 'COMPLETED',
    };

    return statusMap[status.toUpperCase()] || status.toUpperCase();
  }
}
