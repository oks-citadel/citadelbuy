# E2E Testing Quick Reference

Quick reference guide for running and writing E2E tests in Broxiva.

## Quick Start

### Backend Tests (NestJS + Jest)

```bash
# Run all E2E tests
cd organization/apps/api && npm run test:e2e

# Run specific test file
npm run test:e2e payment-flow.e2e-spec.ts

# Run specific test
npm run test:e2e -- -t "should process payment"

# Watch mode
npm run test:e2e:watch

# With coverage
npm run test:e2e:cov
```

### Frontend Tests (Playwright)

```bash
# Run all E2E tests
cd organization/apps/web && npm run test:e2e

# Run specific file
npx playwright test checkout-flow.spec.ts

# UI mode (interactive)
npx playwright test --ui

# Debug mode
npx playwright test --debug

# Headed mode (see browser)
npx playwright test --headed

# Specific browser
npx playwright test --project=chromium
```

## Common Test Patterns

### Backend (Jest + Supertest)

```typescript
// Basic test structure
describe('Feature Name', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    // Setup app
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    // Clean database
    await cleanupDatabase(prisma);

    // Create test user and login
    const testUser = await createTestUser(prisma);
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    authToken = loginResponse.body.access_token;
  });

  it('should do something', async () => {
    const response = await request(app.getHttpServer())
      .post('/endpoint')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ data: 'value' })
      .expect(201);

    expect(response.body).toHaveProperty('id');
  });
});
```

### Frontend (Playwright)

```typescript
// Basic test structure
import { test, expect } from '@playwright/test';
import { registerUser, waitForNetworkIdle } from './helpers/test-helpers';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup (register/login user)
    const credentials = generateTestUser();
    await registerUser(page, credentials);
  });

  test('should do something', async ({ page }) => {
    // Navigate
    await page.goto('/products');
    await waitForNetworkIdle(page);

    // Interact
    await page.click('[data-testid="button"]');
    await page.fill('[data-testid="input"]', 'value');

    // Assert
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
    await expect(page).toHaveURL(/success/);
  });
});
```

## Helper Functions

### Backend Helpers

```typescript
// Create test data
const user = await createTestUser(prisma, { email: 'test@example.com' });
const category = await createTestCategory(prisma);
const product = await createTestProduct(prisma, categoryId, { price: 100 });
const coupon = await createTestCoupon(prisma, { code: 'SAVE10' });
const order = await createTestOrder(prisma, userId, [product]);

// Cleanup
await cleanupDatabase(prisma);

// Test addresses
import { TEST_ADDRESSES } from './helpers/test-fixtures';
const address = TEST_ADDRESSES.US;

// Payment tokens
import { TEST_PAYMENT_TOKENS } from './helpers/test-fixtures';
const token = TEST_PAYMENT_TOKENS.SUCCESS;
```

### Frontend Helpers

```typescript
// User management
const credentials = generateTestUser();
await registerUser(page, credentials);
await loginUser(page, credentials);
const token = await loginUserAPI(page, credentials); // Faster

// Navigation
await goToCart(page);
await goToCheckout(page);

// Forms
await fillShippingAddress(page, { city: 'New York' });
await fillPaymentInfo(page);

// Utilities
await waitForNetworkIdle(page);
const isAuthenticated = await isLoggedIn(page);
```

## Common Selectors

### Use data-testid Attributes

```typescript
// Good
await page.click('[data-testid="add-to-cart"]');
await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('1');

// Avoid
await page.click('.btn-primary.cart');
```

### Common Selectors

```typescript
// Search
'[data-testid="search-input"]'
'[data-testid="search-button"]'

// Cart
'[data-testid="cart-icon"]'
'[data-testid="cart-badge"]'
'[data-testid="cart-item"]'
'[data-testid="cart-total"]'

// Products
'[data-testid="product-card"]'
'[data-testid="product-name"]'
'[data-testid="product-price"]'
'[data-testid="add-to-cart"]'

// Checkout
'[data-testid="payment-method-stripe"]'
'[data-testid="order-summary"]'
'[data-testid="place-order"]'

// Account
'[data-testid="user-menu"]'
'[data-testid="logout-button"]'
'[data-testid="profile-name"]'
```

