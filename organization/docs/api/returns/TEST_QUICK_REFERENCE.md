# Returns Module - Test Quick Reference

## Quick Commands

```bash
# Run all returns tests
npm test returns

# Run with watch mode
npm test returns -- --watch

# Run with coverage
npm test returns -- --coverage

# Run only service tests
npm test returns.service.spec.ts

# Run only controller tests
npm test returns.controller.spec.ts

# Run specific test suite
npm test returns.service.spec.ts -- -t "createReturnRequest"
```

## Test Structure

### Service Tests (returns.service.spec.ts)

```typescript
describe('ReturnsService', () => {
  // Test groups by functionality:

  describe('createReturnRequest', () => {})     // RMA generation
  describe('approveReturn', () => {})          // Approval workflow
  describe('generateReturnLabel', () => {})    // Label generation
  describe('inspectReturn', () => {})          // Inspection process
  describe('createRefund', () => {})           // Refund creation
  describe('processRefund', () => {})          // Refund processing
  describe('issueStoreCredit', () => {})       // Store credit
  describe('restockItems', () => {})           // Inventory restock
  describe('getReturns', () => {})             // Query operations
  describe('cancelReturn', () => {})           // Cancellation
  describe('getReturnAnalytics', () => {})     // Analytics
});
```

### Controller Tests (returns.controller.spec.ts)

```typescript
describe('ReturnsController', () => {
  // Test groups by endpoint type:

  describe('createReturn', () => {})           // POST /returns
  describe('getMyReturns', () => {})          // GET /returns/my-returns
  describe('getReturnById', () => {})         // GET /returns/:id
  describe('cancelReturn', () => {})          // POST /returns/:id/cancel

  // Admin endpoints
  describe('getAllReturns (Admin)', () => {}) // GET /returns
  describe('approveReturn (Admin)', () => {}) // POST /returns/:id/approve
  describe('generateReturnLabel (Admin)', () => {}) // POST /returns/:id/generate-label
  describe('markAsReceived (Admin)', () => {}) // POST /returns/:id/mark-received
  describe('inspectReturn (Admin)', () => {})  // POST /returns/:id/inspect
  describe('createRefund (Admin)', () => {})   // POST /returns/:id/refund
  describe('processRefund (Admin)', () => {})  // POST /returns/refunds/:id/process
  describe('issueStoreCredit (Admin)', () => {}) // POST /returns/:id/issue-credit
  describe('restockItems (Admin)', () => {})   // POST /returns/restock
  describe('getAnalytics (Admin)', () => {})   // GET /returns/analytics/summary
});
```

## Common Test Patterns

### Testing Success Cases

```typescript
it('should perform action successfully', async () => {
  // Arrange
  const mockInput = { /* ... */ };
  const expectedOutput = { /* ... */ };
  mockService.method.mockResolvedValue(expectedOutput);

  // Act
  const result = await service.method(mockInput);

  // Assert
  expect(result).toEqual(expectedOutput);
  expect(mockDependency.method).toHaveBeenCalledWith(/* ... */);
});
```

### Testing Error Cases

```typescript
it('should throw NotFoundException if resource not found', async () => {
  // Arrange
  mockPrisma.resource.findUnique.mockResolvedValue(null);

  // Act & Assert
  await expect(service.method('invalid-id')).rejects.toThrow(NotFoundException);
  await expect(service.method('invalid-id')).rejects.toThrow('Specific error message');
});
```

### Testing Business Logic

```typescript
it('should calculate refund correctly', async () => {
  // Arrange
  const input = { subtotal: 100, shippingRefund: 10, taxRefund: 8, restockingFee: 5 };
  const expectedTotal = 113; // 100 + 10 + 8 - 5

  mockPrisma.refund.create.mockImplementation((args) => ({
    ...args.data,
    id: 'refund-123',
  }));

  // Act
  const result = await service.createRefund('return-123', input);

  // Assert
  expect(result.totalAmount).toBe(expectedTotal);
});
```

### Testing Validation

```typescript
it('should throw BadRequestException if status invalid', async () => {
  // Arrange
  const invalidReturn = { status: ReturnStatus.COMPLETED };
  mockPrisma.returnRequest.findUnique.mockResolvedValue(invalidReturn);

  // Act & Assert
  await expect(
    service.approveReturn('return-123', 'admin-123', { approved: true })
  ).rejects.toThrow(BadRequestException);
});
```

