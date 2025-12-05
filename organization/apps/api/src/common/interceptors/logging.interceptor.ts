import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CustomLoggerService } from '../logger/logger.service';
import * as crypto from 'crypto';

/**
 * Interceptor that adds request correlation IDs and timing to logs
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: CustomLoggerService) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Generate request ID if not present
    const requestId = request.headers['x-request-id'] || crypto.randomUUID();

    // Extract user ID if authenticated
    const userId = request.user?.id || request.user?.sub;

    // Set correlation ID (can be used to track requests across services)
    const correlationId = request.headers['x-correlation-id'] || requestId;

    // Set request context in logger
    this.logger.setRequestContext({
      requestId,
      userId,
      correlationId,
    });

    // Add headers to response
    response.setHeader('X-Request-Id', requestId);
    response.setHeader('X-Correlation-Id', correlationId);

    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    // Log incoming request
    this.logger.log(`Incoming ${method} ${url}`, {
      method,
      url,
      ip,
      userAgent,
      userId,
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const { statusCode } = response;

          // Log successful response
          this.logger.log(`Completed ${method} ${url} ${statusCode}`, {
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
          });
        },
        error: (error) => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const statusCode = error.status || 500;

          // Log error response
          this.logger.error(`Failed ${method} ${url} ${statusCode}`, {
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            error: error.message,
          });
        },
        finalize: () => {
          // Clear request context after request completes
          this.logger.clearRequestContext();
        },
      }),
    );
  }
}
