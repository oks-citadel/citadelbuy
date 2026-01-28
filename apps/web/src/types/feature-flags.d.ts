/**
 * Type definitions for feature flags custom events
 */

import { FeatureFlag } from '@/config/feature-flags';

declare global {
  interface WindowEventMap {
    /**
     * Custom event fired when a feature flag changes
     */
    featureFlagChange: CustomEvent<{
      flag: FeatureFlag;
    }>;
  }
}

export {};
