import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Localized Pricing DTOs
export class CreateLocalizedPriceDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Country code (ISO 3166-1 alpha-2)' })
  @IsString()
  countryCode: string;

  @ApiProperty({ description: 'Price in local currency' })
  @IsNumber()
  price: number;

  @ApiProperty({ description: 'Currency code (ISO 4217)' })
  @IsString()
  currency: string;

  @ApiPropertyOptional({ description: 'Compare at price' })
  @IsOptional()
  @IsNumber()
  compareAtPrice?: number;

  @ApiPropertyOptional({ description: 'Include taxes' })
  @IsOptional()
  @IsBoolean()
  taxInclusive?: boolean;
}

// Currency DTOs
export class ConvertCurrencyDto {
  @ApiProperty({ description: 'Amount to convert' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Source currency code' })
  @IsString()
  fromCurrency: string;

  @ApiProperty({ description: 'Target currency code' })
  @IsString()
  toCurrency: string;
}

export class SetCurrencyRateDto {
  @ApiProperty({ description: 'Base currency' })
  @IsString()
  baseCurrency: string;

  @ApiProperty({ description: 'Target currency' })
  @IsString()
  targetCurrency: string;

  @ApiProperty({ description: 'Exchange rate' })
  @IsNumber()
  rate: number;
}

// Geo Detection DTOs
export class GeoDetectionDto {
  @ApiPropertyOptional({ description: 'IP address (auto-detected if not provided)' })
  @IsOptional()
  @IsString()
  ipAddress?: string;
}

// Regional Compliance DTOs
export class CreateRegionalComplianceDto {
  @ApiProperty({ description: 'Region/country code' })
  @IsString()
  region: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Compliance type' })
  @IsString()
  complianceType: 'gdpr' | 'ccpa' | 'lgpd' | 'pdpa' | 'tax' | 'shipping' | 'custom';

  @ApiProperty({ description: 'Compliance rules' })
  @IsObject()
  rules: Record<string, any>;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CheckComplianceDto {
  @ApiProperty({ description: 'Country code' })
  @IsString()
  countryCode: string;

  @ApiPropertyOptional({ description: 'Region/state code' })
  @IsOptional()
  @IsString()
  regionCode?: string;

  @ApiPropertyOptional({ description: 'Compliance types to check' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  complianceTypes?: string[];
}

export class LocalizationQueryDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Country code' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}
