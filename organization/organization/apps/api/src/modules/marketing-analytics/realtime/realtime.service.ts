import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import {
  RealtimeUsersQueryDto,
  RealtimeEventsQueryDto,
  RealtimeUsersDto,
  RealtimeEventsDto,
  RealtimeMetricsDto,
  RealtimeEventDto,
  ActiveUserDto,
} from './dto/realtime.dto';
import { MarketingEventType } from '../constants/event-types';

@Injectable()
export class RealtimeService implements OnModuleInit {
  private readonly logger = new Logger(RealtimeService.name);

  // Redis keys
  private readonly ACTIVE_USERS_KEY = 'analytics:realtime:active_users';
  private readonly RECENT_EVENTS_KEY = 'analytics:realtime:recent_events';
  private readonly EVENT_COUNTS_KEY = 'analytics:realtime:event_counts';
  private readonly HOURLY_METRICS_KEY = 'analytics:realtime:hourly_metrics';

  // TTLs
  private readonly ACTIVE_USER_TTL = 300; // 5 minutes
  private readonly RECENT_EVENTS_LIMIT = 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    // Initialize metrics if not present
    await this.initializeMetrics();
  }

  /**
   * Get active users in real-time
   */
  async getActiveUsers(query: RealtimeUsersQueryDto): Promise<RealtimeUsersDto> {
    const windowMinutes = query.windowMinutes || 5;
    const windowMs = windowMinutes * 60 * 1000;
    const cutoffTime = Date.now() - windowMs;

    // Get active user data from Redis
    const activeUserData = await this.redis.get<Record<string, {
      lastActivity: number;
      currentPage: string;
      deviceType?: string;
      country?: string;
      source?: string;
      isAuthenticated: boolean;
    }>>(this.ACTIVE_USERS_KEY) || {};

    // Filter to active users within window
    const activeUsers: ActiveUserDto[] = [];
    const byPage: Record<string, number> = {};
    const byDeviceType: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let authenticatedCount = 0;
    let anonymousCount = 0;

    for (const [userId, userData] of Object.entries(activeUserData)) {
      if (userData.lastActivity >= cutoffTime) {
        activeUsers.push({
          userId,
          isAuthenticated: userData.isAuthenticated,
          lastActivity: new Date(userData.lastActivity).toISOString(),
          currentPage: userData.currentPage,
          deviceType: userData.deviceType,
          country: userData.country,
          source: userData.source,
        });

        // Aggregate by dimensions
        const page = userData.currentPage || '/';
        byPage[page] = (byPage[page] || 0) + 1;

        const device = userData.deviceType || 'unknown';
        byDeviceType[device] = (byDeviceType[device] || 0) + 1;

        const country = userData.country || 'Unknown';
        byCountry[country] = (byCountry[country] || 0) + 1;

        const source = userData.source || 'direct';
        bySource[source] = (bySource[source] || 0) + 1;

        if (userData.isAuthenticated) {
          authenticatedCount++;
        } else {
          anonymousCount++;
        }
      }
    }

    return {
      timestamp: new Date().toISOString(),
      windowMinutes,
      activeUsers: activeUsers.length,
      authenticatedUsers: authenticatedCount,
      anonymousUsers: anonymousCount,
      byPage,
      byDeviceType,
      byCountry,
      bySource,
      users: activeUsers.slice(0, 100), // Limit for response size
    };
  }

  /**
   * Get recent events stream
   */
  async getRecentEvents(query: RealtimeEventsQueryDto): Promise<RealtimeEventsDto> {
    const limit = query.limit || 100;

    // Get recent events from Redis
    const recentEvents = await this.redis.lrange(this.RECENT_EVENTS_KEY, 0, limit - 1);

    const events: RealtimeEventDto[] = [];
    const byType: Record<string, number> = {};

    for (const eventStr of recentEvents) {
      try {
        const event = JSON.parse(eventStr);

        // Apply filters
        if (query.eventType && event.eventType !== query.eventType) {
          continue;
        }
        if (query.userId && event.userId !== query.userId) {
          continue;
        }

        events.push({
          eventId: event.eventId,
          eventType: event.eventType,
          userId: event.userId,
          sessionId: event.sessionId,
          timestamp: event.timestamp,
          page: event.page,
          properties: event.properties,
        });

        byType[event.eventType] = (byType[event.eventType] || 0) + 1;
      } catch (e) {
        // Skip invalid entries
      }
    }

    // Calculate events per second (approximate)
    const oldestEvent = events[events.length - 1];
    const newestEvent = events[0];
    let eventsPerSecond = 0;

    if (oldestEvent && newestEvent && events.length > 1) {
      const timeSpanMs = new Date(newestEvent.timestamp).getTime() -
        new Date(oldestEvent.timestamp).getTime();
      if (timeSpanMs > 0) {
        eventsPerSecond = Math.round((events.length / timeSpanMs) * 1000 * 100) / 100;
      }
    }

    return {
      timestamp: new Date().toISOString(),
      totalEvents: events.length,
      events: events.slice(0, limit),
      eventsPerSecond,
      byType,
    };
  }

  /**
   * Get real-time metrics snapshot
   */
  async getMetricsSnapshot(): Promise<RealtimeMetricsDto> {
    // Get active users
    const activeUsersResult = await this.getActiveUsers({ windowMinutes: 5 });

    // Get recent events for calculations
    const recentEvents = await this.getRecentEvents({ limit: 1000 });

    // Get hourly metrics from Redis
    const hourlyMetrics = await this.redis.get<{
      conversions: number;
      revenue: number;
    }>(this.HOURLY_METRICS_KEY) || { conversions: 0, revenue: 0 };

    // Calculate page views per minute
    const oneMinuteAgo = Date.now() - 60000;
    const pageViewsLastMinute = recentEvents.events.filter(
      (e) => e.eventType === MarketingEventType.PAGE_VIEW &&
        new Date(e.timestamp).getTime() >= oneMinuteAgo,
    ).length;

    // Get top pages
    const topPages = Object.entries(activeUsersResult.byPage)
      .map(([page, activeUsers]) => ({ page, activeUsers }))
      .sort((a, b) => b.activeUsers - a.activeUsers)
      .slice(0, 5);

    // Get top events
    const topEvents = Object.entries(recentEvents.byType)
      .map(([eventType, count]) => ({ eventType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      timestamp: new Date().toISOString(),
      activeUsers: activeUsersResult.activeUsers,
      pageViewsPerMinute: pageViewsLastMinute,
      eventsPerSecond: recentEvents.eventsPerSecond,
      conversionsLastHour: hourlyMetrics.conversions,
      revenueLastHour: hourlyMetrics.revenue,
      topPages,
      topEvents,
    };
  }

  /**
   * Track user activity (called by event processor)
   */
  async trackUserActivity(
    userId: string,
    data: {
      currentPage: string;
      deviceType?: string;
      country?: string;
      source?: string;
      isAuthenticated: boolean;
    },
  ): Promise<void> {
    // Get current active users
    const activeUsers = await this.redis.get<Record<string, any>>(this.ACTIVE_USERS_KEY) || {};

    // Update user data
    activeUsers[userId] = {
      lastActivity: Date.now(),
      ...data,
    };

    // Clean up old entries
    const cutoff = Date.now() - this.ACTIVE_USER_TTL * 1000;
    for (const [uid, userData] of Object.entries(activeUsers)) {
      if ((userData as any).lastActivity < cutoff) {
        delete activeUsers[uid];
      }
    }

    // Save back to Redis
    await this.redis.set(this.ACTIVE_USERS_KEY, activeUsers, this.ACTIVE_USER_TTL);
  }

  /**
   * Add event to recent events stream
   */
  async addRecentEvent(event: RealtimeEventDto): Promise<void> {
    const eventStr = JSON.stringify(event);

    // Push to list (left)
    await this.redis.lpush(this.RECENT_EVENTS_KEY, eventStr);

    // Trim to limit (keep most recent)
    // Note: Using raw Redis command would be more efficient
  }

  /**
   * Track conversion for hourly metrics
   */
  async trackConversion(value: number): Promise<void> {
    const hourlyMetrics = await this.redis.get<{
      conversions: number;
      revenue: number;
      lastReset: number;
    }>(this.HOURLY_METRICS_KEY) || { conversions: 0, revenue: 0, lastReset: Date.now() };

    // Reset if more than an hour old
    if (Date.now() - hourlyMetrics.lastReset > 3600000) {
      hourlyMetrics.conversions = 0;
      hourlyMetrics.revenue = 0;
      hourlyMetrics.lastReset = Date.now();
    }

    hourlyMetrics.conversions++;
    hourlyMetrics.revenue += value;

    await this.redis.set(this.HOURLY_METRICS_KEY, hourlyMetrics, 3600);
  }

  /**
   * Initialize metrics on startup
   */
  private async initializeMetrics(): Promise<void> {
    // Initialize hourly metrics if not present
    const exists = await this.redis.exists(this.HOURLY_METRICS_KEY);
    if (!exists) {
      await this.redis.set(
        this.HOURLY_METRICS_KEY,
        { conversions: 0, revenue: 0, lastReset: Date.now() },
        3600,
      );
    }
  }
}
