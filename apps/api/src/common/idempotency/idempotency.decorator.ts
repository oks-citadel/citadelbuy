import { SetMetadata, applyDecorators, UseInterceptors } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IDEMPOTENCY_KEY, IdempotencyOptions } from './idempotency.constants';

// Re-export for backward compatibility
export { IDEMPOTENCY_KEY, IdempotencyOptions } from './idempotency.constants';

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
