import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrencyConversionService } from './currency-conversion.service';
import {
  SUPPORTED_CURRENCIES,
  getCurrency,
  getCurrenciesByRegion,
  getActiveCurrencies,
  PRIORITY_CURRENCIES,
  AFRICAN_CURRENCIES,
  Currency,
} from './supported-currencies';

/**
 * Currency Controller
 * Handles all currency-related API endpoints
 *
 * Endpoints:
 * - GET /currencies - List supported currencies
 * - GET /currencies/:code - Get currency details
 * - GET /currencies/exchange-rate - Get exchange rate
 * - POST /currencies/convert - Convert amount
 * - GET /currencies/quote - Get conversion quote
 */

@Controller('currencies')
export class CurrencyController {
  constructor(
    private exchangeRateService: ExchangeRateService,
    private conversionService: CurrencyConversionService,
  ) {}

  /**
   * GET /currencies
   * List all supported currencies
   */
  @Get()
  async getCurrencies(
    @Query('region') region?: string,
    @Query('active') active?: string,
  ): Promise<{
    currencies: Currency[];
    total: number;
    priority: string[];
  }> {
    let currencies = SUPPORTED_CURRENCIES;

    // Filter by region
    if (region) {
      currencies = getCurrenciesByRegion(region);
    }

    // Filter by active status
    if (active === 'true') {
      currencies = getActiveCurrencies();
    }

    return {
      currencies,
      total: currencies.length,
      priority: PRIORITY_CURRENCIES,
    };
  }

  /**
   * GET /currencies/:code
   * Get details for a specific currency
   */
  @Get(':code')
  async getCurrencyDetails(
    @Param('code') code: string,
  ): Promise<{
    currency: Currency | null;
    currentRates?: Record<string, number>;
  }> {
    const currency = getCurrency(code);

    if (!currency) {
      return { currency: null };
    }

    // Get current exchange rates for major currencies
    try {
      const rates = await this.exchangeRateService.getExchangeRates(code, [
        'USD',
        'EUR',
        'GBP',
        'NGN',
      ]);

      const currentRates: Record<string, number> = {};
      Object.entries(rates).forEach(([targetCode, rate]) => {
        currentRates[targetCode] = rate.rate;
      });

      return {
        currency,
        currentRates,
      };
    } catch (error) {
      return { currency };
    }
  }

  /**
   * GET /currencies/exchange-rate
   * Get exchange rate between two currencies
   */
  @Get('exchange-rate/get')
  async getExchangeRate(
    @Query('from') fromCurrency: string,
    @Query('to') toCurrency: string,
  ) {
    if (!fromCurrency || !toCurrency) {
      return {
        success: false,
        error: 'Both from and to currencies are required',
      };
    }

    try {
      const rate = await this.exchangeRateService.getExchangeRate(
        fromCurrency,
        toCurrency,
      );

      return {
        success: true,
        ...rate,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get exchange rate',
      };
    }
  }

  /**
   * GET /currencies/rates/all
   * Get all rates for a base currency
   */
  @Get('rates/all')
  async getAllRates(@Query('base') baseCurrency: string = 'USD') {
    try {
      const response = await this.exchangeRateService.getAllRates(baseCurrency);

      return {
        success: true,
        ...response,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get exchange rates',
      };
    }
  }

