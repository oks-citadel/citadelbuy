import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CurrencyService } from './currency.service';
import { FxQuoteQueryDto, FxQuoteResponseDto } from './dto/fx-quote.dto';
import {
  ConvertCurrencyRequestDto,
  ConvertCurrencyResponseDto,
  BatchConvertRequestDto,
  BatchConvertResponseDto,
  SupportedCurrenciesResponseDto,
} from './dto/convert-currency.dto';
import { SkipTenant } from '@/common/decorators/tenant.decorator';

/**
 * Currency Controller
 *
 * Provides FX rate and currency conversion endpoints.
 * These endpoints are public (no tenant context required).
 */
@ApiTags('Currency')
@Controller('api/v1')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  /**
   * Get FX Quote
   */
  @Get('fx/quote')
  @SkipTenant()
  @ApiOperation({
    summary: 'Get FX quote',
    description: 'Get current exchange rate between two currencies with optional amount conversion.',
  })
  @ApiQuery({ name: 'base', required: true, description: 'Base currency code (ISO 4217)', example: 'USD' })
  @ApiQuery({ name: 'quote', required: true, description: 'Quote currency code (ISO 4217)', example: 'EUR' })
  @ApiQuery({ name: 'amount', required: false, type: Number, description: 'Amount to convert', example: 100 })
  @ApiResponse({
    status: 200,
    description: 'FX quote retrieved successfully',
    type: FxQuoteResponseDto,
    schema: {
      example: {
        baseCurrency: 'USD',
        quoteCurrency: 'EUR',
        rate: 0.92,
        inverseRate: 1.087,
        convertedAmount: 92.0,
        timestamp: '2026-01-27T12:00:00Z',
        validForSeconds: 60,
        source: 'ECB',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid currency code' })
  @ApiResponse({ status: 503, description: 'FX rate service unavailable' })
  async getQuote(@Query() query: FxQuoteQueryDto): Promise<FxQuoteResponseDto> {
    return this.currencyService.getQuote(
      query.base,
      query.quote,
      query.amount,
    );
  }

  /**
   * Convert Currency
   */
  @Post('fx/convert')
  @SkipTenant()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Convert currency amount',
    description: 'Convert an amount from one currency to another.',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversion successful',
    type: ConvertCurrencyResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async convert(
    @Body() dto: ConvertCurrencyRequestDto,
  ): Promise<ConvertCurrencyResponseDto> {
    return this.currencyService.convert(dto.from, dto.to, dto.amount);
  }

  /**
   * Batch Convert
   */
  @Post('fx/batch-convert')
  @SkipTenant()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Batch currency conversion',
    description: 'Convert an amount to multiple target currencies at once.',
  })
  @ApiResponse({
    status: 200,
    description: 'Batch conversion successful',
    type: BatchConvertResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async batchConvert(
    @Body() dto: BatchConvertRequestDto,
  ): Promise<BatchConvertResponseDto> {
    return this.currencyService.batchConvert(dto.from, dto.to, dto.amount);
  }

  /**
   * Get Supported Currencies
   */
  @Get('currencies')
  @SkipTenant()
  @ApiOperation({
    summary: 'List supported currencies',
    description: 'Get a list of all supported currencies with their details.',
  })
  @ApiResponse({
    status: 200,
    description: 'Currencies list retrieved',
    type: SupportedCurrenciesResponseDto,
  })
  async getSupportedCurrencies(): Promise<SupportedCurrenciesResponseDto> {
    return this.currencyService.getSupportedCurrencies();
  }

  /**
   * Get Currency Info
   */
  @Get('currencies/:code')
  @SkipTenant()
  @ApiOperation({
    summary: 'Get currency information',
    description: 'Get detailed information about a specific currency.',
  })
  @ApiParam({ name: 'code', description: 'Currency code (ISO 4217)', example: 'USD' })
  @ApiResponse({
    status: 200,
    description: 'Currency information retrieved',
    schema: {
      example: {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        decimalPlaces: 2,
        locale: 'en-US',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Currency not found' })
  async getCurrencyInfo(@Param('code') code: string) {
    const currency = this.currencyService.getCurrencyInfo(code.toUpperCase());
    if (!currency) {
      return {
        statusCode: 404,
        error: 'Not Found',
        message: `Currency ${code} not found`,
      };
    }
    return currency;
  }

  /**
   * Format Amount
   */
  @Get('currencies/:code/format')
  @SkipTenant()
  @ApiOperation({
    summary: 'Format amount in currency',
    description: 'Format a numeric amount as a currency string.',
  })
  @ApiParam({ name: 'code', description: 'Currency code', example: 'USD' })
  @ApiQuery({ name: 'amount', required: true, type: Number, description: 'Amount to format', example: 1234.56 })
  @ApiResponse({
    status: 200,
    description: 'Formatted amount',
    schema: {
      example: {
        amount: 1234.56,
        currency: 'USD',
        formatted: '$1,234.56',
      },
    },
  })
  async formatAmount(
    @Param('code') code: string,
    @Query('amount') amount: string,
  ) {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
      return {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid amount',
      };
    }

    return {
      amount: numericAmount,
      currency: code.toUpperCase(),
      formatted: this.currencyService.formatAmount(numericAmount, code.toUpperCase()),
    };
  }
}
