import { Module } from '@nestjs/common';
import { PricingEngineController } from './pricing-engine.controller';
import { PricingEngineService } from './pricing-engine.service';

@Module({
  controllers: [PricingEngineController],
  providers: [PricingEngineService],
  exports: [PricingEngineService],
})
export class PricingEngineModule {}
