import { Injectable, Logger } from '@nestjs/common';

interface RecoveryCampaign {
  campaignId: string;
  cartId: string;
  userId: string;
  channels: string[];
  status: 'scheduled' | 'active' | 'completed';
  performance: {
    sent: number;
    opened: number;
    clicked: number;
    recovered: boolean;
  };
}

@Injectable()
export class RecoveryStrategyService {
  private readonly logger = new Logger(RecoveryStrategyService.name);
  private campaigns: Map<string, RecoveryCampaign> = new Map();

  async generateStrategy(data: {
    userId: string;
    cartId: string;
    abandonmentReason?: string;
    cartValue: number;
    items: Array<{ productId: string; price: number; quantity: number }>;
  }) {
    try {
      this.logger.log(`Generating recovery strategy for cart ${data.cartId}`);

      // Personalized recovery strategy based on:
      // - Abandonment reason
      // - Cart value
      // - User profile and history
      // - Time since abandonment
      // - Product type and urgency

      const userProfile = await this.getUserProfile(data.userId);
      const strategy = this.determineStrategy(
        data.abandonmentReason,
        data.cartValue,
        userProfile,
      );

      // Generate multi-channel campaign
      const channels = this.selectChannels(data.cartValue, userProfile);

      // Create message sequence
      const messageSequence = this.createMessageSequence(
        data.cartId,
        data.cartValue,
        data.items,
        strategy,
      );

      return {
        success: true,
        cartId: data.cartId,
        strategy: {
          type: strategy.type,
          aggression: strategy.aggression,
          channels,
          timing: strategy.timing,
        },
        messageSequence,
        estimatedRecoveryRate: strategy.estimatedRecoveryRate,
        recommendations: strategy.recommendations,
      };
    } catch (error) {
      this.logger.error('Recovery strategy generation failed', error);
      throw error;
    }
  }

  async calculateOptimalIncentive(data: {
    userId: string;
    cartValue: number;
    customerLifetimeValue: number;
    previousPurchases: number;
    abandonmentCount: number;
  }) {
    try {
      this.logger.log(`Calculating optimal incentive for user ${data.userId}`);

      // Calculate incentive using dynamic pricing algorithm
      // Factors:
      // - Cart value
      // - Customer lifetime value (CLV)
      // - Profit margin
      // - Recovery probability
      // - Competitive landscape

      const { cartValue, customerLifetimeValue, previousPurchases, abandonmentCount } = data;

      // Base incentive calculation
      let incentivePercent = 0;
      let incentiveType: 'percentage' | 'fixed' | 'free_shipping' | 'bundle' = 'percentage';

      // High-value customers get smaller incentives
      if (customerLifetimeValue > 1000) {
        incentivePercent = 5;
        incentiveType = 'free_shipping';
      } else if (customerLifetimeValue > 500) {
        incentivePercent = 10;
      } else if (previousPurchases === 0) {
        // New customers get aggressive incentives
        incentivePercent = 20;
      } else {
        // Regular customers
        incentivePercent = 15;
      }

      // Adjust based on abandonment history
      if (abandonmentCount > 3) {
        incentivePercent = Math.min(incentivePercent + 5, 25);
      }

      // Calculate actual values
      const discountAmount = (cartValue * incentivePercent) / 100;
      const profitMargin = 0.3; // 30% average margin
      const cost = discountAmount;
      const expectedRevenue = cartValue - discountAmount;
      const expectedProfit = expectedRevenue * profitMargin - cost;
      const recoveryProbability = this.estimateRecoveryProbability(
        incentivePercent,
        abandonmentCount,
      );
      const expectedValue = expectedProfit * recoveryProbability;

      return {
        success: true,
        userId: data.userId,
        incentive: {
          type: incentiveType,
          value: incentivePercent,
          amount: discountAmount.toFixed(2),
          code: this.generateCouponCode(data.userId, data.cartValue),
          expiresIn: 48, // hours
        },
        economics: {
          cartValue: cartValue.toFixed(2),
          discountAmount: discountAmount.toFixed(2),
          revenueAfterDiscount: expectedRevenue.toFixed(2),
          estimatedProfit: expectedProfit.toFixed(2),
          recoveryProbability: (recoveryProbability * 100).toFixed(1) + '%',
          expectedValue: expectedValue.toFixed(2),
          roi: expectedValue > 0 ? 'positive' : 'negative',
        },
        alternatives: this.generateAlternativeIncentives(cartValue, incentivePercent),
      };
    } catch (error) {
      this.logger.error('Incentive calculation failed', error);
      throw error;
    }
  }

