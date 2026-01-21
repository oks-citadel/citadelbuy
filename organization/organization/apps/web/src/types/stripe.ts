/**
 * Stripe-related TypeScript type definitions
 *
 * This file contains all type definitions for Stripe payment integration
 */

import { Stripe, StripeElements } from '@stripe/stripe-js';

/**
 * Payment Intent creation request
 */
export interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  orderId?: string;
  metadata?: Record<string, string>;
}

/**
 * Payment Intent creation response
 */
export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId?: string;
}

/**
 * Payment result returned after successful payment
 */
export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
}

/**
 * Payment metadata that can be attached to payments
 */
export interface PaymentMetadata {
  orderId?: string;
  customerId?: string;
  customerEmail?: string;
  orderNumber?: string;
  [key: string]: string | undefined;
}

/**
 * Card element change event
 */
export interface CardElementChangeEvent {
  complete: boolean;
  empty: boolean;
  error?: {
    type: string;
    code: string;
    message: string;
  };
  brand?: string;
  value?: {
    postalCode?: string;
  };
}

/**
 * Stripe payment status
 */
export type PaymentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'canceled'
  | 'requires_capture';

/**
 * Stripe error codes
 */
export type StripeErrorCode =
  | 'card_declined'
  | 'expired_card'
  | 'incorrect_cvc'
  | 'processing_error'
  | 'incorrect_number'
  | 'invalid_expiry_month'
  | 'invalid_expiry_year'
  | 'invalid_cvc'
  | 'insufficient_funds'
  | 'lost_card'
  | 'stolen_card'
  | 'generic_decline';

/**
 * Stripe error object
 */
export interface StripeError {
  type: 'api_error' | 'card_error' | 'idempotency_error' | 'invalid_request_error' | 'rate_limit_error' | 'validation_error' | 'authentication_error';
  code?: StripeErrorCode;
  message: string;
  param?: string;
  decline_code?: string;
}

/**
 * Payment method details
 */
export interface PaymentMethodDetails {
  type: 'card' | 'bank_account' | 'alipay' | 'wechat_pay';
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    funding: 'credit' | 'debit' | 'prepaid' | 'unknown';
  };
}

/**
 * Webhook event types
 */
export type StripeWebhookEvent =
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'payment_intent.canceled'
  | 'payment_intent.processing'
  | 'payment_intent.requires_action'
  | 'payment_intent.amount_capturable_updated'
  | 'charge.succeeded'
  | 'charge.failed'
  | 'charge.refunded';

/**
 * Webhook event object
 */
export interface StripeWebhookEventObject {
  id: string;
  object: 'event';
  api_version: string;
  created: number;
  data: {
    object: any;
    previous_attributes?: any;
  };
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  };
  type: StripeWebhookEvent;
}

/**
 * Refund request
 */
export interface RefundRequest {
  paymentIntentId: string;
  amount?: number; // In cents, omit for full refund
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, string>;
}

/**
 * Refund response
 */
export interface RefundResponse {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  reason?: string;
}

/**
 * Customer information for Stripe
 */
export interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  description?: string;
  metadata?: Record<string, string>;
}

/**
 * Subscription plan
 */
export interface SubscriptionPlan {
  id: string;
  priceId: string;
  name: string;
  amount: number;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount?: number;
  trialDays?: number;
}

/**
 * Subscription creation request
 */
export interface CreateSubscriptionRequest {
  customerId: string;
  priceId: string;
  paymentMethodId?: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}

/**
 * Currency information
 */
export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  zeroDecimal: boolean;
  minAmount: number;
  maxAmount: number;
}

/**
 * Supported currencies
 */
export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', zeroDecimal: false, minAmount: 0.5, maxAmount: 999999 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', zeroDecimal: false, minAmount: 0.5, maxAmount: 999999 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', zeroDecimal: false, minAmount: 0.3, maxAmount: 999999 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', zeroDecimal: true, minAmount: 50, maxAmount: 9999999 },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', zeroDecimal: false, minAmount: 0.5, maxAmount: 999999 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', zeroDecimal: false, minAmount: 0.5, maxAmount: 999999 },
};

/**
 * Zero-decimal currencies (amounts are not multiplied by 100)
 */
export const ZERO_DECIMAL_CURRENCIES = [
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW',
  'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
];

/**
 * Payment intent creation options
 */
export interface PaymentIntentOptions {
  amount: number;
  currency: string;
  customerId?: string;
  description?: string;
  statementDescriptor?: string;
  metadata?: Record<string, string>;
  setupFutureUsage?: 'on_session' | 'off_session';
  captureMethod?: 'automatic' | 'manual';
  confirmationMethod?: 'automatic' | 'manual';
}

/**
 * Stripe instance context
 */
export interface StripeInstanceContext {
  stripe: Stripe | null;
  elements: StripeElements | null;
  isReady: boolean;
}

/**
 * Payment form state
 */
export interface PaymentFormState {
  isProcessing: boolean;
  isComplete: boolean;
  error: string | null;
  cardComplete: boolean;
  clientSecret: string | null;
}

export default {
  SUPPORTED_CURRENCIES,
  ZERO_DECIMAL_CURRENCIES,
};
