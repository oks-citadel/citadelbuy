import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { LoggerModule } from './common/logger/logger.module';
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
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    ScheduleModule.forRoot(),
    LoggerModule,
    PrismaModule,
    RedisModule,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
