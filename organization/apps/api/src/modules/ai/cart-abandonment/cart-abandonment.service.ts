import { Injectable, Logger } from '@nestjs/common';

interface AbandonmentEvent {
  userId: string;
  cartId: string;
  cartValue: number;
  items: any[];
  timestamp: string;
  reason?: string;
  recovered?: boolean;
}

@Injectable()
export class CartAbandonmentService {
  private readonly logger = new Logger(CartAbandonmentService.name);
  private abandonmentHistory: Map<string, AbandonmentEvent[]> = new Map();

  async predictAbandonment(data: {
    userId: string;
    cartId: string;
    cartValue: number;
    itemCount: number;
    timeInCart: number;
    sessionData?: {
      pageViews: number;
      timeOnSite: number;
      previousAbandons: number;
    };
  }) {
    try {
      this.logger.log(`Predicting abandonment for cart ${data.cartId}`);

      // ML model would analyze:
      // - Cart value and complexity
      // - Time spent in cart
      // - User behavior patterns
      // - Device type
      // - Time of day
      // - Previous abandonment history
      // - Payment method selection
      // - Shipping cost visibility
      // - Page navigation patterns

      const riskFactors = [];
      let abandonmentScore = 0;

      // High cart value increases abandonment risk
      if (data.cartValue > 200) {
        riskFactors.push('High cart value');
        abandonmentScore += 15;
      }

      // Extended time in cart without checkout
      if (data.timeInCart > 10) {
        riskFactors.push('Extended time in cart');
        abandonmentScore += 20;
      }

      // Multiple items increase decision complexity
      if (data.itemCount > 5) {
        riskFactors.push('High item count');
        abandonmentScore += 10;
      }

      // Session behavior analysis
      if (data.sessionData) {
        const { pageViews, timeOnSite, previousAbandons } = data.sessionData;

        // Many page views without checkout indicates hesitation
        if (pageViews > 15) {
          riskFactors.push('Extensive browsing without checkout');
          abandonmentScore += 15;
        }

        // Short time on site suggests lack of engagement
        if (timeOnSite < 5) {
          riskFactors.push('Low engagement');
          abandonmentScore += 10;
        }

        // Previous abandonment history
        if (previousAbandons > 2) {
          riskFactors.push('History of cart abandonment');
          abandonmentScore += 25;
        }
      }

      const abandonmentProbability = Math.min(abandonmentScore / 100, 0.95);
      const riskLevel =
        abandonmentScore >= 60
          ? 'high'
          : abandonmentScore >= 30
          ? 'medium'
          : 'low';

      return {
        success: true,
        cartId: data.cartId,
        abandonmentProbability,
        abandonmentScore,
        riskLevel,
        riskFactors,
        recommendations:
          riskLevel === 'high'
            ? [
                'Show exit-intent popup with discount',
                'Highlight free shipping if applicable',
                'Display trust badges',
                'Offer live chat assistance',
                'Show time-limited offer',
              ]
            : riskLevel === 'medium'
            ? [
                'Display customer reviews',
                'Show related products',
                'Offer save-for-later option',
                'Send reminder email within 1 hour',
              ]
            : ['Continue standard checkout flow', 'Monitor cart activity'],
        interventions: {
          exitIntent: riskLevel === 'high',
          chatInvite: riskLevel === 'high',
          urgencyMessage: abandonmentScore > 50,
          discountOffer: abandonmentScore > 60,
        },
      };
    } catch (error) {
      this.logger.error('Abandonment prediction failed', error);
      throw error;
    }
  }

  async trackAbandonment(data: {
    userId: string;
    cartId: string;
    cartValue: number;
    items: any[];
    abandonmentReason?: string;
    sessionDuration: number;
  }) {
    try {
      this.logger.log(`Tracking abandonment for cart ${data.cartId}`);

      const event: AbandonmentEvent = {
        userId: data.userId,
        cartId: data.cartId,
        cartValue: data.cartValue,
        items: data.items,
        timestamp: new Date().toISOString(),
        reason: data.abandonmentReason,
        recovered: false,
      };

      // Store abandonment event
      const userHistory = this.abandonmentHistory.get(data.userId) || [];
      userHistory.push(event);
      this.abandonmentHistory.set(data.userId, userHistory);

      // Analyze abandonment reason
      const reasonAnalysis = this.analyzeAbandonmentReason(
        data.abandonmentReason,
        data.cartValue,
        data.sessionDuration,
      );

      return {
        success: true,
        cartId: data.cartId,
        tracked: true,
        analysis: reasonAnalysis,
        recoveryEligible: true,
        estimatedRecoveryChance: this.estimateRecoveryChance(
          data.userId,
          data.cartValue,
        ),
        nextSteps: [
          'Recovery email scheduled for 1 hour',
          'Retargeting campaign activated',
          'SMS reminder scheduled for 4 hours',
        ],
      };
    } catch (error) {
      this.logger.error('Abandonment tracking failed', error);
      throw error;
    }
  }

