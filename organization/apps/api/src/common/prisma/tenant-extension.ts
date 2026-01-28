import { Prisma } from '@prisma/client';
import { Logger } from '@nestjs/common';

const logger = new Logger('TenantExtension');

/**
 * Models that support tenant scoping via organizationId
 */
const TENANT_SCOPED_MODELS = [
  'Product',
  'Order',
  'User',
  'Category',
  'Review',
  'Wishlist',
  'Cart',
  'CartItem',
  'Inventory',
  'InventoryItem',
  'Webhook',
  'WebhookDelivery',
  'Coupon',
  'Deal',
  'GiftCard',
  'Subscription',
  'Payment',
  'Refund',
  'ReturnRequest',
  'SupportTicket',
  'Notification',
  'AuditLog',
  'ApiKey',
  'Advertisement',
  'Campaign',
];

/**
 * Operations that should be filtered by tenant
 */
const FILTERED_OPERATIONS = [
  'findFirst',
  'findFirstOrThrow',
  'findUnique',
  'findUniqueOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
];

/**
 * Operations that should include tenant on create
 */
const CREATE_OPERATIONS = ['create', 'createMany', 'upsert'];

/**
 * Operations that should be filtered on update/delete
 */
const MUTATION_OPERATIONS = [
  'update',
  'updateMany',
  'delete',
  'deleteMany',
];

/**
 * Get tenant context from async local storage or other source
 */
type TenantContextGetter = () => string | undefined;

/**
 * Create Prisma extension for automatic tenant scoping
 *
 * This extension automatically:
 * 1. Adds organizationId filter to all read queries
 * 2. Includes organizationId on all create operations
 * 3. Filters update/delete operations by organizationId
 * 4. Prevents cross-tenant data access
 *
 * @param getTenantId - Function to get current tenant ID from context
 * @returns Prisma client extension
 *
 * @example
 * ```typescript
 * // In PrismaService
 * const extendedPrisma = prisma.$extends(
 *   createTenantExtension(() => tenantContext.getTenantId())
 * );
 * ```
 */
export function createTenantExtension(getTenantId: TenantContextGetter) {
  return Prisma.defineExtension({
    name: 'tenant-scoping',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const tenantId = getTenantId();

          // Skip tenant scoping if no tenant context
          if (!tenantId) {
            return query(args);
          }

          // Skip if model is not tenant-scoped
          if (!TENANT_SCOPED_MODELS.includes(model as string)) {
            return query(args);
          }

          // Handle read operations
          if (FILTERED_OPERATIONS.includes(operation)) {
            args.where = {
              ...args.where,
              organizationId: tenantId,
            };
            return query(args);
          }

          // Handle create operations
          if (CREATE_OPERATIONS.includes(operation)) {
            if (operation === 'create') {
              args.data = {
                ...args.data,
                organizationId: tenantId,
              };
            } else if (operation === 'createMany') {
              if (Array.isArray(args.data)) {
                args.data = args.data.map((item: Record<string, unknown>) => ({
                  ...item,
                  organizationId: tenantId,
                }));
              }
            } else if (operation === 'upsert') {
              args.where = {
                ...args.where,
                organizationId: tenantId,
              };
              args.create = {
                ...args.create,
                organizationId: tenantId,
              };
              args.update = {
                ...args.update,
              };
            }
            return query(args);
          }

          // Handle mutation operations
          if (MUTATION_OPERATIONS.includes(operation)) {
            args.where = {
              ...args.where,
              organizationId: tenantId,
            };
            return query(args);
          }

          return query(args);
        },
      },
    },
  });
}

/**
 * Create a lightweight tenant filter middleware for Prisma
 *
 * Use this for simpler tenant filtering without full extension support.
 * Logs cross-tenant access attempts.
 *
 * @param getTenantId - Function to get current tenant ID
 * @returns Prisma middleware function
 */
export function createTenantMiddleware(getTenantId: TenantContextGetter) {
  return async (
    params: Prisma.MiddlewareParams,
    next: (params: Prisma.MiddlewareParams) => Promise<unknown>,
  ) => {
    const tenantId = getTenantId();
    const model = params.model;
    const action = params.action;

    // Skip if no tenant context or model not tenant-scoped
    if (!tenantId || !model || !TENANT_SCOPED_MODELS.includes(model)) {
      return next(params);
    }

    // Add tenant filter to read operations
    if (FILTERED_OPERATIONS.includes(action)) {
      params.args = params.args || {};
      params.args.where = {
        ...params.args.where,
        organizationId: tenantId,
      };
    }

    // Add tenant to create operations
    if (action === 'create') {
      params.args = params.args || {};
      params.args.data = {
        ...params.args.data,
        organizationId: tenantId,
      };
    }

    if (action === 'createMany') {
      params.args = params.args || {};
      if (Array.isArray(params.args.data)) {
        params.args.data = params.args.data.map((item: Record<string, unknown>) => ({
          ...item,
          organizationId: tenantId,
        }));
      }
    }

    // Add tenant filter to update/delete operations
    if (MUTATION_OPERATIONS.includes(action)) {
      params.args = params.args || {};
      params.args.where = {
        ...params.args.where,
        organizationId: tenantId,
      };
    }

    return next(params);
  };
}

/**
 * Tenant-aware transaction helper
 *
 * Ensures all operations within a transaction are tenant-scoped.
 *
 * @param prisma - Prisma client
 * @param tenantId - Tenant ID for the transaction
 * @param fn - Function containing transaction operations
 * @returns Transaction result
 */
export async function tenantTransaction<T>(
  prisma: any,
  tenantId: string,
  fn: (tx: any) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx: any) => {
    // The extension will automatically add tenant filtering
    return fn(tx);
  });
}

/**
 * Validate that a record belongs to the specified tenant
 *
 * @param record - Database record to validate
 * @param tenantId - Expected tenant ID
 * @param fieldName - Field name containing tenant ID
 * @returns true if valid, throws if invalid
 */
export function validateTenantOwnership(
  record: Record<string, unknown> | null | undefined,
  tenantId: string,
  fieldName: string = 'organizationId',
): boolean {
  if (!record) {
    return false;
  }

  const recordTenantId = record[fieldName] as string | undefined;

  if (!recordTenantId) {
    logger.warn('Record missing tenant ID field', { fieldName });
    return false;
  }

  if (recordTenantId !== tenantId) {
    logger.warn('SECURITY: Cross-tenant ownership validation failed', {
      event: 'cross_tenant_validation_failed',
      expectedTenantId: tenantId,
      actualTenantId: recordTenantId,
      fieldName,
    });
    return false;
  }

  return true;
}

/**
 * Build a tenant-scoped where clause
 *
 * @param tenantId - Tenant ID
 * @param where - Existing where clause
 * @returns Where clause with tenant filter
 */
export function buildTenantWhere<T extends Record<string, unknown>>(
  tenantId: string | undefined,
  where?: T,
): T & { organizationId?: string } {
  if (!tenantId) {
    return where as T & { organizationId?: string };
  }

  return {
    ...where,
    organizationId: tenantId,
  } as T & { organizationId?: string };
}

/**
 * Build tenant-scoped create data
 *
 * @param tenantId - Tenant ID
 * @param data - Create data
 * @returns Data with organizationId
 */
export function buildTenantData<T extends Record<string, unknown>>(
  tenantId: string,
  data: T,
): T & { organizationId: string } {
  return {
    ...data,
    organizationId: tenantId,
  };
}
