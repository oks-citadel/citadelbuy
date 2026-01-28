import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsDate,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum RedirectType {
  PERMANENT = '301',
  TEMPORARY = '302',
  SEE_OTHER = '303',
  TEMPORARY_REDIRECT = '307',
  PERMANENT_REDIRECT = '308',
}

export enum RedirectStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
  EXPIRED = 'expired',
}

export class RedirectDto {
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @ApiProperty({ description: 'Source URL or pattern' })
  source: string;

  @ApiProperty({ description: 'Destination URL' })
  destination: string;

  @ApiProperty({ description: 'Redirect type/status code', enum: RedirectType })
  type: RedirectType;

  @ApiProperty({ description: 'Whether source is a regex pattern', default: false })
  isRegex: boolean;

  @ApiProperty({ description: 'Preserve query string in redirect', default: true })
  preserveQueryString: boolean;

  @ApiProperty({ description: 'Number of times this redirect was triggered', default: 0 })
  hitCount: number;

  @ApiProperty({ description: 'Redirect status', enum: RedirectStatus })
  status: RedirectStatus;

  @ApiPropertyOptional({ description: 'Expiration date' })
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Notes or description' })
  notes?: string;

  @ApiProperty({ description: 'Created date' })
  createdAt: string;

  @ApiProperty({ description: 'Updated date' })
  updatedAt: string;
}

export class CreateRedirectDto {
  @ApiProperty({ description: 'Source URL or pattern', example: '/old-page' })
  @IsString()
  source: string;

  @ApiProperty({ description: 'Destination URL', example: '/new-page' })
  @IsString()
  destination: string;

  @ApiProperty({ description: 'Redirect type', enum: RedirectType, default: RedirectType.PERMANENT })
  @IsEnum(RedirectType)
  type: RedirectType;

  @ApiPropertyOptional({ description: 'Whether source is a regex pattern', default: false })
  @IsOptional()
  @IsBoolean()
  isRegex?: boolean;

  @ApiPropertyOptional({ description: 'Preserve query string in redirect', default: true })
  @IsOptional()
  @IsBoolean()
  preserveQueryString?: boolean;

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Notes or description' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRedirectDto {
  @ApiPropertyOptional({ description: 'Source URL or pattern' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Destination URL' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ description: 'Redirect type', enum: RedirectType })
  @IsOptional()
  @IsEnum(RedirectType)
  type?: RedirectType;

  @ApiPropertyOptional({ description: 'Whether source is a regex pattern' })
  @IsOptional()
  @IsBoolean()
  isRegex?: boolean;

  @ApiPropertyOptional({ description: 'Preserve query string in redirect' })
  @IsOptional()
  @IsBoolean()
  preserveQueryString?: boolean;

  @ApiPropertyOptional({ description: 'Redirect status', enum: RedirectStatus })
  @IsOptional()
  @IsEnum(RedirectStatus)
  status?: RedirectStatus;

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Notes or description' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RedirectQueryDto {
  @ApiPropertyOptional({ description: 'Search by source or destination' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: RedirectStatus })
  @IsOptional()
  @IsEnum(RedirectStatus)
  status?: RedirectStatus;

  @ApiPropertyOptional({ description: 'Filter by type', enum: RedirectType })
  @IsOptional()
  @IsEnum(RedirectType)
  type?: RedirectType;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class RedirectBulkItemDto {
  @ApiProperty({ description: 'Source URL' })
  @IsString()
  source: string;

  @ApiProperty({ description: 'Destination URL' })
  @IsString()
  destination: string;

  @ApiPropertyOptional({ description: 'Redirect type', enum: RedirectType })
  @IsOptional()
  @IsEnum(RedirectType)
  type?: RedirectType;
}

export class RedirectBulkImportDto {
  @ApiProperty({ description: 'Array of redirects to import', type: [RedirectBulkItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RedirectBulkItemDto)
  redirects: RedirectBulkItemDto[];

  @ApiPropertyOptional({ description: 'Skip existing redirects', default: true })
  @IsOptional()
  @IsBoolean()
  skipExisting?: boolean;

  @ApiPropertyOptional({ description: 'Overwrite existing redirects', default: false })
  @IsOptional()
  @IsBoolean()
  overwriteExisting?: boolean;
}

export class RedirectChainDto {
  @ApiProperty({ description: 'Starting URL of the chain' })
  startUrl: string;

  @ApiProperty({ description: 'Final destination URL' })
  endUrl: string;

  @ApiProperty({ description: 'Full chain of URLs', type: [String] })
  chain: string[];

  @ApiProperty({ description: 'Number of hops in the chain' })
  chainLength: number;

  @ApiProperty({ description: 'Whether this chain forms a loop' })
  isLoop: boolean;
}

export class RedirectAnalyticsDto {
  @ApiProperty({ description: 'Redirect ID' })
  redirectId: string;

  @ApiProperty({ description: 'Source URL' })
  source: string;

  @ApiProperty({ description: 'Destination URL' })
  destination: string;

  @ApiProperty({ description: 'Total hit count' })
  hitCount: number;

  @ApiPropertyOptional({ description: 'Last hit timestamp' })
  lastHitAt?: string;

  @ApiPropertyOptional({ description: 'Hits by day' })
  hitsByDay?: { date: string; hits: number }[];
}

export class RedirectValidationResultDto {
  @ApiProperty({ description: 'Whether the redirect is valid' })
  isValid: boolean;

  @ApiPropertyOptional({ description: 'Validation errors', type: [String] })
  errors?: string[];

  @ApiPropertyOptional({ description: 'Validation warnings', type: [String] })
  warnings?: string[];

  @ApiPropertyOptional({ description: 'Resulting chain length' })
  chainLength?: number;
}

export class RedirectTestDto {
  @ApiProperty({ description: 'URL to test', example: '/old-page' })
  @IsString()
  url: string;
}

export class RedirectExportDto {
  @ApiProperty({ description: 'Export format', enum: ['json', 'csv', 'htaccess', 'nginx'] })
  @IsEnum(['json', 'csv', 'htaccess', 'nginx'])
  format: 'json' | 'csv' | 'htaccess' | 'nginx';
}
