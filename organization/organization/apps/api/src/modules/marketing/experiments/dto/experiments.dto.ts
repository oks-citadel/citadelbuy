import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  IsDateString,
  IsBoolean,
  ValidateNested,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// A/B Test DTOs
export enum ExperimentStatus {
  DRAFT = 'DRAFT',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum ExperimentType {
  AB_TEST = 'AB_TEST',
  MULTIVARIATE = 'MULTIVARIATE',
  SPLIT_URL = 'SPLIT_URL',
  FEATURE_FLAG = 'FEATURE_FLAG',
}

export class ExperimentVariantDto {
  @ApiProperty({ description: 'Variant name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Traffic allocation (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  allocation: number;

  @ApiPropertyOptional({ description: 'Variant configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Is control variant' })
  @IsOptional()
  @IsBoolean()
  isControl?: boolean;
}

export class CreateExperimentDto {
  @ApiProperty({ description: 'Experiment name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ enum: ExperimentType })
  @IsEnum(ExperimentType)
  type: ExperimentType;

  @ApiProperty({ description: 'Variants', type: [ExperimentVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperimentVariantDto)
  variants: ExperimentVariantDto[];

  @ApiProperty({ description: 'Primary metric to track' })
  @IsString()
  primaryMetric: string;

  @ApiPropertyOptional({ description: 'Secondary metrics' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondaryMetrics?: string[];

  @ApiPropertyOptional({ description: 'Target sample size per variant' })
  @IsOptional()
  @IsNumber()
  targetSampleSize?: number;

  @ApiPropertyOptional({ description: 'Minimum detectable effect (%)' })
  @IsOptional()
  @IsNumber()
  minDetectableEffect?: number;

  @ApiPropertyOptional({ description: 'Targeting conditions' })
  @IsOptional()
  @IsObject()
  targeting?: Record<string, any>;
}

export class UpdateExperimentDto {
  @ApiPropertyOptional({ description: 'Experiment name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ExperimentStatus })
  @IsOptional()
  @IsEnum(ExperimentStatus)
  status?: ExperimentStatus;

  @ApiPropertyOptional({ description: 'Targeting conditions' })
  @IsOptional()
  @IsObject()
  targeting?: Record<string, any>;
}

// Feature Flag DTOs
export class CreateFeatureFlagDto {
  @ApiProperty({ description: 'Flag key' })
  @IsString()
  key: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Default value' })
  @IsOptional()
  @IsBoolean()
  defaultValue?: boolean;

  @ApiPropertyOptional({ description: 'Rollout percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @ApiPropertyOptional({ description: 'Targeting rules' })
  @IsOptional()
  @IsArray()
  targetingRules?: Array<{
    conditions: Record<string, any>;
    value: boolean;
  }>;
}

export class UpdateFeatureFlagDto {
  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Is enabled' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Default value' })
  @IsOptional()
  @IsBoolean()
  defaultValue?: boolean;

  @ApiPropertyOptional({ description: 'Rollout percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @ApiPropertyOptional({ description: 'Targeting rules' })
  @IsOptional()
  @IsArray()
  targetingRules?: Array<{
    conditions: Record<string, any>;
    value: boolean;
  }>;
}

// Assignment DTOs
export class GetAssignmentDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Experiment or flag key' })
  @IsString()
  key: string;

  @ApiPropertyOptional({ description: 'User attributes for targeting' })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;
}

export class TrackConversionDto {
  @ApiProperty({ description: 'Experiment ID' })
  @IsString()
  experimentId: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Metric name' })
  @IsString()
  metric: string;

  @ApiPropertyOptional({ description: 'Metric value' })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ description: 'Variant ID (auto-detected if not provided)' })
  @IsOptional()
  @IsString()
  variantId?: string;
}

// Analysis DTOs
export class AnalysisQueryDto {
  @ApiProperty({ description: 'Experiment ID' })
  @IsString()
  experimentId: string;

  @ApiPropertyOptional({ description: 'Confidence level (default 95)' })
  @IsOptional()
  @IsNumber()
  @Min(80)
  @Max(99)
  @Type(() => Number)
  confidenceLevel?: number;
}

export class ExperimentQueryDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ enum: ExperimentStatus })
  @IsOptional()
  @IsEnum(ExperimentStatus)
  status?: ExperimentStatus;

  @ApiPropertyOptional({ enum: ExperimentType })
  @IsOptional()
  @IsEnum(ExperimentType)
  type?: ExperimentType;

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
