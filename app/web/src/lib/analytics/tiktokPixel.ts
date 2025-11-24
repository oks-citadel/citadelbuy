/**
 * TikTok Pixel Event Tracking
 * Provides type-safe TikTok Pixel tracking for advertising
 */

// TikTok Pixel Standard Events
export const TikTokEvents = {
  // Registration & Authentication
  COMPLETE_REGISTRATION: 'CompleteRegistration',
  SUBMIT_FORM: 'SubmitForm',

  // E-commerce
  VIEW_CONTENT: 'ViewContent',
  ADD_TO_CART: 'AddToCart',
  INITIATE_CHECKOUT: 'InitiateCheckout',
  ADD_PAYMENT_INFO: 'AddPaymentInfo',
  COMPLETE_PAYMENT: 'CompletePayment',

  // Engagement
  SEARCH: 'Search',
  CLICK_BUTTON: 'ClickButton',
  DOWNLOAD: 'Download',
  SUBSCRIBE: 'Subscribe',
  CONTACT: 'Contact',
} as const;

export type TikTokEventName = typeof TikTokEvents[keyof typeof TikTokEvents];

export interface TikTokEventParams {
  content_id?: string;
  content_type?: string;
  content_name?: string;
  content_category?: string;
  value?: number;
  currency?: string;
  quantity?: number;
  description?: string;
  query?: string;
  [key: string]: any;
}

export interface TikTokAdvancedMatchingParams {
  email?: string; // Will be hashed
  phone_number?: string; // Will be hashed
  external_id?: string;
}

declare global {
  interface Window {
    ttq?: {
      track: (eventName: string, params?: any) => void;
      page: () => void;
      identify: (data: any) => void;
      instance: (pixelId: string) => any;
      load: (pixelId: string) => void;
      _i?: any;
    };
  }
}

/**
 * Hash a string using SHA-256
 * @param str - String to hash
 * @returns Hashed string in hex format
 */
async function hashString(str: string): Promise<string> {
  if (!str) return '';

  // Normalize: lowercase and trim
  const normalized = str.toLowerCase().trim();

  // Use Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Initialize TikTok Pixel
 * @param pixelId - TikTok Pixel ID
 */
export const initTikTokPixel = (pixelId: string): void => {
  if (typeof window === 'undefined') return;

  if (window.ttq) {
    window.ttq.load(pixelId);
    window.ttq.page();

    if (process.env.NODE_ENV === 'development') {
      console.log('[TikTok Pixel] Initialized with pixel ID:', pixelId);
    }
  }
};

/**
 * Set TikTok advanced matching data
 * @param data - Advanced matching parameters (will be hashed)
 */
export const setTikTokAdvancedMatching = async (
  data: TikTokAdvancedMatchingParams
): Promise<void> => {
  if (typeof window === 'undefined' || !window.ttq) return;

  const hashedData: any = {};

  if (data.email) {
    hashedData.sha256_email = await hashString(data.email);
  }
  if (data.phone_number) {
    // Remove all non-numeric characters
    const phoneDigits = data.phone_number.replace(/\D/g, '');
    hashedData.sha256_phone_number = await hashString(phoneDigits);
  }
  if (data.external_id) {
    hashedData.external_id = data.external_id;
  }

  window.ttq.identify(hashedData);

  if (process.env.NODE_ENV === 'development') {
    console.log('[TikTok Pixel] Advanced matching set');
  }
};

/**
 * Track a TikTok Pixel event
 * @param eventName - The name of the event (use TikTokEvents constants)
 * @param params - Event parameters
 */
export const trackTikTokEvent = (
  eventName: string,
  params?: TikTokEventParams
): void => {
  if (typeof window !== 'undefined' && window.ttq) {
    window.ttq.track(eventName, params);

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[TikTok Pixel] Event tracked:', eventName, params);
    }
  }
};

/**
 * Track registration completion
 * @param params - Registration parameters
 */
export const trackTikTokRegistration = (params?: {
  value?: number;
  currency?: string;
  content_name?: string;
}): void => {
  trackTikTokEvent(TikTokEvents.COMPLETE_REGISTRATION, {
    content_name: params?.content_name || 'User Registration',
    value: params?.value || 0,
    currency: params?.currency || 'USD',
  });
};

/**
 * Track form submission
 * @param formName - Name of the form
 */
export const trackTikTokFormSubmit = (formName: string): void => {
  trackTikTokEvent(TikTokEvents.SUBMIT_FORM, {
    content_name: formName,
  });
};

/**
 * Track purchase
 * @param value - Purchase value
 * @param currency - Currency code
 * @param contentId - Product ID
 * @param contentName - Product name
 */
export const trackTikTokPurchase = (
  value: number,
  currency: string = 'USD',
  contentId?: string,
  contentName?: string
): void => {
  trackTikTokEvent(TikTokEvents.COMPLETE_PAYMENT, {
    content_id: contentId,
    content_name: contentName,
    content_type: 'product',
    value,
    currency,
  });
};

/**
 * Track add to cart
 * @param contentId - Product ID
 * @param contentName - Product name
 * @param value - Product value
 * @param currency - Currency code
 * @param quantity - Quantity
 */
export const trackTikTokAddToCart = (
  contentId: string,
  contentName: string,
  value: number,
  currency: string = 'USD',
  quantity: number = 1
): void => {
  trackTikTokEvent(TikTokEvents.ADD_TO_CART, {
    content_id: contentId,
    content_name: contentName,
    content_type: 'product',
    value,
    currency,
    quantity,
  });
};

/**
 * Track content view
 * @param contentId - Content ID
 * @param contentName - Content name
 * @param contentType - Content type
 */
export const trackTikTokViewContent = (
  contentId: string,
  contentName: string,
  contentType: string = 'product'
): void => {
  trackTikTokEvent(TikTokEvents.VIEW_CONTENT, {
    content_id: contentId,
    content_name: contentName,
    content_type: contentType,
  });
};

/**
 * Track search
 * @param query - Search query
 */
export const trackTikTokSearch = (query: string): void => {
  trackTikTokEvent(TikTokEvents.SEARCH, {
    query,
  });
};

/**
 * Track subscription
 * @param value - Subscription value
 * @param currency - Currency code
 */
export const trackTikTokSubscribe = (
  value: number,
  currency: string = 'USD'
): void => {
  trackTikTokEvent(TikTokEvents.SUBSCRIBE, {
    value,
    currency,
  });
};

/**
 * Track button click
 * @param buttonName - Button name/identifier
 */
export const trackTikTokButtonClick = (buttonName: string): void => {
  trackTikTokEvent(TikTokEvents.CLICK_BUTTON, {
    content_name: buttonName,
  });
};
