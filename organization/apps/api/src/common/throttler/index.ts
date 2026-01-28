/**
 * Comprehensive Rate Limiting Module
 *
 * Provides tiered rate limiting with:
 * - Per-IP rate limiting for unauthenticated requests
 * - Per-user rate limiting for authenticated requests
 * - Per-plan rate limiting (free vs premium)
 * - Separate limits for write vs read operations
 * - Different limits per endpoint group (auth, api, webhooks)
 * - Rate limit headers on all responses
 *
 * @module throttler
 */

// Configuration
export {
  ThrottlerConfig,
  RateLimitTier,
  PlanRateLimits,
  GroupRateLimits,
  UserPlan,
  EndpointGroup,
  OperationType,
  DEFAULT_THROTTLER_CONFIG,
  getThrottlerConfig,
  getRateLimit,
} from './throttler.config';

// Guard
export {
  TieredThrottlerGuard,
  RateLimitExceededException,
  RateLimitInfo,
  THROTTLE_GROUP_KEY,
  THROTTLE_OPERATION_KEY,
  SKIP_THROTTLE_KEY,
} from './tiered-throttler.guard';

// Decorators
export {
  ThrottleGroup,
  ThrottleOperation,
  SkipThrottle,
  TieredThrottle,
  AuthThrottle,
  SearchThrottle,
  UploadThrottle,
  AiThrottle,
  WebhookThrottle,
  AdminThrottle,
  ApiReadThrottle,
  ApiWriteThrottle,
} from './throttler.decorators';

// Interceptor
export { RateLimitHeadersInterceptor } from './rate-limit-headers.interceptor';

// Module
export { ThrottlerConfigModule } from './throttler.module';

// Tenant Rate Limiter
export {
  TenantRateLimiterGuard,
  TenantRateLimitException,
  TenantRateLimitConfig,
  TenantUsageReport,
  RateLimitOperation,
  TenantRateLimit,
  SkipTenantRateLimit,
  PLAN_RATE_LIMITS,
  TENANT_RATE_LIMIT_KEY,
  SKIP_TENANT_RATE_LIMIT_KEY,
} from './tenant-rate-limiter';
