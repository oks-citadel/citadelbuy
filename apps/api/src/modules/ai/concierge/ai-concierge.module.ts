/**
 * AI Shopping Concierge Module
 *
 * NestJS module that provides the AI Shopping Concierge feature.
 * Combines chatbot, personalization, and conversational AI capabilities
 * using the AI Orchestrator for multi-step workflows.
 */

import { Module, forwardRef } from '@nestjs/common';
import { AIConciergeController } from './ai-concierge.controller';
import { AIConciergeService } from './ai-concierge.service';

// Feature flags for gating
import { FeatureFlagsModule } from '@/common/feature-flags';

// AI submodules
import { ChatbotModule } from '../chatbot/chatbot.module';
import { PersonalizationModule } from '../personalization/personalization.module';
import { ConversationalModule } from '../conversational/conversational.module';
import { AIOrchestratorModule } from '../orchestrator/ai-orchestrator.module';

@Module({
  imports: [
    FeatureFlagsModule,
    forwardRef(() => ChatbotModule),
    forwardRef(() => PersonalizationModule),
    forwardRef(() => ConversationalModule),
    forwardRef(() => AIOrchestratorModule),
  ],
  controllers: [AIConciergeController],
  providers: [AIConciergeService],
  exports: [AIConciergeService],
})
export class AIConciergeModule {}
