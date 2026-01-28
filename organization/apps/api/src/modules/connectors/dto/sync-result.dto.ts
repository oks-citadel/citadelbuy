/**
 * Sync Result DTOs
 *
 * DTOs for sync operation results and status tracking.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsDate,
  IsNumber,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * Sync status enum
 */
export enum SyncStatusEnum {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  PARTIAL = 'PARTIAL',
}

/**
 * Sync type enum
 */
export enum SyncTypeEnum {
  FULL = 'FULL',
  DELTA = 'DELTA',
  MANUAL = 'MANUAL',
  WEBHOOK = 'WEBHOOK',
  SCHEDULED = 'SCHEDULED',
}

/**
 * Sync error DTO
 */
export class SyncErrorDto {
  @ApiPropertyOptional({ description: 'External ID of the failed product' })
  externalId?: string;

  @ApiPropertyOptional({ description: 'Field that caused the error' })
  field?: string;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiProperty({ description: 'Error code' })
  code: string;

  @ApiPropertyOptional({ description: 'Additional error data' })
  data?: any;
}

/**
 * Sync warning DTO
 */
export class SyncWarningDto {
  @ApiPropertyOptional({ description: 'External ID of the product with warning' })
  externalId?: string;

  @ApiPropertyOptional({ description: 'Field with warning' })
  field?: string;

  @ApiProperty({ description: 'Warning message' })
  message: string;

  @ApiProperty({ description: 'Warning code' })
  code: string;
}

/**
 * Sync summary DTO
 */
export class SyncSummaryDto {
  @ApiProperty({ description: 'Total products processed' })
  totalProcessed: number;

  @ApiProperty({ description: 'Number of products created' })
  created: number;

  @ApiProperty({ description: 'Number of products updated' })
  updated: number;

  @ApiProperty({ description: 'Number of products deleted' })
  deleted: number;

  @ApiProperty({ description: 'Number of products skipped' })
  skipped: number;

  @ApiProperty({ description: 'Number of products failed' })
  failed: number;
}

/**
 * Sync result DTO
 */
export class SyncResultDto {
  @ApiProperty({ description: 'Whether the sync completed successfully' })
  success: boolean;

  @ApiProperty({ description: 'Connector ID' })
  connectorId: string;

  @ApiProperty({ description: 'Sync start time' })
  startedAt: Date;

  @ApiProperty({ description: 'Sync completion time' })
  completedAt: Date;

  @ApiProperty({ description: 'Sync summary', type: SyncSummaryDto })
  @ValidateNested()
  @Type(() => SyncSummaryDto)
  summary: SyncSummaryDto;

  @ApiProperty({ description: 'Sync errors', type: [SyncErrorDto] })
  @ValidateNested({ each: true })
  @Type(() => SyncErrorDto)
  errors: SyncErrorDto[];

  @ApiProperty({ description: 'Sync warnings', type: [SyncWarningDto] })
  @ValidateNested({ each: true })
  @Type(() => SyncWarningDto)
  warnings: SyncWarningDto[];
}

/**
 * Trigger sync request DTO
 */
export class TriggerSyncDto {
  @ApiPropertyOptional({ enum: SyncTypeEnum, description: 'Type of sync to perform', default: SyncTypeEnum.FULL })
  @IsEnum(SyncTypeEnum)
  @IsOptional()
  type?: SyncTypeEnum = SyncTypeEnum.FULL;

