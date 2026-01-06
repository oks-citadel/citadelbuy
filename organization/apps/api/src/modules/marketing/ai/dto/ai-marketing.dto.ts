import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsObject,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Lead Scoring DTOs
export class ScoreLeadDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Additional attributes' })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;
}

export class UpdateScoringModelDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Scoring weights' })
  @IsObject()
  weights: Record<string, number>;

  @ApiPropertyOptional({ description: 'Score thresholds' })
  @IsOptional()
  @IsObject()
  thresholds?: {
    hot: number;
    warm: number;
    cold: number;
  };
}

// Churn Prediction DTOs
export class PredictChurnDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;
}

export class GetChurnRiskUsersDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Minimum risk score (0-100)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minRiskScore?: number;

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

// Campaign Forecasting DTOs
export enum ForecastMetric {
  IMPRESSIONS = 'IMPRESSIONS',
  CLICKS = 'CLICKS',
  CONVERSIONS = 'CONVERSIONS',
  REVENUE = 'REVENUE',
  ROI = 'ROI',
}

export class ForecastCampaignDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Campaign parameters' })
  @IsObject()
  campaignParams: {
    budget: number;
    duration: number;
    channels: string[];
    targetAudience?: string[];
  };

  @ApiPropertyOptional({ description: 'Metrics to forecast', enum: ForecastMetric, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ForecastMetric, { each: true })
  metrics?: ForecastMetric[];
}

export class AnalyzeCampaignPerformanceDto {
  @ApiProperty({ description: 'Campaign ID' })
  @IsString()
  campaignId: string;

  @ApiPropertyOptional({ description: 'Include recommendations' })
  @IsOptional()
  includeRecommendations?: boolean;
}

// Content Generation DTOs
export enum ContentGenerationType {
  EMAIL_SUBJECT = 'EMAIL_SUBJECT',
  EMAIL_BODY = 'EMAIL_BODY',
  PRODUCT_DESCRIPTION = 'PRODUCT_DESCRIPTION',
  AD_COPY = 'AD_COPY',
  SOCIAL_POST = 'SOCIAL_POST',
  LANDING_PAGE = 'LANDING_PAGE',
  BLOG_OUTLINE = 'BLOG_OUTLINE',
  META_DESCRIPTION = 'META_DESCRIPTION',
}

export class GenerateContentDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ enum: ContentGenerationType })
  @IsEnum(ContentGenerationType)
  type: ContentGenerationType;

  @ApiProperty({ description: 'Content context/topic' })
  @IsString()
  topic: string;

  @ApiPropertyOptional({ description: 'Target audience' })
  @IsOptional()
  @IsString()
  targetAudience?: string;

  @ApiPropertyOptional({ description: 'Tone of voice' })
  @IsOptional()
  @IsString()
  tone?: 'professional' | 'casual' | 'friendly' | 'urgent' | 'humorous';

  @ApiPropertyOptional({ description: 'Key points to include' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyPoints?: string[];

  @ApiPropertyOptional({ description: 'Number of variations' })
  @IsOptional()
  @IsNumber()
  variations?: number;

  @ApiPropertyOptional({ description: 'Max length (characters)' })
  @IsOptional()
  @IsNumber()
  maxLength?: number;
}

export class OptimizeContentDto {
  @ApiProperty({ description: 'Content to optimize' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Optimization goal' })
  @IsString()
  goal: 'engagement' | 'conversion' | 'seo' | 'clarity' | 'persuasion';

  @ApiPropertyOptional({ description: 'Target audience' })
  @IsOptional()
  @IsString()
  targetAudience?: string;
}

export class AiMarketingQueryDto {
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
}
