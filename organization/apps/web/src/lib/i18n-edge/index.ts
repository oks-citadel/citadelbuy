/**
 * i18n Edge Module Exports
 *
 * Centralized exports for Edge middleware compatible
 * internationalization utilities
 */

// Configuration
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_DEFINITIONS,
  I18N_COOKIE_NAMES,
  I18N_HEADER_NAMES,
  getLocaleDefinition,
  isRTLLocale,
  getEnabledLocales,
  getLocalesByLanguage,
  isValidLocale,
  type SupportedLocale,
  type LocaleDefinition,
  type CurrencyDefinition,
} from './config';

// Locale Detection
export {
  getLocaleFromHeaders,
  getLocaleFromCookies,
  getCountry,
  getCurrency,
  getTextDirection,
  getHreflang,
  extractLocaleFromPath,
  removeLocaleFromPath,
  addLocaleToPath,
  getAlternateLocaleUrls,
  type LocaleContext,
} from './get-locale';

// Dictionaries
export {
  getDictionary,
  preloadDictionaries,
  clearDictionaryCache,
  getTranslation,
  formatTranslation,
  type Dictionary,
  type CommonTranslations,
} from './dictionaries';

// Currency
export {
  CURRENCIES,
  COUNTRY_CURRENCY_MAP,
  getCurrencyForCountry,
  getCurrency as getCurrencyInfo,
  formatCurrency,
  convertCurrency,
  getAllCurrencies,
  getPopularCurrencies,
  isValidCurrency,
  type Currency,
  type CountryCurrencyInfo,
} from './currency-map';
