/**
 * Country Detection Utilities
 *
 * Server and client utilities for geo detection and country information
 */

import { headers } from 'next/headers';
import { I18N_HEADER_NAMES, I18N_COOKIE_NAMES } from '../i18n-edge/config';

// ============================================================================
// Types
// ============================================================================

export interface CountryInfo {
  code: string;
  name: string;
  nativeName: string;
  continent: string;
  region: string;
  currencyCode: string;
  callingCode: string;
  flag: string;
  languages: string[];
  timezones: string[];
}

export interface GeoContext {
  country: string;
  countryInfo: CountryInfo | undefined;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
}

// ============================================================================
// Country Database
// ============================================================================

export const COUNTRIES: Record<string, CountryInfo> = {
  US: {
    code: 'US',
    name: 'United States',
    nativeName: 'United States',
    continent: 'North America',
    region: 'Americas',
    currencyCode: 'USD',
    callingCode: '+1',
    flag: 'us',
    languages: ['en'],
    timezones: [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Anchorage',
      'Pacific/Honolulu',
    ],
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    nativeName: 'United Kingdom',
    continent: 'Europe',
    region: 'Europe',
    currencyCode: 'GBP',
    callingCode: '+44',
    flag: 'gb',
    languages: ['en'],
    timezones: ['Europe/London'],
  },
  DE: {
    code: 'DE',
    name: 'Germany',
    nativeName: 'Deutschland',
    continent: 'Europe',
    region: 'Europe',
    currencyCode: 'EUR',
    callingCode: '+49',
    flag: 'de',
    languages: ['de'],
    timezones: ['Europe/Berlin'],
  },
  FR: {
    code: 'FR',
    name: 'France',
    nativeName: 'France',
    continent: 'Europe',
    region: 'Europe',
    currencyCode: 'EUR',
    callingCode: '+33',
    flag: 'fr',
    languages: ['fr'],
    timezones: ['Europe/Paris'],
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    nativeName: 'Canada',
    continent: 'North America',
    region: 'Americas',
    currencyCode: 'CAD',
    callingCode: '+1',
    flag: 'ca',
    languages: ['en', 'fr'],
    timezones: [
      'America/Toronto',
      'America/Vancouver',
      'America/Edmonton',
      'America/Halifax',
    ],
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    nativeName: 'Australia',
    continent: 'Oceania',
    region: 'Oceania',
    currencyCode: 'AUD',
    callingCode: '+61',
    flag: 'au',
    languages: ['en'],
    timezones: ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth'],
  },
  JP: {
    code: 'JP',
    name: 'Japan',
    nativeName: '日本',
    continent: 'Asia',
    region: 'Asia',
    currencyCode: 'JPY',
    callingCode: '+81',
    flag: 'jp',
    languages: ['ja'],
    timezones: ['Asia/Tokyo'],
  },
  CN: {
    code: 'CN',
    name: 'China',
    nativeName: '中国',
    continent: 'Asia',
    region: 'Asia',
    currencyCode: 'CNY',
    callingCode: '+86',
    flag: 'cn',
    languages: ['zh'],
    timezones: ['Asia/Shanghai'],
  },
  NG: {
    code: 'NG',
    name: 'Nigeria',
    nativeName: 'Nigeria',
    continent: 'Africa',
    region: 'Africa',
    currencyCode: 'NGN',
    callingCode: '+234',
    flag: 'ng',
    languages: ['en', 'yo', 'ha', 'ig'],
    timezones: ['Africa/Lagos'],
  },
  ZA: {
    code: 'ZA',
    name: 'South Africa',
    nativeName: 'South Africa',
    continent: 'Africa',
    region: 'Africa',
    currencyCode: 'ZAR',
    callingCode: '+27',
    flag: 'za',
    languages: ['en', 'af', 'zu', 'xh'],
    timezones: ['Africa/Johannesburg'],
  },
  KE: {
    code: 'KE',
    name: 'Kenya',
    nativeName: 'Kenya',
    continent: 'Africa',
    region: 'Africa',
    currencyCode: 'KES',
    callingCode: '+254',
    flag: 'ke',
    languages: ['en', 'sw'],
    timezones: ['Africa/Nairobi'],
  },
  IN: {
    code: 'IN',
    name: 'India',
    nativeName: 'India',
    continent: 'Asia',
    region: 'Asia',
    currencyCode: 'INR',
    callingCode: '+91',
    flag: 'in',
    languages: ['hi', 'en'],
    timezones: ['Asia/Kolkata'],
  },
  BR: {
    code: 'BR',
    name: 'Brazil',
    nativeName: 'Brasil',
    continent: 'South America',
    region: 'Americas',
    currencyCode: 'BRL',
    callingCode: '+55',
    flag: 'br',
    languages: ['pt'],
    timezones: ['America/Sao_Paulo', 'America/Manaus'],
  },
  MX: {
    code: 'MX',
    name: 'Mexico',
    nativeName: 'Mexico',
    continent: 'North America',
    region: 'Americas',
    currencyCode: 'MXN',
    callingCode: '+52',
    flag: 'mx',
    languages: ['es'],
    timezones: ['America/Mexico_City', 'America/Tijuana'],
  },
  ES: {
    code: 'ES',
    name: 'Spain',
    nativeName: 'Espana',
    continent: 'Europe',
    region: 'Europe',
    currencyCode: 'EUR',
    callingCode: '+34',
    flag: 'es',
    languages: ['es'],
    timezones: ['Europe/Madrid'],
  },
  IT: {
    code: 'IT',
    name: 'Italy',
    nativeName: 'Italia',
    continent: 'Europe',
    region: 'Europe',
    currencyCode: 'EUR',
    callingCode: '+39',
    flag: 'it',
    languages: ['it'],
    timezones: ['Europe/Rome'],
  },
  NL: {
    code: 'NL',
    name: 'Netherlands',
    nativeName: 'Nederland',
    continent: 'Europe',
    region: 'Europe',
    currencyCode: 'EUR',
    callingCode: '+31',
    flag: 'nl',
    languages: ['nl'],
    timezones: ['Europe/Amsterdam'],
  },
  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    nativeName: 'الإمارات العربية المتحدة',
    continent: 'Asia',
    region: 'Middle East',
    currencyCode: 'AED',
    callingCode: '+971',
    flag: 'ae',
    languages: ['ar', 'en'],
    timezones: ['Asia/Dubai'],
  },
  SA: {
    code: 'SA',
    name: 'Saudi Arabia',
    nativeName: 'المملكة العربية السعودية',
    continent: 'Asia',
    region: 'Middle East',
    currencyCode: 'SAR',
    callingCode: '+966',
    flag: 'sa',
    languages: ['ar'],
    timezones: ['Asia/Riyadh'],
  },
  SG: {
    code: 'SG',
    name: 'Singapore',
    nativeName: 'Singapore',
    continent: 'Asia',
    region: 'Asia',
    currencyCode: 'SGD',
    callingCode: '+65',
    flag: 'sg',
    languages: ['en', 'zh', 'ms', 'ta'],
    timezones: ['Asia/Singapore'],
  },
  GH: {
    code: 'GH',
    name: 'Ghana',
    nativeName: 'Ghana',
    continent: 'Africa',
    region: 'Africa',
    currencyCode: 'GHS',
    callingCode: '+233',
    flag: 'gh',
    languages: ['en'],
    timezones: ['Africa/Accra'],
  },
  EG: {
    code: 'EG',
    name: 'Egypt',
    nativeName: 'مصر',
    continent: 'Africa',
    region: 'Africa',
    currencyCode: 'EGP',
    callingCode: '+20',
    flag: 'eg',
    languages: ['ar'],
    timezones: ['Africa/Cairo'],
  },
};

