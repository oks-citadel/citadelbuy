/**
 * Supported Currencies Configuration
 * Complete list of supported currencies for Broxiva Global B2B Platform
 */

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  region: string;
  countries: string[];
  isActive: boolean;
  isCrypto?: boolean;
}

/**
 * All supported currencies
 */
export const SUPPORTED_CURRENCIES: Currency[] = [
  // Major Global Currencies
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    decimalPlaces: 2,
    region: 'North America',
    countries: ['US', 'EC', 'SV', 'TL', 'ZW'],
    isActive: true,
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    decimalPlaces: 2,
    region: 'Europe',
    countries: ['AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES'],
    isActive: true,
  },
  {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    decimalPlaces: 2,
    region: 'Europe',
    countries: ['GB', 'IM', 'JE', 'GG'],
    isActive: true,
  },
  {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    decimalPlaces: 0,
    region: 'Asia',
    countries: ['JP'],
    isActive: true,
  },
  {
    code: 'CNY',
    name: 'Chinese Yuan',
    symbol: '¥',
    decimalPlaces: 2,
    region: 'Asia',
    countries: ['CN'],
    isActive: true,
  },

  // African Currencies (Priority Markets)
  {
    code: 'NGN',
    name: 'Nigerian Naira',
    symbol: '₦',
    decimalPlaces: 2,
    region: 'Africa',
    countries: ['NG'],
    isActive: true,
  },
  {
    code: 'ZAR',
    name: 'South African Rand',
    symbol: 'R',
    decimalPlaces: 2,
    region: 'Africa',
    countries: ['ZA', 'LS', 'NA'],
    isActive: true,
  },
  {
    code: 'KES',
    name: 'Kenyan Shilling',
    symbol: 'KSh',
    decimalPlaces: 2,
    region: 'Africa',
    countries: ['KE'],
    isActive: true,
  },
  {
    code: 'GHS',
    name: 'Ghanaian Cedi',
    symbol: 'GH₵',
    decimalPlaces: 2,
    region: 'Africa',
    countries: ['GH'],
    isActive: true,
  },
  {
    code: 'EGP',
    name: 'Egyptian Pound',
    symbol: 'E£',
    decimalPlaces: 2,
    region: 'Africa',
    countries: ['EG'],
    isActive: true,
  },
  {
    code: 'TZS',
    name: 'Tanzanian Shilling',
    symbol: 'TSh',
    decimalPlaces: 2,
    region: 'Africa',
    countries: ['TZ'],
    isActive: true,
  },
  {
    code: 'UGX',
    name: 'Ugandan Shilling',
    symbol: 'USh',
    decimalPlaces: 0,
    region: 'Africa',
    countries: ['UG'],
    isActive: true,
  },
  {
    code: 'XOF',
    name: 'West African CFA Franc',
    symbol: 'CFA',
    decimalPlaces: 0,
    region: 'Africa',
    countries: ['BJ', 'BF', 'CI', 'GW', 'ML', 'NE', 'SN', 'TG'],
    isActive: true,
  },
  {
    code: 'XAF',
    name: 'Central African CFA Franc',
    symbol: 'FCFA',
    decimalPlaces: 0,
    region: 'Africa',
    countries: ['CM', 'CF', 'TD', 'CG', 'GQ', 'GA'],
    isActive: true,
  },
  {
    code: 'RWF',
    name: 'Rwandan Franc',
    symbol: 'RF',
    decimalPlaces: 0,
    region: 'Africa',
    countries: ['RW'],
    isActive: true,
  },

  // Other Major Currencies
  {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    decimalPlaces: 2,
    region: 'North America',
    countries: ['CA'],
    isActive: true,
  },
  {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    decimalPlaces: 2,
    region: 'Oceania',
    countries: ['AU', 'CX', 'CC', 'HM', 'KI', 'NR', 'NF', 'TV'],
    isActive: true,
  },
  {
    code: 'CHF',
    name: 'Swiss Franc',
    symbol: 'CHF',
    decimalPlaces: 2,
    region: 'Europe',
    countries: ['CH', 'LI'],
    isActive: true,
  },
  {
    code: 'SEK',
    name: 'Swedish Krona',
    symbol: 'kr',
    decimalPlaces: 2,
    region: 'Europe',
    countries: ['SE'],
    isActive: true,
  },
  {
    code: 'NOK',
    name: 'Norwegian Krone',
    symbol: 'kr',
    decimalPlaces: 2,
    region: 'Europe',
    countries: ['NO', 'SJ', 'BV'],
    isActive: true,
  },
  {
    code: 'DKK',
    name: 'Danish Krone',
    symbol: 'kr',
    decimalPlaces: 2,
    region: 'Europe',
    countries: ['DK', 'FO', 'GL'],
    isActive: true,
  },

  // Asian Currencies
  {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    decimalPlaces: 2,
    region: 'Asia',
    countries: ['IN', 'BT'],
    isActive: true,
  },
  {
    code: 'KRW',
    name: 'South Korean Won',
    symbol: '₩',
    decimalPlaces: 0,
    region: 'Asia',
    countries: ['KR'],
    isActive: true,
  },
  {
    code: 'SGD',
    name: 'Singapore Dollar',
    symbol: 'S$',
    decimalPlaces: 2,
    region: 'Asia',
    countries: ['SG', 'BN'],
    isActive: true,
  },
  {
    code: 'HKD',
    name: 'Hong Kong Dollar',
    symbol: 'HK$',
    decimalPlaces: 2,
    region: 'Asia',
    countries: ['HK'],
    isActive: true,
  },
  {
    code: 'THB',
    name: 'Thai Baht',
    symbol: '฿',
    decimalPlaces: 2,
    region: 'Asia',
    countries: ['TH'],
    isActive: true,
  },
  {
    code: 'MYR',
    name: 'Malaysian Ringgit',
    symbol: 'RM',
    decimalPlaces: 2,
    region: 'Asia',
    countries: ['MY'],
    isActive: true,
  },
  {
    code: 'IDR',
    name: 'Indonesian Rupiah',
    symbol: 'Rp',
    decimalPlaces: 2,
    region: 'Asia',
    countries: ['ID'],
    isActive: true,
  },
  {
    code: 'PHP',
    name: 'Philippine Peso',
    symbol: '₱',
    decimalPlaces: 2,
    region: 'Asia',
    countries: ['PH'],
    isActive: true,
  },
  {
    code: 'VND',
    name: 'Vietnamese Dong',
    symbol: '₫',
    decimalPlaces: 0,
    region: 'Asia',
    countries: ['VN'],
    isActive: true,
  },
  {
    code: 'PKR',
    name: 'Pakistani Rupee',
    symbol: '₨',
    decimalPlaces: 2,
    region: 'Asia',
    countries: ['PK'],
    isActive: true,
  },
  {
    code: 'BDT',
    name: 'Bangladeshi Taka',
    symbol: '৳',
    decimalPlaces: 2,
    region: 'Asia',
    countries: ['BD'],
    isActive: true,
  },

  // Middle East Currencies
  {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'د.إ',
    decimalPlaces: 2,
    region: 'Middle East',
    countries: ['AE'],
    isActive: true,
  },
  {
    code: 'SAR',
    name: 'Saudi Riyal',
    symbol: '﷼',
    decimalPlaces: 2,
    region: 'Middle East',
    countries: ['SA'],
    isActive: true,
  },
  {
    code: 'ILS',
    name: 'Israeli New Shekel',
    symbol: '₪',
    decimalPlaces: 2,
    region: 'Middle East',
    countries: ['IL', 'PS'],
    isActive: true,
  },
  {
    code: 'QAR',
    name: 'Qatari Riyal',
    symbol: '﷼',
    decimalPlaces: 2,
    region: 'Middle East',
    countries: ['QA'],
    isActive: true,
  },
  {
    code: 'KWD',
    name: 'Kuwaiti Dinar',
    symbol: 'د.ك',
    decimalPlaces: 3,
    region: 'Middle East',
    countries: ['KW'],
    isActive: true,
  },
  {
    code: 'BHD',
    name: 'Bahraini Dinar',
    symbol: 'د.ب',
    decimalPlaces: 3,
    region: 'Middle East',
    countries: ['BH'],
    isActive: true,
  },
  {
    code: 'OMR',
    name: 'Omani Rial',
    symbol: '﷼',
    decimalPlaces: 3,
    region: 'Middle East',
    countries: ['OM'],
    isActive: true,
  },
  {
    code: 'JOD',
    name: 'Jordanian Dinar',
    symbol: 'د.ا',
    decimalPlaces: 3,
    region: 'Middle East',
    countries: ['JO'],
    isActive: true,
  },

  // Latin American Currencies
  {
    code: 'BRL',
    name: 'Brazilian Real',
    symbol: 'R$',
    decimalPlaces: 2,
    region: 'South America',
    countries: ['BR'],
    isActive: true,
  },
  {
    code: 'MXN',
    name: 'Mexican Peso',
    symbol: '$',
    decimalPlaces: 2,
    region: 'North America',
    countries: ['MX'],
    isActive: true,
  },
  {
    code: 'ARS',
    name: 'Argentine Peso',
    symbol: '$',
    decimalPlaces: 2,
    region: 'South America',
    countries: ['AR'],
    isActive: true,
  },
  {
    code: 'CLP',
    name: 'Chilean Peso',
    symbol: '$',
    decimalPlaces: 0,
    region: 'South America',
    countries: ['CL'],
    isActive: true,
  },
  {
    code: 'COP',
    name: 'Colombian Peso',
    symbol: '$',
    decimalPlaces: 2,
    region: 'South America',
    countries: ['CO'],
    isActive: true,
  },
  {
    code: 'PEN',
    name: 'Peruvian Sol',
    symbol: 'S/',
    decimalPlaces: 2,
    region: 'South America',
    countries: ['PE'],
    isActive: true,
  },

  // Eastern European Currencies
  {
    code: 'PLN',
    name: 'Polish Zloty',
    symbol: 'zł',
    decimalPlaces: 2,
    region: 'Europe',
    countries: ['PL'],
    isActive: true,
  },
  {
    code: 'CZK',
    name: 'Czech Koruna',
    symbol: 'Kč',
    decimalPlaces: 2,
    region: 'Europe',
    countries: ['CZ'],
    isActive: true,
  },
  {
    code: 'HUF',
    name: 'Hungarian Forint',
    symbol: 'Ft',
    decimalPlaces: 2,
    region: 'Europe',
    countries: ['HU'],
    isActive: true,
  },
  {
    code: 'RON',
    name: 'Romanian Leu',
    symbol: 'lei',
    decimalPlaces: 2,
    region: 'Europe',
    countries: ['RO'],
    isActive: true,
  },
  {
    code: 'RUB',
    name: 'Russian Ruble',
    symbol: '₽',
    decimalPlaces: 2,
    region: 'Europe',
    countries: ['RU'],
    isActive: true,
  },
  {
    code: 'TRY',
    name: 'Turkish Lira',
    symbol: '₺',
    decimalPlaces: 2,
    region: 'Europe',
    countries: ['TR'],
    isActive: true,
  },

  // Other Currencies
  {
    code: 'NZD',
    name: 'New Zealand Dollar',
    symbol: 'NZ$',
    decimalPlaces: 2,
    region: 'Oceania',
    countries: ['NZ', 'CK', 'NU', 'PN', 'TK'],
    isActive: true,
  },
];

