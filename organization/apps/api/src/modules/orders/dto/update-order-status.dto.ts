import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsString, IsOptional } from 'class-validator';

enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: 'PROCESSING',
    description: 'New order status',
  })
  @IsNotEmpty()
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiProperty({
    example: 'pi_1234567890',
    description: 'Payment intent ID from Stripe',
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentIntentId?: string;

  @ApiProperty({
    example: 'card',
    description: 'Payment method used',
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
