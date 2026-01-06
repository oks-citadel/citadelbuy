import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Controller
import { BillingAuditController } from './billing-audit.controller';

// Service
import { BillingAuditService } from './billing-audit.service';

// Common Modules
import { PrismaModule } from '@/common/prisma/prisma.module';
import { RedisModule } from '@/common/redis/redis.module';

/**
 * Billing Audit Module
 *
 * Provides comprehensive billing event tracking and charge explanation capabilities.
 *
 * Features:
 * - Log all billing events (charges, refunds, adjustments)
 * - Track fee calculations (base, tax, shipping, discounts)
 * - Store payment gateway responses
 * - Generate customer-friendly charge explanation reports
 * - Query and filter audit logs with various criteria
 * - Generate billing reports for analysis
 *
 * Dependencies:
 * - PrismaModule: For persistent storage of billing events
 * - RedisModule: For caching and fast retrieval
 * - ConfigModule: For configuration access
 *
 * Usage:
 * Import this module in your AppModule or feature modules that need
 * billing audit capabilities.
 *
 * @example
 * ```typescript
 * // In your AppModule or feature module
 * @Module({
 *   imports: [BillingAuditModule],
 * })
 * export class AppModule {}
 *
 * // Using the service
 * @Injectable()
 * export class PaymentService {
 *   constructor(private readonly billingAuditService: BillingAuditService) {}
 *
 *   async processPayment(order: Order) {
 *     // ... process payment
 *
 *     // Log the billing event
 *     await this.billingAuditService.logChargeCreated(
 *       order.id,
 *       chargeId,
 *       order.total,
 *       'USD',
 *       feeCalculation,
 *       gatewayResponse,
 *       { type: ActorType.SYSTEM, source: 'payment-service' },
 *       idempotencyKey,
 *     );
 *   }
 * }
 * ```
 */
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    ConfigModule,
  ],
  controllers: [
    BillingAuditController,
  ],
  providers: [
    BillingAuditService,
  ],
  exports: [
    BillingAuditService,
  ],
})
export class BillingAuditModule {}
