/**
 * Base BNPL Provider Interface
 *
 * Defines the contract that all BNPL providers must implement.
 * This ensures consistent behavior across different providers.
 */

import { BnplProvider } from '@prisma/client';

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
  sku?: string;
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

export interface BnplEligibilityRequest {
  amount: number;
  currency: string;
  customerEmail?: string;
  shippingCountry?: string;
}

export interface BnplEligibilityResponse {
  eligible: boolean;
  minAmount: number;
  maxAmount: number;
  availableTerms: number[];
  message?: string;
  currency?: string;
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

export interface BnplRefundRequest {
  providerOrderId: string;
  amount: number;
  currency?: string;
  reason?: string;
  orderId?: string;
}

export interface BnplRefundResult {
  refunded: boolean;
  refundId?: string;
  amount?: number;
  errorMessage?: string;
}

export interface BnplWebhookEvent {
  eventType: string;
  provider: BnplProvider;
  providerOrderId: string;
  orderId?: string;
  status?: string;
  amount?: number;
  currency?: string;
  timestamp: Date;
  rawData: any;
}

export interface BnplProviderConfig {
  apiKey: string;
  apiSecret?: string;
  merchantId?: string;
  environment: 'sandbox' | 'production';
  baseUrl: string;
}

// =============================================================================
// BASE PROVIDER CLASS
// =============================================================================

export abstract class BaseBnplProvider {
  protected readonly config: BnplProviderConfig;
  protected readonly providerType: BnplProvider;

  constructor(config: BnplProviderConfig, providerType: BnplProvider) {
    this.config = config;
    this.providerType = providerType;
  }

  /**
   * Check if the provider is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.baseUrl);
  }

  /**
   * Get provider type
   */
  getProviderType(): BnplProvider {
    return this.providerType;
  }

  /**
   * Get provider configuration
   */
  getConfig(): BnplProviderConfig {
    return this.config;
  }

  // =============================================================================
  // ABSTRACT METHODS - Must be implemented by each provider
  // =============================================================================

  /**
   * Check if an order is eligible for BNPL
   */
  abstract checkEligibility(
    request: BnplEligibilityRequest,
  ): Promise<BnplEligibilityResponse>;

  /**
   * Create a checkout session
   */
  abstract createSession(request: BnplSessionRequest): Promise<BnplSession>;

  /**
   * Authorize a payment after customer approval
   */
  abstract authorizePayment(
    sessionId: string,
    checkoutToken?: string,
  ): Promise<BnplAuthorizationResult>;

  /**
   * Capture an authorized payment
   */
  abstract capturePayment(
    authorizationToken: string,
    amount?: number,
  ): Promise<BnplCaptureResult>;

  /**
   * Process a refund
   */
  abstract processRefund(
    request: BnplRefundRequest,
  ): Promise<BnplRefundResult>;

  /**
   * Handle webhook events from the provider
   */
  abstract handleWebhook(
    payload: any,
    headers: Record<string, string>,
  ): Promise<BnplWebhookEvent>;

  /**
   * Verify webhook signature
   */
  abstract verifyWebhookSignature(
    payload: any,
    signature: string,
  ): boolean;

  /**
   * Cancel an order/session
   */
  abstract cancelOrder(orderId: string): Promise<{ success: boolean; message?: string }>;

  /**
   * Get order status from provider
   */
  abstract getOrderStatus(
    orderId: string,
  ): Promise<{
    status: string;
    amount?: number;
    currency?: string;
    paidAmount?: number;
    refundedAmount?: number;
  }>;
}
