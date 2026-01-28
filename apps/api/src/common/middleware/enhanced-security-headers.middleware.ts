import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Sensitive endpoint patterns for enhanced caching restrictions
 */
const SENSITIVE_ENDPOINTS = [
  '/auth/',
  '/login',
  '/logout',
  '/password',
  '/mfa',
  '/2fa',
  '/token',
  '/refresh',
  '/admin/',
  '/billing/',
  '/payment/',
  '/subscription/',
  '/settings/',
  '/profile/',
  '/user/',
  '/me/',
  '/export/',
  '/pii/',
];

/**
 * Enhanced Security Headers Middleware
 *
 * Provides additional security headers for API responses beyond the base
 * SecurityHeadersMiddleware, with specific enhancements for:
 * - Cache control for sensitive endpoints
 * - Clear-Site-Data on logout
 * - Enhanced CORS handling
 * - Request ID tracking
 * - Response timing protection
 *
 * SECURITY: Complements existing security headers with defense-in-depth controls.
 */
@Injectable()
export class EnhancedSecurityHeadersMiddleware implements NestMiddleware {
  private readonly logger = new Logger(EnhancedSecurityHeadersMiddleware.name);
  private readonly isDevelopment: boolean;
  private readonly enableReportOnly: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isDevelopment = this.configService.get('NODE_ENV') !== 'production';
    this.enableReportOnly = this.configService.get('SECURITY_REPORT_ONLY', false);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // Generate request ID if not present
    const requestId = this.getOrGenerateRequestId(req);
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);

    // Skip heavy processing for OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      return next();
    }

    // Apply core security headers
    this.applyCoreSecurityHeaders(res);

    // Apply cache control based on endpoint sensitivity
    this.applyCacheControl(req, res);

    // Apply Clear-Site-Data for logout endpoints
    if (this.isLogoutEndpoint(req)) {
      this.applyClearSiteData(res);
    }

    // Apply timing protection headers
    this.applyTimingProtection(res);

    // Apply API-specific headers
    this.applyApiSecurityHeaders(res);

    // Apply CSP reporting if enabled
    if (!this.isDevelopment && this.enableReportOnly) {
      this.applyCSPReporting(res);
    }

    // Remove potentially leaky headers
    this.removeLeakyHeaders(res);

    next();
  }

  /**
   * Get or generate a request ID for tracing
   */
  private getOrGenerateRequestId(req: Request): string {
    return (
      (req.headers['x-request-id'] as string) ||
      (req.headers['x-correlation-id'] as string) ||
      `req_${crypto.randomUUID().replace(/-/g, '')}`
    );
  }

  /**
   * Apply core security headers
   */
  private applyCoreSecurityHeaders(res: Response): void {
    // X-Content-Type-Options - Prevent MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // X-Frame-Options - Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // X-XSS-Protection - Legacy XSS protection for older browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer-Policy - Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // X-Download-Options - Prevent IE from executing downloads
    res.setHeader('X-Download-Options', 'noopen');

    // X-Permitted-Cross-Domain-Policies - Block Flash/PDF cross-domain
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // X-DNS-Prefetch-Control - Control DNS prefetching
    res.setHeader('X-DNS-Prefetch-Control', 'off');

    // Expect-CT - Certificate Transparency (for production only)
    if (!this.isDevelopment) {
      const reportUri = this.configService.get<string>('CT_REPORT_URI');
      const ctHeader = reportUri
        ? `max-age=86400, enforce, report-uri="${reportUri}"`
        : 'max-age=86400, enforce';
      res.setHeader('Expect-CT', ctHeader);
    }
  }

  /**
   * Apply appropriate cache control based on endpoint sensitivity
   */
  private applyCacheControl(req: Request, res: Response): void {
    const path = req.path.toLowerCase();

    // Check if endpoint is sensitive
    const isSensitive = SENSITIVE_ENDPOINTS.some((pattern) =>
      path.includes(pattern.toLowerCase()),
    );

    if (isSensitive) {
      // Strict no-cache for sensitive endpoints
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      );
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Prevent caching by CDNs
      res.setHeader('Surrogate-Control', 'no-store');

      // Vary header to prevent cache key collisions
      res.setHeader('Vary', 'Authorization, Cookie');
    } else {
      // Public API endpoints can have conservative caching
      // But still no caching for authenticated requests
      const hasAuth = req.headers.authorization || req.headers.cookie;

      if (hasAuth) {
        res.setHeader('Cache-Control', 'private, no-cache, must-revalidate');
        res.setHeader('Vary', 'Authorization, Cookie');
      } else {
        // Public endpoints can have short cache
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
      }
    }
  }

  /**
   * Apply Clear-Site-Data header for logout endpoints
   *
   * This instructs the browser to clear all data associated with this origin,
   * providing a clean logout experience.
   */
  private applyClearSiteData(res: Response): void {
    // Clear all cached data, cookies, and storage on logout
    res.setHeader(
      'Clear-Site-Data',
      '"cache", "cookies", "storage", "executionContexts"',
    );

    this.logger.debug('Applied Clear-Site-Data header for logout');
  }

  /**
   * Check if the request is to a logout endpoint
   */
  private isLogoutEndpoint(req: Request): boolean {
    const path = req.path.toLowerCase();
    const method = req.method.toUpperCase();

    return (
      (path.includes('/logout') || path.includes('/signout')) &&
      ['POST', 'DELETE'].includes(method)
    );
  }

  /**
   * Apply timing attack protection headers
   */
  private applyTimingProtection(res: Response): void {
    // Prevent timing-based cross-origin attacks
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // Server-Timing header (only in development for debugging)
    // NEVER expose detailed timing in production
    if (this.isDevelopment) {
      const startTime = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        // Note: This is just for demonstration
        // In real implementation, use proper timing middleware
        this.logger.debug(`Request completed in ${duration}ms`);
      });
    }
  }

  /**
   * Apply API-specific security headers
   */
  private applyApiSecurityHeaders(res: Response): void {
    // Content-Type for API responses
    // Don't override if already set
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }

    // X-Content-Type-Options already set in core headers

    // API version header (helps with debugging and compatibility)
    const apiVersion = this.configService.get<string>('API_VERSION', 'v1');
    res.setHeader('X-API-Version', apiVersion);

    // Deprecation header for deprecated endpoints
    // (Would be set by specific controllers)

    // Rate limit headers are set by the rate limiter guard
  }

  /**
   * Apply CSP reporting configuration
   */
  private applyCSPReporting(res: Response): void {
    const reportUri = this.configService.get<string>('CSP_REPORT_URI');

    if (reportUri) {
      // Report-To header (modern browsers)
      const reportTo = JSON.stringify({
        group: 'csp-violations',
        max_age: 86400,
        endpoints: [{ url: reportUri }],
      });
      res.setHeader('Report-To', reportTo);

      // NEL (Network Error Logging)
      const nel = JSON.stringify({
        report_to: 'csp-violations',
        max_age: 86400,
      });
      res.setHeader('NEL', nel);
    }
  }

  /**
   * Remove headers that might leak information
   */
  private removeLeakyHeaders(res: Response): void {
    // Remove server identification headers
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // Remove ASP.NET version (if somehow present)
    res.removeHeader('X-AspNet-Version');
    res.removeHeader('X-AspNetMvc-Version');

    // Remove PHP version (if somehow present)
    res.removeHeader('X-PHP-Version');
  }

  /**
   * Generate HSTS header value
   */
  generateHstsHeader(options?: {
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  }): string {
    const maxAge = options?.maxAge || 31536000; // 1 year
    let header = `max-age=${maxAge}`;

    if (options?.includeSubDomains !== false) {
      header += '; includeSubDomains';
    }

    if (options?.preload) {
      header += '; preload';
    }

    return header;
  }
}

/**
 * Factory function to create configured middleware
 */
export function createEnhancedSecurityHeaders(configService: ConfigService) {
  return new EnhancedSecurityHeadersMiddleware(configService);
}

/**
 * Decorator to apply specific cache control to a route
 */
export function CacheControl(directives: string): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('cache:control', directives, descriptor.value);
    return descriptor;
  };
}

/**
 * Decorator to mark endpoint as sensitive (no caching)
 */
export function SensitiveEndpoint(): MethodDecorator {
  return CacheControl('no-store, no-cache, must-revalidate, private');
}

/**
 * Decorator to allow public caching
 */
export function PublicCache(maxAge: number = 60): MethodDecorator {
  return CacheControl(`public, max-age=${maxAge}`);
}
