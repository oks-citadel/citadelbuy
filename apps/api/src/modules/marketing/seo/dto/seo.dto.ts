import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsUrl,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SitemapChangeFrequency {
  ALWAYS = 'always',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  NEVER = 'never',
}

export enum RobotDirective {
  INDEX = 'index',
  NOINDEX = 'noindex',
  FOLLOW = 'follow',
  NOFOLLOW = 'nofollow',
  NOARCHIVE = 'noarchive',
  NOSNIPPET = 'nosnippet',
  NOIMAGEINDEX = 'noimageindex',
}

export class SitemapUrlDto {
  @ApiProperty({ description: 'URL location' })
  @IsUrl()
  loc: string;

  @ApiPropertyOptional({ description: 'Last modified date' })
  @IsOptional()
  @IsDateString()
  lastmod?: string;

  @ApiPropertyOptional({ enum: SitemapChangeFrequency })
  @IsOptional()
  @IsEnum(SitemapChangeFrequency)
  changefreq?: SitemapChangeFrequency;

  @ApiPropertyOptional({ description: 'Priority 0.0-1.0' })
  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class GenerateSitemapDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Include products' })
  @IsOptional()
  @IsBoolean()
  includeProducts?: boolean;

  @ApiPropertyOptional({ description: 'Include categories' })
  @IsOptional()
  @IsBoolean()
  includeCategories?: boolean;

  @ApiPropertyOptional({ description: 'Include content pages' })
  @IsOptional()
  @IsBoolean()
  includeContent?: boolean;

  @ApiPropertyOptional({ description: 'Include blog posts' })
  @IsOptional()
  @IsBoolean()
  includeBlog?: boolean;

  @ApiPropertyOptional({ description: 'Base URL for sitemap' })
  @IsOptional()
  @IsUrl()
  baseUrl?: string;
}

export class RobotsRuleDto {
  @ApiProperty({ description: 'User agent' })
  @IsString()
  userAgent: string;

  @ApiPropertyOptional({ description: 'Allowed paths' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allow?: string[];

  @ApiPropertyOptional({ description: 'Disallowed paths' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disallow?: string[];

  @ApiPropertyOptional({ description: 'Crawl delay in seconds' })
  @IsOptional()
  @IsNumber()
  crawlDelay?: number;
}

export class GenerateRobotsDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Custom rules', type: [RobotsRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RobotsRuleDto)
  rules?: RobotsRuleDto[];

  @ApiPropertyOptional({ description: 'Sitemap URLs' })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  sitemaps?: string[];
}

export class WebAppManifestDto {
  @ApiProperty({ description: 'App name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Short name' })
  @IsOptional()
  @IsString()
  shortName?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Start URL' })
  @IsOptional()
  @IsString()
  startUrl?: string;

  @ApiPropertyOptional({ description: 'Display mode' })
  @IsOptional()
  @IsString()
  display?: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';

  @ApiPropertyOptional({ description: 'Theme color' })
  @IsOptional()
  @IsString()
  themeColor?: string;

  @ApiPropertyOptional({ description: 'Background color' })
  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @ApiPropertyOptional({ description: 'Icons array' })
  @IsOptional()
  @IsArray()
  icons?: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
}

export class ReindexRequestDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Specific URLs to reindex' })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  urls?: string[];

  @ApiPropertyOptional({ description: 'Reindex all pages' })
  @IsOptional()
  @IsBoolean()
  fullReindex?: boolean;

  @ApiPropertyOptional({ description: 'Priority (1-10)' })
  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class SeoAuditQueryDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

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

  @ApiPropertyOptional({ description: 'Filter by issue severity' })
  @IsOptional()
  @IsString()
  severity?: 'critical' | 'warning' | 'info';
}

export class CoreWebVitalsQueryDto {
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

  @ApiPropertyOptional({ description: 'Specific URL' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ description: 'Device type' })
  @IsOptional()
  @IsString()
  device?: 'mobile' | 'desktop';
}

export class JsonLdSchemaTypeDto {
  @ApiProperty({ description: 'Schema type' })
  @IsString()
  type: 'Product' | 'Organization' | 'BreadcrumbList' | 'Article' | 'FAQPage' | 'LocalBusiness' | 'WebSite' | 'Review';

  @ApiProperty({ description: 'Entity ID' })
  @IsString()
  entityId: string;

  @ApiPropertyOptional({ description: 'Additional schema data' })
  @IsOptional()
  additionalData?: Record<string, any>;
}

export class GenerateSchemaDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Schema configurations', type: [JsonLdSchemaTypeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JsonLdSchemaTypeDto)
  schemas: JsonLdSchemaTypeDto[];

  @ApiPropertyOptional({ description: 'Output format' })
  @IsOptional()
  @IsString()
  format?: 'json-ld' | 'microdata' | 'rdfa';
}
