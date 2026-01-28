import { IsString, IsEnum, IsOptional, IsArray, IsBoolean, IsUrl, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum LandingPageStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum LandingPageTemplate {
  PRODUCT_LAUNCH = 'PRODUCT_LAUNCH',
  EVENT = 'EVENT',
  LEAD_GENERATION = 'LEAD_GENERATION',
  PROMOTIONAL = 'PROMOTIONAL',
  CUSTOM = 'CUSTOM',
}

export class SEOMetadataDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  keywords?: string[];

  @IsOptional()
  @IsString()
  ogImage?: string;

  @IsOptional()
  @IsString()
  canonicalUrl?: string;
}

export class CTAButtonDto {
  @IsString()
  text: string;

  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  style?: string;

  @IsOptional()
  @IsBoolean()
  trackConversions?: boolean;
}

export class CreateLandingPageDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(LandingPageTemplate)
  template: LandingPageTemplate;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SEOMetadataDto)
  seoMetadata?: SEOMetadataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CTAButtonDto)
  primaryCTA?: CTAButtonDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CTAButtonDto)
  secondaryCTA?: CTAButtonDto;

  @IsOptional()
  content?: Record<string, any>;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class UpdateLandingPageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(LandingPageStatus)
  status?: LandingPageStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => SEOMetadataDto)
  seoMetadata?: SEOMetadataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CTAButtonDto)
  primaryCTA?: CTAButtonDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CTAButtonDto)
  secondaryCTA?: CTAButtonDto;

  @IsOptional()
  content?: Record<string, any>;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class LandingPageAnalyticsDto {
  @IsString()
  pageId: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
