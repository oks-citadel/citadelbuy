import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Session query parameters
 */
export class SessionQueryDto {
  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by device type' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Filter by traffic source' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Include only converted sessions' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  convertedOnly?: boolean;

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
 * Session event DTO
 */
export class SessionEventDto {
  @ApiProperty({ description: 'Event ID' })
  eventId: string;

  @ApiProperty({ description: 'Event type' })
  eventType: string;

  @ApiProperty({ description: 'Event timestamp' })
  timestamp: string;

  @ApiPropertyOptional({ description: 'Page URL' })
  page?: string;

  @ApiPropertyOptional({ description: 'Event properties' })
  properties?: Record<string, any>;
}

/**
 * Session detail DTO
 */
export class SessionDetailDto {
  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiPropertyOptional({ description: 'User ID (if authenticated)' })
  userId?: string;

  @ApiProperty({ description: 'Session start time' })
  startTime: string;

  @ApiProperty({ description: 'Session end time' })
  endTime: string;

  @ApiProperty({ description: 'Session duration in seconds' })
  durationSeconds: number;

  @ApiProperty({ description: 'Number of events in session' })
  eventCount: number;

  @ApiProperty({ description: 'Number of page views' })
  pageViews: number;

  @ApiProperty({ description: 'Whether the session resulted in a conversion' })
  converted: boolean;

  @ApiPropertyOptional({ description: 'Conversion value (if converted)' })
  conversionValue?: number;

  @ApiProperty({ description: 'Traffic source' })
  source: string;

  @ApiPropertyOptional({ description: 'Medium' })
  medium?: string;

  @ApiPropertyOptional({ description: 'Campaign' })
  campaign?: string;

  @ApiProperty({ description: 'Device type' })
  deviceType: string;

  @ApiPropertyOptional({ description: 'Browser' })
  browser?: string;

  @ApiPropertyOptional({ description: 'Operating system' })
  os?: string;

  @ApiPropertyOptional({ description: 'Country' })
  country?: string;

  @ApiProperty({ description: 'Landing page' })
  landingPage: string;

  @ApiProperty({ description: 'Exit page' })
  exitPage: string;

  @ApiProperty({ description: 'Bounce (only viewed one page)' })
  isBounce: boolean;
}

/**
 * Session metrics DTO
 */
export class SessionMetricsDto {
  @ApiProperty({ description: 'Date range' })
  dateRange: {
    startDate: string;
    endDate: string;
  };

  @ApiProperty({ description: 'Total sessions' })
  totalSessions: number;

  @ApiProperty({ description: 'Unique users' })
  uniqueUsers: number;

  @ApiProperty({ description: 'New sessions (first-time visitors)' })
  newSessions: number;

  @ApiProperty({ description: 'Returning sessions' })
  returningSessions: number;

  @ApiProperty({ description: 'Total page views' })
  totalPageViews: number;

  @ApiProperty({ description: 'Average pages per session' })
  avgPagesPerSession: number;

  @ApiProperty({ description: 'Average session duration (seconds)' })
  avgSessionDuration: number;

  @ApiProperty({ description: 'Bounce rate (0-100)' })
  bounceRate: number;

  @ApiProperty({ description: 'Conversion rate (0-100)' })
  conversionRate: number;

  @ApiProperty({ description: 'Sessions by device type' })
  byDeviceType: Record<string, number>;

  @ApiProperty({ description: 'Sessions by traffic source' })
  bySource: Record<string, number>;

  @ApiProperty({ description: 'Sessions by country' })
  byCountry: Record<string, number>;

  @ApiProperty({ description: 'Daily session trend' })
  dailyTrend: Array<{
    date: string;
    sessions: number;
    pageViews: number;
    avgDuration: number;
    bounceRate: number;
  }>;

  @ApiProperty({ description: 'Hourly distribution' })
  hourlyDistribution: Record<number, number>;
}

/**
 * Sessions list response
 */
export class SessionsListResponseDto {
  @ApiProperty({ description: 'Sessions list', type: [SessionDetailDto] })
  sessions: SessionDetailDto[];

  @ApiProperty({ description: 'Pagination info' })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Session events response
 */
export class SessionEventsResponseDto {
  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Total events' })
  totalEvents: number;

  @ApiProperty({ description: 'Events in session', type: [SessionEventDto] })
  events: SessionEventDto[];
}
