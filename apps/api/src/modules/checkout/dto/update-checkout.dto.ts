import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';

/**
 * DTO for updating checkout session details
 */
export class UpdateCheckoutDto {
  @ApiPropertyOptional({
    example: 'address-uuid-1234',
    description: 'Update selected shipping address ID',
  })
  @IsOptional()
  @IsString()
  shippingAddressId?: string;

  @ApiPropertyOptional({
    example: 'pm_1234567890',
    description: 'Update selected payment method ID',
  })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({
    example: 'SAVE20',
    description: 'Apply or update coupon code',
  })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({
    example: 'standard',
    description: 'Selected shipping method/rate',
  })
  @IsOptional()
  @IsString()
  shippingMethod?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Use same address for billing',
  })
  @IsOptional()
  @IsBoolean()
  sameAsBilling?: boolean;

  @ApiPropertyOptional({
    example: 'billing-address-uuid-5678',
    description: 'Update selected billing address ID',
  })
  @IsOptional()
  @IsString()
  billingAddressId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Apply gift card balance to this order',
  })
  @IsOptional()
  @IsBoolean()
  useGiftCard?: boolean;

  @ApiPropertyOptional({
    example: 'GIFTCARD-ABC123',
    description: 'Gift card code to apply',
  })
  @IsOptional()
  @IsString()
  giftCardCode?: string;

  @ApiPropertyOptional({
    example: 50.00,
    description: 'Amount of gift card balance to use',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  giftCardAmount?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Apply store credit to this order',
  })
  @IsOptional()
  @IsBoolean()
  useStoreCredit?: boolean;

  @ApiPropertyOptional({
    example: 25.00,
    description: 'Amount of store credit to use',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  storeCreditAmount?: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'Number of loyalty points to redeem',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  loyaltyPointsToRedeem?: number;

  @ApiPropertyOptional({
    example: 'Leave at front door',
    description: 'Special delivery instructions',
  })
  @IsOptional()
  @IsString()
  deliveryInstructions?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Gift wrap the order',
  })
  @IsOptional()
  @IsBoolean()
  giftWrap?: boolean;

  @ApiPropertyOptional({
    example: 'Happy Birthday!',
    description: 'Gift message to include',
  })
  @IsOptional()
  @IsString()
  giftMessage?: string;
}

/**
 * DTO for updating checkout item quantity
 */
export class UpdateCheckoutItemDto {
  @ApiPropertyOptional({
    example: 3,
    description: 'New quantity for the item',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;
}

/**
 * DTO for applying a coupon to checkout
 */
export class ApplyCouponDto {
  @ApiPropertyOptional({
    example: 'SAVE20',
    description: 'Coupon code to apply',
  })
  @IsOptional()
  @IsString()
  code?: string;
}

/**
 * DTO for updating shipping method
 */
export class UpdateShippingMethodDto {
  @ApiPropertyOptional({
    example: 'express',
    description: 'Shipping method identifier',
  })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({
    example: 'rate_1234567890',
    description: 'Specific shipping rate ID',
  })
  @IsOptional()
  @IsString()
  rateId?: string;
}
