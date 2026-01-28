import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class OpenGraphTagsDto {
  @ApiPropertyOptional({ description: 'OG title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'OG description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'OG type (website, article, product, etc.)' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'OG image URL' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ description: 'OG image alt text' })
  @IsOptional()
  @IsString()
  imageAlt?: string;

  @ApiPropertyOptional({ description: 'OG URL' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: 'Site name' })
  @IsOptional()
  @IsString()
  siteName?: string;

  @ApiPropertyOptional({ description: 'Locale' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({ description: 'Additional OG properties' })
  @IsOptional()
  @IsObject()
  custom?: Record<string, string>;
}

export class TwitterCardTagsDto {
  @ApiPropertyOptional({ description: 'Card type', enum: ['summary', 'summary_large_image', 'app', 'player'] })
  @IsOptional()
  @IsString()
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';

  @ApiPropertyOptional({ description: 'Twitter title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Twitter description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Twitter image URL' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ description: 'Twitter image alt text' })
  @IsOptional()
  @IsString()
  imageAlt?: string;

  @ApiPropertyOptional({ description: 'Twitter site handle' })
  @IsOptional()
  @IsString()
  site?: string;

  @ApiPropertyOptional({ description: 'Twitter creator handle' })
  @IsOptional()
  @IsString()
  creator?: string;
}

export class CustomMetaTagDto {
  @ApiProperty({ description: 'Meta tag name or property' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Meta tag content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Whether to use property attribute instead of name' })
  @IsOptional()
  isProperty?: boolean;
}

export class MetaTagDto {
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @ApiProperty({ description: 'Page URL' })
  url: string;

  @ApiProperty({ description: 'Page type' })
  pageType: string;

  @ApiProperty({ description: 'Title tag' })
  title: string;

  @ApiPropertyOptional({ description: 'Meta description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Meta keywords', type: [String] })
  keywords?: string[];

  @ApiPropertyOptional({ description: 'Canonical URL' })
  canonicalUrl?: string;

  @ApiPropertyOptional({ description: 'Robots meta directive' })
  robots?: string;

  @ApiPropertyOptional({ description: 'Open Graph tags', type: OpenGraphTagsDto })
  openGraph?: OpenGraphTagsDto;

  @ApiPropertyOptional({ description: 'Twitter Card tags', type: TwitterCardTagsDto })
  twitterCard?: TwitterCardTagsDto;

  @ApiPropertyOptional({ description: 'Custom meta tags', type: [CustomMetaTagDto] })
  customTags?: CustomMetaTagDto[];

  @ApiPropertyOptional({ description: 'SEO issues found', type: [String] })
  issues?: string[];

  @ApiPropertyOptional({ description: 'SEO score (0-100)' })
  score?: number;

  @ApiProperty({ description: 'Created date' })
  createdAt: string;

  @ApiProperty({ description: 'Updated date' })
  updatedAt: string;
}

export class CreateMetaTagDto {
  @ApiProperty({ description: 'Page URL', example: '/products/example' })
  @IsString()
  url: string;

  @ApiPropertyOptional({ description: 'Page type', example: 'product' })
  @IsOptional()
  @IsString()
  pageType?: string;

  @ApiProperty({ description: 'Title tag', example: 'Example Product - Buy Online' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Meta description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Meta keywords', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: 'Canonical URL' })
  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @ApiPropertyOptional({ description: 'Robots meta directive', example: 'index, follow' })
  @IsOptional()
  @IsString()
  robots?: string;

  @ApiPropertyOptional({ description: 'Open Graph tags', type: OpenGraphTagsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OpenGraphTagsDto)
  openGraph?: OpenGraphTagsDto;

  @ApiPropertyOptional({ description: 'Twitter Card tags', type: TwitterCardTagsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TwitterCardTagsDto)
  twitterCard?: TwitterCardTagsDto;

  @ApiPropertyOptional({ description: 'Custom meta tags', type: [CustomMetaTagDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomMetaTagDto)
  customTags?: CustomMetaTagDto[];
}

export class UpdateMetaTagDto {
  @ApiPropertyOptional({ description: 'Title tag' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Meta description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Meta keywords', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: 'Canonical URL' })
  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @ApiPropertyOptional({ description: 'Robots meta directive' })
  @IsOptional()
  @IsString()
  robots?: string;

  @ApiPropertyOptional({ description: 'Open Graph tags', type: OpenGraphTagsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OpenGraphTagsDto)
  openGraph?: OpenGraphTagsDto;

  @ApiPropertyOptional({ description: 'Twitter Card tags', type: TwitterCardTagsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TwitterCardTagsDto)
  twitterCard?: TwitterCardTagsDto;

  @ApiPropertyOptional({ description: 'Custom meta tags', type: [CustomMetaTagDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomMetaTagDto)
  customTags?: CustomMetaTagDto[];
}

export class MetaTagQueryDto {
  @ApiPropertyOptional({ description: 'URL pattern to filter' })
  @IsOptional()
  @IsString()
  urlPattern?: string;

  @ApiPropertyOptional({ description: 'Page type to filter' })
  @IsOptional()
  @IsString()
  pageType?: string;

  @ApiPropertyOptional({ description: 'Show only pages with issues' })
  @IsOptional()
  hasIssues?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class BulkUpdateMetaTagsDto {
  @ApiProperty({ description: 'Meta tags to update', type: [CreateMetaTagDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMetaTagDto)
  items: CreateMetaTagDto[];
}

export class MetaTagTemplateDto {
  @ApiProperty({ description: 'Template ID' })
  id: string;

  @ApiProperty({ description: 'Template name' })
  name: string;

  @ApiProperty({ description: 'Title template with variables' })
  titleTemplate: string;

  @ApiProperty({ description: 'Description template with variables' })
  descriptionTemplate: string;

  @ApiProperty({ description: 'Available variables', type: [String] })
  variables: string[];

  @ApiPropertyOptional({ description: 'Open Graph template' })
  openGraph?: {
    type?: string;
    titleTemplate?: string;
    descriptionTemplate?: string;
  };

  @ApiPropertyOptional({ description: 'Twitter Card template' })
  twitterCard?: {
    card?: string;
    titleTemplate?: string;
    descriptionTemplate?: string;
  };
}

export class ApplyTemplateDto {
  @ApiProperty({ description: 'Template ID', example: 'product' })
  @IsString()
  templateId: string;

  @ApiProperty({ description: 'Page URL' })
  @IsString()
  url: string;

  @ApiProperty({ description: 'Variable values', example: { productName: 'Example Product' } })
  @IsObject()
  variables: Record<string, string>;
}

export class MetaTagAnalysisDto {
  @ApiProperty({ description: 'SEO score (0-100)' })
  score: number;

  @ApiPropertyOptional({ description: 'Critical issues', type: [String] })
  issues?: string[];

  @ApiPropertyOptional({ description: 'Warnings', type: [String] })
  warnings?: string[];

  @ApiPropertyOptional({ description: 'Suggestions', type: [String] })
  suggestions?: string[];

  @ApiPropertyOptional({ description: 'Title length' })
  titleLength?: number;

  @ApiPropertyOptional({ description: 'Description length' })
  descriptionLength?: number;
}

export class MetaTagSuggestionDto {
  @ApiProperty({ description: 'Suggested title' })
  suggestedTitle: string;

  @ApiProperty({ description: 'Suggested description' })
  suggestedDescription: string;

  @ApiProperty({ description: 'Extracted keywords', type: [String] })
  extractedKeywords: string[];

  @ApiProperty({ description: 'Keyword density by keyword' })
  keywordDensity: Record<string, number>;

  @ApiProperty({ description: 'Content word count' })
  contentWordCount: number;

  @ApiProperty({ description: 'Readability score (0-100)' })
  readabilityScore: number;
}

export class AnalyzeContentDto {
  @ApiProperty({ description: 'Content to analyze' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Target keywords', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetKeywords?: string[];
}
