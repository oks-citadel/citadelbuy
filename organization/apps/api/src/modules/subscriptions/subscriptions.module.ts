import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { SubscriptionTierService } from './services/subscription-tier.service';
import {
  SubscriptionFeatureGuard,
  ProductCreationGuard,
  DiscountCodeCreationGuard,
  GoldTierGuard,
  PlatinumTierGuard,
  DiamondTierGuard,
} from './guards/subscription-feature.guard';

@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    SubscriptionTierService,
    SubscriptionFeatureGuard,
    ProductCreationGuard,
    DiscountCodeCreationGuard,
    GoldTierGuard,
    PlatinumTierGuard,
    DiamondTierGuard,
  ],
  exports: [
    SubscriptionsService,
    SubscriptionTierService,
    SubscriptionFeatureGuard,
    ProductCreationGuard,
    DiscountCodeCreationGuard,
    GoldTierGuard,
    PlatinumTierGuard,
    DiamondTierGuard,
  ],
})
export class SubscriptionsModule {}
