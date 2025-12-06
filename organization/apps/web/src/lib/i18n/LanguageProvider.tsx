'use client';

import React, { createContext, useState, useEffect, useCallback } from 'react';
import {
  LanguageCode,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  isRTLLanguage,
} from './config';

export interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  translations: Record<string, string>;
  isRTL: boolean;
  isLoading: boolean;
}

export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

interface LanguageProviderProps {
  children: React.ReactNode;
  initialLanguage?: LanguageCode;
}

/**
 * Language Provider Component
 *
 * Manages language state and translations across the application
 */
export function LanguageProvider({ children, initialLanguage }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<LanguageCode>(
    initialLanguage || DEFAULT_LANGUAGE
  );
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRTL, setIsRTL] = useState(false);

  /**
   * Load translations for a specific language
   */
  const loadTranslations = useCallback(async (lang: LanguageCode) => {
    try {
      setIsLoading(true);

      // Try to fetch from API first
      const response = await fetch(`/api/i18n/translations/${lang}`);

      if (response.ok) {
        const data = await response.json();
        setTranslations(data);
      } else {
        // Fallback to local JSON files
        const localTranslations = await import(`./locales/${lang}.json`);
        setTranslations(localTranslations.default || localTranslations);
      }
    } catch (error) {
      console.error(`Failed to load translations for ${lang}:`, error);

      // Fallback to English if current language fails
      if (lang !== DEFAULT_LANGUAGE) {
        try {
          const fallbackTranslations = await import(`./locales/${DEFAULT_LANGUAGE}.json`);
          setTranslations(fallbackTranslations.default || fallbackTranslations);
        } catch (fallbackError) {
          console.error('Failed to load fallback translations:', fallbackError);
          setTranslations({});
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Change language
   */
  const setLanguage = useCallback(
    async (lang: LanguageCode) => {
      setLanguageState(lang);
      setIsRTL(isRTLLanguage(lang));

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);

        // Update HTML dir attribute
        document.documentElement.dir = isRTLLanguage(lang) ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
      }

      // Load translations
      await loadTranslations(lang);
    },
    [loadTranslations]
  );

  /**
   * Detect initial language from browser/storage
   */
  const detectInitialLanguage = useCallback((): LanguageCode => {
    if (typeof window === 'undefined') {
      return initialLanguage || DEFAULT_LANGUAGE;
    }

    // 1. Check localStorage
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode;
    if (stored) {
      return stored;
    }

    // 2. Check browser language
    const browserLang = navigator.language.split('-')[0] as LanguageCode;
    const supportedLangs = ['en', 'fr', 'ar', 'pt', 'es', 'sw', 'zh', 'ha', 'yo', 'ig', 'de', 'nl', 'it', 'ru', 'ja'];

    if (supportedLangs.includes(browserLang)) {
      return browserLang;
    }

    // 3. Default to English
    return DEFAULT_LANGUAGE;
  }, [initialLanguage]);

  /**
   * Initialize language on mount
   */
  useEffect(() => {
    const initialLang = detectInitialLanguage();
    setLanguage(initialLang);
  }, [detectInitialLanguage, setLanguage]);

  /**
   * Sync RTL state with language
   */
  useEffect(() => {
    setIsRTL(isRTLLanguage(language));
  }, [language]);

  const contextValue: LanguageContextValue = {
    language,
    setLanguage,
    translations,
    isRTL,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}
