import { Test, TestingModule } from '@nestjs/testing';
import { BehaviorService } from './behavior.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { MarketingEventType } from '../constants/event-types';

describe('BehaviorService', () => {
  let service: BehaviorService;
  let prisma: PrismaService;
  let redis: RedisService;

  const mockPrismaService = {
    analyticsEvent: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  // Mock data
  const baseTimestamp = new Date('2025-01-15T10:00:00.000Z');
  const mockSessionId = 'session-123';
  const mockUserId = 'user-123';
  const mockPageUrl = '/products';

  const mockClickEvents = [
    {
      sessionId: mockSessionId,
      properties: { x: 150, y: 200, element: 'button.add-to-cart' },
    },
    {
      sessionId: mockSessionId,
      properties: { x: 160, y: 210, element: 'button.add-to-cart' },
    },
    {
      sessionId: 'session-456',
      properties: { x: 300, y: 400, element: 'a.product-link' },
    },
  ];

  const mockPageViewEvents = [
    {
      eventType: MarketingEventType.PAGE_VIEW,
      sessionId: mockSessionId,
      userId: mockUserId,
      timestamp: baseTimestamp,
      page: mockPageUrl,
      properties: {},
    },
    {
      eventType: 'page_leave',
      sessionId: mockSessionId,
      userId: mockUserId,
      timestamp: new Date(baseTimestamp.getTime() + 60000),
      page: mockPageUrl,
      properties: { scrollDepth: 75 },
    },
  ];

  const mockSessionEvents = [
    {
      id: 'event-1',
      sessionId: mockSessionId,
      userId: mockUserId,
      eventType: MarketingEventType.PAGE_VIEW,
      timestamp: baseTimestamp,
      page: '/home',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
      properties: {},
      metadata: {},
    },
    {
      id: 'event-2',
      sessionId: mockSessionId,
      userId: mockUserId,
      eventType: MarketingEventType.PAGE_VIEW,
      timestamp: new Date(baseTimestamp.getTime() + 30000),
      page: '/products',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
      properties: {},
      metadata: {},
    },
    {
      id: 'event-3',
      sessionId: mockSessionId,
      userId: mockUserId,
      eventType: MarketingEventType.PURCHASE,
      timestamp: new Date(baseTimestamp.getTime() + 120000),
      page: '/checkout',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
      properties: { orderValue: 99.99 },
      metadata: {},
    },
  ];

  const mockErrorSession = [
    {
      id: 'event-4',
      sessionId: 'session-error',
      userId: 'user-456',
      eventType: MarketingEventType.PAGE_VIEW,
      timestamp: baseTimestamp,
      page: '/home',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile Safari',
      properties: {},
      metadata: {},
    },
    {
      id: 'event-5',
      sessionId: 'session-error',
      userId: 'user-456',
      eventType: MarketingEventType.ERROR_OCCURRED,
      timestamp: new Date(baseTimestamp.getTime() + 10000),
      page: '/checkout',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile Safari',
      properties: { errorType: 'validation', errorMessage: 'Invalid input' },
      metadata: {},
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BehaviorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<BehaviorService>(BehaviorService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHeatmapData', () => {
    it('should return cached heatmap data if available', async () => {
      const cachedData = {
        pageUrl: mockPageUrl,
        type: 'click',
        totalInteractions: 100,
        uniqueSessions: 50,
        data: [{ x: 100, y: 200, value: 25 }],
        dateRange: { startDate: '2025-01-01', endDate: '2025-01-15' },
      };
      mockRedisService.get.mockResolvedValue(cachedData);

      const result = await service.getHeatmapData({ pageUrl: mockPageUrl });

      expect(result).toEqual(cachedData);
      expect(mockPrismaService.analyticsEvent.findMany).not.toHaveBeenCalled();
    });

    it('should calculate heatmap data when cache is empty', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockClickEvents);

      const result = await service.getHeatmapData({ pageUrl: mockPageUrl });

      expect(result).toHaveProperty('pageUrl', mockPageUrl);
      expect(result).toHaveProperty('type', 'click');
      expect(result).toHaveProperty('totalInteractions');
      expect(result).toHaveProperty('uniqueSessions');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('dateRange');
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should aggregate click positions into grid', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockClickEvents);

      const result = await service.getHeatmapData({ pageUrl: mockPageUrl });

      expect(Array.isArray(result.data)).toBe(true);
      result.data.forEach(point => {
        expect(point).toHaveProperty('x');
        expect(point).toHaveProperty('y');
        expect(point).toHaveProperty('value');
      });
    });

    it('should count unique sessions correctly', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockClickEvents);

      const result = await service.getHeatmapData({ pageUrl: mockPageUrl });

      expect(result.uniqueSessions).toBe(2); // session-123 and session-456
    });

    it('should use default page URL when not provided', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.getHeatmapData({});

      expect(result.pageUrl).toBe('/');
    });

    it('should handle events without coordinates', async () => {
      const eventsWithoutCoords = [
        { sessionId: mockSessionId, properties: {} },
        { sessionId: mockSessionId, properties: { element: 'button' } },
      ];
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(eventsWithoutCoords);

      const result = await service.getHeatmapData({ pageUrl: mockPageUrl });

      expect(result.data).toEqual([]);
      expect(result.totalInteractions).toBe(2);
    });
  });

  describe('getClickmapData', () => {
    it('should return cached clickmap data if available', async () => {
      const cachedData = {
        pageUrl: mockPageUrl,
        totalPageViews: 1000,
        totalClicks: 500,
        clicksPerVisit: 0.5,
        elements: [],
        densityZones: [],
      };
      mockRedisService.get.mockResolvedValue(cachedData);

      const result = await service.getClickmapData({ pageUrl: mockPageUrl });

      expect(result).toEqual(cachedData);
    });

    it('should calculate clickmap data with element aggregation', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.count.mockResolvedValue(100); // Page views
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockClickEvents);

      const result = await service.getClickmapData({ pageUrl: mockPageUrl });

      expect(result).toHaveProperty('pageUrl', mockPageUrl);
      expect(result).toHaveProperty('totalPageViews', 100);
      expect(result).toHaveProperty('totalClicks');
      expect(result).toHaveProperty('clicksPerVisit');
      expect(result).toHaveProperty('elements');
      expect(result).toHaveProperty('densityZones');
    });

    it('should aggregate clicks by element', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.count.mockResolvedValue(100);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockClickEvents);

      const result = await service.getClickmapData({ pageUrl: mockPageUrl });

      expect(result.elements.length).toBeGreaterThan(0);
      const addToCartElement = result.elements.find(e => e.element === 'button.add-to-cart');
      expect(addToCartElement).toBeDefined();
      expect(addToCartElement?.clicks).toBe(2);
    });

    it('should calculate density zones correctly', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.count.mockResolvedValue(100);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockClickEvents);

      const result = await service.getClickmapData({ pageUrl: mockPageUrl });

      expect(result.densityZones).toHaveLength(3);
      expect(result.densityZones.map(z => z.zone)).toEqual(['top', 'middle', 'bottom']);
      result.densityZones.forEach(zone => {
        expect(zone).toHaveProperty('percentage');
        expect(zone.percentage).toBeGreaterThanOrEqual(0);
        expect(zone.percentage).toBeLessThanOrEqual(100);
      });
    });

    it('should calculate clicks per visit correctly', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.count.mockResolvedValue(100);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockClickEvents);

      const result = await service.getClickmapData({ pageUrl: mockPageUrl });

      expect(result.clicksPerVisit).toBe(0.03); // 3 clicks / 100 page views
    });

    it('should handle zero page views', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.count.mockResolvedValue(0);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.getClickmapData({ pageUrl: mockPageUrl });

      expect(result.totalPageViews).toBe(0);
      expect(result.clicksPerVisit).toBe(0);
    });
  });

  describe('getScrollmapData', () => {
    it('should return cached scrollmap data if available', async () => {
      const cachedData = {
        pageUrl: mockPageUrl,
        totalPageViews: 100,
        avgScrollDepth: 65,
        avgTimeOnPage: 120,
        depthDistribution: [],
        foldAnalysis: { aboveFoldTime: 60, belowFoldTime: 60, foldPosition: 50 },
      };
      mockRedisService.get.mockResolvedValue(cachedData);

      const result = await service.getScrollmapData({ pageUrl: mockPageUrl });

      expect(result).toEqual(cachedData);
    });

    it('should calculate scrollmap data', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockPageViewEvents);

      const result = await service.getScrollmapData({ pageUrl: mockPageUrl });

      expect(result).toHaveProperty('pageUrl', mockPageUrl);
      expect(result).toHaveProperty('totalPageViews');
      expect(result).toHaveProperty('avgScrollDepth');
      expect(result).toHaveProperty('avgTimeOnPage');
      expect(result).toHaveProperty('depthDistribution');
      expect(result).toHaveProperty('foldAnalysis');
    });

    it('should calculate depth distribution buckets', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockPageViewEvents);

      const result = await service.getScrollmapData({ pageUrl: mockPageUrl });

      expect(result.depthDistribution).toHaveLength(5);
      result.depthDistribution.forEach(bucket => {
        expect(bucket).toHaveProperty('depth');
        expect(bucket).toHaveProperty('users');
        expect(bucket).toHaveProperty('percentage');
        expect([0, 25, 50, 75, 100]).toContain(bucket.depth);
      });
    });

    it('should calculate fold analysis', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockPageViewEvents);

      const result = await service.getScrollmapData({ pageUrl: mockPageUrl });

      expect(result.foldAnalysis).toHaveProperty('aboveFoldTime');
      expect(result.foldAnalysis).toHaveProperty('belowFoldTime');
      expect(result.foldAnalysis).toHaveProperty('foldPosition', 50);
    });

    it('should handle sessions without page leave events', async () => {
      const pageViewOnly = [mockPageViewEvents[0]];
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(pageViewOnly);

      const result = await service.getScrollmapData({ pageUrl: mockPageUrl });

      expect(result.avgScrollDepth).toBe(0);
      expect(result.avgTimeOnPage).toBe(0);
    });
  });

  describe('getRecordings', () => {
    it('should return paginated list of session recordings', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockSessionEvents);

      const result = await service.getRecordings({ page: 1, limit: 20 });

      expect(result).toHaveProperty('recordings');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should filter by userId when provided', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockSessionEvents);

      await service.getRecordings({ userId: mockUserId });

      expect(mockPrismaService.analyticsEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
          }),
        }),
      );
    });

    it('should filter by pageUrl when provided', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockSessionEvents);

      await service.getRecordings({ pageUrl: '/products' });

      expect(mockPrismaService.analyticsEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            page: '/products',
          }),
        }),
      );
    });

    it('should filter by minDuration when provided', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockSessionEvents);

      const result = await service.getRecordings({ minDuration: 180 });

      // Session duration is 120 seconds, so it should be filtered out
      expect(result.recordings.length).toBe(0);
    });

    it('should filter by maxDuration when provided', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockSessionEvents);

      const result = await service.getRecordings({ maxDuration: 60 });

      // Session duration is 120 seconds, so it should be filtered out
      expect(result.recordings.length).toBe(0);
    });

    it('should filter by convertedOnly when provided', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([
        ...mockSessionEvents,
        ...mockErrorSession,
      ]);

      const result = await service.getRecordings({ convertedOnly: true });

      // Only the session with PURCHASE event should be included
      expect(result.recordings.every(r => r.converted)).toBe(true);
    });

    it('should filter by hasErrors when provided', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([
        ...mockSessionEvents,
        ...mockErrorSession,
      ]);

      const result = await service.getRecordings({ hasErrors: true });

      // Only the session with ERROR_OCCURRED should be included
      expect(result.recordings.every(r => r.tags.includes('error'))).toBe(true);
    });

    it('should include recording metadata', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockSessionEvents);

      const result = await service.getRecordings({});

      const recording = result.recordings[0];
      expect(recording).toHaveProperty('id');
      expect(recording).toHaveProperty('sessionId');
      expect(recording).toHaveProperty('startTime');
      expect(recording).toHaveProperty('endTime');
      expect(recording).toHaveProperty('durationSeconds');
      expect(recording).toHaveProperty('pagesVisited');
      expect(recording).toHaveProperty('eventCount');
      expect(recording).toHaveProperty('deviceType');
      expect(recording).toHaveProperty('browser');
      expect(recording).toHaveProperty('os');
      expect(recording).toHaveProperty('entryPage');
      expect(recording).toHaveProperty('exitPage');
      expect(recording).toHaveProperty('converted');
    });

    it('should handle empty results', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.getRecordings({});

      expect(result.recordings).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getBehaviorSummary', () => {
    it('should return cached summary if available', async () => {
      const cachedSummary = {
        dateRange: { startDate: '2025-01-01', endDate: '2025-01-15' },
        topPages: [],
        topEntryPages: [],
        topExitPages: [],
        avgScrollDepth: 50,
        avgTimeOnPage: 60,
        totalRecordings: 100,
      };
      mockRedisService.get.mockResolvedValue(cachedSummary);

      const result = await service.getBehaviorSummary({});

      expect(result).toEqual(cachedSummary);
    });

    it('should calculate behavior summary', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([
        {
          eventType: MarketingEventType.PAGE_VIEW,
          sessionId: mockSessionId,
          userId: mockUserId,
          timestamp: baseTimestamp,
          page: '/home',
          properties: {},
        },
        {
          eventType: MarketingEventType.PAGE_VIEW,
          sessionId: mockSessionId,
          userId: mockUserId,
          timestamp: new Date(baseTimestamp.getTime() + 30000),
          page: '/products',
          properties: {},
        },
      ]);

      const result = await service.getBehaviorSummary({});

      expect(result).toHaveProperty('dateRange');
      expect(result).toHaveProperty('topPages');
      expect(result).toHaveProperty('topEntryPages');
      expect(result).toHaveProperty('topExitPages');
      expect(result).toHaveProperty('avgScrollDepth');
      expect(result).toHaveProperty('avgTimeOnPage');
      expect(result).toHaveProperty('totalRecordings');
    });

    it('should identify top pages by views', async () => {
      mockRedisService.get.mockResolvedValue(null);
      const multiplePageViews = [
        { eventType: MarketingEventType.PAGE_VIEW, sessionId: 's1', userId: 'u1', timestamp: baseTimestamp, page: '/home', properties: {} },
        { eventType: MarketingEventType.PAGE_VIEW, sessionId: 's1', userId: 'u1', timestamp: baseTimestamp, page: '/products', properties: {} },
        { eventType: MarketingEventType.PAGE_VIEW, sessionId: 's2', userId: 'u2', timestamp: baseTimestamp, page: '/home', properties: {} },
        { eventType: MarketingEventType.PAGE_VIEW, sessionId: 's2', userId: 'u2', timestamp: baseTimestamp, page: '/home', properties: {} },
      ];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(multiplePageViews);

      const result = await service.getBehaviorSummary({});

      expect(result.topPages.length).toBeGreaterThan(0);
      expect(result.topPages[0].url).toBe('/home'); // Most viewed
      expect(result.topPages[0]).toHaveProperty('views');
      expect(result.topPages[0]).toHaveProperty('uniqueVisitors');
    });

    it('should identify entry pages', async () => {
      mockRedisService.get.mockResolvedValue(null);
      const sessionPages = [
        { eventType: MarketingEventType.PAGE_VIEW, sessionId: 's1', userId: 'u1', timestamp: baseTimestamp, page: '/landing', properties: {} },
        { eventType: MarketingEventType.PAGE_VIEW, sessionId: 's1', userId: 'u1', timestamp: new Date(baseTimestamp.getTime() + 30000), page: '/products', properties: {} },
      ];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(sessionPages);

      const result = await service.getBehaviorSummary({});

      expect(result.topEntryPages.length).toBeGreaterThan(0);
      expect(result.topEntryPages[0].url).toBe('/landing');
      expect(result.topEntryPages[0]).toHaveProperty('entries');
    });

    it('should identify exit pages', async () => {
      mockRedisService.get.mockResolvedValue(null);
      const sessionPages = [
        { eventType: MarketingEventType.PAGE_VIEW, sessionId: 's1', userId: 'u1', timestamp: baseTimestamp, page: '/home', properties: {} },
        { eventType: MarketingEventType.PAGE_VIEW, sessionId: 's1', userId: 'u1', timestamp: new Date(baseTimestamp.getTime() + 30000), page: '/checkout', properties: {} },
      ];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(sessionPages);

      const result = await service.getBehaviorSummary({});

      expect(result.topExitPages.length).toBeGreaterThan(0);
      expect(result.topExitPages[0].url).toBe('/checkout');
      expect(result.topExitPages[0]).toHaveProperty('exits');
    });

    it('should calculate bounce rate per page', async () => {
      mockRedisService.get.mockResolvedValue(null);
      const bounceSessions = [
        { eventType: MarketingEventType.PAGE_VIEW, sessionId: 's1', userId: 'u1', timestamp: baseTimestamp, page: '/home', properties: {} },
        // Session s1 is a bounce (single page view)
        { eventType: MarketingEventType.PAGE_VIEW, sessionId: 's2', userId: 'u2', timestamp: baseTimestamp, page: '/home', properties: {} },
        { eventType: MarketingEventType.PAGE_VIEW, sessionId: 's2', userId: 'u2', timestamp: new Date(baseTimestamp.getTime() + 30000), page: '/products', properties: {} },
      ];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(bounceSessions);

      const result = await service.getBehaviorSummary({});

      const homePage = result.topPages.find(p => p.url === '/home');
      expect(homePage).toBeDefined();
      expect(homePage?.bounceRate).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty page views', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.getBehaviorSummary({});

      expect(result.topPages).toEqual([]);
      expect(result.topEntryPages).toEqual([]);
      expect(result.topExitPages).toEqual([]);
      expect(result.totalRecordings).toBe(0);
    });
  });

  describe('device type parsing', () => {
    it('should identify mobile devices', async () => {
      const mobileEvents = [{
        ...mockSessionEvents[0],
        sessionId: 'mobile-session',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      }];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mobileEvents);

      const result = await service.getRecordings({});

      expect(result.recordings[0].deviceType).toBe('mobile');
    });

    it('should identify tablet devices', async () => {
      const tabletEvents = [{
        ...mockSessionEvents[0],
        sessionId: 'tablet-session',
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/605.1',
      }];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(tabletEvents);

      const result = await service.getRecordings({});

      expect(result.recordings[0].deviceType).toBe('tablet');
    });

    it('should identify desktop devices', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockSessionEvents);

      const result = await service.getRecordings({});

      expect(result.recordings[0].deviceType).toBe('desktop');
    });
  });
});
