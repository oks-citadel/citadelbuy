'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  FeatureFlag,
  isFeatureEnabled,
  getEnabledFeatures,
  getAllFeatureStates,
  getFeatureFlagConfig,
} from '@/config/feature-flags';

/**
 * Hook options interface
 */
interface UseFeatureFlagOptions {
  /**
   * User ID for targeted rollouts
   */
  userId?: string;

  /**
   * Callback when feature flag state changes
   */
  onToggle?: (enabled: boolean) => void;
}

/**
 * Hook return type
 */
interface UseFeatureFlagReturn {
  /**
   * Whether the feature is enabled
   */
  isEnabled: boolean;

  /**
   * Whether the feature flag is currently being checked
   */
  isLoading: boolean;

  /**
   * Feature flag configuration
   */
  config: ReturnType<typeof getFeatureFlagConfig>;
}

/**
 * React hook to check if a feature flag is enabled
 *
 * This hook provides a reactive way to check feature flags in components.
 * It automatically updates when feature flags change (e.g., via remote config).
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isEnabled, isLoading } = useFeatureFlag(FeatureFlag.AI_RECOMMENDATIONS);
 *
 *   if (isLoading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   if (!isEnabled) {
 *     return null;
 *   }
 *
 *   return <AIRecommendations />;
 * }
 * ```
 *
 * @param flag - The feature flag to check
 * @param options - Optional configuration
 * @returns Object containing isEnabled state and loading status
 */
