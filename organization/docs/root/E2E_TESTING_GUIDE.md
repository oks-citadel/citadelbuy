# E2E Testing Guide for Broxiva

## Overview

This guide provides comprehensive information about the End-to-End (E2E) testing infrastructure for the Broxiva platform.

## Test Structure

### Backend Tests (apps/api/test/)

Located in `apps/api/test/`, these tests validate the API endpoints and business logic.

#### Test Files

1. **auth.e2e-spec.ts** - Authentication and authorization
   - User registration
   - Login/logout flows
   - JWT token validation
   - Rate limiting

2. **shopping.e2e-spec.ts** - Shopping cart and product browsing
   - Product listing and filtering
   - Cart operations (add, update, remove)
   - Wishlist management
   - Coupon application

3. **checkout.e2e-spec.ts** - Checkout process
   - Guest and authenticated checkout
   - Address validation
   - Payment method selection
   - Order creation

4. **payment-flow.e2e-spec.ts** - Payment processing (NEW)
   - Stripe payment integration
   - PayPal payment processing
   - Cash on delivery
   - Payment failure handling
   - Multiple payment methods
   - International payments

5. **order-lifecycle.e2e-spec.ts** - Order management (NEW)
   - Order creation and retrieval
   - Status transitions (Pending → Processing → Shipped → Delivered)
   - Order cancellation
   - Stock management
   - Order tracking
   - Invoice generation

6. **user-registration.e2e-spec.ts** - Registration workflows (NEW)
   - Standard registration
   - Email validation
   - Password complexity requirements
   - Social authentication (Google, Facebook)
   - Email verification
   - Duplicate prevention

7. **organization.e2e-spec.ts** - Multi-tenant organization features
   - Organization creation
   - Member management
   - Role-based access control

### Frontend Tests (apps/web/e2e/)

Located in `apps/web/e2e/`, these tests validate the user interface and user experience using Playwright.

#### Test Files

1. **auth.spec.ts** - Authentication UI flows
   - Registration form validation
   - Login form validation
   - Session management
   - Password reset

2. **shopping.spec.ts** - Shopping experience
   - Product browsing
   - Cart interactions
   - Wishlist management
   - Quick view functionality

3. **checkout.spec.ts** - Basic checkout flow
   - Cart to checkout navigation
   - Guest checkout

4. **checkout-flow.spec.ts** - Complete checkout journey (NEW)
   - Full purchase flow: Add to cart → Checkout → Payment
   - Multiple items checkout
   - Quantity updates
   - Coupon code application
   - Payment method selection
   - Shipping options
   - Guest checkout
   - Error handling and validation
   - Order confirmation

5. **account-management.spec.ts** - User account features (NEW)
   - Profile management (view, edit, update)
   - Address management (add, edit, delete, set default)
   - Payment methods management
   - Order history viewing and filtering
   - Password changes
   - Email preferences
   - Two-factor authentication
   - Account deletion

6. **search-and-filter.spec.ts** - Product search and filtering (NEW)
   - Text search with autocomplete
   - Category filtering
   - Price range filtering
   - Brand filtering
   - Rating filtering
   - Stock availability filtering
   - Multiple filter combinations
   - Sorting (price, date, popularity, rating)
   - Pagination
   - View mode switching (grid/list)

## Test Helpers and Fixtures

### Backend Helpers (apps/api/test/helpers/)

#### test-helpers.ts
Core helper functions for backend tests:
- `cleanupDatabase()` - Clean all test data
- `createTestUser()` - Create test users with various roles
- `createTestCategory()` - Create product categories
- `createTestProduct()` - Create test products
- `createTestCoupon()` - Create discount coupons
- `createTestOrganization()` - Create test organizations
- `waitFor()` - Wait for async conditions
- `generateTestEmail()` - Generate unique test emails
- `generateTestSlug()` - Generate unique slugs

#### test-fixtures.ts (NEW)
Advanced fixtures for complex test scenarios:
- `TEST_ADDRESSES` - Pre-defined addresses (US, UK, Canada)
- `TEST_PAYMENT_TOKENS` - Stripe test tokens for different scenarios
- `createTestOrder()` - Create orders with items
- `createTestCart()` - Create pre-filled carts
- `createTestShippingMethod()` - Create shipping options
- `createTestReview()` - Create product reviews
- `createTestUserAddress()` - Create saved addresses
- `createTestPaymentMethod()` - Create saved payment methods
- `waitForOrderStatus()` - Wait for order status changes
- `getOrderHistory()` - Retrieve user order history

