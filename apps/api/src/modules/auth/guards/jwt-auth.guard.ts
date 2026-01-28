import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

/**
 * Enhanced JWT Authentication Guard
 *
 * Provides proper error handling for JWT authentication:
 * - 401 for expired tokens with clear message
 * - 401 for invalid tokens with appropriate message
 * - 401 for missing tokens
 *
 * SECURITY: All authentication failures return 401 Unauthorized
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  /**
   * Handle request authentication result
   * Override to provide better error messages and logging
   */
  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    info: any,
    context: ExecutionContext,
  ): TUser {
    // Log authentication attempts for security monitoring
    const request = context.switchToHttp().getRequest();
    const path = request.url;
    const method = request.method;

    // Handle various error scenarios
    if (err) {
      this.logger.warn(`Authentication error on ${method} ${path}: ${err.message}`);
      throw err;
    }

    if (!user) {
      // Provide specific error messages based on the info from passport-jwt
      if (info instanceof TokenExpiredError) {
        this.logger.debug(`Token expired on ${method} ${path}`);
        throw new UnauthorizedException({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Token has expired. Please login again.',
          errorCode: 'TOKEN_EXPIRED',
        });
      }

      if (info instanceof JsonWebTokenError) {
        this.logger.warn(`Invalid token on ${method} ${path}: ${info.message}`);
        throw new UnauthorizedException({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid authentication token.',
          errorCode: 'INVALID_TOKEN',
        });
      }

      if (info?.message === 'No auth token') {
        this.logger.debug(`Missing token on ${method} ${path}`);
        throw new UnauthorizedException({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Authentication required. Please provide a valid token.',
          errorCode: 'TOKEN_MISSING',
        });
      }

      // Generic unauthorized error
      const errorMessage = info?.message || 'Authentication failed';
      this.logger.warn(`Authentication failed on ${method} ${path}: ${errorMessage}`);
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: errorMessage,
        errorCode: 'AUTH_FAILED',
      });
    }

    return user;
  }
}
