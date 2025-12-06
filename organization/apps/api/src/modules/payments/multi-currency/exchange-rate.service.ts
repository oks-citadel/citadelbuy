import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@/common/redis/redis.service';

/**
 * Exchange Rate Service
 * Provides real-time foreign exchange rates for multi-currency support
 *
 * Features:
 * - Real-time FX rates from multiple providers (OpenExchangeRates, CurrencyLayer, ECB)
 * - Automatic fallback to backup providers
 * - Redis caching for performance
 * - Support for 160+ currencies
 * - Historical rate tracking
 */

export interface ExchangeRate {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  timestamp: Date;
  provider: string;
  inverseRate: number;
}

export interface ExchangeRateResponse {
  base: string;
  rates: Record<string, number>;
  timestamp: Date;
  provider: string;
}

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private readonly CACHE_PREFIX = 'fx:';
  private readonly CACHE_TTL = 3600; // 1 hour cache
  private readonly RATE_REFRESH_INTERVAL = 3600000; // Refresh every hour

  // Supported FX providers in priority order
  private readonly providers = [
    'openexchangerates',
    'currencylayer',
    'exchangerate-api',
    'ecb', // European Central Bank
  ];

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    this.startAutoRefresh();
  }

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ExchangeRate> {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    // If same currency, return 1:1
    if (from === to) {
      return {
        baseCurrency: from,
        targetCurrency: to,
        rate: 1,
        inverseRate: 1,
        timestamp: new Date(),
        provider: 'internal',
      };
    }

    // Check cache first
    const cacheKey = `${this.CACHE_PREFIX}${from}:${to}`;
    const cached = await this.getCachedRate(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from provider
    const rate = await this.fetchExchangeRate(from, to);

    // Cache the result
    await this.cacheRate(cacheKey, rate);

    return rate;
  }

  /**
   * Get exchange rates for a base currency to multiple target currencies
   */
  async getExchangeRates(
    baseCurrency: string,
    targetCurrencies: string[],
  ): Promise<Record<string, ExchangeRate>> {
    const base = baseCurrency.toUpperCase();
    const rates: Record<string, ExchangeRate> = {};

    // Fetch all rates in parallel
    await Promise.all(
      targetCurrencies.map(async (target) => {
        try {
          rates[target] = await this.getExchangeRate(base, target);
        } catch (error) {
          this.logger.error(`Failed to get rate ${base}/${target}:`, error);
        }
      }),
    );

    return rates;
  }

  /**
   * Get all exchange rates from a provider
   */
  async getAllRates(baseCurrency: string = 'USD'): Promise<ExchangeRateResponse> {
    const base = baseCurrency.toUpperCase();
    const cacheKey = `${this.CACHE_PREFIX}all:${base}`;

    // Check cache
    const cached = await this.getCachedAllRates(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from provider
    const response = await this.fetchAllRates(base);

    // Cache the result
    await this.redisService.set(
      cacheKey,
      JSON.stringify(response),
      this.CACHE_TTL,
    );

    return response;
  }

  /**
   * Fetch exchange rate from provider with automatic fallback
   */
  private async fetchExchangeRate(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ExchangeRate> {
    // Try each provider until one succeeds
    for (const provider of this.providers) {
      try {
        const rate = await this.fetchFromProvider(provider, fromCurrency, toCurrency);
        if (rate) {
          return rate;
        }
      } catch (error) {
        this.logger.warn(`Provider ${provider} failed:`, error);
        continue;
      }
    }

    throw new Error(
      `Failed to fetch exchange rate ${fromCurrency}/${toCurrency} from all providers`,
    );
  }

  /**
   * Fetch rate from specific provider
   */
  private async fetchFromProvider(
    provider: string,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ExchangeRate | null> {
    switch (provider) {
      case 'openexchangerates':
        return this.fetchFromOpenExchangeRates(fromCurrency, toCurrency);
      case 'currencylayer':
        return this.fetchFromCurrencyLayer(fromCurrency, toCurrency);
      case 'exchangerate-api':
        return this.fetchFromExchangeRateAPI(fromCurrency, toCurrency);
      case 'ecb':
        return this.fetchFromECB(fromCurrency, toCurrency);
      default:
        return null;
    }
  }

  /**
   * Fetch from OpenExchangeRates.org
   */
  private async fetchFromOpenExchangeRates(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ExchangeRate | null> {
    const apiKey = this.configService.get<string>('OPENEXCHANGERATES_API_KEY');
    if (!apiKey) {
      return null;
    }

    const url = `https://openexchangerates.org/api/latest.json?app_id=${apiKey}&base=${fromCurrency}&symbols=${toCurrency}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.rates || !data.rates[toCurrency]) {
      throw new Error('Invalid response from OpenExchangeRates');
    }

    const rate = data.rates[toCurrency];

    return {
      baseCurrency: fromCurrency,
      targetCurrency: toCurrency,
      rate,
      inverseRate: 1 / rate,
      timestamp: new Date(data.timestamp * 1000),
      provider: 'openexchangerates',
    };
  }

  /**
   * Fetch from CurrencyLayer API
   */
  private async fetchFromCurrencyLayer(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ExchangeRate | null> {
    const apiKey = this.configService.get<string>('CURRENCYLAYER_API_KEY');
    if (!apiKey) {
      return null;
    }

    const url = `https://api.currencylayer.com/live?access_key=${apiKey}&source=${fromCurrency}&currencies=${toCurrency}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.success || !data.quotes) {
      throw new Error('Invalid response from CurrencyLayer');
    }

    const quoteKey = `${fromCurrency}${toCurrency}`;
    const rate = data.quotes[quoteKey];

    if (!rate) {
      throw new Error('Rate not found in CurrencyLayer response');
    }

    return {
      baseCurrency: fromCurrency,
      targetCurrency: toCurrency,
      rate,
      inverseRate: 1 / rate,
      timestamp: new Date(data.timestamp * 1000),
      provider: 'currencylayer',
    };
  }

  /**
   * Fetch from ExchangeRate-API (free tier available)
   */
  private async fetchFromExchangeRateAPI(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ExchangeRate | null> {
    const url = `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.rates || !data.rates[toCurrency]) {
      throw new Error('Invalid response from ExchangeRate-API');
    }

    const rate = data.rates[toCurrency];

    return {
      baseCurrency: fromCurrency,
      targetCurrency: toCurrency,
      rate,
      inverseRate: 1 / rate,
      timestamp: new Date(data.time_last_updated * 1000),
      provider: 'exchangerate-api',
    };
  }

  /**
   * Fetch from European Central Bank (ECB)
   * Free, no API key required, but limited to EUR base
   */
  private async fetchFromECB(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ExchangeRate | null> {
    // ECB only supports EUR as base
    if (fromCurrency !== 'EUR') {
      return null;
    }

    const url = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';

    const response = await fetch(url);
    const xmlText = await response.text();

    // Parse XML to find the rate
    const rateMatch = xmlText.match(
      new RegExp(`<Cube currency="${toCurrency}" rate="([0-9.]+)"`),
    );

    if (!rateMatch) {
      throw new Error('Rate not found in ECB response');
    }

    const rate = parseFloat(rateMatch[1]);

    return {
      baseCurrency: fromCurrency,
      targetCurrency: toCurrency,
      rate,
      inverseRate: 1 / rate,
      timestamp: new Date(),
      provider: 'ecb',
    };
  }

  /**
   * Fetch all rates for a base currency
   */
  private async fetchAllRates(baseCurrency: string): Promise<ExchangeRateResponse> {
    // Try OpenExchangeRates first (most comprehensive)
    const apiKey = this.configService.get<string>('OPENEXCHANGERATES_API_KEY');
    if (apiKey) {
      try {
        const url = `https://openexchangerates.org/api/latest.json?app_id=${apiKey}&base=${baseCurrency}`;
        const response = await fetch(url);
        const data = await response.json();

        return {
          base: baseCurrency,
          rates: data.rates,
          timestamp: new Date(data.timestamp * 1000),
          provider: 'openexchangerates',
        };
      } catch (error) {
        this.logger.warn('OpenExchangeRates failed, trying fallback');
      }
    }

    // Fallback to ExchangeRate-API (free)
    const url = `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`;
    const response = await fetch(url);
    const data = await response.json();

    return {
      base: baseCurrency,
      rates: data.rates,
      timestamp: new Date(data.time_last_updated * 1000),
      provider: 'exchangerate-api',
    };
  }

  /**
   * Cache management
   */
  private async getCachedRate(key: string): Promise<ExchangeRate | null> {
    try {
      const cached = await this.redisService.get(key);
      if (cached) {
        const rate = JSON.parse(cached as string);
        rate.timestamp = new Date(rate.timestamp);
        return rate as ExchangeRate;
      }
    } catch (error) {
      this.logger.warn('Failed to get cached rate:', error);
    }
    return null;
  }

  private async getCachedAllRates(key: string): Promise<ExchangeRateResponse | null> {
    try {
      const cached = await this.redisService.get(key);
      if (cached) {
        const response = JSON.parse(cached as string);
        response.timestamp = new Date(response.timestamp);
        return response as ExchangeRateResponse;
      }
    } catch (error) {
      this.logger.warn('Failed to get cached all rates:', error);
    }
    return null;
  }

  private async cacheRate(key: string, rate: ExchangeRate): Promise<void> {
    try {
      await this.redisService.set(key, JSON.stringify(rate), this.CACHE_TTL);
    } catch (error) {
      this.logger.warn('Failed to cache rate:', error);
    }
  }

  /**
   * Auto-refresh rates periodically
   */
  private startAutoRefresh(): void {
    // Refresh major currency pairs every hour
    setInterval(async () => {
      const majorCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY'];

      for (const base of majorCurrencies) {
        try {
          await this.getAllRates(base);
          this.logger.log(`Refreshed rates for ${base}`);
        } catch (error) {
          this.logger.error(`Failed to refresh rates for ${base}:`, error);
        }
      }
    }, this.RATE_REFRESH_INTERVAL);
  }

  /**
   * Get historical rate (if available from provider)
   */
  async getHistoricalRate(
    fromCurrency: string,
    toCurrency: string,
    date: Date,
  ): Promise<ExchangeRate> {
    const apiKey = this.configService.get<string>('OPENEXCHANGERATES_API_KEY');
    if (!apiKey) {
      throw new Error('Historical rates require OpenExchangeRates API key');
    }

    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    const url = `https://openexchangerates.org/api/historical/${dateStr}.json?app_id=${apiKey}&base=${fromCurrency}&symbols=${toCurrency}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.rates || !data.rates[toCurrency]) {
      throw new Error('Invalid response from OpenExchangeRates');
    }

    const rate = data.rates[toCurrency];

    return {
      baseCurrency: fromCurrency,
      targetCurrency: toCurrency,
      rate,
      inverseRate: 1 / rate,
      timestamp: new Date(data.timestamp * 1000),
      provider: 'openexchangerates',
    };
  }
}
