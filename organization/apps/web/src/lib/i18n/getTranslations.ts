import { LanguageCode, DEFAULT_LANGUAGE } from './config';
import { translations as clientTranslations } from './translations';

/**
 * Get translations for server-side rendering
 *
 * This function can be used in Server Components and API routes
 * to fetch translations for a specific locale.
 *
 * @param locale - The locale to get translations for
 * @returns Promise resolving to translations object
 *
 * @example
 * const t = await getTranslations('en');
 * console.log(t('common.welcome')); // "Welcome"
 */
export async function getTranslations(locale: LanguageCode = DEFAULT_LANGUAGE) {
  try {
    // Try to load from API first (for dynamic translations)
    if (typeof window === 'undefined') {
      // Server-side: use client translations directly
      const localeTranslations = clientTranslations[locale];
      
      if (!localeTranslations) {
        console.warn(`Translations not found for locale: ${locale}, falling back to ${DEFAULT_LANGUAGE}`);
        return createTranslationFunction(clientTranslations[DEFAULT_LANGUAGE]);
      }
      
      return createTranslationFunction(localeTranslations);
    }
    
    // Client-side: fetch from API
    const response = await fetch(`/api/i18n/translations/${locale}`);
    
    if (!response.ok) {
      console.warn(`Failed to fetch translations for ${locale}, falling back to client translations`);
      return createTranslationFunction(clientTranslations[locale] || clientTranslations[DEFAULT_LANGUAGE]);
    }
    
    const data = await response.json();
    return createTranslationFunction(data);
  } catch (error) {
    console.error(`Error loading translations for ${locale}:`, error);
    return createTranslationFunction(clientTranslations[DEFAULT_LANGUAGE]);
  }
}

/**
 * Create a translation function from translations object
 */
function createTranslationFunction(translations: any) {
  return (key: string, variables?: Record<string, string | number>): string => {
    // Navigate nested keys (e.g., 'common.welcome')
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    let translation = typeof value === 'string' ? value : key;
    
    // Interpolate variables if provided
    if (variables) {
      Object.entries(variables).forEach(([varKey, varValue]) => {
        translation = translation.replace(
          new RegExp(`{{\s*${varKey}\s*}}`, 'g'),
          String(varValue)
        );
      });
    }
    
    return translation;
  };
}

/**
 * Type for the translation function
 */
export type TranslationFunction = (
  key: string,
  variables?: Record<string, string | number>
) => string;
