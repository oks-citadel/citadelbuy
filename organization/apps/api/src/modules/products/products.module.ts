import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ProductsController } from './products.controller';
import { ProductsV1Controller } from './products-v1.controller';
import { ProductsService } from './products.service';
import { ProductSyncProcessor } from './workers/product-sync.processor';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { CurrencyModule } from '../currency/currency.module';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { TenantContextService } from '@/common/services/tenant-context.service';
import { RedisModule } from '@/common/redis/redis.module';
import { IdempotencyModule } from '@/common/idempotency/idempotency.module';
import { QUEUES } from '@/common/queue/queue.constants';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    IdempotencyModule,
    SubscriptionsModule,
    forwardRef(() => CurrencyModule),
    BullModule.registerQueue({
      name: QUEUES.PRODUCT_SYNC,
    }),
  ],
  controllers: [ProductsController, ProductsV1Controller],
  providers: [ProductsService, TenantContextService, ProductSyncProcessor],
  exports: [ProductsService, ProductSyncProcessor],
})
export class ProductsModule {}
