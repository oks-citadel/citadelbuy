/**
 * React Hook for In-App Purchases
 *
 * Provides easy-to-use hooks for IAP functionality in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { billingService } from '../services/billing';
import type {
  EnrichedProduct,
  PurchaseResult,
  SubscriptionStatus,
} from '../types/iap.types';
import type { SubscriptionPlan, CreditPackage } from '../services/billing';

// ==================== useIAPInitialization ====================

/**
 * Hook to check if IAP is initialized and available
 */
export function useIAPInitialization() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    const checkInitialization = async () => {
      try {
        await billingService.initialize();
        setIsInitialized(true);
        setIsAvailable(billingService.isIAPAvailable());
      } catch (error) {
        console.error('Failed to initialize IAP:', error);
        setIsInitialized(true); // Mark as initialized even if failed
        setIsAvailable(false);
      }
    };

    checkInitialization();

    return () => {
      billingService.disconnect();
    };
  }, []);

  return { isInitialized, isAvailable };
}

// ==================== useIAPProducts ====================

/**
 * Hook to load and manage IAP products
 */
export function useIAPProducts() {
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedProducts = await billingService.getProducts();
      setProducts(loadedProducts);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
      console.error('Failed to load IAP products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return {
    products,
    loading,
    error,
    reload: loadProducts,
  };
}

// ==================== usePurchase ====================

/**
 * Hook to handle purchase flow
 */
export function usePurchase() {
  const [purchasing, setPurchasing] = useState(false);
  const [lastResult, setLastResult] = useState<PurchaseResult | null>(null);

  const purchaseSubscription = useCallback(
    async (plan: SubscriptionPlan, useNativeIAP: boolean = true): Promise<PurchaseResult> => {
      setPurchasing(true);
      try {
        const result = await billingService.purchaseSubscription(plan, useNativeIAP);
        setLastResult(result);
        return result;
      } finally {
        setPurchasing(false);
      }
    },
    []
  );

  const purchaseCreditPackage = useCallback(
    async (pkg: CreditPackage, useNativeIAP: boolean = true): Promise<PurchaseResult> => {
      setPurchasing(true);
      try {
        const result = await billingService.purchaseCreditPackage(pkg, useNativeIAP);
        setLastResult(result);
        return result;
      } finally {
        setPurchasing(false);
      }
    },
    []
  );

  const clearLastResult = useCallback(() => {
    setLastResult(null);
  }, []);

  return {
    purchasing,
    lastResult,
    purchaseSubscription,
    purchaseCreditPackage,
    clearLastResult,
  };
}

// ==================== useRestorePurchases ====================

/**
 * Hook to handle purchase restoration
 */
export function useRestorePurchases() {
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{
    success: boolean;
    restoredCount: number;
    error?: string;
  } | null>(null);

  const restore = useCallback(async () => {
    setRestoring(true);
    try {
      const result = await billingService.restorePurchases();
      setRestoreResult(result);
      return result;
    } finally {
      setRestoring(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setRestoreResult(null);
  }, []);

  return {
    restoring,
    restoreResult,
    restore,
    clearResult,
  };
}

// ==================== useWalletBalance ====================

/**
 * Hook to manage wallet balance
 */
export function useWalletBalance() {
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('USD');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBalance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const walletBalance = await billingService.getWalletBalance();
      setBalance(walletBalance.balance);
      setCurrency(walletBalance.currency);
    } catch (err: any) {
      setError(err.message || 'Failed to load balance');
      console.error('Failed to load wallet balance:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  return {
    balance,
    currency,
    loading,
    error,
    reload: loadBalance,
  };
}

// ==================== useIAPLogs ====================

/**
 * Hook to access IAP logs for debugging
 */
export function useIAPLogs() {
  const [logs, setLogs] = useState(billingService.getLogs());

  const refresh = useCallback(() => {
    setLogs(billingService.getLogs());
  }, []);

  const clear = useCallback(() => {
    billingService.clearLogs();
    setLogs([]);
  }, []);

  return {
    logs,
    refresh,
    clear,
  };
}

// ==================== useIAP (All-in-one) ====================

/**
 * Comprehensive hook with all IAP functionality
 */
export function useIAP() {
  const initialization = useIAPInitialization();
  const productsState = useIAPProducts();
  const purchaseState = usePurchase();
  const restoreState = useRestorePurchases();
  const walletState = useWalletBalance();

  return {
    // Initialization
    isInitialized: initialization.isInitialized,
    isAvailable: initialization.isAvailable,

    // Products
    products: productsState.products,
    productsLoading: productsState.loading,
    productsError: productsState.error,
    reloadProducts: productsState.reload,

    // Purchase
    purchasing: purchaseState.purchasing,
    lastPurchaseResult: purchaseState.lastResult,
    purchaseSubscription: purchaseState.purchaseSubscription,
    purchaseCreditPackage: purchaseState.purchaseCreditPackage,
    clearLastPurchaseResult: purchaseState.clearLastResult,

    // Restore
    restoring: restoreState.restoring,
    restoreResult: restoreState.restoreResult,
    restorePurchases: restoreState.restore,
    clearRestoreResult: restoreState.clearResult,

    // Wallet
    walletBalance: walletState.balance,
    walletCurrency: walletState.currency,
    walletLoading: walletState.loading,
    walletError: walletState.error,
    reloadWallet: walletState.reload,
  };
}

export default useIAP;
