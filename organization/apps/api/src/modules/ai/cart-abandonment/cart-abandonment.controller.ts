import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CartAbandonmentService } from './cart-abandonment.service';
import { RecoveryStrategyService } from './recovery-strategy.service';

@ApiTags('AI - Cart Abandonment')
@Controller('ai/cart-abandonment')
export class CartAbandonmentController {
  constructor(
    private readonly cartAbandonmentService: CartAbandonmentService,
    private readonly recoveryStrategyService: RecoveryStrategyService,
  ) {}

  @Post('predict-abandonment')
  @ApiOperation({ summary: 'Predict cart abandonment likelihood' })
  async predictAbandonment(@Body() data: {
    userId: string;
    cartId: string;
    cartValue: number;
    itemCount: number;
    timeInCart: number; // minutes
    sessionData?: {
      pageViews: number;
      timeOnSite: number;
      previousAbandons: number;
    };
  }) {
    return this.cartAbandonmentService.predictAbandonment(data);
  }

  @Post('generate-recovery-strategy')
  @ApiOperation({ summary: 'Generate personalized recovery strategy' })
  async generateRecoveryStrategy(@Body() data: {
    userId: string;
    cartId: string;
    abandonmentReason?: string;
    cartValue: number;
    items: Array<{ productId: string; price: number; quantity: number }>;
  }) {
    return this.recoveryStrategyService.generateStrategy(data);
  }

  @Post('calculate-incentive')
  @ApiOperation({ summary: 'Calculate optimal recovery incentive' })
  async calculateIncentive(@Body() data: {
    userId: string;
    cartValue: number;
    customerLifetimeValue: number;
    previousPurchases: number;
    abandonmentCount: number;
  }) {
    return this.recoveryStrategyService.calculateOptimalIncentive(data);
  }

  @Get('recovery-timing/:cartId')
  @ApiOperation({ summary: 'Get optimal timing for recovery messages' })
  async getRecoveryTiming(@Param('cartId') cartId: string) {
    return this.recoveryStrategyService.getOptimalTiming(cartId);
  }

  @Post('track-abandonment')
  @ApiOperation({ summary: 'Track cart abandonment event' })
  async trackAbandonment(@Body() data: {
    userId: string;
    cartId: string;
    cartValue: number;
    items: any[];
    abandonmentReason?: string;
    sessionDuration: number;
  }) {
    return this.cartAbandonmentService.trackAbandonment(data);
  }

  @Post('recovery-campaign')
  @ApiOperation({ summary: 'Launch automated recovery campaign' })
  async launchRecoveryCampaign(@Body() data: {
    cartId: string;
    userId: string;
    channels: Array<'email' | 'sms' | 'push' | 'retargeting'>;
    strategy?: 'aggressive' | 'moderate' | 'gentle';
  }) {
    return this.recoveryStrategyService.launchCampaign(data);
  }

  @Get('abandonment-analytics')
  @ApiOperation({ summary: 'Get cart abandonment analytics' })
  async getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.cartAbandonmentService.getAnalytics(startDate, endDate);
  }

  @Get('recovery-performance/:campaignId')
  @ApiOperation({ summary: 'Get recovery campaign performance' })
  async getRecoveryPerformance(@Param('campaignId') campaignId: string) {
    return this.recoveryStrategyService.getCampaignPerformance(campaignId);
  }
}
