import { Module } from '@nestjs/common';
import { DemandForecastingController } from './demand-forecasting.controller';
import { DemandForecastingService } from './demand-forecasting.service';
import { InventoryOptimizationService } from './inventory-optimization.service';

@Module({
  controllers: [DemandForecastingController],
  providers: [DemandForecastingService, InventoryOptimizationService],
  exports: [DemandForecastingService, InventoryOptimizationService],
})
export class DemandForecastingModule {}
