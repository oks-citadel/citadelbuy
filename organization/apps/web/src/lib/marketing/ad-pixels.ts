/**
 * Ad Tracking Pixels Integration
 * Support for multiple advertising platforms
 */

import { CURRENCY } from './config';
import { hasMarketingConsent } from './consent';

// ============================================================================
// Twitter/X Pixel
// ============================================================================

declare global {
  interface Window {
    twq: (...args: unknown[]) => void;
  }
}

export function initTwitterPixel(pixelId: string): void {
  if (typeof window === 'undefined') return;

  (window as any).twq = (window as any).twq || function (...args: unknown[]) {
    ((window as any).twq.exe ? (window as any).twq.exe.apply(window, args) : (window as any).twq.queue.push(args));
  };
  (window as any).twq.version = '1.1';
  (window as any).twq.queue = [];

  window.twq('config', pixelId);
}

export function twTrackPageView(): void {
  if (typeof window === 'undefined' || !window.twq || !hasMarketingConsent()) return;
  window.twq('track', 'PageView');
}

export function twTrackPurchase(
  value: number,
  currency: string = CURRENCY,
  contentIds?: string[],
  numItems?: number
): void {
  if (typeof window === 'undefined' || !window.twq || !hasMarketingConsent()) return;
  window.twq('track', 'Purchase', {
    value,
    currency,
    content_ids: contentIds,
    num_items: numItems,
  });
}

export function twTrackAddToCart(
  value?: number,
  contentIds?: string[]
): void {
  if (typeof window === 'undefined' || !window.twq || !hasMarketingConsent()) return;
  window.twq('track', 'AddToCart', {
    value,
    currency: CURRENCY,
    content_ids: contentIds,
  });
}

export function twTrackSignUp(): void {
  if (typeof window === 'undefined' || !window.twq || !hasMarketingConsent()) return;
  window.twq('track', 'CompleteRegistration');
}

// ============================================================================
// LinkedIn Insight Tag
// ============================================================================

declare global {
  interface Window {
    lintrk: (action: string, data?: Record<string, unknown>) => void;
    _linkedin_data_partner_ids: string[];
  }
}

export function initLinkedInInsight(partnerId: string): void {
  if (typeof window === 'undefined') return;

  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  window._linkedin_data_partner_ids.push(partnerId);

  window.lintrk = window.lintrk || function (action: string, data?: Record<string, unknown>) {
    (window as any)._lintrk = (window as any)._lintrk || [];
    (window as any)._lintrk.push([action, data]);
  };
}

export function liTrackConversion(conversionId: string): void {
  if (typeof window === 'undefined' || !window.lintrk || !hasMarketingConsent()) return;
  window.lintrk('track', { conversion_id: conversionId });
}

// ============================================================================
// Pinterest Tag
// ============================================================================

declare global {
  interface Window {
    pintrk: (...args: unknown[]) => void;
  }
}

export function initPinterestTag(tagId: string): void {
  if (typeof window === 'undefined') return;

  (window as any).pintrk = (window as any).pintrk || function (...args: unknown[]) {
    ((window as any).pintrk.queue = (window as any).pintrk.queue || []).push(args);
  };

  window.pintrk('load', tagId);
  window.pintrk('page');
}

export function pinTrackPageVisit(): void {
  if (typeof window === 'undefined' || !window.pintrk || !hasMarketingConsent()) return;
  window.pintrk('track', 'pagevisit');
}

export function pinTrackViewCategory(categoryName: string): void {
  if (typeof window === 'undefined' || !window.pintrk || !hasMarketingConsent()) return;
  window.pintrk('track', 'viewcategory', {
    category: categoryName,
  });
}

export function pinTrackSearch(searchQuery: string): void {
  if (typeof window === 'undefined' || !window.pintrk || !hasMarketingConsent()) return;
  window.pintrk('track', 'search', {
    search_query: searchQuery,
  });
}

export function pinTrackAddToCart(
  productId: string,
  productName: string,
  value: number,
  quantity: number = 1
): void {
  if (typeof window === 'undefined' || !window.pintrk || !hasMarketingConsent()) return;
  window.pintrk('track', 'addtocart', {
    product_id: productId,
    product_name: productName,
    value,
    order_quantity: quantity,
    currency: CURRENCY,
  });
}

export function pinTrackCheckout(
  productIds: string[],
  value: number,
  quantity: number
): void {
  if (typeof window === 'undefined' || !window.pintrk || !hasMarketingConsent()) return;
  window.pintrk('track', 'checkout', {
    product_id: productIds,
    value,
    order_quantity: quantity,
    currency: CURRENCY,
  });
}

export function pinTrackPurchase(
  orderId: string,
  value: number,
  productIds: string[],
  quantity: number
): void {
  if (typeof window === 'undefined' || !window.pintrk || !hasMarketingConsent()) return;
  window.pintrk('track', 'checkout', {
    order_id: orderId,
    value,
    product_id: productIds,
    order_quantity: quantity,
    currency: CURRENCY,
  });
}

export function pinTrackSignup(): void {
  if (typeof window === 'undefined' || !window.pintrk || !hasMarketingConsent()) return;
  window.pintrk('track', 'signup');
}

export function pinTrackLead(): void {
  if (typeof window === 'undefined' || !window.pintrk || !hasMarketingConsent()) return;
  window.pintrk('track', 'lead');
}

// ============================================================================
// TikTok Pixel
// ============================================================================

