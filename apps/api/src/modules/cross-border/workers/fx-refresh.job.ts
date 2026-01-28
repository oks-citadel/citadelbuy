/**
 * FX Refresh Job Definitions
 * Defines the job data structures and types for FX rate refresh workers
 */

/**
 * Supported FX data providers
 */
export enum FxProvider {
  /** Open Exchange Rates - primary provider */
  OPEN_EXCHANGE_RATES = 'openexchangerates',
  /** European Central Bank - backup/reference */
  ECB = 'ecb',
  /** Fixer.io - alternative */
  FIXER = 'fixer',
  /** Currency Layer - alternative */
  CURRENCY_LAYER = 'currencylayer',
}

/**
 * Job data for FX refresh
 */
export interface FxRefreshJobData {
  /** Base currency to fetch rates for */
  baseCurrency: string;
  /** Specific target currencies (optional, fetches all if not specified) */
  targetCurrencies?: string[];
  /** FX provider to use */
  provider?: FxProvider;
  /** Force refresh even if cache is valid */
  forceRefresh?: boolean;
  /** Job priority */
  priority?: 'high' | 'normal' | 'low';
  /** Correlation ID for tracing */
  correlationId?: string;
  /** Triggered by (user/system) */
  triggeredBy?: string;
}

/**
 * Job result for FX refresh
 */
export interface FxRefreshJobResult {
  /** Whether the refresh was successful */
  success: boolean;
  /** Base currency */
  baseCurrency: string;
  /** Number of rates fetched */
  ratesCount: number;
  /** Rates data */
  rates?: Record<string, number>;
  /** Provider used */
  provider: FxProvider;
  /** Timestamp of rates */
  ratesTimestamp: string;
  /** Time taken in milliseconds */
  durationMs: number;
  /** Error message if failed */
  error?: string;
  /** Cache TTL in seconds */
  cacheTtl: number;
  /** Whether rates were saved to database */
  savedToDb: boolean;
}

/**
 * FX rate data structure
 */
export interface FxRate {
  /** Base currency */
  base: string;
  /** Quote currency */
  quote: string;
  /** Exchange rate */
  rate: number;
  /** Rate timestamp */
  timestamp: Date;
  /** Provider source */
  source: FxProvider;
  /** Mid rate (average of bid/ask) */
  mid?: number;
  /** Bid price */
  bid?: number;
  /** Ask price */
  ask?: number;
}

/**
 * API response from Open Exchange Rates
 */
export interface OpenExchangeRatesResponse {
  disclaimer: string;
  license: string;
  timestamp: number;
  base: string;
  rates: Record<string, number>;
}

/**
 * API response from ECB (parsed XML)
 */
export interface EcbRatesResponse {
  time: string;
  rates: Record<string, number>;
}

/**
 * Supported base currencies
 */
export const SUPPORTED_BASE_CURRENCIES = [
  'USD', // US Dollar
  'EUR', // Euro
  'GBP', // British Pound
  'JPY', // Japanese Yen
  'CNY', // Chinese Yuan
  'AUD', // Australian Dollar
  'CAD', // Canadian Dollar
  'CHF', // Swiss Franc
  'HKD', // Hong Kong Dollar
  'SGD', // Singapore Dollar
  'NGN', // Nigerian Naira
  'ZAR', // South African Rand
  'KES', // Kenyan Shilling
  'GHS', // Ghanaian Cedi
] as const;

export type SupportedBaseCurrency = (typeof SUPPORTED_BASE_CURRENCIES)[number];

/**
 * FX refresh schedule configuration
 */
export interface FxRefreshSchedule {
  /** Base currency */
  baseCurrency: SupportedBaseCurrency;
  /** Cron expression */
  cron: string;
  /** Provider preference order */
  providers: FxProvider[];
  /** Whether to save to database */
  saveToDb: boolean;
  /** Cache TTL in seconds */
  cacheTtl: number;
}

/**
 * Default schedules for FX refresh
 */
export const FX_REFRESH_SCHEDULES: FxRefreshSchedule[] = [
  {
    baseCurrency: 'USD',
    cron: '*/15 * * * *', // Every 15 minutes
    providers: [FxProvider.OPEN_EXCHANGE_RATES, FxProvider.ECB, FxProvider.FIXER],
    saveToDb: true,
    cacheTtl: 3600, // 1 hour
  },
  {
    baseCurrency: 'EUR',
    cron: '*/15 * * * *',
    providers: [FxProvider.ECB, FxProvider.OPEN_EXCHANGE_RATES],
    saveToDb: true,
    cacheTtl: 3600,
  },
  {
    baseCurrency: 'GBP',
    cron: '*/30 * * * *', // Every 30 minutes
    providers: [FxProvider.OPEN_EXCHANGE_RATES, FxProvider.FIXER],
    saveToDb: true,
    cacheTtl: 3600,
  },
  {
    baseCurrency: 'NGN',
    cron: '0 * * * *', // Every hour
    providers: [FxProvider.OPEN_EXCHANGE_RATES],
    saveToDb: true,
    cacheTtl: 3600,
  },
];

/**
 * Job names for the FX queue
 */
export const FX_JOB_NAMES = {
  REFRESH_RATES: 'refresh-rates',
  REFRESH_ALL: 'refresh-all',
  SNAPSHOT: 'snapshot',
  CLEANUP: 'cleanup',
} as const;

/**
 * FX rate cache configuration
 */
export const FX_CACHE_CONFIG = {
  /** Default TTL for cached rates (1 hour) */
  DEFAULT_TTL: 3600,
  /** Maximum TTL for cached rates (24 hours) */
  MAX_TTL: 86400,
  /** Minimum TTL for cached rates (5 minutes) */
  MIN_TTL: 300,
  /** Stale-while-revalidate window (5 minutes) */
  STALE_WINDOW: 300,
} as const;

/**
 * Rate limiting for FX API calls
 */
export const FX_RATE_LIMITS = {
  [FxProvider.OPEN_EXCHANGE_RATES]: {
    requestsPerHour: 1000, // Free tier: 1000/month
    requestsPerMinute: 10,
  },
  [FxProvider.ECB]: {
    requestsPerHour: 100,
    requestsPerMinute: 5,
  },
  [FxProvider.FIXER]: {
    requestsPerHour: 100,
    requestsPerMinute: 10,
  },
  [FxProvider.CURRENCY_LAYER]: {
    requestsPerHour: 100,
    requestsPerMinute: 10,
  },
} as const;
