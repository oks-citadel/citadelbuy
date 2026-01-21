import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  IsNumber,
  IsBoolean,
  ValidateNested,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Cohort type - how users are grouped
 */
export enum CohortType {
  // Time-based cohorts
  SIGNUP_DATE = 'signup_date',
  FIRST_PURCHASE_DATE = 'first_purchase_date',
  FIRST_EVENT_DATE = 'first_event_date',

  // Behavior-based cohorts
  ACQUISITION_SOURCE = 'acquisition_source',
  ACQUISITION_CAMPAIGN = 'acquisition_campaign',
  PLAN_TYPE = 'plan_type',
  USER_SEGMENT = 'user_segment',

  // Custom cohorts
  CUSTOM = 'custom',
}

/**
 * Retention metric type
 */
export enum RetentionMetric {
  ANY_EVENT = 'any_event',
  SPECIFIC_EVENT = 'specific_event',
  PURCHASE = 'purchase',
  LOGIN = 'login',
  FEATURE_USE = 'feature_use',
}

/**
 * Cohort filter condition
 */
export class CohortFilterDto {
  @ApiProperty({ description: 'Property to filter on' })
  @IsString()
  property: string;

  @ApiProperty({
    description: 'Filter operator',
    enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'not_in'],
  })
  @IsString()
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'not_in';

  @ApiProperty({ description: 'Filter value' })
  value: any;
}

/**
 * Create cohort DTO
 */
export class CreateCohortDto {
  @ApiProperty({ description: 'Cohort name', example: 'Q1 2025 Signups' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Cohort description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'Cohort type', enum: CohortType })
  @IsEnum(CohortType)
  cohortType: CohortType;

