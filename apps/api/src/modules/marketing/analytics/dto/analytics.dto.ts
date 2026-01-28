import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  IsDateString,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Funnel Analysis DTOs
export class FunnelStepDto {
  @ApiProperty({ description: 'Step name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Event name for this step' })
  @IsString()
  event: string;

  @ApiPropertyOptional({ description: 'Step conditions' })
  @IsOptional()
  conditions?: Record<string, any>;
}

export class CreateFunnelDto {
  @ApiProperty({ description: 'Funnel name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Funnel steps', type: [FunnelStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FunnelStepDto)
  steps: FunnelStepDto[];

  @ApiPropertyOptional({ description: 'Conversion window in days' })
  @IsOptional()
  @IsNumber()
  conversionWindowDays?: number;
}

export class FunnelQueryDto {
  @ApiProperty({ description: 'Funnel ID' })
  @IsString()
  funnelId: string;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Segment ID to filter' })
  @IsOptional()
  @IsString()
  segmentId?: string;

  @ApiPropertyOptional({ description: 'Group by dimension' })
  @IsOptional()
  @IsString()
  groupBy?: string;
}

// Cohort Analysis DTOs
export enum CohortType {
  FIRST_PURCHASE = 'FIRST_PURCHASE',
  SIGNUP = 'SIGNUP',
  FIRST_VISIT = 'FIRST_VISIT',
  CUSTOM_EVENT = 'CUSTOM_EVENT',
}

export enum CohortMetric {
  RETENTION = 'RETENTION',
  REVENUE = 'REVENUE',
  ORDERS = 'ORDERS',
  SESSIONS = 'SESSIONS',
  EVENTS = 'EVENTS',
}

export enum CohortGranularity {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
}

export class CohortQueryDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ enum: CohortType })
  @IsEnum(CohortType)
  cohortType: CohortType;

  @ApiProperty({ enum: CohortMetric })
  @IsEnum(CohortMetric)
  metric: CohortMetric;

  @ApiPropertyOptional({ enum: CohortGranularity })
  @IsOptional()
  @IsEnum(CohortGranularity)
  granularity?: CohortGranularity;

  @ApiProperty({ description: 'Start date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Number of periods to analyze' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  periods?: number;
}

// Attribution DTOs
export enum AttributionModel {
  FIRST_TOUCH = 'FIRST_TOUCH',
  LAST_TOUCH = 'LAST_TOUCH',
  LINEAR = 'LINEAR',
  TIME_DECAY = 'TIME_DECAY',
  POSITION_BASED = 'POSITION_BASED',
  DATA_DRIVEN = 'DATA_DRIVEN',
}

export class AttributionQueryDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ enum: AttributionModel })
  @IsEnum(AttributionModel)
  model: AttributionModel;

  @ApiProperty({ description: 'Start date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Lookback window in days' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lookbackDays?: number;

  @ApiPropertyOptional({ description: 'Conversion event' })
  @IsOptional()
  @IsString()
  conversionEvent?: string;

  @ApiPropertyOptional({ description: 'Channel grouping' })
  @IsOptional()
  @IsString()
  channelGrouping?: string;
}

export class CompareAttributionDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Models to compare', enum: AttributionModel, isArray: true })
  @IsArray()
  @IsEnum(AttributionModel, { each: true })
  models: AttributionModel[];

  @ApiProperty({ description: 'Start date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date' })
  @IsDateString()
  endDate: string;
}

// Heatmap/Recording DTOs
export enum HeatmapType {
  CLICK = 'CLICK',
  SCROLL = 'SCROLL',
  MOVE = 'MOVE',
  ATTENTION = 'ATTENTION',
}

export class RecordSessionDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'User ID or anonymous ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Page URL' })
  @IsString()
  pageUrl: string;

  @ApiPropertyOptional({ description: 'Viewport width' })
  @IsOptional()
  @IsNumber()
  viewportWidth?: number;

  @ApiPropertyOptional({ description: 'Viewport height' })
  @IsOptional()
  @IsNumber()
  viewportHeight?: number;

  @ApiPropertyOptional({ description: 'Device type' })
  @IsOptional()
  @IsString()
  deviceType?: string;
}

export class RecordEventDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Event type' })
  @IsString()
  eventType: 'click' | 'scroll' | 'move' | 'input' | 'resize';

  @ApiProperty({ description: 'Timestamp' })
  @IsNumber()
  timestamp: number;

  @ApiPropertyOptional({ description: 'X coordinate' })
  @IsOptional()
  @IsNumber()
  x?: number;

  @ApiPropertyOptional({ description: 'Y coordinate' })
  @IsOptional()
  @IsNumber()
  y?: number;

  @ApiPropertyOptional({ description: 'Scroll depth' })
  @IsOptional()
  @IsNumber()
  scrollDepth?: number;

  @ApiPropertyOptional({ description: 'Target element selector' })
  @IsOptional()
  @IsString()
  targetSelector?: string;
}

export class HeatmapQueryDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Page URL' })
  @IsString()
  pageUrl: string;

  @ApiProperty({ enum: HeatmapType })
  @IsEnum(HeatmapType)
  type: HeatmapType;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Device type filter' })
  @IsOptional()
  @IsString()
  deviceType?: string;
}

export class RecordingQueryDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Page URL filter' })
  @IsOptional()
  @IsString()
  pageUrl?: string;

  @ApiPropertyOptional({ description: 'User ID filter' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Min duration in seconds' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minDuration?: number;

  @ApiPropertyOptional({ description: 'Has error' })
  @IsOptional()
  @IsBoolean()
  hasError?: boolean;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}
