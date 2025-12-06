import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface LeadScore {
  userId: string;
  score: number;
  tier: 'HOT' | 'WARM' | 'COLD';
  factors: Record<string, number>;
  lastUpdated: Date;
}

export interface ScoringRule {
  name: string;
  factor: string;
  points: number;
  condition?: any;
}

@Injectable()
export class LeadScoringService {
  private readonly logger = new Logger(LeadScoringService.name);

  private readonly scoringRules: ScoringRule[] = [
    { name: 'Email Verified', factor: 'emailVerified', points: 10 },
    { name: 'Profile Completed', factor: 'profileCompleted', points: 15 },
    { name: 'Organization Member', factor: 'organizationMember', points: 20 },
    { name: 'First Order', factor: 'firstOrder', points: 25 },
    { name: 'Repeat Customer', factor: 'repeatCustomer', points: 30 },
    { name: 'High Order Value', factor: 'highOrderValue', points: 35 },
    { name: 'Recent Activity', factor: 'recentActivity', points: 10 },
    { name: 'Engagement Score', factor: 'engagementScore', points: 20 },
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate lead score for a user
   */
  async calculateLeadScore(userId: string): Promise<LeadScore> {
    this.logger.log(`Calculating lead score for user: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: true,
        organizationMembers: true,
      },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const factors: Record<string, number> = {};
    let totalScore = 0;

    // Email verified
    if (user.emailVerified) {
      factors.emailVerified = 10;
      totalScore += 10;
    }

    // Profile completed
    if (user.profile) {
      factors.profileCompleted = 15;
      totalScore += 15;
    }

    // Organization member
    if (user.organizationMembers && user.organizationMembers.length > 0) {
      factors.organizationMember = 20;
      totalScore += 20;
    }

    // Order history
    const orders = user.orders || [];
    if (orders.length > 0) {
      factors.firstOrder = 25;
      totalScore += 25;

      if (orders.length > 1) {
        factors.repeatCustomer = 30;
        totalScore += 30;
      }

      // Check for high-value orders
      const totalOrderValue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
      if (totalOrderValue > 10000) {
        factors.highOrderValue = 35;
        totalScore += 35;
      }
    }

    // Recent activity (last 30 days)
    const recentActivity = await this.prisma.analyticsEvent.count({
      where: {
        userId,
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (recentActivity > 10) {
      factors.recentActivity = 10;
      totalScore += 10;
    }

    // Engagement score (views, clicks, etc.)
    const engagementCount = await this.prisma.analyticsEvent.count({
      where: { userId },
    });

    if (engagementCount > 50) {
      factors.engagementScore = 20;
      totalScore += 20;
    }

    // Determine tier
    let tier: 'HOT' | 'WARM' | 'COLD' = 'COLD';
    if (totalScore >= 80) {
      tier = 'HOT';
    } else if (totalScore >= 40) {
      tier = 'WARM';
    }

    // Store score in database
    await this.prisma.leadScore.upsert({
      where: { userId },
      create: {
        userId,
        score: totalScore,
        tier,
        factors: factors as any,
      },
      update: {
        score: totalScore,
        tier,
        factors: factors as any,
        updatedAt: new Date(),
      },
    });

    return {
      userId,
      score: totalScore,
      tier,
      factors,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get leads by tier
   */
  async getLeadsByTier(tier: 'HOT' | 'WARM' | 'COLD') {
    return this.prisma.leadScore.findMany({
      where: { tier },
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
      orderBy: { score: 'desc' },
    });
  }

  /**
   * Get top leads
   */
  async getTopLeads(limit: number = 50) {
    return this.prisma.leadScore.findMany({
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
      orderBy: { score: 'desc' },
    });
  }

  /**
   * Recalculate all lead scores
   */
  async recalculateAllScores() {
    this.logger.log('Recalculating all lead scores');

    const users = await this.prisma.user.findMany({
      select: { id: true },
    });

    let processed = 0;
    for (const user of users) {
      try {
        await this.calculateLeadScore(user.id);
        processed++;
      } catch (error) {
        this.logger.error(`Failed to calculate score for user ${user.id}:`, error);
      }
    }

    this.logger.log(`Recalculated ${processed} lead scores`);
    return { processed, total: users.length };
  }

  /**
   * Get scoring analytics
   */
  async getScoringAnalytics() {
    const totalLeads = await this.prisma.leadScore.count();
    const hotLeads = await this.prisma.leadScore.count({ where: { tier: 'HOT' } });
    const warmLeads = await this.prisma.leadScore.count({ where: { tier: 'WARM' } });
    const coldLeads = await this.prisma.leadScore.count({ where: { tier: 'COLD' } });

    const avgScore = await this.prisma.leadScore.aggregate({
      _avg: { score: true },
    });

    return {
      totalLeads,
      distribution: {
        hot: hotLeads,
        warm: warmLeads,
        cold: coldLeads,
      },
      averageScore: avgScore._avg.score || 0,
    };
  }
}
