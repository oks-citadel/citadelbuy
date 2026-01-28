import { Module } from '@nestjs/common';
import { RevenueOptimizationController } from './revenue-optimization.controller';
import { RevenueOptimizationService } from './revenue-optimization.service';
import { BundleOptimizationService } from './bundle-optimization.service';
import { UpsellCrosssellService } from './upsell-crosssell.service';
import { PricingStrategyService } from './pricing-strategy.service';

@Module({
  controllers: [RevenueOptimizationController],
  providers: [
    RevenueOptimizationService,
    BundleOptimizationService,
    UpsellCrosssellService,
    PricingStrategyService,
  ],
  exports: [
    RevenueOptimizationService,
    BundleOptimizationService,
    UpsellCrosssellService,
    PricingStrategyService,
  ],
})
export class RevenueOptimizationModule {}
