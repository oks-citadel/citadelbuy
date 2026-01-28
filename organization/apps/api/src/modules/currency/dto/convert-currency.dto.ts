import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsPositive,
  Length,
  IsOptional,
  IsArray,
  ArrayMinSize,
  IsUppercase,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Request DTO for currency conversion
 */
export class ConvertCurrencyRequestDto {
  @ApiProperty({
    description: 'Source currency code (ISO 4217)',
    example: 'USD',
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @Length(3, 3)
  @IsUppercase()
  @Transform(({ value }) => value?.toUpperCase())
  from: string;

  @ApiProperty({
    description: 'Target currency code (ISO 4217)',
    example: 'EUR',
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @Length(3, 3)
  @IsUppercase()
  @Transform(({ value }) => value?.toUpperCase())
  to: string;

  @ApiProperty({
    description: 'Amount to convert',
    example: 100.00,
    minimum: 0,
  })
  @IsNumber()
  @IsPositive()
  amount: number;
}

/**
 * Response DTO for currency conversion
 */
export class ConvertCurrencyResponseDto {
  @ApiProperty({
    description: 'Source currency code',
    example: 'USD',
  })
  from: string;

  @ApiProperty({
    description: 'Target currency code',
    example: 'EUR',
  })
  to: string;

  @ApiProperty({
    description: 'Original amount',
    example: 100.00,
  })
  originalAmount: number;

  @ApiProperty({
    description: 'Converted amount',
    example: 92.00,
  })
  convertedAmount: number;

  @ApiProperty({
    description: 'Exchange rate used',
    example: 0.92,
  })
  rate: number;

  @ApiProperty({
    description: 'Conversion timestamp',
    example: '2026-01-27T12:00:00Z',
  })
  timestamp: string;
}

/**
 * Request DTO for batch currency conversion
 */
export class BatchConvertRequestDto {
  @ApiProperty({
    description: 'Source currency code',
    example: 'USD',
  })
  @IsString()
  @Length(3, 3)
  @Transform(({ value }) => value?.toUpperCase())
  from: string;

  @ApiProperty({
    description: 'Target currency codes',
    example: ['EUR', 'GBP', 'JPY'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Transform(({ value }) => value?.map((v: string) => v?.toUpperCase()))
  to: string[];

  @ApiProperty({
    description: 'Amount to convert',
    example: 100.00,
  })
  @IsNumber()
  @IsPositive()
  amount: number;
}

/**
 * Single conversion result in batch response
 */
export class BatchConversionResultDto {
  @ApiProperty({ example: 'EUR' })
  currency: string;

  @ApiProperty({ example: 92.00 })
  amount: number;

  @ApiProperty({ example: 0.92 })
  rate: number;
}

/**
 * Response DTO for batch currency conversion
 */
export class BatchConvertResponseDto {
  @ApiProperty({ example: 'USD' })
  from: string;

  @ApiProperty({ example: 100.00 })
  originalAmount: number;

  @ApiProperty({ type: [BatchConversionResultDto] })
  conversions: BatchConversionResultDto[];

  @ApiProperty({ example: '2026-01-27T12:00:00Z' })
  timestamp: string;
}

/**
 * Supported currencies DTO
 */
export class SupportedCurrencyDto {
  @ApiProperty({ example: 'USD' })
  code: string;

  @ApiProperty({ example: 'US Dollar' })
  name: string;

  @ApiProperty({ example: '$' })
  symbol: string;

  @ApiProperty({ example: 2 })
  decimalPlaces: number;

  @ApiPropertyOptional({ example: 'en-US' })
  locale?: string;
}

/**
 * Response for supported currencies list
 */
export class SupportedCurrenciesResponseDto {
  @ApiProperty({ type: [SupportedCurrencyDto] })
  currencies: SupportedCurrencyDto[];

  @ApiProperty({ example: 180 })
  total: number;
}

/**
 * Historical rate request
 */
export class HistoricalRateRequestDto {
  @ApiProperty({ example: 'USD' })
  @IsString()
  @Length(3, 3)
  @Transform(({ value }) => value?.toUpperCase())
  base: string;

  @ApiProperty({ example: 'EUR' })
  @IsString()
  @Length(3, 3)
  @Transform(({ value }) => value?.toUpperCase())
  quote: string;

  @ApiProperty({
    description: 'Date for historical rate (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @IsString()
  date: string;
}

/**
 * Historical rate response
 */
export class HistoricalRateResponseDto {
  @ApiProperty({ example: 'USD' })
  base: string;

  @ApiProperty({ example: 'EUR' })
  quote: string;

  @ApiProperty({ example: '2026-01-01' })
  date: string;

  @ApiProperty({ example: 0.91 })
  rate: number;

  @ApiProperty({ example: 'ECB' })
  source: string;
}
