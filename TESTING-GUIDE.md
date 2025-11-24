# Testing Guide

**Date:** 2025-11-21
**Current Coverage:** 73.89% line coverage
**Target Coverage:** 85%+

## Overview

This guide provides comprehensive testing strategies, utilities, and examples to improve test coverage across the CitadelBuy platform.

---

## Table of Contents

1. [Testing Stack](#testing-stack)
2. [Test Structure](#test-structure)
3. [Testing Utilities](#testing-utilities)
4. [Writing Tests](#writing-tests)
5. [Coverage Gaps](#coverage-gaps)
6. [Best Practices](#best-practices)
7. [Running Tests](#running-tests)

---

## 1. Testing Stack

### Framework & Tools

- **Jest**: Testing framework
- **@nestjs/testing**: NestJS testing utilities
- **Supertest**: HTTP assertions for E2E tests
- **Prisma Client**: Database mocking

### Coverage Status

| Module | Coverage | Status |
|--------|----------|--------|
| Auth | 85% | ✅ Good |
| Products | 78% | ⚠️ Needs improvement |
| Orders | 72% | ⚠️ Needs improvement |
| Analytics | 45% | ❌ Low coverage |
| I18n | 30% | ❌ Low coverage |
| Admin | 40% | ❌ Low coverage |

---

## 2. Test Structure

### Directory Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── products/
│   │   │   ├── products.controller.ts
│   │   │   ├── products.controller.spec.ts  ← Controller tests
│   │   │   ├── products.service.ts
│   │   │   └── products.service.spec.ts     ← Service tests
│   │   └── ...
│   └── test/
│       ├── helpers/
│       │   └── test-utils.ts                 ← Testing utilities
│       └── factories/
│           └── entity.factory.ts             ← Mock data factories
└── test/
    └── e2e/
        └── products.e2e-spec.ts               ← E2E tests
```

### Test Types

1. **Unit Tests** (`*.spec.ts`)
   - Test individual functions/methods
   - Mock dependencies
   - Fast execution

2. **Integration Tests**
   - Test multiple modules together
   - Use real database (test DB)
   - Test workflows

3. **E2E Tests** (`*.e2e-spec.ts`)
   - Test complete user flows
   - Test HTTP endpoints
   - Test authentication/authorization

---

## 3. Testing Utilities

### Test Utils (`test/helpers/test-utils.ts`)

#### Create Testing Module

```typescript
import { createTestingModule } from '@/test/helpers/test-utils';

const module = await createTestingModule({
  controllers: [ProductsController],
  providers: [ProductsService],
});
```

#### Mock Services

```typescript
import {
  createMockPrismaService,
  createMockRedisService,
  createMockConfigService,
} from '@/test/helpers/test-utils';

const mockPrisma = createMockPrismaService();
const mockRedis = createMockRedisService();
const mockConfig = createMockConfigService();
```

#### Mock Request/Response

```typescript
import { createMockRequest, createMockResponse } from '@/test/helpers/test-utils';

const mockReq = createMockRequest({
  user: { id: '123', role: 'ADMIN' },
  params: { id: 'prod-1' },
});

const mockRes = createMockResponse();
```

### Entity Factories (`test/factories/entity.factory.ts`)

#### User Factory

```typescript
import { UserFactory } from '@/test/factories/entity.factory';

// Create single user
const user = UserFactory.create();
const admin = UserFactory.createAdmin();
const vendor = UserFactory.createVendor();

// Create multiple users
const users = UserFactory.createMany(5);
```

#### Product Factory

```typescript
import { ProductFactory } from '@/test/factories/entity.factory';

const product = ProductFactory.create({
  name: 'Custom Product',
  price: 49.99,
});

const products = ProductFactory.createMany(10);
```

#### Order Factory

```typescript
import { OrderFactory } from '@/test/factories/entity.factory';

const order = OrderFactory.create();
const orderWithItems = OrderFactory.createWithItems(3);
```

---

## 4. Writing Tests

### Controller Tests

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { createMockPrismaService } from '@/test/helpers/test-utils';
import { ProductFactory } from '@/test/factories/entity.factory';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: createMockPrismaService() },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  describe('findAll', () => {
    it('should return an array of products', async () => {
      const mockProducts = ProductFactory.createMany(3);
      jest.spyOn(service, 'findAll').mockResolvedValue(mockProducts);

      const result = await controller.findAll();

      expect(result).toEqual(mockProducts);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single product', async () => {
      const mockProduct = ProductFactory.create();
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProduct);

      const result = await controller.findOne('prod-1');

      expect(result).toEqual(mockProduct);
      expect(service.findOne).toHaveBeenCalledWith('prod-1');
    });

    it('should throw NotFoundException when product not found', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(null);

      await expect(controller.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const createDto = DtoFactory.createProductDto();
      const mockProduct = ProductFactory.create(createDto);

      jest.spyOn(service, 'create').mockResolvedValue(mockProduct);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockProduct);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });
});
```

### Service Tests

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { createMockPrismaService, createMockRedisService } from '@/test/helpers/test-utils';
import { ProductFactory } from '@/test/factories/entity.factory';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: createMockPrismaService() },
        { provide: RedisService, useValue: createMockRedisService() },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
  });

  describe('findAll', () => {
    it('should return all products', async () => {
      const mockProducts = ProductFactory.createMany(5);
      (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);

      const result = await service.findAll();

      expect(result).toEqual(mockProducts);
      expect(prisma.product.findMany).toHaveBeenCalled();
    });

    it('should use cache when available', async () => {
      const mockProducts = ProductFactory.createMany(5);
      (redis.get as jest.Mock).mockResolvedValue(mockProducts);

      const result = await service.findAll();

      expect(result).toEqual(mockProducts);
      expect(redis.get).toHaveBeenCalledWith('products:all');
      expect(prisma.product.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      const mockProduct = ProductFactory.create();
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);

      const result = await service.findOne('prod-1');

      expect(result).toEqual(mockProduct);
      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
      });
    });

    it('should return null when product not found', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.findOne('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const createDto = DtoFactory.createProductDto();
      const mockProduct = ProductFactory.create(createDto);
      (prisma.product.create as jest.Mock).mockResolvedValue(mockProduct);

      const result = await service.create(createDto);

      expect(result).toEqual(mockProduct);
      expect(prisma.product.create).toHaveBeenCalledWith({ data: createDto });
    });

    it('should invalidate cache after creation', async () => {
      const createDto = DtoFactory.createProductDto();
      const mockProduct = ProductFactory.create(createDto);
      (prisma.product.create as jest.Mock).mockResolvedValue(mockProduct);

      await service.create(createDto);

      expect(redis.delPattern).toHaveBeenCalledWith('products:*');
    });
  });
});
```

### E2E Tests

```typescript
import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '@/app.module';

