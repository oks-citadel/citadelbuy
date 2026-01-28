import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract the current organization from the request.
 * The organization is set by the OrganizationPermissionGuard.
 *
 * @example
 * @Get()
 * async getProducts(@CurrentOrganization() org: Organization) {
 *   return this.productService.findAll(org.id);
 * }
 */
export const CurrentOrganization = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const organization = request.organization;

    if (data) {
      return organization?.[data];
    }

    return organization;
  },
);
