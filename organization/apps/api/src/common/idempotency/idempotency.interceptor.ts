import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  BadRequestException,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { IdempotencyService } from './idempotency.service';
import { IDEMPOTENCY_KEY, IdempotencyOptions } from './idempotency.constants';

/**
 * Enhanced Idempotency Interceptor
 *
 * Ensures mutation operations are processed exactly once by tracking
 * X-Idempotency-Key headers. Required for safe payment processing and
 * resource creation under network retries.
 *
 * Features:
 * - Atomic lock acquisition using Redis SETNX
 * - Cached response storage for duplicate requests
 * - Request body hash comparison for mismatch detection
 * - Configurable TTL and scope per endpoint
 * - Graceful degradation when Redis is unavailable
 *
 * Usage:
 * ```typescript
 * @Post('orders')
 * @Idempotent({ scope: 'orders', required: true })
 * async createOrder(@Body() dto: CreateOrderDto) { ... }
 * ```
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Get options from decorator metadata
    const options = this.reflector.get<IdempotencyOptions>(
      IDEMPOTENCY_KEY,
      context.getHandler(),
    ) || {};

    // Get idempotency key from header (support both formats)
    const idempotencyKey =
      (request.headers['x-idempotency-key'] as string) ||
      (request.headers['idempotency-key'] as string);

    // If no idempotency key provided
    if (!idempotencyKey) {
      if (options.required) {
        throw new BadRequestException({
          code: 'IDEMPOTENCY_KEY_REQUIRED',
          message: 'X-Idempotency-Key header is required for this endpoint',
          requestId: request.headers['x-request-id'],
        });
      }
      // Optional key not provided, proceed without idempotency checking
      return next.handle();
    }

    // Validate idempotency key format
    if (idempotencyKey.length > 256) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_TOO_LONG',
        message: 'X-Idempotency-Key must be 256 characters or less',
      });
    }

    const method = request.method;
    const path = request.path;
    const userId = (request as any).user?.id || 'anonymous';

    // Generate composite key
    const compositeKey = this.idempotencyService.generateKey(
      idempotencyKey,
      userId,
      method,
      path,
      options.scope,
    );

    // Generate request body hash if needed
    const requestHash = options.includeBodyHash
      ? this.idempotencyService.hashRequestBody(request.body)
      : undefined;

    try {
      // Try to acquire lock
      const { acquired, existingRecord } = await this.idempotencyService.tryAcquireLock(
        compositeKey,
        requestHash,
        options.ttlSeconds,
      );

      if (!acquired) {
        // Key exists - handle based on status
        if (existingRecord?.status === 'processing') {
          // Request is currently being processed
          throw new ConflictException({
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'A request with this idempotency key is currently being processed',
            idempotencyKey,
            requestId: request.headers['x-request-id'],
          });
        }

        // Check for cached response
        const cached = await this.idempotencyService.getCachedResponse(compositeKey);
        if (cached) {
          this.logger.debug(
            `Returning cached response for idempotency key: ${idempotencyKey}`,
          );

          // Set response status code if available
          if (cached.statusCode) {
            response.status(cached.statusCode);
          }

          // Add header to indicate cached response
          response.setHeader('X-Idempotency-Replayed', 'true');

          return of(cached.data);
        }

        // If we have a failed record, allow retry
        if (existingRecord?.status === 'failed') {
          // Release the old lock and try again
          await this.idempotencyService.releaseLock(compositeKey);
          const retryResult = await this.idempotencyService.tryAcquireLock(
            compositeKey,
            requestHash,
            options.ttlSeconds,
          );
          if (!retryResult.acquired) {
            throw new ConflictException({
              code: 'IDEMPOTENCY_CONFLICT',
              message: 'Failed to acquire lock for retry',
              idempotencyKey,
            });
          }
        } else {
          // Completed but no cached response (edge case)
          throw new ConflictException({
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'Request was processed but response not available',
            idempotencyKey,
          });
        }
      }

      // Process the request and cache the result
      return next.handle().pipe(
        tap({
          next: async (responseData) => {
            try {
              // Get the actual status code from response
              const statusCode = response.statusCode || HttpStatus.OK;

              // Cache successful response
              await this.idempotencyService.storeResponse(
                compositeKey,
                responseData,
                statusCode,
                options.ttlSeconds,
              );

              // Add header to indicate new response
              response.setHeader('X-Idempotency-Key', idempotencyKey);
            } catch (cacheError) {
              this.logger.error(
                `Failed to cache idempotent response: ${cacheError.message}`,
              );
              // Continue - caching failure shouldn't fail the request
            }
          },
        }),
        catchError(async (error) => {
          try {
            // Mark as failed or release lock based on error type
            if (this.isRetryableError(error)) {
              // Release lock to allow retry
              await this.idempotencyService.releaseLock(compositeKey);
              this.logger.debug(
                `Released lock for retryable error: ${idempotencyKey}`,
              );
            } else {
              // Mark as failed (prevents duplicate processing of failed request)
              await this.idempotencyService.markFailed(
                compositeKey,
                error.message,
                options.ttlSeconds,
              );
              this.logger.debug(
                `Marked failed for non-retryable error: ${idempotencyKey}`,
              );
            }
          } catch (cleanupError) {
            this.logger.error(`Failed to cleanup lock: ${cleanupError.message}`);
          }

          return throwError(() => error);
        }),
      );
    } catch (error) {
      // If it's our own error (Conflict, BadRequest), rethrow
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(`Idempotency check failed: ${error.message}`);
      // If Redis fails, proceed without idempotency (fail open)
      // For stricter handling, you could throw ServiceUnavailableException
      return next.handle();
    }
  }

  /**
   * Determine if an error is retryable
   * Retryable errors should release the lock to allow retry
   */
  private isRetryableError(error: any): boolean {
    // Network errors, timeouts, and 5xx errors are typically retryable
    const retryableStatuses = [502, 503, 504];
    const status = error.status || error.statusCode;

    if (status && retryableStatuses.includes(status)) {
      return true;
    }

    // Check for specific error types
    const retryableMessages = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'timeout',
      'network',
    ];

    const message = error.message?.toLowerCase() || '';
    return retryableMessages.some((m) => message.includes(m.toLowerCase()));
  }
}
