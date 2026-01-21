import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface FunnelStage {
  name: string;
  count: number;
  conversionRate?: number;
}

export interface FunnelAnalytics {
  funnel: string;
  stages: FunnelStage[];
  overallConversionRate: number;
  totalUsers: number;
}

export interface CohortAnalysis {
  cohort: string;
  period: string;
  retention: Record<string, number>;
  size: number;
}

@Injectable()
export class GrowthAnalyticsService {
  private readonly logger = new Logger(GrowthAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get funnel analytics for user journey
   */
  async getFunnelAnalytics(params: {
    funnel: 'SIGNUP' | 'PURCHASE' | 'ONBOARDING' | 'CUSTOM';
    startDate?: Date;
    endDate?: Date;
    region?: string;
  }): Promise<FunnelAnalytics> {
    this.logger.log(`Analyzing funnel: ${params.funnel}`);

    const stages = await this.calculateFunnelStages(params);

    // Calculate conversion rates
    for (let i = 1; i < stages.length; i++) {
      stages[i].conversionRate = stages[i - 1].count > 0
        ? (stages[i].count / stages[i - 1].count) * 100
        : 0;
    }

    const overallConversionRate = stages.length > 0 && stages[0].count > 0
      ? (stages[stages.length - 1].count / stages[0].count) * 100
      : 0;

    return {
      funnel: params.funnel,
      stages,
      overallConversionRate,
      totalUsers: stages[0]?.count || 0,
    };
  }

  /**
   * Calculate funnel stages
   */
  private async calculateFunnelStages(params: any): Promise<FunnelStage[]> {
    const where: any = {};

    if (params.startDate) {
      where.createdAt = { gte: params.startDate };
    }

    if (params.endDate) {
      where.createdAt = { ...where.createdAt, lte: params.endDate };
    }

    if (params.region) {
      where.region = params.region;
    }

    switch (params.funnel) {
      case 'SIGNUP':
        return this.getSignupFunnel(where);
      case 'PURCHASE':
        return this.getPurchaseFunnel(where);
      case 'ONBOARDING':
        return this.getOnboardingFunnel(where);
      default:
        return [];
    }
  }

  /**
   * Get signup funnel stages
   */
  private async getSignupFunnel(where: any): Promise<FunnelStage[]> {
    const totalVisitors = await this.prisma.analyticsEvent.count({
      where: {
        ...where,
        eventType: 'PAGE_VIEW',
        page: '/signup',
      },
    });

    const signupStarted = await this.prisma.analyticsEvent.count({
      where: {
        ...where,
        eventType: 'SIGNUP_STARTED',
      },
    });

    const emailVerified = await this.prisma.user.count({
      where: {
        ...where,
        emailVerified: true,
      },
    });

    const profileCompleted = await this.prisma.user.count({
      where: {
        ...where,
        emailVerified: true,
        profile: {
          isNot: null,
        },
      },
    });

    return [
      { name: 'Visited Signup Page', count: totalVisitors },
      { name: 'Started Signup', count: signupStarted },
      { name: 'Email Verified', count: emailVerified },
      { name: 'Profile Completed', count: profileCompleted },
    ];
  }

  /**
   * Get purchase funnel stages
   */
  private async getPurchaseFunnel(where: any): Promise<FunnelStage[]> {
    const productViewed = await this.prisma.analyticsEvent.count({
      where: {
        ...where,
        eventType: 'PRODUCT_VIEW',
      },
    });

    const addedToCart = await this.prisma.analyticsEvent.count({
      where: {
        ...where,
        eventType: 'ADD_TO_CART',
      },
    });

    const checkoutStarted = await this.prisma.analyticsEvent.count({
      where: {
        ...where,
        eventType: 'CHECKOUT_STARTED',
      },
    });

    const orderCompleted = await this.prisma.order.count({
      where: {
        ...where,
        status: 'COMPLETED',
      },
    });

    return [
      { name: 'Product Viewed', count: productViewed },
      { name: 'Added to Cart', count: addedToCart },
      { name: 'Checkout Started', count: checkoutStarted },
      { name: 'Order Completed', count: orderCompleted },
    ];
  }

  /**
   * Get onboarding funnel stages
   */
  private async getOnboardingFunnel(where: any): Promise<FunnelStage[]> {
    const signedUp = await this.prisma.user.count({ where });

    const step1 = await this.prisma.user.count({
      where: {
        ...where,
        onboardingStep: { gte: 1 },
      },
    });

    const step2 = await this.prisma.user.count({
      where: {
        ...where,
        onboardingStep: { gte: 2 },
      },
    });

    const completed = await this.prisma.user.count({
      where: {
        ...where,
        onboardingCompleted: true,
      },
    });

    return [
      { name: 'Signed Up', count: signedUp },
      { name: 'Step 1 Completed', count: step1 },
      { name: 'Step 2 Completed', count: step2 },
      { name: 'Onboarding Completed', count: completed },
    ];
  }

  /**
   * Get cohort retention analysis
   */
  async getCohortAnalysis(params: {
    cohortBy: 'SIGNUP_MONTH' | 'SIGNUP_WEEK';
    periods: number;
  }): Promise<CohortAnalysis[]> {
    this.logger.log('Calculating cohort analysis');

    // This is a simplified implementation
    // In production, you'd use more sophisticated queries

    const cohorts: CohortAnalysis[] = [];

    // Get users grouped by signup period
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by cohort period
    const cohortGroups = this.groupByCohort(users, params.cohortBy);

    for (const [cohort, cohortUsers] of Object.entries(cohortGroups)) {
      const retention: Record<string, number> = {};

      // Calculate retention for each period
      for (let period = 0; period < params.periods; period++) {
        const activeUsers = await this.getActiveUsersInPeriod(
          cohortUsers,
          cohort,
          period,
          params.cohortBy,
        );

        retention[`period_${period}`] = cohortUsers.length > 0
          ? (activeUsers / cohortUsers.length) * 100
          : 0;
      }

      cohorts.push({
        cohort,
        period: params.cohortBy,
        retention,
        size: cohortUsers.length,
      });
    }

    return cohorts;
  }

  /**
   * Group users by cohort period
   */
  private groupByCohort(users: any[], cohortBy: string): Record<string, any[]> {
    const groups: Record<string, any[]> = {};

    for (const user of users) {
      const cohortKey = this.getCohortKey(user.createdAt, cohortBy);

      if (!groups[cohortKey]) {
        groups[cohortKey] = [];
      }

      groups[cohortKey].push(user);
    }

    return groups;
  }

  /**
   * Get cohort key for a date
   */
  private getCohortKey(date: Date, cohortBy: string): string {
    const d = new Date(date);

    if (cohortBy === 'SIGNUP_MONTH') {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else {
      // Week-based
      const weekNumber = this.getWeekNumber(d);
      return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
    }
  }

  /**
   * Get week number of the year
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Get active users in a specific period
   */
  private async getActiveUsersInPeriod(
    cohortUsers: any[],
    cohort: string,
    period: number,
    cohortBy: string,
  ): Promise<number> {
    // Calculate the date range for the period
    const [year, monthOrWeek] = cohort.split('-');
    let startDate: Date;

    if (cohortBy === 'SIGNUP_MONTH') {
      const month = parseInt(monthOrWeek, 10);
      startDate = new Date(parseInt(year, 10), month - 1 + period, 1);
    } else {
      // Week-based calculation would go here
      startDate = new Date();
    }

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Count users who were active in this period
    const userIds = cohortUsers.map((u) => u.id);

    const activeCount = await this.prisma.analyticsEvent.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        timestamp: {
          gte: startDate,
          lt: endDate,
        },
      },
      _count: true,
    });

