/**
 * Unified Billing Service for Mobile
 *
 * Supports:
 * - Payment gateways (Stripe, PayPal, Flutterwave, Paystack)
 * - Apple In-App Purchases (StoreKit)
 * - Google Play Billing
 *
 * The service provides a unified interface for all payment types
 * and syncs purchases with the backend for server-side validation.
 */

import { Platform, Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as InAppPurchases from 'expo-in-app-purchases';
import type {
  IAPItemDetails,
  InAppPurchase,
  IAPQueryResponse,
} from 'expo-in-app-purchases';
import { api } from './api';
import {
  getPlatformProductIds,
  findProductById,
  SUBSCRIPTION_PRODUCTS,
  CREDIT_PACKAGES,
} from '../config/iap-products';
import type {
  PurchaseResult,
  PurchaseError,
  EnrichedProduct,
  SubscriptionStatus,
  IAPLogEntry,
} from '../types/iap.types';
import { IAPErrorCode } from '../types/iap.types';

// ==================== Types ====================

export type PaymentProvider = 'STRIPE' | 'PAYPAL' | 'FLUTTERWAVE' | 'PAYSTACK' | 'APPLE_IAP' | 'GOOGLE_IAP';

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  provider?: PaymentProvider;
  error?: PurchaseError;
  purchase?: InAppPurchase;
  cancelled?: boolean;
}

export interface CheckoutRequest {
  amount: number;
  currency: string;
  provider?: PaymentProvider;
  items?: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  metadata?: Record<string, any>;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  // Platform-specific product IDs
  stripeProductId?: string;
  appleProductId?: string;
  googleProductId?: string;
}

export interface WalletBalance {
  balance: number;
  currency: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  bonus?: number;
  // Platform-specific product IDs
  appleProductId?: string;
  googleProductId?: string;
}

// ==================== Payment Gateway Service ====================

export const paymentsApi = {
  // Create checkout session (auto-selects provider)
  createCheckoutSession: async (request: CheckoutRequest) => {
    const response = await api.post('/payments/checkout-session', request);
    return response.data;
  },

  // Get payment status
  getPaymentStatus: async (provider: PaymentProvider, transactionId: string) => {
    const response = await api.get(`/payments/status/${provider}/${transactionId}`);
    return response.data;
  },

  // PayPal
  createPayPalOrder: async (request: CheckoutRequest) => {
    const response = await api.post('/payments/paypal/create-order', request);
    return response.data;
  },

  capturePayPalOrder: async (orderId: string) => {
    const response = await api.post(`/payments/paypal/capture/${orderId}`);
    return response.data;
  },

  // Flutterwave
  initFlutterwave: async (request: CheckoutRequest) => {
    const response = await api.post('/payments/flutterwave/init', request);
    return response.data;
  },

  // Paystack
  initPaystack: async (request: CheckoutRequest) => {
    const response = await api.post('/payments/paystack/init', request);
    return response.data;
  },

  // Get available providers
  getProviders: async (currency?: string, country?: string) => {
    const params = new URLSearchParams();
    if (currency) params.append('currency', currency);
    if (country) params.append('country', country);
    const response = await api.get(`/payments/providers?${params.toString()}`);
    return response.data;
  },
};

// ==================== Subscription Service ====================

export const subscriptionsApi = {
  // Get available plans
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    const response = await api.get('/payments/plans');
    return response.data.plans || [];
  },

  // Create subscription
  createSubscription: async (planId: string, provider?: PaymentProvider, paymentMethodId?: string) => {
    const response = await api.post('/payments/subscriptions/create', {
      planId,
      provider: provider || 'STRIPE',
      paymentMethodId,
    });
    return response.data;
  },

  // Cancel subscription
  cancelSubscription: async (subscriptionId: string, immediately: boolean = false, provider?: PaymentProvider) => {
    const response = await api.post(
      `/payments/subscriptions/${subscriptionId}/cancel?immediately=${immediately}&provider=${provider || 'STRIPE'}`
    );
    return response.data;
  },

  // Get subscription status
  getSubscriptionStatus: async (subscriptionId: string, provider?: PaymentProvider) => {
    const response = await api.get(
      `/payments/subscriptions/${subscriptionId}/status?provider=${provider || 'STRIPE'}`
    );
    return response.data;
  },

  // Get current user subscription
  getCurrentSubscription: async () => {
    const response = await api.get('/user/subscription');
    return response.data;
  },
};

