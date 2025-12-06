# Feature Flags System

A comprehensive feature flags system for the Citadel Buy web application. This system enables you to control feature rollouts, run A/B tests, and manage feature availability without deploying new code.

## Overview

The feature flags system consists of three main components:

1. **Configuration** (`feature-flags.ts`) - Define and manage feature flags
2. **React Hook** (`useFeatureFlag.ts`) - Use feature flags in React components
3. **Components** (`feature-flag.tsx`) - Declarative components for conditional rendering

## Available Feature Flags

| Flag | Description | Default | Status |
|------|-------------|---------|--------|
| `AI_RECOMMENDATIONS` | AI-powered product recommendations | `true` | Production Ready |
| `SOCIAL_LOGIN` | Social authentication (Google, Facebook, Apple) | `true` | Production Ready |
| `BNPL_PAYMENTS` | Buy Now Pay Later options (Klarna, Afterpay) | `true` | Production Ready |
| `VIRTUAL_TRYON` | Virtual try-on using AR/camera | `false` | Beta |
| `CHAT_SUPPORT` | Live chat support with agents | `true` | Production Ready |
| `OFFLINE_MODE` | Offline mode with service worker caching | `false` | Development |

## Quick Start

### 1. Using the Hook

```tsx
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { FeatureFlag } from '@/config/feature-flags';

function MyComponent() {
  const { isEnabled } = useFeatureFlag(FeatureFlag.AI_RECOMMENDATIONS);

  if (!isEnabled) {
    return null;
  }

  return <AIRecommendations />;
}
```

### 2. Using the Component

```tsx
import { FeatureFlag as FeatureFlagComponent } from '@/components/feature-flag';
import { FeatureFlag } from '@/config/feature-flags';

function MyComponent() {
  return (
    <FeatureFlagComponent flag={FeatureFlag.SOCIAL_LOGIN}>
      <SocialLoginButtons />
    </FeatureFlagComponent>
  );
}
```

### 3. Using Utility Functions

```tsx
import { isFeatureEnabled } from '@/config/feature-flags';
import { FeatureFlag } from '@/config/feature-flags';

function getAvailablePaymentMethods() {
  const methods = ['credit_card'];

  if (isFeatureEnabled(FeatureFlag.BNPL_PAYMENTS)) {
    methods.push('klarna', 'afterpay');
  }

  return methods;
}
```

## Advanced Usage

### User Targeting

Target specific users for feature rollouts:

```tsx
<FeatureFlagComponent
  flag={FeatureFlag.VIRTUAL_TRYON}
  userId={user.id}
>
  <VirtualTryOnButton />
</FeatureFlagComponent>
```

### Fallback Content

Provide alternative content when a feature is disabled:

```tsx
<FeatureFlagComponent
  flag={FeatureFlag.CHAT_SUPPORT}
  fallback={<EmailSupportForm />}
>
  <LiveChatWidget />
</FeatureFlagComponent>
```

### Multiple Flags

Check multiple feature flags at once:

```tsx
import { useFeatureFlags } from '@/hooks/useFeatureFlag';

function MyComponent() {
  const features = useFeatureFlags([
    FeatureFlag.AI_RECOMMENDATIONS,
    FeatureFlag.SOCIAL_LOGIN,
  ]);

  return (
    <div>
      {features[FeatureFlag.AI_RECOMMENDATIONS] && <AIRecommendations />}
      {features[FeatureFlag.SOCIAL_LOGIN] && <SocialLoginButtons />}
    </div>
  );
}
```

### Render Props

Use render props for complex conditional logic:

```tsx
<FeatureFlagComponent
  flag={FeatureFlag.BNPL_PAYMENTS}
  render={(enabled) => (
    <div>
      <h3>Payment Options</h3>
      {enabled ? (
        <BNPLOptions />
      ) : (
        <StandardPayment />
      )}
    </div>
  )}
/>
```

## Configuration

### Environment Variables

Override feature flags using environment variables:

```bash
# .env.local
NEXT_PUBLIC_FEATURE_AI_RECOMMENDATIONS=true
NEXT_PUBLIC_FEATURE_VIRTUAL_TRYON=false
```

