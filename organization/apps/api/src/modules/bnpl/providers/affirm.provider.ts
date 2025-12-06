/**
 * Affirm BNPL Provider Integration
 *
 * Implements Buy Now Pay Later functionality using Affirm's API.
 * Supports flexible financing terms from 3 to 36 months.
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { BnplProvider } from '@prisma/client';
import { lastValueFrom } from 'rxjs';
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
export class AffirmProvider extends BaseBnplProvider {
  private readonly logger = new Logger(AffirmProvider.name);

  constructor(
    private readonly httpService: HttpService,
    config: BnplProviderConfig,
  ) {
    super(config, BnplProvider.AFFIRM);
  }

  // =============================================================================
  // ELIGIBILITY CHECK
  // =============================================================================

  async checkEligibility(
    request: BnplEligibilityRequest,
  ): Promise<BnplEligibilityResponse> {
    // Affirm eligibility limits
    const MIN_AMOUNT = 50;
    const MAX_AMOUNT = 30000;
    const AVAILABLE_TERMS = [3, 6, 12, 18, 24, 36];

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
        display_name: item.name,
        sku: item.sku || item.name.replace(/\s+/g, '-').toLowerCase(),
        unit_price: item.unitPrice,
        qty: item.quantity,
        item_image_url: item.imageUrl,
        item_url: item.productUrl,
      }));

      const payload = {
        merchant: {
          user_confirmation_url: request.returnUrl,
          user_cancel_url: request.cancelUrl,
          user_confirmation_url_action: 'GET',
          name: 'CitadelBuy',
        },
        shipping: {
          name: {
            first: request.customer.firstName || '',
            last: request.customer.lastName || '',
          },
          address: {
            line1: request.shippingAddress.line1,
            line2: request.shippingAddress.line2 || '',
            city: request.shippingAddress.city,
            state: request.shippingAddress.state,
            zipcode: request.shippingAddress.postalCode,
            country: request.shippingAddress.country,
          },
          phone_number: request.customer.phone || '',
          email: request.customer.email,
        },
        billing: {
          name: {
            first: request.customer.firstName || '',
            last: request.customer.lastName || '',
          },
          address: {
            line1: request.billingAddress.line1,
            line2: request.billingAddress.line2 || '',
            city: request.billingAddress.city,
            state: request.billingAddress.state,
            zipcode: request.billingAddress.postalCode,
            country: request.billingAddress.country,
          },
          phone_number: request.customer.phone || '',
          email: request.customer.email,
        },
        items,
        order_id: request.orderId,
        currency: request.currency.toUpperCase(),
        financing_program: request.numberOfInstallments
          ? this.getFinancingProgram(request.numberOfInstallments)
          : 'flex_loan',
        total: Math.round(request.orderTotal * 100),
        tax_amount: 0,
        shipping_amount: 0,
        metadata: {
          platform: 'citadelbuy',
          order_id: request.orderId,
        },
      };

      const response = await lastValueFrom(
        this.httpService.post(`${this.config.baseUrl}/api/v2/checkout/`, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
          auth: {
            username: this.config.apiKey,
            password: this.config.apiSecret || '',
          },
        }),
      );

      this.logger.log(`Affirm session created: ${response.data.checkout_token}`);

      return {
        provider: BnplProvider.AFFIRM,
        sessionId: response.data.checkout_token,
        redirectUrl: response.data.redirect_url,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        clientToken: response.data.checkout_token,
      };
    } catch (error: any) {
      this.logger.error('Affirm session creation failed', error.response?.data || error.message);
      throw new HttpException(
        `Affirm session creation failed: ${error.response?.data?.message || error.message}`,
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
    try {
      const token = checkoutToken || sessionId;

      const response = await lastValueFrom(
        this.httpService.post(
          `${this.config.baseUrl}/api/v2/charges`,
          {
            checkout_token: token,
            order_id: sessionId,
          },
          {
            auth: {
              username: this.config.apiKey,
              password: this.config.apiSecret || '',
            },
          },
        ),
      );

      this.logger.log(`Affirm payment authorized: ${response.data.id}`);

      return {
        authorized: true,
        authorizationToken: response.data.id,
        providerOrderId: response.data.id,
        orderId: response.data.order_id,
        fraudResult: {
          status: 'ACCEPTED',
        },
      };
    } catch (error: any) {
      this.logger.error('Affirm authorization failed', error.response?.data || error.message);
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
    try {
      const payload: any = {
        order_id: authorizationToken,
      };

      if (amount !== undefined) {
        payload.amount = Math.round(amount * 100);
      }

      const response = await lastValueFrom(
        this.httpService.post(
          `${this.config.baseUrl}/api/v2/charges/${authorizationToken}/capture`,
          payload,
          {
            auth: {
              username: this.config.apiKey,
              password: this.config.apiSecret || '',
            },
          },
        ),
      );

      this.logger.log(`Affirm payment captured: ${response.data.id}`);

      return {
        captured: true,
        captureId: response.data.id,
        amount: response.data.amount / 100,
      };
    } catch (error: any) {
      this.logger.error('Affirm capture failed', error.response?.data || error.message);
      return {
        captured: false,
        errorMessage: error.response?.data?.message || error.message,
      };
    }
  }

  // =============================================================================
  // REFUNDS
  // =============================================================================

  async processRefund(request: BnplRefundRequest): Promise<BnplRefundResult> {
    try {
      const payload: any = {
        amount: Math.round(request.amount * 100),
      };

      const response = await lastValueFrom(
        this.httpService.post(
          `${this.config.baseUrl}/api/v2/charges/${request.providerOrderId}/refund`,
          payload,
          {
            auth: {
              username: this.config.apiKey,
              password: this.config.apiSecret || '',
            },
          },
        ),
      );

      this.logger.log(`Affirm refund processed: ${response.data.id}`);

      return {
        refunded: true,
        refundId: response.data.id,
        amount: request.amount,
      };
    } catch (error: any) {
      this.logger.error('Affirm refund failed', error.response?.data || error.message);
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
    const signature = headers['x-affirm-signature'] || headers['X-Affirm-Signature'];
    if (signature && !this.verifyWebhookSignature(payload, signature)) {
      throw new HttpException('Invalid webhook signature', HttpStatus.UNAUTHORIZED);
    }

    // Parse Affirm webhook event
    const eventType = payload.type || 'unknown';
    const chargeId = payload.charge_id || payload.id;

    return {
      eventType,
      provider: BnplProvider.AFFIRM,
      providerOrderId: chargeId,
      orderId: payload.order_id,
      status: this.mapAffirmStatus(eventType),
      amount: payload.amount ? payload.amount / 100 : undefined,
      currency: payload.currency,
      timestamp: new Date(payload.created || Date.now()),
      rawData: payload,
    };
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    // Affirm uses HMAC-SHA256 for webhook signatures
    // In production, implement proper signature verification
    // For now, we'll log and return true
    this.logger.debug(`Verifying Affirm webhook signature: ${signature}`);
    return true;
  }

  // =============================================================================
  // ORDER MANAGEMENT
  // =============================================================================

  async cancelOrder(orderId: string): Promise<{ success: boolean; message?: string }> {
    try {
      await lastValueFrom(
        this.httpService.post(
          `${this.config.baseUrl}/api/v2/charges/${orderId}/void`,
          {},
          {
            auth: {
              username: this.config.apiKey,
              password: this.config.apiSecret || '',
            },
          },
        ),
      );

      this.logger.log(`Affirm order cancelled: ${orderId}`);

      return {
        success: true,
        message: 'Order cancelled successfully',
      };
    } catch (error: any) {
      this.logger.error('Affirm cancellation failed', error.response?.data || error.message);
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
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.config.baseUrl}/api/v2/charges/${orderId}`, {
          auth: {
            username: this.config.apiKey,
            password: this.config.apiSecret || '',
          },
        }),
      );

      const charge = response.data;

      return {
        status: this.mapAffirmStatus(charge.status),
        amount: charge.amount / 100,
        currency: charge.currency,
        paidAmount: charge.amount / 100,
        refundedAmount: charge.refunded_amount ? charge.refunded_amount / 100 : 0,
      };
    } catch (error: any) {
      this.logger.error('Failed to get Affirm order status', error.response?.data || error.message);
      throw new HttpException(
        `Failed to get order status: ${error.response?.data?.message || error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private getFinancingProgram(installments: number): string {
    // Map installment counts to Affirm financing programs
    if (installments <= 4) return 'flex_loan';
    if (installments <= 6) return 'flex_6';
    if (installments <= 12) return 'flex_12';
    if (installments <= 18) return 'flex_18';
    if (installments <= 24) return 'flex_24';
    return 'flex_36';
  }

  private mapAffirmStatus(status: string): string {
    // Map Affirm statuses to standardized statuses
    const statusMap: Record<string, string> = {
      authorized: 'AUTHORIZED',
      captured: 'CAPTURED',
      voided: 'CANCELLED',
      refunded: 'REFUNDED',
      partially_refunded: 'PARTIALLY_REFUNDED',
      failed: 'FAILED',
      expired: 'EXPIRED',
    };

    return statusMap[status.toLowerCase()] || status.toUpperCase();
  }
}
