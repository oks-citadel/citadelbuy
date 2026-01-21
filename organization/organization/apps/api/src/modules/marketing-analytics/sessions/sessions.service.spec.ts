import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { MarketingEventType } from '../constants/event-types';

describe('SessionsService', () => {
  let service: SessionsService;
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
  };

  // Mock data
  const mockSessionId = 'session-123';
  const mockUserId = 'user-123';
  const baseTimestamp = new Date('2025-01-15T10:00:00.000Z');

  const mockEvents = [
    {
      id: 'event-1',
      sessionId: mockSessionId,
      userId: mockUserId,
      eventType: MarketingEventType.PAGE_VIEW,
      timestamp: baseTimestamp,
      page: '/home',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
      ipAddress: '192.168.1.1',
      properties: {},
      metadata: { utm: { utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'winter_sale' } },
    },
    {
      id: 'event-2',
      sessionId: mockSessionId,
      userId: mockUserId,
      eventType: MarketingEventType.PAGE_VIEW,
      timestamp: new Date(baseTimestamp.getTime() + 30000),
      page: '/products',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
      ipAddress: '192.168.1.1',
      properties: {},
      metadata: { utm: { utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'winter_sale' } },
    },
    {
      id: 'event-3',
      sessionId: mockSessionId,
      userId: mockUserId,
      eventType: MarketingEventType.PURCHASE,
      timestamp: new Date(baseTimestamp.getTime() + 120000),
      page: '/checkout',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
      ipAddress: '192.168.1.1',
      properties: { orderValue: 99.99 },
      metadata: { utm: { utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'winter_sale' } },
    },
  ];

  const mockBounceSession = [
    {
      id: 'event-4',
      sessionId: 'session-bounce',
      userId: 'user-456',
      eventType: MarketingEventType.PAGE_VIEW,
      timestamp: baseTimestamp,
      page: '/home',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile Safari',
      ipAddress: '192.168.1.2',
      properties: {},
      metadata: {},
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
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

    service = module.get<SessionsService>(SessionsService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSessionMetrics', () => {
    it('should return cached metrics if available', async () => {
      const cachedMetrics = {
        dateRange: { startDate: '2025-01-01', endDate: '2025-01-15' },
        totalSessions: 100,
        uniqueUsers: 80,
        newSessions: 50,
        returningSessions: 30,
        totalPageViews: 500,
        avgPagesPerSession: 5,
        avgSessionDuration: 180,
        bounceRate: 25.5,
        conversionRate: 3.5,
        byDeviceType: { desktop: 60, mobile: 30, tablet: 10 },
        bySource: { google: 50, direct: 30, facebook: 20 },
        byCountry: { Unknown: 100 },
        dailyTrend: [],
        hourlyDistribution: {},
      };
      mockRedisService.get.mockResolvedValue(cachedMetrics);

      const result = await service.getSessionMetrics({});

      expect(result).toEqual(cachedMetrics);
      expect(mockPrismaService.analyticsEvent.findMany).not.toHaveBeenCalled();
    });

    it('should calculate metrics when cache is empty', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany
        .mockResolvedValueOnce(mockEvents) // Main events query
        .mockResolvedValueOnce([]); // Previous sessions query for returning users

      const result = await service.getSessionMetrics({
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      expect(result).toHaveProperty('totalSessions');
      expect(result).toHaveProperty('uniqueUsers');
      expect(result).toHaveProperty('totalPageViews');
      expect(result).toHaveProperty('avgPagesPerSession');
      expect(result).toHaveProperty('avgSessionDuration');
      expect(result).toHaveProperty('bounceRate');
      expect(result).toHaveProperty('conversionRate');
      expect(result).toHaveProperty('byDeviceType');
      expect(result).toHaveProperty('bySource');
      expect(result.totalSessions).toBe(1);
      expect(result.totalPageViews).toBe(2); // Two PAGE_VIEW events
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should correctly calculate bounce rate', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany
        .mockResolvedValueOnce([...mockEvents, ...mockBounceSession])
        .mockResolvedValueOnce([]);

      const result = await service.getSessionMetrics({});

      // 2 sessions total, 1 bounce (session with only 1 page view)
      expect(result.totalSessions).toBe(2);
      expect(result.bounceRate).toBe(50); // 1 bounce out of 2 sessions
    });

    it('should correctly identify device types', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany
        .mockResolvedValueOnce([...mockEvents, ...mockBounceSession])
        .mockResolvedValueOnce([]);

      const result = await service.getSessionMetrics({});

      expect(result.byDeviceType).toHaveProperty('desktop');
      expect(result.byDeviceType).toHaveProperty('mobile');
      expect(result.byDeviceType.desktop).toBe(1);
      expect(result.byDeviceType.mobile).toBe(1);
    });

    it('should correctly parse traffic sources from UTM data', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany
        .mockResolvedValueOnce(mockEvents)
        .mockResolvedValueOnce([]);

      const result = await service.getSessionMetrics({});

      expect(result.bySource).toHaveProperty('google');
      expect(result.bySource.google).toBe(1);
    });

    it('should use default date range when not provided', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getSessionMetrics({});

      expect(result.dateRange).toBeDefined();
      expect(result.dateRange.startDate).toBeDefined();
      expect(result.dateRange.endDate).toBeDefined();
    });

    it('should correctly identify returning users', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany
        .mockResolvedValueOnce(mockEvents)
        .mockResolvedValueOnce([{ userId: mockUserId }]); // User had previous sessions

      const result = await service.getSessionMetrics({});

      expect(result.newSessions).toBe(0);
      expect(result.returningSessions).toBe(1);
    });
  });

  describe('listSessions', () => {
    it('should return paginated list of sessions', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockEvents);

      const result = await service.listSessions({ page: 1, limit: 10 });

      expect(result).toHaveProperty('sessions');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.sessions.length).toBeGreaterThan(0);
    });

    it('should filter by userId when provided', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockEvents);

      await service.listSessions({ userId: mockUserId });

      expect(mockPrismaService.analyticsEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
          }),
        }),
      );
    });

    it('should filter by convertedOnly when provided', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([
        ...mockEvents,
        ...mockBounceSession,
      ]);

      const result = await service.listSessions({ convertedOnly: true });

      // Only session with PURCHASE event should be included
      expect(result.sessions.every(s => s.converted)).toBe(true);
    });

    it('should filter by deviceType when provided', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([
        ...mockEvents,
        ...mockBounceSession,
      ]);

      const result = await service.listSessions({ deviceType: 'desktop' });

      expect(result.sessions.every(s => s.deviceType === 'desktop')).toBe(true);
    });

    it('should filter by source when provided', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockEvents);

      const result = await service.listSessions({ source: 'google' });

      expect(result.sessions.every(s => s.source === 'google')).toBe(true);
    });

    it('should correctly calculate session details', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockEvents);

      const result = await service.listSessions({});

      const session = result.sessions[0];
      expect(session).toHaveProperty('sessionId', mockSessionId);
      expect(session).toHaveProperty('userId', mockUserId);
      expect(session).toHaveProperty('startTime');
      expect(session).toHaveProperty('endTime');
      expect(session).toHaveProperty('durationSeconds');
      expect(session).toHaveProperty('pageViews');
      expect(session).toHaveProperty('converted');
      expect(session).toHaveProperty('deviceType');
      expect(session).toHaveProperty('browser');
      expect(session).toHaveProperty('os');
      expect(session).toHaveProperty('landingPage');
      expect(session).toHaveProperty('exitPage');
    });

    it('should handle empty results', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.listSessions({});

      expect(result.sessions).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getSession', () => {
    it('should return session details for valid sessionId', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockEvents);

      const result = await service.getSession(mockSessionId);

      expect(result).toHaveProperty('sessionId', mockSessionId);
      expect(result).toHaveProperty('userId', mockUserId);
      expect(result).toHaveProperty('startTime');
      expect(result).toHaveProperty('endTime');
      expect(result).toHaveProperty('durationSeconds');
      expect(result).toHaveProperty('eventCount', 3);
      expect(result).toHaveProperty('pageViews', 2);
      expect(result).toHaveProperty('converted', true);
      expect(result).toHaveProperty('conversionValue', 99.99);
    });

    it('should throw NotFoundException for non-existent session', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);

      await expect(service.getSession('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should correctly identify bounce session', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockBounceSession);

      const result = await service.getSession('session-bounce');

      expect(result.isBounce).toBe(true);
      expect(result.pageViews).toBe(1);
    });

    it('should correctly parse browser and OS', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockEvents);

      const result = await service.getSession(mockSessionId);

      expect(result.browser).toBe('Chrome');
      expect(result.os).toBe('Windows');
    });
  });

  describe('getSessionEvents', () => {
    it('should return all events for a session', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockEvents);

      const result = await service.getSessionEvents(mockSessionId);

      expect(result).toHaveProperty('sessionId', mockSessionId);
      expect(result).toHaveProperty('totalEvents', 3);
      expect(result).toHaveProperty('events');
      expect(result.events.length).toBe(3);
    });

    it('should throw NotFoundException for non-existent session', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);

      await expect(service.getSessionEvents('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should return events in chronological order', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockEvents);

      const result = await service.getSessionEvents(mockSessionId);

      const timestamps = result.events.map(e => new Date(e.timestamp).getTime());
      expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
    });

    it('should include event properties', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockEvents);

      const result = await service.getSessionEvents(mockSessionId);

      const purchaseEvent = result.events.find(e => e.eventType === MarketingEventType.PURCHASE);
      expect(purchaseEvent).toBeDefined();
      expect(purchaseEvent?.properties).toHaveProperty('orderValue', 99.99);
    });
  });

  describe('parseDeviceType', () => {
    it('should identify mobile devices', async () => {
      const mobileEvents = [{
        ...mockEvents[0],
        sessionId: 'mobile-session',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      }];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mobileEvents);

      const result = await service.getSession('mobile-session');

      expect(result.deviceType).toBe('mobile');
    });

    it('should identify tablet devices', async () => {
      const tabletEvents = [{
        ...mockEvents[0],
        sessionId: 'tablet-session',
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/605.1',
      }];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(tabletEvents);

      const result = await service.getSession('tablet-session');

      expect(result.deviceType).toBe('tablet');
    });

    it('should identify desktop devices', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockEvents);

      const result = await service.getSession(mockSessionId);

      expect(result.deviceType).toBe('desktop');
    });

    it('should return unknown for missing user agent', async () => {
      const noAgentEvents = [{
        ...mockEvents[0],
        sessionId: 'no-agent',
        userAgent: null,
      }];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(noAgentEvents);

      const result = await service.getSession('no-agent');

      expect(result.deviceType).toBe('unknown');
    });
  });

  describe('parseBrowser', () => {
    it('should identify Chrome browser', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockEvents);

      const result = await service.getSession(mockSessionId);

      expect(result.browser).toBe('Chrome');
    });

    it('should identify Firefox browser', async () => {
      const firefoxEvents = [{
        ...mockEvents[0],
        sessionId: 'firefox-session',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      }];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(firefoxEvents);

      const result = await service.getSession('firefox-session');

      expect(result.browser).toBe('Firefox');
    });

    it('should identify Safari browser', async () => {
      const safariEvents = [{
        ...mockEvents[0],
        sessionId: 'safari-session',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 Version/17.2 Safari/605.1.15',
      }];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(safariEvents);

      const result = await service.getSession('safari-session');

      expect(result.browser).toBe('Safari');
    });

    it('should identify Edge browser', async () => {
      const edgeEvents = [{
        ...mockEvents[0],
        sessionId: 'edge-session',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Edg/120.0.0.0',
      }];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(edgeEvents);

      const result = await service.getSession('edge-session');

      expect(result.browser).toBe('Edge');
    });
  });

  describe('parseOS', () => {
    it('should identify Windows OS', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockEvents);

      const result = await service.getSession(mockSessionId);

      expect(result.os).toBe('Windows');
    });

    it('should identify macOS', async () => {
      const macEvents = [{
        ...mockEvents[0],
        sessionId: 'mac-session',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/537.36 Chrome/120.0.0.0',
      }];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(macEvents);

      const result = await service.getSession('mac-session');

      expect(result.os).toBe('macOS');
    });

    it('should identify iOS', async () => {
      const iosEvents = [{
        ...mockEvents[0],
        sessionId: 'ios-session',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      }];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(iosEvents);

      const result = await service.getSession('ios-session');

      expect(result.os).toBe('iOS');
    });

    it('should identify Android OS', async () => {
      const androidEvents = [{
        ...mockEvents[0],
        sessionId: 'android-session',
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile',
      }];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(androidEvents);

      const result = await service.getSession('android-session');

      expect(result.os).toBe('Android');
    });
  });

  describe('parseSource', () => {
    it('should return utm_source when available', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockEvents);

      const result = await service.getSession(mockSessionId);

      expect(result.source).toBe('google');
    });

    it('should return direct when no utm data', async () => {
      const noUtmEvents = [{
        ...mockEvents[0],
        sessionId: 'no-utm',
        metadata: {},
      }];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(noUtmEvents);

      const result = await service.getSession('no-utm');

      expect(result.source).toBe('direct');
    });
  });
});
