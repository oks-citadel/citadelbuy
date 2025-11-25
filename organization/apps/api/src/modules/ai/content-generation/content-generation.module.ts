import { Module } from '@nestjs/common';
import { ContentGenerationController } from './content-generation.controller';
import { ContentGenerationService } from './content-generation.service';
import { ImageEnhancementService } from './image-enhancement.service';
import { SeoOptimizationService } from './seo-optimization.service';

@Module({
  controllers: [ContentGenerationController],
  providers: [
    ContentGenerationService,
    ImageEnhancementService,
    SeoOptimizationService,
  ],
  exports: [
    ContentGenerationService,
    ImageEnhancementService,
    SeoOptimizationService,
  ],
})
export class ContentGenerationModule {}
