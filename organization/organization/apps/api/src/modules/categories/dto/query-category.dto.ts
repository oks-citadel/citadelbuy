import {
  IsOptional,
  IsInt,
  IsString,
  IsBoolean,
  IsEnum,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { CategoryStatus } from '@prisma/client';

export class QueryCategoriesDto {
  @ApiPropertyOptional({
    description: 'Filter by hierarchy level (0 = root)',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  level?: number;

  @ApiPropertyOptional({
    description: 'Filter by parent category ID',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Include child categories',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeChildren?: boolean;

  @ApiPropertyOptional({
    description: 'Include product counts',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeProducts?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['active', 'inactive', 'draft', 'archived', 'all'],
    default: 'active',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Only show featured categories',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['name', 'sortOrder', 'productCount', 'createdAt', 'viewCount'],
    default: 'sortOrder',
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Number of items to return',
    default: 20,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of items to skip',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({
    description: 'Search by name',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class CategoryTreeQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum depth to fetch',
    default: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  maxDepth?: number;

  @ApiPropertyOptional({
    description: 'Include product counts',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeProducts?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['active', 'inactive', 'all'],
    default: 'active',
  })
  @IsOptional()
  @IsString()
  status?: string;
}

export class CategorySearchDto {
  @ApiPropertyOptional({
    description: 'Search query',
  })
  @IsOptional()
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: 'Enable fuzzy matching',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  fuzzy?: boolean;

  @ApiPropertyOptional({
    description: 'Number of results to return',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class TrendingCategoriesDto {
  @ApiPropertyOptional({
    description: 'Time period for trending calculation',
    enum: ['day', 'week', 'month'],
    default: 'week',
  })
  @IsOptional()
  @IsString()
  period?: 'day' | 'week' | 'month';

  @ApiPropertyOptional({
    description: 'Number of categories to return',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class CategoryViewDto {
  @ApiPropertyOptional({
    description: 'User ID (if authenticated)',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Session ID for tracking',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class BulkCategoryOperationDto {
  @ApiPropertyOptional({
    description: 'Bulk operation type',
    enum: ['create', 'update', 'delete'],
  })
  action: 'create' | 'update' | 'delete';

  @ApiPropertyOptional({
    description: 'Category data for the operation',
  })
  data: any;
}

export class BulkCategoriesDto {
  @ApiPropertyOptional({
    description: 'Array of bulk operations',
    type: [BulkCategoryOperationDto],
  })
  operations: BulkCategoryOperationDto[];
}

export class MoveCategoryDto {
  @ApiPropertyOptional({
    description: 'New parent category ID (null for root)',
  })
  @IsOptional()
  @IsUUID()
  newParentId?: string | null;
}

export class ReorderCategoryDto {
  @ApiPropertyOptional({
    description: 'New sort order',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder: number;
}
