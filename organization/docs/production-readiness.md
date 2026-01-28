# Broxiva Global Marketplace - Production Readiness Checklist

## Deployment Configuration

### Vercel Environment Variables

```bash
# Application
NEXT_PUBLIC_APP_NAME=Broxiva
NEXT_PUBLIC_APP_URL=https://www.broxiva.com
NEXT_PUBLIC_API_URL=https://api.broxiva.com

# API Configuration
NEXT_PUBLIC_API_VERSION=v1

# Feature Flags
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
NEXT_PUBLIC_ENABLE_MULTI_CURRENCY=true
NEXT_PUBLIC_ENABLE_MULTI_LANGUAGE=true

# Analytics
NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx

# Payment (Public Keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# CDN
NEXT_PUBLIC_CDN_URL=https://cdn.broxiva.com
```

### Railway Environment Variables

```bash
# ===========================================
# CORE APPLICATION
# ===========================================
NODE_ENV=production
PORT=4000

# ===========================================
# DATABASE (Railway PostgreSQL)
# ===========================================
DATABASE_URL=postgresql://postgres:xxx@containers-us-west-xxx.railway.app:5432/railway

# ===========================================
# REDIS (Railway Redis)
# ===========================================
REDIS_URL=redis://default:xxx@containers-us-west-xxx.railway.app:6379

# ===========================================
# JWT SECURITY (CRITICAL - 64+ characters)
# ===========================================
JWT_SECRET=<generate-64-char-random-string>
JWT_REFRESH_SECRET=<generate-different-64-char-random-string>
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# ===========================================
# ENCRYPTION (32 bytes = 64 hex characters)
# ===========================================
KYC_ENCRYPTION_KEY=<generate-64-hex-char-key>

# ===========================================
# CORS & DOMAINS
# ===========================================
CORS_ALLOWED_ORIGINS=https://www.broxiva.com,https://admin.broxiva.com,https://*.broxiva.com
FRONTEND_URL=https://www.broxiva.com
API_URL=https://api.broxiva.com

# ===========================================
# EMAIL (Required)
# ===========================================
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.xxx
EMAIL_FROM=noreply@broxiva.com

# ===========================================
# PAYMENT PROVIDERS
# ===========================================
# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_ENABLED=true

# PayPal
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_ENABLED=true

# Flutterwave (Africa)
FLUTTERWAVE_SECRET_KEY=FLWSECK_xxx
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_xxx
FLUTTERWAVE_ENABLED=true

# Paystack (West Africa)
PAYSTACK_SECRET_KEY=sk_live_xxx
PAYSTACK_PUBLIC_KEY=pk_live_xxx
PAYSTACK_ENABLED=true

# ===========================================
# FX RATE PROVIDERS
# ===========================================
OPENEXCHANGERATES_APP_ID=xxx
FX_REFRESH_INTERVAL_MINUTES=15

# ===========================================
# LLM PROVIDERS (Translations)
# ===========================================
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4-turbo-preview
LLM_PRIMARY_PROVIDER=openai

# ===========================================
# STORAGE
# ===========================================
STORAGE_PROVIDER=S3
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
AWS_S3_BUCKET=broxiva-assets

# ===========================================
# MONITORING
# ===========================================
SENTRY_DSN=https://xxx@sentry.io/xxx
LOG_LEVEL=info

# ===========================================
# MFA ENFORCEMENT
# ===========================================
MFA_REQUIRED_ROLES=ADMIN,VENDOR
MFA_GRACE_PERIOD_DAYS=7
MFA_TRUSTED_DEVICE_DAYS=30
MFA_ENABLE_TRUSTED_DEVICES=true

# ===========================================
# RATE LIMITING
# ===========================================
THROTTLE_TTL=60
THROTTLE_LIMIT=100
THROTTLE_ANONYMOUS_TTL=60
THROTTLE_ANONYMOUS_LIMIT=30
THROTTLE_AUTH_TTL=60
THROTTLE_AUTH_LIMIT=10

# ===========================================
# RECAPTCHA
# ===========================================
RECAPTCHA_SITE_KEY=xxx
RECAPTCHA_SECRET_KEY=xxx
RECAPTCHA_ENABLED=true
```

---

## Pre-Deployment Checklist

### Infrastructure

- [ ] **PostgreSQL provisioned** on Railway with sufficient storage
- [ ] **Redis provisioned** on Railway (at least 256MB)
- [ ] **Domain DNS configured**:
  - [ ] `www.broxiva.com` → Vercel
  - [ ] `api.broxiva.com` → Railway
  - [ ] `domains.broxiva.com` → Vercel (for custom domain CNAME target)
- [ ] **SSL certificates** auto-provisioned (Vercel/Railway handle this)
- [ ] **CDN configured** for static assets

### Database

- [ ] **Migrations applied**: `npx prisma migrate deploy`
- [ ] **Seed data loaded** (if applicable): `npx prisma db seed`
- [ ] **Indexes verified** on all tenant-scoped tables
- [ ] **Connection pooling** configured (PgBouncer if needed)
- [ ] **Backup schedule** configured on Railway

### Security

