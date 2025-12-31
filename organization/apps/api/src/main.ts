import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';
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

  // Global exception filter with Sentry reporting
  app.useGlobalFilters(new SentryExceptionFilter(configService));

  // Security Headers Middleware (PCI DSS compliant)
  // This replaces the previous helmet configuration with more comprehensive security headers
  const securityHeadersMiddleware = new SecurityHeadersMiddleware(configService);
  app.use((req: Request, res: Response, next: NextFunction) => securityHeadersMiddleware.use(req, res, next));

  // CORS Configuration with Production Hardening
  // SECURITY: In production, CORS_ORIGIN environment variable is REQUIRED
  // This validation was already performed in validateStartupConfiguration()
  const corsOrigin = process.env.CORS_ORIGIN;

  let allowedOrigins: string[];

  if (isProduction) {
    // Production: Use strict CORS_ORIGIN from environment (validated at startup)
    // This should never be empty due to validateStartupConfiguration() checks
    if (!corsOrigin) {
      throw new Error(
        'CRITICAL: CORS_ORIGIN is required in production environment. ' +
        'This should have been caught by startup validation.'
      );
    }

    // Parse comma-separated origins and trim whitespace
    allowedOrigins = corsOrigin.split(',').map(origin => origin.trim()).filter(Boolean);

    logger.log('🔒 CORS Configuration (Production):');
    logger.log(`   Allowed Origins: ${allowedOrigins.join(', ')}`);
    logger.log(`   Credentials: enabled`);
    logger.log(`   HTTPS-only cookies: enabled`);
  } else {
    // Development: Allow localhost origins for testing
    allowedOrigins = corsOrigin
      ? corsOrigin.split(',').map(origin => origin.trim()).filter(Boolean)
      : ['http://localhost:3000', 'http://localhost:3001'];

    logger.log('🔧 CORS Configuration (Development):');
    logger.log(`   Allowed Origins: ${allowedOrigins.join(', ')}`);
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In production, strictly reject unauthorized origins
      if (isProduction) {
        logger.warn(`🚫 CORS blocked request from unauthorized origin: ${origin}`);
        return callback(
          new Error(
            `Access denied: Origin '${origin}' is not allowed by CORS policy. ` +
            `Contact support if you believe this is an error.`
          )
        );
      }

      // In development, log warning but allow (for debugging)
      logger.warn(`⚠️  CORS: Unexpected origin in development: ${origin}`);
      return callback(null, true);
    },
    credentials: true, // Allow cookies and authorization headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86400, // 24 hours - how long browsers can cache preflight requests
  });

  // Compression
  app.use(compression());

  // Cookie parser
  app.use(cookieParser());

  // HTTPS Enforcement Middleware
  // CRITICAL: Always enforce HTTPS in production to protect sensitive data
  if (isProduction) {
    app.use((req: Request, res: Response, next: NextFunction) => {
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
      res.cookie('csrf-token', newToken, {
        httpOnly: false, // Client needs to read this to send in headers
        secure: isProduction, // HTTPS only in production
        sameSite: isProduction ? 'strict' : 'lax', // Strict in production for maximum security
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
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
  await app.listen(port);

  logger.log(`
    🚀 Application is running on: http://localhost:${port}
    📚 API Documentation: http://localhost:${port}/api/docs
    🔐 Environment: ${process.env.NODE_ENV || 'development'}
    🛡️  Security Headers: Enabled (PCI DSS compliant)
  `);
}

bootstrap();
