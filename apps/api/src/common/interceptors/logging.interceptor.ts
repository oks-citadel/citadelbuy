import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CustomLoggerService } from '../logger/logger.service';
import { MetricsService } from '../monitoring/metrics.service';
import { RequestWithCorrelation } from '../middleware/correlation-id.middleware';
import * as crypto from 'crypto';

/**
 * Structured log entry for request/response logging
 */
interface RequestLogEntry {
  event: 'request_start' | 'request_end' | 'request_error';
  method: string;
  url: string;
  route?: string;
  ip?: string;
  userAgent?: string;
  userId?: string;
  requestId: string;
  correlationId: string;
  traceId?: string;
  spanId?: string;
  statusCode?: number;
  duration?: number;
  contentLength?: number;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
}

/**
 * Interceptor that adds request correlation IDs, timing, and metrics to logs
 *
 * Features:
 * - Extracts/generates correlation IDs for distributed tracing
 * - Logs structured request start/end events
 * - Records Prometheus metrics for each request
 * - Captures request duration for performance monitoring
 * - Integrates with correlation context from middleware
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: CustomLoggerService,
    @Optional() private readonly metricsService?: MetricsService,
  ) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithCorrelation>();
    const response = context.switchToHttp().getResponse();

    // Use correlation context from middleware if available, otherwise generate
    const correlationContext = request.correlationContext;
    const requestId = correlationContext?.requestId || request.headers['x-request-id'] as string || crypto.randomUUID();
    const correlationId = correlationContext?.correlationId || request.headers['x-correlation-id'] as string || requestId;
    const traceId = correlationContext?.traceId || request.headers['x-trace-id'] as string;
    const spanId = correlationContext?.spanId;

    // Extract user ID if authenticated
    const user = request.user as { id?: string; sub?: string } | undefined;
    const userId = user?.id || user?.sub;

    // Set request context in logger
    this.logger.setRequestContext({
      requestId,
      userId,
      correlationId,
    });

    // Ensure response headers are set (middleware may have already set these)
    if (!response.getHeader('X-Request-Id')) {
      response.setHeader('X-Request-Id', requestId);
    }
    if (!response.getHeader('X-Correlation-Id')) {
      response.setHeader('X-Correlation-Id', correlationId);
    }

    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = correlationContext?.startTime || Date.now();

    // Extract route pattern for metrics (e.g., /api/products/:id -> /api/products/:id)
    const route = this.extractRoutePattern(request);

    // Track request in progress
    this.metricsService?.incrementHttpRequestsInProgress(method, route);

    // Log incoming request with structured format
    const startLogEntry: RequestLogEntry = {
      event: 'request_start',
      method,
      url,
      route,
      ip,
      userAgent,
      userId,
      requestId,
      correlationId,
      traceId,
      spanId,
    };

    this.logger.log(`--> ${method} ${url}`, startLogEntry);

    return next.handle().pipe(
      tap({
        next: () => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const { statusCode } = response;
          const contentLength = response.get('content-length');

          // Record metrics
          this.recordMetrics(method, route, statusCode, duration);

          // Log successful response with structured format
          const endLogEntry: RequestLogEntry = {
            event: 'request_end',
            method,
            url,
            route,
            userId,
            requestId,
            correlationId,
            traceId,
            spanId,
            statusCode,
            duration,
            contentLength: contentLength ? parseInt(contentLength, 10) : undefined,
          };

          this.logger.log(`<-- ${method} ${url} ${statusCode} ${duration}ms`, endLogEntry);
        },
        error: (error) => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const statusCode = error.status || error.statusCode || 500;

          // Record error metrics
          this.recordMetrics(method, route, statusCode, duration);
          this.metricsService?.trackError(
            error.name || 'UnknownError',
            statusCode >= 500 ? 'critical' : 'warning',
          );

          // Log error response with structured format
          const errorLogEntry: RequestLogEntry = {
            event: 'request_error',
            method,
            url,
            route,
            userId,
            requestId,
            correlationId,
            traceId,
            spanId,
            statusCode,
            duration,
            error: {
              message: error.message,
              code: error.code,
              stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
            },
          };

          this.logger.error(`<-- ${method} ${url} ${statusCode} ${duration}ms`, errorLogEntry);
        },
        finalize: () => {
          // Decrement in-progress counter
          this.metricsService?.decrementHttpRequestsInProgress(method, route);

          // Clear request context after request completes
          this.logger.clearRequestContext();
        },
      }),
    );
  }

  /**
   * Extract route pattern from request for consistent metrics labeling
   * e.g., /api/products/123 -> /api/products/:id
   */
  private extractRoutePattern(request: any): string {
    // NestJS stores the matched route in request.route
    if (request.route?.path) {
      return request.route.path;
    }

    // Fallback: Try to get from request context
    if (request.routerPath) {
      return request.routerPath;
    }

    // Last resort: Normalize the URL path (remove UUIDs and numeric IDs)
    const url = request.url.split('?')[0]; // Remove query params
    return url
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id');
  }

  /**
   * Record HTTP metrics
   */
  private recordMetrics(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
  ): void {
    if (!this.metricsService) return;

    // Convert duration from ms to seconds for Prometheus
    const durationSeconds = duration / 1000;

    this.metricsService.trackHttpRequest(method, route, statusCode, durationSeconds);
  }
}

/**
 * Lightweight logging interceptor for health check endpoints
 * Only logs errors, not regular requests (to avoid log spam)
 */
@Injectable()
export class HealthCheckLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: CustomLoggerService) {
    this.logger.setContext('HealthCheck');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap({
        error: (error) => {
          const request = context.switchToHttp().getRequest();
          this.logger.error(`Health check failed: ${request.url}`, {
            url: request.url,
            error: error.message,
          });
        },
      }),
    );
  }
}
