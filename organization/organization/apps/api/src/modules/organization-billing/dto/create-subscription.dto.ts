import {
  IsString,
  IsEnum,
  IsNotEmpty,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export class CreateSubscriptionDto {
  @ApiProperty({
    example: 'price_1234567890',
    description: 'Stripe price ID for the subscription plan',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  planId: string;

  @ApiProperty({
    example: 'pm_1234567890',
    description: 'Stripe payment method ID (tokenized card)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  paymentMethodId: string;

  @ApiProperty({
    enum: BillingCycle,
    example: BillingCycle.MONTHLY,
    description: 'Billing cycle for the subscription',
  })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;
}
