import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Tenant context containing resolved tenant information
 */
export interface TenantContext {
  tenantId: string;
  host: string;
  domainType: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    status: string;
    logoUrl?: string;
    primaryColor?: string;
  };
}

/**
 * Extended Request with tenant context
 */
export interface RequestWithTenant extends Request {
  tenantContext?: TenantContext;
  tenantId?: string;
}

/**
 * Async Local Storage for tenant context
 * Allows accessing tenant information from any part of the request lifecycle
 */
export const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Get current tenant context from async local storage
 */
export function getCurrentTenantContext(): TenantContext | undefined {
  return tenantStorage.getStore();
}

/**
 * Get current tenant ID from async local storage
 */
export function getCurrentTenantId(): string | undefined {
  return tenantStorage.getStore()?.tenantId;
}

/**
 * Interface for the domains service (to avoid circular dependency)
 */
interface DomainsServiceInterface {
  resolveTenant(host: string): Promise<TenantContext | null>;
}

/**
 * Tenant Context Middleware
 *
 * Extracts the host from the request, looks up the tenant domain,
 * and attaches tenant context to the request object.
 *
 * This middleware enables multi-tenancy by resolving which organization
 * the request belongs to based on the incoming hostname.
 *
 * Headers set:
 * - X-BX-Tenant: The resolved tenant ID
 * - X-BX-Tenant-Slug: The tenant's slug
 *
 * Request properties set:
 * - req.tenantContext: Full tenant context object
 * - req.tenantId: Shorthand for tenant ID
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);
  private domainsService: DomainsServiceInterface | null = null;

  /**
   * Set the domains service (called by the module after initialization)
   * This avoids circular dependency issues
   */
  setDomainsService(service: DomainsServiceInterface): void {
    this.domainsService = service;
  }

  /**
   * Extract host from request headers
   * Handles various proxy configurations and header formats
   */
  private extractHost(req: Request): string | null {
    // Priority order for host extraction:
    // 1. X-Forwarded-Host (behind proxy/load balancer)
    // 2. X-Original-Host (some CDNs)
    // 3. Host header (direct connection)

    const forwardedHost = req.headers['x-forwarded-host'] as string;
    if (forwardedHost) {
      // May contain multiple hosts, take the first
      return forwardedHost.split(',')[0].trim().toLowerCase();
    }

    const originalHost = req.headers['x-original-host'] as string;
    if (originalHost) {
      return originalHost.toLowerCase();
    }

    const host = req.headers['host'] as string;
    if (host) {
      // Remove port if present
      return host.split(':')[0].toLowerCase();
    }

    return null;
  }

  async use(req: RequestWithTenant, res: Response, next: NextFunction): Promise<void> {
    const host = this.extractHost(req);

    if (!host) {
      this.logger.debug('No host header found, skipping tenant resolution');
      return next();
    }

    // Skip tenant resolution for certain paths
    const skipPaths = [
      '/health',
      '/ready',
      '/metrics',
      '/api/v1/health',
      '/api/docs',
      '/swagger',
    ];

    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Skip if domains service is not available
    if (!this.domainsService) {
      this.logger.warn('DomainsService not available, skipping tenant resolution');
      return next();
    }

    try {
      // Resolve tenant from host
      const tenantContext = await this.domainsService.resolveTenant(host);

      if (tenantContext) {
        // Attach to request
        req.tenantContext = tenantContext;
        req.tenantId = tenantContext.tenantId;

        // Set response headers
        res.setHeader('X-BX-Tenant', tenantContext.tenantId);
        if (tenantContext.tenant?.slug) {
          res.setHeader('X-BX-Tenant-Slug', tenantContext.tenant.slug);
        }

        this.logger.debug(
          `Resolved tenant ${tenantContext.tenantId} for host ${host}`,
        );

        // Run rest of request in tenant context
        tenantStorage.run(tenantContext, () => {
          next();
        });
      } else {
        this.logger.debug(`No tenant found for host ${host}`);
        next();
      }
    } catch (error) {
      this.logger.error(
        `Error resolving tenant for host ${host}: ${error.message}`,
      );
      // Continue without tenant context on error
      next();
    }
  }
}

/**
 * Simple tenant context middleware that doesn't require async service injection
 * Uses direct database/cache lookup
 */
@Injectable()
export class SimpleTenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SimpleTenantContextMiddleware.name);

  constructor() {}

  /**
   * Extract host from request headers
   */
  private extractHost(req: Request): string | null {
    const forwardedHost = req.headers['x-forwarded-host'] as string;
    if (forwardedHost) {
      return forwardedHost.split(',')[0].trim().toLowerCase();
    }

    const originalHost = req.headers['x-original-host'] as string;
    if (originalHost) {
      return originalHost.toLowerCase();
    }

    const host = req.headers['host'] as string;
    if (host) {
      return host.split(':')[0].toLowerCase();
    }

    return null;
  }

  use(req: RequestWithTenant, res: Response, next: NextFunction): void {
    const host = this.extractHost(req);

    if (host) {
      // Store host for later resolution by guards/interceptors
      (req as any).resolvedHost = host;
    }

    next();
  }
}

/**
 * Factory function to create tenant context middleware
 * Used when the middleware needs to be dynamically configured
 */
export function createTenantContextMiddleware(
  domainsService: DomainsServiceInterface,
): TenantContextMiddleware {
  const middleware = new TenantContextMiddleware();
  middleware.setDomainsService(domainsService);
  return middleware;
}
