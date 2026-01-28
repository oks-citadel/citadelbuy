import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FxRateService, CurrencyInfo } from './fx-rate.service';
import { FxQuoteResponseDto } from './dto/fx-quote.dto';
import {
  ConvertCurrencyResponseDto,
  BatchConvertResponseDto,
} from './dto/convert-currency.dto';
import { getCurrentTraceId } from '@/common/interceptors/trace.interceptor';

/**
 * Currency Service
 *
 * High-level service for currency operations:
 * - FX quotes
 * - Currency conversion
 * - Price localization
 * - Currency formatting
 */
@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly QUOTE_VALIDITY_SECONDS = 60;

  constructor(
    private readonly fxRateService: FxRateService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get FX quote between two currencies
   */
  async getQuote(
    baseCurrency: string,
    quoteCurrency: string,
    amount?: number,
  ): Promise<FxQuoteResponseDto> {
    const traceId = getCurrentTraceId();

    this.logger.log(`Getting FX quote: ${baseCurrency}/${quoteCurrency}`, {
      traceId,
      baseCurrency,
      quoteCurrency,
      amount,
    });

    const rate = await this.fxRateService.getRate(baseCurrency, quoteCurrency);

    const response: FxQuoteResponseDto = {
      baseCurrency,
      quoteCurrency,
      rate: rate.rate,
      inverseRate: this.roundToDecimals(1 / rate.rate, 6),
      timestamp: rate.timestamp.toISOString(),
      validForSeconds: this.QUOTE_VALIDITY_SECONDS,
      source: rate.source,
    };

    if (amount !== undefined) {
      const conversion = await this.fxRateService.convert(
        baseCurrency,
        quoteCurrency,
        amount,
      );
      response.convertedAmount = conversion.convertedAmount;
    }

    return response;
  }

  /**
   * Convert currency amount
   */
  async convert(
    from: string,
    to: string,
    amount: number,
  ): Promise<ConvertCurrencyResponseDto> {
    const traceId = getCurrentTraceId();

    this.logger.log(`Converting ${amount} ${from} to ${to}`, {
      traceId,
      from,
      to,
      amount,
    });

    const { convertedAmount, rate, timestamp } = await this.fxRateService.convert(
      from,
      to,
      amount,
    );

    return {
      from,
      to,
      originalAmount: amount,
      convertedAmount,
      rate,
      timestamp: timestamp.toISOString(),
    };
  }

  /**
   * Batch convert to multiple currencies
   */
  async batchConvert(
    from: string,
    toCurrencies: string[],
    amount: number,
  ): Promise<BatchConvertResponseDto> {
    const traceId = getCurrentTraceId();

    this.logger.log(`Batch converting ${amount} ${from} to ${toCurrencies.length} currencies`, {
      traceId,
      from,
      toCurrencies,
      amount,
    });

    const conversions = await this.fxRateService.batchConvert(from, toCurrencies, amount);

    return {
      from,
      originalAmount: amount,
      conversions,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): { currencies: CurrencyInfo[]; total: number } {
    const currencies = this.fxRateService.getSupportedCurrencies();
    return {
      currencies,
      total: currencies.length,
    };
  }

  /**
   * Get currency information
   */
  getCurrencyInfo(code: string): CurrencyInfo | undefined {
    return this.fxRateService.getCurrencyInfo(code);
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number, currencyCode: string): string {
    return this.fxRateService.formatAmount(amount, currencyCode);
  }

  /**
   * Convert price for localization
   * Useful for displaying prices in user's preferred currency
   */
  async localizePrice(
    price: number,
    originalCurrency: string,
    targetCurrency: string,
  ): Promise<{
    originalPrice: number;
    originalCurrency: string;
    localizedPrice: number;
    localizedCurrency: string;
    formattedPrice: string;
    rate: number;
  }> {
    if (originalCurrency === targetCurrency) {
      return {
        originalPrice: price,
        originalCurrency,
        localizedPrice: price,
        localizedCurrency: targetCurrency,
        formattedPrice: this.formatAmount(price, targetCurrency),
        rate: 1,
      };
    }

    const { convertedAmount, rate } = await this.fxRateService.convert(
      originalCurrency,
      targetCurrency,
      price,
    );

    return {
      originalPrice: price,
      originalCurrency,
      localizedPrice: convertedAmount,
      localizedCurrency: targetCurrency,
      formattedPrice: this.formatAmount(convertedAmount, targetCurrency),
      rate,
    };
  }

  /**
   * Validate currency code
   */
  isValidCurrency(code: string): boolean {
    return this.fxRateService.isSupportedCurrency(code);
  }

  /**
   * Get default currency from config
   */
  getDefaultCurrency(): string {
    return this.configService.get<string>('DEFAULT_CURRENCY', 'USD');
  }

  private roundToDecimals(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }
}
