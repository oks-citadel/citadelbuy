import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
  source: string;
}

export interface CurrencyConversion {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  convertedAmount: number;
  exchangeRate: number;
  fees: number;
  totalCost: number;
}

@Injectable()
export class CurrencyExchangeService {
  private readonly logger = new Logger(CurrencyExchangeService.name);

  // Mock exchange rates (in production, use live APIs)
  private readonly exchangeRates: Record<string, Record<string, number>> = {
    USD: { EUR: 0.92, GBP: 0.79, CNY: 7.24, JPY: 149.5, AUD: 1.52, CAD: 1.36 },
    EUR: { USD: 1.09, GBP: 0.86, CNY: 7.88, JPY: 162.7, AUD: 1.66, CAD: 1.48 },
    GBP: { USD: 1.27, EUR: 1.16, CNY: 9.18, JPY: 189.5, AUD: 1.93, CAD: 1.73 },
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get current exchange rate
   */
  async getExchangeRate(from: string, to: string): Promise<ExchangeRate> {
    this.logger.log(`Getting exchange rate: ${from} -> ${to}`);

    if (from === to) {
      return {
        from,
        to,
        rate: 1.0,
        timestamp: new Date(),
        source: 'INTERNAL',
      };
    }

    // Get rate from cache or API
    let rate = this.exchangeRates[from]?.[to];

    if (!rate) {
      // Calculate inverse rate
      const inverseRate = this.exchangeRates[to]?.[from];
      if (inverseRate) {
        rate = 1 / inverseRate;
      } else {
        // Use USD as intermediary
        const fromToUSD = this.exchangeRates[from]?.['USD'];
        const usdToTo = this.exchangeRates['USD']?.[to];
        if (fromToUSD && usdToTo) {
          rate = fromToUSD * usdToTo;
        }
      }
    }

    if (!rate) {
      throw new Error(`Exchange rate not available for ${from} -> ${to}`);
    }

    // Store rate in database
    await this.prisma.exchangeRate.create({
      data: {
        fromCurrency: from,
        toCurrency: to,
        rate,
        source: 'MARKET',
      },
    });

    return {
      from,
      to,
      rate,
      timestamp: new Date(),
      source: 'MARKET',
    };
  }

  /**
   * Convert currency
   */
  async convertCurrency(params: {
    amount: number;
    fromCurrency: string;
    toCurrency: string;
    includeFees?: boolean;
  }): Promise<CurrencyConversion> {
    this.logger.log(
      `Converting ${params.amount} ${params.fromCurrency} to ${params.toCurrency}`,
    );

    const rateInfo = await this.getExchangeRate(params.fromCurrency, params.toCurrency);
    const convertedAmount = params.amount * rateInfo.rate;

    // Calculate fees (0.5% for international conversions)
    const feeRate = params.includeFees !== false ? 0.005 : 0;
    const fees = convertedAmount * feeRate;
    const totalCost = convertedAmount + fees;

    return {
      amount: params.amount,
      fromCurrency: params.fromCurrency,
      toCurrency: params.toCurrency,
      convertedAmount,
      exchangeRate: rateInfo.rate,
      fees,
      totalCost,
    };
  }

  /**
   * Get historical exchange rates
   */
  async getHistoricalRates(params: {
    from: string;
    to: string;
    startDate: Date;
    endDate: Date;
  }) {
    this.logger.log(`Getting historical rates for ${params.from}/${params.to}`);

    const rates = await this.prisma.exchangeRate.findMany({
      where: {
        fromCurrency: params.from,
        toCurrency: params.to,
        createdAt: {
          gte: params.startDate,
          lte: params.endDate,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      from: params.from,
      to: params.to,
      period: {
        start: params.startDate,
        end: params.endDate,
      },
      rates: rates.map((r) => ({
        rate: r.rate,
        timestamp: r.createdAt,
      })),
      average: rates.length > 0
        ? rates.reduce((sum, r) => sum + r.rate, 0) / rates.length
        : 0,
      min: rates.length > 0 ? Math.min(...rates.map((r) => r.rate)) : 0,
      max: rates.length > 0 ? Math.max(...rates.map((r) => r.rate)) : 0,
    };
  }

  /**
   * Get supported currencies
   */
  async getSupportedCurrencies() {
    return {
      currencies: [
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
        { code: 'GBP', name: 'British Pound', symbol: '£' },
        { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
        { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
        { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
        { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
      ],
    };
  }

  /**
   * Calculate multi-currency pricing
   */
  async calculateMultiCurrencyPricing(params: {
    basePrice: number;
    baseCurrency: string;
    targetCurrencies: string[];
  }) {
    this.logger.log(`Calculating multi-currency pricing for ${params.baseCurrency}`);

    const prices: Record<string, any> = {};

    for (const currency of params.targetCurrencies) {
      const conversion = await this.convertCurrency({
        amount: params.basePrice,
        fromCurrency: params.baseCurrency,
        toCurrency: currency,
        includeFees: true,
      });

      prices[currency] = {
        amount: conversion.totalCost,
        exchangeRate: conversion.exchangeRate,
        fees: conversion.fees,
      };
    }

    return {
      basePrice: params.basePrice,
      baseCurrency: params.baseCurrency,
      prices,
      generatedAt: new Date(),
    };
  }

  /**
   * Monitor exchange rate volatility
   */
  async monitorVolatility(params: {
    currencyPair: string;
    threshold: number;
  }) {
    const [from, to] = params.currencyPair.split('/');

    const last24h = await this.prisma.exchangeRate.findMany({
      where: {
        fromCurrency: from,
        toCurrency: to,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (last24h.length === 0) {
      return {
        currencyPair: params.currencyPair,
        volatile: false,
        message: 'Insufficient data',
      };
    }

    const rates = last24h.map((r) => r.rate);
    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);
    const volatility = ((maxRate - minRate) / minRate) * 100;

    return {
      currencyPair: params.currencyPair,
      currentRate: last24h[0].rate,
      maxRate24h: maxRate,
      minRate24h: minRate,
      volatility,
      volatile: volatility > params.threshold,
      threshold: params.threshold,
    };
  }

  /**
   * Create currency hedge
   */
  async createHedge(params: {
    amount: number;
    fromCurrency: string;
    toCurrency: string;
    targetRate: number;
    expiryDate: Date;
  }) {
    this.logger.log(`Creating currency hedge: ${params.fromCurrency}/${params.toCurrency}`);

    const hedge = await this.prisma.currencyHedge.create({
      data: {
        amount: params.amount,
        fromCurrency: params.fromCurrency,
        toCurrency: params.toCurrency,
        targetRate: params.targetRate,
        currentRate: (await this.getExchangeRate(params.fromCurrency, params.toCurrency)).rate,
        expiryDate: params.expiryDate,
        status: 'ACTIVE',
      },
    });

    return hedge;
  }

  /**
   * Get currency conversion analytics
   */
  async getConversionAnalytics(params?: {
    startDate?: Date;
    endDate?: Date;
    currency?: string;
  }) {
    const where: any = {};

    if (params?.startDate) {
      where.createdAt = { gte: params.startDate };
    }

    if (params?.endDate) {
      where.createdAt = { ...where.createdAt, lte: params.endDate };
    }

    if (params?.currency) {
      where.OR = [
        { fromCurrency: params.currency },
        { toCurrency: params.currency },
      ];
    }

    const conversions = await this.prisma.currencyConversion.findMany({
      where,
    });

    const totalVolume = conversions.reduce((sum, c) => sum + c.amount, 0);
    const totalFees = conversions.reduce((sum, c) => sum + (c.fees || 0), 0);

    return {
      totalConversions: conversions.length,
      totalVolume,
      totalFees,
      averageConversion: conversions.length > 0 ? totalVolume / conversions.length : 0,
      topCurrencyPairs: this.getTopCurrencyPairs(conversions),
    };
  }

  /**
   * Get top currency pairs by volume
   */
  private getTopCurrencyPairs(conversions: any[]): any[] {
    const pairs: Record<string, number> = {};

    for (const conversion of conversions) {
      const pair = `${conversion.fromCurrency}/${conversion.toCurrency}`;
      pairs[pair] = (pairs[pair] || 0) + conversion.amount;
    }

    return Object.entries(pairs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pair, volume]) => ({ pair, volume }));
  }
}
