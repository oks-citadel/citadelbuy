import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsPositive,
  Length,
  IsUppercase,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Request DTO for FX quote
 */
export class FxQuoteRequestDto {
  @ApiProperty({
    description: 'Base currency code (ISO 4217)',
    example: 'USD',
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @Length(3, 3, { message: 'Currency code must be exactly 3 characters' })
  @IsUppercase({ message: 'Currency code must be uppercase' })
  @Transform(({ value }) => value?.toUpperCase())
  baseCurrency: string;

  @ApiProperty({
    description: 'Quote currency code (ISO 4217)',
    example: 'EUR',
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @Length(3, 3, { message: 'Currency code must be exactly 3 characters' })
  @IsUppercase({ message: 'Currency code must be uppercase' })
  @Transform(({ value }) => value?.toUpperCase())
  quoteCurrency: string;

  @ApiPropertyOptional({
    description: 'Amount to convert (optional)',
    example: 100,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  amount?: number;
}

/**
 * Response DTO for FX quote
 */
export class FxQuoteResponseDto {
  @ApiProperty({
    description: 'Base currency code',
    example: 'USD',
  })
  baseCurrency: string;

  @ApiProperty({
    description: 'Quote currency code',
    example: 'EUR',
  })
  quoteCurrency: string;

  @ApiProperty({
    description: 'Exchange rate (quote per 1 base)',
    example: 0.92,
  })
  rate: number;

  @ApiProperty({
    description: 'Inverse rate (base per 1 quote)',
    example: 1.087,
  })
  inverseRate: number;

  @ApiPropertyOptional({
    description: 'Converted amount (if amount was provided)',
    example: 92.0,
  })
  convertedAmount?: number;

  @ApiProperty({
    description: 'Quote timestamp (ISO 8601)',
    example: '2026-01-27T12:00:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Quote validity period in seconds',
    example: 60,
  })
  validForSeconds: number;

  @ApiProperty({
    description: 'Rate source',
    example: 'ECB',
  })
  source: string;
}

/**
 * Query parameters for FX quote endpoint
 */
export class FxQuoteQueryDto {
  @ApiProperty({
    description: 'Base currency code (ISO 4217)',
    example: 'USD',
  })
  @IsString()
  @Length(3, 3)
  @Transform(({ value }) => value?.toUpperCase())
  base: string;

  @ApiProperty({
    description: 'Quote currency code (ISO 4217)',
    example: 'EUR',
  })
  @IsString()
  @Length(3, 3)
  @Transform(({ value }) => value?.toUpperCase())
  quote: string;

  @ApiPropertyOptional({
    description: 'Amount to convert',
    example: 100,
  })
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @IsNumber()
  @IsPositive()
  amount?: number;
}