Environment variables take precedence over the configuration file.

### Rollout Percentage

Gradually roll out features to a percentage of users:

```typescript
// In feature-flags.ts
{
  key: FeatureFlag.VIRTUAL_TRYON,
  enabled: true,
  rolloutPercentage: 25, // Enable for 25% of users
}
```

### Environment Restrictions

Restrict features to specific environments:

```typescript
{
  key: FeatureFlag.OFFLINE_MODE,
  enabled: true,
  environments: ['development'], // Only in development
}
```

### User Targeting

Enable features for specific users:

```typescript
{
  key: FeatureFlag.BETA_FEATURE,
  enabled: true,
  enabledForUsers: ['user123', 'user456'], // Only these users
}
```

## API Reference

### Hooks

#### `useFeatureFlag(flag, options?)`

Check if a single feature flag is enabled.

**Parameters:**
- `flag: FeatureFlag` - The feature flag to check
- `options?: { userId?: string; onToggle?: (enabled: boolean) => void }`

**Returns:**
- `{ isEnabled: boolean; isLoading: boolean; config: FeatureFlagConfig }`

#### `useFeatureFlags(flags, userId?)`

Check multiple feature flags at once.

**Parameters:**
- `flags: FeatureFlag[]` - Array of feature flags to check
- `userId?: string` - Optional user ID for targeting

**Returns:**
- `Record<FeatureFlag, boolean>` - Map of flags to their enabled state

#### `useEnabledFeatures(userId?)`

Get all currently enabled features.

**Parameters:**
- `userId?: string` - Optional user ID for targeting

**Returns:**
- `FeatureFlag[]` - Array of enabled feature flags

#### `useAllFeatureStates(userId?)`

Get all feature flags with their current state.

**Parameters:**
- `userId?: string` - Optional user ID for targeting

**Returns:**
- `Record<FeatureFlag, boolean>` - Map of all flags to their enabled state

### Components

#### `<FeatureFlag>`

Declarative component for conditional rendering based on a feature flag.

**Props:**
- `flag: FeatureFlag` - The feature flag to check
- `children: ReactNode` - Content to render when enabled
- `fallback?: ReactNode` - Content to render when disabled
- `loading?: ReactNode` - Content to render while loading
- `userId?: string` - User ID for targeting
- `onToggle?: (enabled: boolean) => void` - Callback on state change
- `render?: (enabled: boolean) => ReactNode` - Render prop alternative

#### `<FeatureFlags>`

Component for checking multiple feature flags.

**Props:**
- `flags: FeatureFlag[]` - Array of flags to check
- `mode?: 'all' | 'any'` - Check if all flags or any flag is enabled
- `children: ReactNode` - Content to render when condition is met
- `fallback?: ReactNode` - Content to render otherwise
- `userId?: string` - User ID for targeting
- `render?: (enabledFlags: Record<FeatureFlag, boolean>) => ReactNode`

#### `withFeatureFlag(Component, flag, options?)`

Higher-order component to wrap a component with feature flag checking.

**Parameters:**
- `Component: ComponentType<P>` - Component to wrap
- `flag: FeatureFlag` - Feature flag to check
- `options?: { fallback?: ReactNode; loading?: ReactNode; getUserId?: (props) => string }`

**Returns:**
- Wrapped component

### Utility Functions

#### `isFeatureEnabled(flag, userId?)`

Check if a feature flag is enabled (non-React).

**Parameters:**
- `flag: FeatureFlag` - The feature flag to check
- `userId?: string` - Optional user ID for targeting

**Returns:**
- `boolean` - Whether the feature is enabled

#### `getEnabledFeatures(userId?)`

Get all enabled feature flags (non-React).

**Parameters:**
- `userId?: string` - Optional user ID for targeting

**Returns:**
- `FeatureFlag[]` - Array of enabled feature flags

#### `getFeatureFlagConfig(flag)`

Get the configuration for a specific feature flag.

**Parameters:**
- `flag: FeatureFlag` - The feature flag

**Returns:**
- `FeatureFlagConfig | undefined` - The flag's configuration

