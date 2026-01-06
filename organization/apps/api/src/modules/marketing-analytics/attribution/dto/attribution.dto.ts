import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Attribution model types
 */
export enum AttributionModel {
  FIRST_TOUCH = 'first_touch',
  LAST_TOUCH = 'last_touch',
  LINEAR = 'linear',
  TIME_DECAY = 'time_decay',
  POSITION_BASED = 'position_based',
  DATA_DRIVEN = 'data_driven',
}

/**
 * Attribution query parameters
 */
export class AttributionQueryDto {
  @ApiPropertyOptional({ description: 'Start date for attribution analysis' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for attribution analysis' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Attribution model to use',
    enum: AttributionModel,
    default: AttributionModel.LAST_TOUCH,
  })
  @IsOptional()
  @IsEnum(AttributionModel)
  model?: AttributionModel;

  @ApiPropertyOptional({
    description: 'Conversion window in days',
    default: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  conversionWindow?: number;

  @ApiPropertyOptional({
    description: 'Conversion event type to analyze',
    default: 'purchase',
  })
  @IsOptional()
  @IsString()
  conversionEvent?: string;

  @ApiPropertyOptional({ description: 'Include cross-device attribution' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  crossDevice?: boolean;
}

/**
 * Customer journey query parameters
 */
export class JourneyQueryDto {
  @ApiPropertyOptional({ description: 'User ID to analyze' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Session ID to analyze' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of journeys to return',
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  limit?: number;
}

/**
 * Touchpoint query parameters
 */
export class TouchpointQueryDto {
  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Group by (channel, source, medium, campaign)',
    default: 'channel',
  })
  @IsOptional()
  @IsString()
  groupBy?: 'channel' | 'source' | 'medium' | 'campaign';

  @ApiPropertyOptional({
    description: 'Filter by specific channel',
  })
  @IsOptional()
  @IsString()
  channel?: string;
}

/**
 * Attribution model description
 */
export class AttributionModelDto {
  @ApiProperty({ description: 'Model identifier' })
  id: string;

  @ApiProperty({ description: 'Model name' })
  name: string;

  @ApiProperty({ description: 'Model description' })
  description: string;

  @ApiProperty({ description: 'How credit is distributed' })
  creditDistribution: string;

  @ApiProperty({ description: 'Best use cases' })
  useCases: string[];
}

/**
 * Channel attribution data
 */
export class ChannelAttributionDto {
  @ApiProperty({ description: 'Channel name' })
  channel: string;

  @ApiProperty({ description: 'Number of conversions attributed' })
  conversions: number;

  @ApiProperty({ description: 'Revenue attributed to this channel' })
  revenue: number;

  @ApiProperty({ description: 'Percentage of total conversions' })
  conversionShare: number;

  @ApiProperty({ description: 'Percentage of total revenue' })
  revenueShare: number;

  @ApiProperty({ description: 'Return on ad spend (if applicable)' })
  roas?: number;

  @ApiProperty({ description: 'Cost per acquisition' })
  cpa?: number;
}

/**
 * Attribution report
 */
export class AttributionReportDto {
  @ApiProperty({ description: 'Report date range' })
  dateRange: {
    startDate: string;
    endDate: string;
  };

  @ApiProperty({ description: 'Attribution model used' })
  model: AttributionModel;

  @ApiProperty({ description: 'Conversion window in days' })
  conversionWindow: number;

  @ApiProperty({ description: 'Total conversions' })
  totalConversions: number;

  @ApiProperty({ description: 'Total revenue' })
  totalRevenue: number;

  @ApiProperty({ description: 'Attribution by channel', type: [ChannelAttributionDto] })
  byChannel: ChannelAttributionDto[];

  @ApiPropertyOptional({ description: 'Attribution by source' })
  bySource?: ChannelAttributionDto[];

  @ApiPropertyOptional({ description: 'Attribution by campaign' })
  byCampaign?: ChannelAttributionDto[];

  @ApiProperty({ description: 'Model comparison (same data with different models)' })
  modelComparison?: Record<AttributionModel, ChannelAttributionDto[]>;
}

/**
 * Single touchpoint in a journey
 */
export class TouchpointDto {
  @ApiProperty({ description: 'Touchpoint timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Channel' })
  channel: string;

  @ApiProperty({ description: 'Source' })
  source?: string;

  @ApiProperty({ description: 'Medium' })
  medium?: string;

  @ApiProperty({ description: 'Campaign' })
  campaign?: string;

  @ApiProperty({ description: 'Page URL' })
  page?: string;

  @ApiProperty({ description: 'Event type' })
  eventType: string;

  @ApiProperty({ description: 'Credit assigned (based on attribution model)' })
  credit?: number;
}

/**
 * Customer journey
 */
export class CustomerJourneyDto {
  @ApiProperty({ description: 'Journey ID' })
  journeyId: string;

  @ApiProperty({ description: 'User ID' })
  userId?: string;

  @ApiProperty({ description: 'Anonymous ID' })
  anonymousId?: string;

  @ApiProperty({ description: 'Journey start' })
  startTime: string;

  @ApiProperty({ description: 'Journey end (conversion or abandonment)' })
  endTime: string;

  @ApiProperty({ description: 'Whether the journey resulted in conversion' })
  converted: boolean;

  @ApiProperty({ description: 'Conversion value (if converted)' })
  conversionValue?: number;

  @ApiProperty({ description: 'Number of touchpoints' })
  touchpointCount: number;

  @ApiProperty({ description: 'Journey duration in seconds' })
  durationSeconds: number;

  @ApiProperty({ description: 'Touchpoints in chronological order', type: [TouchpointDto] })
  touchpoints: TouchpointDto[];
}

/**
 * Journey mapping result
 */
export class JourneyMappingDto {
  @ApiProperty({ description: 'Analysis date range' })
  dateRange: {
    startDate: string;
    endDate: string;
  };

  @ApiProperty({ description: 'Total journeys analyzed' })
  totalJourneys: number;

  @ApiProperty({ description: 'Journeys resulting in conversion' })
  convertedJourneys: number;

  @ApiProperty({ description: 'Conversion rate' })
  conversionRate: number;

  @ApiProperty({ description: 'Average touchpoints per journey' })
  avgTouchpoints: number;

  @ApiProperty({ description: 'Average journey duration (seconds)' })
  avgDuration: number;

  @ApiProperty({ description: 'Most common paths (top 10)' })
  topPaths: Array<{
    path: string[];
    count: number;
    conversionRate: number;
  }>;

  @ApiProperty({ description: 'Sample journeys', type: [CustomerJourneyDto] })
  journeys: CustomerJourneyDto[];
}

/**
 * Touchpoint analysis result
 */
export class TouchpointAnalysisDto {
  @ApiProperty({ description: 'Analysis date range' })
  dateRange: {
    startDate: string;
    endDate: string;
  };

  @ApiProperty({ description: 'Grouping dimension' })
  groupBy: string;

  @ApiProperty({ description: 'Total touchpoints' })
  totalTouchpoints: number;

  @ApiProperty({ description: 'Touchpoints by group' })
  byGroup: Array<{
    name: string;
    touchpoints: number;
    uniqueUsers: number;
    conversions: number;
    conversionRate: number;
    avgPosition: number;
  }>;

  @ApiProperty({ description: 'Position analysis (first, middle, last)' })
  byPosition: {
    first: Record<string, number>;
    middle: Record<string, number>;
    last: Record<string, number>;
  };

  @ApiProperty({ description: 'Path combinations' })
  pathCombinations: Array<{
    from: string;
    to: string;
    count: number;
    avgTimeSeconds: number;
  }>;
}
