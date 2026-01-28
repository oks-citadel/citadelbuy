import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '@/common/redis/redis.service';
import { Request } from 'express';

/**
 * Idempotency Interceptor
 *
 * Ensures mutation operations are processed exactly once by tracking
 * Idempotency-Key headers. Required for safe payment processing and
 * resource creation under network retries.
 *
 * Usage:
 * - Apply to mutation endpoints (POST, PUT, PATCH for sensitive operations)
 * - Client must include `Idempotency-Key` header with unique value
 * - First request is processed and result cached for 24 hours
 * - Subsequent requests with same key return cached result
 *
 * @example
 * ```typescript
 * @Post('orders')
 * @UseInterceptors(IdempotencyInterceptor)
 * async createOrder(@Body() dto: CreateOrderDto) { ... }
 * ```
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);
  private readonly keyPrefix = 'idempotency:';
  private readonly defaultTtlSeconds = 86400; // 24 hours

  constructor(private readonly redisService: RedisService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const idempotencyKey = request.headers['idempotency-key'] as string;

    // If no idempotency key provided, proceed without idempotency checking
    // For strict mode, you could throw BadRequestException here
    if (!idempotencyKey) {
      return next.handle();
    }

    const method = request.method;
    const path = request.path;
    const userId = (request as any).user?.id || 'anonymous';

    // Create a composite key including user to prevent cross-user conflicts
    const compositeKey = `${this.keyPrefix}${userId}:${method}:${path}:${idempotencyKey}`;

    try {
      // Try to acquire lock atomically
      const lockAcquired = await this.redisService.setNx(
        `${compositeKey}:lock`,
        JSON.stringify({
          status: 'processing',
          startedAt: new Date().toISOString(),
        }),
        this.defaultTtlSeconds,
      );

      if (!lockAcquired) {
        // Check if there's a cached response (RedisService.get already parses JSON)
        const cachedResponse = await this.redisService.get<any>(`${compositeKey}:response`);

        if (cachedResponse) {
          this.logger.debug(`Returning cached response for idempotency key: ${idempotencyKey}`);
          return of(cachedResponse);
        }

        // Request is currently being processed
        throw new ConflictException({
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'A request with this idempotency key is currently being processed',
          requestId: request.headers['x-request-id'],
        });
      }

      // Process the request and cache the result
      return next.handle().pipe(
        tap({
          next: async (response) => {
            try {
              // Cache successful response
              await this.redisService.set(
                `${compositeKey}:response`,
                JSON.stringify(response),
                this.defaultTtlSeconds,
              );

              // Update lock status
              await this.redisService.set(
                `${compositeKey}:lock`,
                JSON.stringify({
                  status: 'completed',
                  completedAt: new Date().toISOString(),
                }),
                this.defaultTtlSeconds,
              );

              this.logger.debug(`Cached response for idempotency key: ${idempotencyKey}`);
            } catch (cacheError) {
              this.logger.error(`Failed to cache idempotent response: ${cacheError.message}`);
              // Continue - caching failure shouldn't fail the request
            }
          },
          error: async (error) => {
            try {
              // Mark as failed and allow retry
              await this.redisService.del(`${compositeKey}:lock`);
              this.logger.debug(`Released lock for failed request: ${idempotencyKey}`);
            } catch (cleanupError) {
              this.logger.error(`Failed to cleanup lock: ${cleanupError.message}`);
            }
          },
        }),
      );
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      this.logger.error(`Idempotency check failed: ${error.message}`);
      // If Redis fails, proceed without idempotency (fail open)
      // For stricter handling, you could throw ServiceUnavailableException
      return next.handle();
    }
  }
}
