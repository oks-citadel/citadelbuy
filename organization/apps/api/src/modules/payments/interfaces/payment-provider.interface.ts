/**
 * Unified Payment Provider Interface
 * All payment providers must implement this interface for consistency
 */

export enum PaymentProviderType {
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
  BRAINTREE = 'BRAINTREE',
  FLUTTERWAVE = 'FLUTTERWAVE',
  PAYSTACK = 'PAYSTACK',
  APPLE_IAP = 'APPLE_IAP',
  GOOGLE_IAP = 'GOOGLE_IAP',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  DISPUTED = 'DISPUTED',
}

export enum PaymentType {
  ONE_TIME = 'ONE_TIME',
  SUBSCRIPTION = 'SUBSCRIPTION',
  CONSUMABLE = 'CONSUMABLE', // In-app consumables (coins, credits)
  NON_CONSUMABLE = 'NON_CONSUMABLE', // One-time unlocks
}

export interface PaymentCustomer {
  id?: string;
  email: string;
  name?: string;
  phone?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
}

export interface PaymentItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  category?: string;
}

export interface CreatePaymentRequest {
  amount: number;
  currency: string;
  customer: PaymentCustomer;
  items?: PaymentItem[];
  metadata?: Record<string, any>;
  returnUrl?: string;
  cancelUrl?: string;
  paymentType?: PaymentType;
  description?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  providerTransactionId: string;
  provider: PaymentProviderType;
  status: PaymentStatus;
  amount: number;
  currency: string;
  redirectUrl?: string; // For redirect-based flows
  clientSecret?: string; // For Stripe Elements
  checkoutUrl?: string; // For hosted checkout pages
  metadata?: Record<string, any>;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface RefundRequest {
  transactionId: string;
  providerTransactionId: string;
  amount?: number; // Partial refund if specified
  reason?: string;
  metadata?: Record<string, any>;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  providerRefundId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  error?: {
    code: string;
    message: string;
  };
}

export interface SubscriptionPlanConfig {
  id: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  trialDays?: number;
  metadata?: Record<string, any>;
}

export interface CreateSubscriptionRequest {
  customerId: string;
  planId: string;
  paymentMethodId?: string;
  couponCode?: string;
  trialDays?: number;
  metadata?: Record<string, any>;
}

export interface SubscriptionResult {
  success: boolean;
  subscriptionId: string;
  providerSubscriptionId: string;
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'UNPAID';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  error?: {
    code: string;
    message: string;
  };
}

export interface WebhookEvent {
  id: string;
  type: string;
  provider: PaymentProviderType;
  data: any;
  timestamp: Date;
  signature?: string;
}

export interface WebhookValidationResult {
  isValid: boolean;
  event?: WebhookEvent;
  error?: string;
}

/**
 * Base interface that all payment providers must implement
 */
export interface IPaymentProvider {
  readonly providerType: PaymentProviderType;

  /**
   * Check if provider is properly configured and enabled
   */
  isConfigured(): boolean;

  /**
   * Check if provider is enabled via feature flag
   */
  isEnabled(): boolean;

  /**
   * Create a one-time payment
   */
  createPayment(request: CreatePaymentRequest): Promise<PaymentResult>;

  /**
   * Capture a previously authorized payment
   */
  capturePayment(transactionId: string, amount?: number): Promise<PaymentResult>;

  /**
   * Process a refund
   */
  refundPayment(request: RefundRequest): Promise<RefundResult>;

  /**
   * Verify webhook signature and parse event
   */
  validateWebhook(
    payload: string | Buffer,
    signature: string,
    headers?: Record<string, string>,
  ): Promise<WebhookValidationResult>;

  /**
   * Get payment status by transaction ID
   */
  getPaymentStatus(transactionId: string): Promise<PaymentResult>;
}

/**
 * Extended interface for providers that support subscriptions
 */
export interface ISubscriptionProvider extends IPaymentProvider {
  /**
   * Create a subscription plan in the provider
   */
  createPlan(config: SubscriptionPlanConfig): Promise<{ planId: string; providerPlanId: string }>;

  /**
   * Create a subscription for a customer
   */
  createSubscription(request: CreateSubscriptionRequest): Promise<SubscriptionResult>;

  /**
   * Cancel a subscription
   */
  cancelSubscription(subscriptionId: string, immediately?: boolean): Promise<SubscriptionResult>;

  /**
   * Update subscription (change plan, etc.)
   */
  updateSubscription(
    subscriptionId: string,
    updates: Partial<CreateSubscriptionRequest>,
  ): Promise<SubscriptionResult>;

  /**
   * Get subscription status
   */
  getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionResult>;
}

/**
 * Interface for In-App Purchase providers (Apple/Google)
 */
export interface IIAPProvider {
  readonly providerType: PaymentProviderType.APPLE_IAP | PaymentProviderType.GOOGLE_IAP;

  /**
   * Validate a purchase receipt
   */
  validateReceipt(receipt: string, productId?: string): Promise<IAPValidationResult>;

  /**
   * Verify subscription status
   */
  verifySubscription(
    receipt: string,
    productId: string,
  ): Promise<IAPSubscriptionStatus>;

  /**
   * Process server-to-server notification
   */
  processNotification(notification: any): Promise<IAPNotificationResult>;
}

export interface IAPValidationResult {
  isValid: boolean;
  productId: string;
  transactionId: string;
  originalTransactionId?: string;
  purchaseDate: Date;
  expiresDate?: Date;
  isTrialPeriod?: boolean;
  isInIntroOfferPeriod?: boolean;
  quantity?: number;
  environment: 'sandbox' | 'production';
  error?: {
    code: string;
    message: string;
  };
}

export interface IAPSubscriptionStatus {
  isActive: boolean;
  productId: string;
  originalTransactionId: string;
  expiresDate?: Date;
  autoRenewStatus: boolean;
  gracePeriodExpiresDate?: Date;
  billingRetryPeriod?: boolean;
  cancellationDate?: Date;
  cancellationReason?: string;
}

export interface IAPNotificationResult {
  type: 'INITIAL_BUY' | 'RENEWAL' | 'CANCEL' | 'DID_FAIL_TO_RENEW' | 'REFUND' | 'PRICE_INCREASE' | 'REVOKE';
  productId: string;
  originalTransactionId: string;
  transactionId?: string;
  expiresDate?: Date;
  environment: 'sandbox' | 'production';
}
