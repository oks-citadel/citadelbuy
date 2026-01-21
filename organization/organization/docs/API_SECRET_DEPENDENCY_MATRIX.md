# API/Service to Secret Dependency Matrix

**Generated:** 2025-12-12
**Platform:** Broxiva Global E-Commerce

## Overview

This document maps each API module/service to its required secrets and environment variables. Use this for:
- Vault configuration per environment
- Secret rotation impact analysis
- Troubleshooting service failures
- Security audits

---

## Secret Dependency Matrix

### Authentication & Account Services

| Service | Module Path | Required Secrets | Optional Secrets |
|---------|-------------|------------------|------------------|
| Auth Service | `auth/auth.service.ts` | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL` | `FACEBOOK_APP_SECRET`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_SECRET`, `APPLE_PRIVATE_KEY` |
| JWT Strategy | `auth/strategies/jwt.strategy.ts` | `JWT_SECRET` | - |
| Social Auth | `auth/strategies/*.strategy.ts` | Provider-specific client secrets | `GOOGLE_REDIRECT_URI`, `FACEBOOK_REDIRECT_URI` |
| Session Management | `me/me.service.ts` | `DATABASE_URL`, `SESSION_SECRET` | - |
| MFA Service | `auth/auth.service.ts` | `DATABASE_URL`, `ENCRYPTION_KEY` | - |

### User & Profile Services

| Service | Module Path | Required Secrets | Optional Secrets |
|---------|-------------|------------------|------------------|
| Users Service | `users/users.service.ts` | `DATABASE_URL` | `REDIS_URL` |
| Profile Service | `users/profile.service.ts` | `DATABASE_URL` | `STORAGE_BUCKET`, `CDN_URL` |
| Addresses Service | `users/addresses.service.ts` | `DATABASE_URL` | - |
| Privacy Service | `privacy/privacy.service.ts` | `DATABASE_URL`, `ENCRYPTION_KEY` | - |

### Catalog & Product Services

| Service | Module Path | Required Secrets | Optional Secrets |
|---------|-------------|------------------|------------------|
| Products Service | `products/products.service.ts` | `DATABASE_URL` | `REDIS_URL`, `ELASTICSEARCH_NODE` |
| Categories Service | `categories/categories.service.ts` | `DATABASE_URL` | `REDIS_URL` |
| Variants Service | `variants/variants.service.ts` | `DATABASE_URL` | - |
| Reviews Service | `reviews/reviews.service.ts` | `DATABASE_URL` | `REDIS_URL` |
| Search Service | `search/search.service.ts` | `DATABASE_URL` | `ELASTICSEARCH_NODE`, `ELASTICSEARCH_USERNAME`, `ELASTICSEARCH_PASSWORD`, `ALGOLIA_APP_ID`, `ALGOLIA_API_KEY` |
| Wishlist Service | `wishlist/wishlist.service.ts` | `DATABASE_URL`, `REDIS_URL` | - |

### Cart & Checkout Services

| Service | Module Path | Required Secrets | Optional Secrets |
|---------|-------------|------------------|------------------|
| Cart Service | `cart/cart.service.ts` | `DATABASE_URL`, `REDIS_URL` | - |
| Checkout Service | `checkout/checkout.service.ts` | `DATABASE_URL`, `STRIPE_SECRET_KEY` | `PAYPAL_CLIENT_SECRET`, `TAX_API_KEY` |
| Coupons Service | `coupons/coupons.service.ts` | `DATABASE_URL` | `REDIS_URL` |
| Gift Cards Service | `gift-cards/gift-cards.service.ts` | `DATABASE_URL`, `ENCRYPTION_KEY` | - |

### Orders & Payments Services

