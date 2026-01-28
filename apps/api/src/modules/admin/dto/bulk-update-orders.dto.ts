import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsEnum, IsString, IsUUID } from 'class-validator';
import { OrderStatus } from '@prisma/client';

/**
 * DTO for bulk order status updates in admin panel.
 * Allows admins to update multiple orders at once.
 */
export class BulkUpdateOrdersDto {
  @ApiProperty({
    type: [String],
    example: ['order-uuid-1', 'order-uuid-2'],
    description: 'Array of order IDs to update',
  })
  @IsNotEmpty()
  @IsArray()
  @IsUUID('4', { each: true })
  orderIds: string[];

  @ApiProperty({
    enum: OrderStatus,
    example: 'SHIPPED',
    description: 'New status to apply to all selected orders',
    enumName: 'OrderStatus',
  })
  @IsNotEmpty()
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({
    example: 'Bulk shipment processed',
    description: 'Admin notes for the bulk update',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for exporting orders.
 */
export class ExportOrdersDto {
  @ApiPropertyOptional({
    enum: OrderStatus,
    description: 'Filter by order status',
    enumName: 'OrderStatus',
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Export orders from this date',
  })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: 'Export orders until this date',
  })
  @IsOptional()
  @IsString()
  toDate?: string;

  @ApiPropertyOptional({
    example: 'csv',
    description: 'Export format',
    enum: ['csv', 'xlsx', 'json'],
    default: 'csv',
  })
  @IsOptional()
  @IsString()
  format?: 'csv' | 'xlsx' | 'json';
}
