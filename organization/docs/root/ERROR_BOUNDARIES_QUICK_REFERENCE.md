# Error Boundaries - Quick Reference

Quick reference guide for using Error Boundaries and Error Reporting in CitadelBuy.

## Quick Start

### Web (Next.js)

```tsx
import { ErrorBoundary } from '@/components/error-boundary';
import { errorReporting } from '@/lib/error-reporting';

// 1. Wrap components
<ErrorBoundary componentName="MyComponent">
  <MyComponent />
</ErrorBoundary>

// 2. Report errors manually
try {
  await riskyOperation();
} catch (error) {
  errorReporting.captureException(error, 'error', { context: 'data' });
}

// 3. Set user context
errorReporting.setUser({ id: user.id, email: user.email });
```

### Mobile (React Native)

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { errorReporting, initializeErrorReporting } from '@/lib/error-reporting';

// 1. Initialize (in App.tsx)
initializeErrorReporting(process.env.EXPO_PUBLIC_SENTRY_DSN);

// 2. Wrap components
<ErrorBoundary componentName="MyScreen">
  <MyScreen />
</ErrorBoundary>

// 3. Report errors manually
errorReporting.captureException(error);
```

## Common Patterns

### Pattern 1: Async Error Handling

```tsx
import { useErrorHandler } from '@/components/error-boundary';

const throwError = useErrorHandler();

const handleAction = async () => {
  try {
    await fetchData();
  } catch (error) {
    throwError(error); // Caught by nearest ErrorBoundary
  }
};
```

### Pattern 2: API Error Tracking

```typescript
import { handleApiError } from '@/lib/error-reporting';

try {
  const response = await api.get('/products');
} catch (error) {
  handleApiError(error, '/products', 'GET');
  throw error;
}
```

### Pattern 3: User Context

```typescript
// Login
errorReporting.setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});

// Logout
errorReporting.clearUser();
```

### Pattern 4: Breadcrumb Tracking

```typescript
// Navigation
errorReporting.addBreadcrumb('navigation', 'Navigated to checkout');

// User action
errorReporting.addBreadcrumb('user-action', 'Added item to cart', 'info', {
  productId: '123',
  price: 29.99,
});

// API call
errorReporting.addBreadcrumb('api', 'Fetching orders', 'info', {
  endpoint: '/api/orders',
});
```

## Error Severity Levels

| Level | When to Use |
|-------|-------------|
| `fatal` | App crashes, critical failures |
| `error` | Errors preventing functionality |
| `warning` | Potential issues to investigate |
| `info` | Informational messages |
| `debug` | Development debugging only |

## Methods Reference

### ErrorBoundary Props

```tsx
<ErrorBoundary
  componentName="MyComponent"           // Component identifier
  fallback={CustomFallback}            // Custom error UI (optional)
  onError={(error, info) => {}}        // Custom error handler (optional)
>
  {children}
</ErrorBoundary>
```

### Error Reporting Service

```typescript
// Capture exception
errorReporting.captureException(error, severity?, context?, metadata?);

// Capture message
errorReporting.captureMessage(message, severity?, context?, metadata?);

// User context
errorReporting.setUser(user);
errorReporting.clearUser();

// Breadcrumbs
errorReporting.addBreadcrumb(category, message, level?, data?);

// Context
errorReporting.setContext(name, context);

// Tags
errorReporting.setTag(key, value);

// Specialized handlers
errorReporting.handleApiError(error, endpoint, method?, context?);
errorReporting.handleUIError(error, component, action?, context?);

// Event tracking
errorReporting.trackEvent(eventName, properties?);

// User feedback (web only)
errorReporting.showReportDialog(eventId?);
```

## Environment Variables

### Web (.env.local)

```env
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-org
SENTRY_PROJECT=citadelbuy-web
SENTRY_AUTH_TOKEN=your-auth-token
```

### Mobile (.env)

```env
EXPO_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

## Best Practices Checklist

