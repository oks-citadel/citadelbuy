# Broxiva Platform API Inventory

## Overview

This document provides a comprehensive inventory of all API endpoints across the Broxiva e-commerce platform, grouped by functional domain.

**Last Updated:** 2026-01-04
**Total Controllers:** 95
**Python Microservices:** 14

---

## API Groups

### 1. SYSTEM

| Endpoint | Method | Controller | Auth Required |
|----------|--------|------------|---------------|
| `/health` | GET | HealthController | No |
| `/health/live` | GET | HealthController | No |
| `/health/ready` | GET | HealthController | No |
| `/i18n/locales` | GET | I18nController | No |
| `/i18n/translations/:locale` | GET | I18nController | No |
| `/platform/config` | GET | PlatformController | No |
| `/platform/regions` | GET | PlatformController | No |
| `/seo/sitemap` | GET | SeoController | No |
| `/seo/robots` | GET | SeoController | No |

### 2. AUTHENTICATION

| Endpoint | Method | Controller | Auth Required |
|----------|--------|------------|---------------|
| `/auth/register` | POST | AuthController | No |
| `/auth/login` | POST | AuthController | No |
| `/auth/logout` | POST | AuthController | Yes |
| `/auth/refresh` | POST | AuthController | No |
| `/auth/forgot-password` | POST | AuthController | No |
| `/auth/reset-password` | POST | AuthController | No |
| `/auth/verify-email` | POST | AuthController | No |
| `/auth/resend-verification` | POST | AuthController | No |
| `/auth/social-login` | POST | AuthController | No |
| `/auth/google` | POST | AuthController | No |
| `/auth/facebook` | POST | AuthController | No |
| `/auth/apple` | POST | AuthController | No |
| `/auth/github` | POST | AuthController | No |
| `/auth/mfa/setup` | POST | AuthController | Yes |
| `/auth/mfa/verify` | POST | AuthController | Yes |
| `/auth/mfa/disable` | POST | AuthController | Yes |
| `/auth/mfa/status` | GET | AuthController | Yes |
| `/admin/auth/login` | POST | AdminAuthController | No |

### 3. USERS

| Endpoint | Method | Controller | Auth Required |
|----------|--------|------------|---------------|
| `/me` | GET | MeController | Yes |
| `/me` | PATCH | MeController | Yes |
| `/me/addresses` | GET/POST | MeController | Yes |
| `/me/addresses/:id` | PATCH/DELETE | MeController | Yes |
| `/me/orders` | GET | MeController | Yes |
| `/users/:id` | GET | UsersController | Admin |
| `/users` | GET | UsersController | Admin |
| `/users/:id/orders` | GET | UsersController | Admin |

### 4. TENANTS (Organizations)

| Endpoint | Method | Controller | Auth Required |
|----------|--------|------------|---------------|
| `/organizations` | GET/POST | OrganizationController | Yes |
| `/organizations/:id` | GET/PATCH/DELETE | OrganizationController | Yes |
| `/organizations/:id/members` | GET/POST | OrganizationController | Yes |
| `/organizations/:id/members/:memberId` | PATCH/DELETE | OrganizationController | Yes |
| `/organizations/:id/departments` | GET/POST | OrganizationDepartmentController | Yes |
| `/organizations/:id/teams` | GET/POST | OrganizationTeamController | Yes |
| `/organizations/:id/roles` | GET/POST | RoleController | Yes |
| `/organizations/:id/permissions` | GET | PermissionController | Yes |

### 5. BILLING & SUBSCRIPTIONS

| Endpoint | Method | Controller | Auth Required |
|----------|--------|------------|---------------|
| `/billing/subscription` | GET | BillingController | Yes |
| `/billing/subscription/create` | POST | BillingController | Yes |
| `/billing/subscription/upgrade` | POST | BillingController | Yes |
| `/billing/subscription/cancel` | POST | BillingController | Yes |
| `/billing/invoices` | GET | BillingController | Yes |
| `/billing/invoices/:id` | GET | BillingController | Yes |
| `/billing/payment-methods` | GET/POST | BillingController | Yes |
| `/billing/payment-methods/:id` | DELETE | BillingController | Yes |
| `/subscriptions` | GET/POST | SubscriptionsController | Yes |
| `/subscriptions/:id` | GET/PATCH | SubscriptionsController | Yes |

