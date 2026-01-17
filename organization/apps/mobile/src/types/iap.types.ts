/**
 * Type definitions for In-App Purchases
 */

import type {
  IAPItemDetails,
  InAppPurchase,
  IAPQueryResponse,
} from 'expo-in-app-purchases';

// Re-export types from expo-in-app-purchases for convenience
export type { IAPItemDetails, InAppPurchase, IAPQueryResponse };

// ==================== Purchase State ====================

export enum PurchaseState {
  PURCHASING = 'PURCHASING',
  PURCHASED = 'PURCHASED',
  FAILED = 'FAILED',
  RESTORED = 'RESTORED',
  DEFERRED = 'DEFERRED', // iOS only - pending approval
}

// ==================== Purchase Error ====================

export interface PurchaseError {
  code: IAPErrorCode | string;
  message: string;
  userCancelled?: boolean;
  networkError?: boolean;
  itemAlreadyOwned?: boolean;
  itemUnavailable?: boolean;
}

// ==================== Purchase Result ====================

export interface PurchaseResult {
  success: boolean;
  purchase?: InAppPurchase;
  error?: PurchaseError;
  cancelled?: boolean;
  deferred?: boolean; // iOS "Ask to Buy" - purchase pending approval
  provider?: 'STRIPE' | 'PAYPAL' | 'FLUTTERWAVE' | 'PAYSTACK' | 'APPLE_IAP' | 'GOOGLE_IAP';
  transactionId?: string;
}

// ==================== Subscription Status ====================

export interface SubscriptionStatus {
  isActive: boolean;
  productId: string;
  expirationDate?: Date;
  isInTrialPeriod?: boolean;
  isInGracePeriod?: boolean;
  autoRenewing?: boolean;
  cancellationDate?: Date;
}

// ==================== Product with Details ====================

export interface EnrichedProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
  type: 'consumable' | 'non-consumable' | 'subscription';
  subscriptionPeriod?: string; // e.g., "P1M" for one month, "P1Y" for one year
  freeTrialPeriod?: string;
  introductoryPrice?: string;
  introductoryPriceAmountMicros?: number;
  introductoryPricePeriod?: string;
  // Custom fields from our config
  credits?: number;
  bonus?: number;
  interval?: 'month' | 'year';
}

// ==================== IAP Event Types ====================

export enum IAPEventType {
  PURCHASE_SUCCESS = 'PURCHASE_SUCCESS',
  PURCHASE_ERROR = 'PURCHASE_ERROR',
  PURCHASE_CANCELLED = 'PURCHASE_CANCELLED',
  RESTORE_STARTED = 'RESTORE_STARTED',
  RESTORE_SUCCESS = 'RESTORE_SUCCESS',
  RESTORE_ERROR = 'RESTORE_ERROR',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_RENEWED = 'SUBSCRIPTION_RENEWED',
}

export interface IAPEvent {
  type: IAPEventType;
  productId?: string;
  purchase?: InAppPurchase;
  error?: PurchaseError;
  timestamp: Date;
}

// ==================== Receipt Validation ====================

export interface ReceiptValidationRequest {
  platform: 'ios' | 'android';
  receipt: string;
  productId: string;
  transactionId?: string;
}

export interface ReceiptValidationResponse {
  valid: boolean;
  productId: string;
  transactionId: string;
  purchaseDate: Date;
  expirationDate?: Date;
  isTrialPeriod?: boolean;
  error?: string;
}

// ==================== Purchase History ====================

export interface PurchaseHistoryItem {
  productId: string;
  transactionId: string;
  purchaseDate: Date;
  platform: 'ios' | 'android';
  validated: boolean;
  credits?: number;
  subscriptionExpiry?: Date;
}

// ==================== IAP Manager State ====================

export interface IAPManagerState {
  initialized: boolean;
  connected: boolean;
  products: EnrichedProduct[];
  purchases: InAppPurchase[];
  subscriptions: SubscriptionStatus[];
  loading: boolean;
  error?: PurchaseError;
}

// ==================== Purchase Options ====================

export interface PurchaseOptions {
  productId: string;
  offerToken?: string; // Android only - for subscriptions with offers
  oldProductId?: string; // Android only - for subscription upgrades/downgrades
  prorationMode?: ProrationMode; // Android only
}

export enum ProrationMode {
  IMMEDIATE_WITH_TIME_PRORATION = 1,
  IMMEDIATE_AND_CHARGE_PRORATED_PRICE = 2,
  IMMEDIATE_WITHOUT_PRORATION = 3,
  DEFERRED = 4,
}

// ==================== Error Codes ====================

export enum IAPErrorCode {
  // User errors
  USER_CANCELLED = 'USER_CANCELLED',
  PAYMENT_INVALID = 'PAYMENT_INVALID',
  DEFERRED = 'DEFERRED', // iOS "Ask to Buy" - purchase pending approval

  // Product errors
  PRODUCT_NOT_AVAILABLE = 'PRODUCT_NOT_AVAILABLE',
  PRODUCT_ALREADY_OWNED = 'PRODUCT_ALREADY_OWNED',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // System errors
  NOT_INITIALIZED = 'NOT_INITIALIZED',
  PLATFORM_NOT_SUPPORTED = 'PLATFORM_NOT_SUPPORTED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',

  // Validation errors
  RECEIPT_VALIDATION_FAILED = 'RECEIPT_VALIDATION_FAILED',
  RECEIPT_INVALID = 'RECEIPT_INVALID',
}

// ==================== Logging ====================

export interface IAPLogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  timestamp: Date;
  category: 'initialization' | 'purchase' | 'restore' | 'validation' | 'subscription';
}