/**
 * Get currency by code
 */
export function getCurrency(code: string): Currency | undefined {
  return SUPPORTED_CURRENCIES.find(
    (c) => c.code.toUpperCase() === code.toUpperCase(),
  );
}

/**
 * Get currencies by region
 */
export function getCurrenciesByRegion(region: string): Currency[] {
  return SUPPORTED_CURRENCIES.filter(
    (c) => c.region.toLowerCase() === region.toLowerCase() && c.isActive,
  );
}

/**
 * Get all active currencies
 */
export function getActiveCurrencies(): Currency[] {
  return SUPPORTED_CURRENCIES.filter((c) => c.isActive);
}

/**
 * Check if currency is supported
 */
export function isCurrencySupported(code: string): boolean {
  return SUPPORTED_CURRENCIES.some(
    (c) => c.code.toUpperCase() === code.toUpperCase() && c.isActive,
  );
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(code: string): string {
  const currency = getCurrency(code);
  return currency?.symbol || code;
}

/**
 * Get decimal places for currency
 */
export function getDecimalPlaces(code: string): number {
  const currency = getCurrency(code);
  return currency?.decimalPlaces ?? 2;
}

/**
 * Priority currencies for UI
 */
export const PRIORITY_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'NGN',
  'ZAR',
  'KES',
  'GHS',
  'CNY',
  'JPY',
  'INR',
];

/**
 * African currencies
 */
export const AFRICAN_CURRENCIES = SUPPORTED_CURRENCIES.filter(
  (c) => c.region === 'Africa' && c.isActive,
).map((c) => c.code);

/**
 * European currencies
 */
export const EUROPEAN_CURRENCIES = SUPPORTED_CURRENCIES.filter(
  (c) => c.region === 'Europe' && c.isActive,
).map((c) => c.code);

/**
 * Asian currencies
 */
export const ASIAN_CURRENCIES = SUPPORTED_CURRENCIES.filter(
  (c) => c.region === 'Asia' && c.isActive,
).map((c) => c.code);