  /**
   * POST /currencies/convert
   * Convert amount from one currency to another
   */
  @Post('convert')
  @UseGuards(JwtAuthGuard)
  async convertCurrency(
    @Body()
    body: {
      amount: number;
      fromCurrency: string;
      toCurrency: string;
      purpose?: 'payment' | 'settlement' | 'display';
      userId?: string;
    },
  ) {
    const { amount, fromCurrency, toCurrency, purpose, userId } = body;

    if (!amount || !fromCurrency || !toCurrency) {
      return {
        success: false,
        error: 'Amount, fromCurrency, and toCurrency are required',
      };
    }

    if (amount <= 0) {
      return {
        success: false,
        error: 'Amount must be greater than zero',
      };
    }

    try {
      const result = await this.conversionService.convert({
        amount,
        fromCurrency,
        toCurrency,
        purpose: purpose || 'display',
        userId,
      });

      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Currency conversion failed',
      };
    }
  }

  /**
   * GET /currencies/quote
   * Get conversion quote without executing
   */
  @Get('quote/get')
  async getQuote(
    @Query('amount') amount: string,
    @Query('from') fromCurrency: string,
    @Query('to') toCurrency: string,
  ) {
    if (!amount || !fromCurrency || !toCurrency) {
      return {
        success: false,
        error: 'Amount, from, and to currencies are required',
      };
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return {
        success: false,
        error: 'Invalid amount',
      };
    }

    try {
      const quote = await this.conversionService.getQuote(
        amountNum,
        fromCurrency,
        toCurrency,
      );

      return {
        success: true,
        ...quote,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get quote',
      };
    }
  }

  /**
   * GET /currencies/fee
   * Calculate conversion fee
   */
  @Get('fee/calculate')
  async calculateFee(
    @Query('amount') amount: string,
    @Query('from') fromCurrency: string,
    @Query('to') toCurrency: string,
  ) {
    if (!amount || !fromCurrency || !toCurrency) {
      return {
        success: false,
        error: 'Amount, from, and to currencies are required',
      };
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return {
        success: false,
        error: 'Invalid amount',
      };
    }

    try {
      const feeInfo = this.conversionService.calculateFee(
        amountNum,
        fromCurrency,
        toCurrency,
      );

      return {
        success: true,
        amount: amountNum,
        fromCurrency,
        toCurrency,
        ...feeInfo,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to calculate fee',
      };
    }
  }

  /**
   * GET /currencies/pairs
   * Get supported currency pairs
   */
  @Get('pairs/supported')
  async getSupportedPairs() {
    try {
      const pairs = this.conversionService.getSupportedPairs();

      return {
        success: true,
        pairs,
        total: pairs.length,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get supported pairs',
      };
    }
  }

  /**
   * GET /currencies/best-rate
   * Get best available rate
   */
  @Get('best-rate/get')
  async getBestRate(
    @Query('from') fromCurrency: string,
    @Query('to') toCurrency: string,
  ) {
    if (!fromCurrency || !toCurrency) {
      return {
        success: false,
        error: 'Both from and to currencies are required',
      };
    }

    try {
      const bestRate = await this.conversionService.getBestRate(
        fromCurrency,
        toCurrency,
      );

      return {
        success: true,
        fromCurrency,
        toCurrency,
        ...bestRate,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get best rate',
      };
    }
  }

  /**
   * GET /currencies/regions
   * Get currencies grouped by region
   */
  @Get('regions/all')
  async getCurrenciesByRegions() {
    const regions = [
      'Africa',
      'Asia',
      'Europe',
      'North America',
      'South America',
      'Middle East',
      'Oceania',
    ];

    const byRegion: Record<string, Currency[]> = {};

    regions.forEach((region) => {
      byRegion[region] = getCurrenciesByRegion(region);
    });

    return {
      success: true,
      regions: byRegion,
      africanCurrencies: AFRICAN_CURRENCIES,
    };
  }

  /**
   * GET /currencies/stats
   * Get conversion statistics
   */
  @Get('stats/conversions')
  async getConversionStats(@Query('period') period?: string) {
    const validPeriods = ['day', 'week', 'month', 'year'];
    const selectedPeriod = validPeriods.includes(period || '')
      ? (period as 'day' | 'week' | 'month' | 'year')
      : 'month';

    try {
      const stats = await this.conversionService.getConversionStats(selectedPeriod);

      return {
        success: true,
        period: selectedPeriod,
        ...stats,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get conversion stats',
      };
    }
  }

  /**
   * POST /currencies/batch-convert
   * Convert multiple amounts in batch
   */
  @Post('batch-convert')
  @UseGuards(JwtAuthGuard)
  async batchConvert(
    @Body()
    body: {
      conversions: Array<{
        amount: number;
        fromCurrency: string;
        toCurrency: string;
        purpose?: 'payment' | 'settlement' | 'display';
      }>;
      userId?: string;
    },
  ) {
    if (!body.conversions || !Array.isArray(body.conversions)) {
      return {
        success: false,
        error: 'Conversions array is required',
      };
    }

    if (body.conversions.length > 100) {
      return {
        success: false,
        error: 'Maximum 100 conversions per batch',
      };
    }

    try {
      const requests = body.conversions.map((conv) => ({
        ...conv,
        userId: body.userId,
        purpose: conv.purpose || 'display',
      }));

      const results = await this.conversionService.batchConvert(requests);

      return {
        success: true,
        results,
        total: results.length,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Batch conversion failed',
      };
    }
  }
}
