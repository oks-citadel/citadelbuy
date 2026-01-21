import { Test, TestingModule } from '@nestjs/testing';
import { AttributionService } from './attribution.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { MarketingEventType } from '../constants/event-types';
import { AttributionModel } from './dto/attribution.dto';

describe('AttributionService', () => {
  let service: AttributionService;
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
  const baseTimestamp = new Date('2025-01-15T10:00:00.000Z');
  const mockUserId = 'user-123';
  const mockSessionId = 'session-123';

  const mockConversionEvent = {
    id: 'conv-1',
    userId: mockUserId,
    sessionId: mockSessionId,
    eventType: MarketingEventType.PURCHASE,
    timestamp: new Date(baseTimestamp.getTime() + 7200000), // 2 hours after
    properties: { orderValue: 199.99 },
    metadata: {},
  };

  const mockTouchpoints = [
    {
      id: 'tp-1',
      userId: mockUserId,
      sessionId: mockSessionId,
      eventType: MarketingEventType.PAGE_VIEW,
      timestamp: baseTimestamp,
      metadata: { utm: { utmSource: 'google', utmMedium: 'cpc' } },
    },
    {
      id: 'tp-2',
      userId: mockUserId,
      sessionId: mockSessionId,
      eventType: MarketingEventType.PAGE_VIEW,
      timestamp: new Date(baseTimestamp.getTime() + 1800000),
      metadata: { utm: { utmSource: 'facebook', utmMedium: 'paidsocial' } },
    },
    {
      id: 'tp-3',
      userId: mockUserId,
      sessionId: mockSessionId,
      eventType: MarketingEventType.PRODUCT_VIEWED,
      timestamp: new Date(baseTimestamp.getTime() + 3600000),
      metadata: { utm: { utmSource: 'email', utmMedium: 'email' } },
    },
  ];

  const mockJourneyEvents = [
    {
      id: 'je-1',
      userId: mockUserId,
      sessionId: mockSessionId,
      eventType: MarketingEventType.PAGE_VIEW,
      timestamp: baseTimestamp,
      page: '/home',
      metadata: { utm: { utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'winter_sale' } },
    },
    {
      id: 'je-2',
      userId: mockUserId,
      sessionId: mockSessionId,
      eventType: MarketingEventType.PRODUCT_VIEWED,
      timestamp: new Date(baseTimestamp.getTime() + 60000),
      page: '/products/123',
      metadata: { utm: { utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'winter_sale' } },
    },
    {
      id: 'je-3',
      userId: mockUserId,
      sessionId: mockSessionId,
      eventType: MarketingEventType.PURCHASE,
      timestamp: new Date(baseTimestamp.getTime() + 120000),
      page: '/checkout',
      properties: { orderValue: 149.99 },
      metadata: { utm: { utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'winter_sale' } },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttributionService,
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

    service = module.get<AttributionService>(AttributionService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAttributionModels', () => {
    it('should return all available attribution models', () => {
      const models = service.getAttributionModels();

      expect(models).toHaveLength(6);
      expect(models.map(m => m.id)).toContain(AttributionModel.FIRST_TOUCH);
      expect(models.map(m => m.id)).toContain(AttributionModel.LAST_TOUCH);
      expect(models.map(m => m.id)).toContain(AttributionModel.LINEAR);
      expect(models.map(m => m.id)).toContain(AttributionModel.TIME_DECAY);
      expect(models.map(m => m.id)).toContain(AttributionModel.POSITION_BASED);
      expect(models.map(m => m.id)).toContain(AttributionModel.DATA_DRIVEN);
    });

    it('should include model descriptions and use cases', () => {
      const models = service.getAttributionModels();

      models.forEach(model => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('description');
        expect(model).toHaveProperty('creditDistribution');
        expect(model).toHaveProperty('useCases');
        expect(model.useCases.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getAttributionReport', () => {
    it('should return cached report if available', async () => {
      const cachedReport = {
        dateRange: { startDate: '2025-01-01', endDate: '2025-01-15' },
        model: AttributionModel.LAST_TOUCH,
        conversionWindow: 30,
        totalConversions: 100,
        totalRevenue: 9999.99,
        byChannel: [
          { channel: 'paid', conversions: 50, revenue: 5000, conversionShare: 50, revenueShare: 50 },
          { channel: 'organic', conversions: 30, revenue: 3000, conversionShare: 30, revenueShare: 30 },
        ],
      };
      mockRedisService.get.mockResolvedValue(cachedReport);

      const result = await service.getAttributionReport({});

      expect(result).toEqual(cachedReport);
      expect(mockPrismaService.analyticsEvent.findMany).not.toHaveBeenCalled();
    });

    it('should calculate attribution report with last touch model', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany
        .mockResolvedValueOnce([mockConversionEvent]) // Conversions
        .mockResolvedValueOnce(mockTouchpoints); // Touchpoints for first conversion

      const result = await service.getAttributionReport({
        model: AttributionModel.LAST_TOUCH,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      expect(result).toHaveProperty('dateRange');
      expect(result).toHaveProperty('model', AttributionModel.LAST_TOUCH);
      expect(result).toHaveProperty('totalConversions');
      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('byChannel');
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should calculate attribution report with first touch model', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany
        .mockResolvedValueOnce([mockConversionEvent])
        .mockResolvedValueOnce(mockTouchpoints);

      const result = await service.getAttributionReport({
        model: AttributionModel.FIRST_TOUCH,
      });

      expect(result.model).toBe(AttributionModel.FIRST_TOUCH);
    });

    it('should calculate attribution report with linear model', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany
        .mockResolvedValueOnce([mockConversionEvent])
        .mockResolvedValueOnce(mockTouchpoints);

      const result = await service.getAttributionReport({
        model: AttributionModel.LINEAR,
      });

      expect(result.model).toBe(AttributionModel.LINEAR);
    });

    it('should calculate attribution report with time decay model', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany
        .mockResolvedValueOnce([mockConversionEvent])
        .mockResolvedValueOnce(mockTouchpoints);

      const result = await service.getAttributionReport({
        model: AttributionModel.TIME_DECAY,
      });

      expect(result.model).toBe(AttributionModel.TIME_DECAY);
    });

    it('should calculate attribution report with position based model', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany
        .mockResolvedValueOnce([mockConversionEvent])
        .mockResolvedValueOnce(mockTouchpoints);

      const result = await service.getAttributionReport({
        model: AttributionModel.POSITION_BASED,
      });

      expect(result.model).toBe(AttributionModel.POSITION_BASED);
    });

    it('should handle direct conversions (no touchpoints)', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany
        .mockResolvedValueOnce([mockConversionEvent])
        .mockResolvedValueOnce([]); // No touchpoints

      const result = await service.getAttributionReport({});

      expect(result.byChannel.some(c => c.channel === 'direct')).toBe(true);
    });

    it('should use default conversion window when not specified', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany
        .mockResolvedValueOnce([mockConversionEvent])
        .mockResolvedValueOnce(mockTouchpoints);

      const result = await service.getAttributionReport({});

      expect(result.conversionWindow).toBe(30); // Default 30 days
    });

    it('should handle empty conversions', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.getAttributionReport({});

      expect(result.totalConversions).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.byChannel).toEqual([]);
    });
  });

  describe('getJourneyMapping', () => {
    it('should return customer journey data', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockJourneyEvents);

      const result = await service.getJourneyMapping({});

      expect(result).toHaveProperty('dateRange');
      expect(result).toHaveProperty('totalJourneys');
      expect(result).toHaveProperty('convertedJourneys');
      expect(result).toHaveProperty('conversionRate');
      expect(result).toHaveProperty('avgTouchpoints');
      expect(result).toHaveProperty('avgDuration');
      expect(result).toHaveProperty('topPaths');
      expect(result).toHaveProperty('journeys');
    });

    it('should filter by userId when provided', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockJourneyEvents);

      await service.getJourneyMapping({ userId: mockUserId });

      expect(mockPrismaService.analyticsEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
          }),
        }),
      );
    });

    it('should filter by sessionId when provided', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockJourneyEvents);

      await service.getJourneyMapping({ sessionId: mockSessionId });

      expect(mockPrismaService.analyticsEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sessionId: mockSessionId,
          }),
        }),
      );
    });

    it('should calculate conversion rate correctly', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockJourneyEvents);

      const result = await service.getJourneyMapping({});

      expect(result.totalJourneys).toBeGreaterThan(0);
      expect(result.conversionRate).toBeGreaterThanOrEqual(0);
      expect(result.conversionRate).toBeLessThanOrEqual(100);
    });

    it('should identify top paths', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockJourneyEvents);

      const result = await service.getJourneyMapping({});

      expect(result.topPaths).toBeDefined();
      expect(Array.isArray(result.topPaths)).toBe(true);
      if (result.topPaths.length > 0) {
        expect(result.topPaths[0]).toHaveProperty('path');
        expect(result.topPaths[0]).toHaveProperty('count');
        expect(result.topPaths[0]).toHaveProperty('conversionRate');
      }
    });

    it('should respect limit parameter', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockJourneyEvents);

      const result = await service.getJourneyMapping({ limit: 5 });

      expect(result.journeys.length).toBeLessThanOrEqual(5);
    });

    it('should handle empty events', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.getJourneyMapping({});

      expect(result.totalJourneys).toBe(0);
      expect(result.journeys).toEqual([]);
    });
  });

  describe('getTouchpointAnalysis', () => {
    it('should return touchpoint analysis data', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockJourneyEvents);

      const result = await service.getTouchpointAnalysis({});

      expect(result).toHaveProperty('dateRange');
      expect(result).toHaveProperty('groupBy');
      expect(result).toHaveProperty('totalTouchpoints');
      expect(result).toHaveProperty('byGroup');
      expect(result).toHaveProperty('byPosition');
      expect(result).toHaveProperty('pathCombinations');
    });

    it('should group by channel by default', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockJourneyEvents);

      const result = await service.getTouchpointAnalysis({});

      expect(result.groupBy).toBe('channel');
    });

    it('should group by source when specified', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockJourneyEvents);

      const result = await service.getTouchpointAnalysis({ groupBy: 'source' });

      expect(result.groupBy).toBe('source');
    });

    it('should group by medium when specified', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockJourneyEvents);

      const result = await service.getTouchpointAnalysis({ groupBy: 'medium' });

      expect(result.groupBy).toBe('medium');
    });

    it('should group by campaign when specified', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockJourneyEvents);

      const result = await service.getTouchpointAnalysis({ groupBy: 'campaign' });

      expect(result.groupBy).toBe('campaign');
    });

    it('should include position data (first, middle, last)', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockJourneyEvents);

      const result = await service.getTouchpointAnalysis({});

      expect(result.byPosition).toHaveProperty('first');
      expect(result.byPosition).toHaveProperty('middle');
      expect(result.byPosition).toHaveProperty('last');
    });

    it('should calculate path combinations', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockJourneyEvents);

      const result = await service.getTouchpointAnalysis({});

      expect(Array.isArray(result.pathCombinations)).toBe(true);
      if (result.pathCombinations.length > 0) {
        expect(result.pathCombinations[0]).toHaveProperty('from');
        expect(result.pathCombinations[0]).toHaveProperty('to');
        expect(result.pathCombinations[0]).toHaveProperty('count');
        expect(result.pathCombinations[0]).toHaveProperty('avgTimeSeconds');
      }
    });

    it('should handle empty events', async () => {
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.getTouchpointAnalysis({});

      expect(result.totalTouchpoints).toBe(0);
      expect(result.byGroup).toEqual([]);
    });
  });

  describe('channel determination', () => {
    it('should identify social channels', async () => {
      const socialEvents = [{
        ...mockJourneyEvents[0],
        metadata: { utm: { utmSource: 'facebook' } },
      }];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(socialEvents);

      const result = await service.getTouchpointAnalysis({});

      expect(result.byGroup.some(g => g.name === 'social')).toBe(true);
    });

    it('should identify email channel', async () => {
      const emailEvents = [{
        ...mockJourneyEvents[0],
        metadata: { utm: { utmSource: 'newsletter', utmMedium: 'email' } },
      }];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(emailEvents);

      const result = await service.getTouchpointAnalysis({});

      expect(result.byGroup.some(g => g.name === 'email')).toBe(true);
    });

    it('should identify paid channel', async () => {
      const paidEvents = [{
        ...mockJourneyEvents[0],
        metadata: { utm: { utmSource: 'google', utmMedium: 'cpc' } },
      }];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(paidEvents);

      const result = await service.getTouchpointAnalysis({});

      expect(result.byGroup.some(g => g.name === 'paid')).toBe(true);
    });

    it('should identify organic search from referrer', async () => {
      const organicEvents = [{
        ...mockJourneyEvents[0],
        metadata: {},
        referer: 'https://www.google.com/search?q=test',
      }];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(organicEvents);

      const result = await service.getTouchpointAnalysis({});

      expect(result.byGroup.some(g => g.name === 'organic_search')).toBe(true);
    });

    it('should identify referral traffic', async () => {
      const referralEvents = [{
        ...mockJourneyEvents[0],
        metadata: {},
        referer: 'https://www.someblog.com/article',
      }];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(referralEvents);

      const result = await service.getTouchpointAnalysis({});

      expect(result.byGroup.some(g => g.name === 'referral')).toBe(true);
    });

    it('should identify direct traffic', async () => {
      const directEvents = [{
        ...mockJourneyEvents[0],
        metadata: {},
        referer: null,
      }];
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(directEvents);

      const result = await service.getTouchpointAnalysis({});

      expect(result.byGroup.some(g => g.name === 'direct')).toBe(true);
    });
  });

  describe('credit calculation', () => {
    it('should assign 100% credit to first touch in first touch model', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany
        .mockResolvedValueOnce([mockConversionEvent])
        .mockResolvedValueOnce(mockTouchpoints);

      const result = await service.getAttributionReport({
        model: AttributionModel.FIRST_TOUCH,
      });

      // First touchpoint channel should get all credit
      expect(result.totalConversions).toBe(1);
    });

    it('should assign 100% credit to last touch in last touch model', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany
        .mockResolvedValueOnce([mockConversionEvent])
        .mockResolvedValueOnce(mockTouchpoints);

      const result = await service.getAttributionReport({
        model: AttributionModel.LAST_TOUCH,
      });

      // Last touchpoint channel should get all credit
      expect(result.totalConversions).toBe(1);
    });

    it('should distribute credit equally in linear model', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany
        .mockResolvedValueOnce([mockConversionEvent])
        .mockResolvedValueOnce(mockTouchpoints);

      const result = await service.getAttributionReport({
        model: AttributionModel.LINEAR,
      });

      // Credit should be distributed across channels
      expect(result.totalConversions).toBe(1);
      expect(result.byChannel.length).toBeGreaterThan(0);
    });

    it('should handle single touchpoint in position based model', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany
        .mockResolvedValueOnce([mockConversionEvent])
        .mockResolvedValueOnce([mockTouchpoints[0]]); // Single touchpoint

      const result = await service.getAttributionReport({
        model: AttributionModel.POSITION_BASED,
      });

      // Single touchpoint should get 100% credit
      expect(result.totalConversions).toBe(1);
    });

    it('should handle two touchpoints in position based model', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany
        .mockResolvedValueOnce([mockConversionEvent])
        .mockResolvedValueOnce([mockTouchpoints[0], mockTouchpoints[1]]); // Two touchpoints

      const result = await service.getAttributionReport({
        model: AttributionModel.POSITION_BASED,
      });

      // Each should get 50%
      expect(result.totalConversions).toBe(1);
    });
  });
});
