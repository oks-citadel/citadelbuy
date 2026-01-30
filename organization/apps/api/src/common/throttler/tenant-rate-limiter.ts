import {
  Injectable,
  Logger,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RateLimitCacheService } from '../redis/rate-limit-cache.service';

/**
 * Plan-based rate limit configuration
 */
export interface TenantRateLimitConfig {
  /** Requests per minute for API calls */
  apiCallsPerMinute: number;
  /** Webhook processing calls per minute */
  webhookCallsPerMinute: number;
  /** Domain verification attempts per day */
  domainVerificationsPerDay: number;
  /** File uploads per hour */
  fileUploadsPerHour: number;
  /** Email sends per hour */
  emailSendsPerHour: number;
  /** AI operations per hour */
  aiOperationsPerHour: number;
  /** Search queries per minute */
  searchQueriesPerMinute: number;
  /** Export operations per day */
  exportsPerDay: number;
}

/**
 * Subscription plan tiers with their rate limits
 */
export const PLAN_RATE_LIMITS: Record<string, TenantRateLimitConfig> = {
  FREE: {
    apiCallsPerMinute: 60,
    webhookCallsPerMinute: 10,
    domainVerificationsPerDay: 3,
    fileUploadsPerHour: 10,
    emailSendsPerHour: 50,
    aiOperationsPerHour: 5,
    searchQueriesPerMinute: 20,
    exportsPerDay: 3,
  },
  STARTER: {
    apiCallsPerMinute: 120,
    webhookCallsPerMinute: 30,
    domainVerificationsPerDay: 5,
    fileUploadsPerHour: 50,
    emailSendsPerHour: 200,
    aiOperationsPerHour: 20,
    searchQueriesPerMinute: 50,
    exportsPerDay: 10,
  },
  PROFESSIONAL: {
    apiCallsPerMinute: 300,
    webhookCallsPerMinute: 100,
    domainVerificationsPerDay: 10,
    fileUploadsPerHour: 200,
    emailSendsPerHour: 1000,
    aiOperationsPerHour: 100,
    searchQueriesPerMinute: 150,
    exportsPerDay: 50,
  },
  ENTERPRISE: {
    apiCallsPerMinute: 1000,
    webhookCallsPerMinute: 500,
    domainVerificationsPerDay: 50,
    fileUploadsPerHour: 1000,
    emailSendsPerHour: 10000,
    aiOperationsPerHour: 500,
    searchQueriesPerMinute: 500,
    exportsPerDay: 200,
  },
  UNLIMITED: {
    apiCallsPerMinute: 10000,
    webhookCallsPerMinute: 5000,
    domainVerificationsPerDay: 500,
    fileUploadsPerHour: 10000,
    emailSendsPerHour: 100000,
    aiOperationsPerHour: 5000,
    searchQueriesPerMinute: 5000,
    exportsPerDay: 1000,
  },
};

/**
 * Operation types for rate limiting
 */
export type RateLimitOperation =
  | 'api'
  | 'webhook'
  | 'domain_verification'
  | 'file_upload'
  | 'email_send'
  | 'ai_operation'
  | 'search'
  | 'export';

/**
 * Decorator metadata keys
 */
export const TENANT_RATE_LIMIT_KEY = 'tenant:rate_limit';
export const SKIP_TENANT_RATE_LIMIT_KEY = 'tenant:skip_rate_limit';

/**
 * Decorator to specify operation type for rate limiting
 */
export function TenantRateLimit(operation: RateLimitOperation): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(TENANT_RATE_LIMIT_KEY, operation, descriptor.value);
    return descriptor;
  };
}

/**
 * Decorator to skip tenant rate limiting
 */
export function SkipTenantRateLimit(): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(SKIP_TENANT_RATE_LIMIT_KEY, true, descriptor.value);
    return descriptor;
  };
}

/**
 * Tenant Rate Limiter Guard
 *
 * Implements per-tenant rate limiting based on subscription plan.
 * Different operations have different limits, allowing for granular control.
 *
 * SECURITY: Essential for preventing tenant resource abuse and DoS attacks.
 */
@Injectable()
export class TenantRateLimiterGuard implements CanActivate {
  private readonly logger = new Logger(TenantRateLimiterGuard.name);
  private readonly keyPrefix = 'tenant:ratelimit:';

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly rateLimitCacheService: RateLimitCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if rate limiting should be skipped
    const skipRateLimit = this.reflector.getAllAndOverride<boolean>(
      SKIP_TENANT_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipRateLimit) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Extract tenant context from authenticated user
    const organizationId = request.user?.organizationId;
    const subscriptionPlan = request.user?.subscriptionPlan || 'FREE';

    if (!organizationId) {
      // No tenant context - skip tenant rate limiting, rely on global rate limiter
      return true;
    }

    // Determine operation type
    const operation = this.getOperationType(context, request);
    const limits = this.getLimitsForPlan(subscriptionPlan);
    const { limit, windowMs } = this.getLimitForOperation(operation, limits);

    // Check rate limit
    const key = `${this.keyPrefix}${organizationId}:${operation}`;
    const result = await this.rateLimitCacheService.checkRateLimit(key, {
      windowMs,
      maxRequests: limit,
    });

    // Set rate limit headers
    this.setRateLimitHeaders(response, limit, result.remaining, result.resetAt);

    if (!result.allowed) {
      this.logger.warn({
        message: 'Tenant rate limit exceeded',
        organizationId,
        operation,
        plan: subscriptionPlan,
        limit,
        windowMs,
        totalRequests: result.totalRequests,
      });

      throw new TenantRateLimitException(
        operation,
        limit,
        windowMs,
        result.resetAt,
        subscriptionPlan,
      );
    }