declare global {
  interface Window {
    ttq: {
      track: (eventName: string, data?: Record<string, unknown>) => void;
      page: () => void;
      identify: (data: Record<string, unknown>) => void;
    };
  }
}

export function initTikTokPixel(pixelId: string): void {
  if (typeof window === 'undefined') return;

  (window as any).ttq = (window as any).ttq || {
    _i: {},
    _o: pixelId,
    _s: 1,
  };

  const methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
  methods.forEach((method) => {
    (window as any).ttq[method] = (function (m) {
      return function (...args: unknown[]) {
        (window as any).ttq._q = (window as any).ttq._q || [];
        (window as any).ttq._q.push([m, args]);
      };
    })(method);
  });

  (window as any).ttq._i = (window as any).ttq._i || {};
  (window as any).ttq._i[pixelId] = [];
  (window as any).ttq.instances = function () {
    return Object.keys((window as any).ttq._i);
  };
}

export function ttqTrackPageView(): void {
  if (typeof window === 'undefined' || !window.ttq || !hasMarketingConsent()) return;
  window.ttq.page();
}

export function ttqTrackViewContent(
  contentId: string,
  contentName: string,
  contentType: string,
  value?: number
): void {
  if (typeof window === 'undefined' || !window.ttq || !hasMarketingConsent()) return;
  window.ttq.track('ViewContent', {
    content_id: contentId,
    content_name: contentName,
    content_type: contentType,
    value,
    currency: CURRENCY,
  });
}

export function ttqTrackAddToCart(
  contentId: string,
  contentName: string,
  value: number,
  quantity: number = 1
): void {
  if (typeof window === 'undefined' || !window.ttq || !hasMarketingConsent()) return;
  window.ttq.track('AddToCart', {
    content_id: contentId,
    content_name: contentName,
    value,
    quantity,
    currency: CURRENCY,
  });
}

export function ttqTrackInitiateCheckout(
  value: number,
  contentIds: string[]
): void {
  if (typeof window === 'undefined' || !window.ttq || !hasMarketingConsent()) return;
  window.ttq.track('InitiateCheckout', {
    value,
    currency: CURRENCY,
    contents: contentIds.map((id) => ({ content_id: id })),
  });
}

export function ttqTrackCompletePayment(
  orderId: string,
  value: number,
  contentIds: string[]
): void {
  if (typeof window === 'undefined' || !window.ttq || !hasMarketingConsent()) return;
  window.ttq.track('CompletePayment', {
    value,
    currency: CURRENCY,
    contents: contentIds.map((id) => ({ content_id: id })),
  });
}

export function ttqTrackCompleteRegistration(): void {
  if (typeof window === 'undefined' || !window.ttq || !hasMarketingConsent()) return;
  window.ttq.track('CompleteRegistration');
}

export function ttqTrackSearch(searchString: string): void {
  if (typeof window === 'undefined' || !window.ttq || !hasMarketingConsent()) return;
  window.ttq.track('Search', {
    query: searchString,
  });
}

export function ttqIdentifyUser(email?: string, phone?: string, externalId?: string): void {
  if (typeof window === 'undefined' || !window.ttq || !hasMarketingConsent()) return;
  window.ttq.identify({
    email,
    phone_number: phone,
    external_id: externalId,
  });
}

// ============================================================================
// Unified Tracking Helper
// ============================================================================

export interface UnifiedTrackingData {
  event: string;
  value?: number;
  currency?: string;
  items?: Array<{
    id: string;
    name: string;
    price?: number;
    quantity?: number;
    category?: string;
  }>;
  orderId?: string;
  searchQuery?: string;
}

/**
 * Track event across all enabled ad platforms
 */
export function trackAcrossAllPlatforms(data: UnifiedTrackingData): void {
  if (!hasMarketingConsent()) return;

  const { event, value, items, orderId, searchQuery } = data;
  const itemIds = items?.map((i) => i.id) || [];
  const totalQuantity = items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0;

  switch (event) {
    case 'page_view':
      twTrackPageView();
      pinTrackPageVisit();
      ttqTrackPageView();
      break;

    case 'view_item':
      if (items?.[0]) {
        ttqTrackViewContent(
          items[0].id,
          items[0].name,
          items[0].category || 'product',
          value
        );
      }
      break;

    case 'add_to_cart':
      twTrackAddToCart(value, itemIds);
      if (items?.[0]) {
        pinTrackAddToCart(items[0].id, items[0].name, value || 0, items[0].quantity);
        ttqTrackAddToCart(items[0].id, items[0].name, value || 0, items[0].quantity);
      }
      break;

    case 'begin_checkout':
      pinTrackCheckout(itemIds, value || 0, totalQuantity);
      ttqTrackInitiateCheckout(value || 0, itemIds);
      break;

    case 'purchase':
      twTrackPurchase(value || 0, CURRENCY, itemIds, totalQuantity);
      pinTrackPurchase(orderId || '', value || 0, itemIds, totalQuantity);
      ttqTrackCompletePayment(orderId || '', value || 0, itemIds);
      break;

    case 'sign_up':
      twTrackSignUp();
      pinTrackSignup();
      ttqTrackCompleteRegistration();
      break;

    case 'search':
      if (searchQuery) {
        pinTrackSearch(searchQuery);
        ttqTrackSearch(searchQuery);
      }
      break;

    case 'lead':
      pinTrackLead();
      break;
  }
}
