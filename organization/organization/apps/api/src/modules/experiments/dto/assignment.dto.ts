import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignUserDto {
  @ApiProperty({ description: 'User ID to assign to experiment' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({
    description: 'User context for targeting evaluation',
    example: { country: 'US', plan: 'premium', signup_date: '2024-01-15' },
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Force assign to specific variant (for testing)',
  })
  @IsOptional()
  @IsUUID()
  forceVariantId?: string;
}

export class BulkAssignDto {
  @ApiProperty({ description: 'User ID to assign' })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Experiment IDs to assign user to',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  experimentIds: string[];

  @ApiPropertyOptional({ description: 'User context for targeting evaluation' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class AssignmentResponseDto {
  @ApiProperty({ description: 'Assignment ID' })
  id: string;

  @ApiProperty({ description: 'Experiment ID' })
  experimentId: string;

  @ApiProperty({ description: 'Experiment name' })
  experimentName: string;

  @ApiProperty({ description: 'Assigned variant ID' })
  variantId: string;

  @ApiProperty({ description: 'Assigned variant name' })
  variantName: string;

  @ApiProperty({ description: 'Is control variant' })
  isControl: boolean;

  @ApiPropertyOptional({ description: 'Variant payload' })
  payload?: Record<string, any>;

  @ApiProperty({ description: 'Assignment timestamp' })
  assignedAt: Date;
}

export class BulkAssignmentResponseDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Assignments made', type: [AssignmentResponseDto] })
  assignments: AssignmentResponseDto[];

  @ApiProperty({ description: 'Experiments user was not eligible for', type: [String] })
  ineligible: string[];

  @ApiProperty({ description: 'Experiments that were skipped due to errors', type: [String] })
  errors: string[];
}

export class GetAssignmentDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId: string;
}

export class UserExperimentsDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({
    description: 'Active experiment assignments',
    type: [AssignmentResponseDto],
  })
  activeExperiments: AssignmentResponseDto[];

  @ApiProperty({ description: 'Number of active experiments' })
  count: number;
}
