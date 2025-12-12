// Export translation hooks and providers
export { I18nProvider, useTranslation, useLocale } from './useTranslation';
export type { SupportedLocale, TranslationContext } from './useTranslation';

// Export language switcher components
export { LanguageSwitcher, languages } from './LanguageSwitcher';
export type { Language, LanguageSwitcherProps } from './LanguageSwitcher';

// Export translations
export { translations } from './translations';
export type { Translations } from './translations';

// Export configuration
export {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  RTL_LANGUAGES,
  LANGUAGE_STORAGE_KEY,
  LANGUAGE_COOKIE_NAME,
  LANGUAGE_HEADER_NAME,
  getLanguageByCode,
  isRTLLanguage,
  getEnabledLanguages,
  getLocaleConfig,
} from './config';
export type { LanguageCode, Language as LanguageConfig, LocaleConfig, Locale } from './config';

// Export server-side translation helpers
export { getTranslations } from './getTranslations';
export type { TranslationFunction } from './getTranslations';

// Export LanguageProvider
export { LanguageProvider } from './LanguageProvider';
export type { LanguageContextValue } from './LanguageProvider';