| Service | Module Path | Required Secrets | Optional Secrets |
|---------|-------------|------------------|------------------|
| Orders Service | `orders/orders.service.ts` | `DATABASE_URL` | `REDIS_URL`, `WEBHOOK_SECRET` |
| Payments Service | `payments/payments.service.ts` | `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | `PAYPAL_CLIENT_SECRET`, `FLUTTERWAVE_SECRET_KEY`, `PAYSTACK_SECRET_KEY` |
| Stripe Provider | `payments/providers/stripe.provider.ts` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | `STRIPE_PUBLISHABLE_KEY` |
| PayPal Provider | `payments/providers/paypal.provider.ts` | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | `PAYPAL_WEBHOOK_ID` |
| Flutterwave Provider | `payments/providers/flutterwave.provider.ts` | `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_ENCRYPTION_KEY` | `FLUTTERWAVE_WEBHOOK_SECRET` |
| Paystack Provider | `payments/providers/paystack.provider.ts` | `PAYSTACK_SECRET_KEY` | - |
| Exchange Rate Service | `payments/multi-currency/exchange-rate.service.ts` | `OPENEXCHANGERATES_API_KEY` | - |
| Refunds Service | `payments/refunds.service.ts` | `DATABASE_URL`, Provider secrets | - |
| Vendor Payouts | `payments/vendor-payouts.service.ts` | `DATABASE_URL`, `STRIPE_SECRET_KEY` | - |

### Shipping & Logistics Services

| Service | Module Path | Required Secrets | Optional Secrets |
|---------|-------------|------------------|------------------|
| Shipping Service | `shipping/shipping.service.ts` | `DATABASE_URL` | `UPS_API_KEY`, `FEDEX_API_KEY`, `DHL_API_KEY` |
| UPS Provider | `shipping/providers/ups.provider.ts` | `UPS_API_KEY`, `UPS_CLIENT_ID`, `UPS_CLIENT_SECRET` | - |
| FedEx Provider | `shipping/providers/fedex.provider.ts` | `FEDEX_API_KEY`, `FEDEX_ACCOUNT_NUMBER` | - |
| DHL Provider | `shipping/providers/dhl.provider.ts` | `DHL_API_KEY`, `DHL_API_SECRET` | - |
| Returns Service | `returns/returns.service.ts` | `DATABASE_URL` | Shipping provider secrets |
| Tracking Service | `tracking/tracking.service.ts` | `DATABASE_URL` | Shipping provider secrets |
| Order Tracking | `order-tracking/order-tracking.service.ts` | `DATABASE_URL` | - |

### Tax & Compliance Services

| Service | Module Path | Required Secrets | Optional Secrets |
|---------|-------------|------------------|------------------|
| Tax Service | `tax/tax.service.ts` | `DATABASE_URL` | `TAXJAR_API_KEY`, `AVALARA_LICENSE_KEY` |
| TaxJar Provider | `tax/providers/taxjar.provider.ts` | `TAXJAR_API_KEY` | - |
| Avalara Provider | `tax/providers/avalara.provider.ts` | `AVALARA_LICENSE_KEY`, `AVALARA_ACCOUNT_ID` | - |

### Vendor & Inventory Services

| Service | Module Path | Required Secrets | Optional Secrets |
|---------|-------------|------------------|------------------|
| Vendors Service | `vendors/vendors.service.ts` | `DATABASE_URL` | `REDIS_URL` |
| Inventory Service | `inventory/inventory.service.ts` | `DATABASE_URL` | `REDIS_URL`, `WEBHOOK_SECRET` |

### Organization Services

| Service | Module Path | Required Secrets | Optional Secrets |
|---------|-------------|------------------|------------------|
| Organization Service | `organization/organization.service.ts` | `DATABASE_URL` | `REDIS_URL` |
| Organization Roles | `organization-roles/organization-roles.service.ts` | `DATABASE_URL` | - |
| Organization Audit | `organization-audit/organization-audit.service.ts` | `DATABASE_URL` | - |
| Organization KYC | `organization-kyc/services/kyc.service.ts` | `DATABASE_URL`, `KYC_ENCRYPTION_KEY` | Provider secrets |
| Organization Billing | `organization-billing/services/stripe.service.ts` | `DATABASE_URL`, `STRIPE_SECRET_KEY` | - |

### KYC Verification Providers

| Provider | Module Path | Required Secrets |
|----------|-------------|------------------|
| AWS Textract (OCR) | `organization-kyc/providers/aws-textract.provider.ts` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` |
| Google Vision (OCR) | `organization-kyc/providers/google-vision.provider.ts` | `GOOGLE_APPLICATION_CREDENTIALS` |
| Azure Vision (OCR) | `organization-kyc/providers/azure-vision.provider.ts` | `AZURE_COMPUTER_VISION_KEY`, `AZURE_COMPUTER_VISION_ENDPOINT` |
| AWS Rekognition (Face) | `organization-kyc/providers/aws-rekognition.provider.ts` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` |
| Azure Face (Face) | `organization-kyc/providers/azure-face.provider.ts` | `AZURE_FACE_KEY`, `AZURE_FACE_ENDPOINT` |
| Face++ | `organization-kyc/providers/facepp.provider.ts` | `FACEPP_API_KEY`, `FACEPP_API_SECRET` |
| SumSub | `organization-kyc/providers/sumsub.provider.ts` | `SUMSUB_SECRET_KEY`, `SUMSUB_APP_TOKEN` |
| Jumio | `organization-kyc/providers/jumio.provider.ts` | `JUMIO_API_TOKEN`, `JUMIO_API_SECRET` |
| Onfido | `organization-kyc/providers/onfido.provider.ts` | `ONFIDO_API_TOKEN` |
| ComplyAdvantage | `organization-kyc/providers/complyadvantage.provider.ts` | `COMPLYADVANTAGE_API_KEY` |
| Refinitiv | `organization-kyc/providers/refinitiv.provider.ts` | `REFINITIV_API_KEY`, `REFINITIV_API_SECRET` |
| Dow Jones | `organization-kyc/providers/dowjones.provider.ts` | `DOWJONES_API_KEY`, `DOWJONES_API_SECRET` |
| LexisNexis | `organization-kyc/providers/lexisnexis.provider.ts` | `LEXISNEXIS_API_KEY`, `LEXISNEXIS_CUSTOMER_ID` |

### Communication Services

| Service | Module Path | Required Secrets | Optional Secrets |
|---------|-------------|------------------|------------------|
| Email Service | `email/email.service.ts` | `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD` | `SENDGRID_API_KEY` |
| SMS Service | `notifications/sms.service.ts` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | - |
| Push Notifications | `notifications/notifications.service.ts` | `DATABASE_URL` | `FIREBASE_CONFIG`, `VAPID_PRIVATE_KEY` |
| Webhooks Service | `webhooks/webhook.service.ts` | `DATABASE_URL`, `WEBHOOK_SECRET` | - |

### Support & Admin Services

| Service | Module Path | Required Secrets | Optional Secrets |
|---------|-------------|------------------|------------------|
| Support Service | `support/support.service.ts` | `DATABASE_URL` | `ZENDESK_API_KEY`, `INTERCOM_ACCESS_TOKEN` |
| Admin Service | `admin/admin.service.ts` | `DATABASE_URL`, `JWT_SECRET` | - |

### Analytics & AI Services

| Service | Module Path | Required Secrets | Optional Secrets |
|---------|-------------|------------------|------------------|
| Analytics Service | `analytics/analytics.service.ts` | `DATABASE_URL` | `MIXPANEL_TOKEN`, `AMPLITUDE_API_KEY` |
| Analytics Dashboard | `analytics-dashboard/analytics-dashboard.service.ts` | `DATABASE_URL` | - |
| Analytics Advanced | `analytics-advanced/analytics-advanced.service.ts` | `DATABASE_URL` | - |
| Recommendations | `recommendations/recommendations.service.ts` | `DATABASE_URL` | `OPENAI_API_KEY` |
| AI Agents Service | `services/ai-agents/` | `OPENAI_API_KEY` | `ANTHROPIC_API_KEY`, `GOOGLE_APPLICATION_CREDENTIALS` |

### Platform & Marketing Services

| Service | Module Path | Required Secrets | Optional Secrets |
|---------|-------------|------------------|------------------|
| Platform Service | `platform/platform.service.ts` | `DATABASE_URL` | - |
| SEO Service | `seo/seo.service.ts` | `DATABASE_URL` | - |
| Deals Service | `deals/deals.service.ts` | `DATABASE_URL` | `REDIS_URL` |
| Advertisements | `advertisements/advertisements.service.ts` | `DATABASE_URL` | - |
| Subscriptions | `subscriptions/subscriptions.service.ts` | `DATABASE_URL`, `STRIPE_SECRET_KEY` | - |
| Loyalty Service | `loyalty/loyalty.service.ts` | `DATABASE_URL` | `REDIS_URL` |
| Social Service | `social/social.service.ts` | `DATABASE_URL` | Social provider secrets |
| Automation Service | `automation/automation.service.ts` | `DATABASE_URL` | `WEBHOOK_SECRET` |

### Mobile Services

| Service | Module Path | Required Secrets | Optional Secrets |
|---------|-------------|------------------|------------------|
| Mobile Service | `mobile/mobile.service.ts` | `DATABASE_URL` | - |
| Mobile IAP | `payments/mobile-iap.service.ts` | `APPLE_SHARED_SECRET`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | - |

### Infrastructure Services

| Service | Module Path | Required Secrets | Optional Secrets |
|---------|-------------|------------------|------------------|
| Redis Service | `common/redis/redis.service.ts` | `REDIS_URL` | `REDIS_PASSWORD` |
| Prisma Service | `common/prisma/prisma.service.ts` | `DATABASE_URL` | - |
| Health Service | `health/health.service.ts` | `DATABASE_URL`, `REDIS_URL` | - |
| I18n Service | `i18n/i18n.service.ts` | `DATABASE_URL` | - |
| Security Service | `security/security.service.ts` | `DATABASE_URL` | - |

---

## Secret Criticality Levels

### Critical (Service Down if Missing)

| Secret | Services Affected | Impact |
|--------|-------------------|--------|
| `DATABASE_URL` | All services | Complete outage |
| `JWT_SECRET` | Auth, all authenticated endpoints | Auth failure |
| `JWT_REFRESH_SECRET` | Auth, token refresh | Session failure |
| `REDIS_URL` | Cache, sessions, rate limiting | Performance degradation, auth issues |

### High (Feature Degradation)

| Secret | Services Affected | Impact |
|--------|-------------------|--------|
| `STRIPE_SECRET_KEY` | Payments, checkout, billing | No payments |
| `STRIPE_WEBHOOK_SECRET` | Webhook handlers | Payment status sync failure |
| `KYC_ENCRYPTION_KEY` | KYC documents | Data corruption risk |
| `ENCRYPTION_KEY` | Gift cards, sensitive data | Data at risk |

### Medium (Individual Feature Loss)

| Secret | Services Affected | Impact |
|--------|-------------------|--------|
| `SENDGRID_API_KEY` | Email service | No transactional emails |
| `ELASTICSEARCH_*` | Search service | Search degradation |
| `OPENAI_API_KEY` | AI features, recommendations | AI features disabled |
| OAuth secrets | Social login | Social login unavailable |

### Low (Optional Features)

| Secret | Services Affected | Impact |
|--------|-------------------|--------|
| `SENTRY_DSN` | Error tracking | No error monitoring |
| `ANALYTICS_*` | Analytics services | No analytics |
| Feature-specific API keys | Individual features | Feature disabled |

---

## Environment-Specific Vault Structure

### Recommended Vault Paths

```
vault/
├── dev/
│   ├── api/
│   │   ├── database
│   │   ├── redis
│   │   ├── jwt
│   │   └── stripe
│   ├── web/
│   │   └── public-keys
│   └── mobile/
│       └── public-keys
├── staging/
│   ├── api/
│   │   ├── database
│   │   ├── redis
│   │   ├── jwt
│   │   ├── stripe
│   │   └── kyc-providers
│   ├── web/
│   └── mobile/
└── production/
    ├── api/
    │   ├── database
    │   ├── redis
    │   ├── jwt
    │   ├── stripe
    │   ├── paypal
    │   ├── shipping-providers
    │   ├── tax-providers
    │   ├── kyc-providers
    │   ├── email
    │   └── monitoring
    ├── web/
    │   └── public-keys
    └── mobile/
        ├── apple-iap
        └── google-play
