import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  IsDateString,
  IsObject,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Upsell/Cross-sell DTOs
export enum OfferType {
  UPSELL = 'UPSELL',
  CROSS_SELL = 'CROSS_SELL',
  BUNDLE = 'BUNDLE',
  ADDON = 'ADDON',
}

export enum OfferTrigger {
  PRODUCT_VIEW = 'PRODUCT_VIEW',
  ADD_TO_CART = 'ADD_TO_CART',
  CHECKOUT = 'CHECKOUT',
  POST_PURCHASE = 'POST_PURCHASE',
}

export class CreateOfferDto {
  @ApiProperty({ description: 'Offer name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ enum: OfferType })
  @IsEnum(OfferType)
  type: OfferType;

  @ApiProperty({ enum: OfferTrigger })
  @IsEnum(OfferTrigger)
  trigger: OfferTrigger;

  @ApiProperty({ description: 'Source product IDs' })
  @IsArray()
  @IsString({ each: true })
  sourceProductIds: string[];

  @ApiProperty({ description: 'Offered product IDs' })
  @IsArray()
  @IsString({ each: true })
  offeredProductIds: string[];

  @ApiPropertyOptional({ description: 'Discount percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @ApiPropertyOptional({ description: 'Offer headline' })
  @IsOptional()
  @IsString()
  headline?: string;

  @ApiPropertyOptional({ description: 'Offer description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Priority (higher = first)' })
  @IsOptional()
  @IsNumber()
  priority?: number;
}

// Coupon DTOs
export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  FREE_SHIPPING = 'FREE_SHIPPING',
  BUY_X_GET_Y = 'BUY_X_GET_Y',
}

export class CreateCouponDto {
  @ApiProperty({ description: 'Coupon code' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ enum: CouponType })
  @IsEnum(CouponType)
  type: CouponType;

  @ApiProperty({ description: 'Discount value' })
  @IsNumber()
  value: number;

  @ApiPropertyOptional({ description: 'Minimum order amount' })
  @IsOptional()
  @IsNumber()
  minOrderAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum discount amount' })
  @IsOptional()
  @IsNumber()
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ description: 'Usage limit per coupon' })
  @IsOptional()
  @IsNumber()
  usageLimit?: number;

  @ApiPropertyOptional({ description: 'Usage limit per user' })
  @IsOptional()
  @IsNumber()
  usageLimitPerUser?: number;

  @ApiPropertyOptional({ description: 'Valid from date' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Valid until date' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ description: 'Applicable product IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @ApiPropertyOptional({ description: 'Applicable category IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ description: 'First purchase only' })
  @IsOptional()
  @IsBoolean()
  firstPurchaseOnly?: boolean;
}

export class ValidateCouponDto {
  @ApiProperty({ description: 'Coupon code' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Order total' })
  @IsNumber()
  orderTotal: number;

  @ApiPropertyOptional({ description: 'Product IDs in cart' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];
}

// In-App Messaging DTOs
export enum MessageType {
  BANNER = 'BANNER',
  MODAL = 'MODAL',
  TOOLTIP = 'TOOLTIP',
  SLIDE_IN = 'SLIDE_IN',
  FULL_SCREEN = 'FULL_SCREEN',
}

export class CreateInAppMessageDto {
  @ApiProperty({ description: 'Message name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ enum: MessageType })
  @IsEnum(MessageType)
  type: MessageType;

  @ApiProperty({ description: 'Message content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'CTA button text' })
  @IsOptional()
  @IsString()
  ctaText?: string;

  @ApiPropertyOptional({ description: 'CTA URL' })
  @IsOptional()
  @IsString()
  ctaUrl?: string;

  @ApiPropertyOptional({ description: 'Trigger event' })
  @IsOptional()
  @IsString()
  triggerEvent?: string;

  @ApiPropertyOptional({ description: 'Target pages' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetPages?: string[];

  @ApiPropertyOptional({ description: 'Target segments' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetSegments?: string[];

  @ApiPropertyOptional({ description: 'Show delay (seconds)' })
  @IsOptional()
  @IsNumber()
  showDelay?: number;

  @ApiPropertyOptional({ description: 'Dismiss after (seconds)' })
  @IsOptional()
  @IsNumber()
  dismissAfter?: number;
}

// Trial Conversion DTOs
export class CreateTrialPlanDto {
  @ApiProperty({ description: 'Plan name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Trial duration (days)' })
  @IsNumber()
  trialDays: number;

  @ApiPropertyOptional({ description: 'Features included' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ description: 'Paid plan ID to convert to' })
  @IsOptional()
  @IsString()
  targetPlanId?: string;

  @ApiPropertyOptional({ description: 'Conversion incentive' })
  @IsOptional()
  @IsObject()
  conversionIncentive?: {
    type: 'discount' | 'extended_trial' | 'bonus_feature';
    value: any;
  };
}

export class StartTrialDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Plan ID' })
  @IsString()
  planId: string;
}

export class OfferQueryDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ enum: OfferType })
  @IsOptional()
  @IsEnum(OfferType)
  type?: OfferType;

  @ApiPropertyOptional({ description: 'Product ID' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ enum: OfferTrigger })
  @IsOptional()
  @IsEnum(OfferTrigger)
  trigger?: OfferTrigger;
}
