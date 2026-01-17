/**
 * Production Configuration Validation
 *
 * This module provides strict validation of environment variables for production deployments.
 * It ensures all required security configurations are properly set before the application starts.
 *
 * SECURITY FEATURES:
 * - JWT secret strength validation (minimum 64 characters)
 * - Encryption key format validation (exactly 64 hex characters)
 * - Database connection string validation
 * - CORS origin enforcement in production
 * - Payment provider credentials validation
 * - Email configuration validation
 *
 * USAGE:
 * This validator is automatically invoked when ConfigModule is initialized in app.module.ts
 * If any validation fails, the application will refuse to start with clear error messages.
 */

import { plainToClass } from 'class-transformer';
import { IsString, IsNotEmpty, IsUrl, IsOptional, validateSync, MinLength, IsIn } from 'class-validator';

/**
 * Environment Variables Schema
 * Defines all required and optional configuration with validation rules
 */
export class EnvironmentVariables {
  // ==================== CORE APPLICATION ====================

  @IsIn(['development', 'test', 'staging', 'production'])
  NODE_ENV: 'development' | 'test' | 'staging' | 'production' = 'development';

  @IsString()
  @IsNotEmpty()
  PORT: string = '4000';

  // ==================== SECURITY - JWT ====================

  /**
   * JWT Secret for Access Tokens
   * CRITICAL: Must be minimum 64 characters for production security
   * Generate with: openssl rand -base64 64
   */
  @IsString()
  @MinLength(64, {
    message: 'JWT_SECRET must be at least 64 characters long. Generate with: openssl rand -base64 64'
  })
  JWT_SECRET: string;

  /**
   * JWT Refresh Token Secret
   * CRITICAL: Must be minimum 64 characters and DIFFERENT from JWT_SECRET
   * Generate with: openssl rand -base64 64
   */
  @IsString()
  @MinLength(64, {
    message: 'JWT_REFRESH_SECRET must be at least 64 characters long. Generate with: openssl rand -base64 64'
  })
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN: string = '7d';

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRES_IN: string = '30d';

  // ==================== SECURITY - ENCRYPTION ====================

  /**
   * KYC Data Encryption Key
   * CRITICAL: Must be exactly 64 hexadecimal characters (32 bytes for AES-256)
   * Generate with: openssl rand -hex 32
   */
  @IsString()
  @IsNotEmpty({
    message: 'KYC_ENCRYPTION_KEY is required. Generate with: openssl rand -hex 32'
  })
  KYC_ENCRYPTION_KEY: string;

  // ==================== DATABASE ====================

  /**
   * PostgreSQL Database Connection String
   * Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
   */
  @IsString()
  @IsNotEmpty({
    message: 'DATABASE_URL is required. Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE'
  })
  DATABASE_URL: string;

  /**
   * Redis Connection String
   * Format: redis://HOST:PORT or redis://USER:PASSWORD@HOST:PORT
   */
  @IsString()
  @IsNotEmpty()
  REDIS_URL: string = 'redis://localhost:6379';

  // ==================== CORS ====================

  /**
   * CORS Allowed Origins (preferred)
   * CRITICAL: Required in production. Comma-separated list of allowed origins.
   * Example: https://broxiva.com,https://www.broxiva.com,https://app.broxiva.com
   */
  @IsOptional()
  @IsString()
  CORS_ALLOWED_ORIGINS?: string;

  /**
   * CORS Allowed Origins (legacy - for backward compatibility)
   * Use CORS_ALLOWED_ORIGINS instead for new deployments
   * @deprecated Use CORS_ALLOWED_ORIGINS instead
   */
  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  /**
   * Frontend URL
   * Used for email links and redirects
   */
  @IsUrl({ require_tld: false }, {
    message: 'FRONTEND_URL must be a valid URL'
  })
  @IsNotEmpty()
  FRONTEND_URL: string = 'http://localhost:3000';

  // ==================== PAYMENT PROVIDERS ====================

  /**
   * Stripe Secret Key
   * Required if Stripe is enabled
   */
  @IsOptional()
  @IsString()
  STRIPE_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  STRIPE_WEBHOOK_SECRET?: string;

  /**
   * PayPal Credentials
   * Required if PayPal is enabled
   */
  @IsOptional()
  @IsString()
  PAYPAL_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  PAYPAL_CLIENT_SECRET?: string;

  // ==================== EMAIL ====================

  /**
   * Email SMTP Configuration
   * Required for transactional emails
   */
  @IsString()
  @IsNotEmpty()
  EMAIL_HOST: string;

  @IsString()
  @IsNotEmpty()
  EMAIL_PORT: string = '587';

  @IsString()
  @IsNotEmpty()
  EMAIL_USER: string;