### Frontend Helpers (apps/web/e2e/helpers/)

#### test-helpers.ts
UI testing helper functions:
- `generateTestUser()` - Generate test credentials
- `registerUser()` - Register via UI
- `loginUser()` - Login via UI
- `loginUserAPI()` - Fast login via API
- `registerUserAPI()` - Fast registration via API
- `addToCart()` - Add products to cart
- `goToCart()` - Navigate to cart
- `goToCheckout()` - Navigate to checkout
- `fillShippingAddress()` - Fill address forms
- `fillPaymentInfo()` - Fill payment forms (Stripe)
- `isLoggedIn()` - Check authentication status
- `waitForNetworkIdle()` - Wait for network requests

## Running Tests

### Backend Tests

```bash
# Navigate to API directory
cd apps/api

# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- auth.e2e-spec.ts

# Run with coverage
npm run test:e2e:cov

# Run in watch mode
npm run test:e2e:watch

# Run specific test suite
npm run test:e2e -- -t "Payment Flow"
```

### Frontend Tests

```bash
# Navigate to web directory
cd apps/web

# Run all Playwright tests
npm run test:e2e

# Run in UI mode (interactive)
npm run test:e2e:ui

# Run specific test file
npx playwright test checkout-flow.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run on specific browser
npx playwright test --project=chromium

# Debug tests
npx playwright test --debug

# Generate test report
npx playwright show-report
```

## Test Configuration

### Backend Configuration (apps/api/test/jest-e2e.json)

```json
{
  "testEnvironment": "./jest-environment.js",
  "testRegex": ".e2e-spec.ts$",
  "testTimeout": 30000,
  "maxWorkers": 1,
  "setupFilesAfterEnv": ["<rootDir>/setup-e2e.ts"]
}
```

### Frontend Configuration (apps/web/playwright.config.ts)

Key settings:
- **Base URL**: http://localhost:3000 (configurable via `PLAYWRIGHT_BASE_URL`)
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Timeout**: 30 seconds per test
- **Retries**: 2 on CI, 0 locally
- **Screenshots**: On failure
- **Videos**: On failure
- **Traces**: On first retry

## Environment Variables

### Backend Tests

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/broxiva_test

# JWT
JWT_SECRET=test-jwt-secret-key
JWT_REFRESH_SECRET=test-jwt-refresh-secret-key

# Redis
REDIS_URL=redis://localhost:6379

# Search
SEARCH_PROVIDER=internal
ELASTICSEARCH_NODE=http://localhost:9200

# Email (test mode)
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=587
EMAIL_FROM=test@broxiva.com

# Rate Limiting (disabled in tests)
THROTTLE_LIMIT=1000000
```

### Frontend Tests

```env
# Application URL
PLAYWRIGHT_BASE_URL=http://localhost:3000

# API URL
PLAYWRIGHT_API_URL=http://localhost:4000
```

## Test Data Management

### Database Cleanup

Tests automatically clean the database before each test suite:

```typescript
beforeEach(async () => {
  await cleanupDatabase(prisma);
  // Create fresh test data
});
```

### Test Isolation

Each test should be independent:
- Create its own test data
- Not depend on other tests
- Clean up after itself

### Test Data Factories

Use helper functions to create consistent test data:

```typescript
// Create a complete test scenario
const user = await createTestUser(prisma);
const category = await createTestCategory(prisma);
const product = await createTestProduct(prisma, category.id);
const order = await createTestOrder(prisma, user.id, [product]);
```

## Best Practices

### 1. Test Organization

- Group related tests in `describe` blocks
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert

```typescript
describe('User Registration', () => {
  it('should register user with valid credentials', async () => {
    // Arrange
    const userData = { email: 'test@example.com', ... };

    // Act
    const response = await request(app).post('/auth/register').send(userData);

    // Assert
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('user');
  });
});
```

### 2. Error Handling

Test both happy paths and error scenarios:

```typescript
it('should handle payment failure gracefully', async () => {
  const checkoutData = {
    paymentToken: TEST_PAYMENT_TOKENS.DECLINED,
    ...
  };

  const response = await checkout(checkoutData);

  expect([400, 402]).toContain(response.status);
  expect(response.body.message).toBeTruthy();
});
```

### 3. Async Operations

Always wait for async operations:

```typescript
// Backend
await waitForOrderStatus(prisma, orderId, 'SHIPPED', 10000);