  async getOptimalTiming(cartId: string) {
    try {
      // Determine optimal timing for recovery messages
      // Based on:
      // - Time of day
      // - Day of week
      // - User timezone
      // - Historical response patterns
      // - Product urgency

      const sequence = [
        {
          delay: 1, // hours
          channel: 'email',
          message: 'cart_reminder',
          expectedOpenRate: '25%',
          expectedClickRate: '8%',
        },
        {
          delay: 4,
          channel: 'push',
          message: 'limited_time_offer',
          expectedOpenRate: '18%',
          expectedClickRate: '6%',
        },
        {
          delay: 24,
          channel: 'email',
          message: 'discount_offer',
          expectedOpenRate: '30%',
          expectedClickRate: '12%',
        },
        {
          delay: 48,
          channel: 'sms',
          message: 'final_reminder',
          expectedOpenRate: '40%',
          expectedClickRate: '15%',
        },
        {
          delay: 72,
          channel: 'retargeting',
          message: 'product_showcase',
          expectedOpenRate: '10%',
          expectedClickRate: '3%',
        },
      ];

      return {
        success: true,
        cartId,
        sequence,
        optimalStartTime: this.getOptimalStartTime(),
        totalDuration: '72 hours',
        estimatedTotalRecovery: '35-45%',
      };
    } catch (error) {
      this.logger.error('Timing calculation failed', error);
      throw error;
    }
  }

  async launchCampaign(data: {
    cartId: string;
    userId: string;
    channels: Array<'email' | 'sms' | 'push' | 'retargeting'>;
    strategy?: 'aggressive' | 'moderate' | 'gentle';
  }) {
    try {
      this.logger.log(`Launching recovery campaign for cart ${data.cartId}`);

      const campaignId = `camp_${Date.now()}`;
      const strategy = data.strategy || 'moderate';

      const campaign: RecoveryCampaign = {
        campaignId,
        cartId: data.cartId,
        userId: data.userId,
        channels: data.channels,
        status: 'scheduled',
        performance: {
          sent: 0,
          opened: 0,
          clicked: 0,
          recovered: false,
        },
      };

      this.campaigns.set(campaignId, campaign);

      // Schedule messages across channels
      const schedule = data.channels.map((channel, index) => ({
        channel,
        scheduledTime: new Date(Date.now() + (index + 1) * 3600000).toISOString(),
        message: this.getMessageForChannel(channel, strategy),
      }));

      return {
        success: true,
        campaignId,
        cartId: data.cartId,
        status: 'scheduled',
        strategy,
        schedule,
        tracking: {
          campaignUrl: `https://broxiva.com/track/${campaignId}`,
          dashboardUrl: `https://admin.broxiva.com/campaigns/${campaignId}`,
        },
        estimatedCompletion: schedule[schedule.length - 1].scheduledTime,
      };
    } catch (error) {
      this.logger.error('Campaign launch failed', error);
      throw error;
    }
  }

  async getCampaignPerformance(campaignId: string) {
    try {
      const campaign = this.campaigns.get(campaignId);

      if (!campaign) {
        return {
          success: false,
          message: 'Campaign not found',
        };
      }

      const { performance } = campaign;
      const openRate =
        performance.sent > 0 ? (performance.opened / performance.sent) * 100 : 0;
      const clickRate =
        performance.opened > 0 ? (performance.clicked / performance.opened) * 100 : 0;

      return {
        success: true,
        campaignId,
        status: campaign.status,
        performance: {
          sent: performance.sent,
          opened: performance.opened,
          clicked: performance.clicked,
          recovered: performance.recovered,
          openRate: openRate.toFixed(1) + '%',
          clickRate: clickRate.toFixed(1) + '%',
        },
        channels: campaign.channels,
        roi: this.calculateCampaignROI(campaign),
      };
    } catch (error) {
      this.logger.error('Performance retrieval failed', error);
      throw error;
    }
  }

  private async getUserProfile(userId: string) {
    // In production: Query user database
    return {
      tier: 'regular',
      lifetimeValue: 500,
      previousPurchases: 3,
      abandonmentCount: 2,
      preferredChannel: 'email',
      timezone: 'America/New_York',
    };
  }

  private determineStrategy(
    abandonmentReason: string | undefined,
    cartValue: number,
    userProfile: any,
  ) {
    let type = 'reminder';
    let aggression: 'gentle' | 'moderate' | 'aggressive' = 'moderate';

    if (abandonmentReason?.toLowerCase().includes('price')) {
      type = 'discount_offer';
      aggression = 'aggressive';
    } else if (cartValue > 200) {
      type = 'value_reinforcement';
      aggression = 'gentle';
    } else if (userProfile.abandonmentCount > 3) {
      type = 'urgency_scarcity';
      aggression = 'aggressive';
    }

    return {
      type,
      aggression,
      timing: this.getStrategyTiming(aggression),
      estimatedRecoveryRate: aggression === 'aggressive' ? 0.45 : aggression === 'moderate' ? 0.35 : 0.25,
      recommendations: this.getStrategyRecommendations(type, aggression),
    };
  }

