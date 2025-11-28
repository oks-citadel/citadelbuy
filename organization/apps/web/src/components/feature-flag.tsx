'use client';

import * as React from 'react';
import { FeatureFlag as FeatureFlagEnum } from '@/config/feature-flags';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

/**
 * Props for the FeatureFlag component
 */
interface FeatureFlagProps {
  /**
   * The feature flag to check
   */
  flag: FeatureFlagEnum;

  /**
   * Content to render when the feature is enabled
   * Required unless using render prop
   */
  children?: React.ReactNode;

  /**
   * Optional content to render when the feature is disabled
   */
  fallback?: React.ReactNode;

  /**
   * Optional loading component while checking the flag
   */
  loading?: React.ReactNode;

  /**
   * User ID for targeted rollouts
   */
  userId?: string;

  /**
   * Callback when feature flag state is determined
   */
  onToggle?: (enabled: boolean) => void;

  /**
   * Render prop alternative to children
   * Receives the enabled state as a parameter
   */
  render?: (enabled: boolean) => React.ReactNode;
}

/**
 * FeatureFlag Component
 *
 * A declarative wrapper component for conditionally rendering content based on feature flags.
 * This component provides a clean, React-friendly way to gate features without cluttering
 * your component logic with conditional checks.
 *
 * @example Basic usage
 * ```tsx
 * <FeatureFlag flag={FeatureFlag.AI_RECOMMENDATIONS}>
 *   <AIRecommendations />
 * </FeatureFlag>
 * ```
 *
 * @example With fallback content
 * ```tsx
 * <FeatureFlag
 *   flag={FeatureFlag.VIRTUAL_TRYON}
 *   fallback={<StandardProductView />}
 * >
 *   <VirtualTryonView />
 * </FeatureFlag>
 * ```
 *
 * @example With loading state
 * ```tsx
 * <FeatureFlag
 *   flag={FeatureFlag.CHAT_SUPPORT}
 *   loading={<LoadingSpinner />}
 * >
 *   <ChatWidget />
 * </FeatureFlag>
 * ```
 *
 * @example With render prop
 * ```tsx
 * <FeatureFlag
 *   flag={FeatureFlag.BNPL_PAYMENTS}
 *   render={(enabled) => (
 *     <div>
 *       {enabled ? (
 *         <BNPLCheckoutButton />
 *       ) : (
 *         <StandardCheckoutButton />
 *       )}
 *     </div>
 *   )}
 * />
 * ```
 *
 * @example With user targeting
 * ```tsx
 * <FeatureFlag
 *   flag={FeatureFlag.BETA_FEATURE}
 *   userId={user.id}
 * >
 *   <BetaFeature />
 * </FeatureFlag>
 * ```
 *
 * @example With callback
 * ```tsx
 * <FeatureFlag
 *   flag={FeatureFlag.NEW_UI}
 *   onToggle={(enabled) => {
 *     console.log('New UI feature is:', enabled ? 'enabled' : 'disabled');
 *     analytics.track('feature_flag_checked', { flag: 'NEW_UI', enabled });
 *   }}
 * >
 *   <NewUIComponent />
 * </FeatureFlag>
 * ```
 */
export function FeatureFlag({
  flag,
  children,
  fallback = null,
  loading = null,
  userId,
  onToggle,
  render,
}: FeatureFlagProps) {
  const { isEnabled, isLoading } = useFeatureFlag(flag, { userId, onToggle });

  // Show loading state if provided
  if (isLoading && loading) {
    return <>{loading}</>;
  }

  // Use render prop if provided
  if (render) {
    return <>{render(isEnabled)}</>;
  }

  // Show children if enabled, otherwise show fallback
  return <>{isEnabled ? children : fallback}</>;
}

/**
 * Props for FeatureFlags (plural) component
 */
interface FeatureFlagsProps {
  /**
   * Array of feature flags that must all be enabled
   */
  flags: FeatureFlagEnum[];

  /**
   * Require all flags to be enabled (AND) or any flag to be enabled (OR)
   * @default 'all'
   */
  mode?: 'all' | 'any';

  /**
   * Content to render when the condition is met
   */
  children: React.ReactNode;

  /**
   * Optional content to render when the condition is not met
   */
  fallback?: React.ReactNode;

  /**
   * User ID for targeted rollouts
   */
  userId?: string;

  /**
   * Render prop alternative
   */
  render?: (enabledFlags: Record<FeatureFlagEnum, boolean>) => React.ReactNode;
}

