/**
 * Dictionary Loading System
 *
 * Dynamic import system for loading translations
 * with proper type safety and caching
 */

import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type SupportedLocale } from './config';

// ============================================================================
// Types
// ============================================================================

export interface CommonTranslations {
  meta: {
    title: string;
    description: string;
    keywords: string[];
  };
  navigation: {
    home: string;
    shop: string;
    categories: string;
    deals: string;
    newArrivals: string;
    brands: string;
    about: string;
    contact: string;
    help: string;
    account: string;
    cart: string;
    wishlist: string;
    search: string;
    searchPlaceholder: string;
  };
  auth: {
    signIn: string;
    signUp: string;
    signOut: string;
    forgotPassword: string;
    resetPassword: string;
    email: string;
    password: string;
    confirmPassword: string;
    rememberMe: string;
    orContinueWith: string;
  };
  product: {
    addToCart: string;
    addToWishlist: string;
    removeFromWishlist: string;
    buyNow: string;
    inStock: string;
    outOfStock: string;
    lowStock: string;
    price: string;
    originalPrice: string;
    discount: string;
    size: string;
    color: string;
    quantity: string;
    reviews: string;
    rating: string;
    description: string;
    specifications: string;
    shipping: string;
    returns: string;
  };
  cart: {
    title: string;
    empty: string;
    continueShopping: string;
    checkout: string;
    subtotal: string;
    shipping: string;
    tax: string;
    total: string;
    remove: string;
    update: string;
    applyCoupon: string;
    couponCode: string;
  };
  checkout: {
    title: string;
    shippingAddress: string;
    billingAddress: string;
    paymentMethod: string;
    orderSummary: string;
    placeOrder: string;
    processing: string;
    orderConfirmed: string;
    orderNumber: string;
    thankYou: string;
  };
  common: {
    loading: string;
    error: string;
    retry: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    close: string;
    back: string;
    next: string;
    previous: string;
    submit: string;
    apply: string;
    clear: string;
    selectAll: string;
    deselectAll: string;
    noResults: string;
    seeMore: string;
    seeLess: string;
    viewAll: string;
    learnMore: string;
  };
  footer: {
    aboutUs: string;
    customerService: string;
    careers: string;
    pressRoom: string;
    investors: string;
    helpCenter: string;
    trackOrder: string;
    shippingInfo: string;
    returnsPolicy: string;
    contactUs: string;
    privacyPolicy: string;
    termsOfService: string;
    cookiePolicy: string;
    accessibility: string;
    copyright: string;
    allRightsReserved: string;
  };
  currency: {
    selectCurrency: string;
    priceIncludes: string;
    estimatedTotal: string;
  };
  locale: {
    selectLanguage: string;
    selectCountry: string;
    selectRegion: string;
    changeLocation: string;
  };
}

export type Dictionary = CommonTranslations;

// ============================================================================
// Dictionary Loaders
// ============================================================================

const dictionaryLoaders: Record<SupportedLocale, () => Promise<Dictionary>> = {
  'en-us': () => import('../i18n/locales/dictionaries/en-us.json').then((m) => m.default),
  'en-gb': () => import('../i18n/locales/dictionaries/en-gb.json').then((m) => m.default),
  'fr-fr': () => import('../i18n/locales/dictionaries/fr-fr.json').then((m) => m.default),
  'fr-ca': () => import('../i18n/locales/dictionaries/fr-ca.json').then((m) => m.default),
  'es-es': () => import('../i18n/locales/dictionaries/es-es.json').then((m) => m.default),
  'es-mx': () => import('../i18n/locales/dictionaries/es-mx.json').then((m) => m.default),
  'de-de': () => import('../i18n/locales/dictionaries/de-de.json').then((m) => m.default),
  'pt-br': () => import('../i18n/locales/dictionaries/pt-br.json').then((m) => m.default),
  'ar-ae': () => import('../i18n/locales/dictionaries/ar-ae.json').then((m) => m.default),
  'zh-cn': () => import('../i18n/locales/dictionaries/zh-cn.json').then((m) => m.default),
  'ja-jp': () => import('../i18n/locales/dictionaries/ja-jp.json').then((m) => m.default),
  'yo-ng': () => import('../i18n/locales/dictionaries/yo-ng.json').then((m) => m.default),
  'ha-ng': () => import('../i18n/locales/dictionaries/ha-ng.json').then((m) => m.default),
};

// ============================================================================
// Dictionary Cache
// ============================================================================

const dictionaryCache = new Map<SupportedLocale, Dictionary>();

// ============================================================================
// Public API
// ============================================================================

/**
 * Load dictionary for a specific locale
 */
export async function getDictionary(locale: string): Promise<Dictionary> {
  const normalizedLocale = locale.toLowerCase() as SupportedLocale;

  // Validate locale
  if (!SUPPORTED_LOCALES.includes(normalizedLocale)) {
    console.warn(`Unsupported locale: ${locale}, falling back to ${DEFAULT_LOCALE}`);
    return getDictionary(DEFAULT_LOCALE);
  }

  // Check cache
  const cached = dictionaryCache.get(normalizedLocale);
  if (cached) {
    return cached;
  }

  // Load dictionary
  try {
    const dictionary = await dictionaryLoaders[normalizedLocale]();
    dictionaryCache.set(normalizedLocale, dictionary);
    return dictionary;
  } catch (error) {
    console.error(`Failed to load dictionary for ${locale}:`, error);

    // Fallback to default locale
    if (normalizedLocale !== DEFAULT_LOCALE) {
      return getDictionary(DEFAULT_LOCALE);
    }

    // Return minimal fallback dictionary
    return getMinimalDictionary();
  }
}

