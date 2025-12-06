# Webhook Module - Testing Quick Reference

## Quick Commands

```bash
# Run all webhook tests
npm test -- webhook

# Run with coverage
npm test -- webhook --coverage

# Watch mode (for development)
npm test -- webhook --watch

# Run specific file
npm test -- webhook.service.spec.ts
npm test -- webhook.controller.spec.ts
npm test -- webhook.processor.spec.ts
npm test -- webhook-events.service.spec.ts
npm test -- webhook-idempotency.service.spec.ts

# Run specific test
npm test -- webhook.service.spec.ts -t "should create a webhook"
```

## Test Files Overview

| File | Purpose | Test Count |
|------|---------|-----------|
| `webhook.service.spec.ts` | Core business logic | 35+ |
| `webhook.controller.spec.ts` | REST API endpoints | 25+ |
| `webhook.processor.spec.ts` | Queue processing | 30+ |
| `webhook-events.service.spec.ts` | Event listeners | 40+ |
| `webhook-idempotency.service.spec.ts` | Idempotency | 35+ |

## Key Business Logic Tested

### Retry Schedule
```
Attempt 1: Immediate (0ms)
Attempt 2: 5 minutes (300,000ms)
Attempt 3: 30 minutes (1,800,000ms)
Attempt 4: 2 hours (7,200,000ms)
Attempt 5: 24 hours (86,400,000ms)
After 5 attempts → Dead Letter Queue
```

### Idempotency Protection
```
Layer 1: Redis (7-day TTL, fast lookup)
Layer 2: Database (permanent, unique constraint)
Processing Timeout: 5 minutes
```

### Event Types Tested (25+)
- **Orders:** created, updated, cancelled, fulfilled, shipped, delivered
- **Payments:** succeeded, failed, refunded
- **Products:** created, updated, deleted, out_of_stock, low_stock
- **Users:** created, updated, deleted
- **Cart:** abandoned, recovered
- **Inventory:** updated, restocked
- **Subscriptions:** created, updated, cancelled
- **Reviews:** created, updated
- **Returns:** requested, approved, rejected

## Common Test Patterns

### Mocking Services
```typescript
const mockPrisma = {
  webhook: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockQueue = {
  add: jest.fn(),
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
};
```

### Testing Service Methods
```typescript
it('should create a webhook', async () => {
  mockPrisma.webhook.create.mockResolvedValue(mockWebhook);

  const result = await service.createWebhook(createDto);

  expect(result).toEqual(mockWebhook);
  expect(mockPrisma.webhook.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      url: createDto.url,
      secret: expect.any(String),
    }),
  });
});
```

### Testing Controller Endpoints
```typescript
it('should get webhooks for user', async () => {
  mockService.getWebhooks.mockResolvedValue([mockWebhook]);

  const result = await controller.getWebhooks(mockRequest);

  expect(result).toEqual([mockWebhook]);
  expect(mockService.getWebhooks).toHaveBeenCalledWith(
    'user_123',
    'org_123',
  );
});
```

### Testing Queue Processor
```typescript
it('should process webhook delivery', async () => {
  mockHttpService.post.mockReturnValue(of(mockResponse));

  const result = await processor.processDelivery(mockJob);

  expect(result.success).toBe(true);
  expect(webhookService.handleDeliverySuccess).toHaveBeenCalled();
});
```

### Testing Event Listeners
```typescript
it('should trigger webhook on event', async () => {
  await service.handleOrderCreated(payload);

  expect(webhookService.triggerEvent).toHaveBeenCalledWith(
    expect.objectContaining({
      eventType: 'order.created',
      eventId: expect.stringMatching(/^evt_order_created_/),
    }),
  );
});
```

## Test Coverage Goals

| Metric | Target |
|--------|--------|
| Statement Coverage | 95%+ |
| Branch Coverage | 90%+ |
| Function Coverage | 95%+ |
| Line Coverage | 95%+ |

## Critical Scenarios Checklist

### ✅ Webhook Management
- [ ] Create webhook with secret
- [ ] Update webhook properties
- [ ] Delete webhook
- [ ] Rotate secret
- [ ] List webhooks
- [ ] Get single webhook
- [ ] Filter by user/organization

### ✅ Event Delivery
- [ ] Trigger event to subscribed webhooks
- [ ] Handle no subscribers
- [ ] Queue delivery jobs
- [ ] Track delivery status
- [ ] Update event logs

### ✅ Delivery Processing
- [ ] Send HTTP POST request
- [ ] Include signature headers
- [ ] Handle 200-299 success
- [ ] Handle 4xx/5xx errors
- [ ] Handle network errors
- [ ] Track delivery duration

### ✅ Retry Logic
- [ ] Schedule retries with correct delays
- [ ] Track attempt count
- [ ] Update delivery status
- [ ] Move to DLQ after 5 attempts
- [ ] Manual retry
- [ ] Retry from DLQ

### ✅ Idempotency
- [ ] Check Redis cache
- [ ] Check database
- [ ] Lock event for processing
- [ ] Mark as completed
- [ ] Mark as failed
- [ ] Handle timeout
- [ ] Update cache from DB

### ✅ Error Handling
- [ ] Database errors
- [ ] Redis errors
- [ ] Network errors
- [ ] HTTP errors
- [ ] Timeout errors
- [ ] Validation errors

## Troubleshooting

### Tests Failing?

1. **Check mock setup:**
   ```typescript
   jest.clearAllMocks(); // in beforeEach()
   ```

2. **Verify async handling:**
   ```typescript
   await service.method(); // Don't forget await
   ```

3. **Check mock return values:**
   ```typescript
   mock.method.mockResolvedValue(value); // For promises
   mock.method.mockReturnValue(value);    // For sync
   ```

### Coverage Too Low?

1. **Run coverage report:**
   ```bash
   npm test -- webhook --coverage
   ```

2. **Check uncovered lines:**
   ```bash
   open coverage/lcov-report/index.html
   ```

3. **Add missing test cases:**
   - Error paths
   - Edge cases
   - Boundary conditions

## Best Practices

### ✅ DO
- Use descriptive test names
- Test one thing per test
- Mock external dependencies
- Clean up after each test
- Test error paths
- Use async/await properly
- Group related tests with describe()

### ❌ DON'T
- Test implementation details
- Share state between tests
- Use real database/Redis/HTTP
- Skip error scenarios
- Forget to await async calls
- Use arbitrary timeouts
- Test multiple things in one test

## Quick Debugging

### See what was called:
```typescript
console.log(mock.method.mock.calls);
```

### See return values:
```typescript
console.log(mock.method.mock.results);
```

### Check call count:
```typescript
expect(mock.method).toHaveBeenCalledTimes(2);
```

### Verify call order:
```typescript
expect(mock1).toHaveBeenCalledBefore(mock2);
```

## Related Files

- `webhook.service.ts` - Core service
- `webhook.controller.ts` - REST API
- `webhook.processor.ts` - Queue processor
- `webhook-events.service.ts` - Event listeners
- `webhook-idempotency.service.ts` - Idempotency
- `WEBHOOK_TESTS_SUMMARY.md` - Detailed documentation

---

**Quick Start:** `npm test -- webhook --watch`

**Coverage:** `npm test -- webhook --coverage`

**Status:** ✅ 165+ tests covering all critical functionality
