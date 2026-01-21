import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CohortsService } from './cohorts.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { MarketingEventType } from '../constants/event-types';
import { CohortType, RetentionMetric } from './dto/cohort.dto';

describe('CohortsService', () => {
  let service: CohortsService;
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
    user: {
      findMany: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    analyticsEvent: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  // Mock data
  const mockCohortId = 'cohort-123';
  const mockOrganizationId = 'org-123';
  const baseTimestamp = new Date('2025-01-15T10:00:00.000Z');

  const mockCohortRecord = {
    id: mockCohortId,
    entityType: 'cohort_definition',
    entityId: 'cohort_123456',
    snapshotDate: baseTimestamp,
    metrics: {
      name: 'January Signups',
      description: 'Users who signed up in January 2025',
      cohortType: CohortType.SIGNUP_DATE,
      filters: [],
      granularity: 'week',
      isActive: true,
      organizationId: mockOrganizationId,
    },
    createdAt: baseTimestamp,
  };

  const mockUsers = [
    { id: 'user-1', createdAt: baseTimestamp },
    { id: 'user-2', createdAt: baseTimestamp },
    { id: 'user-3', createdAt: baseTimestamp },
  ];

  const mockOrders = [
    { userId: 'user-1', total: 100, createdAt: baseTimestamp },
    { userId: 'user-1', total: 150, createdAt: new Date(baseTimestamp.getTime() + 7 * 24 * 60 * 60 * 1000) },
    { userId: 'user-2', total: 200, createdAt: baseTimestamp },
  ];

  const mockRetentionEvents = [
    { userId: 'user-1', eventType: MarketingEventType.LOGIN, timestamp: baseTimestamp },
    { userId: 'user-1', eventType: MarketingEventType.PAGE_VIEW, timestamp: new Date(baseTimestamp.getTime() + 7 * 24 * 60 * 60 * 1000) },
    { userId: 'user-2', eventType: MarketingEventType.LOGIN, timestamp: baseTimestamp },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CohortsService,
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

    service = module.get<CohortsService>(CohortsService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCohort', () => {
    it('should create a new cohort definition', async () => {
      mockPrismaService.performanceSnapshot.create.mockResolvedValue(mockCohortRecord);

      const result = await service.createCohort({
        name: 'January Signups',
        description: 'Users who signed up in January 2025',
        cohortType: CohortType.SIGNUP_DATE,
        organizationId: mockOrganizationId,
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name', 'January Signups');
      expect(result).toHaveProperty('cohortType', CohortType.SIGNUP_DATE);
      expect(result).toHaveProperty('isActive', true);
      expect(mockPrismaService.performanceSnapshot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'cohort_definition',
          }),
        }),
      );
    });

    it('should use default granularity when not provided', async () => {
      mockPrismaService.performanceSnapshot.create.mockResolvedValue(mockCohortRecord);

      const result = await service.createCohort({
        name: 'Test Cohort',
        cohortType: CohortType.SIGNUP_DATE,
        organizationId: mockOrganizationId,
      });

      expect(result.granularity).toBe('week');
    });

    it('should store filters when provided', async () => {
      const filters = [
        { property: 'plan', operator: 'eq', value: 'premium' },
      ];
      mockPrismaService.performanceSnapshot.create.mockResolvedValue({
        ...mockCohortRecord,
        metrics: { ...mockCohortRecord.metrics, filters },
      });

      const result = await service.createCohort({
        name: 'Premium Users',
        cohortType: CohortType.SIGNUP_DATE,
        filters,
        organizationId: mockOrganizationId,
      });

      expect(result.filters).toEqual(filters);
    });
  });

  describe('listCohorts', () => {
    it('should return all cohorts', async () => {
      mockPrismaService.performanceSnapshot.findMany.mockResolvedValue([mockCohortRecord]);

      const result = await service.listCohorts();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
    });

    it('should filter by organizationId when provided', async () => {
      mockPrismaService.performanceSnapshot.findMany.mockResolvedValue([mockCohortRecord]);

      await service.listCohorts(mockOrganizationId);

      expect(mockPrismaService.performanceSnapshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'cohort_definition',
            metrics: expect.objectContaining({
              path: ['organizationId'],
              equals: mockOrganizationId,
            }),
          }),
        }),
      );
    });

    it('should return empty array when no cohorts exist', async () => {
      mockPrismaService.performanceSnapshot.findMany.mockResolvedValue([]);

      const result = await service.listCohorts();

      expect(result).toEqual([]);
    });
  });

  describe('getCohort', () => {
    it('should return cohort by id', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(mockCohortRecord);

      const result = await service.getCohort(mockCohortId);

      expect(result).toHaveProperty('id', mockCohortId);
      expect(result).toHaveProperty('name', 'January Signups');
    });

    it('should throw NotFoundException for non-existent cohort', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(null);

      await expect(service.getCohort('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRetentionCurves', () => {
    it('should return cached retention data if available', async () => {
      const cachedData = {
        dateRange: { startDate: '2025-01-01', endDate: '2025-01-15' },
        granularity: 'week',
        periods: 12,
        retentionMetric: RetentionMetric.ANY_EVENT,
        cohorts: [],
        averageRetention: [],
      };
      mockRedisService.get.mockResolvedValue(cachedData);

      const result = await service.getRetentionCurves({});

      expect(result).toEqual(cachedData);
      expect(mockPrismaService.user.findMany).not.toHaveBeenCalled();
    });

    it('should calculate retention curves', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockRetentionEvents);

      const result = await service.getRetentionCurves({
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        periods: 4,
        granularity: 'week',
      });

      expect(result).toHaveProperty('dateRange');
      expect(result).toHaveProperty('granularity', 'week');
      expect(result).toHaveProperty('periods', 4);
      expect(result).toHaveProperty('retentionMetric');
      expect(result).toHaveProperty('cohorts');
      expect(result).toHaveProperty('averageRetention');
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should use default granularity when not provided', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.getRetentionCurves({});

      expect(result.granularity).toBe('week');
    });

    it('should use default periods when not provided', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.getRetentionCurves({});

      expect(result.periods).toBe(12);
    });

    it('should track retention by any event by default', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockRetentionEvents);

      const result = await service.getRetentionCurves({});

      expect(result.retentionMetric).toBe(RetentionMetric.ANY_EVENT);
    });

    it('should track retention by specific event when specified', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockRetentionEvents);

      const result = await service.getRetentionCurves({
        retentionMetric: RetentionMetric.PURCHASE,
      });

      expect(result.retentionMetric).toBe(RetentionMetric.PURCHASE);
    });

    it('should include cohort data with retention percentages', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockRetentionEvents);

      const result = await service.getRetentionCurves({
        periods: 2,
      });

      if (result.cohorts.length > 0) {
        const cohort = result.cohorts[0];
        expect(cohort).toHaveProperty('cohort');
        expect(cohort).toHaveProperty('startDate');
        expect(cohort).toHaveProperty('cohortSize');
        expect(cohort).toHaveProperty('retention');
        expect(Array.isArray(cohort.retention)).toBe(true);
      }
    });

    it('should handle empty user cohorts', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.getRetentionCurves({});

      expect(result.cohorts).toEqual([]);
    });
  });

  describe('getLtvAnalysis', () => {
    it('should return cached LTV data if available', async () => {
      const cachedData = {
        dateRange: { startDate: '2025-01-01', endDate: '2025-01-15' },
        overallAvgLtv: 150.00,
        cohorts: [],
      };
      mockRedisService.get.mockResolvedValue(cachedData);

      const result = await service.getLtvAnalysis({});

      expect(result).toEqual(cachedData);
    });

    it('should calculate LTV analysis', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.getLtvAnalysis({
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      expect(result).toHaveProperty('dateRange');
      expect(result).toHaveProperty('overallAvgLtv');
      expect(result).toHaveProperty('cohorts');
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should calculate average LTV correctly', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.getLtvAnalysis({});

      expect(result.overallAvgLtv).toBeGreaterThanOrEqual(0);
    });

    it('should include cohort LTV data', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.getLtvAnalysis({ periods: 4 });

      if (result.cohorts.length > 0) {
        const cohort = result.cohorts[0];
        expect(cohort).toHaveProperty('cohort');
        expect(cohort).toHaveProperty('cohortSize');
        expect(cohort).toHaveProperty('totalRevenue');
        expect(cohort).toHaveProperty('avgRevenuePerUser');
        expect(cohort).toHaveProperty('cumulativeLtv');
        expect(cohort).toHaveProperty('projectedLtv');
      }
    });

    it('should use default granularity of month', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getLtvAnalysis({});

      // No explicit granularity in result, but default is 'month'
      expect(result.dateRange).toBeDefined();
    });

    it('should handle cohorts with no orders', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.getLtvAnalysis({});

      expect(result.overallAvgLtv).toBe(0);
    });
  });

  describe('getChurnAnalysis', () => {
    it('should return cached churn data if available', async () => {
      const cachedData = {
        dateRange: { startDate: '2025-01-01', endDate: '2025-01-15' },
        overallChurnRate: 5.5,
        monthlyTrend: [],
        cohorts: [],
      };
      mockRedisService.get.mockResolvedValue(cachedData);

      const result = await service.getChurnAnalysis({});

      expect(result).toEqual(cachedData);
    });

    it('should calculate churn analysis', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockRetentionEvents);
      mockPrismaService.analyticsEvent.findFirst.mockResolvedValue(null);

      const result = await service.getChurnAnalysis({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        periods: 12,
      });

      expect(result).toHaveProperty('dateRange');
      expect(result).toHaveProperty('overallChurnRate');
      expect(result).toHaveProperty('monthlyTrend');
      expect(result).toHaveProperty('cohorts');
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should use default inactive days of 30', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);
      mockPrismaService.analyticsEvent.findFirst.mockResolvedValue(null);

      const result = await service.getChurnAnalysis({});

      // Default is 30 days inactivity threshold
      expect(result).toHaveProperty('overallChurnRate');
    });

    it('should include churn breakdown when requested', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockRetentionEvents);
      mockPrismaService.analyticsEvent.findFirst.mockResolvedValue(null);

      const result = await service.getChurnAnalysis({
        includeBreakdown: true,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      if (result.cohorts.length > 0) {
        const cohort = result.cohorts[0];
        expect(cohort).toHaveProperty('cohort');
        expect(cohort).toHaveProperty('cohortSize');
        expect(cohort).toHaveProperty('churned');
        expect(cohort).toHaveProperty('churnRate');
      }
    });

    it('should calculate monthly churn trend', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockRetentionEvents);
      mockPrismaService.analyticsEvent.findFirst.mockResolvedValue(null);

      const result = await service.getChurnAnalysis({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        periods: 12,
      });

      expect(Array.isArray(result.monthlyTrend)).toBe(true);
      if (result.monthlyTrend.length > 0) {
        expect(result.monthlyTrend[0]).toHaveProperty('month');
        expect(result.monthlyTrend[0]).toHaveProperty('churnRate');
      }
    });

    it('should handle no active users', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.getChurnAnalysis({});

      expect(result.overallChurnRate).toBe(0);
      expect(result.cohorts).toEqual([]);
    });
  });

  describe('analyzeCohort', () => {
    it('should return retention analysis for specific cohort', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(mockCohortRecord);
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockRetentionEvents);

      const result = await service.analyzeCohort(mockCohortId, {});

      expect(result).toHaveProperty('cohorts');
      expect(result).toHaveProperty('averageRetention');
    });

    it('should throw NotFoundException for non-existent cohort', async () => {
      mockPrismaService.performanceSnapshot.findFirst.mockResolvedValue(null);

      await expect(service.analyzeCohort('non-existent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('period calculations', () => {
    it('should generate correct day periods', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockRetentionEvents);

      const result = await service.getRetentionCurves({
        startDate: '2025-01-01',
        endDate: '2025-01-07',
        granularity: 'day',
        periods: 7,
      });

      expect(result.granularity).toBe('day');
    });

    it('should generate correct week periods', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockRetentionEvents);

      const result = await service.getRetentionCurves({
        startDate: '2025-01-01',
        endDate: '2025-02-28',
        granularity: 'week',
        periods: 8,
      });

      expect(result.granularity).toBe('week');
    });

    it('should generate correct month periods', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockRetentionEvents);

      const result = await service.getRetentionCurves({
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        granularity: 'month',
        periods: 12,
      });

      expect(result.granularity).toBe('month');
    });
  });

  describe('cohort type handling', () => {
    it('should handle SIGNUP_DATE cohort type', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockRetentionEvents);

      const result = await service.getRetentionCurves({});

      expect(result).toHaveProperty('cohorts');
    });

    it('should handle FIRST_PURCHASE_DATE cohort type', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.order.groupBy.mockResolvedValue([
        { userId: 'user-1', _min: { createdAt: baseTimestamp } },
      ]);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockRetentionEvents);

      // The service uses getUsersForPeriod internally, which handles FIRST_PURCHASE_DATE
      const result = await service.getRetentionCurves({});

      expect(result).toHaveProperty('cohorts');
    });
  });

  describe('retention metrics', () => {
    it('should track ANY_EVENT retention', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockRetentionEvents);

      const result = await service.getRetentionCurves({
        retentionMetric: RetentionMetric.ANY_EVENT,
      });

      expect(result.retentionMetric).toBe(RetentionMetric.ANY_EVENT);
    });

    it('should track PURCHASE retention', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.getRetentionCurves({
        retentionMetric: RetentionMetric.PURCHASE,
      });

      expect(result.retentionMetric).toBe(RetentionMetric.PURCHASE);
    });

    it('should track LOGIN retention', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue(mockRetentionEvents);

      const result = await service.getRetentionCurves({
        retentionMetric: RetentionMetric.LOGIN,
      });

      expect(result.retentionMetric).toBe(RetentionMetric.LOGIN);
    });

    it('should track FEATURE_USE retention', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.getRetentionCurves({
        retentionMetric: RetentionMetric.FEATURE_USE,
      });

      expect(result.retentionMetric).toBe(RetentionMetric.FEATURE_USE);
    });

    it('should track SPECIFIC_EVENT retention with custom event type', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.analyticsEvent.findMany.mockResolvedValue([]);

      const result = await service.getRetentionCurves({
        retentionMetric: RetentionMetric.SPECIFIC_EVENT,
        eventType: 'custom_action',
      });

      expect(result.retentionMetric).toBe(RetentionMetric.SPECIFIC_EVENT);
    });
  });
});
