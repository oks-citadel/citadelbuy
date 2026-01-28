import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { REQUIRE_TENANT_KEY, SKIP_TENANT_KEY } from '../decorators/tenant.decorator';
import { TenantContextService } from '../services/tenant-context.service';

/**
 * Tenant information attached to request
 */
export interface TenantInfo {
  id: string;
  name?: string;
  slug?: string;
  status?: string;
  settings?: Record<string, unknown>;
}

/**
 * Request with tenant context
 */
export interface RequestWithTenant {
  tenant?: TenantInfo;
  tenantId?: string;
  user?: {
    id: string;
    tenantId?: string;
    organizationId?: string;
    role?: string;
    [key: string]: unknown;
  };
  headers: {
    'x-bx-tenant'?: string;
    'x-bx-trace-id'?: string;
    [key: string]: string | string[] | undefined;
  };
}

/**
 * Tenant Guard
 *
 * Enforces tenant context on all protected routes.
 * - Reads x-bx-tenant header or tenant from JWT
 * - Rejects requests without valid tenant with 403
 * - Attaches tenant to request object
 * - Logs all cross-tenant access attempts
 *
 * SECURITY: This guard prevents cross-tenant data access
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if tenant validation should be skipped
    const skipTenant = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipTenant) {
      return true;
    }

    // Check if tenant is required (explicit requirement)
    const requireTenant = this.reflector.getAllAndOverride<boolean>(REQUIRE_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const { method, url } = request;
    const traceId = request.headers['x-bx-trace-id'] || 'unknown';

    // Extract tenant ID from multiple sources (priority order):
    // 1. x-bx-tenant header
    // 2. JWT claim (tenantId or organizationId)
    // 3. Query parameter (for specific use cases)
    let tenantId = this.extractTenantId(request);

    // If no tenant ID found and tenant is required, reject
    if (!tenantId && requireTenant) {
      this.logger.warn(
        `Missing tenant context on ${method} ${url} [traceId: ${traceId}]`,
        {
          method,
          url,
          traceId,
          userId: request.user?.id,
        },
      );
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Tenant context required. Please provide x-bx-tenant header or authenticate with a tenant.',
        errorCode: 'TENANT_REQUIRED',
      });
    }

    // If tenant ID found, validate it
    if (tenantId) {
      const isValid = await this.validateTenant(tenantId, request);
      if (!isValid) {
        this.logger.warn(
          `Invalid tenant ID "${tenantId}" on ${method} ${url} [traceId: ${traceId}]`,
          {
            method,
            url,
            traceId,
            tenantId,
            userId: request.user?.id,
          },
        );
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Invalid or inactive tenant.',
          errorCode: 'INVALID_TENANT',
        });
      }

      // Check for cross-tenant access attempts
      if (request.user?.tenantId && request.user.tenantId !== tenantId) {
        this.logCrossTenantAttempt(request, tenantId);
        throw new ForbiddenException({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Cross-tenant access denied.',
          errorCode: 'CROSS_TENANT_ACCESS_DENIED',
        });
      }

      // Attach tenant to request
      request.tenantId = tenantId;
      request.tenant = await this.getTenantInfo(tenantId);

      // Set tenant in context service for propagation
      this.tenantContextService.setTenantId(tenantId);
    }

    return true;
  }

  /**
   * Extract tenant ID from request
   */
  private extractTenantId(request: RequestWithTenant): string | undefined {
    // Priority 1: x-bx-tenant header
    const headerTenant = request.headers['x-bx-tenant'];
    if (headerTenant && typeof headerTenant === 'string') {
      return headerTenant;
    }

    // Priority 2: JWT claim
    if (request.user?.tenantId) {
      return request.user.tenantId;
    }

    if (request.user?.organizationId) {
      return request.user.organizationId;
    }

    return undefined;
  }

  /**
   * Validate tenant exists and is active
   */
  private async validateTenant(
    tenantId: string,
    request: RequestWithTenant,
  ): Promise<boolean> {
    try {
      // Use tenant context service for validation
      return await this.tenantContextService.validateTenantAccess(tenantId);
    } catch (error) {
      this.logger.error(`Tenant validation error for "${tenantId}": ${error.message}`);
      return false;
    }
  }

  /**
   * Get tenant information
   */
  private async getTenantInfo(tenantId: string): Promise<TenantInfo> {
    try {
      const tenant = await this.tenantContextService.getTenantInfo(tenantId);
      return tenant || { id: tenantId };
    } catch (error) {
      this.logger.error(`Error fetching tenant info for "${tenantId}": ${error.message}`);
      return { id: tenantId };
    }
  }

  /**
   * Log cross-tenant access attempts for security monitoring
   */
  private logCrossTenantAttempt(request: RequestWithTenant, targetTenantId: string): void {
    const traceId = request.headers['x-bx-trace-id'] || 'unknown';

    this.logger.warn(
      `SECURITY: Cross-tenant access attempt detected`,
      {
        event: 'cross_tenant_access_attempt',
        method: request['method'],
        url: request['url'],
        traceId,
        userId: request.user?.id,
        userTenantId: request.user?.tenantId,
        targetTenantId,
        timestamp: new Date().toISOString(),
      },
    );
  }
}

/**
 * Optional Tenant Guard
 *
 * Similar to TenantGuard but allows requests without tenant context.
 * Useful for public endpoints that can optionally be scoped to a tenant.
 */
@Injectable()
export class OptionalTenantGuard implements CanActivate {
  private readonly logger = new Logger(OptionalTenantGuard.name);

  constructor(
    private readonly tenantContextService: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();

    // Extract tenant ID if present
    const tenantId = request.headers['x-bx-tenant'] as string ||
      request.user?.tenantId ||
      request.user?.organizationId;

    if (tenantId) {
      try {
        const isValid = await this.tenantContextService.validateTenantAccess(tenantId);
        if (isValid) {
          request.tenantId = tenantId;
          request.tenant = await this.tenantContextService.getTenantInfo(tenantId) || { id: tenantId };
          this.tenantContextService.setTenantId(tenantId);
        }
      } catch (error) {
        this.logger.warn(`Optional tenant validation failed: ${error.message}`);
      }
    }

    return true;
  }
}