### 6. PAYMENTS

| Endpoint | Method | Controller | Auth Required |
|----------|--------|------------|---------------|
| `/payments/initialize` | POST | PaymentsController | Yes |
| `/payments/verify/:reference` | GET | PaymentsController | Yes |
| `/payments/providers` | GET | PaymentsController | Yes |
| `/payments/methods` | GET/POST | UnifiedPaymentsController | Yes |
| `/payments/intent` | POST | UnifiedPaymentsController | Yes |
| `/payments/confirm` | POST | UnifiedPaymentsController | Yes |
| `/currency/rates` | GET | CurrencyController | No |
| `/currency/convert` | POST | CurrencyController | Yes |

### 7. PRODUCTS & CATALOG

| Endpoint | Method | Controller | Auth Required |
|----------|--------|------------|---------------|
| `/products` | GET | ProductsController | No |
| `/products/:id` | GET | ProductsController | No |
| `/products/search` | GET | ProductsController | No |
| `/categories` | GET | CategoriesController | No |
| `/categories/:id` | GET | CategoriesController | No |
| `/variants/:productId` | GET | VariantsController | No |
| `/deals` | GET | DealsController | No |
| `/deals/flash` | GET | DealsController | No |

### 8. ORDERS

| Endpoint | Method | Controller | Auth Required |
|----------|--------|------------|---------------|
| `/orders` | GET/POST | OrdersController | Yes |
| `/orders/:id` | GET/PATCH | OrdersController | Yes |
| `/orders/:id/cancel` | POST | OrdersController | Yes |
| `/orders/:id/tracking` | GET | OrderTrackingController | Yes |
| `/returns` | GET/POST | ReturnsController | Yes |
| `/returns/:id` | GET/PATCH | ReturnsController | Yes |

### 9. CART & CHECKOUT

| Endpoint | Method | Controller | Auth Required |
|----------|--------|------------|---------------|
| `/cart` | GET | CartController | Yes |
| `/cart/items` | POST/DELETE | CartController | Yes |
| `/cart/clear` | POST | CartController | Yes |
| `/checkout` | POST | CheckoutController | Yes |
| `/checkout/validate` | POST | CheckoutController | Yes |
| `/checkout/shipping-rates` | POST | CheckoutController | Yes |

### 10. FILES & MEDIA

| Endpoint | Method | Controller | Auth Required |
|----------|--------|------------|---------------|
| `/media/upload` | POST | (Python) MediaService | Yes |
| `/media/presign` | POST | (Python) MediaService | Yes |
| `/media/:id` | GET/DELETE | (Python) MediaService | Yes |
| `/media/images/optimize` | POST | (Python) MediaService | Yes |

### 11. NOTIFICATIONS

| Endpoint | Method | Controller | Auth Required |
|----------|--------|------------|---------------|
| `/notifications` | GET | NotificationsController | Yes |
| `/notifications/:id` | GET/DELETE | NotificationsController | Yes |
| `/notifications/:id/read` | POST | NotificationsController | Yes |
| `/notifications/read-all` | POST | NotificationsController | Yes |
| `/notifications/preferences` | GET/PATCH | NotificationsController | Yes |

### 12. ANALYTICS

| Endpoint | Method | Controller | Auth Required |
|----------|--------|------------|---------------|
| `/analytics/overview` | GET | AnalyticsController | Yes |
| `/analytics/sales` | GET | AnalyticsController | Yes |
| `/analytics/traffic` | GET | AnalyticsController | Yes |
| `/analytics/products` | GET | AnalyticsController | Yes |
| `/analytics/customers` | GET | AnalyticsController | Yes |
| `/analytics/dashboard` | GET | AnalyticsDashboardController | Yes |
| `/analytics/advanced` | GET | AnalyticsAdvancedController | Yes |
| `/analytics/category/:id` | GET | CategoryAnalyticsController | Yes |

