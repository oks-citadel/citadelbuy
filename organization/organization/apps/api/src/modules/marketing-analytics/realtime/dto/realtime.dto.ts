import { IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Real-time users query
 */
export class RealtimeUsersQueryDto {
  @ApiPropertyOptional({
    description: 'Time window in minutes for "active" users',
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  @Type(() => Number)
  windowMinutes?: number;
}

/**
 * Real-time events query
 */
export class RealtimeEventsQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of events to return',
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by event type' })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;
}

/**
 * Active user info
 */
export class ActiveUserDto {
  @ApiProperty({ description: 'User or session identifier' })
  userId: string;

  @ApiPropertyOptional({ description: 'Whether user is authenticated' })
  isAuthenticated?: boolean;

  @ApiProperty({ description: 'Last activity timestamp' })
  lastActivity: string;

  @ApiProperty({ description: 'Current page' })
  currentPage: string;

  @ApiPropertyOptional({ description: 'Device type' })
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Country' })
  country?: string;

  @ApiPropertyOptional({ description: 'Traffic source' })
  source?: string;
}

/**
 * Real-time users response
 */
export class RealtimeUsersDto {
  @ApiProperty({ description: 'Current timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Time window in minutes' })
  windowMinutes: number;

  @ApiProperty({ description: 'Total active users' })
  activeUsers: number;

  @ApiProperty({ description: 'Authenticated users' })
  authenticatedUsers: number;

  @ApiProperty({ description: 'Anonymous users' })
  anonymousUsers: number;

  @ApiProperty({ description: 'Active users by page' })
  byPage: Record<string, number>;

  @ApiProperty({ description: 'Active users by device type' })
  byDeviceType: Record<string, number>;

  @ApiProperty({ description: 'Active users by country' })
  byCountry: Record<string, number>;

  @ApiProperty({ description: 'Active users by source' })
  bySource: Record<string, number>;

  @ApiProperty({ description: 'User list (if requested)', type: [ActiveUserDto] })
  users?: ActiveUserDto[];
}

/**
 * Real-time event
 */
export class RealtimeEventDto {
  @ApiProperty({ description: 'Event ID' })
  eventId: string;

  @ApiProperty({ description: 'Event type' })
  eventType: string;

  @ApiPropertyOptional({ description: 'User ID' })
  userId?: string;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Event timestamp' })
  timestamp: string;

  @ApiPropertyOptional({ description: 'Page URL' })
  page?: string;

  @ApiPropertyOptional({ description: 'Event properties' })
  properties?: Record<string, any>;
}

/**
 * Real-time events stream response
 */
export class RealtimeEventsDto {
  @ApiProperty({ description: 'Current timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Total events in buffer' })
  totalEvents: number;

  @ApiProperty({ description: 'Recent events', type: [RealtimeEventDto] })
  events: RealtimeEventDto[];

  @ApiProperty({ description: 'Events per second (last minute)' })
  eventsPerSecond: number;

  @ApiProperty({ description: 'Events by type in last minute' })
  byType: Record<string, number>;
}

/**
 * Real-time metrics snapshot
 */
export class RealtimeMetricsDto {
  @ApiProperty({ description: 'Snapshot timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Active users right now' })
  activeUsers: number;

  @ApiProperty({ description: 'Page views in last minute' })
  pageViewsPerMinute: number;

  @ApiProperty({ description: 'Events per second' })
  eventsPerSecond: number;

  @ApiProperty({ description: 'Conversions in last hour' })
  conversionsLastHour: number;

  @ApiProperty({ description: 'Revenue in last hour' })
  revenueLastHour: number;

  @ApiProperty({ description: 'Top pages right now' })
  topPages: Array<{
    page: string;
    activeUsers: number;
  }>;

  @ApiProperty({ description: 'Top events right now' })
  topEvents: Array<{
    eventType: string;
    count: number;
  }>;
}

/**
 * WebSocket message types
 */
export enum WsMessageType {
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  EVENT = 'event',
  USERS = 'users',
  METRICS = 'metrics',
  ERROR = 'error',
  PING = 'ping',
  PONG = 'pong',
}

/**
 * WebSocket subscribe message
 */
export class WsSubscribeDto {
  @ApiProperty({ description: 'Channels to subscribe to' })
  channels: string[];
}

/**
 * WebSocket message
 */
export class WsMessageDto {
  @ApiProperty({ description: 'Message type', enum: WsMessageType })
  type: WsMessageType;

  @ApiPropertyOptional({ description: 'Channel name' })
  channel?: string;

  @ApiPropertyOptional({ description: 'Message data' })
  data?: any;

  @ApiPropertyOptional({ description: 'Message timestamp' })
  timestamp?: string;
}
