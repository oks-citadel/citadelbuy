# Testing Quick Reference Guide

**Quick access guide for common testing tasks**

---

## 🚀 Common Commands

```bash
# Run all tests
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# Coverage report
npm run test:cov

# Run specific file
npm test -- auth.service.spec.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create"

# Debug tests
npm run test:debug
```

---

## 📝 Test Template

Copy this template to start a new test file:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('MyService', () => {
  let service: MyService;
  let prisma: PrismaService;

  const mockPrismaService = {
    myModel: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
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
  });
});
```

---

## 🎭 Common Mocks

### EmailService Mock

```typescript
const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
};

// Provide in module
{
  provide: EmailService,
  useValue: mockEmailService,
}
```

### PrismaService Mock

```typescript
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  order: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
};

// Provide in module
{
  provide: PrismaService,
  useValue: mockPrismaService,
}
```

### ConfigService Mock

```typescript
const mockConfigService = {
  get: jest.fn((key: string) => {
    const config = {
      'JWT_SECRET': 'test-secret',
      'JWT_EXPIRES_IN': '7d',
      'STRIPE_SECRET_KEY': 'sk_test_mock',
    };
    return config[key];
  }),
};

// Provide in module
{
  provide: ConfigService,
  useValue: mockConfigService,
}
```

### JwtService Mock

```typescript
const mockJwtService = {
  sign: jest.fn((payload) => 'mock-jwt-token'),
  verify: jest.fn((token) => ({ userId: '123', email: 'test@example.com' })),
};

// Provide in module
{
  provide: JwtService,
  useValue: mockJwtService,
}
```

---

## ✅ Common Assertions

```typescript
// Equality
expect(result).toEqual(expected);
expect(result).toBe(5);

// Truthiness
expect(result).toBeTruthy();
expect(result).toBeFalsy();
expect(result).toBeDefined();
expect(result).toBeNull();
expect(result).toBeUndefined();

// Numbers
expect(count).toBeGreaterThan(0);
expect(price).toBeLessThan(100);
expect(total).toBeCloseTo(99.99, 2);

// Strings
expect(email).toContain('@');
expect(message).toMatch(/error/i);

// Arrays
expect(array).toHaveLength(5);
expect(array).toContain('item');
expect(array).toEqual(expect.arrayContaining([1, 2]));

// Objects
expect(user).toHaveProperty('email');
expect(response).toEqual(expect.objectContaining({
  id: expect.any(String),
  name: 'Test',
}));

// Functions called
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(1);
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
expect(mockFn).toHaveBeenLastCalledWith(arg);

// Promises
await expect(promise).resolves.toBe('success');
await expect(promise).rejects.toThrow('Error message');
await expect(promise).rejects.toThrow(NotFoundException);

// Exceptions
expect(() => fn()).toThrow('Error');
expect(() => fn()).toThrow(Error);
```

---

## 🔄 Mock Return Values

```typescript
// Simple return value
mockFn.mockReturnValue('result');

// Return different values on multiple calls
mockFn
  .mockReturnValueOnce('first')
  .mockReturnValueOnce('second')
  .mockReturnValue('default');

// Async resolved value
mockFn.mockResolvedValue({ id: '1', name: 'Test' });

// Async rejected value
mockFn.mockRejectedValue(new Error('Failed'));

// Multiple async calls
mockFn
  .mockResolvedValueOnce({ id: '1' })
  .mockResolvedValueOnce({ id: '2' });

// Custom implementation
mockFn.mockImplementation((a, b) => a + b);

// Async implementation
mockFn.mockImplementation(async (id) => {
  if (id === '1') return { found: true };
  throw new Error('Not found');
});
```

---

## 🧩 Test Organization Patterns

### Group Related Tests

```typescript
describe('UserService', () => {
  describe('create', () => {
    it('should create user with valid data', async () => {});
    it('should hash password before saving', async () => {});
    it('should throw error for duplicate email', async () => {});
  });

  describe('findById', () => {
    it('should return user when found', async () => {});
    it('should throw NotFoundException when not found', async () => {});
  });
});
```

### Test Edge Cases

```typescript
describe('calculateTotal', () => {
  it('should calculate total for single item', async () => {});
  it('should calculate total for multiple items', async () => {});
  it('should handle empty cart', async () => {});
  it('should handle null items', async () => {});
  it('should handle negative quantities', async () => {});
  it('should round to 2 decimal places', async () => {});
});
```

---

## 🐛 Common Test Failures

### Mock Not Called

```typescript
// ❌ Problem
expect(mockFn).toHaveBeenCalled();
// Error: Expected mock function to have been called

// ✅ Solution
// 1. Check if the function is actually invoked
// 2. Ensure you're testing the right mock
// 3. Make sure jest.clearAllMocks() isn't clearing unexpectedly
```

### Async Not Awaited

```typescript
// ❌ Problem
it('should work', () => {
  service.asyncMethod(); // Missing await
  expect(result).toBe(expected);
});

// ✅ Solution
it('should work', async () => {
  const result = await service.asyncMethod();
  expect(result).toBe(expected);
});
```

### Mock Returns Undefined

```typescript
// ❌ Problem
mockService.getData.mockResolvedValue();
// Returns: Promise<undefined>

// ✅ Solution
mockService.getData.mockResolvedValue({ id: '1', name: 'Test' });
```

### Wrong Import Path

```typescript
// ❌ Problem
import { MyService } from '../my.service';
// Error: Cannot find module

// ✅ Solution
import { MyService } from './my.service';
// Or use alias:
import { MyService } from '@/modules/my/my.service';
```

---

## 📊 Coverage Thresholds

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50,
  },
  // Per-file thresholds
  './src/modules/auth/**/*.ts': {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

---

## 🎯 Testing Checklist

Before committing:

- [ ] All tests pass (`npm test`)
- [ ] No console.log in test files
- [ ] Test names are descriptive
- [ ] Happy path tested
- [ ] Error cases tested
- [ ] Edge cases considered
- [ ] Mocks are cleared between tests
- [ ] No hardcoded values (use constants)
- [ ] Coverage meets threshold

---

## 🔍 Debugging Tests

```typescript
// Add console.log
it('should work', async () => {
  console.log('Input:', input);
  const result = await service.method(input);
  console.log('Result:', result);
  expect(result).toBe(expected);
});

// Use debugger
it('should work', async () => {
  debugger; // Run with npm run test:debug
  const result = await service.method(input);
  expect(result).toBe(expected);
});

// Check mock calls
it('should work', async () => {
  await service.method(input);
  console.log('Mock calls:', mockFn.mock.calls);
  console.log('Mock results:', mockFn.mock.results);
});
```

---

## 📚 See Full Documentation

For comprehensive testing guide, see [TESTING.md](./TESTING.md)

---

**Quick Start:** Copy test template → Add mocks → Write tests → Run `npm test`
