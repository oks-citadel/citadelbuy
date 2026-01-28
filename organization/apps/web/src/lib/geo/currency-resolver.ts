/**
 * Currency Resolver
 *
 * Resolves currency based on country, user preference, and context
 */

import { headers, cookies } from 'next/headers';
import { I18N_HEADER_NAMES, I18N_COOKIE_NAMES } from '../i18n-edge/config';
import {
  CURRENCIES,
  COUNTRY_CURRENCY_MAP,
  type Currency,
} from '../i18n-edge/currency-map';

// ============================================================================
// Types
// ============================================================================

export interface CurrencyContext {
  code: string;
  currency: Currency;
  country: string;
  source: 'cookie' | 'header' | 'country' | 'default';
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: number;
}

// ============================================================================
// Server-Side Currency Resolution
// ============================================================================

/**
 * Get currency context from middleware headers (Server Components)
 */
export async function getCurrencyContext(): Promise<CurrencyContext> {
  const headerStore = await headers();
  const cookieStore = await cookies();

  // Priority 1: Cookie (user preference)
  const currencyCookie = cookieStore.get(I18N_COOKIE_NAMES.currency);
  if (currencyCookie?.value && isValidCurrency(currencyCookie.value)) {
    return {
      code: currencyCookie.value,
      currency: CURRENCIES[currencyCookie.value],
      country: headerStore.get(I18N_HEADER_NAMES.country) || 'US',
      source: 'cookie',
    };
  }

  // Priority 2: Header (set by middleware)
  const currencyHeader = headerStore.get(I18N_HEADER_NAMES.currency);
  if (currencyHeader && isValidCurrency(currencyHeader)) {
    return {
      code: currencyHeader,
      currency: CURRENCIES[currencyHeader],
      country: headerStore.get(I18N_HEADER_NAMES.country) || 'US',
      source: 'header',
    };
  }

  // Priority 3: Infer from country
  const country = headerStore.get(I18N_HEADER_NAMES.country) || 'US';
  const countryCurrency = COUNTRY_CURRENCY_MAP[country];
  if (countryCurrency && isValidCurrency(countryCurrency)) {
    return {
      code: countryCurrency,
      currency: CURRENCIES[countryCurrency],
      country,
      source: 'country',
    };
  }

  // Priority 4: Default to USD
  return {
    code: 'USD',
    currency: CURRENCIES.USD,
    country,
    source: 'default',
  };
}

/**
 * Get currency code from headers
 */
export async function getCurrencyCode(): Promise<string> {
  const context = await getCurrencyContext();
  return context.code;
}

/**
 * Get full currency info from headers
 */
export async function getCurrencyInfo(): Promise<Currency> {
  const context = await getCurrencyContext();
  return context.currency;
}

// ============================================================================
// Currency Resolution Utilities
// ============================================================================

/**
 * Check if currency code is valid
 */
export function isValidCurrency(code: string): boolean {
  return code.toUpperCase() in CURRENCIES;
}

/**
 * Get currency for a country
 */
export function getCurrencyForCountry(countryCode: string): Currency {
  const currencyCode = COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || 'USD';
  return CURRENCIES[currencyCode] || CURRENCIES.USD;
}

/**
 * Get currency by code
 */
export function getCurrencyByCode(code: string): Currency | undefined {
  return CURRENCIES[code.toUpperCase()];
}

/**
 * Get all available currencies
 */
export function getAllCurrencies(): Currency[] {
  return Object.values(CURRENCIES);
}

/**
 * Get popular currencies for UI
 */
export function getPopularCurrencies(): Currency[] {
  const popular = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CAD', 'AUD', 'NGN', 'INR', 'BRL'];
  return popular.map((code) => CURRENCIES[code]).filter(Boolean);
}

/**
 * Get currencies by region
 */
