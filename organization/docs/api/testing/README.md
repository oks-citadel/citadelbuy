# Test Helpers Documentation

This directory contains comprehensive test utilities, fixtures, and mocks for CitadelBuy API testing.

## Table of Contents

- [Overview](#overview)
- [File Structure](#file-structure)
- [test-utils.ts](#test-utilsts)
- [test-helpers.ts](#test-helpersts)
- [fixtures.ts](#fixturests)
- [mocks.ts](#mocksts)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)

## Overview

The test helpers provide a complete suite of utilities to make testing easier, more consistent, and more maintainable. They cover:

- **Database Operations**: Clean up, seeding, and test data creation
- **Authentication**: Token generation and authenticated requests
- **Mocking**: Mock services for external dependencies
- **Fixtures**: Pre-defined sample data for common scenarios
- **Assertions**: Custom assertion helpers for common patterns
- **Request Helpers**: Utilities for making HTTP requests in tests

## File Structure

```
test/helpers/
├── test-utils.ts        # Core testing utilities (mocks, helpers, assertions)
├── test-helpers.ts      # E2E test helpers (database operations, user/product creation)
├── fixtures.ts          # Sample data fixtures for all entities
├── mocks.ts            # Mock service implementations
└── README.md           # This file
```

## test-utils.ts

Contains core testing utilities for both unit and E2E tests.

### Mock Services

```typescript
import { createMockPrismaService, createMockRedisService, createMockConfigService } from './test-utils';

// Create mock services
const mockPrisma = createMockPrismaService();
const mockRedis = createMockRedisService();
const mockConfig = createMockConfigService();
```

### Testing Module Creation

```typescript
import { createTestingModule } from './test-utils';

const module = await createTestingModule({
  providers: [YourService],
  imports: [YourModule],
});
```

### Mock Request/Response Objects

```typescript
import { createMockRequest, createMockResponse } from './test-utils';

const mockReq = createMockRequest({
  user: { id: 'user-123', email: 'test@example.com', role: 'CUSTOMER' },
  body: { name: 'Test' },
});

const mockRes = createMockResponse();
```

### Authentication Helpers

```typescript
import { generateTestToken, createAuthenticatedRequest } from './test-utils';

// Generate a test JWT token
const token = generateTestToken({
  userId: 'user-123',
  email: 'test@example.com',
  role: 'CUSTOMER',
});

// Create authenticated request in E2E test
const { token, user } = await createAuthenticatedRequest(app, 'test@example.com', 'password123');
```

### Request Helpers

```typescript
import { makeAuthenticatedRequest } from './test-utils';

// Make authenticated GET request
const response = await makeAuthenticatedRequest(app, 'get', '/products', token)
  .expect(200);

// Make authenticated POST request
const response = await makeAuthenticatedRequest(app, 'post', '/products', token)
  .send({ name: 'New Product' })
  .expect(201);
```

### Assertion Helpers

```typescript
import {
  expectToHaveFields,
  expectNotToHaveFields,
  expectPaginatedResponse,
  expectRecentDate,
  expectArrayToContainObject
} from './test-utils';

// Check required fields
expectToHaveFields(response.body, ['id', 'name', 'email']);

// Check forbidden fields (like password)
expectNotToHaveFields(response.body, ['password', 'secretKey']);

// Check paginated response structure
expectPaginatedResponse(response.body);

// Check if date is recent
expectRecentDate(response.body.createdAt, 5); // within 5 seconds

// Check if array contains matching object
expectArrayToContainObject(users, { email: 'test@example.com' });
```

### Test Data Generators

```typescript
import { randomString, randomEmail, randomNumber, randomBoolean, randomDate } from './test-utils';

const email = randomEmail(); // test-abc123@example.com
const name = randomString(10); // random 10-char string
const age = randomNumber(18, 65); // random number between 18-65
const isActive = randomBoolean(); // true or false
const date = randomDate(); // random date
```

### Database Helpers

```typescript
import { cleanDatabase, hashPassword, comparePassword } from './test-utils';

// Clean up database
await cleanDatabase(prisma);

// Hash password
const hashedPassword = await hashPassword('password123');

// Compare password
const isMatch = await comparePassword('password123', hashedPassword);
```

### E2E Application Setup

```typescript
import { setupE2ETestApp, cleanupE2ETestApp } from './test-utils';

// Setup
const app = await setupE2ETestApp(moduleFixture);

// Cleanup
await cleanupE2ETestApp(app, prisma);
```

## test-helpers.ts

Contains E2E test helpers for database operations and entity creation.

### Database Cleanup

```typescript
import { cleanupDatabase } from './test-helpers';

beforeEach(async () => {
  await cleanupDatabase(prisma);
});
```

### Creating Test Users

```typescript
import { createTestUser } from './test-helpers';

// Create default customer
const customer = await createTestUser(prisma);

// Create admin user
const admin = await createTestUser(prisma, {
  email: 'admin@example.com',
  password: 'admin123',
  name: 'Admin User',
  role: 'ADMIN',
});
```

### Creating Test Categories

```typescript
import { createTestCategory } from './test-helpers';

const category = await createTestCategory(prisma, {
  name: 'Electronics',
  slug: 'electronics',
});
```

### Creating Test Products

```typescript
import { createTestProduct } from './test-helpers';

const product = await createTestProduct(prisma, category.id, {
  name: 'iPhone 15',
  price: 999.99,
  stock: 50,
});
```

### Creating Test Coupons

```typescript
import { createTestCoupon } from './test-helpers';

const coupon = await createTestCoupon(prisma, {
  code: 'SAVE20',
  discountType: 'PERCENTAGE',
  discountValue: 20,
});
```

### Creating Test Organizations

```typescript
import { createTestOrganization } from './test-helpers';

const organization = await createTestOrganization(prisma, userId, {
  name: 'Test Corp',
  slug: 'test-corp',
});
```

### Utility Functions

```typescript
import { generateTestEmail, generateTestSlug, waitFor } from './test-helpers';

const email = generateTestEmail(); // unique email
const slug = generateTestSlug('product'); // product-timestamp-random

// Wait for condition
await waitFor(async () => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  return order?.status === 'SHIPPED';
}, 5000); // timeout 5 seconds
```

## fixtures.ts

Contains pre-defined sample data for all entities.

### User Fixtures

```typescript
import { userFixtures, generateUserFixture } from './fixtures';

// Use predefined users
const customer = userFixtures.customer;
const vendor = userFixtures.vendor;
const admin = userFixtures.admin;

// Multiple customers
const customers = userFixtures.multipleCustomers;

// Generate random user
const randomUser = generateUserFixture({ role: 'VENDOR' });
```

### Category Fixtures

```typescript
import { categoryFixtures, generateCategoryFixture } from './fixtures';

const electronics = categoryFixtures.electronics;
const computers = categoryFixtures.computers;

// Generate random category
const category = generateCategoryFixture({ isFeatured: true });
```

### Product Fixtures

```typescript
import { productFixtures, generateProductFixture } from './fixtures';

const laptop = productFixtures.laptop;
const phone = productFixtures.phone;
const outOfStock = productFixtures.outOfStock;
const inactive = productFixtures.inactive;

// Generate random product
const product = generateProductFixture(categoryId, { price: 199.99 });
```

### Order Fixtures

```typescript
import { orderFixtures } from './fixtures';

const pendingOrder = orderFixtures.pending;
const shippedOrder = orderFixtures.shipped;
```

### Coupon Fixtures

```typescript
import { couponFixtures, generateCouponFixture } from './fixtures';

const percentageCoupon = couponFixtures.percentage;
const fixedCoupon = couponFixtures.fixed;
const freeShipping = couponFixtures.freeShipping;
const expired = couponFixtures.expired;

// Generate random coupon
const coupon = generateCouponFixture({ discountValue: 15 });
```

### Organization Fixtures

```typescript
import { organizationFixtures, generateOrganizationFixture } from './fixtures';

const business = organizationFixtures.business;
const enterprise = organizationFixtures.enterprise;

// Generate random organization
const org = generateOrganizationFixture(ownerId, { type: 'ENTERPRISE' });
```

### Shipping Address Fixtures

```typescript
import { shippingAddressFixtures, generateShippingAddressFixture } from './fixtures';

const usAddress = shippingAddressFixtures.us;
const canadaAddress = shippingAddressFixtures.canada;

// Generate random address
const address = generateShippingAddressFixture({ country: 'US' });
```

### Other Fixtures

```typescript
import { reviewFixtures, cartItemFixtures, paymentFixtures, errorFixtures } from './fixtures';

const positiveReview = reviewFixtures.positive;
const cartItem = cartItemFixtures.single;
const creditCardPayment = paymentFixtures.creditCard;
const notFoundError = errorFixtures.notFound;
```

## mocks.ts

Contains mock implementations of external services.

### Mock Email Service

```typescript
import { MockEmailService } from './mocks';

const emailService = new MockEmailService();

// Send email
await emailService.sendEmail('test@example.com', 'Subject', 'Content');

// Check sent emails
const sentEmails = emailService.getSentEmails();
const lastEmail = emailService.getLastEmail();

// Find specific emails
const email = emailService.findEmailByRecipient('test@example.com');
const emails = emailService.findEmailsBySubject('Welcome');

// Clear sent emails
emailService.clearSentEmails();
```

### Mock Payment Service

```typescript
import { MockPaymentService } from './mocks';

const paymentService = new MockPaymentService();

// Create payment intent
const intent = await paymentService.createPaymentIntent(1000, 'usd');

// Confirm payment
await paymentService.confirmPaymentIntent(intent.id);

// Create refund
await paymentService.createRefund(intent.id, 500);

// Customer operations
const customer = await paymentService.createCustomer('test@example.com', 'Test User');
```

### Mock Storage Service

```typescript
import { MockStorageService } from './mocks';

const storageService = new MockStorageService();

// Upload file
const file = await storageService.uploadFile({ size: 1024 }, 'test.jpg');

// Get signed URL
const signedUrl = await storageService.getSignedUrl('test.jpg', 3600);

// Delete file
await storageService.deleteFile('test.jpg');

// List files
const files = await storageService.listFiles('images/');
```

### Mock Search Service

```typescript
import { MockSearchService } from './mocks';

const searchService = new MockSearchService();

// Index product
await searchService.indexProduct('prod-1', { name: 'iPhone', price: 999 });

// Search products
const results = await searchService.searchProducts('iphone', { minPrice: 500 });

// Bulk index
await searchService.bulkIndexProducts(products);

// Clear index
await searchService.clearIndex();
```

### Mock Cache Service

```typescript
import { MockCacheService } from './mocks';

const cacheService = new MockCacheService();

// Set/Get
await cacheService.set('key', 'value', 3600); // TTL in seconds
const value = await cacheService.get('key');

// Delete
await cacheService.del('key');
await cacheService.delPattern('user:*');

// Increment/Decrement
await cacheService.incr('counter');
await cacheService.decr('counter');
```

### Mock Queue Service

```typescript
import { MockQueueService } from './mocks';

const queueService = new MockQueueService();

// Add job
const job = await queueService.addJob('emails', { to: 'test@example.com' });

// Process job
await queueService.processJob(job.id);

// Get jobs
const jobs = await queueService.getJobs('emails');
```

### Mock Notification Service

```typescript
import { MockNotificationService } from './mocks';

const notificationService = new MockNotificationService();

// Send notification
await notificationService.sendNotification('user-1', 'Title', 'Message');

// Get notifications
const notifications = notificationService.getNotifications('user-1');
const unreadCount = notificationService.getUnreadCount('user-1');
```

### Mock Analytics Service

```typescript
import { MockAnalyticsService } from './mocks';

const analyticsService = new MockAnalyticsService();

// Track events
await analyticsService.trackEvent('button_clicked', { button: 'buy' });
await analyticsService.trackProductView('prod-1', 'user-1');
await analyticsService.trackPurchase('order-1', 99.99, 'user-1');

// Get events
const events = analyticsService.getEvents('product_view', 'user-1');
const count = analyticsService.getEventCount('purchase');
```

### Create All Mocks

```typescript
import { createAllMocks } from './mocks';

const mocks = createAllMocks();
// Returns: { emailService, paymentService, storageService, searchService, ... }
```

## Usage Examples

### Complete E2E Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  setupE2ETestApp,
  cleanupE2ETestApp,
  expectToHaveFields,
  expectNotToHaveFields
} from './helpers/test-utils';
import {
  cleanupDatabase,
  createTestUser,
  createTestCategory,
  createTestProduct,
} from './helpers/test-helpers';
import { userFixtures, productFixtures } from './helpers/fixtures';

describe('Products (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await setupE2ETestApp(moduleFixture);
    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await cleanupE2ETestApp(app, prisma);
  });

  beforeEach(async () => {
    await cleanupDatabase(prisma);

    // Create and login user
    const user = await createTestUser(prisma, userFixtures.customer);
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: user.email,
        password: user.password,
      });
    authToken = loginResponse.body.access_token;
  });

  it('should create a product', async () => {
    const category = await createTestCategory(prisma);
    const productData = { ...productFixtures.laptop, categoryId: category.id };

    const response = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send(productData)
      .expect(201);

    expectToHaveFields(response.body, ['id', 'name', 'price', 'slug']);
    expect(response.body.name).toBe(productData.name);
    expect(response.body.price).toBe(productData.price);
  });
});
```

### Unit Test with Mocks

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { createMockPrismaService, createMockRedisService } from './helpers/test-utils';
import { productFixtures } from './helpers/fixtures';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: any;
  let redis: any;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    redis = createMockRedisService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should find product by id', async () => {
    const product = productFixtures.laptop;
    prisma.product.findUnique.mockResolvedValue(product);

    const result = await service.findOne('product-id');

    expect(result).toEqual(product);
    expect(prisma.product.findUnique).toHaveBeenCalledWith({
      where: { id: 'product-id' },
    });
  });
});
```

