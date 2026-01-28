import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Trace context for distributed tracing
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  tenantId?: string;
  userId?: string;
  startTime: number;
}

/**
 * AsyncLocalStorage for trace context propagation
 */
export const traceStorage = new AsyncLocalStorage<TraceContext>();

/**
 * Get current trace context
 */
export function getCurrentTraceContext(): TraceContext | undefined {
  return traceStorage.getStore();
}

/**
 * Get current trace ID
 */
export function getCurrentTraceId(): string | undefined {
  return traceStorage.getStore()?.traceId;
}

/**
 * Generate a new span ID (16 hex characters)
 */
export function generateSpanId(): string {
  return uuidv4().replace(/-/g, '').substring(0, 16);
}

/**
 * Request interface extended with trace context
 */
export interface RequestWithTrace extends Request {
  traceContext?: TraceContext;
}

/**
 * Response interface with trace ID
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    traceId: string;
    timestamp: string;
    duration?: number;
  };
}

/**
 * Trace ID Propagation Interceptor
 *
 * Features:
 * - Reads x-bx-trace-id from request header
 * - Generates trace ID if not present
 * - Propagates trace context to all downstream services
 * - Includes trace ID in all log entries
 * - Adds trace ID to response headers and body
 *
 * Headers handled:
 * - x-bx-trace-id: Primary trace ID header
 * - x-bx-span-id: Current span ID
 * - x-bx-parent-span-id: Parent span ID
 * - x-bx-tenant: Tenant ID
 */
@Injectable()
export class TraceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TraceInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithTrace>();
    const response = context.switchToHttp().getResponse<Response>();

    // Extract or generate trace ID
    const traceId = this.extractTraceId(request) || uuidv4();

    // Generate span ID for this service
    const spanId = generateSpanId();

    // Extract parent span ID (the previous service's span ID becomes our parent)
    const parentSpanId = request.headers['x-bx-parent-span-id'] as string ||
      request.headers['x-bx-span-id'] as string;

    // Extract tenant ID
    const tenantId = request.headers['x-bx-tenant'] as string ||
      (request as unknown as { user?: { tenantId?: string } }).user?.tenantId;

    // Extract user ID
    const userId = (request as unknown as { user?: { id?: string } }).user?.id;

    const startTime = Date.now();

    // Create trace context
    const traceContext: TraceContext = {
      traceId,
      spanId,
      parentSpanId,
      tenantId,
      userId,
      startTime,
    };

    // Attach to request
    request.traceContext = traceContext;

    // Set response headers
    response.setHeader('X-BX-Trace-Id', traceId);
    response.setHeader('X-BX-Span-Id', spanId);
    if (parentSpanId) {
      response.setHeader('X-BX-Parent-Span-Id', parentSpanId);
    }

    // Log request start with trace context
    this.logger.log(`--> ${request.method} ${request.url}`, {
      event: 'request_start',
      traceId,
      spanId,
      parentSpanId,
      tenantId,
      userId,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.get('user-agent'),
    });

    // Run the handler within trace context
    return new Observable((subscriber) => {
      traceStorage.run(traceContext, () => {
        next.handle().pipe(
          map((data) => {
            // If response is already formatted, just add trace meta
            if (this.isApiResponse(data)) {
              return {
                ...data,
                meta: {
                  ...data.meta,
                  traceId,
                  timestamp: new Date().toISOString(),
                  duration: Date.now() - startTime,
                },
              };
            }

            // Wrap raw data in standard response format
            return {
              success: true,
              data,
              meta: {
                traceId,
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime,
              },
            };
          }),
          tap({
            next: () => {
              const duration = Date.now() - startTime;
              this.logger.log(`<-- ${request.method} ${request.url} ${response.statusCode} ${duration}ms`, {
                event: 'request_end',
                traceId,
                spanId,
                tenantId,
                statusCode: response.statusCode,
                duration,
              });
            },
            error: (error) => {
              const duration = Date.now() - startTime;
              const statusCode = error.status || error.statusCode || 500;
              this.logger.error(`<-- ${request.method} ${request.url} ${statusCode} ${duration}ms`, {
                event: 'request_error',
                traceId,
                spanId,
                tenantId,
                statusCode,
                duration,
                error: {
                  message: error.message,
                  code: error.code || error.errorCode,
                  // Don't log stack in production
                  stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
                },
              });
            },
          }),
        ).subscribe(subscriber);
      });
    });
  }

  /**
   * Extract trace ID from request headers
   */
  private extractTraceId(request: Request): string | undefined {
    // Check our custom header first
    const bxTraceId = request.headers['x-bx-trace-id'] as string;
    if (bxTraceId) {
      return bxTraceId;
    }

    // Check standard headers
    const traceId = request.headers['x-trace-id'] as string;
    if (traceId) {
      return traceId;
    }

    // Check correlation ID
    const correlationId = request.headers['x-correlation-id'] as string;
    if (correlationId) {
      return correlationId;
    }

    // Check request ID
    const requestId = request.headers['x-request-id'] as string;
    if (requestId) {
      return requestId;
    }

    // Check AWS X-Ray header
    const awsTrace = request.headers['x-amzn-trace-id'] as string;
    if (awsTrace) {
      const rootMatch = awsTrace.match(/Root=([^;]+)/);
      if (rootMatch) {
        return rootMatch[1].replace(/-/g, '');
      }
    }

    return undefined;
  }

  /**
   * Check if data is already an API response format
   */
  private isApiResponse(data: unknown): data is ApiResponse {
    if (!data || typeof data !== 'object') {
      return false;
    }
    const obj = data as Record<string, unknown>;
    return 'success' in obj && typeof obj.success === 'boolean';
  }
}

/**
 * Trace context decorator for injecting trace context in services
 */
export function InjectTraceContext() {
  return function (
    target: object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) {
    // Store metadata for parameter injection
    const existingParams: number[] = Reflect.getMetadata(
      'trace_context_params',
      target,
      propertyKey,
    ) || [];
    existingParams.push(parameterIndex);
    Reflect.defineMetadata('trace_context_params', existingParams, target, propertyKey);
  };
}

/**
 * Helper to create headers for downstream service calls
 */
export function getTraceHeaders(): Record<string, string> {
  const context = getCurrentTraceContext();
  const headers: Record<string, string> = {};

  if (context) {
    headers['x-bx-trace-id'] = context.traceId;
    headers['x-bx-parent-span-id'] = context.spanId;
    headers['x-bx-span-id'] = generateSpanId();
    if (context.tenantId) {
      headers['x-bx-tenant'] = context.tenantId;
    }
  }

  return headers;
}

/**
 * Helper to log with trace context
 */
export function logWithTrace(
  logger: Logger,
  level: 'log' | 'error' | 'warn' | 'debug' | 'verbose',
  message: string,
  additionalContext?: Record<string, unknown>,
): void {
  const trace = getCurrentTraceContext();
  const context = {
    ...additionalContext,
    traceId: trace?.traceId,
    spanId: trace?.spanId,
    tenantId: trace?.tenantId,
    userId: trace?.userId,
  };

  logger[level](message, context);
}
