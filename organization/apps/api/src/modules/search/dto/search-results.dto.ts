import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SearchFacetsDto } from './search-facets.dto';

export class ProductDocumentDto {
  @ApiProperty({ description: 'Product ID', example: 'prod-123' })
  id: string;

  @ApiProperty({ description: 'Product name', example: 'Wireless Headphones' })
  name: string;

  @ApiProperty({ description: 'Product description' })
  description: string;

  @ApiProperty({ description: 'Product price', example: 99.99 })
  price: number;

  @ApiPropertyOptional({ description: 'Compare at price (original price)', example: 129.99 })
  compareAtPrice?: number;

  @ApiPropertyOptional({ description: 'SKU', example: 'WH-001' })
  sku?: string;

  @ApiPropertyOptional({ description: 'Barcode', example: '1234567890' })
  barcode?: string;

  @ApiProperty({ description: 'Product images', type: [String] })
  images: string[];

  @ApiProperty({ description: 'Category ID', example: 'cat-123' })
  categoryId: string;

  @ApiProperty({ description: 'Category name', example: 'Electronics' })
  categoryName: string;

  @ApiProperty({ description: 'Category slug', example: 'electronics' })
  categorySlug: string;

  @ApiProperty({ description: 'Vendor ID', example: 'vendor-123' })
  vendorId: string;

  @ApiProperty({ description: 'Vendor name', example: 'TechStore Inc.' })
  vendorName: string;

  @ApiProperty({ description: 'Stock quantity', example: 50 })
  stock: number;

  @ApiProperty({ description: 'In stock status', example: true })
  inStock: boolean;

  @ApiPropertyOptional({ description: 'Product tags', type: [String], example: ['premium', 'bestseller'] })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Product attributes', example: { color: 'black', size: 'M' } })
  attributes?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Average rating', example: 4.5 })
  avgRating?: number;

  @ApiPropertyOptional({ description: 'Review count', example: 120 })
  reviewCount?: number;

  @ApiPropertyOptional({ description: 'Sales count', example: 500 })
  salesCount?: number;

  @ApiProperty({ description: 'Created date' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Has product variants', example: true })
  hasVariants?: boolean;

  @ApiPropertyOptional({ description: 'Number of variants', example: 3 })
  variantCount?: number;

  @ApiPropertyOptional({ description: 'Variant option names', type: [String], example: ['Size', 'Color'] })
  variantOptions?: string[];

  @ApiPropertyOptional({ description: 'Minimum variant price', example: 89.99 })
  minVariantPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum variant price', example: 109.99 })
  maxVariantPrice?: number;
}

export class SearchResultsDto {
  @ApiProperty({
    description: 'List of products matching search criteria',
    type: [ProductDocumentDto]
  })
  products: ProductDocumentDto[];

  @ApiProperty({ description: 'Total number of products found', example: 156 })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 8 })
  totalPages: number;

  @ApiPropertyOptional({
    description: 'Search facets for filtering',
    type: SearchFacetsDto
  })
  facets?: SearchFacetsDto;

  @ApiPropertyOptional({ description: 'Search execution time in milliseconds', example: 45 })
  took?: number;

  @ApiPropertyOptional({ description: 'Search provider used', example: 'Elasticsearch' })
  provider?: string;
}