  @IsString()
  @IsNotEmpty()
  EMAIL_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  EMAIL_FROM: string = 'noreply@broxiva.com';

  // ==================== STORAGE ====================

  @IsOptional()
  @IsString()
  AWS_ACCESS_KEY_ID?: string;

  @IsOptional()
  @IsString()
  AWS_SECRET_ACCESS_KEY?: string;

  @IsOptional()
  @IsString()
  AWS_REGION?: string;

  @IsOptional()
  @IsString()
  AWS_S3_BUCKET?: string;

  // ==================== SEARCH ====================

  @IsOptional()
  @IsString()
  ELASTICSEARCH_NODE?: string;

  @IsOptional()
  @IsString()
  ALGOLIA_APP_ID?: string;

  @IsOptional()
  @IsString()
  ALGOLIA_API_KEY?: string;

  // ==================== MONITORING ====================

  @IsOptional()
  @IsString()
  SENTRY_DSN?: string;

  // ==================== LLM PROVIDERS ====================

  /**
   * OpenAI API Key
   * Required for GPT-4 content generation
   * Get from: https://platform.openai.com/api-keys
   */
  @IsOptional()
  @IsString()
  OPENAI_API_KEY?: string;

  /**
   * OpenAI Organization ID (optional)
   */
  @IsOptional()
  @IsString()
  OPENAI_ORGANIZATION?: string;

  /**
   * OpenAI Model to use
   * Default: gpt-4-turbo-preview
   */
  @IsOptional()
  @IsString()
  OPENAI_MODEL?: string;

  /**
   * Anthropic API Key
   * Required for Claude content generation
   * Get from: https://console.anthropic.com/
   */
  @IsOptional()
  @IsString()
  ANTHROPIC_API_KEY?: string;

  /**
   * Anthropic Model to use
   * Default: claude-3-5-sonnet-20241022
   */
  @IsOptional()
  @IsString()
  ANTHROPIC_MODEL?: string;

  /**
   * Primary LLM Provider
   * Options: openai, anthropic
   * Default: openai
   */
  @IsOptional()
  @IsIn(['openai', 'anthropic'])
  LLM_PRIMARY_PROVIDER?: 'openai' | 'anthropic';

  /**
   * Fallback LLM Provider
   * Used if primary provider fails
   * Options: openai, anthropic
   */
  @IsOptional()
  @IsIn(['openai', 'anthropic'])
  LLM_FALLBACK_PROVIDER?: 'openai' | 'anthropic';

  /**
   * Enable template fallback when LLM fails
   * Default: true
   */
  @IsOptional()
  @IsString()
  LLM_ENABLE_TEMPLATE_FALLBACK?: string;

  // ==================== RATE LIMITING ====================

  /**
   * Default rate limit time window (in seconds)
   * Default: 60 (1 minute)
   */
  @IsOptional()
  @IsString()
  THROTTLE_TTL?: string;

  /**
   * Default rate limit (requests per TTL window)
   * Default: 100
   */
  @IsOptional()
  @IsString()
  THROTTLE_LIMIT?: string;

  /**
   * Rate limit TTL for anonymous users (in seconds)
   * Default: 60
   */
  @IsOptional()
  @IsString()
  THROTTLE_ANONYMOUS_TTL?: string;

  /**
   * Rate limit for anonymous users
   * Default: 30
   */
  @IsOptional()
  @IsString()
  THROTTLE_ANONYMOUS_LIMIT?: string;

  /**
   * Rate limit TTL for auth endpoints (in seconds)
   * Default: 60
   */
  @IsOptional()
  @IsString()
  THROTTLE_AUTH_TTL?: string;

  /**
   * Rate limit for auth endpoints (login, register, etc.)
   * Default: 10
   */
  @IsOptional()
  @IsString()
  THROTTLE_AUTH_LIMIT?: string;

  /**
   * Rate limit TTL for webhook endpoints (in seconds)
   * Default: 60
   */
  @IsOptional()
  @IsString()
  THROTTLE_WEBHOOK_TTL?: string;

  /**
   * Rate limit for webhook endpoints
   * Default: 100
   */
  @IsOptional()
  @IsString()
  THROTTLE_WEBHOOK_LIMIT?: string;

  /**
   * Rate limit TTL for AI endpoints (in seconds)
   * Default: 60
   */
  @IsOptional()
  @IsString()
  THROTTLE_AI_TTL?: string;

  /**
   * Rate limit for AI endpoints (content generation, visual search, etc.)
   * Default: 5 for anonymous, varies by plan for authenticated
   */
  @IsOptional()
  @IsString()
  THROTTLE_AI_LIMIT?: string;

  // ==================== MFA ENFORCEMENT ====================

