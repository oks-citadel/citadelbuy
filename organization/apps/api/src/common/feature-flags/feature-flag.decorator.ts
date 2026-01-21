/**
 * Feature Flag Decorator
 *
 * Use to mark controllers or methods as gated behind a feature flag.
 *
 * @example
 * ```typescript
 * @UseFeatureFlag('new-checkout')
 * @Controller('checkout')
 * export class NewCheckoutController {}
 *
 * @Controller('products')
 * export class ProductsController {
 *   @UseFeatureFlag('ai-recommendations')
 *   @Get('recommendations')
 *   getRecommendations() {}
 * }
 * ```
 */

import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { FeatureFlagGuard } from './feature-flag.guard';
import { FeatureFlagKey } from './feature-flags.interface';
import { FEATURE_FLAG_KEY, FeatureFlagOptions } from './feature-flag.constants';

// Re-export for backward compatibility
export { FEATURE_FLAG_KEY, FeatureFlagOptions } from './feature-flag.constants';

/**
 * Decorator to gate a controller or method behind a feature flag
 * @param flagKey - The feature flag key to check
 * @param options - Optional configuration
 */
export function UseFeatureFlag(
  flagKey: FeatureFlagKey | string,
  options?: FeatureFlagOptions,
) {
  return applyDecorators(
    SetMetadata(FEATURE_FLAG_KEY, { flagKey, options }),
    UseGuards(FeatureFlagGuard),
  );
}

// Alias for backward compatibility
export const FeatureFlagDecorator = UseFeatureFlag;

/**
 * Mark a method as the fallback when a feature flag is disabled
 */
export const FeatureFlagFallback = () => SetMetadata('feature_flag_fallback', true);

/**
 * Decorator to require a specific variant of a feature flag
 * Useful for A/B testing
 */
export function RequireVariant(
  flagKey: FeatureFlagKey | string,
  variant: string,
) {
  return applyDecorators(
    SetMetadata(FEATURE_FLAG_KEY, { flagKey, requiredVariant: variant }),
    UseGuards(FeatureFlagGuard),
  );
}
