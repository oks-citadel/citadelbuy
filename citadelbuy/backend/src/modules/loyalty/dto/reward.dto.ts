import { IsString, IsInt, IsBoolean, IsOptional, IsEnum, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RewardType, LoyaltyTier } from '@prisma/client';

export class CreateRewardDto {
  @ApiProperty({ description: 'Reward name', example: '10% Discount Coupon' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Reward description', example: 'Get 10% off your next purchase' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Reward type', enum: RewardType })
  @IsEnum(RewardType)
  type: RewardType;

  @ApiProperty({ description: 'Points cost to redeem', example: 1000 })
  @IsInt()
  @Min(1)
  pointsCost: number;

  @ApiPropertyOptional({ description: 'Discount percentage (for DISCOUNT_PERCENTAGE type)', example: 10 })
  @IsOptional()
  @Min(0)
  discountPercentage?: number;

  @ApiPropertyOptional({ description: 'Discount amount (for DISCOUNT_FIXED type)', example: 25 })
  @IsOptional()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Product ID (for FREE_PRODUCT type)' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ description: 'Stock quantity (null for unlimited)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ description: 'Valid from date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Valid until date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ description: 'Minimum tier required', enum: LoyaltyTier })
  @IsOptional()
  @IsEnum(LoyaltyTier)
  minimumTier?: LoyaltyTier;

  @ApiPropertyOptional({ description: 'Minimum purchase amount to use reward', example: 50 })
  @IsOptional()
  @Min(0)
  minimumPurchase?: number;
}

export class UpdateRewardDto {
  @ApiPropertyOptional({ description: 'Reward name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Reward description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Points cost' })
  @IsOptional()
  @IsInt()
  @Min(1)
  pointsCost?: number;

  @ApiPropertyOptional({ description: 'Discount percentage' })
  @IsOptional()
  @Min(0)
  discountPercentage?: number;

  @ApiPropertyOptional({ description: 'Discount amount' })
  @IsOptional()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Product ID' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Stock quantity' })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ description: 'Valid from date' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Valid until date' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ description: 'Minimum tier' })
  @IsOptional()
  @IsEnum(LoyaltyTier)
  minimumTier?: LoyaltyTier;

  @ApiPropertyOptional({ description: 'Minimum purchase amount' })
  @IsOptional()
  @Min(0)
  minimumPurchase?: number;
}

export class RedeemRewardDto {
  @ApiProperty({ description: 'Reward ID to redeem' })
  @IsString()
  rewardId: string;
}

export class ApplyRewardDto {
  @ApiProperty({ description: 'Redemption ID to apply to order' })
  @IsString()
  redemptionId: string;

  @ApiProperty({ description: 'Order ID to apply reward to' })
  @IsString()
  orderId: string;
}
