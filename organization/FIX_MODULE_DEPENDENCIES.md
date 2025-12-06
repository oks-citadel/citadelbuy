# Module Dependency Fixes

This document contains the exact code changes needed to fix the critical module dependency issues.

## Fix 1: ProductsModule - Add PrismaModule Import

**File:** `organization/apps/api/src/modules/products/products.module.ts`

**Replace entire file with:**
```typescript
import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
```

---

## Fix 2: AutomationModule - Import PrismaModule Instead of Providing PrismaService

**File:** `organization/apps/api/src/modules/automation/automation.module.ts`

**Find this section:**
```typescript
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
  ],
  providers: [
    PrismaService,  // ❌ Remove this line
    WorkflowEngineService,
    AutomationRulesService,
  ],
```

**Replace with:**
```typescript
@Module({
  imports: [
    PrismaModule,  // ✅ Add this import
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
  ],
  providers: [
    WorkflowEngineService,
    AutomationRulesService,
  ],
```

**Also add this import at the top:**
```typescript
import { PrismaModule } from '@/common/prisma/prisma.module';
```

**Remove this import (if it exists):**
```typescript
import { PrismaService } from '../../common/prisma/prisma.service';
```

---

## Fix 3: OrdersModule - Add PrismaModule Import

**File:** `organization/apps/api/src/modules/orders/orders.module.ts`

**Find:**
```typescript
@Module({
  imports: [EmailModule, TaxModule],
  controllers: [OrdersController, OrdersAdminController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
```

**Replace with:**
```typescript
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule, EmailModule, TaxModule],
  controllers: [OrdersController, OrdersAdminController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
```

**Make sure this import is at the top of the file.**

---

## Verification Steps

After applying these fixes, run:

```bash
cd organization/apps/api
npx tsc --noEmit
```

Expected: The dependency injection errors for these modules should be resolved.

---

## Additional TypeScript Fixes

### Fix 4: Auth Service - Null Safety

**File:** `organization/apps/api/src/modules/auth/auth.service.ts`
**Lines:** Around 268-371

Find code that looks like:
```typescript
user.email  // without null check
```

Add null checks:
```typescript
if (!user) {
  throw new NotFoundException('User not found');
}
// Now safe to use user.email
```

### Fix 5: Push Notification Service - Type Annotations

**File:** `organization/apps/api/src/modules/notifications/push-notification.service.ts`
**Line:** 243

Find:
```typescript
.map((resp, idx) => {
```

Replace with:
```typescript
.map((resp: any, idx: number) => {
```

### Fix 6: Webhook Processor - Undefined Parameters

**File:** `organization/apps/api/src/modules/webhooks/webhook.processor.ts`
**Lines:** 48, 56, 69, 109, 191

Find patterns like:
```typescript
someFunction(possiblyUndefined)
```

Replace with:
```typescript
if (possiblyUndefined) {
  someFunction(possiblyUndefined);
}
```

Or use null coalescing:
```typescript
someFunction(possiblyUndefined ?? 'default-value')
```

---

## Testing After Fixes

1. **Compile Check:**
   ```bash
   cd organization/apps/api
   npx tsc --noEmit
   ```

2. **Build Check:**
   ```bash
   npm run build
   ```

3. **Start Application:**
   ```bash
   npm run start:dev
   ```

4. **Verify No Dependency Injection Errors:**
   Check the console output for any NestJS dependency injection errors.

---

## Summary

- **3 Critical module import fixes** required
- **3 Additional TypeScript error fixes** recommended
- All fixes are backward compatible
- No breaking changes to existing functionality
