import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';

/**
 * CSRF Protection Guard
 * Validates CSRF tokens for state-changing operations (POST, PUT, PATCH, DELETE)
 *
 * Usage:
 * - Apply to controllers/routes that perform state changes
 * - Frontend must include X-CSRF-Token header
 * - Token is generated and stored in httpOnly cookie
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip CSRF check for development environment
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only check state-changing methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return true;
    }

    // Skip CSRF for certain routes (webhook endpoints, etc.)
    const skipCsrf = this.reflector.get<boolean>(
      'skipCsrf',
      context.getHandler(),
    );

    if (skipCsrf) {
      return true;
    }

    const csrfToken = request.headers['x-csrf-token'];
    const csrfCookie = request.cookies?.['csrf-token'];

    if (!csrfToken || !csrfCookie) {
      this.logger.warn(
        `CSRF token missing for ${method} ${request.url} from ${request.ip}`,
      );
      throw new ForbiddenException('CSRF token missing');
    }

    // Constant-time comparison to prevent timing attacks
    if (!this.compareTokens(csrfToken, csrfCookie)) {
      this.logger.warn(
        `Invalid CSRF token for ${method} ${request.url} from ${request.ip}`,
      );
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }

  /**
   * Constant-time token comparison to prevent timing attacks
   */
  private compareTokens(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}