## Assertions

### Backend (Jest)

```typescript
// Status codes
expect(response.status).toBe(201);
expect([200, 201]).toContain(response.status);

// Response body
expect(response.body).toHaveProperty('id');
expect(response.body.email).toBe('test@example.com');
expect(response.body).not.toHaveProperty('password');

// Arrays
expect(response.body.items.length).toBe(3);
expect(response.body.items.length).toBeGreaterThan(0);

// Numbers
expect(Number(response.body.total)).toBeCloseTo(100, 2);

// Database
const user = await prisma.user.findUnique({ where: { id } });
expect(user).toBeTruthy();
expect(user?.email).toBe('test@example.com');
```

### Frontend (Playwright)

```typescript
// Visibility
await expect(page.locator('[data-testid="message"]')).toBeVisible();
await expect(page.locator('[data-testid="message"]')).not.toBeVisible();

// Text content
await expect(page.locator('h1')).toContainText('Welcome');
await expect(page.locator('[data-testid="price"]')).toHaveText('$99.99');

// URLs
await expect(page).toHaveURL('/checkout');
await expect(page).toHaveURL(/\/products\/[^\/]+$/);

// Form elements
await expect(page.locator('input[name="email"]')).toHaveValue('test@example.com');
await expect(page.locator('input[type="checkbox"]')).toBeChecked();

// Counts
await expect(page.locator('[data-testid="item"]')).toHaveCount(3);
await expect(page.locator('[data-testid="item"]')).toHaveCount({ min: 1 });

// Attributes
await expect(page.locator('button')).toBeDisabled();
await expect(page.locator('button')).toBeEnabled();
```

## Wait Strategies

### Backend

```typescript
// Wait for async operations
await waitFor(async () => {
  const order = await prisma.order.findUnique({ where: { id } });
  return order?.status === 'SHIPPED';
}, 5000);

// Wait for order status
await waitForOrderStatus(prisma, orderId, 'DELIVERED', 10000);
```

### Frontend

```typescript
// Wait for navigation
await page.waitForURL('/checkout');
await page.waitForURL(/\/products\/[^\/]+$/);

// Wait for network
await waitForNetworkIdle(page);
await page.waitForLoadState('networkidle');

// Wait for element
await page.waitForSelector('[data-testid="button"]');
await page.waitForSelector('text=Success');

// Wait for condition
await page.waitForFunction(() => {
  return document.querySelectorAll('.item').length > 5;
});

// Fixed timeout (use sparingly)
await page.waitForTimeout(1000);
```

## Environment Setup

### Backend Test Environment

Create `.env.test`:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/broxiva_test
JWT_SECRET=test-secret
JWT_REFRESH_SECRET=test-refresh-secret
REDIS_URL=redis://localhost:6379
SEARCH_PROVIDER=internal
```

### Frontend Test Environment

Create `.env.test.local`:

```env
PLAYWRIGHT_BASE_URL=http://localhost:3000
PLAYWRIGHT_API_URL=http://localhost:4000
```

## Debugging

### Backend Tests

```bash
# Verbose output
npm run test:e2e -- --verbose

# Run specific test
npm run test:e2e -- -t "should create order"

# Debug with inspector
node --inspect-brk node_modules/.bin/jest --runInBand test/payment-flow.e2e-spec.ts
```

### Frontend Tests

```bash
# Debug mode (step through)
npx playwright test --debug

# Show trace
npx playwright show-trace trace.zip

# Generate detailed trace
npx playwright test --trace on

# Screenshots on failure (automatic)
# Videos on failure (automatic)
```

## Test Data

### Use Realistic Data

```typescript
// Good
const email = generateTestEmail(); // test-1234567890@example.com
const address = TEST_ADDRESSES.US;
const token = TEST_PAYMENT_TOKENS.SUCCESS;