- [ ] Place ErrorBoundary at app root
- [ ] Add ErrorBoundary around major features
- [ ] Always provide `componentName` prop
- [ ] Set user context on login/logout
- [ ] Add breadcrumbs for important user actions
- [ ] Don't report validation/auth errors
- [ ] Never log sensitive data (passwords, credit cards)
- [ ] Use appropriate severity levels
- [ ] Test error boundaries in development
- [ ] Verify errors appear in Sentry dashboard

## Common Mistakes to Avoid

```typescript
// ❌ DON'T: Log sensitive data
errorReporting.captureException(error, 'error', {
  password: user.password,
  creditCard: payment.cardNumber,
});

// ✅ DO: Log safe data
errorReporting.captureException(error, 'error', {
  userId: user.id,
  paymentMethod: 'credit_card',
});

// ❌ DON'T: Report expected errors
try {
  await api.fetch();
} catch (error) {
  errorReporting.captureException(error); // Even 401/400 errors
}

// ✅ DO: Filter expected errors
try {
  await api.fetch();
} catch (error) {
  if (error.status !== 401 && error.status !== 400) {
    errorReporting.captureException(error);
  }
}

// ❌ DON'T: Create excessive breadcrumbs
items.forEach(item => {
  errorReporting.addBreadcrumb('item', `Processing ${item.id}`);
});

// ✅ DO: Log summary information
errorReporting.addBreadcrumb('batch', `Processing ${items.length} items`);
```

## Testing

### Test Error Boundary

```tsx
function TestErrorComponent() {
  const [shouldThrow, setShouldThrow] = React.useState(false);

  if (shouldThrow) {
    throw new Error('Test error');
  }

  return (
    <button onClick={() => setShouldThrow(true)}>
      Trigger Error
    </button>
  );
}

// Wrap with ErrorBoundary to test
<ErrorBoundary componentName="Test">
  <TestErrorComponent />
</ErrorBoundary>
```

### Test Error Reporting

```typescript
// Test exception capture
errorReporting.captureException(
  new Error('Test error'),
  'error',
  { test: true }
);

// Test message capture
errorReporting.captureMessage('Test message', 'info');

// Check initialization
console.log('Initialized:', errorReporting.isInitialized());
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Errors not in Sentry | Check DSN, verify initialization, check network |
| Source maps not working | Configure sentry-cli, check auth token |
| Too many errors reported | Add error filtering, adjust sample rates |
| Performance issues | Reduce breadcrumbs, lower sample rate |
| Error boundary not catching | Use useErrorHandler for async/event handlers |

## Quick Commands

```bash
# Verify Sentry CLI
npx sentry-cli --version

# Test Sentry connection
npx sentry-cli info

# Upload source maps manually
npx sentry-cli sourcemaps upload --org=your-org --project=your-project ./build
```

## Example: Complete Implementation

```tsx
// MyFeature.tsx
import { ErrorBoundary } from '@/components/error-boundary';
import { errorReporting } from '@/lib/error-reporting';

export default function MyFeature() {
  React.useEffect(() => {
    // Track feature load
    errorReporting.addBreadcrumb('feature', 'MyFeature loaded', 'info');
  }, []);

  const handleAction = async () => {
    // Track user action
    errorReporting.addBreadcrumb('user-action', 'Action button clicked', 'info');

    try {
      const result = await api.performAction();
      errorReporting.trackEvent('action-completed', { success: true });
      return result;
    } catch (error) {
      errorReporting.handleApiError(error, '/api/action', 'POST', {
        userId: currentUser.id,
      });
      throw error;
    }
  };

  return (
    <ErrorBoundary componentName="MyFeature">
      <div>
        <button onClick={handleAction}>Perform Action</button>
      </div>
    </ErrorBoundary>
  );
}
```

## Need Help?

- Documentation: `docs/ERROR_BOUNDARIES_AND_MONITORING.md`
- Sentry Dashboard: https://sentry.io
- Team Contact: devops@citadelbuy.com
