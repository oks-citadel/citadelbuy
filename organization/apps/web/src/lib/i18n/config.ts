/**
 * i18n Configuration
 *
 * Centralized configuration for internationalization across the platform
 */

export type LanguageCode =
  | 'en' // English
  | 'fr' // French
  | 'ar' // Arabic (RTL)
  | 'pt' // Portuguese
  | 'es' // Spanish
  | 'sw' // Swahili
  | 'zh' // Mandarin Chinese
  | 'ha' // Hausa
  | 'yo' // Yoruba
  | 'ig' // Igbo
  | 'de' // German
  | 'nl' // Dutch
  | 'it' // Italian
  | 'ru' // Russian
  | 'ja'; // Japanese

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  isRTL?: boolean;
  isEnabled?: boolean;
  sortOrder?: number;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    isEnabled: true,
    sortOrder: 0,
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    isEnabled: true,
    sortOrder: 1,
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    isRTL: true,
    isEnabled: true,
    sortOrder: 2,
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇵🇹',
    isEnabled: true,
    sortOrder: 3,
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    isEnabled: true,
    sortOrder: 4,
  },
  {
    code: 'sw',
    name: 'Swahili',
    nativeName: 'Kiswahili',
    flag: '🇰🇪',
    isEnabled: true,
    sortOrder: 5,
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
    isEnabled: true,
    sortOrder: 6,
  },
  {
    code: 'ha',
    name: 'Hausa',
    nativeName: 'Hausa',
    flag: '🇳🇬',
    isEnabled: true,
    sortOrder: 7,
  },
  {
    code: 'yo',
    name: 'Yoruba',
    nativeName: 'Yorùbá',
    flag: '🇳🇬',
    isEnabled: true,
    sortOrder: 8,
  },
  {
    code: 'ig',
    name: 'Igbo',
    nativeName: 'Igbo',
    flag: '🇳🇬',
    isEnabled: true,
    sortOrder: 9,
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    isEnabled: true,
    sortOrder: 10,
  },
  {
    code: 'nl',
    name: 'Dutch',
    nativeName: 'Nederlands',
    flag: '🇳🇱',
    isEnabled: true,
    sortOrder: 11,
  },
  {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    flag: '🇮🇹',
    isEnabled: true,
    sortOrder: 12,
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺',
    isEnabled: true,
    sortOrder: 13,
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    isEnabled: true,
    sortOrder: 14,
  },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export const RTL_LANGUAGES: LanguageCode[] = ['ar'];

export const LANGUAGE_STORAGE_KEY = 'citadelbuy_language';

export const LANGUAGE_COOKIE_NAME = 'CITADELBUY_LANG';

export const LANGUAGE_HEADER_NAME = 'Accept-Language';

/**
 * Get language by code
 */
export function getLanguageByCode(code: string): Language | undefined {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
}

/**
 * Check if language is RTL
 */
export function isRTLLanguage(code: LanguageCode): boolean {
  return RTL_LANGUAGES.includes(code);
}

/**
 * Get enabled languages
 */
export function getEnabledLanguages(): Language[] {
  return SUPPORTED_LANGUAGES.filter((lang) => lang.isEnabled !== false);
}
