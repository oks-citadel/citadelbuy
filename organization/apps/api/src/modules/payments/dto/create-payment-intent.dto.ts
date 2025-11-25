import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  Min,
  IsString,
  IsOptional,
} from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({
    example: 109.97,
    description: 'Amount in dollars (will be converted to cents)',
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.5)
  amount: number;

  @ApiProperty({
    example: 'usd',
    description: 'Currency code',
    default: 'usd',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    example: 'order-uuid',
    description: 'Order ID to associate with this payment',
    required: false,
  })
  @IsOptional()
  @IsString()
  orderId?: string;
}
