/**
 * Marketing & Analytics Configuration
 * Centralized configuration for all marketing tools and tracking
 */

export interface MarketingConfig {
  // Google Analytics 4
  googleAnalytics: {
    enabled: boolean;
    measurementId: string;
    debug?: boolean;
  };
  // Google Tag Manager
  googleTagManager: {
    enabled: boolean;
    containerId: string;
  };
  // Facebook/Meta Pixel
  facebookPixel: {
    enabled: boolean;
    pixelId: string;
  };
  // Twitter/X Pixel
  twitterPixel: {
    enabled: boolean;
    pixelId: string;
  };
  // LinkedIn Insight Tag
  linkedInInsight: {
    enabled: boolean;
    partnerId: string;
  };
  // Pinterest Tag
  pinterestTag: {
    enabled: boolean;
    tagId: string;
  };
  // TikTok Pixel
  tiktokPixel: {
    enabled: boolean;
    pixelId: string;
  };
  // Hotjar
  hotjar: {
    enabled: boolean;
    siteId: string;
    version: number;
  };
  // Consent settings
  consent: {
    enabled: boolean;
    defaultConsent: ConsentSettings;
  };
}

export interface ConsentSettings {
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  necessary: boolean; // Always true
}

export const defaultMarketingConfig: MarketingConfig = {
  googleAnalytics: {
    enabled: !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '',
    debug: process.env.NODE_ENV === 'development',
  },
  googleTagManager: {
    enabled: !!process.env.NEXT_PUBLIC_GTM_ID,
    containerId: process.env.NEXT_PUBLIC_GTM_ID || '',
  },
  facebookPixel: {
    enabled: !!process.env.NEXT_PUBLIC_FB_PIXEL_ID,
    pixelId: process.env.NEXT_PUBLIC_FB_PIXEL_ID || '',
  },
  twitterPixel: {
    enabled: !!process.env.NEXT_PUBLIC_TWITTER_PIXEL_ID,
    pixelId: process.env.NEXT_PUBLIC_TWITTER_PIXEL_ID || '',
  },
  linkedInInsight: {
    enabled: !!process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID,
    partnerId: process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID || '',
  },
  pinterestTag: {
    enabled: !!process.env.NEXT_PUBLIC_PINTEREST_TAG_ID,
    tagId: process.env.NEXT_PUBLIC_PINTEREST_TAG_ID || '',
  },
  tiktokPixel: {
    enabled: !!process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID,
    pixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || '',
  },
  hotjar: {
    enabled: !!process.env.NEXT_PUBLIC_HOTJAR_SITE_ID,
    siteId: process.env.NEXT_PUBLIC_HOTJAR_SITE_ID || '',
    version: 6,
  },
  consent: {
    enabled: true,
    defaultConsent: {
      analytics: false,
      marketing: false,
      personalization: false,
      necessary: true,
    },
  },
};

// E-commerce event types for tracking
export type EcommerceEventType =
  | 'view_item'
  | 'view_item_list'
  | 'select_item'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'view_cart'
  | 'begin_checkout'
  | 'add_shipping_info'
  | 'add_payment_info'
  | 'purchase'
  | 'refund'
  | 'add_to_wishlist'
  | 'search'
  | 'view_promotion'
  | 'select_promotion'
  | 'sign_up'
  | 'login'
  | 'share'
  | 'generate_lead';

export interface EcommerceItem {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_category2?: string;
  item_category3?: string;
  item_variant?: string;
  price: number;
  quantity?: number;
  coupon?: string;
  discount?: number;
  index?: number;
  affiliation?: string;
  item_list_id?: string;
  item_list_name?: string;
}

export interface EcommerceEventData {
  currency?: string;
  value?: number;
  items?: EcommerceItem[];
  transaction_id?: string;
  affiliation?: string;
  coupon?: string;
  shipping?: number;
  tax?: number;
  payment_type?: string;
  shipping_tier?: string;
  item_list_id?: string;
  item_list_name?: string;
  promotion_id?: string;
  promotion_name?: string;
  creative_name?: string;
  creative_slot?: string;
  location_id?: string;
  search_term?: string;
  method?: string;
  content_type?: string;
  item_id?: string;
}

export const CURRENCY = 'USD';
