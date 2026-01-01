import { Module } from '@nestjs/common';

// AI Submodules
import { ArTryonModule } from './ar-tryon/ar-tryon.module';
import { CartAbandonmentModule } from './cart-abandonment/cart-abandonment.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { ContentGenerationModule } from './content-generation/content-generation.module';
import { ConversationalModule } from './conversational/conversational.module';
import { DemandForecastingModule } from './demand-forecasting/demand-forecasting.module';
import { FraudDetectionModule } from './fraud-detection/fraud-detection.module';
import { PersonalizationModule } from './personalization/personalization.module';
import { PricingEngineModule } from './pricing-engine/pricing-engine.module';
import { RevenueOptimizationModule } from './revenue-optimization/revenue-optimization.module';
import { SmartSearchModule } from './smart-search/smart-search.module';
import { SubscriptionIntelligenceModule } from './subscription/subscription-intelligence.module';
// VisualSearchModule disabled - requires TensorFlow dependencies
// import { VisualSearchModule } from './visual-search/visual-search.module';

@Module({
  imports: [
    ArTryonModule,
    CartAbandonmentModule,
    ChatbotModule,
    ContentGenerationModule,
    ConversationalModule,
    DemandForecastingModule,
    FraudDetectionModule,
    PersonalizationModule,
    PricingEngineModule,
    RevenueOptimizationModule,
    SmartSearchModule,
    SubscriptionIntelligenceModule,
    // VisualSearchModule - disabled
  ],
  exports: [
    ArTryonModule,
    CartAbandonmentModule,
    ChatbotModule,
    ContentGenerationModule,
    ConversationalModule,
    DemandForecastingModule,
    FraudDetectionModule,
    PersonalizationModule,
    PricingEngineModule,
    RevenueOptimizationModule,
    SmartSearchModule,
    SubscriptionIntelligenceModule,
    // VisualSearchModule - disabled
  ],
})
export class AiModule {}