describe('Products (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /products', () => {
    it('should return all products', () => {
      return request(app.getHttpServer())
        .get('/api/products')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get('/api/products?page=1&limit=10')
        .expect(200)
        .expect((res) => {
          expect(res.body.length).toBeLessThanOrEqual(10);
        });
    });
  });

  describe('GET /products/:id', () => {
    it('should return a product by id', () => {
      return request(app.getHttpServer())
        .get('/api/products/prod-1')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name');
        });
    });

    it('should return 404 for invalid id', () => {
      return request(app.getHttpServer())
        .get('/api/products/invalid-id')
        .expect(404);
    });
  });

  describe('POST /products', () => {
    it('should create a new product (authenticated)', () => {
      return request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'New Product',
          description: 'A new product',
          price: 99.99,
          stock: 50,
          categoryId: 'cat-1',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('New Product');
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/products')
        .send({
          name: 'New Product',
          price: 99.99,
        })
        .expect(401);
    });
  });
});
```

---

## 5. Coverage Gaps

### Modules Needing Tests

#### 1. Analytics Module (45% coverage)

**Missing Tests:**
- Analytics aggregation methods
- Date range filtering
- Chart data generation
- Export functionality

**Priority Tests:**
```typescript
describe('AnalyticsService', () => {
  it('should aggregate sales by date range');
  it('should calculate conversion rates');
  it('should generate chart data');
  it('should export analytics to CSV');
});
```

#### 2. I18n Module (30% coverage)

**Missing Tests:**
- Translation loading
- Language switching
- Translation fallbacks
- Pluralization rules

**Priority Tests:**
```typescript
describe('I18nService', () => {
  it('should load translations for locale');
  it('should fallback to default language');
  it('should handle pluralization');
  it('should cache translations');
});
```

#### 3. Admin Module (40% coverage)

**Missing Tests:**
- Admin dashboard stats
- Bulk operations
- User management
- System configuration

**Priority Tests:**
```typescript
describe('AdminController', () => {
  it('should return dashboard statistics');
  it('should perform bulk product updates');
  it('should manage user roles');
  it('should update system configuration');
});
```

---

## 6. Best Practices

### DO

✅ **Test business logic thoroughly**
```typescript
it('should calculate order total with discount', async () => {
  const order = OrderFactory.createWithItems(3);
  const discount = 0.1; // 10% off

  const total = await service.calculateTotal(order.id, discount);

  expect(total).toBe(order.total * 0.9);
});
```

✅ **Test error cases**
```typescript
it('should throw when product out of stock', async () => {
  const product = ProductFactory.create({ stock: 0 });

  await expect(service.addToCart(product.id, 1)).rejects.toThrow(
    'Product out of stock',
  );
});
```

✅ **Test edge cases**
```typescript
it('should handle empty array', async () => {
  const result = await service.processOrders([]);
  expect(result).toEqual([]);
});

