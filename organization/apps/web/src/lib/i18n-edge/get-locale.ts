/**
 * Locale Detection Utilities
 *
 * Server-side utilities for detecting and resolving locales
 * from headers, cookies, and request context
 */

import { headers, cookies } from 'next/headers';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_DEFINITIONS,
  I18N_HEADER_NAMES,
  I18N_COOKIE_NAMES,
  type SupportedLocale,
  type LocaleDefinition,
} from './config';

// ============================================================================
// Types
// ============================================================================

export interface LocaleContext {
  locale: SupportedLocale;
  language: string;
  region: string;
  direction: 'ltr' | 'rtl';
  country: string;
  currency: string;
  tenant: string;
  traceId: string;
}

// ============================================================================
// Server-Side Locale Detection
// ============================================================================

/**
 * Get locale from middleware headers (for Server Components)
 */
export async function getLocaleFromHeaders(): Promise<LocaleContext> {
  const headerStore = await headers();

  const locale = (headerStore.get(I18N_HEADER_NAMES.locale) ||
    headerStore.get(I18N_HEADER_NAMES.language) ||
    DEFAULT_LOCALE) as SupportedLocale;

  const definition = LOCALE_DEFINITIONS[locale] || LOCALE_DEFINITIONS[DEFAULT_LOCALE];

  return {
    locale,
    language: definition.language,
    region: definition.region,
    direction: definition.direction,
    country: headerStore.get(I18N_HEADER_NAMES.country) || 'US',
    currency: headerStore.get(I18N_HEADER_NAMES.currency) || 'USD',
    tenant: headerStore.get(I18N_HEADER_NAMES.tenant) || 'broxiva',
    traceId: headerStore.get(I18N_HEADER_NAMES.traceId) || '',
  };
}

/**
 * Get locale from cookies (for Client Components via server)
 */
export async function getLocaleFromCookies(): Promise<SupportedLocale> {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get(I18N_COOKIE_NAMES.language);

  if (langCookie?.value && isValidLocale(langCookie.value)) {
    return langCookie.value as SupportedLocale;
  }

  return DEFAULT_LOCALE;
}

/**
 * Get country from headers/cookies
 */
export async function getCountry(): Promise<string> {
  const headerStore = await headers();
  const cookieStore = await cookies();

  // Check header first (set by middleware)
  const headerCountry = headerStore.get(I18N_HEADER_NAMES.country);
  if (headerCountry) {
    return headerCountry.toUpperCase();
  }

  // Check cookie
  const countryCookie = cookieStore.get(I18N_COOKIE_NAMES.country);
  if (countryCookie?.value) {
    return countryCookie.value.toUpperCase();
  }

  return 'US';
}

/**
 * Get currency from headers/cookies
 */
export async function getCurrency(): Promise<string> {
  const headerStore = await headers();
  const cookieStore = await cookies();

  // Check header first
  const headerCurrency = headerStore.get(I18N_HEADER_NAMES.currency);
  if (headerCurrency) {
    return headerCurrency.toUpperCase();
  }

  // Check cookie
  const currencyCookie = cookieStore.get(I18N_COOKIE_NAMES.currency);
  if (currencyCookie?.value) {
    return currencyCookie.value.toUpperCase();
  }

  return 'USD';
}

// ============================================================================
// Validation Utilities
// ============================================================================

function isValidLocale(locale: string): boolean {
  return SUPPORTED_LOCALES.includes(locale.toLowerCase() as SupportedLocale);
}

// ============================================================================
// Locale Utilities
// ============================================================================

/**
 * Get locale definition by code
 */
export function getLocaleDefinition(locale: string): LocaleDefinition {
  const normalized = locale.toLowerCase() as SupportedLocale;
  return LOCALE_DEFINITIONS[normalized] || LOCALE_DEFINITIONS[DEFAULT_LOCALE];
}

/**
 * Get text direction for locale
 */
export function getTextDirection(locale: string): 'ltr' | 'rtl' {
  const definition = getLocaleDefinition(locale);
  return definition.direction;
}

/**
 * Get hreflang value for SEO
 */
export function getHreflang(locale: string): string {
  const definition = getLocaleDefinition(locale);
  return definition.hreflang;
}

/**
 * Extract locale from pathname
 */
export function extractLocaleFromPath(pathname: string): SupportedLocale | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const potentialLocale = segments[0].toLowerCase();
  if (SUPPORTED_LOCALES.includes(potentialLocale as SupportedLocale)) {
    return potentialLocale as SupportedLocale;
  }

  return null;
}

/**
 * Remove locale from pathname
 */
export function removeLocaleFromPath(pathname: string): string {
  const locale = extractLocaleFromPath(pathname);
  if (!locale) return pathname;

  const segments = pathname.split('/').filter(Boolean);
  return '/' + segments.slice(1).join('/') || '/';
}

/**
 * Add locale to pathname
 */
export function addLocaleToPath(pathname: string, locale: SupportedLocale): string {
  const cleanPath = removeLocaleFromPath(pathname);
  return `/${locale}${cleanPath === '/' ? '' : cleanPath}`;
}

/**
 * Get all locale paths for SEO alternate links
 */
export function getAlternateLocaleUrls(
  basePath: string,
  baseUrl: string = 'https://broxiva.com'
): Array<{ locale: SupportedLocale; url: string; hreflang: string }> {
  const cleanPath = removeLocaleFromPath(basePath);

  return SUPPORTED_LOCALES.map((locale) => ({
    locale,
    url: `${baseUrl}/${locale}${cleanPath === '/' ? '' : cleanPath}`,
    hreflang: LOCALE_DEFINITIONS[locale].hreflang,
  }));
}
