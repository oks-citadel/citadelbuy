import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import {
  IngestEventDto,
  BatchIngestEventsDto,
  ValidateEventDto,
  EventQueryDto,
  BatchIngestResultDto,
  IngestResultDto,
  EventSchemaResponseDto,
} from './dto/event.dto';
import {
  MarketingEventType,
  EventCategory,
  EVENT_CATEGORY_MAP,
  EVENT_SCHEMAS,
  DEFAULT_SAMPLING_RATES,
} from '../constants/event-types';

export const MARKETING_ANALYTICS_QUEUE = 'marketing-analytics';

export enum AnalyticsJobType {
  PROCESS_EVENT = 'process-event',
  PROCESS_BATCH = 'process-batch',
  AGGREGATE_EVENTS = 'aggregate-events',
  EXPORT_TO_S3 = 'export-to-s3',
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly IDEMPOTENCY_KEY_PREFIX = 'analytics:event:';
  private readonly IDEMPOTENCY_TTL = 86400; // 24 hours
  private readonly SAMPLING_ENABLED: boolean;
  private readonly samplingRates: Record<string, number>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    @InjectQueue(MARKETING_ANALYTICS_QUEUE) private readonly analyticsQueue: Queue,
  ) {
    this.SAMPLING_ENABLED = this.config.get<boolean>('ANALYTICS_SAMPLING_ENABLED', false);
    this.samplingRates = { ...DEFAULT_SAMPLING_RATES };
  }

  /**
   * Ingest a single event
   */
  async ingestEvent(event: IngestEventDto): Promise<IngestResultDto> {
    try {
      // Check idempotency
      const isDuplicate = await this.checkIdempotency(event.eventId);
      if (isDuplicate) {
        return {
          success: true,
          eventId: event.eventId,
          duplicate: true,
        };
      }

      // Apply sampling for high-volume events
      if (this.SAMPLING_ENABLED && !this.shouldSample(event.eventType)) {
        return {
          success: true,
          eventId: event.eventId,
        };
      }

      // Validate event properties
      const validation = this.validateEventProperties(event.eventType, event.properties || {});
      if (!validation.valid) {
        throw new BadRequestException(`Invalid event properties: ${validation.errors.join(', ')}`);
      }

      // Enrich event with derived data
      const enrichedEvent = this.enrichEvent(event);

      // Queue for async processing
      await this.analyticsQueue.add(
        AnalyticsJobType.PROCESS_EVENT,
        enrichedEvent,
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 1000,
        },
      );

      // Mark event as processed for idempotency
      await this.markEventProcessed(event.eventId);

      return {
        success: true,
        eventId: event.eventId,
      };
    } catch (error) {
      this.logger.error(`Failed to ingest event ${event.eventId}:`, error);
      return {
        success: false,
        eventId: event.eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Batch ingest events (up to 1000)
   */
  async batchIngestEvents(batch: BatchIngestEventsDto): Promise<BatchIngestResultDto> {
    const result: BatchIngestResultDto = {
      total: batch.events.length,
      successful: 0,
      failed: 0,
      duplicates: 0,
      errors: [],
    };

    // Check all event IDs for duplicates first
    const eventIds = batch.events.map((e) => e.eventId);
    const duplicateCheck = await this.checkBulkIdempotency(eventIds);

    const eventsToProcess: IngestEventDto[] = [];

    for (const event of batch.events) {
      // Skip duplicates
      if (duplicateCheck.has(event.eventId)) {
        result.duplicates++;
        result.successful++;
        continue;
      }

      // Validate and apply sampling
      if (this.SAMPLING_ENABLED && !this.shouldSample(event.eventType)) {
        result.successful++;
        continue;
      }

      const validation = this.validateEventProperties(event.eventType, event.properties || {});
      if (!validation.valid) {
        result.failed++;
        result.errors.push({
          eventId: event.eventId,
          error: `Invalid properties: ${validation.errors.join(', ')}`,
        });
        if (!batch.continueOnError) {
          break;
        }
        continue;
      }

      eventsToProcess.push(this.enrichEvent(event));
    }

    // Bulk queue events
    if (eventsToProcess.length > 0) {
      try {
        const jobs = eventsToProcess.map((event) => ({
          name: AnalyticsJobType.PROCESS_EVENT,
          data: event,
          opts: {
            attempts: 3,
            backoff: { type: 'exponential' as const, delay: 1000 },
            removeOnComplete: 100,
            removeOnFail: 1000,
          },
        }));

        await this.analyticsQueue.addBulk(jobs);

        // Mark all as processed
        await this.markBulkEventsProcessed(eventsToProcess.map((e) => e.eventId));

        result.successful += eventsToProcess.length;
      } catch (error) {
        this.logger.error('Failed to queue batch events:', error);
        result.failed += eventsToProcess.length;
        for (const event of eventsToProcess) {
          result.errors.push({
            eventId: event.eventId,
            error: 'Failed to queue event',
          });
        }
      }
    }

    return result;
  }

  /**
   * Get all event schema definitions
   */
  getEventSchemas(): EventSchemaResponseDto[] {
    const schemas: EventSchemaResponseDto[] = [];

    for (const eventType of Object.values(MarketingEventType)) {
      const schema = EVENT_SCHEMAS[eventType] || {};
      const category = EVENT_CATEGORY_MAP[eventType] || EventCategory.CUSTOM;

      const requiredProperties: string[] = [];
      const optionalProperties: string[] = [];

      for (const [key, type] of Object.entries(schema)) {
        if (type.endsWith('?')) {
          optionalProperties.push(key);
        } else {
          requiredProperties.push(key);
        }
      }

      schemas.push({
        eventType,
        category,
        requiredProperties,
        optionalProperties,
        schema,
        defaultSamplingRate: DEFAULT_SAMPLING_RATES[eventType] || 1.0,
      });
    }

    return schemas;
  }

  /**
   * Validate event payload against schema
   */
  validateEvent(dto: ValidateEventDto): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const validation = this.validateEventProperties(dto.eventType, dto.properties);
    return {
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings || [],
    };
  }

  /**
   * Query events (for internal use and debugging)
   */
  async queryEvents(query: EventQueryDto) {
    const where: any = {};

    if (query.eventType) {
      where.eventType = query.eventType;
    }

    if (query.eventCategory) {
      where.eventCategory = query.eventCategory;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.sessionId) {
      where.sessionId = query.sessionId;
    }

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) {
        where.timestamp.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.timestamp.lte = new Date(query.endDate);
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      this.prisma.analyticsEvent.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.analyticsEvent.count({ where }),
    ]);

    return {
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Store event in database (called by queue processor)
   */
  async storeEvent(event: IngestEventDto): Promise<void> {
    await this.prisma.analyticsEvent.create({
      data: {
        eventType: event.eventType,
        eventCategory: event.eventCategory || EVENT_CATEGORY_MAP[event.eventType],
        userId: event.userId,
        sessionId: event.sessionId,
        organizationId: event.organizationId,
        properties: event.properties || {},
        metadata: event.anonymousId || event.eventName || event.utm
          ? JSON.parse(JSON.stringify({
              anonymousId: event.anonymousId,
              eventName: event.eventName,
              utm: event.utm,
            }))
          : undefined,
        ipAddress: event.context?.ipAddress,
        userAgent: event.context?.userAgent,
        referer: event.context?.referrer,
        page: event.context?.page,
        timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
      },
    });
  }

  /**
   * Check if event was already processed (idempotency)
   */
  private async checkIdempotency(eventId: string): Promise<boolean> {
    const key = `${this.IDEMPOTENCY_KEY_PREFIX}${eventId}`;
    return await this.redis.exists(key);
  }

  /**
   * Bulk check idempotency
   */
  private async checkBulkIdempotency(eventIds: string[]): Promise<Set<string>> {
    const duplicates = new Set<string>();

    // Check in batches to avoid overwhelming Redis
    const batchSize = 100;
    for (let i = 0; i < eventIds.length; i += batchSize) {
      const batch = eventIds.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (eventId) => {
          const exists = await this.checkIdempotency(eventId);
          return { eventId, exists };
        }),
      );

      for (const { eventId, exists } of results) {
        if (exists) {
          duplicates.add(eventId);
        }
      }
    }

    return duplicates;
  }

  /**
   * Mark event as processed
   */
  private async markEventProcessed(eventId: string): Promise<void> {
    const key = `${this.IDEMPOTENCY_KEY_PREFIX}${eventId}`;
    await this.redis.set(key, { processed: true }, this.IDEMPOTENCY_TTL);
  }

  /**
   * Bulk mark events as processed
   */
  private async markBulkEventsProcessed(eventIds: string[]): Promise<void> {
    await Promise.all(eventIds.map((id) => this.markEventProcessed(id)));
  }

  /**
   * Check if event should be sampled (for high-volume events)
   */
  private shouldSample(eventType: MarketingEventType): boolean {
    const rate = this.samplingRates[eventType] || 1.0;
    if (rate >= 1.0) return true;
    return Math.random() < rate;
  }

  /**
   * Validate event properties against schema
   */
  private validateEventProperties(
    eventType: MarketingEventType,
    properties: Record<string, any>,
  ): { valid: boolean; errors: string[]; warnings?: string[] } {
    const schema = EVENT_SCHEMAS[eventType];
    if (!schema) {
      return { valid: true, errors: [], warnings: ['No schema defined for this event type'] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    for (const [key, typeSpec] of Object.entries(schema)) {
      const isOptional = typeSpec.endsWith('?');
      const type = isOptional ? typeSpec.slice(0, -1) : typeSpec;
      const value = properties[key];

      if (value === undefined || value === null) {
        if (!isOptional) {
          errors.push(`Missing required property: ${key}`);
        }
        continue;
      }

      // Type validation
      if (!this.validateType(value, type)) {
        errors.push(`Property ${key} should be of type ${type}`);
      }
    }

    // Warn about unknown properties
    for (const key of Object.keys(properties)) {
      if (!schema[key]) {
        warnings.push(`Unknown property: ${key}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Simple type validation
   */
  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      case 'any':
        return true;
      default:
        return true;
    }
  }

  /**
   * Enrich event with derived data
   */
  private enrichEvent(event: IngestEventDto): IngestEventDto {
    return {
      ...event,
      eventCategory: event.eventCategory || EVENT_CATEGORY_MAP[event.eventType],
      timestamp: event.timestamp || new Date().toISOString(),
    };
  }

  /**
   * Get event counts by type for a time range
   */
  async getEventCounts(startDate: Date, endDate: Date): Promise<Record<string, number>> {
    const counts = await this.prisma.analyticsEvent.groupBy({
      by: ['eventType'],
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: true,
    });

    return counts.reduce(
      (acc, item) => {
        acc[item.eventType] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Get unique user count for a time range
   */
  async getUniqueUsers(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.prisma.analyticsEvent.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        userId: { not: null },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    return result.length;
  }

  /**
   * Get unique session count for a time range
   */
  async getUniqueSessions(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.prisma.analyticsEvent.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { sessionId: true },
      distinct: ['sessionId'],
    });

    return result.length;
  }
}
