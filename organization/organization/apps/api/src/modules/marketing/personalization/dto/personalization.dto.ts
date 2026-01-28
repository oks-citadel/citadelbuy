import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  IsObject,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// User Profile DTOs
export class UserProfileDataDto {
  @ApiPropertyOptional({ description: 'Demographics' })
  @IsOptional()
  @IsObject()
  demographics?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Interests' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional({ description: 'Behavioral traits' })
  @IsOptional()
  @IsObject()
  behavior?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Purchase history summary' })
  @IsOptional()
  @IsObject()
  purchaseHistory?: Record<string, any>;
}

export class UpdateUserProfileDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Profile data', type: UserProfileDataDto })
  @ValidateNested()
  @Type(() => UserProfileDataDto)
  data: UserProfileDataDto;
}

export class TrackUserBehaviorDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Behavior type' })
  @IsString()
  behaviorType: string;

  @ApiPropertyOptional({ description: 'Behavior data' })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

// Next Best Action DTOs
export enum ActionType {
  SHOW_PRODUCT = 'SHOW_PRODUCT',
  SHOW_OFFER = 'SHOW_OFFER',
  SEND_EMAIL = 'SEND_EMAIL',
  SHOW_CONTENT = 'SHOW_CONTENT',
  UPSELL = 'UPSELL',
  CROSS_SELL = 'CROSS_SELL',
  RETAIN = 'RETAIN',
  REACTIVATE = 'REACTIVATE',
}

export class GetNextBestActionDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Context/location' })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({ description: 'Available action types', enum: ActionType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ActionType, { each: true })
  availableActions?: ActionType[];

  @ApiPropertyOptional({ description: 'Max actions to return' })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

// Personalization Rule DTOs
export enum RuleConditionOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  CONTAINS = 'CONTAINS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
}

export class RuleConditionDto {
  @ApiProperty({ description: 'Field to evaluate' })
  @IsString()
  field: string;

  @ApiProperty({ enum: RuleConditionOperator })
  @IsEnum(RuleConditionOperator)
  operator: RuleConditionOperator;

  @ApiProperty({ description: 'Value to compare' })
  value: any;
}

export class RuleActionDto {
  @ApiProperty({ description: 'Action type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Action parameters' })
  @IsObject()
  params: Record<string, any>;
}

export class CreatePersonalizationRuleDto {
  @ApiProperty({ description: 'Rule name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Conditions', type: [RuleConditionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionDto)
  conditions: RuleConditionDto[];

  @ApiPropertyOptional({ description: 'Condition logic' })
  @IsOptional()
  @IsString()
  conditionLogic?: 'AND' | 'OR';

  @ApiProperty({ description: 'Action to execute', type: RuleActionDto })
  @ValidateNested()
  @Type(() => RuleActionDto)
  action: RuleActionDto;

  @ApiPropertyOptional({ description: 'Priority (higher = first)' })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class EvaluateRulesDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Context for evaluation' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Specific rules to evaluate' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ruleIds?: string[];
}
