import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ABMService, ABMAccount, ABMCampaign, ABMEngagement } from './abm.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('ABMService', () => {
  let service: ABMService;
  let prisma: PrismaService;

  const mockPrismaService = {
    aBMAccount: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    aBMCampaign: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    aBMEngagement: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockABMAccount = {
    id: 'account-123',
    organizationId: 'org-123',
    name: 'Acme Corporation',
    industry: 'Technology',
    size: 'ENTERPRISE',
    revenue: 10000000,
    tier: 'STRATEGIC',
    status: 'TARGET',
    assignedTo: 'user-123',
    metadata: { source: 'referral' },
    score: 50,
    engagementCount: 5,
    lastEngagementDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    organization: {
      id: 'org-123',
      name: 'Test Organization',
      slug: 'test-org',
    },
    engagements: [],
  };

  const mockABMCampaign = {
    id: 'abm-campaign-123',
    name: 'Enterprise Q1 Campaign',
    description: 'Target enterprise accounts',
    targetAccounts: ['account-123', 'account-456'],
    strategy: 'ONE_TO_FEW',
    status: 'ACTIVE',
    budget: 50000,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-03-31'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEngagement = {
    id: 'engagement-123',
    accountId: 'account-123',
    type: 'MEETING',
    date: new Date(),
    outcome: 'Positive interest',
    notes: 'Discussed product features',
    score: 5,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ABMService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ABMService>(ABMService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAccount', () => {
    it('should create a new ABM account', async () => {
      const createData: Omit<ABMAccount, 'id'> = {
        organizationId: 'org-123',
        name: 'Acme Corporation',
        industry: 'Technology',
        size: 'ENTERPRISE',
        revenue: 10000000,
        tier: 'STRATEGIC',
        status: 'TARGET',
        assignedTo: 'user-123',
      };

      mockPrismaService.aBMAccount.create.mockResolvedValue(mockABMAccount);

      const result = await service.createAccount(createData);

      expect(result).toEqual(mockABMAccount);
      expect(mockPrismaService.aBMAccount.create).toHaveBeenCalledWith({
        data: {
          organizationId: createData.organizationId,
          name: createData.name,
          industry: createData.industry,
          size: createData.size,
          revenue: createData.revenue,
          tier: createData.tier,
          status: 'TARGET',
          assignedTo: createData.assignedTo,
          metadata: undefined,
          score: 0,
          engagementCount: 0,
        },
      });
    });

    it('should create account with default status TARGET', async () => {
      const createData: Omit<ABMAccount, 'id'> = {
        organizationId: 'org-123',
        name: 'New Company',
        industry: 'Finance',
        size: 'MID_MARKET',
        tier: 'PRIORITY',
        status: 'TARGET',
      };

      mockPrismaService.aBMAccount.create.mockResolvedValue(mockABMAccount);

      await service.createAccount(createData);

      expect(mockPrismaService.aBMAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'TARGET',
          }),
        })
      );
    });
  });

  describe('getAccounts', () => {
    it('should return all accounts without filters', async () => {
      const mockAccounts = [mockABMAccount];
      mockPrismaService.aBMAccount.findMany.mockResolvedValue(mockAccounts);

      const result = await service.getAccounts();

      expect(result).toEqual(mockAccounts);
      expect(mockPrismaService.aBMAccount.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { score: 'desc' },
      });
    });

    it('should return accounts filtered by tier', async () => {
      mockPrismaService.aBMAccount.findMany.mockResolvedValue([mockABMAccount]);

      await service.getAccounts({ tier: 'STRATEGIC' });

      expect(mockPrismaService.aBMAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tier: 'STRATEGIC',
          }),
        })
      );
    });

    it('should return accounts filtered by status', async () => {
      mockPrismaService.aBMAccount.findMany.mockResolvedValue([mockABMAccount]);

      await service.getAccounts({ status: 'ENGAGED' });

      expect(mockPrismaService.aBMAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ENGAGED',
          }),
        })
      );
    });

    it('should return accounts filtered by industry', async () => {
      mockPrismaService.aBMAccount.findMany.mockResolvedValue([mockABMAccount]);

      await service.getAccounts({ industry: 'Technology' });

      expect(mockPrismaService.aBMAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            industry: 'Technology',
          }),
        })
      );
    });

    it('should return accounts filtered by assignedTo', async () => {
      mockPrismaService.aBMAccount.findMany.mockResolvedValue([mockABMAccount]);

      await service.getAccounts({ assignedTo: 'user-123' });

      expect(mockPrismaService.aBMAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedTo: 'user-123',
          }),
        })
      );
    });
  });

  describe('getAccountById', () => {
    it('should return an account by id with engagements', async () => {
      mockPrismaService.aBMAccount.findUnique.mockResolvedValue(mockABMAccount);

      const result = await service.getAccountById('account-123');

      expect(result).toEqual(mockABMAccount);
      expect(mockPrismaService.aBMAccount.findUnique).toHaveBeenCalledWith({
        where: { id: 'account-123' },
        include: {
          organization: true,
          engagements: {
            orderBy: { date: 'desc' },
            take: 20,
          },
        },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      mockPrismaService.aBMAccount.findUnique.mockResolvedValue(null);

      await expect(service.getAccountById('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.getAccountById('non-existent')).rejects.toThrow('ABM account non-existent not found');
    });
  });

  describe('updateAccount', () => {
    it('should update an ABM account', async () => {
      const updates: Partial<ABMAccount> = {
        name: 'Updated Company Name',
        status: 'ENGAGED',
        tier: 'PRIORITY',
      };
      const updatedAccount = { ...mockABMAccount, ...updates };

      mockPrismaService.aBMAccount.findUnique.mockResolvedValue(mockABMAccount);
      mockPrismaService.aBMAccount.update.mockResolvedValue(updatedAccount);

      const result = await service.updateAccount('account-123', updates);

      expect(result).toEqual(updatedAccount);
      expect(mockPrismaService.aBMAccount.update).toHaveBeenCalledWith({
        where: { id: 'account-123' },
        data: {
          name: updates.name,
          industry: undefined,
          size: undefined,
          revenue: undefined,
          tier: updates.tier,
          status: updates.status,
          assignedTo: undefined,
          metadata: undefined,
        },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      mockPrismaService.aBMAccount.findUnique.mockResolvedValue(null);

      await expect(service.updateAccount('non-existent', { name: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAccount', () => {
    it('should delete an ABM account', async () => {
      mockPrismaService.aBMAccount.findUnique.mockResolvedValue(mockABMAccount);
      mockPrismaService.aBMAccount.delete.mockResolvedValue(mockABMAccount);

      const result = await service.deleteAccount('account-123');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.aBMAccount.delete).toHaveBeenCalledWith({
        where: { id: 'account-123' },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      mockPrismaService.aBMAccount.findUnique.mockResolvedValue(null);

      await expect(service.deleteAccount('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createCampaign', () => {
    it('should create a new ABM campaign', async () => {
      const createData: Omit<ABMCampaign, 'id'> = {
        name: 'Enterprise Q1 Campaign',
        description: 'Target enterprise accounts',
        targetAccounts: ['account-123', 'account-456'],
        strategy: 'ONE_TO_FEW',
        status: 'PLANNING',
        budget: 50000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
      };

      mockPrismaService.aBMCampaign.create.mockResolvedValue(mockABMCampaign);

      const result = await service.createCampaign(createData);

      expect(result).toEqual(mockABMCampaign);
      expect(mockPrismaService.aBMCampaign.create).toHaveBeenCalledWith({
        data: {
          name: createData.name,
          description: createData.description,
          targetAccounts: createData.targetAccounts,
          strategy: createData.strategy,
          status: 'PLANNING',
          budget: createData.budget,
          startDate: createData.startDate,
          endDate: createData.endDate,
        },
      });
    });

    it('should create campaign with default status PLANNING', async () => {
      const createData: Omit<ABMCampaign, 'id'> = {
        name: 'New Campaign',
        targetAccounts: ['account-123'],
        strategy: 'ONE_TO_ONE',
        status: 'PLANNING',
      };

      mockPrismaService.aBMCampaign.create.mockResolvedValue(mockABMCampaign);

      await service.createCampaign(createData);

      expect(mockPrismaService.aBMCampaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PLANNING',
          }),
        })
      );
    });
  });

  describe('getCampaigns', () => {
    it('should return all ABM campaigns without filters', async () => {
      const mockCampaigns = [mockABMCampaign];
      mockPrismaService.aBMCampaign.findMany.mockResolvedValue(mockCampaigns);

      const result = await service.getCampaigns();

      expect(result).toEqual(mockCampaigns);
      expect(mockPrismaService.aBMCampaign.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return campaigns filtered by status', async () => {
      mockPrismaService.aBMCampaign.findMany.mockResolvedValue([mockABMCampaign]);

      await service.getCampaigns({ status: 'ACTIVE' });

      expect(mockPrismaService.aBMCampaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should return campaigns filtered by strategy', async () => {
      mockPrismaService.aBMCampaign.findMany.mockResolvedValue([mockABMCampaign]);

      await service.getCampaigns({ strategy: 'ONE_TO_ONE' });

      expect(mockPrismaService.aBMCampaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            strategy: 'ONE_TO_ONE',
          }),
        })
      );
    });
  });

  describe('updateCampaign', () => {
    it('should update an ABM campaign', async () => {
      const updates: Partial<ABMCampaign> = {
        name: 'Updated Campaign',
        status: 'ACTIVE',
      };
      const updatedCampaign = { ...mockABMCampaign, ...updates };

      mockPrismaService.aBMCampaign.findUnique.mockResolvedValue(mockABMCampaign);
      mockPrismaService.aBMCampaign.update.mockResolvedValue(updatedCampaign);

      const result = await service.updateCampaign('abm-campaign-123', updates);

      expect(result).toEqual(updatedCampaign);
    });

    it('should throw NotFoundException when campaign not found', async () => {
      mockPrismaService.aBMCampaign.findUnique.mockResolvedValue(null);

      await expect(service.updateCampaign('non-existent', { name: 'Test' })).rejects.toThrow(NotFoundException);
      await expect(service.updateCampaign('non-existent', { name: 'Test' })).rejects.toThrow(
        'ABM campaign non-existent not found'
      );
    });
  });

  describe('trackEngagement', () => {
    it('should track an engagement and update account metrics', async () => {
      const engagement: ABMEngagement = {
        accountId: 'account-123',
        type: 'MEETING',
        date: new Date(),
        outcome: 'Positive interest',
        notes: 'Discussed product features',
      };

      mockPrismaService.aBMAccount.findUnique.mockResolvedValue(mockABMAccount);
      mockPrismaService.aBMEngagement.create.mockResolvedValue(mockEngagement);
      mockPrismaService.aBMAccount.update.mockResolvedValue(mockABMAccount);

      const result = await service.trackEngagement(engagement);

      expect(result).toEqual(mockEngagement);
      expect(mockPrismaService.aBMEngagement.create).toHaveBeenCalledWith({
        data: {
          accountId: engagement.accountId,
          type: engagement.type,
          date: engagement.date,
          outcome: engagement.outcome,
          notes: engagement.notes,
          score: 5, // MEETING score
        },
      });
      expect(mockPrismaService.aBMAccount.update).toHaveBeenCalledWith({
        where: { id: 'account-123' },
        data: {
          engagementCount: 6, // 5 + 1
          score: 55, // 50 + 5
          lastEngagementDate: engagement.date,
        },
      });
    });

    it('should use provided score instead of calculated', async () => {
      const engagement: ABMEngagement = {
        accountId: 'account-123',
        type: 'EMAIL',
        date: new Date(),
        score: 10, // Custom score instead of default 1
      };

      mockPrismaService.aBMAccount.findUnique.mockResolvedValue(mockABMAccount);
      mockPrismaService.aBMEngagement.create.mockResolvedValue({ ...mockEngagement, score: 10 });
      mockPrismaService.aBMAccount.update.mockResolvedValue(mockABMAccount);

      await service.trackEngagement(engagement);

      expect(mockPrismaService.aBMEngagement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            score: 10,
          }),
        })
      );
    });

    it('should calculate correct scores for different engagement types', async () => {
      const engagementTypes = [
        { type: 'EMAIL', expectedScore: 1 },
        { type: 'CALL', expectedScore: 3 },
        { type: 'MEETING', expectedScore: 5 },
        { type: 'DEMO', expectedScore: 10 },
        { type: 'PROPOSAL', expectedScore: 15 },
        { type: 'EVENT', expectedScore: 8 },
      ];

      for (const { type, expectedScore } of engagementTypes) {
        jest.clearAllMocks();
        mockPrismaService.aBMAccount.findUnique.mockResolvedValue(mockABMAccount);
        mockPrismaService.aBMEngagement.create.mockResolvedValue({ ...mockEngagement, score: expectedScore });
        mockPrismaService.aBMAccount.update.mockResolvedValue(mockABMAccount);

        const engagement: ABMEngagement = {
          accountId: 'account-123',
          type: type as ABMEngagement['type'],
          date: new Date(),
        };

        await service.trackEngagement(engagement);

        expect(mockPrismaService.aBMEngagement.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              score: expectedScore,
            }),
          })
        );
      }
    });

    it('should throw NotFoundException when account not found', async () => {
      mockPrismaService.aBMAccount.findUnique.mockResolvedValue(null);

      const engagement: ABMEngagement = {
        accountId: 'non-existent',
        type: 'MEETING',
        date: new Date(),
      };

      await expect(service.trackEngagement(engagement)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAccountEngagements', () => {
    it('should return all engagements for an account', async () => {
      const mockEngagements = [mockEngagement];
      mockPrismaService.aBMAccount.findUnique.mockResolvedValue(mockABMAccount);
      mockPrismaService.aBMEngagement.findMany.mockResolvedValue(mockEngagements);

      const result = await service.getAccountEngagements('account-123');

      expect(result).toEqual(mockEngagements);
      expect(mockPrismaService.aBMEngagement.findMany).toHaveBeenCalledWith({
        where: { accountId: 'account-123' },
        orderBy: { date: 'desc' },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      mockPrismaService.aBMAccount.findUnique.mockResolvedValue(null);

      await expect(service.getAccountEngagements('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('calculateAccountHealth', () => {
    it('should calculate health score based on engagements', async () => {
      const recentEngagements = [
        { ...mockEngagement, date: new Date(), type: 'MEETING' },
        { ...mockEngagement, date: new Date(), type: 'CALL' },
        { ...mockEngagement, date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), type: 'EMAIL' },
      ];
      const accountWithEngagements = {
        ...mockABMAccount,
        lastEngagementDate: new Date(),
        tier: 'STRATEGIC',
      };

      mockPrismaService.aBMAccount.findUnique.mockResolvedValue(accountWithEngagements);
      mockPrismaService.aBMEngagement.findMany.mockResolvedValue(recentEngagements);

      const result = await service.calculateAccountHealth('account-123');

      expect(result).toHaveProperty('accountId', 'account-123');
      expect(result).toHaveProperty('accountName', 'Acme Corporation');
      expect(result).toHaveProperty('healthScore');
      expect(result.healthScore).toBeLessThanOrEqual(100);
      expect(result.healthScore).toBeGreaterThanOrEqual(0);
    });

    it('should include tier weight in health score', async () => {
      const strategicAccount = { ...mockABMAccount, tier: 'STRATEGIC', lastEngagementDate: null };
      const standardAccount = { ...mockABMAccount, tier: 'STANDARD', lastEngagementDate: null };

      mockPrismaService.aBMEngagement.findMany.mockResolvedValue([]);

      mockPrismaService.aBMAccount.findUnique.mockResolvedValue(strategicAccount);
      const strategicResult = await service.calculateAccountHealth('account-123');

      mockPrismaService.aBMAccount.findUnique.mockResolvedValue(standardAccount);
      const standardResult = await service.calculateAccountHealth('account-123');

      expect(strategicResult.healthScore).toBeGreaterThan(standardResult.healthScore);
    });

    it('should throw NotFoundException when account not found', async () => {
      mockPrismaService.aBMAccount.findUnique.mockResolvedValue(null);

      await expect(service.calculateAccountHealth('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getABMAnalytics', () => {
    it('should return ABM analytics summary', async () => {
      mockPrismaService.aBMAccount.count.mockResolvedValue(100);
      mockPrismaService.aBMAccount.groupBy
        .mockResolvedValueOnce([
          { tier: 'STRATEGIC', _count: 20 },
          { tier: 'PRIORITY', _count: 30 },
          { tier: 'STANDARD', _count: 50 },
        ])
        .mockResolvedValueOnce([
          { status: 'TARGET', _count: 40 },
          { status: 'ENGAGED', _count: 30 },
          { status: 'QUALIFIED', _count: 20 },
          { status: 'CUSTOMER', _count: 10 },
        ]);
      mockPrismaService.aBMEngagement.count.mockResolvedValue(500);
      mockPrismaService.aBMCampaign.count.mockResolvedValue(5);

      const result = await service.getABMAnalytics();

      expect(result).toEqual({
        totalAccounts: 100,
        accountsByTier: [
          { tier: 'STRATEGIC', _count: 20 },
          { tier: 'PRIORITY', _count: 30 },
          { tier: 'STANDARD', _count: 50 },
        ],
        accountsByStatus: [
          { status: 'TARGET', _count: 40 },
          { status: 'ENGAGED', _count: 30 },
          { status: 'QUALIFIED', _count: 20 },
          { status: 'CUSTOMER', _count: 10 },
        ],
        totalEngagements: 500,
        activeCampaigns: 5,
      });
    });
  });
});
