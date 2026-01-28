/**
 * Universal Event Tracker
 * Sends events to both internal analytics API and external services (GA, FB Pixel, etc.)
 */

import * as GA from './google-analytics';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export enum EventType {
  // Page Events
  PAGE_VIEW = 'page_view',

  // Product Events
  PRODUCT_VIEW = 'product_view',
  PRODUCT_LIST_VIEW = 'product_list_view',
  PRODUCT_IMPRESSION = 'product_impression',

  // Cart Events
  ADD_TO_CART = 'add_to_cart',
  REMOVE_FROM_CART = 'remove_from_cart',
  VIEW_CART = 'view_cart',

  // Checkout Events
  BEGIN_CHECKOUT = 'begin_checkout',
  ADD_SHIPPING_INFO = 'add_shipping_info',
  ADD_PAYMENT_INFO = 'add_payment_info',
  PURCHASE = 'purchase',

  // User Events
  SIGN_UP = 'sign_up',
  LOGIN = 'login',
  LOGOUT = 'logout',

  // Search Events
  SEARCH = 'search',
  FILTER_APPLIED = 'filter_applied',
  SORT_CHANGED = 'sort_changed',

  // Category Events
  CATEGORY_VIEW = 'category_view',
  CATEGORY_PRODUCT_CLICK = 'category_product_click',

  // Engagement Events
  WISHLIST_ADD = 'wishlist_add',
  WISHLIST_REMOVE = 'wishlist_remove',
  SHARE = 'share',
  REVIEW_SUBMIT = 'review_submit',
}

export interface EventData {
  eventType: EventType;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}

/**
 * Generate or retrieve session ID
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  const SESSION_KEY = 'analytics_session_id';
  let sessionId = sessionStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
}

/**
 * Get user ID from localStorage
 */
function getUserId(): string | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id;
    }
  } catch (error) {
    console.error('Failed to get user ID:', error);
  }

  return undefined;
}

/**
 * Track event to internal API
 */
