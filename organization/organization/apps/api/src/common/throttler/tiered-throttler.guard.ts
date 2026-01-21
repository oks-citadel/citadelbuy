import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import {
  ThrottlerGuard,
  ThrottlerException,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RateLimitCacheService } from '../redis/rate-limit-cache.service';
import {
  ThrottlerConfig,
  UserPlan,
  EndpointGroup,
  OperationType,
  getThrottlerConfig,
  getRateLimit,
  RateLimitTier,
} from './throttler.config';

/**
 * Metadata key for endpoint group
 */
export const THROTTLE_GROUP_KEY = 'throttle:group';

/**
 * Metadata key for operation type
 */
export const THROTTLE_OPERATION_KEY = 'throttle:operation';

/**
 * Metadata key to skip throttling
 */
export const SKIP_THROTTLE_KEY = 'throttle:skip';

/**
 * Extended request interface with user information
 */
interface ExtendedRequest {
  user?: {
    id?: string;
    sub?: string;
    email?: string;
    role?: string;
    plan?: UserPlan;
    subscriptionTier?: string;
  };
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
  connection?: {
    remoteAddress?: string;
  };
  headers: Record<string, string | string[] | undefined>;
  method: string;
  url: string;
  path: string;
}

/**
 * Extended response interface for rate limit headers
 */
interface ExtendedResponse {
  setHeader: (name: string, value: string | number) => void;
  getHeader: (name: string) => string | number | string[] | undefined;
}

/**
 * Rate limit information to be attached to the request
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: number;
  tracker: string;
}

/**
 * Tiered Throttler Guard
 *
 * Provides comprehensive rate limiting with:
 * - Per-IP rate limiting for unauthenticated requests
 * - Per-user rate limiting for authenticated requests
 * - Per-plan rate limiting (free vs premium)
 * - Separate limits for write vs read operations
 * - Different limits per endpoint group (auth, api, webhooks)
 */
