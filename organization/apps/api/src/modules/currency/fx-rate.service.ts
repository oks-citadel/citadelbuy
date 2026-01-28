import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@/common/redis/redis.service';
import { getCurrentTraceId } from '@/common/interceptors/trace.interceptor';

/**
 * Exchange rate data structure
 */
export interface ExchangeRate {
  base: string;
  quote: string;
  rate: number;
  timestamp: Date;
  source: string;
}

/**
 * Currency info
 */
export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  locale?: string;
}

/**
 * Rate cache entry
 */
interface RateCacheEntry {
  rate: number;
  timestamp: string;
  source: string;
}

/**
 * FX Rate Service
 *
 * Provides foreign exchange rate data with:
 * - Multiple provider support (fallback chain)
 * - Redis caching for performance
 * - Rate staleness detection
 * - Historical rate lookups
 * - Cross-rate calculation
 */
@Injectable()
export class FxRateService {
  private readonly logger = new Logger(FxRateService.name);

  // Cache configuration
  private readonly RATE_CACHE_TTL = 60; // 1 minute for live rates
  private readonly RATE_CACHE_PREFIX = 'fx:rate:';
  private readonly SUPPORTED_CURRENCIES_KEY = 'fx:currencies';
  private readonly STALE_THRESHOLD = 300; // 5 minutes

