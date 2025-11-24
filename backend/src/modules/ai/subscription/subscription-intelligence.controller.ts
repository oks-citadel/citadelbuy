import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SubscriptionIntelligenceService } from './subscription-intelligence.service';
import { ChurnPredictionService } from './churn-prediction.service';
import { ReplenishmentService } from './replenishment.service';

@ApiTags('AI - Subscription Intelligence')
@Controller('ai/subscription')
export class SubscriptionIntelligenceController {
  constructor(
    private readonly subscriptionService: SubscriptionIntelligenceService,
    private readonly churnPredictionService: ChurnPredictionService,
    private readonly replenishmentService: ReplenishmentService,
  ) {}

  @Post('predict-churn')
  @ApiOperation({ summary: 'Predict subscription churn risk' })
  async predictChurn(@Body() data: {
    subscriptionId: string;
    userId: string;
    subscriptionAge: number; // days
    lastInteraction: string;
  }) {
    return this.churnPredictionService.predictChurn(data);
  }

  @Post('retention-strategy')
  @ApiOperation({ summary: 'Generate retention strategy' })
  async generateRetentionStrategy(@Body() data: {
    userId: string;
    subscriptionId: string;
    churnRisk: number;
    reason?: string;
  }) {
    return this.churnPredictionService.generateRetentionStrategy(data);
  }

  @Post('optimize-frequency')
  @ApiOperation({ summary: 'Optimize subscription delivery frequency' })
  async optimizeFrequency(@Body() data: {
    userId: string;
    productId: string;
    currentFrequency: number; // days
    usagePattern?: number[];
  }) {
    return this.subscriptionService.optimizeDeliveryFrequency(data);
  }

  @Post('replenishment-prediction')
  @ApiOperation({ summary: 'Predict replenishment needs' })
  async predictReplenishment(@Body() data: {
    userId: string;
    productId: string;
    lastPurchase: string;
    averageUsage?: number;
  }) {
    return this.replenishmentService.predictReplenishment(data);
  }

  @Post('subscription-recommendations')
  @ApiOperation({ summary: 'Recommend subscription products' })
  async recommendSubscriptions(@Body() data: {
    userId: string;
    purchaseHistory: Array<{ productId: string; frequency: number }>;
  }) {
    return this.subscriptionService.recommendSubscriptions(data);
  }

  @Post('personalize-subscription')
  @ApiOperation({ summary: 'Personalize subscription offering' })
  async personalizeSubscription(@Body() data: {
    userId: string;
    productId: string;
    basePrice: number;
  }) {
    return this.subscriptionService.personalizeSubscription(data);
  }

  @Get('subscription-analytics/:userId')
  @ApiOperation({ summary: 'Get subscription analytics' })
  async getSubscriptionAnalytics(@Param('userId') userId: string) {
    return this.subscriptionService.getAnalytics(userId);
  }

  @Post('smart-pause')
  @ApiOperation({ summary: 'Suggest subscription pause timing' })
  async suggestPauseTiming(@Body() data: {
    subscriptionId: string;
    userId: string;
    reason: string;
  }) {
    return this.churnPredictionService.suggestPauseTiming(data);
  }
}
