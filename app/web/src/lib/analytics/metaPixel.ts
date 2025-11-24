/**
 * Meta (Facebook) Pixel Event Tracking
 * Provides type-safe Meta Pixel tracking with Advanced Matching
 */

// Meta Pixel Standard Events
export const MetaEvents = {
  // Registration & Authentication
  COMPLETE_REGISTRATION: 'CompleteRegistration',
  LEAD: 'Lead',

  // E-commerce
  VIEW_CONTENT: 'ViewContent',
  ADD_TO_CART: 'AddToCart',
  INITIATE_CHECKOUT: 'InitiateCheckout',
  ADD_PAYMENT_INFO: 'AddPaymentInfo',
  PURCHASE: 'Purchase',

  // Engagement
  SEARCH: 'Search',
  SUBSCRIBE: 'Subscribe',
  CONTACT: 'Contact',

  // Custom Events
  START_TRIAL: 'StartTrial',
  SUBMIT_APPLICATION: 'SubmitApplication',
} as const;

export type MetaEventName = typeof MetaEvents[keyof typeof MetaEvents];

export interface MetaEventParams {
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
  num_items?: number;
  search_string?: string;
  status?: string;
  predicted_ltv?: number;
  [key: string]: any;
}

export interface AdvancedMatchingParams {
  em?: string; // Email (hashed)
  ph?: string; // Phone (hashed)
  fn?: string; // First Name (hashed)
  ln?: string; // Last Name (hashed)
  ct?: string; // City (hashed)
  st?: string; // State (hashed)
  zp?: string; // Zip Code (hashed)
  country?: string; // Country Code (hashed)
  external_id?: string; // External ID
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string; // Facebook Click ID
  fbp?: string; // Facebook Browser ID
}

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

/**
 * Hash a string using SHA-256 (for Advanced Matching)
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
 * Initialize Meta Pixel with Advanced Matching
 * @param pixelId - Meta Pixel ID
 * @param advancedMatching - Advanced matching parameters (will be hashed)
 */
export const initMetaPixel = async (
  pixelId: string,
  advancedMatching?: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    externalId?: string;
  }
): Promise<void> => {
  if (typeof window === 'undefined') return;

  // Hash PII data for advanced matching
  const hashedData: AdvancedMatchingParams = {};

  if (advancedMatching) {
    if (advancedMatching.email) {
      hashedData.em = await hashString(advancedMatching.email);
    }
    if (advancedMatching.phone) {
      // Remove all non-numeric characters first
      const phoneDigits = advancedMatching.phone.replace(/\D/g, '');
      hashedData.ph = await hashString(phoneDigits);
    }
    if (advancedMatching.firstName) {
      hashedData.fn = await hashString(advancedMatching.firstName);
    }
    if (advancedMatching.lastName) {
      hashedData.ln = await hashString(advancedMatching.lastName);
    }
    if (advancedMatching.city) {
      hashedData.ct = await hashString(advancedMatching.city);
    }
    if (advancedMatching.state) {
      hashedData.st = await hashString(advancedMatching.state);
    }
    if (advancedMatching.zipCode) {
      hashedData.zp = await hashString(advancedMatching.zipCode);
    }
    if (advancedMatching.country) {
      hashedData.country = await hashString(advancedMatching.country);
    }
    if (advancedMatching.externalId) {
      hashedData.external_id = advancedMatching.externalId;
    }
  }

  // Initialize pixel with advanced matching
  if (window.fbq) {
    window.fbq('init', pixelId, hashedData);
    window.fbq('track', 'PageView');

    if (process.env.NODE_ENV === 'development') {
      console.log('[Meta Pixel] Initialized with pixel ID:', pixelId);
      console.log('[Meta Pixel] Advanced matching data:', hashedData);
    }
  }
};

/**
 * Track a Meta Pixel event
 * @param eventName - The name of the event (use MetaEvents constants)
 * @param params - Event parameters
 */
export const trackMetaEvent = (
  eventName: string,
  params?: MetaEventParams
): void => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, params);

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Meta Pixel] Event tracked:', eventName, params);
    }
  }
};

/**
 * Track a custom Meta Pixel event
 * @param eventName - Custom event name
 * @param params - Event parameters
 */
export const trackMetaCustomEvent = (
  eventName: string,
  params?: MetaEventParams
): void => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', eventName, params);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Meta Pixel] Custom event tracked:', eventName, params);
    }
  }
};

/**
 * Track registration completion
 * @param params - Registration parameters
 */
export const trackMetaRegistration = (params?: {
  value?: number;
  currency?: string;
  status?: string;
}): void => {
  trackMetaEvent(MetaEvents.COMPLETE_REGISTRATION, {
    value: params?.value || 0,
    currency: params?.currency || 'USD',
    status: params?.status || 'completed',
  });
};

/**
 * Track lead generation
 * @param params - Lead parameters
 */
export const trackMetaLead = (params?: {
  content_name?: string;
  value?: number;
  currency?: string;
}): void => {
  trackMetaEvent(MetaEvents.LEAD, {
    content_name: params?.content_name,
    value: params?.value || 0,
    currency: params?.currency || 'USD',
  });
};

/**
 * Track purchase
 * @param value - Purchase value
 * @param currency - Currency code
 * @param contentIds - Product IDs
 */
export const trackMetaPurchase = (
  value: number,
  currency: string = 'USD',
  contentIds?: string[]
): void => {
  trackMetaEvent(MetaEvents.PURCHASE, {
    value,
    currency,
    content_ids: contentIds,
    content_type: 'product',
  });
};

/**
 * Track add to cart
 * @param contentId - Product ID
 * @param contentName - Product name
 * @param value - Product value
 * @param currency - Currency code
 */
export const trackMetaAddToCart = (
  contentId: string,
  contentName: string,
  value: number,
  currency: string = 'USD'
): void => {
  trackMetaEvent(MetaEvents.ADD_TO_CART, {
    content_ids: [contentId],
    content_name: contentName,
    content_type: 'product',
    value,
    currency,
  });
};

/**
 * Track content view
 * @param contentId - Content ID
 * @param contentName - Content name
 * @param contentType - Content type
 */
export const trackMetaViewContent = (
  contentId: string,
  contentName: string,
  contentType: string = 'product'
): void => {
  trackMetaEvent(MetaEvents.VIEW_CONTENT, {
    content_ids: [contentId],
    content_name: contentName,
    content_type: contentType,
  });
};

/**
 * Track search
 * @param searchString - Search query
 */
export const trackMetaSearch = (searchString: string): void => {
  trackMetaEvent(MetaEvents.SEARCH, {
    search_string: searchString,
  });
};

/**
 * Track subscription
 * @param value - Subscription value
 * @param currency - Currency code
 * @param predictedLtv - Predicted lifetime value
 */
export const trackMetaSubscribe = (
  value: number,
  currency: string = 'USD',
  predictedLtv?: number
): void => {
  trackMetaEvent(MetaEvents.SUBSCRIBE, {
    value,
    currency,
    predicted_ltv: predictedLtv,
  });
};

/**
 * Get Facebook Click ID (fbc) from URL
 */
export const getFacebookClickId = (): string | null => {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  const fbclid = urlParams.get('fbclid');

  if (fbclid) {
    // Format: fb.1.timestamp.fbclid
    const timestamp = Date.now();
    return `fb.1.${timestamp}.${fbclid}`;
  }

  return null;
};

/**
 * Get Facebook Browser ID (fbp) from cookie
 */
export const getFacebookBrowserId = (): string | null => {
  if (typeof window === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === '_fbp') {
      return value;
    }
  }

  return null;
};
