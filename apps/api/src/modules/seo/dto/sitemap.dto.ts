import { IsString, IsOptional, IsEnum, IsNumber, Min, Max, IsArray, ValidateNested, IsUrl, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum SitemapChangeFrequency {
  ALWAYS = 'always',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  NEVER = 'never',
}

export class SitemapUrlDto {
  @ApiProperty({ description: 'URL location' })
  @IsUrl()
  loc: string;

  @ApiPropertyOptional({ description: 'Last modification date' })
  @IsOptional()
  @IsDateString()
  lastmod?: string;

  @ApiPropertyOptional({ enum: SitemapChangeFrequency, description: 'Change frequency' })
  @IsOptional()
  @IsEnum(SitemapChangeFrequency)
  changefreq?: SitemapChangeFrequency;

  @ApiPropertyOptional({ description: 'Priority (0.0 - 1.0)', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  priority?: number;
}

export class SitemapImageDto {
  @ApiProperty({ description: 'Image URL' })
  @IsUrl()
  loc: string;

  @ApiPropertyOptional({ description: 'Image caption' })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional({ description: 'Image title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Geographic location' })
  @IsOptional()
  @IsString()
  geoLocation?: string;

  @ApiPropertyOptional({ description: 'License URL' })
  @IsOptional()
  @IsUrl()
  license?: string;
}

export class SitemapVideoDto {
  @ApiProperty({ description: 'Video thumbnail URL' })
  @IsUrl()
  thumbnailLoc: string;

  @ApiProperty({ description: 'Video title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Video description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Video content URL' })
  @IsOptional()
  @IsUrl()
  contentLoc?: string;

  @ApiPropertyOptional({ description: 'Video player URL' })
  @IsOptional()
  @IsUrl()
  playerLoc?: string;

  @ApiPropertyOptional({ description: 'Video duration in seconds' })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({ description: 'Video expiration date' })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @ApiPropertyOptional({ description: 'Video rating (0.0 - 5.0)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'Video view count' })
  @IsOptional()
  @IsNumber()
  viewCount?: number;

  @ApiPropertyOptional({ description: 'Video publication date' })
  @IsOptional()
  @IsDateString()
  publicationDate?: string;

  @ApiPropertyOptional({ description: 'Family friendly flag' })
  @IsOptional()
  @IsBoolean()
  familyFriendly?: boolean;
}

export class SitemapProductDto extends SitemapUrlDto {
  @ApiPropertyOptional({ description: 'Product images', type: [SitemapImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SitemapImageDto)
  images?: SitemapImageDto[];

  @ApiPropertyOptional({ description: 'Product videos', type: [SitemapVideoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SitemapVideoDto)
  videos?: SitemapVideoDto[];
}

export class GenerateSitemapDto {
  @ApiPropertyOptional({ description: 'Tenant ID for multi-tenant sitemaps' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Locale for the sitemap', default: 'en' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({ description: 'Include products', default: true })
  @IsOptional()
  @IsBoolean()
  includeProducts?: boolean;

  @ApiPropertyOptional({ description: 'Include categories', default: true })
  @IsOptional()
  @IsBoolean()
  includeCategories?: boolean;

  @ApiPropertyOptional({ description: 'Include blog posts', default: true })
  @IsOptional()
  @IsBoolean()
  includeBlog?: boolean;

  @ApiPropertyOptional({ description: 'Include static pages', default: true })
  @IsOptional()
  @IsBoolean()
  includePages?: boolean;
}

export class SitemapIndexDto {
  @ApiProperty({ description: 'List of sitemap URLs' })
  @IsArray()
  sitemaps: {
    loc: string;
    lastmod?: string;
  }[];
}

export class SitemapResponseDto {
  @ApiProperty({ description: 'XML content of the sitemap' })
  xml: string;

  @ApiProperty({ description: 'Content type header' })
  contentType: string;
}
