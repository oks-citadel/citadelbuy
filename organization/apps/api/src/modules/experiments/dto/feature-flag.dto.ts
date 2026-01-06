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
  IsObject,
  Matches,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { TargetingRuleOperator } from './experiment.dto';

export enum FeatureFlagType {
  BOOLEAN = 'BOOLEAN',
  PERCENTAGE = 'PERCENTAGE',
  SEGMENT = 'SEGMENT',
  ENVIRONMENT = 'ENVIRONMENT',
}

export class CreateFlagRuleDto {
  @ApiProperty({ description: 'User attribute to target', example: 'country' })
  @IsString()
  attribute: string;

  @ApiProperty({
    description: 'Comparison operator',
    enum: TargetingRuleOperator,
  })
  @IsEnum(TargetingRuleOperator)
  operator: TargetingRuleOperator;

  @ApiProperty({ description: 'Target value(s)', example: 'US' })
  value: any;

  @ApiPropertyOptional({ description: 'Rule priority', example: 0 })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ description: 'Is rule enabled', example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Value to return when rule matches', example: true })
  @IsOptional()
  returnValue?: any;
}

export class CreateFlagSegmentDto {
  @ApiProperty({ description: 'Segment ID to target' })
  @IsString()
  segmentId: string;

  @ApiPropertyOptional({ description: 'Is segment enabled', example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Value to return for segment', example: true })
  @IsOptional()
  returnValue?: any;
}

export class CreateFeatureFlagDto {
  @ApiProperty({
    description: 'Unique flag key (lowercase, dashes allowed)',
    example: 'new-checkout-flow',
  })
  @IsString()
  @Matches(/^[a-z][a-z0-9-]*$/, {
    message: 'Key must start with lowercase letter and contain only lowercase letters, numbers, and dashes',
  })
  key: string;

  @ApiProperty({ description: 'Flag display name', example: 'New Checkout Flow' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Flag description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Flag type',
    enum: FeatureFlagType,
    example: FeatureFlagType.BOOLEAN,
  })
  @IsEnum(FeatureFlagType)
  type: FeatureFlagType;

  @ApiPropertyOptional({ description: 'Is flag enabled globally', example: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Default value when no rules match', example: false })
  @IsOptional()
  defaultValue?: any;

  @ApiPropertyOptional({
    description: 'Percentage of users to enable (for PERCENTAGE type)',
    example: 50,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentageEnabled?: number;

  @ApiPropertyOptional({
    description: 'Environment-specific settings',
    example: { production: false, staging: true, development: true },
  })
  @IsOptional()
  @IsObject()
  environments?: Record<string, boolean>;

  @ApiPropertyOptional({ description: 'Targeting rules', type: [CreateFlagRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFlagRuleDto)
  rules?: CreateFlagRuleDto[];

  @ApiPropertyOptional({ description: 'Segment targeting', type: [CreateFlagSegmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFlagSegmentDto)
  segments?: CreateFlagSegmentDto[];
}

export class UpdateFeatureFlagDto extends PartialType(CreateFeatureFlagDto) {}

export class EvaluateFlagDto {
  @ApiProperty({ description: 'User ID to evaluate flag for' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({
    description: 'User context for targeting evaluation',
    example: { country: 'US', plan: 'premium' },
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Environment to evaluate in', example: 'production' })
  @IsOptional()
  @IsString()
  environment?: string;
}

export class BulkEvaluateFlagsDto {
  @ApiProperty({ description: 'User ID to evaluate flags for' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({
    description: 'Specific flag keys to evaluate (empty = all enabled flags)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  flagKeys?: string[];

  @ApiPropertyOptional({ description: 'User context for targeting evaluation' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Environment to evaluate in', example: 'production' })
  @IsOptional()
  @IsString()
  environment?: string;
}

export class FlagEvaluationResponseDto {
  @ApiProperty({ description: 'Flag key' })
  key: string;

  @ApiProperty({ description: 'Evaluated value' })
  value: any;

  @ApiProperty({ description: 'Reason for the evaluation result' })
  reason: string;

  @ApiPropertyOptional({ description: 'Matched rule ID if applicable' })
  matchedRuleId?: string;

  @ApiProperty({ description: 'Evaluation timestamp' })
  evaluatedAt: Date;
}

export class BulkFlagEvaluationResponseDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({
    description: 'Flag evaluations',
    type: 'object',
    additionalProperties: { type: 'object' },
  })
  flags: Record<string, FlagEvaluationResponseDto>;

  @ApiProperty({ description: 'Number of flags evaluated' })
  count: number;
}

export class FeatureFlagQueryDto {
  @ApiPropertyOptional({ enum: FeatureFlagType })
  @IsOptional()
  @IsEnum(FeatureFlagType)
  type?: FeatureFlagType;

  @ApiPropertyOptional({ description: 'Filter by enabled status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Search by key or name' })
  @IsOptional()
  @IsString()
  search?: string;

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
}

export class FeatureFlagResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: FeatureFlagType })
  type: FeatureFlagType;

  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  defaultValue: any;

  @ApiPropertyOptional()
  percentageEnabled?: number;

  @ApiPropertyOptional()
  environments?: Record<string, boolean>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: [Object] })
  rules?: any[];

  @ApiPropertyOptional({ type: [Object] })
  segments?: any[];
}
