import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ReplenishmentService {
  private readonly logger = new Logger(ReplenishmentService.name);

  async predictReplenishment(data: {
    userId: string;
    productId: string;
    lastPurchase: string;
    averageUsage?: number;
  }) {
    try {
      this.logger.log(
        `Predicting replenishment for user ${data.userId}, product ${data.productId}`,
      );

      // ML would analyze:
      // - Purchase frequency
      // - Product type (consumable, durable)
      // - Usage patterns
      // - Seasonal variations
      // - User feedback

      const daysSinceLastPurchase = Math.floor(
        (Date.now() - new Date(data.lastPurchase).getTime()) / (1000 * 60 * 60 * 24),
      );

      // Get historical purchase intervals
      const purchaseHistory = await this.getPurchaseHistory(
        data.userId,
        data.productId,
      );
      const averageInterval = this.calculateAverageInterval(purchaseHistory);

      // Estimate remaining supply
      const estimatedUsageRate = data.averageUsage || this.estimateUsageRate(data.productId);
      const daysUntilEmpty = Math.max(
        0,
        averageInterval - daysSinceLastPurchase,
      );
      const supplyLevel = Math.max(
        0,
        ((averageInterval - daysSinceLastPurchase) / averageInterval) * 100,
      );

      // Determine if replenishment is needed
      const needsReplenishment = supplyLevel < 20;
      const urgency =
        supplyLevel < 10
          ? 'critical'
          : supplyLevel < 20
          ? 'high'
          : supplyLevel < 40
          ? 'medium'
          : 'low';

      return {
        success: true,
        userId: data.userId,
        productId: data.productId,
        prediction: {
          estimatedSupplyLevel: Math.round(supplyLevel) + '%',
          daysUntilEmpty: Math.max(0, daysUntilEmpty),
          estimatedEmptyDate: this.calculateEmptyDate(daysUntilEmpty),
          needsReplenishment,
          urgency,
        },
        analysis: {
          daysSinceLastPurchase,
          averagePurchaseInterval: averageInterval + ' days',
          estimatedDailyUsage: estimatedUsageRate.toFixed(2) + ' units',
          purchaseFrequency: purchaseHistory.length + ' purchases tracked',
        },
        recommendation: {
          action: needsReplenishment ? 'order_now' : 'schedule_delivery',
          timing:
            urgency === 'critical'
              ? 'Order now for delivery within 2 days'
              : urgency === 'high'
              ? 'Order within next 3 days'
              : `Schedule delivery for ${daysUntilEmpty - 5} days from now`,
          subscriptionSuggestion:
            purchaseHistory.length >= 3
              ? {
                  eligible: true,
                  frequency: averageInterval + ' days',
                  savings: '15% off with subscription',
                  benefits: [
                    'Never run out',
                    'Automatic delivery',
                    'Always save 15%',
                  ],
                }
              : null,
        },
        proactive: {
          enableAutoReplenish: !needsReplenishment,
          suggestedThreshold: '20% remaining',
          notificationPreferences: ['email', 'push', 'sms'],
        },
      };
    } catch (error) {
      this.logger.error('Replenishment prediction failed', error);
      throw error;
    }
  }

  async scheduleAutoReplenishment(data: {
    userId: string;
    productId: string;
    threshold: number; // percentage
    deliveryLeadTime: number; // days
  }) {
    try {
      this.logger.log(
        `Scheduling auto-replenishment for user ${data.userId}, product ${data.productId}`,
      );

      return {
        success: true,
        userId: data.userId,
        productId: data.productId,
        configuration: {
          enabled: true,
          threshold: data.threshold + '% remaining',
          deliveryLeadTime: data.deliveryLeadTime + ' days',
          autoOrderTrigger: `When supply reaches ${data.threshold}%`,
        },
        notifications: {
          upcomingOrder: '3 days before automatic order',
          orderPlaced: 'Immediate notification',
          delivery: 'On delivery day',
          cancellationWindow: '24 hours to cancel automatic order',
        },
        benefits: [
          'Never run out of essentials',
          'No manual reordering needed',
          'Optimized delivery timing',
          'Subscription discounts applied',
        ],
      };
    } catch (error) {
      this.logger.error('Auto-replenishment scheduling failed', error);
      throw error;
    }
  }

  private async getPurchaseHistory(userId: string, productId: string) {
    // In production: Query purchase database
    // Return array of purchase dates
    return [
      new Date('2025-08-15'),
      new Date('2025-09-20'),
      new Date('2025-10-25'),
    ];
  }

  private calculateAverageInterval(purchases: Date[]): number {
    if (purchases.length < 2) return 30; // Default to 30 days

    const intervals = [];
    for (let i = 1; i < purchases.length; i++) {
      const interval =
        (purchases[i].getTime() - purchases[i - 1].getTime()) / (1000 * 60 * 60 * 24);
      intervals.push(interval);
    }

    return Math.round(
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length,
    );
  }

  private estimateUsageRate(productId: string): number {
    // In production: Product-specific usage rates
    // Return daily usage rate
    return 1.0; // 1 unit per day default
  }

  private calculateEmptyDate(daysUntilEmpty: number): string {
    if (daysUntilEmpty <= 0) return 'Now';
    const emptyDate = new Date(Date.now() + daysUntilEmpty * 24 * 60 * 60 * 1000);
    return emptyDate.toISOString().split('T')[0];
  }
}
