import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import {
  CreateCohortDto,
  CohortQueryDto,
  RetentionQueryDto,
  LtvQueryDto,
  ChurnQueryDto,
  CohortResponseDto,
  RetentionAnalysisDto,
  CohortRetentionRowDto,
  LtvAnalysisDto,
  LtvCohortDto,
  ChurnAnalysisDto,
  ChurnCohortDto,
  CohortType,
  RetentionMetric,
} from './dto/cohort.dto';
import { MarketingEventType } from '../constants/event-types';

@Injectable()
export class CohortsService {
  private readonly logger = new Logger(CohortsService.name);
  private readonly CACHE_PREFIX = 'analytics:cohort:';
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Create a new cohort definition
   */
  async createCohort(dto: CreateCohortDto): Promise<CohortResponseDto> {
    const metricsData = {
      name: dto.name,
      description: dto.description,
      cohortType: dto.cohortType,
      filters: dto.filters || [],
      granularity: dto.granularity || 'week',
      isActive: true,
      organizationId: dto.organizationId,
    };

    const cohort = await this.prisma.performanceSnapshot.create({
      data: {
        entityType: 'cohort_definition',
        entityId: `cohort_${Date.now()}`,
        snapshotDate: new Date(),
        metrics: JSON.parse(JSON.stringify(metricsData)),
      },
    });

    return this.mapToCohortResponse(cohort);
  }

  /**
   * List all cohorts
   */
  async listCohorts(organizationId?: string): Promise<CohortResponseDto[]> {
    const where: any = {
      entityType: 'cohort_definition',
    };

    if (organizationId) {
      where.metrics = {
        path: ['organizationId'],
        equals: organizationId,
      };
    }

    const cohorts = await this.prisma.performanceSnapshot.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return cohorts.map((c) => this.mapToCohortResponse(c));
  }

  /**
   * Get cohort by ID
   */
  async getCohort(id: string): Promise<CohortResponseDto> {
    const cohort = await this.prisma.performanceSnapshot.findFirst({
      where: {
        id,
        entityType: 'cohort_definition',
      },
    });

    if (!cohort) {
      throw new NotFoundException(`Cohort ${id} not found`);
    }

    return this.mapToCohortResponse(cohort);
  }

