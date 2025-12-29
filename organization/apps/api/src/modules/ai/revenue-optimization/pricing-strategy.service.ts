import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PricingStrategyService {
  private readonly logger = new Logger(PricingStrategyService.name);
  private priceTests: Map<string, any> = new Map();

  async optimizePricing(data: {
    productId: string;
    costPrice: number;
    competitorPrices?: number[];
    targetMargin?: number;
  }) {
    try {
      this.logger.log(`Optimizing pricing for product ${data.productId}`);

      // ML would analyze:
      // - Price elasticity
      // - Competitor pricing
      // - Demand patterns
      // - Customer segments
      // - Inventory levels
      // - Seasonality

      const targetMargin = data.targetMargin || 0.35;
      const costPrice = data.costPrice;

      // Calculate base price from margin
      const basePrice = costPrice / (1 - targetMargin);

      // Analyze competitor prices
      const competitorAnalysis = this.analyzeCompetitorPrices(
        basePrice,
        data.competitorPrices || [],
      );

      // Calculate price elasticity
      const elasticity = await this.estimatePriceElasticity(data.productId);

      // Generate pricing recommendations
      const pricingStrategies = this.generatePricingStrategies(
        basePrice,
        costPrice,
        competitorAnalysis,
        elasticity,
      );

      // Select optimal price
      const optimalPrice = this.selectOptimalPrice(
        pricingStrategies,
        competitorAnalysis,
      );

      return {
        success: true,
        productId: data.productId,
        analysis: {
          costPrice: costPrice.toFixed(2),
          targetMargin: (targetMargin * 100).toFixed(0) + '%',
          basePrice: basePrice.toFixed(2),
          competitorAnalysis,
          priceElasticity: elasticity,
        },
        recommendations: {
          optimalPrice: optimalPrice.price.toFixed(2),
          strategy: optimalPrice.strategy,
          expectedVolume: optimalPrice.expectedVolume,
          expectedRevenue: optimalPrice.expectedRevenue.toFixed(2),
          confidence: optimalPrice.confidence,
        },
        alternativeStrategies: pricingStrategies,
      };
    } catch (error) {
      this.logger.error('Pricing optimization failed', error);
      throw error;
    }
  }

  async calculateDynamicDiscount(data: {
    userId: string;
    productId: string;
    basePrice: number;
    inventory: number;
  }) {
    try {
      this.logger.log(
        `Calculating dynamic discount for user ${data.userId}, product ${data.productId}`,
      );

      // Personalized pricing based on:
      // - Customer lifetime value
      // - Purchase history
      // - Abandonment history
      // - Inventory levels
      // - Time-based factors
      // - Competitor prices

      const userProfile = await this.getUserProfile(data.userId);
      let discountPercent = 0;
      const factors = [];

      // CLV-based discount
      if (userProfile.lifetimeValue > 1000) {
        discountPercent += 5;
        factors.push('Loyal customer bonus: 5%');
      } else if (userProfile.lifetimeValue < 100 && userProfile.purchases === 0) {
        discountPercent += 10;
        factors.push('First-time buyer discount: 10%');
      }

      // Inventory-based discount
      if (data.inventory > 100) {
        discountPercent += 8;
        factors.push('Overstock clearance: 8%');
      } else if (data.inventory < 10) {
        discountPercent -= 5;
        factors.push('Low stock premium: -5%');
      }

      // Abandonment history
      if (userProfile.abandonmentCount > 2) {
        discountPercent += 7;
        factors.push('Recovery incentive: 7%');
      }

      // Time-based factors
      const hour = new Date().getHours();
      if (hour >= 1 && hour <= 6) {
        discountPercent += 5;
        factors.push('Night owl special: 5%');
      }

      // Cap discount
      discountPercent = Math.max(0, Math.min(discountPercent, 30));

      const finalPrice = data.basePrice * (1 - discountPercent / 100);
      const savings = data.basePrice - finalPrice;

      return {
        success: true,
        userId: data.userId,
        productId: data.productId,
        pricing: {
          basePrice: data.basePrice.toFixed(2),
          discountPercent: discountPercent.toFixed(0) + '%',
          finalPrice: finalPrice.toFixed(2),
          savings: savings.toFixed(2),
        },
        factors,
        validity: {
          expiresIn: '2 hours',
          conditions: [
            'Valid for this session only',
            'Cannot be combined with other offers',
            'Subject to availability',
          ],
        },
        psychology: {
          urgency: 'Price may increase soon',
          scarcity: data.inventory < 20 ? 'Only ' + data.inventory + ' left' : null,
          social: '142 people viewed this in the last 24 hours',
        },
      };
    } catch (error) {
      this.logger.error('Dynamic discount calculation failed', error);
      throw error;
    }
  }

  async setupPriceTest(data: {
    productId: string;
    variantPrices: number[];
    duration: number;
  }) {
    try {
      this.logger.log(`Setting up price test for product ${data.productId}`);

      const testId = `test_${Date.now()}`;
      const variants = data.variantPrices.map((price, index) => ({
        variantId: `var_${index}`,
        price,
        allocation: Math.floor(100 / data.variantPrices.length),
      }));

      const priceTest = {
        testId,
        productId: data.productId,
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + data.duration * 24 * 60 * 60 * 1000).toISOString(),
        variants,
        metrics: {
          totalViews: 0,
          totalSales: 0,
          conversionRate: 0,
        },
      };

      this.priceTests.set(testId, priceTest);

      return {
        success: true,
        testId,
        productId: data.productId,
        configuration: {
          variants,
          duration: data.duration + ' days',
          trafficSplit: 'Equal distribution',
        },
        tracking: {
          dashboardUrl: `https://admin.broxiva.com/ab-tests/${testId}`,
          apiEndpoint: `/api/price-tests/${testId}/metrics`,
        },
        estimatedResults: {
          minimumSampleSize: 1000,
          confidenceLevel: '95%',
          expectedDuration: data.duration + ' days',
        },
      };
    } catch (error) {
      this.logger.error('Price test setup failed', error);
      throw error;
    }
  }

  private analyzeCompetitorPrices(basePrice: number, competitorPrices: number[]) {
    if (competitorPrices.length === 0) {
      return {
        available: false,
        message: 'No competitor data available',
      };
    }

    const avgCompetitorPrice =
      competitorPrices.reduce((sum, p) => sum + p, 0) / competitorPrices.length;
    const minCompetitorPrice = Math.min(...competitorPrices);
    const maxCompetitorPrice = Math.max(...competitorPrices);

    const position =
      basePrice < avgCompetitorPrice
        ? 'below_market'
        : basePrice > avgCompetitorPrice
        ? 'above_market'
        : 'at_market';

    return {
      available: true,
      averagePrice: avgCompetitorPrice.toFixed(2),
      minPrice: minCompetitorPrice.toFixed(2),
      maxPrice: maxCompetitorPrice.toFixed(2),
      yourPrice: basePrice.toFixed(2),
      position,
      priceGap: (basePrice - avgCompetitorPrice).toFixed(2),
      recommendation:
        position === 'above_market'
          ? 'Consider lowering price to match market'
          : position === 'below_market'
          ? 'Opportunity to increase price'
          : 'Price is competitive',
    };
  }

  private async estimatePriceElasticity(productId: string): Promise<number> {
    // In production: Calculate from historical sales data
    // Elasticity < 1: Inelastic (price changes have less impact on demand)
    // Elasticity > 1: Elastic (price changes have more impact on demand)
    return -1.5; // Moderately elastic
  }

  private generatePricingStrategies(
    basePrice: number,
    costPrice: number,
    competitorAnalysis: any,
    elasticity: number,
  ) {
    return [
      {
        name: 'Cost-plus',
        price: basePrice,
        margin: ((basePrice - costPrice) / basePrice) * 100,
        expectedVolume: 100,
        expectedRevenue: basePrice * 100,
        pros: ['Simple', 'Predictable margins'],
        cons: ['Ignores market conditions'],
      },
      {
        name: 'Competitive',
        price: competitorAnalysis.available
          ? parseFloat(competitorAnalysis.averagePrice)
          : basePrice,
        margin: competitorAnalysis.available
          ? ((parseFloat(competitorAnalysis.averagePrice) - costPrice) /
              parseFloat(competitorAnalysis.averagePrice)) *
            100
          : ((basePrice - costPrice) / basePrice) * 100,
        expectedVolume: 120,
        expectedRevenue: competitorAnalysis.available
          ? parseFloat(competitorAnalysis.averagePrice) * 120
          : basePrice * 120,
        pros: ['Market-aligned', 'Competitive positioning'],
        cons: ['May sacrifice margin'],
      },
      {
        name: 'Premium',
        price: basePrice * 1.15,
        margin: ((basePrice * 1.15 - costPrice) / (basePrice * 1.15)) * 100,
        expectedVolume: 80,
        expectedRevenue: basePrice * 1.15 * 80,
        pros: ['Higher margins', 'Brand positioning'],
        cons: ['Lower volume'],
      },
      {
        name: 'Penetration',
        price: basePrice * 0.9,
        margin: ((basePrice * 0.9 - costPrice) / (basePrice * 0.9)) * 100,
        expectedVolume: 150,
        expectedRevenue: basePrice * 0.9 * 150,
        pros: ['Market share', 'Volume'],
        cons: ['Lower margins'],
      },
    ];
  }

  private selectOptimalPrice(strategies: any[], competitorAnalysis: any) {
    // Select strategy with highest expected revenue
    // while maintaining minimum margin
    const viable = strategies.filter(s => s.margin >= 25);
    const optimal = viable.sort((a, b) => b.expectedRevenue - a.expectedRevenue)[0];

    return {
      price: optimal.price,
      strategy: optimal.name,
      expectedVolume: optimal.expectedVolume,
      expectedRevenue: optimal.expectedRevenue,
      confidence: 0.85,
    };
  }

  private async getUserProfile(userId: string) {
    // In production: Query user database
    return {
      lifetimeValue: 450,
      purchases: 3,
      abandonmentCount: 1,
      averageOrderValue: 150,
      lastPurchase: '2025-10-15',
    };
  }
}
