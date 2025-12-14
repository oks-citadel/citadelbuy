import { IsString, IsUrl, IsArray, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWebhookDto {
  @ApiProperty({
    description: 'Webhook endpoint URL',
    example: 'https://example.com/webhooks/broxiva',
  })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({
    description: 'Description of the webhook',
    example: 'Order notifications for inventory management',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'List of event types to subscribe to',
    example: ['order.created', 'order.updated', 'order.cancelled'],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  events: string[];

  @ApiPropertyOptional({
    description: 'Whether the webhook is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata for the webhook',
    example: { team: 'inventory', priority: 'high' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
