import { IsOptional, IsString, IsNumber, IsArray, IsEnum, Min, Max, IsBoolean, IsObject } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchProductsDto {
  @ApiPropertyOptional({ description: 'Search query', example: 'wireless headphones' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Category IDs filter (comma-separated or array)',
    example: ['cat-123', 'cat-456'],
    type: [String]
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(v => v.trim());
    }
    return value;
  })
  @IsArray()
  categoryIds?: string[];

  @ApiPropertyOptional({
    description: 'Vendor IDs filter (comma-separated or array)',
    example: ['vendor-123', 'vendor-456'],
    type: [String]
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(v => v.trim());
    }
    return value;
  })
  @IsArray()
  vendorIds?: string[];

  @ApiPropertyOptional({ description: 'Minimum price', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @ApiPropertyOptional({ description: 'Maximum price', example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @ApiPropertyOptional({ description: 'Minimum rating', example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ description: 'In stock only', example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true' || value === '1';
    }
    return value;
  })
  @IsBoolean()
  inStock?: boolean;

  @ApiPropertyOptional({
    description: 'Tags filter (comma-separated or array)',
    example: ['premium', 'bestseller'],
    type: [String]
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(v => v.trim());
    }
    return value;
  })
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Product attributes filter (e.g., {"color": ["red", "blue"], "size": ["L", "XL"]})',
    example: { color: ['red', 'blue'], size: ['L', 'XL'] }
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    }
    return value;
  })
  @IsObject()
  attributes?: Record<string, string[]>;

  @ApiPropertyOptional({ description: 'Filter products with discounts only', example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true' || value === '1';
    }
    return value;
  })
  @IsBoolean()
  hasDiscount?: boolean;

  @ApiPropertyOptional({ description: 'Filter new products (last 30 days)', example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true' || value === '1';
    }
    return value;
  })
  @IsBoolean()
  isNew?: boolean;

  @ApiPropertyOptional({
    description: 'Facets to include in response (comma-separated or array)',
    example: ['categories', 'vendors', 'price', 'ratings', 'tags'],
    type: [String]
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(v => v.trim());
    }
    return value;
  })
  @IsArray()
  facets?: string[];

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['price', 'rating', 'sales', 'newest', 'relevance', 'name'],
    example: 'relevance'
  })
  @IsOptional()
  @IsEnum(['price', 'rating', 'sales', 'newest', 'relevance', 'name'])
  sortBy?: 'price' | 'rating' | 'sales' | 'newest' | 'relevance' | 'name';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], example: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
