'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import { i18nConfig, type Locale, isRTL } from '@/config/i18n.config';
import { useTranslations, useAllTranslations, type TranslationMap } from '@/lib/api/i18n';

// ============================================
// TYPES
// ============================================

interface I18nContextValue {
  locale: Locale;
  translations: Record<string, TranslationMap>;
  isLoading: boolean;
  isRTL: boolean;
  t: (key: string, fallback?: string) => string;
  changeLocale: (newLocale: Locale) => void;
}

// ============================================
// CONTEXT
// ============================================

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface I18nProviderProps {
  children: React.ReactNode;
  locale: Locale;
}

export function I18nProvider({ children, locale }: I18nProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Fetch all translations for the current locale
  const { data: translations = {} as Record<string, TranslationMap>, isLoading } = useAllTranslations(locale);

  // Check if current locale is RTL
  const isRTLLocale = useMemo(() => isRTL(locale), [locale]);

  /**
   * Translation function
   * @param key - Translation key (e.g., "common.add_to_cart")
   * @param fallback - Fallback text if translation not found
   */
  const t = useCallback(
    (key: string, fallback?: string): string => {
      // Split key into namespace and actual key
      const parts = key.split('.');

      if (parts.length < 2) {
        // Invalid key format, return fallback or key
        return fallback || key;
      }

      const [namespace, ...keyParts] = parts;
      const actualKey = keyParts.join('.');

      // Get translation from namespace
      const namespaceTranslations = translations[namespace];

      if (!namespaceTranslations) {
        return fallback || key;
      }

      const translation = (namespaceTranslations as any)[actualKey];

      if (!translation) {
        return fallback || key;
      }

      return String(translation);
    },
    [translations]
  );

  /**
   * Change locale and navigate to new URL
   */
  const changeLocale = useCallback(
    (newLocale: Locale) => {
      if (newLocale === locale) return;

      // Set cookie
      Cookies.set(i18nConfig.localeCookie, newLocale, {
        expires: 365, // 1 year
        path: '/',
      });

      // Update URL
      const currentPathWithoutLocale = pathname.replace(`/${locale}`, '');
      const newPath = `/${newLocale}${currentPathWithoutLocale}`;

      router.push(newPath);
      router.refresh();
    },
    [locale, pathname, router]
  );

  const value: I18nContextValue = {
    locale,
    translations: translations as Record<string, TranslationMap>,
    isLoading,
    isRTL: isRTLLocale,
    t,
    changeLocale,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ============================================
// HOOK
// ============================================

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }

  return context;
}

// ============================================
// HELPER HOOKS
// ============================================

/**
 * Hook for simple translation function
 * Usage: const t = useTranslation();
 */
export function useTranslation() {
  const { t } = useI18n();
  return t;
}

/**
 * Hook for current locale
 */
export function useLocale() {
  const { locale, changeLocale } = useI18n();
  return { locale, changeLocale };
}

/**
 * Hook for RTL detection
 */
export function useIsRTL() {
  const { isRTL } = useI18n();
  return isRTL;
}
