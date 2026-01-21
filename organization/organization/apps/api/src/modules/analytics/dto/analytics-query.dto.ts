import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum TimeRange {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  CUSTOM = 'custom',
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Time range for analytics',
    enum: TimeRange,
    default: TimeRange.MONTH,
  })
  @IsOptional()
  @IsEnum(TimeRange)
  range?: TimeRange;

  @ApiPropertyOptional({
    description: 'Start date for custom range (ISO 8601)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for custom range (ISO 8601)',
    example: '2025-01-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Vendor ID for vendor-specific analytics',
  })
  @IsOptional()
  vendorId?: string;

  @ApiPropertyOptional({
    description: 'Category ID for category-specific analytics',
  })
  @IsOptional()
  categoryId?: string;
}
