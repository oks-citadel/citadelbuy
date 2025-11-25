import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UpsellCrosssellService {
  private readonly logger = new Logger(UpsellCrosssellService.name);

  async getUpsellRecommendations(data: {
    productId: string;
    userId?: string;
    currentCartValue?: number;
  }) {
    try {
      this.logger.log(`Generating upsell recommendations for product ${data.productId}`);

      // ML would analyze:
      // - Product hierarchy (basic -> premium)
      // - Price sensitivity
      // - User purchase history
      // - Willingness to pay
      // - Feature comparisons

      const baseProduct = await this.getProduct(data.productId);
      const upsellOptions = await this.findUpsellProducts(
        baseProduct,
        data.userId,
      );

      // Rank by conversion probability
      const rankedOptions = this.rankByConversionProbability(
        upsellOptions,
        baseProduct,
        data.currentCartValue,
      );

      return {
        success: true,
        baseProduct: {
          id: baseProduct.id,
          name: baseProduct.name,
          price: baseProduct.price,
          tier: baseProduct.tier,
        },
        upsellOptions: rankedOptions.map(option => ({
          productId: option.id,
          name: option.name,
          price: option.price,
          tier: option.tier,
          priceDifference: (option.price - baseProduct.price).toFixed(2),
          percentIncrease: (
            ((option.price - baseProduct.price) / baseProduct.price) *
            100
          ).toFixed(0),
          benefits: option.benefits,
          conversionProbability: option.conversionProbability,
          estimatedRevenue: (
            option.price *
            option.conversionProbability
          ).toFixed(2),
        })),
        messaging: {
          headline: 'Upgrade for Better Value',
          subtext: 'Get more features for just a little more',
          urgency: 'Limited time offer',
        },
        estimatedImpact: {
          averageUpsellRate: '15-20%',
          revenueIncrease: '+$5,000-$15,000/month',
        },
      };
    } catch (error) {
      this.logger.error('Upsell recommendation failed', error);
      throw error;
    }
  }

  async getCrosssellRecommendations(data: {
    cartItems: Array<{ productId: string; quantity: number }>;
    userId?: string;
  }) {
    try {
      this.logger.log('Generating cross-sell recommendations');

      // ML would analyze:
      // - Market basket analysis
      // - Frequently bought together
      // - Complementary products
      // - User preferences
      // - Category affinity

      const cartProducts = await this.getCartProducts(data.cartItems);
      const crosssellOptions = await this.findCrosssellProducts(
        cartProducts,
        data.userId,
      );

      // Calculate relevance scores
      const recommendations = crosssellOptions.map(product => {
        const relevanceScore = this.calculateRelevanceScore(
          product,
          cartProducts,
        );
        const frequencyData = this.getFrequentlyBoughtTogether(
          cartProducts.map(p => p.id),
          product.id,
        );

        return {
          productId: product.id,
          name: product.name,
          price: product.price,
          category: product.category,
          relevanceScore,
          reason: this.generateCrosssellReason(product, cartProducts),
          frequencyData,
          estimatedConversion: relevanceScore * 0.25, // 25% of relevance score
        };
      });

      // Sort by relevance
      recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);

      return {
        success: true,
        cartSummary: {
          items: data.cartItems.length,
          totalValue: cartProducts.reduce((sum, p) => sum + p.price, 0),
        },
        recommendations: recommendations.slice(0, 6), // Top 6 recommendations
        messaging: {
          headline: 'Complete Your Purchase',
          subtext: 'Customers who bought these items also bought:',
        },
        analytics: {
          averageCrosssellRate: '22%',
          averageAdditionalRevenue: '$35/order',
          topCategories: ['accessories', 'consumables', 'warranties'],
        },
      };
    } catch (error) {
      this.logger.error('Cross-sell recommendation failed', error);
      throw error;
    }
  }

  private async getProduct(productId: string) {
    // In production: Query product database
    return {
      id: productId,
      name: 'Base Product',
      price: 99,
      tier: 'standard',
      features: ['Feature 1', 'Feature 2'],
    };
  }

  private async findUpsellProducts(baseProduct: any, userId?: string) {
    // In production: Query higher-tier products
    return [
      {
        id: 'upsell-001',
        name: 'Premium Version',
        price: baseProduct.price * 1.3,
        tier: 'premium',
        benefits: [
          'Enhanced performance',
          'Extended warranty',
          'Priority support',
        ],
        conversionProbability: 0.18,
      },
      {
        id: 'upsell-002',
        name: 'Deluxe Version',
        price: baseProduct.price * 1.5,
        tier: 'deluxe',
        benefits: [
          'All premium features',
          'Exclusive accessories',
          '24/7 VIP support',
          'Lifetime warranty',
        ],
        conversionProbability: 0.12,
      },
      {
        id: 'upsell-003',
        name: 'Professional Version',
        price: baseProduct.price * 2,
        tier: 'professional',
        benefits: [
          'Professional-grade features',
          'Advanced tools',
          'Dedicated account manager',
          'Training included',
        ],
        conversionProbability: 0.08,
      },
    ];
  }

  private rankByConversionProbability(
    options: any[],
    baseProduct: any,
    currentCartValue?: number,
  ) {
    // Adjust conversion probability based on cart value and price difference
    return options
      .map(option => {
        let adjustedProbability = option.conversionProbability;

        // Reduce probability for high price differences
        const priceDiff = option.price - baseProduct.price;
        if (priceDiff > baseProduct.price * 0.5) {
          adjustedProbability *= 0.7;
        }

        // Increase probability if cart value is high (buyer is less price sensitive)
        if (currentCartValue && currentCartValue > 200) {
          adjustedProbability *= 1.2;
        }

        return {
          ...option,
          conversionProbability: Math.min(adjustedProbability, 0.95),
        };
      })
      .sort((a, b) => b.conversionProbability - a.conversionProbability);
  }

  private async getCartProducts(
    cartItems: Array<{ productId: string; quantity: number }>,
  ) {
    // In production: Query product database
    return cartItems.map((item, index) => ({
      id: item.productId,
      name: `Product ${index + 1}`,
      price: 50 + Math.random() * 100,
      category: ['electronics', 'accessories', 'home'][index % 3],
      quantity: item.quantity,
    }));
  }

  private async findCrosssellProducts(cartProducts: any[], userId?: string) {
    // In production: Use association rules and collaborative filtering
    const categories = cartProducts.map(p => p.category);

    return [
      {
        id: 'cross-001',
        name: 'Compatible Accessory',
        price: 29.99,
        category: 'accessories',
        affinity: 0.85,
      },
      {
        id: 'cross-002',
        name: 'Extended Warranty',
        price: 19.99,
        category: 'warranty',
        affinity: 0.72,
      },
      {
        id: 'cross-003',
        name: 'Cleaning Kit',
        price: 15.99,
        category: 'maintenance',
        affinity: 0.68,
      },
      {
        id: 'cross-004',
        name: 'Carrying Case',
        price: 34.99,
        category: 'accessories',
        affinity: 0.78,
      },
      {
        id: 'cross-005',
        name: 'Replacement Parts',
        price: 24.99,
        category: 'parts',
        affinity: 0.65,
      },
      {
        id: 'cross-006',
        name: 'Premium Cables',
        price: 18.99,
        category: 'accessories',
        affinity: 0.80,
      },
    ];
  }

  private calculateRelevanceScore(product: any, cartProducts: any[]): number {
    // Simple relevance calculation based on category match and affinity
    let score = product.affinity || 0.5;

    // Boost score if category matches cart items
    const categoryMatch = cartProducts.some(p => p.category === product.category);
    if (categoryMatch) {
      score *= 1.3;
    }

    return Math.min(score, 1.0);
  }

  private generateCrosssellReason(product: any, cartProducts: any[]): string {
    const reasons = [
      'Frequently bought together',
      'Perfect complement to your items',
      'Protect your purchase',
      'Enhance your experience',
      'Complete your setup',
      'Recommended by experts',
    ];

    // Select reason based on product category
    if (product.category === 'warranty') return 'Protect your purchase';
    if (product.category === 'accessories') return 'Perfect complement to your items';
    if (product.category === 'maintenance') return 'Keep it in perfect condition';

    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  private getFrequentlyBoughtTogether(
    cartProductIds: string[],
    crosssellProductId: string,
  ) {
    // In production: Query transaction database
    return {
      frequency: Math.random() * 100,
      percentage: (Math.random() * 30 + 20).toFixed(0) + '%',
      count: Math.floor(Math.random() * 500 + 100),
    };
  }
}
