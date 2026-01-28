import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for bulk product updates in admin panel.
 * Allows admins to update multiple products at once.
 */
export class BulkUpdateProductsDto {
  @ApiProperty({
    type: [String],
    example: ['product-uuid-1', 'product-uuid-2'],
    description: 'Array of product IDs to update',
  })
  @IsNotEmpty()
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];

  @ApiPropertyOptional({
    example: true,
    description: 'Set active status for all selected products',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Set featured status for all selected products',
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    example: 'category-uuid-123',
    description: 'Move all selected products to this category',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Percentage to adjust prices (positive for increase, negative for decrease)',
  })
  @IsOptional()
  @IsNumber()
  priceAdjustmentPercent?: number;
}

/**
 * DTO for individual product update in bulk operation.
 */
export class BulkProductItemDto {
  @ApiProperty({
    example: 'product-uuid-1',
    description: 'Product ID',
  })
  @IsNotEmpty()
  @IsUUID('4')
  id: string;

  @ApiPropertyOptional({
    example: 49.99,
    description: 'New price for the product',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'New stock quantity',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Active status',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for updating multiple products with different values.
 */
export class BulkUpdateProductsIndividualDto {
  @ApiProperty({
    type: [BulkProductItemDto],
    description: 'Array of products with individual update values',
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkProductItemDto)
  products: BulkProductItemDto[];
}
