import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DemandForecastingService } from './demand-forecasting.service';
import { InventoryOptimizationService } from './inventory-optimization.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('AI - Demand Forecasting')
@Controller('ai/demand-forecasting')
export class DemandForecastingController {
  constructor(
    private readonly demandForecastingService: DemandForecastingService,
    private readonly inventoryOptimizationService: InventoryOptimizationService,
  ) {}

  @Post('forecast')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate demand forecast for product' })
  async forecastDemand(@Body() data: {
    productId: string;
    timeframe: 'daily' | 'weekly' | 'monthly';
    periods: number;
  }) {
    return this.demandForecastingService.forecast(data);
  }

  @Get('seasonal-trends')
  @ApiOperation({ summary: 'Analyze seasonal trends' })
  async analyzeSeasonalTrends(@Query('category') category?: string) {
    return this.demandForecastingService.analyzeSeasonalTrends(category);
  }

  @Post('flash-sale-impact')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Predict flash sale impact' })
  async predictFlashSaleImpact(@Body() data: {
    productId: string;
    discount: number;
    duration: number;
  }) {
    return this.demandForecastingService.predictFlashSaleImpact(data);
  }

  @Get('regional-demand')
  @ApiOperation({ summary: 'Analyze regional demand variation' })
  async analyzeRegionalDemand(@Query('productId') productId: string) {
    return this.demandForecastingService.analyzeRegionalDemand(productId);
  }

  @Post('inventory-optimization')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get inventory optimization recommendations' })
  async optimizeInventory(@Body() data: {
    productId?: string;
    warehouseId?: string;
  }) {
    return this.inventoryOptimizationService.optimize(data);
  }

  @Get('stockout-prediction')
  @ApiOperation({ summary: 'Predict potential stockouts' })
  async predictStockouts() {
    return this.inventoryOptimizationService.predictStockouts();
  }

  @Post('reorder-recommendation')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get reorder recommendations' })
  async getReorderRecommendations(@Body() data: {
    productId: string;
    currentStock: number;
    leadTime: number;
  }) {
    return this.inventoryOptimizationService.getReorderRecommendation(data);
  }
}
