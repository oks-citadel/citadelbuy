/**
 * React Hooks for Marketing & Analytics
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  trackPageView,
  trackViewItem,
  trackViewItemList,
  trackAddToCart,
  trackRemoveFromCart,
  trackBeginCheckout,
  trackPurchase,
  trackSearch,
  trackAddToWishlist,
  createEcommerceItem,
  setUserId,
  type EcommerceItem,
} from './google-analytics';
import {
  fbTrackPageView,
  fbTrackViewContent,
  fbTrackAddToCart,
  fbTrackInitiateCheckout,
  fbTrackPurchase,
  fbTrackSearch,
  fbTrackAddToWishlist,
  createFBContentItem,
} from './facebook-pixel';
import { trackAcrossAllPlatforms } from './ad-pixels';
import { hasAnalyticsConsent, hasMarketingConsent } from './consent';
import {
  assignVariant,
  trackExposure,
  trackConversion,
  getAssignment,
  isFeatureEnabled,
  type Experiment,
  type Variant,
} from './ab-testing';

// ============================================================================
// Page View Tracking
// ============================================================================

/**
 * Hook to automatically track page views
 */
export function usePageTracking(): void {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

    // Avoid duplicate tracking
    if (previousPathRef.current === url) return;
    previousPathRef.current = url;

    // Track page view if consent given
    if (hasAnalyticsConsent()) {
      trackPageView(url);
    }

    if (hasMarketingConsent()) {
      fbTrackPageView();
      trackAcrossAllPlatforms({ event: 'page_view' });
    }
  }, [pathname, searchParams]);
}

// ============================================================================
// E-commerce Tracking Hooks
// ============================================================================

export interface ProductData {
  id: string;
  name: string;
  price: number;
  brand?: string;
  category?: string;
  variant?: string;
  quantity?: number;
}

/**
 * Hook for tracking product views
 */
export function useProductTracking() {
  const trackProductView = useCallback((product: ProductData) => {
    if (hasAnalyticsConsent()) {
      const item = createEcommerceItem(product);
      trackViewItem(item, product.price);
    }

    if (hasMarketingConsent()) {
      fbTrackViewContent({
        content_ids: [product.id],
        content_name: product.name,
        content_category: product.category,
        value: product.price,
      });

      trackAcrossAllPlatforms({
        event: 'view_item',
        value: product.price,
        items: [product],
      });
    }
  }, []);

  const trackProductListView = useCallback(
    (products: ProductData[], listId?: string, listName?: string) => {
      if (hasAnalyticsConsent()) {
        const items = products.map((p, index) =>
          createEcommerceItem({ ...p, index, listId, listName })
        );
        trackViewItemList(items, listId, listName);
      }
    },
    []
  );

  return { trackProductView, trackProductListView };
}

/**
 * Hook for cart tracking
 */
export function useCartTracking() {
  const trackCartAdd = useCallback((product: ProductData, quantity: number = 1) => {
    const value = product.price * quantity;

    if (hasAnalyticsConsent()) {
      const item = createEcommerceItem(product);
      trackAddToCart(item, quantity);
    }

    if (hasMarketingConsent()) {
      fbTrackAddToCart({
        content_ids: [product.id],
        contents: [createFBContentItem({ ...product, quantity })],
        value,
        content_name: product.name,
      });

      trackAcrossAllPlatforms({
        event: 'add_to_cart',
        value,
        items: [{ ...product, quantity }],
      });
    }
  }, []);

  const trackCartRemove = useCallback((product: ProductData, quantity: number = 1) => {
    if (hasAnalyticsConsent()) {
      const item = createEcommerceItem(product);
      trackRemoveFromCart(item, quantity);
    }
  }, []);

  return { trackCartAdd, trackCartRemove };
}

/**
 * Hook for checkout tracking
 */
