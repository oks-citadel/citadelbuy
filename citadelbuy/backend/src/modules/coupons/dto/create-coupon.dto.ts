import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsArray, IsDateString, Min, Max, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  BUY_X_GET_Y = 'BUY_X_GET_Y',
  FREE_SHIPPING = 'FREE_SHIPPING',
  TIERED = 'TIERED',
}

export interface TieredRule {
  minAmount: number;
  discount: number;
}

export class CreateCouponDto {
  @ApiProperty({ description: 'Coupon code (unique)', example: 'SUMMER2024' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Display name', example: 'Summer Sale 2024' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the offer' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Discount type', enum: CouponType, example: CouponType.PERCENTAGE })
  @IsEnum(CouponType)
  type: CouponType;

  @ApiProperty({ description: 'Discount value (percentage or amount)', example: 20 })
  @IsNumber()
  @Min(0)
  value: number;

  // Buy X Get Y Configuration
  @ApiPropertyOptional({ description: 'Buy X items (for BUY_X_GET_Y type)', example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  buyQuantity?: number;

  @ApiPropertyOptional({ description: 'Get Y items free (for BUY_X_GET_Y type)', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  getQuantity?: number;

  // Tiered Configuration
  @ApiPropertyOptional({
    description: 'Tiered discount rules (for TIERED type)',
    example: [{ minAmount: 50, discount: 10 }, { minAmount: 100, discount: 20 }]
  })
  @IsOptional()
  @IsArray()
  tieredRules?: TieredRule[];

  // Usage Restrictions
  @ApiPropertyOptional({ description: 'Minimum order value', example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  @ApiPropertyOptional({ description: 'Maximum discount amount cap', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ description: 'Usage limit per user', example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimitPerUser?: number;

  @ApiPropertyOptional({ description: 'Total usage limit', example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  totalUsageLimit?: number;

  @ApiPropertyOptional({ description: 'Only for first-time customers', example: false })
  @IsOptional()
  @IsBoolean()
  firstTimeOnly?: boolean;

  // Validity Period
  @ApiProperty({ description: 'Start date (ISO 8601)', example: '2024-06-01T00:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)', example: '2024-08-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  // Target Restrictions
  @ApiPropertyOptional({ description: 'Applicable product IDs (empty = all products)', example: [] })
  @IsOptional()
  @IsArray()
  applicableProductIds?: string[];

  @ApiPropertyOptional({ description: 'Applicable category IDs (empty = all categories)', example: [] })
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

  @ApiPropertyOptional({ description: 'Specific user group IDs', example: [] })
  @IsOptional()
  @IsArray()
  userGroupIds?: string[];

  // Stacking Rules
  @ApiPropertyOptional({ description: 'Can stack with other coupons', example: false })
  @IsOptional()
  @IsBoolean()
  canStackWithOthers?: boolean;

  // Status
  @ApiPropertyOptional({ description: 'Is active', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Automatically applied if conditions met', example: false })
  @IsOptional()
  @IsBoolean()
  isAutomatic?: boolean;
}
