import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsDateString,
  ValidateNested,
  IsObject,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Email List DTOs
export class CreateEmailListDto {
  @ApiProperty({ description: 'List name' })
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

  @ApiPropertyOptional({ description: 'List type' })
  @IsOptional()
  @IsString()
  type?: 'marketing' | 'transactional' | 'newsletter';

  @ApiPropertyOptional({ description: 'Double opt-in required' })
  @IsOptional()
  @IsBoolean()
  doubleOptIn?: boolean;
}

export class AddSubscriberDto {
  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Custom fields' })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// Segment DTOs
export enum SegmentOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  IN = 'in',
  NOT_IN = 'not_in',
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists',
}

export class SegmentConditionDto {
  @ApiProperty({ description: 'Field to filter on' })
  @IsString()
  field: string;

  @ApiProperty({ enum: SegmentOperator })
  @IsEnum(SegmentOperator)
  operator: SegmentOperator;

  @ApiProperty({ description: 'Value to compare' })
  value: any;
}

export class CreateSegmentDto {
  @ApiProperty({ description: 'Segment name' })
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

  @ApiProperty({ description: 'Segment conditions', type: [SegmentConditionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SegmentConditionDto)
  conditions: SegmentConditionDto[];

  @ApiPropertyOptional({ description: 'Condition logic' })
  @IsOptional()
  @IsString()
  conditionLogic?: 'AND' | 'OR';
}

// Behavioral Trigger DTOs
export enum TriggerType {
  PAGE_VIEW = 'PAGE_VIEW',
  PRODUCT_VIEW = 'PRODUCT_VIEW',
  ADD_TO_CART = 'ADD_TO_CART',
  ABANDON_CART = 'ABANDON_CART',
  PURCHASE = 'PURCHASE',
  SIGNUP = 'SIGNUP',
  INACTIVITY = 'INACTIVITY',
  CUSTOM_EVENT = 'CUSTOM_EVENT',
}

export enum TriggerActionType {
  SEND_EMAIL = 'SEND_EMAIL',
  SEND_SMS = 'SEND_SMS',
  SEND_PUSH = 'SEND_PUSH',
  ADD_TAG = 'ADD_TAG',
  REMOVE_TAG = 'REMOVE_TAG',
  ADD_TO_LIST = 'ADD_TO_LIST',
  WEBHOOK = 'WEBHOOK',
}

export class TriggerActionDto {
  @ApiProperty({ enum: TriggerActionType })
  @IsEnum(TriggerActionType)
  type: TriggerActionType;

  @ApiProperty({ description: 'Action configuration' })
  @IsObject()
  config: Record<string, any>;

  @ApiPropertyOptional({ description: 'Delay in minutes' })
  @IsOptional()
  @IsNumber()
  delayMinutes?: number;
}

export class CreateTriggerDto {
  @ApiProperty({ description: 'Trigger name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ enum: TriggerType })
  @IsEnum(TriggerType)
  triggerType: TriggerType;

  @ApiPropertyOptional({ description: 'Trigger conditions' })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @ApiProperty({ description: 'Actions to execute', type: [TriggerActionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TriggerActionDto)
  actions: TriggerActionDto[];

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Drip/Nurture Flow DTOs
export class FlowStepDto {
  @ApiProperty({ description: 'Step name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: TriggerActionType })
  @IsEnum(TriggerActionType)
  actionType: TriggerActionType;

  @ApiProperty({ description: 'Step configuration' })
  @IsObject()
  config: Record<string, any>;

  @ApiProperty({ description: 'Delay after previous step (minutes)' })
  @IsNumber()
  delayMinutes: number;

  @ApiPropertyOptional({ description: 'Condition to execute' })
  @IsOptional()
  @IsObject()
  condition?: Record<string, any>;
}

export class CreateFlowDto {
  @ApiProperty({ description: 'Flow name' })
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

  @ApiProperty({ enum: TriggerType, description: 'Entry trigger' })
  @IsEnum(TriggerType)
  entryTrigger: TriggerType;

  @ApiPropertyOptional({ description: 'Entry conditions' })
  @IsOptional()
  @IsObject()
  entryConditions?: Record<string, any>;

  @ApiProperty({ description: 'Flow steps', type: [FlowStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlowStepDto)
  steps: FlowStepDto[];

  @ApiPropertyOptional({ description: 'Exit conditions' })
  @IsOptional()
  @IsObject()
  exitConditions?: Record<string, any>;
}

// Lifecycle Event DTOs
export enum LifecycleStage {
  ANONYMOUS = 'ANONYMOUS',
  LEAD = 'LEAD',
  PROSPECT = 'PROSPECT',
  CUSTOMER = 'CUSTOMER',
  REPEAT_CUSTOMER = 'REPEAT_CUSTOMER',
  CHAMPION = 'CHAMPION',
  AT_RISK = 'AT_RISK',
  CHURNED = 'CHURNED',
}

export class TrackEventDto {
  @ApiProperty({ description: 'Event name' })
  @IsString()
  event: string;

  @ApiProperty({ description: 'User ID or anonymous ID' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Event properties' })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Timestamp' })
  @IsOptional()
  @IsDateString()
  timestamp?: string;
}

export class UpdateLifecycleStageDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: LifecycleStage })
  @IsEnum(LifecycleStage)
  stage: LifecycleStage;

  @ApiPropertyOptional({ description: 'Reason for change' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class LifecycleQueryDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ enum: LifecycleStage })
  @IsOptional()
  @IsEnum(LifecycleStage)
  stage?: LifecycleStage;

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
