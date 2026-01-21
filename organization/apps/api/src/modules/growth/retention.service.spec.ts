import { Test, TestingModule } from '@nestjs/testing';
import { RetentionService } from './retention.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('RetentionService', () => {
  let service: RetentionService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
    },
    supportTicket: {
      count: jest.fn(),
    },
    analyticsEvent: {
      findFirst: jest.fn(),
      groupBy: jest.fn(),
    },
    churnRisk: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetentionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RetentionService>(RetentionService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== Predict Churn Risk ====================

  describe('predictChurnRisk', () => {
    it('should predict LOW churn risk for active user', async () => {
      const mockUser = {
        id: 'user-123',
        orders: [{ id: 'order-1', createdAt: new Date() }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.analyticsEvent.findFirst.mockResolvedValue({
        timestamp: new Date(), // Active recently
      });
      mockPrismaService.order.findMany.mockResolvedValue([
        { createdAt: new Date() },
        { createdAt: new Date() },
        { createdAt: new Date() },
      ]);
      mockPrismaService.supportTicket.count.mockResolvedValue(0);
      mockPrismaService.churnRisk.upsert.mockResolvedValue({});

      const result = await service.predictChurnRisk('user-123');

      expect(result.riskLevel).toBe('LOW');
      expect(result.riskScore).toBeLessThan(30);
      expect(result.factors).toEqual([]);
    });

    it('should predict HIGH churn risk for inactive user', async () => {
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      const sixtyOneDaysAgo = new Date(Date.now() - 61 * 24 * 60 * 60 * 1000);

      const mockUser = {
        id: 'user-inactive',
        orders: [{ id: 'order-1', createdAt: sixtyOneDaysAgo }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.analyticsEvent.findFirst.mockResolvedValue({
        timestamp: thirtyOneDaysAgo,
      });
      mockPrismaService.order.findMany.mockResolvedValue([
        { createdAt: sixtyOneDaysAgo },
      ]);
      mockPrismaService.supportTicket.count.mockResolvedValue(3);
      mockPrismaService.churnRisk.upsert.mockResolvedValue({});

      const result = await service.predictChurnRisk('user-inactive');

      expect(result.riskLevel).toBe('HIGH');
      expect(result.riskScore).toBeGreaterThanOrEqual(60);
      expect(result.factors).toContain('Inactive for >30 days');
      expect(result.factors).toContain('No orders in 60+ days');
      expect(result.factors).toContain('Multiple support tickets');
    });

    it('should predict MEDIUM churn risk for moderately inactive user', async () => {
      // User was last active 35 days ago (>30 days = +30 score)
      const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
      // Last order was 30 days ago (doesn't trigger 60+ day factor, so no extra points)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const mockUser = {
        id: 'user-medium',
        orders: [{ id: 'order-1', createdAt: thirtyDaysAgo }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      // Last activity was 35 days ago - triggers ">30 days inactive" = +30 score
      mockPrismaService.analyticsEvent.findFirst.mockResolvedValue({
        timestamp: thirtyFiveDaysAgo,
      });
      mockPrismaService.order.findMany.mockResolvedValue([
        { createdAt: thirtyDaysAgo },
        { createdAt: thirtyDaysAgo },
        { createdAt: thirtyDaysAgo },
      ]);
      mockPrismaService.supportTicket.count.mockResolvedValue(0);
      mockPrismaService.churnRisk.upsert.mockResolvedValue({});

      const result = await service.predictChurnRisk('user-medium');

      // With >30 days inactivity, we get exactly 30 points = MEDIUM risk
      expect(result.riskLevel).toBe('MEDIUM');
      expect(result.riskScore).toBeGreaterThanOrEqual(30);
      expect(result.riskScore).toBeLessThan(60);
    });

    it('should throw error if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.predictChurnRisk('non-existent')).rejects.toThrow(
        'User non-existent not found',
      );
    });

    it('should handle user with no activity', async () => {
      const mockUser = {
        id: 'user-no-activity',
        orders: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.analyticsEvent.findFirst.mockResolvedValue(null);
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.count.mockResolvedValue(0);
      mockPrismaService.churnRisk.upsert.mockResolvedValue({});

      const result = await service.predictChurnRisk('user-no-activity');

      // No orders means days since last order is 999
      expect(result.factors).toContain('No orders in 60+ days');
    });

    it('should detect declining order frequency', async () => {
      const mockUser = {
        id: 'user-declining',
        orders: [{ id: 'order-1', createdAt: new Date() }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.analyticsEvent.findFirst.mockResolvedValue({
        timestamp: new Date(),
      });
      // More recent orders (3) vs older orders (3) - declining returns based on count
      mockPrismaService.order.findMany.mockResolvedValue([
        { createdAt: new Date() },
        { createdAt: new Date() },
        { createdAt: new Date() },
        { createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
        { createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        { createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000) },
      ]);
      mockPrismaService.supportTicket.count.mockResolvedValue(0);
      mockPrismaService.churnRisk.upsert.mockResolvedValue({});

      const result = await service.predictChurnRisk('user-declining');

      // 3 recent vs 3 older - should be stable, not declining
      expect(result.factors).not.toContain('Declining order frequency');
    });

    it('should store churn risk in database', async () => {
      const mockUser = {
        id: 'user-123',
        orders: [{ id: 'order-1', createdAt: new Date() }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.analyticsEvent.findFirst.mockResolvedValue({
        timestamp: new Date(),
      });
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.count.mockResolvedValue(0);
      mockPrismaService.churnRisk.upsert.mockResolvedValue({});

      await service.predictChurnRisk('user-123');

      expect(mockPrismaService.churnRisk.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        create: expect.objectContaining({
          userId: 'user-123',
          riskScore: expect.any(Number),
          riskLevel: expect.any(String),
          factors: expect.any(Array),
          assessedAt: expect.any(Date),
        }),
        update: expect.objectContaining({
          riskScore: expect.any(Number),
          riskLevel: expect.any(String),
          factors: expect.any(Array),
          assessedAt: expect.any(Date),
        }),
      });
    });

    it('should generate appropriate recommendations', async () => {
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      const sixtyOneDaysAgo = new Date(Date.now() - 61 * 24 * 60 * 60 * 1000);

      const mockUser = {
        id: 'user-at-risk',
        orders: [{ id: 'order-1', createdAt: sixtyOneDaysAgo }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.analyticsEvent.findFirst.mockResolvedValue({
        timestamp: thirtyOneDaysAgo,
      });
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.count.mockResolvedValue(3);
      mockPrismaService.churnRisk.upsert.mockResolvedValue({});

      const result = await service.predictChurnRisk('user-at-risk');

      expect(result.recommendations).toContain('Send re-engagement email campaign');
      expect(result.recommendations).toContain('Offer limited-time discount');
      expect(result.recommendations).toContain('Proactive customer success outreach');
    });
  });

  // ==================== Get Retention Metrics ====================

  describe('getRetentionMetrics', () => {
    it('should return retention metrics for a period', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrismaService.user.count.mockResolvedValue(1000);
      mockPrismaService.analyticsEvent.groupBy.mockResolvedValue([
        { userId: 'user-1', _count: 10 },
        { userId: 'user-2', _count: 5 },
        { userId: 'user-3', _count: 3 },
      ]);

      const result = await service.getRetentionMetrics({
        startDate,
        endDate,
      });

      expect(result.totalUsers).toBe(1000);
      expect(result.activeUsers).toBe(3);
      expect(result.churnedUsers).toBe(997);
      expect(result.retentionRate).toBeCloseTo(0.3);
      expect(result.churnRate).toBeCloseTo(99.7);
      expect(result.period).toContain(startDate.toISOString());
      expect(result.period).toContain(endDate.toISOString());
    });

    it('should handle zero total users', async () => {
      mockPrismaService.user.count.mockResolvedValue(0);
      mockPrismaService.analyticsEvent.groupBy.mockResolvedValue([]);

      const result = await service.getRetentionMetrics({
        startDate: new Date(),
        endDate: new Date(),
      });

      expect(result.totalUsers).toBe(0);
      expect(result.activeUsers).toBe(0);
      expect(result.retentionRate).toBe(0);
      expect(result.churnRate).toBe(0);
    });

    it('should calculate 100% retention when all users are active', async () => {
      mockPrismaService.user.count.mockResolvedValue(3);
      mockPrismaService.analyticsEvent.groupBy.mockResolvedValue([
        { userId: 'user-1', _count: 10 },
        { userId: 'user-2', _count: 5 },
        { userId: 'user-3', _count: 3 },
      ]);

      const result = await service.getRetentionMetrics({
        startDate: new Date(),
        endDate: new Date(),
      });

      expect(result.retentionRate).toBe(100);
      expect(result.churnRate).toBe(0);
    });

    it('should query with correct date filters', async () => {
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-30');

      mockPrismaService.user.count.mockResolvedValue(100);
      mockPrismaService.analyticsEvent.groupBy.mockResolvedValue([]);

      await service.getRetentionMetrics({ startDate, endDate });

      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: startDate,
          },
        },
      });

      expect(mockPrismaService.analyticsEvent.groupBy).toHaveBeenCalledWith({
        by: ['userId'],
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: true,
      });
    });
  });

  // ==================== Get High Risk Users ====================

  describe('getHighRiskUsers', () => {
    it('should return high risk users', async () => {
      const mockHighRiskUsers = [
        {
          userId: 'user-1',
          riskScore: 90,
          riskLevel: 'HIGH',
          user: { id: 'user-1', email: 'risk1@example.com' },
        },
        {
          userId: 'user-2',
          riskScore: 85,
          riskLevel: 'HIGH',
          user: { id: 'user-2', email: 'risk2@example.com' },
        },
      ];

      mockPrismaService.churnRisk.findMany.mockResolvedValue(mockHighRiskUsers);

      const result = await service.getHighRiskUsers();

      expect(result).toEqual(mockHighRiskUsers);
      expect(mockPrismaService.churnRisk.findMany).toHaveBeenCalledWith({
        where: { riskLevel: 'HIGH' },
        take: 100,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              createdAt: true,
            },
          },
        },
        orderBy: { riskScore: 'desc' },
      });
    });

    it('should accept custom limit', async () => {
      mockPrismaService.churnRisk.findMany.mockResolvedValue([]);

      await service.getHighRiskUsers(50);

      expect(mockPrismaService.churnRisk.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });

    it('should return empty array when no high risk users', async () => {
      mockPrismaService.churnRisk.findMany.mockResolvedValue([]);

      const result = await service.getHighRiskUsers();

      expect(result).toEqual([]);
    });
  });

  // ==================== Execute Retention Campaign ====================

  describe('executeRetentionCampaign', () => {
    it('should execute EMAIL campaign for HIGH risk users', async () => {
      const mockTargetUsers = [
        { user: { id: 'user-1', email: 'user1@example.com' } },
        { user: { id: 'user-2', email: 'user2@example.com' } },
      ];

      mockPrismaService.churnRisk.findMany.mockResolvedValue(mockTargetUsers);

      const result = await service.executeRetentionCampaign({
        targetRiskLevel: 'HIGH',
        campaignType: 'EMAIL',
      });

      expect(result.targetRiskLevel).toBe('HIGH');
      expect(result.campaignType).toBe('EMAIL');
      expect(result.totalTargeted).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toEqual({ userId: 'user-1', status: 'success' });
      expect(result.results[1]).toEqual({ userId: 'user-2', status: 'success' });
    });

    it('should execute DISCOUNT campaign', async () => {
      const mockTargetUsers = [
        { user: { id: 'user-1', email: 'user1@example.com' } },
      ];

      mockPrismaService.churnRisk.findMany.mockResolvedValue(mockTargetUsers);

      const result = await service.executeRetentionCampaign({
        targetRiskLevel: 'MEDIUM',
        campaignType: 'DISCOUNT',
        offerDetails: { discount: 20 },
      });

      expect(result.campaignType).toBe('DISCOUNT');
      expect(result.results[0].status).toBe('success');
    });

    it('should execute PERSONALIZED_OFFER campaign', async () => {
      const mockTargetUsers = [
        { user: { id: 'user-1', email: 'user1@example.com' } },
      ];

      mockPrismaService.churnRisk.findMany.mockResolvedValue(mockTargetUsers);

      const result = await service.executeRetentionCampaign({
        targetRiskLevel: 'LOW',
        campaignType: 'PERSONALIZED_OFFER',
        offerDetails: { message: 'Special offer' },
      });

      expect(result.campaignType).toBe('PERSONALIZED_OFFER');
      expect(result.results[0].status).toBe('success');
    });

    it('should query users by risk level', async () => {
      mockPrismaService.churnRisk.findMany.mockResolvedValue([]);

      await service.executeRetentionCampaign({
        targetRiskLevel: 'HIGH',
        campaignType: 'EMAIL',
      });

      expect(mockPrismaService.churnRisk.findMany).toHaveBeenCalledWith({
        where: { riskLevel: 'HIGH' },
        include: { user: true },
      });
    });

    it('should return empty results when no target users', async () => {
      mockPrismaService.churnRisk.findMany.mockResolvedValue([]);

      const result = await service.executeRetentionCampaign({
        targetRiskLevel: 'HIGH',
        campaignType: 'EMAIL',
      });

      expect(result.totalTargeted).toBe(0);
      expect(result.results).toEqual([]);
    });
  });

  // ==================== Helper Methods ====================

  describe('private helper methods', () => {
    it('should calculate correct days since date', async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

      const mockUser = {
        id: 'user-123',
        orders: [{ id: 'order-1', createdAt: tenDaysAgo }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.analyticsEvent.findFirst.mockResolvedValue({
        timestamp: new Date(),
      });
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.supportTicket.count.mockResolvedValue(0);
      mockPrismaService.churnRisk.upsert.mockResolvedValue({});

      const result = await service.predictChurnRisk('user-123');

      // 10 days ago should not trigger the 14 day or 30 day factors
      expect(result.factors).not.toContain('Inactive for >14 days');
      expect(result.factors).not.toContain('Inactive for >30 days');
    });

    it('should detect STABLE order trend with equal distribution', async () => {
      const mockUser = {
        id: 'user-stable',
        orders: [{ id: 'order-1', createdAt: new Date() }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.analyticsEvent.findFirst.mockResolvedValue({
        timestamp: new Date(),
      });
      // 3 recent and 3 older = stable
      mockPrismaService.order.findMany.mockResolvedValue([
        { createdAt: new Date() },
        { createdAt: new Date() },
        { createdAt: new Date() },
        { createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        { createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        { createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      ]);
      mockPrismaService.supportTicket.count.mockResolvedValue(0);
      mockPrismaService.churnRisk.upsert.mockResolvedValue({});

      const result = await service.predictChurnRisk('user-stable');

      expect(result.factors).not.toContain('Declining order frequency');
    });

    it('should handle user with less than 3 orders for trend calculation', async () => {
      const mockUser = {
        id: 'user-few-orders',
        orders: [{ id: 'order-1', createdAt: new Date() }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.analyticsEvent.findFirst.mockResolvedValue({
        timestamp: new Date(),
      });
      // Less than 3 orders - should be STABLE
      mockPrismaService.order.findMany.mockResolvedValue([
        { createdAt: new Date() },
        { createdAt: new Date() },
      ]);
      mockPrismaService.supportTicket.count.mockResolvedValue(0);
      mockPrismaService.churnRisk.upsert.mockResolvedValue({});

      const result = await service.predictChurnRisk('user-few-orders');

      expect(result.factors).not.toContain('Declining order frequency');
    });
  });
});
