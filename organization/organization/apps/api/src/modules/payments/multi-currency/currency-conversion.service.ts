import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ExchangeRateService } from './exchange-rate.service';

/**
 * Currency Conversion Service
 * Handles automatic currency conversion with fee calculation
 *
 * Features:
 * - Automatic currency conversion
 * - Dynamic conversion fees based on corridor
 * - Markup on exchange rates for revenue
 * - Conversion history tracking
 * - Batch conversion support
 */

export interface ConversionRequest {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  purpose?: 'payment' | 'settlement' | 'display';
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  convertedCurrency: string;
  exchangeRate: number;
  inverseRate: number;
  conversionFee: number;
  conversionFeePercent: number;
  markup: number;
  markupPercent: number;
  totalCost: number;
  timestamp: Date;
  provider: string;
}

export interface CurrencyPair {
  fromCurrency: string;
  toCurrency: string;
  baseRate: number;
  markup: number;
  conversionFee: number;
  isActive: boolean;
}

@Injectable()
export class CurrencyConversionService {
  private readonly logger = new Logger(CurrencyConversionService.name);

  // Default conversion fee percentages by corridor
  private readonly DEFAULT_CONVERSION_FEES = {
    // Major pairs (low fee)
    'USD-EUR': 0.003, // 0.3%
    'USD-GBP': 0.003,
    'EUR-GBP': 0.003,
    'USD-JPY': 0.003,
    'USD-CNY': 0.005, // 0.5%

    // African corridors (medium fee)
    'USD-NGN': 0.01, // 1%
    'USD-KES': 0.01,
    'USD-ZAR': 0.008, // 0.8%
    'USD-GHS': 0.012, // 1.2%
    'EUR-NGN': 0.012,

    // Exotic pairs (higher fee)
    default: 0.015, // 1.5%
  };

  // Markup on exchange rate for profit
  private readonly DEFAULT_MARKUP = {
    'USD-EUR': 0.002, // 0.2% markup
    'USD-GBP': 0.002,
    'USD-NGN': 0.005, // 0.5% markup
    'USD-KES': 0.005,
    'USD-ZAR': 0.004,
    default: 0.005, // 0.5% default markup
  };

  constructor(
    private exchangeRateService: ExchangeRateService,
    private prisma: PrismaService,
  ) {}

  /**
   * Convert amount from one currency to another
   */
  async convert(request: ConversionRequest): Promise<ConversionResult> {
    const { amount, fromCurrency, toCurrency, purpose } = request;

    // Validate amount
    if (amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    // Get exchange rate
    const exchangeRate = await this.exchangeRateService.getExchangeRate(
      fromCurrency,
      toCurrency,
    );

    // Get conversion fee and markup for this corridor
    const conversionFeePercent = this.getConversionFee(fromCurrency, toCurrency);
    const markupPercent = this.getMarkup(fromCurrency, toCurrency);

    // Apply markup to exchange rate
    const markedUpRate = exchangeRate.rate * (1 + markupPercent);

    // Calculate conversion
    const convertedAmount = amount * markedUpRate;
    const markup = amount * exchangeRate.rate * markupPercent;
    const conversionFee = amount * conversionFeePercent;

    // For payments, include conversion fee in total
    const totalCost =
      purpose === 'payment' ? amount + conversionFee : amount;

    const result: ConversionResult = {
      originalAmount: amount,
      originalCurrency: fromCurrency.toUpperCase(),
      convertedAmount: this.roundCurrency(convertedAmount, toCurrency),
      convertedCurrency: toCurrency.toUpperCase(),
      exchangeRate: exchangeRate.rate,
      inverseRate: exchangeRate.inverseRate,
      conversionFee: this.roundCurrency(conversionFee, fromCurrency),
      conversionFeePercent,
      markup: this.roundCurrency(markup, toCurrency),
      markupPercent,
      totalCost: this.roundCurrency(totalCost, fromCurrency),
      timestamp: exchangeRate.timestamp,
      provider: exchangeRate.provider,
    };

    // Track conversion if userId provided
    if (request.userId) {
      await this.trackConversion(request.userId, result, request.metadata);
    }

    return result;
  }

  /**
   * Batch convert multiple amounts
   */
  async batchConvert(
    requests: ConversionRequest[],
  ): Promise<ConversionResult[]> {
    return Promise.all(requests.map((req) => this.convert(req)));
  }

  /**
   * Get conversion fee for a currency pair
   */
  private getConversionFee(fromCurrency: string, toCurrency: string): number {
    const pair = `${fromCurrency}-${toCurrency}`;
    const reversePair = `${toCurrency}-${fromCurrency}`;

    const fees = this.DEFAULT_CONVERSION_FEES as Record<string, number>;
    return (
      fees[pair] ||
      fees[reversePair] ||
      this.DEFAULT_CONVERSION_FEES.default
    );
  }

  /**
   * Get markup for a currency pair
   */
  private getMarkup(fromCurrency: string, toCurrency: string): number {
    const pair = `${fromCurrency}-${toCurrency}`;
    const reversePair = `${toCurrency}-${fromCurrency}`;

    const markup = this.DEFAULT_MARKUP as Record<string, number>;
    return (
      markup[pair] ||
      markup[reversePair] ||
      this.DEFAULT_MARKUP.default
    );
  }

  /**
   * Round amount to appropriate decimal places for currency
   */
  private roundCurrency(amount: number, currency: string): number {
    // Currencies with no decimal places
    const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP'];

    // Currencies with 3 decimal places
    const threeDecimalCurrencies = ['BHD', 'JOD', 'KWD', 'OMR', 'TND'];

    if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
      return Math.round(amount);
    }

    if (threeDecimalCurrencies.includes(currency.toUpperCase())) {
      return Math.round(amount * 1000) / 1000;
    }

    // Default: 2 decimal places
    return Math.round(amount * 100) / 100;
  }

