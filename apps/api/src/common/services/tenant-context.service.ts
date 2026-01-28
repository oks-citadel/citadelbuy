import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TenantInfo } from '../guards/tenant.guard';

/**
 * Tenant context stored in AsyncLocalStorage
 */
interface TenantContext {
  tenantId: string;
  tenant?: TenantInfo;
  userId?: string;
  traceId?: string;
}

/**
 * Tenant Context Service
 *
 * Uses AsyncLocalStorage for tenant context propagation across async operations.
 * This ensures tenant isolation is maintained throughout the request lifecycle.
 *
 * Features:
 * - getTenantId() - Get current tenant ID from context
 * - runWithTenant(tenantId, fn) - Execute function with tenant context
 * - validateTenantAccess(resourceTenantId) - Validate access to resource
 * - Caches tenant info for performance
 */
@Injectable()
export class TenantContextService {
  private readonly logger = new Logger(TenantContextService.name);
  private readonly asyncLocalStorage = new AsyncLocalStorage<TenantContext>();
  private readonly TENANT_CACHE_TTL = 300; // 5 minutes
  private readonly TENANT_CACHE_PREFIX = 'tenant:info:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get the current tenant ID from context
   * @returns Current tenant ID or undefined
   */
  getTenantId(): string | undefined {
    const context = this.asyncLocalStorage.getStore();
    return context?.tenantId;
  }

  /**
   * Get the current tenant info from context
   * @returns Current tenant info or undefined
   */
  getTenant(): TenantInfo | undefined {
    const context = this.asyncLocalStorage.getStore();
    return context?.tenant;
  }

  /**
   * Get the current trace ID from context
   * @returns Current trace ID or undefined
   */
  getTraceId(): string | undefined {
    const context = this.asyncLocalStorage.getStore();
    return context?.traceId;
  }

  /**
   * Set tenant ID in the current context
   * @param tenantId - Tenant ID to set
   */
  setTenantId(tenantId: string): void {
    const context = this.asyncLocalStorage.getStore();
    if (context) {
      context.tenantId = tenantId;
    }
  }

  /**
   * Set tenant info in the current context
   * @param tenant - Tenant info to set
   */
  setTenant(tenant: TenantInfo): void {
    const context = this.asyncLocalStorage.getStore();
    if (context) {
      context.tenant = tenant;
      context.tenantId = tenant.id;
    }
  }

  /**
   * Execute a function within a tenant context
   *
   * @param tenantId - Tenant ID for the context
   * @param fn - Function to execute
   * @param options - Additional context options
   * @returns Result of the function
   *
   * @example
   * ```typescript
   * await tenantContext.runWithTenant('tenant-123', async () => {
   *   // All operations here will have tenant context
   *   const products = await prisma.product.findMany();
   * });
   * ```
   */
  async runWithTenant<T>(
    tenantId: string,
    fn: () => T | Promise<T>,
    options?: { userId?: string; traceId?: string },
  ): Promise<T> {
    const tenant = await this.getTenantInfo(tenantId);
    const context: TenantContext = {
      tenantId,
      tenant: tenant || { id: tenantId },
      userId: options?.userId,
      traceId: options?.traceId,
    };

    return this.asyncLocalStorage.run(context, fn);
  }

