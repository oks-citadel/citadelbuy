import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface ChurnRisk {
  userId: string;
  riskScore: number;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  factors: string[];
  recommendations: string[];
}

export interface RetentionMetrics {
  period: string;
  totalUsers: number;
  activeUsers: number;
  churnedUsers: number;
  retentionRate: number;
  churnRate: number;
}

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Predict churn risk for a user
   */
  async predictChurnRisk(userId: string): Promise<ChurnRisk> {
    this.logger.log(`Predicting churn risk for user: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const factors: string[] = [];
    let riskScore = 0;

    // Factor 1: Days since last activity
    const daysSinceLastActivity = await this.getDaysSinceLastActivity(userId);
    if (daysSinceLastActivity > 30) {
      factors.push('Inactive for >30 days');
      riskScore += 30;
    } else if (daysSinceLastActivity > 14) {
      factors.push('Inactive for >14 days');
      riskScore += 15;
    }

    // Factor 2: Declining order frequency
    const orderTrend = await this.getOrderTrend(userId);
    if (orderTrend === 'DECLINING') {
      factors.push('Declining order frequency');
      riskScore += 25;
    }

    // Factor 3: No recent orders
    const daysSinceLastOrder = this.getDaysSinceDate(user.orders[0]?.createdAt);
    if (daysSinceLastOrder > 60) {
      factors.push('No orders in 60+ days');
      riskScore += 35;
    }

    // Factor 4: Support tickets
    const recentTickets = await this.prisma.supportTicket.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (recentTickets > 2) {
      factors.push('Multiple support tickets');
      riskScore += 20;
    }

    // Factor 5: Negative sentiment (if available)
    // This would integrate with sentiment analysis

    // Determine risk level
    let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (riskScore >= 60) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 30) {
      riskLevel = 'MEDIUM';
    }

    // Generate recommendations
    const recommendations = this.generateRetentionRecommendations(factors);

    // Store risk assessment
    await this.prisma.churnRisk.upsert({
      where: { userId },
      create: {
        userId,
        riskScore,
        riskLevel,
        factors: factors as any,
        assessedAt: new Date(),
      },
      update: {
        riskScore,
        riskLevel,
        factors: factors as any,
        assessedAt: new Date(),
      },
    });

    return {
      userId,
      riskScore,
      riskLevel,
      factors,
      recommendations,
    };
  }

  /**
   * Get retention metrics for a period
   */
  async getRetentionMetrics(params: {
    startDate: Date;
    endDate: Date;
  }): Promise<RetentionMetrics> {
    const totalUsers = await this.prisma.user.count({
      where: {
        createdAt: {
          lt: params.startDate,
        },
      },
    });

    const activeUsers = await this.prisma.analyticsEvent.groupBy({
      by: ['userId'],
      where: {
        timestamp: {
          gte: params.startDate,
          lte: params.endDate,
        },
      },
      _count: true,
    });

    const activeCount = activeUsers.length;
    const churnedCount = totalUsers - activeCount;

    const retentionRate = totalUsers > 0 ? (activeCount / totalUsers) * 100 : 0;
    const churnRate = totalUsers > 0 ? (churnedCount / totalUsers) * 100 : 0;

    return {
      period: `${params.startDate.toISOString()} - ${params.endDate.toISOString()}`,
      totalUsers,
      activeUsers: activeCount,
      churnedUsers: churnedCount,
      retentionRate,
      churnRate,
    };
  }

  /**
   * Get high-risk users
   */
  async getHighRiskUsers(limit: number = 100) {
    return this.prisma.churnRisk.findMany({
      where: {
        riskLevel: 'HIGH',
      },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        },
      },
      orderBy: { riskScore: 'desc' },
    });
  }

  /**
   * Execute retention campaign
   */
  async executeRetentionCampaign(params: {
    targetRiskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    campaignType: 'EMAIL' | 'DISCOUNT' | 'PERSONALIZED_OFFER';
    offerDetails?: any;
  }) {
    this.logger.log(`Executing retention campaign for ${params.targetRiskLevel} risk users`);

    const targetUsers = await this.prisma.churnRisk.findMany({
      where: {
        riskLevel: params.targetRiskLevel,
      },
      include: {
        user: true,
      },
    });

    const results = [];

    for (const { user } of targetUsers) {
      try {
        switch (params.campaignType) {
          case 'EMAIL':
            await this.sendRetentionEmail(user.id, user.email);
            break;
          case 'DISCOUNT':
            await this.createPersonalizedDiscount(user.id, params.offerDetails);
            break;
          case 'PERSONALIZED_OFFER':
            await this.createPersonalizedOffer(user.id, params.offerDetails);
            break;
        }

        results.push({ userId: user.id, status: 'success' });
      } catch (error) {
        this.logger.error(`Failed to send retention campaign to ${user.id}:`, error);
        results.push({ userId: user.id, status: 'failed', error: error.message });
      }
    }

    return {
      targetRiskLevel: params.targetRiskLevel,
      campaignType: params.campaignType,
      totalTargeted: targetUsers.length,
      results,
    };
  }

  /**
   * Get days since last activity
   */
  private async getDaysSinceLastActivity(userId: string): Promise<number> {
    const lastActivity = await this.prisma.analyticsEvent.findFirst({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });

    if (!lastActivity) {
      return 999; // No activity found
    }

    return this.getDaysSinceDate(lastActivity.timestamp);
  }

  /**
   * Get days since a date
   */
  private getDaysSinceDate(date?: Date): number {
    if (!date) {
      return 999;
    }

    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Get order trend (increasing, stable, or declining)
   */
  private async getOrderTrend(userId: string): Promise<'INCREASING' | 'STABLE' | 'DECLINING'> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    if (orders.length < 3) {
      return 'STABLE';
    }

    const recent = orders.slice(0, 3).length;
    const older = orders.slice(3).length;

    if (recent > older) {
      return 'INCREASING';
    } else if (recent < older) {
      return 'DECLINING';
    }

    return 'STABLE';
  }

  /**
   * Generate retention recommendations
   */
  private generateRetentionRecommendations(factors: string[]): string[] {
    const recommendations: string[] = [];

    if (factors.some((f) => f.includes('Inactive'))) {
      recommendations.push('Send re-engagement email campaign');
      recommendations.push('Offer personalized product recommendations');
    }

    if (factors.some((f) => f.includes('Declining'))) {
      recommendations.push('Provide loyalty discount or bonus');
      recommendations.push('Schedule check-in call');
    }

    if (factors.some((f) => f.includes('No orders'))) {
      recommendations.push('Offer limited-time discount');
      recommendations.push('Highlight new products or features');
    }

    if (factors.some((f) => f.includes('support tickets'))) {
      recommendations.push('Proactive customer success outreach');
      recommendations.push('Offer premium support or training');
    }

    return recommendations;
  }

  /**
   * Send retention email
   */
  private async sendRetentionEmail(userId: string, email: string) {
    // Integration with email service
    this.logger.log(`Sending retention email to ${email}`);
    // Email queue logic here
  }

  /**
   * Create personalized discount
   */
  private async createPersonalizedDiscount(userId: string, offerDetails: any) {
    this.logger.log(`Creating personalized discount for ${userId}`);
    // Coupon creation logic here
  }

  /**
   * Create personalized offer
   */
  private async createPersonalizedOffer(userId: string, offerDetails: any) {
    this.logger.log(`Creating personalized offer for ${userId}`);
    // Offer creation logic here
  }
}