  @ApiPropertyOptional({
    description: 'Filters to apply for custom cohorts',
    type: [CohortFilterDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CohortFilterDto)
  filters?: CohortFilterDto[];

  @ApiPropertyOptional({
    description: 'Time granularity for grouping (day, week, month)',
    default: 'week',
  })
  @IsOptional()
  @IsString()
  granularity?: 'day' | 'week' | 'month';

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;
}

/**
 * Cohort query parameters
 */
export class CohortQueryDto {
  @ApiPropertyOptional({ description: 'Cohort start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Cohort end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Number of periods to analyze',
    default: 12,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(52)
  @Type(() => Number)
  periods?: number;

  @ApiPropertyOptional({
    description: 'Period granularity',
    enum: ['day', 'week', 'month'],
    default: 'week',
  })
  @IsOptional()
  @IsString()
  granularity?: 'day' | 'week' | 'month';
}

/**
 * Retention query parameters
 */
export class RetentionQueryDto extends CohortQueryDto {
  @ApiPropertyOptional({
    description: 'What constitutes retention',
    enum: RetentionMetric,
    default: RetentionMetric.ANY_EVENT,
  })
  @IsOptional()
  @IsEnum(RetentionMetric)
  retentionMetric?: RetentionMetric;

  @ApiPropertyOptional({
    description: 'Specific event type (when retentionMetric is SPECIFIC_EVENT)',
  })
  @IsOptional()
  @IsString()
  eventType?: string;
}

/**
 * LTV query parameters
 */
export class LtvQueryDto extends CohortQueryDto {
  @ApiPropertyOptional({
    description: 'Include churn in LTV calculation',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeChurn?: boolean;

  @ApiPropertyOptional({
    description: 'Discount rate for NPV calculation (0-1)',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  discountRate?: number;
}

/**
 * Churn query parameters
 */
export class ChurnQueryDto extends CohortQueryDto {
  @ApiPropertyOptional({
    description: 'Days of inactivity to consider as churned',
    default: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  inactiveDays?: number;

  @ApiPropertyOptional({
    description: 'Include voluntary vs involuntary breakdown',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeBreakdown?: boolean;
}

/**
 * Cohort response DTO
 */
export class CohortResponseDto {
  @ApiProperty({ description: 'Cohort ID' })
  id: string;

  @ApiProperty({ description: 'Cohort name' })
  name: string;

  @ApiPropertyOptional({ description: 'Cohort description' })
  description?: string;

  @ApiProperty({ description: 'Cohort type' })
  cohortType: CohortType;

  @ApiPropertyOptional({ description: 'Filters applied' })
  filters?: CohortFilterDto[];

  @ApiProperty({ description: 'Time granularity' })
  granularity: string;

  @ApiProperty({ description: 'Whether the cohort is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;
}

/**
 * Retention cell data
 */
export class RetentionCellDto {
  @ApiProperty({ description: 'Period number (0 = signup period)' })
  period: number;

  @ApiProperty({ description: 'Number of retained users' })
  users: number;

  @ApiProperty({ description: 'Retention percentage (0-100)' })
  percentage: number;
}

/**
 * Single cohort retention data
 */
export class CohortRetentionRowDto {
  @ApiProperty({ description: 'Cohort identifier (e.g., "2025-W01")' })
  cohort: string;

  @ApiProperty({ description: 'Cohort start date' })
  startDate: string;

  @ApiProperty({ description: 'Initial cohort size' })
  cohortSize: number;

  @ApiProperty({ description: 'Retention data per period', type: [RetentionCellDto] })
  retention: RetentionCellDto[];
}

/**
 * Full retention analysis result
 */
export class RetentionAnalysisDto {
  @ApiProperty({ description: 'Analysis date range' })
  dateRange: {
    startDate: string;
    endDate: string;
  };

  @ApiProperty({ description: 'Period granularity' })
  granularity: string;

  @ApiProperty({ description: 'Number of periods analyzed' })
  periods: number;

  @ApiProperty({ description: 'Retention metric used' })
  retentionMetric: string;

  @ApiProperty({ description: 'Cohort retention data', type: [CohortRetentionRowDto] })
  cohorts: CohortRetentionRowDto[];

  @ApiProperty({ description: 'Average retention per period' })
  averageRetention: number[];
}

/**
 * LTV cohort data
 */
export class LtvCohortDto {
  @ApiProperty({ description: 'Cohort identifier' })
  cohort: string;

  @ApiProperty({ description: 'Cohort size' })
  cohortSize: number;

  @ApiProperty({ description: 'Total revenue from cohort' })
  totalRevenue: number;

  @ApiProperty({ description: 'Average revenue per user' })
  avgRevenuePerUser: number;

  @ApiProperty({ description: 'Cumulative LTV over time' })
  cumulativeLtv: number[];

  @ApiProperty({ description: 'Projected LTV' })
  projectedLtv: number;
}

/**
 * LTV analysis result
 */
export class LtvAnalysisDto {
  @ApiProperty({ description: 'Analysis date range' })
  dateRange: {
    startDate: string;
    endDate: string;
  };

  @ApiProperty({ description: 'Overall average LTV' })
  overallAvgLtv: number;

  @ApiProperty({ description: 'LTV by cohort', type: [LtvCohortDto] })
  cohorts: LtvCohortDto[];

  @ApiProperty({ description: 'LTV by acquisition source' })
  byAcquisitionSource?: Record<string, number>;

  @ApiProperty({ description: 'LTV by plan type' })
  byPlanType?: Record<string, number>;
}

/**
 * Churn cohort data
 */
export class ChurnCohortDto {
  @ApiProperty({ description: 'Cohort identifier' })
  cohort: string;

  @ApiProperty({ description: 'Initial cohort size' })
  cohortSize: number;

  @ApiProperty({ description: 'Number of churned users' })
  churned: number;

  @ApiProperty({ description: 'Churn rate (0-100)' })
  churnRate: number;

  @ApiPropertyOptional({ description: 'Voluntary churn count' })
  voluntaryChurn?: number;

  @ApiPropertyOptional({ description: 'Involuntary churn count' })
  involuntaryChurn?: number;
}

/**
 * Churn analysis result
 */
export class ChurnAnalysisDto {
  @ApiProperty({ description: 'Analysis date range' })
  dateRange: {
    startDate: string;
    endDate: string;
  };

  @ApiProperty({ description: 'Overall churn rate (0-100)' })
  overallChurnRate: number;

  @ApiProperty({ description: 'Monthly churn trend' })
  monthlyTrend: Array<{
    month: string;
    churnRate: number;
  }>;

  @ApiProperty({ description: 'Churn by cohort', type: [ChurnCohortDto] })
  cohorts: ChurnCohortDto[];

  @ApiPropertyOptional({ description: 'Top churn reasons' })
  churnReasons?: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;

  @ApiPropertyOptional({ description: 'Churn by plan type' })
  byPlanType?: Record<string, number>;
}
