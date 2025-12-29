/**
 * BNPL Provider Integration Service
 *
 * Handles integration with various BNPL (Buy Now Pay Later) providers:
 * - Klarna
 * - Affirm
 * - Afterpay
 * - Sezzle
 *
 * Each provider has its own API patterns, authentication, and session handling.
 */

import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { BnplProvider } from '@prisma/client';
import { lastValueFrom } from 'rxjs';

// =============================================================================
// INTERFACES
// =============================================================================

export interface BnplSessionRequest {
  orderId: string;
  orderTotal: number;
  currency: string;
  items: BnplLineItem[];
  customer: BnplCustomer;
  billingAddress: BnplAddress;
  shippingAddress: BnplAddress;
  returnUrl: string;
  cancelUrl: string;
  numberOfInstallments?: number;
}

export interface BnplLineItem {
  name: string;
  quantity: number;
  unitPrice: number; // In cents
  totalAmount: number; // In cents
  productUrl?: string;
  imageUrl?: string;
}

export interface BnplCustomer {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface BnplAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface BnplSession {
  provider: BnplProvider;
  sessionId: string;
  sessionToken?: string;
  redirectUrl: string;
  expiresAt: Date;
  clientToken?: string;
  paymentMethods?: string[];
}

export interface BnplAuthorizationResult {
  authorized: boolean;
  authorizationToken?: string;
  orderId?: string;
  providerOrderId?: string;
  errorMessage?: string;
  fraudResult?: {
    status: 'ACCEPTED' | 'PENDING' | 'REJECTED';
    score?: number;
  };
}

export interface BnplCaptureResult {
  captured: boolean;
  captureId?: string;
  amount?: number;
  errorMessage?: string;
}

export interface BnplRefundResult {
  refunded: boolean;
  refundId?: string;
  amount?: number;
  errorMessage?: string;
}

export interface BnplProviderConfig {
  apiKey: string;
  apiSecret?: string;
  merchantId?: string;
  environment: 'sandbox' | 'production';
  baseUrl: string;
}

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

@Injectable()
export class BnplProviderService {
  private readonly logger = new Logger(BnplProviderService.name);
  private readonly providerConfigs: Map<BnplProvider, BnplProviderConfig>;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    // Initialize provider configurations
    this.providerConfigs = new Map();

    // Klarna configuration
    this.providerConfigs.set(BnplProvider.KLARNA, {
      apiKey: this.configService.get<string>('KLARNA_API_KEY') || '',
      apiSecret: this.configService.get<string>('KLARNA_API_SECRET') || '',
      merchantId: this.configService.get<string>('KLARNA_MERCHANT_ID'),
      environment: this.configService.get<string>('KLARNA_ENV') === 'production' ? 'production' : 'sandbox',
      baseUrl: this.configService.get<string>('KLARNA_ENV') === 'production'
        ? 'https://api.klarna.com'
        : 'https://api.playground.klarna.com',
    });

    // Affirm configuration
    this.providerConfigs.set(BnplProvider.AFFIRM, {
      apiKey: this.configService.get<string>('AFFIRM_PUBLIC_KEY') || '',
      apiSecret: this.configService.get<string>('AFFIRM_PRIVATE_KEY') || '',
      environment: this.configService.get<string>('AFFIRM_ENV') === 'production' ? 'production' : 'sandbox',
      baseUrl: this.configService.get<string>('AFFIRM_ENV') === 'production'
        ? 'https://api.affirm.com'
        : 'https://sandbox.affirm.com',
    });

    // Afterpay configuration
    this.providerConfigs.set(BnplProvider.AFTERPAY, {
      apiKey: this.configService.get<string>('AFTERPAY_MERCHANT_ID') || '',
      apiSecret: this.configService.get<string>('AFTERPAY_SECRET_KEY') || '',
      environment: this.configService.get<string>('AFTERPAY_ENV') === 'production' ? 'production' : 'sandbox',
      baseUrl: this.configService.get<string>('AFTERPAY_ENV') === 'production'
        ? 'https://global-api.afterpay.com'
        : 'https://global-api-sandbox.afterpay.com',
    });

