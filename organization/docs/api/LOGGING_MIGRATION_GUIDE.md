# Logging Infrastructure Migration Guide

This guide documents the implementation of a proper logging infrastructure for CitadelBuy API, replacing console.log statements with structured logging.

## Overview

A custom logging service has been created with the following features:
- Structured logging with context
- Support for multiple log levels (ERROR, WARN, INFO, DEBUG, VERBOSE)
- JSON format support for production
- Request ID tracking for correlation
- Colorized output for development
- Integration with NestJS Logger interface

## Files Created

### 1. Logger Service
**Location:** `src/common/logger/logger.service.ts`

Features:
- Transient scope (each consumer gets its own instance)
- Configurable log levels via environment variable
- JSON output for production, formatted output for development
- Request context tracking (requestId, userId, correlationId)
- Support for structured data logging
- Error stack trace logging

### 2. Logger Module
**Location:** `src/common/logger/logger.module.ts`

- Global module that exports CustomLoggerService
- Imports ConfigModule for configuration

### 3. Logging Interceptor
**Location:** `src/common/interceptors/logging.interceptor.ts`

- Automatically logs incoming HTTP requests
- Adds request/correlation IDs to responses
- Tracks request duration
- Logs successful and failed responses

## Required Manual Changes

### 1. Update main.ts

**Add import:**
```typescript
import { CustomLoggerService } from './common/logger/logger.service';
```

**Update bootstrap function:**
```typescript
async function bootstrap() {
  // Create app with custom logger
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Get services
  const configService = app.get(ConfigService);
  const logger = await app.resolve(CustomLoggerService);
  logger.setContext('Bootstrap');

  // Use custom logger for the application
  app.useLogger(logger);

  // ... rest of the configuration
```

**Replace the console.log at the end:**
```typescript
  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log('Application started successfully', {
    url: `http://localhost:${port}`,
    docs: `http://localhost:${port}/api/docs`,
    environment: process.env.NODE_ENV || 'development',
    port,
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
```

### 2. Update app.module.ts

**Add import:**
```typescript
import { LoggerModule } from './common/logger/logger.module';
```

**Add to imports array (after ScheduleModule.forRoot()):**
```typescript
@Module({
  imports: [
    ConfigModule.forRoot({...}),
    ThrottlerModule.forRoot([...]),
    ScheduleModule.forRoot(),
    LoggerModule,  // Add this line
    PrismaModule,
    // ... rest of modules
  ],
})
```

### 3. Update prisma.service.ts

**Replace line 67:**
```typescript
// Before:
console.log('❌ Database disconnected');

// After:
this.logger.log('Database disconnected');
```

### 4. Update auth.service.ts

**Replace line 83:**
```typescript
// Before:
console.error('Failed to send welcome email:', error);

// After:
this.logger.error('Failed to send welcome email:', error);
```

**Replace line 117:**
```typescript
// Before:
console.error('Failed to track registration:', error);

// After:
this.logger.error('Failed to track registration:', error);
```

**Replace line 271:**
```typescript
// Before:
console.error('Social token verification failed:', error);

// After:
this.logger.error('Social token verification failed:', error);
```

**Replace line 499:**
```typescript
// Before:
console.error('Failed to fetch Apple public keys:', error);

// After:
this.logger.error('Failed to fetch Apple public keys:', error);
```

### 5. Update cart-abandonment.controller.ts

**Add import:**
```typescript
import { CustomLoggerService } from '@/common/logger/logger.service';
```

**Add to constructor:**
```typescript
constructor(
  private readonly abandonmentService: CartAbandonmentService,
  private readonly logger: CustomLoggerService,
) {
  this.logger.setContext('CartAbandonmentController');
}
```

**Replace line 51:**
```typescript
// Before:
console.error('Failed to track email open:', err);

// After:
this.logger.error('Failed to track email open:', err);
```

**Replace line 55:**
```typescript
// Before:
console.error('Failed to track email open:', error);

// After:
this.logger.error('Failed to track email open:', error);
```

**Replace line 91:**
```typescript
// Before:
console.error('Failed to track email click:', err);

