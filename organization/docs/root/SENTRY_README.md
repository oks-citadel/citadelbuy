# Sentry Integration Overview

## What is Sentry?

Sentry is an error tracking and performance monitoring platform that helps Broxiva maintain high application quality and quickly respond to issues.

## What's Included

This repository includes comprehensive Sentry integration with:

### 1. Backend Integration (NestJS API)

**Location**: `apps/api/src/common/monitoring/`

**Features**:
- Automatic error capture and reporting
- Performance monitoring with transaction tracing
- Request breadcrumbs for debugging
- Sensitive data sanitization
- User context tracking
- Custom exception filter

**Files**:
- `sentry.module.ts` - Sentry module configuration
- `sentry.service.ts` - Sentry service implementation
- `sentry-exception.filter.ts` - Global exception filter

### 2. Frontend Integration (Next.js Web)

**Location**: `apps/web/sentry.*.config.ts`

**Features**:
- Client-side error tracking
- Server-side error tracking
- Edge runtime error tracking
- Session replay for debugging
- Performance monitoring
- React error boundaries
- Automatic source map upload

**Files**:
- `sentry.client.config.ts` - Browser-side configuration
- `sentry.server.config.ts` - Server-side configuration
- `sentry.edge.config.ts` - Edge runtime configuration
- `src/components/error-boundary.tsx` - React error boundary

### 3. Configuration Files

**Sentry Properties**:
- `apps/api/sentry.properties.example` - Backend Sentry CLI config
- `apps/web/sentry.properties.example` - Frontend Sentry CLI config

**Environment Variables**:
- `apps/api/.env.example` - Backend environment template
- `apps/web/.env.example` - Frontend environment template
- `.env.example` - Root environment template

### 4. CI/CD Integration

**Workflows**:
- `.github/workflows/sentry-release.yml` - Automated release creation and source map upload

**Scripts**:
- `scripts/create-sentry-release.sh` - Manual release creation script

### 5. Documentation

- `docs/SENTRY_SETUP.md` - Comprehensive setup guide (100+ pages)
- `docs/SENTRY_ENV_VARS.md` - Environment variables reference
- `docs/SENTRY_README.md` - This file

## Quick Start

### 1. Create Sentry Account

1. Go to [https://sentry.io/signup/](https://sentry.io/signup/)
2. Create an organization: `broxiva`
3. Create projects for each environment

### 2. Get DSN Values

1. Navigate to each project in Sentry
2. Go to **Settings** > **Client Keys (DSN)**
3. Copy the DSN value

### 3. Configure Environment Variables

**Backend** (`apps/api/.env`):
```bash
SENTRY_DSN=https://YOUR_BACKEND_DSN
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=1.0
```

**Frontend** (`apps/web/.env.local`):
```bash
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_FRONTEND_DSN
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=1.0
```

### 4. Test Integration

**Backend Test**:
```bash
cd apps/api
npm run dev

# Test endpoint
curl http://localhost:4000/api/health/test-sentry
```

**Frontend Test**:
```bash
cd apps/web
npm run dev

# Visit http://localhost:3000/test-sentry
```

### 5. View Errors in Sentry

1. Go to your Sentry dashboard
2. Navigate to the respective project
3. View captured errors in real-time

## Features by Environment

### Development

- **Sampling**: 100% of all transactions
- **Debug Mode**: Enabled for troubleshooting
- **Source Maps**: Not required (code not minified)
- **Alerts**: Disabled or minimal

### Staging

- **Sampling**: 50% of transactions
- **Debug Mode**: Disabled
- **Source Maps**: Enabled for production-like debugging
- **Alerts**: Configured for major errors

### Production

- **Sampling**: 10% of transactions (to manage quota)
- **Debug Mode**: Disabled
- **Source Maps**: Always enabled and uploaded
- **Alerts**: Full alert suite with PagerDuty integration

## Architecture

```
Broxiva Application
├── Backend (NestJS)
│   ├── Sentry Module (Global)
│   ├── Sentry Service
│   ├── Exception Filter
│   └── Automatic Error Reporting
│
├── Frontend (Next.js)
│   ├── Client Config
│   ├── Server Config
│   ├── Edge Config
│   ├── Error Boundary
│   └── Session Replay
│
└── CI/CD Pipeline
    ├── Build & Test
    ├── Create Sentry Release
    ├── Upload Source Maps
    └── Deploy with Release Tracking
```

## Key Concepts

### 1. Release Tracking

Releases help you identify which version introduced a bug.

**Format**:
- Backend: `broxiva-backend@<version>`
- Frontend: `broxiva-web@<version>`

**Example**: `broxiva-web@1.2.3`

### 2. Source Maps

Source maps translate minified production code back to readable source code in error stack traces.

**How it works**:
1. Build process generates source maps
2. CI/CD uploads source maps to Sentry
3. Sentry uses source maps to display readable stack traces
4. Source maps are hidden from public access

### 3. Sampling

Sampling controls what percentage of events are sent to Sentry.

**Benefits**:
- Manage Sentry quota usage
- Reduce costs in high-traffic applications
- Still get representative error data

**Recommendation**: 10% in production, 100% in development

### 4. Error Boundaries

Error boundaries catch React component errors and report them to Sentry.

**Usage**:
```tsx
import { ErrorBoundary } from '@/components/error-boundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### 5. Session Replay

Session replay records user sessions so you can see exactly what happened before an error.

**Features**:
- Video-like playback
- Network requests
- Console logs
- User interactions
- DOM mutations

**Privacy**: All text is masked by default

## Best Practices

### 1. Use Separate Projects per Environment

**Don't**: Use one project for dev, staging, and production

**Do**: Create separate projects:
- `broxiva-backend-prod`
- `broxiva-backend-staging`
- `broxiva-backend-dev`

**Why**: Better organization, different alert rules, quota management

### 2. Always Upload Source Maps in Production

Source maps are critical for debugging production errors.

**Verify**:
```bash
# Check if source maps are uploaded
sentry-cli releases files <release-name> list
```

### 3. Set Appropriate Sample Rates

**Development**: 100% - See everything

**Staging**: 50% - Good balance

**Production**: 10% - Manage quota and costs

### 4. Add Context to Errors

```typescript
// Bad
throw new Error('Payment failed');

// Good
Sentry.setContext('payment', {
  amount: 99.99,
  currency: 'USD',
  provider: 'stripe',
  orderId: '123',
});
throw new Error('Payment failed');
```

### 5. Filter Sensitive Data

Already configured in the codebase:
- Cookies are removed
- Auth headers are redacted
- Password fields are masked

Review and enhance in:
- `apps/api/src/common/monitoring/sentry.service.ts`
- `apps/web/sentry.server.config.ts`

### 6. Set User Context

```typescript
// Backend
this.sentryService.setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});

