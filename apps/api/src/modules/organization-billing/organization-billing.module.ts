import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Controllers
import { BillingController } from './controllers/billing.controller';
import { WebhookController } from './controllers/webhook.controller';

// Services
import { BillingService } from './services/billing.service';
import { InvoiceService } from './services/invoice.service';
import { StripeService } from './services/stripe.service';

// Common Modules
import { PrismaModule } from '@/common/prisma/prisma.module';
import { RedisModule } from '@/common/redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    ConfigModule,
  ],
  controllers: [
    BillingController,
    WebhookController,
  ],
  providers: [
    BillingService,
    InvoiceService,
    StripeService,
  ],
  exports: [
    BillingService,
    InvoiceService,
    StripeService,
  ],
})
export class OrganizationBillingModule {}
