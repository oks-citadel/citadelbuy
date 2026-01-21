import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { PermissionService } from '../services/permission.service';

@Injectable()
export class OrganizationPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions specified, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Extract organization ID from params or body
    const organizationId = this.extractOrganizationId(request);

    if (!organizationId) {
      throw new BadRequestException('Organization ID required');
    }

    // Check permissions
    const hasPermission = await this.permissionService.checkPermissions(
      user.id,
      organizationId,
      requiredPermissions,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    // Attach organization to request for downstream use
    const organization = await this.permissionService.getOrganization(organizationId);
    request.organization = organization;

    return true;
  }

  private extractOrganizationId(request: any): string | null {
    // Try different param names
    const paramNames = ['orgId', 'organizationId', 'id'];

    for (const name of paramNames) {
      if (request.params?.[name]) {
        return request.params[name];
      }
    }

    // Try body
    if (request.body?.organizationId) {
      return request.body.organizationId;
    }

    // Try query
    if (request.query?.organizationId) {
      return request.query.organizationId;
    }

    return null;
  }
}
