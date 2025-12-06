import { IsString, IsArray, IsOptional, IsBoolean, IsObject, IsNumber, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a state transition
 */
export class StateTransitionDto {
  @ApiProperty({
    description: 'Source state(s) for the transition',
    example: 'PENDING',
    oneOf: [
      { type: 'string' },
      { type: 'array', items: { type: 'string' } }
    ]
  })
  @IsString({ each: true })
  from: string | string[];

  @ApiProperty({
    description: 'Target state for the transition',
    example: 'PROCESSING'
  })
  @IsString()
  to: string;

  @ApiProperty({
    description: 'Event that triggers the transition',
    example: 'start_processing'
  })
  @IsString()
  event: string;

  @ApiPropertyOptional({
    description: 'Metadata for the transition',
    example: { requiresApproval: true }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for creating a workflow
 */
export class CreateWorkflowDto {
  @ApiProperty({
    description: 'Unique name for the workflow',
    example: 'order-processing'
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Type of entity this workflow manages',
    example: 'order'
  })
  @IsString()
  entityType: string;

  @ApiProperty({
    description: 'Initial state of the workflow',
    example: 'PENDING'
  })
  @IsString()
  initialState: string;

  @ApiProperty({
    description: 'List of all possible states',
    example: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  states: string[];

  @ApiProperty({
    description: 'State transitions',
    type: [StateTransitionDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StateTransitionDto)
  transitions: StateTransitionDto[];

  @ApiPropertyOptional({
    description: 'Workflow metadata',
    example: { department: 'sales', version: '1.0' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for creating a workflow instance
 */
export class CreateWorkflowInstanceDto {
  @ApiProperty({
    description: 'Workflow name',
    example: 'order-processing'
  })
  @IsString()
  workflowName: string;

  @ApiProperty({
    description: 'Entity ID to track',
    example: 'order-123'
  })
  @IsString()
  entityId: string;

  @ApiPropertyOptional({
    description: 'Initial data for the instance',
    example: { customerId: 'user-456', priority: 'high' }
  })
  @IsOptional()
  @IsObject()
  initialData?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'User ID who created the instance'
  })
  @IsOptional()
  @IsString()
  userId?: string;
}

/**
 * DTO for executing a state transition
 */
export class ExecuteTransitionDto {
  @ApiProperty({
    description: 'Event to trigger',
    example: 'start_processing'
  })
  @IsString()
  event: string;

  @ApiPropertyOptional({
    description: 'User ID executing the transition'
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Additional data for the transition',
    example: { notes: 'Rush order' }
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Force transition even if guards fail',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

/**
 * DTO for rule condition
 */
export class RuleConditionDto {
  @ApiProperty({
    description: 'Field to evaluate',
    example: 'order.total'
  })
  @IsString()
  field: string;

  @ApiProperty({
    description: 'Comparison operator',
    enum: [
      'equals',
      'not_equals',
      'greater_than',
      'greater_than_or_equal',
      'less_than',
      'less_than_or_equal',
      'contains',
      'not_contains',
      'starts_with',
      'ends_with',
      'in',
      'not_in',
      'is_null',
      'is_not_null',
      'between',
      'regex'
    ],
    example: 'greater_than'
  })
  @IsString()
  operator: string;

  @ApiProperty({
    description: 'Value to compare against',
    example: 1000
  })
  value: any;

  @ApiPropertyOptional({
    description: 'Data type of the field',
    enum: ['string', 'number', 'boolean', 'date', 'array']
  })
  @IsOptional()
  @IsString()
  type?: 'string' | 'number' | 'boolean' | 'date' | 'array';
}

/**
 * DTO for condition group
 */
export class ConditionGroupDto {
  @ApiProperty({
    description: 'Logical operator',
    enum: ['AND', 'OR'],
    example: 'AND'
  })
  @IsEnum(['AND', 'OR'])
  operator: 'AND' | 'OR';

  @ApiProperty({
    description: 'List of conditions',
    type: [RuleConditionDto],
    example: [
      { field: 'total', operator: 'greater_than', value: 1000 },
      { field: 'status', operator: 'equals', value: 'PENDING' }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionDto)
  conditions: RuleConditionDto[];
}

/**
 * DTO for rule action
 */
export class RuleActionDto {
  @ApiProperty({
    description: 'Action type',
    example: 'send_email'
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Action parameters',
    example: { template: 'high-value-order', recipient: 'sales@example.com' }
  })
  @IsObject()
  params: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Execute action asynchronously',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  async?: boolean;
}

/**
 * DTO for rule trigger
 */
export class RuleTriggerDto {
  @ApiProperty({
    description: 'Trigger type',
    enum: ['event', 'schedule', 'webhook'],
    example: 'event'
  })
  @IsEnum(['event', 'schedule', 'webhook'])
  type: 'event' | 'schedule' | 'webhook';

  @ApiPropertyOptional({
    description: 'Event name (for event triggers)',
    example: 'order.created'
  })
  @IsOptional()
  @IsString()
  event?: string;

  @ApiPropertyOptional({
    description: 'Cron expression (for schedule triggers)',
    example: '0 0 * * *'
  })
  @IsOptional()
  @IsString()
  schedule?: string;

  @ApiPropertyOptional({
    description: 'Webhook path (for webhook triggers)',
    example: '/webhooks/automation/rule-123'
  })
  @IsOptional()
  @IsString()
  webhookPath?: string;
}

/**
 * DTO for creating an automation rule
 */
export class CreateAutomationRuleDto {
  @ApiProperty({
    description: 'Rule name',
    example: 'High-value order notification'
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Rule description',
    example: 'Send notification when order total exceeds $1000'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Whether the rule is enabled',
    default: true
  })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    description: 'Rule priority (higher = executes first)',
    example: 10,
    default: 0
  })
  @IsNumber()
  priority: number;

  @ApiProperty({
    description: 'Rule trigger',
    type: RuleTriggerDto
  })
  @ValidateNested()
  @Type(() => RuleTriggerDto)
  trigger: RuleTriggerDto;

  @ApiProperty({
    description: 'Rule conditions',
    type: ConditionGroupDto
  })
  @ValidateNested()
  @Type(() => ConditionGroupDto)
  conditions: ConditionGroupDto;

  @ApiProperty({
    description: 'Actions to execute when rule matches',
    type: [RuleActionDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleActionDto)
  actions: RuleActionDto[];

  @ApiPropertyOptional({
    description: 'Rule metadata',
    example: { department: 'sales', category: 'notifications' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'User ID who created the rule'
  })
  @IsOptional()
  @IsString()
  createdBy?: string;
}

/**
 * DTO for updating an automation rule
 */
export class UpdateAutomationRuleDto {
  @ApiPropertyOptional({
    description: 'Rule name'
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Rule description'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the rule is enabled'
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Rule priority'
  })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({
    description: 'Rule trigger',
    type: RuleTriggerDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RuleTriggerDto)
  trigger?: RuleTriggerDto;

  @ApiPropertyOptional({
    description: 'Rule conditions',
    type: ConditionGroupDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConditionGroupDto)
  conditions?: ConditionGroupDto;

  @ApiPropertyOptional({
    description: 'Actions to execute',
    type: [RuleActionDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleActionDto)
  actions?: RuleActionDto[];

  @ApiPropertyOptional({
    description: 'Rule metadata'
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for testing a rule
 */
export class TestRuleDto {
  @ApiProperty({
    description: 'Sample payload to test against',
    example: {
      order: {
        id: 'order-123',
        total: 1500,
        status: 'PENDING'
      }
    }
  })
  @IsObject()
  samplePayload: any;
}
