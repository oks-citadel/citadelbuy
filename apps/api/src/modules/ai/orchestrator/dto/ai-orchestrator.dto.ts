/**
 * AI Orchestrator DTOs
 */

import { IsString, IsObject, IsOptional, IsArray, ValidateNested, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AIWorkflow, AIServiceType, ExecutionOptions } from '../ai-orchestrator.interface';

export class ExecutionOptionsDto implements ExecutionOptions {
  @ApiPropertyOptional({ description: 'Run in dry-run mode without side effects' })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiPropertyOptional({ description: 'Execution timeout in milliseconds' })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @ApiPropertyOptional({ description: 'Execution priority', enum: ['low', 'normal', 'high'] })
  @IsOptional()
  @IsString()
  priority?: 'low' | 'normal' | 'high';

  @ApiPropertyOptional({ description: 'Execute asynchronously' })
  @IsOptional()
  @IsBoolean()
  async?: boolean;

  @ApiPropertyOptional({ description: 'Webhook URL for completion notification' })
  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @ApiPropertyOptional({ description: 'Feature flag context for gated workflows' })
  @IsOptional()
  @IsObject()
  featureFlagContext?: Record<string, unknown>;
}

export class ExecuteWorkflowDto {
  @ApiProperty({ description: 'Workflow input data' })
  @IsObject()
  input: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Execution options' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExecutionOptionsDto)
  options?: ExecutionOptionsDto;
}

export class ParallelTaskDto {
  @ApiProperty({ description: 'AI service type' })
  @IsString()
  service: AIServiceType;

  @ApiProperty({ description: 'Action to execute on the service' })
  @IsString()
  action: string;

  @ApiProperty({ description: 'Input for the action' })
  @IsObject()
  input: Record<string, unknown>;
}

export class ParallelExecutionDto {
  @ApiProperty({ description: 'Tasks to execute in parallel', type: [ParallelTaskDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParallelTaskDto)
  tasks: ParallelTaskDto[];
}

export class ChainStepDto {
  @ApiProperty({ description: 'AI service type' })
  @IsString()
  service: AIServiceType;

  @ApiProperty({ description: 'Action to execute on the service' })
  @IsString()
  action: string;
}

export class ChainExecutionDto {
  @ApiProperty({ description: 'Steps to execute in sequence', type: [ChainStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChainStepDto)
  steps: ChainStepDto[];

  @ApiProperty({ description: 'Initial input for the chain' })
  @IsObject()
  initialInput: Record<string, unknown>;
}

export class RegisterWorkflowDto {
  @ApiProperty({ description: 'Workflow definition' })
  @IsObject()
  workflow: AIWorkflow;
}
