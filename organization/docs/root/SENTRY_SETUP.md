# Sentry Setup Guide for CitadelBuy

This comprehensive guide will walk you through setting up Sentry error tracking and performance monitoring for the CitadelBuy e-commerce platform.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Creating a Sentry Account](#creating-a-sentry-account)
4. [Creating Sentry Projects](#creating-sentry-projects)
5. [Obtaining DSN Values](#obtaining-dsn-values)
6. [Configuring Environment Variables](#configuring-environment-variables)
7. [Setting Up Release Tracking](#setting-up-release-tracking)
8. [Configuring Source Maps Upload](#configuring-source-maps-upload)
9. [Setting Up Alerts and Notifications](#setting-up-alerts-and-notifications)
10. [Testing Your Setup](#testing-your-setup)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

## Overview

Sentry is an error tracking and performance monitoring platform that helps you:
- **Track errors** in real-time across backend and frontend
- **Monitor performance** with transaction tracing
- **Debug issues** with detailed stack traces and breadcrumbs
- **Replay sessions** to see what users experienced
- **Set up alerts** to notify your team of critical issues

CitadelBuy uses Sentry in two places:
- **Backend (NestJS API)**: Error tracking and API performance monitoring
- **Frontend (Next.js Web)**: Error tracking, performance monitoring, and session replay

## Prerequisites

Before you begin, ensure you have:
- Admin access to the CitadelBuy codebase
- Ability to set environment variables in your deployment environment
- Email address for creating a Sentry account
- Understanding of your deployment workflow (dev, staging, production)

## Creating a Sentry Account

### Step 1: Sign Up for Sentry

1. Go to [https://sentry.io/signup/](https://sentry.io/signup/)
2. Choose your sign-up method:
   - Sign up with email
   - Sign up with GitHub (recommended for easier integration)
   - Sign up with Google
   - Sign up with Azure DevOps

3. Complete the registration process

### Step 2: Create an Organization

1. After signing in, Sentry will prompt you to create an organization
2. Enter your organization details:
   - **Organization Name**: `CitadelBuy` (or your company name)
   - **Organization Slug**: `citadelbuy` (used in URLs and API calls)
3. Click "Create Organization"

### Pricing Considerations

Sentry offers several plans:
- **Developer (Free)**: 5,000 errors/month, 10,000 transactions/month - Good for small projects
- **Team**: 50,000 errors/month, 100,000 transactions/month - Good for growing projects
- **Business**: Custom limits - For production applications

For CitadelBuy, we recommend starting with the **Team** plan for production and using the free plan for development.

## Creating Sentry Projects

You need to create **separate projects** for backend and frontend, and separate projects for each environment.

### Recommended Project Structure

```
Organization: CitadelBuy
├── citadelbuy-backend-dev (Node.js)
├── citadelbuy-backend-staging (Node.js)
├── citadelbuy-backend-prod (Node.js)
├── citadelbuy-web-dev (Next.js)
├── citadelbuy-web-staging (Next.js)
└── citadelbuy-web-prod (Next.js)
```

### Creating the Backend Project

1. From your Sentry dashboard, click **"Create Project"**
2. Select platform: **Node.js**
3. Set alert frequency: **"Alert me on every new issue"** (recommended for production)
4. Enter project details:
   - **Project Name**: `citadelbuy-backend-prod` (or dev/staging)
   - **Team**: Select your team or create a new one
5. Click **"Create Project"**

### Creating the Frontend Project

1. Click **"Create Project"** again
2. Select platform: **Next.js**
3. Set alert frequency: **"Alert me on every new issue"**
4. Enter project details:
   - **Project Name**: `citadelbuy-web-prod` (or dev/staging)
   - **Team**: Select the same team
5. Click **"Create Project"**

### Environment-Specific Projects

Repeat the above steps for each environment:
- **Development**: For local development and testing
- **Staging**: For pre-production testing
- **Production**: For live production environment

**Why separate projects?**
- Isolate errors by environment
- Set different alert rules per environment
- Track deployments independently
- Manage quota usage more effectively

## Obtaining DSN Values

The DSN (Data Source Name) is a unique identifier that tells the Sentry SDK where to send events.

### Backend DSN

1. Navigate to **Settings** > **Projects**
2. Select your backend project (e.g., `citadelbuy-backend-prod`)
3. Go to **Settings** > **Client Keys (DSN)**
4. Copy the **DSN** value

Example DSN:
```
https://1a2b3c4d5e6f7g8h9i0j@o1234567.ingest.sentry.io/7654321
```

### Frontend DSN

1. Navigate to **Settings** > **Projects**
2. Select your frontend project (e.g., `citadelbuy-web-prod`)
3. Go to **Settings** > **Client Keys (DSN)**
4. Copy the **DSN** value

Example DSN:
```
https://9z8y7x6w5v4u3t2s1r0q@o1234567.ingest.sentry.io/7654322
```

### Security Note

- The DSN is **not a secret** for frontend projects (it's public)
- The DSN **is sensitive** for backend projects (treat as a secret)
- Never commit DSN values to version control
- Use environment variables or secrets management

## Configuring Environment Variables

### Backend Configuration (`apps/api/.env`)

Create or update your `.env` file:

```bash
# Sentry Configuration
SENTRY_DSN=https://YOUR_BACKEND_DSN_HERE
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_DEBUG=false
```

**Environment Variables Explained:**

- **`SENTRY_DSN`**: Your backend project's DSN from Sentry
- **`SENTRY_ENVIRONMENT`**: Environment name (development, staging, production)
- **`SENTRY_TRACES_SAMPLE_RATE`**: Percentage of transactions to track (0.1 = 10%)
- **`SENTRY_DEBUG`**: Enable verbose logging (only for development)

### Frontend Configuration (`apps/web/.env`)

Create or update your `.env.local` file:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_FRONTEND_DSN_HERE
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1.0
NEXT_PUBLIC_SENTRY_DEBUG=false
```

**Environment Variables Explained:**

- **`NEXT_PUBLIC_SENTRY_DSN`**: Your frontend project's DSN from Sentry
- **`NEXT_PUBLIC_SENTRY_ENVIRONMENT`**: Environment name
- **`NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`**: Transaction sampling (0.1 = 10%)
- **`NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE`**: Session replay sampling (0.1 = 10%)
- **`NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE`**: Error replay sampling (1.0 = 100%)
- **`NEXT_PUBLIC_SENTRY_DEBUG`**: Enable debug mode

### Sample Rate Recommendations

| Environment | Traces Sample Rate | Replay Session Rate | Replay Error Rate |
|-------------|-------------------|---------------------|-------------------|
| Development | 1.0 (100%)        | 1.0 (100%)          | 1.0 (100%)        |
| Staging     | 0.5 (50%)         | 0.5 (50%)           | 1.0 (100%)        |
| Production  | 0.1 (10%)         | 0.1 (10%)           | 1.0 (100%)        |

Lower sample rates in production help manage your Sentry quota and costs.

## Setting Up Release Tracking

Release tracking helps you:
- Identify which version introduced a bug
- Track error frequency across releases
- Set up deploy notifications
- Enable source map association

### Getting an Auth Token

1. Go to **Settings** > **Account** > **API** > **Auth Tokens**
2. Click **"Create New Token"**
3. Configure the token:
   - **Name**: `CitadelBuy CI/CD`
   - **Scopes**: Select:
     - `project:read`
     - `project:write`
     - `project:releases`
     - `org:read`
4. Click **"Create Token"**
5. **Copy the token immediately** (you won't see it again)

### Storing the Auth Token

**CRITICAL**: The auth token is a secret. Store it securely:

#### For GitHub Actions:
1. Go to your repository **Settings** > **Secrets and variables** > **Actions**
2. Click **"New repository secret"**
3. Add:
   - Name: `SENTRY_AUTH_TOKEN`
   - Value: Your auth token

#### For Azure DevOps:
1. Go to **Pipelines** > **Library**
2. Create a new variable group: `Sentry`
3. Add variable:
   - Name: `SENTRY_AUTH_TOKEN`
   - Value: Your auth token
   - Mark as secret

#### For Local Development:
Add to `.env.local` (NEVER commit this file):
```bash
SENTRY_AUTH_TOKEN=your_auth_token_here
```

### Configuring Release Information

#### Backend Release Format
```
citadelbuy-backend@<version>
```
Example: `citadelbuy-backend@1.2.3`

#### Frontend Release Format
```
citadelbuy-web@<version>
```
Example: `citadelbuy-web@1.2.3`

The release is automatically set in the code from `package.json` version or git commit SHA.

## Configuring Source Maps Upload

Source maps help Sentry display readable stack traces instead of minified code.

### Backend Source Maps (Not typically needed for Node.js)

Backend Node.js code usually doesn't need source maps unless using TypeScript with heavy transformations.

### Frontend Source Maps (Critical for Next.js)

#### Step 1: Create Sentry Configuration File

Create `sentry.properties` in the root of `apps/web/`:

```properties
# Sentry Configuration File
defaults.url=https://sentry.io/
defaults.org=your-organization-slug
defaults.project=citadelbuy-web-prod

# Auth token (will be overridden by environment variable)
auth.token=${SENTRY_AUTH_TOKEN}
```

**Replace** `your-organization-slug` with your actual organization slug from Sentry.

#### Step 2: Install Sentry Webpack Plugin

The Sentry Next.js SDK should already include the necessary plugins. Verify in `apps/web/package.json`:

```json
{
  "dependencies": {
    "@sentry/nextjs": "^10.x.x"
  }
}
```

If not installed:
```bash
cd apps/web
npm install --save @sentry/nextjs
# or
pnpm add @sentry/nextjs
```

#### Step 3: Configure Next.js for Source Maps

Update `apps/web/next.config.js`:

```javascript
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // ... your existing config

  // Enable source maps in production builds
  productionBrowserSourceMaps: true,
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Suppresses source map uploading logs during build
  silent: true,

  // Upload source maps during production builds only
  dryRun: process.env.NODE_ENV !== 'production',

  // Organization and project from sentry.properties
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token from environment variable
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Additional configuration
  hideSourceMaps: true, // Hides source maps from public
  widenClientFileUpload: true, // Upload wider range of source maps
  disableLogger: true, // Disables Sentry logger statements
};

// Wrap config with Sentry
module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
```

#### Step 4: Configure Build Environment Variables

Add to your CI/CD build environment:

```bash
# Sentry Organization Slug
SENTRY_ORG=citadelbuy

# Sentry Project Slug
SENTRY_PROJECT=citadelbuy-web-prod

# Sentry Auth Token (from secrets)
SENTRY_AUTH_TOKEN=<your-auth-token>

# Enable source map upload
SENTRY_UPLOAD_SOURCE_MAPS=true
```

### Verifying Source Map Upload

After building:
1. Check build logs for: `[Sentry] Source maps uploaded successfully`
2. In Sentry dashboard:
   - Go to **Settings** > **Projects** > Your project
   - Navigate to **Source Maps** under **Processing**
   - Verify your release has source maps uploaded

## Setting Up Alerts and Notifications

### Creating Alert Rules

1. Navigate to **Alerts** in Sentry dashboard
2. Click **"Create Alert"**
3. Choose alert type:

#### Critical Error Alert (Recommended)

**Name**: `Critical Backend Errors`

**Conditions**:
- When an event is first seen
- AND event level is equal to `error` or `fatal`
- AND environment equals `production`

**Actions**:
- Send notification to: `#engineering-alerts` (Slack)
- Send email to: `engineering@citadelbuy.com`

#### High Frequency Alert

**Name**: `High Error Rate`

**Conditions**:
- When the count of events is `greater than 100`
- In `1 hour`
- For `production` environment

**Actions**:
- Send notification to: `#engineering-alerts` (Slack)
- Create PagerDuty incident

#### Performance Degradation Alert

**Name**: `Slow API Responses`

**Conditions**:
- When percentile of transaction duration is `greater than 3000ms` (3 seconds)
- For `95th percentile`
- In `10 minutes`
- For environment `production`

**Actions**:
- Send notification to: `#performance-alerts` (Slack)

### Setting Up Integrations

#### Slack Integration

1. Go to **Settings** > **Integrations**
2. Find and click **Slack**
3. Click **"Add to Slack"**
4. Authorize Sentry to access your Slack workspace
5. Choose the default channel for notifications (e.g., `#engineering-alerts`)
6. Configure per-project notification settings

#### PagerDuty Integration

1. Go to **Settings** > **Integrations**
2. Find and click **PagerDuty**
3. Enter your PagerDuty API key
4. Map Sentry projects to PagerDuty services
5. Configure escalation policies

#### Email Notifications

1. Go to **Settings** > **Account** > **Notifications**
2. Configure your notification preferences:
   - **Workflow**: Get notified about issue state changes
   - **Deploy**: Get notified about new releases
   - **Alerts**: Get notified when alert rules trigger
3. Set frequency: `Immediately` for production

### Notification Best Practices

- **Don't over-alert**: Too many notifications lead to alert fatigue
- **Use severity levels**: Critical errors to PagerDuty, warnings to Slack
- **Set quiet hours**: Reduce non-critical alerts during off-hours
- **Route strategically**: Different channels for different teams
- **Review regularly**: Tune alert rules based on false positive rates

## Testing Your Setup

### Testing Backend Error Tracking

Create a test endpoint in your backend:

```typescript
// apps/api/src/modules/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import * as Sentry from '@sentry/node';

@Controller('health')
export class HealthController {
  @Get('test-sentry')
  testSentry() {
    try {
      throw new Error('Test error from CitadelBuy backend');
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  }
}
```

Test it:
```bash
curl http://localhost:4000/api/health/test-sentry
```

Check Sentry dashboard to see the error appear.

### Testing Frontend Error Tracking

Create a test button in your frontend:

```typescript
// apps/web/src/app/test-sentry/page.tsx
'use client';

import * as Sentry from '@sentry/nextjs';

export default function TestSentryPage() {
  const throwError = () => {
    try {
      throw new Error('Test error from CitadelBuy frontend');
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  };

  return (
    <div className="p-8">
      <h1>Sentry Test Page</h1>
      <button
        onClick={throwError}
        className="px-4 py-2 bg-red-600 text-white rounded"
      >
        Throw Test Error
      </button>
    </div>
  );
}
```

Visit `http://localhost:3000/test-sentry` and click the button.

Check Sentry dashboard to see the error with full context.

### Testing Performance Monitoring

Performance data is automatically collected. To verify:

1. Navigate through your application
2. Wait 5-10 minutes for data to propagate
3. In Sentry dashboard:
   - Click **Performance**
   - You should see transaction data
   - Click on a transaction to see detailed trace

### Testing Session Replay

1. Navigate through your application in the browser
2. Trigger an error
3. In Sentry:
   - Go to the error issue
   - Look for **"Replay"** tab
   - Click to watch the session replay

## Best Practices

### Error Tracking

1. **Don't report everything**
   - Filter out 400-level HTTP errors (client errors)
   - Ignore expected errors like validation failures
   - Focus on 500-level errors (server errors)

2. **Add context to errors**
   ```typescript
   Sentry.setContext('order', {
     orderId: order.id,
     total: order.total,
     status: order.status,
   });
   ```

3. **Set user information**
   ```typescript
   Sentry.setUser({
     id: user.id,
     email: user.email,
     username: user.username,
   });
   ```

4. **Use breadcrumbs**
   ```typescript
   Sentry.addBreadcrumb({
     category: 'payment',
     message: 'Payment processing started',
     level: 'info',
   });
   ```

### Performance Monitoring

1. **Use appropriate sample rates**
   - Production: 10-20% (to manage quota)
   - Development: 100% (for full visibility)

2. **Create custom transactions**
   ```typescript
   const transaction = Sentry.startTransaction({
     op: 'checkout',
     name: 'Process Checkout',
   });

   // ... your code

   transaction.finish();
   ```

3. **Add spans for detail**
   ```typescript
   const span = transaction.startChild({
     op: 'payment',
     description: 'Process Stripe payment',
   });

   // ... payment processing

   span.finish();
   ```

### Security & Privacy

1. **Sanitize sensitive data**
   - Already configured in `sentry.service.ts` and config files
   - Review `beforeSend` hooks to ensure no sensitive data

2. **Don't log passwords or tokens**
   ```typescript
   // BAD
   Sentry.captureMessage(`User login failed: ${password}`);

   // GOOD
   Sentry.captureMessage('User login failed', {
     extra: { username, attempt: attemptNumber },
   });
   ```

3. **Use IP anonymization** (if required by GDPR)
   - Configure in Sentry project settings
   - Settings > Data Privacy > IP Addresses

### Release Management

1. **Always set releases in production**
2. **Use semantic versioning**: `MAJOR.MINOR.PATCH`
3. **Tag releases in Git**:
   ```bash
   git tag -a v1.2.3 -m "Release 1.2.3"
   git push origin v1.2.3
   ```
4. **Create release in Sentry during deployment**

## Troubleshooting

### Issue: Events not appearing in Sentry

**Check:**
1. DSN is correctly set in environment variables
2. Application is actually running the code that generates events
3. Network connectivity to `sentry.io`
4. Check browser console for Sentry errors
5. Enable debug mode: `SENTRY_DEBUG=true`

**Solution:**
```bash
# Backend
curl http://localhost:4000/api/health/test-sentry

# Check logs for Sentry initialization
# Should see: "Sentry initialized successfully"
```

### Issue: Source maps not uploading

**Check:**
1. `SENTRY_AUTH_TOKEN` is set in build environment
2. `SENTRY_ORG` and `SENTRY_PROJECT` match your Sentry setup
3. Build logs for upload errors
4. Token has correct permissions: `project:releases`, `project:write`

**Solution:**
```bash
# Manual upload for testing
npx @sentry/cli releases files <release-name> upload-sourcemaps ./dist
```

### Issue: Too many events, hitting quota

**Check:**
1. Sample rates are appropriate for your environment
2. No infinite error loops
3. Filters are working correctly

**Solution:**
```javascript
// Reduce sample rate
SENTRY_TRACES_SAMPLE_RATE=0.05  // 5% instead of 10%

// Add more aggressive filtering
ignoreErrors: [
  'Non-Error promise rejection',
  'ChunkLoadError',
  // Add more patterns
],
```

### Issue: Sensitive data in error reports

**Check:**
1. `beforeSend` hooks are properly configured
2. Headers and cookies are being sanitized
3. User input is not being logged

**Solution:**
Review and update the `beforeSend` function in:
- `apps/api/src/common/monitoring/sentry.service.ts`
- `apps/web/sentry.client.config.ts`
- `apps/web/sentry.server.config.ts`

### Issue: Performance data not showing

**Check:**
1. `SENTRY_TRACES_SAMPLE_RATE` > 0
2. Performance monitoring is enabled in Sentry project settings
3. Transactions are being created correctly

**Solution:**
```typescript
// Verify transaction creation
const transaction = Sentry.startTransaction({
  op: 'test',
  name: 'Test Transaction',
});

setTimeout(() => {
  transaction.finish();
}, 1000);
```

## Additional Resources

- **Sentry Documentation**: https://docs.sentry.io/
- **Next.js Integration**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Node.js Integration**: https://docs.sentry.io/platforms/node/
- **Best Practices**: https://docs.sentry.io/product/best-practices/
- **Performance Monitoring**: https://docs.sentry.io/product/performance/
- **Session Replay**: https://docs.sentry.io/product/session-replay/

## Support

If you encounter issues:
1. Check this documentation
2. Review Sentry's official documentation
3. Check the CitadelBuy internal wiki
4. Contact the DevOps team: devops@citadelbuy.com
5. Open a support ticket with Sentry (if on paid plan)

---

**Last Updated**: 2024-12-04
**Maintained By**: CitadelBuy DevOps Team
**Version**: 1.0.0