/**
 * Preload dictionaries for specific locales
 */
export async function preloadDictionaries(locales: SupportedLocale[]): Promise<void> {
  await Promise.all(locales.map((locale) => getDictionary(locale)));
}

/**
 * Clear dictionary cache
 */
export function clearDictionaryCache(): void {
  dictionaryCache.clear();
}

/**
 * Get translation by key path (e.g., "navigation.home")
 */
export function getTranslation(dictionary: Dictionary, keyPath: string): string {
  const keys = keyPath.split('.');
  let value: unknown = dictionary;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return keyPath; // Return key path if translation not found
    }
  }

  return typeof value === 'string' ? value : keyPath;
}

/**
 * Get translation with interpolation
 */
export function formatTranslation(
  dictionary: Dictionary,
  keyPath: string,
  params: Record<string, string | number> = {}
): string {
  let translation = getTranslation(dictionary, keyPath);

  Object.entries(params).forEach(([key, value]) => {
    translation = translation.replace(new RegExp(`{${key}}`, 'g'), String(value));
  });

  return translation;
}

// ============================================================================
// Minimal Fallback Dictionary
// ============================================================================

function getMinimalDictionary(): Dictionary {
  return {
    meta: {
      title: 'Broxiva',
      description: 'AI-Powered E-Commerce Platform',
      keywords: ['ecommerce', 'shopping'],
    },
    navigation: {
      home: 'Home',
      shop: 'Shop',
      categories: 'Categories',
      deals: 'Deals',
      newArrivals: 'New Arrivals',
      brands: 'Brands',
      about: 'About',
      contact: 'Contact',
      help: 'Help',
      account: 'Account',
      cart: 'Cart',
      wishlist: 'Wishlist',
      search: 'Search',
      searchPlaceholder: 'Search products...',
    },
    auth: {
      signIn: 'Sign In',
      signUp: 'Sign Up',
      signOut: 'Sign Out',
      forgotPassword: 'Forgot Password',
      resetPassword: 'Reset Password',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      rememberMe: 'Remember Me',
      orContinueWith: 'Or continue with',
    },
    product: {
      addToCart: 'Add to Cart',
      addToWishlist: 'Add to Wishlist',
      removeFromWishlist: 'Remove from Wishlist',
      buyNow: 'Buy Now',
      inStock: 'In Stock',
      outOfStock: 'Out of Stock',
      lowStock: 'Low Stock',
      price: 'Price',
      originalPrice: 'Original Price',
      discount: 'Discount',
      size: 'Size',
      color: 'Color',
      quantity: 'Quantity',
      reviews: 'Reviews',
      rating: 'Rating',
      description: 'Description',
      specifications: 'Specifications',
      shipping: 'Shipping',
      returns: 'Returns',
    },
    cart: {
      title: 'Shopping Cart',
      empty: 'Your cart is empty',
      continueShopping: 'Continue Shopping',
      checkout: 'Checkout',
      subtotal: 'Subtotal',
      shipping: 'Shipping',
      tax: 'Tax',
      total: 'Total',
      remove: 'Remove',
      update: 'Update',
      applyCoupon: 'Apply Coupon',
      couponCode: 'Coupon Code',
    },
    checkout: {
      title: 'Checkout',
      shippingAddress: 'Shipping Address',
      billingAddress: 'Billing Address',
      paymentMethod: 'Payment Method',
      orderSummary: 'Order Summary',
      placeOrder: 'Place Order',
      processing: 'Processing...',
      orderConfirmed: 'Order Confirmed',
      orderNumber: 'Order Number',
      thankYou: 'Thank you for your order!',
    },
    common: {
      loading: 'Loading...',
      error: 'Error',
      retry: 'Retry',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      submit: 'Submit',
      apply: 'Apply',
      clear: 'Clear',
      selectAll: 'Select All',
      deselectAll: 'Deselect All',
      noResults: 'No Results',
      seeMore: 'See More',
      seeLess: 'See Less',
      viewAll: 'View All',
      learnMore: 'Learn More',
    },
    footer: {
      aboutUs: 'About Us',
      customerService: 'Customer Service',
      careers: 'Careers',
      pressRoom: 'Press Room',
      investors: 'Investors',
      helpCenter: 'Help Center',
      trackOrder: 'Track Order',
      shippingInfo: 'Shipping Info',
      returnsPolicy: 'Returns Policy',
      contactUs: 'Contact Us',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      cookiePolicy: 'Cookie Policy',
      accessibility: 'Accessibility',
      copyright: 'Copyright',
      allRightsReserved: 'All Rights Reserved',
    },
    currency: {
      selectCurrency: 'Select Currency',
      priceIncludes: 'Price includes',
      estimatedTotal: 'Estimated Total',
    },
    locale: {
      selectLanguage: 'Select Language',
      selectCountry: 'Select Country',
      selectRegion: 'Select Region',
      changeLocation: 'Change Location',
    },
  };
}
