/**
 * Google Analytics Integration
 * Provides utilities for tracking user behavior with Google Analytics 4
 */

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_TRACKING_ID;

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

/**
 * Initialize Google Analytics
 */
export function initGA(): void {
  if (!GA_TRACKING_ID) {
    console.warn('Google Analytics tracking ID not configured');
    return;
  }

  // Load gtag.js script
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
  script.async = true;
  document.head.appendChild(script);

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_TRACKING_ID, {
    send_page_view: false, // We'll manually track page views
  });
}

/**
 * Track page view
 */
export function trackPageView(url: string, title?: string): void {
  if (!GA_TRACKING_ID || typeof window.gtag !== 'function') return;

  window.gtag('event', 'page_view', {
    page_path: url,
    page_title: title || document.title,
  });
}

/**
 * Track custom event
 */
export interface EventParams {
  category?: string;
  label?: string;
  value?: number;
  [key: string]: any;
}

export function trackEvent(action: string, params?: EventParams): void {
  if (!GA_TRACKING_ID || typeof window.gtag !== 'function') return;

  window.gtag('event', action, {
    event_category: params?.category,
    event_label: params?.label,
    value: params?.value,
    ...params,
  });
}

/**
 * E-commerce tracking
 */

export interface ProductData {
  id: string;
  name: string;
  category?: string;
  brand?: string;
  variant?: string;
  price: number;
  quantity?: number;
}

export interface TransactionData {
  transactionId: string;
  value: number;
  tax?: number;
  shipping?: number;
  currency?: string;
  coupon?: string;
  items: ProductData[];
}

/**
 * Track product view
 */
export function trackProductView(product: ProductData): void {
  if (!GA_TRACKING_ID || typeof window.gtag !== 'function') return;

  window.gtag('event', 'view_item', {
    currency: 'USD',
    value: product.price,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        item_brand: product.brand,
        item_variant: product.variant,
        price: product.price,
        quantity: 1,
      },
    ],
  });
}

/**
 * Track add to cart
 */
export function trackAddToCart(product: ProductData): void {
  if (!GA_TRACKING_ID || typeof window.gtag !== 'function') return;

  window.gtag('event', 'add_to_cart', {
    currency: 'USD',
    value: product.price * (product.quantity || 1),
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        item_brand: product.brand,
        price: product.price,
        quantity: product.quantity || 1,
      },
    ],
  });
}

/**
 * Track remove from cart
 */
export function trackRemoveFromCart(product: ProductData): void {
  if (!GA_TRACKING_ID || typeof window.gtag !== 'function') return;

  window.gtag('event', 'remove_from_cart', {
    currency: 'USD',
    value: product.price * (product.quantity || 1),
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        quantity: product.quantity || 1,
      },
    ],
  });
}

/**
 * Track begin checkout
 */
export function trackBeginCheckout(items: ProductData[], value: number): void {
  if (!GA_TRACKING_ID || typeof window.gtag !== 'function') return;

  window.gtag('event', 'begin_checkout', {
    currency: 'USD',
    value,
    items: items.map((item) => ({
      item_id: item.id,
      item_name: item.name,
      item_category: item.category,
      item_brand: item.brand,
      price: item.price,
      quantity: item.quantity || 1,
    })),
  });
}

/**
 * Track purchase/transaction
 */
export function trackPurchase(transaction: TransactionData): void {
  if (!GA_TRACKING_ID || typeof window.gtag !== 'function') return;

  window.gtag('event', 'purchase', {
    transaction_id: transaction.transactionId,
    value: transaction.value,
    tax: transaction.tax || 0,
    shipping: transaction.shipping || 0,
    currency: transaction.currency || 'USD',
    coupon: transaction.coupon,
    items: transaction.items.map((item) => ({
      item_id: item.id,
      item_name: item.name,
      item_category: item.category,
      item_brand: item.brand,
      item_variant: item.variant,
      price: item.price,
      quantity: item.quantity || 1,
    })),
  });
}

/**
 * Track search
 */
export function trackSearch(searchTerm: string, resultsCount?: number): void {
  if (!GA_TRACKING_ID || typeof window.gtag !== 'function') return;

  window.gtag('event', 'search', {
    search_term: searchTerm,
    results_count: resultsCount,
  });
}

/**
 * Track user signup
 */
export function trackSignUp(method?: string): void {
  if (!GA_TRACKING_ID || typeof window.gtag !== 'function') return;

  window.gtag('event', 'sign_up', {
    method: method || 'email',
  });
}

/**
 * Track user login
 */
export function trackLogin(method?: string): void {
  if (!GA_TRACKING_ID || typeof window.gtag !== 'function') return;

  window.gtag('event', 'login', {
    method: method || 'email',
  });
}

/**
 * Set user ID for tracking
 */
export function setUserId(userId: string): void {
  if (!GA_TRACKING_ID || typeof window.gtag !== 'function') return;

  window.gtag('config', GA_TRACKING_ID, {
    user_id: userId,
  });
}

/**
 * Set user properties
 */
export function setUserProperties(properties: Record<string, any>): void {
  if (!GA_TRACKING_ID || typeof window.gtag !== 'function') return;

  window.gtag('set', 'user_properties', properties);
}