## Best Practices

### 1. Use Descriptive Flag Names

```typescript
// Good
FeatureFlag.AI_RECOMMENDATIONS

// Bad
FeatureFlag.NEW_FEATURE
```

### 2. Always Provide Fallback Content

```tsx
<FeatureFlagComponent
  flag={FeatureFlag.CHAT_SUPPORT}
  fallback={<EmailSupport />}
>
  <LiveChat />
</FeatureFlagComponent>
```

### 3. Track Feature Flag Usage

```tsx
const { isEnabled } = useFeatureFlag(FeatureFlag.AI_RECOMMENDATIONS, {
  onToggle: (enabled) => {
    analytics.track('feature_flag_checked', {
      flag: 'AI_RECOMMENDATIONS',
      enabled,
    });
  },
});
```

### 4. Clean Up Old Flags

Remove feature flags once features are fully rolled out or permanently disabled.

### 5. Document Feature Flags

Always include a description in the feature flag configuration.

### 6. Test Both States

Test your components with the feature both enabled and disabled.

### 7. Use Environment Variables for Testing

Override flags locally without changing code:

```bash
NEXT_PUBLIC_FEATURE_VIRTUAL_TRYON=true npm run dev
```

## Debugging

### Development Debug Component

Add a debug component to see feature flag state:

```tsx
import { FeatureFlagDebug } from '@/components/feature-flag';

// In your component
{process.env.NODE_ENV === 'development' && (
  <FeatureFlagDebug flag={FeatureFlag.AI_RECOMMENDATIONS} />
)}
```

### Feature Flags Dashboard

View all feature flags in an admin panel:

```tsx
import { FeatureFlagDashboard } from '@/components/feature-flag';

function AdminPanel() {
  return <FeatureFlagDashboard />;
}
```

## Examples

See `feature-flags.example.tsx` for comprehensive usage examples including:
- Basic usage
- User targeting
- Multiple flags
- Render props
- HOCs
- Analytics integration
- And more!

## Migration Guide

### Adding a New Feature Flag

1. Add the flag to the `FeatureFlag` enum in `feature-flags.ts`
2. Add configuration in the `featureFlags` object
3. Use the flag in your components

```typescript
// 1. Add to enum
export enum FeatureFlag {
  // ... existing flags
  MY_NEW_FEATURE = 'MY_NEW_FEATURE',
}

// 2. Add configuration
export const featureFlags: Record<FeatureFlag, FeatureFlagConfig> = {
  // ... existing flags
  [FeatureFlag.MY_NEW_FEATURE]: {
    key: FeatureFlag.MY_NEW_FEATURE,
    enabled: false,
    description: 'Description of my new feature',
    environments: ['development'],
    rolloutPercentage: 0,
  },
};

// 3. Use in components
<FeatureFlagComponent flag={FeatureFlag.MY_NEW_FEATURE}>
  <MyNewFeature />
</FeatureFlagComponent>
```

### Removing a Feature Flag

1. Remove all usages from your codebase
2. Remove the flag from the enum
3. Remove the configuration

## TypeScript Support

The system is fully typed with TypeScript for type safety:

```typescript
// Type-safe flag checking
const enabled: boolean = isFeatureEnabled(FeatureFlag.AI_RECOMMENDATIONS);

// Type-safe flag states
const states: Record<FeatureFlag, boolean> = getAllFeatureStates();

// Autocomplete in components
<FeatureFlagComponent flag={FeatureFlag./* autocomplete here */} />
```

## Performance Considerations

- Feature flag checks are fast (O(1) lookups)
- No network requests by default
- Minimal React re-renders
- Memoized configurations
- Can integrate with remote config services

## Future Enhancements

Potential improvements:
- Remote configuration updates
- Real-time flag updates via WebSocket
- A/B testing integration
- Analytics dashboard
- Admin UI for flag management
- Scheduled flag activation
- Flag dependency management

## Support

For questions or issues with the feature flags system, please:
1. Check the examples in `feature-flags.example.tsx`
2. Review this documentation
3. Check the TypeScript definitions
4. Contact the development team

## License

Internal use only - Citadel Buy Application
