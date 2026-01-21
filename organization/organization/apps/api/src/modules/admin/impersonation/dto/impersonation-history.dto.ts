import { IsOptional, IsString, IsDateString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ImpersonationMode } from './start-impersonation.dto';

export class ImpersonationHistoryQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by impersonator user ID',
    example: 'usr_12345',
  })
  @IsOptional()
  @IsString()
  impersonatorId?: string;

  @ApiPropertyOptional({
    description: 'Filter by target user ID',
    example: 'usr_67890',
  })
  @IsOptional()
  @IsString()
  targetUserId?: string;

  @ApiPropertyOptional({
    description: 'Filter by start date (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by end date (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of records per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by impersonation mode',
    enum: ImpersonationMode,
  })
  @IsOptional()
  @IsEnum(ImpersonationMode)
  mode?: ImpersonationMode;

  @ApiPropertyOptional({
    description: 'Filter by active sessions only',
    example: false,
  })
  @IsOptional()
  activeOnly?: boolean;
}

export class ImpersonationActionLogDto {
  @ApiProperty({ description: 'Action ID' })
  id: string;

  @ApiProperty({ description: 'The action performed (e.g., GET /api/orders)' })
  action: string;

  @ApiProperty({ description: 'HTTP method' })
  method: string;

  @ApiProperty({ description: 'Request path' })
  path: string;

  @ApiProperty({ description: 'Request body (sanitized)' })
  requestBody?: Record<string, any>;

  @ApiProperty({ description: 'Response status code' })
  statusCode: number;

  @ApiProperty({ description: 'Timestamp of the action' })
  timestamp: Date;

  @ApiProperty({ description: 'IP address of the request' })
  ipAddress: string;

  @ApiProperty({ description: 'User agent string' })
  userAgent?: string;
}

export class ImpersonationSessionDto {
  @ApiProperty({ description: 'Session ID' })
  id: string;

  @ApiProperty({ description: 'Impersonator user ID' })
  impersonatorId: string;

  @ApiProperty({ description: 'Impersonator name' })
  impersonatorName: string;

  @ApiProperty({ description: 'Impersonator email' })
  impersonatorEmail: string;

  @ApiProperty({ description: 'Target user ID' })
  targetUserId: string;

  @ApiProperty({ description: 'Target user name' })
  targetUserName: string;

  @ApiProperty({ description: 'Target user email' })
  targetUserEmail: string;

  @ApiProperty({ description: 'Reason for impersonation' })
  reason: string;

  @ApiPropertyOptional({ description: 'Support ticket reference' })
  ticketReference?: string;

  @ApiProperty({ description: 'Impersonation mode', enum: ImpersonationMode })
  mode: ImpersonationMode;

  @ApiProperty({ description: 'Session start time' })
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Session end time (null if still active)' })
  endedAt?: Date;

  @ApiProperty({ description: 'Session expiration time' })
  expiresAt: Date;

  @ApiProperty({ description: 'Whether the session is currently active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Notes added when ending session' })
  notes?: string;

  @ApiPropertyOptional({ description: 'Resolution status' })
  resolution?: string;

  @ApiProperty({ description: 'Number of actions performed during session' })
  actionCount: number;

  @ApiPropertyOptional({
    description: 'Actions performed during this session',
    type: [ImpersonationActionLogDto],
  })
  actions?: ImpersonationActionLogDto[];
}

export class ImpersonationHistoryResponseDto {
  @ApiProperty({ description: 'List of impersonation sessions', type: [ImpersonationSessionDto] })
  sessions: ImpersonationSessionDto[];

  @ApiProperty({ description: 'Total number of sessions matching the query' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of records per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}

export class ActiveImpersonationDto {
  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Target user ID being impersonated' })
  targetUserId: string;

  @ApiProperty({ description: 'Target user name' })
  targetUserName: string;

  @ApiProperty({ description: 'Impersonation mode', enum: ImpersonationMode })
  mode: ImpersonationMode;

  @ApiProperty({ description: 'Session start time' })
  startedAt: Date;

  @ApiProperty({ description: 'Session expiration time' })
  expiresAt: Date;

  @ApiProperty({ description: 'Time remaining in seconds' })
  timeRemainingSeconds: number;
}
