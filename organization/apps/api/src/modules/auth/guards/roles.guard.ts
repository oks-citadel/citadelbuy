import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';

/**
 * Role-Based Access Control Guard (Auth Module)
 *
 * Enforces role requirements on protected routes:
 * - 401 Unauthorized if no user is authenticated
 * - 403 Forbidden if user lacks required role
 *
 * Usage:
 * @Roles('ADMIN', 'VENDOR')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const path = request.url;
    const method = request.method;

    if (!user) {
      this.logger.warn(`No user in request for role-protected route ${method} ${path}`);
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required to access this resource.',
        errorCode: 'AUTH_REQUIRED',
      });
    }

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      this.logger.warn(
        `Access denied for user ${user.id} (${user.role}) to ${method} ${path}. Required roles: ${requiredRoles.join(', ')}`
      );
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: `Access denied. This resource requires one of the following roles: ${requiredRoles.join(', ')}.`,
        errorCode: 'INSUFFICIENT_ROLE',
        requiredRoles,
        userRole: user.role,
      });
    }

    return true;
  }
}
