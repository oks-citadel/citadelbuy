import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductVariantDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Variant SKU', example: 'SHIRT-RED-L' })
  @IsString()
  sku: string;

  @ApiProperty({ description: 'Variant name', example: 'Red - Large' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Variant price (overrides product price if set)',
    example: 29.99,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ description: 'Stock quantity', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional({
    description: 'Variant attributes as JSON',
    example: { color: 'Red', size: 'Large' },
  })
  @IsOptional()
  attributes?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Variant-specific images',
    type: [String],
    example: ['https://example.com/red-shirt.jpg'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ description: 'Is this the default variant', default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Compare at price for discount display',
    example: 39.99,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  compareAtPrice?: number;

  @ApiPropertyOptional({ description: 'Cost per item', example: 15.00 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  costPerItem?: number;

  @ApiPropertyOptional({ description: 'Weight in kg', example: 0.5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({ description: 'Barcode', example: '1234567890123' })
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiPropertyOptional({ description: 'Is this variant taxable', default: true })
  @IsBoolean()
  @IsOptional()
  taxable?: boolean;

  @ApiPropertyOptional({
    description: 'Track quantity for this variant',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  trackQuantity?: boolean;

  @ApiPropertyOptional({
    description: 'Continue selling when out of stock',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  continueSellingWhenOutOfStock?: boolean;

  @ApiPropertyOptional({
    description: 'Requires shipping',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  requiresShipping?: boolean;

  @ApiPropertyOptional({ description: 'Display order position', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  position?: number;

  @ApiPropertyOptional({ description: 'Is this variant available', default: true })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Array of option value IDs for this variant',
    type: [String],
    example: ['option-value-id-1', 'option-value-id-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  optionValueIds?: string[];
}

export class UpdateProductVariantDto extends PartialType(CreateProductVariantDto) {
  @ApiPropertyOptional({ description: 'Product ID' })
  @IsUUID()
  @IsOptional()
  productId?: string;
}

export class BulkCreateVariantsDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Array of variant combinations to create',
    type: [CreateProductVariantDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants: CreateProductVariantDto[];
}

export class VariantInventoryUpdateDto {
  @ApiProperty({ description: 'Variant ID' })
  @IsUUID()
  variantId: string;

  @ApiProperty({ description: 'Stock quantity' })
  @IsNumber()
  @Min(0)
  stock: number;
}

export class BulkInventoryUpdateDto {
  @ApiProperty({
    description: 'Array of variant inventory updates',
    type: [VariantInventoryUpdateDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantInventoryUpdateDto)
  updates: VariantInventoryUpdateDto[];
}