  // Supported currencies (ISO 4217)
  private readonly CURRENCIES: CurrencyInfo[] = [
    { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, locale: 'en-US' },
    { code: 'EUR', name: 'Euro', symbol: '\u20AC', decimalPlaces: 2, locale: 'de-DE' },
    { code: 'GBP', name: 'British Pound', symbol: '\u00A3', decimalPlaces: 2, locale: 'en-GB' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '\u00A5', decimalPlaces: 0, locale: 'ja-JP' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimalPlaces: 2, locale: 'de-CH' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimalPlaces: 2, locale: 'en-CA' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2, locale: 'en-AU' },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimalPlaces: 2, locale: 'en-NZ' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '\u00A5', decimalPlaces: 2, locale: 'zh-CN' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimalPlaces: 2, locale: 'zh-HK' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimalPlaces: 2, locale: 'en-SG' },
    { code: 'INR', name: 'Indian Rupee', symbol: '\u20B9', decimalPlaces: 2, locale: 'en-IN' },
    { code: 'KRW', name: 'South Korean Won', symbol: '\u20A9', decimalPlaces: 0, locale: 'ko-KR' },
    { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', decimalPlaces: 2, locale: 'es-MX' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimalPlaces: 2, locale: 'pt-BR' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimalPlaces: 2, locale: 'en-ZA' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimalPlaces: 2, locale: 'sv-SE' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimalPlaces: 2, locale: 'nb-NO' },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimalPlaces: 2, locale: 'da-DK' },
    { code: 'PLN', name: 'Polish Zloty', symbol: 'z\u0142', decimalPlaces: 2, locale: 'pl-PL' },
    { code: 'THB', name: 'Thai Baht', symbol: '\u0E3F', decimalPlaces: 2, locale: 'th-TH' },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimalPlaces: 0, locale: 'id-ID' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimalPlaces: 2, locale: 'ms-MY' },
    { code: 'PHP', name: 'Philippine Peso', symbol: '\u20B1', decimalPlaces: 2, locale: 'en-PH' },
    { code: 'VND', name: 'Vietnamese Dong', symbol: '\u20AB', decimalPlaces: 0, locale: 'vi-VN' },
    { code: 'AED', name: 'UAE Dirham', symbol: '\u062F.\u0625', decimalPlaces: 2, locale: 'ar-AE' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '\u0631.\u0633', decimalPlaces: 2, locale: 'ar-SA' },
    { code: 'TRY', name: 'Turkish Lira', symbol: '\u20BA', decimalPlaces: 2, locale: 'tr-TR' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '\u20BD', decimalPlaces: 2, locale: 'ru-RU' },
    { code: 'ILS', name: 'Israeli Shekel', symbol: '\u20AA', decimalPlaces: 2, locale: 'he-IL' },
  ];

  // Mock rates for demonstration (in production, fetch from API)
  private readonly MOCK_USD_RATES: Record<string, number> = {
    EUR: 0.92,
    GBP: 0.79,
    JPY: 148.50,
    CHF: 0.88,
    CAD: 1.35,
    AUD: 1.53,
    NZD: 1.64,
    CNY: 7.15,
    HKD: 7.82,
    SGD: 1.34,
    INR: 83.12,
    KRW: 1320.50,
    MXN: 17.25,
    BRL: 4.97,
    ZAR: 18.85,
    SEK: 10.45,
    NOK: 10.72,
    DKK: 6.88,
    PLN: 4.02,
    THB: 35.50,
    IDR: 15650,
    MYR: 4.72,
    PHP: 55.80,
    VND: 24450,
    AED: 3.67,
    SAR: 3.75,
    TRY: 30.50,
    RUB: 89.50,
    ILS: 3.68,
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Get exchange rate between two currencies
   */
  async getRate(base: string, quote: string): Promise<ExchangeRate> {
    const traceId = getCurrentTraceId();

    // Validate currencies
    this.validateCurrency(base);
    this.validateCurrency(quote);

    // Same currency
    if (base === quote) {
      return {
        base,
        quote,
        rate: 1,
        timestamp: new Date(),
        source: 'identity',
      };
    }

    // Check cache
    const cacheKey = this.getRateCacheKey(base, quote);
    const cached = await this.redis.get<RateCacheEntry>(cacheKey);

    if (cached && !this.isStale(cached.timestamp)) {
      this.logger.debug(`Cache hit for ${base}/${quote}`, { traceId });
      return {
        base,
        quote,
        rate: cached.rate,
        timestamp: new Date(cached.timestamp),
        source: cached.source,
      };
    }

    // Fetch fresh rate
    const rate = await this.fetchRate(base, quote);

    // Cache the result
    await this.cacheRate(base, quote, rate);

    return rate;
  }

  /**
   * Convert amount between currencies
   */
  async convert(
    from: string,
    to: string,
    amount: number,
  ): Promise<{ convertedAmount: number; rate: number; timestamp: Date }> {
    const exchangeRate = await this.getRate(from, to);

    const convertedAmount = this.roundToDecimalPlaces(
      amount * exchangeRate.rate,
      this.getDecimalPlaces(to),
    );

    return {
      convertedAmount,
      rate: exchangeRate.rate,
      timestamp: exchangeRate.timestamp,
    };
  }

  /**
   * Batch convert to multiple currencies
   */
  async batchConvert(
    from: string,
    toCurrencies: string[],
    amount: number,
  ): Promise<Array<{ currency: string; amount: number; rate: number }>> {
    const results = await Promise.all(
      toCurrencies.map(async (to) => {
        const { convertedAmount, rate } = await this.convert(from, to, amount);
        return {
          currency: to,
          amount: convertedAmount,
          rate,
        };
      }),
    );

    return results;
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): CurrencyInfo[] {
    return this.CURRENCIES;
  }

  /**
   * Get currency info by code
   */
  getCurrencyInfo(code: string): CurrencyInfo | undefined {
    return this.CURRENCIES.find((c) => c.code === code.toUpperCase());
  }

  /**
   * Validate currency code
   */
  validateCurrency(code: string): void {
    if (!this.isSupportedCurrency(code)) {
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: `Unsupported currency: ${code}`,
          errorCode: 'UNSUPPORTED_CURRENCY',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Check if currency is supported
   */
  isSupportedCurrency(code: string): boolean {
    return (
      code.toUpperCase() === 'USD' ||
      this.CURRENCIES.some((c) => c.code === code.toUpperCase())
    );
  }

  /**
   * Get decimal places for currency
   */
  getDecimalPlaces(code: string): number {
    const currency = this.getCurrencyInfo(code);
    return currency?.decimalPlaces ?? 2;
  }

  /**
   * Format amount in currency
   */
  formatAmount(amount: number, currencyCode: string): string {
    const currency = this.getCurrencyInfo(currencyCode);
    const locale = currency?.locale || 'en-US';

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currency?.decimalPlaces ?? 2,
      maximumFractionDigits: currency?.decimalPlaces ?? 2,
    }).format(amount);
  }

  // Private methods

  private async fetchRate(base: string, quote: string): Promise<ExchangeRate> {
    const traceId = getCurrentTraceId();

    try {
      // In production, this would call an external FX API
      // For now, use mock rates
      const rate = this.calculateCrossRate(base, quote);

      this.logger.log(`Fetched rate for ${base}/${quote}: ${rate}`, {
        traceId,
        base,
        quote,
        rate,
      });

      return {
        base,
        quote,
        rate,
        timestamp: new Date(),
        source: 'mock', // Would be 'ECB', 'XE', etc. in production
      };
    } catch (error) {
      this.logger.error(`Failed to fetch rate for ${base}/${quote}`, {
        traceId,
        error: error.message,
      });
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          error: 'Service Unavailable',
          message: 'Unable to fetch exchange rate',
          errorCode: 'FX_RATE_UNAVAILABLE',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private calculateCrossRate(base: string, quote: string): number {
    // Get rates vs USD
    const baseToUsd = base === 'USD' ? 1 : 1 / this.MOCK_USD_RATES[base];
    const usdToQuote = quote === 'USD' ? 1 : this.MOCK_USD_RATES[quote];

    // Cross rate: base -> USD -> quote
    return this.roundToDecimalPlaces(baseToUsd * usdToQuote, 6);
  }

  private getRateCacheKey(base: string, quote: string): string {
    return `${this.RATE_CACHE_PREFIX}${base}:${quote}`;
  }

  private async cacheRate(
    base: string,
    quote: string,
    rate: ExchangeRate,
  ): Promise<void> {
    const cacheEntry: RateCacheEntry = {
      rate: rate.rate,
      timestamp: rate.timestamp.toISOString(),
      source: rate.source,
    };

    await this.redis.set(
      this.getRateCacheKey(base, quote),
      cacheEntry,
      this.RATE_CACHE_TTL,
    );

    // Also cache inverse rate
    const inverseCacheEntry: RateCacheEntry = {
      rate: this.roundToDecimalPlaces(1 / rate.rate, 6),
      timestamp: rate.timestamp.toISOString(),
      source: rate.source,
    };

    await this.redis.set(
      this.getRateCacheKey(quote, base),
      inverseCacheEntry,
      this.RATE_CACHE_TTL,
    );
  }

  private isStale(timestamp: string): boolean {
    const age = (Date.now() - new Date(timestamp).getTime()) / 1000;
    return age > this.STALE_THRESHOLD;
  }

  private roundToDecimalPlaces(value: number, places: number): number {
    const factor = Math.pow(10, places);
    return Math.round(value * factor) / factor;
  }

  /**
   * Invalidate cached rates (useful when rates are updated)
   */
  async invalidateCache(base?: string, quote?: string): Promise<void> {
    if (base && quote) {
      await this.redis.del(this.getRateCacheKey(base, quote));
      await this.redis.del(this.getRateCacheKey(quote, base));
    } else {
      // Invalidate all FX rates
      await this.redis.delPattern(`${this.RATE_CACHE_PREFIX}*`);
    }
  }
}
