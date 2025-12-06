# Sentry Environment Variables Reference

This document provides a comprehensive reference for all Sentry-related environment variables used in CitadelBuy.

## Table of Contents

1. [Backend API Variables](#backend-api-variables)
2. [Frontend Web Variables](#frontend-web-variables)
3. [CI/CD Variables](#cicd-variables)
4. [Environment-Specific Configurations](#environment-specific-configurations)
5. [Quick Setup Checklist](#quick-setup-checklist)

---

## Backend API Variables

These variables should be set in `apps/api/.env`:

### Required Variables

| Variable | Description | Example | Where to Get |
|----------|-------------|---------|--------------|
| `SENTRY_DSN` | Data Source Name for Sentry | `https://abc123@o123.ingest.sentry.io/456` | Sentry Project Settings > Client Keys (DSN) |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `SENTRY_ENVIRONMENT` | Environment name for filtering | `development` | `production`, `staging`, `development` |
| `SENTRY_RELEASE` | Release version | Auto-generated | `citadelbuy-backend@1.2.3` |
| `SENTRY_TRACES_SAMPLE_RATE` | Performance monitoring sample rate (0.0-1.0) | `1.0` (dev), `0.1` (prod) | `0.1` for 10% |
| `SENTRY_DEBUG` | Enable verbose logging | `false` | `true`, `false` |

### Example Backend `.env`

```bash
# Development
SENTRY_DSN=https://1a2b3c4d5e6f7g8h9i0j@o1234567.ingest.sentry.io/7654321
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=1.0
SENTRY_DEBUG=false

# Production
SENTRY_DSN=https://9z8y7x6w5v4u3t2s1r0q@o1234567.ingest.sentry.io/7654322
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_DEBUG=false
```

---

## Frontend Web Variables

These variables should be set in `apps/web/.env.local`:

### Required Variables

| Variable | Description | Example | Where to Get |
|----------|-------------|---------|--------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Public DSN for frontend errors | `https://xyz789@o123.ingest.sentry.io/789` | Sentry Project Settings > Client Keys (DSN) |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Environment name | `development` | `production`, `staging` |
| `NEXT_PUBLIC_SENTRY_RELEASE` | Release version | Auto-generated | `citadelbuy-web@1.2.3` |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | Performance sample rate | `1.0` (dev), `0.1` (prod) | `0.1` |
| `NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE` | Session replay sampling | `0.1` | `0.1` for 10% |
| `NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` | Error replay sampling | `1.0` | `1.0` for 100% |
| `NEXT_PUBLIC_SENTRY_DEBUG` | Enable debug logging | `false` | `true`, `false` |

### Build-Time Variables (CI/CD Only)

These are used during build to upload source maps:

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `SENTRY_AUTH_TOKEN` | Authentication token | Yes | `sntrys_abc123...` |
| `SENTRY_ORG` | Organization slug | Yes | `citadelbuy` |
| `SENTRY_PROJECT` | Project slug | Yes | `citadelbuy-web-prod` |

### Example Frontend `.env.local`

```bash
# Development
NEXT_PUBLIC_SENTRY_DSN=https://abc123def456@o1234567.ingest.sentry.io/7654323
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=1.0
NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=1.0
NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1.0
NEXT_PUBLIC_SENTRY_DEBUG=false

# Production
NEXT_PUBLIC_SENTRY_DSN=https://xyz789abc456@o1234567.ingest.sentry.io/7654324
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1.0
NEXT_PUBLIC_SENTRY_DEBUG=false
```

---

## CI/CD Variables

These should be set in your CI/CD secrets (GitHub Actions, Azure DevOps, etc.):

### GitHub Actions Secrets

Navigate to: **Repository Settings** > **Secrets and variables** > **Actions**

| Secret Name | Description | Required For | Where to Get |
|-------------|-------------|--------------|--------------|
| `SENTRY_AUTH_TOKEN` | API token for Sentry | Source map upload, release creation | Sentry Settings > Account > API > Auth Tokens |
| `NEXT_PUBLIC_SENTRY_DSN` | Frontend DSN | Build-time environment injection | Sentry Project Settings |

### GitHub Actions Variables

Navigate to: **Repository Settings** > **Secrets and variables** > **Actions** > **Variables**

| Variable Name | Description | Example |
|---------------|-------------|---------|
| `SENTRY_ORG` | Organization slug | `citadelbuy` |
| `SENTRY_PROJECT_BACKEND_PROD` | Backend production project | `citadelbuy-backend-prod` |
| `SENTRY_PROJECT_FRONTEND_PROD` | Frontend production project | `citadelbuy-web-prod` |

### Azure DevOps Variables

Create a variable group named `Sentry` with these variables:

| Variable Name | Description | Type | Where to Get |
|---------------|-------------|------|--------------|
| `SENTRY_AUTH_TOKEN` | API authentication token | Secret | Sentry Settings > Account > API |
| `SENTRY_ORG` | Organization slug | Variable | Sentry Settings |
| `SENTRY_DSN_BACKEND` | Backend DSN | Secret | Sentry Backend Project |
| `SENTRY_DSN_FRONTEND` | Frontend DSN | Variable (public) | Sentry Frontend Project |

---

## Environment-Specific Configurations

### Development Environment

**Purpose**: Local development and testing

**Configuration**:
```bash
# Backend
SENTRY_DSN=https://DEV_KEY@o123.ingest.sentry.io/DEV_PROJECT_ID
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=1.0  # 100% - capture all transactions
SENTRY_DEBUG=true  # Enable verbose logging

# Frontend
NEXT_PUBLIC_SENTRY_DSN=https://DEV_KEY@o123.ingest.sentry.io/DEV_PROJECT_ID
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=1.0
NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=1.0
NEXT_PUBLIC_SENTRY_DEBUG=true
```

**Recommendations**:
- Use separate Sentry projects for dev
- Enable 100% sampling for full visibility
- Enable debug mode for troubleshooting
- Source maps not required (not minified)

### Staging Environment

**Purpose**: Pre-production testing and QA

**Configuration**:
```bash
# Backend
SENTRY_DSN=https://STAGING_KEY@o123.ingest.sentry.io/STAGING_PROJECT_ID
SENTRY_ENVIRONMENT=staging
SENTRY_TRACES_SAMPLE_RATE=0.5  # 50% - balance visibility and quota
SENTRY_DEBUG=false

# Frontend
NEXT_PUBLIC_SENTRY_DSN=https://STAGING_KEY@o123.ingest.sentry.io/STAGING_PROJECT_ID
NEXT_PUBLIC_SENTRY_ENVIRONMENT=staging
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.5
NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.5
NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1.0
NEXT_PUBLIC_SENTRY_DEBUG=false
```

**Recommendations**:
- Use separate Sentry projects for staging
- 50% sampling rate for testing
- Upload source maps for production-like debugging
- Set up staging-specific alerts

### Production Environment

**Purpose**: Live production application

**Configuration**:
```bash
# Backend
SENTRY_DSN=https://PROD_KEY@o123.ingest.sentry.io/PROD_PROJECT_ID
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% - manage quota and costs
SENTRY_DEBUG=false

# Frontend
NEXT_PUBLIC_SENTRY_DSN=https://PROD_KEY@o123.ingest.sentry.io/PROD_PROJECT_ID
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1.0
NEXT_PUBLIC_SENTRY_DEBUG=false
```

**Recommendations**:
- Use dedicated production projects
- Lower sampling rates (10%) to manage quota
- **Always** upload source maps
- Set up critical error alerts
- Configure PagerDuty integration
- Enable IP anonymization if required by GDPR

---

## Quick Setup Checklist

### Initial Setup

- [ ] Create Sentry account at https://sentry.io
- [ ] Create organization: `citadelbuy`
- [ ] Create 6 projects (3 environments × 2 apps):
  - [ ] `citadelbuy-backend-dev`
  - [ ] `citadelbuy-backend-staging`
  - [ ] `citadelbuy-backend-prod`
  - [ ] `citadelbuy-web-dev`
  - [ ] `citadelbuy-web-staging`
  - [ ] `citadelbuy-web-prod`

### Get DSN Values

- [ ] Backend Dev DSN
- [ ] Backend Staging DSN
- [ ] Backend Production DSN
- [ ] Frontend Dev DSN
- [ ] Frontend Staging DSN
- [ ] Frontend Production DSN

### Create Auth Token

- [ ] Go to Sentry Settings > Account > API > Auth Tokens
- [ ] Create token with scopes:
  - [ ] `project:read`
  - [ ] `project:write`
  - [ ] `project:releases`
  - [ ] `org:read`
- [ ] Save token securely

### Configure Development Environment

- [ ] Create `apps/api/.env` with backend DSN
- [ ] Create `apps/web/.env.local` with frontend DSN
- [ ] Test backend error tracking
- [ ] Test frontend error tracking

### Configure CI/CD

- [ ] Add `SENTRY_AUTH_TOKEN` to CI/CD secrets
- [ ] Add `SENTRY_ORG` to CI/CD variables
- [ ] Add project slugs to CI/CD variables
- [ ] Test release creation workflow

### Configure Staging

- [ ] Set staging DSNs in deployment config
- [ ] Deploy to staging
- [ ] Verify errors appear in Sentry
- [ ] Test source maps

### Configure Production

- [ ] Set production DSNs in deployment config
- [ ] Deploy to production
- [ ] Verify errors appear in Sentry
- [ ] Verify source maps are uploaded
- [ ] Set up critical alerts
- [ ] Configure Slack/PagerDuty notifications

---

## Troubleshooting

### Issue: "SENTRY_DSN is not configured"

**Solution**: Ensure the DSN is set in your environment variables and the application is reading it correctly.

```bash
# Check if variable is set
echo $SENTRY_DSN

# Backend: Check .env file
cat apps/api/.env | grep SENTRY_DSN

# Frontend: Check .env.local file
cat apps/web/.env.local | grep SENTRY_DSN
```

### Issue: "Source maps not uploading"

**Solution**: Verify auth token and project configuration.

```bash
# Check if auth token is set
echo $SENTRY_AUTH_TOKEN

# Test auth token
sentry-cli info

# Manually upload source maps
cd apps/web
sentry-cli releases files <release-name> upload-sourcemaps ./.next/static
```

### Issue: "Too many events, hitting quota"

**Solution**: Reduce sample rates.

```bash
# Lower production sample rates
SENTRY_TRACES_SAMPLE_RATE=0.05  # 5% instead of 10%
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.05
NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.05
```

---

## Additional Resources

- **Sentry Documentation**: https://docs.sentry.io/
- **Environment Variables**: https://docs.sentry.io/platforms/node/configuration/options/
- **Source Maps**: https://docs.sentry.io/platforms/javascript/sourcemaps/
- **Releases**: https://docs.sentry.io/product/releases/

---

**Last Updated**: 2024-12-04
**Maintained By**: CitadelBuy DevOps Team
