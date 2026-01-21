# Broxiva Go-Live Checklist

## Pre-Deployment Gates

### 1. Design System Implementation
- [x] Broxiva CSS variables defined in `globals.css`
- [x] Tailwind tokens (bx-*) configured in `tailwind.config.ts`
- [x] BroxivaBackground component created
- [x] BrandLogo component created and enforced
- [x] Logo consistency across header, footer, marketplace footer
- [x] Landing page rebuilt with premium design

### 2. E-Commerce Flows Verification

#### Authentication
- [x] Login page functional
- [x] Registration flow working
- [x] Password reset flow working
- [x] JWT token management active
- [x] Account lockout protection enabled

#### Product Catalog
- [x] Product listing page working
- [x] Product detail pages functional
- [x] Category filtering functional
- [x] Search (ElasticSearch) functional
- [x] Visual search functional

#### Shopping Cart
- [x] Add to cart working
- [x] Remove from cart working
- [x] Quantity updates working
- [x] Cart persistence (localStorage)
- [x] Coupon application working

#### Checkout
- [x] Multi-step checkout functional
- [x] Shipping address validation
- [x] Shipping rate calculation
- [x] Tax calculation (US states)
- [x] Guest checkout available

#### Payment Integration
- [x] Stripe integration configured
- [x] Paystack integration configured (Africa)
- [x] Flutterwave integration configured (Pan-Africa)
- [ ] Production Stripe keys configured (CRITICAL)
- [ ] Webhook endpoints verified
- [ ] PCI compliance (Stripe Elements) implemented

#### Orders
- [x] Order creation working
- [x] Order history accessible
- [x] Order tracking functional
- [x] Order status updates working

#### Reviews & Wishlist
- [x] Product reviews functional
- [x] Wishlist add/remove working
- [x] Wishlist collections functional

---

## Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Authentication
JWT_SECRET=<32+ character secret>  # CRITICAL: NOT development fallback
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<32+ character secret>
JWT_REFRESH_EXPIRES_IN=30d

# Stripe (Production)
STRIPE_SECRET_KEY=sk_live_...  # NOT sk_test_*
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Paystack (Africa)
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...

# Flutterwave (Pan-Africa)
FLUTTERWAVE_SECRET_KEY=FLWSECK_...
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_...
FLUTTERWAVE_ENCRYPTION_KEY=...

# Redis
REDIS_URL=redis://...

# ElasticSearch
ELASTICSEARCH_URL=https://...

# Email
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
FROM_EMAIL=noreply@broxiva.com

# AWS (if using)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Sentry (Error Tracking)
SENTRY_DSN=...

# Environment
NODE_ENV=production
SKIP_PRODUCTION_VALIDATION=false  # MUST be false in production
```

---

## Security Checklist

- [x] HTTPS enforcement enabled
- [x] JWT secrets are production-grade (32+ chars)
- [x] No development fallback secrets
- [x] Database ports not exposed (internal only)
- [x] Redis ports not exposed (internal only)
- [x] CORS configured for production domain
- [x] Rate limiting enabled
- [x] Account lockout protection enabled
- [ ] Stripe Elements for card tokenization (PCI compliance)
- [ ] Webhook signature verification
- [ ] CSRF tokens enabled

---

## Infrastructure Checklist

### AWS Resources
- [ ] EKS cluster running
- [ ] RDS PostgreSQL Multi-AZ configured
- [ ] ElastiCache Redis cluster configured
- [ ] S3 bucket for media
- [ ] CloudFront CDN configured
- [ ] Route53 DNS configured (broxiva.com)
- [ ] ACM SSL certificate installed
- [ ] ECR repositories created
- [ ] Secrets Manager configured

### Kubernetes
- [ ] API deployment running
- [ ] Web deployment running
- [ ] Ingress configured with SSL
- [ ] Health checks passing
- [ ] Resource limits configured
- [ ] Horizontal Pod Autoscaler enabled

---

## Monitoring & Observability

- [ ] CloudWatch logging enabled
- [ ] Error tracking (Sentry) configured
- [ ] Payment webhook monitoring
- [ ] Cart abandonment tracking
- [ ] Performance metrics collection
- [ ] Alerting configured

---

## Final Verification

### Build & Deploy
- [x] Web build successful (no TypeScript errors)
- [x] API build successful
- [ ] Docker images built and pushed to ECR
- [ ] Kubernetes deployments updated
- [ ] Health endpoints responding

### Smoke Tests
- [ ] Landing page loads correctly
- [ ] Product catalog loads
- [ ] Add to cart works
- [ ] Checkout flow completes
- [ ] Payment processes (test transaction)
- [ ] Order confirmation received

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Engineering Lead | | | |
| QA Lead | | | |
| Security Review | | | |
| Product Owner | | | |

---

*Checklist version: 1.0*
*Last updated: January 2026*
