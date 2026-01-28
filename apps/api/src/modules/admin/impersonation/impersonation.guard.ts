import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ImpersonationService } from './impersonation.service';
import { ImpersonationMode } from './dto/start-impersonation.dto';

/**
 * Metadata key for allowing write operations during impersonation
 */
export const ALLOW_IMPERSONATION_WRITE_KEY = 'allowImpersonationWrite';

/**
 * Decorator to allow write operations during impersonation for specific endpoints
 * By default, impersonation in VIEW_ONLY mode blocks all mutating requests
 */
export const AllowImpersonationWrite = () =>
  (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(ALLOW_IMPERSONATION_WRITE_KEY, true, descriptor?.value || target);
    return descriptor || target;
  };

/**
 * HTTP methods considered as "write" operations
 */
const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Paths that are always allowed during impersonation (even in VIEW_ONLY mode)
 * These are typically authentication-related or read-only endpoints
 */
const ALWAYS_ALLOWED_PATHS = [
  '/admin/stop-impersonation',
  '/admin/impersonation-history',
  '/auth/logout',
  '/auth/mfa/status',
  '/me',
  '/me/profile',
];

/**
 * ImpersonationAuditGuard
 *
 * This guard performs two critical functions:
 * 1. Logs all actions performed while impersonating a user
 * 2. Enforces VIEW_ONLY mode restrictions for impersonation sessions
 *
 * It should be applied globally or to all routes that need audit logging
 * during impersonation.
 */
@Injectable()
export class ImpersonationAuditGuard implements CanActivate {
  private readonly logger = new Logger(ImpersonationAuditGuard.name);

  constructor(
    private readonly impersonationService: ImpersonationService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Extract user from request (set by JwtAuthGuard/JwtStrategy)
    const user = request.user;

    // If no user or not an impersonation session, allow the request
    if (!user || !user.isImpersonation) {
      return true;
    }

    const sessionId = user.sessionId;
    const mode = user.mode as ImpersonationMode;
    const impersonatorId = user.impersonatorId;

    // Verify session is still active
    if (!this.impersonationService.isSessionActive(sessionId)) {
      this.logger.warn(
        `Attempted action with expired impersonation session: ${sessionId}`,
      );
      throw new ForbiddenException(
        'Your impersonation session has expired. Please start a new session.',
      );
    }

    const method = request.method;
    const path = request.path || request.url;
    const isWriteOperation = WRITE_METHODS.includes(method);

    // Check if this is a VIEW_ONLY session attempting a write operation
    if (mode === ImpersonationMode.VIEW_ONLY && isWriteOperation) {
      // Check if path is always allowed
      const isAlwaysAllowed = ALWAYS_ALLOWED_PATHS.some(
        (allowedPath) => path.startsWith(allowedPath) || path === allowedPath,
      );

      // Check if endpoint has AllowImpersonationWrite decorator
      const allowWrite = this.reflector.getAllAndOverride<boolean>(
        ALLOW_IMPERSONATION_WRITE_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (!isAlwaysAllowed && !allowWrite) {
        this.logger.warn(
          `Blocked write operation during VIEW_ONLY impersonation: ${method} ${path} (Session: ${sessionId})`,
        );
        throw new ForbiddenException(
          'This impersonation session is in view-only mode. Write operations are not permitted.',
        );
      }
    }

    // Log the action after the response is sent
    response.on('finish', async () => {
      try {
        await this.impersonationService.logAction(sessionId, {
          method,
          path,
          requestBody: this.getLoggableBody(request.body),
          statusCode: response.statusCode,
          ipAddress: this.getClientIp(request),
          userAgent: request.headers?.['user-agent'],
        });
      } catch (error) {
        this.logger.error(
          `Failed to log impersonation action: ${error.message}`,
        );
      }
    });

    // Add impersonation context to request for downstream use
    request.impersonationContext = {
      sessionId,
      impersonatorId,
      mode,
      isImpersonation: true,
    };

    return true;
  }

  /**
   * Extract a loggable version of the request body
   * Removes sensitive fields and limits size
   */
  private getLoggableBody(body: any): Record<string, any> | undefined {
    if (!body || typeof body !== 'object') {
      return undefined;
    }

    // Sensitive fields to redact
    const sensitiveFields = [
      'password',
      'newPassword',
      'currentPassword',
      'confirmPassword',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
      'secret',
      'creditCard',
      'cardNumber',
      'cvv',
      'cvc',
      'ssn',
      'socialSecurityNumber',
      'mfaCode',
      'pin',
      'securityCode',
    ];

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(body)) {
      if (sensitiveFields.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.getLoggableBody(value);
      } else if (typeof value === 'string' && value.length > 1000) {
        // Truncate long strings
        sanitized[key] = value.substring(0, 1000) + '...[TRUNCATED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Get client IP from request
   */
  private getClientIp(request: any): string {
    const headers = request.headers || {};
    const ipHeaders = [
      'x-forwarded-for',
      'x-real-ip',
      'cf-connecting-ip',
      'x-client-ip',
    ];

    for (const header of ipHeaders) {
      const value = headers[header];
      if (value) {
        return value.split(',')[0].trim();
      }
    }

    return request.ip || request.connection?.remoteAddress || 'unknown';
  }
}

/**
 * ImpersonationBlockGuard
 *
 * Use this guard on specific routes that should NEVER be accessible during impersonation.
 * For example: changing passwords, managing payment methods, MFA settings, etc.
 */
@Injectable()
export class ImpersonationBlockGuard implements CanActivate {
  private readonly logger = new Logger(ImpersonationBlockGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.isImpersonation) {
      this.logger.warn(
        `Blocked access to restricted endpoint during impersonation: ${request.method} ${request.path}`,
      );
      throw new ForbiddenException(
        'This action is not permitted during an impersonation session for security reasons.',
      );
    }

    return true;
  }
}
