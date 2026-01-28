/**
 * Google Analytics 4 Integration
 * Full GA4 implementation with e-commerce tracking
 */

import {
  type EcommerceEventType,
  type EcommerceEventData,
  type EcommerceItem,
  CURRENCY,
} from './config';

// Re-export types for other modules
export type { EcommerceItem };

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag: (...args: any[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataLayer: any[];
  }
}

// Initialize gtag
export function initGA(measurementId: string): void {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window.gtag = function gtag(...args: any[]) {
    window.dataLayer.push(args);
  };

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false, // We'll handle page views manually
  });
}

// Set user properties
export function setUserProperties(properties: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('set', 'user_properties', properties);
}

// Set user ID for cross-device tracking
export function setUserId(userId: string | null): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
    user_id: userId,
  });
}

// Page view tracking
export function trackPageView(url: string, title?: string): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', 'page_view', {
    page_location: url,
    page_title: title || document.title,
  });
}

// Generic event tracking
export function trackEvent(
  eventName: string,
  parameters?: Record<string, unknown>
): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', eventName, parameters);
}

// E-commerce: View Item
export function trackViewItem(item: EcommerceItem, value?: number): void {
  trackEvent('view_item', {
    currency: CURRENCY,
    value: value ?? item.price,
    items: [item],
  });
}

// E-commerce: View Item List
export function trackViewItemList(
  items: EcommerceItem[],
  listId?: string,
  listName?: string
): void {
  trackEvent('view_item_list', {
    item_list_id: listId,
    item_list_name: listName,
    items,
  });
}

// E-commerce: Select Item
export function trackSelectItem(
  item: EcommerceItem,
  listId?: string,
  listName?: string
): void {
  trackEvent('select_item', {
    item_list_id: listId,
    item_list_name: listName,
    items: [item],
  });
}

// E-commerce: Add to Cart
export function trackAddToCart(item: EcommerceItem, quantity: number = 1): void {
  const value = item.price * quantity;
  trackEvent('add_to_cart', {
    currency: CURRENCY,
    value,
    items: [{ ...item, quantity }],
  });
}

// E-commerce: Remove from Cart
export function trackRemoveFromCart(
  item: EcommerceItem,
  quantity: number = 1
): void {
  const value = item.price * quantity;
  trackEvent('remove_from_cart', {
    currency: CURRENCY,
    value,
    items: [{ ...item, quantity }],
  });
}

// E-commerce: View Cart
export function trackViewCart(items: EcommerceItem[], value: number): void {
  trackEvent('view_cart', {
    currency: CURRENCY,
    value,
    items,
  });
}

// E-commerce: Begin Checkout
export function trackBeginCheckout(
  items: EcommerceItem[],
  value: number,
  coupon?: string
): void {
  trackEvent('begin_checkout', {
    currency: CURRENCY,
    value,
    coupon,
    items,
  });
}

// E-commerce: Add Shipping Info
export function trackAddShippingInfo(
  items: EcommerceItem[],
  value: number,
  shippingTier: string,
  coupon?: string
): void {
  trackEvent('add_shipping_info', {
    currency: CURRENCY,
    value,
    coupon,
    shipping_tier: shippingTier,
    items,
  });
}

// E-commerce: Add Payment Info
export function trackAddPaymentInfo(
  items: EcommerceItem[],
  value: number,
  paymentType: string,
  coupon?: string
): void {
  trackEvent('add_payment_info', {
    currency: CURRENCY,
    value,
    coupon,
    payment_type: paymentType,
    items,
  });
}

// E-commerce: Purchase
export function trackPurchase(
  transactionId: string,
  items: EcommerceItem[],
  value: number,
  options?: {
    tax?: number;
    shipping?: number;
    coupon?: string;
    affiliation?: string;
  }
): void {
  trackEvent('purchase', {
    transaction_id: transactionId,
    currency: CURRENCY,
    value,
    tax: options?.tax,
    shipping: options?.shipping,
    coupon: options?.coupon,
    affiliation: options?.affiliation ?? 'Broxiva',
    items,
  });
}

// E-commerce: Refund
export function trackRefund(
  transactionId: string,
  value?: number,
  items?: EcommerceItem[]
): void {
  trackEvent('refund', {
    transaction_id: transactionId,
    currency: CURRENCY,
    value,
    items,
  });
}

// E-commerce: Add to Wishlist
export function trackAddToWishlist(item: EcommerceItem): void {
  trackEvent('add_to_wishlist', {
    currency: CURRENCY,
    value: item.price,
    items: [item],
  });
}

// Search tracking
export function trackSearch(searchTerm: string): void {
  trackEvent('search', {
    search_term: searchTerm,
  });
}

// Promotion tracking
export function trackViewPromotion(
  promotionId: string,
  promotionName: string,
  creativeName?: string,
  creativeSlot?: string,
  items?: EcommerceItem[]
): void {
  trackEvent('view_promotion', {
    promotion_id: promotionId,
    promotion_name: promotionName,
    creative_name: creativeName,
    creative_slot: creativeSlot,
    items,
  });
}

export function trackSelectPromotion(
  promotionId: string,
  promotionName: string,
  creativeName?: string,
  creativeSlot?: string,
  items?: EcommerceItem[]
): void {
  trackEvent('select_promotion', {
    promotion_id: promotionId,
    promotion_name: promotionName,
    creative_name: creativeName,
    creative_slot: creativeSlot,
    items,
  });
}

// User events
export function trackSignUp(method: string): void {
  trackEvent('sign_up', { method });
}

export function trackLogin(method: string): void {
  trackEvent('login', { method });
}

export function trackShare(
  method: string,
  contentType: string,
  itemId: string
): void {
  trackEvent('share', {
    method,
    content_type: contentType,
    item_id: itemId,
  });
}

export function trackGenerateLead(value?: number, currency?: string): void {
  trackEvent('generate_lead', {
    value,
    currency: currency ?? CURRENCY,
  });
}

// Custom conversion tracking
export function trackConversion(
  conversionLabel: string,
  value?: number,
  transactionId?: string
): void {
  trackEvent('conversion', {
    send_to: conversionLabel,
    value,
    currency: CURRENCY,
    transaction_id: transactionId,
  });
}

// Update consent settings
export function updateConsent(
  analyticsStorage: 'granted' | 'denied',
  adStorage: 'granted' | 'denied',
  adUserData: 'granted' | 'denied' = analyticsStorage,
  adPersonalization: 'granted' | 'denied' = adStorage
): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('consent', 'update', {
    analytics_storage: analyticsStorage,
    ad_storage: adStorage,
    ad_user_data: adUserData,
    ad_personalization: adPersonalization,
  });
}

// Helper to create EcommerceItem from product data
export function createEcommerceItem(product: {
  id: string;
  name: string;
  price: number;
  brand?: string;
  category?: string;
  variant?: string;
  quantity?: number;
  coupon?: string;
  index?: number;
  listId?: string;
  listName?: string;
}): EcommerceItem {
  return {
    item_id: product.id,
    item_name: product.name,
    price: product.price,
    item_brand: product.brand,
    item_category: product.category,
    item_variant: product.variant,
    quantity: product.quantity ?? 1,
    coupon: product.coupon,
    index: product.index,
    item_list_id: product.listId,
    item_list_name: product.listName,
  };
}
