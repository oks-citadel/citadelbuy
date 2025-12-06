/**
 * Security Headers Middleware
 *
 * Implements comprehensive security headers for PCI DSS compliance
 * and general web application security best practices.
 *
 * @module SecurityHeadersMiddleware
 * @see docs/SECURITY_HEADERS.md for detailed explanation
 * @see docs/PCI_DSS_COMPLIANCE.md for compliance requirements
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly isDevelopment: boolean;
  private readonly allowedOrigins: string[];

  constructor(private readonly configService: ConfigService) {
    this.isDevelopment = this.configService.get('NODE_ENV') !== 'production';
    this.allowedOrigins = this.configService
      .get('ALLOWED_ORIGINS', 'http://localhost:3000')
      .split(',');
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // Content Security Policy (CSP)
    // Prevents XSS attacks by controlling resource loading
    res.setHeader(
      'Content-Security-Policy',
      this.buildContentSecurityPolicy()
    );

    // X-Frame-Options
    // Prevents clickjacking attacks by controlling iframe embedding
    res.setHeader('X-Frame-Options', 'DENY');

    // X-Content-Type-Options
    // Prevents MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Strict-Transport-Security (HSTS)
    // Forces HTTPS connections (not set in development)
    if (!this.isDevelopment) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }

    // X-XSS-Protection
    // Legacy XSS protection (for older browsers)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer-Policy
    // Controls referrer information sent with requests
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions-Policy (formerly Feature-Policy)
    // Controls browser features and APIs
    res.setHeader(
      'Permissions-Policy',
      this.buildPermissionsPolicy()
    );

    // X-Permitted-Cross-Domain-Policies
    // Restricts Adobe Flash and PDF cross-domain requests
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // X-DNS-Prefetch-Control
    // Controls DNS prefetching
    res.setHeader('X-DNS-Prefetch-Control', 'off');

    // X-Download-Options
    // Prevents IE from executing downloads in site context
    res.setHeader('X-Download-Options', 'noopen');

    // Cross-Origin-Embedder-Policy
    // Controls cross-origin resource embedding
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    // Cross-Origin-Opener-Policy
    // Isolates browsing context from cross-origin documents
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

    // Cross-Origin-Resource-Policy
    // Controls cross-origin resource sharing
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    // Remove sensitive headers that expose technology stack
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    next();
  }

  /**
   * Build Content Security Policy header value
   *
   * CSP is one of the most important security headers for preventing XSS attacks.
   * It defines which resources can be loaded and executed on the page.
   */
  private buildContentSecurityPolicy(): string {
    const directives: Record<string, string[]> = {
      // Default fallback for all resource types
      'default-src': ["'self'"],

      // Script sources (JavaScript)
      'script-src': [
        "'self'",
        // Stripe.js (required for PCI DSS compliant payment processing)
        'https://js.stripe.com',
        // PayPal SDK
        'https://www.paypal.com',
        'https://www.sandbox.paypal.com',
        // Google Analytics (if used)
        'https://www.google-analytics.com',
        'https://ssl.google-analytics.com',
        // Development only: allow 'unsafe-eval' for HMR
        ...(this.isDevelopment ? ["'unsafe-eval'"] : []),
        // Allow inline scripts with nonce (better than 'unsafe-inline')
        // Note: In production, use nonce-based CSP for inline scripts
      ],

      // Style sources (CSS)
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Required for many CSS-in-JS solutions
        // Stripe Elements styling
        'https://js.stripe.com',
        // Google Fonts
        'https://fonts.googleapis.com',
      ],

      // Image sources
      'img-src': [
        "'self'",
        'data:', // Data URIs (base64 images)
        'blob:', // Blob URLs
        'https:', // Allow HTTPS images (CDNs, etc.)
        // Stripe
        'https://*.stripe.com',
        // PayPal
        'https://*.paypal.com',
      ],

      // Font sources
      'font-src': [
        "'self'",
        'data:',
        // Google Fonts
        'https://fonts.gstatic.com',
      ],

      // AJAX, WebSocket, and EventSource connections
      'connect-src': [
        "'self'",
        // API endpoints
        ...this.allowedOrigins,
        // Stripe API
        'https://api.stripe.com',
        // PayPal API
        'https://api.paypal.com',
        'https://api.sandbox.paypal.com',
        // Analytics
        'https://www.google-analytics.com',
      ],

      // Frames (iframes)
      'frame-src': [
        "'self'",
        // Stripe Elements (uses iframes)
        'https://js.stripe.com',
        'https://hooks.stripe.com',
        // PayPal
        'https://www.paypal.com',
        'https://www.sandbox.paypal.com',
      ],

      // Object/embed/applet sources (usually blocked)
      'object-src': ["'none'"],

      // Media sources (audio/video)
      'media-src': ["'self'"],

      // Web Workers
      'worker-src': [
        "'self'",
        'blob:',
      ],

      // Form action destinations
      'form-action': [
        "'self'",
        // PayPal form submissions
        'https://www.paypal.com',
        'https://www.sandbox.paypal.com',
      ],

      // Ancestors (who can embed this page in frame/iframe)
      'frame-ancestors': ["'none'"], // Same as X-Frame-Options: DENY

      // Base URI restriction
      'base-uri': ["'self'"],

      // Manifest sources (PWA)
      'manifest-src': ["'self'"],
    };

    // Additional security directives
    const additionalDirectives = [
      // Block all mixed content (HTTP resources on HTTPS pages)
      'block-all-mixed-content',
      // Upgrade insecure requests to HTTPS
      'upgrade-insecure-requests',
    ];

    // Build CSP string
    const cspParts = Object.entries(directives).map(
      ([directive, sources]) => `${directive} ${sources.join(' ')}`
    );

    return [...cspParts, ...additionalDirectives].join('; ');
  }

  /**
   * Build Permissions Policy header value
   *
   * Controls which browser features and APIs can be used
   */
  private buildPermissionsPolicy(): string {
    const policies: Record<string, string> = {
      // Accelerometer
      'accelerometer': '()',

      // Ambient light sensor
      'ambient-light-sensor': '()',

      // Autoplay (allow same-origin only)
      'autoplay': '(self)',

      // Battery API
      'battery': '()',

      // Camera
      'camera': '()',

      // Display capture
      'display-capture': '()',

      // Document domain
      'document-domain': '()',

      // Encrypted media
      'encrypted-media': '(self)',

      // Fullscreen
      'fullscreen': '(self)',

      // Geolocation
      'geolocation': '()',

      // Gyroscope
      'gyroscope': '()',

      // Magnetometer
      'magnetometer': '()',

      // Microphone
      'microphone': '()',

      // MIDI
      'midi': '()',

      // Payment (allow for Stripe/PayPal)
      'payment': '(self)',

      // Picture-in-picture
      'picture-in-picture': '()',

      // Publickey credentials (WebAuthn)
      'publickey-credentials-get': '(self)',

      // Screen wake lock
      'screen-wake-lock': '()',

      // Sync XHR (deprecated, block)
      'sync-xhr': '()',

      // USB
      'usb': '()',

      // Web Share
      'web-share': '(self)',

      // XR spatial tracking
      'xr-spatial-tracking': '()',
    };

    return Object.entries(policies)
      .map(([feature, allowlist]) => `${feature}=${allowlist}`)
      .join(', ');
  }
}

/**
 * Helper function to generate CSP nonce for inline scripts
 *
 * Usage in controller:
 * @example
 * const nonce = generateNonce();
 * res.setHeader('Content-Security-Policy', `script-src 'nonce-${nonce}'`);
 * // In HTML: <script nonce="${nonce}">...</script>
 */
export function generateNonce(): string {
  return require('crypto').randomBytes(16).toString('base64');
}

/**
 * Security Headers Configuration Type
 *
 * Can be used to customize headers per route
 */
export interface SecurityHeadersConfig {
  enableCSP?: boolean;
  enableHSTS?: boolean;
  enableFrameProtection?: boolean;
  customCSP?: string;
  allowFraming?: boolean;
  additionalHeaders?: Record<string, string>;
}

/**
 * Decorator to customize security headers for specific routes
 *
 * @example
 * @UseSecurityHeaders({ allowFraming: true })
 * @Get('/embed')
 * getEmbeddableContent() { ... }
 */
export const SecurityHeadersConfig = (config: SecurityHeadersConfig): MethodDecorator => {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('security:headers', config, descriptor.value);
    return descriptor;
  };
};
