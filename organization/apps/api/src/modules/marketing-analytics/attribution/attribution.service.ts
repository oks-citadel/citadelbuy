import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import {
  AttributionQueryDto,
  JourneyQueryDto,
  TouchpointQueryDto,
  AttributionModel,
  AttributionModelDto,
  AttributionReportDto,
  ChannelAttributionDto,
  JourneyMappingDto,
  CustomerJourneyDto,
  TouchpointDto,
  TouchpointAnalysisDto,
} from './dto/attribution.dto';
import { MarketingEventType } from '../constants/event-types';

@Injectable()
export class AttributionService {
  private readonly logger = new Logger(AttributionService.name);
  private readonly CACHE_PREFIX = 'analytics:attribution:';
  private readonly CACHE_TTL = 1800; // 30 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Get available attribution models
   */
  getAttributionModels(): AttributionModelDto[] {
    return [
      {
        id: AttributionModel.FIRST_TOUCH,
        name: 'First Touch',
        description: 'Assigns 100% credit to the first touchpoint in the customer journey.',
        creditDistribution: '100% to first touchpoint',
        useCases: [
          'Understanding brand awareness drivers',
          'Top-of-funnel marketing analysis',
          'New customer acquisition campaigns',
        ],
      },
      {
        id: AttributionModel.LAST_TOUCH,
        name: 'Last Touch',
        description: 'Assigns 100% credit to the last touchpoint before conversion.',
        creditDistribution: '100% to last touchpoint',
        useCases: [
          'Direct response campaigns',
          'Bottom-of-funnel analysis',
          'Quick wins identification',
        ],
      },
      {
        id: AttributionModel.LINEAR,
        name: 'Linear',
        description: 'Distributes credit equally across all touchpoints in the journey.',
        creditDistribution: 'Equal share to all touchpoints',
        useCases: [
          'Understanding full journey contribution',
          'Fair multi-channel analysis',
          'Long consideration cycles',
        ],
      },
      {
        id: AttributionModel.TIME_DECAY,
        name: 'Time Decay',
        description: 'Gives more credit to touchpoints closer to conversion.',
        creditDistribution: 'Exponentially increasing towards conversion',
        useCases: [
          'Short consideration cycles',
          'Recent influence analysis',
          'Promotional campaigns',
        ],
      },
      {
        id: AttributionModel.POSITION_BASED,
        name: 'Position Based (U-Shaped)',
        description: 'Assigns 40% to first and last touch, 20% distributed to middle.',
        creditDistribution: '40% first, 40% last, 20% middle',
        useCases: [
          'Balanced analysis',
          'Both acquisition and conversion focus',
          'Complex customer journeys',
        ],
      },
      {
        id: AttributionModel.DATA_DRIVEN,
        name: 'Data Driven',
        description: 'Uses machine learning to determine credit distribution based on actual conversion patterns.',
        creditDistribution: 'ML-determined based on conversion probability',
        useCases: [
          'Mature analytics setup',
          'Large dataset availability',
          'Optimizing budget allocation',
        ],
      },
    ];
  }

