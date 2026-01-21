# Broxiva Test Quick Reference

## Quick Start

### Run All Tests
```bash
cd C:/Users/citad/OneDrive/Documents/broxiva-master/organization/apps/api
npm test
```

### Run Specific Module Tests
```bash
# Payments
npm test -- payments.service.spec.ts
npm test -- payments.service.enhanced.spec.ts

# Orders
npm test -- orders.service.spec.ts
npm test -- orders.service.enhanced.spec.ts

# Authentication
npm test -- auth.service.spec.ts
npm test -- auth.service.enhanced.spec.ts

# Organization Billing
npm test -- billing.service.spec.ts
```

### Run with Coverage
```bash
npm run test:cov
```

---

## Test Files Location Map

```
C:/Users/citad/OneDrive/Documents/broxiva-master/organization/apps/api/src/modules/

├── payments/
│   ├── payments.service.spec.ts (EXISTING - 325 lines)
│   └── payments.service.enhanced.spec.ts (NEW - 744 lines)
│
├── orders/
│   ├── orders.service.spec.ts (EXISTING - 474 lines)
│   └── orders.service.enhanced.spec.ts (NEW - 607 lines)
│
├── auth/
│   ├── auth.service.spec.ts (EXISTING - 362 lines)
│   └── auth.service.enhanced.spec.ts (NEW - 782 lines)
│
└── organization-billing/
    └── tests/
        ├── billing.service.spec.ts (EXISTING - 816 lines - VERIFIED)
        ├── invoice.service.spec.ts (EXISTING)
        └── stripe.service.spec.ts (EXISTING)
```

---

## Test Coverage by Module

| Module | Test File | Lines | Tests | Coverage Area |
|--------|-----------|-------|-------|--------------|
| **Payments** | payments.service.spec.ts | 325 | 15 | Basic payment intents, webhooks |
| | payments.service.enhanced.spec.ts | 744 | 31 | Refunds, PayPal, Apple/Google Pay |
| **Orders** | orders.service.spec.ts | 474 | 16 | CRUD, status updates, stats |
| | orders.service.enhanced.spec.ts | 607 | 14 | Tracking, tax calc, emails |
| **Auth** | auth.service.spec.ts | 362 | 18 | Login, register, validate |
| | auth.service.enhanced.spec.ts | 782 | 22 | Refresh tokens, social, reset |
| **Billing** | billing.service.spec.ts | 816 | 24 | Subscriptions, invoices, cache |

**Total: 70+ comprehensive test cases**

---

## What Each Enhanced Test File Covers

### Payments Enhanced Tests
- ✅ Stripe refunds (full, partial, with metadata)
- ✅ PayPal order creation and capture
- ✅ Apple Pay integration
- ✅ Google Pay integration
- ✅ Wallet payment processing
- ✅ Domain verification for Apple Pay
- ✅ Multi-provider refund orchestration
- ✅ Error handling for all payment methods

### Orders Enhanced Tests
- ✅ Automatic tax calculation with TaxService
- ✅ Order tracking number generation
- ✅ Shipping status updates
- ✅ Delivery confirmation
- ✅ Email notifications (confirmation, tracking)
- ✅ International order handling
- ✅ Multi-item order processing
- ✅ Free shipping scenarios

### Auth Enhanced Tests
- ✅ JWT refresh token flow
- ✅ Token expiration handling
- ✅ Password reset with email
- ✅ Reset token security (hashing, expiration)
- ✅ Google OAuth login
- ✅ Facebook OAuth login
- ✅ Social login for new users
- ✅ Registration tracking integration

---

## Common Test Patterns

### 1. AAA Pattern (Arrange-Act-Assert)
```typescript
it('should do something', async () => {
  // Arrange - Set up test data and mocks
  const mockData = { ... };
  mockService.method.mockResolvedValue(mockData);

  // Act - Execute the code under test
  const result = await service.methodUnderTest(input);

  // Assert - Verify the results
  expect(result).toEqual(expectedOutput);
  expect(mockService.method).toHaveBeenCalledWith(expectedInput);
});
```

### 2. Error Testing
```typescript
it('should throw error for invalid input', async () => {
  // Arrange
  const invalidInput = null;

  // Act & Assert
  await expect(service.method(invalidInput)).rejects.toThrow(
    BadRequestException,
  );
});
```

### 3. Mock Setup
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  mockService.method.mockResolvedValue(defaultValue);
});
```

---

## Debugging Failed Tests

### Check Test Output
```bash
npm test -- --verbose
```

### Run Single Test
```typescript
it.only('should test specific case', async () => {
  // Test code
});
```

### Debug with Console Logs
```typescript
it('should debug test', async () => {
  const result = await service.method();
  console.log('Result:', JSON.stringify(result, null, 2));
  expect(result).toBeDefined();
});
```

### Common Issues & Solutions

1. **Mock not working**
   - Check `jest.clearAllMocks()` in `beforeEach`
   - Verify mock return value type

2. **Async test timing out**
   - Add `await` to async calls
   - Increase timeout: `jest.setTimeout(10000)`

3. **Module import errors**
   - Check `tsconfig.json` paths
   - Verify `moduleNameMapper` in `jest.config.js`

---

## Test Coverage Goals

| Module | Current | Target |
|--------|---------|--------|
| Payments | ~70% | 80% |
| Orders | ~65% | 80% |
| Auth | ~75% | 85% |
| Billing | ~80% | 85% |
| Overall API | ~50% | 70% |

---

## Key Business Logic Tested

### Payment Processing
- ✅ Payment intent creation
- ✅ Payment capture
- ✅ Full and partial refunds
- ✅ Multi-provider support
- ✅ Error recovery

### Order Management
- ✅ Order creation with tax
- ✅ Status transitions
- ✅ Tracking updates
- ✅ Email notifications
- ✅ International shipping

### User Authentication
- ✅ Login/Register flows
- ✅ Token management
- ✅ Password reset security
- ✅ Social OAuth
- ✅ Session management

### Subscription Billing
- ✅ Subscription lifecycle
- ✅ Payment method management
- ✅ Invoice generation
- ✅ Stripe integration
- ✅ Cache management

---

## Next Steps

### Immediate
1. Fix any failing tests
2. Run coverage report
3. Review coverage gaps

### Short-term
1. Add integration tests
2. Add E2E tests for checkout
3. Performance testing

### Long-term
1. Maintain 70%+ coverage
2. Regular test audits
3. Automated CI/CD testing

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Test Coverage Report](./coverage/lcov-report/index.html) (after running `npm run test:cov`)

---

**Last Updated**: 2025-12-04