// ==================== In-App Purchase Service ====================

export const iapApi = {
  // Validate IAP receipt
  validateReceipt: async (platform: 'ios' | 'android', receipt: string, productId?: string) => {
    const response = await api.post('/payments/iap/validate', {
      platform,
      receipt,
      productId,
    });
    return response.data;
  },

  // Sync IAP purchase with account
  syncPurchase: async (platform: 'ios' | 'android', receipt: string, productId: string) => {
    const response = await api.post('/payments/iap/sync', {
      platform,
      receipt,
      productId,
    });
    return response.data;
  },

  // Verify IAP subscription status
  verifySubscription: async (platform: 'ios' | 'android', receipt: string, productId: string) => {
    const response = await api.post('/payments/iap/subscription/verify', {
      platform,
      receipt,
      productId,
    });
    return response.data;
  },
};

// ==================== Wallet Service ====================

export const walletApi = {
  // Get wallet balance
  getBalance: async (): Promise<WalletBalance> => {
    const response = await api.get('/payments/wallet/balance');
    return response.data;
  },

  // Get wallet transactions
  getTransactions: async (limit: number = 20, offset: number = 0) => {
    const response = await api.get(`/payments/wallet/transactions?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Top up wallet via payment gateway
  topUp: async (amount: number, provider?: PaymentProvider) => {
    const response = await api.post('/payments/wallet/topup', {
      amount,
      provider: provider || 'STRIPE',
    });
    return response.data;
  },

  // Get credit packages
  getCreditPackages: async (): Promise<CreditPackage[]> => {
    const response = await api.get('/payments/wallet/packages');
    return response.data.packages || [];
  },

  // Purchase credit package
  purchasePackage: async (packageId: string, provider?: PaymentProvider) => {
    const response = await api.post('/payments/wallet/purchase-package', {
      packageId,
      provider,
    });
    return response.data;
  },
};

// ==================== IAP Logging ====================

class IAPLogger {
  private logs: IAPLogEntry[] = [];
  private maxLogs = 100;

  log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    category: 'initialization' | 'purchase' | 'restore' | 'validation' | 'subscription',
    data?: any
  ) {
    const entry: IAPLogEntry = {
      level,
      message,
      category,
      data,
      timestamp: new Date(),
    };

    this.logs.push(entry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output
    const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    logFn(`[IAP:${category}] ${message}`, data || '');
  }

  getLogs(): IAPLogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

const iapLogger = new IAPLogger();

// ==================== IAP Error Handler ====================

function createPurchaseError(
  code: IAPErrorCode | string,
  message: string,
  details?: any
): PurchaseError {
  const error: PurchaseError = {
    code,
    message,
  };

  // Set specific flags based on error code
  if (code === 'USER_CANCELLED' || message.toLowerCase().includes('cancel')) {
    error.userCancelled = true;
  }
  if (code === 'NETWORK_ERROR' || message.toLowerCase().includes('network')) {
    error.networkError = true;
  }
  if (code === 'PRODUCT_ALREADY_OWNED' || message.toLowerCase().includes('already owned')) {
    error.itemAlreadyOwned = true;
  }
  if (code === 'PRODUCT_NOT_AVAILABLE' || message.toLowerCase().includes('not available')) {
    error.itemUnavailable = true;
  }

  iapLogger.log('error', message, 'purchase', { code, details });

  return error;
}

// ==================== Unified Billing Service ====================

/**
 * Unified billing service that handles:
 * - Payment gateway flows (web redirect)
 * - Native IAP (Apple/Google)
 * - Subscription management
 * - Wallet/credits
 */
class BillingService {
  private iapInitialized = false;
  private iapConnected = false;
  private products: IAPItemDetails[] = [];
  private purchaseListener: any = null;
  private pendingPurchases: Map<string, (result: PurchaseResult) => void> = new Map();

  /**
   * Initialize the billing service
   * Must be called on app start
   */
  async initialize(): Promise<void> {
    // Initialize native IAP SDK based on platform
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        iapLogger.log('info', 'Initializing IAP SDK', 'initialization', { platform: Platform.OS });

        // Connect to the store
        await InAppPurchases.connectAsync();
        this.iapConnected = true;

        iapLogger.log('info', 'Connected to IAP store', 'initialization');

        // Get product IDs for current platform
        const platform = Platform.OS as 'ios' | 'android';
        const productIds = getPlatformProductIds(platform);

        iapLogger.log('debug', 'Fetching products', 'initialization', { productIds });

        // Fetch product details
        const { results, responseCode } = await InAppPurchases.getProductsAsync(productIds);

        if (responseCode === InAppPurchases.IAPResponseCode.OK) {
          this.products = results || [];
          iapLogger.log('info', `Loaded ${this.products.length} products`, 'initialization', {
            products: this.products.map(p => p.productId),
          });
        } else {
          iapLogger.log('warn', 'Failed to fetch products', 'initialization', { responseCode });
        }

        // Set up purchase listener
        this.setupPurchaseListener();

        // Check for unfinished transactions
        await this.finishUnfinishedTransactions();

        this.iapInitialized = true;
        iapLogger.log('info', 'IAP initialization complete', 'initialization');
      }
    } catch (error: any) {
      iapLogger.log('error', 'Failed to initialize IAP', 'initialization', { error: error.message });
      console.error('Failed to initialize billing:', error);
    }
  }

  /**
   * Set up listener for purchase updates
   */
  private setupPurchaseListener() {
    this.purchaseListener = InAppPurchases.setPurchaseListener(
      async ({ responseCode, results, errorCode }) => {
        iapLogger.log('debug', 'Purchase listener triggered', 'purchase', {
          responseCode,
          errorCode,
          resultsCount: results?.length || 0,
        });

        if (responseCode === InAppPurchases.IAPResponseCode.OK) {
          for (const purchase of results || []) {
            await this.handlePurchaseUpdate(purchase);
          }
        } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
          iapLogger.log('info', 'User cancelled purchase', 'purchase');
          // Resolve any pending purchases with cancelled result
          this.pendingPurchases.forEach(resolve => {
            resolve({
              success: false,
              cancelled: true,
              error: createPurchaseError('USER_CANCELLED', 'User cancelled the purchase'),
            });
          });
          this.pendingPurchases.clear();
        } else {
          iapLogger.log('error', 'Purchase error', 'purchase', { responseCode, errorCode });
          const error = createPurchaseError(
            'UNKNOWN_ERROR',
            `Purchase failed with code ${responseCode}`
          );
          this.pendingPurchases.forEach(resolve => {
            resolve({ success: false, error });
          });
          this.pendingPurchases.clear();
        }
      }
    );
  }

  /**
   * Handle purchase update from store
   */
  private async handlePurchaseUpdate(purchase: InAppPurchase) {
    try {
      iapLogger.log('info', 'Processing purchase', 'purchase', {
        productId: purchase.productId,
        transactionId: purchase.transactionReceipt ? 'present' : 'missing',
      });

      // Get platform
      const platform = Platform.OS as 'ios' | 'android';

      // Validate receipt with backend
      const receipt = purchase.transactionReceipt;
      if (!receipt) {
        throw new Error('No receipt available');
      }

      iapLogger.log('debug', 'Validating receipt with backend', 'validation');

      const validation = await iapApi.validateReceipt(platform, receipt, purchase.productId);

      if (validation.valid) {
        iapLogger.log('info', 'Receipt validated successfully', 'validation');

        // Sync purchase with backend to grant entitlements
        await iapApi.syncPurchase(platform, receipt, purchase.productId);

        // Finish the transaction
        await InAppPurchases.finishTransactionAsync(purchase, true);

        iapLogger.log('info', 'Transaction finished', 'purchase', { productId: purchase.productId });

        // Resolve pending purchase
        const resolver = this.pendingPurchases.get(purchase.productId);
        if (resolver) {
          resolver({
            success: true,
            purchase,
            provider: platform === 'ios' ? 'APPLE_IAP' : 'GOOGLE_IAP',
            transactionId: purchase.orderId || purchase.productId,
          });
          this.pendingPurchases.delete(purchase.productId);
        }
      } else {
        throw new Error('Receipt validation failed');
      }
    } catch (error: any) {
      iapLogger.log('error', 'Failed to process purchase', 'purchase', {
        productId: purchase.productId,
        error: error.message,
      });

      // Finish transaction with error
      await InAppPurchases.finishTransactionAsync(purchase, false);

      const resolver = this.pendingPurchases.get(purchase.productId);
      if (resolver) {
        resolver({
          success: false,
          error: createPurchaseError('RECEIPT_VALIDATION_FAILED', error.message),
        });
        this.pendingPurchases.delete(purchase.productId);
      }
    }
  }

  /**
   * Finish any unfinished transactions from previous sessions
   */
  private async finishUnfinishedTransactions() {
    try {
      const history = await InAppPurchases.getPurchaseHistoryAsync();

      if (history.responseCode === InAppPurchases.IAPResponseCode.OK && history.results) {
        iapLogger.log('info', `Found ${history.results.length} purchase history items`, 'initialization');

        for (const purchase of history.results) {
          // Check if transaction needs to be finished
          if (purchase.acknowledged === false) {
            iapLogger.log('info', 'Finishing unfinished transaction', 'purchase', {
              productId: purchase.productId,
            });
            await InAppPurchases.finishTransactionAsync(purchase, true);
          }
        }
      }
    } catch (error: any) {
      iapLogger.log('warn', 'Failed to check unfinished transactions', 'initialization', {
        error: error.message,
      });
    }
  }

  /**
   * Get available payment providers based on region
   */
  async getAvailableProviders(currency?: string, country?: string) {
    return paymentsApi.getProviders(currency, country);
  }

  /**
   * Get available IAP products with details
   */
  async getProducts(): Promise<EnrichedProduct[]> {
    if (!this.iapInitialized) {
      iapLogger.log('warn', 'IAP not initialized', 'purchase');
      return [];
    }

    return this.products.map(product => {
      const configProduct = findProductById(product.productId);

      return {
        productId: product.productId,
        title: product.title || configProduct?.name || '',
        description: product.description || configProduct?.description || '',
        price: product.price || '',
        priceAmountMicros: parseInt(product.priceAmountMicros || '0'),
        priceCurrencyCode: product.priceCurrencyCode || 'USD',
        type: configProduct?.type || 'consumable',
        subscriptionPeriod: (product as any).subscriptionPeriod,
        credits: (configProduct as any)?.credits,
        bonus: (configProduct as any)?.bonus,
        interval: (configProduct as any)?.interval,
      } as EnrichedProduct;
    });
  }

  /**
   * Process a one-time payment via gateway
   * Redirects to external URL for payment
   */
  async processGatewayPayment(request: CheckoutRequest): Promise<PaymentResult> {
    try {
      let response;

      switch (request.provider) {
        case 'PAYPAL':
          response = await paymentsApi.createPayPalOrder(request);
          break;
        case 'FLUTTERWAVE':
          response = await paymentsApi.initFlutterwave(request);
          break;
        case 'PAYSTACK':
          response = await paymentsApi.initPaystack(request);
          break;
        default:
          // Default to auto-select or Stripe
          response = await paymentsApi.createCheckoutSession(request);
      }

      if (response.success && response.checkoutUrl) {
        // Open payment URL in browser
        const supported = await Linking.canOpenURL(response.checkoutUrl);
        if (supported) {
          await Linking.openURL(response.checkoutUrl);
        }

        return {
          success: true,
          transactionId: response.transactionId,
          provider: response.provider || request.provider || 'STRIPE',
        };
      }

      return {
        success: false,
        provider: request.provider || 'STRIPE',
        error: createPurchaseError('UNKNOWN_ERROR', response.error?.message || 'Failed to create payment'),
      };
    } catch (error: any) {
      return {
        success: false,
        provider: request.provider || 'STRIPE',
        error: createPurchaseError('UNKNOWN_ERROR', error.message || 'Payment failed'),
      };
    }
  }

  /**
   * Purchase a subscription plan
   * Uses native IAP if available, otherwise falls back to gateway
   */
  async purchaseSubscription(plan: SubscriptionPlan, useNativeIAP: boolean = true): Promise<PaymentResult> {
    // Try native IAP first if enabled and available
    if (useNativeIAP && this.iapInitialized) {
      if (Platform.OS === 'ios' && plan.appleProductId) {
        return this.purchaseAppleIAP(plan.appleProductId);
      }
      if (Platform.OS === 'android' && plan.googleProductId) {
        return this.purchaseGoogleIAP(plan.googleProductId);
      }
    }

    // Fall back to gateway subscription
    try {
      const response = await subscriptionsApi.createSubscription(
        plan.stripeProductId || plan.id,
        'STRIPE'
      );

      if (response.success && response.checkoutUrl) {
        await Linking.openURL(response.checkoutUrl);
        return {
          success: true,
          transactionId: response.subscriptionId,
          provider: 'STRIPE',
        };
      }

      return {
        success: false,
        provider: 'STRIPE',
        error: createPurchaseError('UNKNOWN_ERROR', response.error?.message || 'Failed to create subscription'),
      };
    } catch (error: any) {
      return {
        success: false,
        provider: 'STRIPE',
        error: createPurchaseError('UNKNOWN_ERROR', error.message || 'Subscription failed'),
      };
    }
  }

  /**
   * Purchase via Apple In-App Purchase
   */
  async purchaseAppleIAP(productId: string): Promise<PaymentResult> {
    try {
      if (!this.iapInitialized) {
        throw createPurchaseError('NOT_INITIALIZED', 'IAP not initialized');
      }

      iapLogger.log('info', 'Starting Apple IAP purchase', 'purchase', { productId });

      // Create a promise that will be resolved by the purchase listener
      const purchasePromise = new Promise<PurchaseResult>((resolve) => {
        this.pendingPurchases.set(productId, resolve);
      });

      // Request purchase
      await InAppPurchases.purchaseItemAsync(productId);

      // Wait for purchase to complete (with timeout)
      const timeoutPromise = new Promise<PurchaseResult>((resolve) => {
        setTimeout(() => {
          this.pendingPurchases.delete(productId);
          resolve({
            success: false,
            error: createPurchaseError('UNKNOWN_ERROR', 'Purchase timeout'),
          });
        }, 60000); // 60 second timeout
      });

      const result = await Promise.race([purchasePromise, timeoutPromise]);

      return result;
    } catch (error: any) {
      iapLogger.log('error', 'Apple IAP purchase failed', 'purchase', { error: error.message });
      this.pendingPurchases.delete(productId);

      return {
        success: false,
        provider: 'APPLE_IAP',
        error: createPurchaseError('UNKNOWN_ERROR', error.message || 'Apple IAP failed'),
      };
    }
  }

  /**
   * Purchase via Google Play Billing
   */
  async purchaseGoogleIAP(productId: string): Promise<PaymentResult> {
    try {
      if (!this.iapInitialized) {
        throw createPurchaseError('NOT_INITIALIZED', 'IAP not initialized');
      }

      iapLogger.log('info', 'Starting Google Play purchase', 'purchase', { productId });

      // Create a promise that will be resolved by the purchase listener
      const purchasePromise = new Promise<PurchaseResult>((resolve) => {
        this.pendingPurchases.set(productId, resolve);
      });

      // Request purchase
      await InAppPurchases.purchaseItemAsync(productId);

      // Wait for purchase to complete (with timeout)
      const timeoutPromise = new Promise<PurchaseResult>((resolve) => {
        setTimeout(() => {
          this.pendingPurchases.delete(productId);
          resolve({
            success: false,
            error: createPurchaseError('UNKNOWN_ERROR', 'Purchase timeout'),
          });
        }, 60000); // 60 second timeout
      });

      const result = await Promise.race([purchasePromise, timeoutPromise]);

      return result;
    } catch (error: any) {
      iapLogger.log('error', 'Google Play purchase failed', 'purchase', { error: error.message });
      this.pendingPurchases.delete(productId);

      return {
        success: false,
        provider: 'GOOGLE_IAP',
        error: createPurchaseError('UNKNOWN_ERROR', error.message || 'Google Play Billing failed'),
      };
    }
  }

  /**
   * Restore previous purchases
   * Important for subscription apps
   */
  async restorePurchases(): Promise<{ success: boolean; restoredCount: number; error?: string }> {
    try {
      if (!this.iapInitialized) {
        throw new Error('IAP not initialized');
      }

      iapLogger.log('info', 'Starting purchase restore', 'restore');

      const platform = Platform.OS as 'ios' | 'android';
      let restoredCount = 0;

      // Get purchase history
      const history = await InAppPurchases.getPurchaseHistoryAsync();

      if (history.responseCode === InAppPurchases.IAPResponseCode.OK && history.results) {
        iapLogger.log('info', `Found ${history.results.length} purchases to restore`, 'restore');

        for (const purchase of history.results) {
          try {
            const receipt = purchase.transactionReceipt;
            if (!receipt) continue;

            // Validate and sync with backend
            const validation = await iapApi.validateReceipt(
              platform,
              receipt,
              purchase.productId
            );

            if (validation.valid) {
              await iapApi.syncPurchase(platform, receipt, purchase.productId);
              restoredCount++;

              iapLogger.log('info', 'Restored purchase', 'restore', {
                productId: purchase.productId,
              });
            }
          } catch (error: any) {
            iapLogger.log('warn', 'Failed to restore purchase', 'restore', {
              productId: purchase.productId,
              error: error.message,
            });
          }
        }

        iapLogger.log('info', `Restore complete: ${restoredCount} purchases restored`, 'restore');

        return {
          success: true,
          restoredCount,
        };
      } else {
        throw new Error('Failed to get purchase history');
      }
    } catch (error: any) {
      iapLogger.log('error', 'Purchase restore failed', 'restore', { error: error.message });

      return {
        success: false,
        restoredCount: 0,
        error: error.message || 'Failed to restore purchases',
      };
    }
  }

  /**
   * Get wallet balance and credits
   */
  async getWalletBalance(): Promise<WalletBalance> {
    return walletApi.getBalance();
  }

  /**
   * Purchase a credit package
   * Uses native IAP if available for consumables
   */
  async purchaseCreditPackage(pkg: CreditPackage, useNativeIAP: boolean = true): Promise<PaymentResult> {
    // Try native IAP for consumables
    if (useNativeIAP && this.iapInitialized) {
      if (Platform.OS === 'ios' && pkg.appleProductId) {
        return await this.purchaseAppleIAP(pkg.appleProductId);
      }
      if (Platform.OS === 'android' && pkg.googleProductId) {
        return await this.purchaseGoogleIAP(pkg.googleProductId);
      }
    }

    // Fall back to gateway
    try {
      const response = await walletApi.purchasePackage(pkg.id);
      if (response.success && response.checkoutUrl) {
        await Linking.openURL(response.checkoutUrl);
        return {
          success: true,
          transactionId: response.transactionId,
          provider: 'STRIPE',
        };
      }
      return {
        success: false,
        provider: 'STRIPE',
        error: createPurchaseError('UNKNOWN_ERROR', response.error?.message || 'Failed to purchase package'),
      };
    } catch (error: any) {
      return {
        success: false,
        provider: 'STRIPE',
        error: createPurchaseError('UNKNOWN_ERROR', error.message || 'Purchase failed'),
      };
    }
  }

  /**
   * Cancel current subscription
   */
  async cancelSubscription(subscriptionId: string, immediately: boolean = false): Promise<boolean> {
    try {
      // Get current subscription to determine provider
      const current = await subscriptionsApi.getCurrentSubscription();
      const provider = current.subscription?.provider;

      // For IAP subscriptions, direct to platform settings
      if (provider === 'APPLE_IAP' || provider === 'GOOGLE_IAP') {
        const url = provider === 'APPLE_IAP'
          ? 'https://apps.apple.com/account/subscriptions'
          : 'https://play.google.com/store/account/subscriptions';
        await Linking.openURL(url);
        return true;
      }

      // Cancel gateway subscription
      const response = await subscriptionsApi.cancelSubscription(subscriptionId, immediately, provider);
      return response.success;
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      return false;
    }
  }

  /**
   * Get IAP logs for debugging
   */
  getLogs(): IAPLogEntry[] {
    return iapLogger.getLogs();
  }

  /**
   * Clear IAP logs
   */
  clearLogs() {
    iapLogger.clearLogs();
  }

  /**
   * Disconnect from IAP store
   * Call this on app shutdown
   */
  async disconnect() {
    try {
      if (this.purchaseListener) {
        this.purchaseListener.remove();
        this.purchaseListener = null;
      }

      if (this.iapConnected) {
        await InAppPurchases.disconnectAsync();
        this.iapConnected = false;
        this.iapInitialized = false;

        iapLogger.log('info', 'Disconnected from IAP store', 'initialization');
      }
    } catch (error: any) {
      iapLogger.log('error', 'Failed to disconnect from IAP', 'initialization', {
        error: error.message,
      });
    }
  }

  /**
   * Check if IAP is available and initialized
   */
  isIAPAvailable(): boolean {
    return this.iapInitialized && this.iapConnected;
  }
}

// Export singleton instance
export const billingService = new BillingService();

export default billingService;