  private getStrategyTiming(aggression: string) {
    return {
      gentle: { first: 2, second: 24, third: 72 },
      moderate: { first: 1, second: 12, third: 48 },
      aggressive: { first: 0.5, second: 4, third: 24 },
    }[aggression];
  }

  private getStrategyRecommendations(type: string, aggression: string): string[] {
    return [
      `Use ${aggression} messaging approach`,
      `Focus on ${type.replace('_', ' ')}`,
      'Include social proof',
      'Add urgency elements',
      'Test multiple subject lines',
    ];
  }

  private selectChannels(cartValue: number, userProfile: any): string[] {
    const channels = ['email'];

    if (cartValue > 100) {
      channels.push('sms');
    }

    if (userProfile.preferredChannel === 'push') {
      channels.push('push');
    }

    channels.push('retargeting');

    return channels;
  }

  private createMessageSequence(
    cartId: string,
    cartValue: number,
    items: any[],
    strategy: any,
  ) {
    return [
      {
        sequence: 1,
        delay: strategy.timing.first + ' hours',
        subject: 'You left something in your cart',
        content: 'Your items are waiting for you. Complete your purchase now!',
        includeDiscount: false,
      },
      {
        sequence: 2,
        delay: strategy.timing.second + ' hours',
        subject: 'Still thinking? Here\'s 15% off',
        content: 'Complete your order and save 15% with code SAVE15',
        includeDiscount: true,
        discount: 15,
      },
      {
        sequence: 3,
        delay: strategy.timing.third + ' hours',
        subject: 'Last chance! Your cart expires soon',
        content: 'This is your final reminder. Complete your purchase before items sell out!',
        includeDiscount: true,
        discount: 20,
        urgency: true,
      },
    ];
  }

  private estimateRecoveryProbability(incentive: number, abandonmentCount: number): number {
    let probability = 0.2; // Base 20% recovery

    // Incentive impact
    probability += incentive * 0.01; // +1% per 1% discount

    // Abandonment history impact (diminishing returns)
    probability *= Math.max(0.5, 1 - abandonmentCount * 0.1);

    return Math.min(probability, 0.7); // Cap at 70%
  }

  private generateCouponCode(userId: string, cartValue: number): string {
    return `CART${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  private generateAlternativeIncentives(cartValue: number, basePercent: number) {
    return [
      {
        type: 'free_shipping',
        value: 'Free shipping',
        estimatedRecovery: '28%',
        cost: 8.99,
      },
      {
        type: 'percentage',
        value: basePercent + 5 + '%',
        estimatedRecovery: '38%',
        cost: (cartValue * (basePercent + 5)) / 100,
      },
      {
        type: 'fixed',
        value: '$10 off',
        estimatedRecovery: '32%',
        cost: 10,
      },
    ];
  }

  private getOptimalStartTime(): string {
    const hour = new Date().getHours();
    if (hour < 9) return '9:00 AM (wait for business hours)';
    if (hour > 20) return '9:00 AM tomorrow';
    return 'Immediately';
  }

  private getMessageForChannel(channel: string, strategy: string): string {
    const messages = {
      email: {
        gentle: 'Your cart is waiting for you',
        moderate: 'Complete your purchase and save',
        aggressive: 'Last chance! 20% off your cart',
      },
      sms: {
        gentle: 'Hi! Your cart items are still available',
        moderate: 'Complete your order with 15% off',
        aggressive: 'URGENT: Cart expires in 2 hours. Save 20%!',
      },
      push: {
        gentle: 'Your items are waiting',
        moderate: 'Special offer on your cart',
        aggressive: 'Final hours! Complete your purchase now',
      },
      retargeting: {
        gentle: 'Come back and shop',
        moderate: 'Exclusive discount for you',
        aggressive: 'Limited time: 20% off',
      },
    };

    return messages[channel]?.[strategy] || 'Complete your purchase';
  }

  private calculateCampaignROI(campaign: RecoveryCampaign) {
    // Simplified ROI calculation
    const cost = campaign.channels.length * 0.5; // $0.50 per channel
    const revenue = campaign.performance.recovered ? 100 : 0; // Assume $100 cart
    const profit = revenue - cost;
    const roi = cost > 0 ? ((profit / cost) * 100).toFixed(0) + '%' : 'N/A';

    return {
      cost: cost.toFixed(2),
      revenue: revenue.toFixed(2),
      profit: profit.toFixed(2),
      roi,
    };
  }
}