export function useCheckoutTracking() {
  const trackCheckoutStart = useCallback(
    (products: ProductData[], value: number, coupon?: string) => {
      if (hasAnalyticsConsent()) {
        const items = products.map((p) => createEcommerceItem(p));
        trackBeginCheckout(items, value, coupon);
      }

      if (hasMarketingConsent()) {
        const contentIds = products.map((p) => p.id);
        const numItems = products.reduce((sum, p) => sum + (p.quantity || 1), 0);

        fbTrackInitiateCheckout(contentIds, value, numItems);

        trackAcrossAllPlatforms({
          event: 'begin_checkout',
          value,
          items: products,
        });
      }
    },
    []
  );

  const trackPurchaseComplete = useCallback(
    (
      transactionId: string,
      products: ProductData[],
      value: number,
      options?: {
        tax?: number;
        shipping?: number;
        coupon?: string;
      }
    ) => {
      if (hasAnalyticsConsent()) {
        const items = products.map((p) => createEcommerceItem(p));
        trackPurchase(transactionId, items, value, options);
      }

      if (hasMarketingConsent()) {
        const contentIds = products.map((p) => p.id);
        const contents = products.map((p) =>
          createFBContentItem({ id: p.id, quantity: p.quantity, price: p.price })
        );
        const numItems = products.reduce((sum, p) => sum + (p.quantity || 1), 0);

        fbTrackPurchase({
          value,
          currency: 'USD',
          content_ids: contentIds,
          contents,
          num_items: numItems,
        });

        trackAcrossAllPlatforms({
          event: 'purchase',
          value,
          items: products,
          orderId: transactionId,
        });
      }
    },
    []
  );

  return { trackCheckoutStart, trackPurchaseComplete };
}

/**
 * Hook for search tracking
 */
export function useSearchTracking() {
  const trackSearchQuery = useCallback((query: string) => {
    if (hasAnalyticsConsent()) {
      trackSearch(query);
    }

    if (hasMarketingConsent()) {
      fbTrackSearch(query);
      trackAcrossAllPlatforms({ event: 'search', searchQuery: query });
    }
  }, []);

  return { trackSearchQuery };
}

/**
 * Hook for wishlist tracking
 */
export function useWishlistTracking() {
  const trackWishlistAdd = useCallback((product: ProductData) => {
    if (hasAnalyticsConsent()) {
      const item = createEcommerceItem(product);
      trackAddToWishlist(item);
    }

    if (hasMarketingConsent()) {
      fbTrackAddToWishlist(product.id, product.name, product.price);
    }
  }, []);

  return { trackWishlistAdd };
}

// ============================================================================
// User Identification
// ============================================================================

/**
 * Hook for user identification
 */
export function useUserIdentification() {
  const identifyUser = useCallback((userId: string | null) => {
    if (hasAnalyticsConsent()) {
      setUserId(userId);
    }
  }, []);

  return { identifyUser };
}

// ============================================================================
// A/B Testing Hooks
// ============================================================================

/**
 * Hook for A/B testing experiments
 */
export function useExperiment(experiment: Experiment): {
  variant: Variant | null;
  isControl: boolean;
  trackConversion: (conversionType: string, value?: number) => void;
} {
  const variantRef = useRef<Variant | null>(null);
  const exposedRef = useRef(false);

  // Assign variant on mount
  useEffect(() => {
    if (!variantRef.current) {
      variantRef.current = assignVariant(experiment);
    }

    // Track exposure once
    if (variantRef.current && !exposedRef.current) {
      trackExposure(experiment, variantRef.current);
      exposedRef.current = true;
    }
  }, [experiment]);

  const variant = variantRef.current;
  const isControl = variant?.isControl ?? true;

  const handleTrackConversion = useCallback(
    (conversionType: string, value?: number) => {
      trackConversion(experiment.id, conversionType, value);
    },
    [experiment.id]
  );

  return {
    variant,
    isControl,
    trackConversion: handleTrackConversion,
  };
}

/**
 * Hook for feature flags
 */
export function useFeatureFlag(
  featureId: string,
  rolloutPercentage: number = 50
): boolean {
  const enabledRef = useRef<boolean | null>(null);

  if (enabledRef.current === null) {
    enabledRef.current = isFeatureEnabled(featureId, rolloutPercentage);
  }

  return enabledRef.current;
}

/**
 * Hook for getting existing experiment assignment
 */
export function useExperimentAssignment(experimentId: string) {
  const assignment = getAssignment(experimentId);
  return assignment;
}

// ============================================================================
// Combined Analytics Hook
// ============================================================================

/**
 * Combined hook for all marketing analytics
 */
export function useAnalytics() {
  const { trackProductView, trackProductListView } = useProductTracking();
  const { trackCartAdd, trackCartRemove } = useCartTracking();
  const { trackCheckoutStart, trackPurchaseComplete } = useCheckoutTracking();
  const { trackSearchQuery } = useSearchTracking();
  const { trackWishlistAdd } = useWishlistTracking();
  const { identifyUser } = useUserIdentification();

  return {
    trackProductView,
    trackProductListView,
    trackCartAdd,
    trackCartRemove,
    trackCheckoutStart,
    trackPurchaseComplete,
    trackSearchQuery,
    trackWishlistAdd,
    identifyUser,
  };
}
