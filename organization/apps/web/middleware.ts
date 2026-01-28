/**
 * Broxiva Edge Middleware
 *
 * Handles:
 * - Tenant resolution via host header
 * - Country detection via Vercel geo headers
 * - Language detection (Accept-Language + cookies)
 * - Currency inference from country
 * - Header/cookie setting for downstream components
 * - Locale-prefixed routing
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================================================
// Types
// ============================================================================

interface TenantConfig {
  id: string;
  name: string;
  domain: string;
  defaultLocale: string;
  supportedLocales: string[];
  defaultCurrency: string;
  theme?: string;
}

interface LocaleInfo {
  locale: string;
  language: string;
  region: string;
  direction: 'ltr' | 'rtl';
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Supported locales with full language-region codes
 */
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

/**
 * RTL languages
 */
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

/**
 * Country to currency mapping
 */
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  // Americas
  US: 'USD',
  CA: 'CAD',
  MX: 'MXN',
  BR: 'BRL',
  AR: 'ARS',
  CO: 'COP',
  CL: 'CLP',
  PE: 'PEN',

  // Europe
  GB: 'GBP',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  PT: 'EUR',
  IE: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  CH: 'CHF',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  PL: 'PLN',
  CZ: 'CZK',
  HU: 'HUF',
  RO: 'RON',
  RU: 'RUB',
  UA: 'UAH',
  TR: 'TRY',

  // Africa
  NG: 'NGN',
  ZA: 'ZAR',
  KE: 'KES',
  EG: 'EGP',
  GH: 'GHS',
  MA: 'MAD',
  TZ: 'TZS',
  UG: 'UGX',
  ET: 'ETB',
  CI: 'XOF',
  SN: 'XOF',

  // Middle East
  AE: 'AED',
  SA: 'SAR',
  IL: 'ILS',
  QA: 'QAR',
  KW: 'KWD',
  BH: 'BHD',
  OM: 'OMR',
  JO: 'JOD',
  LB: 'LBP',

  // Asia Pacific
  JP: 'JPY',
  CN: 'CNY',
  HK: 'HKD',
  TW: 'TWD',
  KR: 'KRW',
  SG: 'SGD',
  MY: 'MYR',
  TH: 'THB',
  ID: 'IDR',
  PH: 'PHP',
  VN: 'VND',
  IN: 'INR',
  PK: 'PKR',
  BD: 'BDT',

  // Oceania
  AU: 'AUD',
  NZ: 'NZD',
};

/**
 * Country to default locale mapping
 */
const COUNTRY_LOCALE_MAP: Record<string, SupportedLocale> = {
  US: 'en-us',
  GB: 'en-gb',
  AU: 'en-us',
  CA: 'en-us', // Bilingual - defaults to English
  NZ: 'en-gb',
  IE: 'en-gb',

  FR: 'fr-fr',
  BE: 'fr-fr',
  CH: 'fr-fr',

  ES: 'es-es',
  AR: 'es-mx',
  CO: 'es-mx',
  CL: 'es-mx',
  PE: 'es-mx',
  MX: 'es-mx',

  DE: 'de-de',
  AT: 'de-de',

  BR: 'pt-br',
  PT: 'pt-br',

  AE: 'ar-ae',
  SA: 'ar-ae',
  EG: 'ar-ae',
  MA: 'ar-ae',
  QA: 'ar-ae',
  KW: 'ar-ae',
  BH: 'ar-ae',
  OM: 'ar-ae',
  JO: 'ar-ae',

  CN: 'zh-cn',
  HK: 'zh-cn',
  TW: 'zh-cn',
  SG: 'zh-cn',

  JP: 'ja-jp',

  NG: 'en-us', // Nigeria defaults to English
};

/**
 * Tenant configurations - can be extended for multi-tenant setup
 */
const TENANT_CONFIGS: Record<string, TenantConfig> = {
  default: {
    id: 'broxiva',
    name: 'Broxiva',
    domain: 'broxiva.com',
    defaultLocale: 'en-us',
    supportedLocales: [...SUPPORTED_LOCALES],
    defaultCurrency: 'USD',
  },
  // Add more tenants as needed
  'shop.broxiva.com': {
    id: 'broxiva-shop',
    name: 'Broxiva Shop',
    domain: 'shop.broxiva.com',
    defaultLocale: 'en-us',
    supportedLocales: [...SUPPORTED_LOCALES],
    defaultCurrency: 'USD',
  },
  'ng.broxiva.com': {
    id: 'broxiva-ng',
    name: 'Broxiva Nigeria',
    domain: 'ng.broxiva.com',
    defaultLocale: 'en-us',
    supportedLocales: ['en-us', 'yo-ng', 'ha-ng'],
    defaultCurrency: 'NGN',
  },
  'de.broxiva.com': {
    id: 'broxiva-de',
    name: 'Broxiva Deutschland',
    domain: 'de.broxiva.com',
    defaultLocale: 'de-de',
    supportedLocales: ['de-de', 'en-us'],
    defaultCurrency: 'EUR',
  },
};

