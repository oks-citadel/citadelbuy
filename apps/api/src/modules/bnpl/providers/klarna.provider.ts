/**
 * Klarna BNPL Provider Integration
 *
 * Implements Buy Now Pay Later functionality using Klarna's API.
 * Supports pay later and pay over time (4 installments).
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
export class KlarnaProvider extends BaseBnplProvider {
  private readonly logger = new Logger(KlarnaProvider.name);

  constructor(
    private readonly httpService: HttpService,
    config: BnplProviderConfig,
  ) {
    super(config, BnplProvider.KLARNA);
  }

  // =============================================================================
  // ELIGIBILITY CHECK
  // =============================================================================

  async checkEligibility(
    request: BnplEligibilityRequest,
  ): Promise<BnplEligibilityResponse> {
    // Klarna eligibility limits
    const MIN_AMOUNT = 35;
    const MAX_AMOUNT = 10000;
    const AVAILABLE_TERMS = [4]; // Klarna typically offers 4 installments

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
      const orderLines = request.items.map((item) => ({
        type: 'physical',
        reference: item.sku || item.name,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: 0,
        total_amount: item.totalAmount,
        total_tax_amount: 0,
        image_url: item.imageUrl,
        product_url: item.productUrl,
      }));

      const payload = {
        purchase_country: request.shippingAddress.country || 'US',
        purchase_currency: request.currency.toUpperCase(),
        locale: 'en-US',
        order_amount: Math.round(request.orderTotal * 100), // Convert to cents
        order_tax_amount: 0,
        order_lines: orderLines,
        billing_address: {
          given_name: request.customer.firstName || '',
          family_name: request.customer.lastName || '',
          email: request.customer.email,
          phone: request.customer.phone || '',
          street_address: request.billingAddress.line1,
          street_address2: request.billingAddress.line2 || '',
          postal_code: request.billingAddress.postalCode,
          city: request.billingAddress.city,
          region: request.billingAddress.state,
          country: request.billingAddress.country,
        },
        shipping_address: {
          given_name: request.customer.firstName || '',
          family_name: request.customer.lastName || '',
          email: request.customer.email,
          phone: request.customer.phone || '',
          street_address: request.shippingAddress.line1,
          street_address2: request.shippingAddress.line2 || '',
          postal_code: request.shippingAddress.postalCode,
          city: request.shippingAddress.city,
          region: request.shippingAddress.state,
          country: request.shippingAddress.country,
        },
        customer: {
          type: 'person',
        },
        merchant_urls: {
          terms: 'https://broxiva.com/terms',
          checkout: request.returnUrl,
          confirmation: `${request.returnUrl}?status=confirmed`,
          push: 'https://broxiva.com/webhooks/bnpl/klarna',
        },
        merchant_reference1: request.orderId,
        merchant_reference2: `order_${request.orderId}`,
        options: {
          allow_separate_shipping_address: true,
        },
      };

      const auth = Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64');

      const response = await lastValueFrom(
        this.httpService.post(`${this.config.baseUrl}/checkout/v3/orders`, payload, {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`Klarna session created: ${response.data.order_id}`);

      return {
        provider: BnplProvider.KLARNA,
        sessionId: response.data.order_id,
        sessionToken: response.data.session_id,
        redirectUrl: response.data.redirect_url || '',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        clientToken: response.data.html_snippet,
        paymentMethods: ['pay_later', 'pay_over_time'],
      };
    } catch (error: any) {
      this.logger.error('Klarna session creation failed', error.response?.data || error.message);
      throw new HttpException(
        `Klarna session creation failed: ${error.response?.data?.error_messages?.[0] || error.message}`,
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
      // First, retrieve the order to get its current state
      const orderResponse = await lastValueFrom(
        this.httpService.get(`${this.config.baseUrl}/checkout/v3/orders/${sessionId}`, {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      // Create the order (authorize)
      const createResponse = await lastValueFrom(
        this.httpService.post(
          `${this.config.baseUrl}/checkout/v3/orders/${sessionId}`,
          {
            merchant_reference1: orderResponse.data.merchant_reference1,
            merchant_reference2: orderResponse.data.merchant_reference2,
          },
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      // Acknowledge the order
      await lastValueFrom(
        this.httpService.post(
          `${this.config.baseUrl}/ordermanagement/v1/orders/${createResponse.data.order_id}/acknowledge`,
          {},
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Klarna payment authorized: ${createResponse.data.order_id}`);

      return {
        authorized: true,
        authorizationToken: createResponse.data.order_id,
        providerOrderId: createResponse.data.order_id,
        orderId: orderResponse.data.merchant_reference1,
        fraudResult: {
          status: createResponse.data.fraud_status === 'ACCEPTED' ? 'ACCEPTED' : 'PENDING',
        },
      };
    } catch (error: any) {
      this.logger.error('Klarna authorization failed', error.response?.data || error.message);
      return {
        authorized: false,
        errorMessage: error.response?.data?.error_messages?.[0] || error.message,
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
    const auth = Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64');

    try {
      // Get order details first
      const orderResponse = await lastValueFrom(
        this.httpService.get(`${this.config.baseUrl}/ordermanagement/v1/orders/${authorizationToken}`, {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }),
      );

      const captureAmount = amount ? Math.round(amount * 100) : orderResponse.data.order_amount;

      const payload = {
        captured_amount: captureAmount,
        description: 'Order capture',
        order_lines: orderResponse.data.order_lines,
      };

      const response = await lastValueFrom(
        this.httpService.post(
          `${this.config.baseUrl}/ordermanagement/v1/orders/${authorizationToken}/captures`,
          payload,
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Klarna payment captured: ${response.data.capture_id}`);

      return {
        captured: true,
        captureId: response.data.capture_id,
        amount: captureAmount / 100,
      };
    } catch (error: any) {
      this.logger.error('Klarna capture failed', error.response?.data || error.message);
      return {
        captured: false,
        errorMessage: error.response?.data?.error_messages?.[0] || error.message,
      };
    }
  }

  // =============================================================================
  // REFUNDS
  // =============================================================================

  async processRefund(request: BnplRefundRequest): Promise<BnplRefundResult> {
    const auth = Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64');

    try {
      const payload = {
        refunded_amount: Math.round(request.amount * 100),
        description: request.reason || 'Refund requested',
      };

      const response = await lastValueFrom(
        this.httpService.post(
          `${this.config.baseUrl}/ordermanagement/v1/orders/${request.providerOrderId}/refunds`,
          payload,
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Klarna refund processed: ${response.data.refund_id}`);

      return {
        refunded: true,
        refundId: response.data.refund_id,
        amount: request.amount,
      };
    } catch (error: any) {
      this.logger.error('Klarna refund failed', error.response?.data || error.message);
      return {
        refunded: false,
        errorMessage: error.response?.data?.error_messages?.[0] || error.message,
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
    // Klarna webhook events
    const eventType = payload.event_type || 'unknown';
    const orderId = payload.order_id;

    return {
      eventType,
      provider: BnplProvider.KLARNA,
      providerOrderId: orderId,
      orderId: payload.merchant_reference1,
      status: this.mapKlarnaStatus(eventType),
      amount: payload.order_amount ? payload.order_amount / 100 : undefined,
      currency: payload.purchase_currency,
      timestamp: new Date(payload.event_timestamp || Date.now()),
      rawData: payload,
    };
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    // Klarna uses HMAC-SHA256 for webhook signatures
    try {
      const hmac = crypto.createHmac('sha256', this.config.apiSecret || '');
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const expectedSignature = hmac.update(payloadString).digest('base64');

      return signature === expectedSignature;
    } catch (error) {
      this.logger.error('Failed to verify Klarna webhook signature', error);
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
          `${this.config.baseUrl}/ordermanagement/v1/orders/${orderId}/cancel`,
          {},
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Klarna order cancelled: ${orderId}`);

      return {
        success: true,
        message: 'Order cancelled successfully',
      };
    } catch (error: any) {
      this.logger.error('Klarna cancellation failed', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.error_messages?.[0] || error.message,
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
        this.httpService.get(`${this.config.baseUrl}/ordermanagement/v1/orders/${orderId}`, {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }),
      );

      const order = response.data;

      return {
        status: this.mapKlarnaStatus(order.status),
        amount: order.order_amount / 100,
        currency: order.purchase_currency,
        paidAmount: order.captured_amount ? order.captured_amount / 100 : 0,
        refundedAmount: order.refunded_amount ? order.refunded_amount / 100 : 0,
      };
    } catch (error: any) {
      this.logger.error('Failed to get Klarna order status', error.response?.data || error.message);
      throw new HttpException(
        `Failed to get order status: ${error.response?.data?.error_messages?.[0] || error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private mapKlarnaStatus(status: string): string {
    // Map Klarna statuses to standardized statuses
    const statusMap: Record<string, string> = {
      AUTHORIZED: 'AUTHORIZED',
      CAPTURED: 'CAPTURED',
      CANCELLED: 'CANCELLED',
      EXPIRED: 'EXPIRED',
      REFUNDED: 'REFUNDED',
      PART_CAPTURED: 'PARTIALLY_CAPTURED',
      FRAUD_RISK_ACCEPTED: 'AUTHORIZED',
      FRAUD_RISK_REJECTED: 'REJECTED',
      FRAUD_RISK_PENDING: 'PENDING',
    };

    return statusMap[status.toUpperCase()] || status.toUpperCase();
  }
}
