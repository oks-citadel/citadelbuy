import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ThrottlerException } from '@nestjs/throttler';
import * as crypto from 'crypto';

/**
 * Rate limit response details
 */
interface RateLimitDetails {
  limit: number;
  ttl: number;
  retryAfter: number;
  resetAt: string;
}

/**
 * Validation error object structure from class-validator
 */
interface ValidationErrorObject {
  property?: string;
  constraints?: Record<string, string>;
  value?: unknown;
}

/**
 * Prisma error object structure
 */
interface PrismaErrorObject {
  code?: string;
  name?: string;
  message?: string;
  meta?: Record<string, unknown>;
}

/**
 * Type guard to check if exception is a RateLimitExceededException
 */
function isRateLimitExceededException(exception: unknown): exception is {
  limit: number;
  ttl: number;
  resetAt: number;
  getRetryAfter: () => number;
} {
  if (!exception || typeof exception !== 'object') {
    return false;
  }
  const exc = exception as Record<string, unknown>;
  return (
    exc.constructor?.name === 'RateLimitExceededException' &&
    typeof exc.limit === 'number' &&
    typeof exc.ttl === 'number' &&
    typeof exc.resetAt === 'number' &&
    typeof exc.getRetryAfter === 'function'
  );
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  /** HTTP status code */
  statusCode: number;
  /** Error code for client-side error handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Detailed error information (validation errors, etc.) */
  details?: ErrorDetail[] | Record<string, unknown>;
  /** ISO timestamp of when the error occurred */
  timestamp: string;
  /** Unique request identifier for tracing */
  requestId: string;
  /** Correlation ID for distributed tracing */
  traceId?: string;
  /** Request path that caused the error */
  path: string;
  /** HTTP method */
  method: string;
  /** Error instance name (only in development) */
  error?: string;
  /** Stack trace (only in development) */
  stack?: string;
}

/**
 * Validation error detail structure
 */
export interface ErrorDetail {
  /** Field that caused the error */
  field: string;
  /** Error message for this field */
  message: string;
  /** The value that failed validation */
  value?: unknown;
  /** Validation constraint that failed */
  constraint?: string;
}

/**
 * Extended request with user information
 */
interface ExtendedRequest extends Request {
  user?: {
    id?: string;
    sub?: string;
    email?: string;
  };
}

