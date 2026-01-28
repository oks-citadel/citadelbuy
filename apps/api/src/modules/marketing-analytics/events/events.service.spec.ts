import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { EventsService, MARKETING_ANALYTICS_QUEUE, AnalyticsJobType } from './events.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { MarketingEventType, EventCategory, EVENT_CATEGORY_MAP } from '../constants/event-types';

describe('EventsService', () => {
  let service: EventsService;
  let prisma: PrismaService;
  let redis: RedisService;
  let queue: any;

  const mockPrismaService = {
    analyticsEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    exists: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
    addBulk: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue: any) => {
      if (key === 'ANALYTICS_SAMPLING_ENABLED') return false;
      return defaultValue;
    }),
  };

  // Mock data
  const baseTimestamp = new Date('2025-01-15T10:00:00.000Z');
  const mockEventId = 'event-123';
  const mockSessionId = 'session-123';
  const mockUserId = 'user-123';

  const mockIngestEvent = {
    eventId: mockEventId,
    eventType: MarketingEventType.PAGE_VIEW,
    sessionId: mockSessionId,
    userId: mockUserId,
    timestamp: baseTimestamp.toISOString(),
    properties: { url: '/home', title: 'Home Page' },
    context: {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
      referrer: 'https://google.com',
      page: '/home',
    },
    utm: {
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'winter_sale',
    },
  };

  const mockPurchaseEvent = {
    eventId: 'purchase-123',
    eventType: MarketingEventType.PURCHASE,
    sessionId: mockSessionId,
    userId: mockUserId,
    timestamp: baseTimestamp.toISOString(),
    properties: {
      orderId: 'order-123',
      orderValue: 99.99,
      currency: 'USD',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getQueueToken(MARKETING_ANALYTICS_QUEUE),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
    queue = module.get(getQueueToken(MARKETING_ANALYTICS_QUEUE));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ingestEvent', () => {
    it('should successfully ingest a valid event', async () => {
      mockRedisService.exists.mockResolvedValue(false);
      mockQueue.add.mockResolvedValue({ id: 'job-1' });
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await service.ingestEvent(mockIngestEvent);

      expect(result.success).toBe(true);
      expect(result.eventId).toBe(mockEventId);
      expect(result.duplicate).toBeUndefined();
      expect(mockQueue.add).toHaveBeenCalledWith(
        AnalyticsJobType.PROCESS_EVENT,
        expect.objectContaining({
          eventId: mockEventId,
          eventType: MarketingEventType.PAGE_VIEW,
        }),
        expect.any(Object),
      );
    });

    it('should detect duplicate events', async () => {
      mockRedisService.exists.mockResolvedValue(true);

      const result = await service.ingestEvent(mockIngestEvent);

      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(true);
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should validate event properties and reject invalid events', async () => {
      mockRedisService.exists.mockResolvedValue(false);
      const invalidEvent = {
        ...mockPurchaseEvent,
        properties: {}, // Missing required orderId, orderValue, currency
      };

      const result = await service.ingestEvent(invalidEvent);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid event properties');
    });

    it('should enrich event with category', async () => {
      mockRedisService.exists.mockResolvedValue(false);
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.ingestEvent(mockIngestEvent);

      expect(mockQueue.add).toHaveBeenCalledWith(
        AnalyticsJobType.PROCESS_EVENT,
        expect.objectContaining({
          eventCategory: EventCategory.NAVIGATION,
        }),
        expect.any(Object),
      );
    });

    it('should handle queue errors gracefully', async () => {
      mockRedisService.exists.mockResolvedValue(false);
      mockQueue.add.mockRejectedValue(new Error('Queue error'));

      const result = await service.ingestEvent(mockIngestEvent);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Queue error');
    });

    it('should mark event as processed after successful ingestion', async () => {
      mockRedisService.exists.mockResolvedValue(false);
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.ingestEvent(mockIngestEvent);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.stringContaining(mockEventId),
        expect.objectContaining({ processed: true }),
        expect.any(Number),
      );
    });
  });

  describe('batchIngestEvents', () => {
    const mockBatchEvents = {
      events: [
        mockIngestEvent,
        { ...mockIngestEvent, eventId: 'event-456' },
        { ...mockPurchaseEvent },
      ],
    };

    it('should successfully ingest batch of events', async () => {
      mockRedisService.exists.mockResolvedValue(false);
      mockQueue.addBulk.mockResolvedValue([]);
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await service.batchIngestEvents(mockBatchEvents);

      expect(result.total).toBe(3);
      expect(result.successful).toBeGreaterThan(0);
      expect(result.failed).toBe(0);
      expect(result.duplicates).toBe(0);
    });

    it('should identify duplicates in batch', async () => {
      mockRedisService.exists
        .mockResolvedValueOnce(true) // First event is duplicate
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);
      mockQueue.addBulk.mockResolvedValue([]);

      const result = await service.batchIngestEvents(mockBatchEvents);

      expect(result.duplicates).toBe(1);
    });

    it('should continue on error when continueOnError is true', async () => {
      mockRedisService.exists.mockResolvedValue(false);
      mockQueue.addBulk.mockResolvedValue([]);

      const batchWithInvalid = {
        events: [
          mockIngestEvent,
          { ...mockPurchaseEvent, properties: {} }, // Invalid
          { ...mockIngestEvent, eventId: 'event-789' },
        ],
        continueOnError: true,
      };

      const result = await service.batchIngestEvents(batchWithInvalid);

      expect(result.failed).toBe(1);
      expect(result.errors.length).toBe(1);
    });

    it('should stop on error when continueOnError is false', async () => {
      mockRedisService.exists.mockResolvedValue(false);

      const batchWithInvalid = {
        events: [
          { ...mockPurchaseEvent, properties: {} }, // Invalid - will stop here
          mockIngestEvent,
        ],
        continueOnError: false,
      };

      const result = await service.batchIngestEvents(batchWithInvalid);

      expect(result.failed).toBe(1);
      expect(result.successful).toBe(0);
    });

    it('should handle queue bulk add errors', async () => {
      mockRedisService.exists.mockResolvedValue(false);
      mockQueue.addBulk.mockRejectedValue(new Error('Bulk queue error'));

      const result = await service.batchIngestEvents(mockBatchEvents);

      expect(result.failed).toBeGreaterThan(0);
    });
  });

  describe('getEventSchemas', () => {
    it('should return all event schemas', () => {
      const schemas = service.getEventSchemas();

      expect(Array.isArray(schemas)).toBe(true);
      expect(schemas.length).toBeGreaterThan(0);
    });

    it('should include required properties for each event type', () => {
      const schemas = service.getEventSchemas();

      schemas.forEach(schema => {
        expect(schema).toHaveProperty('eventType');
        expect(schema).toHaveProperty('category');
        expect(schema).toHaveProperty('requiredProperties');
        expect(schema).toHaveProperty('optionalProperties');
        expect(schema).toHaveProperty('schema');
        expect(schema).toHaveProperty('defaultSamplingRate');
      });
    });

    it('should include correct category for each event type', () => {
      const schemas = service.getEventSchemas();

      const pageViewSchema = schemas.find(s => s.eventType === MarketingEventType.PAGE_VIEW);
      expect(pageViewSchema?.category).toBe(EventCategory.NAVIGATION);

      const purchaseSchema = schemas.find(s => s.eventType === MarketingEventType.PURCHASE);
      expect(purchaseSchema?.category).toBe(EventCategory.ECOMMERCE);
    });

    it('should separate required and optional properties', () => {
      const schemas = service.getEventSchemas();

      const purchaseSchema = schemas.find(s => s.eventType === MarketingEventType.PURCHASE);
      expect(purchaseSchema?.requiredProperties).toContain('orderId');
      expect(purchaseSchema?.requiredProperties).toContain('orderValue');
      expect(purchaseSchema?.requiredProperties).toContain('currency');
      expect(purchaseSchema?.optionalProperties).toContain('items');
    });
  });

  describe('validateEvent', () => {
    it('should validate valid event', () => {
      const result = service.validateEvent({
        eventType: MarketingEventType.PAGE_VIEW,
        properties: { url: '/home' },
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return errors for missing required properties', () => {
      const result = service.validateEvent({
        eventType: MarketingEventType.PURCHASE,
        properties: { orderId: 'order-123' }, // Missing orderValue and currency
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return warnings for unknown properties', () => {
      const result = service.validateEvent({
        eventType: MarketingEventType.PAGE_VIEW,
        properties: { url: '/home', unknownProp: 'value' },
      });

      expect(result.warnings).toContain('Unknown property: unknownProp');
    });

    it('should validate property types', () => {
      const result = service.validateEvent({
        eventType: MarketingEventType.PURCHASE,
        properties: {
          orderId: 'order-123',
          orderValue: 'not a number', // Should be number
          currency: 'USD',
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('orderValue'))).toBe(true);
    });
  });

  describe('queryEvents', () => {
    it('should query events with filters', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);
      mockPrismaService.analyticsEvent.count.mockResolvedValue(0);

      const result = await service.queryEvents({
        eventType: MarketingEventType.PAGE_VIEW,
        userId: mockUserId,
        sessionId: mockSessionId,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('pagination');
      expect(mockPrismaService.analyticsEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventType: MarketingEventType.PAGE_VIEW,
            userId: mockUserId,
            sessionId: mockSessionId,
          }),
        }),
      );
    });

    it('should paginate results', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);
      mockPrismaService.analyticsEvent.count.mockResolvedValue(100);

      const result = await service.queryEvents({
        page: 2,
        limit: 20,
      });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(100);
      expect(result.pagination.totalPages).toBe(5);
    });

    it('should use default pagination values', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);
      mockPrismaService.analyticsEvent.count.mockResolvedValue(100);

      const result = await service.queryEvents({});

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
    });

    it('should filter by event category', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);
      mockPrismaService.analyticsEvent.count.mockResolvedValue(0);

      await service.queryEvents({
        eventCategory: EventCategory.ECOMMERCE,
      });

      expect(mockPrismaService.analyticsEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventCategory: EventCategory.ECOMMERCE,
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);
      mockPrismaService.analyticsEvent.count.mockResolvedValue(0);

      await service.queryEvents({
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      expect(mockPrismaService.analyticsEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('storeEvent', () => {
    it('should store event in database', async () => {
      mockPrismaService.analyticsEvent.create.mockResolvedValue({ id: 'stored-event-1' });

      await service.storeEvent(mockIngestEvent);

      expect(mockPrismaService.analyticsEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: MarketingEventType.PAGE_VIEW,
          userId: mockUserId,
          sessionId: mockSessionId,
          properties: mockIngestEvent.properties,
          ipAddress: mockIngestEvent.context?.ipAddress,
          userAgent: mockIngestEvent.context?.userAgent,
        }),
      });
    });

    it('should include UTM data in metadata', async () => {
      mockPrismaService.analyticsEvent.create.mockResolvedValue({ id: 'stored-event-1' });

      await service.storeEvent(mockIngestEvent);

      expect(mockPrismaService.analyticsEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            utm: mockIngestEvent.utm,
          }),
        }),
      });
    });

    it('should use current timestamp if not provided', async () => {
      mockPrismaService.analyticsEvent.create.mockResolvedValue({ id: 'stored-event-1' });
      const eventWithoutTimestamp = { ...mockIngestEvent, timestamp: undefined };

      await service.storeEvent(eventWithoutTimestamp);

      expect(mockPrismaService.analyticsEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          timestamp: expect.any(Date),
        }),
      });
    });
  });

  describe('getEventCounts', () => {
    it('should return event counts by type', async () => {
      mockPrismaService.analyticsEvent.groupBy.mockResolvedValue([
        { eventType: MarketingEventType.PAGE_VIEW, _count: 100 },
        { eventType: MarketingEventType.PURCHASE, _count: 10 },
      ]);

      const result = await service.getEventCounts(
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      );

      expect(result).toHaveProperty(MarketingEventType.PAGE_VIEW, 100);
      expect(result).toHaveProperty(MarketingEventType.PURCHASE, 10);
    });

    it('should filter by date range', async () => {
      mockPrismaService.analyticsEvent.groupBy.mockResolvedValue([]);
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      await service.getEventCounts(startDate, endDate);

      expect(mockPrismaService.analyticsEvent.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });
  });

  describe('getUniqueUsers', () => {
    it('should return unique user count', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
        { userId: 'user-3' },
      ]);

      const result = await service.getUniqueUsers(
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      );

      expect(result).toBe(3);
    });

    it('should filter by date range', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      await service.getUniqueUsers(startDate, endDate);

      expect(mockPrismaService.analyticsEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: {
              gte: startDate,
              lte: endDate,
            },
            userId: { not: null },
          }),
        }),
      );
    });
  });

  describe('getUniqueSessions', () => {
    it('should return unique session count', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([
        { sessionId: 'session-1' },
        { sessionId: 'session-2' },
        { sessionId: 'session-3' },
      ]);

      const result = await service.getUniqueSessions(
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      );

      expect(result).toBe(3);
    });

    it('should filter by date range', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      await service.getUniqueSessions(startDate, endDate);

      expect(mockPrismaService.analyticsEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });
  });

  describe('sampling', () => {
    it('should skip sampling when disabled', async () => {
      mockRedisService.exists.mockResolvedValue(false);
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      const result = await service.ingestEvent(mockIngestEvent);

      expect(result.success).toBe(true);
      expect(mockQueue.add).toHaveBeenCalled();
    });
  });

  describe('type validation', () => {
    it('should validate string type', () => {
      const result = service.validateEvent({
        eventType: MarketingEventType.PAGE_VIEW,
        properties: { url: '/home' }, // url should be string
      });

      expect(result.valid).toBe(true);
    });

    it('should validate number type', () => {
      const result = service.validateEvent({
        eventType: MarketingEventType.PURCHASE,
        properties: {
          orderId: 'order-123',
          orderValue: 99.99, // Should be number
          currency: 'USD',
        },
      });

      expect(result.valid).toBe(true);
    });

    it('should validate boolean type', () => {
      const result = service.validateEvent({
        eventType: MarketingEventType.LOGIN,
        properties: {
          success: true, // Should be boolean
        },
      });

      expect(result.valid).toBe(true);
    });

    it('should validate array type', () => {
      const result = service.validateEvent({
        eventType: MarketingEventType.PURCHASE,
        properties: {
          orderId: 'order-123',
          orderValue: 99.99,
          currency: 'USD',
          items: [{ productId: 'p1', quantity: 1 }], // Optional array
        },
      });

      expect(result.valid).toBe(true);
    });

    it('should validate object type', () => {
      const result = service.validateEvent({
        eventType: MarketingEventType.SEARCH_PERFORMED,
        properties: {
          query: 'test search',
          resultsCount: 10,
          filters: { category: 'electronics' }, // Optional object
        },
      });

      expect(result.valid).toBe(true);
    });
  });
});