// Avoid
const email = 'test@test.com'; // May cause conflicts
const address = { zipCode: '123' }; // Invalid format
```

### Clean Up Test Data

```typescript
// Backend - automatic cleanup
beforeEach(async () => {
  await cleanupDatabase(prisma);
});

// Frontend - clear localStorage
beforeEach(async ({ page }) => {
  await page.evaluate(() => localStorage.clear());
});
```

## Error Handling

### Test Both Success and Failure

```typescript
// Success case
it('should process payment successfully', async () => {
  const response = await checkout(validData);
  expect(response.status).toBe(201);
});

// Error case
it('should handle payment failure', async () => {
  const response = await checkout(invalidData);
  expect([400, 402]).toContain(response.status);
  expect(response.body.message).toMatch(/declined|failed/i);
});
```

## Performance Tips

### Backend

```typescript
// Use API helpers for setup instead of UI
const token = await loginUserAPI(page, credentials); // Fast
await loginUser(page, credentials); // Slower

// Create test data efficiently
const [user, category, product] = await Promise.all([
  createTestUser(prisma),
  createTestCategory(prisma),
  createTestProduct(prisma, categoryId),
]);
```

### Frontend

```typescript
// Use API for authentication
await loginUserAPI(page, credentials); // Fast
await loginUser(page, credentials); // Slower (UI interaction)

// Parallel navigation when possible
const [response1, response2] = await Promise.all([
  page.goto('/page1'),
  page.goto('/page2'),
]);
```

## Common Pitfalls

### ❌ Avoid

```typescript
// Don't use fixed timeouts
await page.waitForTimeout(5000);

// Don't use brittle selectors
await page.click('.btn-primary > span.icon');

// Don't depend on test order
it('test 1', () => { /* creates data */ });
it('test 2', () => { /* uses data from test 1 */ }); // Bad!

// Don't forget to wait
await page.click('button');
expect(page.locator('.result')).toBeVisible(); // May fail!
```

### ✅ Do

```typescript
// Use proper wait conditions
await page.waitForSelector('[data-testid="result"]');
await waitForNetworkIdle(page);

// Use data-testid selectors
await page.click('[data-testid="submit-button"]');

// Make tests independent
beforeEach(() => {
  // Create fresh test data for each test
});

// Wait for operations to complete
await page.click('button');
await page.waitForSelector('.result');
expect(page.locator('.result')).toBeVisible();
```

## Useful Commands

```bash
# Backend
npm run test:e2e                    # Run all E2E tests
npm run test:e2e:watch              # Watch mode
npm run test:e2e:cov                # With coverage
npm run test:e2e -- -t "pattern"    # Run matching tests

# Frontend
npm run test:e2e                    # Run all tests
npx playwright test --ui            # Interactive mode
npx playwright test --debug         # Debug mode
npx playwright test --headed        # Show browser
npx playwright test --project=chromium  # Specific browser
npx playwright show-report          # Show test report
```

## File Locations

```
organization/
├── apps/
│   ├── api/
│   │   └── test/
│   │       ├── helpers/
│   │       │   ├── test-helpers.ts
│   │       │   └── test-fixtures.ts
│   │       ├── auth.e2e-spec.ts
│   │       ├── payment-flow.e2e-spec.ts
│   │       ├── order-lifecycle.e2e-spec.ts
│   │       └── user-registration.e2e-spec.ts
│   └── web/
│       └── e2e/
│           ├── helpers/
│           │   └── test-helpers.ts
│           ├── checkout-flow.spec.ts
│           ├── account-management.spec.ts
│           └── search-and-filter.spec.ts
└── E2E_TESTING_GUIDE.md
```

## Resources

- **Full Guide**: `E2E_TESTING_GUIDE.md`
- **Summary**: `E2E_TESTS_EXPANSION_SUMMARY.md`
- **Jest Docs**: https://jestjs.io/
- **Playwright Docs**: https://playwright.dev/
- **Supertest Docs**: https://github.com/visionmedia/supertest

---

**Tip**: Keep this file bookmarked for quick reference while writing tests!
