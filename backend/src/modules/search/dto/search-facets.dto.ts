import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FacetValueDto {
  @ApiProperty({ description: 'Facet value', example: 'Electronics' })
  value: string;

  @ApiProperty({ description: 'Display label', example: 'Electronics' })
  label: string;

  @ApiProperty({ description: 'Number of products', example: 42 })
  count: number;

  @ApiPropertyOptional({ description: 'Whether this facet is selected', example: false })
  selected?: boolean;
}

export class PriceRangeDto {
  @ApiProperty({ description: 'Minimum price', example: 0 })
  min: number;

  @ApiProperty({ description: 'Maximum price', example: 100 })
  max: number;

  @ApiProperty({ description: 'Display label', example: '$0 - $100' })
  label: string;

  @ApiProperty({ description: 'Number of products in this range', example: 15 })
  count: number;

  @ApiPropertyOptional({ description: 'Whether this range is selected', example: false })
  selected?: boolean;
}

export class StockFacetDto {
  @ApiProperty({ description: 'Total products', example: 100 })
  count: number;

  @ApiProperty({ description: 'Products in stock', example: 85 })
  available: number;

  @ApiProperty({ description: 'Products out of stock', example: 15 })
  unavailable: number;
}

export class DiscountFacetDto {
  @ApiProperty({ description: 'Total products', example: 100 })
  count: number;

  @ApiProperty({ description: 'Products with discount', example: 35 })
  withDiscount: number;

  @ApiProperty({ description: 'Products without discount', example: 65 })
  withoutDiscount: number;
}

export class SearchFacetsDto {
  @ApiPropertyOptional({
    description: 'Category facets',
    type: [FacetValueDto]
  })
  categories?: FacetValueDto[];

  @ApiPropertyOptional({
    description: 'Vendor facets',
    type: [FacetValueDto]
  })
  vendors?: FacetValueDto[];

  @ApiPropertyOptional({
    description: 'Price range facets',
    type: [PriceRangeDto]
  })
  priceRanges?: PriceRangeDto[];

  @ApiPropertyOptional({
    description: 'Rating facets',
    type: [FacetValueDto]
  })
  ratings?: FacetValueDto[];

  @ApiPropertyOptional({
    description: 'Tag facets',
    type: [FacetValueDto]
  })
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
  attributes?: Record<string, FacetValueDto[]>;

  @ApiPropertyOptional({
    description: 'Stock availability facet',
    type: StockFacetDto
  })
  inStock?: StockFacetDto;

  @ApiPropertyOptional({
    description: 'Discount availability facet',
    type: DiscountFacetDto
  })
  hasDiscount?: DiscountFacetDto;
}
