import { IsString, IsNumber, IsArray, IsOptional, Min, MinLength, IsBoolean, IsDecimal } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'Wireless Bluetooth Headphones',
    minLength: 2,
    maxLength: 200,
  })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: 'Detailed product description with features and specifications',
    example: 'Premium wireless headphones with active noise cancellation, 30-hour battery life, and superior sound quality. Perfect for music lovers and professionals.',
    minLength: 10,
    maxLength: 5000,
  })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiProperty({
    description: 'Product price in USD',
    example: 149.99,
    minimum: 0,
    type: 'number',
    format: 'decimal',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({
    description: 'Array of product image URLs',
    type: [String],
    example: [
      'https://cdn.citadelbuy.com/products/headphones-main.jpg',
      'https://cdn.citadelbuy.com/products/headphones-side.jpg',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({
    description: 'Available stock quantity',
    example: 150,
    minimum: 0,
    type: 'integer',
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock: number;

  @ApiProperty({
    description: 'Category UUID',
    example: '123e4567-e89b-12d3-a456-426614174001',
    format: 'uuid',
  })
  @IsString()
  categoryId: string;

  @ApiProperty({
    description: 'Vendor/Seller UUID',
    example: '123e4567-e89b-12d3-a456-426614174002',
    format: 'uuid',
  })
  @IsString()
  vendorId: string;

  @ApiPropertyOptional({
    description: 'Product SKU (Stock Keeping Unit)',
    example: 'WBH-2024-BLK',
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    description: 'Product weight in kilograms',
    example: 0.25,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({
    description: 'Product dimensions (length x width x height) in cm',
    example: '20 x 15 x 8',
  })
  @IsOptional()
  @IsString()
  dimensions?: string;

  @ApiPropertyOptional({
    description: 'Product brand name',
    example: 'AudioTech Pro',
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({
    description: 'Is product currently active and visible',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