## Best Practices

1. **Always clean up the database** between tests to ensure test isolation:
   ```typescript
   beforeEach(async () => {
     await cleanupDatabase(prisma);
   });
   ```

2. **Use fixtures** for consistent test data instead of creating data inline:
   ```typescript
   // Good
   const user = await createTestUser(prisma, userFixtures.customer);

   // Avoid
   const user = await createTestUser(prisma, {
     email: 'test@example.com',
     password: 'password',
     // ... many fields
   });
   ```

3. **Use assertion helpers** for common patterns:
   ```typescript
   // Good
   expectToHaveFields(response.body, ['id', 'email', 'name']);
   expectNotToHaveFields(response.body, ['password']);

   // Avoid
   expect(response.body).toHaveProperty('id');
   expect(response.body).toHaveProperty('email');
   expect(response.body).not.toHaveProperty('password');
   ```

4. **Use mock services** for external dependencies:
   ```typescript
   const emailService = new MockEmailService();
   // Test logic
   expect(emailService.getSentEmails()).toHaveLength(1);
   ```

5. **Generate random data** to avoid conflicts:
   ```typescript
   const email = randomEmail();
   const slug = generateTestSlug('product');
   ```

6. **Use descriptive test names** that explain what is being tested:
   ```typescript
   it('should return 404 when product does not exist', async () => {
     // test
   });
   ```

7. **Clean up after tests** to avoid side effects:
   ```typescript
   afterEach(() => {
     emailService.clearSentEmails();
     cacheService.flushAll();
   });
   ```

## Contributing

When adding new test utilities:

1. Add the utility to the appropriate file (test-utils.ts, fixtures.ts, or mocks.ts)
2. Document the utility with JSDoc comments
3. Add usage examples to this README
4. Write tests for the utility if it's complex

## Support

For questions or issues with the test infrastructure, please contact the development team or open an issue in the repository.
