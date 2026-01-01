# Sentry Project Configuration Guide

## Overview

This guide provides step-by-step instructions for configuring Sentry projects for Broxiva's multi-environment e-commerce platform. It covers project setup, environment separation, release tracking, and source map configuration.

## Table of Contents

- [Project Structure](#project-structure)
- [Environment Setup](#environment-setup)
- [Backend Configuration](#backend-configuration)
- [Frontend Configuration](#frontend-configuration)
- [Mobile Configuration](#mobile-configuration)
- [Release Tracking](#release-tracking)
- [Source Maps](#source-maps)
- [Data Scrubbing](#data-scrubbing)
- [Team Access](#team-access)

---

## Project Structure

### Organization Hierarchy

```
Broxiva Organization
├── Teams
│   ├── Platform Team
│   ├── Frontend Team
│   ├── Mobile Team
│   ├── Payments Team
│   └── Infrastructure Team
│
└── Projects
    ├── Backend
    │   ├── broxiva-backend-prod
    │   ├── broxiva-backend-staging
    │   └── broxiva-backend-dev
    │
    ├── Frontend
    │   ├── broxiva-web-prod
    │   ├── broxiva-web-staging
    │   └── broxiva-web-dev
    │
    └── Mobile
        ├── broxiva-mobile-prod
        ├── broxiva-mobile-staging
        └── broxiva-mobile-dev
```

### Creating Projects

#### 1. Create Backend Projects

**Project Settings:**
- **Name:** `broxiva-backend-prod`
- **Platform:** Node.js
- **Team:** Platform Team
- **Default Environment:** production

**Steps:**
1. Navigate to **Settings** → **Projects** → **Create Project**
2. Select **Node.js** as platform
3. Enter project name: `broxiva-backend-prod`
4. Assign to **Platform Team**
5. Copy the DSN for configuration
6. Repeat for staging and dev environments

#### 2. Create Frontend Projects

**Project Settings:**
- **Name:** `broxiva-web-prod`
- **Platform:** Next.js
- **Team:** Frontend Team
- **Default Environment:** production

**Steps:**
1. Navigate to **Settings** → **Projects** → **Create Project**
2. Select **Next.js** as platform
3. Enter project name: `broxiva-web-prod`
4. Assign to **Frontend Team**
5. Copy the DSN for configuration
6. Repeat for staging and dev environments

#### 3. Create Mobile Projects

**Project Settings:**
- **Name:** `broxiva-mobile-prod`
- **Platform:** React Native
- **Team:** Mobile Team
- **Default Environment:** production

**Steps:**
1. Navigate to **Settings** → **Projects** → **Create Project**
2. Select **React Native** as platform
3. Enter project name: `broxiva-mobile-prod`
4. Assign to **Mobile Team**
5. Copy the DSN for configuration
6. Repeat for staging and dev environments

---

## Environment Setup

### Environment Tags

Configure environment tags to separate data by deployment environment.

#### Backend Environments

**Production:**
```bash
SENTRY_ENVIRONMENT=production
NODE_ENV=production
```

**Staging:**
```bash
SENTRY_ENVIRONMENT=staging
NODE_ENV=production
```

**Development:**
```bash
SENTRY_ENVIRONMENT=development
NODE_ENV=development
```

#### Environment Configuration in Sentry

Navigate to **Project Settings** → **Environments**.

**Create Environments:**
- `production` (default)
- `staging`
- `development`
- `test` (optional, for CI/CD)

**Set Visibility:**
- Production: Visible to all
- Staging: Visible to engineering teams
- Development: Hidden from dashboards by default

---

## Backend Configuration

### 1. Install Sentry SDK

```bash
cd apps/api
pnpm add @sentry/node @sentry/profiling-node
```

### 2. Environment Variables

Add to `apps/api/.env`:

```bash
# Sentry Configuration
SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project-id]
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% in production
SENTRY_PROFILES_SAMPLE_RATE=0.1  # 10% in production
SENTRY_RELEASE=broxiva-backend@2.0.0
```

### 3. Initialize Sentry

The Sentry service is already configured at:
```
apps/api/src/common/monitoring/sentry.service.ts
apps/api/src/common/monitoring/sentry.module.ts
```

**Key Configuration Options:**

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'development',
  release: `broxiva-backend@${process.env.npm_package_version}`,

  // Performance Monitoring
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),

  integrations: [
    new ProfilingIntegration(),
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app: undefined }),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection(),
    new Sentry.Integrations.RequestData(),
  ],

  beforeSend(event, hint) {
    // Data scrubbing logic
    return event;
  },
});
```

### 4. Exception Filter

The global exception filter is configured in `apps/api/src/main.ts`:

```typescript
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';

// In bootstrap function
app.useGlobalFilters(new SentryExceptionFilter(configService));
```

### 5. Performance Monitoring

**Transaction Naming:**
```typescript
// Automatically captures HTTP transactions
transaction: "POST /api/checkout"
transaction: "GET /api/products/:id"
```

**Custom Transactions:**
```typescript
import { SentryService } from '@common/monitoring/sentry.service';

@Injectable()
export class MyService {
  constructor(private sentryService: SentryService) {}

  async processOrder(orderId: string) {
    const transaction = this.sentryService.startTransaction({
      op: 'order.process',
      name: 'Process Order',
      data: { orderId },
    });

    try {
      // Business logic
      await this.orderRepository.process(orderId);
      transaction.setStatus('ok');
    } catch (error) {
      transaction.setStatus('internal_error');
      this.sentryService.captureException(error, { orderId });
      throw error;
    } finally {
      transaction.finish();
    }
  }
}
```

### 6. Context Enrichment

**User Context:**
```typescript
this.sentryService.setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});
```

**Custom Context:**
```typescript
this.sentryService.setContext('order', {
  orderId: order.id,
  total: order.total,
  itemCount: order.items.length,
});
```

**Breadcrumbs:**
```typescript
this.sentryService.addBreadcrumb({
  category: 'auth',
  message: 'User logged in',
  level: 'info',
  data: { userId: user.id },
});
```

---

## Frontend Configuration

### 1. Install Sentry SDK

```bash
cd apps/web
pnpm add @sentry/nextjs
```

### 2. Environment Variables

Add to `apps/web/.env.local`:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project-id]
SENTRY_AUTH_TOKEN=your_sentry_auth_token
SENTRY_ORG=broxiva
SENTRY_PROJECT=broxiva-web-prod

# Source Maps
SENTRY_UPLOAD_SOURCE_MAPS=true
SENTRY_RELEASE=broxiva-web@2.0.0
```

### 3. Sentry Configuration Files

The following files are already configured:

**Client Configuration** (`sentry.client.config.ts`):
```typescript
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,

    // Performance Monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
      new Sentry.BrowserTracing({
        tracePropagationTargets: ['localhost', /^\//, /^https:\/\/broxiva\.com/],
      }),
    ],

    beforeSend(event, hint) {
      // Filter and scrub sensitive data
      return event;
    },
  });
}
```

**Server Configuration** (`sentry.server.config.ts`):
```typescript
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
    ],

    beforeSend(event, hint) {
      // Scrub sensitive server-side data
      return event;
    },
  });
}
```

**Edge Runtime Configuration** (`sentry.edge.config.ts`):
```typescript
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
```

### 4. Next.js Configuration

Add to `next.config.js`:

```javascript
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // Your existing Next.js config
};

module.exports = withSentryConfig(
  nextConfig,
  {
    // Sentry webpack plugin options
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
  },
  {
    // Upload source maps
    widenClientFileUpload: true,
    transpileClientSDK: true,
    hideSourceMaps: true,
    disableLogger: true,
  }
);
```

### 5. Session Replay Configuration

**Masking Sensitive Data:**

Add to components with sensitive data:
```tsx
<input
  type="password"
  className="sentry-mask"  // Masks content in session replay
/>

<div className="sentry-block">  // Blocks entire element
  {/* Credit card info */}
</div>
```

**Privacy Settings:**
```typescript
new Sentry.Replay({
  maskAllText: true,          // Mask all text by default
  blockAllMedia: true,        // Block all images/videos
  maskAllInputs: true,        // Mask all input values

  // Unmask specific elements
  unmask: ['.public-content'],
  unblock: ['.product-image'],
})
```

---

## Mobile Configuration

### 1. Install Sentry SDK

```bash
cd apps/mobile
pnpm add @sentry/react-native
```

### 2. Configuration

**app.config.js:**
```javascript
export default {
  // ... other config
  extra: {
    sentryDsn: process.env.SENTRY_DSN,
    sentryEnvironment: process.env.SENTRY_ENVIRONMENT || 'production',
  },
  plugins: [
    [
      '@sentry/react-native/expo',
      {
        organization: 'broxiva',
        project: 'broxiva-mobile-prod',
      },
    ],
  ],
};
```

### 3. Initialize Sentry

**App.tsx:**
```typescript
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

Sentry.init({
  dsn: Constants.expoConfig?.extra?.sentryDsn,
  environment: Constants.expoConfig?.extra?.sentryEnvironment,

  // Performance Monitoring
  tracesSampleRate: 0.1,

  // Enable native crash reporting
  enableNative: true,
  enableNativeNagger: false,

  // Release tracking
  release: `broxiva-mobile@${Constants.expoConfig?.version}`,
  dist: Constants.expoConfig?.revisionId,

  integrations: [
    new Sentry.ReactNativeTracing({
      tracingOrigins: ['localhost', 'broxiva.com', /^\//],
      routingInstrumentation: Sentry.routingInstrumentation,
    }),
  ],
});
```

---

## Release Tracking

### Backend Release Tracking

#### 1. CI/CD Integration

**GitHub Actions Example:**

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Get version
        id: version
        run: echo "version=$(node -p "require('./apps/api/package.json').version")" >> $GITHUB_OUTPUT

      - name: Create Sentry release
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: broxiva
          SENTRY_PROJECT: broxiva-backend-prod
        with:
          environment: production
          version: broxiva-backend@${{ steps.version.outputs.version }}

      - name: Deploy application
        run: |
          # Your deployment commands

      - name: Finalize Sentry release
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: broxiva
          SENTRY_PROJECT: broxiva-backend-prod
        with:
          environment: production
          version: broxiva-backend@${{ steps.version.outputs.version }}
          finalize: true
```

#### 2. Manual Release Creation

```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Login to Sentry
sentry-cli login

# Create release
sentry-cli releases new broxiva-backend@2.0.0

# Associate commits
sentry-cli releases set-commits broxiva-backend@2.0.0 --auto

# Deploy to environment
sentry-cli releases deploys broxiva-backend@2.0.0 new -e production

# Finalize release
sentry-cli releases finalize broxiva-backend@2.0.0
```

### Frontend Release Tracking

Release tracking is automatically handled by the Sentry Next.js plugin when source maps are uploaded.

**Build Script:**
```json
{
  "scripts": {
    "build": "next build",
    "deploy": "npm run build && npm run deploy:production"
  }
}
```

The `@sentry/nextjs` plugin automatically:
1. Creates a release
2. Uploads source maps
3. Associates commits
4. Finalizes the release

---

## Source Maps

### Frontend Source Maps

#### 1. Automatic Upload (Recommended)

Source maps are automatically uploaded during build when using `@sentry/nextjs`.

**Verify Upload:**
```bash
# Check if source maps were uploaded
ls .next/static/chunks/*.map

# Verify in Sentry
# Navigate to: Settings → Projects → broxiva-web-prod → Source Maps
```

#### 2. Manual Upload

If automatic upload fails:

```bash
# Upload source maps manually
sentry-cli sourcemaps upload \
  --org broxiva \
  --project broxiva-web-prod \
  --release broxiva-web@2.0.0 \
  .next/static/chunks
```

#### 3. Source Map Configuration

**next.config.js:**
```javascript
module.exports = {
  productionBrowserSourceMaps: true,  // Generate source maps

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.devtool = 'hidden-source-map';  // Hide source maps from browser
    }
    return config;
  },
};
```

### Backend Source Maps

Backend source maps are not typically required for Node.js applications, but can be useful for TypeScript projects.

**Enable if needed:**

```javascript
// tsconfig.json
{
  "compilerOptions": {
    "sourceMap": true
  }
}
```

**Upload source maps:**
```bash
sentry-cli sourcemaps upload \
  --org broxiva \
  --project broxiva-backend-prod \
  --release broxiva-backend@2.0.0 \
  dist
```

---

## Data Scrubbing

### Sensitive Data Protection

Configure data scrubbing rules in **Project Settings** → **Security & Privacy** → **Data Scrubbing**.

#### 1. Default Rules

Enable these built-in rules:
- ☑ Mask credit card numbers
- ☑ Mask social security numbers
- ☑ Mask IP addresses
- ☑ Prevent recording of passwords

#### 2. Custom Scrubbing Rules

**Add Custom Patterns:**

Navigate to **Additional Sensitive Fields**:

```
password
passwd
secret
api_key
apikey
token
auth
authorization
credit_card
cvv
ssn
ssno
routing_number
account_number
```

#### 3. PII Data Scrubbing

Enable **Data Scrubbing** → **Use default scrubbers** for:
- Email addresses
- IP addresses
- Credit card numbers
- Social security numbers
- Authentication credentials

#### 4. Code-Level Scrubbing

**Backend (`beforeSend` hook):**
```typescript
beforeSend(event, hint) {
  // Remove cookies
  if (event.request) {
    delete event.request.cookies;
  }

  // Sanitize headers
  if (event.request?.headers) {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    sensitiveHeaders.forEach(header => {
      if (event.request?.headers?.[header]) {
        event.request.headers[header] = '[REDACTED]';
      }
    });
  }

  // Sanitize query params
  if (event.request?.query_string) {
    const sensitiveParams = ['password', 'token', 'secret'];
    // Scrub logic
  }

  return event;
}
```

**Frontend (`beforeSend` hook):**
```typescript
beforeSend(event, hint) {
  // Don't send form data that might contain PII
  if (event.request?.data) {
    delete event.request.data;
  }

  // Scrub user input from error messages
  if (event.message) {
    event.message = event.message.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
  }

  return event;
}
```

---

## Team Access

### Team Structure

#### 1. Create Teams

Navigate to **Settings** → **Teams** → **Create Team**.

**Teams:**
- Platform Team
- Frontend Team
- Mobile Team
- Payments Team
- Infrastructure Team
- Security Team

#### 2. Assign Team Permissions

**Project Access Levels:**
- **Admin:** Full project configuration access
- **Member:** Can view and edit issues
- **Viewer:** Read-only access

**Team Project Assignments:**

| Project | Platform Team | Frontend Team | Mobile Team | Payments Team | Infra Team |
|---------|---------------|---------------|-------------|---------------|------------|
| Backend Prod | Admin | Viewer | Viewer | Member | Admin |
| Backend Staging | Admin | Viewer | Viewer | Member | Admin |
| Web Prod | Member | Admin | Viewer | Viewer | Member |
| Web Staging | Member | Admin | Viewer | Viewer | Member |
| Mobile Prod | Viewer | Member | Admin | Viewer | Member |
| Mobile Staging | Viewer | Member | Admin | Viewer | Member |

#### 3. Individual Access

**Add Team Members:**
1. Navigate to **Settings** → **Teams** → [Team Name] → **Members**
2. Click **Add Member**
3. Enter email address
4. Set role: Member, Admin, or Manager
5. Send invitation

#### 4. SSO Integration (Optional)

For enterprise plans with SSO:

1. Navigate to **Settings** → **Auth**
2. Configure SAML or OAuth provider
3. Map SSO roles to Sentry teams
4. Enable auto-provisioning

---

## Project Settings Reference

### General Settings

**Navigate to:** Project Settings → General

| Setting | Recommended Value | Notes |
|---------|------------------|-------|
| Name | `broxiva-[component]-[env]` | Consistent naming |
| Platform | Node.js / Next.js / React Native | Based on project |
| Default Environment | production / staging / development | Per project |
| Resolve in Next Release | Enabled | Auto-resolve fixed issues |
| Auto-Assign | Enabled | Use issue owners |
| Data Scrubbing | Enabled | PCI DSS requirement |
| Rate Limits | 100 events/minute | Prevent spam |

### Inbound Filters

**Navigate to:** Project Settings → Inbound Filters

Enable these filters:
- ☑ Filter out errors from localhost
- ☑ Filter out web crawlers
- ☑ Filter out errors from browser extensions
- ☑ Filter out legacy browsers (optional)

**Filter by Release:** Don't filter (allow all releases)

**Filter by Error Message:** Add patterns for known noise:
```
ResizeObserver loop limit exceeded
Non-Error promise rejection captured
Network request failed
Loading chunk [0-9]+ failed
```

### Issue Grouping

**Navigate to:** Project Settings → Issue Grouping

**Fingerprinting Rules:**
```yaml
# Group all database timeout errors together
- type: database
  pattern: ".*timeout.*"
  fingerprint: ["database", "timeout"]

# Group payment errors by status code
- type: payment
  pattern: ".*stripe.*"
  fingerprint: ["payment", "{{ transaction }}", "{{ tags.http_status }}"]
```

### Performance

**Navigate to:** Project Settings → Performance

| Setting | Production | Staging | Development |
|---------|-----------|---------|-------------|
| Traces Sample Rate | 10% | 50% | 100% |
| Profiles Sample Rate | 10% | 50% | 100% |
| Enable Automatic Instrumentation | Yes | Yes | Yes |
| Distributed Tracing | Enabled | Enabled | Enabled |

---

## Verification Checklist

### After Project Setup

- [ ] DSN configured in environment variables
- [ ] Sentry SDK initialized correctly
- [ ] Test error sent and received
- [ ] Source maps uploading (frontend only)
- [ ] Release tracking configured
- [ ] Data scrubbing rules active
- [ ] Team access configured
- [ ] Alert rules created
- [ ] Dashboard configured
- [ ] Integration with Slack/PagerDuty
- [ ] Documentation updated

### Test Each Project

```bash
# Backend test
curl -X POST https://api.broxiva.com/test/sentry-error

# Frontend test
# Open browser console and run:
throw new Error('Sentry test error');

# Verify in Sentry
# Check: Issues → Latest issue should appear within 1 minute
```

---

## Troubleshooting

### Common Issues

#### Issue: No events appearing in Sentry

**Solutions:**
1. Verify DSN is correct
2. Check network connectivity
3. Verify Sentry SDK is initialized
4. Check inbound filters aren't blocking events
5. Review `beforeSend` hook for accidental filtering

#### Issue: Source maps not working

**Solutions:**
1. Verify source maps are uploaded: Check Artifacts page
2. Verify release name matches exactly
3. Check file paths in source maps
4. Ensure source maps generated during build
5. Re-upload source maps manually

#### Issue: High event volume / quota exceeded

**Solutions:**
1. Increase sample rates temporarily
2. Add inbound filters for noise
3. Review and fix recurring errors
4. Implement rate limiting in application
5. Contact Sentry to increase quota

#### Issue: Sensitive data in errors

**Solutions:**
1. Review and update scrubbing rules
2. Add fields to sensitive data list
3. Implement additional `beforeSend` scrubbing
4. Delete affected events from Sentry
5. Rotate compromised credentials

---

## Additional Resources

- [Sentry Node.js Documentation](https://docs.sentry.io/platforms/node/)
- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry React Native Documentation](https://docs.sentry.io/platforms/react-native/)
- [Release Management](https://docs.sentry.io/product/releases/)
- [Source Maps Guide](https://docs.sentry.io/platforms/javascript/sourcemaps/)

---

**Last Updated:** 2024-12-04
**Document Owner:** DevOps Team
**Review Schedule:** Quarterly
