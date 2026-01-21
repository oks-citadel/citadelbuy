# Broxiva Environment Variables Documentation

This document provides a comprehensive reference for all environment variables used in the Broxiva e-commerce platform.

## Table of Contents

- [Quick Start](#quick-start)
- [Security Guidelines](#security-guidelines)
- [Environment Files Overview](#environment-files-overview)
- [Variable Reference](#variable-reference)
  - [Application Configuration](#application-configuration)
  - [Database Configuration](#database-configuration)
  - [Redis Configuration](#redis-configuration)
  - [JWT Authentication](#jwt-authentication)
  - [Encryption Configuration](#encryption-configuration)
  - [Payment Providers](#payment-providers)
  - [In-App Purchases](#in-app-purchases)
  - [AWS Services](#aws-services)
  - [Storage Services](#storage-services)
  - [Message Queue](#message-queue)
  - [Search Services](#search-services)
  - [Social Login (OAuth)](#social-login-oauth)
  - [AI Services](#ai-services)
  - [KYC Verification](#kyc-verification)
  - [Tax Calculation](#tax-calculation)
  - [Monitoring & Logging](#monitoring--logging)
  - [Analytics & Marketing](#analytics--marketing)
  - [reCAPTCHA Bot Protection](#recaptcha-bot-protection)
  - [Rate Limiting](#rate-limiting)
  - [MFA Enforcement](#mfa-enforcement)
  - [Admin Tools](#admin-tools)
  - [Feature Flags](#feature-flags)
  - [Alert Notifications](#alert-notifications)
  - [Frontend Public Configuration](#frontend-public-configuration)
- [Secret Rotation](#secret-rotation)

---

## Quick Start

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Generate secure secrets:
   ```bash
   # Generate database/admin passwords (32+ characters)
   openssl rand -base64 32

   # Generate JWT secrets (64+ characters)
   openssl rand -base64 64

   # Generate encryption keys (64 hex characters)
   openssl rand -hex 32
   ```

3. Replace all `CHANGE_ME` values with your generated secrets.

4. Never commit `.env` files to version control.

---

## Security Guidelines

### Password Requirements

| Secret Type | Minimum Length | Generation Command |
|-------------|----------------|-------------------|
| Database passwords | 32 characters | `openssl rand -base64 32` |
| Admin tool passwords | 32 characters | `openssl rand -base64 32` |
| JWT secrets | 64 characters | `openssl rand -base64 64` |
| Encryption keys | 64 hex chars (32 bytes) | `openssl rand -hex 32` |

### Critical Security Rules

1. **Never commit actual secrets** - Only `.env.example` files should be in version control
2. **Different secrets per environment** - Dev, staging, and production must use unique secrets
3. **JWT secrets must be different** - `JWT_SECRET` and `JWT_REFRESH_SECRET` must not match
4. **Rotate secrets regularly** - Production secrets should be rotated every 90 days
5. **Use a secrets manager** - In production, use AWS Secrets Manager, HashiCorp Vault, or Azure Key Vault

---

## Environment Files Overview

| File | Purpose | Commit to Git? |
|------|---------|----------------|
| `.env.example` | Template with placeholder values | Yes |
| `.env` | Local development secrets | No |
| `.env.local` | Local overrides | No |
| `.env.development` | Development environment | No |
| `.env.production` | Production environment | No |
| `.env.docker.example` | Docker Compose template | Yes |
| `.env.payment.example` | Payment gateway reference | Yes |
| `.env.secure.example` | Security-focused template | Yes |

---

## Variable Reference

### Application Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment: development, staging, production | `development` | Yes |
| `PORT` | Server port | `4000` | Yes |
| `API_PREFIX` | API route prefix | `/api` | No |
| `FRONTEND_URL` | Frontend application URL | `http://localhost:3000` | Yes |
| `API_URL` | Backend API URL | `http://localhost:4000` | Yes |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed CORS origins | `http://localhost:3000` | Yes |

### Database Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `POSTGRES_USER` | PostgreSQL username | `broxiva` | Yes |
| `POSTGRES_PASSWORD` | PostgreSQL password (min 32 chars) | - | Yes |
| `POSTGRES_DB` | Database name | `broxiva_dev` | Yes |
| `POSTGRES_HOST` | Database host | `localhost` | Yes |
| `POSTGRES_PORT` | Database port | `5432` | Yes |
| `DATABASE_URL` | Full connection string | - | Yes |
| `DB_POOL_MIN` | Minimum connection pool size | `2` | No |
| `DB_POOL_MAX` | Maximum connection pool size | `10` | No |
| `DB_TIMEOUT` | Connection timeout (ms) | `30000` | No |

### Redis Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_HOST` | Redis host | `localhost` | Yes |
| `REDIS_PORT` | Redis port | `6379` | Yes |
| `REDIS_PASSWORD` | Redis password (set in production) | - | Production |
| `REDIS_DB` | Redis database number | `0` | No |
| `REDIS_URL` | Full Redis connection URL | `redis://localhost:6379` | Yes |
| `REDIS_KEY_PREFIX` | Key prefix for namespacing | `broxiva:` | No |
| `REDIS_TIMEOUT` | Connection timeout (ms) | `5000` | No |

### JWT Authentication

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Access token signing secret (min 64 chars) | - | Yes |
| `JWT_REFRESH_SECRET` | Refresh token secret (must differ from JWT_SECRET) | - | Yes |
| `JWT_EXPIRES_IN` | Access token expiration | `1h` | Yes |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration | `7d` | Yes |
| `SESSION_SECRET` | Session cookie signing secret | - | Yes |

### Encryption Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ENCRYPTION_KEY` | General encryption key (64 hex chars) | - | Yes |
| `KYC_ENCRYPTION_KEY` | KYC document encryption key (64 hex chars) | - | Yes |

**Warning**: If encryption keys are lost, encrypted data cannot be recovered.

### Payment Providers

#### Stripe (Primary - Global)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `STRIPE_ENABLED` | Enable Stripe payments | `true` | No |
| `STRIPE_SECRET_KEY` | Server-side API key (sk_test_* or sk_live_*) | - | Yes |
| `STRIPE_PUBLISHABLE_KEY` | Client-side API key (pk_test_* or pk_live_*) | - | Yes |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification (whsec_*) | - | Yes |
| `APPLE_MERCHANT_ID` | Apple Pay merchant ID | `merchant.com.broxiva` | No |
| `GOOGLE_MERCHANT_ID` | Google Pay merchant ID | - | No |

#### PayPal (Secondary)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PAYPAL_ENABLED` | Enable PayPal payments | `true` | No |
| `PAYPAL_CLIENT_ID` | REST API client ID | - | If enabled |
| `PAYPAL_CLIENT_SECRET` | REST API secret | - | If enabled |
| `PAYPAL_MODE` | `sandbox` or `live` | `sandbox` | If enabled |
| `PAYPAL_WEBHOOK_ID` | Webhook ID for verification | - | Production |

#### Flutterwave (African Markets)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `FLUTTERWAVE_ENABLED` | Enable Flutterwave | `false` | No |
| `FLUTTERWAVE_PUBLIC_KEY` | Public API key | - | If enabled |
| `FLUTTERWAVE_SECRET_KEY` | Secret API key | - | If enabled |
| `FLUTTERWAVE_ENCRYPTION_KEY` | Encryption key | - | If enabled |
| `FLUTTERWAVE_WEBHOOK_SECRET` | Webhook secret | - | If enabled |

#### Paystack (Nigeria, Ghana, SA, Kenya)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PAYSTACK_ENABLED` | Enable Paystack | `false` | No |
| `PAYSTACK_PUBLIC_KEY` | Public API key | - | If enabled |
| `PAYSTACK_SECRET_KEY` | Secret API key | - | If enabled |

### In-App Purchases

#### Apple IAP

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `APPLE_SHARED_SECRET` | App Store Connect shared secret | - | For IAP |
| `APPLE_BUNDLE_ID` | iOS app bundle ID | `com.broxiva.app` | For IAP |
| `APPLE_ISSUER_ID` | App Store Connect issuer ID | - | For IAP |
| `APPLE_KEY_ID` | App Store Connect key ID | - | For IAP |
| `APPLE_PRIVATE_KEY` | Private key content | - | For IAP |

#### Google Play Billing

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GOOGLE_PACKAGE_NAME` | Android package name | `com.broxiva.app` | For IAP |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email | - | For IAP |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Service account private key | - | For IAP |

### AWS Services

**Note**: External providers (SendGrid, Twilio) are NOT supported per infrastructure policy.

#### Shared Credentials

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AWS_ACCESS_KEY_ID` | AWS access key | - | Yes |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | - | Yes |
| `AWS_REGION` | AWS region | `us-east-1` | Yes |

#### S3 (File Storage)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AWS_S3_BUCKET` | S3 bucket name | `broxiva-uploads` | Yes |

#### SES (Email)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AWS_SES_ACCESS_KEY_ID` | SES-specific access key (optional) | - | No |
| `AWS_SES_SECRET_ACCESS_KEY` | SES-specific secret key (optional) | - | No |
| `AWS_SES_REGION` | SES region | `us-east-1` | Yes |
| `AWS_SES_FROM_EMAIL` | Sender email address | `noreply@broxiva.com` | Yes |
| `AWS_SES_FROM_NAME` | Sender display name | `Broxiva` | Yes |
| `AWS_SES_CONFIGURATION_SET` | SES configuration set | `broxiva-emails` | No |

#### SNS (SMS)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AWS_SNS_ACCESS_KEY_ID` | SNS-specific access key (optional) | - | No |
| `AWS_SNS_SECRET_ACCESS_KEY` | SNS-specific secret key (optional) | - | No |
| `AWS_SNS_REGION` | SNS region | `us-east-1` | Yes |
| `AWS_SNS_SENDER_ID` | SMS sender ID | `Broxiva` | No |
| `AWS_SNS_DEFAULT_SMS_TYPE` | `Transactional` or `Promotional` | `Transactional` | No |

#### SQS (Message Queue)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AWS_SQS_QUEUE_NAME` | Queue name | `broxiva-notifications` | If using SQS |
| `AWS_SQS_QUEUE_URL` | Full queue URL | - | If using SQS |
| `AWS_SQS_DLQ_URL` | Dead letter queue URL | - | Production |

### Storage Services

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `STORAGE_PROVIDER` | `S3`, `AZURE`, or `LOCAL` | `S3` | Yes |
| `STORAGE_BUCKET` | Storage bucket name | `broxiva-uploads` | Yes |

#### MinIO (Local S3-Compatible)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MINIO_ROOT_USER` | Admin username | `broxiva_admin` | For MinIO |
| `MINIO_ROOT_PASSWORD` | Admin password (min 8 chars) | - | For MinIO |
| `MINIO_ENDPOINT` | MinIO host | `localhost` | For MinIO |
| `MINIO_PORT` | MinIO port | `9000` | For MinIO |
| `MINIO_USE_SSL` | Enable SSL | `false` | For MinIO |

### Message Queue

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `RABBITMQ_USER` | RabbitMQ username | `broxiva` | For RabbitMQ |
| `RABBITMQ_PASSWORD` | RabbitMQ password | - | For RabbitMQ |
| `RABBITMQ_HOST` | RabbitMQ host | `localhost` | For RabbitMQ |
| `RABBITMQ_PORT` | RabbitMQ port | `5672` | For RabbitMQ |
| `RABBITMQ_URL` | Full connection URL | - | For RabbitMQ |
| `RABBITMQ_VHOST` | Virtual host | `/` | For RabbitMQ |

### Search Services

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SEARCH_PROVIDER` | `elasticsearch`, `algolia`, `internal`, or `auto` | `auto` | Yes |

#### Elasticsearch

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ELASTICSEARCH_NODE` | Elasticsearch URL | `http://localhost:9200` | If ES |
| `ELASTICSEARCH_USERNAME` | Username (if auth required) | - | No |
| `ELASTICSEARCH_PASSWORD` | Password (if auth required) | - | No |
| `ELASTICSEARCH_INDEX` | Primary index name | `broxiva-products` | If ES |
| `ELASTICSEARCH_INDEX_PREFIX` | Index prefix | `broxiva` | If ES |
| `ELASTICSEARCH_BULK_SIZE` | Bulk indexing size | `1000` | No |
| `ELASTICSEARCH_REQUEST_TIMEOUT` | Request timeout (ms) | `30000` | No |

#### Algolia

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ALGOLIA_APP_ID` | Application ID | - | If Algolia |
| `ALGOLIA_API_KEY` | Admin API key | - | If Algolia |
| `ALGOLIA_INDEX_NAME` | Index name | `broxiva_products` | If Algolia |

### Social Login (OAuth)

#### Google

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GOOGLE_CLIENT_ID` | OAuth client ID | - | For Google login |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | - | For Google login |
| `GOOGLE_REDIRECT_URI` | Callback URL | - | For Google login |

#### Facebook

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `FACEBOOK_APP_ID` | App ID | - | For Facebook login |
| `FACEBOOK_APP_SECRET` | App secret | - | For Facebook login |
| `FACEBOOK_REDIRECT_URI` | Callback URL | - | For Facebook login |

#### GitHub

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GITHUB_CLIENT_ID` | OAuth client ID | - | For GitHub login |
| `GITHUB_CLIENT_SECRET` | OAuth client secret | - | For GitHub login |
| `GITHUB_REDIRECT_URI` | Callback URL | - | For GitHub login |

#### Apple

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `APPLE_CLIENT_ID` | Services ID | `com.broxiva.app` | For Apple login |
| `APPLE_TEAM_ID` | Team ID | - | For Apple login |

### AI Services

#### OpenAI

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `OPENAI_API_KEY` | API key (sk-proj-*) | - | For AI features |
| `OPENAI_ORGANIZATION` | Organization ID | - | No |
| `OPENAI_MODEL` | Model to use | `gpt-4-turbo-preview` | No |
| `OPENAI_MAX_TOKENS` | Max response tokens | `2000` | No |
| `OPENAI_TEMPERATURE` | Response creativity (0-1) | `0.7` | No |

#### Anthropic (Claude)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ANTHROPIC_API_KEY` | API key (sk-ant-*) | - | For AI features |
| `ANTHROPIC_MODEL` | Model to use | `claude-3-5-sonnet-20241022` | No |
| `ANTHROPIC_MAX_TOKENS` | Max response tokens | `4000` | No |

#### LLM Provider Selection

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `LLM_PRIMARY_PROVIDER` | Primary: `openai` or `anthropic` | `openai` | No |
| `LLM_FALLBACK_PROVIDER` | Fallback provider | `anthropic` | No |
| `LLM_ENABLE_TEMPLATE_FALLBACK` | Use templates if LLM fails | `true` | No |

### KYC Verification

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `KYC_PROVIDER` | `onfido`, `jumio`, `sumsub`, or `mock` | `mock` | Yes |
| `KYC_OCR_PROVIDER` | OCR provider | `mock` | Yes |
| `KYC_FACE_PROVIDER` | Face verification provider | `mock` | Yes |
| `KYC_COMPLIANCE_PROVIDER` | AML screening provider | `mock` | Yes |
| `KYC_VERIFICATION_LEVEL` | `basic`, `standard`, or `enhanced` | `standard` | No |
| `KYC_AUTO_APPROVE_THRESHOLD` | Auto-approve score threshold | `0.85` | No |
| `KYC_MANUAL_REVIEW_THRESHOLD` | Manual review threshold | `0.65` | No |
| `KYC_ENABLE_COMPLIANCE_SCREENING` | Enable AML/PEP screening | `true` | No |
| `KYC_ENABLE_FACE_VERIFICATION` | Enable face matching | `true` | No |

### Tax Calculation

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `TAX_PROVIDER` | `taxjar`, `avalara`, or `none` | `none` | Yes |

#### TaxJar

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `TAXJAR_API_KEY` | TaxJar API key | - | If TaxJar |
| `TAXJAR_ENVIRONMENT` | `sandbox` or `production` | `sandbox` | If TaxJar |

#### Avalara

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AVALARA_ACCOUNT_ID` | Account ID | - | If Avalara |
| `AVALARA_LICENSE_KEY` | License key | - | If Avalara |
| `AVALARA_COMPANY_CODE` | Company code | `DEFAULT` | If Avalara |
| `AVALARA_ENVIRONMENT` | `sandbox` or `production` | `sandbox` | If Avalara |

### Monitoring & Logging

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error` | `debug` | No |
| `LOG_FORMAT` | `json` or `pretty` | `json` | No |
| `LOG_TO_FILE` | Write logs to file | `false` | No |
| `LOG_FILE_PATH` | Log file path | `/var/log/broxiva/api.log` | If file logging |
| `SENTRY_DSN` | Sentry project DSN | - | Production |
| `SENTRY_ENVIRONMENT` | Sentry environment name | `development` | If Sentry |
| `SENTRY_TRACES_SAMPLE_RATE` | Trace sampling rate (0-1) | `0.1` | If Sentry |
| `ENABLE_METRICS` | Enable Prometheus metrics | `true` | No |
| `METRICS_PORT` | Metrics endpoint port | `9090` | If metrics |

### Analytics & Marketing

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GOOGLE_ANALYTICS_ID` | GA tracking ID | - | No |
| `FACEBOOK_PIXEL_ID` | Facebook pixel ID | - | No |
| `FACEBOOK_ACCESS_TOKEN` | FB Conversions API token | - | No |
| `TIKTOK_PIXEL_ID` | TikTok pixel ID | - | No |
| `TIKTOK_ACCESS_TOKEN` | TikTok Events API token | - | No |

### reCAPTCHA Bot Protection

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `RECAPTCHA_SITE_KEY` | Public site key | - | If enabled |
| `RECAPTCHA_SECRET_KEY` | Secret key (server-side) | - | If enabled |
| `RECAPTCHA_SCORE_THRESHOLD` | v3 score threshold (0-1) | `0.5` | No |
| `RECAPTCHA_ENABLED` | Enable reCAPTCHA | `true` | No |
| `RECAPTCHA_EXEMPT_IPS` | IPs to skip verification | - | No |
| `RECAPTCHA_CACHE_TTL` | Cache TTL in seconds | `300` | No |

### Rate Limiting

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `THROTTLE_TTL` | Default window (seconds) | `60` | No |
| `THROTTLE_LIMIT` | Default requests per window | `100` | No |
| `THROTTLE_ANONYMOUS_TTL` | Anonymous user window | `60` | No |
| `THROTTLE_ANONYMOUS_LIMIT` | Anonymous requests per window | `30` | No |
| `THROTTLE_AUTH_TTL` | Auth endpoint window | `60` | No |
| `THROTTLE_AUTH_LIMIT` | Auth requests per window | `10` | No |
| `THROTTLE_WEBHOOK_TTL` | Webhook window | `60` | No |
| `THROTTLE_WEBHOOK_LIMIT` | Webhook requests per window | `100` | No |
| `THROTTLE_AI_TTL` | AI endpoint window | `60` | No |
| `THROTTLE_AI_LIMIT` | AI requests per window | `5` | No |

### MFA Enforcement

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MFA_REQUIRED_ROLES` | Roles requiring MFA | `ADMIN,VENDOR` | No |
| `MFA_GRACE_PERIOD_DAYS` | Days to set up MFA | `7` | No |
| `MFA_TRUSTED_DEVICE_DAYS` | Trust device duration | `30` | No |
| `MFA_ENABLE_TRUSTED_DEVICES` | Allow device trust | `true` | No |

### Admin Tools

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GRAFANA_ADMIN_USER` | Grafana admin username | `admin` | For Grafana |
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin password | - | For Grafana |
| `PGADMIN_DEFAULT_EMAIL` | pgAdmin admin email | `admin@broxiva.com` | For pgAdmin |
| `PGADMIN_DEFAULT_PASSWORD` | pgAdmin admin password | - | For pgAdmin |

### Feature Flags

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `FEATURE_AI_RECOMMENDATIONS` | Enable AI recommendations | `true` | No |
| `FEATURE_VISUAL_SEARCH` | Enable visual search | `true` | No |
| `FEATURE_LIVE_CHAT` | Enable live chat | `true` | No |
| `FEATURE_SOCIAL_LOGIN` | Enable social login | `true` | No |
| `FEATURE_MOBILE_APP_IAP` | Enable in-app purchases | `true` | No |

### Alert Notifications

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL | - | No |
| `PAGERDUTY_API_KEY` | PagerDuty integration key | - | No |
| `ALERT_EMAIL_RECIPIENTS` | Email recipients (comma-separated) | - | No |

### Frontend Public Configuration

These variables are safe to expose in client-side code (prefixed with `NEXT_PUBLIC_` or `EXPO_PUBLIC_`).

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:4000/api` |
| `NEXT_PUBLIC_AI_SERVICE_URL` | AI service URL | `http://localhost:8000` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | `ws://localhost:4000` |
| `NEXT_PUBLIC_APP_NAME` | Application name | `Broxiva` |
| `NEXT_PUBLIC_APP_URL` | Frontend URL | `http://localhost:3000` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key | - |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID | - |
| `NEXT_PUBLIC_GITHUB_CLIENT_ID` | GitHub OAuth client ID | - |
| `NEXT_PUBLIC_FACEBOOK_APP_ID` | Facebook app ID | - |
| `NEXT_PUBLIC_APPLE_CLIENT_ID` | Apple client ID | - |
| `NEXT_PUBLIC_ENABLE_AI_FEATURES` | Enable AI features | `true` |
| `NEXT_PUBLIC_ENABLE_AR_TRYON` | Enable AR try-on | `true` |
| `NEXT_PUBLIC_ENABLE_VOICE_SEARCH` | Enable voice search | `true` |
| `NEXT_PUBLIC_ENABLE_CHATBOT` | Enable chatbot | `true` |
| `NEXT_PUBLIC_GA_TRACKING_ID` | Google Analytics ID | - |
| `NEXT_PUBLIC_FB_PIXEL_ID` | Facebook pixel ID | - |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | TikTok pixel ID | - |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (frontend) | - |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web push VAPID key | - |

---

## Secret Rotation

### Rotation Schedule

| Secret Type | Recommended Frequency |
|-------------|----------------------|
| Database passwords | Every 90 days |
| JWT secrets | Every 90 days |
| API keys (third-party) | Every 90 days |
| Encryption keys | Every 1 year (with data re-encryption) |
| Admin tool passwords | Every 90 days |

### Rotation Procedure

1. Generate new secret using appropriate command
2. Update secrets manager (AWS Secrets Manager, Vault, etc.)
3. Deploy updated secrets to staging
4. Test all affected functionality
5. Deploy to production during low-traffic window
6. Monitor for errors
7. Remove old secrets after grace period

### Emergency Rotation

If a secret is compromised:

1. **Immediately** generate new secret
2. Update all environments
3. Invalidate old sessions (if JWT secrets)
4. Audit access logs
5. Notify security team
6. Document incident

---

## See Also

- [Security Setup Guide](./SECURITY_SETUP.md)
- [Payment Gateway Setup](./PAYMENT_GATEWAY_SETUP.md)
- [Deployment Guide](./DEPLOYMENT.md)