### 13. ADMIN

| Endpoint | Method | Controller | Auth Required |
|----------|--------|------------|---------------|
| `/admin/dashboard` | GET | AdminDashboardController | Admin |
| `/admin/users` | GET/POST | AdminUsersController | Admin |
| `/admin/users/:id` | GET/PATCH/DELETE | AdminUsersController | Admin |
| `/admin/orders` | GET | AdminOrdersController | Admin |
| `/admin/orders/:id` | GET/PATCH | AdminOrdersController | Admin |
| `/admin/products` | GET/POST | AdminProductsController | Admin |
| `/admin/products/:id` | GET/PATCH/DELETE | AdminProductsController | Admin |
| `/admin/vendors` | GET | AdminVendorsController | Admin |
| `/admin/vendors/:id` | GET/PATCH | AdminVendorsController | Admin |

### 14. WEBHOOKS

| Endpoint | Method | Controller | Auth Required |
|----------|--------|------------|---------------|
| `/webhooks` | GET/POST | WebhookController | Yes |
| `/webhooks/:id` | GET/PATCH/DELETE | WebhookController | Yes |
| `/webhooks/:id/test` | POST | WebhookController | Yes |
| `/webhooks/stripe` | POST | UnifiedWebhooksController | No (Signature) |
| `/webhooks/paystack` | POST | UnifiedWebhooksController | No (Signature) |
| `/webhooks/flutterwave` | POST | UnifiedWebhooksController | No (Signature) |
| `/webhooks/paypal` | POST | UnifiedWebhooksController | No (Signature) |
| `/webhooks/apple` | POST | UnifiedWebhooksController | No (Signature) |
| `/webhooks/google` | POST | UnifiedWebhooksController | No (Signature) |
| `/webhooks/billing/stripe` | POST | BillingWebhookController | No (Signature) |
| `/webhooks/bnpl/:provider` | POST | BNPLWebhookController | No (Signature) |
| `/webhooks/kyc/:provider` | POST | KYCWebhookController | No (Signature) |

### 15. AUDIT LOGS

| Endpoint | Method | Controller | Auth Required |
|----------|--------|------------|---------------|
| `/audit/logs` | GET | AuditController | Yes |
| `/audit/logs/:id` | GET | AuditController | Yes |
| `/audit/stats` | GET | AuditController | Yes |

---

## Python Microservices Inventory

### AI Engine (Port 8000)
- `/health` - Health check
- `/predict/product` - Product prediction
- `/predict/price` - Price optimization
- `/predict/demand` - Demand forecasting
- `/predict/fraud` - Fraud detection score

### Recommendation Service (Port 8001)
- `/health` - Health check
- `/recommend` - Get recommendations
- `/similar-products` - Similar products
- `/trending` - Trending products
- `/personalized-feed` - Personalized feed

### Search Service (Port 8002)
- `/health` - Health check
- `/search` - Product search
- `/visual-search` - Visual search
- `/voice-search` - Voice search
- `/autocomplete` - Search suggestions

### Fraud Detection (Port 8003)
- `/health` - Health check
- `/analyze` - Analyze transaction
- `/device/analyze` - Device analysis
- `/velocity/check` - Velocity check
- `/report/fraud` - Report fraud case

### Chatbot Service (Port 8004)
- `/health` - Health check
- `/chat` - Chat message
- `/ws/{session_id}` - WebSocket chat
- `/intent/classify` - Intent classification
- `/sentiment/analyze` - Sentiment analysis

### Analytics Service (Port 8005)
- `/health` - Health check
- `/events/track` - Track event
- `/events/batch` - Batch events
- `/dashboard/metrics` - Dashboard metrics
- `/realtime/overview` - Real-time metrics
- `/ml/forecast` - ML forecasting
- `/ml/anomalies` - Anomaly detection

