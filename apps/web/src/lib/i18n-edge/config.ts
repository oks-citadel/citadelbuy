/**
 * i18n Edge Configuration
 *
 * Extended locale configuration for Vercel Edge middleware
 * Supports language-region codes (e.g., en-us, fr-ca)
 */

// ============================================================================
// Types
// ============================================================================

export interface LocaleDefinition {
  code: string;
  language: string;
  region: string;
  name: string;
  nativeName: string;
  flag: string;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
  numberFormat: {
    decimal: string;
    thousand: string;
  };
  hreflang: string;
  enabled: boolean;
}

export interface CurrencyDefinition {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  symbolPosition: 'before' | 'after';
}

// ============================================================================
// Supported Locales
// ============================================================================

export const SUPPORTED_LOCALES = [
  'en-us',
  'en-gb',
  'fr-fr',
  'fr-ca',
  'es-es',
  'es-mx',
  'de-de',
  'pt-br',
  'ar-ae',
  'zh-cn',
  'ja-jp',
  'yo-ng',
  'ha-ng',
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en-us';

// ============================================================================
// Locale Definitions
// ============================================================================

export const LOCALE_DEFINITIONS: Record<SupportedLocale, LocaleDefinition> = {
  'en-us': {
    code: 'en-us',
    language: 'en',
    region: 'US',
    name: 'English (United States)',
    nativeName: 'English (US)',
    flag: 'us',
    direction: 'ltr',
    dateFormat: 'MM/DD/YYYY',
    numberFormat: { decimal: '.', thousand: ',' },
    hreflang: 'en-US',
    enabled: true,
  },
  'en-gb': {
    code: 'en-gb',
    language: 'en',
    region: 'GB',
    name: 'English (United Kingdom)',
    nativeName: 'English (UK)',
    flag: 'gb',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimal: '.', thousand: ',' },
    hreflang: 'en-GB',
    enabled: true,
  },
  'fr-fr': {
    code: 'fr-fr',
    language: 'fr',
    region: 'FR',
    name: 'French (France)',
    nativeName: 'Francais (France)',
    flag: 'fr',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimal: ',', thousand: ' ' },
    hreflang: 'fr-FR',
    enabled: true,
  },
  'fr-ca': {
    code: 'fr-ca',
    language: 'fr',
    region: 'CA',
    name: 'French (Canada)',
    nativeName: 'Francais (Canada)',
    flag: 'ca',
    direction: 'ltr',
    dateFormat: 'YYYY-MM-DD',
    numberFormat: { decimal: ',', thousand: ' ' },
    hreflang: 'fr-CA',
    enabled: true,
  },
  'es-es': {
    code: 'es-es',
    language: 'es',
    region: 'ES',
    name: 'Spanish (Spain)',
    nativeName: 'Espanol (Espana)',
    flag: 'es',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimal: ',', thousand: '.' },
    hreflang: 'es-ES',
    enabled: true,
  },
  'es-mx': {
    code: 'es-mx',
    language: 'es',
    region: 'MX',
    name: 'Spanish (Mexico)',
    nativeName: 'Espanol (Mexico)',
    flag: 'mx',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimal: '.', thousand: ',' },
    hreflang: 'es-MX',
    enabled: true,
  },
  'de-de': {
    code: 'de-de',
    language: 'de',
    region: 'DE',
    name: 'German (Germany)',
    nativeName: 'Deutsch (Deutschland)',
    flag: 'de',
    direction: 'ltr',
    dateFormat: 'DD.MM.YYYY',
    numberFormat: { decimal: ',', thousand: '.' },
    hreflang: 'de-DE',
    enabled: true,
  },
  'pt-br': {
    code: 'pt-br',
    language: 'pt',
    region: 'BR',
    name: 'Portuguese (Brazil)',
    nativeName: 'Portugues (Brasil)',
    flag: 'br',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimal: ',', thousand: '.' },
    hreflang: 'pt-BR',
    enabled: true,
  },
  'ar-ae': {
    code: 'ar-ae',
    language: 'ar',
    region: 'AE',
    name: 'Arabic (UAE)',
    nativeName: 'العربية (الإمارات)',
    flag: 'ae',
    direction: 'rtl',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimal: '.', thousand: ',' },
    hreflang: 'ar-AE',
    enabled: true,
  },
  'zh-cn': {
    code: 'zh-cn',
    language: 'zh',
    region: 'CN',
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    flag: 'cn',
    direction: 'ltr',
    dateFormat: 'YYYY-MM-DD',
    numberFormat: { decimal: '.', thousand: ',' },
    hreflang: 'zh-CN',
    enabled: true,
  },
  'ja-jp': {
    code: 'ja-jp',
    language: 'ja',
    region: 'JP',
    name: 'Japanese',
    nativeName: '日本語',
    flag: 'jp',
    direction: 'ltr',
    dateFormat: 'YYYY/MM/DD',
    numberFormat: { decimal: '.', thousand: ',' },
    hreflang: 'ja-JP',
    enabled: true,
  },
  'yo-ng': {
    code: 'yo-ng',
    language: 'yo',
    region: 'NG',
    name: 'Yoruba (Nigeria)',
    nativeName: 'Yoruba (Nigeria)',
    flag: 'ng',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimal: '.', thousand: ',' },
    hreflang: 'yo-NG',
    enabled: true,
  },
  'ha-ng': {
    code: 'ha-ng',
    language: 'ha',
    region: 'NG',
    name: 'Hausa (Nigeria)',
    nativeName: 'Hausa (Nigeria)',
    flag: 'ng',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: { decimal: '.', thousand: ',' },
    hreflang: 'ha-NG',
    enabled: true,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

export function getLocaleDefinition(locale: string): LocaleDefinition | undefined {
  return LOCALE_DEFINITIONS[locale.toLowerCase() as SupportedLocale];
}

export function isRTLLocale(locale: string): boolean {
  const definition = getLocaleDefinition(locale);
  return definition?.direction === 'rtl';
}

export function getEnabledLocales(): LocaleDefinition[] {
  return Object.values(LOCALE_DEFINITIONS).filter((def) => def.enabled);
}

export function getLocalesByLanguage(language: string): LocaleDefinition[] {
  return Object.values(LOCALE_DEFINITIONS).filter(
    (def) => def.language === language && def.enabled
  );
}

export function isValidLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale.toLowerCase() as SupportedLocale);
}

// ============================================================================
// Cookie and Header Names
// ============================================================================

export const I18N_COOKIE_NAMES = {
  country: 'bx_country',
  language: 'bx_lang',
  currency: 'bx_currency',
} as const;

export const I18N_HEADER_NAMES = {
  tenant: 'x-bx-tenant',
  country: 'x-bx-country',
  language: 'x-bx-language',
  currency: 'x-bx-currency',
  traceId: 'x-bx-trace-id',
  direction: 'x-bx-direction',
  locale: 'x-bx-locale',
} as const;
