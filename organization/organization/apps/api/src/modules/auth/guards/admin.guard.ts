import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Admin-Only Access Guard
 *
 * Restricts access to ADMIN role only:
 * - 401 Unauthorized if no user is authenticated
 * - 403 Forbidden if user is not an ADMIN
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, AdminGuard)
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const path = request.url;
    const method = request.method;

    if (!user) {
      this.logger.warn(`No user in request for admin route ${method} ${path}`);
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required to access this resource.',
        errorCode: 'AUTH_REQUIRED',
      });
    }

    if (user.role !== 'ADMIN') {
      this.logger.warn(
        `Access denied for user ${user.id} (${user.role}) to admin route ${method} ${path}`
      );
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Admin access required. This resource is restricted to administrators.',
        errorCode: 'ADMIN_REQUIRED',
        requiredRole: 'ADMIN',
        userRole: user.role,
      });
    }

    return true;
  }
}