- [ ] **JWT secrets** are 64+ characters and unique
- [ ] **KYC encryption key** is 64 hex characters (32 bytes)
- [ ] **CORS origins** are HTTPS only (no wildcards in production)
- [ ] **Rate limiting** enabled and configured
- [ ] **MFA required** for admin and vendor roles
- [ ] **Webhook signatures** configured for all providers
- [ ] **Security headers** enabled (CSP, HSTS, etc.)

### Authentication

- [ ] **JWT token rotation** working correctly
- [ ] **Refresh token** flow tested
- [ ] **Account lockout** after failed attempts
- [ ] **Email verification** flow tested
- [ ] **Password reset** flow tested
- [ ] **2FA/MFA** setup and enforcement working

### Multi-Tenancy

- [ ] **Tenant resolution** working for subdomains
- [ ] **Tenant resolution** working for custom domains
- [ ] **Domain verification** worker running
- [ ] **Tenant isolation** tests passing
- [ ] **Cross-tenant access** properly blocked

### Internationalization

- [ ] **All locales** configured and tested
- [ ] **Translation files** complete for all locales
- [ ] **Currency conversion** working correctly
- [ ] **FX rate refresh** worker running
- [ ] **Locale routing** working (/en-us, /fr-ca, etc.)
- [ ] **hreflang tags** present on all pages

### Payments

- [ ] **Stripe live keys** configured
- [ ] **Stripe webhook** endpoint registered
- [ ] **PayPal live credentials** configured
- [ ] **Payment flow** tested end-to-end
- [ ] **Refund flow** tested
- [ ] **FX snapshot** captured at order time

### Email

- [ ] **SMTP credentials** valid for production
- [ ] **Email templates** tested for all locales
- [ ] **Transactional emails** sending correctly
- [ ] **Email bounces** handled properly

### Monitoring

- [ ] **Sentry** configured for error tracking
- [ ] **Health check** endpoint responding
- [ ] **Logging** configured with proper log levels
- [ ] **Alerts** set up for critical errors

### Performance

- [ ] **Redis cache** warming for critical data
- [ ] **Database queries** optimized (no N+1)
- [ ] **API response times** under 200ms for reads
- [ ] **Static assets** served via CDN
- [ ] **Image optimization** enabled

### Background Workers

- [ ] **FX refresh worker** running (every 15 min)
- [ ] **Translation worker** processing queue
- [ ] **Product sync worker** handling webhooks
- [ ] **Sitemap generator** running (daily)
- [ ] **Domain verification worker** running (every 5 min)
- [ ] **Worker health checks** monitored

---

## Smoke Tests

After deployment, verify these critical flows:

### 1. Tenant Resolution
```bash
# Test subdomain resolution
curl -I https://demo.broxiva.com
# Should return 200 with x-bx-tenant header

# Test custom domain resolution (after verification)
curl -I https://shop.vendor.com
# Should return 200 with x-bx-tenant header
```

### 2. Authentication
```bash
# Test registration
curl -X POST https://api.broxiva.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'

# Test login
curl -X POST https://api.broxiva.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'
```

### 3. Products & Localization
```bash
# Test products endpoint with locale
curl https://api.broxiva.com/api/v1/products?locale=en-us&currency=USD

# Test products in different currency
curl https://api.broxiva.com/api/v1/products?locale=yo-ng&currency=NGN
```

### 4. FX Rates
```bash
# Test FX quote
curl https://api.broxiva.com/api/v1/fx/quote?base=USD&quote=NGN&amount=100
```

### 5. Health Check
```bash
curl https://api.broxiva.com/api/health
# Should return { "status": "ok", "database": "connected", "redis": "connected" }
```

---

## Rollback Procedure

If issues are detected after deployment:

### 1. Immediate Rollback (Vercel)
```bash
# Rollback to previous deployment
vercel rollback
```

### 2. Database Rollback
```bash
# Rollback last migration (if needed)
npx prisma migrate rollback
```

### 3. Railway Rollback
- Go to Railway dashboard
- Select the service
- Click "Deployments"
- Click "Redeploy" on the previous successful deployment

---

## Post-Deployment Monitoring

### First 24 Hours
- [ ] Monitor error rates in Sentry
- [ ] Check API response times
- [ ] Verify all workers are processing
- [ ] Check payment webhooks arriving
- [ ] Monitor database connection pool
- [ ] Check Redis memory usage

### First Week
- [ ] Review slow query logs
- [ ] Check for any rate limiting issues
- [ ] Monitor FX rate accuracy
- [ ] Verify translation quality
- [ ] Check sitemap generation
- [ ] Review security logs

---

## Support Contacts

| Issue | Contact |
|-------|---------|
| Infrastructure | devops@broxiva.com |
| Security | security@broxiva.com |
| Payments | payments@broxiva.com |
| General | support@broxiva.com |

---

## Done Conditions (Acceptance Criteria)

✅ A tenant can go live on `vendorSlug.broxiva.com` immediately

✅ A tenant can verify and go live on `shop.vendor.com` via TXT + CNAME verification

✅ Site detects country and proposes currency/language, but respects user override

✅ Product pages render localized content and converted prices

✅ Orders store FX snapshot and do not recompute totals after placement

✅ Translation lifecycle works: DRAFT → AUTO_TRANSLATED → VENDOR_APPROVED → PUBLISHED

✅ All workers run idempotently and safely

✅ Tenant isolation tests pass (no cross-tenant data access)

✅ All security checklist items verified