  /**
   * Roles that require mandatory MFA (comma-separated)
   * Default: ADMIN,VENDOR
   * Example: ADMIN,VENDOR,SUPPORT
   */
  @IsOptional()
  @IsString()
  MFA_REQUIRED_ROLES?: string;

  /**
   * Grace period in days for new users to set up MFA
   * Default: 7
   */
  @IsOptional()
  @IsString()
  MFA_GRACE_PERIOD_DAYS?: string;

  /**
   * Number of days to remember trusted devices
   * Default: 30
   */
  @IsOptional()
  @IsString()
  MFA_TRUSTED_DEVICE_DAYS?: string;

  /**
   * Enable trusted device feature (remember this device)
   * Default: true
   */
  @IsOptional()
  @IsString()
  MFA_ENABLE_TRUSTED_DEVICES?: string;
}

/**
 * Validates environment variables
 * @param config - Raw environment configuration
 * @returns Validated and typed environment variables
 * @throws Error if validation fails with detailed messages
 */
export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map(error => {
      const constraints = error.constraints ? Object.values(error.constraints) : [];
      return `  - ${error.property}: ${constraints.join(', ')}`;
    });

    throw new Error(
      `\n❌ CONFIGURATION VALIDATION FAILED ❌\n\n` +
      `The following environment variables are invalid:\n\n` +
      `${errorMessages.join('\n')}\n\n` +
      `Please check your .env file and ensure all required variables are set correctly.\n` +
      `See .env.example for reference.\n`
    );
  }

  // Additional custom validations for production
  // Skip if SKIP_PRODUCTION_VALIDATION is set (for initial deployment/testing)
  const skipValidation = process.env.SKIP_PRODUCTION_VALIDATION === 'true';
  if (validatedConfig.NODE_ENV === 'production' && !skipValidation) {
    performProductionValidation(validatedConfig);
  }

  return validatedConfig;
}

/**
 * Performs additional validation checks for production environment
 * These are security-critical checks that go beyond basic validation
 */
