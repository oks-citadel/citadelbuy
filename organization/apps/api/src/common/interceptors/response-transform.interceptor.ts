import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import {
  ApiResponseDto,
  PaginationMeta,
  calculatePagination,
} from '../dto/api-response.dto';

/**
 * Metadata key for skipping response transformation
 */
export const SKIP_TRANSFORM_KEY = 'skipTransform';

/**
 * Metadata key for marking paginated responses
 */
export const PAGINATED_RESPONSE_KEY = 'paginatedResponse';

/**
 * Metadata key for response type validation
 */
export const RESPONSE_TYPE_KEY = 'responseType';

/**
 * Interface for responses that contain pagination info
 * (detected automatically from response shape)
 */
interface PaginatedData {
  items?: any[];
  data?: any[];
  results?: any[];
  total?: number;
  count?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  pageSize?: number;
  currentPage?: number;
}

/**
 * Response Transform Interceptor
 *
 * This interceptor wraps all API responses in a standardized format:
 * {
 *   success: boolean,
 *   data?: T,
 *   error?: { code: string, message: string, details?: any },
 *   meta?: { pagination?, requestId?, timestamp?, responseTime? }
 * }
 *
 * Features:
 * - Automatically wraps successful responses
 * - Detects and handles paginated responses
 * - Converts null values to appropriate defaults
 * - Adds request tracking metadata (requestId, timestamp, responseTime)
 * - Preserves already-wrapped responses (checks for success field)
 * - Can be skipped with @SkipTransform() decorator
 */