export function getCurrenciesByRegion(
  region: 'americas' | 'europe' | 'africa' | 'asia' | 'oceania' | 'middle-east'
): Currency[] {
  const regionCurrencies: Record<string, string[]> = {
    americas: ['USD', 'CAD', 'MXN', 'BRL', 'ARS', 'COP', 'CLP'],
    europe: ['EUR', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RUB'],
    africa: ['ZAR', 'NGN', 'KES', 'EGP', 'GHS', 'MAD'],
    asia: ['JPY', 'CNY', 'KRW', 'SGD', 'HKD', 'INR', 'MYR', 'THB', 'IDR', 'PHP', 'VND'],
    oceania: ['AUD', 'NZD'],
    'middle-east': ['AED', 'SAR', 'ILS', 'QAR', 'KWD', 'BHD'],
  };

  const codes = regionCurrencies[region] || [];
  return codes.map((code) => CURRENCIES[code]).filter(Boolean);
}

// ============================================================================
// Price Formatting
// ============================================================================

/**
 * Format price in specified currency
 */
export function formatPrice(
  amount: number,
  currencyCode: string,
  options: {
    locale?: string;
    showCode?: boolean;
    compact?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string {
  const currency = CURRENCIES[currencyCode.toUpperCase()] || CURRENCIES.USD;
  const {
    locale = 'en-US',
    showCode = false,
    compact = false,
    minimumFractionDigits = currency.decimals,
    maximumFractionDigits = currency.decimals,
  } = options;

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits,
      maximumFractionDigits,
      notation: compact && amount >= 1000 ? 'compact' : 'standard',
    });

    let formatted = formatter.format(amount);

    if (showCode && !formatted.includes(currency.code)) {
      formatted = `${formatted} ${currency.code}`;
    }

    return formatted;
  } catch {
    // Fallback to simple formatting
    const symbol = currency.symbolPosition === 'before' ? currency.symbol : '';
    const suffix = currency.symbolPosition === 'after' ? currency.symbol : '';
    return `${symbol}${amount.toFixed(currency.decimals)}${suffix}`;
  }
}

/**
 * Format price range
 */
export function formatPriceRange(
  minAmount: number,
  maxAmount: number,
  currencyCode: string,
  locale?: string
): string {
  const formattedMin = formatPrice(minAmount, currencyCode, { locale });
  const formattedMax = formatPrice(maxAmount, currencyCode, { locale });

  return `${formattedMin} - ${formattedMax}`;
}

/**
 * Calculate percentage discount
 */
export function calculateDiscount(originalPrice: number, salePrice: number): number {
  if (originalPrice <= 0 || salePrice < 0 || salePrice >= originalPrice) {
    return 0;
  }
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
}

/**
 * Format discount percentage
 */
export function formatDiscount(percentage: number): string {
  return `-${percentage}%`;
}

// ============================================================================
// Exchange Rate Utilities
// ============================================================================

// Simple in-memory cache for exchange rates
let exchangeRateCache: Record<string, ExchangeRate> = {};
let lastFetchTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get cached exchange rates (client-side)
 * In production, this would fetch from an API
 */
export function getCachedExchangeRates(): Record<string, number> {
  // Static rates for demo - in production, fetch from API
  return {
    USD: 1.0,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 149.5,
    CNY: 7.24,
    NGN: 1550.0,
    CAD: 1.36,
    AUD: 1.53,
    INR: 83.12,
    BRL: 4.97,
    MXN: 17.15,
    KRW: 1330.0,
    ZAR: 18.65,
    AED: 3.67,
    SAR: 3.75,
  };
}

/**
 * Convert amount between currencies
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates?: Record<string, number>
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const exchangeRates = rates || getCachedExchangeRates();
  const fromRate = exchangeRates[fromCurrency.toUpperCase()] || 1;
  const toRate = exchangeRates[toCurrency.toUpperCase()] || 1;

  // Convert to USD first, then to target currency
  const usdAmount = amount / fromRate;
  return usdAmount * toRate;
}

/**
 * Get exchange rate between two currencies
 */
export function getExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  rates?: Record<string, number>
): number {
  if (fromCurrency === toCurrency) {
    return 1;
  }

  const exchangeRates = rates || getCachedExchangeRates();
  const fromRate = exchangeRates[fromCurrency.toUpperCase()] || 1;
  const toRate = exchangeRates[toCurrency.toUpperCase()] || 1;

  return toRate / fromRate;
}