    return true;
  }

  /**
   * Determine the operation type from request context
   */
  private getOperationType(context: ExecutionContext, request: any): RateLimitOperation {
    // Check for explicit decorator
    const explicitOperation = this.reflector.getAllAndOverride<RateLimitOperation>(
      TENANT_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (explicitOperation) {
      return explicitOperation;
    }

    // Infer from URL path
    const path = request.path || request.url;

    if (path.includes('/webhook') || path.includes('/hooks/')) {
      return 'webhook';
    }

    if (path.includes('/domains/') && path.includes('verify')) {
      return 'domain_verification';
    }

    if (path.includes('/upload') || path.includes('/files')) {
      return 'file_upload';
    }

    if (path.includes('/email') || path.includes('/notifications/send')) {
      return 'email_send';
    }

    if (path.includes('/ai/') || path.includes('/content-generation')) {
      return 'ai_operation';
    }

    if (path.includes('/search')) {
      return 'search';
    }

    if (path.includes('/export')) {
      return 'export';
    }

    return 'api';
  }

  /**
   * Get rate limits for a subscription plan
   */
  private getLimitsForPlan(plan: string): TenantRateLimitConfig {
    const normalizedPlan = plan.toUpperCase();
    return PLAN_RATE_LIMITS[normalizedPlan] || PLAN_RATE_LIMITS.FREE;
  }

  /**
   * Get limit and window for a specific operation
   */
  private getLimitForOperation(
    operation: RateLimitOperation,
    limits: TenantRateLimitConfig,
  ): { limit: number; windowMs: number } {
    switch (operation) {
      case 'api':
        return { limit: limits.apiCallsPerMinute, windowMs: 60 * 1000 };
      case 'webhook':
        return { limit: limits.webhookCallsPerMinute, windowMs: 60 * 1000 };
      case 'domain_verification':
        return { limit: limits.domainVerificationsPerDay, windowMs: 24 * 60 * 60 * 1000 };
      case 'file_upload':
        return { limit: limits.fileUploadsPerHour, windowMs: 60 * 60 * 1000 };
      case 'email_send':
        return { limit: limits.emailSendsPerHour, windowMs: 60 * 60 * 1000 };
      case 'ai_operation':
        return { limit: limits.aiOperationsPerHour, windowMs: 60 * 60 * 1000 };
      case 'search':
        return { limit: limits.searchQueriesPerMinute, windowMs: 60 * 1000 };
      case 'export':
        return { limit: limits.exportsPerDay, windowMs: 24 * 60 * 60 * 1000 };
      default:
        return { limit: limits.apiCallsPerMinute, windowMs: 60 * 1000 };
    }
  }

  /**
   * Set rate limit headers on response
   */
  private setRateLimitHeaders(
    response: any,
    limit: number,
    remaining: number,
    resetAt: number,
  ): void {
    response.setHeader('X-RateLimit-Limit', limit);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));
    response.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));
    response.setHeader('X-RateLimit-Policy', 'tenant');
  }

  /**
   * Get current usage statistics for a tenant
   */
  async getTenantUsage(
    organizationId: string,
    subscriptionPlan: string,
  ): Promise<TenantUsageReport> {
    const limits = this.getLimitsForPlan(subscriptionPlan);
    const operations: RateLimitOperation[] = [
      'api',
      'webhook',
      'domain_verification',
      'file_upload',
      'email_send',
      'ai_operation',
      'search',
      'export',
    ];

    const usage: Record<RateLimitOperation, { used: number; limit: number; remaining: number }> =
      {} as any;

    for (const operation of operations) {
      const key = `${this.keyPrefix}${organizationId}:${operation}`;
      const { limit, windowMs } = this.getLimitForOperation(operation, limits);

      const result = await this.rateLimitCacheService.getRateLimitStatus(key, { windowMs, maxRequests: limit });

      usage[operation] = {
        used: result.totalRequests,
        limit,
        remaining: Math.max(0, limit - result.totalRequests),
      };
    }

    return {
      organizationId,
      subscriptionPlan,
      usage,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Custom exception for tenant rate limit exceeded
 */
export class TenantRateLimitException extends HttpException {
  constructor(
    public readonly operation: RateLimitOperation,
    public readonly limit: number,
    public readonly windowMs: number,
    public readonly resetAt: number,
    public readonly plan: string,
  ) {
    const retryAfter = Math.max(0, Math.ceil((resetAt - Date.now()) / 1000));
    const windowDescription = TenantRateLimitException.getWindowDescription(windowMs);

    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: 'TENANT_RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded for ${operation}. Your plan allows ${limit} ${operation} requests ${windowDescription}.`,
        error: 'Too Many Requests',
        details: {
          operation,
          limit,
          window: windowDescription,
          retryAfter,
          resetAt: new Date(resetAt).toISOString(),
          currentPlan: plan,
          upgradeUrl: '/billing/upgrade',
        },
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private static getWindowDescription(windowMs: number): string {
    if (windowMs >= 24 * 60 * 60 * 1000) {
      return 'per day';
    } else if (windowMs >= 60 * 60 * 1000) {
      return 'per hour';
    } else if (windowMs >= 60 * 1000) {
      return 'per minute';
    } else {
      return `per ${windowMs / 1000} seconds`;
    }
  }
}

/**
 * Tenant usage report interface
 */
export interface TenantUsageReport {
  organizationId: string;
  subscriptionPlan: string;
  usage: Record<RateLimitOperation, { used: number; limit: number; remaining: number }>;
  timestamp: string;
}
