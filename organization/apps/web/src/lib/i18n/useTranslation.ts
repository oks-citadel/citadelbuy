'use client';

import { useContext, useCallback } from 'react';
import { LanguageContext } from './LanguageProvider';
import { LanguageCode } from './config';

/**
 * Translation hook
 *
 * Provides translation functionality with support for:
 * - Dynamic key-based translations
 * - Variable interpolation
 * - Plural forms
 * - Fallback to default language
 */
export function useTranslation() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useTranslation must be used within LanguageProvider');
  }

  const { language, setLanguage, translations, isLoading } = context;

  /**
   * Translate a key with optional variable interpolation
   *
   * @param key - Translation key (e.g., 'common.welcome')
   * @param variables - Variables to interpolate (e.g., { name: 'John' })
   * @returns Translated string
   *
   * @example
   * t('common.welcome') // "Welcome"
   * t('common.hello', { name: 'John' }) // "Hello, John!"
   */
  const t = useCallback(
    (key: string, variables?: Record<string, string | number>): string => {
      let translation = translations[key] || key;

      // Interpolate variables if provided
      if (variables) {
        Object.entries(variables).forEach(([varKey, varValue]) => {
          translation = translation.replace(
            new RegExp(`{{\\s*${varKey}\\s*}}`, 'g'),
            String(varValue)
          );
        });
      }

      return translation;
    },
    [translations]
  );

  /**
   * Translate with plural support
   *
   * @param key - Translation key base (e.g., 'common.item')
   * @param count - Number for plural decision
   * @param variables - Additional variables
   * @returns Translated string
   *
   * @example
   * tp('common.item', 1) // "1 item"
   * tp('common.item', 5) // "5 items"
   */
  const tp = useCallback(
    (key: string, count: number, variables?: Record<string, string | number>): string => {
      const pluralKey = count === 1 ? `${key}_one` : `${key}_other`;
      const translation = translations[pluralKey] || translations[key] || key;

      return t(translation, { count, ...variables });
    },
    [t, translations]
  );

  /**
   * Check if a translation key exists
   */
  const hasTranslation = useCallback(
    (key: string): boolean => {
      return key in translations;
    },
    [translations]
  );

  /**
   * Get translation without interpolation (raw)
   */
  const tRaw = useCallback(
    (key: string): string => {
      return translations[key] || key;
    },
    [translations]
  );

  /**
   * Change language
   */
  const changeLanguage = useCallback(
    async (newLanguage: LanguageCode) => {
      await setLanguage(newLanguage);
    },
    [setLanguage]
  );

  return {
    t,
    tp,
    tRaw,
    hasTranslation,
    language,
    changeLanguage,
    isLoading,
  };
}

/**
 * Hook to get current language info
 */
export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }

  return {
    language: context.language,
    setLanguage: context.setLanguage,
    isRTL: context.isRTL,
    isLoading: context.isLoading,
  };
}

/**
 * Supported locale types
 */
export type SupportedLocale = LanguageCode;

/**
 * Translation context type
 */
export type TranslationContext = {
  locale: SupportedLocale;
  translations: Record<string, string>;
};

/**
 * Alias for useLanguage hook (for compatibility)
 */
export function useLocale() {
  return useLanguage();
}

/**
 * Re-export LanguageProvider as I18nProvider for compatibility
 */
export { LanguageProvider as I18nProvider } from './LanguageProvider';
