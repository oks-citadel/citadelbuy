import { IsString, IsInt, IsBoolean, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoyaltyTier } from '@prisma/client';

export class EarnPointsDto {
  @ApiProperty({ description: 'Order ID for purchase points' })
  @IsString()
  orderId: string;
}

export class AdjustPointsDto {
  @ApiProperty({ description: 'Points to adjust (positive or negative)', example: 100 })
  @IsInt()
  points: number;

  @ApiProperty({ description: 'Reason for adjustment', example: 'Compensation for issue' })
  @IsString()
  reason: string;
}

export class CreateReferralDto {
  @ApiPropertyOptional({ description: 'Email of person being referred' })
  @IsOptional()
  @IsString()
  refereeEmail?: string;

  @ApiPropertyOptional({ description: 'Phone of person being referred' })
  @IsOptional()
  @IsString()
  refereePhone?: string;
}

export class UpdateLoyaltyProgramDto {
  @ApiPropertyOptional({ description: 'Program name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Program description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Points earned per dollar spent', example: 1 })
  @IsOptional()
  @Min(0)
  pointsPerDollar?: number;

  @ApiPropertyOptional({ description: 'Minimum points to redeem', example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minimumRedeemPoints?: number;

  @ApiPropertyOptional({ description: 'Days until points expire' })
  @IsOptional()
  @IsInt()
  @Min(1)
  pointsExpiryDays?: number;

  @ApiPropertyOptional({ description: 'Signup bonus points', example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  signupBonusPoints?: number;

  @ApiPropertyOptional({ description: 'Review reward points', example: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reviewRewardPoints?: number;

  @ApiPropertyOptional({ description: 'Birthday reward points', example: 200 })
  @IsOptional()
  @IsInt()
  @Min(0)
  birthdayRewardPoints?: number;

  @ApiPropertyOptional({ description: 'Referrer reward points', example: 500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  referrerRewardPoints?: number;

  @ApiPropertyOptional({ description: 'Referee reward points', example: 250 })
  @IsOptional()
  @IsInt()
  @Min(0)
  refereeRewardPoints?: number;

  @ApiPropertyOptional({ description: 'Minimum purchase for referral to count', example: 50 })
  @IsOptional()
  @Min(0)
  referralMinPurchase?: number;

  @ApiPropertyOptional({ description: 'Is program active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateTierBenefitDto {
  @ApiProperty({ description: 'Loyalty tier', enum: LoyaltyTier })
  @IsEnum(LoyaltyTier)
  tier: LoyaltyTier;

  @ApiProperty({ description: 'Benefit name', example: 'Gold Member Benefits' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Benefit description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Minimum lifetime spending', example: 1000 })
  @Min(0)
  minimumSpending: number;

  @ApiProperty({ description: 'Minimum lifetime points', example: 5000 })
  @IsInt()
  @Min(0)
  minimumPoints: number;

  @ApiPropertyOptional({ description: 'Points earning multiplier', example: 1.5 })
  @IsOptional()
  @Min(1)
  pointsMultiplier?: number;

  @ApiPropertyOptional({ description: 'Discount percentage on all purchases', example: 5 })
  @IsOptional()
  @Min(0)
  discountPercentage?: number;

  @ApiPropertyOptional({ description: 'Free shipping enabled' })
  @IsOptional()
  @IsBoolean()
  freeShipping?: boolean;

  @ApiPropertyOptional({ description: 'Early access hours to sales', example: 24 })
  @IsOptional()
  @IsInt()
  @Min(0)
  earlyAccessHours?: number;

  @ApiPropertyOptional({ description: 'Priority support enabled' })
  @IsOptional()
  @IsBoolean()
  prioritySupport?: boolean;

  @ApiPropertyOptional({ description: 'Exclusive products access' })
  @IsOptional()
  @IsBoolean()
  exclusiveProducts?: boolean;

  @ApiPropertyOptional({ description: 'Badge icon' })
  @IsOptional()
  @IsString()
  badgeIcon?: string;

  @ApiPropertyOptional({ description: 'Badge color' })
  @IsOptional()
  @IsString()
  badgeColor?: string;
}

export class UpdateTierBenefitDto {
  @ApiPropertyOptional({ description: 'Benefit name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Benefit description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Minimum lifetime spending' })
  @IsOptional()
  @Min(0)
  minimumSpending?: number;

  @ApiPropertyOptional({ description: 'Minimum lifetime points' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minimumPoints?: number;

  @ApiPropertyOptional({ description: 'Points earning multiplier' })
  @IsOptional()
  @Min(1)
  pointsMultiplier?: number;

  @ApiPropertyOptional({ description: 'Discount percentage' })
  @IsOptional()
  @Min(0)
  discountPercentage?: number;

  @ApiPropertyOptional({ description: 'Free shipping' })
  @IsOptional()
  @IsBoolean()
  freeShipping?: boolean;

  @ApiPropertyOptional({ description: 'Early access hours' })
  @IsOptional()
  @IsInt()
  @Min(0)
  earlyAccessHours?: number;

  @ApiPropertyOptional({ description: 'Priority support' })
  @IsOptional()
  @IsBoolean()
  prioritySupport?: boolean;

  @ApiPropertyOptional({ description: 'Exclusive products' })
  @IsOptional()
  @IsBoolean()
  exclusiveProducts?: boolean;

  @ApiPropertyOptional({ description: 'Badge icon' })
  @IsOptional()
  @IsString()
  badgeIcon?: string;

  @ApiPropertyOptional({ description: 'Badge color' })
  @IsOptional()
  @IsString()
  badgeColor?: string;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
