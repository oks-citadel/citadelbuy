# Broxiva Production Configuration Checklist

This document provides a comprehensive checklist of all environment variables and configurations that must be set before deploying to production.

## Table of Contents

1. [Pre-Deployment Overview](#pre-deployment-overview)
2. [Database Credentials](#1-database-credentials)
3. [Cache & Message Queue](#2-cache--message-queue)
4. [Authentication & Security](#3-authentication--security)
5. [Payment Providers](#4-payment-providers)
6. [In-App Purchases (Mobile)](#5-in-app-purchases-mobile)
7. [AWS Services](#6-aws-services)
8. [OAuth / Social Login](#7-oauth--social-login)
9. [Search Services](#8-search-services)
10. [Monitoring & Error Tracking](#9-monitoring--error-tracking)
11. [Push Notifications (Firebase)](#10-push-notifications-firebase)
12. [Email Service](#11-email-service)
13. [AI Services](#12-ai-services)
14. [Analytics & Marketing](#13-analytics--marketing)
15. [Admin Tools](#14-admin-tools)
16. [KYC Verification](#15-kyc-verification)
17. [Alert Notifications](#16-alert-notifications)
18. [Security Settings](#17-security-settings)
19. [Infrastructure Configuration](#18-infrastructure-configuration)
20. [Secret Rotation Schedule](#19-secret-rotation-schedule)
21. [Final Deployment Checklist](#20-final-deployment-checklist)

---

## Pre-Deployment Overview

### Secret Generation Commands

```bash
# Generate JWT secrets (64+ characters, base64)
openssl rand -base64 64

# Generate encryption keys (32 bytes = 64 hex characters)
openssl rand -hex 32

# Generate database/admin passwords (32+ characters)
openssl rand -base64 32
```

### Secret Management Recommendations

| Environment | Recommended Storage |
|------------|---------------------|
| AWS | AWS Secrets Manager or Systems Manager Parameter Store |
| GCP | Google Cloud Secret Manager |
| Kubernetes | External Secrets Operator + Vault |

---

## 1. Database Credentials

### PostgreSQL

| Variable | Description | Requirements | How to Obtain |
|----------|-------------|--------------|---------------|
| `POSTGRES_USER` | Database username | Use non-default username | Set during DB creation |
| `POSTGRES_PASSWORD` | Database password | Min 32 characters, random | `openssl rand -base64 32` |
| `POSTGRES_DB` | Database name | Use `broxiva_production` | Set during DB creation |
| `DATABASE_URL` | Full connection string | URL-encode special chars | Construct from above |

**Connection String Format:**
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public&sslmode=require
```

**Action Items:**
- [ ] Generate strong password (32+ chars)
- [ ] Create database user with minimal required permissions
- [ ] Enable SSL/TLS for database connections
- [ ] Set up connection pooling (recommended: pgBouncer)
- [ ] Configure backup strategy

### MongoDB (if used)

| Variable | Description | Requirements |
|----------|-------------|--------------|
| `MONGO_USER` | MongoDB username | Non-default |
| `MONGO_PASSWORD` | MongoDB password | Min 32 characters |

---

## 2. Cache & Message Queue

### Redis

| Variable | Description | Requirements | How to Obtain |
|----------|-------------|--------------|---------------|
| `REDIS_HOST` | Redis server hostname | Use private endpoint | Infrastructure setup |
| `REDIS_PORT` | Redis port | Default: 6379 | Infrastructure setup |
| `REDIS_PASSWORD` | Redis AUTH password | Min 32 characters | `openssl rand -base64 32` |
| `REDIS_URL` | Full Redis connection URL | Include password | Construct from above |
| `REDIS_TLS` | Enable TLS | `true` for production | Set to `true` |

**Connection String Format:**
```
redis://:PASSWORD@HOST:PORT
# With TLS:
rediss://:PASSWORD@HOST:PORT
```

**Action Items:**
- [ ] Generate Redis password
- [ ] Enable TLS encryption
- [ ] Configure maxmemory policy
- [ ] Set up Redis persistence

### RabbitMQ

| Variable | Description | Requirements |
|----------|-------------|--------------|
| `RABBITMQ_USER` | RabbitMQ username | Non-default |
| `RABBITMQ_PASSWORD` | RabbitMQ password | Min 32 characters |
| `RABBITMQ_HOST` | Server hostname | Private endpoint |
| `RABBITMQ_VHOST` | Virtual host | Default: `/` |

**Action Items:**
- [ ] Create dedicated vhost for production
- [ ] Set up TLS for connections
- [ ] Configure high availability (if needed)

---

## 3. Authentication & Security

### JWT Configuration

| Variable | Description | Requirements | How to Obtain |
|----------|-------------|--------------|---------------|
| `JWT_SECRET` | Access token signing key | Min 64 chars, base64 | `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | Refresh token signing key | Min 64 chars, DIFFERENT from JWT_SECRET | `openssl rand -base64 64` |
| `JWT_EXPIRES_IN` | Access token expiry | Recommended: `1h` | Configure based on needs |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | Recommended: `7d` | Configure based on needs |

**CRITICAL:**
- JWT_SECRET and JWT_REFRESH_SECRET MUST be different
- Changing these in production will invalidate all user sessions

**Action Items:**
- [ ] Generate unique JWT_SECRET
- [ ] Generate unique JWT_REFRESH_SECRET (different from JWT_SECRET)
- [ ] Verify both secrets are at least 64 characters
- [ ] Document secret rotation procedure

### Encryption Keys

| Variable | Description | Requirements | How to Obtain |
|----------|-------------|--------------|---------------|
| `ENCRYPTION_KEY` | General data encryption | EXACTLY 64 hex chars (32 bytes) | `openssl rand -hex 32` |
| `KYC_ENCRYPTION_KEY` | KYC document encryption | EXACTLY 64 hex chars (32 bytes) | `openssl rand -hex 32` |
| `SESSION_SECRET` | Session cookie signing | Min 64 characters | `openssl rand -base64 64` |

**WARNING:** If encryption keys are lost, encrypted data CANNOT be recovered!

**Action Items:**
- [ ] Generate ENCRYPTION_KEY (exactly 64 hex characters)
- [ ] Generate KYC_ENCRYPTION_KEY (exactly 64 hex characters)
- [ ] Generate SESSION_SECRET
- [ ] Back up encryption keys securely (offline, encrypted)
- [ ] Document key recovery procedure

---

## 4. Payment Providers

### Stripe (Primary - Required)

| Variable | Description | Requirements | Where to Get |
|----------|-------------|--------------|--------------|
| `STRIPE_ENABLED` | Enable Stripe | `true` | Set to `true` |
| `STRIPE_SECRET_KEY` | API secret key | Must start with `sk_live_` | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `STRIPE_PUBLISHABLE_KEY` | Public API key | Must start with `pk_live_` | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | Starts with `whsec_` | [Stripe Webhooks](https://dashboard.stripe.com/webhooks) |
| `APPLE_MERCHANT_ID` | Apple Pay merchant ID | Format: `merchant.com.broxiva` | [Apple Developer](https://developer.apple.com) |
| `GOOGLE_MERCHANT_ID` | Google Pay merchant ID | Format: `BCR2DN4TXXXXXXXX` | [Google Pay Console](https://pay.google.com/business/console) |

**Webhook Endpoint:** `https://api.yourdomain.com/webhooks/stripe`

**Action Items:**
- [ ] Obtain LIVE Stripe API keys (not test keys)
- [ ] Create webhook endpoint in Stripe Dashboard
- [ ] Configure Apple Pay domain verification
- [ ] Test payment flow with live keys in staging first

### PayPal (Secondary - Optional)

| Variable | Description | Requirements | Where to Get |
|----------|-------------|--------------|--------------|
| `PAYPAL_ENABLED` | Enable PayPal | `true` or `false` | Set based on needs |
| `PAYPAL_CLIENT_ID` | REST API Client ID | Live credentials | [PayPal Developer](https://developer.paypal.com/dashboard) |
| `PAYPAL_CLIENT_SECRET` | REST API Secret | Live credentials | [PayPal Developer](https://developer.paypal.com/dashboard) |
| `PAYPAL_MODE` | Environment mode | Must be `live` | Set to `live` |
| `PAYPAL_WEBHOOK_ID` | Webhook ID | From webhook config | [PayPal Webhooks](https://developer.paypal.com/dashboard/applications) |

**Action Items:**
- [ ] Create PayPal Business account (if not exists)
- [ ] Obtain LIVE credentials (not sandbox)
- [ ] Set PAYPAL_MODE to `live`
- [ ] Configure webhook endpoint

### Flutterwave (African Markets - Optional)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `FLUTTERWAVE_ENABLED` | Enable Flutterwave | Set based on needs |
| `FLUTTERWAVE_PUBLIC_KEY` | Public key | [Flutterwave Dashboard](https://dashboard.flutterwave.com) |
| `FLUTTERWAVE_SECRET_KEY` | Secret key | [Flutterwave Dashboard](https://dashboard.flutterwave.com) |
| `FLUTTERWAVE_ENCRYPTION_KEY` | Encryption key | [Flutterwave Dashboard](https://dashboard.flutterwave.com) |
| `FLUTTERWAVE_WEBHOOK_SECRET` | Webhook secret | [Flutterwave Dashboard](https://dashboard.flutterwave.com) |

### Paystack (Nigeria, Ghana, South Africa - Optional)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `PAYSTACK_ENABLED` | Enable Paystack | Set based on needs |
| `PAYSTACK_PUBLIC_KEY` | Public key (pk_live_) | [Paystack Dashboard](https://dashboard.paystack.com) |
| `PAYSTACK_SECRET_KEY` | Secret key (sk_live_) | [Paystack Dashboard](https://dashboard.paystack.com) |

---

## 5. In-App Purchases (Mobile)

### Apple In-App Purchases (iOS)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `APPLE_BUNDLE_ID` | App bundle identifier | Your app config |
| `APPLE_SHARED_SECRET` | App-specific shared secret | [App Store Connect](https://appstoreconnect.apple.com) > Your App > In-App Purchases > App-Specific Shared Secret |
| `APPLE_ISSUER_ID` | StoreKit 2 Issuer ID | [App Store Connect](https://appstoreconnect.apple.com) > Users and Access > Keys |
| `APPLE_KEY_ID` | StoreKit 2 Key ID | [App Store Connect](https://appstoreconnect.apple.com) > Users and Access > Keys |
| `APPLE_PRIVATE_KEY` | StoreKit 2 Private Key (.p8) | Download from App Store Connect |

**Action Items:**
- [ ] Generate App-Specific Shared Secret
- [ ] Create StoreKit 2 API Key
- [ ] Download and securely store private key
- [ ] Configure Server Notifications URL

### Google Play Billing (Android)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `GOOGLE_PACKAGE_NAME` | App package name | Your app config (e.g., `com.broxiva.app`) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email | [Google Cloud Console](https://console.cloud.google.com) > IAM |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Service account key | [Google Cloud Console](https://console.cloud.google.com) > IAM > Service Accounts |

**Action Items:**
- [ ] Create service account in Google Cloud
- [ ] Grant "Android Publisher" API access
- [ ] Link service account to Play Console
- [ ] Download JSON credentials

---

## 6. AWS Services

### Core AWS Credentials

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `AWS_ACCESS_KEY_ID` | IAM access key | [AWS IAM Console](https://console.aws.amazon.com/iam) |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key | [AWS IAM Console](https://console.aws.amazon.com/iam) |
| `AWS_REGION` | Default region | e.g., `us-east-1` |

**Best Practice:** Use IAM roles instead of access keys when running on AWS (EC2, ECS, EKS)

### AWS S3 (File Storage)

| Variable | Description | Requirements |
|----------|-------------|--------------|
| `AWS_S3_BUCKET` | S3 bucket name | Globally unique |
| `STORAGE_BUCKET` | KYC documents bucket | Separate from uploads |

**Action Items:**
- [ ] Create S3 buckets with proper naming
- [ ] Configure bucket policies (block public access)
- [ ] Enable versioning
- [ ] Set up lifecycle rules

### AWS SES (Email)

| Variable | Description | Requirements |
|----------|-------------|--------------|
| `AWS_SES_ACCESS_KEY_ID` | SES-specific access key | Or use shared AWS credentials |
| `AWS_SES_SECRET_ACCESS_KEY` | SES-specific secret key | Or use shared AWS credentials |
| `AWS_SES_REGION` | SES region | Must be SES-enabled region |
| `AWS_SES_FROM_EMAIL` | Verified sender email | Must be verified in SES |
| `AWS_SES_FROM_NAME` | Sender display name | e.g., `Broxiva` |
| `AWS_SES_CONFIGURATION_SET` | SES configuration set | For tracking |

**Action Items:**
- [ ] Request SES production access (move out of sandbox)
- [ ] Verify sender domain/email
- [ ] Create configuration set for tracking
- [ ] Set up SNS notifications for bounces/complaints

### AWS SNS (SMS)

| Variable | Description | Requirements |
|----------|-------------|--------------|
| `AWS_SNS_ACCESS_KEY_ID` | SNS-specific access key | Or use shared AWS credentials |
| `AWS_SNS_SECRET_ACCESS_KEY` | SNS-specific secret key | Or use shared AWS credentials |
| `AWS_SNS_REGION` | SNS region | Must support SMS |
| `AWS_SNS_SENDER_ID` | SMS sender ID | e.g., `Broxiva` |
| `AWS_SNS_DEFAULT_SMS_TYPE` | SMS type | `Transactional` or `Promotional` |

**Action Items:**
- [ ] Request SMS spending limit increase
- [ ] Register sender ID (if required in target countries)
- [ ] Configure opt-out handling

### AWS SQS (Message Queue)

| Variable | Description | Requirements |
|----------|-------------|--------------|
| `AWS_SQS_ACCESS_KEY_ID` | SQS-specific access key | Or use shared AWS credentials |
| `AWS_SQS_SECRET_ACCESS_KEY` | SQS-specific secret key | Or use shared AWS credentials |
| `AWS_SQS_REGION` | SQS region | Same as application |
| `AWS_SQS_QUEUE_NAME` | Queue name | e.g., `broxiva-notifications` |
| `AWS_SQS_QUEUE_URL` | Full queue URL | From SQS console |
| `AWS_SQS_DLQ_URL` | Dead letter queue URL | For failed messages |

**Action Items:**
- [ ] Create main queue and DLQ
- [ ] Configure redrive policy
- [ ] Set appropriate visibility timeout

---

## 7. OAuth / Social Login

### Google OAuth

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `GOOGLE_CLIENT_ID` | OAuth Client ID | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_REDIRECT_URI` | Callback URL | Configure in Google Console |

**Callback URL:** `https://yourdomain.com/auth/google/callback`

**Action Items:**
- [ ] Create OAuth 2.0 Client ID
- [ ] Configure authorized redirect URIs
- [ ] Add production domain to authorized origins

### Facebook OAuth

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `FACEBOOK_APP_ID` | Facebook App ID | [Facebook Developers](https://developers.facebook.com/apps) |
| `FACEBOOK_APP_SECRET` | Facebook App Secret | [Facebook Developers](https://developers.facebook.com/apps) |
| `FACEBOOK_REDIRECT_URI` | Callback URL | Configure in Facebook App |

**Action Items:**
- [ ] Create Facebook App (or use existing)
- [ ] Configure Valid OAuth Redirect URIs
- [ ] Complete App Review for public access

### Apple Sign In

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `APPLE_CLIENT_ID` | Services ID | [Apple Developer](https://developer.apple.com/account/resources/identifiers) |
| `APPLE_TEAM_ID` | Team ID | [Apple Developer](https://developer.apple.com/account) |
| `APPLE_KEY_ID` | Key ID | [Apple Developer](https://developer.apple.com/account/resources/authkeys) |
| `APPLE_PRIVATE_KEY` | Private key (.p8) | Download from Apple Developer |

**Action Items:**
- [ ] Register Services ID
- [ ] Create Sign In with Apple key
- [ ] Configure return URLs

### GitHub OAuth

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `GITHUB_CLIENT_ID` | OAuth App Client ID | [GitHub Settings](https://github.com/settings/developers) |
| `GITHUB_CLIENT_SECRET` | OAuth App Secret | [GitHub Settings](https://github.com/settings/developers) |

**Action Items:**
- [ ] Create OAuth App in GitHub
- [ ] Configure callback URL

---

## 8. Search Services

### Elasticsearch

| Variable | Description | Requirements |
|----------|-------------|--------------|
| `ELASTICSEARCH_NODE` | Elasticsearch URL | Include port |
| `ELASTICSEARCH_USERNAME` | Auth username | Usually `elastic` |
| `ELASTICSEARCH_PASSWORD` | Auth password | Min 32 characters |
| `ELASTICSEARCH_INDEX_PREFIX` | Index name prefix | e.g., `broxiva` |
| `ELASTICSEARCH_SSL_VERIFY` | Verify SSL certs | `true` for production |

**Action Items:**
- [ ] Set up Elasticsearch cluster (or use managed service)
- [ ] Configure authentication
- [ ] Create index templates
- [ ] Set up index lifecycle management

### Algolia (Alternative)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `ALGOLIA_APP_ID` | Application ID | [Algolia Dashboard](https://www.algolia.com/account/api-keys) |
| `ALGOLIA_API_KEY` | Admin API Key | [Algolia Dashboard](https://www.algolia.com/account/api-keys) |
| `ALGOLIA_INDEX_NAME` | Index name | Create in Algolia |

---

## 9. Monitoring & Error Tracking

### Sentry

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `SENTRY_DSN` | Data Source Name | [Sentry Settings](https://sentry.io/settings/projects) |
| `SENTRY_ENVIRONMENT` | Environment name | Set to `production` |
| `SENTRY_RELEASE` | Release version | Your app version |
| `SENTRY_TRACES_SAMPLE_RATE` | Performance sampling | `0.1` recommended |
| `SENTRY_AUTH_TOKEN` | Auth token (for releases) | [Sentry Settings](https://sentry.io/settings/account/api/auth-tokens) |
| `NEXT_PUBLIC_SENTRY_DSN` | Frontend DSN | Same as SENTRY_DSN |

**Action Items:**
- [ ] Create Sentry project
- [ ] Configure alert rules
- [ ] Set up release tracking
- [ ] Configure issue owners

### APM (Optional)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `NEW_RELIC_LICENSE_KEY` | New Relic license | [New Relic](https://one.newrelic.com) |
| `NEW_RELIC_APP_NAME` | Application name | Your app name |
| `DATADOG_API_KEY` | Datadog API key | [Datadog](https://app.datadoghq.com) |

---

## 10. Push Notifications (Firebase)

### Firebase Cloud Messaging (FCM)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `FIREBASE_PROJECT_ID` | Firebase project ID | [Firebase Console](https://console.firebase.google.com) |
| `FIREBASE_CREDENTIALS_JSON` | Service account JSON | Firebase Console > Project Settings > Service Accounts |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to credentials file | Alternative to JSON content |

**Action Items:**
- [ ] Create Firebase project
- [ ] Generate service account key
- [ ] Configure APNs for iOS (upload .p8 key)
- [ ] Set up notification channels/topics

---

## 11. Email Service

### SendGrid (Recommended)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `SENDGRID_API_KEY` | API key (starts with SG.) | [SendGrid Settings](https://app.sendgrid.com/settings/api_keys) |
| `SENDGRID_FROM_EMAIL` | Verified sender email | Verify in SendGrid |
| `SENDGRID_FROM_NAME` | Sender display name | e.g., `Broxiva` |

### SMTP (Alternative)

| Variable | Description | Requirements |
|----------|-------------|--------------|
| `EMAIL_HOST` | SMTP server | e.g., `smtp.sendgrid.net` |
| `EMAIL_PORT` | SMTP port | Usually `587` (TLS) |
| `EMAIL_USER` | SMTP username | Provider-specific |
| `EMAIL_PASSWORD` | SMTP password | Provider-specific |
| `EMAIL_FROM` | From address | Must be verified |
| `EMAIL_SECURE` | Use TLS | `true` for production |

**Action Items:**
- [ ] Verify sender domain (SPF, DKIM, DMARC)
- [ ] Set up email templates
- [ ] Configure bounce handling
- [ ] Test email deliverability

---

## 12. AI Services

### OpenAI

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `OPENAI_API_KEY` | API key (sk-proj-...) | [OpenAI Platform](https://platform.openai.com/api-keys) |
| `OPENAI_MODEL` | Model to use | e.g., `gpt-4` |
| `OPENAI_MAX_TOKENS` | Max response tokens | e.g., `2000` |

**Action Items:**
- [ ] Set up usage limits/alerts
- [ ] Configure rate limiting
- [ ] Monitor costs

### Google Cloud Vision

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `GOOGLE_CLOUD_PROJECT_ID` | GCP project ID | [Google Cloud Console](https://console.cloud.google.com) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON | GCP IAM |

---

## 13. Analytics & Marketing

### Facebook Conversions API

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `FACEBOOK_PIXEL_ID` | Pixel ID | [Facebook Business](https://business.facebook.com) |
| `FACEBOOK_ACCESS_TOKEN` | Access token | [Facebook Business](https://business.facebook.com) |

### TikTok Events API

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `TIKTOK_PIXEL_ID` | Pixel ID | [TikTok Ads](https://ads.tiktok.com) |
| `TIKTOK_ACCESS_TOKEN` | Access token | [TikTok Ads](https://ads.tiktok.com) |

### Google Analytics

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `GOOGLE_ANALYTICS_ID` | Measurement ID | [Google Analytics](https://analytics.google.com) |
| `NEXT_PUBLIC_GA_TRACKING_ID` | Frontend tracking ID | Same as above |

---

## 14. Admin Tools

### Grafana

| Variable | Description | Requirements |
|----------|-------------|--------------|
| `GRAFANA_ADMIN_USER` | Admin username | Change from default |
| `GRAFANA_ADMIN_PASSWORD` | Admin password | Min 32 characters |

### pgAdmin

| Variable | Description | Requirements |
|----------|-------------|--------------|
| `PGADMIN_DEFAULT_EMAIL` | Admin email | Your admin email |
| `PGADMIN_DEFAULT_PASSWORD` | Admin password | Min 32 characters |

**Action Items:**
- [ ] Change default admin credentials
- [ ] Restrict access to internal network
- [ ] Enable audit logging

---

## 15. KYC Verification

### Provider Selection

| Variable | Options | Description |
|----------|---------|-------------|
| `KYC_OCR_PROVIDER` | `aws_textract`, `google_vision`, `tesseract`, `mock` | Document text extraction |
| `KYC_FACE_PROVIDER` | `aws_rekognition`, `face_plusplus`, `mock` | Face verification |
| `KYC_COMPLIANCE_PROVIDER` | `complyadvantage`, `refinitiv`, `dowjones`, `lexisnexis`, `mock` | Sanctions/PEP screening |

### Provider Credentials

| Provider | Variables | Where to Get |
|----------|-----------|--------------|
| AWS Textract/Rekognition | Use AWS credentials | AWS Console |
| Face++ | `FACEPP_API_KEY`, `FACEPP_API_SECRET` | [Face++](https://www.faceplusplus.com) |
| ComplyAdvantage | `COMPLYADVANTAGE_API_KEY` | [ComplyAdvantage](https://complyadvantage.com) |
| Refinitiv | `REFINITIV_API_KEY`, `REFINITIV_API_SECRET` | Contact Refinitiv |
| Dow Jones | `DOWJONES_API_KEY`, `DOWJONES_API_SECRET` | Contact Dow Jones |
| LexisNexis | `LEXISNEXIS_API_KEY`, `LEXISNEXIS_CUSTOMER_ID` | Contact LexisNexis |

---

## 16. Alert Notifications

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `SLACK_WEBHOOK_URL` | Slack incoming webhook | [Slack API](https://api.slack.com/messaging/webhooks) |
| `PAGERDUTY_API_KEY` | PagerDuty integration key | [PagerDuty](https://support.pagerduty.com/docs/services-and-integrations) |
| `ALERT_EMAIL_RECIPIENTS` | Alert email list | Comma-separated emails |

**Action Items:**
- [ ] Create Slack channel for alerts
- [ ] Configure PagerDuty escalation policies
- [ ] Test alert delivery

---

## 17. Security Settings

### reCAPTCHA

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `RECAPTCHA_SITE_KEY` | Public site key | [Google reCAPTCHA](https://www.google.com/recaptcha/admin) |
| `RECAPTCHA_SECRET_KEY` | Secret key (server-side) | [Google reCAPTCHA](https://www.google.com/recaptcha/admin) |
| `RECAPTCHA_SCORE_THRESHOLD` | v3 score threshold | `0.5` recommended |
| `RECAPTCHA_ENABLED` | Enable/disable | `true` for production |

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `THROTTLE_TTL` | `60` | Time window in seconds |
| `THROTTLE_LIMIT` | `100` | Max requests per window |

### CORS

| Variable | Description | Production Value |
|----------|-------------|------------------|
| `CORS_ORIGIN` | Allowed origins | Your production domains only |
| `CORS_CREDENTIALS` | Allow credentials | `true` |

---

## 18. Infrastructure Configuration

### Terraform Variables (AWS)

| Variable | Description | Requirements |
|----------|-------------|--------------|
| `db_admin_password` | Database admin password | Generated |
| `jwt_secret` | JWT signing secret | Generated |
| `oncall_email` | On-call alert email | Team email |
| `team_email` | Team alert email | Team email |
| `pagerduty_webhook_url` | PagerDuty webhook | PagerDuty config |
| `slack_webhook_url` | Slack webhook | Slack config |

### Kubernetes External Secrets

For Kubernetes deployments, configure External Secrets Operator with your secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault):

| Secret Name | K8s Secret Key |
|-------------|----------------|
| `jwt-access-secret` | `JWT_SECRET` |
| `jwt-refresh-secret` | `JWT_REFRESH_SECRET` |
| `session-secret` | `SESSION_SECRET` |
| `encryption-key` | `ENCRYPTION_KEY` |
| `kyc-encryption-key` | `KYC_ENCRYPTION_KEY` |
| `postgres-password` | `POSTGRES_PASSWORD` |
| `postgres-url` | `DATABASE_URL` |
| `redis-password` | `REDIS_PASSWORD` |
| `stripe-secret-key` | `STRIPE_SECRET_KEY` |
| `stripe-webhook-secret` | `STRIPE_WEBHOOK_SECRET` |
| `sendgrid-api-key` | `SENDGRID_API_KEY` |
| `openai-api-key` | `OPENAI_API_KEY` |

---

## 19. Secret Rotation Schedule

| Secret Type | Rotation Period | Notes |
|-------------|-----------------|-------|
| Database passwords | 90 days | Coordinate with backup strategy |
| JWT secrets | 180 days | Will invalidate all sessions |
| API keys (general) | 90 days | May require provider coordination |
| Encryption keys | 365 days | Requires data re-encryption |
| OAuth secrets | As needed | Usually when compromised |

**Rotation Procedure:**
1. Generate new secret
2. Update in secrets manager
3. Deploy with new secret
4. Verify application functionality
5. Revoke old secret

---

## 20. Final Deployment Checklist

### Security Checklist

- [ ] All `CHANGEME`, `REPLACE`, `EXAMPLE`, and placeholder values replaced
- [ ] All secrets are cryptographically random (used openssl commands)
- [ ] JWT_SECRET and JWT_REFRESH_SECRET are different from each other
- [ ] All passwords are at least 32 characters
- [ ] Encryption keys are exactly 64 hex characters (32 bytes)
- [ ] Using LIVE payment credentials (not test/sandbox)
- [ ] NODE_ENV set to `production`
- [ ] PAYPAL_MODE set to `live`
- [ ] CORS restricted to production domains (no wildcards)
- [ ] SSL/TLS enabled for all connections
- [ ] Secrets stored in secrets manager (not .env files)
- [ ] .env files in .gitignore

### Infrastructure Checklist

- [ ] Database backups configured and tested
- [ ] Redis persistence enabled
- [ ] SSL certificates installed and auto-renewal configured
- [ ] CDN configured for static assets
- [ ] Health checks enabled
- [ ] Monitoring and alerting configured
- [ ] Log aggregation set up

### Payment Checklist

- [ ] Webhook endpoints configured in Stripe Dashboard
- [ ] Webhook endpoints configured in PayPal Dashboard
- [ ] Apple Pay domain verification completed
- [ ] Test transactions verified in staging

### Compliance Checklist

- [ ] GDPR compliance enabled (`GDPR_ENABLED=true`)
- [ ] CCPA compliance enabled (`CCPA_ENABLED=true`)
- [ ] Cookie consent configured
- [ ] Data retention policies documented
- [ ] KYC providers configured and tested

### Documentation Checklist

- [ ] Secret locations documented
- [ ] Team access to secrets manager granted
- [ ] Rotation procedures documented
- [ ] Incident response plan in place
- [ ] Recovery procedures tested

---

## Quick Reference: File Locations

| Configuration File | Purpose |
|-------------------|---------|
| `.env.example` | Base environment template |
| `.env.docker.example` | Docker Compose template |
| `.env.payment.example` | Payment provider template |
| `.env.production.example` | Production environment template |
| `.env.production.template` | Detailed production template |
| `.env.secure.example` | Security-focused template |
| `docker-compose.yml` | Development Docker stack |
| `docker-compose.production.yml` | Production Docker stack |
| `infrastructure/terraform/` | Terraform configurations |
| `infrastructure/kubernetes/production/` | K8s production configs |

---

## Support

For assistance with production configuration:
- Review docs in `docs/root/SECURITY_CREDENTIALS.md`
- Check `docs/root/SECRETS_MANAGER_SETUP.md`
- See `docs/root/CREDENTIAL_ROTATION_CHECKLIST.md`
- See `docs/API_SECRET_DEPENDENCY_MATRIX.md` for secret dependencies

**Last Updated:** January 2026
