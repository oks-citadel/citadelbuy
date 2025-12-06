# Error Reporting Setup Guide

Complete setup guide for error boundaries and Sentry monitoring in CitadelBuy.

## Prerequisites

1. Sentry account (https://sentry.io)
2. Project created in Sentry for web and mobile apps
3. Sentry DSN and auth token

## Installation

### Web Application (Next.js)

The Sentry dependencies are already installed. If you need to add them:

```bash
cd apps/web
npm install @sentry/nextjs
# or
pnpm add @sentry/nextjs
```

### Mobile Application (React Native)

```bash
cd apps/mobile
npm install @sentry/react-native
# or
pnpm add @sentry/react-native

# For iOS
cd ios && pod install && cd ..
```

## Configuration

### Step 1: Get Sentry Credentials

1. Log in to Sentry (https://sentry.io)
2. Create or select your organization
3. Create two projects:
   - `citadelbuy-web` for web application
   - `citadelbuy-mobile` for mobile application
4. Get the DSN from Project Settings > Client Keys (DSN)
5. Generate an auth token from User Settings > Auth Tokens

### Step 2: Configure Environment Variables

#### Web (.env.local)

Create `apps/web/.env.local`:

```env
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-public-key@o123456.ingest.sentry.io/123456
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=citadelbuy-web
SENTRY_AUTH_TOKEN=your-sentry-auth-token
SENTRY_ENVIRONMENT=development
```

#### Mobile (.env)

Create `apps/mobile/.env`:

```env
# Sentry Configuration
EXPO_PUBLIC_SENTRY_DSN=https://your-public-key@o123456.ingest.sentry.io/789012
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=citadelbuy-mobile
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

### Step 3: Configure Sentry Properties (Optional)

#### Web

Create `apps/web/sentry.properties`:

```properties
defaults.url=https://sentry.io/
defaults.org=your-organization-slug
defaults.project=citadelbuy-web
auth.token=your-sentry-auth-token
```

#### Mobile

Create `apps/mobile/sentry.properties`:

```properties
defaults.url=https://sentry.io/
defaults.org=your-organization-slug
defaults.project=citadelbuy-mobile
auth.token=your-sentry-auth-token
```

**Important**: Add `sentry.properties` to `.gitignore`:

```
# .gitignore
sentry.properties
.env.local
.env
```

### Step 4: Initialize Error Reporting

#### Web

The error reporting is automatically initialized via Sentry config files. No additional setup needed.

#### Mobile

Initialize in your app entry point:

```typescript
// App.tsx or _layout.tsx
import { initializeErrorReporting } from './lib/error-reporting';

export default function App() {
  React.useEffect(() => {
    initializeErrorReporting();
  }, []);

  return (
    <ErrorBoundary componentName="App">
      <YourApp />
    </ErrorBoundary>
  );
}
```

## Verification

### Test Web Error Reporting

1. Start the development server:
   ```bash
   cd apps/web
   npm run dev
   ```

2. Create a test page (`pages/test-error.tsx`):
   ```tsx
   import { ErrorBoundary } from '@/components/error-boundary';
   import { errorReporting } from '@/lib/error-reporting';

   export default function TestError() {
     return (
       <ErrorBoundary componentName="TestError">
         <button onClick={() => {
           errorReporting.captureMessage('Test message', 'info');
           throw new Error('Test error from web app');
         }}>
           Throw Error
         </button>
       </ErrorBoundary>
     );
   }
   ```

3. Visit http://localhost:3000/test-error and click the button
4. Check Sentry dashboard for the error

### Test Mobile Error Reporting

1. Start the mobile app:
   ```bash
   cd apps/mobile
   npm start
   ```

2. Create a test screen:
   ```tsx
   import { Button } from 'react-native';
   import { ErrorBoundary } from '@/components/ErrorBoundary';
   import { errorReporting } from '@/lib/error-reporting';

   export default function TestScreen() {
     return (
       <ErrorBoundary componentName="TestScreen">
         <Button
           title="Throw Error"
           onPress={() => {
             errorReporting.captureMessage('Test message', 'info');
             throw new Error('Test error from mobile app');
           }}
         />
       </ErrorBoundary>
     );
   }
   ```

3. Press the button
4. Check Sentry dashboard for the error

## Features Configuration

### Performance Monitoring

Already enabled by default. Adjust sample rates in Sentry config files:

```typescript
// sentry.client.config.ts or error-reporting.ts
tracesSampleRate: 0.1, // 10% of transactions
```

### Session Replay (Web Only)

Already enabled for web. Adjust in `sentry.client.config.ts`:

```typescript
replaysSessionSampleRate: 0.1, // 10% of sessions
replaysOnErrorSampleRate: 1.0, // 100% of error sessions
```

### Source Maps

Source maps are automatically uploaded during production builds.

For manual upload:

```bash
# Web
cd apps/web
npx sentry-cli sourcemaps upload \
  --org=your-org \
  --project=citadelbuy-web \
  .next/static/chunks

# Mobile
cd apps/mobile
npx sentry-cli sourcemaps upload \
  --org=your-org \
  --project=citadelbuy-mobile \
  .expo/
```

## Production Deployment

### Environment Variables

Set these environment variables in your deployment platform:

#### Web (Vercel/Netlify)

```
NEXT_PUBLIC_SENTRY_DSN=https://...
SENTRY_ORG=your-org
SENTRY_PROJECT=citadelbuy-web
SENTRY_AUTH_TOKEN=your-token
SENTRY_ENVIRONMENT=production
```

#### Mobile (EAS Build)

Add to `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SENTRY_DSN": "https://...",
        "SENTRY_ORG": "your-org",
        "SENTRY_PROJECT": "citadelbuy-mobile",
        "SENTRY_AUTH_TOKEN": "your-token"
      }
    }
  }
}
```

### Build Configuration

#### Web

Update `next.config.js`:

```javascript
const { withSentryConfig } = require('@sentry/nextjs');