export function useFeatureFlag(
  flag: FeatureFlag,
  options: UseFeatureFlagOptions = {}
): UseFeatureFlagReturn {
  const { userId, onToggle } = options;

  // Check feature flag status
  const [isEnabled, setIsEnabled] = useState<boolean>(() =>
    isFeatureEnabled(flag, userId)
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Get feature flag config (memoized)
  const config = useMemo(() => getFeatureFlagConfig(flag), [flag]);

  // Re-check feature flag when userId changes
  useEffect(() => {
    const enabled = isFeatureEnabled(flag, userId);
    setIsEnabled(enabled);

    // Call onToggle callback if provided
    if (onToggle) {
      onToggle(enabled);
    }
  }, [flag, userId, onToggle]);

  // Listen for custom feature flag change events
  useEffect(() => {
    const handleFeatureFlagChange = (event: CustomEvent) => {
      if (event.detail.flag === flag) {
        const enabled = isFeatureEnabled(flag, userId);
        setIsEnabled(enabled);

        if (onToggle) {
          onToggle(enabled);
        }
      }
    };

    window.addEventListener(
      'featureFlagChange' as any,
      handleFeatureFlagChange as EventListener
    );

    return () => {
      window.removeEventListener(
        'featureFlagChange' as any,
        handleFeatureFlagChange as EventListener
      );
    };
  }, [flag, userId, onToggle]);

  return {
    isEnabled,
    isLoading,
    config,
  };
}

/**
 * Hook to check multiple feature flags at once
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const features = useFeatureFlags([
 *     FeatureFlag.AI_RECOMMENDATIONS,
 *     FeatureFlag.SOCIAL_LOGIN,
 *   ]);
 *
 *   return (
 *     <div>
 *       {features[FeatureFlag.AI_RECOMMENDATIONS] && <AIRecommendations />}
 *       {features[FeatureFlag.SOCIAL_LOGIN] && <SocialLoginButtons />}
 *     </div>
 *   );
 * }
 * ```
 *
 * @param flags - Array of feature flags to check
 * @param userId - Optional user ID for targeted rollouts
 * @returns Object mapping feature flags to their enabled state
 */
export function useFeatureFlags(
  flags: FeatureFlag[],
  userId?: string
): Record<FeatureFlag, boolean> {
  const [featureStates, setFeatureStates] = useState<Record<FeatureFlag, boolean>>(() => {
    const states = {} as Record<FeatureFlag, boolean>;
    flags.forEach(flag => {
      states[flag] = isFeatureEnabled(flag, userId);
    });
    return states;
  });

  useEffect(() => {
    const states = {} as Record<FeatureFlag, boolean>;
    flags.forEach(flag => {
      states[flag] = isFeatureEnabled(flag, userId);
    });
    setFeatureStates(states);
  }, [flags, userId]);

  // Listen for feature flag changes
  useEffect(() => {
    const handleFeatureFlagChange = (event: CustomEvent) => {
      if (flags.includes(event.detail.flag)) {
        const states = {} as Record<FeatureFlag, boolean>;
        flags.forEach(flag => {
          states[flag] = isFeatureEnabled(flag, userId);
        });
        setFeatureStates(states);
      }
    };

    window.addEventListener(
      'featureFlagChange' as any,
      handleFeatureFlagChange as EventListener
    );

    return () => {
      window.removeEventListener(
        'featureFlagChange' as any,
        handleFeatureFlagChange as EventListener
      );
    };
  }, [flags, userId]);

  return featureStates;
}

/**
 * Hook to get all enabled features
 *
 * @example
 * ```tsx
 * function DebugPanel() {
 *   const enabledFeatures = useEnabledFeatures();
 *
 *   return (
 *     <div>
 *       <h3>Enabled Features:</h3>
 *       <ul>
 *         {enabledFeatures.map(feature => (
 *           <li key={feature}>{feature}</li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 *
 * @param userId - Optional user ID for targeted rollouts
 * @returns Array of enabled feature flag keys
 */
export function useEnabledFeatures(userId?: string): FeatureFlag[] {
  const [enabledFeatures, setEnabledFeatures] = useState<FeatureFlag[]>(() =>
    getEnabledFeatures(userId)
  );

  useEffect(() => {
    setEnabledFeatures(getEnabledFeatures(userId));
  }, [userId]);

  // Listen for feature flag changes
  useEffect(() => {
    const handleFeatureFlagChange = () => {
      setEnabledFeatures(getEnabledFeatures(userId));
    };

    window.addEventListener(
      'featureFlagChange' as any,
      handleFeatureFlagChange as EventListener
    );

    return () => {
      window.removeEventListener(
        'featureFlagChange' as any,
        handleFeatureFlagChange as EventListener
      );
    };
  }, [userId]);

  return enabledFeatures;
}

/**
 * Hook to get all feature flag states
 *
 * @example
 * ```tsx
 * function FeatureFlagsAdmin() {
 *   const allFeatures = useAllFeatureStates();
 *
 *   return (
 *     <div>
 *       {Object.entries(allFeatures).map(([flag, enabled]) => (
 *         <div key={flag}>
 *           {flag}: {enabled ? 'ON' : 'OFF'}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @param userId - Optional user ID for targeted rollouts
 * @returns Object mapping all feature flags to their enabled state
 */
export function useAllFeatureStates(userId?: string): Record<FeatureFlag, boolean> {
  const [featureStates, setFeatureStates] = useState<Record<FeatureFlag, boolean>>(() =>
    getAllFeatureStates(userId)
  );

  useEffect(() => {
    setFeatureStates(getAllFeatureStates(userId));
  }, [userId]);

  // Listen for feature flag changes
  useEffect(() => {
    const handleFeatureFlagChange = () => {
      setFeatureStates(getAllFeatureStates(userId));
    };

    window.addEventListener(
      'featureFlagChange' as any,
      handleFeatureFlagChange as EventListener
    );

    return () => {
      window.removeEventListener(
        'featureFlagChange' as any,
        handleFeatureFlagChange as EventListener
      );
    };
  }, [userId]);

  return featureStates;
}

/**
 * Utility function to dispatch feature flag change event
 * Use this when you dynamically update feature flags at runtime
 *
 * @param flag - The feature flag that changed
 */
export function notifyFeatureFlagChange(flag: FeatureFlag): void {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('featureFlagChange', {
      detail: { flag },
    });
    window.dispatchEvent(event);
  }
}
