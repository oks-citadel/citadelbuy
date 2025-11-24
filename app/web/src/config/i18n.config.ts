/**
 * i18n Configuration
 * Defines supported languages and default language settings
 */

export const i18nConfig = {
  // Default language
  defaultLocale: 'en',

  // Supported locales
  locales: ['en', 'es', 'fr', 'de', 'zh', 'ar'],

  // Locale labels (for language switcher UI)
  localeLabels: {
    en: 'English',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
    zh: '中文',
    ar: 'العربية',
  },

  // Locale flags (emoji)
  localeFlags: {
    en: '🇺🇸',
    es: '🇪🇸',
    fr: '🇫🇷',
    de: '🇩🇪',
    zh: '🇨🇳',
    ar: '🇸🇦',
  },

  // RTL languages
  rtlLocales: ['ar'],

  // Cookie name for storing language preference
  localeCookie: 'NEXT_LOCALE',

  // Cookie expiration (1 year)
  cookieMaxAge: 365 * 24 * 60 * 60,
} as const;

export type Locale = typeof i18nConfig.locales[number];

// Helper to check if locale is RTL
export const isRTL = (locale: string): boolean => {
  return i18nConfig.rtlLocales.includes(locale as any);
};

// Helper to get locale label
export const getLocaleLabel = (locale: string): string => {
  return i18nConfig.localeLabels[locale as Locale] || locale;
};

// Helper to get locale flag
export const getLocaleFlag = (locale: string): string => {
  return i18nConfig.localeFlags[locale as Locale] || '🌐';
};

// Helper to validate locale
export const isValidLocale = (locale: string): locale is Locale => {
  return i18nConfig.locales.includes(locale as Locale);
};
