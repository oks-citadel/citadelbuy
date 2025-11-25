import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ description: 'Product ID', example: 'product-123' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ description: 'Variant ID (if product has variants)', example: 'variant-456' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ description: 'Quantity to add', example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Session ID for guest carts' })
  @IsOptional()
  @IsString()
  sessionId?: string;
}
