import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsDateString,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ContentStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum ContentType {
  PAGE = 'PAGE',
  BLOG_POST = 'BLOG_POST',
  LANDING_PAGE = 'LANDING_PAGE',
  FAQ = 'FAQ',
  HELP_ARTICLE = 'HELP_ARTICLE',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

export class ContentSeoDto {
  @ApiPropertyOptional({ description: 'Meta title' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'Meta description' })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'Meta keywords' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: 'Canonical URL' })
  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @ApiPropertyOptional({ description: 'Open Graph image' })
  @IsOptional()
  @IsString()
  ogImage?: string;
}

export class CreateContentDto {
  @ApiProperty({ description: 'Content title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'URL slug' })
  @IsString()
  slug: string;

  @ApiProperty({ description: 'Content body (HTML or markdown)' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'Content excerpt/summary' })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiProperty({ enum: ContentType, description: 'Type of content' })
  @IsEnum(ContentType)
  type: ContentType;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Author ID' })
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiPropertyOptional({ description: 'Featured image URL' })
  @IsOptional()
  @IsString()
  featuredImage?: string;

  @ApiPropertyOptional({ description: 'Tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Categories' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ description: 'SEO metadata', type: ContentSeoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContentSeoDto)
  seo?: ContentSeoDto;

  @ApiPropertyOptional({ description: 'Publish immediately' })
  @IsOptional()
  @IsBoolean()
  publishNow?: boolean;

  @ApiPropertyOptional({ description: 'Locale/language code' })
  @IsOptional()
  @IsString()
  locale?: string;
}

export class UpdateContentDto {
  @ApiPropertyOptional({ description: 'Content title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'URL slug' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ description: 'Content body' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ description: 'Content excerpt' })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({ description: 'Featured image URL' })
  @IsOptional()
  @IsString()
  featuredImage?: string;

  @ApiPropertyOptional({ description: 'Tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Categories' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ description: 'SEO metadata', type: ContentSeoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContentSeoDto)
  seo?: ContentSeoDto;
}

export class ScheduleContentDto {
  @ApiProperty({ description: 'Content ID' })
  @IsString()
  contentId: string;

  @ApiProperty({ description: 'Scheduled publish date' })
  @IsDateString()
  publishAt: string;

  @ApiPropertyOptional({ description: 'Scheduled unpublish date' })
  @IsOptional()
  @IsDateString()
  unpublishAt?: string;

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class ContentVersionDto {
  @ApiProperty({ description: 'Version number' })
  @IsNumber()
  version: number;

  @ApiProperty({ description: 'Content snapshot' })
  @IsObject()
  content: Record<string, any>;

  @ApiPropertyOptional({ description: 'Change description' })
  @IsOptional()
  @IsString()
  changeDescription?: string;
}

export class RestoreVersionDto {
  @ApiProperty({ description: 'Content ID' })
  @IsString()
  contentId: string;

  @ApiProperty({ description: 'Version number to restore' })
  @IsNumber()
  version: number;
}

export class TopicClusterDto {
  @ApiProperty({ description: 'Cluster name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Pillar content ID' })
  @IsOptional()
  @IsString()
  pillarContentId?: string;

  @ApiPropertyOptional({ description: 'Cluster description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Related keywords' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class AddToClusterDto {
  @ApiProperty({ description: 'Cluster ID' })
  @IsString()
  clusterId: string;

  @ApiProperty({ description: 'Content IDs to add' })
  @IsArray()
  @IsString({ each: true })
  contentIds: string[];
}

export class ContentQueryDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ enum: ContentType })
  @IsOptional()
  @IsEnum(ContentType)
  type?: ContentType;

  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Locale filter' })
  @IsOptional()
  @IsString()
  locale?: string;

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
