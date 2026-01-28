import { IsString, IsObject, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WebhookEventDto {
  @ApiProperty({
    description: 'Event type identifier',
    example: 'order.created',
  })
  @IsString()
  eventType: string;

  @ApiProperty({
    description: 'Unique event identifier',
    example: 'evt_1234567890',
  })
  @IsString()
  eventId: string;

  @ApiProperty({
    description: 'Event payload data',
    example: { orderId: 'ord_123', total: 99.99 },
  })
  @IsObject()
  payload: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Source of the event',
    example: 'order_service',
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({
    description: 'User ID who triggered the event',
  })
  @IsOptional()
  @IsString()
  triggeredBy?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