    // Sezzle configuration
    this.providerConfigs.set(BnplProvider.SEZZLE, {
      apiKey: this.configService.get<string>('SEZZLE_PUBLIC_KEY') || '',
      apiSecret: this.configService.get<string>('SEZZLE_PRIVATE_KEY') || '',
      environment: this.configService.get<string>('SEZZLE_ENV') === 'production' ? 'production' : 'sandbox',
      baseUrl: this.configService.get<string>('SEZZLE_ENV') === 'production'
        ? 'https://gateway.sezzle.com'
        : 'https://sandbox.gateway.sezzle.com',
    });
  }

  // =============================================================================
  // PROVIDER AVAILABILITY
  // =============================================================================

  /**
   * Get list of available BNPL providers
   */
  getAvailableProviders(): BnplProvider[] {
    const available: BnplProvider[] = [];

    for (const [provider, config] of this.providerConfigs.entries()) {
      if (config.apiKey) {
        available.push(provider);
      }
    }

    return available;
  }

  /**
   * Check if a specific provider is configured
   */
  isProviderConfigured(provider: BnplProvider): boolean {
    const config = this.providerConfigs.get(provider);
    return !!(config && config.apiKey);
  }

  /**
   * Get provider-specific configuration
   */
  private getProviderConfig(provider: BnplProvider): BnplProviderConfig {
    const config = this.providerConfigs.get(provider);

    if (!config || !config.apiKey) {
      throw new BadRequestException(`BNPL provider ${provider} is not configured`);
    }

    return config;
  }

  // =============================================================================
  // SESSION MANAGEMENT
  // =============================================================================

  /**
   * Create a checkout session with the BNPL provider
   */
  async createSession(provider: BnplProvider, request: BnplSessionRequest): Promise<BnplSession> {
    switch (provider) {
      case BnplProvider.KLARNA:
        return this.createKlarnaSession(request);
      case BnplProvider.AFFIRM:
        return this.createAffirmSession(request);
      case BnplProvider.AFTERPAY:
        return this.createAfterpaySession(request);
      case BnplProvider.SEZZLE:
        return this.createSezzleSession(request);
      default:
        throw new BadRequestException(`Unknown BNPL provider: ${provider}`);
    }
  }

  // =============================================================================
  // KLARNA INTEGRATION
  // =============================================================================