  /**
   * Get attribution report
   */
  async getAttributionReport(query: AttributionQueryDto): Promise<AttributionReportDto> {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const model = query.model || AttributionModel.LAST_TOUCH;
    const conversionWindow = query.conversionWindow || 30;
    const conversionEvent = query.conversionEvent || MarketingEventType.PURCHASE;

    // Check cache
    const cacheKey = `${this.CACHE_PREFIX}report:${startDate.toISOString()}:${endDate.toISOString()}:${model}`;
    const cached = await this.redis.get<AttributionReportDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all conversions in the period
    const conversions = await this.prisma.analyticsEvent.findMany({
      where: {
        eventType: conversionEvent,
        timestamp: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        userId: true,
        sessionId: true,
        timestamp: true,
        properties: true,
        metadata: true,
      },
    });

    const channelAttribution: Record<string, { conversions: number; revenue: number }> = {};
    let totalRevenue = 0;

    // Process each conversion
    for (const conversion of conversions) {
      const conversionValue = (conversion.properties as any)?.orderValue || 0;
      totalRevenue += conversionValue;

      // Get touchpoints leading to this conversion
      const touchpoints = await this.getTouchpointsForConversion(
        conversion.userId || conversion.sessionId,
        conversion.timestamp,
        conversionWindow,
      );

      if (touchpoints.length === 0) {
        // Direct conversion
        if (!channelAttribution['direct']) {
          channelAttribution['direct'] = { conversions: 0, revenue: 0 };
        }
        channelAttribution['direct'].conversions += 1;
        channelAttribution['direct'].revenue += conversionValue;
        continue;
      }

      // Apply attribution model
      const credits = this.calculateCredits(touchpoints, model);

      for (const touchpoint of touchpoints) {
        const channel = this.determineChannel(touchpoint);
        const credit = credits.get(touchpoint.id) || 0;

        if (!channelAttribution[channel]) {
          channelAttribution[channel] = { conversions: 0, revenue: 0 };
        }
        channelAttribution[channel].conversions += credit;
        channelAttribution[channel].revenue += conversionValue * credit;
      }
    }

    // Format results
    const totalConversions = conversions.length;
    const byChannel: ChannelAttributionDto[] = Object.entries(channelAttribution)
      .map(([channel, data]) => ({
        channel,
        conversions: Math.round(data.conversions * 100) / 100,
        revenue: Math.round(data.revenue * 100) / 100,
        conversionShare: totalConversions > 0
          ? Math.round((data.conversions / totalConversions) * 100 * 100) / 100
          : 0,
        revenueShare: totalRevenue > 0
          ? Math.round((data.revenue / totalRevenue) * 100 * 100) / 100
          : 0,
      }))
      .sort((a, b) => b.conversions - a.conversions);

    const result: AttributionReportDto = {
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      model,
      conversionWindow,
      totalConversions,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      byChannel,
    };

    // Cache result
    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  /**
   * Get customer journey mapping
   */
  async getJourneyMapping(query: JourneyQueryDto): Promise<JourneyMappingDto> {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const limit = query.limit || 100;

    // Build where clause
    const where: any = {
      timestamp: { gte: startDate, lte: endDate },
    };

    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.sessionId) {
      where.sessionId = query.sessionId;
    }

    // Get all events for the period
    const events = await this.prisma.analyticsEvent.findMany({
      where,
      orderBy: [{ sessionId: 'asc' }, { timestamp: 'asc' }],
      take: 10000, // Limit for performance
    });

    // Group events by session/user
    const journeyMap = new Map<string, any[]>();
    for (const event of events) {
      const key = event.userId || event.sessionId;
      if (!journeyMap.has(key)) {
        journeyMap.set(key, []);
      }
      journeyMap.get(key)!.push(event);
    }

    // Build journey objects
    const journeys: CustomerJourneyDto[] = [];
    let totalTouchpoints = 0;
    let totalDuration = 0;
    let convertedCount = 0;
    const pathCounts = new Map<string, { count: number; converted: number }>();

    for (const [key, userEvents] of journeyMap.entries()) {
      if (journeys.length >= limit) break;

      const touchpoints: TouchpointDto[] = userEvents.map((e) => ({
        timestamp: e.timestamp.toISOString(),
        channel: this.determineChannel(e),
        source: (e.metadata as any)?.utm?.utmSource,
        medium: (e.metadata as any)?.utm?.utmMedium,
        campaign: (e.metadata as any)?.utm?.utmCampaign,
        page: e.page,
        eventType: e.eventType,
      }));

      const startTime = userEvents[0].timestamp;
      const endTime = userEvents[userEvents.length - 1].timestamp;
      const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      const converted = userEvents.some((e) => e.eventType === MarketingEventType.PURCHASE);

      const journey: CustomerJourneyDto = {
        journeyId: `journey_${key}_${startTime.getTime()}`,
        userId: userEvents[0].userId,
        anonymousId: userEvents[0].sessionId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        converted,
        conversionValue: converted
          ? (userEvents.find((e) => e.eventType === MarketingEventType.PURCHASE)?.properties as any)?.orderValue
          : undefined,
        touchpointCount: touchpoints.length,
        durationSeconds,
        touchpoints,
      };

      journeys.push(journey);

      totalTouchpoints += touchpoints.length;
      totalDuration += durationSeconds;
      if (converted) convertedCount++;

      // Track path
      const pathKey = touchpoints.map((t) => t.channel).join(' > ');
      if (!pathCounts.has(pathKey)) {
        pathCounts.set(pathKey, { count: 0, converted: 0 });
      }
      pathCounts.get(pathKey)!.count++;
      if (converted) pathCounts.get(pathKey)!.converted++;
    }

    // Get top paths
    const topPaths = Array.from(pathCounts.entries())
      .map(([path, data]) => ({
        path: path.split(' > '),
        count: data.count,
        conversionRate: data.count > 0
          ? Math.round((data.converted / data.count) * 100 * 100) / 100
          : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const totalJourneys = journeyMap.size;

    return {
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      totalJourneys,
      convertedJourneys: convertedCount,
      conversionRate: totalJourneys > 0
        ? Math.round((convertedCount / totalJourneys) * 100 * 100) / 100
        : 0,
      avgTouchpoints: totalJourneys > 0
        ? Math.round((totalTouchpoints / totalJourneys) * 100) / 100
        : 0,
      avgDuration: totalJourneys > 0
        ? Math.round(totalDuration / totalJourneys)
        : 0,
      topPaths,
      journeys: journeys.slice(0, limit),
    };
  }

  /**
   * Get touchpoint analysis
   */
  async getTouchpointAnalysis(query: TouchpointQueryDto): Promise<TouchpointAnalysisDto> {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const groupBy = query.groupBy || 'channel';

    // Get all events
    const events = await this.prisma.analyticsEvent.findMany({
      where: {
        timestamp: { gte: startDate, lte: endDate },
      },
      orderBy: [{ sessionId: 'asc' }, { timestamp: 'asc' }],
    });

    // Group events by session
    const sessionEvents = new Map<string, any[]>();
    for (const event of events) {
      const sessionId = event.sessionId;
      if (!sessionEvents.has(sessionId)) {
        sessionEvents.set(sessionId, []);
      }
      sessionEvents.get(sessionId)!.push(event);
    }

    // Analyze touchpoints
    const groupData: Record<string, {
      touchpoints: number;
      users: Set<string>;
      conversions: number;
      positions: number[];
    }> = {};

    const positionData: {
      first: Record<string, number>;
      middle: Record<string, number>;
      last: Record<string, number>;
    } = { first: {}, middle: {}, last: {} };

    const pathTransitions = new Map<string, { count: number; totalTime: number }>();

    for (const [_, sessionEventList] of sessionEvents.entries()) {
      const hasConversion = sessionEventList.some(
        (e) => e.eventType === MarketingEventType.PURCHASE,
      );

      for (let i = 0; i < sessionEventList.length; i++) {
        const event = sessionEventList[i];
        const groupValue = this.getGroupValue(event, groupBy);

        if (!groupData[groupValue]) {
          groupData[groupValue] = {
            touchpoints: 0,
            users: new Set(),
            conversions: 0,
            positions: [],
          };
        }

        groupData[groupValue].touchpoints++;
        if (event.userId) {
          groupData[groupValue].users.add(event.userId);
        }
        groupData[groupValue].positions.push(i);

        if (hasConversion && i === sessionEventList.length - 2) {
          // Last touchpoint before conversion
          groupData[groupValue].conversions++;
        }

        // Track position
        if (i === 0) {
          positionData.first[groupValue] = (positionData.first[groupValue] || 0) + 1;
        } else if (i === sessionEventList.length - 1) {
          positionData.last[groupValue] = (positionData.last[groupValue] || 0) + 1;
        } else {
          positionData.middle[groupValue] = (positionData.middle[groupValue] || 0) + 1;
        }

        // Track transitions
        if (i < sessionEventList.length - 1) {
          const nextEvent = sessionEventList[i + 1];
          const fromChannel = this.getGroupValue(event, groupBy);
          const toChannel = this.getGroupValue(nextEvent, groupBy);
          const key = `${fromChannel}|${toChannel}`;
          const timeDiff = nextEvent.timestamp.getTime() - event.timestamp.getTime();

          if (!pathTransitions.has(key)) {
            pathTransitions.set(key, { count: 0, totalTime: 0 });
          }
          pathTransitions.get(key)!.count++;
          pathTransitions.get(key)!.totalTime += timeDiff;
        }
      }
    }

    // Format results
    const byGroup = Object.entries(groupData)
      .map(([name, data]) => ({
        name,
        touchpoints: data.touchpoints,
        uniqueUsers: data.users.size,
        conversions: data.conversions,
        conversionRate: data.touchpoints > 0
          ? Math.round((data.conversions / data.touchpoints) * 100 * 100) / 100
          : 0,
        avgPosition: data.positions.length > 0
          ? Math.round(
            (data.positions.reduce((a, b) => a + b, 0) / data.positions.length) * 100,
          ) / 100
          : 0,
      }))
      .sort((a, b) => b.touchpoints - a.touchpoints);

    const pathCombinations = Array.from(pathTransitions.entries())
      .map(([key, data]) => {
        const [from, to] = key.split('|');
        return {
          from,
          to,
          count: data.count,
          avgTimeSeconds: data.count > 0 ? Math.round(data.totalTime / data.count / 1000) : 0,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    return {
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      groupBy,
      totalTouchpoints: events.length,
      byGroup,
      byPosition: positionData,
      pathCombinations,
    };
  }

  // ==================== Helper Methods ====================

  /**
   * Get touchpoints for a conversion
   */
  private async getTouchpointsForConversion(
    userId: string,
    conversionTime: Date,
    windowDays: number,
  ): Promise<any[]> {
    const windowStart = new Date(conversionTime.getTime() - windowDays * 24 * 60 * 60 * 1000);

    return this.prisma.analyticsEvent.findMany({
      where: {
        OR: [{ userId }, { sessionId: userId }],
        timestamp: { gte: windowStart, lt: conversionTime },
        eventType: {
          notIn: [MarketingEventType.PURCHASE, MarketingEventType.CONVERSION],
        },
      },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Calculate credit distribution based on attribution model
   */
  private calculateCredits(
    touchpoints: any[],
    model: AttributionModel,
  ): Map<string, number> {
    const credits = new Map<string, number>();

    if (touchpoints.length === 0) return credits;

    switch (model) {
      case AttributionModel.FIRST_TOUCH:
        credits.set(touchpoints[0].id, 1);
        for (let i = 1; i < touchpoints.length; i++) {
          credits.set(touchpoints[i].id, 0);
        }
        break;

      case AttributionModel.LAST_TOUCH:
        for (let i = 0; i < touchpoints.length - 1; i++) {
          credits.set(touchpoints[i].id, 0);
        }
        credits.set(touchpoints[touchpoints.length - 1].id, 1);
        break;

      case AttributionModel.LINEAR:
        const equalShare = 1 / touchpoints.length;
        for (const tp of touchpoints) {
          credits.set(tp.id, equalShare);
        }
        break;

      case AttributionModel.TIME_DECAY:
        // Half-life of 7 days
        const halfLife = 7 * 24 * 60 * 60 * 1000;
        const conversionTime = touchpoints[touchpoints.length - 1].timestamp.getTime();
        let totalWeight = 0;
        const weights: number[] = [];

        for (const tp of touchpoints) {
          const timeDiff = conversionTime - tp.timestamp.getTime();
          const weight = Math.pow(0.5, timeDiff / halfLife);
          weights.push(weight);
          totalWeight += weight;
        }

        for (let i = 0; i < touchpoints.length; i++) {
          credits.set(touchpoints[i].id, weights[i] / totalWeight);
        }
        break;

      case AttributionModel.POSITION_BASED:
        if (touchpoints.length === 1) {
          credits.set(touchpoints[0].id, 1);
        } else if (touchpoints.length === 2) {
          credits.set(touchpoints[0].id, 0.5);
          credits.set(touchpoints[1].id, 0.5);
        } else {
          credits.set(touchpoints[0].id, 0.4);
          credits.set(touchpoints[touchpoints.length - 1].id, 0.4);
          const middleShare = 0.2 / (touchpoints.length - 2);
          for (let i = 1; i < touchpoints.length - 1; i++) {
            credits.set(touchpoints[i].id, middleShare);
          }
        }
        break;

      default:
        // Default to last touch
        for (let i = 0; i < touchpoints.length - 1; i++) {
          credits.set(touchpoints[i].id, 0);
        }
        credits.set(touchpoints[touchpoints.length - 1].id, 1);
    }

    return credits;
  }

  /**
   * Determine channel from event data
   */
  private determineChannel(event: any): string {
    const metadata = event.metadata as any;
    const utm = metadata?.utm;

    if (utm?.utmSource) {
      // Social
      if (['facebook', 'twitter', 'instagram', 'linkedin', 'tiktok'].includes(
        utm.utmSource.toLowerCase(),
      )) {
        return 'social';
      }

      // Email
      if (utm.utmMedium?.toLowerCase() === 'email' || utm.utmSource.toLowerCase() === 'email') {
        return 'email';
      }

      // Paid
      if (['cpc', 'ppc', 'paid', 'paidsocial'].includes(utm.utmMedium?.toLowerCase() || '')) {
        return 'paid';
      }
    }

    // Organic search
    if (event.referer) {
      const referer = event.referer.toLowerCase();
      if (referer.includes('google') || referer.includes('bing') || referer.includes('yahoo')) {
        return 'organic_search';
      }
      if (referer.includes('facebook') || referer.includes('twitter') || referer.includes('instagram')) {
        return 'social';
      }
      // Other referral
      return 'referral';
    }

    // Direct
    return 'direct';
  }

  /**
   * Get group value based on grouping dimension
   */
  private getGroupValue(event: any, groupBy: string): string {
    const metadata = event.metadata as any;
    const utm = metadata?.utm;

    switch (groupBy) {
      case 'source':
        return utm?.utmSource || 'unknown';
      case 'medium':
        return utm?.utmMedium || 'unknown';
      case 'campaign':
        return utm?.utmCampaign || 'none';
      case 'channel':
      default:
        return this.determineChannel(event);
    }
  }
}
