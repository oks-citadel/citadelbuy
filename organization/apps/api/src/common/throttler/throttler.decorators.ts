import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { EndpointGroup, OperationType } from './throttler.config';
import {
  THROTTLE_GROUP_KEY,
  THROTTLE_OPERATION_KEY,
  SKIP_THROTTLE_KEY,
  TieredThrottlerGuard,
} from './tiered-throttler.guard';

/**
 * Decorator to set the endpoint group for rate limiting
 *
 * @example
 * ```typescript
 * @ThrottleGroup(EndpointGroup.AUTH)
 * @Post('login')
 * async login() { ... }
 * ```
 */
export const ThrottleGroup = (group: EndpointGroup) =>
  SetMetadata(THROTTLE_GROUP_KEY, group);

/**
 * Decorator to set the operation type for rate limiting
 *
 * @example
 * ```typescript
 * @ThrottleOperation(OperationType.WRITE)
 * @Post('create')
 * async create() { ... }
 * ```
 */
export const ThrottleOperation = (operation: OperationType) =>
  SetMetadata(THROTTLE_OPERATION_KEY, operation);

/**
 * Decorator to skip throttling for a specific endpoint
 *
 * @example
 * ```typescript
 * @SkipThrottle()
 * @Get('health')
 * async healthCheck() { ... }
 * ```
 */
export const SkipThrottle = () => SetMetadata(SKIP_THROTTLE_KEY, true);

/**
 * Decorator to apply tiered throttling to an endpoint or controller
 * Combines endpoint group and operation type settings
 *
 * @example
 * ```typescript
 * @TieredThrottle({ group: EndpointGroup.AUTH, operation: OperationType.WRITE })
 * @Post('login')
 * async login() { ... }
 * ```
 */
export const TieredThrottle = (options?: {
  group?: EndpointGroup;
  operation?: OperationType;
}) => {
  const decorators = [UseGuards(TieredThrottlerGuard)];

  if (options?.group) {
    decorators.push(SetMetadata(THROTTLE_GROUP_KEY, options.group));
  }

  if (options?.operation) {
    decorators.push(SetMetadata(THROTTLE_OPERATION_KEY, options.operation));
  }

  return applyDecorators(...decorators);
};

/**
 * Pre-configured decorator for auth endpoints
 */
export const AuthThrottle = () =>
  applyDecorators(
    UseGuards(TieredThrottlerGuard),
    SetMetadata(THROTTLE_GROUP_KEY, EndpointGroup.AUTH),
    SetMetadata(THROTTLE_OPERATION_KEY, OperationType.WRITE),
  );

/**
 * Pre-configured decorator for search endpoints
 */
export const SearchThrottle = () =>
  applyDecorators(
    UseGuards(TieredThrottlerGuard),
    SetMetadata(THROTTLE_GROUP_KEY, EndpointGroup.SEARCH),
    SetMetadata(THROTTLE_OPERATION_KEY, OperationType.READ),
  );

/**
 * Pre-configured decorator for upload endpoints
 */
export const UploadThrottle = () =>
  applyDecorators(
    UseGuards(TieredThrottlerGuard),
    SetMetadata(THROTTLE_GROUP_KEY, EndpointGroup.UPLOAD),
    SetMetadata(THROTTLE_OPERATION_KEY, OperationType.WRITE),
  );

/**
 * Pre-configured decorator for AI/ML endpoints
 */
export const AiThrottle = () =>
  applyDecorators(
    UseGuards(TieredThrottlerGuard),
    SetMetadata(THROTTLE_GROUP_KEY, EndpointGroup.AI),
    SetMetadata(THROTTLE_OPERATION_KEY, OperationType.WRITE),
  );

/**
 * Pre-configured decorator for webhook endpoints
 */
export const WebhookThrottle = () =>
  applyDecorators(
    UseGuards(TieredThrottlerGuard),
    SetMetadata(THROTTLE_GROUP_KEY, EndpointGroup.WEBHOOKS),
    SetMetadata(THROTTLE_OPERATION_KEY, OperationType.WRITE),
  );

/**
 * Pre-configured decorator for admin endpoints
 */
export const AdminThrottle = () =>
  applyDecorators(
    UseGuards(TieredThrottlerGuard),
    SetMetadata(THROTTLE_GROUP_KEY, EndpointGroup.ADMIN),
    SetMetadata(THROTTLE_OPERATION_KEY, OperationType.WRITE),
  );

/**
 * Pre-configured decorator for read-only API endpoints
 */
export const ApiReadThrottle = () =>
  applyDecorators(
    UseGuards(TieredThrottlerGuard),
    SetMetadata(THROTTLE_GROUP_KEY, EndpointGroup.API),
    SetMetadata(THROTTLE_OPERATION_KEY, OperationType.READ),
  );

/**
 * Pre-configured decorator for write API endpoints
 */
export const ApiWriteThrottle = () =>
  applyDecorators(
    UseGuards(TieredThrottlerGuard),
    SetMetadata(THROTTLE_GROUP_KEY, EndpointGroup.API),
    SetMetadata(THROTTLE_OPERATION_KEY, OperationType.WRITE),
  );