// ============================================================================
// Server-Side Detection
// ============================================================================

/**
 * Get geo context from middleware headers (Server Components)
 */
export async function getGeoContext(): Promise<GeoContext> {
  const headerStore = await headers();

  const country = headerStore.get(I18N_HEADER_NAMES.country) || 'US';
  const city = headerStore.get('x-vercel-ip-city') || undefined;
  const region = headerStore.get('x-vercel-ip-country-region') || undefined;
  const latitude = headerStore.get('x-vercel-ip-latitude');
  const longitude = headerStore.get('x-vercel-ip-longitude');

  return {
    country,
    countryInfo: COUNTRIES[country],
    city,
    region,
    latitude: latitude ? parseFloat(latitude) : undefined,
    longitude: longitude ? parseFloat(longitude) : undefined,
  };
}

/**
 * Get country code from headers
 */
export async function getCountryCode(): Promise<string> {
  const headerStore = await headers();
  return headerStore.get(I18N_HEADER_NAMES.country) || 'US';
}

/**
 * Get country info from headers
 */
export async function getCountryInfo(): Promise<CountryInfo | undefined> {
  const country = await getCountryCode();
  return COUNTRIES[country];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get country by code
 */
export function getCountryByCode(code: string): CountryInfo | undefined {
  return COUNTRIES[code.toUpperCase()];
}

/**
 * Get all countries
 */
export function getAllCountries(): CountryInfo[] {
  return Object.values(COUNTRIES);
}

/**
 * Get countries by continent
 */
export function getCountriesByContinent(continent: string): CountryInfo[] {
  return Object.values(COUNTRIES).filter(
    (country) => country.continent.toLowerCase() === continent.toLowerCase()
  );
}

/**
 * Get countries by region
 */
export function getCountriesByRegion(region: string): CountryInfo[] {
  return Object.values(COUNTRIES).filter(
    (country) => country.region.toLowerCase() === region.toLowerCase()
  );
}

/**
 * Get countries that support a language
 */
export function getCountriesByLanguage(languageCode: string): CountryInfo[] {
  return Object.values(COUNTRIES).filter((country) =>
    country.languages.includes(languageCode.toLowerCase())
  );
}

/**
 * Check if a country is valid
 */
export function isValidCountry(code: string): boolean {
  return code.toUpperCase() in COUNTRIES;
}

/**
 * Get country calling code
 */
export function getCountryCallingCode(code: string): string | undefined {
  return COUNTRIES[code.toUpperCase()]?.callingCode;
}

/**
 * Get country flag emoji/code
 */
export function getCountryFlag(code: string): string {
  return COUNTRIES[code.toUpperCase()]?.flag || 'xx';
}

/**
 * Get popular countries for UI selection
 */
export function getPopularCountries(): CountryInfo[] {
  const popular = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'NG', 'IN', 'BR', 'AE', 'ZA'];
  return popular.map((code) => COUNTRIES[code]).filter(Boolean);
}

/**
 * Search countries by name
 */
export function searchCountries(query: string): CountryInfo[] {
  const normalizedQuery = query.toLowerCase().trim();

  return Object.values(COUNTRIES).filter(
    (country) =>
      country.name.toLowerCase().includes(normalizedQuery) ||
      country.nativeName.toLowerCase().includes(normalizedQuery) ||
      country.code.toLowerCase() === normalizedQuery
  );
}