  @ApiPropertyOptional({ description: 'Sync changes since this date (for delta sync)' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  since?: Date;

  @ApiPropertyOptional({ description: 'Specific external IDs to sync' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  externalIds?: string[];

  @ApiPropertyOptional({ description: 'Force sync even if recently synced', default: false })
  @IsBoolean()
  @IsOptional()
  force?: boolean = false;

  @ApiPropertyOptional({ description: 'Dry run (no actual changes)', default: false })
  @IsBoolean()
  @IsOptional()
  dryRun?: boolean = false;
}

/**
 * Sync status response DTO
 */
export class SyncStatusResponseDto {
  @ApiProperty({ description: 'Sync job ID' })
  jobId: string;

  @ApiProperty({ description: 'Connector ID' })
  connectorId: string;

  @ApiProperty({ enum: SyncStatusEnum, description: 'Current sync status' })
  status: SyncStatusEnum;

  @ApiProperty({ enum: SyncTypeEnum, description: 'Type of sync' })
  type: SyncTypeEnum;

  @ApiProperty({ description: 'Sync start time' })
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Sync completion time' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Current progress (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @ApiPropertyOptional({ description: 'Total items to process' })
  totalItems?: number;

  @ApiPropertyOptional({ description: 'Items processed so far' })
  processedItems?: number;

  @ApiPropertyOptional({ description: 'Current sync phase' })
  phase?: string;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  errorMessage?: string;

  @ApiPropertyOptional({ description: 'Final sync result', type: SyncResultDto })
  @ValidateNested()
  @Type(() => SyncResultDto)
  result?: SyncResultDto;
}

/**
 * Sync history query DTO
 */
export class SyncHistoryQueryDto {
  @ApiPropertyOptional({ enum: SyncStatusEnum, description: 'Filter by status' })
  @IsEnum(SyncStatusEnum)
  @IsOptional()
  status?: SyncStatusEnum;

  @ApiPropertyOptional({ enum: SyncTypeEnum, description: 'Filter by sync type' })
  @IsEnum(SyncTypeEnum)
  @IsOptional()
  type?: SyncTypeEnum;

  @ApiPropertyOptional({ description: 'Filter by start date (from)' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startFrom?: Date;

  @ApiPropertyOptional({ description: 'Filter by start date (to)' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startTo?: Date;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}

/**
 * Sync history item DTO
 */
export class SyncHistoryItemDto {
  @ApiProperty({ description: 'Sync job ID' })
  id: string;

  @ApiProperty({ description: 'Connector ID' })
  connectorId: string;

  @ApiProperty({ enum: SyncTypeEnum, description: 'Type of sync' })
  type: SyncTypeEnum;

  @ApiProperty({ enum: SyncStatusEnum, description: 'Final status' })
  status: SyncStatusEnum;

  @ApiProperty({ description: 'Sync start time' })
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Sync completion time' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Duration in milliseconds' })
  durationMs?: number;

  @ApiPropertyOptional({ description: 'Sync summary', type: SyncSummaryDto })
  @ValidateNested()
  @Type(() => SyncSummaryDto)
  summary?: SyncSummaryDto;

  @ApiPropertyOptional({ description: 'Number of errors' })
  errorCount?: number;

  @ApiPropertyOptional({ description: 'Number of warnings' })
  warningCount?: number;

  @ApiPropertyOptional({ description: 'Triggered by' })
  triggeredBy?: string;
}

/**
 * Sync history response DTO
 */
export class SyncHistoryResponseDto {
  @ApiProperty({ description: 'Sync history items', type: [SyncHistoryItemDto] })
  @ValidateNested({ each: true })
  @Type(() => SyncHistoryItemDto)
  items: SyncHistoryItemDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total pages' })
  totalPages: number;
}

/**
 * Product source mapping DTO
 */
export class ProductSourceDto {
  @ApiProperty({ description: 'Product source mapping ID' })
  id: string;

  @ApiProperty({ description: 'Internal product ID' })
  productId: string;

  @ApiProperty({ description: 'Connector ID' })
  connectorId: string;

  @ApiProperty({ description: 'External product ID in source system' })
  externalId: string;

  @ApiProperty({ description: 'Last sync timestamp' })
  lastSyncAt: Date;

  @ApiProperty({ enum: ['SYNCED', 'PENDING', 'FAILED', 'CONFLICT'], description: 'Sync status' })
  syncStatus: 'SYNCED' | 'PENDING' | 'FAILED' | 'CONFLICT';
}

/**
 * Conflict resolution DTO
 */
export class ConflictResolutionDto {
  @ApiProperty({ description: 'Product source ID' })
  @IsUUID()
  productSourceId: string;

  @ApiProperty({
    enum: ['USE_LOCAL', 'USE_REMOTE', 'MERGE', 'SKIP'],
    description: 'Resolution strategy',
  })
  @IsEnum(['USE_LOCAL', 'USE_REMOTE', 'MERGE', 'SKIP'])
  strategy: 'USE_LOCAL' | 'USE_REMOTE' | 'MERGE' | 'SKIP';

  @ApiPropertyOptional({ description: 'Custom merge data (for MERGE strategy)' })
  @IsOptional()
  mergeData?: Record<string, any>;
}

/**
 * Bulk conflict resolution DTO
 */
export class BulkConflictResolutionDto {
  @ApiProperty({ description: 'Conflict resolutions', type: [ConflictResolutionDto] })
  @ValidateNested({ each: true })
  @Type(() => ConflictResolutionDto)
  @IsArray()
  resolutions: ConflictResolutionDto[];
}

/**
 * Sync progress event DTO (for real-time updates)
 */
export class SyncProgressEventDto {
  @ApiProperty({ description: 'Sync job ID' })
  jobId: string;

  @ApiProperty({ description: 'Connector ID' })
  connectorId: string;

  @ApiProperty({ enum: SyncStatusEnum, description: 'Current status' })
  status: SyncStatusEnum;

  @ApiProperty({ description: 'Progress percentage (0-100)' })
  progress: number;

  @ApiProperty({ description: 'Total items' })
  totalItems: number;

  @ApiProperty({ description: 'Processed items' })
  processedItems: number;

  @ApiPropertyOptional({ description: 'Current phase' })
  phase?: string;

  @ApiPropertyOptional({ description: 'Current item being processed' })
  currentItem?: string;

  @ApiPropertyOptional({ description: 'Errors so far' })
  errorCount?: number;

  @ApiPropertyOptional({ description: 'Warnings so far' })
  warningCount?: number;

  @ApiProperty({ description: 'Event timestamp' })
  timestamp: Date;
}
