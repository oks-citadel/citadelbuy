import {
  Processor,
  Process,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { MARKETING_ANALYTICS_QUEUE, AnalyticsJobType, EventsService } from './events.service';
import { IngestEventDto } from './dto/event.dto';
import { EVENT_CATEGORY_MAP, MarketingEventType } from '../constants/event-types';

/**
 * Marketing Analytics Queue Processor
 *
 * Handles async processing of analytics events including:
 * - Storing events in PostgreSQL
 * - Updating real-time aggregates in Redis
 * - Triggering downstream event handlers
 */
@Processor(MARKETING_ANALYTICS_QUEUE)
@Injectable()
export class EventsProcessor {
  private readonly logger = new Logger(EventsProcessor.name);

  // Redis keys for real-time aggregates
  private readonly REALTIME_USERS_KEY = 'analytics:realtime:users';
  private readonly REALTIME_EVENTS_KEY = 'analytics:realtime:events';
  private readonly EVENT_COUNTS_KEY = 'analytics:counts:';
  private readonly USER_ACTIVITY_TTL = 300; // 5 minutes for "active" users

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eventsService: EventsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Process single event
   */
  @Process({ name: AnalyticsJobType.PROCESS_EVENT, concurrency: 10 })
  async processEvent(job: Job<IngestEventDto>) {
    const event = job.data;
    this.logger.debug(`Processing event ${event.eventId} of type ${event.eventType}`);

    try {
      // 1. Store event in database
      await this.eventsService.storeEvent(event);

      // 2. Update real-time aggregates
      await this.updateRealtimeAggregates(event);

      // 3. Emit event for other systems
      this.eventEmitter.emit(`analytics.${event.eventType}`, event);

      // 4. Update session data if applicable
      if (event.sessionId) {
        await this.updateSessionData(event);
      }

      // 5. Update user profile data if applicable
      if (event.userId) {
        await this.updateUserData(event);
      }

      return { success: true, eventId: event.eventId };
    } catch (error) {
      this.logger.error(`Failed to process event ${event.eventId}:`, error);
      throw error;
    }
  }

  /**
   * Process aggregate calculation job
   */
  @Process({ name: AnalyticsJobType.AGGREGATE_EVENTS, concurrency: 2 })
  async processAggregation(job: Job<{ period: string; date: Date }>) {
    const { period, date } = job.data;
    this.logger.log(`Processing aggregation for ${period} on ${date}`);

    try {
      const startDate = new Date(date);
      const endDate = new Date(date);

      switch (period) {
        case 'HOURLY':
          startDate.setMinutes(0, 0, 0);
          endDate.setMinutes(59, 59, 999);
          break;
        case 'DAILY':
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'WEEKLY': {
          const day = startDate.getDay();
          startDate.setDate(startDate.getDate() - day);
          startDate.setHours(0, 0, 0, 0);
          endDate.setDate(startDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
          break;
        }
      }

      // Calculate event counts
      const eventCounts = await this.eventsService.getEventCounts(startDate, endDate);

      // Calculate unique users
      const uniqueUsers = await this.eventsService.getUniqueUsers(startDate, endDate);

      // Calculate unique sessions
      const uniqueSessions = await this.eventsService.getUniqueSessions(startDate, endDate);

      // Store aggregates (using TrafficAnalytics model)
      await this.prisma.trafficAnalytics.upsert({
        where: {
          period_date: {
            date: startDate,
            period: period as any,
          },
        },
        create: {
          date: startDate,
          period: period as any,
          totalPageViews: eventCounts[MarketingEventType.PAGE_VIEW] || 0,
          uniqueVisitors: uniqueUsers,
          totalVisitors: uniqueSessions,
          newVisitors: 0, // Calculated separately
          returningVisitors: 0,
          bounceRate: 0,
          avgSessionDuration: 0,
          avgPagesPerVisit: 0,
          desktopVisitors: 0,
          mobileVisitors: 0,
          tabletVisitors: 0,
          directTraffic: 0,
          searchTraffic: 0,
          socialTraffic: 0,
          referralTraffic: 0,
          adTraffic: 0,
        },
        update: {
          totalPageViews: eventCounts[MarketingEventType.PAGE_VIEW] || 0,
          uniqueVisitors: uniqueUsers,
          totalVisitors: uniqueSessions,
        },
      });

      return { success: true, period, date };
    } catch (error) {
      this.logger.error(`Failed to process aggregation:`, error);
      throw error;
    }
  }

  /**
   * Update real-time aggregates in Redis
   */
  private async updateRealtimeAggregates(event: IngestEventDto): Promise<void> {
    const now = Date.now();
    const hourKey = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH

    // Track active user
    if (event.userId || event.anonymousId) {
      const userKey = event.userId || event.anonymousId;
      await this.redis.zadd(this.REALTIME_USERS_KEY, now, userKey!);

      // Clean up old entries (older than 5 minutes)
      const cutoff = now - this.USER_ACTIVITY_TTL * 1000;
      // Note: This would need a custom Redis command or script for ZREMRANGEBYSCORE
    }

    // Increment event type counter
    const counterKey = `${this.EVENT_COUNTS_KEY}${hourKey}:${event.eventType}`;
    await this.redis.incr(counterKey);
    await this.redis.expire(counterKey, 86400); // Keep for 24 hours

    // Add to recent events list
    const recentEventData = JSON.stringify({
      eventId: event.eventId,
      eventType: event.eventType,
      userId: event.userId,
      sessionId: event.sessionId,
      timestamp: event.timestamp,
    });
    await this.redis.lpush(this.REALTIME_EVENTS_KEY, recentEventData);
  }

  /**
   * Update session data for session analytics
   */
  private async updateSessionData(event: IngestEventDto): Promise<void> {
    const sessionKey = `analytics:session:${event.sessionId}`;
    const sessionData = await this.redis.get<{
      firstEventAt: string;
      lastEventAt: string;
      eventCount: number;
      pageViews: number;
      userId?: string;
    }>(sessionKey);

    const now = event.timestamp || new Date().toISOString();

    if (sessionData) {
      // Update existing session
      await this.redis.set(
        sessionKey,
        {
          ...sessionData,
          lastEventAt: now,
          eventCount: sessionData.eventCount + 1,
          pageViews:
            event.eventType === MarketingEventType.PAGE_VIEW
              ? sessionData.pageViews + 1
              : sessionData.pageViews,
          userId: event.userId || sessionData.userId,
        },
        86400, // 24 hour TTL
      );
    } else {
      // Create new session
      await this.redis.set(
        sessionKey,
        {
          firstEventAt: now,
          lastEventAt: now,
          eventCount: 1,
          pageViews: event.eventType === MarketingEventType.PAGE_VIEW ? 1 : 0,
          userId: event.userId,
        },
        86400,
      );
    }
  }

  /**
   * Update user-level data for analytics
   */
  private async updateUserData(event: IngestEventDto): Promise<void> {
    if (!event.userId) return;

    const userKey = `analytics:user:${event.userId}`;
    const userData = await this.redis.get<{
      firstSeenAt: string;
      lastSeenAt: string;
      totalEvents: number;
      sessions: string[];
    }>(userKey);

    const now = event.timestamp || new Date().toISOString();

    if (userData) {
      const sessions = userData.sessions.includes(event.sessionId)
        ? userData.sessions
        : [...userData.sessions.slice(-99), event.sessionId]; // Keep last 100 sessions

      await this.redis.set(
        userKey,
        {
          ...userData,
          lastSeenAt: now,
          totalEvents: userData.totalEvents + 1,
          sessions,
        },
        604800, // 7 day TTL
      );
    } else {
      await this.redis.set(
        userKey,
        {
          firstSeenAt: now,
          lastSeenAt: now,
          totalEvents: 1,
          sessions: [event.sessionId],
        },
        604800,
      );
    }
  }

  /**
   * Queue event handlers
   */
  @OnQueueActive()
  onActive(job: Job) {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.debug(`Completed job ${job.id} of type ${job.name}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Failed job ${job.id} of type ${job.name}:`, error.message);
  }
}
