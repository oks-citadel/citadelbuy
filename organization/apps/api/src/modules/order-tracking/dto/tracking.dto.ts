import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsEnum, IsArray, IsBoolean, IsDateString } from 'class-validator';

export enum TrackingStatusEnum {
  ORDER_PLACED = 'ORDER_PLACED',
  PROCESSING = 'PROCESSING',
  LABEL_CREATED = 'LABEL_CREATED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  EXCEPTION = 'EXCEPTION',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

export class TrackByOrderNumberDto {
  @ApiProperty({
    description: 'Order number to track',
    example: 'CB-2024-12345',
  })
  @IsNotEmpty()
  @IsString()
  orderNumber: string;
}

export class GuestTrackingDto {
  @ApiProperty({
    description: 'Order number to track',
    example: 'CB-2024-12345',
  })
  @IsNotEmpty()
  @IsString()
  orderNumber: string;

  @ApiProperty({
    description: 'Email address used for the order',
    example: 'customer@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class TrackByTrackingNumberDto {
  @ApiProperty({
    description: 'Carrier tracking number',
    example: 'TRK1234567890',
  })
  @IsNotEmpty()
  @IsString()
  trackingNumber: string;
}

export class TrackingEventDto {
  @ApiProperty({
    description: 'Event status',
    enum: TrackingStatusEnum,
    example: TrackingStatusEnum.IN_TRANSIT,
  })
  @IsEnum(TrackingStatusEnum)
  status: TrackingStatusEnum;

  @ApiProperty({
    description: 'Event description',
    example: 'Package has left the facility',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Event location',
    example: 'New York, NY',
  })
  @IsString()
  location: string;

  @ApiProperty({
    description: 'Event timestamp',
    example: '2024-12-04T10:30:00Z',
  })
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional({
    description: 'Whether this event is completed',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

export class TrackingResponseDto {
  @ApiProperty({
    description: 'Order number',
    example: 'CB-2024-12345',
  })
  orderNumber: string;

  @ApiProperty({
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  orderId: string;

  @ApiProperty({
    description: 'Current order status',
    enum: TrackingStatusEnum,
    example: TrackingStatusEnum.IN_TRANSIT,
  })
  status: TrackingStatusEnum;

  @ApiPropertyOptional({
    description: 'Carrier tracking number',
    example: 'TRK1234567890',
  })
  trackingNumber?: string;

  @ApiPropertyOptional({
    description: 'Shipping carrier',
    example: 'UPS',
  })
  carrier?: string;

  @ApiPropertyOptional({
    description: 'Shipping method',
    example: 'Ground Shipping',
  })
  shippingMethod?: string;

  @ApiProperty({
    description: 'Estimated delivery date',
    example: '2024-12-10T00:00:00Z',
  })
  estimatedDelivery: string;

  @ApiPropertyOptional({
    description: 'Actual delivery date',
    example: '2024-12-10T14:30:00Z',
  })
  actualDelivery?: string;

  @ApiProperty({
    description: 'Order creation date',
    example: '2024-12-04T10:00:00Z',
  })
  orderDate: string;

  @ApiProperty({
    description: 'Tracking timeline events',
    type: [TrackingEventDto],
  })
  @IsArray()
  timeline: TrackingEventDto[];

  @ApiProperty({
    description: 'Shipping address',
    example: {
      name: 'John Doe',
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'United States',
    },
  })
  shippingAddress: any;

  @ApiPropertyOptional({
    description: 'Order items',
    type: 'array',
  })
  items?: Array<{
    name: string;
    quantity: number;
    image?: string;
  }>;

  @ApiPropertyOptional({
    description: 'Order total',
    example: 159.97,
  })
  total?: number;
}

export class ShipmentTrackingDto {
  @ApiProperty({
    description: 'Shipment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  shipmentId: string;

  @ApiProperty({
    description: 'Carrier tracking number',
    example: 'TRK1234567890',
  })
  trackingNumber: string;

  @ApiProperty({
    description: 'Shipping carrier',
    example: 'UPS',
  })
  carrier: string;

  @ApiProperty({
    description: 'Current shipment status',
    example: 'IN_TRANSIT',
  })
  status: string;

  @ApiProperty({
    description: 'Tracking events',
    type: [TrackingEventDto],
  })
  events: TrackingEventDto[];

  @ApiPropertyOptional({
    description: 'Estimated delivery date',
  })
  estimatedDelivery?: string;

  @ApiPropertyOptional({
    description: 'Actual delivery date',
  })
  actualDelivery?: string;
}
