import { Module } from '@nestjs/common';
import { ArTryonController } from './ar-tryon.controller';
import { ArTryonService } from './ar-tryon.service';
import { FitRecommendationService } from './fit-recommendation.service';

@Module({
  controllers: [ArTryonController],
  providers: [ArTryonService, FitRecommendationService],
  exports: [ArTryonService, FitRecommendationService],
})
export class ArTryonModule {}
