import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import {
  CreateFunnelDto,
  UpdateFunnelDto,
  FunnelQueryDto,
  FunnelAnalysisResultDto,
  FunnelStepResultDto,
  FunnelResponseDto,
} from './dto/funnel.dto';
import { MarketingEventType } from '../constants/event-types';

// Interface for funnel definition stored in database
interface FunnelDefinition {
  id: string;
  name: string;
  description?: string;
  steps: Array<{
    name: string;
    eventType: string;
    filters?: Array<{
      property: string;
      operator: string;
      value: any;
    }>;
    maxTimeSeconds?: number;
  }>;
  isOrdered: boolean;
  conversionWindow: number;
  isActive: boolean;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class FunnelsService {
  private readonly logger = new Logger(FunnelsService.name);
  private readonly CACHE_PREFIX = 'analytics:funnel:';
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Create a new funnel definition
   */
  async createFunnel(dto: CreateFunnelDto): Promise<FunnelResponseDto> {
    // Store funnel in a generic configuration table or create a dedicated model
    // For now, we'll use a metadata approach
    const metricsData = {
      name: dto.name,
      description: dto.description,
      steps: dto.steps,
      isOrdered: dto.isOrdered ?? true,
      conversionWindow: dto.conversionWindow ?? 604800,
      isActive: true,
      organizationId: dto.organizationId,
    };

    const funnel = await this.prisma.performanceSnapshot.create({
      data: {
        entityType: 'funnel_definition',
        entityId: `funnel_${Date.now()}`,
        snapshotDate: new Date(),
        metrics: JSON.parse(JSON.stringify(metricsData)),
      },
    });

    return this.mapToFunnelResponse(funnel);
  }

  /**
   * List all funnels
   */
  async listFunnels(organizationId?: string): Promise<FunnelResponseDto[]> {
    const where: any = {
      entityType: 'funnel_definition',
    };

    if (organizationId) {
      where.metrics = {
        path: ['organizationId'],
        equals: organizationId,
      };
    }

    const funnels = await this.prisma.performanceSnapshot.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return funnels.map((f) => this.mapToFunnelResponse(f));
  }

  /**
   * Get funnel by ID
   */
  async getFunnel(id: string): Promise<FunnelResponseDto> {
    const funnel = await this.prisma.performanceSnapshot.findFirst({
      where: {
        id,
        entityType: 'funnel_definition',
      },
    });

    if (!funnel) {
      throw new NotFoundException(`Funnel ${id} not found`);
    }

    return this.mapToFunnelResponse(funnel);
  }

  /**
   * Update funnel definition
   */
  async updateFunnel(id: string, dto: UpdateFunnelDto): Promise<FunnelResponseDto> {
    const existing = await this.getFunnel(id);
    const metrics = existing as any;

    const updated = await this.prisma.performanceSnapshot.update({
      where: { id },
      data: {
        metrics: {
          ...metrics,
          name: dto.name ?? metrics.name,
          description: dto.description ?? metrics.description,
          steps: dto.steps ?? metrics.steps,
          isActive: dto.isActive ?? metrics.isActive,
        },
      },
    });

    // Invalidate cache
    await this.redis.del(`${this.CACHE_PREFIX}${id}`);

    return this.mapToFunnelResponse(updated);
  }

  /**
   * Delete funnel
   */
  async deleteFunnel(id: string): Promise<void> {
    await this.prisma.performanceSnapshot.delete({
      where: { id },
    });

    // Invalidate cache
    await this.redis.del(`${this.CACHE_PREFIX}${id}`);
  }

  /**
   * Get funnel analysis with conversion rates per step
   */
  async analyzeFunnel(id: string, query: FunnelQueryDto): Promise<FunnelAnalysisResultDto> {
    const funnel = await this.getFunnel(id);
    const funnelDef = funnel as any;

    // Parse dates
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days

    // Check cache
    const cacheKey = `${this.CACHE_PREFIX}analysis:${id}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await this.redis.get<FunnelAnalysisResultDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Analyze each step
    const stepResults: FunnelStepResultDto[] = [];
    let previousStepUsers: Set<string> = new Set();

    for (let i = 0; i < funnelDef.steps.length; i++) {
      const step = funnelDef.steps[i];
      const isFirstStep = i === 0;

      // Build query for this step
      const where: any = {
        eventType: step.eventType,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      };

      // Apply filters if any
      if (step.filters && step.filters.length > 0) {
        where.properties = this.buildPropertyFilters(step.filters);
      }

      // Get users who completed this step
      const stepEvents = await this.prisma.analyticsEvent.findMany({
        where,
        select: {
          userId: true,
          sessionId: true,
          timestamp: true,
        },
        orderBy: { timestamp: 'asc' },
      });

      // Get unique users (by userId or sessionId)
      const stepUsers = new Set<string>();
      const completionTimes: number[] = [];

      for (const event of stepEvents) {
        const userKey = event.userId || event.sessionId;

        if (isFirstStep) {
          stepUsers.add(userKey);
        } else if (funnelDef.isOrdered) {
          // For ordered funnels, user must have completed previous step
          if (previousStepUsers.has(userKey)) {
            stepUsers.add(userKey);
          }
        } else {
          // For unordered funnels, just count all users
          stepUsers.add(userKey);
        }
      }

      const entered = isFirstStep ? stepUsers.size : previousStepUsers.size;
      const completed = stepUsers.size;
      const conversionRate = entered > 0 ? (completed / entered) * 100 : 0;
      const dropoffRate = 100 - conversionRate;

      // Calculate average time to complete (simplified)
      const avgTimeToComplete = completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0;

      stepResults.push({
        stepIndex: i,
        stepName: step.name,
        eventType: step.eventType,
        entered,
        completed,
        conversionRate: Math.round(conversionRate * 100) / 100,
        dropoffRate: Math.round(dropoffRate * 100) / 100,
        avgTimeToComplete,
        medianTimeToComplete: 0, // Would need more complex calculation
      });

      previousStepUsers = stepUsers;
    }

    const totalEntered = stepResults[0]?.entered || 0;
    const totalConverted = stepResults[stepResults.length - 1]?.completed || 0;
    const overallConversionRate = totalEntered > 0 ? (totalConverted / totalEntered) * 100 : 0;

    const result: FunnelAnalysisResultDto = {
      funnelId: id,
      funnelName: funnelDef.name,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      totalEntered,
      totalConverted,
      overallConversionRate: Math.round(overallConversionRate * 100) / 100,
      steps: stepResults,
    };

    // Add device breakdown if requested
    if (query.includeDeviceBreakdown) {
      result.deviceBreakdown = await this.getDeviceBreakdown(funnelDef.steps, startDate, endDate);
    }

    // Add source breakdown if requested
    if (query.includeSourceBreakdown) {
      result.sourceBreakdown = await this.getSourceBreakdown(funnelDef.steps, startDate, endDate);
    }

    // Add time series if grouped
    if (query.groupBy) {
      result.timeSeries = await this.getTimeSeries(funnelDef.steps, startDate, endDate, query.groupBy);
    }

    // Cache result
    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  /**
   * Get conversion rates for funnel steps
   */
  async getConversionRates(
    id: string,
    query: FunnelQueryDto,
  ): Promise<{
    funnelId: string;
    steps: Array<{
      stepIndex: number;
      stepName: string;
      conversionRate: number;
      dropoffRate: number;
    }>;
  }> {
    const analysis = await this.analyzeFunnel(id, query);

    return {
      funnelId: id,
      steps: analysis.steps.map((step) => ({
        stepIndex: step.stepIndex,
        stepName: step.stepName,
        conversionRate: step.conversionRate,
        dropoffRate: step.dropoffRate,
      })),
    };
  }

  /**
   * Build property filters for Prisma query
   */
  private buildPropertyFilters(
    filters: Array<{ property: string; operator: string; value: any }>,
  ): any {
    // This is a simplified implementation
    // In production, you'd build proper JSON path queries
    const conditions: any = {};

    for (const filter of filters) {
      conditions.path = [filter.property];

      switch (filter.operator) {
        case 'eq':
          conditions.equals = filter.value;
          break;
        case 'neq':
          conditions.not = filter.value;
          break;
        case 'gt':
          conditions.gt = filter.value;
          break;
        case 'gte':
          conditions.gte = filter.value;
          break;
        case 'lt':
          conditions.lt = filter.value;
          break;
        case 'lte':
          conditions.lte = filter.value;
          break;
        case 'contains':
          conditions.string_contains = filter.value;
          break;
      }
    }

    return conditions;
  }

  /**
   * Get device type breakdown
   */
  private async getDeviceBreakdown(
    steps: any[],
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, { entered: number; converted: number; conversionRate: number }>> {
    // Simplified - would need actual device detection from user agent
    const deviceTypes = ['desktop', 'mobile', 'tablet'];
    const breakdown: Record<string, { entered: number; converted: number; conversionRate: number }> = {};

    for (const deviceType of deviceTypes) {
      breakdown[deviceType] = {
        entered: 0,
        converted: 0,
        conversionRate: 0,
      };
    }

    return breakdown;
  }

  /**
   * Get traffic source breakdown
   */
  private async getSourceBreakdown(
    steps: any[],
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, { entered: number; converted: number; conversionRate: number }>> {
    // Simplified - would analyze UTM parameters
    const sources = ['direct', 'organic', 'paid', 'social', 'referral', 'email'];
    const breakdown: Record<string, { entered: number; converted: number; conversionRate: number }> = {};

    for (const source of sources) {
      breakdown[source] = {
        entered: 0,
        converted: 0,
        conversionRate: 0,
      };
    }

    return breakdown;
  }

  /**
   * Get time series data
   */
  private async getTimeSeries(
    steps: any[],
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month',
  ): Promise<Array<{ date: string; entered: number; converted: number; conversionRate: number }>> {
    // Generate time periods
    const periods: Array<{ date: string; entered: number; converted: number; conversionRate: number }> = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      periods.push({
        date: current.toISOString().split('T')[0],
        entered: 0,
        converted: 0,
        conversionRate: 0,
      });

      switch (groupBy) {
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return periods;
  }

  /**
   * Map database record to response DTO
   */
  private mapToFunnelResponse(record: any): FunnelResponseDto {
    const metrics = record.metrics as any;

    return {
      id: record.id,
      name: metrics.name,
      description: metrics.description,
      steps: metrics.steps,
      isOrdered: metrics.isOrdered,
      conversionWindow: metrics.conversionWindow,
      isActive: metrics.isActive,
      organizationId: metrics.organizationId,
      createdAt: record.createdAt,
      updatedAt: record.createdAt, // PerformanceSnapshot doesn't have updatedAt
    };
  }
}
