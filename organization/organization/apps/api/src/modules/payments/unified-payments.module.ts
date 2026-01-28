import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { RedisModule } from '@/common/redis/redis.module';

// Providers
import {
  StripeProvider,
  PayPalProvider,
  FlutterwaveProvider,
  PaystackProvider,
  AppleIAPProvider,
  GoogleIAPProvider,
} from './providers';

// Services
import { PaymentOrchestratorService } from './services/payment-orchestrator.service';
import { UnifiedWebhookService } from './services/unified-webhook.service';
import { WalletService } from './services/wallet.service';
import { WebhookIdempotencyService } from '@/modules/webhooks/webhook-idempotency.service';

// Controllers
import { UnifiedPaymentsController } from './controllers/unified-payments.controller';
import { UnifiedWebhooksController } from './controllers/unified-webhooks.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';

/**
 * Unified Payments Module
 *
 * Provides a comprehensive payment solution with:
 * - Multiple payment providers (Stripe, PayPal, Flutterwave, Paystack)
 * - In-App Purchase validation (Apple StoreKit, Google Play Billing)
 * - Wallet/Credits management
 * - Unified webhook handling with idempotency
 * - Subscription management
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
  ],
  controllers: [
    UnifiedPaymentsController,
    UnifiedWebhooksController,
    PaymentsWebhookController,
  ],
  providers: [
    // Payment Providers
    StripeProvider,
    PayPalProvider,
    FlutterwaveProvider,
    PaystackProvider,
    AppleIAPProvider,
    GoogleIAPProvider,

    // Services
    PaymentOrchestratorService,
    UnifiedWebhookService,
    WalletService,
    WebhookIdempotencyService,
  ],
  exports: [
    // Export providers for use in other modules
    StripeProvider,
    PayPalProvider,
    FlutterwaveProvider,
    PaystackProvider,
    AppleIAPProvider,
    GoogleIAPProvider,

    // Export services
    PaymentOrchestratorService,
    UnifiedWebhookService,
    WalletService,
    WebhookIdempotencyService,
  ],
})
export class UnifiedPaymentsModule {}
