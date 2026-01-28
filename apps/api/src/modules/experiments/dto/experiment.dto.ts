import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsUUID,
  IsObject,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum ExperimentStatus {
  DRAFT = 'DRAFT',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  CONCLUDED = 'CONCLUDED',
  ARCHIVED = 'ARCHIVED',
}

export enum TargetingRuleOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  CONTAINS = 'CONTAINS',
  NOT_CONTAINS = 'NOT_CONTAINS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  REGEX = 'REGEX',
  EXISTS = 'EXISTS',
  NOT_EXISTS = 'NOT_EXISTS',
}

export class CreateVariantDto {
  @ApiProperty({ description: 'Variant name', example: 'Control' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Variant description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Weight percentage (0-100)',
    example: 50,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  weight: number;

  @ApiProperty({ description: 'Is this the control variant?', example: true })
  @IsBoolean()
  isControl: boolean;

  @ApiPropertyOptional({ description: 'Variant payload/configuration' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}

export class CreateTargetingRuleDto {
  @ApiProperty({ description: 'User attribute to target', example: 'country' })
  @IsString()
  attribute: string;

  @ApiProperty({
    description: 'Comparison operator',
    enum: TargetingRuleOperator,
    example: TargetingRuleOperator.EQUALS,
  })
  @IsEnum(TargetingRuleOperator)
  operator: TargetingRuleOperator;

  @ApiProperty({ description: 'Target value(s)', example: 'US' })
  value: any;

  @ApiPropertyOptional({ description: 'Rule priority (higher = evaluated first)', example: 0 })
  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class CreateMetricDto {
  @ApiProperty({ description: 'Metric key identifier', example: 'conversion_rate' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Metric display name', example: 'Conversion Rate' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Metric description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Event name to track', example: 'purchase' })
  @IsString()
  eventName: string;

  @ApiPropertyOptional({
    description: 'Aggregation type',
    example: 'conversion_rate',
    enum: ['count', 'sum', 'average', 'min', 'max', 'conversion_rate'],
  })
  @IsOptional()
  @IsString()
  aggregationType?: string;

  @ApiPropertyOptional({ description: 'Minimum sample size for significance', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  minimumSampleSize?: number;

  @ApiPropertyOptional({ description: 'Confidence level (0-1)', example: 0.95 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceLevel?: number;
}

export class CreateExperimentDto {
  @ApiProperty({ description: 'Experiment name', example: 'Homepage CTA Test' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Experiment description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Hypothesis being tested',
    example: 'Changing the CTA button color to green will increase conversions by 10%',
  })
  @IsOptional()
  @IsString()
  hypothesis?: string;

  @ApiPropertyOptional({
    description: 'Percentage of traffic to include (0-100)',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  trafficAllocation?: number;

  @ApiPropertyOptional({ description: 'Prevent user from being in other experiments' })
  @IsOptional()
  @IsBoolean()
  isExclusive?: boolean;

  @ApiPropertyOptional({ description: 'Mutual exclusion group ID' })
  @IsOptional()
  @IsUUID()
  mutualExclusionGroupId?: string;

  @ApiProperty({
    description: 'Experiment variants (min 2 required)',
    type: [CreateVariantDto],
  })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];

  @ApiPropertyOptional({
    description: 'Targeting rules for experiment eligibility',
    type: [CreateTargetingRuleDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTargetingRuleDto)
  targetingRules?: CreateTargetingRuleDto[];

  @ApiPropertyOptional({
    description: 'Metrics to track',
    type: [CreateMetricDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMetricDto)
  metrics?: CreateMetricDto[];

  @ApiPropertyOptional({ description: 'Primary metric key' })
  @IsOptional()
  @IsString()
  primaryMetric?: string;
}

export class UpdateExperimentDto extends PartialType(CreateExperimentDto) {}

export class ExperimentQueryDto {
  @ApiPropertyOptional({ enum: ExperimentStatus })
  @IsOptional()
  @IsEnum(ExperimentStatus)
  status?: ExperimentStatus;

  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class ConcludeExperimentDto {
  @ApiProperty({ description: 'ID of the winning variant' })
  @IsUUID()
  winnerVariantId: string;

  @ApiPropertyOptional({ description: 'Conclusion notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ExperimentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  hypothesis?: string;

  @ApiProperty({ enum: ExperimentStatus })
  status: ExperimentStatus;

  @ApiProperty()
  trafficAllocation: number;

  @ApiProperty()
  isExclusive: boolean;

  @ApiPropertyOptional()
  mutualExclusionGroupId?: string;

  @ApiPropertyOptional()
  primaryMetric?: string;

  @ApiPropertyOptional()
  startedAt?: Date;

  @ApiPropertyOptional()
  concludedAt?: Date;

  @ApiPropertyOptional()
  winnerVariantId?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [Object] })
  variants: any[];

  @ApiPropertyOptional({ type: [Object] })
  targetingRules?: any[];

  @ApiPropertyOptional({ type: [Object] })
  metrics?: any[];
}

export class MutualExclusionGroupDto {
  @ApiProperty({ description: 'Group name', example: 'Checkout Flow Experiments' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Group description' })
  @IsOptional()
  @IsString()
  description?: string;
}