```

---

## Secret Rotation Impact

### Rotation Schedule

| Secret Type | Rotation Period | Zero-Downtime? | Services to Restart |
|-------------|-----------------|----------------|---------------------|
| `DATABASE_URL` password | 90 days | Yes (dual-password) | All API pods |
| `JWT_SECRET` | 90 days | Yes (key rotation) | None (graceful) |
| `JWT_REFRESH_SECRET` | 90 days | Yes (key rotation) | None (graceful) |
| `REDIS_PASSWORD` | 90 days | Yes (dual-password) | All API pods |
| `STRIPE_SECRET_KEY` | On compromise | No | Payment service |
| `KYC_ENCRYPTION_KEY` | Never (data loss) | N/A | N/A |
| OAuth secrets | 365 days | No | Auth service |
| API keys (third-party) | Provider-specific | No | Specific service |

---

## Quick Reference: Service to Required Secrets

```
auth          → JWT_SECRET, JWT_REFRESH_SECRET, DATABASE_URL
users         → DATABASE_URL
products      → DATABASE_URL, (ELASTICSEARCH_*, REDIS_URL)
cart          → DATABASE_URL, REDIS_URL
checkout      → DATABASE_URL, STRIPE_SECRET_KEY
orders        → DATABASE_URL
payments      → DATABASE_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
shipping      → DATABASE_URL, (UPS_API_KEY, FEDEX_API_KEY, DHL_API_KEY)
tax           → DATABASE_URL, (TAXJAR_API_KEY)
email         → EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD
notifications → DATABASE_URL, (TWILIO_*, FIREBASE_*)
search        → DATABASE_URL, (ELASTICSEARCH_*, ALGOLIA_*)
kyc           → DATABASE_URL, KYC_ENCRYPTION_KEY, Provider secrets
webhooks      → DATABASE_URL, WEBHOOK_SECRET
admin         → DATABASE_URL, JWT_SECRET
analytics     → DATABASE_URL
health        → DATABASE_URL, REDIS_URL
```

---

## Troubleshooting Guide

### Service Won't Start

1. Check `DATABASE_URL` - most common cause
2. Check `REDIS_URL` if caching/sessions required
3. Check `JWT_SECRET` for auth services
4. Check provider-specific secrets for payment/shipping

### Authentication Failures

1. Verify `JWT_SECRET` matches across all services
2. Check `JWT_REFRESH_SECRET` for refresh token issues
3. Verify OAuth secrets for social login

### Payment Failures

1. Check `STRIPE_SECRET_KEY` (test vs live)
2. Verify `STRIPE_WEBHOOK_SECRET` matches dashboard
3. Check provider mode (sandbox vs production)

### Email Not Sending

1. Verify `SENDGRID_API_KEY` or SMTP credentials
2. Check `EMAIL_FROM` is verified sender
3. Verify network access to email provider

---

*Document maintained by Platform Engineering Team*
