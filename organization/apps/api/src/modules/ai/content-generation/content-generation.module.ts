import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ContentGenerationController } from './content-generation.controller';
import { ContentGenerationService } from './content-generation.service';
import { ImageEnhancementService } from './image-enhancement.service';
import { SeoOptimizationService } from './seo-optimization.service';
import { OpenAIProvider } from './llm/openai.provider';
import { AnthropicProvider } from './llm/anthropic.provider';
import { LLMService } from './llm/llm.service';

@Module({
  imports: [ConfigModule],
  controllers: [ContentGenerationController],
  providers: [
    // LLM Providers
    OpenAIProvider,
    AnthropicProvider,
    LLMService,
    // Content Generation Services
    ContentGenerationService,
    ImageEnhancementService,
    SeoOptimizationService,
  ],
  exports: [
    ContentGenerationService,
    ImageEnhancementService,
    SeoOptimizationService,
    LLMService,
  ],
})
export class ContentGenerationModule {}
