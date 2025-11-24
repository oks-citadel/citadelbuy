# Testing Guide - CitadelBuy Backend

**Last Updated:** 2025-11-18
**Test Framework:** Jest 30.2.0
**Current Coverage:** 8.4% overall, 100% tested services
**Test Success Rate:** 142/142 tests passing (100%)

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Running Tests](#running-tests)
3. [Writing Tests](#writing-tests)
4. [Test Structure](#test-structure)
5. [Mocking Best Practices](#mocking-best-practices)
6. [Coverage Goals](#coverage-goals)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 25.2.0 (or compatible version)
- npm installed
- Backend dependencies installed (`npm install`)

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:cov
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

---

## 🧪 Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:cov

# Run specific test file
npm test -- auth.service.spec.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should create an order"

# Debug tests
npm run test:debug
```

### Test Output

```bash
PASS src/modules/auth/auth.service.spec.ts (15 tests)
PASS src/modules/products/products.service.spec.ts (21 tests)
PASS src/modules/orders/orders.service.spec.ts (14 tests)

Test Suites: 3 passed, 3 total
Tests:       50 passed, 50 total
Snapshots:   0 total
Time:        2.626 s
```

---

## ✍️ Writing Tests

### Test File Naming

- **Location:** Place test files next to the source file
- **Naming:** Use `.spec.ts` suffix
- **Example:** `auth.service.ts` → `auth.service.spec.ts`

### Basic Test Structure

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('MyService', () => {
  let service: MyService;
  let prisma: PrismaService;

  // Mock dependencies
  const mockPrismaService = {
    myModel: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MyService>(MyService);
    prisma = module.get<PrismaService>(PrismaService);

    // Clear mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('myMethod', () => {
    it('should return expected result', async () => {
      // Arrange
      const mockData = { id: '1', name: 'Test' };
      mockPrismaService.myModel.findUnique.mockResolvedValue(mockData);

      // Act
      const result = await service.myMethod('1');

      // Assert
      expect(result).toEqual(mockData);
      expect(mockPrismaService.myModel.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockPrismaService.myModel.findUnique.mockRejectedValue(
        new Error('Database error')
      );

      // Act & Assert
      await expect(service.myMethod('1')).rejects.toThrow('Database error');
    });
  });
});
```

---

## 🏗️ Test Structure

### Organize Tests with describe() Blocks

```typescript
describe('ProductsService', () => {
  // Setup code here

  describe('findAll', () => {
    it('should return all products', async () => {
      // Test implementation
    });

    it('should filter by category', async () => {
      // Test implementation
    });

    it('should handle pagination', async () => {
      // Test implementation
    });
  });

  describe('findOne', () => {
    it('should return a single product', async () => {
      // Test implementation
    });

    it('should throw NotFoundException when not found', async () => {
      // Test implementation
    });
  });

  describe('create', () => {
    it('should create a new product', async () => {
      // Test implementation
    });

    it('should validate required fields', async () => {
      // Test implementation
    });
  });
});
```

### AAA Pattern (Arrange, Act, Assert)

Always structure your tests using the AAA pattern:

```typescript
it('should create an order successfully', async () => {
  // ARRANGE: Set up test data and mocks
  const userId = 'user-123';
  const orderData = { items: [...], total: 100 };
  mockPrismaService.order.create.mockResolvedValue(mockOrder);

  // ACT: Execute the function being tested
  const result = await service.create(userId, orderData);

  // ASSERT: Verify the results
  expect(result).toEqual(mockOrder);
  expect(mockPrismaService.order.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ userId, total: 100 }),
  });
});
```

---

## 🎭 Mocking Best Practices

### Mock External Dependencies

Always mock external services (database, APIs, email, etc.):

```typescript
// Mock PrismaService
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

// Mock EmailService
const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
};

// Mock ConfigService
const mockConfigService = {
  get: jest.fn((key: string) => {
    const config = {
      'JWT_SECRET': 'test-secret',
      'JWT_EXPIRES_IN': '7d',
    };
    return config[key];
  }),
};
```

### Provide Mocks to Testing Module

```typescript
const module: TestingModule = await Test.createTestingModule({
  providers: [
    MyService,
    {
      provide: PrismaService,
      useValue: mockPrismaService,
    },
    {
      provide: EmailService,
      useValue: mockEmailService,
    },
    {
      provide: ConfigService,
      useValue: mockConfigService,
    },
  ],
}).compile();
```

### Mock Return Values

```typescript
// Mock resolved promise
mockService.findOne.mockResolvedValue({ id: '1', name: 'Test' });

// Mock rejected promise
mockService.findOne.mockRejectedValue(new Error('Not found'));

// Mock multiple calls with different values
mockService.findOne
  .mockResolvedValueOnce({ id: '1' })
  .mockResolvedValueOnce({ id: '2' });

// Mock implementation
mockService.calculate.mockImplementation((a, b) => a + b);
```

### Clear Mocks Between Tests

```typescript
beforeEach(() => {
  // Clear all mock call history
  jest.clearAllMocks();

  // OR reset mock implementations
  jest.resetAllMocks();
});
```

---

## 📊 Coverage Goals

### Current Coverage Status

```
Module                    Lines   Branches   Functions   Statements
---------------------------------------------------------------------
auth (services)           56.66%    58.33%     57.14%      55.17%
categories (services)       100%    95.65%       100%        100%
orders (services)         54.21%    53.19%     47.36%      53.08%
payments (services)       96.77%    86.66%       100%      96.55%
products (services)       40.86%    35.48%        50%      40.44%
reviews (services)          100%    90.32%       100%        100%
users (services)            100%       75%       100%        100%
wishlist (services)         100%       90%       100%        100%
---------------------------------------------------------------------
Overall Coverage          8.4%
```

**Note:** Overall coverage is low due to 12+ untested services and untested controllers. Tested services average ~70% coverage.

### Coverage Goals

#### Phase 1: Critical Paths (✅ Complete)
- **Target:** Test all authentication, orders, and products
- **Status:** ✅ Achieved (100% of critical tests passing)
- **Tests:** 50 tests (Auth, Orders, Products)

#### Phase 2: Core Features (✅ Complete)
- **Target:** Expand test coverage to key user-facing features
- **Status:** ✅ Achieved (142 tests, 100% success rate)
- **Modules Tested:**
  - ✅ Users service (12 tests, 100% coverage)
  - ✅ Categories service (23 tests, 100% coverage)
  - ✅ Reviews service (25 tests, 100% coverage)
  - ✅ Payments service (14 tests, 96.77% coverage)
  - ✅ Wishlist service (18 tests, 100% coverage)

#### Phase 3: Additional Services (Next)
- **Target:** 20% overall coverage
- **Priority modules:**
  - Email service
  - Search service
  - Recommendations service
  - Analytics service

#### Phase 3: Full Coverage (Future)
- **Target:** 80% overall coverage
- **Include:**
  - All controllers
  - All services
  - All edge cases
  - Error handling

### View Coverage Report

```bash
# Generate coverage report
npm run test:cov

# View HTML report (opens in browser)
open coverage/lcov-report/index.html
```

---

## 🔄 CI/CD Integration

### GitHub Actions Setup

Create `.github/workflows/test.yml`:

```yaml
name: Run Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: citadelbuy
          POSTGRES_PASSWORD: password
          POSTGRES_DB: citadelbuy_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        working-directory: ./citadelbuy/backend

      - name: Run database migrations
        run: npx prisma migrate deploy
        working-directory: ./citadelbuy/backend
        env:
          DATABASE_URL: postgresql://citadelbuy:password@localhost:5432/citadelbuy_test

      - name: Run tests
        run: npm test -- --coverage
        working-directory: ./citadelbuy/backend
        env:
          DATABASE_URL: postgresql://citadelbuy:password@localhost:5432/citadelbuy_test
          NODE_ENV: test

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./citadelbuy/backend/coverage/lcov.info
```

### Pre-commit Hooks

Install Husky for pre-commit testing:

```bash
npm install --save-dev husky

# Initialize husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "cd citadelbuy/backend && npm test"
```

### Enforce Coverage Thresholds

Update `jest.config.js`:

```javascript
module.exports = {
  // ... other config
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. localStorage Error (Node.js 25+)

**Error:**
```
SecurityError: Cannot initialize local storage without a `--localstorage-file` path
```

**Solution:** Already fixed in `package.json`:
```json
{
  "scripts": {
    "test": "cross-env NODE_OPTIONS=\"--localstorage-file=./test-storage.db\" jest --runInBand"
  }
}
```

#### 2. Module Not Found Errors

**Error:**
```
Cannot find module '@/common/prisma/prisma.service'
```

**Solution:** Check `tsconfig.json` paths configuration:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

#### 3. Database Connection Errors

**Error:**
```
PrismaClientInitializationError: Can't reach database server
```

**Solution:** Ensure PostgreSQL is running:
```bash
docker compose up -d postgres
```

#### 4. Test Timeouts

**Error:**
```
Timeout - Async callback was not invoked within the 5000 ms timeout
```

**Solution:** Increase timeout or mock slow operations:
```typescript
it('should complete slow operation', async () => {
  // Increase timeout for this specific test
  jest.setTimeout(10000);

  // ... test code
}, 10000); // or pass timeout as third parameter
```

#### 5. Mock Not Working

**Issue:** Mock is not being called or returns undefined

**Solution:**
```typescript
// Ensure mock is properly configured
mockService.myMethod.mockResolvedValue(expectedValue);

// Check if mock was called
expect(mockService.myMethod).toHaveBeenCalled();

// Check mock call arguments
expect(mockService.myMethod).toHaveBeenCalledWith(expectedArgs);

// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

---

## 📚 Additional Resources

### Official Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Testing Library](https://testing-library.com/docs/)

### Best Practices
- [Test-Driven Development (TDD)](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [AAA Pattern](https://medium.com/@pjbgf/title-testing-code-ocd-and-the-aaa-pattern-df453975ab80)
- [Mocking Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Examples in This Project
- `src/modules/auth/auth.service.spec.ts` - Authentication testing (15 tests)
- `src/modules/products/products.service.spec.ts` - Service with complex queries (21 tests)
- `src/modules/orders/orders.service.spec.ts` - Service with transactions (14 tests)
- `src/modules/users/users.service.spec.ts` - Simple CRUD service (12 tests)
- `src/modules/categories/categories.service.spec.ts` - Complex service with validation (23 tests)
- `src/modules/reviews/reviews.service.spec.ts` - Service with permissions (25 tests)
- `src/modules/payments/payments.service.spec.ts` - External API integration (14 tests)
- `src/modules/wishlist/wishlist.service.spec.ts` - User-specific data (18 tests)

---

## 🎯 Testing Checklist

When writing tests for a new feature, ensure:

- [ ] Unit tests for all service methods
- [ ] Test happy path (successful execution)
- [ ] Test error cases (validation, not found, etc.)
- [ ] Test edge cases (null, undefined, empty arrays)
- [ ] Mock all external dependencies
- [ ] Use AAA pattern (Arrange, Act, Assert)
- [ ] Clear and descriptive test names
- [ ] Code coverage > 80% for new code
- [ ] All tests pass locally
- [ ] Tests run in reasonable time (< 5 seconds per test)

---

## 🚀 Next Steps

1. **Write tests for remaining untested services:**
   - Email service (infrastructure)
   - Search service (customer-facing)
   - Recommendations service (AI/ML)
   - Analytics service (business intelligence)
   - Subscriptions service (recurring revenue)
   - BNPL service (payments)
   - Deals service (promotions)
   - Gift cards service (payments)
   - Loyalty service (engagement)
   - Advertisements service (revenue)

2. **Add controller tests:**
   - Test HTTP endpoints
   - Validate request/response DTOs
   - Test authentication guards
   - Test authorization rules

3. **Add E2E tests:**
   - Complete user registration flow
   - Complete purchase flow
   - Admin operations
   - Payment processing

4. **Set up CI/CD:**
   - Configure GitHub Actions
   - Add automated testing on PR
   - Block merges if tests fail
   - Coverage reporting to Codecov

5. **Improve coverage:**
   - Target 20% overall coverage (Phase 3)
   - Target 50% overall coverage (Phase 4)
   - Focus on critical business logic
   - Add integration tests

---

**Version:** 1.0.0
**Last Updated:** 2025-11-18
**Maintained by:** Development Team
