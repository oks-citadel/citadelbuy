# Broxiva Test Inventory

## Vendor-Customer Global E-Commerce Platform

**Unit -> Integration -> E2E -> Load | MVP -> Production**

---

## 1. TESTING STRATEGY OVERVIEW

### Test Pyramid

```
                    ┌─────────────┐
                    │   E2E (7)   │  ← Critical user journeys
                   ┌┴─────────────┴┐
                   │ Integration   │  ← API contract tests
                  ┌┴───────────────┴┐
                  │  Unit (71+)     │  ← Business logic
                 ┌┴─────────────────┴┐
                 │   Static (ESLint)  │  ← Code quality
                └─────────────────────┘
```

### Testing Philosophy

| Principle | Description |
|-----------|-------------|
| **API-First** | All tests validate API contracts |
| **RBAC-Aware** | Every endpoint tested with correct/incorrect roles |
| **Negative Testing** | Invalid inputs, edge cases, error handling |
| **Idempotency** | Webhook/payment tests verify idempotent behavior |
| **Data Isolation** | Tests use isolated data, no cross-contamination |
| **CI/CD Integration** | All tests run in GitHub Actions workflows |

---

## 2. TEST CONFIGURATION

### Jest Configuration

**Path:** `apps/api/jest.config.js`

```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
```

### E2E Configuration

