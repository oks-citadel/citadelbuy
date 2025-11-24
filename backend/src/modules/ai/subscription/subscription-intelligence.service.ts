import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SubscriptionIntelligenceService {
  private readonly logger = new Logger(SubscriptionIntelligenceService.name);

  async optimizeDeliveryFrequency(data: {
    userId: string;
    productId: string;
    currentFrequency: number;
    usagePattern?: number[];
  }) {
    try {
      this.logger.log(
        `Optimizing delivery frequency for user ${data.userId}, product ${data.productId}`,
      );

      // ML would analyze:
      // - Usage patterns
      // - Consumption rate
      // - Feedback from users
      // - Seasonal variations
      // - Stockout indicators

      const usagePattern = data.usagePattern || this.estimateUsagePattern(data.productId);
      const averageDailyUsage = usagePattern.reduce((sum, usage) => sum + usage, 0) / usagePattern.length;

      // Calculate optimal frequency based on usage
      const estimatedDaysUntilEmpty = 30 / averageDailyUsage;
      const optimalFrequency = Math.round(estimatedDaysUntilEmpty * 0.9); // Deliver before running out

      const frequencyChange = optimalFrequency - data.currentFrequency;
      const changePercentage = (frequencyChange / data.currentFrequency) * 100;

      return {
        success: true,
        userId: data.userId,
        productId: data.productId,
        analysis: {
          currentFrequency: data.currentFrequency + ' days',
          averageDailyUsage: averageDailyUsage.toFixed(2),
          estimatedDaysUntilEmpty: Math.round(estimatedDaysUntilEmpty),
        },
        recommendation: {
          optimalFrequency: optimalFrequency + ' days',
          change: frequencyChange > 0 ? 'increase' : frequencyChange < 0 ? 'decrease' : 'no change',
          changeDays: Math.abs(frequencyChange),
          changePercentage: Math.abs(changePercentage).toFixed(0) + '%',
        },
        benefits: [
          frequencyChange < 0
            ? 'Avoid stockouts and ensure continuous supply'
            : 'Reduce waste and optimize storage',
          'Better aligned with your usage pattern',
          'More convenient delivery schedule',
        ],
        confidence: 0.87,
      };
    } catch (error) {
      this.logger.error('Frequency optimization failed', error);
      throw error;
    }
  }

  async recommendSubscriptions(data: {
    userId: string;
    purchaseHistory: Array<{ productId: string; frequency: number }>;
  }) {
    try {
      this.logger.log(`Recommending subscriptions for user ${data.userId}`);

      // Analyze purchase patterns to identify subscription candidates
      const repeatProducts = data.purchaseHistory.filter(p => p.frequency >= 2);

      const recommendations = repeatProducts.map(product => {
        const savingsPercent = 15; // Average subscription discount
        const estimatedMonthlySpend = product.frequency * 50; // Estimated price

        return {
          productId: product.productId,
          reason: `You buy this ${product.frequency} times per year`,
          currentSpending: (estimatedMonthlySpend * product.frequency).toFixed(2),
          subscriptionPrice: (estimatedMonthlySpend * product.frequency * 0.85).toFixed(2),
          savings: {
            annual: (estimatedMonthlySpend * product.frequency * 0.15).toFixed(2),
            percentage: savingsPercent + '%',
          },
          convenience: [
            'Never run out',
            'Automatic delivery',
            'Skip or pause anytime',
            'Exclusive discounts',
          ],
          recommendedFrequency: this.calculateOptimalFrequency(product.frequency),
        };
      });

      return {
        success: true,
        userId: data.userId,
        recommendations,
        summary: {
          potentialSavings: recommendations
            .reduce((sum, r) => sum + parseFloat(r.savings.annual), 0)
            .toFixed(2),
          convenientProducts: recommendations.length,
        },
      };
    } catch (error) {
      this.logger.error('Subscription recommendation failed', error);
      throw error;
    }
  }

  async personalizeSubscription(data: {
    userId: string;
    productId: string;
    basePrice: number;
  }) {
    try {
      this.logger.log(`Personalizing subscription for user ${data.userId}`);

      const userProfile = await this.getUserProfile(data.userId);

      // Personalization factors
      let discountPercent = 10; // Base subscription discount
      const personalizations = [];

      // Loyalty tier bonus
      if (userProfile.loyaltyTier === 'gold') {
        discountPercent += 5;
        personalizations.push('Gold member bonus: +5%');
      } else if (userProfile.loyaltyTier === 'platinum') {
        discountPercent += 8;
        personalizations.push('Platinum member bonus: +8%');
      }

      // Multiple subscriptions discount
      if (userProfile.activeSubscriptions > 2) {
        discountPercent += 3;
        personalizations.push('Multi-subscription bonus: +3%');
      }

      // Commitment length bonus
      const commitmentOptions = [
        {
          months: 1,
          discount: discountPercent,
          label: 'Monthly',
        },
        {
          months: 3,
          discount: discountPercent + 5,
          label: '3-Month Commitment',
          savings: 'Extra 5% off',
        },
        {
          months: 6,
          discount: discountPercent + 10,
          label: '6-Month Commitment',
          savings: 'Extra 10% off',
        },
        {
          months: 12,
          discount: discountPercent + 15,
          label: 'Annual Commitment',
          savings: 'Extra 15% off',
        },
      ];

      return {
        success: true,
        userId: data.userId,
        productId: data.productId,
        personalization: {
          baseDiscount: '10%',
          totalDiscount: discountPercent + '%',
          factors: personalizations,
        },
        pricing: {
          originalPrice: data.basePrice.toFixed(2),
          subscriptionPrice: (data.basePrice * (1 - discountPercent / 100)).toFixed(2),
          savings: (data.basePrice * (discountPercent / 100)).toFixed(2),
        },
        commitmentOptions: commitmentOptions.map(opt => ({
          ...opt,
          price: (data.basePrice * (1 - opt.discount / 100)).toFixed(2),
          annualSavings: (data.basePrice * 12 * (opt.discount / 100)).toFixed(2),
        })),
        features: [
          'Free shipping on all deliveries',
          'Skip or pause anytime',
          'Change frequency anytime',
          'Priority customer support',
          'Exclusive subscriber-only deals',
        ],
      };
    } catch (error) {
      this.logger.error('Subscription personalization failed', error);
      throw error;
    }
  }

  async getAnalytics(userId: string) {
    try {
      return {
        success: true,
        userId,
        overview: {
          activeSubscriptions: 3,
          totalMonthlyValue: 142.5,
          totalAnnualSavings: 285.6,
          memberSince: '2024-03-15',
        },
        subscriptions: [
          {
            id: 'sub-001',
            product: 'Premium Coffee Beans',
            frequency: '2 weeks',
            nextDelivery: '2025-12-05',
            status: 'active',
            monthlyCost: 45.0,
          },
          {
            id: 'sub-002',
            product: 'Organic Dog Food',
            frequency: '1 month',
            nextDelivery: '2025-12-15',
            status: 'active',
            monthlyCost: 67.5,
          },
          {
            id: 'sub-003',
            product: 'Vitamins Pack',
            frequency: '1 month',
            nextDelivery: '2025-12-20',
            status: 'active',
            monthlyCost: 30.0,
          },
        ],
        insights: {
          savingsVsOneTime: '18.5%',
          onTimeDeliveryRate: '98.5%',
          averageRating: 4.8,
          recommendations: [
            'Consider adding toilet paper subscription (save $24/year)',
            'Your coffee delivery frequency is optimal',
            'Dog food usage is higher than expected - consider increasing frequency',
          ],
        },
      };
    } catch (error) {
      this.logger.error('Analytics retrieval failed', error);
      throw error;
    }
  }

  private estimateUsagePattern(productId: string): number[] {
    // In production: Use actual usage data
    // Return daily usage for last 30 days
    return Array.from({ length: 30 }, () => 0.8 + Math.random() * 0.4);
  }

  private calculateOptimalFrequency(annualPurchases: number): string {
    const daysPerPurchase = 365 / annualPurchases;

    if (daysPerPurchase <= 10) return 'Weekly';
    if (daysPerPurchase <= 20) return 'Every 2 weeks';
    if (daysPerPurchase <= 35) return 'Monthly';
    if (daysPerPurchase <= 70) return 'Every 2 months';
    return 'Quarterly';
  }

  private async getUserProfile(userId: string) {
    // In production: Query user database
    return {
      loyaltyTier: 'gold',
      activeSubscriptions: 2,
      lifetimeValue: 1200,
      subscriptionTenure: 180, // days
    };
  }
}
