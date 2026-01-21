import { Module } from '@nestjs/common';
import { SubscriptionIntelligenceController } from './subscription-intelligence.controller';
import { SubscriptionIntelligenceService } from './subscription-intelligence.service';
import { ChurnPredictionService } from './churn-prediction.service';
import { ReplenishmentService } from './replenishment.service';

@Module({
  controllers: [SubscriptionIntelligenceController],
  providers: [
    SubscriptionIntelligenceService,
    ChurnPredictionService,
    ReplenishmentService,
  ],
  exports: [
    SubscriptionIntelligenceService,
    ChurnPredictionService,
    ReplenishmentService,
  ],
})
export class SubscriptionIntelligenceModule {}