async function trackToInternalAPI(event: EventData): Promise<void> {
  try {
    await fetch(`${API_URL}/analytics/events/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.error('Failed to track event to internal API:', error);
  }
}

/**
 * Track event to Google Analytics
 */
function trackToGA(event: EventData): void {
  switch (event.eventType) {
    case EventType.PAGE_VIEW:
      GA.trackPageView(event.properties?.url || window.location.pathname);
      break;

    case EventType.PRODUCT_VIEW:
      if (event.properties?.product) {
        GA.trackProductView(event.properties.product);
      }
      break;

    case EventType.ADD_TO_CART:
      if (event.properties?.product) {
        GA.trackAddToCart(event.properties.product);
      }
      break;

    case EventType.REMOVE_FROM_CART:
      if (event.properties?.product) {
        GA.trackRemoveFromCart(event.properties.product);
      }
      break;

    case EventType.BEGIN_CHECKOUT:
      if (event.properties?.items && event.properties?.value) {
        GA.trackBeginCheckout(event.properties.items, event.properties.value);
      }
      break;

    case EventType.PURCHASE:
      if (event.properties?.transaction) {
        GA.trackPurchase(event.properties.transaction);
      }
      break;

    case EventType.SEARCH:
      if (event.properties?.searchTerm) {
        GA.trackSearch(event.properties.searchTerm, event.properties.resultsCount);
      }
      break;

    case EventType.SIGN_UP:
      GA.trackSignUp(event.properties?.method);
      break;

    case EventType.LOGIN:
      GA.trackLogin(event.properties?.method);
      break;

    default:
      GA.trackEvent(event.eventType, event.properties);
  }
}

/**
 * Track event to Facebook Pixel (if configured)
 */
function trackToFBPixel(event: EventData): void {
  if (typeof window === 'undefined') return;

  const fbPixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
  if (!fbPixelId || !(window as any).fbq) return;

  const fbq = (window as any).fbq;

  switch (event.eventType) {
    case EventType.PAGE_VIEW:
      fbq('track', 'PageView');
      break;

    case EventType.PRODUCT_VIEW:
      fbq('track', 'ViewContent', {
        content_ids: [event.properties?.product?.id],
        content_type: 'product',
        value: event.properties?.product?.price,
        currency: 'USD',
      });
      break;

    case EventType.ADD_TO_CART:
      fbq('track', 'AddToCart', {
        content_ids: [event.properties?.product?.id],
        content_type: 'product',
        value: event.properties?.product?.price,
        currency: 'USD',
      });
      break;

    case EventType.BEGIN_CHECKOUT:
      fbq('track', 'InitiateCheckout', {
        value: event.properties?.value,
        currency: 'USD',
      });
      break;

    case EventType.PURCHASE:
      fbq('track', 'Purchase', {
        value: event.properties?.transaction?.value,
        currency: 'USD',
      });
      break;

    case EventType.SEARCH:
      fbq('track', 'Search', {
        search_string: event.properties?.searchTerm,
      });
      break;
  }
}

/**
 * Main event tracking function
 * Sends events to all configured analytics services
 */
export async function trackEvent(eventType: EventType, properties?: Record<string, any>): Promise<void> {
  const event: EventData = {
    eventType,
    userId: getUserId(),
    sessionId: getSessionId(),
    properties,
    timestamp: new Date(),
  };

  // Track to internal API (async, don't wait)
  trackToInternalAPI(event).catch(console.error);

  // Track to Google Analytics
  trackToGA(event);

  // Track to Facebook Pixel
  trackToFBPixel(event);
}

/**
 * Convenience functions for common events
 */

export function trackPageView(url?: string, title?: string): void {
  trackEvent(EventType.PAGE_VIEW, {
    url: url || window.location.pathname,
    title: title || document.title,
    referrer: document.referrer,
  });
}

export function trackProductView(product: {
  id: string;
  name: string;
  price: number;
  category?: string;
  brand?: string;
}): void {
  trackEvent(EventType.PRODUCT_VIEW, { product });
}

export function trackAddToCart(product: {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}): void {
  trackEvent(EventType.ADD_TO_CART, { product });
}

export function trackRemoveFromCart(product: {
  id: string;
  name: string;
  price: number;
  quantity: number;
}): void {
  trackEvent(EventType.REMOVE_FROM_CART, { product });
}

export function trackBeginCheckout(items: any[], value: number): void {
  trackEvent(EventType.BEGIN_CHECKOUT, { items, value });
}

export function trackPurchase(transaction: {
  transactionId: string;
  value: number;
  tax?: number;
  shipping?: number;
  items: any[];
}): void {
  trackEvent(EventType.PURCHASE, { transaction });
}

export function trackSearch(searchTerm: string, resultsCount?: number, filters?: any): void {
  trackEvent(EventType.SEARCH, { searchTerm, resultsCount, filters });
}

export function trackSignUp(method?: string): void {
  trackEvent(EventType.SIGN_UP, { method: method || 'email' });
}

export function trackLogin(method?: string): void {
  trackEvent(EventType.LOGIN, { method: method || 'email' });
}

export function trackCategoryView(categoryId: string, categoryName?: string): void {
  trackEvent(EventType.CATEGORY_VIEW, { categoryId, categoryName });
}

export function trackCategoryProductClick(categoryId: string, productId: string): void {
  trackEvent(EventType.CATEGORY_PRODUCT_CLICK, { categoryId, productId });
}

export function trackFilterApplied(filters: Record<string, any>, categoryId?: string): void {
  trackEvent(EventType.FILTER_APPLIED, { filters, categoryId });
}

export function trackSortChanged(sortBy: string, categoryId?: string): void {
  trackEvent(EventType.SORT_CHANGED, { sortBy, categoryId });
}

export function trackWishlistAdd(productId: string): void {
  trackEvent(EventType.WISHLIST_ADD, { productId });
}

export function trackWishlistRemove(productId: string): void {
  trackEvent(EventType.WISHLIST_REMOVE, { productId });
}

export function trackShare(contentType: string, contentId: string, method: string): void {
  trackEvent(EventType.SHARE, { contentType, contentId, method });
}

export function trackReviewSubmit(productId: string, rating: number): void {
  trackEvent(EventType.REVIEW_SUBMIT, { productId, rating });
}
