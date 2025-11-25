import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddVariantOptionToProductDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Variant option ID' })
  @IsUUID()
  optionId: string;

  @ApiPropertyOptional({ description: 'Display order position', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  position?: number;
}

export class RemoveVariantOptionFromProductDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Variant option ID' })
  @IsUUID()
  optionId: string;
}

export class BulkAddVariantOptionsDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Array of option IDs to add',
    type: [String],
    example: ['option-id-1', 'option-id-2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  optionIds: string[];
}

export class ProductVariantCombinationDto {
  @ApiProperty({ description: 'Option value ID' })
  @IsUUID()
  valueId: string;

  @ApiProperty({ description: 'Option name', example: 'Color' })
  optionName?: string;

  @ApiProperty({ description: 'Value', example: 'Red' })
  value?: string;
}

export class GenerateVariantCombinationsDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({
    description: 'Base price for generated variants (uses product price if not provided)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  basePrice?: number;

  @ApiPropertyOptional({
    description: 'Base stock for generated variants',
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  baseStock?: number;

  @ApiPropertyOptional({
    description: 'Auto-generate SKUs based on product SKU and variant options',
    default: true,
  })
  @IsOptional()
  autoGenerateSku?: boolean;
}