const moduleExports = {
  // Your Next.js config
};

const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
};

module.exports = withSentryConfig(moduleExports, sentryWebpackPluginOptions);
```

#### Mobile

Update `app.json`:

```json
{
  "expo": {
    "hooks": {
      "postPublish": [
        {
          "file": "sentry-expo/upload-sourcemaps",
          "config": {
            "organization": "your-org",
            "project": "citadelbuy-mobile",
            "authToken": "your-token"
          }
        }
      ]
    }
  }
}
```

## Monitoring Dashboard

### Setting Up Alerts

1. Go to Sentry > Alerts > Create Alert Rule
2. Choose alert type:
   - **Issues**: Alert on new errors
   - **Metric**: Alert on error volume
   - **Uptime**: Alert on availability

Example alert configurations:

#### High Error Rate Alert

```
Alert when:
  Error count > 100
  In 5 minutes
  Send to: Slack #alerts
```

#### New Critical Error Alert

```
Alert when:
  New issue with level: error or fatal
  First seen
  Send to: Email + PagerDuty
```

### Dashboard Widgets

Create a custom dashboard with:

1. **Error Rate**: Line chart of errors over time
2. **Top Errors**: Table of most frequent errors
3. **Affected Users**: Number of users experiencing errors
4. **Error Distribution**: By browser/device/OS
5. **Performance**: Average page load time

## Team Setup

### Adding Team Members

1. Go to Settings > Teams
2. Add team members with appropriate roles:
   - **Admin**: Full access
   - **Manager**: Manage issues and settings
   - **Member**: View and triage issues
   - **Billing**: Manage billing only

### Notification Preferences

Configure per team member:
1. Settings > Account > Notifications
2. Choose notification channels:
   - Email
   - Slack
   - PagerDuty
   - Discord
   - Microsoft Teams

## Integration with CI/CD

### GitHub Actions

Create `.github/workflows/sentry-release.yml`:

```yaml
name: Sentry Release