### Pricing Service (Port 8006)
- `/health` - Health check
- `/optimize` - Price optimization
- `/optimize/bulk` - Bulk optimization
- `/promotion/recommend` - Promotion recommendations
- `/elasticity/{product_id}` - Price elasticity
- `/competitor/analyze` - Competitor analysis

### Inventory Service (Port 8007)
- `/health` - Health check
- `/items` - Inventory items
- `/items/{id}/reserve` - Reserve stock
- `/items/{id}/release` - Release reservation
- `/items/{id}/adjust` - Adjust stock
- `/alerts` - Stock alerts

### Media Service (Port 8008)
- `/health` - Health check
- `/upload` - Upload media
- `/optimize` - Optimize image
- `/transform` - Transform media
- `/presign` - Get presigned URL

### Notification Service (Port 8009)
- `/health` - Health check
- `/email/send` - Send email
- `/sms/send` - Send SMS
- `/push/send` - Send push notification
- `/bulk/send` - Bulk notifications

### Personalization Service (Port 8010)
- `/health` - Health check
- `/preferences` - User preferences
- `/track` - Track interaction
- `/recommendations` - Get recommendations

### Supplier Integration (Port 8011)
- `/health` - Health check
- `/suppliers` - List suppliers
- `/suppliers/{id}/sync` - Sync supplier
- `/products/import` - Import products
- `/orders/fulfill` - Fulfill orders

### AI Agents (Port 8012)
- `/health` - Health check
- `/agents` - List agents
- `/agents/{id}/execute` - Execute agent
- `/workflows` - Agent workflows

---

## Dependency Map

### Backend API Dependencies
| Service | Database | Cache | Queue | External APIs |
|---------|----------|-------|-------|---------------|
| Auth | PostgreSQL | Redis | - | Google, Facebook, Apple, GitHub OAuth |
| Payments | PostgreSQL | Redis | SQS | Stripe, PayPal, Paystack, Flutterwave |
| Orders | PostgreSQL | Redis | SQS | Shipping providers |
| Products | PostgreSQL | Redis | - | - |
| Notifications | PostgreSQL | Redis | SQS | SendGrid, Twilio, FCM |
| Analytics | PostgreSQL | Redis | - | - |
| Billing | PostgreSQL | Redis | SQS | Stripe |
| Media | PostgreSQL | Redis | S3 | CloudFront, ImageKit |

### Python Microservices Dependencies
| Service | Database | Cache | Queue | External APIs |
|---------|----------|-------|-------|---------------|
| AI Engine | PostgreSQL | Redis | - | OpenAI |
| Recommendation | PostgreSQL | Redis | - | - |
| Search | Elasticsearch | Redis | - | - |
| Fraud Detection | PostgreSQL | Redis | - | MaxMind GeoIP |
| Chatbot | PostgreSQL | Redis | - | OpenAI |
| Analytics | ClickHouse | Redis | SQS | - |
| Pricing | PostgreSQL | Redis | - | Competitor APIs |
| Inventory | PostgreSQL | Redis | SQS | Supplier APIs |
| Media | S3 | Redis | SQS | CloudFront |
| Notification | PostgreSQL | Redis | SQS | SendGrid, Twilio |
| Personalization | PostgreSQL | Redis | - | - |
| Supplier | PostgreSQL | Redis | RabbitMQ | Supplier APIs |

---

## AWS Infrastructure Components

### Compute
- EKS Cluster (Kubernetes)
- ECR Registry (Container images)

### Database
- RDS PostgreSQL (Primary database)
- ElastiCache Redis (Caching)
- OpenSearch/Elasticsearch (Search)

### Storage
- S3 (Media files, backups)
- CloudFront (CDN)

### Messaging
- SQS (Message queues)
- SNS (Notifications)
- EventBridge (Event routing)

### Security
- Secrets Manager (Credentials)
- KMS (Encryption keys)
- WAF (Web application firewall)
- Certificate Manager (SSL/TLS)

### Monitoring
- CloudWatch (Logs, metrics, alarms)
- X-Ray (Distributed tracing)

### Networking
- VPC (Virtual network)
- ALB (Load balancer)
- Route53 (DNS)