// After:
this.logger.error('Failed to track email click:', err);
```

**Replace line 95:**
```typescript
// Before:
console.error('Failed to track email click:', error);

// After:
this.logger.error('Failed to track email click:', error);
```

### 6. Update inventory.service.ts

**Add import:**
```typescript
import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
```

**Add logger property:**
```typescript
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}
```

**Replace line 1373:**
```typescript
// Before:
console.log(`Stock subscription requested for ${email} on product ${productId}`);

// After:
this.logger.log(`Stock subscription requested for ${email} on product ${productId}`);
```

### 7. Update organization services

**For organization-invitation.service.ts and organization-member.service.ts:**

Add logger import and instance:
```typescript
import { Logger } from '@nestjs/common';

export class OrganizationInvitationService {
  private readonly logger = new Logger(OrganizationInvitationService.name);
  // ... rest of code
}
```

Replace all `console.log`, `console.error`, `console.warn` with appropriate logger methods.

### 8. Update vendors services

**For vendors.service.ts and bulk-upload.controller.ts:**

Same pattern as above - add Logger and replace console statements.

### 9. Update returns.service.ts

Same pattern - add Logger and replace console statements.

## Environment Variables

Add to `.env`:
```bash
# Logging Configuration
LOG_LEVEL=debug  # Options: error, warn, info, debug, verbose
LOG_JSON_FORMAT=false  # Set to true for production
```

## Usage Examples

### Basic Logging
```typescript
this.logger.log('User logged in successfully');
this.logger.warn('API rate limit approaching');
this.logger.error('Database connection failed');
this.logger.debug('Cache hit for key: user:123');
```

### Structured Logging
```typescript
this.logger.log('Order created', {
  orderId: '123',
  userId: 'user-456',
  amount: 99.99,
  items: 3,
});
```

### Error Logging
```typescript
try {
  // ... code
} catch (error) {
  this.logger.error('Failed to process payment', error);
}
```

### Request Context
```typescript
// In a controller or service
this.logger.setRequestContext({
  requestId: req.id,
  userId: req.user.id,
  correlationId: req.headers['x-correlation-id'],
});

this.logger.log('Processing checkout'); // Will include request context
```

## Benefits

1. **Structured Data**: All logs include timestamp, level, context, and optional structured data
2. **Request Correlation**: Track requests across the application with request IDs
3. **Production Ready**: JSON format for log aggregation tools (ELK, Splunk, etc.)
4. **Development Friendly**: Colorized, formatted output for easy reading
5. **Configurable**: Control log levels via environment variables
6. **Type Safe**: Fully typed with TypeScript
7. **Performance**: Minimal overhead with conditional logging based on levels

## Testing

After implementation:

1. Start the application: `npm run dev`
2. Check logs are properly formatted
3. Make API requests and verify request tracking
4. Test different log levels by changing LOG_LEVEL env variable
5. Test JSON output by setting LOG_JSON_FORMAT=true

## Migration Checklist

- [x] Create logger service
- [x] Create logger module
- [x] Create logging interceptor
- [ ] Update main.ts
- [ ] Update app.module.ts
- [ ] Update prisma.service.ts
- [ ] Update auth.service.ts
- [ ] Update cart-abandonment.controller.ts
- [ ] Update inventory.service.ts
- [ ] Update organization-invitation.service.ts
- [ ] Update organization-member.service.ts
- [ ] Update vendors.service.ts
- [ ] Update bulk-upload.controller.ts
- [ ] Update returns.service.ts
- [ ] Add environment variables
- [ ] Test in development
- [ ] Test in production mode
- [ ] Update documentation

## Production Deployment

When deploying to production:

1. Set `NODE_ENV=production`
2. Set `LOG_LEVEL=info` or `warn` (avoid `debug` in production)
3. Set `LOG_JSON_FORMAT=true`
4. Configure log aggregation service to collect JSON logs
5. Set up log retention and rotation policies
6. Configure alerts for ERROR level logs

## Future Enhancements

Consider adding:
- Winston or Pino integration for advanced features
- Log file rotation
- Remote logging to services like Datadog, New Relic
- Performance metrics logging
- Audit trail logging for sensitive operations
- Log sampling for high-traffic endpoints