  private async createKlarnaSession(request: BnplSessionRequest): Promise<BnplSession> {
    const config = this.getProviderConfig(BnplProvider.KLARNA);

    try {
      const orderLines = request.items.map((item) => ({
        type: 'physical',
        reference: item.name,
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
        purchase_country: request.shippingAddress.country,
        purchase_currency: request.currency.toUpperCase(),
        locale: 'en-US',
        order_amount: Math.round(request.orderTotal * 100), // Convert to cents
        order_tax_amount: 0,
        order_lines: orderLines,
        billing_address: {
          given_name: request.customer.firstName,
          family_name: request.customer.lastName,
          email: request.customer.email,
          phone: request.customer.phone,
          street_address: request.billingAddress.line1,
          street_address2: request.billingAddress.line2,
          postal_code: request.billingAddress.postalCode,
          city: request.billingAddress.city,
          region: request.billingAddress.state,
          country: request.billingAddress.country,
        },
        shipping_address: {
          given_name: request.customer.firstName,
          family_name: request.customer.lastName,
          email: request.customer.email,
          phone: request.customer.phone,
          street_address: request.shippingAddress.line1,
          street_address2: request.shippingAddress.line2,
          postal_code: request.shippingAddress.postalCode,
          city: request.shippingAddress.city,
          region: request.shippingAddress.state,
          country: request.shippingAddress.country,
        },
        merchant_urls: {
          terms: `${this.configService.get('APP_URL')}/terms`,
          checkout: request.returnUrl,
          confirmation: `${request.returnUrl}?status=confirmed`,
          push: `${this.configService.get('API_URL')}/webhooks/bnpl/klarna`,
        },
        merchant_reference1: request.orderId,
      };

      const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');

      const response = await lastValueFrom(
        this.httpService.post(`${config.baseUrl}/checkout/v3/orders`, payload, {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      return {
        provider: BnplProvider.KLARNA,
        sessionId: response.data.order_id,
        sessionToken: response.data.html_snippet ? undefined : response.data.session_id,
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
  // AFFIRM INTEGRATION
  // =============================================================================

  private async createAffirmSession(request: BnplSessionRequest): Promise<BnplSession> {
    const config = this.getProviderConfig(BnplProvider.AFFIRM);

    try {
      const items = request.items.map((item) => ({
        display_name: item.name,
        sku: item.name.replace(/\s+/g, '-').toLowerCase(),
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
          name: this.configService.get('APP_NAME') || 'Broxiva',
        },
        shipping: {
          name: {
            first: request.customer.firstName,
            last: request.customer.lastName,
          },
          address: {
            line1: request.shippingAddress.line1,
            line2: request.shippingAddress.line2,
            city: request.shippingAddress.city,
            state: request.shippingAddress.state,
            zipcode: request.shippingAddress.postalCode,
            country: request.shippingAddress.country,
          },
          phone_number: request.customer.phone,
          email: request.customer.email,
        },
        billing: {
          name: {
            first: request.customer.firstName,
            last: request.customer.lastName,
          },
          address: {
            line1: request.billingAddress.line1,
            line2: request.billingAddress.line2,
            city: request.billingAddress.city,
            state: request.billingAddress.state,
            zipcode: request.billingAddress.postalCode,
            country: request.billingAddress.country,
          },
          phone_number: request.customer.phone,
          email: request.customer.email,
        },
        items,
        order_id: request.orderId,
        currency: request.currency.toUpperCase(),
        financing_program: 'flex_loan', // Standard financing
        total: Math.round(request.orderTotal * 100),
        tax_amount: 0,
        shipping_amount: 0,
      };

      const response = await lastValueFrom(
        this.httpService.post(`${config.baseUrl}/api/v2/checkout/`, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
          auth: {
            username: config.apiKey,
            password: config.apiSecret || '',
          },
        }),
      );

      return {
        provider: BnplProvider.AFFIRM,
        sessionId: response.data.checkout_token,
        redirectUrl: response.data.redirect_url,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
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
  // AFTERPAY INTEGRATION
  // =============================================================================

  private async createAfterpaySession(request: BnplSessionRequest): Promise<BnplSession> {
    const config = this.getProviderConfig(BnplProvider.AFTERPAY);

    try {
      const items = request.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: {
          amount: (item.unitPrice / 100).toFixed(2), // Afterpay uses decimal format
          currency: request.currency.toUpperCase(),
        },
      }));

      const payload = {
        amount: {
          amount: request.orderTotal.toFixed(2),
          currency: request.currency.toUpperCase(),
        },
        consumer: {
          phoneNumber: request.customer.phone,
          givenNames: request.customer.firstName,
          surname: request.customer.lastName,
          email: request.customer.email,
        },
        billing: {
          name: `${request.customer.firstName} ${request.customer.lastName}`,
          line1: request.billingAddress.line1,
          line2: request.billingAddress.line2,
          suburb: request.billingAddress.city,
          state: request.billingAddress.state,
          postcode: request.billingAddress.postalCode,
          countryCode: request.billingAddress.country,
        },
        shipping: {
          name: `${request.customer.firstName} ${request.customer.lastName}`,
          line1: request.shippingAddress.line1,
          line2: request.shippingAddress.line2,
          suburb: request.shippingAddress.city,
          state: request.shippingAddress.state,
          postcode: request.shippingAddress.postalCode,
          countryCode: request.shippingAddress.country,
        },
        items,
        merchant: {
          redirectConfirmUrl: request.returnUrl,
          redirectCancelUrl: request.cancelUrl,
        },
        merchantReference: request.orderId,
      };

      const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');

      const response = await lastValueFrom(
        this.httpService.post(`${config.baseUrl}/v2/checkouts`, payload, {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      return {
        provider: BnplProvider.AFTERPAY,
        sessionId: response.data.token,
        redirectUrl: response.data.redirectCheckoutUrl,
        expiresAt: new Date(response.data.expires),
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
  // SEZZLE INTEGRATION
  // =============================================================================

  private async createSezzleSession(request: BnplSessionRequest): Promise<BnplSession> {
    const config = this.getProviderConfig(BnplProvider.SEZZLE);

    try {
      // First, authenticate to get a bearer token
      const authResponse = await lastValueFrom(
        this.httpService.post(`${config.baseUrl}/v2/authentication`, {
          public_key: config.apiKey,
          private_key: config.apiSecret,
        }),
      );

      const bearerToken = authResponse.data.token;

      const items = request.items.map((item) => ({
        name: item.name,
        sku: item.name.replace(/\s+/g, '-').toLowerCase(),
        quantity: item.quantity,
        price: {
          amount_in_cents: item.unitPrice,
          currency: request.currency.toUpperCase(),
        },
      }));

      const payload = {
        intent: 'AUTH',
        reference_id: request.orderId,
        order: {
          intent: 'AUTH',
          reference_id: request.orderId,
          description: `Order ${request.orderId}`,
          order_amount: {
            amount_in_cents: Math.round(request.orderTotal * 100),
            currency: request.currency.toUpperCase(),
          },
          items,
        },
        customer: {
          email: request.customer.email,
          first_name: request.customer.firstName,
          last_name: request.customer.lastName,
          phone: request.customer.phone,
          billing_address: {
            street: request.billingAddress.line1,
            street2: request.billingAddress.line2,
            city: request.billingAddress.city,
            state: request.billingAddress.state,
            postal_code: request.billingAddress.postalCode,
            country_code: request.billingAddress.country,
          },
          shipping_address: {
            street: request.shippingAddress.line1,
            street2: request.shippingAddress.line2,
            city: request.shippingAddress.city,
            state: request.shippingAddress.state,
            postal_code: request.shippingAddress.postalCode,
            country_code: request.shippingAddress.country,
          },
        },
        complete_url: request.returnUrl,
        cancel_url: request.cancelUrl,
      };

      const response = await lastValueFrom(
        this.httpService.post(`${config.baseUrl}/v2/session`, payload, {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      return {
        provider: BnplProvider.SEZZLE,
        sessionId: response.data.uuid,
        sessionToken: response.data.order.uuid,
        redirectUrl: response.data.order.checkout_url,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours (Sezzle sessions last longer)
      };
    } catch (error: any) {
      this.logger.error('Sezzle session creation failed', error.response?.data || error.message);
      throw new HttpException(
        `Sezzle session creation failed: ${error.response?.data?.message || error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  // =============================================================================
  // AUTHORIZATION & CAPTURE
  // =============================================================================

  /**
   * Authorize a BNPL payment after customer approval
   */
  async authorizePayment(
    provider: BnplProvider,
    sessionId: string,
    checkoutToken?: string,
  ): Promise<BnplAuthorizationResult> {
    switch (provider) {
      case BnplProvider.KLARNA:
        return this.authorizeKlarnaPayment(sessionId);
      case BnplProvider.AFFIRM:
        return this.authorizeAffirmPayment(checkoutToken || sessionId);
      case BnplProvider.AFTERPAY:
        return this.authorizeAfterpayPayment(sessionId);
      case BnplProvider.SEZZLE:
        return this.authorizeSezzlePayment(sessionId);
      default:
        throw new BadRequestException(`Unknown BNPL provider: ${provider}`);
    }
  }

  private async authorizeKlarnaPayment(orderId: string): Promise<BnplAuthorizationResult> {
    const config = this.getProviderConfig(BnplProvider.KLARNA);
    const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');

    try {
      const response = await lastValueFrom(
        this.httpService.post(
          `${config.baseUrl}/ordermanagement/v1/orders/${orderId}/acknowledge`,
          {},
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return {
        authorized: true,
        authorizationToken: orderId,
        providerOrderId: orderId,
      };
    } catch (error: any) {
      this.logger.error('Klarna authorization failed', error.response?.data || error.message);
      return {
        authorized: false,
        errorMessage: error.response?.data?.error_messages?.[0] || error.message,
      };
    }
  }

  private async authorizeAffirmPayment(checkoutToken: string): Promise<BnplAuthorizationResult> {
    const config = this.getProviderConfig(BnplProvider.AFFIRM);

    try {
      const response = await lastValueFrom(
        this.httpService.post(
          `${config.baseUrl}/api/v1/transactions`,
          { checkout_token: checkoutToken },
          {
            auth: {
              username: config.apiKey,
              password: config.apiSecret || '',
            },
          },
        ),
      );

      return {
        authorized: true,
        authorizationToken: response.data.id,
        providerOrderId: response.data.id,
      };
    } catch (error: any) {
      this.logger.error('Affirm authorization failed', error.response?.data || error.message);
      return {
        authorized: false,
        errorMessage: error.response?.data?.message || error.message,
      };
    }
  }

  private async authorizeAfterpayPayment(token: string): Promise<BnplAuthorizationResult> {
    const config = this.getProviderConfig(BnplProvider.AFTERPAY);
    const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');

    try {
      const response = await lastValueFrom(
        this.httpService.post(
          `${config.baseUrl}/v2/payments/capture`,
          { token },
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return {
        authorized: true,
        authorizationToken: response.data.id,
        providerOrderId: response.data.id,
      };
    } catch (error: any) {
      this.logger.error('Afterpay authorization failed', error.response?.data || error.message);
      return {
        authorized: false,
        errorMessage: error.response?.data?.message || error.message,
      };
    }
  }

  private async authorizeSezzlePayment(sessionId: string): Promise<BnplAuthorizationResult> {
    const config = this.getProviderConfig(BnplProvider.SEZZLE);

    try {
      // Re-authenticate
      const authResponse = await lastValueFrom(
        this.httpService.post(`${config.baseUrl}/v2/authentication`, {
          public_key: config.apiKey,
          private_key: config.apiSecret,
        }),
      );

      const response = await lastValueFrom(
        this.httpService.post(
          `${config.baseUrl}/v2/order/${sessionId}/complete`,
          {},
          {
            headers: {
              Authorization: `Bearer ${authResponse.data.token}`,
            },
          },
        ),
      );

      return {
        authorized: true,
        authorizationToken: response.data.authorization.uuid,
        providerOrderId: sessionId,
      };
    } catch (error: any) {
      this.logger.error('Sezzle authorization failed', error.response?.data || error.message);
      return {
        authorized: false,
        errorMessage: error.response?.data?.message || error.message,
      };
    }
  }

  // =============================================================================
  // REFUNDS
  // =============================================================================

  /**
   * Process a refund through the BNPL provider
   */
  async processRefund(
    provider: BnplProvider,
    providerOrderId: string,
    amount: number,
    reason?: string,
  ): Promise<BnplRefundResult> {
    switch (provider) {
      case BnplProvider.KLARNA:
        return this.refundKlarna(providerOrderId, amount, reason);
      case BnplProvider.AFFIRM:
        return this.refundAffirm(providerOrderId, amount, reason);
      case BnplProvider.AFTERPAY:
        return this.refundAfterpay(providerOrderId, amount, reason);
      case BnplProvider.SEZZLE:
        return this.refundSezzle(providerOrderId, amount, reason);
      default:
        throw new BadRequestException(`Unknown BNPL provider: ${provider}`);
    }
  }

  private async refundKlarna(orderId: string, amount: number, reason?: string): Promise<BnplRefundResult> {
    const config = this.getProviderConfig(BnplProvider.KLARNA);
    const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');

    try {
      const response = await lastValueFrom(
        this.httpService.post(
          `${config.baseUrl}/ordermanagement/v1/orders/${orderId}/refunds`,
          {
            refunded_amount: Math.round(amount * 100),
            description: reason || 'Refund requested',
          },
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return {
        refunded: true,
        refundId: response.data.refund_id,
        amount,
      };
    } catch (error: any) {
      this.logger.error('Klarna refund failed', error.response?.data || error.message);
      return {
        refunded: false,
        errorMessage: error.response?.data?.error_messages?.[0] || error.message,
      };
    }
  }

  private async refundAffirm(transactionId: string, amount: number, reason?: string): Promise<BnplRefundResult> {
    const config = this.getProviderConfig(BnplProvider.AFFIRM);

    try {
      const response = await lastValueFrom(
        this.httpService.post(
          `${config.baseUrl}/api/v1/transactions/${transactionId}/refund`,
          { amount: Math.round(amount * 100) },
          {
            auth: {
              username: config.apiKey,
              password: config.apiSecret || '',
            },
          },
        ),
      );

      return {
        refunded: true,
        refundId: response.data.id,
        amount,
      };
    } catch (error: any) {
      this.logger.error('Affirm refund failed', error.response?.data || error.message);
      return {
        refunded: false,
        errorMessage: error.response?.data?.message || error.message,
      };
    }
  }

  private async refundAfterpay(orderId: string, amount: number, reason?: string): Promise<BnplRefundResult> {
    const config = this.getProviderConfig(BnplProvider.AFTERPAY);
    const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');

    try {
      const response = await lastValueFrom(
        this.httpService.post(
          `${config.baseUrl}/v2/payments/${orderId}/refund`,
          {
            amount: {
              amount: amount.toFixed(2),
              currency: 'USD',
            },
            merchantReference: reason,
          },
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return {
        refunded: true,
        refundId: response.data.refundId,
        amount,
      };
    } catch (error: any) {
      this.logger.error('Afterpay refund failed', error.response?.data || error.message);
      return {
        refunded: false,
        errorMessage: error.response?.data?.message || error.message,
      };
    }
  }

  private async refundSezzle(orderId: string, amount: number, reason?: string): Promise<BnplRefundResult> {
    const config = this.getProviderConfig(BnplProvider.SEZZLE);

    try {
      const authResponse = await lastValueFrom(
        this.httpService.post(`${config.baseUrl}/v2/authentication`, {
          public_key: config.apiKey,
          private_key: config.apiSecret,
        }),
      );

      const response = await lastValueFrom(
        this.httpService.post(
          `${config.baseUrl}/v2/order/${orderId}/refund`,
          {
            amount: {
              amount_in_cents: Math.round(amount * 100),
              currency: 'USD',
            },
          },
          {
            headers: {
              Authorization: `Bearer ${authResponse.data.token}`,
            },
          },
        ),
      );

      return {
        refunded: true,
        refundId: response.data.uuid,
        amount,
      };
    } catch (error: any) {
      this.logger.error('Sezzle refund failed', error.response?.data || error.message);
      return {
        refunded: false,
        errorMessage: error.response?.data?.message || error.message,
      };
    }
  }

  // =============================================================================
  // ELIGIBILITY CHECK
  // =============================================================================

  /**
   * Check if an order is eligible for BNPL with a specific provider
   */
  async checkEligibility(
    provider: BnplProvider,
    amount: number,
    currency: string,
    customerEmail?: string,
  ): Promise<{
    eligible: boolean;
    minAmount: number;
    maxAmount: number;
    availableTerms: number[];
    message?: string;
  }> {
    // Provider-specific limits
    const limits: Record<BnplProvider, { min: number; max: number; terms: number[] }> = {
      [BnplProvider.KLARNA]: { min: 35, max: 10000, terms: [4] }, // 4 installments
      [BnplProvider.AFFIRM]: { min: 50, max: 30000, terms: [3, 6, 12, 18, 24, 36] }, // Various terms
      [BnplProvider.AFTERPAY]: { min: 1, max: 2000, terms: [4] }, // 4 installments
      [BnplProvider.SEZZLE]: { min: 35, max: 2500, terms: [4] }, // 4 installments
    };

    const providerLimits = limits[provider];

    const eligible = amount >= providerLimits.min && amount <= providerLimits.max;

    return {
      eligible,
      minAmount: providerLimits.min,
      maxAmount: providerLimits.max,
      availableTerms: providerLimits.terms,
      message: !eligible
        ? amount < providerLimits.min
          ? `Minimum order amount is $${providerLimits.min}`
          : `Maximum order amount is $${providerLimits.max}`
        : undefined,
    };
  }
}
