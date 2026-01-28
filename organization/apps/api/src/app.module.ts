import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerConfigModule } from './common/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { QueueModule } from './common/queue/queue.module';
import { LoggerModule } from './common/logger/logger.module';
import { ObservabilityModule } from './common/observability/observability.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AdvertisementsModule } from './modules/advertisements/advertisements.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { BnplModule } from './modules/bnpl/bnpl.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { SearchModule } from './modules/search/search.module';
import { AnalyticsDashboardModule } from './modules/analytics-dashboard/analytics-dashboard.module';
import { I18nModule } from './modules/i18n/i18n.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { DealsModule } from './modules/deals/deals.module';
import { GiftCardsModule } from './modules/gift-cards/gift-cards.module';
import { HealthModule } from './modules/health/health.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { OrderTrackingModule } from './modules/order-tracking/order-tracking.module';
import { TaxModule } from './modules/tax/tax.module';
import { VariantsModule } from './modules/variants/variants.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { CartModule } from './modules/cart/cart.module';
import { EmailModule } from './modules/email/email.module';
import { SecurityModule } from './modules/security/security.module';
import { SupportModule } from './modules/support/support.module';
import { SocialModule } from './modules/social/social.module';
import { AnalyticsAdvancedModule } from './modules/analytics-advanced/analytics-advanced.module';
import { MobileModule } from './modules/mobile/mobile.module';
import { SeoModule } from './modules/seo/seo.module';
import { PlatformModule } from './modules/platform/platform.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { OrganizationRolesModule } from './modules/organization-roles/organization-roles.module';
import { OrganizationAuditModule } from './modules/organization-audit/organization-audit.module';
import { OrganizationKycModule } from './modules/organization-kyc/organization-kyc.module';
import { OrganizationBillingModule } from './modules/organization-billing/organization-billing.module';
import { WebhookModule } from './modules/webhooks/webhook.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { AutomationModule } from './modules/automation/automation.module';
import { MeModule } from './modules/me/me.module';
import { AiModule } from './modules/ai/ai.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { SentryModule } from './common/monitoring/sentry.module';
import { CrossBorderModule } from './modules/cross-border/cross-border.module';
import { DomainsModule } from './modules/domains/domains.module';
import { GrowthModule } from './modules/growth/growth.module';
import { EnterpriseModule } from './modules/enterprise/enterprise.module';
import { BillingAuditModule } from './modules/billing-audit/billing-audit.module';
import { ExperimentsModule } from './modules/experiments/experiments.module';
import { MarketingAnalyticsModule } from './modules/marketing-analytics/marketing-analytics.module';
import { CurrencyModule } from './modules/currency/currency.module';
import { ConnectorsModule } from './modules/connectors/connectors.module';
import { validate } from './common/config/config-validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate, // Add configuration validation
      validationOptions: {
        allowUnknown: true, // Allow extra env vars not in schema
        abortEarly: false, // Show all validation errors, not just first one
      },
    }),
    ScheduleModule.forRoot(),
    // EventEmitterModule must be initialized globally BEFORE any modules that use EventEmitter2
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
    LoggerModule,
    CommonModule, // Provides SchemaValidationService and other utilities
    ObservabilityModule, // Adds correlation IDs, structured logging, and metrics
    PrismaModule,
    RedisModule, // Must be before ThrottlerConfigModule (provides RateLimitCacheService)
    QueueModule.forRoot(), // BullMQ queues for background jobs
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute
      },
    ]),
    ThrottlerConfigModule, // Comprehensive tiered rate limiting (needs RedisModule)
    AuthModule,
    UsersModule,
    ProductsModule,
    OrdersModule,
    PaymentsModule,
    AdminModule,
    CategoriesModule,
    ReviewsModule,
    WishlistModule,
    AnalyticsModule,
    AdvertisementsModule,
    SubscriptionsModule,
    BnplModule,
    RecommendationsModule,
    SearchModule,
    AnalyticsDashboardModule,
    I18nModule,
    LoyaltyModule,
    DealsModule,
    GiftCardsModule,
    HealthModule,
    VendorsModule,
    InventoryModule,
    ShippingModule,
    ReturnsModule,
    OrderTrackingModule,
    TrackingModule,
    TaxModule,
    VariantsModule,
    CouponsModule,
    CartModule,
    EmailModule,
    SecurityModule,
    SupportModule,
    SocialModule,
    AnalyticsAdvancedModule,
    MobileModule,
    SeoModule,
    PlatformModule,
    CheckoutModule,
    NotificationsModule,
    OrganizationModule,
    OrganizationRolesModule,
    OrganizationAuditModule,
    OrganizationKycModule,
    OrganizationBillingModule,
    WebhookModule,
    PrivacyModule,
    AutomationModule,
    MeModule,
    AiModule,
    MarketingModule,
    ComplianceModule,
    CrossBorderModule,
    DomainsModule,
    GrowthModule,
    EnterpriseModule,
    BillingAuditModule,
    ExperimentsModule,
    MarketingAnalyticsModule,
    CurrencyModule,
    ConnectorsModule, // Product integration connectors (Shopify, WooCommerce, REST, CSV)
    SentryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
