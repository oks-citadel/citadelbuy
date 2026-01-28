import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FunnelsService } from './funnels.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { MarketingEventType } from '../constants/event-types';

describe('FunnelsService', () => {
  let service: FunnelsService;
  let prisma: PrismaService;
  let redis: RedisService;

  const mockPrismaService = {
    performanceSnapshot: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    analyticsEvent: {
      findMany: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  // Mock data
  const mockFunnelId = 'funnel-123';
  const mockOrganizationId = 'org-123';
  const baseTimestamp = new Date('2025-01-15T10:00:00.000Z');

  const mockFunnelSteps = [
    { name: 'View Product', eventType: MarketingEventType.PRODUCT_VIEWED },
    { name: 'Add to Cart', eventType: MarketingEventType.PRODUCT_ADDED_TO_CART },
    { name: 'Checkout', eventType: MarketingEventType.CHECKOUT_STARTED },
    { name: 'Purchase', eventType: MarketingEventType.PURCHASE },
  ];

  const mockFunnelRecord = {
    id: mockFunnelId,
    entityType: 'funnel_definition',
    entityId: 'funnel_123456',
    snapshotDate: baseTimestamp,
    metrics: {
      name: 'E-commerce Purchase Funnel',
      description: 'Track users from product view to purchase',
      steps: mockFunnelSteps,
      isOrdered: true,
      conversionWindow: 604800,
      isActive: true,
      organizationId: mockOrganizationId,
    },
    createdAt: baseTimestamp,
  };

  const mockSessionId = 'session-123';
  const mockUserId = 'user-123';

  const mockFunnelEvents = [
    {
      userId: mockUserId,
      sessionId: mockSessionId,
      eventType: MarketingEventType.PRODUCT_VIEWED,
      timestamp: baseTimestamp,
      properties: { productId: 'product-1' },
    },
    {
      userId: mockUserId,
      sessionId: mockSessionId,
      eventType: MarketingEventType.PRODUCT_ADDED_TO_CART,
      timestamp: new Date(baseTimestamp.getTime() + 60000),
      properties: { productId: 'product-1', quantity: 1 },
    },
    {
      userId: mockUserId,
      sessionId: mockSessionId,
      eventType: MarketingEventType.CHECKOUT_STARTED,
      timestamp: new Date(baseTimestamp.getTime() + 120000),
      properties: { cartValue: 99.99 },
    },
    {
      userId: mockUserId,
      sessionId: mockSessionId,
      eventType: MarketingEventType.PURCHASE,
      timestamp: new Date(baseTimestamp.getTime() + 180000),
      properties: { orderId: 'order-1', orderValue: 99.99 },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FunnelsService,
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

    service = module.get<FunnelsService>(FunnelsService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createFunnel', () => {
    it('should create a new funnel definition', async () => {
      mockPrismaService.performanceSnapshot.create.mockResolvedValue(mockFunnelRecord);

      const result = await service.createFunnel({
        name: 'E-commerce Purchase Funnel',
        description: 'Track users from product view to purchase',
        steps: mockFunnelSteps,
        organizationId: mockOrganizationId,
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name', 'E-commerce Purchase Funnel');
      expect(result).toHaveProperty('steps');
      expect(result).toHaveProperty('isActive', true);
      expect(mockPrismaService.performanceSnapshot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'funnel_definition',
          }),
        }),
      );
    });

    it('should use default isOrdered value of true', async () => {
      mockPrismaService.performanceSnapshot.create.mockResolvedValue(mockFunnelRecord);

      const result = await service.createFunnel({
        name: 'Test Funnel',
        steps: mockFunnelSteps,
        organizationId: mockOrganizationId,
      });

      expect(result.isOrdered).toBe(true);
    });

    it('should use default conversionWindow of 7 days', async () => {
      mockPrismaService.performanceSnapshot.create.mockResolvedValue(mockFunnelRecord);

      const result = await service.createFunnel({
        name: 'Test Funnel',
        steps: mockFunnelSteps,
        organizationId: mockOrganizationId,
      });

      expect(result.conversionWindow).toBe(604800); // 7 days in seconds
    });

    it('should store steps with filters', async () => {
      const stepsWithFilters = [
        {
          name: 'View Premium Product',
          eventType: MarketingEventType.PRODUCT_VIEWED,
          filters: [{ property: 'category', operator: 'eq', value: 'premium' }],
        },
        { name: 'Purchase', eventType: MarketingEventType.PURCHASE },
      ];
      mockPrismaService.performanceSnapshot.create.mockResolvedValue({
        ...mockFunnelRecord,
        metrics: { ...mockFunnelRecord.metrics, steps: stepsWithFilters },
      });

      const result = await service.createFunnel({
        name: 'Premium Funnel',
        steps: stepsWithFilters,
        organizationId: mockOrganizationId,
      });

      expect(result.steps[0].filters).toBeDefined();
    });
  });

  describe('listFunnels', () => {
    it('should return all funnels', async () => {
      mockPrismaService.performanceSnapshot.findMany.mockResolvedValue([mockFunnelRecord]);

      const result = await service.listFunnels();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('steps');
    });

    it('should filter by organizationId when provided', async () => {
      mockPrismaService.performanceSnapshot.findMany.mockResolvedValue([mockFunnelRecord]);

      await service.listFunnels(mockOrganizationId);

      expect(mockPrismaService.performanceSnapshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'funnel_definition',
            metrics: expect.objectContaining({
              path: ['organizationId'],
              equals: mockOrganizationId,
            }),
          }),
        }),
      );
    });

    it('should return empty array when no funnels exist', async () => {
      mockPrismaService.performanceSnapshot.findMany.mockResolvedValue([]);

      const result = await service.listFunnels();

      expect(result).toEqual([]);
    });
  });

  describe('getFunnel', () => {
    it('should return funnel by id', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(mockFunnelRecord);

      const result = await service.getFunnel(mockFunnelId);

      expect(result).toHaveProperty('id', mockFunnelId);
      expect(result).toHaveProperty('name', 'E-commerce Purchase Funnel');
      expect(result).toHaveProperty('steps');
    });

    it('should throw NotFoundException for non-existent funnel', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(null);

      await expect(service.getFunnel('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateFunnel', () => {
    it('should update funnel name', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(mockFunnelRecord);
      mockPrismaService.performanceSnapshot.update.mockResolvedValue({
        ...mockFunnelRecord,
        metrics: { ...mockFunnelRecord.metrics, name: 'Updated Funnel Name' },
      });

      const result = await service.updateFunnel(mockFunnelId, {
        name: 'Updated Funnel Name',
      });

      expect(result.name).toBe('Updated Funnel Name');
      expect(mockRedisService.del).toHaveBeenCalled();
    });

    it('should update funnel steps', async () => {
      const newSteps = [
        { name: 'Step 1', eventType: MarketingEventType.PAGE_VIEW },
        { name: 'Step 2', eventType: MarketingEventType.PURCHASE },
      ];
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(mockFunnelRecord);
      mockPrismaService.performanceSnapshot.update.mockResolvedValue({
        ...mockFunnelRecord,
        metrics: { ...mockFunnelRecord.metrics, steps: newSteps },
      });

      const result = await service.updateFunnel(mockFunnelId, {
        steps: newSteps,
      });

      expect(result.steps).toEqual(newSteps);
    });

    it('should update funnel isActive status', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(mockFunnelRecord);
      mockPrismaService.performanceSnapshot.update.mockResolvedValue({
        ...mockFunnelRecord,
        metrics: { ...mockFunnelRecord.metrics, isActive: false },
      });

      const result = await service.updateFunnel(mockFunnelId, {
        isActive: false,
      });

      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException for non-existent funnel', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(null);

      await expect(service.updateFunnel('non-existent', { name: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should invalidate cache after update', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(mockFunnelRecord);
      mockPrismaService.performanceSnapshot.update.mockResolvedValue(mockFunnelRecord);

      await service.updateFunnel(mockFunnelId, { name: 'Updated' });

      expect(mockRedisService.del).toHaveBeenCalledWith(
        expect.stringContaining(mockFunnelId),
      );
    });
  });

  describe('deleteFunnel', () => {
    it('should delete funnel', async () => {
      mockPrismaService.performanceSnapshot.delete.mockResolvedValue(mockFunnelRecord);

      await service.deleteFunnel(mockFunnelId);

      expect(mockPrismaService.performanceSnapshot.delete).toHaveBeenCalledWith({
        where: { id: mockFunnelId },
      });
    });

    it('should invalidate cache after deletion', async () => {
      mockPrismaService.performanceSnapshot.delete.mockResolvedValue(mockFunnelRecord);

      await service.deleteFunnel(mockFunnelId);

      expect(mockRedisService.del).toHaveBeenCalledWith(
        expect.stringContaining(mockFunnelId),
      );
    });
  });

  describe('analyzeFunnel', () => {
    it('should return cached analysis if available', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(mockFunnelRecord);
      const cachedAnalysis = {
        funnelId: mockFunnelId,
        funnelName: 'E-commerce Purchase Funnel',
        dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' },
        totalEntered: 100,
        totalConverted: 10,
        overallConversionRate: 10,
        steps: [],
      };
      mockRedisService.get.mockResolvedValue(cachedAnalysis);

      const result = await service.analyzeFunnel(mockFunnelId, {});

      expect(result).toEqual(cachedAnalysis);
      expect(mockPrismaService.analyticsEvent.findMany).not.toHaveBeenCalled();
    });

    it('should calculate funnel analysis', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(mockFunnelRecord);
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockFunnelEvents);

      const result = await service.analyzeFunnel(mockFunnelId, {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      expect(result).toHaveProperty('funnelId', mockFunnelId);
      expect(result).toHaveProperty('funnelName');
      expect(result).toHaveProperty('dateRange');
      expect(result).toHaveProperty('totalEntered');
      expect(result).toHaveProperty('totalConverted');
      expect(result).toHaveProperty('overallConversionRate');
      expect(result).toHaveProperty('steps');
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should calculate step-by-step conversion rates', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(mockFunnelRecord);
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockFunnelEvents);

      const result = await service.analyzeFunnel(mockFunnelId, {});

      expect(result.steps.length).toBe(4);
      result.steps.forEach((step, index) => {
        expect(step).toHaveProperty('stepIndex', index);
        expect(step).toHaveProperty('stepName');
        expect(step).toHaveProperty('eventType');
        expect(step).toHaveProperty('entered');
        expect(step).toHaveProperty('completed');
        expect(step).toHaveProperty('conversionRate');
        expect(step).toHaveProperty('dropoffRate');
      });
    });

    it('should use default date range of 30 days', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(mockFunnelRecord);
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.analyzeFunnel(mockFunnelId, {});

      expect(result.dateRange.startDate).toBeDefined();
      expect(result.dateRange.endDate).toBeDefined();
    });

    it('should include device breakdown when requested', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(mockFunnelRecord);
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockFunnelEvents);

      const result = await service.analyzeFunnel(mockFunnelId, {
        includeDeviceBreakdown: true,
      });

      expect(result).toHaveProperty('deviceBreakdown');
      expect(result.deviceBreakdown).toHaveProperty('desktop');
      expect(result.deviceBreakdown).toHaveProperty('mobile');
      expect(result.deviceBreakdown).toHaveProperty('tablet');
    });

    it('should include source breakdown when requested', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(mockFunnelRecord);
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockFunnelEvents);

      const result = await service.analyzeFunnel(mockFunnelId, {
        includeSourceBreakdown: true,
      });

      expect(result).toHaveProperty('sourceBreakdown');
      expect(result.sourceBreakdown).toHaveProperty('direct');
      expect(result.sourceBreakdown).toHaveProperty('organic');
      expect(result.sourceBreakdown).toHaveProperty('paid');
    });

    it('should include time series when groupBy is provided', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(mockFunnelRecord);
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockFunnelEvents);

      const result = await service.analyzeFunnel(mockFunnelId, {
        groupBy: 'day',
      });

      expect(result).toHaveProperty('timeSeries');
      expect(Array.isArray(result.timeSeries)).toBe(true);
    });

    it('should throw NotFoundException for non-existent funnel', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(null);

      await expect(service.analyzeFunnel('non-existent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('getConversionRates', () => {
    it('should return conversion rates for each step', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(mockFunnelRecord);
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockFunnelEvents);

      const result = await service.getConversionRates(mockFunnelId, {});

      expect(result).toHaveProperty('funnelId', mockFunnelId);
      expect(result).toHaveProperty('steps');
      expect(result.steps.length).toBe(4);
      result.steps.forEach(step => {
        expect(step).toHaveProperty('stepIndex');
        expect(step).toHaveProperty('stepName');
        expect(step).toHaveProperty('conversionRate');
        expect(step).toHaveProperty('dropoffRate');
      });
    });

    it('should calculate dropoff rates correctly', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(mockFunnelRecord);
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockFunnelEvents);

      const result = await service.getConversionRates(mockFunnelId, {});

      result.steps.forEach(step => {
        expect(step.conversionRate + step.dropoffRate).toBeCloseTo(100, 1);
      });
    });
  });

  describe('ordered vs unordered funnels', () => {
    it('should track ordered funnel correctly', async () => {
      const orderedFunnel = {
        ...mockFunnelRecord,
        metrics: { ...mockFunnelRecord.metrics, isOrdered: true },
      };
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(orderedFunnel);
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockFunnelEvents);

      const result = await service.analyzeFunnel(mockFunnelId, {});

      expect(result.steps.length).toBe(4);
    });

    it('should track unordered funnel correctly', async () => {
      const unorderedFunnel = {
        ...mockFunnelRecord,
        metrics: { ...mockFunnelRecord.metrics, isOrdered: false },
      };
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(unorderedFunnel);
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockFunnelEvents);

      const result = await service.analyzeFunnel(mockFunnelId, {});

      expect(result.steps.length).toBe(4);
    });
  });

  describe('step filters', () => {
    it('should apply step filters to analysis', async () => {
      const funnelWithFilters = {
        ...mockFunnelRecord,
        metrics: {
          ...mockFunnelRecord.metrics,
          steps: [
            {
              name: 'View Premium Product',
              eventType: MarketingEventType.PRODUCT_VIEWED,
              filters: [{ property: 'category', operator: 'eq', value: 'premium' }],
            },
            { name: 'Purchase', eventType: MarketingEventType.PURCHASE },
          ],
        },
      };
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(funnelWithFilters);
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.analyzeFunnel(mockFunnelId, {});

      expect(result.steps.length).toBe(2);
    });
  });

  describe('time series grouping', () => {
    it('should group by day', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(mockFunnelRecord);
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockFunnelEvents);

      const result = await service.analyzeFunnel(mockFunnelId, {
        groupBy: 'day',
        startDate: '2025-01-01',
        endDate: '2025-01-07',
      });

      expect(result.timeSeries).toBeDefined();
      expect(result.timeSeries.length).toBeGreaterThan(0);
    });

    it('should group by week', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(mockFunnelRecord);
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockFunnelEvents);

      const result = await service.analyzeFunnel(mockFunnelId, {
        groupBy: 'week',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      expect(result.timeSeries).toBeDefined();
    });

    it('should group by month', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(mockFunnelRecord);
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockFunnelEvents);

      const result = await service.analyzeFunnel(mockFunnelId, {
        groupBy: 'month',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      });

      expect(result.timeSeries).toBeDefined();
    });
  });

  describe('empty data handling', () => {
    it('should handle empty events', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(mockFunnelRecord);
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.analyzeFunnel(mockFunnelId, {});

      expect(result.totalEntered).toBe(0);
      expect(result.totalConverted).toBe(0);
      expect(result.overallConversionRate).toBe(0);
    });

    it('should handle funnel with no completions', async () => {
      const partialEvents = [
        {
          userId: mockUserId,
          sessionId: mockSessionId,
          eventType: MarketingEventType.PRODUCT_VIEWED,
          timestamp: baseTimestamp,
          properties: {},
        },
      ];
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(mockFunnelRecord);
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(partialEvents);

      const result = await service.analyzeFunnel(mockFunnelId, {});

      expect(result.totalEntered).toBeGreaterThan(0);
      expect(result.totalConverted).toBe(0);
    });
  });
});