/**
 * Comprehensive HTTP Exception Filter
 *
 * Handles all exceptions consistently across the application with:
 * - Structured error responses
 * - CORS headers on errors
 * - Request ID/Trace ID for debugging
 * - Appropriate logging based on error severity
 * - Production vs Development response differences
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly isProduction: boolean;
  private readonly allowedOrigins: string[];

  constructor(private configService: ConfigService) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    // Support both CORS_ALLOWED_ORIGINS (preferred) and CORS_ORIGIN (legacy)
    const corsOrigins = this.configService.get<string>('CORS_ALLOWED_ORIGINS') ||
                       this.configService.get<string>('CORS_ORIGIN', '');
    this.allowedOrigins = corsOrigins
      ? corsOrigins.split(',').map(origin => origin.trim()).filter(Boolean)
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:4200', 'http://127.0.0.1:3000'];
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<ExtendedRequest>();

    // Handle OPTIONS requests (CORS preflight) - always return 204 with CORS headers
    if (request.method === 'OPTIONS') {
      this.setCorsHeaders(request, response);
      response.status(HttpStatus.NO_CONTENT).send();
      return;
    }

    // Extract error details
    const { status, code, message, details, errorName, retryAfter } = this.extractErrorInfo(exception);

    // Generate request identifiers
    const requestId = this.getRequestId(request);
    const traceId = this.getTraceId(request);

    // Build error response
    const errorResponse: ErrorResponse = {
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
      requestId,
      path: request.url,
      method: request.method,
    };

    // Add trace ID if different from request ID
    if (traceId !== requestId) {
      errorResponse.traceId = traceId;
    }

    // Add details for validation errors
    if (details) {
      errorResponse.details = details;
    }

    // Add debug information in development
    if (!this.isProduction) {
      errorResponse.error = errorName;
      if (exception instanceof Error && exception.stack) {
        errorResponse.stack = exception.stack;
      }
    }

    // Log the error
    this.logError(request, status, message, exception, requestId);

    // Set CORS headers even on errors
    this.setCorsHeaders(request, response);

    // Set additional security headers
    this.setSecurityHeaders(response);

    // Set Retry-After header for 429 responses
    if (status === HttpStatus.TOO_MANY_REQUESTS && retryAfter !== undefined) {
      response.setHeader('Retry-After', retryAfter);
      response.setHeader('X-RateLimit-Retry-After', retryAfter);
    }

    // Send response
    response.status(status).json(errorResponse);
  }

  /**
   * Extract error information from various exception types
   */
  private extractErrorInfo(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details?: ErrorDetail[] | Record<string, unknown>;
    errorName: string;
    retryAfter?: number;
  } {
    // Handle RateLimitExceededException (our custom rate limit exception)
    if (isRateLimitExceededException(exception)) {
      const retryAfter = exception.getRetryAfter();
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        details: {
          limit: exception.limit,
          ttl: exception.ttl,
          retryAfter,
          resetAt: new Date(exception.resetAt).toISOString(),
        } as Record<string, unknown>,
        errorName: 'RateLimitExceededException',
        retryAfter,
      };
    }

    // Handle ThrottlerException (429 Too Many Requests)
    if (exception instanceof ThrottlerException) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        errorName: 'ThrottlerException',
        retryAfter: 60, // Default retry after 60 seconds for generic throttler exceptions
      };
    }

    // Handle HttpException and its subclasses
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message: string;
      let details: ErrorDetail[] | Record<string, unknown> | undefined;
      let code: string;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = this.getErrorCode(status, exception);
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || exception.message;
        code = (responseObj.code as string) || this.getErrorCode(status, exception);

        // Handle validation errors from class-validator
        if (Array.isArray(responseObj.message)) {
          message = 'Validation failed';
          details = this.formatValidationErrors(responseObj.message as (string | ValidationErrorObject)[]);
        } else if (responseObj.details) {
          details = responseObj.details as Record<string, unknown>;
        } else if (responseObj.metadata) {
          details = responseObj.metadata as Record<string, unknown>;
        }
      } else {
        message = exception.message;
        code = this.getErrorCode(status, exception);
      }

      return {
        status,
        code,
        message,
        details,
        errorName: exception.constructor.name,
      };
    }

    // Handle Prisma errors
    if (this.isPrismaError(exception)) {
      return this.handlePrismaError(exception);
    }

    // Handle generic errors
    if (exception instanceof Error) {
      // Check for specific error types
      if (exception.name === 'JsonWebTokenError') {
        return {
          status: HttpStatus.UNAUTHORIZED,
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token',
          errorName: exception.name,
        };
      }

      if (exception.name === 'TokenExpiredError') {
        return {
          status: HttpStatus.UNAUTHORIZED,
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired',
          errorName: exception.name,
        };
      }

      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_SERVER_ERROR',
        message: this.isProduction
          ? 'An unexpected error occurred'
          : exception.message,
        errorName: exception.name,
      };
    }

    // Handle unknown errors
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      errorName: 'UnknownError',
    };
  }

  /**
   * Get error code based on HTTP status
   */
  private getErrorCode(status: number, exception?: HttpException): string {
    // Check if exception has a custom code
    if (exception) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null) {
        const responseObj = response as Record<string, unknown>;
        if (typeof responseObj.code === 'string') {
          return responseObj.code;
        }
      }
    }

    const statusCodeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      402: 'PAYMENT_REQUIRED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      405: 'METHOD_NOT_ALLOWED',
      406: 'NOT_ACCEPTABLE',
      408: 'REQUEST_TIMEOUT',
      409: 'CONFLICT',
      410: 'GONE',
      413: 'PAYLOAD_TOO_LARGE',
      414: 'URI_TOO_LONG',
      415: 'UNSUPPORTED_MEDIA_TYPE',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      501: 'NOT_IMPLEMENTED',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };

    return statusCodeMap[status] || `HTTP_${status}`;
  }

  /**
   * Format class-validator validation errors
   */
  private formatValidationErrors(errors: (string | ValidationErrorObject)[]): ErrorDetail[] {
    if (typeof errors[0] === 'string') {
      return (errors as string[]).map(msg => ({
        field: 'unknown',
        message: msg,
      }));
    }

    // Handle ValidationError objects from class-validator
    const result: ErrorDetail[] = [];
    for (const error of errors) {
      if (typeof error === 'object' && error !== null && 'constraints' in error) {
        const validationError = error as ValidationErrorObject;
        for (const [constraint, message] of Object.entries(validationError.constraints || {})) {
          result.push({
            field: validationError.property || 'unknown',
            message: message as string,
            value: validationError.value,
            constraint,
          });
        }
      } else {
        result.push({
          field: 'unknown',
          message: String(error),
        });
      }
    }
    return result;
  }

  /**
   * Check if error is a Prisma error
   */
  private isPrismaError(exception: unknown): boolean {
    if (exception && typeof exception === 'object') {
      const errorObj = exception as PrismaErrorObject;
      return (
        errorObj.code?.startsWith('P') ||
        errorObj.name === 'PrismaClientKnownRequestError' ||
        errorObj.name === 'PrismaClientUnknownRequestError' ||
        errorObj.name === 'PrismaClientValidationError'
      );
    }
    return false;
  }

  /**
   * Handle Prisma-specific errors
   */
  private handlePrismaError(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details?: Record<string, unknown>;
    errorName: string;
  } {
    const error = exception as PrismaErrorObject;
    const prismaCode = error.code;
    const errorMessage = error.message || 'Unknown database error';

    // Map Prisma error codes to HTTP responses
    const prismaErrorMap: Record<string, { status: number; code: string; message: string }> = {
      P2000: { status: 400, code: 'VALUE_TOO_LONG', message: 'The provided value is too long for the column' },
      P2001: { status: 404, code: 'RECORD_NOT_FOUND', message: 'The requested record was not found' },
      P2002: { status: 409, code: 'UNIQUE_CONSTRAINT_VIOLATION', message: 'A record with this value already exists' },
      P2003: { status: 400, code: 'FOREIGN_KEY_CONSTRAINT', message: 'Foreign key constraint failed' },
      P2004: { status: 400, code: 'CONSTRAINT_VIOLATION', message: 'A constraint was violated' },
      P2005: { status: 400, code: 'INVALID_VALUE', message: 'Invalid value for the field' },
      P2006: { status: 400, code: 'INVALID_VALUE', message: 'The provided value is not valid' },
      P2011: { status: 400, code: 'NULL_CONSTRAINT_VIOLATION', message: 'Required field cannot be null' },
      P2014: { status: 400, code: 'RELATION_VIOLATION', message: 'The required relation is violated' },
      P2015: { status: 404, code: 'RELATED_RECORD_NOT_FOUND', message: 'A related record could not be found' },
      P2016: { status: 400, code: 'QUERY_INTERPRETATION_ERROR', message: 'Query interpretation error' },
      P2025: { status: 404, code: 'RECORD_NOT_FOUND', message: 'The record was not found' },
    };

    const mapped = prismaCode ? prismaErrorMap[prismaCode] : undefined;
    if (mapped) {
      return {
        status: mapped.status,
        code: mapped.code,
        message: this.isProduction ? mapped.message : `${mapped.message}: ${errorMessage}`,
        details: this.isProduction ? undefined : { prismaCode, meta: error.meta },
        errorName: error.name || 'PrismaError',
      };
    }

    // Default Prisma error handling
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'DATABASE_ERROR',
      message: this.isProduction ? 'A database error occurred' : errorMessage,
      details: this.isProduction ? undefined : { prismaCode, meta: error.meta },
      errorName: error.name || 'PrismaError',
    };
  }

  /**
   * Get or generate request ID
   */
  private getRequestId(request: Request): string {
    return (
      (request.headers['x-request-id'] as string) ||
      crypto.randomUUID()
    );
  }

  /**
   * Get or generate trace ID
   */
  private getTraceId(request: Request): string {
    return (
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['x-trace-id'] as string) ||
      (request.headers['x-amzn-trace-id'] as string) ||
      this.getRequestId(request)
    );
  }

  /**
   * Log error with appropriate severity
   */
  private logError(
    request: ExtendedRequest,
    status: number,
    message: string,
    exception: unknown,
    requestId: string,
  ): void {
    const logContext = {
      requestId,
      method: request.method,
      url: request.url,
      userId: request.user?.id || request.user?.sub || 'anonymous',
      userAgent: request.headers['user-agent'],
      ip: this.getClientIp(request),
    };

    const logMessage = `[${requestId}] ${request.method} ${request.url} - ${status} - ${message}`;

    if (status >= 500) {
      // Server errors - log as error with stack trace
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : undefined,
        JSON.stringify(logContext),
      );
    } else if (status === 401 || status === 403) {
      // Auth errors - log as warn for security monitoring
      this.logger.warn(logMessage, JSON.stringify(logContext));
    } else if (status === 429) {
      // Rate limit - log as warn for abuse monitoring
      this.logger.warn(`Rate limit exceeded: ${logMessage}`, JSON.stringify(logContext));
    } else if (status >= 400) {
      // Client errors - log as debug in production, warn in development
      if (this.isProduction) {
        this.logger.debug(logMessage);
      } else {
        this.logger.warn(logMessage);
      }
    }
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Set CORS headers on response
   * This ensures CORS headers are present even on error responses (4xx, 5xx)
   * which is critical for the client to properly handle errors from cross-origin requests
   */
  private setCorsHeaders(request: Request, response: Response): void {
    const origin = request.headers.origin;

    // Check if origin is allowed
    if (origin && this.allowedOrigins.includes(origin)) {
      response.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!this.isProduction) {
      // In development, allow the origin even if not in list (for debugging)
      if (origin) {
        response.setHeader('Access-Control-Allow-Origin', origin);
      }
    }

    // Allowed headers - must match main.ts CORS configuration
    const allowedHeaders = [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Requested-With',
      'Accept',
      'Accept-Language',
      'Origin',
      'x-device-type',
      'x-device-id',
      'x-session-id',
      'x-api-key',
      'x-request-id',
      'x-correlation-id',
      'Cache-Control',
      'Pragma',
    ].join(', ');

    // Exposed headers - headers the client can access from the response
    const exposedHeaders = [
      'X-Total-Count',
      'X-Page-Count',
      'X-Request-Id',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Content-Disposition',
    ].join(', ');

    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    response.setHeader('Access-Control-Allow-Headers', allowedHeaders);
    response.setHeader('Access-Control-Expose-Headers', exposedHeaders);
    response.setHeader('Access-Control-Max-Age', '86400');
  }

  /**
   * Set security headers on response
   */
  private setSecurityHeaders(response: Response): void {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.setHeader('Pragma', 'no-cache');
  }
}
