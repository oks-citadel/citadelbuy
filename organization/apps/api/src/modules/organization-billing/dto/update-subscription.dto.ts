import {
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BillingCycle } from './create-subscription.dto';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({
    example: 'price_1234567890',
    description: 'New Stripe price ID to change the plan',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  planId?: string;

  @ApiPropertyOptional({
    enum: BillingCycle,
    example: BillingCycle.YEARLY,
    description: 'New billing cycle for the subscription',
  })
  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @ApiPropertyOptional({
    example: 'pm_1234567890',
    description: 'New payment method ID to update billing',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  paymentMethodId?: string;
}
