import { SetMetadata, applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiTooManyRequestsResponse,
  ApiInternalServerErrorResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  ApiResponseDto,
  PaginatedResponseDto,
  ApiErrorInfo,
  ResponseMeta,
  PaginationMeta,
} from '../dto/api-response.dto';
import {
  SKIP_TRANSFORM_KEY,
  PAGINATED_RESPONSE_KEY,
  RESPONSE_TYPE_KEY,
} from '../interceptors/response-transform.interceptor';

/**
 * Decorator to skip response transformation
 * Use this for endpoints that return raw data (files, streams, etc.)
 */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);

/**
 * Decorator to mark response as paginated
 * The interceptor will automatically detect pagination, but this makes it explicit
 */
export const PaginatedResponse = () =>
  SetMetadata(PAGINATED_RESPONSE_KEY, true);

/**
 * Decorator to specify the expected response type for validation
 */
export const ResponseType = <T>(type: Type<T>) =>
  SetMetadata(RESPONSE_TYPE_KEY, type);

/**
 * Standard success response schema for Swagger
 */
const successResponseSchema = (dataType?: Type<any> | Type<any>[] | 'array') => {
  if (dataType === 'array' || Array.isArray(dataType)) {
    const itemType = Array.isArray(dataType) ? dataType[0] : undefined;
    return {
      properties: {
        success: { type: 'boolean', example: true },
        data: itemType
          ? { type: 'array', items: { $ref: getSchemaPath(itemType) } }
          : { type: 'array', items: { type: 'object' } },
        meta: { $ref: getSchemaPath(ResponseMeta) },
      },
    };
  }

  return {
    properties: {
      success: { type: 'boolean', example: true },
      data: dataType ? { $ref: getSchemaPath(dataType) } : { type: 'object' },
      meta: { $ref: getSchemaPath(ResponseMeta) },
    },
  };
};

/**
 * Paginated response schema for Swagger
 */
const paginatedResponseSchema = (itemType?: Type<any>) => ({
  properties: {
    success: { type: 'boolean', example: true },
    data: itemType
      ? { type: 'array', items: { $ref: getSchemaPath(itemType) } }
      : { type: 'array', items: { type: 'object' } },
    meta: {
      type: 'object',
      properties: {
        pagination: { $ref: getSchemaPath(PaginationMeta) },
        requestId: { type: 'string', example: 'req_1705312200000_abc123' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
        responseTime: { type: 'number', example: 45 },
      },
    },
  },
});

/**
 * Error response schema for Swagger
 */
const errorResponseSchema = (code: string, message: string) => ({
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: code },
        message: { type: 'string', example: message },
        details: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              message: { type: 'string' },
              value: { type: 'any' },
              constraint: { type: 'string' },
            },
          },
        },
      },
    },
    meta: {
      type: 'object',
      properties: {
        requestId: { type: 'string' },
        timestamp: { type: 'string' },
      },
    },
  },
});

/**
 * Decorator for standard OK response (200)
 * Wraps the response type in the standard ApiResponseDto structure
 */
export const ApiStandardResponse = <T extends Type<any>>(
  dataType?: T,
  description = 'Successful operation',
) => {
  const decorators = [
    ApiExtraModels(ApiResponseDto, ResponseMeta, ApiErrorInfo),
  ];

  if (dataType) {
    decorators.push(ApiExtraModels(dataType));
  }

  decorators.push(
    ApiOkResponse({
      description,
      schema: successResponseSchema(dataType),
    }),
  );

  return applyDecorators(...decorators);
};

/**
 * Decorator for created response (201)
 */
export const ApiStandardCreatedResponse = <T extends Type<any>>(
  dataType?: T,
  description = 'Resource created successfully',
) => {
  const decorators = [
    ApiExtraModels(ApiResponseDto, ResponseMeta, ApiErrorInfo),
  ];

  if (dataType) {
    decorators.push(ApiExtraModels(dataType));
  }

  decorators.push(
    ApiCreatedResponse({
      description,
      schema: successResponseSchema(dataType),
    }),
  );

  return applyDecorators(...decorators);
};

/**
 * Decorator for paginated list response
 */
export const ApiPaginatedResponse = <T extends Type<any>>(
  itemType?: T,
  description = 'Paginated list retrieved successfully',
) => {
  const decorators = [
    PaginatedResponse(),
    ApiExtraModels(
      PaginatedResponseDto,
      ResponseMeta,
      PaginationMeta,
      ApiErrorInfo,
    ),
  ];

  if (itemType) {
    decorators.push(ApiExtraModels(itemType));
  }

  decorators.push(
    ApiOkResponse({
      description,
      schema: paginatedResponseSchema(itemType),
    }),
  );

  return applyDecorators(...decorators);
};

/**
 * Decorator for array response (non-paginated list)
 */
export const ApiArrayResponse = <T extends Type<any>>(
  itemType?: T,
  description = 'List retrieved successfully',
) => {
  const decorators = [
    ApiExtraModels(ApiResponseDto, ResponseMeta, ApiErrorInfo),
  ];

  if (itemType) {
    decorators.push(ApiExtraModels(itemType));
  }

  decorators.push(
    ApiOkResponse({
      description,
      schema: successResponseSchema('array'),
    }),
  );

  return applyDecorators(...decorators);
};

/**
 * Common error response decorators bundle
 * Adds standard error responses for common HTTP errors
 */
export const ApiCommonErrors = () =>
  applyDecorators(
    ApiExtraModels(ApiErrorInfo),
    ApiBadRequestResponse({
      description: 'Validation error or malformed request',
      schema: errorResponseSchema('VALIDATION_ERROR', 'Validation failed'),
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication required',
      schema: errorResponseSchema('UNAUTHORIZED', 'Authentication required'),
    }),
    ApiForbiddenResponse({
      description: 'Insufficient permissions',
      schema: errorResponseSchema('FORBIDDEN', 'Access denied'),
    }),
    ApiNotFoundResponse({
      description: 'Resource not found',
      schema: errorResponseSchema('NOT_FOUND', 'Resource not found'),
    }),
    ApiTooManyRequestsResponse({
      description: 'Rate limit exceeded',
      schema: errorResponseSchema(
        'RATE_LIMIT_EXCEEDED',
        'Too many requests. Please try again later.',
      ),
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal server error',
      schema: errorResponseSchema(
        'INTERNAL_SERVER_ERROR',
        'An unexpected error occurred',
      ),
    }),
  );

/**
 * Decorator for conflict error (409)
 */
export const ApiConflictError = (message = 'Resource already exists') =>
  ApiConflictResponse({
    description: message,
    schema: errorResponseSchema('CONFLICT', message),
  });

/**
 * Combined decorator for a full CRUD endpoint documentation
 * Includes success response and common errors
 */
export const ApiCrudResponse = <T extends Type<any>>(
  dataType?: T,
  options?: {
    description?: string;
    created?: boolean;
  },
) => {
  const baseDecorators = [ApiCommonErrors()];

  if (options?.created) {
    baseDecorators.push(
      ApiStandardCreatedResponse(dataType, options?.description),
    );
  } else {
    baseDecorators.push(ApiStandardResponse(dataType, options?.description));
  }

  return applyDecorators(...baseDecorators);
};

/**
 * Combined decorator for paginated list endpoint
 * Includes paginated response and common errors
 */
export const ApiPaginatedCrudResponse = <T extends Type<any>>(
  itemType?: T,
  description?: string,
) =>
  applyDecorators(ApiPaginatedResponse(itemType, description), ApiCommonErrors());
