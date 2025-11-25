import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToWishlistCollectionDto {
  @ApiProperty({ description: 'Product ID', example: 'product-123' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ description: 'Variant ID (if specific variant)' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({ description: 'Personal notes about the item' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Priority level (0=none, 1=low, 2=medium, 3=high)', example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(3)
  priority?: number;

  @ApiPropertyOptional({ description: 'Desired quantity', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Notify on price drop', example: false })
  @IsOptional()
  @IsBoolean()
  notifyOnPriceDrop?: boolean;

  @ApiPropertyOptional({ description: 'Target price for notification', example: 99.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetPrice?: number;

  @ApiPropertyOptional({ description: 'Notify when back in stock', example: false })
  @IsOptional()
  @IsBoolean()
  notifyWhenInStock?: boolean;
}