// Frontend
import * as Sentry from '@sentry/nextjs';

Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});
```

### 7. Use Breadcrumbs

Breadcrumbs show the events leading up to an error.

```typescript
Sentry.addBreadcrumb({
  category: 'checkout',
  message: 'User started checkout process',
  level: 'info',
  data: {
    cartTotal: 299.99,
    itemCount: 3,
  },
});
```

## Monitoring Checklist

### Daily

- [ ] Check for new critical errors
- [ ] Review error trends
- [ ] Verify alert system is working

### Weekly

- [ ] Review top errors
- [ ] Analyze performance trends
- [ ] Check quota usage
- [ ] Update alert thresholds if needed

### Monthly

- [ ] Review and update ignored errors list
- [ ] Audit data sanitization rules
- [ ] Review sampling rates
- [ ] Optimize quota usage

### Per Release

- [ ] Verify release was created in Sentry
- [ ] Confirm source maps were uploaded
- [ ] Check for new errors in release
- [ ] Monitor error rate changes

## Support

### Documentation

- **Setup Guide**: `docs/SENTRY_SETUP.md` - Complete setup instructions
- **Environment Variables**: `docs/SENTRY_ENV_VARS.md` - All env var reference
- **Sentry Docs**: https://docs.sentry.io/

### Troubleshooting

Common issues and solutions are documented in:
- `docs/SENTRY_SETUP.md` - Troubleshooting section
- `docs/SENTRY_ENV_VARS.md` - Configuration issues

### Getting Help

1. Check the documentation above
2. Review Sentry's official documentation
3. Check the Broxiva internal wiki
4. Contact the DevOps team: devops@broxiva.com
5. Open a support ticket with Sentry (paid plans)

## Additional Resources

- **Sentry Official Docs**: https://docs.sentry.io/
- **Next.js Integration**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Node.js Integration**: https://docs.sentry.io/platforms/node/
- **Best Practices**: https://docs.sentry.io/product/best-practices/
- **Performance Monitoring**: https://docs.sentry.io/product/performance/
- **Session Replay**: https://docs.sentry.io/product/session-replay/

## License

This Sentry integration is part of the Broxiva platform.

---

**Last Updated**: 2024-12-04
**Version**: 1.0.0
**Maintained By**: Broxiva DevOps Team
