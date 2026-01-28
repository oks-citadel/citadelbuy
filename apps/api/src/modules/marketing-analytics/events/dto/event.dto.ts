import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsUUID,
  MaxLength,
  Min,
  Max,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MarketingEventType, EventCategory } from '../../constants/event-types';

/**
 * Context information for an event
 */
export class EventContextDto {
  @ApiPropertyOptional({ description: 'IP address of the user' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Referrer URL' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  referrer?: string;

  @ApiPropertyOptional({ description: 'Current page URL' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  page?: string;

  @ApiPropertyOptional({ description: 'Page title' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  pageTitle?: string;

  @ApiPropertyOptional({ description: 'Screen width in pixels' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  screenWidth?: number;

  @ApiPropertyOptional({ description: 'Screen height in pixels' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  screenHeight?: number;

  @ApiPropertyOptional({ description: 'Viewport width in pixels' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  viewportWidth?: number;

  @ApiPropertyOptional({ description: 'Viewport height in pixels' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  viewportHeight?: number;

  @ApiPropertyOptional({ description: 'User locale/language' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  locale?: string;

  @ApiPropertyOptional({ description: 'User timezone' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ description: 'Device type (desktop, mobile, tablet)' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Operating system' })
  @IsOptional()
  @IsString()
  os?: string;

  @ApiPropertyOptional({ description: 'Browser name' })
  @IsOptional()
  @IsString()
  browser?: string;
}

/**
 * UTM parameters for attribution
 */
export class UtmParametersDto {
  @ApiPropertyOptional({ description: 'UTM source' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  utmSource?: string;

  @ApiPropertyOptional({ description: 'UTM medium' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  utmMedium?: string;

  @ApiPropertyOptional({ description: 'UTM campaign' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  utmCampaign?: string;

  @ApiPropertyOptional({ description: 'UTM term' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  utmTerm?: string;

  @ApiPropertyOptional({ description: 'UTM content' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  utmContent?: string;
}

/**
 * Single event ingestion DTO
 */
export class IngestEventDto {
  @ApiProperty({
    description: 'Unique event ID for idempotency (client-generated)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  eventId: string;

  @ApiProperty({
    description: 'Event type',
    enum: MarketingEventType,
    example: MarketingEventType.PAGE_VIEW,
  })
  @IsEnum(MarketingEventType)
  eventType: MarketingEventType;

  @ApiPropertyOptional({
    description: 'Event category (auto-derived if not provided)',
    enum: EventCategory,
  })
  @IsOptional()
  @IsEnum(EventCategory)
  eventCategory?: EventCategory;

  @ApiPropertyOptional({ description: 'User ID (if authenticated)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  userId?: string;

  @ApiProperty({
    description: 'Anonymous session ID',
    example: 'sess_abc123',
  })
  @IsString()
  @MaxLength(100)
  sessionId: string;

  @ApiPropertyOptional({ description: 'Anonymous ID for cross-session tracking' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  anonymousId?: string;

  @ApiPropertyOptional({ description: 'Organization ID for multi-tenant support' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Event properties/metadata' })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Event context (browser, device, etc.)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EventContextDto)
  context?: EventContextDto;

  @ApiPropertyOptional({ description: 'UTM parameters' })
  @IsOptional()
  @ValidateNested()
  @Type(() => UtmParametersDto)
  utm?: UtmParametersDto;

  @ApiPropertyOptional({
    description: 'Event timestamp (ISO 8601). Defaults to server time if not provided.',
    example: '2025-01-01T12:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiPropertyOptional({ description: 'Custom event name (for custom events)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  eventName?: string;
}

/**
 * Batch event ingestion DTO
 */
export class BatchIngestEventsDto {
  @ApiProperty({
    description: 'Array of events to ingest (max 1000)',
    type: [IngestEventDto],
  })
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => IngestEventDto)
  events: IngestEventDto[];

  @ApiPropertyOptional({
    description: 'Whether to continue processing on individual event errors',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean;
}

/**
 * Event validation request DTO
 */
export class ValidateEventDto {
  @ApiProperty({
    description: 'Event type to validate',
    enum: MarketingEventType,
  })
  @IsEnum(MarketingEventType)
  eventType: MarketingEventType;

  @ApiProperty({ description: 'Event properties to validate' })
  @IsObject()
  properties: Record<string, any>;
}

/**
 * Event query DTO for fetching events
 */
export class EventQueryDto {
  @ApiPropertyOptional({ description: 'Filter by event type' })
  @IsOptional()
  @IsEnum(MarketingEventType)
  eventType?: MarketingEventType;

  @ApiPropertyOptional({ description: 'Filter by event category' })
  @IsOptional()
  @IsEnum(EventCategory)
  eventCategory?: EventCategory;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by session ID' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  limit?: number;
}

/**
 * Event schema response DTO
 */
export class EventSchemaResponseDto {
  @ApiProperty({ description: 'Event type' })
  eventType: string;

  @ApiProperty({ description: 'Event category' })
  category: string;

  @ApiProperty({ description: 'Required properties' })
  requiredProperties: string[];

  @ApiProperty({ description: 'Optional properties' })
  optionalProperties: string[];

  @ApiProperty({ description: 'Property type definitions' })
  schema: Record<string, string>;

  @ApiProperty({ description: 'Default sampling rate' })
  defaultSamplingRate: number;
}

/**
 * Batch ingestion result DTO
 */
export class BatchIngestResultDto {
  @ApiProperty({ description: 'Total events submitted' })
  total: number;

  @ApiProperty({ description: 'Successfully ingested events' })
  successful: number;

  @ApiProperty({ description: 'Failed events' })
  failed: number;

  @ApiProperty({ description: 'Duplicate events (already ingested)' })
  duplicates: number;

  @ApiProperty({ description: 'Error details for failed events' })
  errors: Array<{
    eventId: string;
    error: string;
  }>;
}

/**
 * Single event ingestion result DTO
 */
export class IngestResultDto {
  @ApiProperty({ description: 'Whether the event was successfully ingested' })
  success: boolean;

  @ApiProperty({ description: 'Event ID' })
  eventId: string;

  @ApiPropertyOptional({ description: 'Whether this was a duplicate event' })
  duplicate?: boolean;

  @ApiPropertyOptional({ description: 'Error message if ingestion failed' })
  error?: string;
}
