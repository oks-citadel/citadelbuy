import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsEnum, IsArray, IsDateString } from 'class-validator';

export class UpdateOrderTrackingDto {
  @ApiPropertyOptional({
    description: 'Tracking number',
    example: 'TRK1234567890',
  })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({
    description: 'Shipping carrier',
    example: 'UPS',
  })
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiPropertyOptional({
    description: 'Shipping method',
    example: 'Ground',
  })
  @IsOptional()
  @IsString()
  shippingMethod?: string;

  @ApiPropertyOptional({
    description: 'Order status',
    enum: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
  })
  @IsOptional()
  @IsEnum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Estimated delivery date',
    example: '2024-12-10T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  estimatedDeliveryDate?: string;

  @ApiPropertyOptional({
    description: 'Actual delivery date',
    example: '2024-12-10T14:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  actualDeliveryDate?: string;
}

export class TrackingWebhookDto {
  @ApiProperty({
    description: 'Carrier tracking number',
    example: 'TRK1234567890',
  })
  @IsNotEmpty()
  @IsString()
  trackingNumber: string;

  @ApiProperty({
    description: 'Current shipment status',
    example: 'IN_TRANSIT',
  })
  @IsNotEmpty()
  @IsString()
  status: string;

  @ApiPropertyOptional({
    description: 'Tracking events',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  events?: Array<{
    status: string;
    description: string;
    location?: string;
    timestamp: string;
  }>;

  @ApiPropertyOptional({
    description: 'Carrier name',
    example: 'UPS',
  })
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiPropertyOptional({
    description: 'Estimated delivery date',
  })
  @IsOptional()
  @IsDateString()
  estimatedDelivery?: string;

  @ApiPropertyOptional({
    description: 'Actual delivery date',
  })
  @IsOptional()
  @IsDateString()
  actualDelivery?: string;
}
