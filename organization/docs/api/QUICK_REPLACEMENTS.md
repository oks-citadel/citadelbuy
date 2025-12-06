# Quick Console.log Replacements

This document contains all the exact console.log statements that need to be replaced, organized by file.

## Files and Replacements

### 1. src/main.ts (Line 263-267)

**Find:**
```typescript
  console.log(`
    🚀 Application is running on: http://localhost:${port}
    📚 API Documentation: http://localhost:${port}/api/docs
    🔐 Environment: ${process.env.NODE_ENV || 'development'}
  `);
```

**Replace with:**
```typescript
  logger.log('Application started successfully', {
    url: `http://localhost:${port}`,
    docs: `http://localhost:${port}/api/docs`,
    environment: process.env.NODE_ENV || 'development',
    port,
  });
```

### 2. src/common/prisma/prisma.service.ts (Line 67)

**Find:**
```typescript
    console.log('❌ Database disconnected');
```

**Replace with:**
```typescript
    this.logger.log('Database disconnected');
```

### 3. src/modules/auth/auth.service.ts

#### Line 83
**Find:**
```typescript
      console.error('Failed to send welcome email:', error);
```

**Replace with:**
```typescript
      this.logger.error('Failed to send welcome email:', error);
```

#### Line 117
**Find:**
```typescript
        console.error('Failed to track registration:', error);
```

**Replace with:**
```typescript
        this.logger.error('Failed to track registration:', error);
```

#### Line 271
**Find:**
```typescript
      console.error('Social token verification failed:', error);
```

**Replace with:**
```typescript
      this.logger.error('Social token verification failed:', error);
```

#### Line 499
**Find:**
```typescript
      console.error('Failed to fetch Apple public keys:', error);
```

**Replace with:**
```typescript
      this.logger.error('Failed to fetch Apple public keys:', error);
```

### 4. src/modules/cart/cart-abandonment.controller.ts

#### Line 51
**Find:**
```typescript
        console.error('Failed to track email open:', err);
```

**Replace with:**
```typescript
        this.logger.error('Failed to track email open:', err);
```

#### Line 55
**Find:**
```typescript
      console.error('Failed to track email open:', error);
```

**Replace with:**
```typescript
      this.logger.error('Failed to track email open:', error);
```

#### Line 91
**Find:**
```typescript
        console.error('Failed to track email click:', err);
```

**Replace with:**
```typescript
        this.logger.error('Failed to track email click:', err);
```

#### Line 95
**Find:**
```typescript
      console.error('Failed to track email click:', error);
```

**Replace with:**
```typescript
      this.logger.error('Failed to track email click:', error);
```

### 5. src/modules/inventory/inventory.service.ts (Line 1373)

**Find:**
```typescript
      console.log(`Stock subscription requested for ${email} on product ${productId}`);
```

**Replace with:**
```typescript
      this.logger.log(`Stock subscription requested for ${email} on product ${productId}`);
```

### 6. src/modules/vendors/vendors.service.ts

Search file for `console.log`, `console.error`, and `console.warn` and replace with `this.logger.log`, `this.logger.error`, and `this.logger.warn` respectively.

### 7. src/modules/vendors/bulk-upload.controller.ts

Search file for `console.log`, `console.error`, and `console.warn` and replace with `this.logger.log`, `this.logger.error`, and `this.logger.warn` respectively.

### 8. src/modules/organization/services/organization-invitation.service.ts

Search file for `console.log`, `console.error`, and `console.warn` and replace with `this.logger.log`, `this.logger.error`, and `this.logger.warn` respectively.

### 9. src/modules/organization/services/organization-member.service.ts

Search file for `console.log`, `console.error`, and `console.warn` and replace with `this.logger.log`, `this.logger.error`, and `this.logger.warn` respectively.

### 10. src/modules/returns/returns.service.ts

Search file for `console.log`, `console.error`, and `console.warn` and replace with `this.logger.log`, `this.logger.error`, and `this.logger.warn` respectively.

## Required Imports

For services that don't already have a logger, add:

```typescript
import { Logger } from '@nestjs/common';

// In the class:
export class YourService {
  private readonly logger = new Logger(YourService.name);

  // ... rest of code
}
```

For controllers that need CustomLoggerService:

```typescript
import { CustomLoggerService } from '@/common/logger/logger.service';

// In constructor:
constructor(
  // ... other dependencies
  private readonly logger: CustomLoggerService,
) {
  this.logger.setContext('YourControllerName');
}
```

## Special Cases

### main.ts Bootstrap Function

Need to add these lines after app creation:

```typescript
  const logger = await app.resolve(CustomLoggerService);
  logger.setContext('Bootstrap');
  app.useLogger(logger);
```

### Files Using Auth Service Logger

The auth service already has a logger instance (`private logger = new Logger('AuthService');`), so just replace console calls with logger calls.

## Verification

After making changes:

1. Search for `console.log` in src directory:
   ```bash
   grep -r "console\.log" src/
   ```

2. Search for `console.error` in src directory:
   ```bash
   grep -r "console\.error" src/
   ```

3. Search for `console.warn` in src directory:
   ```bash
   grep -r "console\.warn" src/
   ```

4. Ensure no results except possibly in comments or test files.

## Test After Changes

```bash
npm run dev
```

Check that:
- Application starts successfully
- Logs are properly formatted
- Request IDs appear in logs
- Error stack traces are captured
- Context information is included
