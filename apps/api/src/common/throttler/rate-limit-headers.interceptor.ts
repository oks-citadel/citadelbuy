import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { RateLimitInfo } from './tiered-throttler.guard';
import { RateLimitExceededException } from './tiered-throttler.guard';

/**
 * Extended request interface with rate limit info
 */
interface RequestWithRateLimitInfo {
  rateLimitInfo?: RateLimitInfo;
}

/**
 * Extended response interface for header manipulation
 */
interface ExtendedResponse {
  setHeader: (name: string, value: string | number) => void;
  getHeader: (name: string) => string | number | string[] | undefined;
}

/**
 * Rate Limit Headers Interceptor
 *
 * Ensures rate limit headers are always present on responses:
 * - X-RateLimit-Limit: Maximum number of requests allowed
 * - X-RateLimit-Remaining: Number of requests remaining in the current window
 * - X-RateLimit-Reset: Unix timestamp when the rate limit resets
 * - Retry-After: Seconds to wait before retrying (on 429 responses)
 *
 * This interceptor works in conjunction with the TieredThrottlerGuard
 * to provide comprehensive rate limit information to clients.
 */
@Injectable()
export class RateLimitHeadersInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitHeadersInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithRateLimitInfo>();
    const response = context.switchToHttp().getResponse<ExtendedResponse>();

    return next.handle().pipe(
      tap(() => {
        // Ensure rate limit headers are set on successful responses
        this.ensureRateLimitHeaders(request, response);
      }),
      catchError((error) => {
        // Add Retry-After header on rate limit errors
        if (error instanceof RateLimitExceededException) {
          const retryAfter = error.getRetryAfter();
          response.setHeader('Retry-After', retryAfter);
          response.setHeader('X-RateLimit-Retry-After', retryAfter);
        }

        // Ensure rate limit headers are set even on errors
        this.ensureRateLimitHeaders(request, response);

        throw error;
      }),
    );
  }

  /**
   * Ensure rate limit headers are set on the response
   */
  private ensureRateLimitHeaders(
    request: RequestWithRateLimitInfo,
    response: ExtendedResponse,
  ): void {
    const rateLimitInfo = request.rateLimitInfo;

    if (!rateLimitInfo) {
      return;
    }

    // Only set headers if not already set
    if (!response.getHeader('X-RateLimit-Limit')) {
      response.setHeader('X-RateLimit-Limit', rateLimitInfo.limit);
    }

    if (!response.getHeader('X-RateLimit-Remaining')) {
      response.setHeader(
        'X-RateLimit-Remaining',
        Math.max(0, rateLimitInfo.remaining),
      );
    }

    if (!response.getHeader('X-RateLimit-Reset')) {
      response.setHeader(
        'X-RateLimit-Reset',
        Math.ceil(rateLimitInfo.resetAt / 1000),
      );
    }

    // Also set RFC draft standard headers
    if (!response.getHeader('RateLimit-Limit')) {
      response.setHeader('RateLimit-Limit', rateLimitInfo.limit);
    }

    if (!response.getHeader('RateLimit-Remaining')) {
      response.setHeader(
        'RateLimit-Remaining',
        Math.max(0, rateLimitInfo.remaining),
      );
    }

    if (!response.getHeader('RateLimit-Reset')) {
      response.setHeader(
        'RateLimit-Reset',
        Math.ceil(rateLimitInfo.resetAt / 1000),
      );
    }
  }
}
