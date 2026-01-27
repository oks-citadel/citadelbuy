import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { validateStartupConfiguration } from './common/config/config-validation';
import { CustomLoggerService } from './common/logger/logger.service';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';

// Fix BigInt serialization for JSON responses (Prisma count returns BigInt)
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function bootstrap() {
  // Create app with custom logger
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Get services
  const configService = app.get(ConfigService);
  const logger = await app.resolve(CustomLoggerService);
  logger.setContext('Bootstrap');

  // Use custom logger for the application
  app.useLogger(logger);

  // Determine if running in production environment
  const isProduction = process.env.NODE_ENV === 'production';

  // Global exception filters
  // 1. HttpExceptionFilter - Comprehensive error handling with CORS headers, structured responses
  // 2. SentryExceptionFilter - Error reporting to Sentry (for 5xx errors)
  // Note: Filters are executed in reverse order, so HttpExceptionFilter runs last and handles the response
  app.useGlobalFilters(
    new SentryExceptionFilter(configService),
    new HttpExceptionFilter(configService),
  );

  // Security Headers Middleware (PCI DSS compliant)
  // This replaces the previous helmet configuration with more comprehensive security headers
  const securityHeadersMiddleware = new SecurityHeadersMiddleware(configService);
  app.use((req: Request, res: Response, next: NextFunction) => securityHeadersMiddleware.use(req, res, next));

  // CORS Configuration with Production Hardening
  // SECURITY: In production, CORS_ALLOWED_ORIGINS environment variable is REQUIRED
  // This validation was already performed in validateStartupConfiguration()
  // Supports both CORS_ALLOWED_ORIGINS (preferred) and CORS_ORIGIN (legacy) for backward compatibility
  const corsOrigins = process.env.CORS_ALLOWED_ORIGINS || process.env.CORS_ORIGIN;

  let allowedOrigins: string[];

  if (isProduction) {
    // Production: Use strict CORS_ALLOWED_ORIGINS from environment (validated at startup)
    // This should never be empty due to validateStartupConfiguration() checks
    if (!corsOrigins) {
      throw new Error(
        'CRITICAL: CORS_ALLOWED_ORIGINS is required in production environment. ' +
        'This should have been caught by startup validation.'
      );
    }

    // Parse comma-separated origins and trim whitespace
    allowedOrigins = corsOrigins.split(',').map(origin => origin.trim()).filter(Boolean);

    logger.log('CORS Configuration (Production):');
    logger.log(`   Allowed Origins: ${allowedOrigins.join(', ')}`);
    logger.log(`   Credentials: enabled`);
    logger.log(`   HTTPS-only cookies: enabled`);
  } else {
    // Development: Allow localhost origins for testing
    allowedOrigins = corsOrigins
      ? corsOrigins.split(',').map(origin => origin.trim()).filter(Boolean)
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:4200', 'http://127.0.0.1:3000'];

    logger.log('CORS Configuration (Development):');
    logger.log(`   Allowed Origins: ${allowedOrigins.join(', ')}`);
  }

  // CORS allowed headers - includes standard and custom headers for mobile/web clients
  const corsAllowedHeaders = [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-Requested-With',
    'Accept',
    'Accept-Language',
    'Origin',
    // Custom device/session tracking headers
    'x-device-type',
    'x-device-id',
    'x-session-id',
    // Additional common headers
    'x-api-key',
    'x-request-id',
    'x-correlation-id',
    'Cache-Control',
    'Pragma',
  ];

  // CORS exposed headers - headers the client can access from the response
  const corsExposedHeaders = [
    'X-Total-Count',
    'X-Page-Count',
    'X-Request-Id',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'Content-Disposition',
  ];

  // Vercel preview deployment pattern (e.g., https://broxiva-xyz123.vercel.app)
  // This regex matches Vercel preview URLs for the broxiva project
  const vercelPreviewPattern = /^https:\/\/broxiva(-[a-z0-9]+)?\.vercel\.app$/;

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Check for Vercel preview deployments (production only)
      // This allows preview deployments like https://broxiva-abc123.vercel.app
      if (isProduction && vercelPreviewPattern.test(origin)) {
        logger.log(`CORS: Allowing Vercel preview deployment: ${origin}`);
        return callback(null, true);
      }

      // In production, strictly reject unauthorized origins
      if (isProduction) {
        logger.warn(`CORS blocked request from unauthorized origin: ${origin}`);
        return callback(
          new Error(
            `Access denied: Origin '${origin}' is not allowed by CORS policy. ` +
            `Contact support if you believe this is an error.`
          )
        );
      }

      // In development, log warning but allow (for debugging)
      logger.warn(`CORS: Unexpected origin in development: ${origin}`);
      return callback(null, true);
    },
    credentials: true, // Allow cookies and authorization headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: corsAllowedHeaders,
    exposedHeaders: corsExposedHeaders,
    maxAge: 86400, // 24 hours - how long browsers can cache preflight requests
    preflightContinue: false, // Pass the CORS preflight response to the next handler
    optionsSuccessStatus: 204, // Return 204 for OPTIONS requests (some legacy browsers choke on 204)
  });

  // Explicit OPTIONS handler for all routes to ensure preflight requests succeed
  // This catches any OPTIONS requests that might be blocked by other middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS') {
      // Set CORS headers explicitly for OPTIONS requests
      const origin = req.headers.origin;
      const isAllowedOrigin = origin && (
        allowedOrigins.includes(origin) ||
        vercelPreviewPattern.test(origin) ||
        !isProduction
      );
      if (isAllowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
        res.setHeader('Access-Control-Allow-Headers', corsAllowedHeaders.join(', '));
        res.setHeader('Access-Control-Expose-Headers', corsExposedHeaders.join(', '));
        res.setHeader('Access-Control-Max-Age', '86400');
      }
      // Return 204 No Content for preflight requests
      return res.status(204).end();
    }
    next();
  });

  // Compression
  app.use(compression());

  // Cookie parser
  app.use(cookieParser());

  // HTTPS Enforcement Middleware
  // CRITICAL: Always enforce HTTPS in production to protect sensitive data
  if (isProduction) {
    app.use((req: Request, res: Response, next: NextFunction) => {
      // Skip HTTPS enforcement for health check endpoints (used by K8s and ALB probes)
      // These endpoints must be accessible via HTTP for internal cluster communication
      if (req.url.startsWith('/api/health')) {
        return next();
      }

      // Check for HTTPS via X-Forwarded-Proto header (common behind load balancers)
      // or via the secure connection directly
      const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

      if (!isHttps) {
        // Redirect to HTTPS
        const httpsUrl = `https://${req.headers.host}${req.url}`;
        logger.warn(`Redirecting HTTP request to HTTPS: ${req.url}`);
        return res.redirect(301, httpsUrl);
      }

      // Set HSTS header to enforce HTTPS for future requests
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

      next();
    });
    logger.log('🔒 HTTPS enforcement enabled for production');
  }

  // CSRF Protection Middleware
  // SECURITY: This validates CSRF tokens for state-changing operations (POST, PUT, PATCH, DELETE)
  // Protects against Cross-Site Request Forgery attacks by requiring a token that only the legitimate
  // client can provide. The token is stored in a cookie and must be sent in request headers/body.
  //
  // Implementation:
  // 1. Safe methods (GET, HEAD, OPTIONS) are always allowed
  // 2. Webhook endpoints are excluded (they use separate verification via signatures)
  // 3. First state-changing request generates a token and allows the request
  // 4. Subsequent requests must provide matching token or are rejected with 403
  //
  // Token flow:
  // - Server sets 'csrf-token' cookie (httpOnly: false, so client can read)
  // - Client must send token in 'X-CSRF-Token' header or '_csrf' body field
  // - Token is validated against cookie value
  app.use((req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    const method = req.method;

    // Skip CSRF for safe methods (don't modify state)
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next();
    }

    // Skip CSRF for webhook endpoints (external integrations use signature verification)
    if (path.startsWith('/api/webhooks/')) {
      return next();
    }

    // For state-changing operations, require CSRF token
    const csrfToken = req.headers['x-csrf-token'] ||
                     req.headers['csrf-token'] ||
                     req.body?._csrf;

    // Get the expected token from cookie
    const expectedToken = req.cookies['csrf-token'];

    // If no expected token exists, generate one
    if (!expectedToken) {
      const crypto = require('crypto');
      const newToken = crypto.randomBytes(32).toString('hex');

      // Get cookie domain from environment or extract from FRONTEND_URL
      // Using domain with leading dot allows both www and non-www subdomains
      const frontendUrl = process.env.FRONTEND_URL || '';
      let cookieDomain: string | undefined;
      if (isProduction && frontendUrl) {
        try {
          const url = new URL(frontendUrl);
          // Extract the root domain (e.g., 'broxiva.com' from 'www.broxiva.com')
          const hostParts = url.hostname.split('.');
          if (hostParts.length >= 2) {
            // Use last two parts for domain (handles .com, .co.uk, etc.)
            cookieDomain = '.' + hostParts.slice(-2).join('.');
          }
        } catch {
          // Fall back to no explicit domain if URL parsing fails
        }
      }

      res.cookie('csrf-token', newToken, {
        httpOnly: false, // Client needs to read this to send in headers
        secure: isProduction, // HTTPS only in production
        // IMPORTANT: For cross-origin requests (Vercel frontend to Railway backend),
        // sameSite must be 'none' to allow cookies to be sent with cross-origin requests.
        // This requires secure: true (HTTPS) in production.
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        // Note: domain is omitted for cross-origin setups as cookies need to be set
        // on the API domain, not shared across domains
      });
      // For first request without token, allow it but set the cookie
      // This enables the client to get the token for subsequent requests
      return next();
    }

    // Validate token for subsequent requests
    if (!csrfToken || csrfToken !== expectedToken) {
      return res.status(403).json({
        statusCode: 403,
        message: 'Invalid CSRF token. Please refresh the page and try again.',
        error: 'Forbidden',
      });
    }

    next();
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Interceptors
  // 1. ClassSerializerInterceptor - Handles @Exclude() and @Transform() decorators from class-transformer
  // 2. ResponseTransformInterceptor - Wraps all responses in standardized format
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector, {
      excludeExtraneousValues: false, // Don't require @Expose() on every field
      enableImplicitConversion: true,
    }),
    new ResponseTransformInterceptor(reflector),
  );

  // Swagger documentation (disabled in production for security)
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Broxiva API')
      .setDescription(
        'Broxiva E-Commerce Platform - Comprehensive REST API for multi-vendor marketplace with advanced features including AI-powered recommendations, real-time inventory, cart abandonment recovery, and organization management.',
      )
      .setVersion('1.0.0')
      .setContact(
        'Broxiva Support',
        'https://broxiva.com',
        'support@broxiva.com',
      )
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      // Core Features
      .addTag('Authentication', 'User registration, login, password reset, and social authentication')
      .addTag('Users', 'User profile management and preferences')
      .addTag('Products', 'Product catalog, search, filtering, and management')
      .addTag('Shopping Cart', 'Shopping cart operations, inventory reservation, and cart sharing')
      .addTag('Checkout', 'Checkout flow, payment methods, and address management')
      .addTag('Orders', 'Order creation, tracking, and history')
      .addTag('Payments', 'Payment processing and transaction management')

      // Marketplace Features
      .addTag('Categories', 'Product category browsing and management')
      .addTag('Vendors', 'Vendor profiles, products, and analytics')
      .addTag('Reviews', 'Product reviews and ratings')
      .addTag('Wishlist', 'User wishlist management')
      .addTag('Search', 'Advanced product search with Elasticsearch')

      // Business Features
      .addTag('Coupons', 'Discount codes and promotional campaigns')
      .addTag('Deals', 'Daily deals and flash sales')
      .addTag('Gift Cards', 'Gift card purchase and redemption')
      .addTag('Loyalty', 'Loyalty points and rewards program')
      .addTag('Subscriptions', 'Subscription products and recurring billing')

      // Organization & Multi-tenancy
      .addTag('Organizations', 'Organization creation and management')
      .addTag('Organization Members', 'Team member management and invitations')
      .addTag('Organization Roles', 'Role-based access control and permissions')
      .addTag('Organization Billing', 'Billing, invoices, and subscription management')
      .addTag('Organization Audit', 'Audit logs and activity tracking')
      .addTag('Organization KYC', 'Know Your Customer verification')

      // Operations
      .addTag('Inventory', 'Stock management and availability tracking')
      .addTag('Shipping', 'Shipping rates, carriers, and tracking')
      .addTag('Returns', 'Return requests and refund processing')
      .addTag('Support', 'Customer support tickets and live chat')
      .addTag('Notifications', 'Push notifications and email alerts')

      // Analytics & Marketing
      .addTag('Analytics', 'Sales analytics and performance metrics')
      .addTag('Recommendations', 'AI-powered product recommendations')
      .addTag('Email Marketing', 'Email campaigns and templates')
      .addTag('SEO', 'SEO optimization and metadata management')
      .addTag('Social', 'Social media integration and sharing')

      // AI Features
      .addTag('AI - Smart Search', 'AI-powered semantic product search')
      .addTag('AI - Personalization', 'Personalized shopping experiences')
      .addTag('AI - Visual Search', 'Image-based product search')
      .addTag('AI - Chatbot', 'Conversational AI shopping assistant')
      .addTag('AI - Pricing', 'Dynamic pricing optimization')
      .addTag('AI - Fraud Detection', 'Real-time fraud prevention')

      // System
      .addTag('Health', 'System health checks and status')
      .addTag('Admin', 'Administrative operations and reporting')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'Broxiva API Documentation',
      customfavIcon: 'https://broxiva.com/favicon.ico',
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #2c3e50; }
        .swagger-ui .info .description { font-size: 14px; line-height: 1.6; }
      `,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  const port = process.env.PORT || 4000;

  // Enable graceful shutdown hooks for Kubernetes/container environments
  // This ensures connections are properly closed before the process exits
  app.enableShutdownHooks();

  // Graceful shutdown handler
  const gracefulShutdown = async (signal: string) => {
    logger.log(`Received ${signal}. Starting graceful shutdown...`);

    try {
      // Give time for health check to fail and stop routing traffic
      logger.log('Waiting for load balancer to stop routing traffic...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Close the application
      logger.log('Closing application...');
      await app.close();

      logger.log('Application closed successfully. Exiting.');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  // Handle termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  });

  await app.listen(port);

  logger.log(`
    Application is running on: http://localhost:${port}
    API Documentation: http://localhost:${port}/api/docs
    Environment: ${process.env.NODE_ENV || 'development'}
    Security Headers: Enabled (PCI DSS compliant)
    Graceful Shutdown: Enabled
  `);
}

bootstrap();
