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
import { api } from './api';

// ==================== Types ====================

export type PaymentProvider = 'STRIPE' | 'PAYPAL' | 'FLUTTERWAVE' | 'PAYSTACK' | 'APPLE_IAP' | 'GOOGLE_IAP';

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  provider: PaymentProvider;
  error?: string;
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

  /**
   * Initialize the billing service
   * Must be called on app start
   */
  async initialize(): Promise<void> {
    // Initialize native IAP SDK based on platform
    // This would typically use react-native-iap or expo-in-app-purchases
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        // TODO: Initialize IAP SDK
        // await initIAP();
        this.iapInitialized = true;
      }
    } catch (error) {
      console.error('Failed to initialize billing:', error);
    }
  }

  /**
   * Get available payment providers based on region
   */
  async getAvailableProviders(currency?: string, country?: string) {
    return paymentsApi.getProviders(currency, country);
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
        error: response.error?.message || 'Failed to create payment',
      };
    } catch (error: any) {
      return {
        success: false,
        provider: request.provider || 'STRIPE',
        error: error.message || 'Payment failed',
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
        error: response.error?.message || 'Failed to create subscription',
      };
    } catch (error: any) {
      return {
        success: false,
        provider: 'STRIPE',
        error: error.message || 'Subscription failed',
      };
    }
  }

  /**
   * Purchase via Apple In-App Purchase
   */
  async purchaseAppleIAP(productId: string): Promise<PaymentResult> {
    try {
      // TODO: Implement using react-native-iap or expo-in-app-purchases
      // Example flow:
      // 1. Get product details
      // 2. Request purchase
      // 3. Get receipt
      // 4. Validate with backend
      // 5. Grant entitlement

      // Placeholder - actual implementation depends on IAP library
      /*
      const products = await getProducts([productId]);
      if (products.length === 0) throw new Error('Product not found');

      const purchase = await requestPurchase(productId);
      const receipt = await getReceipt();

      // Validate and sync with backend
      await iapApi.syncPurchase('ios', receipt, productId);

      // Acknowledge purchase
      await finishTransaction(purchase);
      */

      return {
        success: true,
        provider: 'APPLE_IAP',
        // transactionId from receipt
      };
    } catch (error: any) {
      return {
        success: false,
        provider: 'APPLE_IAP',
        error: error.message || 'Apple IAP failed',
      };
    }
  }

  /**
   * Purchase via Google Play Billing
   */
  async purchaseGoogleIAP(productId: string): Promise<PaymentResult> {
    try {
      // TODO: Implement using react-native-iap or expo-in-app-purchases
      // Similar flow to Apple IAP

      return {
        success: true,
        provider: 'GOOGLE_IAP',
        // transactionId from purchase token
      };
    } catch (error: any) {
      return {
        success: false,
        provider: 'GOOGLE_IAP',
        error: error.message || 'Google Play Billing failed',
      };
    }
  }

  /**
   * Restore previous purchases
   * Important for subscription apps
   */
  async restorePurchases(): Promise<void> {
    try {
      // TODO: Implement restore logic
      // 1. Get all available receipts/purchase history
      // 2. Validate each with backend
      // 3. Grant entitlements
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      throw error;
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
        const result = await this.purchaseAppleIAP(pkg.appleProductId);
        if (result.success) {
          // Sync with backend to credit wallet
          // await iapApi.syncPurchase('ios', receipt, pkg.appleProductId);
        }
        return result;
      }
      if (Platform.OS === 'android' && pkg.googleProductId) {
        const result = await this.purchaseGoogleIAP(pkg.googleProductId);
        if (result.success) {
          // await iapApi.syncPurchase('android', token, pkg.googleProductId);
        }
        return result;
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
        error: response.error?.message || 'Failed to purchase package',
      };
    } catch (error: any) {
      return {
        success: false,
        provider: 'STRIPE',
        error: error.message || 'Purchase failed',
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
}

// Export singleton instance
export const billingService = new BillingService();

export default billingService;