  /**
   * Validate that the current context has access to a resource
   *
   * @param resourceTenantId - Tenant ID of the resource being accessed
   * @throws ForbiddenException if access is denied
   *
   * @example
   * ```typescript
   * // In a service method
   * const product = await prisma.product.findUnique({ where: { id } });
   * tenantContext.validateResourceAccess(product.tenantId);
   * return product;
   * ```
   */
  validateResourceAccess(resourceTenantId: string): void {
    const currentTenantId = this.getTenantId();

    if (!currentTenantId) {
      this.logger.warn('Attempted resource access without tenant context');
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Tenant context required for this operation.',
        errorCode: 'TENANT_CONTEXT_MISSING',
      });
    }

    if (currentTenantId !== resourceTenantId) {
      this.logCrossTenantAccessAttempt(resourceTenantId);
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Access denied to this resource.',
        errorCode: 'CROSS_TENANT_ACCESS_DENIED',
      });
    }
  }

  /**
   * Validate that a tenant ID is valid and active
   *
   * @param tenantId - Tenant ID to validate
   * @returns true if valid, false otherwise
   */
  async validateTenantAccess(tenantId: string): Promise<boolean> {
    if (!tenantId) {
      return false;
    }

    try {
      // Check cache first
      const cached = await this.getCachedTenant(tenantId);
      if (cached !== null) {
        return cached.status !== 'SUSPENDED' && cached.status !== 'DELETED';
      }

      // Query database
      const organization = await this.prisma.organization.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      });

      if (!organization) {
        return false;
      }

      // Cache the result
      await this.cacheTenant({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        status: organization.status,
      });

      // Check if tenant is active
      return organization.status !== 'SUSPENDED' && organization.status !== 'DELETED';
    } catch (error) {
      this.logger.error(`Error validating tenant ${tenantId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get tenant information by ID
   *
   * @param tenantId - Tenant ID
   * @returns Tenant info or null if not found
   */
  async getTenantInfo(tenantId: string): Promise<TenantInfo | null> {
    if (!tenantId) {
      return null;
    }

    try {
      // Check cache first
      const cached = await this.getCachedTenant(tenantId);
      if (cached !== null) {
        return cached;
      }

      // Query database
      const organization = await this.prisma.organization.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          settings: true,
        },
      });

      if (!organization) {
        return null;
      }

      const tenantInfo: TenantInfo = {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        status: organization.status,
        settings: organization.settings as Record<string, unknown> || undefined,
      };

      // Cache the result
      await this.cacheTenant(tenantInfo);

      return tenantInfo;
    } catch (error) {
      this.logger.error(`Error fetching tenant info for ${tenantId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get tenant filter for Prisma queries
   *
   * @returns Object with tenant filter or empty object if no context
   *
   * @example
   * ```typescript
   * const products = await prisma.product.findMany({
   *   where: {
   *     ...tenantContext.getTenantFilter(),
   *     isActive: true,
   *   },
   * });
   * ```
   */
  getTenantFilter(): { organizationId: string } | Record<string, never> {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      return {};
    }
    return { organizationId: tenantId };
  }

  /**
   * Get tenant filter for queries using tenantId field
   */
  getTenantIdFilter(): { tenantId: string } | Record<string, never> {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      return {};
    }
    return { tenantId };
  }

  /**
   * Require tenant context or throw
   *
   * @throws ForbiddenException if no tenant context
   * @returns Current tenant ID
   */
  requireTenantId(): string {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Tenant context required for this operation.',
        errorCode: 'TENANT_CONTEXT_MISSING',
      });
    }
    return tenantId;
  }

  /**
   * Create a new context with tenant for background jobs
   */
  createContext(tenantId: string, options?: { userId?: string; traceId?: string }): void {
    const context: TenantContext = {
      tenantId,
      userId: options?.userId,
      traceId: options?.traceId,
    };
    this.asyncLocalStorage.enterWith(context);
  }

  // Private helper methods

  private async getCachedTenant(tenantId: string): Promise<TenantInfo | null> {
    try {
      const cached = await this.redis.get<TenantInfo>(`${this.TENANT_CACHE_PREFIX}${tenantId}`);
      return cached;
    } catch (error) {
      this.logger.warn(`Cache read error for tenant ${tenantId}: ${error.message}`);
      return null;
    }
  }

  private async cacheTenant(tenant: TenantInfo): Promise<void> {
    try {
      await this.redis.set(
        `${this.TENANT_CACHE_PREFIX}${tenant.id}`,
        tenant,
        this.TENANT_CACHE_TTL,
      );
    } catch (error) {
      this.logger.warn(`Cache write error for tenant ${tenant.id}: ${error.message}`);
    }
  }

  private logCrossTenantAccessAttempt(targetTenantId: string): void {
    const context = this.asyncLocalStorage.getStore();
    this.logger.warn(
      'SECURITY: Cross-tenant access attempt',
      {
        event: 'cross_tenant_access_attempt',
        currentTenantId: context?.tenantId,
        targetTenantId,
        userId: context?.userId,
        traceId: context?.traceId,
        timestamp: new Date().toISOString(),
      },
    );
  }

  /**
   * Invalidate cached tenant info
   */
  async invalidateTenantCache(tenantId: string): Promise<void> {
    try {
      await this.redis.del(`${this.TENANT_CACHE_PREFIX}${tenantId}`);
    } catch (error) {
      this.logger.warn(`Cache invalidation error for tenant ${tenantId}: ${error.message}`);
    }
  }
}