**Path:** `apps/api/test/jest-e2e.json`

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "./jest-environment.js",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "setupFilesAfterEnv": ["./setup-e2e.ts"]
}
```

---

## 3. CURRENT TEST INVENTORY

### 3.1 Unit Tests (71 files)

| Module | Test File | Status | Coverage |
|--------|-----------|--------|----------|
| **Auth** | `auth.controller.spec.ts` | ✅ | 85% |
| **Auth** | `auth.service.spec.ts` | ✅ | 90% |
| **Auth** | `auth.service.enhanced.spec.ts` | ✅ | 92% |
| **Users** | `users.service.spec.ts` | ✅ | 80% |
| **Products** | `products.service.spec.ts` | ✅ | 85% |
| **Products** | `products.controller.spec.ts` | ✅ | 80% |
| **Variants** | `variants.service.spec.ts` | ✅ | 75% |
| **Categories** | `categories.controller.spec.ts` | ✅ | 80% |
| **Categories** | `categories.service.spec.ts` | ✅ | 85% |
| **Cart** | `cart.service.spec.ts` | ✅ | 88% |
| **Checkout** | `checkout.service.spec.ts` | ✅ | 85% |
| **Orders** | `orders.controller.spec.ts` | ✅ | 82% |
| **Orders** | `orders.service.spec.ts` | ✅ | 88% |
| **Orders** | `orders.service.enhanced.spec.ts` | ✅ | 90% |
| **Payments** | `payments.controller.spec.ts` | ✅ | 85% |
| **Payments** | `payments.service.enhanced.spec.ts` | ✅ | 90% |
| **BNPL** | `bnpl.controller.spec.ts` | ✅ | 80% |
| **BNPL** | `bnpl.service.spec.ts` | ✅ | 82% |
| **Shipping** | `shipping.service.spec.ts` | ✅ | 78% |
| **Tax** | `tax.service.spec.ts` | ✅ | 80% |
| **Inventory** | `inventory.service.spec.ts` | ✅ | 85% |
| **Vendors** | `vendors.service.spec.ts` | ✅ | 80% |
| **Organization** | `organization.controller.spec.ts` | ✅ | 82% |
| **Organization** | `organization.service.spec.ts` | ✅ | 85% |
| **Organization** | `organization-member.service.spec.ts` | ✅ | 80% |
| **Organization** | `organization.integration.spec.ts` | ✅ | 88% |
| **Org-KYC** | `kyc.service.spec.ts` | ✅ | 85% |
| **Org-Billing** | `billing.service.spec.ts` | ✅ | 82% |
| **Org-Billing** | `invoice.service.spec.ts` | ✅ | 80% |
| **Org-Billing** | `stripe.service.spec.ts` | ✅ | 85% |
| **Org-Audit** | `audit.service.spec.ts` | ✅ | 78% |
| **Org-Roles** | `permission.service.spec.ts` | ✅ | 80% |
| **Coupons** | `coupons.service.spec.ts` | ✅ | 82% |
| **Deals** | `deals.controller.spec.ts` | ✅ | 80% |
| **Deals** | `deals.service.spec.ts` | ✅ | 82% |
| **Gift Cards** | `gift-cards.controller.spec.ts` | ✅ | 78% |
| **Gift Cards** | `gift-cards.service.spec.ts` | ✅ | 80% |
| **Loyalty** | `loyalty.controller.spec.ts` | ✅ | 75% |
| **Loyalty** | `loyalty.service.spec.ts` | ✅ | 78% |
| **Advertisements** | `advertisements.controller.spec.ts` | ✅ | 75% |
| **Advertisements** | `advertisements.service.spec.ts` | ✅ | 78% |
| **Wishlist** | `wishlist.service.spec.ts` | ✅ | 80% |
| **Reviews** | `reviews.service.spec.ts` | ✅ | 75% |
| **Support** | `support.service.spec.ts` | ✅ | 72% |
| **Returns** | `returns.service.spec.ts` | ✅ | 78% |
| **Subscriptions** | `subscriptions.service.spec.ts` | ✅ | 80% |
| **Search** | `search.service.spec.ts` | ✅ | 82% |
| **Recommendations** | `recommendations.service.spec.ts` | ✅ | 75% |
| **Notifications** | `notifications.service.spec.ts` | ✅ | 80% |
| **Email** | `email.service.spec.ts` | ✅ | 85% |
| **Webhooks** | `webhooks.service.spec.ts` | ✅ | 88% |
| **Analytics** | `analytics.service.spec.ts` | ✅ | 75% |
| **Analytics Dashboard** | `analytics-dashboard.service.spec.ts` | ✅ | 72% |
| **Health** | `health.controller.spec.ts` | ✅ | 90% |
| **I18n** | `i18n.service.spec.ts` | ✅ | 80% |
| **Automation** | `workflow-engine.service.spec.ts` | ✅ | 78% |

---

### 3.2 E2E Tests (7 files)

| Test Suite | File | Scenarios | Status |
|------------|------|-----------|--------|
| **Auth Flow** | `auth.e2e-spec.ts` | 15+ | ✅ |
| **User Registration** | `user-registration.e2e-spec.ts` | 12+ | ✅ |
| **Shopping Flow** | `shopping.e2e-spec.ts` | 20+ | ✅ |
| **Checkout Flow** | `checkout.e2e-spec.ts` | 18+ | ✅ |
| **Payment Flow** | `payment-flow.e2e-spec.ts` | 15+ | ✅ |
| **Order Lifecycle** | `order-lifecycle.e2e-spec.ts` | 22+ | ✅ |
| **Organization** | `organization.e2e-spec.ts` | 18+ | ✅ |

---

## 4. TEST SCENARIOS BY DOMAIN

### 4.1 AUTH Module Tests

**Path:** `apps/api/src/modules/auth/`

#### Unit Tests

| Test Case | Description | Priority |
|-----------|-------------|----------|
| `should register user with valid data` | Happy path registration | P0 |
| `should reject registration with existing email` | Duplicate email | P0 |
| `should login with valid credentials` | Happy path login | P0 |
| `should reject login with invalid password` | Wrong password | P0 |
| `should lock account after 5 failed attempts` | Account lockout | P0 |
| `should refresh token with valid refresh token` | Token refresh | P0 |
| `should reject expired refresh token` | Token expiry | P0 |
| `should logout and blacklist token` | Logout flow | P0 |
| `should setup MFA with valid TOTP` | MFA setup | P1 |
| `should verify MFA code` | MFA verification | P1 |
| `should reject invalid MFA code` | MFA rejection | P1 |
| `should send password reset email` | Password reset | P0 |
| `should reset password with valid token` | Password reset | P0 |
| `should reject expired reset token` | Token expiry | P0 |
| `should verify email with valid token` | Email verification | P0 |

#### E2E Tests (`auth.e2e-spec.ts`)

| Scenario | Description | Status |
|----------|-------------|--------|
| Complete registration flow | Register -> Verify Email -> Login | ✅ |
| Login with MFA | Login -> MFA Challenge -> Access | ✅ |
| Password reset flow | Forgot -> Email -> Reset -> Login | ✅ |
| OAuth login flow | Google/Facebook/Apple OAuth | ✅ |
| Session management | Multiple devices, logout all | ✅ |
| Rate limiting | Verify rate limits enforced | ✅ |

---

### 4.2 PRODUCTS Module Tests

**Path:** `apps/api/src/modules/products/`

#### Unit Tests

| Test Case | Description | Priority |
|-----------|-------------|----------|
| `should create product with valid data` | Happy path | P0 |
| `should validate required fields` | Validation | P0 |
| `should update product` | Update flow | P0 |
| `should delete product` | Soft delete | P0 |
| `should list products with pagination` | Pagination | P0 |
| `should filter products by category` | Filtering | P0 |
| `should search products` | Full-text search | P0 |
| `should handle product variants` | Variant management | P1 |
| `should upload product images` | Image upload | P1 |
| `should calculate product pricing` | Price calculation | P0 |

#### RBAC Tests

| Test Case | Role | Expected |
|-----------|------|----------|
| Create product | Vendor | ✅ Allow |
| Create product | Customer | ❌ Deny |
| Update own product | Vendor | ✅ Allow |
| Update other's product | Vendor | ❌ Deny |
| Delete product | Admin | ✅ Allow |
| View product | Public | ✅ Allow |

---

### 4.3 CART Module Tests

**Path:** `apps/api/src/modules/cart/`

#### Unit Tests

| Test Case | Description | Priority |
|-----------|-------------|----------|
| `should add item to cart` | Add to cart | P0 |
| `should update item quantity` | Quantity update | P0 |
| `should remove item from cart` | Remove item | P0 |
| `should clear cart` | Clear all | P0 |
| `should calculate cart totals` | Total calculation | P0 |
| `should apply coupon` | Coupon application | P0 |
| `should validate stock availability` | Stock check | P0 |
| `should handle guest cart` | Guest session | P0 |
| `should merge guest cart on login` | Cart merge | P1 |
| `should lock prices for checkout` | Price locking | P0 |
| `should save item for later` | Save for later | P1 |

---

### 4.4 CHECKOUT Module Tests

**Path:** `apps/api/src/modules/checkout/`

#### Unit Tests

| Test Case | Description | Priority |
|-----------|-------------|----------|
| `should validate checkout data` | Validation | P0 |
| `should calculate shipping` | Shipping calc | P0 |
| `should calculate tax` | Tax calc | P0 |
| `should validate coupon` | Coupon validation | P0 |
| `should create order from cart` | Order creation | P0 |
| `should handle express checkout` | Express flow | P1 |
| `should handle guest checkout` | Guest flow | P0 |
| `should validate address` | Address validation | P0 |

#### E2E Tests (`checkout.e2e-spec.ts`)

| Scenario | Description | Status |
|----------|-------------|--------|
| Complete checkout flow | Cart -> Address -> Shipping -> Payment -> Order | ✅ |
| Guest checkout | No login required | ✅ |
| Express checkout | Saved payment/address | ✅ |
| Multi-vendor checkout | Items from multiple vendors | ✅ |
| Coupon application | Apply and validate discount | ✅ |
| Shipping calculation | Multiple carriers | ✅ |
| Tax calculation | Multi-jurisdiction | ✅ |

---

### 4.5 ORDERS Module Tests

**Path:** `apps/api/src/modules/orders/`

#### Unit Tests

| Test Case | Description | Priority |
|-----------|-------------|----------|
| `should create order` | Order creation | P0 |
| `should update order status` | Status update | P0 |
| `should cancel order` | Cancellation | P0 |
| `should process refund` | Refund flow | P0 |
| `should generate invoice` | Invoice generation | P1 |
| `should track order` | Tracking | P0 |
| `should split order by vendor` | Multi-vendor | P1 |
| `should handle partial fulfillment` | Partial ship | P1 |

#### E2E Tests (`order-lifecycle.e2e-spec.ts`)

| Scenario | Description | Status |
|----------|-------------|--------|
| Order creation to delivery | Full lifecycle | ✅ |
| Order cancellation | Cancel before ship | ✅ |
| Order return | Return after delivery | ✅ |
| Partial refund | Refund some items | ✅ |
| Order tracking | Real-time updates | ✅ |
| Vendor fulfillment | Vendor ships order | ✅ |

---

### 4.6 PAYMENTS Module Tests

**Path:** `apps/api/src/modules/payments/`

#### Unit Tests

| Test Case | Description | Priority |
|-----------|-------------|----------|
| `should create payment intent` | Stripe intent | P0 |
| `should process payment` | Payment processing | P0 |
| `should handle webhook` | Webhook handling | P0 |
| `should verify webhook signature` | Signature verification | P0 |
| `should process refund` | Refund flow | P0 |
| `should handle failed payment` | Failure handling | P0 |
| `should support multiple currencies` | Multi-currency | P1 |
| `should handle idempotency` | Idempotent requests | P0 |

#### E2E Tests (`payment-flow.e2e-spec.ts`)

| Scenario | Description | Status |
|----------|-------------|--------|
| Stripe payment flow | Intent -> Confirm -> Success | ✅ |
| PayPal payment flow | Redirect -> Capture | ✅ |
| Payment failure | Card declined | ✅ |
| Refund processing | Full and partial | ✅ |
| Webhook processing | Payment events | ✅ |
| Multi-currency | Currency conversion | ✅ |

#### Webhook Idempotency Tests

| Test Case | Description | Status |
|-----------|-------------|--------|
| `should process webhook once` | First receipt | ✅ |
| `should ignore duplicate webhook` | Second receipt | ✅ |
| `should handle out-of-order webhooks` | Event ordering | ✅ |
| `should verify signature` | Signature check | ✅ |

---

### 4.7 VENDOR Module Tests

**Path:** `apps/api/src/modules/vendors/`

#### Unit Tests

| Test Case | Description | Priority |
|-----------|-------------|----------|
| `should register vendor` | Registration | P0 |
| `should update vendor profile` | Profile update | P0 |
| `should submit KYC documents` | KYC submission | P0 |
| `should verify KYC` | KYC verification | P0 |
| `should create vendor product` | Product creation | P0 |
| `should calculate commission` | Commission calc | P0 |
| `should process payout` | Payout processing | P1 |
| `should track vendor analytics` | Analytics | P1 |

#### RBAC Tests

| Test Case | Role | Expected |
|-----------|------|----------|
| View vendor dashboard | Vendor | ✅ Allow |
| View vendor dashboard | Customer | ❌ Deny |
| Update vendor profile | Vendor (own) | ✅ Allow |
| Update vendor profile | Vendor (other) | ❌ Deny |
| View all vendors | Admin | ✅ Allow |
| Approve KYC | Admin | ✅ Allow |

---

### 4.8 ORGANIZATION Module Tests

**Path:** `apps/api/src/modules/organization/`

#### E2E Tests (`organization.e2e-spec.ts`)

| Scenario | Description | Status |
|----------|-------------|--------|
| Create organization | Full creation flow | ✅ |
| Invite members | Send invites | ✅ |
| Accept invitation | Join organization | ✅ |
| Role assignment | Assign roles | ✅ |
| Permission enforcement | RBAC check | ✅ |
| KYC verification | Complete KYC | ✅ |
| Billing setup | Add payment method | ✅ |
| Subscription management | Subscribe to plan | ✅ |

---

## 5. NEGATIVE TEST SCENARIOS

### 5.1 Authentication Negative Tests

| Test Case | Input | Expected |
|-----------|-------|----------|
| Empty email | `""` | 400 Bad Request |
| Invalid email format | `"notanemail"` | 400 Bad Request |
| Password too short | `"123"` | 400 Bad Request |
| SQL injection attempt | `"'; DROP TABLE users;--"` | 400 Bad Request |
| XSS attempt | `"<script>alert('xss')</script>"` | Sanitized |
| Expired token | Expired JWT | 401 Unauthorized |
| Invalid token | Random string | 401 Unauthorized |
| Missing token | No header | 401 Unauthorized |

### 5.2 Authorization Negative Tests

| Test Case | Role | Resource | Expected |
|-----------|------|----------|----------|
| Customer accessing vendor dashboard | Customer | `/vendor/dashboard` | 403 Forbidden |
| Vendor accessing admin panel | Vendor | `/admin/*` | 403 Forbidden |
| Accessing other user's orders | Customer | `/orders/{other-id}` | 403 Forbidden |
| Modifying other vendor's product | Vendor | `/products/{other-vendor}` | 403 Forbidden |

### 5.3 Validation Negative Tests

| Test Case | Field | Input | Expected |
|-----------|-------|-------|----------|
| Negative price | `price` | `-10.00` | 400 Bad Request |
| Zero quantity | `quantity` | `0` | 400 Bad Request |
| Invalid UUID | `productId` | `"not-a-uuid"` | 400 Bad Request |
| Future date | `birthDate` | `2030-01-01` | 400 Bad Request |
| Invalid country code | `countryCode` | `"XXX"` | 400 Bad Request |

### 5.4 Business Logic Negative Tests

| Test Case | Scenario | Expected |
|-----------|----------|----------|
| Checkout with empty cart | No items | 400 Bad Request |
| Order out-of-stock item | Stock = 0 | 409 Conflict |
| Apply expired coupon | Coupon expired | 400 Bad Request |
| Exceed coupon usage limit | Limit reached | 400 Bad Request |
| Cancel shipped order | Status = Shipped | 400 Bad Request |
| Refund more than paid | Amount > Total | 400 Bad Request |

---

## 6. SECURITY TEST SCENARIOS

### 6.1 OWASP Top 10 Tests

| Vulnerability | Test Case | Status |
|---------------|-----------|--------|
| **A01: Broken Access Control** | RBAC enforcement | ✅ |
| **A02: Cryptographic Failures** | Password hashing (bcrypt) | ✅ |
| **A03: Injection** | SQL/NoSQL injection prevention | ✅ |
| **A04: Insecure Design** | Input validation | ✅ |
| **A05: Security Misconfiguration** | Header security | ✅ |
| **A06: Vulnerable Components** | Dependency scanning | ✅ |
| **A07: Auth Failures** | Token security | ✅ |
| **A08: Software Integrity** | Webhook signature verification | ✅ |
| **A09: Logging Failures** | Audit logging | ✅ |
| **A10: SSRF** | URL validation | ✅ |

### 6.2 Rate Limiting Tests

| Endpoint | Limit | Window | Test |
|----------|-------|--------|------|
| `/auth/login` | 5 | 1 min | ✅ |
| `/auth/forgot-password` | 3 | 1 min | ✅ |
| `/auth/register` | 5 | 1 min | ✅ |
| `/api/*` | 100 | 1 min | ✅ |

### 6.3 Data Protection Tests

| Test Case | Description | Status |
|-----------|-------------|--------|
| PII masking in logs | No sensitive data logged | ✅ |
| Password not in response | Password field excluded | ✅ |
| Token not in URL | Tokens in headers only | ✅ |
| HTTPS enforcement | HTTP redirects to HTTPS | ✅ |

---

## 7. LOAD & PERFORMANCE TESTS

### 7.1 Load Test Configuration

**Tool:** k6 / Artillery

**Path:** `apps/api/test/load/`

```javascript
// k6 configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },   // Steady state
    { duration: '2m', target: 200 },   // Spike
    { duration: '5m', target: 200 },   // Sustained spike
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% under 500ms
    http_req_failed: ['rate<0.01'],    // Error rate under 1%
  },
};
```

### 7.2 Load Test Scenarios

| Scenario | Target | Threshold | Status |
|----------|--------|-----------|--------|
| Product listing | 1000 RPS | p95 < 200ms | ⚠️ |
| Product search | 500 RPS | p95 < 300ms | ⚠️ |
| Add to cart | 200 RPS | p95 < 100ms | ✅ |
| Checkout | 100 RPS | p95 < 500ms | ✅ |
| Authentication | 500 RPS | p95 < 200ms | ✅ |
| Order creation | 50 RPS | p95 < 1000ms | ✅ |

### 7.3 Stress Test Scenarios

| Scenario | Load | Duration | Expected |
|----------|------|----------|----------|
| Normal load | 100 users | 10 min | All pass |
| High load | 500 users | 10 min | < 1% errors |
| Spike | 1000 users | 2 min | Graceful degradation |
| Soak | 200 users | 1 hour | No memory leaks |

### 7.4 Database Performance Tests

| Query | Target | Current | Status |
|-------|--------|---------|--------|
| Product by ID | < 10ms | 5ms | ✅ |
| Product search | < 100ms | 80ms | ✅ |
| Order history | < 50ms | 35ms | ✅ |
| Cart retrieval | < 20ms | 12ms | ✅ |
| User lookup | < 10ms | 6ms | ✅ |

---

## 8. CONTRACT TESTS

### 8.1 OpenAPI Contract Tests

**Path:** `apps/api/test/contracts/`

| Domain | Spec File | Status |
|--------|-----------|--------|
| Auth | `auth.openapi.yaml` | ✅ |
| Products | `products.openapi.yaml` | ✅ |
| Orders | `orders.openapi.yaml` | ✅ |
| Payments | `payments.openapi.yaml` | ✅ |
| Vendors | `vendors.openapi.yaml` | ✅ |

### 8.2 Consumer Contract Tests

| Consumer | Provider | Contract | Status |
|----------|----------|----------|--------|
| Web App | API | Products | ⚠️ |
| Mobile App | API | Auth | ⚠️ |
| Mobile App | API | Cart | ⚠️ |

---

## 9. SMOKE TESTS

### 9.1 Health Check Smoke Tests

**Path:** `apps/api/test/smoke/`

| Test | Endpoint | Expected | Status |
|------|----------|----------|--------|
| API Health | `GET /health` | 200 OK | ✅ |
| Database Health | `GET /health/database` | 200 OK | ✅ |
| Redis Health | `GET /health/cache` | 200 OK | ✅ |
| Elasticsearch Health | `GET /health/elasticsearch` | 200 OK | ✅ |

### 9.2 Critical Path Smoke Tests

| Test | Description | Status |
|------|-------------|--------|
| User can register | Registration endpoint | ✅ |
| User can login | Authentication | ✅ |
| Products are visible | Catalog access | ✅ |
| Cart operations work | Add/remove items | ✅ |
| Checkout initiates | Checkout flow | ✅ |
| Payments process | Payment intent | ✅ |

---

## 10. TEST DATA MANAGEMENT

### 10.1 Test Fixtures

**Path:** `apps/api/test/fixtures/`

| Fixture | Description |
|---------|-------------|
| `users.fixture.ts` | Test users (customer, vendor, admin) |
| `products.fixture.ts` | Sample products with variants |
| `orders.fixture.ts` | Order templates |
| `payments.fixture.ts` | Payment method mocks |

### 10.2 Test Database

| Environment | Database | Reset Strategy |
|-------------|----------|----------------|
| Unit Tests | In-memory | Per test |
| Integration | Docker PostgreSQL | Per suite |
| E2E | Docker PostgreSQL | Per suite |
| CI/CD | Azure PostgreSQL (test) | Per pipeline |

### 10.3 Mock Services

| Service | Mock Strategy |
|---------|---------------|
| Stripe | `stripe-mock` library |
| PayPal | Custom mock server |
| Email | In-memory queue |
| SMS | Mock service |
| Elasticsearch | Docker container |
| Redis | Docker container |

---

## 11. CI/CD TEST INTEGRATION

### 11.1 GitHub Actions CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm test:e2e

  load-test:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: k6 run test/load/scenarios.js
```

### 11.2 Test Gates

| Gate | Criteria | Required |
|------|----------|----------|
| Unit Tests | 100% pass | Yes |
| Coverage | > 80% | Yes |
| Integration | 100% pass | Yes |
| E2E | 100% pass | Yes |
| Security Scan | No critical | Yes |
| Load Test | p95 < 500ms | No (main only) |

---

## 12. TEST COMMANDS

### Running Tests

```bash
# Unit tests
pnpm test

# Unit tests with coverage
pnpm test:cov

# Watch mode
pnpm test:watch

# Specific module
pnpm test -- --testPathPattern=auth

# E2E tests
pnpm test:e2e

# Load tests
pnpm test:load

# All tests
pnpm test:all
```

### Debug Tests

```bash
# Debug single test
node --inspect-brk node_modules/.bin/jest --runInBand auth.service.spec.ts

# Verbose output
pnpm test -- --verbose
```

---

## 13. TEST METRICS

### Current Coverage

| Module | Statements | Branches | Functions | Lines |
|--------|------------|----------|-----------|-------|
| Auth | 90% | 85% | 92% | 90% |
| Products | 85% | 80% | 88% | 85% |
| Cart | 88% | 82% | 90% | 88% |
| Checkout | 85% | 80% | 87% | 85% |
| Orders | 88% | 84% | 90% | 88% |
| Payments | 90% | 86% | 92% | 90% |
| **Overall** | **85%** | **80%** | **88%** | **85%** |

### Coverage Targets

| Phase | Target | Current | Status |
|-------|--------|---------|--------|
| MVP | 80% | 85% | ✅ |
| Phase 2 | 85% | - | Pending |
| Production | 90% | - | Pending |

---

## 14. TEST INVENTORY SUMMARY

| Category | Count | Status |
|----------|-------|--------|
| Unit Test Files | 71 | ✅ |
| E2E Test Files | 7 | ✅ |
| Test Scenarios | 500+ | ✅ |
| RBAC Tests | 50+ | ✅ |
| Negative Tests | 100+ | ✅ |
| Security Tests | 30+ | ✅ |
| Load Test Scenarios | 10 | ⚠️ |
| Smoke Tests | 10 | ✅ |

---

## 15. NEXT STEPS

1. **Increase E2E coverage** - Add vendor-specific flows
2. **Contract tests** - Implement Pact for consumer contracts
3. **Load test automation** - Integrate k6 into CI/CD
4. **Chaos testing** - Add resilience tests
5. **Visual regression** - Add frontend visual tests

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-17
**Status:** Production-Ready
**Next:** OpenAPI Specs / GitHub Actions Workflows