// Frontend
await page.waitForURL('/order-confirmation');
await waitForNetworkIdle(page);
```

### 4. Selectors (Frontend)

Prefer `data-testid` attributes:

```typescript
// Good
await page.click('[data-testid="add-to-cart"]');

// Avoid
await page.click('.btn-primary.cart-btn');
```

### 5. Test Data

Use realistic test data:

```typescript
const address = TEST_ADDRESSES.US; // Pre-defined realistic address
const token = TEST_PAYMENT_TOKENS.SUCCESS; // Valid test token
```

## Continuous Integration

### GitHub Actions

Tests run automatically on:
- Pull requests
- Push to main branch
- Manual workflow dispatch

Example workflow:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Run E2E tests
        run: npm run test:e2e

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run Playwright tests
        run: npm run test:e2e
```

## Debugging Tests

### Backend Tests

```bash
# Run with verbose output
npm run test:e2e -- --verbose

# Run single test
npm run test:e2e -- -t "should process payment"

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Frontend Tests

```bash
# Debug mode (step through tests)
npx playwright test --debug

# UI mode (interactive)
npx playwright test --ui

# Show trace viewer
npx playwright show-trace trace.zip

# Generate trace
npx playwright test --trace on
```

## Coverage Reports

### Backend

```bash
npm run test:e2e:cov
```

Coverage report generated in `coverage-e2e/` directory.

### Frontend

Playwright doesn't generate coverage by default, but you can:

```bash
# Run with coverage instrumentation
npx playwright test --reporter=html
npx playwright show-report
```

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL environment variable
   - Verify test database exists

2. **Timeout errors**
   - Increase test timeout in configuration
   - Check for hanging async operations
   - Verify external services are running

3. **Flaky tests**
   - Add proper wait conditions
   - Use `waitForNetworkIdle()`
   - Check for race conditions

4. **Stripe test errors**
   - Use proper test tokens
   - Check Stripe API key is in test mode
   - Verify test mode configuration

## Test Maintenance

### Regular Updates

- Update test data as schema changes
- Review and remove obsolete tests
- Keep helper functions DRY
- Update snapshots when UI changes

### Performance

- Keep tests fast (< 30s per file)
- Use API helpers instead of UI for setup
- Parallelize independent tests
- Clean up test data efficiently

## Contributing

When adding new features:

1. Write E2E tests for critical user journeys
2. Include both happy path and error scenarios
3. Update test helpers if needed
4. Document new test patterns
5. Ensure tests pass in CI

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Stripe Testing](https://stripe.com/docs/testing)

## Test Coverage Summary

### Current Coverage

#### Backend
- ✅ Authentication (auth.e2e-spec.ts)
- ✅ Shopping cart (shopping.e2e-spec.ts)
- ✅ Basic checkout (checkout.e2e-spec.ts)
- ✅ Payment processing (payment-flow.e2e-spec.ts) **NEW**
- ✅ Order lifecycle (order-lifecycle.e2e-spec.ts) **NEW**
- ✅ User registration (user-registration.e2e-spec.ts) **NEW**
- ✅ Organization management (organization.e2e-spec.ts)

#### Frontend
- ✅ Authentication UI (auth.spec.ts)
- ✅ Shopping experience (shopping.spec.ts)
- ✅ Basic checkout (checkout.spec.ts)
- ✅ Complete checkout flow (checkout-flow.spec.ts) **NEW**
- ✅ Account management (account-management.spec.ts) **NEW**
- ✅ Search and filtering (search-and-filter.spec.ts) **NEW**

### Coverage Gaps (Future Improvements)

- Vendor dashboard functionality
- Admin panel operations
- Shipping carrier integrations
- Tax calculation edge cases
- Multi-currency support
- Inventory management
- Returns and refunds
- Customer support chat
- Analytics and reporting
- Email notification verification
