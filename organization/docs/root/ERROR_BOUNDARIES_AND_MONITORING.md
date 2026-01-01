# Error Boundaries and External Monitoring

This document describes the error boundary implementation and external monitoring integration for Broxiva applications.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Web Application (Next.js)](#web-application-nextjs)
4. [Mobile Application (React Native)](#mobile-application-react-native)
5. [Error Reporting Service](#error-reporting-service)
6. [Sentry Integration](#sentry-integration)
7. [Usage Examples](#usage-examples)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Overview

Broxiva implements comprehensive error handling and monitoring across web and mobile platforms using:

- **React Error Boundaries**: Catch and handle component errors gracefully
- **Sentry Integration**: External monitoring and error tracking
- **Centralized Error Reporting**: Unified service for error handling
- **User Feedback**: Allow users to report issues with context
- **Breadcrumb Logging**: Track user actions leading to errors

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Components  │  │    Pages     │  │   Screens    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                  ┌─────────▼──────────┐                     │
│                  │  Error Boundaries  │                     │
│                  └─────────┬──────────┘                     │
│                            │                                 │
│                  ┌─────────▼──────────┐                     │
│                  │ Error Reporting    │                     │
│                  │     Service        │                     │
│                  └─────────┬──────────┘                     │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                   ┌─────────▼──────────┐
                   │  Sentry Platform   │
                   │  - Error Tracking  │
                   │  - Performance     │
                   │  - User Feedback   │
                   └────────────────────┘
```

## Web Application (Next.js)

### File Locations

- **Error Boundary**: `apps/web/src/components/error-boundary.tsx`
- **Error Reporting Service**: `apps/web/src/lib/error-reporting.ts`
- **Sentry Config**:
  - `apps/web/sentry.client.config.ts`
  - `apps/web/sentry.server.config.ts`
  - `apps/web/sentry.edge.config.ts`

### Usage

#### Basic Usage

```tsx
import { ErrorBoundary } from '@/components/error-boundary';

function MyPage() {
  return (
    <ErrorBoundary componentName="MyPage">
      <YourComponent />
    </ErrorBoundary>
  );
}
```

#### Custom Fallback UI

```tsx
import { ErrorBoundary } from '@/components/error-boundary';

function CustomErrorFallback({ error, resetError, eventId }) {
  return (
    <div>
      <h1>Custom Error Page</h1>
      <p>{error?.message}</p>
      <button onClick={resetError}>Retry</button>
      {eventId && <p>Error ID: {eventId}</p>}
    </div>
  );
}

function MyPage() {
  return (
    <ErrorBoundary
      componentName="MyPage"
      fallback={CustomErrorFallback}
    >
      <YourComponent />
    </ErrorBoundary>
  );
}
```

#### Error Reporting in Event Handlers

```tsx
import { useErrorHandler } from '@/components/error-boundary';
import { errorReporting } from '@/lib/error-reporting';

function MyComponent() {
  const throwError = useErrorHandler();

  const handleClick = async () => {
    try {
      await fetchData();
    } catch (error) {
      // Option 1: Throw error to be caught by Error Boundary
      throwError(error);

      // Option 2: Report directly to Sentry
      errorReporting.captureException(
        error,
        'error',
        { component: 'MyComponent', action: 'fetchData' }
      );
    }
  };

  return <button onClick={handleClick}>Load Data</button>;
}
```

### Error Reporting Service API

#### Capture Exception

```typescript
import { errorReporting } from '@/lib/error-reporting';

try {
  // risky operation
} catch (error) {
  errorReporting.captureException(
    error,
    'error', // severity: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
    {
      // Additional context
      userId: user.id,
      action: 'checkout',
    },
    {
      // Metadata for filtering/tagging
      component: 'CheckoutForm',
      action: 'processPayment',
    }
  );
}
```

#### Capture Message

```typescript
errorReporting.captureMessage(
  'User attempted invalid checkout',
  'warning',
  { cartId: cart.id },
  { component: 'Checkout' }
);
```

#### Set User Context

```typescript
// When user logs in
errorReporting.setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});

// When user logs out
errorReporting.clearUser();
```

#### Add Breadcrumbs

```typescript
// Track user actions for debugging
errorReporting.addBreadcrumb(
  'navigation',
  'User navigated to checkout',
  'info',
  { from: '/cart', to: '/checkout' }
);

errorReporting.addBreadcrumb(
  'user-action',
  'User clicked "Place Order"',
  'info',
  { orderTotal: 99.99 }
);
```

#### Handle API Errors

```typescript
import { handleApiError } from '@/lib/error-reporting';

try {
  const response = await fetch('/api/products');
  if (!response.ok) throw new Error('Failed to fetch');
} catch (error) {
  handleApiError(error, '/api/products', 'GET', {
    params: searchParams,
  });
}
```

#### Handle UI Errors

```typescript
import { handleUIError } from '@/lib/error-reporting';

try {
  // Complex rendering logic
  renderComplexComponent();
} catch (error) {
  handleUIError(
    error,
    'ProductCard',
    'render',
    { productId: product.id }
  );
}
```

#### Track Events

```typescript
// Analytics-style event tracking with error context
errorReporting.trackEvent('checkout-completed', {
  orderId: order.id,
  total: order.total,
  items: order.items.length,
});
```

## Mobile Application (React Native)

### File Locations

- **Error Boundary**: `apps/mobile/src/components/ErrorBoundary.tsx`
- **Error Reporting Service**: `apps/mobile/src/lib/error-reporting.ts`

### Installation

First, install the required dependencies:

```bash
cd apps/mobile
npm install @sentry/react-native
# or
yarn add @sentry/react-native
```

### Initialization

Initialize error reporting in your app entry point:

```typescript
// App.tsx or _layout.tsx
import { initializeErrorReporting } from './lib/error-reporting';

export default function App() {
  React.useEffect(() => {
    initializeErrorReporting(process.env.EXPO_PUBLIC_SENTRY_DSN);
  }, []);

  return (
    <ErrorBoundary componentName="App">
      <YourApp />
    </ErrorBoundary>
  );
}
```

### Usage

#### Basic Usage

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

function MyScreen() {
  return (
    <ErrorBoundary componentName="MyScreen">
      <YourComponent />
    </ErrorBoundary>
  );
}
```

#### Error Reporting in Event Handlers

```tsx
import { useErrorHandler } from '@/components/ErrorBoundary';
import { errorReporting } from '@/lib/error-reporting';

function MyComponent() {
  const throwError = useErrorHandler();

  const handlePress = async () => {
    try {
      await fetchData();
    } catch (error) {
      // Option 1: Throw to Error Boundary
      throwError(error);

      // Option 2: Report directly
      errorReporting.captureException(
        error,
        'error',
        { screen: 'MyScreen', action: 'fetchData' }
      );
    }
  };

  return <Button onPress={handlePress} title="Load Data" />;
}
```

#### Native Crash Detection

```typescript
import { errorReporting } from '@/lib/error-reporting';

// Wrap components with native crash detection
const SafeComponent = errorReporting.wrap(YourComponent);

// Force a native crash (for testing only)
errorReporting.nativeCrash();
```

#### Flush Events Before App Close

```typescript
import { errorReporting } from '@/lib/error-reporting';

// Flush pending events before app closes
await errorReporting.flush(2000); // 2 second timeout
```

## Error Reporting Service

### Common Methods (Web & Mobile)

| Method | Description | Parameters |
|--------|-------------|------------|
| `captureException()` | Report an error | `(error, severity?, context?, metadata?)` |
| `captureMessage()` | Report a message | `(message, severity?, context?, metadata?)` |
| `setUser()` | Set user context | `(user)` |
| `clearUser()` | Clear user context | `()` |
| `addBreadcrumb()` | Add debugging breadcrumb | `(category, message, level?, data?)` |
| `setContext()` | Set custom context | `(name, context)` |
| `setTag()` | Set filtering tag | `(key, value)` |
| `trackEvent()` | Track user action | `(eventName, properties?)` |
| `handleApiError()` | Report API error | `(error, endpoint, method?, context?)` |
| `handleUIError()` | Report UI error | `(error, component, action?, context?)` |

### Error Severity Levels

- **fatal**: Critical errors that crash the app
- **error**: Errors that prevent functionality but don't crash
- **warning**: Potential issues that should be investigated
- **info**: Informational messages
- **debug**: Debugging information (development only)

## Sentry Integration

### Environment Variables

Create a `.env.local` file (web) or `.env` file (mobile):

```env
# Web (Next.js)
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-org
SENTRY_PROJECT=broxiva-web
SENTRY_AUTH_TOKEN=your-auth-token

# Mobile (React Native)
EXPO_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

### Configuration

#### Web (Next.js)

The Sentry configuration is automatically loaded from:
- `sentry.client.config.ts` - Client-side configuration
- `sentry.server.config.ts` - Server-side configuration
- `sentry.edge.config.ts` - Edge runtime configuration

Features enabled:
- Performance monitoring (10% sample rate in production)
- Session replay (10% of sessions, 100% of errors)
- Error filtering (ignores common browser errors)
- User context tracking
- Breadcrumb logging

#### Mobile (React Native)

Features enabled:
- Native crash handling
- Performance monitoring (20% sample rate in production)
- App hang tracking
- Watchdog termination tracking
- Session tracking (30-second intervals)
- Platform-specific context (iOS/Android)

### Sentry Features

#### 1. Error Tracking

All uncaught exceptions are automatically reported with:
- Stack traces
- Component stack (React)
- User context
- Breadcrumbs (user actions leading to error)
- Device/browser information
- Environment (dev/staging/production)

#### 2. Performance Monitoring

Track application performance:
- Page load times
- API request duration
- Component render times
- Custom transactions

```typescript
const transaction = errorReporting.startTransaction(
  'checkout-flow',
  'navigation'
);

// ... perform operations ...

transaction.finish();
```

#### 3. Session Replay (Web Only)

Sentry records user sessions when errors occur, allowing you to see:
- User interactions
- Network requests
- Console logs
- DOM changes

Note: All text and media are masked for privacy.

#### 4. User Feedback

Users can submit feedback directly from error screens:

```typescript
// Web
errorReporting.showReportDialog(eventId);

// Mobile
errorReporting.captureUserFeedback(
  eventId,
  'John Doe',
  'john@example.com',
  'I was trying to checkout when this happened'
);
```

## Usage Examples

### Example 1: Wrapping Routes

```tsx
// Web - layout.tsx
import { ErrorBoundary } from '@/components/error-boundary';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorBoundary componentName="RootLayout">
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

### Example 2: API Integration

```typescript
// api-client.ts
import axios from 'axios';
import { handleApiError } from '@/lib/error-reporting';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    handleApiError(
      error,
      error.config.url,
      error.config.method,
      {
        requestData: error.config.data,
        headers: error.config.headers,
      }
    );
    return Promise.reject(error);
  }
);

export default apiClient;
```

### Example 3: Authentication Flow

```typescript
// auth-service.ts
import { setUser, clearUser, addBreadcrumb } from '@/lib/error-reporting';

export async function login(email: string, password: string) {
  addBreadcrumb('auth', 'User attempting login', 'info', { email });

  try {
    const user = await authApi.login(email, password);

    // Set user context for error tracking
    setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    addBreadcrumb('auth', 'User logged in successfully', 'info');
    return user;
  } catch (error) {
    addBreadcrumb('auth', 'Login failed', 'error', { email });
    throw error;
  }
}

export function logout() {
  addBreadcrumb('auth', 'User logging out', 'info');
  clearUser();
  // ... logout logic
}
```

### Example 4: Shopping Cart

```typescript
// cart-store.ts
import { create } from 'zustand';
import { errorReporting } from '@/lib/error-reporting';

export const useCartStore = create((set) => ({
  items: [],

  addItem: (item) => {
    try {
      set((state) => ({
        items: [...state.items, item],
      }));

      errorReporting.trackEvent('cart-item-added', {
        productId: item.id,
        price: item.price,
        quantity: item.quantity,
      });
    } catch (error) {
      errorReporting.handleUIError(
        error,
        'CartStore',
        'addItem',
        { itemId: item.id }
      );
      throw error;
    }
  },
}));
```

### Example 5: Form Validation

```typescript
// checkout-form.tsx
import { handleUIError } from '@/lib/error-reporting';

function CheckoutForm() {
  const handleSubmit = async (data) => {
    try {
      validateForm(data);
      await processCheckout(data);
    } catch (error) {
      if (error instanceof ValidationError) {
        // Don't report validation errors to Sentry
        showValidationErrors(error);
      } else {
        // Report unexpected errors
        handleUIError(
          error,
          'CheckoutForm',
          'submit',
          { formData: sanitizeData(data) }
        );
      }
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

## Best Practices

### 1. Error Boundary Placement

- Place at least one Error Boundary at the app root
- Add Error Boundaries around major features/routes
- Use granular boundaries for complex components
- Always provide a `componentName` prop for better tracking

```tsx
// Good: Multiple levels of error boundaries
<ErrorBoundary componentName="App">
  <Layout>
    <ErrorBoundary componentName="ProductList">
      <ProductList />
    </ErrorBoundary>
    <ErrorBoundary componentName="Cart">
      <Cart />
    </ErrorBoundary>
  </Layout>
</ErrorBoundary>
```

### 2. Error Context

Always provide meaningful context:

```typescript
// Bad
errorReporting.captureException(error);

// Good
errorReporting.captureException(
  error,
  'error',
  {
    userId: user.id,
    cartTotal: cart.total,
    itemCount: cart.items.length,
  },
  {
    component: 'CheckoutForm',
    action: 'processPayment',
    paymentMethod: paymentMethod.type,
  }
);
```

### 3. Breadcrumb Logging

Use breadcrumbs to track user journey:

```typescript
// Navigation
errorReporting.addBreadcrumb('navigation', 'Navigated to checkout', 'info');

// User actions
errorReporting.addBreadcrumb('user-action', 'Clicked "Place Order"', 'info');

// State changes
errorReporting.addBreadcrumb('state-change', 'Cart updated', 'info', {
  itemCount: 3,
  total: 99.99,
});

// API calls
errorReporting.addBreadcrumb('api', 'Fetching products', 'info', {
  endpoint: '/api/products',
  method: 'GET',
});
```

### 4. User Privacy

Never log sensitive information:

```typescript
// Bad - Logs sensitive data
errorReporting.captureException(error, 'error', {
  password: user.password,
  creditCard: paymentInfo.cardNumber,
});

// Good - Logs safe data
errorReporting.captureException(error, 'error', {
  userId: user.id,
  paymentMethod: 'credit_card',
  lastFourDigits: paymentInfo.lastFour,
});
```

### 5. Error Filtering

Don't report expected errors:

```typescript
try {
  await api.fetchData();
} catch (error) {
  if (error.status === 401) {
    // Expected - user not authenticated
    redirectToLogin();
  } else if (error.status === 400) {
    // Expected - validation error
    showValidationError(error);
  } else {
    // Unexpected - report to Sentry
    errorReporting.captureException(error);
  }
}
```

### 6. Development vs Production

Use different strategies for different environments:

```typescript
// Only report to Sentry in production
if (process.env.NODE_ENV === 'production') {
  errorReporting.captureException(error);
} else {
  // Detailed console logging in development
  console.error('Detailed error:', error);
  console.error('Stack:', error.stack);
  console.error('Context:', context);
}
```

### 7. Performance Considerations

Be mindful of performance impact:

```typescript
// Bad - Creates too much overhead
Array.from({ length: 1000 }).forEach((_, i) => {
  errorReporting.addBreadcrumb('item', `Processing item ${i}`, 'info');
});

// Good - Log summary information
errorReporting.addBreadcrumb('batch', 'Processing 1000 items', 'info', {
  count: 1000,
  startTime: Date.now(),
});
```

## Troubleshooting

### Errors Not Appearing in Sentry

1. **Check DSN Configuration**
   ```bash
   # Verify environment variable is set
   echo $NEXT_PUBLIC_SENTRY_DSN  # Web
   echo $EXPO_PUBLIC_SENTRY_DSN  # Mobile
   ```

2. **Verify Initialization**
   ```typescript
   console.log('Sentry initialized:', errorReporting.isInitialized());
   ```

3. **Check Network**
   - Ensure your application can reach sentry.io
   - Check for firewall/proxy issues

4. **Verify Error Filtering**
   - Check `beforeSend` configuration in Sentry config files
   - Ensure error isn't in `ignoreErrors` list

### Source Maps Not Working

1. **Web**: Ensure `sentry-cli` is configured:
   ```bash
   # .sentryclirc
   [auth]
   token=your-auth-token

   [defaults]
   org=your-org
   project=broxiva-web
   ```

2. **Mobile**: Source maps are automatically uploaded during build

### Performance Issues

If experiencing performance issues with error reporting:

1. **Reduce Sample Rates**
   ```typescript
   // In sentry config
   tracesSampleRate: 0.1, // Reduce from 1.0 to 0.1
   ```

2. **Limit Breadcrumbs**
   ```typescript
   // In sentry config
   maxBreadcrumbs: 50, // Default is 100
   ```

3. **Filter Events**
   ```typescript
   // In beforeSend hook
   beforeSend(event) {
     // Filter low-priority events
     if (event.level === 'info') {
       return null;
     }
     return event;
   }
   ```

### Error Boundaries Not Catching Errors

Error boundaries only catch:
- Render errors
- Lifecycle method errors
- Constructor errors

They don't catch:
- Event handler errors (use try/catch)
- Async errors (use try/catch)
- Server-side rendering errors
- Errors in error boundary itself

Solution: Use `useErrorHandler` hook or report directly:

```typescript
const throwError = useErrorHandler();

const handleClick = async () => {
  try {
    await fetchData();
  } catch (error) {
    throwError(error); // Throw to nearest error boundary
  }
};
```

## Support

For questions or issues:

- Internal: Contact the DevOps team
- Sentry Docs: https://docs.sentry.io
- GitHub Issues: Create an issue in the repository

## Related Documentation

- [Sentry Configuration](./SENTRY_CONFIGURATION.md)
- [Monitoring and Alerting](./MONITORING_AND_ALERTING.md)
- [Testing Error Boundaries](./TESTING_ERROR_BOUNDARIES.md)
- [Security Best Practices](./SECURITY_SETUP.md)
