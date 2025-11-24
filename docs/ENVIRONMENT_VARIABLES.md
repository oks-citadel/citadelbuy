# Environment Variables Documentation

**Project:** CitadelBuy E-Commerce Platform
**Last Updated:** 2025-11-18
**Version:** Phase 30

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Backend Environment Variables](#backend-environment-variables)
4. [Frontend Environment Variables](#frontend-environment-variables)
5. [Required vs Optional Variables](#required-vs-optional-variables)
6. [Environment-Specific Configuration](#environment-specific-configuration)
7. [Security Best Practices](#security-best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

CitadelBuy uses environment variables to configure both frontend and backend applications. This allows for flexible deployment across different environments (development, staging, production) without code changes.

### Key Principles

- **Never commit** `.env` or `.env.local` files to version control
- **Use** `.env.example` and `.env.local.example` as templates
- **Store secrets** in a secure secrets management service for production
- **Frontend variables** must be prefixed with `NEXT_PUBLIC_` to be accessible in browser code
- **Never expose** sensitive backend keys in frontend code

---

## Quick Start

### Development Setup

#### 1. Backend Configuration

```bash
cd citadelbuy/backend

# Copy the example file
cp .env.example .env

# Edit with your values
nano .env
```

**Minimum required variables for development:**
```env
DATABASE_URL=postgresql://citadelbuy:citadelbuy123@localhost:5432/citadelbuy_dev
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here
```

#### 2. Frontend Configuration

```bash
cd citadelbuy/frontend

# Copy the example file
cp .env.local.example .env.local

# Edit with your values
nano .env.local
```

**Minimum required variables for development:**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Backend Environment Variables

### Database Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ Yes | - | PostgreSQL connection string |
| `DATABASE_LOGGING` | ❌ No | `false` | Enable Prisma query logging |
| `DATABASE_POOL_SIZE` | ❌ No | `10` | Connection pool size |

**Example:**
```env
# Development
DATABASE_URL=postgresql://citadelbuy:citadelbuy123@localhost:5432/citadelbuy_dev

# Production (with SSL)
DATABASE_URL=postgresql://user:password@prod-host:5432/citadelbuy_prod?sslmode=require
```

---

### Application Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | ✅ Yes | `development` | Application environment |
| `PORT` | ❌ No | `4000` | Server port |
| `APP_URL` | ❌ No | `http://localhost:4000` | Backend base URL |
| `FRONTEND_URL` | ✅ Yes | - | Frontend URL (for CORS) |
| `API_PREFIX` | ❌ No | `api` | API route prefix |

---

### JWT Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | ✅ Yes | - | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | ❌ No | `7d` | Token expiration time |
| `JWT_REFRESH_EXPIRES_IN` | ❌ No | `30d` | Refresh token expiration |

**Generate a secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Security Requirements:**
- Minimum 32 characters
- Use cryptographically random strings
- Different secret for each environment
- Rotate regularly in production

---

### Stripe Payment Integration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | ✅ Yes | - | Stripe secret API key |
| `STRIPE_WEBHOOK_SECRET` | ✅ Yes | - | Stripe webhook signing secret |
| `STRIPE_API_VERSION` | ❌ No | `2023-10-16` | Stripe API version |
| `CURRENCY` | ❌ No | `USD` | Default currency code |

**Get your Stripe keys:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Use test keys for development (`sk_test_...`)
3. Use live keys for production (`sk_live_...`)

---

### Email Service

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SENDGRID_API_KEY` | ⚠️ Recommended | - | SendGrid API key |
| `SMTP_HOST` | ❌ No | - | SMTP server host |
| `SMTP_PORT` | ❌ No | `587` | SMTP port |
| `SMTP_USER` | ❌ No | - | SMTP username |
| `SMTP_PASSWORD` | ❌ No | - | SMTP password |
| `EMAIL_FROM` | ❌ No | `noreply@citadelbuy.com` | Sender email address |
| `EMAIL_FROM_NAME` | ❌ No | `CitadelBuy` | Sender name |
| `EMAIL_ENABLED` | ❌ No | `true` | Enable/disable email sending |

**Email Providers:**
- **SendGrid** (Recommended): Set `SENDGRID_API_KEY`
- **Gmail**: Set SMTP variables with app-specific password
- **AWS SES**: Set SMTP variables with SES credentials
- **Mailgun**: Set SMTP variables with Mailgun credentials

---

### Redis Cache (Optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | ❌ No | `redis://localhost:6379` | Redis connection string |
| `REDIS_PASSWORD` | ❌ No | - | Redis password |
| `REDIS_ENABLED` | ❌ No | `false` | Enable Redis caching |
| `CACHE_TTL` | ❌ No | `3600` | Cache TTL in seconds |

---

### Security & Rate Limiting

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CORS_ENABLED` | ❌ No | `true` | Enable CORS |
| `CORS_ORIGIN` | ✅ Yes | - | Allowed CORS origins |
| `RATE_LIMIT_ENABLED` | ❌ No | `true` | Enable rate limiting |
| `THROTTLE_TTL` | ❌ No | `60000` | Rate limit window (ms) |
| `THROTTLE_LIMIT` | ❌ No | `100` | Max requests per window |
| `LOGIN_RATE_LIMIT_MAX` | ❌ No | `5` | Max login attempts |
| `LOGIN_RATE_LIMIT_WINDOW` | ❌ No | `900000` | Login rate limit window |

---

### Monitoring & Logging

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOG_LEVEL` | ❌ No | `info` | Logging level |
| `LOG_PRETTY` | ❌ No | `true` | Pretty print logs |
| `SENTRY_DSN` | ⚠️ Recommended | - | Sentry error tracking DSN |
| `SENTRY_ENVIRONMENT` | ❌ No | `development` | Sentry environment name |
| `SENTRY_ENABLED` | ❌ No | `false` | Enable Sentry |
| `SENTRY_TRACES_SAMPLE_RATE` | ❌ No | `0.1` | Sentry sampling rate |

---

### Feature Configuration

#### BNPL (Buy Now Pay Later)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BNPL_PROVIDER` | ❌ No | `afterpay` | BNPL provider |
| `AFTERPAY_MERCHANT_ID` | ❌ No | - | Afterpay merchant ID |
| `AFTERPAY_SECRET_KEY` | ❌ No | - | Afterpay secret key |
| `KLARNA_USERNAME` | ❌ No | - | Klarna API username |
| `KLARNA_PASSWORD` | ❌ No | - | Klarna API password |

#### Loyalty Program

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOYALTY_POINTS_PER_DOLLAR` | ❌ No | `10` | Points earned per dollar |
| `LOYALTY_POINTS_VALUE_CENTS` | ❌ No | `1` | Point value in cents |
| `REFERRAL_BONUS_POINTS` | ❌ No | `500` | Referral bonus points |
| `LOYALTY_MIN_REDEMPTION_POINTS` | ❌ No | `100` | Min points to redeem |

#### Gift Cards

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GIFT_CARD_MIN_AMOUNT` | ❌ No | `500` | Min amount in cents |
| `GIFT_CARD_MAX_AMOUNT` | ❌ No | `100000` | Max amount in cents |
| `GIFT_CARD_EXPIRATION_DAYS` | ❌ No | `365` | Days until expiration |

#### Internationalization

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEFAULT_LANGUAGE` | ❌ No | `en` | Default language code |
| `SUPPORTED_LANGUAGES` | ❌ No | `en,es,fr,de,zh` | Supported languages |
| `DEFAULT_TIMEZONE` | ❌ No | `America/New_York` | Default timezone |

---

### Admin Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ADMIN_EMAIL` | ❌ No | `admin@citadelbuy.com` | Default admin email |
| `ADMIN_PASSWORD` | ⚠️ Change! | `Change@Me123!` | Default admin password |
| `ADMIN_PATH_PREFIX` | ❌ No | `admin` | Admin panel path |

**⚠️ SECURITY WARNING:** Change `ADMIN_PASSWORD` immediately after deployment!

---

### Feature Flags

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FEATURE_BNPL_ENABLED` | ❌ No | `true` | Enable BNPL |
| `FEATURE_GIFT_CARDS_ENABLED` | ❌ No | `true` | Enable gift cards |
| `FEATURE_LOYALTY_ENABLED` | ❌ No | `true` | Enable loyalty program |
| `FEATURE_SUBSCRIPTIONS_ENABLED` | ❌ No | `true` | Enable subscriptions |
| `FEATURE_DEALS_ENABLED` | ❌ No | `true` | Enable deals |
| `FEATURE_WISHLIST_ENABLED` | ❌ No | `true` | Enable wishlist |
| `FEATURE_REVIEWS_ENABLED` | ❌ No | `true` | Enable reviews |

---

## Frontend Environment Variables

### Critical Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ Yes | - | Backend API URL |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ Yes | - | Stripe publishable key |
| `NEXT_PUBLIC_APP_URL` | ✅ Yes | - | Frontend public URL |

**Example:**
```env
# Development
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51H...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Production
NEXT_PUBLIC_API_URL=https://api.citadelbuy.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51H...
NEXT_PUBLIC_APP_URL=https://citadelbuy.com
```

---

### Application Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_APP_NAME` | ❌ No | `CitadelBuy` | Application name |
| `NEXT_PUBLIC_APP_DESCRIPTION` | ❌ No | - | SEO description |
| `NEXT_PUBLIC_CURRENCY` | ❌ No | `USD` | Default currency |
| `NEXT_PUBLIC_DEFAULT_LANGUAGE` | ❌ No | `en` | Default language |
| `NEXT_PUBLIC_PRODUCTS_PER_PAGE` | ❌ No | `24` | Products per page |

---

### Feature Flags

All frontend feature flags mirror backend configuration:

```env
NEXT_PUBLIC_FEATURE_BNPL_ENABLED=true
NEXT_PUBLIC_FEATURE_GIFT_CARDS_ENABLED=true
NEXT_PUBLIC_FEATURE_LOYALTY_ENABLED=true
NEXT_PUBLIC_FEATURE_SUBSCRIPTIONS_ENABLED=true
NEXT_PUBLIC_FEATURE_DEALS_ENABLED=true
NEXT_PUBLIC_FEATURE_WISHLIST_ENABLED=true
NEXT_PUBLIC_FEATURE_REVIEWS_ENABLED=true
```

---

### Analytics & Tracking

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | ❌ No | - | Google Analytics 4 ID |
| `NEXT_PUBLIC_GTM_ID` | ❌ No | - | Google Tag Manager ID |
| `NEXT_PUBLIC_FB_PIXEL_ID` | ❌ No | - | Facebook Pixel ID |
| `NEXT_PUBLIC_SENTRY_DSN` | ⚠️ Recommended | - | Sentry DSN |

---

## Required vs Optional Variables

### Absolutely Required (Both Environments)

**Backend:**
```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000
```

**Frontend:**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Highly Recommended

**Backend:**
```env
SENDGRID_API_KEY=... # or SMTP credentials
SENTRY_DSN=...
REDIS_URL=... # for production
```

**Frontend:**
```env
NEXT_PUBLIC_SENTRY_DSN=...
NEXT_PUBLIC_GA_MEASUREMENT_ID=...
```

### Optional (Can use defaults)

All other variables have sensible defaults and can be omitted for development.

---

## Environment-Specific Configuration

### Development Environment

```env
# Backend
NODE_ENV=development
LOG_LEVEL=debug
SWAGGER_ENABLED=true
DATABASE_LOGGING=true
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Frontend
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=true
```

### Production Environment

```env
# Backend
NODE_ENV=production
LOG_LEVEL=info
SWAGGER_ENABLED=false
DATABASE_LOGGING=false
DATABASE_URL=postgresql://...?sslmode=require
CORS_ORIGIN=https://citadelbuy.com,https://www.citadelbuy.com
SENTRY_ENABLED=true
REDIS_ENABLED=true

# Frontend
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=false
NEXT_PUBLIC_MAINTENANCE_MODE=false
```

---

## Security Best Practices

### 1. Never Commit Secrets

Add to `.gitignore`:
```
.env
.env.local
.env.*.local
.env.production
```

### 2. Use Strong Secrets

Generate cryptographically secure secrets:
```bash
# JWT Secret (64 bytes = 128 hex characters)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Database password (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Use Secrets Management

**Production Options:**
- **AWS Secrets Manager** - For AWS deployments
- **Google Secret Manager** - For GCP deployments
- **HashiCorp Vault** - Platform-agnostic
- **Railway/Heroku** - Built-in environment variables
- **Doppler** - Third-party secrets management

### 4. Rotate Secrets Regularly

- JWT secrets: Every 90 days
- Database passwords: Every 180 days
- API keys: When compromised or yearly

### 5. Principle of Least Privilege

- Use read-only database credentials where possible
- Limit CORS origins to specific domains in production
- Disable debug features in production

### 6. Environment Variable Validation

Backend validates required variables at startup:
```typescript
// Throws error if required variables are missing
validateEnvironmentVariables();
```

---

## Troubleshooting

### Backend won't start

**Error:** `DATABASE_URL is not defined`
```bash
# Check if .env file exists
ls -la citadelbuy/backend/.env

# Copy from example if missing
cp citadelbuy/backend/.env.example citadelbuy/backend/.env

# Edit and add DATABASE_URL
nano citadelbuy/backend/.env
```

---

### Stripe payments not working

**Frontend Error:** `Stripe publishable key is missing`
```bash
# Check frontend .env.local
cat citadelbuy/frontend/.env.local | grep STRIPE

# Should output:
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# If missing, add it
echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key" >> citadelbuy/frontend/.env.local
```

**Backend Error:** `No webhook signature`
```bash
# Test Stripe webhook locally with Stripe CLI
stripe listen --forward-to localhost:4000/api/webhooks/stripe

# Copy webhook secret to .env
# whsec_...
```

---

### CORS errors in browser

**Error:** `Access to fetch at 'http://localhost:4000' has been blocked by CORS policy`

**Backend:**
```env
# .env - Add frontend URL to CORS_ORIGIN
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

**Frontend:**
```env
# .env.local - Verify API URL matches backend
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

### Email not sending

**Check configuration:**
```bash
# Backend .env
EMAIL_ENABLED=true
SENDGRID_API_KEY=SG.xxx # or SMTP credentials

# Test email service
curl -X POST http://localhost:4000/api/test-email
```

**If using Gmail SMTP:**
1. Enable 2-factor authentication
2. Create app-specific password
3. Use app password in `SMTP_PASSWORD`

---

### Environment variables not updating

**Next.js:**
```bash
# Restart dev server (environment variables are cached)
npm run dev

# Or rebuild for production
npm run build
```

**NestJS:**
```bash
# Restart server
npm run start:dev
```

**Docker:**
```bash
# Rebuild with --no-cache
docker-compose build --no-cache
docker-compose up
```

---

## Platform-Specific Setup

### Railway

1. Go to project settings
2. Add environment variables in Variables tab
3. Deploy from GitHub
4. Railway auto-sets `DATABASE_URL` for PostgreSQL

### Vercel (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Add environment variables
vercel env add NEXT_PUBLIC_API_URL production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production

# Or use Vercel dashboard
```

### AWS ECS/Fargate

Create task definition with environment variables:
```json
{
  "environment": [
    {"name": "DATABASE_URL", "value": "postgresql://..."},
    {"name": "JWT_SECRET", "value": "..."}
  ]
}
```

Or use AWS Secrets Manager:
```json
{
  "secrets": [
    {
      "name": "DATABASE_URL",
      "valueFrom": "arn:aws:secretsmanager:region:account:secret:citadelbuy/database-url"
    }
  ]
}
```

---

## Reference Links

- [Backend .env.example](../citadelbuy/backend/.env.example)
- [Frontend .env.local.example](../citadelbuy/frontend/.env.local.example)
- [Stripe API Keys](https://dashboard.stripe.com/apikeys)
- [SendGrid API Keys](https://app.sendgrid.com/settings/api_keys)
- [Sentry DSN](https://sentry.io/settings/projects/)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

---

**Last Updated:** 2025-11-18
**Maintained By:** CitadelBuy Development Team
**Questions?** Contact: dev@citadelbuy.com