    return activeCount.length;
  }

  /**
   * Get growth metrics
   */
  async getGrowthMetrics(params: {
    startDate: Date;
    endDate: Date;
    metric: 'USERS' | 'REVENUE' | 'ORDERS' | 'ACTIVE_USERS';
  }) {
    this.logger.log(`Getting growth metrics: ${params.metric}`);

    const where: any = {
      createdAt: {
        gte: params.startDate,
        lte: params.endDate,
      },
    };

    switch (params.metric) {
      case 'USERS':
        return this.getUserGrowth(where);
      case 'REVENUE':
        return this.getRevenueGrowth(where);
      case 'ORDERS':
        return this.getOrderGrowth(where);
      case 'ACTIVE_USERS':
        return this.getActiveUsersGrowth(params.startDate, params.endDate);
      default:
        return null;
    }
  }

  /**
   * Get user growth over time
   */
  private async getUserGrowth(where: any) {
    const users = await this.prisma.user.groupBy({
      by: ['createdAt'],
      where,
      _count: true,
    });

    return {
      metric: 'USERS',
      data: users,
    };
  }

  /**
   * Get revenue growth over time
   */
  private async getRevenueGrowth(where: any) {
    const orders = await this.prisma.order.groupBy({
      by: ['createdAt'],
      where,
      _sum: {
        total: true,
      },
    });

    return {
      metric: 'REVENUE',
      data: orders,
    };
  }

  /**
   * Get order growth over time
   */
  private async getOrderGrowth(where: any) {
    const orders = await this.prisma.order.groupBy({
      by: ['createdAt'],
      where,
      _count: true,
    });

    return {
      metric: 'ORDERS',
      data: orders,
    };
  }

  /**
   * Get active users growth
   */
  private async getActiveUsersGrowth(startDate: Date, endDate: Date) {
    const activeUsers = await this.prisma.analyticsEvent.groupBy({
      by: ['userId'],
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: true,
    });

    return {
      metric: 'ACTIVE_USERS',
      count: activeUsers.length,
    };
  }
}
