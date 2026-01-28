import { Module, Global } from '@nestjs/common';
import { SchemaValidationService } from './services/schema-validation.service';
import { TransactionService } from './services/transaction.service';
import { TenantContextService } from './services/tenant-context.service';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

/**
 * Common Module
 *
 * Provides shared services and utilities across the application:
 * - SchemaValidationService: Runtime validation of data against TypeScript schemas
 * - TransactionService: Database transaction handling with retry logic and optimistic locking
 * - TenantContextService: Multi-tenant context propagation using AsyncLocalStorage
 * - IdempotencyModule: Idempotency support for mutation endpoints
 *
 * This module is marked as @Global so its exports are available throughout
 * the application without explicit imports in each module.
 */
@Global()
@Module({
  imports: [IdempotencyModule, PrismaModule, RedisModule],
  providers: [SchemaValidationService, TransactionService, TenantContextService],
  exports: [
    SchemaValidationService,
    TransactionService,
    TenantContextService,
    IdempotencyModule,
  ],
})
export class CommonModule {}