@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiResponseDto<T>>
{
  private readonly logger = new Logger(ResponseTransformInterceptor.name);

  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseDto<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // Check if transformation should be skipped
    const skipTransform = this.reflector.getAllAndOverride<boolean>(
      SKIP_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTransform) {
      return next.handle();
    }

    // Get request ID from headers or generate
    const requestId =
      (request.headers['x-request-id'] as string) ||
      response.getHeader('X-Request-Id')?.toString() ||
      this.generateRequestId();

    return next.handle().pipe(
      map((data) => {
        const responseTime = Date.now() - startTime;

        // Handle null/undefined responses
        if (data === null || data === undefined) {
          return this.wrapResponse(null, requestId, responseTime);
        }

        // Check if response is already wrapped (has success field at root)
        if (this.isAlreadyWrapped(data)) {
          // Add timing metadata if not present
          if (!data.meta?.responseTime) {
            data.meta = {
              ...data.meta,
              responseTime,
              requestId: data.meta?.requestId || requestId,
              timestamp: data.meta?.timestamp || new Date().toISOString(),
            };
          }
          return data;
        }

        // Check if this is a paginated response
        const isPaginatedMarker = this.reflector.getAllAndOverride<boolean>(
          PAGINATED_RESPONSE_KEY,
          [context.getHandler(), context.getClass()],
        );

        if (isPaginatedMarker || this.isPaginatedResponse(data)) {
          return this.wrapPaginatedResponse(data, requestId, responseTime);
        }

        // Sanitize data (convert nulls to appropriate defaults)
        const sanitizedData = this.sanitizeData(data);

        return this.wrapResponse(sanitizedData, requestId, responseTime);
      }),
    );
  }

  /**
   * Check if response is already in standard format
   */
  private isAlreadyWrapped(data: any): boolean {
    return (
      data !== null &&
      typeof data === 'object' &&
      'success' in data &&
      typeof data.success === 'boolean' &&
      ('data' in data || 'error' in data)
    );
  }

  /**
   * Check if data looks like a paginated response
   */
  private isPaginatedResponse(data: any): boolean {
    if (!data || typeof data !== 'object') return false;

    // Check for common pagination patterns
    const hasPaginationFields =
      ('total' in data || 'count' in data) &&
      ('page' in data || 'currentPage' in data || 'limit' in data || 'pageSize' in data);

    const hasItemsArray =
      Array.isArray(data.items) ||
      Array.isArray(data.data) ||
      Array.isArray(data.results) ||
      Array.isArray(data.products) ||
      Array.isArray(data.orders) ||
      Array.isArray(data.users);

    return hasPaginationFields || (hasItemsArray && 'total' in data);
  }

  /**
   * Wrap standard response
   */
  private wrapResponse(
    data: T | null,
    requestId: string,
    responseTime: number,
  ): ApiResponseDto<T> {
    return {
      success: true,
      data: data as T,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        responseTime,
      },
    };
  }

  /**
   * Wrap paginated response with pagination metadata
   */
  private wrapPaginatedResponse(
    data: PaginatedData,
    requestId: string,
    responseTime: number,
  ): ApiResponseDto<any[]> {
    // Extract items array (check common field names)
    const items =
      data.items ||
      data.data ||
      data.results ||
      (data as any).products ||
      (data as any).orders ||
      (data as any).users ||
      [];

    // Extract pagination info
    const total = data.total ?? data.count ?? items.length;
    const page = data.page ?? data.currentPage ?? 1;
    const limit = data.limit ?? data.pageSize ?? items.length;

    const pagination = calculatePagination(total, page, limit);

    return {
      success: true,
      data: this.sanitizeArray(items),
      meta: {
        pagination,
        requestId,
        timestamp: new Date().toISOString(),
        responseTime,
      },
    };
  }

  /**
   * Sanitize data by converting null values to appropriate defaults
   * This helps prevent frontend null pointer exceptions
   */
  private sanitizeData(data: any): any {
    if (data === null || data === undefined) {
      return null;
    }

    if (Array.isArray(data)) {
      return this.sanitizeArray(data);
    }

    if (typeof data === 'object' && data !== null) {
      return this.sanitizeObject(data);
    }

    return data;
  }

  /**
   * Sanitize array - filter out null items and sanitize each element
   */
  private sanitizeArray(arr: any[]): any[] {
    return arr.filter((item) => item !== null && item !== undefined).map((item) => this.sanitizeData(item));
  }

  /**
   * Sanitize object - convert null arrays to empty arrays, etc.
   */
  private sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        // Convert known array fields to empty arrays
        if (this.isLikelyArrayField(key)) {
          result[key] = [];
        } else if (this.isLikelyObjectField(key)) {
          // Keep null for optional object fields (more explicit than empty object)
          result[key] = null;
        } else {
          // Keep null for other fields
          result[key] = null;
        }
      } else if (Array.isArray(value)) {
        result[key] = this.sanitizeArray(value);
      } else if (typeof value === 'object' && value !== null) {
        // Handle Date objects
        if (value instanceof Date) {
          result[key] = value.toISOString();
        } else if (value.constructor === Object) {
          result[key] = this.sanitizeObject(value);
        } else {
          // Keep special objects as-is (Decimal, etc.)
          result[key] = value;
        }
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Check if field name suggests it should be an array
   */
  private isLikelyArrayField(fieldName: string): boolean {
    const arrayPatterns = [
      /s$/i, // plurals: items, products, users, etc.
      /list$/i, // itemList, userList
      /array$/i,
      /ids$/i, // userIds, productIds
      /images$/i,
      /tags$/i,
      /categories$/i,
      /variants$/i,
      /options$/i,
      /permissions$/i,
      /roles$/i,
      /children$/i,
    ];

    return arrayPatterns.some((pattern) => pattern.test(fieldName));
  }

  /**
   * Check if field name suggests it should be an object
   */
  private isLikelyObjectField(fieldName: string): boolean {
    const objectPatterns = [
      /config$/i,
      /settings$/i,
      /metadata$/i,
      /meta$/i,
      /details$/i,
      /options$/i,
      /preferences$/i,
      /address$/i,
      /billing$/i,
      /shipping$/i,
      /author$/i,
      /creator$/i,
      /user$/i,
      /vendor$/i,
      /category$/i,
    ];

    return objectPatterns.some((pattern) => pattern.test(fieldName));
  }

  /**
   * Generate a simple request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
