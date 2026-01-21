import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeService } from './realtime.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { MarketingEventType } from '../constants/event-types';

describe('RealtimeService', () => {
  let service: RealtimeService;
  let prisma: PrismaService;
  let redis: RedisService;

  const mockPrismaService = {
    analyticsEvent: {
      findMany: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    exists: jest.fn(),
    lpush: jest.fn(),
    lrange: jest.fn(),
  };

  // Mock data
  const baseTimestamp = Date.now();
  const mockUserId = 'user-123';
  const mockSessionId = 'session-123';

  const mockActiveUsers = {
    'user-1': {
      lastActivity: baseTimestamp - 60000, // 1 minute ago
      currentPage: '/home',
      deviceType: 'desktop',
      country: 'US',
      source: 'google',
      isAuthenticated: true,
    },
    'user-2': {
      lastActivity: baseTimestamp - 120000, // 2 minutes ago
      currentPage: '/products',
      deviceType: 'mobile',
      country: 'UK',
      source: 'direct',
      isAuthenticated: false,
    },
    'user-3': {
      lastActivity: baseTimestamp - 600000, // 10 minutes ago (outside 5 min window)
      currentPage: '/checkout',
      deviceType: 'tablet',
      country: 'CA',
      source: 'facebook',
      isAuthenticated: true,
    },
  };

  const mockRecentEvents = [
    JSON.stringify({
      eventId: 'event-1',
      eventType: MarketingEventType.PAGE_VIEW,
      userId: 'user-1',
      sessionId: 'session-1',
      timestamp: new Date(baseTimestamp - 10000).toISOString(),
      page: '/home',
      properties: {},
    }),
    JSON.stringify({
      eventId: 'event-2',
      eventType: MarketingEventType.PRODUCT_VIEWED,
      userId: 'user-2',
      sessionId: 'session-2',
      timestamp: new Date(baseTimestamp - 20000).toISOString(),
      page: '/products/123',
      properties: { productId: 'product-123' },
    }),
    JSON.stringify({
      eventId: 'event-3',
      eventType: MarketingEventType.PURCHASE,
      userId: 'user-3',
      sessionId: 'session-3',
      timestamp: new Date(baseTimestamp - 30000).toISOString(),
      page: '/checkout',
      properties: { orderId: 'order-123', orderValue: 99.99 },
    }),
  ];

  const mockHourlyMetrics = {
    conversions: 15,
    revenue: 1499.99,
    lastReset: baseTimestamp - 1800000, // 30 minutes ago
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeService,
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

    service = module.get<RealtimeService>(RealtimeService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize metrics on startup', async () => {
      mockRedisService.exists.mockResolvedValue(false);
      mockRedisService.set.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockRedisService.exists).toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should not reinitialize if metrics already exist', async () => {
      mockRedisService.exists.mockResolvedValue(true);

      await service.onModuleInit();

      expect(mockRedisService.exists).toHaveBeenCalled();
      expect(mockRedisService.set).not.toHaveBeenCalled();
    });
  });

  describe('getActiveUsers', () => {
    it('should return active users within window', async () => {
      mockRedisService.get.mockResolvedValue(mockActiveUsers);

      const result = await service.getActiveUsers({ windowMinutes: 5 });

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('windowMinutes', 5);
      expect(result).toHaveProperty('activeUsers');
      expect(result).toHaveProperty('authenticatedUsers');
      expect(result).toHaveProperty('anonymousUsers');
      expect(result).toHaveProperty('byPage');
      expect(result).toHaveProperty('byDeviceType');
      expect(result).toHaveProperty('byCountry');
      expect(result).toHaveProperty('bySource');
      expect(result).toHaveProperty('users');
    });

    it('should filter users outside the time window', async () => {
      mockRedisService.get.mockResolvedValue(mockActiveUsers);

      const result = await service.getActiveUsers({ windowMinutes: 5 });

      // user-3 is 10 minutes old, should be filtered out
      expect(result.activeUsers).toBe(2);
    });

    it('should aggregate by page correctly', async () => {
      mockRedisService.get.mockResolvedValue(mockActiveUsers);

      const result = await service.getActiveUsers({ windowMinutes: 5 });

      expect(result.byPage).toHaveProperty('/home', 1);
      expect(result.byPage).toHaveProperty('/products', 1);
    });

    it('should aggregate by device type correctly', async () => {
      mockRedisService.get.mockResolvedValue(mockActiveUsers);

      const result = await service.getActiveUsers({ windowMinutes: 5 });

      expect(result.byDeviceType).toHaveProperty('desktop', 1);
      expect(result.byDeviceType).toHaveProperty('mobile', 1);
    });

    it('should aggregate by country correctly', async () => {
      mockRedisService.get.mockResolvedValue(mockActiveUsers);

      const result = await service.getActiveUsers({ windowMinutes: 5 });

      expect(result.byCountry).toHaveProperty('US', 1);
      expect(result.byCountry).toHaveProperty('UK', 1);
    });

    it('should aggregate by source correctly', async () => {
      mockRedisService.get.mockResolvedValue(mockActiveUsers);

      const result = await service.getActiveUsers({ windowMinutes: 5 });

      expect(result.bySource).toHaveProperty('google', 1);
      expect(result.bySource).toHaveProperty('direct', 1);
    });

    it('should count authenticated vs anonymous users', async () => {
      mockRedisService.get.mockResolvedValue(mockActiveUsers);

      const result = await service.getActiveUsers({ windowMinutes: 5 });

      expect(result.authenticatedUsers).toBe(1); // user-1 within window
      expect(result.anonymousUsers).toBe(1); // user-2 within window
    });

    it('should use default window of 5 minutes', async () => {
      mockRedisService.get.mockResolvedValue(mockActiveUsers);

      const result = await service.getActiveUsers({});

      expect(result.windowMinutes).toBe(5);
    });

    it('should limit users in response', async () => {
      mockRedisService.get.mockResolvedValue(mockActiveUsers);

      const result = await service.getActiveUsers({ windowMinutes: 5 });

      expect(result.users.length).toBeLessThanOrEqual(100);
    });

    it('should handle empty active users', async () => {
      mockRedisService.get.mockResolvedValue({});

      const result = await service.getActiveUsers({ windowMinutes: 5 });

      expect(result.activeUsers).toBe(0);
      expect(result.users).toEqual([]);
    });

    it('should handle null active users from Redis', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.getActiveUsers({ windowMinutes: 5 });

      expect(result.activeUsers).toBe(0);
    });
  });

  describe('getRecentEvents', () => {
    it('should return recent events', async () => {
      mockRedisService.lrange.mockResolvedValue(mockRecentEvents);

      const result = await service.getRecentEvents({ limit: 100 });

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('totalEvents');
      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('eventsPerSecond');
      expect(result).toHaveProperty('byType');
    });

    it('should filter by eventType when provided', async () => {
      mockRedisService.lrange.mockResolvedValue(mockRecentEvents);

      const result = await service.getRecentEvents({
        eventType: MarketingEventType.PAGE_VIEW,
      });

      expect(result.events.every(e => e.eventType === MarketingEventType.PAGE_VIEW)).toBe(true);
    });

    it('should filter by userId when provided', async () => {
      mockRedisService.lrange.mockResolvedValue(mockRecentEvents);

      const result = await service.getRecentEvents({
        userId: 'user-1',
      });

      expect(result.events.every(e => e.userId === 'user-1')).toBe(true);
    });

    it('should aggregate events by type', async () => {
      mockRedisService.lrange.mockResolvedValue(mockRecentEvents);

      const result = await service.getRecentEvents({ limit: 100 });

      expect(result.byType).toHaveProperty(MarketingEventType.PAGE_VIEW);
      expect(result.byType).toHaveProperty(MarketingEventType.PRODUCT_VIEWED);
      expect(result.byType).toHaveProperty(MarketingEventType.PURCHASE);
    });

    it('should calculate events per second', async () => {
      mockRedisService.lrange.mockResolvedValue(mockRecentEvents);

      const result = await service.getRecentEvents({ limit: 100 });

      expect(typeof result.eventsPerSecond).toBe('number');
      expect(result.eventsPerSecond).toBeGreaterThanOrEqual(0);
    });

    it('should use default limit of 100', async () => {
      mockRedisService.lrange.mockResolvedValue(mockRecentEvents);

      const result = await service.getRecentEvents({});

      expect(result.events.length).toBeLessThanOrEqual(100);
    });

    it('should handle empty events', async () => {
      mockRedisService.lrange.mockResolvedValue([]);

      const result = await service.getRecentEvents({});

      expect(result.totalEvents).toBe(0);
      expect(result.events).toEqual([]);
      expect(result.eventsPerSecond).toBe(0);
    });

    it('should skip invalid JSON entries', async () => {
      mockRedisService.lrange.mockResolvedValue([
        'invalid json',
        mockRecentEvents[0],
      ]);

      const result = await service.getRecentEvents({});

      expect(result.totalEvents).toBe(1);
    });
  });

  describe('getMetricsSnapshot', () => {
    it('should return comprehensive metrics snapshot', async () => {
      mockRedisService.get.mockImplementation((key: string) => {
        if (key.includes('active_users')) return mockActiveUsers;
        if (key.includes('hourly_metrics')) return mockHourlyMetrics;
        return null;
      });
      mockRedisService.lrange.mockResolvedValue(mockRecentEvents);

      const result = await service.getMetricsSnapshot();

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('activeUsers');
      expect(result).toHaveProperty('pageViewsPerMinute');
      expect(result).toHaveProperty('eventsPerSecond');
      expect(result).toHaveProperty('conversionsLastHour');
      expect(result).toHaveProperty('revenueLastHour');
      expect(result).toHaveProperty('topPages');
      expect(result).toHaveProperty('topEvents');
    });

    it('should include top pages by active users', async () => {
      mockRedisService.get.mockImplementation((key: string) => {
        if (key.includes('active_users')) return mockActiveUsers;
        if (key.includes('hourly_metrics')) return mockHourlyMetrics;
        return null;
      });
      mockRedisService.lrange.mockResolvedValue(mockRecentEvents);

      const result = await service.getMetricsSnapshot();

      expect(Array.isArray(result.topPages)).toBe(true);
      expect(result.topPages.length).toBeLessThanOrEqual(5);
      if (result.topPages.length > 0) {
        expect(result.topPages[0]).toHaveProperty('page');
        expect(result.topPages[0]).toHaveProperty('activeUsers');
      }
    });

    it('should include top events by count', async () => {
      mockRedisService.get.mockImplementation((key: string) => {
        if (key.includes('active_users')) return mockActiveUsers;
        if (key.includes('hourly_metrics')) return mockHourlyMetrics;
        return null;
      });
      mockRedisService.lrange.mockResolvedValue(mockRecentEvents);

      const result = await service.getMetricsSnapshot();

      expect(Array.isArray(result.topEvents)).toBe(true);
      expect(result.topEvents.length).toBeLessThanOrEqual(5);
      if (result.topEvents.length > 0) {
        expect(result.topEvents[0]).toHaveProperty('eventType');
        expect(result.topEvents[0]).toHaveProperty('count');
      }
    });

    it('should include hourly conversion data', async () => {
      mockRedisService.get.mockImplementation((key: string) => {
        if (key.includes('active_users')) return mockActiveUsers;
        if (key.includes('hourly_metrics')) return mockHourlyMetrics;
        return null;
      });
      mockRedisService.lrange.mockResolvedValue(mockRecentEvents);

      const result = await service.getMetricsSnapshot();

      expect(result.conversionsLastHour).toBe(15);
      expect(result.revenueLastHour).toBe(1499.99);
    });

    it('should handle missing hourly metrics', async () => {
      mockRedisService.get.mockImplementation((key: string) => {
        if (key.includes('active_users')) return mockActiveUsers;
        return null;
      });
      mockRedisService.lrange.mockResolvedValue(mockRecentEvents);

      const result = await service.getMetricsSnapshot();

      expect(result.conversionsLastHour).toBe(0);
      expect(result.revenueLastHour).toBe(0);
    });
  });

  describe('trackUserActivity', () => {
    it('should update user activity data', async () => {
      mockRedisService.get.mockResolvedValue({});
      mockRedisService.set.mockResolvedValue(undefined);

      await service.trackUserActivity(mockUserId, {
        currentPage: '/products',
        deviceType: 'desktop',
        country: 'US',
        source: 'google',
        isAuthenticated: true,
      });

      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          [mockUserId]: expect.objectContaining({
            lastActivity: expect.any(Number),
            currentPage: '/products',
            deviceType: 'desktop',
          }),
        }),
        expect.any(Number),
      );
    });

    it('should merge with existing active users', async () => {
      mockRedisService.get.mockResolvedValue({ 'existing-user': { lastActivity: Date.now() } });
      mockRedisService.set.mockResolvedValue(undefined);

      await service.trackUserActivity(mockUserId, {
        currentPage: '/products',
        isAuthenticated: true,
      });

      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          'existing-user': expect.any(Object),
          [mockUserId]: expect.any(Object),
        }),
        expect.any(Number),
      );
    });

    it('should clean up old user entries', async () => {
      const oldUser = {
        lastActivity: Date.now() - 600000, // 10 minutes ago
        currentPage: '/old-page',
        isAuthenticated: false,
      };
      mockRedisService.get.mockResolvedValue({ 'old-user': oldUser });
      mockRedisService.set.mockResolvedValue(undefined);

      await service.trackUserActivity(mockUserId, {
        currentPage: '/products',
        isAuthenticated: true,
      });

      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.not.objectContaining({
          'old-user': expect.any(Object),
        }),
        expect.any(Number),
      );
    });
  });

  describe('addRecentEvent', () => {
    it('should add event to recent events list', async () => {
      mockRedisService.lpush.mockResolvedValue(1);

      await service.addRecentEvent({
        eventId: 'event-123',
        eventType: MarketingEventType.PAGE_VIEW,
        userId: mockUserId,
        sessionId: mockSessionId,
        timestamp: new Date().toISOString(),
        page: '/home',
        properties: {},
      });

      expect(mockRedisService.lpush).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
      );
    });

    it('should serialize event as JSON', async () => {
      mockRedisService.lpush.mockResolvedValue(1);
      const event = {
        eventId: 'event-123',
        eventType: MarketingEventType.PAGE_VIEW,
        userId: mockUserId,
        sessionId: mockSessionId,
        timestamp: new Date().toISOString(),
        page: '/home',
        properties: { key: 'value' },
      };

      await service.addRecentEvent(event);

      expect(mockRedisService.lpush).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(event),
      );
    });
  });

  describe('trackConversion', () => {
    it('should increment conversion count', async () => {
      mockRedisService.get.mockResolvedValue(mockHourlyMetrics);
      mockRedisService.set.mockResolvedValue(undefined);

      await service.trackConversion(99.99);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          conversions: 16,
          revenue: 1599.98,
        }),
        expect.any(Number),
      );
    });

    it('should add conversion value to revenue', async () => {
      mockRedisService.get.mockResolvedValue(mockHourlyMetrics);
      mockRedisService.set.mockResolvedValue(undefined);

      await service.trackConversion(50.00);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          revenue: 1549.99,
        }),
        expect.any(Number),
      );
    });

    it('should reset metrics if more than an hour old', async () => {
      const oldMetrics = {
        conversions: 100,
        revenue: 10000,
        lastReset: Date.now() - 4000000, // More than an hour ago
      };
      mockRedisService.get.mockResolvedValue(oldMetrics);
      mockRedisService.set.mockResolvedValue(undefined);

      await service.trackConversion(99.99);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          conversions: 1,
          revenue: 99.99,
        }),
        expect.any(Number),
      );
    });

    it('should initialize metrics if not present', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue(undefined);

      await service.trackConversion(99.99);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          conversions: 1,
          revenue: 99.99,
        }),
        expect.any(Number),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle users with missing optional fields', async () => {
      const usersWithMissingFields = {
        'user-1': {
          lastActivity: Date.now(),
          currentPage: '/home',
          isAuthenticated: false,
          // Missing: deviceType, country, source
        },
      };
      mockRedisService.get.mockResolvedValue(usersWithMissingFields);

      const result = await service.getActiveUsers({ windowMinutes: 5 });

      expect(result.activeUsers).toBe(1);
      expect(result.byDeviceType).toHaveProperty('unknown', 1);
      expect(result.byCountry).toHaveProperty('Unknown', 1);
      expect(result.bySource).toHaveProperty('direct', 1);
    });

    it('should handle zero events per second calculation', async () => {
      const singleEvent = [mockRecentEvents[0]];
      mockRedisService.lrange.mockResolvedValue(singleEvent);

      const result = await service.getRecentEvents({});

      expect(result.eventsPerSecond).toBe(0);
    });

    it('should handle events with missing page', async () => {
      const eventWithoutPage = JSON.stringify({
        eventId: 'event-no-page',
        eventType: MarketingEventType.PURCHASE,
        userId: 'user-1',
        sessionId: 'session-1',
        timestamp: new Date().toISOString(),
        properties: {},
      });
      mockRedisService.lrange.mockResolvedValue([eventWithoutPage]);

      const result = await service.getRecentEvents({});

      expect(result.totalEvents).toBe(1);
      expect(result.events[0].page).toBeUndefined();
    });
  });
});
