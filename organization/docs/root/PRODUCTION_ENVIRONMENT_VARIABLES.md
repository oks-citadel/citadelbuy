# Production Environment Variables - CitadelBuy

## Table of Contents
- [Overview](#overview)
- [Critical Security Variables](#critical-security-variables)
- [Required Production Variables](#required-production-variables)
- [Optional Production Variables](#optional-production-variables)
- [Validation Rules](#validation-rules)
- [Deployment Checklist](#deployment-checklist)
- [Troubleshooting](#troubleshooting)

## Overview

This document provides a comprehensive guide to all environment variables required for deploying CitadelBuy to production. The application includes automatic validation that will prevent startup if critical security requirements are not met.

**IMPORTANT:** The application will refuse to start in production if:
- CORS_ORIGIN is not set or configured improperly
- JWT secrets are less than 64 characters
- Encryption keys are not properly formatted
- Placeholder/example values are detected

## Critical Security Variables

These variables are **REQUIRED** for production and have strict validation rules.

### JWT Authentication

#### `JWT_SECRET` (REQUIRED)
- **Description:** Secret key for signing access tokens
- **Validation:** Minimum 64 characters
- **Generate:** `openssl rand -base64 64`
- **Example:** `YourVeryLongRandomSecretKeyHere...` (64+ characters)
- **Storage:** Use a secrets manager (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault)

#### `JWT_REFRESH_SECRET` (REQUIRED)
- **Description:** Secret key for signing refresh tokens
- **Validation:** Minimum 64 characters, MUST differ from JWT_SECRET
- **Generate:** `openssl rand -base64 64`
- **Example:** `AnotherDifferentVeryLongRandomSecretKey...` (64+ characters)
- **Storage:** Use a secrets manager

#### `JWT_EXPIRES_IN` (REQUIRED)
- **Description:** Access token expiration time
- **Default:** `7d` (7 days)
- **Options:** `15m`, `1h`, `7d`, `30d`
- **Recommendation:** Use `15m` for production security

#### `JWT_REFRESH_EXPIRES_IN` (REQUIRED)
- **Description:** Refresh token expiration time
- **Default:** `30d` (30 days)
- **Options:** `7d`, `30d`, `90d`
- **Recommendation:** Use `30d` for production

### Encryption

#### `KYC_ENCRYPTION_KEY` (REQUIRED)
- **Description:** AES-256 encryption key for sensitive KYC documents
- **Validation:** EXACTLY 64 hexadecimal characters (32 bytes)
- **Generate:** `openssl rand -hex 32`
- **Example:** `a1b2c3d4e5f6...` (64 hex chars)
- **Security:** NEVER reuse across environments
- **Storage:** Use a secrets manager with encryption at rest

### Database

#### `DATABASE_URL` (REQUIRED)
- **Description:** PostgreSQL connection string
- **Format:** `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`
- **Validation:** Must start with `postgresql://` or `postgres://`
- **Example:** `postgresql://citadelbuy:SecureP@ssw0rd@db.example.com:5432/citadelbuy_prod?schema=public`
- **Security:** Use strong database passwords (generate with `openssl rand -base64 32`)
- **Recommendation:** Use SSL mode in production: add `?sslmode=require` to connection string

#### `REDIS_URL` (REQUIRED)
- **Description:** Redis connection string for caching and sessions
- **Format:** `redis://[:PASSWORD@]HOST:PORT[/DATABASE]`
- **Default:** `redis://localhost:6379`
- **Example:** `redis://:SecureP@ssw0rd@redis.example.com:6379/0`
- **Recommendation:** Use Redis with password authentication in production

### CORS Configuration

#### `CORS_ORIGIN` (REQUIRED in production)
- **Description:** Comma-separated list of allowed origins
- **Validation:**
  - Required in production (application will not start without it)
  - All origins must use HTTPS (http://localhost:3000 allowed for testing)
- **Format:** `https://domain1.com,https://domain2.com`
- **Example:** `https://citadelbuy.com,https://www.citadelbuy.com,https://admin.citadelbuy.com`
- **Security:** NEVER use wildcards (*) in production

#### `FRONTEND_URL` (REQUIRED)
- **Description:** Primary frontend application URL for emails and redirects
- **Validation:** Must be HTTPS in production
- **Example:** `https://citadelbuy.com`

## Required Production Variables

### Application Core

#### `NODE_ENV` (REQUIRED)
- **Description:** Application environment
- **Value:** `production`
- **Validation:** Must be set to `production` for production deployment

#### `PORT` (REQUIRED)
- **Description:** Port for the API server to listen on
- **Default:** `4000`
- **Example:** `4000` or `3000`

### Email Configuration

#### `EMAIL_HOST` (REQUIRED)
- **Description:** SMTP server hostname
- **Example:** `smtp.sendgrid.net`, `smtp.mailgun.org`

#### `EMAIL_PORT` (REQUIRED)
- **Description:** SMTP server port
- **Default:** `587` (TLS) or `465` (SSL)
- **Example:** `587`

#### `EMAIL_USER` (REQUIRED)
- **Description:** SMTP authentication username
- **Example:** `apikey` (SendGrid) or your email

#### `EMAIL_PASSWORD` (REQUIRED)
- **Description:** SMTP authentication password or API key
- **Security:** Store in secrets manager
- **Example:** `SG.xxx...` (SendGrid API key)

#### `EMAIL_FROM` (REQUIRED)
- **Description:** Default sender email address
- **Example:** `noreply@citadelbuy.com`
- **Validation:** Must be a valid email format

## Optional Production Variables

### Payment Providers

#### Stripe (Recommended)

```bash
STRIPE_ENABLED=true
STRIPE_SECRET_KEY=sk_live_...  # MUST use live key in production
STRIPE_WEBHOOK_SECRET=whsec_...
APPLE_MERCHANT_ID=merchant.com.citadelbuy
GOOGLE_MERCHANT_ID=BCR2DN4TXXXXXXXX
```

**Validation:**
- If `STRIPE_ENABLED=true`, `STRIPE_SECRET_KEY` is required
- Production must use `sk_live_...` not `sk_test_...`

#### PayPal

```bash
PAYPAL_ENABLED=true
PAYPAL_CLIENT_ID=your_live_client_id
PAYPAL_CLIENT_SECRET=your_live_secret
PAYPAL_MODE=live  # NOT sandbox
PAYPAL_WEBHOOK_ID=your_webhook_id
```

#### Flutterwave (African Markets)

```bash
FLUTTERWAVE_ENABLED=true
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_LIVE-xxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK_LIVE-xxxx
FLUTTERWAVE_ENCRYPTION_KEY=xxxx
FLUTTERWAVE_WEBHOOK_SECRET=xxxx
```

#### Paystack

```bash
PAYSTACK_ENABLED=true
PAYSTACK_PUBLIC_KEY=pk_live_xxxx
PAYSTACK_SECRET_KEY=sk_live_xxxx
```

### Cloud Storage

#### AWS S3

```bash
STORAGE_PROVIDER=S3
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=citadelbuy-production-uploads
STORAGE_BUCKET=citadelbuy-kyc-documents
```

#### Azure Blob Storage (Alternative)

```bash
STORAGE_PROVIDER=AZURE
AZURE_STORAGE_ACCOUNT_NAME=citadelbuyproduction
AZURE_STORAGE_ACCOUNT_KEY=your_account_key_from_azure_portal
AZURE_STORAGE_CONTAINER=citadelbuy-documents
```

### Search Providers

#### Elasticsearch (Recommended)

```bash
SEARCH_PROVIDER=elasticsearch
ELASTICSEARCH_NODE=https://elasticsearch.example.com:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=SecureP@ssw0rd
ELASTICSEARCH_INDEX_PREFIX=citadelbuy_prod
ELASTICSEARCH_BULK_SIZE=1000
ELASTICSEARCH_REQUEST_TIMEOUT=30000
```

#### Algolia (Alternative)

```bash
SEARCH_PROVIDER=algolia
ALGOLIA_APP_ID=YOUR_APP_ID
ALGOLIA_API_KEY=your_admin_api_key
ALGOLIA_INDEX_NAME=citadelbuy_prod_products
```

### AI Services

#### OpenAI

```bash
OPENAI_API_KEY=sk-proj-...
```

#### Google Cloud Vision

```bash
GOOGLE_CLOUD_PROJECT_ID=citadelbuy-production
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

### Social Authentication

#### Google OAuth

```bash
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```

#### Facebook OAuth

```bash
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
```

#### Apple Sign In

```bash
APPLE_CLIENT_ID=com.citadelbuy.app
```

#### GitHub OAuth

```bash
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
```

### Monitoring & Analytics

#### Sentry (Highly Recommended)

```bash
SENTRY_DSN=https://your_key@o0000000.ingest.sentry.io/0000000
```

**Note:** While optional, Sentry is highly recommended for production error tracking and monitoring.

#### Marketing Integrations

```bash
# Facebook Conversions API
FACEBOOK_PIXEL_ID=your_pixel_id
FACEBOOK_ACCESS_TOKEN=your_access_token

# TikTok Events API
TIKTOK_PIXEL_ID=your_pixel_id
TIKTOK_ACCESS_TOKEN=your_access_token
```

### Rate Limiting

```bash
THROTTLE_TTL=60        # Time window in seconds
THROTTLE_LIMIT=100     # Max requests per time window
```

### Logging

```bash
LOG_LEVEL=info  # Options: debug, info, warn, error
```

## Validation Rules

### Automatic Startup Validation

The application performs the following checks at startup:

1. **Node.js Version Check**
   - Minimum: Node.js 18.x
   - Recommended: Node.js 20.x LTS

2. **Environment Checks (Production Only)**
   - CORS_ORIGIN is set and uses HTTPS
   - JWT secrets are at least 64 characters
   - JWT_SECRET ≠ JWT_REFRESH_SECRET
   - KYC_ENCRYPTION_KEY is exactly 64 hex characters
   - DATABASE_URL is valid PostgreSQL format
   - FRONTEND_URL uses HTTPS
   - No placeholder values (e.g., "CHANGE_ME", "your-jwt-secret")

3. **Payment Provider Validation**
   - If enabled, credentials are present and valid format
   - Production uses live keys (not test keys)

4. **Email Configuration**
   - All required SMTP settings are present

### Manual Pre-Deployment Checks

Run these commands to verify your configuration:

```bash
# Check Node.js version
node --version  # Should be 18.x or higher

# Verify environment variables are set
npm run env:check

# Run the application in production mode locally (with production .env)
NODE_ENV=production npm start

# Check for placeholder values
grep -r "CHANGE_ME\|your-jwt-secret\|your_stripe\|your-secure-db-password" .env
```

## Deployment Checklist

### Pre-Deployment

- [ ] All required environment variables are set
- [ ] JWT secrets are at least 64 characters and cryptographically random
- [ ] Encryption keys are properly formatted (64 hex chars)
- [ ] Database connection uses SSL (`?sslmode=require`)
- [ ] Redis requires authentication
- [ ] CORS_ORIGIN is set with HTTPS origins only
- [ ] FRONTEND_URL uses HTTPS
- [ ] Email SMTP credentials are correct
- [ ] Payment providers use live keys (not test keys)
- [ ] No placeholder or example values remain
- [ ] Secrets are stored in a secrets manager
- [ ] Application starts successfully with `NODE_ENV=production`

### Post-Deployment

- [ ] Application health check passes
- [ ] CORS policy works correctly from frontend
- [ ] JWT authentication works
- [ ] Email sending works (test with password reset)
- [ ] Payment processing works (test transaction)
- [ ] File uploads work (test with product images)
- [ ] Search functionality works
- [ ] Sentry is receiving error reports (if configured)
- [ ] Database connections are using SSL
- [ ] Redis caching is working

## Troubleshooting

### Application Won't Start

#### Error: "CORS_ORIGIN is required in production"

**Solution:** Set the CORS_ORIGIN environment variable with comma-separated HTTPS origins:

```bash
CORS_ORIGIN=https://citadelbuy.com,https://www.citadelbuy.com
```

#### Error: "JWT_SECRET must be at least 64 characters long"

**Solution:** Generate a new secret with at least 64 characters:

```bash
openssl rand -base64 64
```

Then set it in your environment:

```bash
JWT_SECRET=<output_from_command_above>
```

#### Error: "KYC_ENCRYPTION_KEY must be exactly 64 hexadecimal characters"

**Solution:** Generate a proper encryption key:

```bash
openssl rand -hex 32
```

Set it in your environment:

```bash
KYC_ENCRYPTION_KEY=<output_from_command_above>
```

#### Error: "Found placeholder values in production environment"

**Solution:** Search for and replace all placeholder values:

```bash
grep -n "CHANGE_ME\|your-jwt-secret\|your_stripe" .env
```

Replace each placeholder with actual production values.

### CORS Errors in Browser

#### Error: "Origin not allowed by CORS"

**Check:**
1. CORS_ORIGIN includes the requesting origin
2. Origin uses HTTPS (not HTTP) in production
3. No trailing slashes in CORS_ORIGIN
4. Application has restarted after changing CORS_ORIGIN

**Example Fix:**

```bash
# Wrong
CORS_ORIGIN=http://citadelbuy.com  # HTTP not allowed in production
CORS_ORIGIN=https://citadelbuy.com/  # Trailing slash causes mismatch

# Correct
CORS_ORIGIN=https://citadelbuy.com
```

### Database Connection Errors

#### Error: "Connection refused" or "Cannot connect to database"

**Check:**
1. DATABASE_URL format is correct
2. Database server is accessible from application server
3. Firewall rules allow connection
4. SSL is configured if required

**Example:**

```bash
# Add SSL mode
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

### Payment Processing Errors

#### Error: "Invalid API key" (Stripe)

**Check:**
1. Using live key (`sk_live_...`) not test key (`sk_test_...`)
2. API key is correctly copied (no extra spaces)
3. Stripe account is activated and not in test mode

### Email Sending Errors

#### Error: "Authentication failed" (SMTP)

**Check:**
1. EMAIL_USER and EMAIL_PASSWORD are correct
2. Using correct SMTP port (587 for TLS, 465 for SSL)
3. Email provider allows SMTP access
4. API key format is correct (for SendGrid, Mailgun, etc.)

## Security Best Practices

1. **Use a Secrets Manager**
   - AWS Secrets Manager
   - Azure Key Vault
   - HashiCorp Vault
   - Google Secret Manager

2. **Rotate Secrets Regularly**
   - JWT secrets: Every 90 days
   - Database passwords: Every 90 days
   - API keys: Every 180 days
   - Encryption keys: NEVER rotate (will lose access to encrypted data)

3. **Environment Isolation**
   - Use different secrets for dev, staging, and production
   - Never copy production secrets to development
   - Never commit .env files to version control

4. **Access Control**
   - Limit who can access production secrets
   - Use IAM roles and policies
   - Enable MFA for secrets manager access
   - Audit secret access logs

5. **Monitoring**
   - Enable Sentry for error tracking
   - Monitor failed authentication attempts
   - Set up alerts for unusual API usage
   - Track database connection failures

## Support

For additional help with environment configuration:

- **Documentation:** [https://docs.citadelbuy.com](https://docs.citadelbuy.com)
- **Support:** support@citadelbuy.com
- **Security Issues:** security@citadelbuy.com

---

**Last Updated:** 2024-12-03
**Version:** 1.0.0
