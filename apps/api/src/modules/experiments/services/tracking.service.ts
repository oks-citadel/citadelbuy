import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import {
  TrackEventDto,
  BulkTrackEventDto,
  EventQueryDto,
  EventResponseDto,
  EventSummaryDto,
  TrackEventResponseDto,
} from '../dto/tracking.dto';

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);
  private readonly EVENT_BUFFER_KEY = 'experiment:events:buffer';
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    // Start background flush process
    this.startBackgroundFlush();
  }

  /**
   * Track a conversion event for an experiment
   */
  async trackEvent(
    experimentId: string,
    dto: TrackEventDto,
  ): Promise<TrackEventResponseDto> {
    const { userId, eventName, eventValue, metadata } = dto;

    // Get user's assignment for this experiment
    const assignment = await this.prisma.experimentAssignment.findUnique({
      where: {
        experimentId_userId: {
          experimentId,
          userId,
        },
      },
      include: {
        experiment: {
          select: { status: true, name: true },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        `User ${userId} is not assigned to experiment ${experimentId}`,
      );
    }

    if (assignment.experiment.status !== 'RUNNING') {
      throw new BadRequestException(
        `Cannot track events for experiment in ${assignment.experiment.status} status`,
      );
    }

    // Create event
    const event = await this.prisma.experimentEvent.create({
      data: {
        experimentId,
        variantId: assignment.variantId,
        userId,
        eventName,
        eventValue,
        metadata,
      },
    });

    // Update real-time counters in Redis
    await this.updateRealtimeCounters(experimentId, assignment.variantId, eventName);

    this.logger.debug(
      `Event tracked: ${eventName} for user ${userId} in experiment ${experimentId}`,
    );

    return {
      success: true,
      eventId: event.id,
      experimentId,
      variantId: assignment.variantId,
      message: `Event "${eventName}" tracked successfully`,
    };
  }

  /**
   * Track multiple events in batch
   */
  async trackBulkEvents(
    experimentId: string,
    dto: BulkTrackEventDto,
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const event of dto.events) {
      try {
        await this.trackEvent(experimentId, event);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`User ${event.userId}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Get events for an experiment
   */
  async getEvents(
    experimentId: string,
    query: EventQueryDto,
  ): Promise<{ data: EventResponseDto[]; meta: any }> {
    const { userId, eventName, variantId, startDate, endDate, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const where: any = { experimentId };

    if (userId) where.userId = userId;
    if (eventName) where.eventName = eventName;
    if (variantId) where.variantId = variantId;

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const [events, total] = await Promise.all([
      this.prisma.experimentEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.experimentEvent.count({ where }),
    ]);

    return {
      data: events.map(e => ({
        id: e.id,
        experimentId: e.experimentId,
        variantId: e.variantId,
        userId: e.userId,
        eventName: e.eventName,
        eventValue: e.eventValue ?? undefined,
        metadata: e.metadata as Record<string, any> | undefined,
        timestamp: e.timestamp,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get event summary for an experiment
   */
  async getEventSummary(experimentId: string): Promise<EventSummaryDto> {
    const experiment = await this.prisma.experiment.findUnique({
      where: { id: experimentId },
      include: {
        variants: {
          select: { id: true, name: true },
        },
      },
    });

    if (!experiment) {
      throw new NotFoundException(`Experiment ${experimentId} not found`);
    }

    // Get total events
    const totalEvents = await this.prisma.experimentEvent.count({
      where: { experimentId },
    });

    // Get unique users
    const uniqueUsers = await this.prisma.experimentEvent.groupBy({
      by: ['userId'],
      where: { experimentId },
    });

    // Get event counts by name
    const eventsByName = await this.prisma.experimentEvent.groupBy({
      by: ['eventName'],
      where: { experimentId },
      _count: true,
    });

    const eventCounts: Record<string, number> = {};
    eventsByName.forEach(e => {
      eventCounts[e.eventName] = e._count;
    });

    // Get event counts by variant
    const eventsByVariant = await this.prisma.experimentEvent.groupBy({
      by: ['variantId', 'eventName'],
      where: { experimentId },
      _count: true,
    });

    const uniqueUsersByVariant = await this.prisma.experimentEvent.groupBy({
      by: ['variantId', 'userId'],
      where: { experimentId },
    });

    const byVariant: Record<string, any> = {};
    experiment.variants.forEach((variant: any) => {
      const variantEvents = eventsByVariant.filter(e => e.variantId === variant.id);
      const variantUsers = uniqueUsersByVariant.filter(u => u.variantId === variant.id);

      const variantEventCounts: Record<string, number> = {};
      variantEvents.forEach(e => {
        variantEventCounts[e.eventName] = e._count;
      });

      byVariant[variant.id] = {
        variantName: variant.name,
        eventCounts: variantEventCounts,
        totalEvents: variantEvents.reduce((sum, e) => sum + e._count, 0),
        uniqueUsers: new Set(variantUsers.map(u => u.userId)).size,
      };
    });

    // Get date range
    const [firstEvent, lastEvent] = await Promise.all([
      this.prisma.experimentEvent.findFirst({
        where: { experimentId },
        orderBy: { timestamp: 'asc' },
        select: { timestamp: true },
      }),
      this.prisma.experimentEvent.findFirst({
        where: { experimentId },
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true },
      }),
    ]);

    return {
      experimentId,
      experimentName: experiment.name,
      totalEvents,
      uniqueUsers: uniqueUsers.length,
      eventCounts,
      byVariant,
      dateRange: {
        start: firstEvent?.timestamp ?? new Date(),
        end: lastEvent?.timestamp ?? new Date(),
      },
    };
  }

  /**
   * Update real-time counters in Redis
   */
  private async updateRealtimeCounters(
    experimentId: string,
    variantId: string,
    eventName: string,
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Increment counters
      await Promise.all([
        // Total events for experiment
        this.redis.incr(`experiment:${experimentId}:events:total`),
        // Events by variant
        this.redis.incr(`experiment:${experimentId}:variant:${variantId}:events`),
        // Events by name
        this.redis.incr(`experiment:${experimentId}:event:${eventName}`),
        // Daily counter
        this.redis.incr(`experiment:${experimentId}:events:${today}`),
      ]);
    } catch (error) {
      this.logger.warn(`Failed to update real-time counters: ${error.message}`);
    }
  }

  /**
   * Get real-time event counts from Redis
   */
  async getRealtimeCounts(experimentId: string): Promise<{
    total: number;
    today: number;
    byVariant: Record<string, number>;
    byEvent: Record<string, number>;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [total, todayCount] = await Promise.all([
        this.redis.get<number>(`experiment:${experimentId}:events:total`),
        this.redis.get<number>(`experiment:${experimentId}:events:${today}`),
      ]);

      // Get experiment variants
      const experiment = await this.prisma.experiment.findUnique({
        where: { id: experimentId },
        include: { variants: { select: { id: true } } },
      });

      const byVariant: Record<string, number> = {};
      if (experiment) {
        for (const variant of experiment.variants) {
          const count = await this.redis.get<number>(
            `experiment:${experimentId}:variant:${variant.id}:events`,
          );
          byVariant[variant.id] = count ?? 0;
        }
      }

      // Get common event types
      const byEvent: Record<string, number> = {};
      const commonEvents = ['view', 'click', 'conversion', 'purchase'];
      for (const event of commonEvents) {
        const count = await this.redis.get<number>(
          `experiment:${experimentId}:event:${event}`,
        );
        if (count) {
          byEvent[event] = count;
        }
      }

      return {
        total: total ?? 0,
        today: todayCount ?? 0,
        byVariant,
        byEvent,
      };
    } catch (error) {
      this.logger.warn(`Failed to get real-time counts: ${error.message}`);
      return {
        total: 0,
        today: 0,
        byVariant: {},
        byEvent: {},
      };
    }
  }

  /**
   * Start background flush process for buffered events
   */
  private startBackgroundFlush(): void {
    setInterval(async () => {
      try {
        await this.flushEventBuffer();
      } catch (error) {
        this.logger.error(`Error flushing event buffer: ${error.message}`);
      }
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Flush buffered events to database
   */
  private async flushEventBuffer(): Promise<void> {
    const events = await this.redis.lrange(this.EVENT_BUFFER_KEY, 0, this.BUFFER_SIZE - 1);

    if (events.length === 0) return;

    // Parse events
    const parsedEvents = events
      .map(e => {
        try {
          return JSON.parse(e);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (parsedEvents.length === 0) return;

    // Batch insert to database
    try {
      await this.prisma.experimentEvent.createMany({
        data: parsedEvents,
      });

      // Remove flushed events from buffer
      await this.redis.lrange(this.EVENT_BUFFER_KEY, events.length, -1);

      this.logger.debug(`Flushed ${parsedEvents.length} events to database`);
    } catch (error) {
      this.logger.error(`Failed to flush events: ${error.message}`);
    }
  }

  /**
   * Clean up old events (for maintenance)
   */
  async cleanupOldEvents(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.experimentEvent.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
        experiment: {
          status: { in: ['CONCLUDED', 'ARCHIVED'] },
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old events`);
    return result.count;
  }
}
