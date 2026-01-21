import { Module, Global } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyInterceptor } from './idempotency.interceptor';

/**
 * Idempotency Module
 *
 * Provides idempotency support for API endpoints to prevent duplicate
 * processing of requests. Essential for payment and order operations.
 *
 * Features:
 * - IdempotencyService: Core service for managing idempotency records
 * - IdempotencyInterceptor: NestJS interceptor for automatic handling
 * - Decorators: @Idempotent, @IdempotentPayment, @IdempotentOrder
 *
 * Usage:
 * 1. Import IdempotencyModule in your app module
 * 2. Apply decorators to endpoints:
 *    ```typescript
 *    @Post('orders')
 *    @Idempotent({ scope: 'orders' })
 *    async createOrder() { ... }
 *    ```
 *
 * The module is marked as @Global so IdempotencyService and
 * IdempotencyInterceptor are available throughout the application.
 */
@Global()
@Module({
  providers: [IdempotencyService, IdempotencyInterceptor],
  exports: [IdempotencyService, IdempotencyInterceptor],
})
export class IdempotencyModule {}
