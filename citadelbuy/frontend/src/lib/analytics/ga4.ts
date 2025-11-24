/**
 * Google Analytics 4 Event Tracking
 * Provides type-safe GA4 event tracking for e-commerce and user actions
 */

import { pushToDataLayer } from './dataLayer';

// GA4 Event Names (following GA4 recommended events)
export const GA4Events = {
  // Registration & Authentication
  BEGIN_REGISTRATION: 'begin_registration',
  COMPLETE_REGISTRATION: 'sign_up',
  EMAIL_VERIFIED: 'email_verified',
  PROFILE_COMPLETE: 'profile_complete',
  LOGIN: 'login',

  // User Engagement
  FIRST_MATCH: 'first_match',
  FIRST_MESSAGE: 'first_message',
  VIEW_PROFILE: 'view_profile',
  SEND_MESSAGE: 'send_message',

  // Premium Features
  VIEW_PREMIUM: 'view_premium_features',
  BEGIN_CHECKOUT: 'begin_checkout',
  ADD_PAYMENT_INFO: 'add_payment_info',
  PURCHASE: 'purchase',

  // E-commerce Events
  VIEW_ITEM: 'view_item',
  ADD_TO_CART: 'add_to_cart',
  REMOVE_FROM_CART: 'remove_from_cart',
  VIEW_CART: 'view_cart',

  // Search & Discovery
  SEARCH: 'search',
  VIEW_SEARCH_RESULTS: 'view_search_results',

  // Page Views
  PAGE_VIEW: 'page_view',

  // Custom Events
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  SUBSCRIPTION_RENEWED: 'subscription_renewed',
} as const;

export type GA4EventName = typeof GA4Events[keyof typeof GA4Events];

export interface GA4EventParams {
  // E-commerce parameters
  transaction_id?: string;
  value?: number;
  currency?: string;
  tax?: number;
  shipping?: number;
  items?: GA4Item[];

  // User parameters
  user_id?: string;
  method?: string;

  // Content parameters
  content_type?: string;
  item_id?: string;

  // Search parameters
  search_term?: string;

  // Custom parameters
  [key: string]: any;
}

export interface GA4Item {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_category2?: string;
  item_category3?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
  currency?: string;
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

/**
 * Track a GA4 event
 * @param eventName - The name of the event (use GA4Events constants)
 * @param params - Event parameters
 */
export const trackGA4Event = (
  eventName: string,
  params?: GA4EventParams
): void => {
  if (typeof window !== 'undefined') {
    // Method 1: Using gtag (if available)
    if (window.gtag) {
      window.gtag('event', eventName, params);
    }

    // Method 2: Using dataLayer (fallback)
    pushToDataLayer({
      event: eventName,
      ...params,
    });

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[GA4] Event tracked:', eventName, params);
    }
  }
};

/**
 * Track user registration start
 */
export const trackRegistrationStart = (): void => {
  trackGA4Event(GA4Events.BEGIN_REGISTRATION, {
    method: 'email',
  });
};

/**
 * Track user registration completion
 * @param userId - The user's ID
 * @param method - Registration method (email, google, etc.)
 */
export const trackRegistrationComplete = (userId: string, method: string = 'email'): void => {
  trackGA4Event(GA4Events.COMPLETE_REGISTRATION, {
    user_id: userId,
    method,
  });
};

/**
 * Track email verification
 * @param userId - The user's ID
 */
export const trackEmailVerified = (userId: string): void => {
  trackGA4Event(GA4Events.EMAIL_VERIFIED, {
    user_id: userId,
  });
};

/**
 * Track profile completion
 * @param userId - The user's ID
 */
export const trackProfileComplete = (userId: string): void => {
  trackGA4Event(GA4Events.PROFILE_COMPLETE, {
    user_id: userId,
  });
};

/**
 * Track login
 * @param userId - The user's ID
 * @param method - Login method
 */
export const trackLogin = (userId: string, method: string = 'email'): void => {
  trackGA4Event(GA4Events.LOGIN, {
    user_id: userId,
    method,
  });
};

/**
 * Track purchase/subscription
 * @param transactionId - Transaction ID
 * @param value - Total value
 * @param currency - Currency code (default: USD)
 * @param items - Purchased items
 */
export const trackPurchase = (
  transactionId: string,
  value: number,
  currency: string = 'USD',
  items?: GA4Item[]
): void => {
  trackGA4Event(GA4Events.PURCHASE, {
    transaction_id: transactionId,
    value,
    currency,
    items,
  });
};

/**
 * Track product view
 * @param item - Product item
 */
export const trackViewItem = (item: GA4Item): void => {
  trackGA4Event(GA4Events.VIEW_ITEM, {
    currency: item.currency || 'USD',
    value: item.price,
    items: [item],
  });
};

/**
 * Track add to cart
 * @param item - Product item
 */
export const trackAddToCart = (item: GA4Item): void => {
  trackGA4Event(GA4Events.ADD_TO_CART, {
    currency: item.currency || 'USD',
    value: item.price,
    items: [item],
  });
};

/**
 * Track search
 * @param searchTerm - The search query
 */
export const trackSearch = (searchTerm: string): void => {
  trackGA4Event(GA4Events.SEARCH, {
    search_term: searchTerm,
  });
};

/**
 * Set user ID for tracking
 * @param userId - The user's ID
 */
export const setUserId = (userId: string): void => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || '', {
      user_id: userId,
    });
  }
};

/**
 * Set user properties
 * @param properties - User properties to set
 */
export const setUserProperties = (properties: Record<string, any>): void => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('set', 'user_properties', properties);
  }
};
