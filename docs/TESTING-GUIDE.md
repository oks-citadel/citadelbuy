# CitadelBuy Testing Guide

**Version:** 1.0
**Last Updated:** 2025-11-16

## Overview

This guide covers the comprehensive testing strategy for the CitadelBuy e-commerce platform, including unit tests, integration tests, E2E tests, performance testing, and security auditing.

## Table of Contents

1. [Testing Stack](#testing-stack)
2. [Test Structure](#test-structure)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [E2E Testing](#e2e-testing)
6. [Performance Testing](#performance-testing)
7. [Security Testing](#security-testing)
8. [Running Tests](#running-tests)
9. [Coverage Goals](#coverage-goals)
10. [CI/CD Integration](#cicd-integration)

## Testing Stack

### Backend Testing
- **Framework:** Jest
- **Test Runner:** Jest with ts-jest
- **Mocking:** Jest mock functions
- **Database:** In-memory SQLite or Test Database
- **API Testing:** Supertest
- **Coverage:** Istanbul (built into Jest)

### Frontend Testing
- **Framework:** Jest + React Testing Library
- **E2E:** Playwright
- **Component Testing:** React Testing Library
- **Mocking:** MSW (Mock Service Worker)
- **Coverage:** Istanbul

## Test Structure

### Backend Structure
```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.service.spec.ts    # Unit tests
│   │   │   └── auth.controller.spec.ts # Integration tests
│   │   ├── orders/
│   │   │   ├── orders.service.spec.ts
│   │   │   └── orders.controller.spec.ts
│   │   └── products/
│   │       ├── products.service.spec.ts
│   │       └── products.controller.spec.ts
│   └── test/
│       ├── helpers/
│       │   ├── test-db.helper.ts
│       │   └── mock-data.helper.ts
│       └── e2e/
│           ├── auth.e2e-spec.ts
│           ├── checkout.e2e-spec.ts
│           └── admin.e2e-spec.ts
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── Button.tsx
│   │   └── Button.test.tsx
│   ├── store/
│   │   ├── cart-store.ts
│   │   └── cart-store.test.ts
│   └── __tests__/
│       ├── integration/
│       │   └── checkout-flow.test.tsx
│       └── e2e/
│           └── purchase-flow.spec.ts
```

## Unit Testing

### Backend Unit Tests

#### Example: OrdersService Unit Test

```typescript
// backend/src/modules/orders/orders.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    order: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUserId', () => {
    it('should return user orders sorted by creation date', async () => {
      const mockOrders = [
        { id: '1', userId: 'user1', total: 100, createdAt: new Date() },
        { id: '2', userId: 'user1', total: 200, createdAt: new Date() },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.findByUserId('user1');

      expect(result).toEqual(mockOrders);
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status and log the change', async () => {
      const mockOrder = {
        id: 'order1',
        status: 'PENDING' as OrderStatus,
      };

      const updatedOrder = {
        ...mockOrder,
        status: 'PROCESSING' as OrderStatus,
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue(updatedOrder);

      const result = await service.updateOrderStatus(
        'order1',
        'PROCESSING' as OrderStatus,
      );

      expect(result.status).toBe('PROCESSING');
      expect(prisma.order.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOrderStatus('nonexistent', 'PROCESSING' as OrderStatus),
      ).rejects.toThrow('Order nonexistent not found');
    });
  });

  describe('getOrderStats', () => {
    it('should return order statistics', async () => {
      mockPrismaService.order.count.mockImplementation(({ where }) => {
        if (!where) return Promise.resolve(100);
        if (where.status === 'PENDING') return Promise.resolve(10);
        if (where.status === 'PROCESSING') return Promise.resolve(20);
        return Promise.resolve(0);
      });

      mockPrismaService.order.aggregate.mockResolvedValue({
        _sum: { total: 10000 },
      });

      const stats = await service.getOrderStats();

      expect(stats.totalOrders).toBe(100);
      expect(stats.ordersByStatus.pending).toBe(10);
      expect(stats.totalRevenue).toBe(10000);
    });
  });
});
```

#### Example: Cart Store Unit Test (Frontend)

```typescript
// frontend/src/store/cart-store.test.ts
import { renderHook, act } from '@testing-library/react';
import { useCartStore } from './cart-store';

describe('CartStore', () => {
  beforeEach(() => {
    // Clear store before each test
    useCartStore.setState({ items: [] });
    localStorage.clear();
  });

  it('should add item to cart', () => {
    const { result } = renderHook(() => useCartStore());
    const mockProduct = {
      id: '1',
      name: 'Test Product',
      price: 99.99,
      stock: 10,
      images: [],
    };

    act(() => {
      result.current.addItem(mockProduct, 2);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.itemCount()).toBe(2);
  });

  it('should calculate subtotal correctly', () => {
    const { result } = renderHook(() => useCartStore());
    const mockProduct = {
      id: '1',
      name: 'Test Product',
      price: 50,
      stock: 10,
      images: [],
    };

    act(() => {
      result.current.addItem(mockProduct, 2);
    });

    expect(result.current.subtotal()).toBe(100);
  });

  it('should not exceed stock when adding items', () => {
    const { result } = renderHook(() => useCartStore());
    const mockProduct = {
      id: '1',
      name: 'Test Product',
      price: 50,
      stock: 5,
      images: [],
    };

    act(() => {
      result.current.addItem(mockProduct, 3);
      result.current.addItem(mockProduct, 5); // Should cap at 5
    });

    expect(result.current.items[0].quantity).toBe(5);
  });
});
```

## Integration Testing

### Backend Integration Tests

#### Example: Auth Controller Integration Test

```typescript
// backend/src/modules/auth/auth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body.user).toHaveProperty('email', 'test@example.com');
        });
    });

    it('should reject duplicate email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
        });
    });

    it('should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });
});
```

## E2E Testing

### Playwright E2E Tests

#### Example: Complete Purchase Flow

```typescript
// frontend/src/__tests__/e2e/purchase-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete Purchase Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should complete full purchase from product to confirmation', async ({ page }) => {
    // 1. Navigate to products
    await page.click('text=Products');
    await expect(page).toHaveURL(/.*products/);

    // 2. Add product to cart
    await page.click('[data-testid="product-card"]:first-child button:has-text("Add to Cart")');
    await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('1');

    // 3. Go to cart
    await page.click('[data-testid="cart-icon"]');
    await expect(page).toHaveURL(/.*cart/);

    // 4. Proceed to checkout
    await page.click('text=Proceed to Checkout');
    await expect(page).toHaveURL(/.*checkout/);

    // 5. Fill shipping form
    await page.fill('[name="fullName"]', 'John Doe');
    await page.fill('[name="email"]', 'john@example.com');
    await page.fill('[name="phone"]', '1234567890');
    await page.fill('[name="street"]', '123 Main St');
    await page.fill('[name="city"]', 'New York');
    await page.fill('[name="state"]', 'NY');
    await page.fill('[name="postalCode"]', '10001');
    await page.fill('[name="country"]', 'United States');
    await page.click('button:has-text("Continue to Payment")');

    // 6. Fill payment (using Stripe test mode)
    await page.waitForSelector('iframe[name*="stripe"]');
    const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
    await stripeFrame.locator('[placeholder*="Card number"]').fill('4242424242424242');
    await stripeFrame.locator('[placeholder*="MM"]').fill('12/25');
    await stripeFrame.locator('[placeholder*="CVC"]').fill('123');
    await page.click('button:has-text("Review Order")');

    // 7. Review and place order
    await page.click('button:has-text("Place Order")');

    // 8. Verify confirmation
    await expect(page).toHaveURL(/.*orders.*success=true/);
    await expect(page.locator('text=Order Placed Successfully')).toBeVisible();
  });

  test('should handle payment failure gracefully', async ({ page }) => {
    // Use Stripe test card that fails
    // ... similar flow but with declined card
  });
});
```

## Performance Testing

### Load Testing with Artillery

```yaml
# artillery-config.yml
config:
  target: 'http://localhost:4000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"

scenarios:
  - name: "Browse products"
    flow:
      - get:
          url: "/products"
      - think: 2
      - get:
          url: "/products/{{ $randomString() }}"

  - name: "Complete checkout"
    flow:
      - post:
          url: "/auth/login"
          json:
            email: "test@example.com"
            password: "password123"
      - post:
          url: "/orders"
          json:
            items: [...]
```

### Performance Benchmarks

**Target Metrics:**
- API response time: < 200ms (p95)
- Page load time: < 2s
- Time to interactive: < 3s
- Concurrent users: 1000+
- Database query time: < 50ms (p95)

## Security Testing

### Security Checklist

- [ ] SQL Injection Prevention (Prisma ORM)
- [ ] XSS Prevention (React escaping)
- [ ] CSRF Protection
- [ ] JWT Token Security
- [ ] Password Hashing (bcrypt)
- [ ] Input Validation (class-validator)
- [ ] Rate Limiting
- [ ] HTTPS Enforcement
- [ ] Sensitive Data Encryption
- [ ] CORS Configuration
- [ ] Helmet Security Headers
- [ ] Dependency Vulnerabilities (npm audit)

### Security Testing Tools

```bash
# Run security audit
npm audit

# Fix vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated

# Run OWASP dependency check
npm install -g retire
retire

# Test SSL/TLS
nmap --script ssl-enum-ciphers -p 443 your-domain.com
```

## Running Tests

### Backend Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:cov

# Run specific test file
npm test orders.service.spec.ts

# Run in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

### Frontend Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run E2E tests
npx playwright test

# Run E2E in headed mode
npx playwright test --headed

# Generate test report
npx playwright show-report
```

## Coverage Goals

### Target Coverage

- **Unit Tests:** ≥ 80%
- **Integration Tests:** ≥ 70%
- **E2E Tests:** Critical paths only

### Priority Test Coverage

1. **Critical:** Auth, Payments, Orders (90%+)
2. **High:** Products, Cart (80%+)
3. **Medium:** UI Components (70%+)
4. **Low:** Utilities, Helpers (60%+)

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd backend && npm ci
      - run: cd backend && npm run test:cov
      - uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd frontend && npm ci
      - run: cd frontend && npm test -- --coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
```

## Best Practices

1. **Test Isolation:** Each test should be independent
2. **Clear Names:** Describe what is being tested
3. **AAA Pattern:** Arrange, Act, Assert
4. **Mock External Dependencies:** Database, APIs, etc.
5. **Test Edge Cases:** Not just happy paths
6. **Keep Tests Fast:** Unit tests < 1s each
7. **Maintain Tests:** Update with code changes
8. **Use Factories:** For test data generation

## Troubleshooting

### Common Issues

**Issue:** Tests failing locally but passing in CI
**Solution:** Check environment variables, database state

**Issue:** Slow test execution
**Solution:** Review database queries, use test database

**Issue:** Flaky E2E tests
**Solution:** Add explicit waits, check for race conditions

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/react)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)

## Conclusion

Comprehensive testing ensures the CitadelBuy platform is reliable, secure, and performs well under load. Following this guide will help maintain high code quality and catch issues before they reach production.
