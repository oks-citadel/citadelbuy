import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'required_permissions';

/**
 * Decorator to specify required permissions for an endpoint.
 * Can be used on controllers or individual handlers.
 *
 * @example
 * // Single permission
 * @RequirePermission('products:read')
 *
 * // Multiple permissions (all required)
 * @RequirePermission('products:read', 'products:write')
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
