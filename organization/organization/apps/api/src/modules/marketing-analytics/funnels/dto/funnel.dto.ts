import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  IsNumber,
  IsBoolean,
  ValidateNested,
  ArrayMinSize,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MarketingEventType } from '../../constants/event-types';

/**
 * Funnel step definition
 */
export class FunnelStepDto {
  @ApiProperty({ description: 'Step name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Event type for this step',
    enum: MarketingEventType,
  })
  @IsEnum(MarketingEventType)
  eventType: MarketingEventType;

  @ApiPropertyOptional({ description: 'Optional filter conditions for the event' })
  @IsOptional()
  @IsArray()
  filters?: Array<{
    property: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
    value: any;
  }>;

  @ApiPropertyOptional({
    description: 'Maximum time in seconds to complete this step from previous step',
    default: 86400,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTimeSeconds?: number;
}

/**
 * Create funnel definition DTO
 */
export class CreateFunnelDto {
  @ApiProperty({ description: 'Funnel name', example: 'Checkout Funnel' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Funnel description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Funnel steps (minimum 2)',
    type: [FunnelStepDto],
  })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => FunnelStepDto)
  steps: FunnelStepDto[];

  @ApiPropertyOptional({
    description: 'Whether the funnel is ordered (users must complete steps in order)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isOrdered?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum time in seconds to complete the entire funnel',
    default: 604800,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  conversionWindow?: number;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;
}

/**
 * Update funnel definition DTO
 */
export class UpdateFunnelDto {
  @ApiPropertyOptional({ description: 'Funnel name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Funnel description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Funnel steps',
    type: [FunnelStepDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => FunnelStepDto)
  steps?: FunnelStepDto[];

  @ApiPropertyOptional({ description: 'Whether the funnel is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Funnel query parameters
 */
export class FunnelQueryDto {
  @ApiPropertyOptional({ description: 'Start date for analysis' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for analysis' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Group by (day, week, month)',
    enum: ['day', 'week', 'month'],
  })
  @IsOptional()
  @IsString()
  groupBy?: 'day' | 'week' | 'month';

  @ApiPropertyOptional({ description: 'Filter by user segment' })
  @IsOptional()
  @IsString()
  segment?: string;

  @ApiPropertyOptional({ description: 'Include breakdown by device type' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeDeviceBreakdown?: boolean;

  @ApiPropertyOptional({ description: 'Include breakdown by source' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeSourceBreakdown?: boolean;
}

/**
 * Funnel analysis result
 */
export class FunnelStepResultDto {
  @ApiProperty({ description: 'Step index' })
  stepIndex: number;

  @ApiProperty({ description: 'Step name' })
  stepName: string;

  @ApiProperty({ description: 'Event type' })
  eventType: string;

  @ApiProperty({ description: 'Number of users entering this step' })
  entered: number;

  @ApiProperty({ description: 'Number of users completing this step' })
  completed: number;

  @ApiProperty({ description: 'Conversion rate from previous step (0-100)' })
  conversionRate: number;

  @ApiProperty({ description: 'Dropoff rate from previous step (0-100)' })
  dropoffRate: number;

  @ApiProperty({ description: 'Average time to complete this step (seconds)' })
  avgTimeToComplete: number;

  @ApiProperty({ description: 'Median time to complete this step (seconds)' })
  medianTimeToComplete: number;
}

/**
 * Full funnel analysis result
 */
export class FunnelAnalysisResultDto {
  @ApiProperty({ description: 'Funnel ID' })
  funnelId: string;

  @ApiProperty({ description: 'Funnel name' })
  funnelName: string;

  @ApiProperty({ description: 'Analysis date range' })
  dateRange: {
    startDate: string;
    endDate: string;
  };

  @ApiProperty({ description: 'Total users entering the funnel' })
  totalEntered: number;

  @ApiProperty({ description: 'Total users completing the funnel' })
  totalConverted: number;

  @ApiProperty({ description: 'Overall conversion rate (0-100)' })
  overallConversionRate: number;

  @ApiProperty({ description: 'Step-by-step results', type: [FunnelStepResultDto] })
  steps: FunnelStepResultDto[];

  @ApiPropertyOptional({ description: 'Breakdown by device type' })
  deviceBreakdown?: Record<
    string,
    {
      entered: number;
      converted: number;
      conversionRate: number;
    }
  >;

  @ApiPropertyOptional({ description: 'Breakdown by traffic source' })
  sourceBreakdown?: Record<
    string,
    {
      entered: number;
      converted: number;
      conversionRate: number;
    }
  >;

  @ApiPropertyOptional({ description: 'Time series breakdown' })
  timeSeries?: Array<{
    date: string;
    entered: number;
    converted: number;
    conversionRate: number;
  }>;
}

/**
 * Funnel response DTO
 */
export class FunnelResponseDto {
  @ApiProperty({ description: 'Funnel ID' })
  id: string;

  @ApiProperty({ description: 'Funnel name' })
  name: string;

  @ApiPropertyOptional({ description: 'Funnel description' })
  description?: string;

  @ApiProperty({ description: 'Funnel steps', type: [FunnelStepDto] })
  steps: FunnelStepDto[];

  @ApiProperty({ description: 'Whether the funnel is ordered' })
  isOrdered: boolean;

  @ApiProperty({ description: 'Conversion window in seconds' })
  conversionWindow: number;

  @ApiProperty({ description: 'Whether the funnel is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Organization ID' })
  organizationId?: string;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;
}
