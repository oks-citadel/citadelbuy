import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PricingEngineService } from './pricing-engine.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('AI - Dynamic Pricing Engine')
@Controller('ai/pricing')
export class PricingEngineController {
  constructor(private readonly pricingEngineService: PricingEngineService) {}

  @Get('optimize/:productId')
  @ApiOperation({ summary: 'Get optimized price for product' })
  async getOptimizedPrice(@Param('productId') productId: string) {
    return this.pricingEngineService.calculateOptimalPrice(productId);
  }

  @Post('forecast-demand')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Forecast demand for pricing decisions' })
  async forecastDemand(@Body() demandData: any) {
    return this.pricingEngineService.forecastDemand(demandData);
  }

  @Get('competitor-analysis/:productId')
  @ApiOperation({ summary: 'Analyze competitor pricing' })
  async analyzeCompetitors(@Param('productId') productId: string) {
    return this.pricingEngineService.analyzeCompetitorPricing(productId);
  }

  @Post('dynamic-discount')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Calculate personalized discount' })
  async calculateDiscount(@Body() discountData: any) {
    return this.pricingEngineService.calculatePersonalizedDiscount(discountData);
  }
}