// ============================================================================
// Cookie Configuration
// ============================================================================

const COOKIE_CONFIG = {
  country: 'bx_country',
  language: 'bx_lang',
  currency: 'bx_currency',
  tenant: 'bx_tenant',
} as const;

const HEADER_CONFIG = {
  tenant: 'x-bx-tenant',
  country: 'x-bx-country',
  language: 'x-bx-language',
  currency: 'x-bx-currency',
  traceId: 'x-bx-trace-id',
  direction: 'x-bx-direction',
  locale: 'x-bx-locale',
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique trace ID for request tracking
 */
function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `bx-${timestamp}-${random}`;
}

/**
 * Parse locale string into components
 */
function parseLocale(locale: string): LocaleInfo {
  const normalized = locale.toLowerCase().replace('_', '-');
  const [language, region = ''] = normalized.split('-');

  return {
    locale: normalized,
    language,
    region: region.toUpperCase(),
    direction: RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr',
  };
}

/**
 * Check if a locale is supported
 */
function isLocaleSupported(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale.toLowerCase() as SupportedLocale);
}

/**
 * Get the best matching supported locale
 */
function findBestLocale(
  requested: string,
  supported: readonly string[] = SUPPORTED_LOCALES
): SupportedLocale {
  const normalized = requested.toLowerCase().replace('_', '-');

  // Exact match
  if (supported.includes(normalized as SupportedLocale)) {
    return normalized as SupportedLocale;
  }

  // Match by language only
  const [language] = normalized.split('-');
  const languageMatch = supported.find((loc) => loc.startsWith(`${language}-`));
  if (languageMatch) {
    return languageMatch as SupportedLocale;
  }

  return DEFAULT_LOCALE;
}

/**
 * Resolve tenant from hostname
 */
function resolveTenant(hostname: string): TenantConfig {
  // Check for exact domain match
  if (TENANT_CONFIGS[hostname]) {
    return TENANT_CONFIGS[hostname];
  }

  // Check for subdomain match (e.g., ng.broxiva.com)
  const subdomain = hostname.split('.')[0];
  const subdomainKey = `${subdomain}.broxiva.com`;
  if (TENANT_CONFIGS[subdomainKey]) {
    return TENANT_CONFIGS[subdomainKey];
  }

  // Default tenant
  return TENANT_CONFIGS.default;
}

/**
 * Detect country from Vercel geo headers or fallback
 */
function detectCountry(request: NextRequest): string {
  // Vercel provides geo headers automatically
  const vercelCountry = request.headers.get('x-vercel-ip-country');
  if (vercelCountry) {
    return vercelCountry.toUpperCase();
  }

  // Cloudflare header
  const cfCountry = request.headers.get('cf-ipcountry');
  if (cfCountry) {
    return cfCountry.toUpperCase();
  }

  // Check cookie for user preference
  const countryCookie = request.cookies.get(COOKIE_CONFIG.country);
  if (countryCookie?.value) {
    return countryCookie.value.toUpperCase();
  }

  // Default to US
  return 'US';
}

/**
 * Detect preferred language from Accept-Language header and cookies
 */
function detectLanguage(
  request: NextRequest,
  tenant: TenantConfig,
  country: string
): SupportedLocale {
  // 1. Check cookie for user preference (highest priority)
  const langCookie = request.cookies.get(COOKIE_CONFIG.language);
  if (langCookie?.value && isLocaleSupported(langCookie.value)) {
    return langCookie.value as SupportedLocale;
  }

  // 2. Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    // Parse Accept-Language header (e.g., "en-US,en;q=0.9,fr;q=0.8")
    const languages = acceptLanguage
      .split(',')
      .map((lang) => {
        const [locale, quality = 'q=1'] = lang.trim().split(';');
        const q = parseFloat(quality.replace('q=', '')) || 1;
        return { locale: locale.trim(), quality: q };
      })
      .sort((a, b) => b.quality - a.quality);

    // Find first supported locale
    for (const { locale } of languages) {
      const bestMatch = findBestLocale(locale, tenant.supportedLocales);
      if (bestMatch !== DEFAULT_LOCALE || locale.toLowerCase().startsWith('en')) {
        return bestMatch;
      }
    }
  }

  // 3. Infer from country
  const countryLocale = COUNTRY_LOCALE_MAP[country];
  if (countryLocale && tenant.supportedLocales.includes(countryLocale)) {
    return countryLocale;
  }

  // 4. Tenant default
  return tenant.defaultLocale as SupportedLocale;
}

