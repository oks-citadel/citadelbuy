import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
  applyDecorators,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard, TenantInfo, RequestWithTenant, OptionalTenantGuard } from '../guards/tenant.guard';

/**
 * Metadata keys for tenant decorators
 */
export const REQUIRE_TENANT_KEY = 'require_tenant';
export const SKIP_TENANT_KEY = 'skip_tenant';
export const TENANT_SCOPED_KEY = 'tenant_scoped';

/**
 * @CurrentTenant() - Get current tenant from request
 *
 * Use as a parameter decorator to extract tenant information from the request.
 *
 * @example
 * ```typescript
 * @Get('products')
 * async getProducts(@CurrentTenant() tenant: TenantInfo) {
 *   return this.productsService.findByTenant(tenant.id);
 * }
 *
 * // Get specific property
 * @Get('products')
 * async getProducts(@CurrentTenant('id') tenantId: string) {
 *   return this.productsService.findByTenant(tenantId);
 * }
 * ```
 */
export const CurrentTenant = createParamDecorator(
  (data: keyof TenantInfo | undefined, ctx: ExecutionContext): TenantInfo | string | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithTenant>();
    const tenant = request.tenant;

    if (!tenant) {
      return undefined;
    }

    return data ? tenant[data] : tenant;
  },
);

/**
 * @TenantId() - Get current tenant ID from request
 *
 * Shorthand for @CurrentTenant('id')
 *
 * @example
 * ```typescript
 * @Get('products')
 * async getProducts(@TenantId() tenantId: string) {
 *   return this.productsService.findByTenant(tenantId);
 * }
 * ```
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithTenant>();
    return request.tenantId || request.tenant?.id;
  },
);

/**
 * @RequireTenant() - Mark route as requiring tenant context
 *
 * Use as a method or class decorator to enforce tenant context.
 * Requests without a valid tenant will receive a 403 Forbidden response.
 *
 * @example
 * ```typescript
 * @RequireTenant()
 * @Get('products')
 * async getProducts(@TenantId() tenantId: string) {
 *   return this.productsService.findByTenant(tenantId);
 * }
 * ```
 */
export const RequireTenant = () =>
  applyDecorators(
    SetMetadata(REQUIRE_TENANT_KEY, true),
    UseGuards(TenantGuard),
  );

/**
 * @SkipTenant() - Skip tenant validation for a route
 *
 * Use to explicitly skip tenant validation on specific routes
 * within a controller that has tenant validation enabled.
 *
 * @example
 * ```typescript
 * @Controller('api/v1/products')
 * @RequireTenant()
 * export class ProductsController {
 *   @SkipTenant()
 *   @Get('public-catalog')
 *   async getPublicCatalog() {
 *     // This endpoint doesn't require tenant context
 *   }
 * }
 * ```
 */
export const SkipTenant = () => SetMetadata(SKIP_TENANT_KEY, true);

/**
 * @TenantScoped() - Mark route/class as tenant-scoped
 *
 * This decorator marks queries as requiring automatic tenant_id filtering.
 * Used in conjunction with Prisma tenant extension to auto-filter queries.
 *
 * @example
 * ```typescript
 * @TenantScoped()
 * @Get('orders')
 * async getOrders(@TenantId() tenantId: string) {
 *   // Queries will automatically include tenant_id filter
 *   return this.ordersService.findAll();
 * }
 * ```
 */
export const TenantScoped = () =>
  applyDecorators(
    SetMetadata(TENANT_SCOPED_KEY, true),
    SetMetadata(REQUIRE_TENANT_KEY, true),
    UseGuards(TenantGuard),
  );

/**
 * @OptionalTenant() - Mark route as optionally tenant-scoped
 *
 * Similar to RequireTenant but allows requests without tenant context.
 * Useful for public endpoints that can optionally filter by tenant.
 *
 * @example
 * ```typescript
 * @OptionalTenant()
 * @Get('search')
 * async search(@Query('q') query: string, @TenantId() tenantId?: string) {
 *   if (tenantId) {
 *     return this.searchService.searchInTenant(query, tenantId);
 *   }
 *   return this.searchService.searchAll(query);
 * }
 * ```
 */
export const OptionalTenant = () =>
  applyDecorators(UseGuards(OptionalTenantGuard));

/**
 * Interface for tenant-scoped query options
 */
export interface TenantScopedOptions {
  /** Include soft-deleted records */
  includeDeleted?: boolean;
  /** Skip tenant filter (admin only) */
  skipTenantFilter?: boolean;
}

/**
 * @TenantScopedQuery() - Get tenant-scoped query options
 *
 * Extracts tenant-scoped query options from the request context.
 *
 * @example
 * ```typescript
 * @Get('all')
 * async getAll(
 *   @TenantScopedQuery() options: TenantScopedOptions,
 *   @TenantId() tenantId: string,
 * ) {
 *   return this.service.findAll(tenantId, options);
 * }
 * ```
 */
export const TenantScopedQuery = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantScopedOptions => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return {
      includeDeleted: false,
      // Only admins can skip tenant filter
      skipTenantFilter: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
    };
  },
);

/**
 * Decorator to validate that a resource belongs to the current tenant
 *
 * @param resourceTenantIdField - The field name containing the tenant ID on the resource
 *
 * @example
 * ```typescript
 * @ValidateTenantResource('organizationId')
 * @Get(':id')
 * async getOne(@Param('id') id: string) {
 *   return this.service.findOne(id);
 * }
 * ```
 */
export const VALIDATE_TENANT_RESOURCE_KEY = 'validate_tenant_resource';

export const ValidateTenantResource = (resourceTenantIdField: string = 'tenantId') =>
  SetMetadata(VALIDATE_TENANT_RESOURCE_KEY, resourceTenantIdField);
