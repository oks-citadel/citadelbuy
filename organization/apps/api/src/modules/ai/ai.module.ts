import { Module } from '@nestjs/common';

// AI Submodules
import { AIConciergeModule } from './concierge/ai-concierge.module';
import { AIOrchestratorModule } from './orchestrator/ai-orchestrator.module';
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
// VisualSearchModule - Now uses external APIs instead of TensorFlow
import { VisualSearchModule } from './visual-search/visual-search.module';

@Module({
  imports: [
    AIConciergeModule,
    AIOrchestratorModule,
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
    VisualSearchModule,
  ],
  exports: [
    AIConciergeModule,
    AIOrchestratorModule,
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
    VisualSearchModule,
  ],
})
export class AiModule {}
