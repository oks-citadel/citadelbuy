import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlanType, BillingInterval } from '@prisma/client';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ description: 'Plan name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Plan description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: SubscriptionPlanType, description: 'Plan type' })
  @IsEnum(SubscriptionPlanType)
  type: SubscriptionPlanType;

  @ApiProperty({ description: 'Price in dollars', minimum: 0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ enum: BillingInterval, description: 'Billing interval' })
  @IsEnum(BillingInterval)
  billingInterval: BillingInterval;

  @ApiPropertyOptional({ description: 'Free trial days', minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  trialDays?: number;

  @ApiProperty({ description: 'Plan benefits (JSON)' })
  @IsObject()
  benefits: {
    freeShipping?: boolean;
    discountPercent?: number;
    earlyAccess?: boolean;
    prioritySupport?: boolean;
    features?: string[];
  };

  @ApiPropertyOptional({ description: 'Max products for vendors' })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxProducts?: number;

  @ApiPropertyOptional({ description: 'Max active ads for vendors' })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxAds?: number;

  @ApiPropertyOptional({ description: 'Commission rate for vendors', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  commissionRate?: number;

  @ApiPropertyOptional({ description: 'Priority support' })
  @IsBoolean()
  @IsOptional()
  prioritySupport?: boolean;
}
