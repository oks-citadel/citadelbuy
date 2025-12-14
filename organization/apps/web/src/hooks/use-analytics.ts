import { useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

export enum CategoryEventType {
  VIEW = 'VIEW',
  PRODUCT_CLICK = 'PRODUCT_CLICK',
  FILTER_APPLIED = 'FILTER_APPLIED',
  SORT_CHANGED = 'SORT_CHANGED',
  ADD_TO_CART = 'ADD_TO_CART',
  PURCHASE = 'PURCHASE',
}

interface TrackCategoryEventParams {
  categoryId: string;
  eventType: CategoryEventType;
  productId?: string;
  metadata?: Record<string, unknown>;
}

interface AnalyticsHook {
  trackCategoryEvent: (params: TrackCategoryEventParams) => Promise<void>;
  trackCategoryView: (categoryId: string) => Promise<void>;
  trackProductClick: (categoryId: string, productId: string) => Promise<void>;
  trackFilterApplied: (categoryId: string, filters: Record<string, unknown>) => Promise<void>;
  trackSortChanged: (categoryId: string, sortBy: string) => Promise<void>;
}

/**
 * Get or create session ID for analytics tracking
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return uuidv4();

  const SESSION_KEY = 'broxiva_session_id';
  let sessionId = sessionStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    sessionId = uuidv4();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
}

/**
 * Get user ID if authenticated
 */
function getUserId(): string | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr) as { id?: string };
      return user.id;
    }
  } catch (error) {
    console.error('Failed to get user ID:', error);
  }

  return undefined;
}

/**
 * Hook for tracking analytics events
 */
export function useAnalytics(): AnalyticsHook {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const sessionIdRef = useRef<string>(getSessionId());

  const trackCategoryEvent = useCallback(
    async (params: TrackCategoryEventParams) => {
      try {
        const response = await fetch(`${apiUrl}/analytics/categories/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            categoryId: params.categoryId,
            eventType: params.eventType,
            productId: params.productId,
            sessionId: sessionIdRef.current,
            userId: getUserId(),
            metadata: params.metadata,
          }),
        });

        if (!response.ok) {
          console.error('Failed to track event:', response.statusText);
        }
      } catch (error) {
        console.error('Error tracking event:', error);
      }
    },
    [apiUrl]
  );

  const trackCategoryView = useCallback(
    async (categoryId: string) => {
      await trackCategoryEvent({
        categoryId,
        eventType: CategoryEventType.VIEW,
      });
    },
    [trackCategoryEvent]
  );

  const trackProductClick = useCallback(
    async (categoryId: string, productId: string) => {
      await trackCategoryEvent({
        categoryId,
        eventType: CategoryEventType.PRODUCT_CLICK,
        productId,
      });
    },
    [trackCategoryEvent]
  );

  const trackFilterApplied = useCallback(
    async (categoryId: string, filters: Record<string, unknown>) => {
      await trackCategoryEvent({
        categoryId,
        eventType: CategoryEventType.FILTER_APPLIED,
        metadata: { filters },
      });
    },
    [trackCategoryEvent]
  );

  const trackSortChanged = useCallback(
    async (categoryId: string, sortBy: string) => {
      await trackCategoryEvent({
        categoryId,
        eventType: CategoryEventType.SORT_CHANGED,
        metadata: { sortBy },
      });
    },
    [trackCategoryEvent]
  );

  return {
    trackCategoryEvent,
    trackCategoryView,
    trackProductClick,
    trackFilterApplied,
    trackSortChanged,
  };
}

/**
 * Hook for tracking category page view time
 */
export function useCategoryPageTracking(categoryId: string | null): void {
  const { trackCategoryView } = useAnalytics();
  const viewTrackedRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!categoryId) return;

    // Track view on mount
    if (!viewTrackedRef.current) {
      trackCategoryView(categoryId);
      viewTrackedRef.current = true;
      startTimeRef.current = Date.now();
    }

    // Track time spent on page before unmount
    return () => {
      const timeSpent = Date.now() - startTimeRef.current;
      console.log(`Time spent on category ${categoryId}: ${timeSpent}ms`);

      // You can send this to analytics if needed
      // trackCategoryEvent({
      //   categoryId,
      //   eventType: CategoryEventType.VIEW,
      //   metadata: { timeSpent },
      // });
    };
  }, [categoryId, trackCategoryView]);
}

/**
 * Hook for tracking product impressions in category
 */
export function useProductImpressionTracking(): { observeProduct: (element: HTMLElement | null) => void; unobserveProduct: (element: HTMLElement | null) => void; trackProductClick: (categoryId: string, productId: string) => Promise<void>; } {
  const { trackProductClick } = useAnalytics();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const trackedProductsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Create Intersection Observer for product impressions
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const productId = entry.target.getAttribute('data-product-id');
            const categoryId = entry.target.getAttribute('data-category-id');

            if (productId && categoryId && !trackedProductsRef.current.has(productId)) {
              trackedProductsRef.current.add(productId);
              console.log(`Product impression: ${productId} in category ${categoryId}`);

              // You can track impressions separately or use product click when actually clicked
              // For now, we'll just log it
            }
          }
        });
      },
      {
        threshold: 0.5, // Track when 50% of product is visible
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const observeProduct = useCallback((element: HTMLElement | null) => {
    if (!element || !observerRef.current) return;
    observerRef.current.observe(element);
  }, []);

  const unobserveProduct = useCallback((element: HTMLElement | null) => {
    if (!element || !observerRef.current) return;
    observerRef.current.unobserve(element);
  }, []);

  return {
    observeProduct,
    unobserveProduct,
    trackProductClick,
  };
}
