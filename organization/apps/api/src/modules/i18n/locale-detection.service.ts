import { Injectable } from '@nestjs/common';
import { Request } from 'express';

/**
 * Locale Detection Service
 *
 * Detects user's preferred language from various sources:
 * 1. URL parameters
 * 2. Cookies
 * 3. Accept-Language header
 * 4. User profile settings
 * 5. GeoIP location
 */
@Injectable()
export class LocaleDetectionService {
  private readonly DEFAULT_LOCALE = 'en';

  private readonly SUPPORTED_LOCALES = [
    'en', 'fr', 'ar', 'pt', 'es', 'sw', 'zh',
    'ha', 'yo', 'ig', 'de', 'nl', 'it', 'ru', 'ja'
  ];

  /**
   * Detect locale from HTTP request
   */
  detectLocale(request: Request, _userId?: string): string {
    // Priority 1: URL query parameter
    const queryLocale = this.detectFromQuery(request);
    if (queryLocale) return queryLocale;

    // Priority 2: Cookie
    const cookieLocale = this.detectFromCookie(request);
    if (cookieLocale) return cookieLocale;

    // Priority 3: Accept-Language header
    const headerLocale = this.detectFromHeader(request);
    if (headerLocale) return headerLocale;

    // Priority 4: User profile (requires userId and database lookup)
    // This would be handled by the caller passing user preferences

    // Priority 5: Default
    return this.DEFAULT_LOCALE;
  }

  /**
   * Detect locale from query parameters
   */
  private detectFromQuery(request: Request): string | null {
    const locale = request.query.lang as string;
    return this.validateLocale(locale);
  }

  /**
   * Detect locale from cookies
   */
  private detectFromCookie(request: Request): string | null {
    const locale = request.cookies?.BROXIVA_LANG;
    return this.validateLocale(locale);
  }

  /**
   * Detect locale from Accept-Language header
   */
  private detectFromHeader(request: Request): string | null {
    const acceptLanguage = request.headers['accept-language'];

    if (!acceptLanguage) return null;

    // Parse Accept-Language header (format: "en-US,en;q=0.9,fr;q=0.8")
    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const [code, qValue] = lang.trim().split(';');
        const quality = qValue ? parseFloat(qValue.split('=')[1]) : 1.0;

        // Extract primary language code (en-US -> en)
        const primaryCode = code.split('-')[0].toLowerCase();

        return { code: primaryCode, quality };
      })
      .sort((a, b) => b.quality - a.quality);

    // Find first supported language
    for (const lang of languages) {
      const validatedLocale = this.validateLocale(lang.code);
      if (validatedLocale) return validatedLocale;
    }

    return null;
  }

  /**
   * Detect locale from GeoIP (country code)
   */
  detectFromGeoIP(countryCode: string): string | null {
    const countryToLocaleMap: Record<string, string> = {
      'US': 'en',
      'GB': 'en',
      'CA': 'en',
      'AU': 'en',
      'NZ': 'en',
      'FR': 'fr',
      'BE': 'fr',
      'CH': 'fr',
      'SA': 'ar',
      'AE': 'ar',
      'EG': 'ar',
      'MA': 'ar',
      'DZ': 'ar',
      'PT': 'pt',
      'BR': 'pt',
      'AO': 'pt',
      'MZ': 'pt',
      'ES': 'es',
      'MX': 'es',
      'AR': 'es',
      'CO': 'es',
      'CL': 'es',
      'PE': 'es',
      'KE': 'sw',
      'TZ': 'sw',
      'UG': 'sw',
      'CN': 'zh',
      'TW': 'zh',
      'SG': 'zh',
      'NG': 'en', // Nigeria (multiple languages)
      'DE': 'de',
      'AT': 'de',
      'NL': 'nl',
      'IT': 'it',
      'RU': 'ru',
      'JP': 'ja',
    };

    const locale = countryToLocaleMap[countryCode?.toUpperCase()];
    return this.validateLocale(locale);
  }

  /**
   * Validate if locale is supported
   */
  private validateLocale(locale: string | null | undefined): string | null {
    if (!locale) return null;

    const normalizedLocale = locale.toLowerCase().split('-')[0];

    return this.SUPPORTED_LOCALES.includes(normalizedLocale)
      ? normalizedLocale
      : null;
  }

  /**
   * Get all supported locales
   */
  getSupportedLocales(): string[] {
    return [...this.SUPPORTED_LOCALES];
  }

  /**
   * Check if locale is supported
   */
  isSupported(locale: string): boolean {
    return this.SUPPORTED_LOCALES.includes(locale?.toLowerCase());
  }

  /**
   * Get default locale
   */
  getDefaultLocale(): string {
    return this.DEFAULT_LOCALE;
  }

  /**
   * Detect RTL languages
   */
  isRTL(locale: string): boolean {
    const rtlLocales = ['ar']; // Add more RTL languages as needed
    return rtlLocales.includes(locale?.toLowerCase());
  }

  /**
   * Get locale display name
   */
  getLocaleDisplayName(locale: string, inLocale?: string): string {
    const displayNames: Record<string, Record<string, string>> = {
      'en': {
        'en': 'English',
        'fr': 'Français',
        'ar': 'العربية',
        'pt': 'Português',
        'es': 'Español',
        'sw': 'Kiswahili',
        'zh': '中文',
        'ha': 'Hausa',
        'yo': 'Yorùbá',
        'ig': 'Igbo',
        'de': 'Deutsch',
        'nl': 'Nederlands',
        'it': 'Italiano',
        'ru': 'Русский',
        'ja': '日本語',
      },
    };

    const targetLocale = inLocale || locale;
    return displayNames[targetLocale]?.[locale] || locale;
  }

  /**
   * Format locale for HTTP headers
   */
  formatLocaleForHeader(locale: string): string {
    // Convert locale to proper format (e.g., en -> en-US)
    const localeMap: Record<string, string> = {
      'en': 'en-US',
      'fr': 'fr-FR',
      'ar': 'ar-SA',
      'pt': 'pt-PT',
      'es': 'es-ES',
      'sw': 'sw-KE',
      'zh': 'zh-CN',
      'ha': 'ha-NG',
      'yo': 'yo-NG',
      'ig': 'ig-NG',
      'de': 'de-DE',
      'nl': 'nl-NL',
      'it': 'it-IT',
      'ru': 'ru-RU',
      'ja': 'ja-JP',
    };

    return localeMap[locale] || locale;
  }
}
