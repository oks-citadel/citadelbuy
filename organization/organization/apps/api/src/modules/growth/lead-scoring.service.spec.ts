import { Test, TestingModule } from '@nestjs/testing';
import { LeadScoringService } from './lead-scoring.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('LeadScoringService', () => {
  let service: LeadScoringService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    analyticsEvent: {
      count: jest.fn(),
    },
    leadScore: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadScoringService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LeadScoringService>(LeadScoringService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== Calculate Lead Score ====================

  describe('calculateLeadScore', () => {
    it('should calculate lead score for a basic user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        profile: { id: 'profile-123' },
        orders: [],
        organizationMemberships: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.analyticsEvent.count.mockResolvedValue(0);
      mockPrismaService.leadScore.upsert.mockResolvedValue({
        userId: 'user-123',
        score: 25,
        tier: 'COLD',
      });

      const result = await service.calculateLeadScore('user-123');

      expect(result.userId).toBe('user-123');
      expect(result.score).toBe(25); // 10 (emailVerified) + 15 (profileCompleted)
      expect(result.tier).toBe('COLD');
      expect(result.factors).toEqual({
        emailVerified: 10,
        profileCompleted: 15,
      });
    });

    it('should calculate HOT tier for high-engagement users', async () => {
      const mockUser = {
        id: 'user-hot',
        email: 'hot@example.com',
        emailVerified: true,
        profile: { id: 'profile-123' },
        orders: [
          { id: 'order-1', total: 5000 },
          { id: 'order-2', total: 6000 },
        ],
        organizationMemberships: [{ id: 'org-1' }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.analyticsEvent.count
        .mockResolvedValueOnce(20) // recent activity
        .mockResolvedValueOnce(100); // engagement
      mockPrismaService.leadScore.upsert.mockResolvedValue({
        userId: 'user-hot',
        score: 165,
        tier: 'HOT',
      });

      const result = await service.calculateLeadScore('user-hot');

      expect(result.tier).toBe('HOT');
      expect(result.score).toBe(165);
      expect(result.factors).toEqual({
        emailVerified: 10,
        profileCompleted: 15,
        organizationMember: 20,
        firstOrder: 25,
        repeatCustomer: 30,
        highOrderValue: 35,
        recentActivity: 10,
        engagementScore: 20,
      });
    });

    it('should calculate WARM tier for medium-engagement users', async () => {
      const mockUser = {
        id: 'user-warm',
        email: 'warm@example.com',
        emailVerified: true,
        profile: { id: 'profile-123' },
        orders: [{ id: 'order-1', total: 500 }],
        organizationMemberships: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.analyticsEvent.count.mockResolvedValue(0);
      mockPrismaService.leadScore.upsert.mockResolvedValue({
        userId: 'user-warm',
        score: 50,
        tier: 'WARM',
      });

      const result = await service.calculateLeadScore('user-warm');

      expect(result.tier).toBe('WARM');
      expect(result.score).toBe(50); // 10 + 15 + 25 (first order)
    });

    it('should throw error if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.calculateLeadScore('non-existent')).rejects.toThrow(
        'User non-existent not found',
      );
    });

    it('should add high order value factor for orders > 10000', async () => {
      const mockUser = {
        id: 'user-whale',
        email: 'whale@example.com',
        emailVerified: false,
        profile: null,
        orders: [{ id: 'order-1', total: 15000 }],
        organizationMemberships: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.analyticsEvent.count.mockResolvedValue(0);
      mockPrismaService.leadScore.upsert.mockResolvedValue({});

      const result = await service.calculateLeadScore('user-whale');

      expect(result.factors.highOrderValue).toBe(35);
      expect(result.factors.firstOrder).toBe(25);
    });

    it('should add repeat customer factor for multiple orders', async () => {
      const mockUser = {
        id: 'user-repeat',
        email: 'repeat@example.com',
        emailVerified: false,
        profile: null,
        orders: [
          { id: 'order-1', total: 100 },
          { id: 'order-2', total: 200 },
        ],
        organizationMemberships: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.analyticsEvent.count.mockResolvedValue(0);
      mockPrismaService.leadScore.upsert.mockResolvedValue({});

      const result = await service.calculateLeadScore('user-repeat');

      expect(result.factors.repeatCustomer).toBe(30);
    });

    it('should add recent activity factor when activity > 10', async () => {
      const mockUser = {
        id: 'user-active',
        email: 'active@example.com',
        emailVerified: false,
        profile: null,
        orders: [],
        organizationMemberships: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.analyticsEvent.count
        .mockResolvedValueOnce(15) // recent activity
        .mockResolvedValueOnce(0); // engagement
      mockPrismaService.leadScore.upsert.mockResolvedValue({});

      const result = await service.calculateLeadScore('user-active');

      expect(result.factors.recentActivity).toBe(10);
    });

    it('should add engagement factor when total events > 50', async () => {
      const mockUser = {
        id: 'user-engaged',
        email: 'engaged@example.com',
        emailVerified: false,
        profile: null,
        orders: [],
        organizationMemberships: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.analyticsEvent.count
        .mockResolvedValueOnce(0) // recent activity
        .mockResolvedValueOnce(100); // engagement
      mockPrismaService.leadScore.upsert.mockResolvedValue({});

      const result = await service.calculateLeadScore('user-engaged');

      expect(result.factors.engagementScore).toBe(20);
    });

    it('should store lead score in database', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        profile: null,
        orders: [],
        organizationMemberships: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.analyticsEvent.count.mockResolvedValue(0);
      mockPrismaService.leadScore.upsert.mockResolvedValue({});

      await service.calculateLeadScore('user-123');

      expect(mockPrismaService.leadScore.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        create: expect.objectContaining({
          userId: 'user-123',
          score: 10,
          tier: 'COLD',
        }),
        update: expect.objectContaining({
          score: 10,
          tier: 'COLD',
        }),
      });
    });
  });

  // ==================== Get Leads By Tier ====================

  describe('getLeadsByTier', () => {
    it('should return leads by HOT tier', async () => {
      const mockLeads = [
        { userId: 'user-1', score: 90, tier: 'HOT', user: { id: 'user-1', email: 'hot1@example.com' } },
        { userId: 'user-2', score: 85, tier: 'HOT', user: { id: 'user-2', email: 'hot2@example.com' } },
      ];

      mockPrismaService.leadScore.findMany.mockResolvedValue(mockLeads);

      const result = await service.getLeadsByTier('HOT');

      expect(result).toEqual(mockLeads);
      expect(mockPrismaService.leadScore.findMany).toHaveBeenCalledWith({
        where: { tier: 'HOT' },
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
        orderBy: { score: 'desc' },
      });
    });

    it('should return leads by WARM tier', async () => {
      const mockLeads = [
        { userId: 'user-3', score: 50, tier: 'WARM', user: { id: 'user-3', email: 'warm@example.com' } },
      ];

      mockPrismaService.leadScore.findMany.mockResolvedValue(mockLeads);

      const result = await service.getLeadsByTier('WARM');

      expect(result).toEqual(mockLeads);
      expect(mockPrismaService.leadScore.findMany).toHaveBeenCalledWith({
        where: { tier: 'WARM' },
        include: expect.any(Object),
        orderBy: { score: 'desc' },
      });
    });

    it('should return leads by COLD tier', async () => {
      mockPrismaService.leadScore.findMany.mockResolvedValue([]);

      const result = await service.getLeadsByTier('COLD');

      expect(result).toEqual([]);
      expect(mockPrismaService.leadScore.findMany).toHaveBeenCalledWith({
        where: { tier: 'COLD' },
        include: expect.any(Object),
        orderBy: { score: 'desc' },
      });
    });
  });

  // ==================== Get Top Leads ====================

  describe('getTopLeads', () => {
    it('should return top 50 leads by default', async () => {
      const mockLeads = Array.from({ length: 50 }, (_, i) => ({
        userId: `user-${i}`,
        score: 100 - i,
        tier: i < 10 ? 'HOT' : i < 30 ? 'WARM' : 'COLD',
      }));

      mockPrismaService.leadScore.findMany.mockResolvedValue(mockLeads);

      const result = await service.getTopLeads();

      expect(result).toHaveLength(50);
      expect(mockPrismaService.leadScore.findMany).toHaveBeenCalledWith({
        take: 50,
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
        orderBy: { score: 'desc' },
      });
    });

    it('should return custom limit of leads', async () => {
      const mockLeads = Array.from({ length: 10 }, (_, i) => ({
        userId: `user-${i}`,
        score: 100 - i,
      }));

      mockPrismaService.leadScore.findMany.mockResolvedValue(mockLeads);

      const result = await service.getTopLeads(10);

      expect(result).toHaveLength(10);
      expect(mockPrismaService.leadScore.findMany).toHaveBeenCalledWith({
        take: 10,
        include: expect.any(Object),
        orderBy: { score: 'desc' },
      });
    });

    it('should return empty array when no leads', async () => {
      mockPrismaService.leadScore.findMany.mockResolvedValue([]);

      const result = await service.getTopLeads();

      expect(result).toEqual([]);
    });
  });

  // ==================== Recalculate All Scores ====================

  describe('recalculateAllScores', () => {
    it('should recalculate scores for all users', async () => {
      const mockUsers = [
        { id: 'user-1' },
        { id: 'user-2' },
        { id: 'user-3' },
      ];

      const mockUserDetails = {
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: true,
        profile: null,
        orders: [],
        organizationMemberships: [],
      };

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserDetails);
      mockPrismaService.analyticsEvent.count.mockResolvedValue(0);
      mockPrismaService.leadScore.upsert.mockResolvedValue({});

      const result = await service.recalculateAllScores();

      expect(result.processed).toBe(3);
      expect(result.total).toBe(3);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(3);
    });

    it('should handle errors for individual users', async () => {
      const mockUsers = [
        { id: 'user-1' },
        { id: 'user-2' },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({
          id: 'user-1',
          email: 'test@example.com',
          emailVerified: true,
          profile: null,
          orders: [],
          organizationMemberships: [],
        })
        .mockResolvedValueOnce(null); // Second user not found

      mockPrismaService.analyticsEvent.count.mockResolvedValue(0);
      mockPrismaService.leadScore.upsert.mockResolvedValue({});

      const result = await service.recalculateAllScores();

      // Only 1 processed successfully, 1 failed
      expect(result.processed).toBe(1);
      expect(result.total).toBe(2);
    });

    it('should return correct counts when no users', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.recalculateAllScores();

      expect(result.processed).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  // ==================== Get Scoring Analytics ====================

  describe('getScoringAnalytics', () => {
    it('should return scoring analytics', async () => {
      mockPrismaService.leadScore.count
        .mockResolvedValueOnce(1000) // total
        .mockResolvedValueOnce(200) // hot
        .mockResolvedValueOnce(400) // warm
        .mockResolvedValueOnce(400); // cold

      mockPrismaService.leadScore.aggregate.mockResolvedValue({
        _avg: { score: 45.5 },
      });

      const result = await service.getScoringAnalytics();

      expect(result).toEqual({
        totalLeads: 1000,
        distribution: {
          hot: 200,
          warm: 400,
          cold: 400,
        },
        averageScore: 45.5,
      });
    });

    it('should handle zero leads', async () => {
      mockPrismaService.leadScore.count.mockResolvedValue(0);
      mockPrismaService.leadScore.aggregate.mockResolvedValue({
        _avg: { score: null },
      });

      const result = await service.getScoringAnalytics();

      expect(result).toEqual({
        totalLeads: 0,
        distribution: {
          hot: 0,
          warm: 0,
          cold: 0,
        },
        averageScore: 0,
      });
    });

    it('should call correct queries', async () => {
      mockPrismaService.leadScore.count.mockResolvedValue(100);
      mockPrismaService.leadScore.aggregate.mockResolvedValue({
        _avg: { score: 50 },
      });

      await service.getScoringAnalytics();

      expect(mockPrismaService.leadScore.count).toHaveBeenCalledTimes(4);
      expect(mockPrismaService.leadScore.count).toHaveBeenCalledWith({ where: { tier: 'HOT' } });
      expect(mockPrismaService.leadScore.count).toHaveBeenCalledWith({ where: { tier: 'WARM' } });
      expect(mockPrismaService.leadScore.count).toHaveBeenCalledWith({ where: { tier: 'COLD' } });
      expect(mockPrismaService.leadScore.aggregate).toHaveBeenCalledWith({
        _avg: { score: true },
      });
    });
  });
});
