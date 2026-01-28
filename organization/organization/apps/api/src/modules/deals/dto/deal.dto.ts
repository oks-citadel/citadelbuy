import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DealType, DealStatus, LoyaltyTier } from '@prisma/client';

export class CreateDealDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsEnum(DealType)
  type: DealType;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  earlyAccessHours?: number;

  @IsEnum(LoyaltyTier)
  @IsOptional()
  minimumTier?: LoyaltyTier;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discountAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  buyQuantity?: number; // For BOGO deals

  @IsNumber()
  @IsOptional()
  @Min(1)
  getQuantity?: number; // For BOGO deals

  @IsNumber()
  @IsOptional()
  @Min(0)
  minimumPurchase?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  totalStock?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  limitPerCustomer?: number;

  @IsString()
  @IsOptional()
  badge?: string; // e.g., "FLASH SALE", "LIMITED TIME"

  @IsString()
  @IsOptional()
  badgeColor?: string; // e.g., "#FF0000"

  @IsNumber()
  @IsOptional()
  featuredOrder?: number;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsString()
  @IsOptional()
  bannerImage?: string;

  @IsBoolean()
  @IsOptional()
  stackableWithCoupons?: boolean;

  @IsBoolean()
  @IsOptional()
  stackableWithLoyalty?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DealProductDto)
  products?: DealProductDto[];
}

export class UpdateDealDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(DealStatus)
  @IsOptional()
  status?: DealStatus;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  earlyAccessHours?: number;

  @IsEnum(LoyaltyTier)
  @IsOptional()
  minimumTier?: LoyaltyTier;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  discountAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  totalStock?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  limitPerCustomer?: number;

  @IsString()
  @IsOptional()
  badge?: string;

  @IsString()
  @IsOptional()
  badgeColor?: string;

  @IsNumber()
  @IsOptional()
  featuredOrder?: number;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsString()
  @IsOptional()
  bannerImage?: string;

  @IsBoolean()
  @IsOptional()
  stackableWithCoupons?: boolean;

  @IsBoolean()
  @IsOptional()
  stackableWithLoyalty?: boolean;
}

export class DealProductDto {
  @IsString()
  productId: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  dealPrice?: number; // Specific deal price, overrides deal-level discount

  @IsNumber()
  @Min(0)
  originalPrice: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  stockAllocated?: number; // Product-specific stock limit

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AddProductsToDealDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DealProductDto)
  products: DealProductDto[];
}

export class RemoveProductFromDealDto {
  @IsString()
  productId: string;
}

export class PurchaseDealDto {
  @IsString()
  dealId: string;

  @IsString()
  @IsOptional()
  dealProductId?: string; // If deal has specific products

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  orderId: string;

  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @IsNumber()
  @Min(0)
  discountApplied: number;
}

export class CalculateDealPriceDto {
  @IsString()
  dealId: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsNumber()
  @Min(0)
  originalPrice: number;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  userId?: string; // For tier-based eligibility
}

export class CheckDealEligibilityDto {
  @IsString()
  dealId: string;

  @IsString()
  userId: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  quantity?: number;
}

export class TrackDealViewDto {
  @IsString()
  dealId: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;
}

export class TrackDealClickDto {
  @IsString()
  dealId: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;
}

export class GetDealsQueryDto {
  @IsEnum(DealType)
  @IsOptional()
  type?: DealType;

  @IsEnum(DealStatus)
  @IsOptional()
  status?: DealStatus;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsBoolean()
  @IsOptional()
  activeOnly?: boolean; // Filter for currently active deals

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class NotifyDealDto {
  @IsString()
  dealId: string;

  @IsEnum(['EMAIL', 'SMS', 'PUSH', 'IN_APP'])
  notificationType: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';

  @IsString()
  @IsOptional()
  userId?: string; // If notifying specific user

  @IsEnum(LoyaltyTier)
  @IsOptional()
  tier?: LoyaltyTier; // If notifying specific tier
}
