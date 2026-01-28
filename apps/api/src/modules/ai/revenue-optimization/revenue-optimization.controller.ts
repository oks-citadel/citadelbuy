import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RevenueOptimizationService } from './revenue-optimization.service';
import { BundleOptimizationService } from './bundle-optimization.service';
import { UpsellCrosssellService } from './upsell-crosssell.service';
import { PricingStrategyService } from './pricing-strategy.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('AI - Revenue Optimization')
@Controller('ai/revenue-optimization')
export class RevenueOptimizationController {
  constructor(
    private readonly revenueOptimizationService: RevenueOptimizationService,
    private readonly bundleOptimizationService: BundleOptimizationService,
    private readonly upsellCrosssellService: UpsellCrosssellService,
    private readonly pricingStrategyService: PricingStrategyService,
  ) {}

  @Post('optimize-bundle')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate optimized product bundle' })
  async optimizeBundle(@Body() data: {
    productIds: string[];
    targetMargin?: number;
    maxBundleSize?: number;
  }) {
    return this.bundleOptimizationService.optimizeBundle(data);
  }

  @Post('suggest-bundles')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Suggest bundles for a product' })
  async suggestBundles(@Body() data: {
    productId: string;
    userId?: string;
    includePersonalization?: boolean;
  }) {
    return this.bundleOptimizationService.suggestBundles(data);
  }

  @Post('upsell-recommendations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get upsell recommendations' })
  async getUpsellRecommendations(@Body() data: {
    productId: string;
    userId?: string;
    currentCartValue?: number;
  }) {
    return this.upsellCrosssellService.getUpsellRecommendations(data);
  }

  @Post('crosssell-recommendations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get cross-sell recommendations' })
  async getCrosssellRecommendations(@Body() data: {
    cartItems: Array<{ productId: string; quantity: number }>;
    userId?: string;
  }) {
    return this.upsellCrosssellService.getCrosssellRecommendations(data);
  }

  @Post('optimize-pricing')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Calculate optimal price' })
  async optimizePricing(@Body() data: {
    productId: string;
    costPrice: number;
    competitorPrices?: number[];
    targetMargin?: number;
  }) {
    return this.pricingStrategyService.optimizePricing(data);
  }

  @Post('dynamic-discount')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Calculate dynamic discount' })
  async calculateDynamicDiscount(@Body() data: {
    userId: string;
    productId: string;
    basePrice: number;
    inventory: number;
  }) {
    return this.pricingStrategyService.calculateDynamicDiscount(data);
  }

  @Get('conversion-optimization/:productId')
  @ApiOperation({ summary: 'Get conversion optimization suggestions' })
  async getConversionOptimization(@Param('productId') productId: string) {
    return this.revenueOptimizationService.getConversionOptimization(productId);
  }

  @Post('aov-optimization')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Optimize average order value' })
  async optimizeAOV(@Body() data: {
    userId: string;
    currentCart: Array<{ productId: string; price: number }>;
    targetAOV?: number;
  }) {
    return this.revenueOptimizationService.optimizeAOV(data);
  }

  @Get('revenue-analytics')
  @ApiOperation({ summary: 'Get revenue optimization analytics' })
  async getRevenueAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.revenueOptimizationService.getAnalytics(startDate, endDate);
  }

  @Post('price-test')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Set up A/B price testing' })
  async setupPriceTest(@Body() data: {
    productId: string;
    variantPrices: number[];
    duration: number; // days
  }) {
    return this.pricingStrategyService.setupPriceTest(data);
  }
}
