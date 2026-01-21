import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEmail,
  ValidateNested,
  Min,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GuestShippingAddressDto, GuestBillingAddressDto } from './checkout-address.dto';

/**
 * DTO for initializing a checkout session
 */
export class InitializeCheckoutDto {
  @ApiPropertyOptional({
    example: 'cart-uuid-1234',
    description: 'Cart ID to checkout (either cartId or productId is required)',
  })
  @IsOptional()
  @IsString()
  cartId?: string;

  @ApiPropertyOptional({
    example: 'product-uuid-5678',
    description: 'Product ID for quick checkout (either cartId or productId is required)',
  })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Quantity for quick checkout (used with productId)',
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({
    example: 'address-uuid-1234',
    description: 'Selected shipping address ID',
  })
  @IsOptional()
  @IsString()
  shippingAddressId?: string;

  @ApiPropertyOptional({
    example: 'SAVE20',
    description: 'Coupon code to apply',
  })
  @IsOptional()
  @IsString()
  couponCode?: string;
}

/**
 * DTO for express checkout (one-click purchase)
 */
export class ExpressCheckoutDto {
  @ApiPropertyOptional({
    example: 'cart-uuid-1234',
    description: 'Cart ID to checkout',
  })
  @IsOptional()
  @IsString()
  cartId?: string;

  @ApiPropertyOptional({
    example: 'product-uuid-5678',
    description: 'Product ID for quick purchase',
  })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'Quantity for quick purchase',
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({
    example: 'address-uuid-1234',
    description: 'Shipping address ID (uses default if not provided)',
  })
  @IsOptional()
  @IsString()
  shippingAddressId?: string;

  @ApiPropertyOptional({
    example: 'pm_1234567890',
    description: 'Payment method ID (uses default if not provided)',
  })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({
    example: 'SAVE20',
    description: 'Coupon code to apply',
  })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Apply gift card balance to this order',
  })
  @IsOptional()
  @IsBoolean()
  useGiftCard?: boolean;

  @ApiPropertyOptional({
    example: 'GIFTCARD-ABC123',
    description: 'Gift card code to redeem',
  })
  @IsOptional()
  @IsString()
  giftCardCode?: string;
}

/**
 * DTO for guest checkout item
 */
export class GuestCheckoutItemDto {
  @ApiProperty({
    example: 'product-uuid-1234',
    description: 'Product ID',
  })
  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @ApiProperty({
    example: 2,
    description: 'Quantity to purchase',
    minimum: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    example: 49.99,
    description: 'Price per unit',
    minimum: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;
}

/**
 * DTO for guest checkout (checkout without an account)
 */
export class GuestCheckoutDto {
  @ApiProperty({
    type: [GuestCheckoutItemDto],
    description: 'Items to purchase',
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestCheckoutItemDto)
  items: GuestCheckoutItemDto[];

  @ApiProperty({
    type: GuestShippingAddressDto,
    description: 'Shipping address for the order',
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => GuestShippingAddressDto)
  shippingAddress: GuestShippingAddressDto;

  @ApiPropertyOptional({
    type: GuestBillingAddressDto,
    description: 'Billing address (if different from shipping)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GuestBillingAddressDto)
  billingAddress?: GuestBillingAddressDto;

  @ApiPropertyOptional({
    example: 'SAVE20',
    description: 'Coupon code to apply',
  })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiProperty({
    example: 'guest@example.com',
    description: 'Guest email for order notifications',
  })
  @IsNotEmpty()
  @IsEmail()
  guestEmail: string;
}
