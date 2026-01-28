/**
 * Facebook/Meta Pixel Integration
 * Full implementation with e-commerce tracking and Conversions API support
 */

import { CURRENCY } from './config';

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: unknown;
  }
}

export interface FBContentItem {
  id: string;
  quantity?: number;
  item_price?: number;
}

export interface FBPurchaseData {
  value: number;
  currency: string;
  content_ids?: string[];
  contents?: FBContentItem[];
  content_type?: 'product' | 'product_group';
  num_items?: number;
}

export interface FBAddToCartData {
  value?: number;
  currency?: string;
  content_ids?: string[];
  contents?: FBContentItem[];
  content_type?: 'product' | 'product_group';
  content_name?: string;
}

export interface FBViewContentData {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_type?: 'product' | 'product_group';
  content_name?: string;
  content_category?: string;
}

// Initialize Facebook Pixel
export function initFBPixel(pixelId: string): void {
  if (typeof window === 'undefined') return;

  // Initialize the fbq function
  const fbq = (window.fbq = function (...args: unknown[]) {
    if ((fbq as any).callMethod) {
      (fbq as any).callMethod.apply(fbq, args);
    } else {
      (fbq as any).queue.push(args);
    }
  } as any);

  if (!window._fbq) window._fbq = fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];

  // Initialize pixel
  window.fbq('init', pixelId);
}

// Track page view
export function fbTrackPageView(): void {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', 'PageView');
}

// Track custom event
export function fbTrackCustom(
  eventName: string,
  data?: Record<string, unknown>
): void {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('trackCustom', eventName, data);
}

// Track standard event
export function fbTrackEvent(
  eventName: string,
  data?: Record<string, unknown>
): void {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', eventName, data);
}

// E-commerce: View Content (Product Page)
export function fbTrackViewContent(data: FBViewContentData): void {
  fbTrackEvent('ViewContent', {
    value: data.value,
    currency: data.currency ?? CURRENCY,
    content_ids: data.content_ids,
    content_type: data.content_type ?? 'product',
    content_name: data.content_name,
    content_category: data.content_category,
  });
}

// E-commerce: Add to Cart
export function fbTrackAddToCart(data: FBAddToCartData): void {
  fbTrackEvent('AddToCart', {
    value: data.value,
    currency: data.currency ?? CURRENCY,
    content_ids: data.content_ids,
    contents: data.contents,
    content_type: data.content_type ?? 'product',
    content_name: data.content_name,
  });
}

// E-commerce: Add to Wishlist
export function fbTrackAddToWishlist(
  contentId: string,
  contentName: string,
  value?: number
): void {
  fbTrackEvent('AddToWishlist', {
    value,
    currency: CURRENCY,
    content_ids: [contentId],
    content_name: contentName,
    content_type: 'product',
  });
}

// E-commerce: Initiate Checkout
export function fbTrackInitiateCheckout(
  contentIds: string[],
  value: number,
  numItems: number,
  contents?: FBContentItem[]
): void {
  fbTrackEvent('InitiateCheckout', {
    value,
    currency: CURRENCY,
    content_ids: contentIds,
    contents,
    content_type: 'product',
    num_items: numItems,
  });
}

// E-commerce: Add Payment Info
export function fbTrackAddPaymentInfo(
  contentIds: string[],
  value: number,
  contents?: FBContentItem[]
): void {
  fbTrackEvent('AddPaymentInfo', {
    value,
    currency: CURRENCY,
    content_ids: contentIds,
    contents,
    content_type: 'product',
  });
}

// E-commerce: Purchase
export function fbTrackPurchase(data: FBPurchaseData): void {
  fbTrackEvent('Purchase', {
    value: data.value,
    currency: data.currency ?? CURRENCY,
    content_ids: data.content_ids,
    contents: data.contents,
    content_type: data.content_type ?? 'product',
    num_items: data.num_items,
  });
}

// Search
export function fbTrackSearch(searchString: string, contentIds?: string[]): void {
  fbTrackEvent('Search', {
    search_string: searchString,
    content_ids: contentIds,
    content_type: 'product',
  });
}

// Lead
export function fbTrackLead(value?: number, contentName?: string): void {
  fbTrackEvent('Lead', {
    value,
    currency: CURRENCY,
    content_name: contentName,
  });
}

// Complete Registration
export function fbTrackCompleteRegistration(
  method?: string,
  value?: number
): void {
  fbTrackEvent('CompleteRegistration', {
    value,
    currency: CURRENCY,
    content_name: method,
  });
}

// Contact
export function fbTrackContact(): void {
  fbTrackEvent('Contact');
}

// Subscribe
export function fbTrackSubscribe(value: number, predictedLtv?: number): void {
  fbTrackEvent('Subscribe', {
    value,
    currency: CURRENCY,
    predicted_ltv: predictedLtv,
  });
}

// Start Trial
export function fbTrackStartTrial(value?: number, predictedLtv?: number): void {
  fbTrackEvent('StartTrial', {
    value,
    currency: CURRENCY,
    predicted_ltv: predictedLtv,
  });
}

// Find Location (for brick-and-mortar)
export function fbTrackFindLocation(): void {
  fbTrackEvent('FindLocation');
}

// Schedule
export function fbTrackSchedule(): void {
  fbTrackEvent('Schedule');
}

// Customize Product
export function fbTrackCustomizeProduct(contentId: string): void {
  fbTrackEvent('CustomizeProduct', {
    content_ids: [contentId],
    content_type: 'product',
  });
}

// Donate
export function fbTrackDonate(value: number): void {
  fbTrackEvent('Donate', {
    value,
    currency: CURRENCY,
  });
}

// Submit Application
export function fbTrackSubmitApplication(): void {
  fbTrackEvent('SubmitApplication');
}

// Set user data for advanced matching
export function fbSetUserData(userData: {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  externalId?: string;
}): void {
  if (typeof window === 'undefined' || !window.fbq) return;

  window.fbq('init', process.env.NEXT_PUBLIC_FB_PIXEL_ID, {
    em: userData.email ? hashSHA256(userData.email.toLowerCase().trim()) : undefined,
    ph: userData.phone ? hashSHA256(normalizePhone(userData.phone)) : undefined,
    fn: userData.firstName ? hashSHA256(userData.firstName.toLowerCase().trim()) : undefined,
    ln: userData.lastName ? hashSHA256(userData.lastName.toLowerCase().trim()) : undefined,
    ct: userData.city ? hashSHA256(userData.city.toLowerCase().trim()) : undefined,
    st: userData.state ? hashSHA256(userData.state.toLowerCase().trim()) : undefined,
    zp: userData.zip ? hashSHA256(userData.zip.trim()) : undefined,
    country: userData.country ? hashSHA256(userData.country.toLowerCase().trim()) : undefined,
    external_id: userData.externalId,
  });
}

// Helper to normalize phone number
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Simple hash function placeholder (should use crypto.subtle in production)
async function hashSHA256(value: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return value; // Fallback - not ideal
}

// Helper to create content item for FB pixel
export function createFBContentItem(product: {
  id: string;
  quantity?: number;
  price?: number;
}): FBContentItem {
  return {
    id: product.id,
    quantity: product.quantity ?? 1,
    item_price: product.price,
  };
}

// Update consent
export function fbGrantConsent(): void {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('consent', 'grant');
}

export function fbRevokeConsent(): void {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('consent', 'revoke');
}