/**
 * Get currency from country or cookie
 */
function resolveCurrency(request: NextRequest, country: string, tenant: TenantConfig): string {
  // Check cookie for user preference
  const currencyCookie = request.cookies.get(COOKIE_CONFIG.currency);
  if (currencyCookie?.value) {
    return currencyCookie.value.toUpperCase();
  }

  // Infer from country
  return COUNTRY_CURRENCY_MAP[country] || tenant.defaultCurrency;
}

/**
 * Check if the path is a static asset or API route
 */
function shouldSkipMiddleware(pathname: string): boolean {
  // Skip static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/fonts') ||
    pathname.includes('.')
  ) {
    return true;
  }

  // Skip health check endpoints
  if (pathname === '/health' || pathname === '/ready' || pathname === '/live') {
    return true;
  }

  return false;
}

/**
 * Extract locale from pathname if present
 */
function getLocaleFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const potentialLocale = segments[0].toLowerCase();
  if (isLocaleSupported(potentialLocale)) {
    return potentialLocale;
  }

  return null;
}

/**
 * Remove locale prefix from pathname
 */
function removeLocalePrefix(pathname: string): string {
  const localeFromPath = getLocaleFromPath(pathname);
  if (localeFromPath) {
    const segments = pathname.split('/').filter(Boolean);
    return '/' + segments.slice(1).join('/') || '/';
  }
  return pathname;
}

// ============================================================================
// Main Middleware
// ============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static assets and API routes
  if (shouldSkipMiddleware(pathname)) {
    return NextResponse.next();
  }

  // Get hostname for tenant resolution
  const hostname =
    request.headers.get('host') ||
    request.headers.get('x-forwarded-host') ||
    'broxiva.com';

  // ============================================================================
  // Resolve Context
  // ============================================================================

  const traceId = generateTraceId();
  const tenant = resolveTenant(hostname);
  const country = detectCountry(request);
  const locale = detectLanguage(request, tenant, country);
  const currency = resolveCurrency(request, country, tenant);
  const localeInfo = parseLocale(locale);

  // ============================================================================
  // Handle Locale Routing
  // ============================================================================

  const pathnameLocale = getLocaleFromPath(pathname);
  const pathnameWithoutLocale = removeLocalePrefix(pathname);

  // If no locale in path, redirect to locale-prefixed URL
  if (!pathnameLocale) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathnameWithoutLocale}`;

    const response = NextResponse.redirect(url);

    // Set cookies on redirect
    setCookies(response, { country, locale, currency, tenant: tenant.id });
    setHeaders(response, {
      traceId,
      tenant: tenant.id,
      country,
      locale,
      currency,
      direction: localeInfo.direction,
    });

    return response;
  }

  // Locale is in path - continue with rewrite
  const response = NextResponse.next();

  // ============================================================================
  // Set Headers and Cookies
  // ============================================================================

  setCookies(response, { country, locale: pathnameLocale, currency, tenant: tenant.id });
  setHeaders(response, {
    traceId,
    tenant: tenant.id,
    country,
    locale: pathnameLocale,
    currency,
    direction: parseLocale(pathnameLocale).direction,
  });

  return response;
}

/**
 * Set response cookies
 */
function setCookies(
  response: NextResponse,
  values: { country: string; locale: string; currency: string; tenant: string }
) {
  const cookieOptions = {
    httpOnly: false, // Accessible to client-side JS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  };

  response.cookies.set(COOKIE_CONFIG.country, values.country, cookieOptions);
  response.cookies.set(COOKIE_CONFIG.language, values.locale, cookieOptions);
  response.cookies.set(COOKIE_CONFIG.currency, values.currency, cookieOptions);
  response.cookies.set(COOKIE_CONFIG.tenant, values.tenant, cookieOptions);
}

/**
 * Set response headers
 */
function setHeaders(
  response: NextResponse,
  values: {
    traceId: string;
    tenant: string;
    country: string;
    locale: string;
    currency: string;
    direction: 'ltr' | 'rtl';
  }
) {
  response.headers.set(HEADER_CONFIG.traceId, values.traceId);
  response.headers.set(HEADER_CONFIG.tenant, values.tenant);
  response.headers.set(HEADER_CONFIG.country, values.country);
  response.headers.set(HEADER_CONFIG.language, values.locale);
  response.headers.set(HEADER_CONFIG.locale, values.locale);
  response.headers.set(HEADER_CONFIG.currency, values.currency);
  response.headers.set(HEADER_CONFIG.direction, values.direction);
}

// ============================================================================
// Matcher Configuration
// ============================================================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
};
