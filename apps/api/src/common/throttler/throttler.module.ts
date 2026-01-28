import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TieredThrottlerGuard } from './tiered-throttler.guard';
import { RateLimitHeadersInterceptor } from './rate-limit-headers.interceptor';

/**
 * Comprehensive Throttler Module
 *
 * Provides tiered rate limiting with:
 * - Per-IP rate limiting for unauthenticated requests
 * - Per-user rate limiting for authenticated requests
 * - Per-plan rate limiting (free vs premium)
 * - Separate limits for write vs read operations
 * - Different limits per endpoint group (auth, api, webhooks)
 * - Rate limit headers on all responses
 *
 * Uses Redis for distributed rate limiting across multiple instances.
 *
 * Usage:
 * Import this module in your app.module.ts. The module automatically
 * provides the TieredThrottlerGuard as a global guard and the
 * RateLimitHeadersInterceptor as a global interceptor.
 *
 * For custom throttling on specific endpoints, use the provided decorators:
 *
 * @example
 * ```typescript
 * import { ThrottleGroup, ThrottleOperation, SkipThrottle } from './common/throttler';
 * import { EndpointGroup, OperationType } from './common/throttler';
 *
 * // Apply custom throttle group
 * @ThrottleGroup(EndpointGroup.AUTH)
 * @Post('login')
 * async login() { ... }
 *
 * // Skip throttling for health checks
 * @SkipThrottle()
 * @Get('health')
 * async health() { ... }
 * ```
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    TieredThrottlerGuard,
    RateLimitHeadersInterceptor,
    // Register TieredThrottlerGuard as global guard
    {
      provide: APP_GUARD,
      useClass: TieredThrottlerGuard,
    },
    // Register RateLimitHeadersInterceptor as global interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitHeadersInterceptor,
    },
  ],
  exports: [TieredThrottlerGuard, RateLimitHeadersInterceptor],
})
export class ThrottlerConfigModule {}