/**
 * FeatureFlags Component (plural)
 *
 * A component for checking multiple feature flags at once.
 * Supports both AND and OR logic for multiple flags.
 *
 * @example Check if all flags are enabled
 * ```tsx
 * <FeatureFlags
 *   flags={[FeatureFlag.AI_RECOMMENDATIONS, FeatureFlag.SOCIAL_LOGIN]}
 *   mode="all"
 * >
 *   <AdvancedFeatures />
 * </FeatureFlags>
 * ```
 *
 * @example Check if any flag is enabled
 * ```tsx
 * <FeatureFlags
 *   flags={[FeatureFlag.CHAT_SUPPORT, FeatureFlag.EMAIL_SUPPORT]}
 *   mode="any"
 * >
 *   <SupportWidget />
 * </FeatureFlags>
 * ```
 *
 * @example With render prop for granular control
 * ```tsx
 * <FeatureFlags
 *   flags={[FeatureFlag.AI_RECOMMENDATIONS, FeatureFlag.VIRTUAL_TRYON]}
 *   render={(enabledFlags) => (
 *     <div>
 *       {enabledFlags[FeatureFlag.AI_RECOMMENDATIONS] && <AIRecommendations />}
 *       {enabledFlags[FeatureFlag.VIRTUAL_TRYON] && <VirtualTryon />}
 *     </div>
 *   )}
 * />
 * ```
 */
export function FeatureFlags({
  flags,
  mode = 'all',
  children,
  fallback = null,
  userId,
  render,
}: FeatureFlagsProps) {
  // Check each flag individually
  const flagStates = flags.map(flag => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { isEnabled } = useFeatureFlag(flag, { userId });
    return { flag, isEnabled };
  });

  // Determine if the condition is met based on mode
  const conditionMet = mode === 'all'
    ? flagStates.every(({ isEnabled }) => isEnabled)
    : flagStates.some(({ isEnabled }) => isEnabled);

  // Build enabled flags map for render prop
  const enabledFlagsMap = flagStates.reduce((acc, { flag, isEnabled }) => {
    acc[flag] = isEnabled;
    return acc;
  }, {} as Record<FeatureFlagEnum, boolean>);

  // Use render prop if provided
  if (render) {
    return <>{render(enabledFlagsMap)}</>;
  }

  // Show children if condition is met, otherwise show fallback
  return <>{conditionMet ? children : fallback}</>;
}

/**
 * Higher-Order Component (HOC) to wrap a component with feature flag checking
 *
 * @example
 * ```tsx
 * const AIRecommendationsWithFlag = withFeatureFlag(
 *   AIRecommendations,
 *   FeatureFlag.AI_RECOMMENDATIONS,
 *   { fallback: <div>Feature not available</div> }
 * );
 * ```
 *
 * @param Component - The component to wrap
 * @param flag - The feature flag to check
 * @param options - Optional configuration
 * @returns A wrapped component that only renders when the flag is enabled
 */
export function withFeatureFlag<P extends object>(
  Component: React.ComponentType<P>,
  flag: FeatureFlagEnum,
  options: {
    fallback?: React.ReactNode;
    loading?: React.ReactNode;
    getUserId?: (props: P) => string | undefined;
  } = {}
) {
  const { fallback, loading, getUserId } = options;

  const WrappedComponent = (props: P) => {
    const userId = getUserId ? getUserId(props) : undefined;

    return (
      <FeatureFlag
        flag={flag}
        fallback={fallback}
        loading={loading}
        userId={userId}
      >
        <Component {...props} />
      </FeatureFlag>
    );
  };

  WrappedComponent.displayName = `withFeatureFlag(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

/**
 * Utility component to display feature flag status for debugging
 *
 * @example
 * ```tsx
 * // In development mode only
 * {process.env.NODE_ENV === 'development' && (
 *   <FeatureFlagDebug flag={FeatureFlag.AI_RECOMMENDATIONS} />
 * )}
 * ```
 */
export function FeatureFlagDebug({ flag }: { flag: FeatureFlagEnum }) {
  const { isEnabled, config } = useFeatureFlag(flag);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        padding: '8px 12px',
        backgroundColor: isEnabled ? '#10b981' : '#ef4444',
        color: 'white',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      <div>
        <strong>{flag}</strong>: {isEnabled ? 'ON' : 'OFF'}
      </div>
      {config && (
        <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.9 }}>
          {config.description}
        </div>
      )}
    </div>
  );
}

/**
 * Component to display all feature flag states for debugging/admin
 *
 * @example
 * ```tsx
 * // In admin panel
 * <FeatureFlagDashboard />
 * ```
 */
export function FeatureFlagDashboard() {
  const allFlags = Object.values(FeatureFlagEnum);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Feature Flags Dashboard</h2>
      <div style={{ display: 'grid', gap: '12px', marginTop: '20px' }}>
        {allFlags.map(flag => (
          <FeatureFlagDashboardRow key={flag} flag={flag} />
        ))}
      </div>
    </div>
  );
}

function FeatureFlagDashboardRow({ flag }: { flag: FeatureFlagEnum }) {
  const { isEnabled, config } = useFeatureFlag(flag);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: isEnabled ? '#f0fdf4' : '#fef2f2',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{flag}</div>
        {config && (
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            {config.description}
          </div>
        )}
      </div>
      <div
        style={{
          padding: '4px 12px',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 'bold',
          backgroundColor: isEnabled ? '#10b981' : '#ef4444',
          color: 'white',
        }}
      >
        {isEnabled ? 'ON' : 'OFF'}
      </div>
    </div>
  );
}
