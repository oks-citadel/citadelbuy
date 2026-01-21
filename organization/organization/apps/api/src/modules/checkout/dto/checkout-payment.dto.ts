import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
} from 'class-validator';

/**
 * DTO for attaching a payment method to user account
 */
export class AttachPaymentMethodDto {
  @ApiProperty({
    example: 'pm_1234567890',
    description: 'Stripe payment method ID',
  })
  @IsNotEmpty()
  @IsString()
  paymentMethodId: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Set this payment method as the default',
  })
  @IsOptional()
  @IsBoolean()
  setAsDefault?: boolean;
}

/**
 * DTO for setting default payment method
 */
export class SetDefaultPaymentMethodDto {
  @ApiProperty({
    example: 'pm_1234567890',
    description: 'Stripe payment method ID to set as default',
  })
  @IsNotEmpty()
  @IsString()
  paymentMethodId: string;
}

/**
 * Response DTO for saved payment method
 */
export class SavedPaymentMethodResponseDto {
  @ApiProperty({ example: 'pm_1234567890', description: 'Payment method ID' })
  id: string;

  @ApiProperty({ example: 'pm_1234567890', description: 'Stripe payment method ID' })
  stripePaymentMethodId: string;

  @ApiProperty({ example: 'card', description: 'Payment method type' })
  type: string;

  @ApiProperty({ example: '4242', description: 'Last 4 digits of card' })
  last4: string;

  @ApiPropertyOptional({ example: 'visa', description: 'Card brand' })
  brand?: string;

  @ApiPropertyOptional({ example: 12, description: 'Expiration month' })
  expMonth?: number;

  @ApiPropertyOptional({ example: 2025, description: 'Expiration year' })
  expYear?: number;

  @ApiProperty({ example: true, description: 'Is this the default payment method' })
  isDefault: boolean;
}

/**
 * Response DTO for setup intent
 */
export class SetupPaymentMethodResponseDto {
  @ApiProperty({
    example: 'seti_1234567890_secret_xxx',
    description: 'Stripe client secret for setting up payment method',
  })
  clientSecret: string;
}
