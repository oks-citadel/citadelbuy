/**
 * Feature Flags Module
 *
 * Provides feature flag management for safe feature rollouts,
 * A/B testing, and gradual deployments.
 *
 * @example
 * ```typescript
 * // In a controller
 * import { UseFeatureFlag, FEATURE_FLAGS } from '@common/feature-flags';
 *
 * @UseFeatureFlag(FEATURE_FLAGS.AI_SHOPPING_CONCIERGE)
 * @Controller('ai-concierge')
 * export class AIConciergeController {}
 *
 * // In a service
 * import { FeatureFlagsService } from '@common/feature-flags';
 *
 * @Injectable()
 * export class MyService {
 *   constructor(private featureFlags: FeatureFlagsService) {}
 *
 *   async doSomething(userId: string) {
 *     if (await this.featureFlags.isEnabled('my-feature', { userId })) {
 *       // New feature code
 *     } else {
 *       // Old feature code
 *     }
 *   }
 * }
 * ```
 */

export * from './feature-flags.interface';
export * from './feature-flags.service';
export * from './feature-flags.module';
export * from './feature-flag.decorator';
export * from './feature-flag.guard';
