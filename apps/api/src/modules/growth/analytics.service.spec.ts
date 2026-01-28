import { Test, TestingModule } from '@nestjs/testing';
import { GrowthAnalyticsService } from './analytics.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('GrowthAnalyticsService', () => {
  let service: GrowthAnalyticsService;

  const mockPrismaService = {
    analyticsEvent: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    order: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GrowthAnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<GrowthAnalyticsService>(GrowthAnalyticsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== Funnel Analytics ====================

  describe('getFunnelAnalytics', () => {
    describe('SIGNUP funnel', () => {
      it('should return signup funnel analytics', async () => {
        mockPrismaService.analyticsEvent.count
          .mockResolvedValueOnce(1000) // visitors
          .mockResolvedValueOnce(800); // signup started
        mockPrismaService.user.count
          .mockResolvedValueOnce(600) // email verified
          .mockResolvedValueOnce(400); // profile completed

        const result = await service.getFunnelAnalytics({
          funnel: 'SIGNUP',
        });

        expect(result.funnel).toBe('SIGNUP');
        expect(result.stages).toHaveLength(4);
        expect(result.stages[0]).toEqual({ name: 'Visited Signup Page', count: 1000 });
        expect(result.stages[1]).toEqual(expect.objectContaining({ name: 'Started Signup', count: 800 }));
        expect(result.stages[2]).toEqual(expect.objectContaining({ name: 'Email Verified', count: 600 }));
        expect(result.stages[3]).toEqual(expect.objectContaining({ name: 'Profile Completed', count: 400 }));
        expect(result.overallConversionRate).toBe(40);
        expect(result.totalUsers).toBe(1000);
      });

      it('should calculate conversion rates between stages', async () => {
        mockPrismaService.analyticsEvent.count
          .mockResolvedValueOnce(100)
          .mockResolvedValueOnce(50);
        mockPrismaService.user.count
          .mockResolvedValueOnce(25)
          .mockResolvedValueOnce(10);

        const result = await service.getFunnelAnalytics({
          funnel: 'SIGNUP',
        });

        expect(result.stages[1].conversionRate).toBe(50); // 50/100 * 100
        expect(result.stages[2].conversionRate).toBe(50); // 25/50 * 100
        expect(result.stages[3].conversionRate).toBe(40); // 10/25 * 100
      });

      it('should handle zero counts in funnel', async () => {
        mockPrismaService.analyticsEvent.count
          .mockResolvedValueOnce(0)
          .mockResolvedValueOnce(0);
        mockPrismaService.user.count
          .mockResolvedValueOnce(0)
          .mockResolvedValueOnce(0);

        const result = await service.getFunnelAnalytics({
          funnel: 'SIGNUP',
        });

        expect(result.overallConversionRate).toBe(0);
        expect(result.totalUsers).toBe(0);
      });

      it('should filter by date range', async () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');

        mockPrismaService.analyticsEvent.count.mockResolvedValue(100);
        mockPrismaService.user.count.mockResolvedValue(50);

        await service.getFunnelAnalytics({
          funnel: 'SIGNUP',
          startDate,
          endDate,
        });

        expect(mockPrismaService.analyticsEvent.count).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              createdAt: { gte: startDate, lte: endDate },
            }),
          }),
        );
      });

      it('should filter by region', async () => {
        mockPrismaService.analyticsEvent.count.mockResolvedValue(100);
        mockPrismaService.user.count.mockResolvedValue(50);

        await service.getFunnelAnalytics({
          funnel: 'SIGNUP',
          region: 'US',
        });

        expect(mockPrismaService.analyticsEvent.count).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              region: 'US',
            }),
          }),
        );
      });
    });

    describe('PURCHASE funnel', () => {
      it('should return purchase funnel analytics', async () => {
        mockPrismaService.analyticsEvent.count
          .mockResolvedValueOnce(5000) // product viewed
          .mockResolvedValueOnce(2000) // added to cart
          .mockResolvedValueOnce(1000); // checkout started
        mockPrismaService.order.count.mockResolvedValueOnce(500); // completed

        const result = await service.getFunnelAnalytics({
          funnel: 'PURCHASE',
        });

        expect(result.funnel).toBe('PURCHASE');
        expect(result.stages).toHaveLength(4);
        expect(result.stages[0]).toEqual({ name: 'Product Viewed', count: 5000 });
        expect(result.stages[1]).toEqual(expect.objectContaining({ name: 'Added to Cart', count: 2000 }));
        expect(result.stages[2]).toEqual(expect.objectContaining({ name: 'Checkout Started', count: 1000 }));
        expect(result.stages[3]).toEqual(expect.objectContaining({ name: 'Order Completed', count: 500 }));
        expect(result.overallConversionRate).toBe(10);
      });
    });

    describe('ONBOARDING funnel', () => {
      it('should return onboarding funnel analytics', async () => {
        mockPrismaService.user.count
          .mockResolvedValueOnce(1000) // signed up
          .mockResolvedValueOnce(800) // step 1
          .mockResolvedValueOnce(600) // step 2
          .mockResolvedValueOnce(400); // completed

        const result = await service.getFunnelAnalytics({
          funnel: 'ONBOARDING',
        });

        expect(result.funnel).toBe('ONBOARDING');
        expect(result.stages).toHaveLength(4);
        expect(result.stages[0]).toEqual({ name: 'Signed Up', count: 1000 });
        expect(result.overallConversionRate).toBe(40);
      });
    });

    describe('CUSTOM funnel', () => {
      it('should return empty stages for custom funnel', async () => {
        const result = await service.getFunnelAnalytics({
          funnel: 'CUSTOM',
        });

        expect(result.stages).toEqual([]);
        expect(result.overallConversionRate).toBe(0);
      });
    });
  });

  // ==================== Cohort Analysis ====================

  describe('getCohortAnalysis', () => {
    it('should return cohort analysis by month', async () => {
      const users = [
        { id: 'user-1', createdAt: new Date('2024-01-15') },
        { id: 'user-2', createdAt: new Date('2024-01-20') },
        { id: 'user-3', createdAt: new Date('2024-02-10') },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(users);
      mockPrismaService.analyticsEvent.groupBy.mockResolvedValue([
        { userId: 'user-1', _count: 5 },
      ]);

      const result = await service.getCohortAnalysis({
        cohortBy: 'SIGNUP_MONTH',
        periods: 3,
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('cohort');
      expect(result[0]).toHaveProperty('period', 'SIGNUP_MONTH');
      expect(result[0]).toHaveProperty('retention');
      expect(result[0]).toHaveProperty('size');
    });

    it('should return cohort analysis by week', async () => {
      const users = [
        { id: 'user-1', createdAt: new Date('2024-01-08') },
        { id: 'user-2', createdAt: new Date('2024-01-09') },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(users);
      mockPrismaService.analyticsEvent.groupBy.mockResolvedValue([]);

      const result = await service.getCohortAnalysis({
        cohortBy: 'SIGNUP_WEEK',
        periods: 4,
      });

      expect(result[0].period).toBe('SIGNUP_WEEK');
      expect(result[0].cohort).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('should calculate retention for each period', async () => {
      const users = [
        { id: 'user-1', createdAt: new Date('2024-01-15') },
        { id: 'user-2', createdAt: new Date('2024-01-20') },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(users);
      mockPrismaService.analyticsEvent.groupBy
        .mockResolvedValueOnce([{ userId: 'user-1', _count: 5 }, { userId: 'user-2', _count: 3 }])
        .mockResolvedValueOnce([{ userId: 'user-1', _count: 2 }])
        .mockResolvedValueOnce([]);

      const result = await service.getCohortAnalysis({
        cohortBy: 'SIGNUP_MONTH',
        periods: 3,
      });

      expect(result[0].retention).toHaveProperty('period_0');
      expect(result[0].retention).toHaveProperty('period_1');
      expect(result[0].retention).toHaveProperty('period_2');
    });

    it('should handle empty user list', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.getCohortAnalysis({
        cohortBy: 'SIGNUP_MONTH',
        periods: 3,
      });

      expect(result).toEqual([]);
    });

    it('should handle users with no activity', async () => {
      const users = [
        { id: 'user-1', createdAt: new Date('2024-01-15') },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(users);
      mockPrismaService.analyticsEvent.groupBy.mockResolvedValue([]);

      const result = await service.getCohortAnalysis({
        cohortBy: 'SIGNUP_MONTH',
        periods: 2,
      });

      expect(result[0].retention.period_0).toBe(0);
      expect(result[0].retention.period_1).toBe(0);
    });
  });

  // ==================== Growth Metrics ====================

  describe('getGrowthMetrics', () => {
    const dateRange = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    };

    describe('USERS metric', () => {
      it('should return user growth data', async () => {
        const userData = [
          { createdAt: new Date('2024-01-15'), _count: 50 },
          { createdAt: new Date('2024-01-20'), _count: 75 },
        ];

        mockPrismaService.user.groupBy.mockResolvedValue(userData);

        const result = await service.getGrowthMetrics({
          ...dateRange,
          metric: 'USERS',
        });

        expect(result).toEqual({
          metric: 'USERS',
          data: userData,
        });
        expect(mockPrismaService.user.groupBy).toHaveBeenCalledWith({
          by: ['createdAt'],
          where: {
            createdAt: {
              gte: dateRange.startDate,
              lte: dateRange.endDate,
            },
          },
          _count: true,
        });
      });
    });

    describe('REVENUE metric', () => {
      it('should return revenue growth data', async () => {
        const revenueData = [
          { createdAt: new Date('2024-01-15'), _sum: { total: 5000 } },
          { createdAt: new Date('2024-01-20'), _sum: { total: 7500 } },
        ];

        mockPrismaService.order.groupBy.mockResolvedValue(revenueData);

        const result = await service.getGrowthMetrics({
          ...dateRange,
          metric: 'REVENUE',
        });

        expect(result).toEqual({
          metric: 'REVENUE',
          data: revenueData,
        });
        expect(mockPrismaService.order.groupBy).toHaveBeenCalledWith({
          by: ['createdAt'],
          where: expect.any(Object),
          _sum: { total: true },
        });
      });
    });

    describe('ORDERS metric', () => {
      it('should return order growth data', async () => {
        const orderData = [
          { createdAt: new Date('2024-01-15'), _count: 100 },
          { createdAt: new Date('2024-01-20'), _count: 150 },
        ];

        mockPrismaService.order.groupBy.mockResolvedValue(orderData);

        const result = await service.getGrowthMetrics({
          ...dateRange,
          metric: 'ORDERS',
        });

        expect(result).toEqual({
          metric: 'ORDERS',
          data: orderData,
        });
        expect(mockPrismaService.order.groupBy).toHaveBeenCalledWith({
          by: ['createdAt'],
          where: expect.any(Object),
          _count: true,
        });
      });
    });

    describe('ACTIVE_USERS metric', () => {
      it('should return active users count', async () => {
        const activeUsers = [
          { userId: 'user-1', _count: 10 },
          { userId: 'user-2', _count: 5 },
          { userId: 'user-3', _count: 3 },
        ];

        mockPrismaService.analyticsEvent.groupBy.mockResolvedValue(activeUsers);

        const result = await service.getGrowthMetrics({
          ...dateRange,
          metric: 'ACTIVE_USERS',
        });

        expect(result).toEqual({
          metric: 'ACTIVE_USERS',
          count: 3,
        });
        expect(mockPrismaService.analyticsEvent.groupBy).toHaveBeenCalledWith({
          by: ['userId'],
          where: {
            timestamp: {
              gte: dateRange.startDate,
              lte: dateRange.endDate,
            },
          },
          _count: true,
        });
      });

      it('should return 0 when no active users', async () => {
        mockPrismaService.analyticsEvent.groupBy.mockResolvedValue([]);

        const result = await service.getGrowthMetrics({
          ...dateRange,
          metric: 'ACTIVE_USERS',
        });

        expect(result.count).toBe(0);
      });
    });

    describe('Unknown metric', () => {
      it('should return null for unknown metric', async () => {
        const result = await service.getGrowthMetrics({
          ...dateRange,
          metric: 'UNKNOWN' as any,
        });

        expect(result).toBeNull();
      });
    });
  });

  // ==================== Helper Methods ====================

  describe('private helper methods', () => {
    it('should correctly group users by cohort key', async () => {
      const users = [
        { id: 'user-1', createdAt: new Date('2024-01-15') },
        { id: 'user-2', createdAt: new Date('2024-01-20') },
        { id: 'user-3', createdAt: new Date('2024-02-10') },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(users);
      mockPrismaService.analyticsEvent.groupBy.mockResolvedValue([]);

      const result = await service.getCohortAnalysis({
        cohortBy: 'SIGNUP_MONTH',
        periods: 1,
      });

      const cohortKeys = result.map(r => r.cohort);
      expect(cohortKeys).toContain('2024-01');
      expect(cohortKeys).toContain('2024-02');
    });

    it('should handle week number calculation correctly', async () => {
      const users = [
        { id: 'user-1', createdAt: new Date('2024-01-01') }, // Week 1
        { id: 'user-2', createdAt: new Date('2024-01-08') }, // Week 2
      ];

      mockPrismaService.user.findMany.mockResolvedValue(users);
      mockPrismaService.analyticsEvent.groupBy.mockResolvedValue([]);

      const result = await service.getCohortAnalysis({
        cohortBy: 'SIGNUP_WEEK',
        periods: 1,
      });

      // Should have 2 different cohorts
      expect(result.length).toBe(2);
    });
  });
});
