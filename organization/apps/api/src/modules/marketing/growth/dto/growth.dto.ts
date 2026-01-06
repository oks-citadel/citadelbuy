import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsDateString,
  ValidateNested,
  IsUrl,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Campaign DTOs
export enum GrowthCampaignType {
  ACQUISITION = 'ACQUISITION',
  ACTIVATION = 'ACTIVATION',
  RETENTION = 'RETENTION',
  REFERRAL = 'REFERRAL',
  REVENUE = 'REVENUE',
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export class CreateGrowthCampaignDto {
  @ApiProperty({ description: 'Campaign name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: GrowthCampaignType })
  @IsEnum(GrowthCampaignType)
  type: GrowthCampaignType;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Budget amount' })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiPropertyOptional({ description: 'Target audience segments' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetSegments?: string[];

  @ApiPropertyOptional({ description: 'Goal metrics' })
  @IsOptional()
  @IsObject()
  goals?: Record<string, number>;
}

export class UpdateGrowthCampaignDto {
  @ApiPropertyOptional({ description: 'Campaign name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CampaignStatus })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Budget amount' })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiPropertyOptional({ description: 'Goal metrics' })
  @IsOptional()
  @IsObject()
  goals?: Record<string, number>;
}

// Landing Page DTOs
export class LandingPageVariantDto {
  @ApiProperty({ description: 'Variant name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Traffic allocation percentage' })
  @IsNumber()
  @Min(0)
  @Max(100)
  trafficAllocation: number;

  @ApiPropertyOptional({ description: 'Page content/HTML' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Page configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

export class CreateLandingPageDto {
  @ApiProperty({ description: 'Landing page name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'URL slug' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Campaign ID' })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiProperty({ description: 'Page variants for A/B testing', type: [LandingPageVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LandingPageVariantDto)
  variants: LandingPageVariantDto[];

  @ApiPropertyOptional({ description: 'Default meta title' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'Default meta description' })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'Enable A/B testing' })
  @IsOptional()
  @IsBoolean()
  abTestEnabled?: boolean;
}

export class UpdateLandingPageDto {
  @ApiPropertyOptional({ description: 'Landing page name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'URL slug' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ description: 'Page variants', type: [LandingPageVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LandingPageVariantDto)
  variants?: LandingPageVariantDto[];

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Referral DTOs
export class CreateReferralProgramDto {
  @ApiProperty({ description: 'Program name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Referrer reward type' })
  @IsString()
  referrerRewardType: 'discount' | 'credit' | 'points' | 'cash';

  @ApiProperty({ description: 'Referrer reward value' })
  @IsNumber()
  referrerRewardValue: number;

  @ApiProperty({ description: 'Referee reward type' })
  @IsString()
  refereeRewardType: 'discount' | 'credit' | 'points' | 'cash';

  @ApiProperty({ description: 'Referee reward value' })
  @IsNumber()
  refereeRewardValue: number;

  @ApiPropertyOptional({ description: 'Max referrals per user' })
  @IsOptional()
  @IsNumber()
  maxReferralsPerUser?: number;

  @ApiPropertyOptional({ description: 'Min purchase for reward' })
  @IsOptional()
  @IsNumber()
  minPurchaseAmount?: number;

  @ApiPropertyOptional({ description: 'Reward expiry days' })
  @IsOptional()
  @IsNumber()
  rewardExpiryDays?: number;
}

export class CreateReferralDto {
  @ApiProperty({ description: 'Referrer user ID' })
  @IsString()
  referrerId: string;

  @ApiProperty({ description: 'Referee email' })
  @IsString()
  refereeEmail: string;

  @ApiPropertyOptional({ description: 'Program ID' })
  @IsOptional()
  @IsString()
  programId?: string;

  @ApiPropertyOptional({ description: 'Source channel' })
  @IsOptional()
  @IsString()
  channel?: string;
}

// Affiliate DTOs
export class CreateAffiliateProgramDto {
  @ApiProperty({ description: 'Program name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Commission type' })
  @IsString()
  commissionType: 'percentage' | 'fixed';

  @ApiProperty({ description: 'Commission value' })
  @IsNumber()
  commissionValue: number;

  @ApiPropertyOptional({ description: 'Cookie duration in days' })
  @IsOptional()
  @IsNumber()
  cookieDuration?: number;

  @ApiPropertyOptional({ description: 'Min payout threshold' })
  @IsOptional()
  @IsNumber()
  minPayoutThreshold?: number;

  @ApiPropertyOptional({ description: 'Terms and conditions' })
  @IsOptional()
  @IsString()
  terms?: string;
}

export class RegisterAffiliateDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Program ID' })
  @IsString()
  programId: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiPropertyOptional({ description: 'Social media handles' })
  @IsOptional()
  @IsObject()
  socialMedia?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Promotion methods' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  promotionMethods?: string[];
}

export class TrackAffiliateClickDto {
  @ApiProperty({ description: 'Affiliate ID' })
  @IsString()
  affiliateId: string;

  @ApiPropertyOptional({ description: 'Campaign ID' })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Source URL' })
  @IsOptional()
  @IsUrl()
  sourceUrl?: string;

  @ApiPropertyOptional({ description: 'Landing page URL' })
  @IsOptional()
  @IsString()
  landingPage?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class GrowthCampaignQueryDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ enum: GrowthCampaignType })
  @IsOptional()
  @IsEnum(GrowthCampaignType)
  type?: GrowthCampaignType;

  @ApiPropertyOptional({ enum: CampaignStatus })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

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
