import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Domain status filter options
 */
export enum DomainStatusFilter {
  PENDING = 'PENDING',
  VERIFYING = 'VERIFYING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
  ALL = 'ALL',
}

/**
 * Domain type filter options
 */
export enum DomainTypeFilter {
  PRIMARY = 'PRIMARY',
  SUBDOMAIN = 'SUBDOMAIN',
  CUSTOM = 'CUSTOM',
  VANITY = 'VANITY',
  ALL = 'ALL',
}

/**
 * Sort field options
 */
export enum DomainSortField {
  HOST = 'host',
  STATUS = 'status',
  CREATED_AT = 'createdAt',
  VERIFIED_AT = 'verifiedAt',
}

/**
 * Sort order options
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * DTO for querying tenant domains
 */
export class DomainQueryDto {
  @ApiPropertyOptional({
    example: 'org_123456',
    description: 'Filter by tenant/organization ID',
  })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({
    enum: DomainStatusFilter,
    default: DomainStatusFilter.ALL,
    description: 'Filter by domain status',
  })
  @IsOptional()
  @IsEnum(DomainStatusFilter)
  status?: DomainStatusFilter;

  @ApiPropertyOptional({
    enum: DomainTypeFilter,
    default: DomainTypeFilter.ALL,
    description: 'Filter by domain type',
  })
  @IsOptional()
  @IsEnum(DomainTypeFilter)
  domainType?: DomainTypeFilter;

  @ApiPropertyOptional({
    example: 'vendor',
    description: 'Search by hostname (partial match)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: DomainSortField,
    default: DomainSortField.CREATED_AT,
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsEnum(DomainSortField)
  sortBy?: DomainSortField;

  @ApiPropertyOptional({
    enum: SortOrder,
    default: SortOrder.DESC,
    description: 'Sort order',
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number (1-based)',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