  /**
   * Track conversion in database for analytics
   */
  private async trackConversion(
    userId: string,
    result: ConversionResult,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      // Note: This requires a CurrencyConversion model in Prisma schema
      // If model doesn't exist, this will be logged only
      await (this.prisma as any).currencyConversion?.create?.({
        data: {
          userId,
          fromCurrency: result.originalCurrency,
          toCurrency: result.convertedCurrency,
          fromAmount: result.originalAmount,
          toAmount: result.convertedAmount,
          exchangeRate: result.exchangeRate,
          conversionFee: result.conversionFee,
          conversionFeePercent: result.conversionFeePercent,
          markup: result.markup,
          markupPercent: result.markupPercent,
          provider: result.provider,
          metadata: metadata || {},
        },
      }).catch(() => {
        // Model doesn't exist, just log
        this.logger.log(
          `Conversion: ${result.originalAmount} ${result.originalCurrency} -> ${result.convertedAmount} ${result.convertedCurrency}`,
        );
      });
    } catch (error) {
      this.logger.warn('Failed to track conversion:', error);
    }
  }

  /**
   * Get conversion quote (preview without executing)
   */
  async getQuote(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ConversionResult> {
    return this.convert({
      amount,
      fromCurrency,
      toCurrency,
      purpose: 'display',
    });
  }

  /**
   * Get best rate among multiple providers
   */
  async getBestRate(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<{
    rate: number;
    provider: string;
    effectiveRate: number; // After markup
  }> {
    const exchangeRate = await this.exchangeRateService.getExchangeRate(
      fromCurrency,
      toCurrency,
    );

    const markupPercent = this.getMarkup(fromCurrency, toCurrency);
    const effectiveRate = exchangeRate.rate * (1 + markupPercent);

    return {
      rate: exchangeRate.rate,
      provider: exchangeRate.provider,
      effectiveRate,
    };
  }

  /**
   * Calculate conversion fee only
   */
  calculateFee(amount: number, fromCurrency: string, toCurrency: string): {
    fee: number;
    feePercent: number;
  } {
    const feePercent = this.getConversionFee(fromCurrency, toCurrency);
    const fee = this.roundCurrency(amount * feePercent, fromCurrency);

    return { fee, feePercent };
  }

  /**
   * Get supported currency pairs
   */
  getSupportedPairs(): CurrencyPair[] {
    const pairs: CurrencyPair[] = [];

    // Generate pairs from fee configuration
    Object.entries(this.DEFAULT_CONVERSION_FEES).forEach(([pair, fee]) => {
      if (pair === 'default') return;

      const [from, to] = pair.split('-');
      const markup = this.getMarkup(from, to);

      pairs.push({
        fromCurrency: from,
        toCurrency: to,
        baseRate: 1, // Will be fetched dynamically
        markup,
        conversionFee: fee,
        isActive: true,
      });
    });

    return pairs;
  }

  /**
   * Get conversion history for user
   */
  async getConversionHistory(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      fromCurrency?: string;
      toCurrency?: string;
    },
  ): Promise<any[]> {
    try {
      const conversions = await (this.prisma as any).currencyConversion?.findMany?.({
        where: {
          userId,
          ...(options?.fromCurrency && { fromCurrency: options.fromCurrency }),
          ...(options?.toCurrency && { toCurrency: options.toCurrency }),
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }).catch(() => []);

      return conversions || [];
    } catch (error) {
      this.logger.warn('Failed to fetch conversion history:', error);
      return [];
    }
  }

  /**
   * Get conversion statistics for analytics
   */
  async getConversionStats(period: 'day' | 'week' | 'month' | 'year'): Promise<{
    totalConversions: number;
    totalVolume: Record<string, number>;
    totalFees: number;
    totalMarkup: number;
    popularPairs: Array<{ pair: string; count: number }>;
  }> {
    try {
      const startDate = this.getStartDate(period);

      const conversions = await (this.prisma as any).currencyConversion?.findMany?.({
        where: {
          createdAt: { gte: startDate },
        },
      }).catch(() => []);

      if (!conversions || conversions.length === 0) {
        return {
          totalConversions: 0,
          totalVolume: {},
          totalFees: 0,
          totalMarkup: 0,
          popularPairs: [],
        };
      }

      // Calculate statistics
      const totalVolume: Record<string, number> = {};
      let totalFees = 0;
      let totalMarkup = 0;
      const pairCounts: Record<string, number> = {};

      conversions.forEach((conv: any) => {
        // Volume by currency
        totalVolume[conv.fromCurrency] =
          (totalVolume[conv.fromCurrency] || 0) + conv.fromAmount;

        // Total fees and markup
        totalFees += conv.conversionFee || 0;
        totalMarkup += conv.markup || 0;

        // Popular pairs
        const pair = `${conv.fromCurrency}/${conv.toCurrency}`;
        pairCounts[pair] = (pairCounts[pair] || 0) + 1;
      });

      // Sort popular pairs
      const popularPairs = Object.entries(pairCounts)
        .map(([pair, count]) => ({ pair, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalConversions: conversions.length,
        totalVolume,
        totalFees,
        totalMarkup,
        popularPairs,
      };
    } catch (error) {
      this.logger.error('Failed to get conversion stats:', error);
      return {
        totalConversions: 0,
        totalVolume: {},
        totalFees: 0,
        totalMarkup: 0,
        popularPairs: [],
      };
    }
  }

  private getStartDate(period: 'day' | 'week' | 'month' | 'year'): Date {
    const now = new Date();

    switch (period) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
}
