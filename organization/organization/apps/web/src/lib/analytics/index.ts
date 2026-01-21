/**
 * Analytics Library - Central Export
 *
 * Provides comprehensive analytics tracking capabilities including:
 * - Google Analytics 4 integration
 * - Facebook Pixel tracking
 * - Internal analytics API
 * - Event tracking utilities
 */

// Google Analytics
export * from './google-analytics';

// Event Tracker
export * from './event-tracker';

// Re-export commonly used functions for convenience
export {
  initGA,
  trackPageView as gaPageView,
  trackEvent as gaEvent,
  trackProductView as gaProductView,
  trackAddToCart as gaAddToCart,
  trackPurchase as gaPurchase,
  trackSearch as gaSearch,
} from './google-analytics';

export {
  EventType,
  trackEvent,
  trackPageView,
  trackProductView,
  trackAddToCart,
  trackRemoveFromCart,
  trackBeginCheckout,
  trackPurchase,
  trackSearch,
  trackSignUp,
  trackLogin,
  trackCategoryView,
  trackCategoryProductClick,
  trackFilterApplied,
  trackSortChanged,
  trackWishlistAdd,
  trackWishlistRemove,
  trackShare,
  trackReviewSubmit,
} from './event-tracker';
