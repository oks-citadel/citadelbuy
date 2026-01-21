import { IsString, IsNumber, IsArray, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateCouponDto {
  @ApiProperty({ description: 'Coupon code to validate', example: 'SUMMER2024' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'User ID', example: 'user-123' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Cart subtotal', example: 150.50 })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiPropertyOptional({ description: 'Product IDs in cart', example: ['prod-1', 'prod-2'] })
  @IsOptional()
  @IsArray()
  productIds?: string[];

  @ApiPropertyOptional({ description: 'Category IDs in cart', example: ['cat-1', 'cat-2'] })
  @IsOptional()
  @IsArray()
  categoryIds?: string[];
}

export class ApplyCouponDto extends ValidateCouponDto {
  @ApiPropertyOptional({ description: 'Order ID if applying to existing order' })
  @IsOptional()
  @IsString()
  orderId?: string;
}

export class CouponValidationResult {
  @ApiProperty({ description: 'Is coupon valid', example: true })
  valid: boolean;

  @ApiPropertyOptional({ description: 'Error message if invalid', example: 'Coupon has expired' })
  message?: string;

  @ApiPropertyOptional({ description: 'Discount amount', example: 30.10 })
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Discount percentage', example: 20 })
  discountPercentage?: number;

  @ApiPropertyOptional({ description: 'Coupon details' })
  coupon?: any;

  @ApiPropertyOptional({ description: 'New subtotal after discount', example: 120.40 })
  newSubtotal?: number;
}
