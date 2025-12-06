import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../guards/roles.guard';

/**
 * Roles decorator - use to restrict access to specific user roles
 *
 * @example
 * ```typescript
 * @Roles('ADMIN')
 * @Get('admin-only')
 * adminOnly() {
 *   return 'Admin access granted';
 * }
 *
 * @Roles('ADMIN', 'VENDOR')
 * @Get('vendor-or-admin')
 * vendorOrAdmin() {
 *   return 'Vendor or Admin access granted';
 * }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
