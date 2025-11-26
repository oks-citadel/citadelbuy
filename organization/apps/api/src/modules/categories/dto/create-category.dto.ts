import {
  IsString,
  IsOptional,
  MinLength,
  Matches,
  IsUUID,
  IsInt,
  IsBoolean,
  IsEnum,
  Min,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CategoryStatus } from '@prisma/client';

export class CategoryTranslationDto {
  @ApiProperty({ description: 'Language code', example: 'es' })
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  languageCode: string;

  @ApiProperty({ description: 'Translated name', example: 'Electrónica' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ description: 'Translated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Translated meta title' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'Translated meta description' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescription?: string;
}

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Electronics',
    minLength: 2,
  })
  @IsString()
  @MinLength(2, { message: 'Category name must be at least 2 characters long' })
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug for the category (auto-generated if not provided)',
    example: 'electronics',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase, alphanumeric with hyphens only',
  })
  @MaxLength(255)
  slug?: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'All electronic devices and gadgets',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Parent category ID for hierarchical structure',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Sort order for display',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'URL to category icon (SVG/PNG)',
    example: 'https://storage.example.com/icons/electronics.svg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  iconUrl?: string;

  @ApiPropertyOptional({
    description: 'URL to category banner image',
    example: 'https://storage.example.com/banners/electronics.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bannerImageUrl?: string;

  @ApiPropertyOptional({
    description: 'URL to category thumbnail',
    example: 'https://storage.example.com/thumbnails/electronics.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'Category status',
    enum: CategoryStatus,
    default: 'DRAFT',
  })
  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;

  @ApiPropertyOptional({
    description: 'Whether this category is featured',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'SEO meta title (max 60 characters)',
    example: 'Buy Electronics Online | Best Deals',
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  metaTitle?: string;

  @ApiPropertyOptional({
    description: 'SEO meta description (max 160 characters)',
    example: 'Shop the best electronics at unbeatable prices. Free shipping on orders over $50.',
    maxLength: 160,
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescription?: string;

  @ApiPropertyOptional({
    description: 'SEO meta keywords (comma-separated)',
    example: 'electronics, gadgets, smartphones, laptops',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  metaKeywords?: string;

  @ApiPropertyOptional({
    description: 'Rich SEO content for the category page',
  })
  @IsOptional()
  @IsString()
  seoContent?: string;

  @ApiPropertyOptional({
    description: 'Category translations for multi-language support',
    type: [CategoryTranslationDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryTranslationDto)
  translations?: CategoryTranslationDto[];
}
