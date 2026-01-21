/**
 * AI Orchestrator Module
 *
 * Provides AI workflow orchestration capabilities.
 */

import { Module, forwardRef } from '@nestjs/common';
import { AIOrchestratorService } from './ai-orchestrator.service';
import { AIOrchestratorController } from './ai-orchestrator.controller';

// Common modules
import { RedisModule } from '@/common/redis/redis.module';
import { FeatureFlagsModule } from '@/common/feature-flags';

// AI submodules
import { PersonalizationModule } from '../personalization/personalization.module';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { ContentGenerationModule } from '../content-generation/content-generation.module';
import { DemandForecastingModule } from '../demand-forecasting/demand-forecasting.module';
import { FraudDetectionModule } from '../fraud-detection/fraud-detection.module';
import { PricingEngineModule } from '../pricing-engine/pricing-engine.module';
import { SmartSearchModule } from '../smart-search/smart-search.module';
import { CartAbandonmentModule } from '../cart-abandonment/cart-abandonment.module';
import { ConversationalModule } from '../conversational/conversational.module';

@Module({
  imports: [
    RedisModule,
    FeatureFlagsModule,
    forwardRef(() => PersonalizationModule),
    forwardRef(() => ChatbotModule),
    forwardRef(() => ContentGenerationModule),
    forwardRef(() => DemandForecastingModule),
    forwardRef(() => FraudDetectionModule),
    forwardRef(() => PricingEngineModule),
    forwardRef(() => SmartSearchModule),
    forwardRef(() => CartAbandonmentModule),
    forwardRef(() => ConversationalModule),
  ],
  controllers: [AIOrchestratorController],
  providers: [AIOrchestratorService],
  exports: [AIOrchestratorService],
})
export class AIOrchestratorModule {}
