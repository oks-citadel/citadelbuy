import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsArray, IsDateString, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  FREE_SHIPPING = 'FREE_SHIPPING',
}

export interface DiscountRule {
  type: string; // 'min_cart_value', 'min_items', 'specific_product', etc.
  operator: string; // 'gte', 'lte', 'eq', 'in', etc.
  value: any;
}

export class CreateAutomaticDiscountDto {
  @ApiProperty({ description: 'Internal name', example: 'Summer Auto Discount' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Discount type', enum: DiscountType, example: DiscountType.PERCENTAGE })
  @IsEnum(DiscountType)
  type: DiscountType;

  @ApiProperty({ description: 'Discount value', example: 15 })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({
    description: 'Trigger rules (JSON)',
    example: { type: 'min_cart_value', operator: 'gte', value: 100 }
  })
  @IsObject()
  rules: DiscountRule;

  @ApiPropertyOptional({ description: 'Priority (higher = applied first)', example: 10 })
  @IsOptional()
  @IsNumber()
  priority?: number;

  // Target Restrictions
  @ApiPropertyOptional({ description: 'Applicable product IDs', example: [] })
  @IsOptional()
  @IsArray()
  applicableProductIds?: string[];

  @ApiPropertyOptional({ description: 'Applicable category IDs', example: [] })
  @IsOptional()
  @IsArray()
  applicableCategoryIds?: string[];

  @ApiPropertyOptional({ description: 'Excluded product IDs', example: [] })
  @IsOptional()
  @IsArray()
  excludedProductIds?: string[];

  @ApiPropertyOptional({ description: 'Excluded category IDs', example: [] })
  @IsOptional()
  @IsArray()
  excludedCategoryIds?: string[];

  // Validity
  @ApiProperty({ description: 'Start date (ISO 8601)', example: '2024-06-01T00:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)', example: '2024-08-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Is active', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAutomaticDiscountDto extends CreateAutomaticDiscountDto {}
