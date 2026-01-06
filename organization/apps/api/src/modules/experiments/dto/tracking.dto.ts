import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  IsUUID,
  IsDateString,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackEventDto {
  @ApiProperty({ description: 'User ID who triggered the event' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Event name', example: 'purchase' })
  @IsString()
  eventName: string;

  @ApiPropertyOptional({ description: 'Event value (e.g., revenue)', example: 99.99 })
  @IsOptional()
  @IsNumber()
  eventValue?: number;

  @ApiPropertyOptional({
    description: 'Additional event metadata',
    example: { product_id: 'abc123', category: 'electronics' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class BulkTrackEventDto {
  @ApiProperty({
    description: 'Array of events to track',
    type: [TrackEventDto],
  })
  @IsArray()
  @Type(() => TrackEventDto)
  events: TrackEventDto[];
}

export class EventQueryDto {
  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by event name' })
  @IsOptional()
  @IsString()
  eventName?: string;

  @ApiPropertyOptional({ description: 'Filter by variant ID' })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 50;
}

export class EventResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  experimentId: string;

  @ApiProperty()
  variantId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  eventName: string;

  @ApiPropertyOptional()
  eventValue?: number;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiProperty()
  timestamp: Date;
}

export class EventSummaryDto {
  @ApiProperty()
  experimentId: string;

  @ApiProperty()
  experimentName: string;

  @ApiProperty({ description: 'Total events tracked' })
  totalEvents: number;

  @ApiProperty({ description: 'Unique users with events' })
  uniqueUsers: number;

  @ApiProperty({
    description: 'Event counts by name',
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  eventCounts: Record<string, number>;

  @ApiProperty({
    description: 'Event counts by variant',
    type: 'object',
  })
  byVariant: Record<string, {
    variantName: string;
    eventCounts: Record<string, number>;
    totalEvents: number;
    uniqueUsers: number;
  }>;

  @ApiProperty()
  dateRange: {
    start: Date;
    end: Date;
  };
}

export class TrackEventResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  eventId: string;

  @ApiProperty()
  experimentId: string;

  @ApiProperty()
  variantId: string;

  @ApiProperty()
  message: string;
}
