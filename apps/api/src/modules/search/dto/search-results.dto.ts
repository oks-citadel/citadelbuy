import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SearchFacetsDto } from './search-facets.dto';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsDate,
  ValidateNested,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO representing a product document in search results
 * Includes validation decorators to ensure data integrity
 */
export class ProductDocumentDto {
  @ApiProperty({ description: 'Product ID', example: 'prod-123' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Product name', example: 'Wireless Headphones' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Product description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Product price', example: 99.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Compare at price (original price)', example: 129.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional({ description: 'SKU', example: 'WH-001' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ description: 'Barcode', example: '1234567890' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ description: 'Product images', type: [String] })
  @IsArray()
  @IsString({ each: true })
  images: string[];

  @ApiProperty({ description: 'Category ID', example: 'cat-123' })
  @IsString()
  categoryId: string;

  @ApiProperty({ description: 'Category name', example: 'Electronics' })
  @IsString()
  categoryName: string;

  @ApiProperty({ description: 'Category slug', example: 'electronics' })
  @IsString()
  categorySlug: string;

  @ApiProperty({ description: 'Vendor ID', example: 'vendor-123' })
  @IsString()
  vendorId: string;

  @ApiProperty({ description: 'Vendor name', example: 'TechStore Inc.' })
  @IsString()
  vendorName: string;

  @ApiProperty({ description: 'Stock quantity', example: 50 })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({ description: 'In stock status', example: true })
  @IsBoolean()
  inStock: boolean;

  @ApiPropertyOptional({ description: 'Product tags', type: [String], example: ['premium', 'bestseller'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Product attributes', example: { color: 'black', size: 'M' } })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Average rating', example: 4.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  avgRating?: number;

  @ApiPropertyOptional({ description: 'Review count', example: 120 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reviewCount?: number;

  @ApiPropertyOptional({ description: 'Sales count', example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salesCount?: number;

  @ApiProperty({ description: 'Created date' })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Updated date' })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Has product variants', example: true })
  @IsOptional()
  @IsBoolean()
  hasVariants?: boolean;

  @ApiPropertyOptional({ description: 'Number of variants', example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  variantCount?: number;

  @ApiPropertyOptional({ description: 'Variant option names', type: [String], example: ['Size', 'Color'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variantOptions?: string[];

  @ApiPropertyOptional({ description: 'Minimum variant price', example: 89.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minVariantPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum variant price', example: 109.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxVariantPrice?: number;
}

/**
 * DTO for search results (response DTO)
 * Includes validation decorators to ensure data integrity
 */
export class SearchResultsDto {
  @ApiProperty({
    description: 'List of products matching search criteria',
    type: [ProductDocumentDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductDocumentDto)
  products: ProductDocumentDto[];

  @ApiProperty({ description: 'Total number of products found', example: 156 })
  @IsNumber()
  @Min(0)
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  @IsNumber()
  @Min(1)
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 20 })
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 8 })
  @IsNumber()
  @Min(0)
  totalPages: number;

  @ApiPropertyOptional({
    description: 'Search facets for filtering',
    type: SearchFacetsDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SearchFacetsDto)
  facets?: SearchFacetsDto;

  @ApiPropertyOptional({ description: 'Search execution time in milliseconds', example: 45 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  took?: number;

  @ApiPropertyOptional({ description: 'Search provider used', example: 'Elasticsearch' })
  @IsOptional()
  @IsString()
  provider?: string;
}
