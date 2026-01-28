import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RecaptchaService } from './recaptcha.service';
import {
  RecaptchaAction,
  RecaptchaVersion,
  RecaptchaVerificationResult,
} from './recaptcha.dto';

/**
 * Metadata key for reCAPTCHA configuration
 */
export const RECAPTCHA_KEY = 'recaptcha';

/**
 * Metadata key to skip reCAPTCHA verification
 */
export const SKIP_RECAPTCHA_KEY = 'skipRecaptcha';

/**
 * Interface for reCAPTCHA guard options
 */
export interface RecaptchaOptions {
  action?: RecaptchaAction;
  version?: RecaptchaVersion;
  scoreThreshold?: number;
  required?: boolean;
}

/**
 * Decorator to configure reCAPTCHA verification on a route
 *
 * @example
 * // Basic usage with default settings
 * @Recaptcha()
 * @Post('login')
 * async login(@Body() dto: LoginDto) { ... }
 *
 * @example
 * // With specific action and version
 * @Recaptcha({ action: RecaptchaAction.REGISTER, version: RecaptchaVersion.V3 })
 * @Post('register')
 * async register(@Body() dto: RegisterDto) { ... }
 *
 * @example
 * // With custom score threshold
 * @Recaptcha({ action: RecaptchaAction.CHECKOUT, scoreThreshold: 0.7 })
 * @Post('checkout')
 * async checkout(@Body() dto: CheckoutDto) { ... }
 */
export const Recaptcha = (options?: RecaptchaOptions) =>
  SetMetadata(RECAPTCHA_KEY, {
    action: options?.action,
    version: options?.version || RecaptchaVersion.V3,
    scoreThreshold: options?.scoreThreshold,
    required: options?.required ?? true,
  });

/**
 * Decorator to skip reCAPTCHA verification on a route
 *
 * @example
 * @SkipRecaptcha()
 * @Post('webhook')
 * async handleWebhook(@Body() payload: any) { ... }
 */
export const SkipRecaptcha = () => SetMetadata(SKIP_RECAPTCHA_KEY, true);

/**
 * reCAPTCHA Guard
 *
 * A NestJS guard that validates reCAPTCHA tokens to protect routes from bots.
 *
 * Features:
 * - Support for both reCAPTCHA v2 (checkbox/invisible) and v3 (score-based)
 * - Configurable per-route via decorators
 * - IP-based exemptions for internal services
 * - Detailed logging for security auditing
 * - Graceful handling of verification failures
 *
 * Usage:
 *
 * 1. Apply globally in your module:
 * ```typescript
 * @Module({
 *   providers: [
 *     {
 *       provide: APP_GUARD,
 *       useClass: RecaptchaGuard,
 *     },
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * 2. Or apply to specific controllers/routes:
 * ```typescript
 * @UseGuards(RecaptchaGuard)
 * @Recaptcha({ action: RecaptchaAction.LOGIN })
 * @Post('login')
 * async login(@Body() dto: LoginDto) { ... }
 * ```
 *
 * Client-side token should be sent in one of these ways:
 * - Request body: `recaptchaToken` field
 * - Request header: `X-Recaptcha-Token`
 * - Query parameter: `recaptcha_token`
 */
@Injectable()
export class RecaptchaGuard implements CanActivate {
  private readonly logger = new Logger(RecaptchaGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly recaptchaService: RecaptchaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Check if reCAPTCHA should be skipped for this route
    const skipRecaptcha = this.reflector.getAllAndOverride<boolean>(
      SKIP_RECAPTCHA_KEY,
      [handler, controller],
    );

    if (skipRecaptcha) {
      this.logger.debug(`reCAPTCHA skipped for route: ${request.url}`);
      return true;
    }

    // Get reCAPTCHA options from decorator
    const options = this.reflector.getAllAndOverride<RecaptchaOptions | undefined>(
      RECAPTCHA_KEY,
      [handler, controller],
    );

    // If no @Recaptcha decorator and not applied globally, skip verification
    if (!options) {
      return true;
    }

    // Extract token from request
    const token = this.extractToken(request);

    if (!token) {
      if (options.required !== false) {
        this.logger.warn(
          `reCAPTCHA token missing for ${request.method} ${request.url} from IP: ${this.getClientIp(request)}`,
        );
        throw new ForbiddenException('reCAPTCHA verification required');
      }
      return true;
    }

    // Get client IP address
    const clientIp = this.getClientIp(request);

    // Get expected action (from decorator, body, or header)
    const expectedAction = this.getExpectedAction(request, options);

    // Get version (from decorator or body)
    const version = this.getVersion(request, options);

    try {
      // Verify the token
      const result = await this.recaptchaService.verifyToken(
        token,
        clientIp,
        expectedAction,
        version,
      );

      // Apply custom score threshold if specified
      if (
        options.scoreThreshold !== undefined &&
        result.score !== undefined &&
        result.score < options.scoreThreshold
      ) {
        result.success = false;
        result.isBot = true;
      }

      // Store result in request for potential use by controllers
      request.recaptchaResult = result;

      if (!result.success || result.isBot) {
        this.logger.warn(
          `reCAPTCHA verification failed for ${request.method} ${request.url}: ` +
          `ip=${clientIp}, score=${result.score}, isBot=${result.isBot}, ` +
          `errors=${result.errorCodes?.join(', ') || 'none'}`,
        );

        throw new ForbiddenException(
          this.getErrorMessage(result),
        );
      }

      this.logger.debug(
        `reCAPTCHA verification passed for ${request.method} ${request.url}: ` +
        `ip=${clientIp}, score=${result.score}`,
      );

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(
        `reCAPTCHA verification error for ${request.method} ${request.url}: ${error.message}`,
        error.stack,
      );

      // In case of service error, decide whether to block or allow
      // For security, we default to blocking
      throw new ForbiddenException('reCAPTCHA verification failed');
    }
  }

