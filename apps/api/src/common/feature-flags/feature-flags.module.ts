/**
 * Feature Flags Module
 *
 * Provides feature flag management and evaluation capabilities.
 * Import this module in your app.module.ts to enable feature flags.
 *
 * @example
 * ```typescript
 * import { FeatureFlagsModule } from './common/feature-flags';
 *
 * @Module({
 *   imports: [FeatureFlagsModule],
 * })
 * export class AppModule {}
 * ```
 */

import { Module, Global } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagGuard } from './feature-flag.guard';
import {
  FeatureFlagsController,
  PublicFeatureFlagsController,
} from './feature-flags.controller';

@Global()
@Module({
  controllers: [FeatureFlagsController, PublicFeatureFlagsController],
  providers: [FeatureFlagsService, FeatureFlagGuard],
  exports: [FeatureFlagsService, FeatureFlagGuard],
})
export class FeatureFlagsModule {}