on:
  push:
    branches: [main, production]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Create Sentry release
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: your-org
          SENTRY_PROJECT: citadelbuy-web
        with:
          environment: production
          version: ${{ github.sha }}
```

### Azure Pipelines

See `azure-pipelines/sentry-release.yml` for complete configuration.

## Troubleshooting

### Issue: Errors not appearing in Sentry

**Solution**:
1. Verify DSN is correct: `console.log(process.env.NEXT_PUBLIC_SENTRY_DSN)`
2. Check network requests in browser DevTools for requests to sentry.io
3. Ensure error reporting is initialized: `errorReporting.isInitialized()`
4. Check Sentry quota limits

### Issue: Source maps not working

**Solution**:
1. Verify auth token has `project:releases` and `project:write` scopes
2. Check that source maps are uploaded: Sentry > Releases > [version] > Artifacts
3. Ensure release version matches between app and Sentry
4. For web, check Next.js build output for Sentry plugin logs

### Issue: Too many errors

**Solution**:
1. Add error filtering in `beforeSend` hook
2. Use `ignoreErrors` to filter common errors
3. Reduce `tracesSampleRate` for performance monitoring
4. Set up rate limits in Sentry project settings

### Issue: Performance impact

**Solution**:
1. Reduce sample rates:
   ```typescript
   tracesSampleRate: 0.1, // 10%
   replaysSessionSampleRate: 0.05, // 5%
   ```
2. Limit breadcrumbs:
   ```typescript
   maxBreadcrumbs: 50, // Default: 100
   ```
3. Disable session replay in development
4. Use lazy loading for Sentry SDK

## Best Practices

1. **Environment Separation**: Use different projects for dev/staging/production
2. **Release Tracking**: Create releases for every deployment
3. **Source Maps**: Always upload source maps for production
4. **Error Filtering**: Filter out expected errors (validation, auth)
5. **User Privacy**: Never log sensitive data (passwords, tokens)
6. **Alert Fatigue**: Set up smart alerts, not too noisy
7. **Team Training**: Ensure team knows how to use Sentry
8. **Regular Review**: Review errors weekly, fix high-impact issues
9. **Performance Budget**: Set performance budgets and monitor
10. **Documentation**: Keep error handling docs up to date

## Cost Optimization

Sentry pricing is based on events (errors + transactions). To optimize:

1. **Smart Sampling**:
   ```typescript
   tracesSampleRate: isDev ? 1.0 : 0.1,
   ```

2. **Error Filtering**:
   ```typescript
   beforeSend(event) {
     // Don't send validation errors
     if (event.tags?.errorType === 'validation') return null;
     return event;
   }
   ```

3. **Spike Protection**: Enable in Sentry > Settings > Spike Protection

4. **Quota Management**: Set quotas per project

5. **Archived Issues**: Auto-archive old issues

## Support Resources

- **Documentation**: `/docs/ERROR_BOUNDARIES_AND_MONITORING.md`
- **Quick Reference**: `/docs/ERROR_BOUNDARIES_QUICK_REFERENCE.md`
- **Sentry Docs**: https://docs.sentry.io
- **Sentry Discord**: https://discord.gg/sentry
- **Internal Support**: devops@citadelbuy.com

## Next Steps

1. Complete the setup steps above
2. Test error reporting in development
3. Deploy to staging with Sentry enabled
4. Set up alerts and notifications
5. Train team on error triage
6. Review errors daily, fix critical issues
7. Monitor error trends and performance
8. Optimize sampling and filtering
9. Regular maintenance and updates

## Checklist

- [ ] Sentry account created
- [ ] Projects created (web + mobile)
- [ ] Environment variables configured
- [ ] Error reporting tested in dev
- [ ] Error boundaries added to app
- [ ] User context tracking implemented
- [ ] API error tracking implemented
- [ ] Breadcrumbs added for key actions
- [ ] Alerts configured
- [ ] Team members added
- [ ] CI/CD integration complete
- [ ] Documentation reviewed
- [ ] Production deployment planned
- [ ] Monitoring dashboard created
- [ ] Team training completed