  /**
   * Get retention curves
   */
  async getRetentionCurves(query: RetentionQueryDto): Promise<RetentionAnalysisDto> {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const periods = query.periods || 12;
    const granularity = query.granularity || 'week';
    const retentionMetric = query.retentionMetric || RetentionMetric.ANY_EVENT;

    // Calculate start date based on periods and granularity
    const startDate = query.startDate
      ? new Date(query.startDate)
      : this.subtractPeriods(endDate, periods, granularity);

    // Check cache
    const cacheKey = `${this.CACHE_PREFIX}retention:${startDate.toISOString()}:${endDate.toISOString()}:${granularity}:${retentionMetric}`;
    const cached = await this.redis.get<RetentionAnalysisDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Generate cohort periods
    const cohortPeriods = this.generatePeriods(startDate, endDate, granularity);
    const cohorts: CohortRetentionRowDto[] = [];
    const periodRetentionSums: number[] = Array(periods).fill(0);
    const periodRetentionCounts: number[] = Array(periods).fill(0);

    for (const cohortPeriod of cohortPeriods) {
      // Get users who signed up in this period
      const cohortUsers = await this.getUsersForPeriod(
        cohortPeriod.start,
        cohortPeriod.end,
        CohortType.SIGNUP_DATE,
      );

      if (cohortUsers.length === 0) {
        continue;
      }

      const cohortSize = cohortUsers.length;
      const userIds = cohortUsers.map((u) => u.id);
      const retention: Array<{ period: number; users: number; percentage: number }> = [];

      // Calculate retention for each subsequent period
      for (let p = 0; p < periods; p++) {
        const periodStart = this.addPeriods(cohortPeriod.start, p, granularity);
        const periodEnd = this.addPeriods(cohortPeriod.start, p + 1, granularity);

        if (periodStart > endDate) {
          break;
        }

        const retainedUsers = await this.getRetainedUsers(
          userIds,
          periodStart,
          periodEnd,
          retentionMetric,
          query.eventType,
        );

        const percentage = (retainedUsers / cohortSize) * 100;
        retention.push({
          period: p,
          users: retainedUsers,
          percentage: Math.round(percentage * 100) / 100,
        });

        periodRetentionSums[p] += percentage;
        periodRetentionCounts[p]++;
      }

      cohorts.push({
        cohort: this.formatPeriodLabel(cohortPeriod.start, granularity),
        startDate: cohortPeriod.start.toISOString(),
        cohortSize,
        retention,
      });
    }

    // Calculate average retention per period
    const averageRetention = periodRetentionSums.map((sum, i) =>
      periodRetentionCounts[i] > 0
        ? Math.round((sum / periodRetentionCounts[i]) * 100) / 100
        : 0,
    );

    const result: RetentionAnalysisDto = {
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      granularity,
      periods,
      retentionMetric,
      cohorts,
      averageRetention,
    };

    // Cache result
    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  /**
   * Get customer lifetime value analysis
   */
  async getLtvAnalysis(query: LtvQueryDto): Promise<LtvAnalysisDto> {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const periods = query.periods || 12;
    const granularity = query.granularity || 'month';

    const startDate = query.startDate
      ? new Date(query.startDate)
      : this.subtractPeriods(endDate, periods, granularity);

    // Check cache
    const cacheKey = `${this.CACHE_PREFIX}ltv:${startDate.toISOString()}:${endDate.toISOString()}:${granularity}`;
    const cached = await this.redis.get<LtvAnalysisDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Generate cohort periods
    const cohortPeriods = this.generatePeriods(startDate, endDate, granularity);
    const cohorts: LtvCohortDto[] = [];
    let totalLtv = 0;
    let totalUsers = 0;

    for (const cohortPeriod of cohortPeriods) {
      // Get users who signed up in this period
      const cohortUsers = await this.getUsersForPeriod(
        cohortPeriod.start,
        cohortPeriod.end,
        CohortType.SIGNUP_DATE,
      );

      if (cohortUsers.length === 0) {
        continue;
      }

      const cohortSize = cohortUsers.length;
      const userIds = cohortUsers.map((u) => u.id);

      // Calculate revenue for this cohort
      const orders = await this.prisma.order.findMany({
        where: {
          userId: { in: userIds },
          status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
        },
        select: {
          total: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
      const avgRevenuePerUser = cohortSize > 0 ? totalRevenue / cohortSize : 0;

      // Calculate cumulative LTV over time
      const cumulativeLtv: number[] = [];
      let cumulative = 0;

      for (let p = 0; p < periods; p++) {
        const periodStart = this.addPeriods(cohortPeriod.start, p, granularity);
        const periodEnd = this.addPeriods(cohortPeriod.start, p + 1, granularity);

        const periodRevenue = orders
          .filter((o) => o.createdAt >= periodStart && o.createdAt < periodEnd)
          .reduce((sum, o) => sum + Number(o.total), 0);

        cumulative += periodRevenue / cohortSize;
        cumulativeLtv.push(Math.round(cumulative * 100) / 100);
      }

      // Simple LTV projection (based on current trend)
      const growthRate = cumulativeLtv.length >= 2
        ? (cumulativeLtv[cumulativeLtv.length - 1] - cumulativeLtv[0]) / cumulativeLtv.length
        : avgRevenuePerUser;

      const projectedLtv = avgRevenuePerUser + growthRate * 24; // Project 24 periods

      cohorts.push({
        cohort: this.formatPeriodLabel(cohortPeriod.start, granularity),
        cohortSize,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        avgRevenuePerUser: Math.round(avgRevenuePerUser * 100) / 100,
        cumulativeLtv,
        projectedLtv: Math.round(projectedLtv * 100) / 100,
      });

      totalLtv += avgRevenuePerUser * cohortSize;
      totalUsers += cohortSize;
    }

    const overallAvgLtv = totalUsers > 0 ? totalLtv / totalUsers : 0;

    const result: LtvAnalysisDto = {
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      overallAvgLtv: Math.round(overallAvgLtv * 100) / 100,
      cohorts,
    };

    // Cache result
    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  /**
   * Get churn analysis
   */
  async getChurnAnalysis(query: ChurnQueryDto): Promise<ChurnAnalysisDto> {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const periods = query.periods || 12;
    const granularity = query.granularity || 'month';
    const inactiveDays = query.inactiveDays || 30;

    const startDate = query.startDate
      ? new Date(query.startDate)
      : this.subtractPeriods(endDate, periods, granularity);

    // Check cache
    const cacheKey = `${this.CACHE_PREFIX}churn:${startDate.toISOString()}:${endDate.toISOString()}:${granularity}:${inactiveDays}`;
    const cached = await this.redis.get<ChurnAnalysisDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Generate cohort periods
    const cohortPeriods = this.generatePeriods(startDate, endDate, granularity);
    const cohorts: ChurnCohortDto[] = [];
    const monthlyChurn: Array<{ month: string; churnRate: number }> = [];

    let totalChurned = 0;
    let totalUsers = 0;

    for (const cohortPeriod of cohortPeriods) {
      // Get users active at the start of the period
      const cohortUsers = await this.getActiveUsersForPeriod(
        cohortPeriod.start,
        cohortPeriod.end,
      );

      if (cohortUsers.length === 0) {
        continue;
      }

      const cohortSize = cohortUsers.length;

      // Check which users became inactive
      const inactivityThreshold = new Date(cohortPeriod.end.getTime() + inactiveDays * 24 * 60 * 60 * 1000);

      if (inactivityThreshold > endDate) {
        continue; // Not enough time to determine churn
      }

      let churned = 0;
      let voluntaryChurn = 0;
      let involuntaryChurn = 0;

      for (const user of cohortUsers) {
        const hasActivity = await this.hasActivityAfter(user.id, cohortPeriod.end, inactivityThreshold);

        if (!hasActivity) {
          churned++;

          // Check if voluntary (subscription cancelled) or involuntary (payment failed)
          if (query.includeBreakdown) {
            const cancelEvent = await this.prisma.analyticsEvent.findFirst({
              where: {
                userId: user.id,
                eventType: MarketingEventType.SUBSCRIPTION_CANCELLED,
                timestamp: {
                  gte: cohortPeriod.start,
                  lte: inactivityThreshold,
                },
              },
            });

            if (cancelEvent) {
              voluntaryChurn++;
            } else {
              involuntaryChurn++;
            }
          }
        }
      }

      const churnRate = (churned / cohortSize) * 100;

      const cohortData: ChurnCohortDto = {
        cohort: this.formatPeriodLabel(cohortPeriod.start, granularity),
        cohortSize,
        churned,
        churnRate: Math.round(churnRate * 100) / 100,
      };

      if (query.includeBreakdown) {
        cohortData.voluntaryChurn = voluntaryChurn;
        cohortData.involuntaryChurn = involuntaryChurn;
      }

      cohorts.push(cohortData);

      monthlyChurn.push({
        month: this.formatPeriodLabel(cohortPeriod.start, 'month'),
        churnRate: Math.round(churnRate * 100) / 100,
      });

      totalChurned += churned;
      totalUsers += cohortSize;
    }

    const overallChurnRate = totalUsers > 0 ? (totalChurned / totalUsers) * 100 : 0;

    const result: ChurnAnalysisDto = {
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      overallChurnRate: Math.round(overallChurnRate * 100) / 100,
      monthlyTrend: monthlyChurn,
      cohorts,
    };

    // Cache result
    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  /**
   * Get cohort-specific analysis
   */
  async analyzeCohort(id: string, query: CohortQueryDto): Promise<any> {
    const cohort = await this.getCohort(id);
    const cohortDef = cohort as any;

    // Get retention for this specific cohort
    const retentionQuery: RetentionQueryDto = {
      ...query,
      retentionMetric: RetentionMetric.ANY_EVENT,
    };

    return this.getRetentionCurves(retentionQuery);
  }

  // ==================== Helper Methods ====================

  /**
   * Get users for a specific period
   */
  private async getUsersForPeriod(
    start: Date,
    end: Date,
    cohortType: CohortType,
  ): Promise<Array<{ id: string }>> {
    switch (cohortType) {
      case CohortType.SIGNUP_DATE:
        return this.prisma.user.findMany({
          where: {
            createdAt: { gte: start, lt: end },
          },
          select: { id: true },
        });

      case CohortType.FIRST_PURCHASE_DATE: {
        // Get users whose first order was in this period
        const usersWithOrders = await this.prisma.order.groupBy({
          by: ['userId'],
          where: {
            userId: { not: null },
          },
          _min: { createdAt: true },
          having: {
            createdAt: { _min: { gte: start, lt: end } },
          },
        });
        return usersWithOrders.map((u) => ({ id: u.userId! }));
      }

      default:
        return this.prisma.user.findMany({
          where: {
            createdAt: { gte: start, lt: end },
          },
          select: { id: true },
        });
    }
  }

  /**
   * Get active users for a period
   */
  private async getActiveUsersForPeriod(
    start: Date,
    end: Date,
  ): Promise<Array<{ id: string }>> {
    const activeUserIds = await this.prisma.analyticsEvent.findMany({
      where: {
        timestamp: { gte: start, lt: end },
        userId: { not: null },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    return activeUserIds.map((u) => ({ id: u.userId! }));
  }

  /**
   * Get retained users count
   */
  private async getRetainedUsers(
    userIds: string[],
    periodStart: Date,
    periodEnd: Date,
    metric: RetentionMetric,
    eventType?: string,
  ): Promise<number> {
    let where: any = {
      userId: { in: userIds },
      timestamp: { gte: periodStart, lt: periodEnd },
    };

    switch (metric) {
      case RetentionMetric.SPECIFIC_EVENT:
        if (eventType) {
          where.eventType = eventType;
        }
        break;
      case RetentionMetric.PURCHASE:
        where.eventType = MarketingEventType.PURCHASE;
        break;
      case RetentionMetric.LOGIN:
        where.eventType = MarketingEventType.LOGIN;
        break;
      case RetentionMetric.FEATURE_USE:
        where.eventType = MarketingEventType.FEATURE_USED;
        break;
    }

    const retained = await this.prisma.analyticsEvent.findMany({
      where,
      select: { userId: true },
      distinct: ['userId'],
    });

    return retained.length;
  }

  /**
   * Check if user has activity after a date
   */
  private async hasActivityAfter(
    userId: string,
    after: Date,
    before: Date,
  ): Promise<boolean> {
    const activity = await this.prisma.analyticsEvent.findFirst({
      where: {
        userId,
        timestamp: { gt: after, lte: before },
      },
    });

    return !!activity;
  }

  /**
   * Generate time periods
   */
  private generatePeriods(
    start: Date,
    end: Date,
    granularity: 'day' | 'week' | 'month',
  ): Array<{ start: Date; end: Date }> {
    const periods: Array<{ start: Date; end: Date }> = [];
    let current = new Date(start);

    while (current < end) {
      const periodStart = new Date(current);
      const periodEnd = this.addPeriods(current, 1, granularity);

      periods.push({
        start: periodStart,
        end: periodEnd > end ? end : periodEnd,
      });

      current = periodEnd;
    }

    return periods;
  }

  /**
   * Add periods to a date
   */
  private addPeriods(date: Date, periods: number, granularity: 'day' | 'week' | 'month'): Date {
    const result = new Date(date);

    switch (granularity) {
      case 'day':
        result.setDate(result.getDate() + periods);
        break;
      case 'week':
        result.setDate(result.getDate() + periods * 7);
        break;
      case 'month':
        result.setMonth(result.getMonth() + periods);
        break;
    }

    return result;
  }

  /**
   * Subtract periods from a date
   */
  private subtractPeriods(date: Date, periods: number, granularity: 'day' | 'week' | 'month'): Date {
    return this.addPeriods(date, -periods, granularity);
  }

  /**
   * Format period label
   */
  private formatPeriodLabel(date: Date, granularity: 'day' | 'week' | 'month'): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch (granularity) {
      case 'day':
        return `${year}-${month}-${day}`;
      case 'week':
        const weekNum = this.getWeekNumber(date);
        return `${year}-W${String(weekNum).padStart(2, '0')}`;
      case 'month':
        return `${year}-${month}`;
      default:
        return date.toISOString().split('T')[0];
    }
  }

  /**
   * Get week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  /**
   * Map database record to response DTO
   */
  private mapToCohortResponse(record: any): CohortResponseDto {
    const metrics = record.metrics as any;

    return {
      id: record.id,
      name: metrics.name,
      description: metrics.description,
      cohortType: metrics.cohortType,
      filters: metrics.filters,
      granularity: metrics.granularity,
      isActive: metrics.isActive,
      createdAt: record.createdAt,
    };
  }
}