it('should handle null values', async () => {
  const result = await service.findOne(null);
  expect(result).toBeNull();
});
```

✅ **Use descriptive test names**
```typescript
// Good
it('should calculate shipping cost based on weight and distance')

// Bad
it('should work')
```

### DON'T

❌ **Don't test implementation details**
```typescript
// Bad - tests internal state
it('should set loading to true', () => {
  service.fetchData();
  expect(service['loading']).toBe(true);
});

// Good - tests behavior
it('should return data when fetch succeeds', async () => {
  const result = await service.fetchData();
  expect(result).toBeDefined();
});
```

❌ **Don't write flaky tests**
```typescript
// Bad - depends on timing
it('should update after 100ms', (done) => {
  service.update();
  setTimeout(() => {
    expect(service.data).toBeDefined();
    done();
  }, 100);
});

// Good - use async/await
it('should update data', async () => {
  await service.update();
  expect(service.data).toBeDefined();
});
```

❌ **Don't skip tests without reason**
```typescript
// Bad
it.skip('should work', () => {});

// Good
it.skip('should calculate complex tax (TODO: fix test data)', () => {});
```

---

## 7. Running Tests

### Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run specific test file
npm test -- products.service.spec.ts

# Run E2E tests
npm run test:e2e

# Run tests with debugging
npm run test:debug
```

### Coverage Report

```bash
# Generate coverage report
npm run test:cov

# View HTML coverage report
open coverage/lcov-report/index.html
```

### Test Configuration

**jest.config.js:**
```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
};
```

---

## Next Steps

### Immediate Priority

1. **Analytics Module**
   - Add tests for dashboard stats
   - Test aggregation methods
   - Test chart data generation

2. **I18n Module**
   - Add tests for translation loading
   - Test language switching
   - Test fallback mechanisms

3. **Admin Module**
   - Add tests for admin operations
   - Test bulk updates
   - Test user management

### Target Coverage

| Module | Current | Target | Priority |
|--------|---------|--------|----------|
| Analytics | 45% | 80% | High |
| I18n | 30% | 75% | High |
| Admin | 40% | 80% | High |
| Products | 78% | 85% | Medium |
| Orders | 72% | 85% | Medium |

---

## Conclusion

**Testing Utilities Created:**
- ✅ Test helper functions (`test-utils.ts`)
- ✅ Entity factories (`entity.factory.ts`)
- ✅ Mock service creators
- ✅ Request/Response mocks

**Coverage Improvement Plan:**
- Target: 85%+ line coverage
- Focus: Analytics, I18n, Admin modules
- Strategy: Unit + Integration + E2E tests

**Benefits:**
- 🚀 Faster development (catch bugs early)
- 🛡️ Safer refactoring (confidence in changes)
- 📚 Better documentation (tests as examples)
- 🎯 Higher quality (edge cases covered)
