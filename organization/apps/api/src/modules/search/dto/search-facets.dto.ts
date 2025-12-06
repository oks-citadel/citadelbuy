import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for facet value (category, vendor, tag, etc.)
 * Includes validation decorators to ensure data integrity
 */
export class FacetValueDto {
  @ApiProperty({ description: 'Facet value', example: 'Electronics' })
  @IsString()
  value: string;

  @ApiProperty({ description: 'Display label', example: 'Electronics' })
  @IsString()
  label: string;

  @ApiProperty({ description: 'Number of products', example: 42 })
  @IsNumber()
  @Min(0)
  count: number;

  @ApiPropertyOptional({ description: 'Whether this facet is selected', example: false })
  @IsOptional()
  @IsBoolean()
  selected?: boolean;
}

/**
 * DTO for price range facets
 * Includes validation decorators to ensure data integrity
 */
export class PriceRangeDto {
  @ApiProperty({ description: 'Minimum price', example: 0 })
  @IsNumber()
  @Min(0)
  min: number;

  @ApiProperty({ description: 'Maximum price', example: 100 })
  @IsNumber()
  @Min(0)
  max: number;

  @ApiProperty({ description: 'Display label', example: '$0 - $100' })
  @IsString()
  label: string;

  @ApiProperty({ description: 'Number of products in this range', example: 15 })
  @IsNumber()
  @Min(0)
  count: number;

  @ApiPropertyOptional({ description: 'Whether this range is selected', example: false })
  @IsOptional()
  @IsBoolean()
  selected?: boolean;
}

/**
 * DTO for stock availability facets
 * Includes validation decorators to ensure data integrity
 */
export class StockFacetDto {
  @ApiProperty({ description: 'Total products', example: 100 })
  @IsNumber()
  @Min(0)
  count: number;

  @ApiProperty({ description: 'Products in stock', example: 85 })
  @IsNumber()
  @Min(0)
  available: number;

  @ApiProperty({ description: 'Products out of stock', example: 15 })
  @IsNumber()
  @Min(0)
  unavailable: number;
}

/**
 * DTO for discount availability facets
 * Includes validation decorators to ensure data integrity
 */
export class DiscountFacetDto {
  @ApiProperty({ description: 'Total products', example: 100 })
  @IsNumber()
  @Min(0)
  count: number;

  @ApiProperty({ description: 'Products with discount', example: 35 })
  @IsNumber()
  @Min(0)
  withDiscount: number;

  @ApiProperty({ description: 'Products without discount', example: 65 })
  @IsNumber()
  @Min(0)
  withoutDiscount: number;
}

/**
 * DTO for search facets (response DTO)
 * Includes validation decorators to ensure data integrity
 */
export class SearchFacetsDto {
  @ApiPropertyOptional({
    description: 'Category facets',
    type: [FacetValueDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacetValueDto)
  categories?: FacetValueDto[];

  @ApiPropertyOptional({
    description: 'Vendor facets',
    type: [FacetValueDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacetValueDto)
  vendors?: FacetValueDto[];

  @ApiPropertyOptional({
    description: 'Price range facets',
    type: [PriceRangeDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceRangeDto)
  priceRanges?: PriceRangeDto[];

  @ApiPropertyOptional({
    description: 'Rating facets',
    type: [FacetValueDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacetValueDto)
  ratings?: FacetValueDto[];

  @ApiPropertyOptional({
    description: 'Tag facets',
    type: [FacetValueDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacetValueDto)
  tags?: FacetValueDto[];

  @ApiPropertyOptional({
    description: 'Dynamic attribute facets',
    example: {
      color: [
        { value: 'red', label: 'Red', count: 10, selected: false },
        { value: 'blue', label: 'Blue', count: 15, selected: false }
      ],
      size: [
        { value: 'L', label: 'Large', count: 20, selected: false },
        { value: 'XL', label: 'Extra Large', count: 12, selected: false }
      ]
    }
  })
  @IsOptional()
  attributes?: Record<string, FacetValueDto[]>;

  @ApiPropertyOptional({
    description: 'Stock availability facet',
    type: StockFacetDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StockFacetDto)
  inStock?: StockFacetDto;

  @ApiPropertyOptional({
    description: 'Discount availability facet',
    type: DiscountFacetDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DiscountFacetDto)
  hasDiscount?: DiscountFacetDto;
}
