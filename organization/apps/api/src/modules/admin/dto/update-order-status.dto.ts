import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum, IsString, IsOptional } from 'class-validator';
import { OrderStatus } from '@prisma/client';

/**
 * DTO for admin order status updates.
 * Used by AdminOrdersController to update order status with optional tracking information.
 */
export class AdminUpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: 'PROCESSING',
    description: 'New order status',
    enumName: 'OrderStatus',
  })
  @IsNotEmpty()
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({
    example: '1Z999AA10123456784',
    description: 'Shipping tracking number (typically provided when status is SHIPPED)',
  })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({
    example: 'UPS',
    description: 'Shipping carrier name',
  })
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiPropertyOptional({
    example: 'Order shipped via express delivery',
    description: 'Admin notes for the status change',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