## Mock Setup Examples

### Basic Service Mock

```typescript
const mockReturnsService = {
  createReturnRequest: jest.fn(),
  approveReturn: jest.fn(),
  processRefund: jest.fn(),
  // ... other methods
};
```

### Prisma Mock with Complex Queries

```typescript
const mockPrismaService = {
  returnRequest: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  order: {
    findUnique: jest.fn(),
  },
  // ... other models
};
```

### Mock with Return Values

```typescript
beforeEach(() => {
  mockPrismaService.returnRequest.findUnique.mockResolvedValue({
    id: 'return-123',
    status: ReturnStatus.REQUESTED,
    // ... other fields
  });
});
```

### Mock with Multiple Return Values

```typescript
mockPrismaService.cart.findFirst
  .mockResolvedValueOnce(userCart)      // First call
  .mockResolvedValueOnce(guestCart);    // Second call
```

## Testing Checklist

When adding new features to the Returns module, ensure you test:

- ✅ **Success case** - Happy path works
- ✅ **Not found** - Resource doesn't exist
- ✅ **Invalid state** - Operation not allowed in current state
- ✅ **Authorization** - User ownership/permissions
- ✅ **Validation** - Input validation
- ✅ **Calculations** - Numeric calculations correct
- ✅ **Side effects** - Email sending, status updates, timeline
- ✅ **Edge cases** - Null values, empty arrays, etc.
- ✅ **Integration points** - Correct calls to dependencies

## Example: Adding a New Test

```typescript
describe('newMethod', () => {
  it('should perform new action successfully', async () => {
    // 1. Setup mocks
    const mockInput = { /* ... */ };
    const mockOutput = { /* ... */ };
    mockPrismaService.model.method.mockResolvedValue(mockOutput);

    // 2. Call method
    const result = await service.newMethod(mockInput);

    // 3. Verify result
    expect(result).toEqual(mockOutput);

    // 4. Verify dependencies called correctly
    expect(mockPrismaService.model.method).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockInput.id },
      })
    );
  });

  it('should handle error case', async () => {
    mockPrismaService.model.method.mockResolvedValue(null);

    await expect(service.newMethod({ id: 'invalid' })).rejects.toThrow(NotFoundException);
  });
});
```

## Common Assertions

```typescript
// Equality
expect(result).toEqual(expected);
expect(result.id).toBe('return-123');

// Truthiness
expect(result).toBeDefined();
expect(result).toBeTruthy();
expect(result).toBeNull();

// Exceptions
await expect(promise).rejects.toThrow(NotFoundException);
await expect(promise).rejects.toThrow('Error message');

// Function calls
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockFn).toHaveBeenCalledWith(expect.objectContaining({ field: 'value' }));

// Arrays
expect(array).toHaveLength(3);
expect(array).toContain(item);

// Objects
expect(object).toHaveProperty('field');
expect(object.field).toBe('value');

// Types
expect(result).toBeInstanceOf(Date);
expect(typeof result).toBe('string');

// Pattern matching
expect(string).toMatch(/^RMA\d{8}/);
expect(result.rmaNumber).toEqual(expect.stringMatching(/^RMA/));
```

## Debugging Tests

```bash
# Run single test with verbose output
npm test returns.service.spec.ts -- -t "should create return request" --verbose

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest returns.service.spec.ts

# Show test run times
npm test returns -- --verbose

# Run tests in sequence (not parallel)
npm test returns -- --runInBand
```

## Coverage Analysis

```bash
# Generate coverage report
npm test returns -- --coverage

# View HTML coverage report
# Opens in browser: coverage/lcov-report/index.html
start coverage/lcov-report/index.html  # Windows
open coverage/lcov-report/index.html   # Mac
xdg-open coverage/lcov-report/index.html  # Linux
```

## Tips for Maintaining Tests

1. **Keep tests isolated** - Each test should set up its own mocks
2. **Clear mocks between tests** - Use `jest.clearAllMocks()` in `beforeEach`
3. **Use descriptive names** - Test names should explain what they test
4. **Test one thing** - Each test should verify one behavior
5. **Avoid test interdependence** - Tests should work in any order
6. **Mock external dependencies** - Don't call real APIs or databases
7. **Test edge cases** - Don't just test happy paths
8. **Keep tests simple** - Complex test logic can introduce bugs

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
