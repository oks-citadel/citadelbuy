import {
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsDateString,
  Min,
  Max,
  IsISO31661Alpha2,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TaxType,
  TaxCalculationMethod,
  TaxRateStatus,
} from '@prisma/client';

export class CreateTaxRateDto {
  @ApiProperty({ description: 'Tax rate name', example: 'California Sales Tax' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Unique tax rate code', example: 'US-CA-SALES' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Tax rate description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: TaxType, description: 'Type of tax' })
  @IsEnum(TaxType)
  taxType: TaxType;

  @ApiProperty({ enum: TaxCalculationMethod, description: 'Calculation method' })
  @IsEnum(TaxCalculationMethod)
  calculationMethod: TaxCalculationMethod;

  @ApiProperty({ description: 'Tax rate (percentage or flat amount)', example: 7.5 })
  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;

  @ApiProperty({ description: 'Country code (ISO 3166-1 alpha-2)', example: 'US' })
  @IsISO31661Alpha2()
  country: string;

  @ApiPropertyOptional({ description: 'State or province code', example: 'CA' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ description: 'City name' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'ZIP or postal code (supports wildcards)', example: '90210' })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @ApiPropertyOptional({ description: 'County name' })
  @IsString()
  @IsOptional()
  county?: string;

  @ApiProperty({ description: 'Apply tax to shipping', default: false })
  @IsBoolean()
  applyToShipping: boolean;

  @ApiProperty({ description: 'Apply tax to gift cards', default: false })
  @IsBoolean()
  applyToGiftCards: boolean;

  @ApiProperty({ description: 'Compound tax (tax on tax)', default: false })
  @IsBoolean()
  compoundTax: boolean;

  @ApiProperty({ description: 'Priority (higher number = higher priority)', default: 0 })
  @IsNumber()
  priority: number;

  @ApiProperty({ enum: TaxRateStatus, description: 'Tax rate status', default: 'ACTIVE' })
  @IsEnum(TaxRateStatus)
  status: TaxRateStatus;

  @ApiPropertyOptional({ description: 'Effective from date' })
  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @ApiPropertyOptional({ description: 'Effective to date' })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @ApiPropertyOptional({ description: 'External tax provider ID' })
  @IsString()
  @IsOptional()
  externalId?: string;

  @ApiPropertyOptional({ description: 'External provider name', example: 'taxjar' })
  @IsString()
  @IsOptional()
  externalProvider?: string;

  @ApiPropertyOptional({ description: 'Apply to specific category IDs only', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: any;
}

export class UpdateTaxRateDto extends CreateTaxRateDto {}

export class CalculateTaxDto {
  @ApiProperty({ description: 'Subtotal amount', example: 100.00 })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiProperty({ description: 'Shipping amount', example: 10.00 })
  @IsNumber()
  @Min(0)
  shippingAmount: number;

  @ApiProperty({ description: 'Country code', example: 'US' })
  @IsISO31661Alpha2()
  country: string;

  @ApiPropertyOptional({ description: 'State/province code', example: 'CA' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ description: 'City name' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ description: 'ZIP or postal code', example: '90210' })
  @IsString()
  zipCode: string;

  @ApiPropertyOptional({ description: 'Customer ID for exemption check' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Product IDs in order', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productIds?: string[];

  @ApiPropertyOptional({ description: 'Category IDs in order', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];
}

export class TaxCalculationResultDto {
  @ApiProperty({ description: 'Taxable amount' })
  taxableAmount: number;

  @ApiProperty({ description: 'Total tax amount' })
  taxAmount: number;

  @ApiProperty({ description: 'Tax breakdown', type: 'array' })
  taxBreakdown: Array<{
    taxRateId: string;
    name: string;
    code: string;
    rate: number;
    amount: number;
    taxType: string;
  }>;

  @ApiProperty({ description: 'Applied exemptions', type: 'array' })
  exemptionsApplied: Array<{
    exemptionId: string;
    exemptionType: string;
    reason: string;
    amount: number;
  }>;

  @ApiProperty({ description: 'Calculation method' })
  calculationMethod: string;

  @ApiProperty({ description: 'Total amount (subtotal + shipping + tax)' })
  totalAmount: number;
}
