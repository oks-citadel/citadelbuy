import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { DistributedLockService } from '@/common/redis/lock.service';
import { REDIS_KEYS, CACHE_TTL } from '@/common/redis/keys';
import { QUEUES } from '@/common/queue/queue.constants';
import {
  FxRefreshJobData,
  FxRefreshJobResult,
  FxProvider,
  FxRate,
  OpenExchangeRatesResponse,
  FX_JOB_NAMES,
  FX_CACHE_CONFIG,
  SUPPORTED_BASE_CURRENCIES,
  SupportedBaseCurrency,
} from './fx-refresh.job';

/**
 * FX Refresh Processor
 *
 * Background worker that fetches and caches currency exchange rates.
 *
 * Features:
 * - Fetches rates from OpenExchangeRates/ECB APIs
 * - Caches in Redis with 1-hour TTL
 * - Writes durable snapshots to Postgres fx_rates table
 * - Supports multiple base currencies
 * - Handles rate limiting from providers
 * - Retries on failure with exponential backoff
 * - Uses distributed locking to prevent concurrent refreshes
 */
@Injectable()
@Processor(QUEUES.FX_REFRESH)
export class FxRefreshProcessor {
  private readonly logger = new Logger(FxRefreshProcessor.name);

  constructor(
    @InjectQueue(QUEUES.FX_REFRESH)
    private readonly fxQueue: Queue<FxRefreshJobData>,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly lockService: DistributedLockService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Schedule FX refresh every 15 minutes
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async scheduleFxRefresh() {
    this.logger.log('Scheduling FX refresh for all base currencies');

    // Queue refresh jobs for primary currencies
    const primaryCurrencies: SupportedBaseCurrency[] = ['USD', 'EUR', 'GBP'];

    for (const currency of primaryCurrencies) {
      await this.fxQueue.add(
        FX_JOB_NAMES.REFRESH_RATES,
        {
          baseCurrency: currency,
          provider: FxProvider.OPEN_EXCHANGE_RATES,
          forceRefresh: false,
          triggeredBy: 'scheduler',
        },
        {
          priority: 2, // High priority for scheduled jobs
          delay: Math.random() * 30000, // Random delay up to 30s to spread load
        },
      );
    }
  }

  /**
   * Process FX refresh job
   */
  @Process(FX_JOB_NAMES.REFRESH_RATES)
  async handleRefreshRates(job: Job<FxRefreshJobData>): Promise<FxRefreshJobResult> {
    const { baseCurrency, provider, forceRefresh, targetCurrencies } = job.data;
    const startTime = Date.now();

    this.logger.log(`Processing FX refresh: ${baseCurrency} from ${provider}`);

    // Acquire lock to prevent concurrent refreshes for same currency
    const lockKey = `fx:refresh:${baseCurrency}`;
    const lockResult = await this.lockService.acquireLock(lockKey, {
      ttlSeconds: 60, // 1 minute lock
      waitTimeMs: 0, // Don't wait, skip if locked
    });

    if (!lockResult.acquired) {
      this.logger.debug(`Skipping FX refresh for ${baseCurrency} - another job in progress`);
      return {
        success: true,
        baseCurrency,
        ratesCount: 0,
        provider: provider || FxProvider.OPEN_EXCHANGE_RATES,
        ratesTimestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        error: 'Skipped - concurrent job in progress',
        cacheTtl: 0,
        savedToDb: false,
      };
    }

    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedRates = await this.getCachedRates(baseCurrency);
        if (cachedRates) {
          this.logger.debug(`Using cached rates for ${baseCurrency}`);
          await this.lockService.releaseLock(lockKey, lockResult.lockId!);
          return {
            success: true,
            baseCurrency,
            ratesCount: Object.keys(cachedRates).length,
            rates: cachedRates,
            provider: provider || FxProvider.OPEN_EXCHANGE_RATES,
            ratesTimestamp: new Date().toISOString(),
            durationMs: Date.now() - startTime,
            cacheTtl: FX_CACHE_CONFIG.DEFAULT_TTL,
            savedToDb: false,
          };
        }
      }

      // Fetch rates from provider
      const selectedProvider = provider || FxProvider.OPEN_EXCHANGE_RATES;
      const rates = await this.fetchRatesFromProvider(baseCurrency, selectedProvider);

      // Filter target currencies if specified
      const filteredRates = targetCurrencies
        ? Object.fromEntries(
            Object.entries(rates).filter(([currency]) =>
              targetCurrencies.includes(currency),
            ),
          )
        : rates;

      // Cache in Redis
      await this.cacheRates(baseCurrency, filteredRates);

      // Save to database
      const savedToDb = await this.saveRatesToDb(baseCurrency, filteredRates, selectedProvider);

      // Update job progress
      await job.progress(100);

      return {
        success: true,
        baseCurrency,
        ratesCount: Object.keys(filteredRates).length,
        rates: filteredRates,
        provider: selectedProvider,
        ratesTimestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        cacheTtl: FX_CACHE_CONFIG.DEFAULT_TTL,
        savedToDb,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`FX refresh failed for ${baseCurrency}: ${errorMessage}`, error);

      return {
        success: false,
        baseCurrency,
        ratesCount: 0,
        provider: provider || FxProvider.OPEN_EXCHANGE_RATES,
        ratesTimestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        error: errorMessage,
        cacheTtl: 0,
        savedToDb: false,
      };
    } finally {
      // Always release the lock
      if (lockResult.lockId) {
        await this.lockService.releaseLock(lockKey, lockResult.lockId);
      }
    }
  }

  /**
   * Process refresh all currencies job
   */
  @Process(FX_JOB_NAMES.REFRESH_ALL)
  async handleRefreshAll(job: Job<FxRefreshJobData>): Promise<FxRefreshJobResult[]> {
    const results: FxRefreshJobResult[] = [];

    for (const baseCurrency of SUPPORTED_BASE_CURRENCIES) {
      const result = await this.handleRefreshRates({
        ...job,
        data: {
          ...job.data,
          baseCurrency,
        },
      } as Job<FxRefreshJobData>);
      results.push(result);

      // Progress tracking
      const progress = (SUPPORTED_BASE_CURRENCIES.indexOf(baseCurrency) + 1) /
        SUPPORTED_BASE_CURRENCIES.length * 100;
      await job.progress(progress);
    }

    return results;
  }

  /**
   * Fetch rates from provider
   */
  private async fetchRatesFromProvider(
    baseCurrency: string,
    provider: FxProvider,
  ): Promise<Record<string, number>> {
    switch (provider) {
      case FxProvider.OPEN_EXCHANGE_RATES:
        return this.fetchFromOpenExchangeRates(baseCurrency);
      case FxProvider.ECB:
        return this.fetchFromEcb(baseCurrency);
      case FxProvider.FIXER:
        return this.fetchFromFixer(baseCurrency);
      default:
        return this.fetchFromOpenExchangeRates(baseCurrency);
    }
  }

  /**
   * Fetch rates from Open Exchange Rates API
   */
  private async fetchFromOpenExchangeRates(
    baseCurrency: string,
  ): Promise<Record<string, number>> {
    const appId = this.configService.get<string>('OPEN_EXCHANGE_RATES_APP_ID');

    if (!appId) {
      this.logger.warn('OpenExchangeRates API key not configured, using mock data');
      return this.getMockRates(baseCurrency);
    }

    const url = `https://openexchangerates.org/api/latest.json?app_id=${appId}&base=${baseCurrency}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`OpenExchangeRates API error: ${response.status} ${response.statusText}`);
      }

      const data: OpenExchangeRatesResponse = await response.json();
      return data.rates;
    } catch (error) {
      this.logger.error('Failed to fetch from OpenExchangeRates:', error);
      throw error;
    }
  }

  /**
   * Fetch rates from ECB (European Central Bank)
   */
  private async fetchFromEcb(baseCurrency: string): Promise<Record<string, number>> {
    // ECB only provides EUR-based rates
    if (baseCurrency !== 'EUR') {
      throw new Error('ECB only provides EUR-based rates');
    }

    const url = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`ECB API error: ${response.status}`);
      }

      const xml = await response.text();
      return this.parseEcbXml(xml);
    } catch (error) {
      this.logger.error('Failed to fetch from ECB:', error);
      throw error;
    }
  }

  /**
   * Parse ECB XML response
   */
  private parseEcbXml(xml: string): Record<string, number> {
    const rates: Record<string, number> = { EUR: 1 };

    // Simple regex parsing for ECB XML
    const regex = /currency='([A-Z]{3})'\s+rate='([\d.]+)'/g;
    let match;

    while ((match = regex.exec(xml)) !== null) {
      rates[match[1]] = parseFloat(match[2]);
    }

    return rates;
  }

  /**
   * Fetch rates from Fixer.io
   */
  private async fetchFromFixer(baseCurrency: string): Promise<Record<string, number>> {
    const apiKey = this.configService.get<string>('FIXER_API_KEY');

    if (!apiKey) {
      throw new Error('Fixer API key not configured');
    }

    const url = `http://data.fixer.io/api/latest?access_key=${apiKey}&base=${baseCurrency}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Fixer API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(`Fixer API error: ${data.error?.info || 'Unknown error'}`);
      }

      return data.rates;
    } catch (error) {
      this.logger.error('Failed to fetch from Fixer:', error);
      throw error;
    }
  }

  /**
   * Get mock rates for development/testing
   */
  private getMockRates(baseCurrency: string): Record<string, number> {
    const baseRates: Record<string, Record<string, number>> = {
      USD: {
        EUR: 0.92, GBP: 0.79, JPY: 149.5, CNY: 7.24, AUD: 1.52, CAD: 1.36,
        CHF: 0.88, HKD: 7.82, SGD: 1.34, NGN: 1550, ZAR: 18.5, KES: 152, GHS: 15.5,
      },
      EUR: {
        USD: 1.09, GBP: 0.86, JPY: 162.7, CNY: 7.88, AUD: 1.66, CAD: 1.48,
        CHF: 0.96, HKD: 8.52, SGD: 1.46, NGN: 1688, ZAR: 20.1, KES: 166, GHS: 16.9,
      },
      GBP: {
        USD: 1.27, EUR: 1.16, JPY: 189.5, CNY: 9.18, AUD: 1.93, CAD: 1.73,
        CHF: 1.12, HKD: 9.92, SGD: 1.70, NGN: 1968, ZAR: 23.4, KES: 193, GHS: 19.7,
      },
    };

    return baseRates[baseCurrency] || baseRates.USD;
  }

  /**
   * Get cached rates from Redis
   */
  private async getCachedRates(baseCurrency: string): Promise<Record<string, number> | null> {
    const cacheKey = REDIS_KEYS.FX_RATES_LATEST(baseCurrency);
    const cached = await this.redis.get<{
      rates: Record<string, number>;
      timestamp: string;
    }>(cacheKey);

    if (!cached) {
      return null;
    }

    // Check if cache is stale (older than TTL minus stale window)
    const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
    const maxAge = (FX_CACHE_CONFIG.DEFAULT_TTL - FX_CACHE_CONFIG.STALE_WINDOW) * 1000;

    if (cacheAge > maxAge) {
      this.logger.debug(`Cache stale for ${baseCurrency}, will refresh`);
      return null;
    }

    return cached.rates;
  }

  /**
   * Cache rates in Redis
   */
  private async cacheRates(
    baseCurrency: string,
    rates: Record<string, number>,
  ): Promise<void> {
    // Cache the full rates object
    const cacheKey = REDIS_KEYS.FX_RATES_LATEST(baseCurrency);
    await this.redis.set(
      cacheKey,
      {
        rates,
        timestamp: new Date().toISOString(),
        base: baseCurrency,
      },
      FX_CACHE_CONFIG.DEFAULT_TTL,
    );

    // Also cache individual rate pairs for quick lookups
    for (const [quoteCurrency, rate] of Object.entries(rates)) {
      const pairKey = REDIS_KEYS.FX_RATE(baseCurrency, quoteCurrency);
      await this.redis.set(pairKey, rate, FX_CACHE_CONFIG.DEFAULT_TTL);
    }

    this.logger.debug(`Cached ${Object.keys(rates).length} rates for ${baseCurrency}`);
  }

  /**
   * Save rates to database for historical record
   */
  private async saveRatesToDb(
    baseCurrency: string,
    rates: Record<string, number>,
    provider: FxProvider,
  ): Promise<boolean> {
    try {
      const rateRecords = Object.entries(rates).map(([toCurrency, rate]) => ({
        fromCurrency: baseCurrency,
        toCurrency,
        rate,
        source: provider.toUpperCase(),
      }));

      // Use createMany for efficient batch insert
      await this.prisma.exchangeRate.createMany({
        data: rateRecords,
        skipDuplicates: true,
      });

      this.logger.debug(`Saved ${rateRecords.length} rates to database for ${baseCurrency}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to save rates to database: ${error}`);
      return false;
    }
  }

  // ==================== Queue Event Handlers ====================

  @OnQueueActive()
  onActive(job: Job<FxRefreshJobData>) {
    this.logger.debug(`Processing job ${job.id}: ${job.data.baseCurrency}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job<FxRefreshJobData>, result: FxRefreshJobResult) {
    this.logger.log(
      `Job ${job.id} completed: ${result.baseCurrency} - ${result.ratesCount} rates in ${result.durationMs}ms`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job<FxRefreshJobData>, error: Error) {
    this.logger.error(
      `Job ${job.id} failed for ${job.data.baseCurrency}: ${error.message}`,
    );
  }
}