  /**
   * Extract reCAPTCHA token from request
   */
  private extractToken(request: any): string | null {
    // Try request body first
    if (request.body?.recaptchaToken) {
      return request.body.recaptchaToken;
    }

    // Try header
    const headerToken = request.headers['x-recaptcha-token'];
    if (headerToken) {
      return headerToken;
    }

    // Try query parameter
    if (request.query?.recaptcha_token) {
      return request.query.recaptcha_token;
    }

    // Try alternative body field names
    if (request.body?.['g-recaptcha-response']) {
      return request.body['g-recaptcha-response'];
    }

    return null;
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(request: any): string {
    // Check common proxy headers
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      // x-forwarded-for can contain multiple IPs, get the first one (client IP)
      return forwardedFor.split(',')[0].trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return realIp;
    }

    // CloudFlare
    const cfConnectingIp = request.headers['cf-connecting-ip'];
    if (cfConnectingIp) {
      return cfConnectingIp;
    }

    // AWS ALB
    const trueClientIp = request.headers['true-client-ip'];
    if (trueClientIp) {
      return trueClientIp;
    }

    // Fall back to direct connection IP
    return request.ip || request.connection?.remoteAddress || 'unknown';
  }

  /**
   * Get expected reCAPTCHA action
   */
  private getExpectedAction(
    request: any,
    options: RecaptchaOptions,
  ): RecaptchaAction | undefined {
    // Decorator takes precedence
    if (options.action) {
      return options.action;
    }

    // Check request body
    if (request.body?.recaptchaAction) {
      return request.body.recaptchaAction as RecaptchaAction;
    }

    // Check header
    const headerAction = request.headers['x-recaptcha-action'];
    if (headerAction) {
      return headerAction as RecaptchaAction;
    }

    return undefined;
  }

  /**
   * Get reCAPTCHA version
   */
  private getVersion(
    request: any,
    options: RecaptchaOptions,
  ): RecaptchaVersion {
    // Decorator takes precedence
    if (options.version) {
      return options.version;
    }

    // Check request body
    if (request.body?.recaptchaVersion) {
      return request.body.recaptchaVersion as RecaptchaVersion;
    }

    // Check header
    const headerVersion = request.headers['x-recaptcha-version'];
    if (headerVersion) {
      return headerVersion as RecaptchaVersion;
    }

    // Default to v3
    return RecaptchaVersion.V3;
  }

  /**
   * Get user-friendly error message based on verification result
   */
  private getErrorMessage(result: RecaptchaVerificationResult): string {
    if (result.errorCodes?.includes('timeout-or-duplicate')) {
      return 'reCAPTCHA token has expired. Please try again.';
    }

    if (result.errorCodes?.includes('invalid-input-response')) {
      return 'Invalid reCAPTCHA token. Please refresh and try again.';
    }

    if (result.errorCodes?.includes('action-mismatch')) {
      return 'reCAPTCHA action mismatch. Please try again.';
    }

    if (result.isBot) {
      return 'Request blocked due to suspicious activity. Please try again.';
    }

    return 'reCAPTCHA verification failed. Please try again.';
  }
}

/**
 * Helper to check if a request has passed reCAPTCHA verification
 */
export function isRecaptchaVerified(request: any): boolean {
  return request.recaptchaResult?.success === true && !request.recaptchaResult?.isBot;
}

/**
 * Helper to get reCAPTCHA score from request
 */
export function getRecaptchaScore(request: any): number | undefined {
  return request.recaptchaResult?.score;
}
