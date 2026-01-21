import { SetMetadata, applyDecorators, UseInterceptors } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { IdempotencyInterceptor } from './idempotency.interceptor';

export const IDEMPOTENCY_KEY = 'idempotency';

export interface IdempotencyOptions {
  /**
   * TTL in seconds for the idempotency record
   * Default: 86400 (24 hours)
   */
  ttlSeconds?: number;

  /**
   * Custom scope for the idempotency key (e.g., 'orders', 'payments')
   * Helps organize keys and prevent collisions
   */
  scope?: string;

  /**
   * Whether the idempotency key header is required
   * If true, requests without header will receive 400 error
   * Default: false
   */
  required?: boolean;

  /**
   * Include request body hash in the idempotency key
   * Useful for detecting mismatched requests with same key
   * Default: false
   */
  includeBodyHash?: boolean;

  /**
   * Skip idempotency check for certain conditions
   * Can be used for GET-like POST endpoints
   */
  skipIf?: 'noIdempotencyKey' | 'never';
}

/**
 * Decorator to enable idempotency checking on an endpoint
 *
 * Usage:
 * ```typescript
 * @Post('orders')
 * @Idempotent({ scope: 'orders', required: true })
 * async createOrder(@Body() dto: CreateOrderDto) { ... }
 * ```
 *
 * The decorator:
 * - Applies IdempotencyInterceptor
 * - Adds OpenAPI documentation for X-Idempotency-Key header
 * - Stores options in metadata for the interceptor
 */
export function Idempotent(options: IdempotencyOptions = {}): MethodDecorator {
  return applyDecorators(
    SetMetadata(IDEMPOTENCY_KEY, options),
    UseInterceptors(IdempotencyInterceptor),
    ApiHeader({
      name: 'X-Idempotency-Key',
      description:
        'Unique key for idempotent request. ' +
        'Same key returns cached response instead of reprocessing. ' +
        `Valid for ${options.ttlSeconds || 86400} seconds.`,
      required: options.required ?? false,
    }),
  );
}

/**
 * Decorator for payment-critical endpoints
 * Uses stricter settings with required idempotency key
 */
export function IdempotentPayment(scope?: string): MethodDecorator {
  return Idempotent({
    scope: scope || 'payments',
    required: true,
    ttlSeconds: 86400 * 7, // 7 days for payment records
    includeBodyHash: true,
  });
}

/**
 * Decorator for order creation endpoints
 */
export function IdempotentOrder(): MethodDecorator {
  return Idempotent({
    scope: 'orders',
    required: false, // Recommended but not required
    ttlSeconds: 86400, // 24 hours
    includeBodyHash: true,
  });
}

/**
 * Decorator for general mutations that should be idempotent
 */
export function IdempotentMutation(scope?: string): MethodDecorator {
  return Idempotent({
    scope: scope || 'mutations',
    required: false,
    ttlSeconds: 3600, // 1 hour for general mutations
  });
}
