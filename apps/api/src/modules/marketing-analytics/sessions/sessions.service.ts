import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import {
  SessionQueryDto,
  SessionDetailDto,
  SessionMetricsDto,
  SessionsListResponseDto,
  SessionEventsResponseDto,
  SessionEventDto,
} from './dto/session.dto';
import { MarketingEventType } from '../constants/event-types';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private readonly CACHE_PREFIX = 'analytics:sessions:';
  private readonly CACHE_TTL = 1800; // 30 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Get session metrics
   */
  async getSessionMetrics(query: SessionQueryDto): Promise<SessionMetricsDto> {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Check cache
    const cacheKey = `${this.CACHE_PREFIX}metrics:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await this.redis.get<SessionMetricsDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all events for the period
    const events = await this.prisma.analyticsEvent.findMany({
      where: {
        timestamp: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        sessionId: true,
        userId: true,
        eventType: true,
        timestamp: true,
        page: true,
        userAgent: true,
        ipAddress: true,
        properties: true,
        metadata: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    // Group events by session
    const sessionMap = new Map<string, any[]>();
    for (const event of events) {
      if (!sessionMap.has(event.sessionId)) {
        sessionMap.set(event.sessionId, []);
      }
      sessionMap.get(event.sessionId)!.push(event);
    }

    // Calculate metrics
    let totalSessions = 0;
    let totalPageViews = 0;
    let totalDuration = 0;
    let bounceCount = 0;
    let convertedCount = 0;
    const uniqueUsers = new Set<string>();
    const newUsers = new Set<string>();
    const byDeviceType: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    const dailyData: Record<string, {
      sessions: number;
      pageViews: number;
      totalDuration: number;
      bounces: number;
    }> = {};
    const hourlyData: Record<number, number> = {};

    // Check for returning users (users who had sessions before startDate)
    const userIdsInPeriod = new Set<string>();
    for (const [_, sessionEvents] of sessionMap.entries()) {
      const userId = sessionEvents[0]?.userId;
      if (userId) {
        userIdsInPeriod.add(userId);
      }
    }

    const returningUserIds = new Set<string>();
    if (userIdsInPeriod.size > 0) {
      const previousSessions = await this.prisma.analyticsEvent.findMany({
        where: {
          userId: { in: Array.from(userIdsInPeriod) },
          timestamp: { lt: startDate },
        },
        select: { userId: true },
        distinct: ['userId'],
      });
      for (const session of previousSessions) {
        if (session.userId) {
          returningUserIds.add(session.userId);
        }
      }
    }

    for (const [sessionId, sessionEvents] of sessionMap.entries()) {
      totalSessions++;

      const firstEvent = sessionEvents[0];
      const lastEvent = sessionEvents[sessionEvents.length - 1];
      const sessionDuration = lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime();

      totalDuration += sessionDuration;

      // Page views in session
      const pageViewCount = sessionEvents.filter(
        (e) => e.eventType === MarketingEventType.PAGE_VIEW,
      ).length;
      totalPageViews += pageViewCount;

      // Bounce check
      if (pageViewCount <= 1) {
        bounceCount++;
      }

      // Conversion check
      const hasConversion = sessionEvents.some(
        (e) => e.eventType === MarketingEventType.PURCHASE ||
          e.eventType === MarketingEventType.CONVERSION,
      );
      if (hasConversion) {
        convertedCount++;
      }

      // User tracking
      if (firstEvent.userId) {
        uniqueUsers.add(firstEvent.userId);
        if (!returningUserIds.has(firstEvent.userId)) {
          newUsers.add(firstEvent.userId);
        }
      }

      // Device type
      const deviceType = this.parseDeviceType(firstEvent.userAgent);
      byDeviceType[deviceType] = (byDeviceType[deviceType] || 0) + 1;

      // Source
      const source = this.parseSource(firstEvent.metadata);
      bySource[source] = (bySource[source] || 0) + 1;

      // Country (simplified - would use IP geolocation in production)
      const country = 'Unknown';
      byCountry[country] = (byCountry[country] || 0) + 1;

      // Daily trend
      const dateKey = firstEvent.timestamp.toISOString().split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { sessions: 0, pageViews: 0, totalDuration: 0, bounces: 0 };
      }
      dailyData[dateKey].sessions++;
      dailyData[dateKey].pageViews += pageViewCount;
      dailyData[dateKey].totalDuration += sessionDuration;
      if (pageViewCount <= 1) {
        dailyData[dateKey].bounces++;
      }

      // Hourly distribution
      const hour = firstEvent.timestamp.getHours();
      hourlyData[hour] = (hourlyData[hour] || 0) + 1;
    }

    // Calculate averages
    const avgPagesPerSession = totalSessions > 0 ? totalPageViews / totalSessions : 0;
    const avgSessionDuration = totalSessions > 0 ? totalDuration / totalSessions / 1000 : 0;
    const bounceRate = totalSessions > 0 ? (bounceCount / totalSessions) * 100 : 0;
    const conversionRate = totalSessions > 0 ? (convertedCount / totalSessions) * 100 : 0;

    // Format daily trend
    const dailyTrend = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        sessions: data.sessions,
        pageViews: data.pageViews,
        avgDuration: data.sessions > 0 ? Math.round(data.totalDuration / data.sessions / 1000) : 0,
        bounceRate: data.sessions > 0 ? Math.round((data.bounces / data.sessions) * 100 * 100) / 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const result: SessionMetricsDto = {
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      totalSessions,
      uniqueUsers: uniqueUsers.size,
      newSessions: newUsers.size,
      returningSessions: uniqueUsers.size - newUsers.size,
      totalPageViews,
      avgPagesPerSession: Math.round(avgPagesPerSession * 100) / 100,
      avgSessionDuration: Math.round(avgSessionDuration),
      bounceRate: Math.round(bounceRate * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      byDeviceType,
      bySource,
      byCountry,
      dailyTrend,
      hourlyDistribution: hourlyData,
    };

    // Cache result
    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  /**
   * List sessions
   */
  async listSessions(query: SessionQueryDto): Promise<SessionsListResponseDto> {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const page = query.page || 1;
    const limit = query.limit || 50;

    // Get all events for the period
    const where: any = {
      timestamp: { gte: startDate, lte: endDate },
    };

    if (query.userId) {
      where.userId = query.userId;
    }

    const events = await this.prisma.analyticsEvent.findMany({
      where,
      select: {
        sessionId: true,
        userId: true,
        eventType: true,
        timestamp: true,
        page: true,
        userAgent: true,
        metadata: true,
        properties: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    // Group by session
    const sessionMap = new Map<string, any[]>();
    for (const event of events) {
      if (!sessionMap.has(event.sessionId)) {
        sessionMap.set(event.sessionId, []);
      }
      sessionMap.get(event.sessionId)!.push(event);
    }

    // Build session details
    let sessions: SessionDetailDto[] = [];

    for (const [sessionId, sessionEvents] of sessionMap.entries()) {
      const firstEvent = sessionEvents[0];
      const lastEvent = sessionEvents[sessionEvents.length - 1];

      const pageViews = sessionEvents.filter(
        (e) => e.eventType === MarketingEventType.PAGE_VIEW,
      ).length;

      const hasConversion = sessionEvents.some(
        (e) => e.eventType === MarketingEventType.PURCHASE,
      );

      // Apply filters
      if (query.convertedOnly && !hasConversion) {
        continue;
      }

      const deviceType = this.parseDeviceType(firstEvent.userAgent);
      if (query.deviceType && deviceType !== query.deviceType) {
        continue;
      }

      const source = this.parseSource(firstEvent.metadata);
      if (query.source && source !== query.source) {
        continue;
      }

      const conversionEvent = sessionEvents.find(
        (e) => e.eventType === MarketingEventType.PURCHASE,
      );

      sessions.push({
        sessionId,
        userId: firstEvent.userId,
        startTime: firstEvent.timestamp.toISOString(),
        endTime: lastEvent.timestamp.toISOString(),
        durationSeconds: Math.round(
          (lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()) / 1000,
        ),
        eventCount: sessionEvents.length,
        pageViews,
        converted: hasConversion,
        conversionValue: conversionEvent
          ? (conversionEvent.properties as any)?.orderValue
          : undefined,
        source,
        medium: (firstEvent.metadata as any)?.utm?.utmMedium,
        campaign: (firstEvent.metadata as any)?.utm?.utmCampaign,
        deviceType,
        browser: this.parseBrowser(firstEvent.userAgent),
        os: this.parseOS(firstEvent.userAgent),
        country: 'Unknown',
        landingPage: firstEvent.page || '/',
        exitPage: lastEvent.page || '/',
        isBounce: pageViews <= 1,
      });
    }

    // Sort by start time descending
    sessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    // Pagination
    const total = sessions.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    sessions = sessions.slice(startIndex, startIndex + limit);

    return {
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionDetailDto> {
    const events = await this.prisma.analyticsEvent.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
    });

    if (events.length === 0) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];

    const pageViews = events.filter(
      (e) => e.eventType === MarketingEventType.PAGE_VIEW,
    ).length;

    const hasConversion = events.some(
      (e) => e.eventType === MarketingEventType.PURCHASE,
    );

    const conversionEvent = events.find(
      (e) => e.eventType === MarketingEventType.PURCHASE,
    );

    return {
      sessionId,
      userId: firstEvent.userId || undefined,
      startTime: firstEvent.timestamp.toISOString(),
      endTime: lastEvent.timestamp.toISOString(),
      durationSeconds: Math.round(
        (lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()) / 1000,
      ),
      eventCount: events.length,
      pageViews,
      converted: hasConversion,
      conversionValue: conversionEvent
        ? (conversionEvent.properties as any)?.orderValue
        : undefined,
      source: this.parseSource(firstEvent.metadata),
      medium: (firstEvent.metadata as any)?.utm?.utmMedium,
      campaign: (firstEvent.metadata as any)?.utm?.utmCampaign,
      deviceType: this.parseDeviceType(firstEvent.userAgent),
      browser: this.parseBrowser(firstEvent.userAgent),
      os: this.parseOS(firstEvent.userAgent),
      country: 'Unknown',
      landingPage: firstEvent.page || '/',
      exitPage: lastEvent.page || '/',
      isBounce: pageViews <= 1,
    };
  }

  /**
   * Get events for a session
   */
  async getSessionEvents(sessionId: string): Promise<SessionEventsResponseDto> {
    const events = await this.prisma.analyticsEvent.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
    });

    if (events.length === 0) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const sessionEvents: SessionEventDto[] = events.map((e) => ({
      eventId: e.id,
      eventType: e.eventType,
      timestamp: e.timestamp.toISOString(),
      page: e.page || undefined,
      properties: e.properties as Record<string, any>,
    }));

    return {
      sessionId,
      totalEvents: events.length,
      events: sessionEvents,
    };
  }

  // ==================== Helper Methods ====================

  /**
   * Parse device type from user agent
   */
  private parseDeviceType(userAgent?: string | null): string {
    if (!userAgent) return 'unknown';

    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }
    return 'desktop';
  }

  /**
   * Parse browser from user agent
   */
  private parseBrowser(userAgent?: string | null): string {
    if (!userAgent) return 'Unknown';

    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('edg')) return 'Edge';
    if (ua.includes('opera') || ua.includes('opr')) return 'Opera';
    return 'Other';
  }

  /**
   * Parse OS from user agent
   */
  private parseOS(userAgent?: string | null): string {
    if (!userAgent) return 'Unknown';

    const ua = userAgent.toLowerCase();
    if (ua.includes('windows')) return 'Windows';
    // Check for iOS devices before macOS since iOS user agents contain "Mac OS X"
    if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
    if (ua.includes('mac os')) return 'macOS';
    if (ua.includes('linux') && !ua.includes('android')) return 'Linux';
    if (ua.includes('android')) return 'Android';
    return 'Other';
  }

  /**
   * Parse traffic source from metadata
   */
  private parseSource(metadata: any): string {
    const utm = metadata?.utm;
    if (utm?.utmSource) {
      return utm.utmSource;
    }
    return 'direct';
  }
}
