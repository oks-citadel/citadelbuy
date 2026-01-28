/**
 * Currency Mapping and Utilities
 *
 * Comprehensive country-to-currency mapping with
 * currency formatting utilities
 */

// ============================================================================
// Types
// ============================================================================

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  symbolPosition: 'before' | 'after';
  thousandSeparator: string;
  decimalSeparator: string;
}

export interface CountryCurrencyInfo {
  country: string;
  countryName: string;
  currency: string;
  locale: string;
}

// ============================================================================
// Currency Definitions
// ============================================================================

export const CURRENCIES: Record<string, Currency> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  EUR: {
    code: 'EUR',
    symbol: '\u20AC',
    name: 'Euro',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: '.',
    decimalSeparator: ',',
  },
  GBP: {
    code: 'GBP',
    symbol: '\u00A3',
    name: 'British Pound',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  JPY: {
    code: 'JPY',
    symbol: '\u00A5',
    name: 'Japanese Yen',
    decimals: 0,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  CNY: {
    code: 'CNY',
    symbol: '\u00A5',
    name: 'Chinese Yuan',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  NGN: {
    code: 'NGN',
    symbol: '\u20A6',
    name: 'Nigerian Naira',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  CAD: {
    code: 'CAD',
    symbol: 'CA$',
    name: 'Canadian Dollar',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  INR: {
    code: 'INR',
    symbol: '\u20B9',
    name: 'Indian Rupee',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    name: 'Brazilian Real',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: '.',
    decimalSeparator: ',',
  },
  MXN: {
    code: 'MXN',
    symbol: 'MX$',
    name: 'Mexican Peso',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  KRW: {
    code: 'KRW',
    symbol: '\u20A9',
    name: 'South Korean Won',
    decimals: 0,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  ZAR: {
    code: 'ZAR',
    symbol: 'R',
    name: 'South African Rand',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  CHF: {
    code: 'CHF',
    symbol: 'CHF',
    name: 'Swiss Franc',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: "'",
    decimalSeparator: '.',
  },
  SEK: {
    code: 'SEK',
    symbol: 'kr',
    name: 'Swedish Krona',
    decimals: 2,
    symbolPosition: 'after',
    thousandSeparator: ' ',
    decimalSeparator: ',',
  },
  NOK: {
    code: 'NOK',
    symbol: 'kr',
    name: 'Norwegian Krone',
    decimals: 2,
    symbolPosition: 'after',
    thousandSeparator: ' ',
    decimalSeparator: ',',
  },
  DKK: {
    code: 'DKK',
    symbol: 'kr',
    name: 'Danish Krone',
    decimals: 2,
    symbolPosition: 'after',
    thousandSeparator: '.',
    decimalSeparator: ',',
  },
  PLN: {
    code: 'PLN',
    symbol: 'z\u0142',
    name: 'Polish Zloty',
    decimals: 2,
    symbolPosition: 'after',
    thousandSeparator: ' ',
    decimalSeparator: ',',
  },
  AED: {
    code: 'AED',
    symbol: '\u062F.\u0625',
    name: 'UAE Dirham',
    decimals: 2,
    symbolPosition: 'after',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  SAR: {
    code: 'SAR',
    symbol: '\u0631.\u0633',
    name: 'Saudi Riyal',
    decimals: 2,
    symbolPosition: 'after',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  HKD: {
    code: 'HKD',
    symbol: 'HK$',
    name: 'Hong Kong Dollar',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  MYR: {
    code: 'MYR',
    symbol: 'RM',
    name: 'Malaysian Ringgit',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  THB: {
    code: 'THB',
    symbol: '\u0E3F',
    name: 'Thai Baht',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  IDR: {
    code: 'IDR',
    symbol: 'Rp',
    name: 'Indonesian Rupiah',
    decimals: 0,
    symbolPosition: 'before',
    thousandSeparator: '.',
    decimalSeparator: ',',
  },
  PHP: {
    code: 'PHP',
    symbol: '\u20B1',
    name: 'Philippine Peso',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  VND: {
    code: 'VND',
    symbol: '\u20AB',
    name: 'Vietnamese Dong',
    decimals: 0,
    symbolPosition: 'after',
    thousandSeparator: '.',
    decimalSeparator: ',',
  },
  KES: {
    code: 'KES',
    symbol: 'KSh',
    name: 'Kenyan Shilling',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  GHS: {
    code: 'GHS',
    symbol: '\u20B5',
    name: 'Ghanaian Cedi',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  EGP: {
    code: 'EGP',
    symbol: 'E\u00A3',
    name: 'Egyptian Pound',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  TRY: {
    code: 'TRY',
    symbol: '\u20BA',
    name: 'Turkish Lira',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: '.',
    decimalSeparator: ',',
  },
  RUB: {
    code: 'RUB',
    symbol: '\u20BD',
    name: 'Russian Ruble',
    decimals: 2,
    symbolPosition: 'after',
    thousandSeparator: ' ',
    decimalSeparator: ',',
  },
  NZD: {
    code: 'NZD',
    symbol: 'NZ$',
    name: 'New Zealand Dollar',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  ILS: {
    code: 'ILS',
    symbol: '\u20AA',
    name: 'Israeli Shekel',
    decimals: 2,
    symbolPosition: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
};

// ============================================================================
// Country to Currency Mapping
// ============================================================================

export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  // Americas
  US: 'USD',
  CA: 'CAD',
  MX: 'MXN',
  BR: 'BRL',
  AR: 'ARS',
  CO: 'COP',
  CL: 'CLP',
  PE: 'PEN',
  VE: 'VES',
  EC: 'USD',
  PA: 'USD',
  PR: 'USD',
  UY: 'UYU',
  PY: 'PYG',
  BO: 'BOB',

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
  LU: 'EUR',
  SK: 'EUR',
  SI: 'EUR',
  EE: 'EUR',
  LV: 'EUR',
  LT: 'EUR',
  MT: 'EUR',
  CY: 'EUR',
  CH: 'CHF',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  PL: 'PLN',
  CZ: 'CZK',
  HU: 'HUF',
  RO: 'RON',
  BG: 'BGN',
  HR: 'EUR',
  RU: 'RUB',
  UA: 'UAH',
  TR: 'TRY',
  RS: 'RSD',
  IS: 'ISK',

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
  CM: 'XAF',
  AO: 'AOA',
  MU: 'MUR',
  TN: 'TND',
  DZ: 'DZD',
  RW: 'RWF',
  ZM: 'ZMW',
  ZW: 'ZWL',
  BW: 'BWP',
  NA: 'NAD',

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
  IQ: 'IQD',
  IR: 'IRR',
  PS: 'ILS',
  SY: 'SYP',
  YE: 'YER',

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
  LK: 'LKR',
  NP: 'NPR',
  MM: 'MMK',
  KH: 'KHR',
  LA: 'LAK',
  MN: 'MNT',
  KZ: 'KZT',
  UZ: 'UZS',
  AZ: 'AZN',
  GE: 'GEL',
  AM: 'AMD',

  // Oceania
  AU: 'AUD',
  NZ: 'NZD',
  FJ: 'FJD',
  PG: 'PGK',
};

// ============================================================================
// Currency Utilities
// ============================================================================

/**
 * Get currency code for a country
 */
export function getCurrencyForCountry(countryCode: string): string {
  return COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || 'USD';
}

/**
 * Get currency definition
 */
export function getCurrency(currencyCode: string): Currency {
  return CURRENCIES[currencyCode.toUpperCase()] || CURRENCIES.USD;
}

/**
 * Format amount in a specific currency
 */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  options: {
    showCode?: boolean;
    compact?: boolean;
    locale?: string;
  } = {}
): string {
  const { showCode = false, compact = false, locale = 'en-US' } = options;
  const currency = getCurrency(currencyCode);

  // Use Intl.NumberFormat for proper formatting
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: compact ? 0 : currency.decimals,
      maximumFractionDigits: currency.decimals,
      notation: compact && amount >= 1000 ? 'compact' : 'standard',
    });

    let formatted = formatter.format(amount);

    // Append currency code if requested
    if (showCode && !formatted.includes(currency.code)) {
      formatted = `${formatted} ${currency.code}`;
    }

    return formatted;
  } catch {
    // Fallback to manual formatting
    return manualFormatCurrency(amount, currency, showCode);
  }
}

/**
 * Manual currency formatting fallback
 */
function manualFormatCurrency(
  amount: number,
  currency: Currency,
  showCode: boolean
): string {
  const fixed = amount.toFixed(currency.decimals);
  const [whole, decimal] = fixed.split('.');

  // Add thousand separators
  const formattedWhole = whole.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    currency.thousandSeparator
  );

  const formattedAmount =
    currency.decimals > 0
      ? `${formattedWhole}${currency.decimalSeparator}${decimal}`
      : formattedWhole;

  const withSymbol =
    currency.symbolPosition === 'before'
      ? `${currency.symbol}${formattedAmount}`
      : `${formattedAmount}${currency.symbol}`;

  return showCode ? `${withSymbol} ${currency.code}` : withSymbol;
}

/**
 * Convert between currencies using exchange rates
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const fromRate = exchangeRates[fromCurrency] || 1;
  const toRate = exchangeRates[toCurrency] || 1;

  // Convert to base (USD) then to target currency
  const baseAmount = amount / fromRate;
  return baseAmount * toRate;
}

/**
 * Get all supported currencies
 */
export function getAllCurrencies(): Currency[] {
  return Object.values(CURRENCIES);
}

/**
 * Get popular currencies (for UI selection)
 */
export function getPopularCurrencies(): Currency[] {
  const popularCodes = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CAD', 'AUD', 'NGN', 'INR', 'BRL'];
  return popularCodes.map((code) => CURRENCIES[code]).filter(Boolean);
}

/**
 * Check if currency code is valid
 */
export function isValidCurrency(currencyCode: string): boolean {
  return currencyCode.toUpperCase() in CURRENCIES;
}
