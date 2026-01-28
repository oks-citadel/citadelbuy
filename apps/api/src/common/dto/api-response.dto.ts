import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsNumber,
  ValidateNested,
} from 'class-validator';

/**
 * Pagination metadata for list responses
 */
export class PaginationMeta {
  @ApiProperty({ description: 'Current page number', example: 1 })
  @IsNumber()
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 20 })
  @IsNumber()
  limit: number;

  @ApiProperty({ description: 'Total number of items', example: 100 })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Total number of pages', example: 5 })
  @IsNumber()
  totalPages: number;

  @ApiProperty({ description: 'Has more pages', example: true })
  @IsBoolean()
  hasMore: boolean;

  @ApiPropertyOptional({ description: 'Has previous page', example: false })
  @IsBoolean()
  @IsOptional()
  hasPrevious?: boolean;

  @ApiPropertyOptional({ description: 'Has next page', example: true })
  @IsBoolean()
  @IsOptional()
  hasNext?: boolean;
}

/**
 * Error detail for validation and field-specific errors
 */
export class ErrorDetail {
  @ApiProperty({ description: 'Field that caused the error', example: 'email' })
  @IsString()
  field: string;

  @ApiProperty({
    description: 'Error message',
    example: 'Email address is invalid',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'The value that caused the error',
    example: 'invalid-email',
  })
  @IsOptional()
  value?: unknown;

  @ApiPropertyOptional({
    description: 'Validation constraint that failed',
    example: 'isEmail',
  })
  @IsString()
  @IsOptional()
  constraint?: string;
}

/**
 * Standardized error structure for API responses
 */
export class ApiErrorInfo {
  @ApiProperty({
    description: 'Error code for programmatic handling',
    example: 'VALIDATION_ERROR',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Validation failed for one or more fields',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Detailed error information',
    type: [ErrorDetail],
  })
  @ValidateNested({ each: true })
  @Type(() => ErrorDetail)
  @IsOptional()
  details?: ErrorDetail[];
}

/**
 * Response metadata including request tracking
 */
export class ResponseMeta {
  @ApiPropertyOptional({
    description: 'Pagination information for list endpoints',
    type: PaginationMeta,
  })
  @ValidateNested()
  @Type(() => PaginationMeta)
  @IsOptional()
  pagination?: PaginationMeta;

  @ApiPropertyOptional({
    description: 'Unique request identifier for tracing',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsOptional()
  requestId?: string;

  @ApiPropertyOptional({
    description: 'Response timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsString()
  @IsOptional()
  timestamp?: string;

  @ApiPropertyOptional({
    description: 'Response processing time in milliseconds',
    example: 45,
  })
  @IsNumber()
  @IsOptional()
  responseTime?: number;

  @ApiPropertyOptional({
    description: 'API version',
    example: '1.0.0',
  })
  @IsString()
  @IsOptional()
  version?: string;
}

/**
 * Generic standardized API response wrapper
 *
 * This ensures all API responses follow a consistent structure:
 * - success: Boolean indicating if the request was successful
 * - data: The actual response payload (undefined on errors)
 * - error: Error information (undefined on success)
 * - meta: Optional metadata including pagination and request tracking
 */
export class ApiResponseDto<T = any> {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: true,
  })
  @IsBoolean()
  success: boolean;

  @ApiPropertyOptional({
    description: 'Response payload - present on successful requests',
  })
  @IsOptional()
  data?: T;

  @ApiPropertyOptional({
    description: 'Error information - present on failed requests',
    type: ApiErrorInfo,
  })
  @ValidateNested()
  @Type(() => ApiErrorInfo)
  @IsOptional()
  error?: ApiErrorInfo;

  @ApiPropertyOptional({
    description: 'Response metadata including pagination and request tracking',
    type: ResponseMeta,
  })
  @ValidateNested()
  @Type(() => ResponseMeta)
  @IsOptional()
  meta?: ResponseMeta;
}

/**
 * Paginated list response wrapper
 */
export class PaginatedResponseDto<T = any> extends ApiResponseDto<T[]> {
  @ApiProperty({
    description: 'Array of items',
    isArray: true,
  })
  data: T[];

  @ApiProperty({
    description: 'Response metadata with pagination',
    type: ResponseMeta,
  })
  @ValidateNested()
  @Type(() => ResponseMeta)
  meta: ResponseMeta;
}

/**
 * Helper to create a successful API response
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: Partial<ResponseMeta>,
): ApiResponseDto<T> {
  return {
    success: true,
    data,
    meta: meta
      ? {
          ...meta,
          timestamp: meta.timestamp || new Date().toISOString(),
        }
      : undefined,
  };
}

/**
 * Helper to create a paginated API response
 */
export function createPaginatedResponse<T>(
  items: T[],
  pagination: PaginationMeta,
  requestId?: string,
): PaginatedResponseDto<T> {
  return {
    success: true,
    data: items,
    meta: {
      pagination,
      requestId,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Helper to create an error API response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: ErrorDetail[],
  requestId?: string,
): ApiResponseDto<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Helper to calculate pagination metadata
 */
export function calculatePagination(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
    hasPrevious: page > 1,
    hasNext: page < totalPages,
  };
}
