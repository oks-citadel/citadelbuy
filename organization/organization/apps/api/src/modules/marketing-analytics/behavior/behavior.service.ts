import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import {
  BehaviorQueryDto,
  HeatmapDataDto,
  ClickmapDataDto,
  ScrollmapDataDto,
  RecordingsQueryDto,
  RecordingsListDto,
  RecordingMetadataDto,
  BehaviorSummaryDto,
} from './dto/behavior.dto';
import { MarketingEventType } from '../constants/event-types';

@Injectable()
export class BehaviorService {
  private readonly logger = new Logger(BehaviorService.name);
  private readonly CACHE_PREFIX = 'analytics:behavior:';
  private readonly CACHE_TTL = 1800; // 30 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Get heatmap data for a page
   */
  async getHeatmapData(query: BehaviorQueryDto): Promise<HeatmapDataDto> {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const pageUrl = query.pageUrl || '/';

    // Check cache
    const cacheKey = `${this.CACHE_PREFIX}heatmap:${pageUrl}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await this.redis.get<HeatmapDataDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get click events for this page
    const where: any = {
      eventType: { in: ['click', 'mouse_click', MarketingEventType.FEATURE_USED] },
      page: pageUrl,
      timestamp: { gte: startDate, lte: endDate },
    };

    const events = await this.prisma.analyticsEvent.findMany({
      where,
      select: {
        sessionId: true,
        properties: true,
      },
    });

    // Aggregate click positions
    const positionMap = new Map<string, number>();
    const uniqueSessions = new Set<string>();

    for (const event of events) {
      uniqueSessions.add(event.sessionId);

      const props = event.properties as any;
      if (props?.x !== undefined && props?.y !== undefined) {
        // Quantize to grid (10% buckets)
        const gridX = Math.floor(props.x / 10) * 10;
        const gridY = Math.floor(props.y / 10) * 10;
        const key = `${gridX},${gridY}`;

        positionMap.set(key, (positionMap.get(key) || 0) + 1);
      }
    }

    // Convert to heatmap points
    const data = Array.from(positionMap.entries()).map(([key, value]) => {
      const [x, y] = key.split(',').map(Number);
      return { x, y, value };
    });

    const result: HeatmapDataDto = {
      pageUrl,
      type: 'click',
      totalInteractions: events.length,
      uniqueSessions: uniqueSessions.size,
      data,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };

    // Cache result
    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  /**
   * Get clickmap data for a page
   */
  async getClickmapData(query: BehaviorQueryDto): Promise<ClickmapDataDto> {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const pageUrl = query.pageUrl || '/';

    // Check cache
    const cacheKey = `${this.CACHE_PREFIX}clickmap:${pageUrl}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await this.redis.get<ClickmapDataDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get page views and click events
    const [pageViews, clickEvents] = await Promise.all([
      this.prisma.analyticsEvent.count({
        where: {
          eventType: MarketingEventType.PAGE_VIEW,
          page: pageUrl,
          timestamp: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.analyticsEvent.findMany({
        where: {
          eventType: { in: ['click', 'mouse_click', MarketingEventType.FEATURE_USED] },
          page: pageUrl,
          timestamp: { gte: startDate, lte: endDate },
        },
        select: {
          sessionId: true,
          properties: true,
        },
      }),
    ]);

    // Aggregate clicks by element
    const elementMap = new Map<string, { clicks: number; sessions: Set<string> }>();
    const zoneClicks = { top: 0, middle: 0, bottom: 0 };

    for (const event of clickEvents) {
      const props = event.properties as any;
      const element = props?.element || props?.target || 'unknown';
      const yPosition = props?.y || 50;

      if (!elementMap.has(element)) {
        elementMap.set(element, { clicks: 0, sessions: new Set() });
      }
      elementMap.get(element)!.clicks++;
      elementMap.get(element)!.sessions.add(event.sessionId);

      // Zone analysis
      if (yPosition < 33) {
        zoneClicks.top++;
      } else if (yPosition < 66) {
        zoneClicks.middle++;
      } else {
        zoneClicks.bottom++;
      }
    }

    // Format elements
    const totalClicks = clickEvents.length;
    const elements = Array.from(elementMap.entries())
      .map(([element, data]) => ({
        element,
        text: undefined,
        clicks: data.clicks,
        uniqueClickers: data.sessions.size,
        clickRate: pageViews > 0 ? Math.round((data.clicks / pageViews) * 100 * 100) / 100 : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 50);

    const result: ClickmapDataDto = {
      pageUrl,
      totalPageViews: pageViews,
      totalClicks,
      clicksPerVisit: pageViews > 0 ? Math.round((totalClicks / pageViews) * 100) / 100 : 0,
      elements,
      densityZones: [
        { zone: 'top', percentage: totalClicks > 0 ? Math.round((zoneClicks.top / totalClicks) * 100) : 0 },
        { zone: 'middle', percentage: totalClicks > 0 ? Math.round((zoneClicks.middle / totalClicks) * 100) : 0 },
        { zone: 'bottom', percentage: totalClicks > 0 ? Math.round((zoneClicks.bottom / totalClicks) * 100) : 0 },
      ],
    };

    // Cache result
    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  /**
   * Get scroll depth data for a page
   */
  async getScrollmapData(query: BehaviorQueryDto): Promise<ScrollmapDataDto> {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const pageUrl = query.pageUrl || '/';

    // Check cache
    const cacheKey = `${this.CACHE_PREFIX}scrollmap:${pageUrl}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await this.redis.get<ScrollmapDataDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get page leave events with scroll depth
    const pageEvents = await this.prisma.analyticsEvent.findMany({
      where: {
        eventType: { in: [MarketingEventType.PAGE_VIEW, 'page_leave'] },
        page: pageUrl,
        timestamp: { gte: startDate, lte: endDate },
      },
      select: {
        eventType: true,
        sessionId: true,
        properties: true,
        timestamp: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    // Group by session to calculate scroll depth and time on page
    const sessionData = new Map<string, {
      pageViewTime?: Date;
      leaveTime?: Date;
      scrollDepth: number;
    }>();

    for (const event of pageEvents) {
      if (!sessionData.has(event.sessionId)) {
        sessionData.set(event.sessionId, { scrollDepth: 0 });
      }

      const data = sessionData.get(event.sessionId)!;
      if (event.eventType === MarketingEventType.PAGE_VIEW) {
        data.pageViewTime = event.timestamp;
      } else if (event.eventType === 'page_leave') {
        data.leaveTime = event.timestamp;
        data.scrollDepth = (event.properties as any)?.scrollDepth || 0;
      }
    }

    // Calculate metrics
    let totalScrollDepth = 0;
    let totalTimeOnPage = 0;
    let validSessions = 0;
    const depthBuckets = { 0: 0, 25: 0, 50: 0, 75: 0, 100: 0 };
    let aboveFoldTime = 0;
    let belowFoldTime = 0;

    for (const data of sessionData.values()) {
      if (data.pageViewTime && data.leaveTime) {
        const timeOnPage = (data.leaveTime.getTime() - data.pageViewTime.getTime()) / 1000;
        totalTimeOnPage += timeOnPage;
        validSessions++;

        // Estimate time above/below fold based on scroll depth
        if (data.scrollDepth < 50) {
          aboveFoldTime += timeOnPage;
        } else {
          aboveFoldTime += timeOnPage * 0.5;
          belowFoldTime += timeOnPage * 0.5;
        }
      }

      totalScrollDepth += data.scrollDepth;

      // Bucket scroll depth
      if (data.scrollDepth >= 0) depthBuckets[0]++;
      if (data.scrollDepth >= 25) depthBuckets[25]++;
      if (data.scrollDepth >= 50) depthBuckets[50]++;
      if (data.scrollDepth >= 75) depthBuckets[75]++;
      if (data.scrollDepth >= 100) depthBuckets[100]++;
    }

    const totalUsers = sessionData.size;
    const avgScrollDepth = totalUsers > 0 ? totalScrollDepth / totalUsers : 0;
    const avgTimeOnPage = validSessions > 0 ? totalTimeOnPage / validSessions : 0;

    const result: ScrollmapDataDto = {
      pageUrl,
      totalPageViews: totalUsers,
      avgScrollDepth: Math.round(avgScrollDepth),
      avgTimeOnPage: Math.round(avgTimeOnPage),
      depthDistribution: [
        { depth: 0, users: depthBuckets[0], percentage: totalUsers > 0 ? Math.round((depthBuckets[0] / totalUsers) * 100) : 0 },
        { depth: 25, users: depthBuckets[25], percentage: totalUsers > 0 ? Math.round((depthBuckets[25] / totalUsers) * 100) : 0 },
        { depth: 50, users: depthBuckets[50], percentage: totalUsers > 0 ? Math.round((depthBuckets[50] / totalUsers) * 100) : 0 },
        { depth: 75, users: depthBuckets[75], percentage: totalUsers > 0 ? Math.round((depthBuckets[75] / totalUsers) * 100) : 0 },
        { depth: 100, users: depthBuckets[100], percentage: totalUsers > 0 ? Math.round((depthBuckets[100] / totalUsers) * 100) : 0 },
      ],
      foldAnalysis: {
        aboveFoldTime: Math.round(aboveFoldTime / Math.max(validSessions, 1)),
        belowFoldTime: Math.round(belowFoldTime / Math.max(validSessions, 1)),
        foldPosition: 50, // Configurable in production
      },
    };

    // Cache result
    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  /**
   * Get session recordings metadata
   */
  async getRecordings(query: RecordingsQueryDto): Promise<RecordingsListDto> {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const page = query.page || 1;
    const limit = query.limit || 20;

    // Build where clause
    const where: any = {
      timestamp: { gte: startDate, lte: endDate },
    };

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.pageUrl) {
      where.page = query.pageUrl;
    }

    // Get events to build session recordings
    const events = await this.prisma.analyticsEvent.findMany({
      where,
      orderBy: [{ sessionId: 'asc' }, { timestamp: 'asc' }],
    });

    // Group by session
    const sessionMap = new Map<string, any[]>();
    for (const event of events) {
      if (!sessionMap.has(event.sessionId)) {
        sessionMap.set(event.sessionId, []);
      }
      sessionMap.get(event.sessionId)!.push(event);
    }

    // Build recording metadata
    let recordings: RecordingMetadataDto[] = [];

    for (const [sessionId, sessionEvents] of sessionMap.entries()) {
      const firstEvent = sessionEvents[0];
      const lastEvent = sessionEvents[sessionEvents.length - 1];
      const durationSeconds = Math.round(
        (lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()) / 1000,
      );

      // Apply duration filters
      if (query.minDuration && durationSeconds < query.minDuration) {
        continue;
      }
      if (query.maxDuration && durationSeconds > query.maxDuration) {
        continue;
      }

      const hasConversion = sessionEvents.some(
        (e) => e.eventType === MarketingEventType.PURCHASE,
      );

      if (query.convertedOnly && !hasConversion) {
        continue;
      }

      const uniquePages = new Set(sessionEvents.map((e) => e.page).filter(Boolean));

      const hasErrors = sessionEvents.some(
        (e) => e.eventType === MarketingEventType.ERROR_OCCURRED,
      );

      if (query.hasErrors !== undefined && hasErrors !== query.hasErrors) {
        continue;
      }

      recordings.push({
        id: `rec_${sessionId}`,
        sessionId,
        userId: firstEvent.userId || undefined,
        startTime: firstEvent.timestamp.toISOString(),
        endTime: lastEvent.timestamp.toISOString(),
        durationSeconds,
        pagesVisited: uniquePages.size,
        eventCount: sessionEvents.length,
        deviceType: this.parseDeviceType(firstEvent.userAgent),
        browser: this.parseBrowser(firstEvent.userAgent),
        os: this.parseOS(firstEvent.userAgent),
        country: 'Unknown',
        entryPage: firstEvent.page || '/',
        exitPage: lastEvent.page || '/',
        converted: hasConversion,
        tags: hasErrors ? ['error'] : [],
        notes: undefined,
      });
    }

    // Sort by start time descending
    recordings.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    // Pagination
    const total = recordings.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    recordings = recordings.slice(startIndex, startIndex + limit);

    return {
      recordings,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get behavior summary
   */
  async getBehaviorSummary(query: BehaviorQueryDto): Promise<BehaviorSummaryDto> {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Check cache
    const cacheKey = `${this.CACHE_PREFIX}summary:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await this.redis.get<BehaviorSummaryDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all page view events
    const pageViews = await this.prisma.analyticsEvent.findMany({
      where: {
        eventType: MarketingEventType.PAGE_VIEW,
        timestamp: { gte: startDate, lte: endDate },
      },
      select: {
        page: true,
        sessionId: true,
        userId: true,
        timestamp: true,
        properties: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    // Group by page for top pages
    const pageData = new Map<string, {
      views: number;
      visitors: Set<string>;
      totalTime: number;
      bounces: number;
    }>();

    // Group by session for entry/exit analysis
    const sessionData = new Map<string, { pages: Array<{ url: string; time: Date }> }>();

    for (const pv of pageViews) {
      const page = pv.page || '/';

      if (!pageData.has(page)) {
        pageData.set(page, { views: 0, visitors: new Set(), totalTime: 0, bounces: 0 });
      }
      pageData.get(page)!.views++;
      pageData.get(page)!.visitors.add(pv.userId || pv.sessionId);

      // Track session pages
      if (!sessionData.has(pv.sessionId)) {
        sessionData.set(pv.sessionId, { pages: [] });
      }
      sessionData.get(pv.sessionId)!.pages.push({ url: page, time: pv.timestamp });
    }

    // Calculate entry/exit pages and bounces
    const entryPages: Record<string, { entries: number; bounces: number }> = {};
    const exitPages: Record<string, { exits: number; totalExits: number }> = {};

    for (const data of sessionData.values()) {
      if (data.pages.length === 0) continue;

      const entryPage = data.pages[0].url;
      const exitPage = data.pages[data.pages.length - 1].url;
      const isBounce = data.pages.length === 1;

      if (!entryPages[entryPage]) {
        entryPages[entryPage] = { entries: 0, bounces: 0 };
      }
      entryPages[entryPage].entries++;
      if (isBounce) {
        entryPages[entryPage].bounces++;
        if (pageData.has(entryPage)) {
          pageData.get(entryPage)!.bounces++;
        }
      }

      if (!exitPages[exitPage]) {
        exitPages[exitPage] = { exits: 0, totalExits: 0 };
      }
      exitPages[exitPage].exits++;
    }

    // Format top pages
    const topPages = Array.from(pageData.entries())
      .map(([url, data]) => ({
        url,
        views: data.views,
        uniqueVisitors: data.visitors.size,
        avgTimeOnPage: 0, // Would need page leave events to calculate
        bounceRate: data.views > 0 ? Math.round((data.bounces / data.views) * 100 * 100) / 100 : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Format entry pages
    const topEntryPages = Object.entries(entryPages)
      .map(([url, data]) => ({
        url,
        entries: data.entries,
        bounceRate: data.entries > 0 ? Math.round((data.bounces / data.entries) * 100 * 100) / 100 : 0,
      }))
      .sort((a, b) => b.entries - a.entries)
      .slice(0, 10);

    // Format exit pages
    const totalSessions = sessionData.size;
    const topExitPages = Object.entries(exitPages)
      .map(([url, data]) => ({
        url,
        exits: data.exits,
        exitRate: totalSessions > 0 ? Math.round((data.exits / totalSessions) * 100 * 100) / 100 : 0,
      }))
      .sort((a, b) => b.exits - a.exits)
      .slice(0, 10);

    const result: BehaviorSummaryDto = {
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      topPages,
      topEntryPages,
      topExitPages,
      avgScrollDepth: 50, // Would need actual scroll data
      avgTimeOnPage: 0, // Would need page leave events
      totalRecordings: sessionData.size,
    };

    // Cache result
    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  // ==================== Helper Methods ====================

  private parseDeviceType(userAgent?: string | null): string {
    if (!userAgent) return 'unknown';
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile';
    if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
    return 'desktop';
  }

  private parseBrowser(userAgent?: string | null): string {
    if (!userAgent) return 'Unknown';
    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('edg')) return 'Edge';
    return 'Other';
  }

  private parseOS(userAgent?: string | null): string {
    if (!userAgent) return 'Unknown';
    const ua = userAgent.toLowerCase();
    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('mac os')) return 'macOS';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
    return 'Other';
  }
}