function performProductionValidation(config: EnvironmentVariables): void {
  const errors: string[] = [];

  // 1. CORS Origin validation - supports both CORS_ALLOWED_ORIGINS (preferred) and CORS_ORIGIN (legacy)
  const corsOrigins = config.CORS_ALLOWED_ORIGINS || config.CORS_ORIGIN;
  if (!corsOrigins || corsOrigins.trim() === '') {
    errors.push(
      '❌ CORS_ALLOWED_ORIGINS is required in production\n' +
      '   Set it to a comma-separated list of allowed origins.\n' +
      '   Example: CORS_ALLOWED_ORIGINS=https://broxiva.com,https://www.broxiva.com,https://app.broxiva.com\n' +
      '   Note: CORS_ORIGIN is also supported for backward compatibility.'
    );
  } else {
    // Validate each CORS origin is HTTPS in production
    const origins = corsOrigins.split(',').map(o => o.trim());
    const invalidOrigins = origins.filter(origin => {
      return !origin.startsWith('https://') && origin !== 'http://localhost:3000';
    });

    if (invalidOrigins.length > 0) {
      errors.push(
        `❌ CORS_ALLOWED_ORIGINS must use HTTPS in production\n` +
        `   Invalid origins: ${invalidOrigins.join(', ')}\n` +
        `   All production origins must start with https://`
      );
    }

    // Log deprecation warning if using legacy CORS_ORIGIN
    if (config.CORS_ORIGIN && !config.CORS_ALLOWED_ORIGINS) {
      console.warn(
        '⚠️  DEPRECATION WARNING: CORS_ORIGIN is deprecated.\n' +
        '   Please migrate to CORS_ALLOWED_ORIGINS for future compatibility.'
      );
    }
  }

  // 2. JWT Secret validation - ensure they're different
  if (config.JWT_SECRET === config.JWT_REFRESH_SECRET) {
    errors.push(
      '❌ JWT_SECRET and JWT_REFRESH_SECRET must be different\n' +
      '   Generate two separate secrets with: openssl rand -base64 64'
    );
  }

  // 3. Encryption key format validation
  if (config.KYC_ENCRYPTION_KEY) {
    const hexPattern = /^[0-9a-fA-F]{64}$/;
    if (!hexPattern.test(config.KYC_ENCRYPTION_KEY)) {
      errors.push(
        '❌ KYC_ENCRYPTION_KEY must be exactly 64 hexadecimal characters\n' +
        `   Current length: ${config.KYC_ENCRYPTION_KEY.length} characters\n` +
        '   Generate with: openssl rand -hex 32'
      );
    }
  }

  // 4. Database URL validation
  if (!config.DATABASE_URL.startsWith('postgresql://') && !config.DATABASE_URL.startsWith('postgres://')) {
    errors.push(
      '❌ DATABASE_URL must be a valid PostgreSQL connection string\n' +
      '   Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE'
    );
  }

  // 5. Frontend URL validation - must be HTTPS in production
  if (!config.FRONTEND_URL.startsWith('https://')) {
    errors.push(
      '❌ FRONTEND_URL must use HTTPS in production\n' +
      `   Current value: ${config.FRONTEND_URL}\n` +
      '   Example: FRONTEND_URL=https://broxiva.com'
    );
  }

  // 6. Payment provider validation
  const stripeEnabled = process.env.STRIPE_ENABLED === 'true';
  if (stripeEnabled) {
    if (!config.STRIPE_SECRET_KEY || !config.STRIPE_SECRET_KEY.startsWith('sk_')) {
      errors.push(
        '❌ STRIPE_SECRET_KEY is invalid or missing\n' +
        '   Required format: sk_live_... or sk_test_...\n' +
        '   Get from: https://dashboard.stripe.com/apikeys'
      );
    }

    if (config.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
      errors.push(
        '⚠️  WARNING: Using Stripe TEST key in production\n' +
        '   Switch to live key: sk_live_...'
      );
    }
  }

  const paypalEnabled = process.env.PAYPAL_ENABLED === 'true';
  if (paypalEnabled && (!config.PAYPAL_CLIENT_ID || !config.PAYPAL_CLIENT_SECRET)) {
    errors.push(
      '❌ PayPal is enabled but credentials are missing\n' +
      '   Required: PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET'
    );
  }

  // 7. Email configuration validation
  if (!config.EMAIL_HOST || !config.EMAIL_USER || !config.EMAIL_PASSWORD) {
    errors.push(
      '❌ Email configuration is incomplete\n' +
      '   Required: EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD\n' +
      '   These are needed for transactional emails (order confirmations, password resets, etc.)'
    );
  }

  // 8. Sentry DSN validation (recommended for production)
  if (!config.SENTRY_DSN) {
    errors.push(
      '⚠️  WARNING: SENTRY_DSN not configured\n' +
      '   Error tracking is disabled. Consider setting up Sentry for production monitoring.\n' +
      '   Get from: https://sentry.io/settings/projects/'
    );
  }

  // Throw if there are any critical errors
  if (errors.length > 0) {
    throw new Error(
      `\n${'='.repeat(80)}\n` +
      `❌ PRODUCTION CONFIGURATION VALIDATION FAILED ❌\n` +
      `${'='.repeat(80)}\n\n` +
      `The following issues must be resolved before deploying to production:\n\n` +
      `${errors.join('\n\n')}\n\n` +
      `${'='.repeat(80)}\n` +
      `For security best practices, see: docs/SECURITY_SETUP.md\n` +
      `${'='.repeat(80)}\n`
    );
  }
}

/**
 * Validates startup configuration and environment
 * Should be called in main.ts before starting the server
 */
export function validateStartupConfiguration(): void {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  // Configuration validation starting (logged by ConfigModule)
  // Environment logged by ConfigModule
  // Node version logged by ConfigModule
  // Platform logged by ConfigModule

  // Check Node.js version (require 18+)
  const nodeMajorVersion = parseInt(process.version.slice(1).split('.')[0], 10);
  if (nodeMajorVersion < 18) {
    throw new Error(
      `❌ Node.js version ${process.version} is not supported.\n` +
      `   Minimum required: Node.js 18.x\n` +
      `   Recommended: Node.js 20.x LTS`
    );
  }

  // Production-specific startup checks
  if (isProduction) {
    // Production environment checks (logged by ConfigModule)

    // Check that we're not using example/placeholder values
    const dangerousPlaceholders = [
      'your-jwt-secret',
      'your-encryption-key',
      'CHANGE_ME',
      'your_stripe_secret',
      'your_paypal',
      'your-secure-db-password',
      'sk_test_your_stripe_secret_key',
    ];

    const envString = JSON.stringify(process.env);
    const foundPlaceholders = dangerousPlaceholders.filter(placeholder =>
      envString.includes(placeholder)
    );

    if (foundPlaceholders.length > 0) {
      throw new Error(
        `❌ SECURITY RISK: Found placeholder values in production environment!\n\n` +
        `   Detected placeholders: ${foundPlaceholders.join(', ')}\n\n` +
        `   These must be replaced with real values before deploying to production.\n` +
        `   Check your .env file and replace all placeholder/example values.\n`
      );
    }

    // No placeholder values detected (logged by ConfigModule)
    // Node.js version compatible (logged by ConfigModule)
    // Production validation passed (logged by ConfigModule)
  }

  // Configuration validation completed (logged by ConfigModule)
}