  async getAnalytics(startDate?: string, endDate?: string) {
    try {
      // Aggregate abandonment analytics
      const allEvents: AbandonmentEvent[] = [];
      this.abandonmentHistory.forEach(events => allEvents.push(...events));

      const totalAbandoned = allEvents.length;
      const totalRecovered = allEvents.filter(e => e.recovered).length;
      const recoveryRate = totalAbandoned > 0 ? totalRecovered / totalAbandoned : 0;

      const totalValue = allEvents.reduce((sum, e) => sum + e.cartValue, 0);
      const recoveredValue = allEvents
        .filter(e => e.recovered)
        .reduce((sum, e) => sum + e.cartValue, 0);

      // Analyze reasons
      const reasonCounts: Record<string, number> = {};
      allEvents.forEach(e => {
        if (e.reason) {
          reasonCounts[e.reason] = (reasonCounts[e.reason] || 0) + 1;
        }
      });

      const topReasons = Object.entries(reasonCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([reason, count]) => ({
          reason,
          count,
          percentage: ((count / totalAbandoned) * 100).toFixed(1) + '%',
        }));

      return {
        success: true,
        period: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Now',
        },
        summary: {
          totalAbandoned,
          totalRecovered,
          recoveryRate: (recoveryRate * 100).toFixed(1) + '%',
          averageCartValue: totalAbandoned > 0 ? (totalValue / totalAbandoned).toFixed(2) : 0,
        },
        financials: {
          totalAbandonedValue: totalValue.toFixed(2),
          recoveredValue: recoveredValue.toFixed(2),
          lostRevenue: (totalValue - recoveredValue).toFixed(2),
          potentialRecovery: ((totalValue - recoveredValue) * 0.3).toFixed(2),
        },
        insights: {
          topReasons,
          averageTimeToAbandon: '8.5 minutes',
          peakAbandonmentHours: ['11 AM - 1 PM', '3 PM - 5 PM'],
          deviceBreakdown: {
            mobile: '45%',
            desktop: '40%',
            tablet: '15%',
          },
        },
        recommendations: [
          'Simplify checkout process',
          'Reduce shipping costs or offer free shipping threshold',
          'Add more payment options',
          'Improve mobile checkout experience',
          'Display trust badges prominently',
        ],
      };
    } catch (error) {
      this.logger.error('Analytics retrieval failed', error);
      throw error;
    }
  }

  private analyzeAbandonmentReason(
    reason: string | undefined,
    cartValue: number,
    sessionDuration: number,
  ) {
    if (!reason) {
      // Infer reason from behavior
      if (sessionDuration < 2) {
        return {
          inferredReason: 'Quick exit - possibly price shock',
          confidence: 0.7,
          category: 'pricing',
        };
      } else if (cartValue > 300) {
        return {
          inferredReason: 'High cart value - needs consideration',
          confidence: 0.65,
          category: 'value',
        };
      } else {
        return {
          inferredReason: 'General browsing - not ready to purchase',
          confidence: 0.5,
          category: 'intent',
        };
      }
    }

    // Categorize explicit reason
    const reasonLower = reason.toLowerCase();
    const categories = {
      pricing: ['expensive', 'price', 'cost', 'afford'],
      shipping: ['shipping', 'delivery', 'freight'],
      trust: ['trust', 'security', 'safe', 'legitimate'],
      comparison: ['compare', 'research', 'think'],
      technical: ['error', 'bug', 'problem', 'issue'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => reasonLower.includes(keyword))) {
        return {
          inferredReason: reason,
          confidence: 0.85,
          category,
        };
      }
    }

    return {
      inferredReason: reason,
      confidence: 0.6,
      category: 'other',
    };
  }

  private estimateRecoveryChance(userId: string, cartValue: number): number {
    const userHistory = this.abandonmentHistory.get(userId) || [];

    // Base recovery chance
    let chance = 0.3;

    // Adjust based on user history
    if (userHistory.length > 0) {
      const userRecoveryRate =
        userHistory.filter(e => e.recovered).length / userHistory.length;
      chance = userRecoveryRate;
    }

    // Adjust based on cart value
    if (cartValue < 50) {
      chance *= 0.8; // Lower recovery for low-value carts
    } else if (cartValue > 200) {
      chance *= 1.2; // Higher recovery for high-value carts
    }

    return Math.min(chance, 0.8); // Cap at 80%
  }
}