@Injectable()
export class TieredThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(TieredThrottlerGuard.name);
  private throttlerConfig: ThrottlerConfig;

  constructor(
    @Inject('THROTTLER_OPTIONS') protected readonly options: ThrottlerModuleOptions,
    protected readonly storageService: ThrottlerStorage,
    protected readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly rateLimitCacheService: RateLimitCacheService,
  ) {
    super(options, storageService, reflector);
    this.throttlerConfig = getThrottlerConfig(this.configService);
  }

  /**
   * Override getTracker to return a Promise<string> as expected by base class
   * We ignore the group parameter here since we handle it in canActivate
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use user ID for authenticated requests
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    if (req.user?.sub) {
      return `user:${req.user.sub}`;
    }
    // Use IP for anonymous requests
    return this.getClientIpFromRecord(req);
  }

  /**
   * Get client IP from a generic Record type
   */
  private getClientIpFromRecord(req: Record<string, any>): string {
    const forwarded = req.headers?.['x-forwarded-for'];
    if (forwarded) {
      const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return `ip:${forwardedIp.split(',')[0].trim()}`;
    }
    return `ip:${req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown'}`;
  }

  /**
   * Main guard method - checks if request should be throttled
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ExtendedRequest>();
    const response = context.switchToHttp().getResponse<ExtendedResponse>();

    // Check if throttling should be skipped for this endpoint
    const skipThrottle = this.reflector.getAllAndOverride<boolean>(
      SKIP_THROTTLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipThrottle) {
      return true;
    }

    // Get endpoint configuration
    const endpointGroup = this.getEndpointGroup(context, request);
    const operationType = this.getOperationType(context, request);
    const isAuthenticated = !!request.user?.id || !!request.user?.sub;
    const userPlan = this.getUserPlan(request);

    // Get rate limit tier for this context
    const tier = getRateLimit(this.throttlerConfig, {
      isAuthenticated,
      userPlan,
      endpointGroup,
      operationType,
    });

    // Get tracker key (user ID for authenticated, IP for anonymous)
    const tracker = this.getTrackerKey(request, endpointGroup);

    // Check rate limit using Redis
    const rateLimitKey = `${tracker}:${endpointGroup}`;
    const result = await this.rateLimitCacheService.checkRateLimit(rateLimitKey, {
      windowMs: tier.ttl * 1000,
      maxRequests: tier.limit,
    });

    // Store rate limit info on request for use in response
    (request as any).rateLimitInfo = {
      limit: tier.limit,
      remaining: result.remaining,
      resetAt: result.resetAt,
      tracker,
    } as RateLimitInfo;

    // Set rate limit headers
    this.setRateLimitHeaders(response, tier, result);

    // If rate limit exceeded, throw exception
    if (!result.allowed) {
      this.logger.warn(
        `Rate limit exceeded for ${tracker} on ${endpointGroup} endpoint. ` +
        `Limit: ${tier.limit}/${tier.ttl}s, Total requests: ${result.totalRequests}`,
      );

      throw new RateLimitExceededException(
        tier.limit,
        tier.ttl,
        result.resetAt,
        tracker,
      );
    }

    return true;
  }

  /**
   * Get tracker key for the current request context
   */
  private getTrackerKey(request: ExtendedRequest, _group: EndpointGroup): string {
    // Use user ID for authenticated requests
    if (request.user?.id) {
      return `user:${request.user.id}`;
    }

    if (request.user?.sub) {
      return `user:${request.user.sub}`;
    }

    // Use IP for anonymous requests
    const ip = this.getClientIpExtended(request);
    return `ip:${ip}`;
  }

  /**
   * Extract client IP address from extended request
   */
  private getClientIpExtended(request: ExtendedRequest): string {
    // Check various headers for proxied IPs
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return forwardedIp.split(',')[0].trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    const cfIp = request.headers['cf-connecting-ip'];
    if (cfIp) {
      return Array.isArray(cfIp) ? cfIp[0] : cfIp;
    }

    // Fallback to direct connection IP
    return (
      request.ip ||
      request.socket?.remoteAddress ||
      request.connection?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Get user's subscription plan
   */
  private getUserPlan(request: ExtendedRequest): UserPlan {
    if (request.user?.plan) {
      return request.user.plan;
    }

    // Map subscription tier to UserPlan
    const tier = request.user?.subscriptionTier?.toLowerCase();
    if (tier) {
      if (tier.includes('enterprise')) return UserPlan.ENTERPRISE;
      if (tier.includes('premium')) return UserPlan.PREMIUM;
      if (tier.includes('basic') || tier.includes('starter')) return UserPlan.BASIC;
    }

    // Check role for admin/vendor - give them basic plan by default
    const role = request.user?.role?.toUpperCase();
    if (role === 'ADMIN' || role === 'VENDOR') {
      return UserPlan.BASIC;
    }

    return UserPlan.FREE;
  }

  /**
   * Determine endpoint group from request context
   */
  private getEndpointGroup(
    context: ExecutionContext,
    request: ExtendedRequest,
  ): EndpointGroup {
    // Check for explicit group annotation
    const explicitGroup = this.reflector.getAllAndOverride<EndpointGroup>(
      THROTTLE_GROUP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (explicitGroup) {
      return explicitGroup;
    }

    // Determine from URL path
    const path = request.path || request.url;

    if (path.includes('/auth/') || path.includes('/login') || path.includes('/register')) {
      return EndpointGroup.AUTH;
    }

    if (path.includes('/webhook') || path.includes('/hooks/')) {
      return EndpointGroup.WEBHOOKS;
    }

    if (path.includes('/admin/')) {
      return EndpointGroup.ADMIN;
    }

    if (path.includes('/search') || path.includes('/products') && request.method === 'GET') {
      return EndpointGroup.SEARCH;
    }

    if (path.includes('/upload') || path.includes('/files')) {
      return EndpointGroup.UPLOAD;
    }

    if (path.includes('/ai/') || path.includes('/content-generation') || path.includes('/visual-search')) {
      return EndpointGroup.AI;
    }

    return EndpointGroup.API;
  }

  /**
   * Determine operation type from request method
   */
  private getOperationType(
    context: ExecutionContext,
    request: ExtendedRequest,
  ): OperationType {
    // Check for explicit operation annotation
    const explicitOperation = this.reflector.getAllAndOverride<OperationType>(
      THROTTLE_OPERATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (explicitOperation) {
      return explicitOperation;
    }

    // Determine from HTTP method
    const method = request.method.toUpperCase();

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return OperationType.WRITE;
    }

    return OperationType.READ;
  }

  /**
   * Set rate limit headers on response
   */
  private setRateLimitHeaders(
    response: ExtendedResponse,
    tier: RateLimitTier,
    result: { remaining: number; resetAt: number },
  ): void {
    response.setHeader('X-RateLimit-Limit', tier.limit);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));
    response.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

    // Also set standard RateLimit headers (RFC draft)
    response.setHeader('RateLimit-Limit', tier.limit);
    response.setHeader('RateLimit-Remaining', Math.max(0, result.remaining));
    response.setHeader('RateLimit-Reset', Math.ceil(result.resetAt / 1000));
  }
}

/**
 * Custom exception for rate limit exceeded
 */
export class RateLimitExceededException extends HttpException {
  constructor(
    public readonly limit: number,
    public readonly ttl: number,
    public readonly resetAt: number,
    public readonly tracker: string,
  ) {
    const retryAfter = Math.max(0, Math.ceil((resetAt - Date.now()) / 1000));

    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        error: 'Too Many Requests',
        details: {
          limit,
          ttl,
          retryAfter,
          resetAt: new Date(resetAt).toISOString(),
        },
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /**
   * Get retry-after header value in seconds
   */
  getRetryAfter(): number {
    return Math.max(0, Math.ceil((this.resetAt - Date.now()) / 1000));
  }
}
