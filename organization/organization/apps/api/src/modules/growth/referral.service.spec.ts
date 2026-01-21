import { Test, TestingModule } from '@nestjs/testing';
import { ReferralService } from './referral.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ReferralService', () => {
  let service: ReferralService;

  const mockPrismaService = {
    referralProgram: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    referralCode: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    referral: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    userCredit: {
      create: jest.fn(),
    },
    coupon: {
      create: jest.fn(),
    },
    loyaltyPoints: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReferralService>(ReferralService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== Create Referral Program ====================

  describe('createReferralProgram', () => {
    it('should create a referral program', async () => {
      const program = {
        name: 'Test Program',
        description: 'A test referral program',
        referrerReward: { type: 'CREDIT' as const, value: 10, currency: 'USD' },
        refereeReward: { type: 'CREDIT' as const, value: 5, currency: 'USD' },
        requirementType: 'FIRST_ORDER' as const,
        requirementValue: 50,
        maxRedemptions: 100,
        active: true,
      };

      const mockCreated = {
        id: 'program-123',
        ...program,
      };

      mockPrismaService.referralProgram.create.mockResolvedValue(mockCreated);

      const result = await service.createReferralProgram(program);

      expect(result).toEqual(mockCreated);
      expect(mockPrismaService.referralProgram.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Program',
          description: 'A test referral program',
          referrerReward: 10,
          refereeReward: 5,
          rewardType: 'CREDIT',
          requirementType: 'FIRST_ORDER',
          requirementValue: 50,
          maxRedemptions: 100,
          active: true,
        }),
      });
    });

    it('should create a program with default values', async () => {
      const program = {
        name: 'Basic Program',
        referrerReward: { type: 'POINTS' as const, value: 100 },
        refereeReward: { type: 'POINTS' as const, value: 50 },
        active: true,
      };

      mockPrismaService.referralProgram.create.mockResolvedValue({
        id: 'program-124',
        ...program,
      });

      await service.createReferralProgram(program);

      expect(mockPrismaService.referralProgram.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requirementType: 'NONE',
        }),
      });
    });
  });

  // ==================== Get Referral Programs ====================

  describe('getReferralPrograms', () => {
    it('should return all referral programs', async () => {
      const mockPrograms = [
        { id: 'program-1', name: 'Program 1', active: true },
        { id: 'program-2', name: 'Program 2', active: false },
      ];

      mockPrismaService.referralProgram.findMany.mockResolvedValue(mockPrograms);

      const result = await service.getReferralPrograms();

      expect(result).toEqual(mockPrograms);
      expect(mockPrismaService.referralProgram.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return only active programs when specified', async () => {
      const mockPrograms = [
        { id: 'program-1', name: 'Program 1', active: true },
      ];

      mockPrismaService.referralProgram.findMany.mockResolvedValue(mockPrograms);

      const result = await service.getReferralPrograms(true);

      expect(result).toEqual(mockPrograms);
      expect(mockPrismaService.referralProgram.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ==================== Update Referral Program ====================

  describe('updateReferralProgram', () => {
    it('should update a referral program', async () => {
      const existingProgram = { id: 'program-123', name: 'Old Name', active: true };
      const updatedProgram = { id: 'program-123', name: 'New Name', active: true };

      mockPrismaService.referralProgram.findUnique.mockResolvedValue(existingProgram);
      mockPrismaService.referralProgram.update.mockResolvedValue(updatedProgram);

      const result = await service.updateReferralProgram('program-123', { name: 'New Name' });

      expect(result).toEqual(updatedProgram);
      expect(mockPrismaService.referralProgram.update).toHaveBeenCalledWith({
        where: { id: 'program-123' },
        data: expect.objectContaining({ name: 'New Name' }),
      });
    });

    it('should throw NotFoundException if program not found', async () => {
      mockPrismaService.referralProgram.findUnique.mockResolvedValue(null);

      await expect(
        service.updateReferralProgram('non-existent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update rewards', async () => {
      mockPrismaService.referralProgram.findUnique.mockResolvedValue({ id: 'program-123' });
      mockPrismaService.referralProgram.update.mockResolvedValue({ id: 'program-123' });

      await service.updateReferralProgram('program-123', {
        referrerReward: { type: 'DISCOUNT', value: 20 },
        refereeReward: { type: 'DISCOUNT', value: 10 },
      });

      expect(mockPrismaService.referralProgram.update).toHaveBeenCalledWith({
        where: { id: 'program-123' },
        data: expect.objectContaining({
          referrerReward: 20,
          refereeReward: 10,
          rewardType: 'DISCOUNT',
        }),
      });
    });
  });

  // ==================== Generate Referral Code ====================

  describe('generateReferralCode', () => {
    it('should generate a referral code for a user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockProgram = { id: 'program-123', active: true };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.referralProgram.findUnique.mockResolvedValue(mockProgram);
      mockPrismaService.referralCode.findFirst.mockResolvedValue(null);
      mockPrismaService.referralCode.create.mockResolvedValue({
        code: 'TEST123ABC',
        userId: 'user-123',
        programId: 'program-123',
      });

      const result = await service.generateReferralCode('user-123', 'program-123');

      expect(result).toMatch(/^[A-Z0-9]+$/);
      expect(mockPrismaService.referralCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          programId: 'program-123',
          usageCount: 0,
        }),
      });
    });

    it('should return existing code if already generated', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockProgram = { id: 'program-123', active: true };
      const existingCode = {
        code: 'EXISTING123',
        userId: 'user-123',
        programId: 'program-123',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.referralProgram.findUnique.mockResolvedValue(mockProgram);
      mockPrismaService.referralCode.findFirst.mockResolvedValue(existingCode);

      const result = await service.generateReferralCode('user-123', 'program-123');

      expect(result).toBe('EXISTING123');
      expect(mockPrismaService.referralCode.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.generateReferralCode('non-existent', 'program-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if program not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-123' });
      mockPrismaService.referralProgram.findUnique.mockResolvedValue(null);

      await expect(
        service.generateReferralCode('user-123', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if program is not active', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-123' });
      mockPrismaService.referralProgram.findUnique.mockResolvedValue({
        id: 'program-123',
        active: false,
      });

      await expect(
        service.generateReferralCode('user-123', 'program-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== Create Referral ====================

  describe('createReferral', () => {
    it('should create a referral successfully', async () => {
      const mockReferralCode = {
        id: 'code-123',
        code: 'TEST123',
        userId: 'referrer-123',
        programId: 'program-123',
        usageCount: 5,
        program: { active: true, maxRedemptions: 100 },
      };

      const mockReferral = {
        id: 'referral-123',
        referralCodeId: 'code-123',
        referrerId: 'referrer-123',
        refereeEmail: 'referee@example.com',
        programId: 'program-123',
        status: 'PENDING',
      };

      mockPrismaService.referralCode.findUnique.mockResolvedValue(mockReferralCode);
      mockPrismaService.referral.findFirst.mockResolvedValue(null);
      mockPrismaService.referral.create.mockResolvedValue(mockReferral);
      mockPrismaService.referralCode.update.mockResolvedValue({
        ...mockReferralCode,
        usageCount: 6,
      });

      const result = await service.createReferral({
        code: 'TEST123',
        refereeEmail: 'referee@example.com',
      });

      expect(result).toEqual(mockReferral);
      expect(mockPrismaService.referralCode.update).toHaveBeenCalledWith({
        where: { id: 'code-123' },
        data: { usageCount: 6 },
      });
    });

    it('should throw NotFoundException if code not found', async () => {
      mockPrismaService.referralCode.findUnique.mockResolvedValue(null);

      await expect(
        service.createReferral({
          code: 'INVALID',
          refereeEmail: 'referee@example.com',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if program is inactive', async () => {
      mockPrismaService.referralCode.findUnique.mockResolvedValue({
        id: 'code-123',
        code: 'TEST123',
        program: { active: false },
      });

      await expect(
        service.createReferral({
          code: 'TEST123',
          refereeEmail: 'referee@example.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if max redemptions reached', async () => {
      mockPrismaService.referralCode.findUnique.mockResolvedValue({
        id: 'code-123',
        code: 'TEST123',
        usageCount: 10,
        program: { active: true, maxRedemptions: 10 },
      });

      await expect(
        service.createReferral({
          code: 'TEST123',
          refereeEmail: 'referee@example.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if email already used code', async () => {
      mockPrismaService.referralCode.findUnique.mockResolvedValue({
        id: 'code-123',
        code: 'TEST123',
        usageCount: 5,
        program: { active: true, maxRedemptions: 100 },
      });
      mockPrismaService.referral.findFirst.mockResolvedValue({
        id: 'existing-referral',
        refereeEmail: 'referee@example.com',
      });

      await expect(
        service.createReferral({
          code: 'TEST123',
          refereeEmail: 'referee@example.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== Complete Referral ====================

  describe('completeReferral', () => {
    it('should complete a referral with no requirements', async () => {
      const mockReferral = {
        id: 'referral-123',
        status: 'PENDING',
        refereeId: 'referee-123',
        program: { requirementType: 'NONE' },
        referrer: { id: 'referrer-123' },
        referee: { id: 'referee-123' },
      };

      mockPrismaService.referral.findUnique.mockResolvedValue(mockReferral);
      mockPrismaService.referral.update.mockResolvedValue({
        ...mockReferral,
        status: 'COMPLETED',
      });

      const result = await service.completeReferral('referral-123');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.referral.update).toHaveBeenCalledWith({
        where: { id: 'referral-123' },
        data: {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
        },
      });
    });

    it('should complete referral with FIRST_ORDER requirement', async () => {
      const mockReferral = {
        id: 'referral-123',
        status: 'PENDING',
        refereeId: 'referee-123',
        program: { requirementType: 'FIRST_ORDER' },
      };

      mockPrismaService.referral.findUnique.mockResolvedValue(mockReferral);
      mockPrismaService.order.findUnique.mockResolvedValue({ id: 'order-123', total: 100 });
      mockPrismaService.order.count.mockResolvedValue(1);
      mockPrismaService.referral.update.mockResolvedValue({});

      const result = await service.completeReferral('referral-123', 'order-123');

      expect(result).toEqual({ success: true });
    });

    it('should complete referral with MIN_ORDER_VALUE requirement', async () => {
      const mockReferral = {
        id: 'referral-123',
        status: 'PENDING',
        refereeId: 'referee-123',
        program: { requirementType: 'MIN_ORDER_VALUE', requirementValue: 50 },
      };

      mockPrismaService.referral.findUnique.mockResolvedValue(mockReferral);
      mockPrismaService.order.findUnique.mockResolvedValue({ id: 'order-123', total: 100 });
      mockPrismaService.referral.update.mockResolvedValue({});

      const result = await service.completeReferral('referral-123', 'order-123');

      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException if referral not found', async () => {
      mockPrismaService.referral.findUnique.mockResolvedValue(null);

      await expect(service.completeReferral('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not in pending status', async () => {
      mockPrismaService.referral.findUnique.mockResolvedValue({
        id: 'referral-123',
        status: 'COMPLETED',
        program: {},
      });

      await expect(service.completeReferral('referral-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if requirements not met', async () => {
      const mockReferral = {
        id: 'referral-123',
        status: 'PENDING',
        refereeId: 'referee-123',
        program: { requirementType: 'MIN_ORDER_VALUE', requirementValue: 100 },
      };

      mockPrismaService.referral.findUnique.mockResolvedValue(mockReferral);
      mockPrismaService.order.findUnique.mockResolvedValue({ id: 'order-123', total: 50 });

      await expect(
        service.completeReferral('referral-123', 'order-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== Issue Rewards ====================

  describe('issueRewards', () => {
    it('should issue CREDIT rewards', async () => {
      const mockReferral = {
        id: 'referral-123',
        status: 'COMPLETED',
        referrerId: 'referrer-123',
        refereeId: 'referee-123',
        program: {
          referrerReward: { type: 'CREDIT', value: 10, currency: 'USD' },
          refereeReward: { type: 'CREDIT', value: 5, currency: 'USD' },
        },
      };

      mockPrismaService.referral.findUnique.mockResolvedValue(mockReferral);
      mockPrismaService.userCredit.create.mockResolvedValue({});
      mockPrismaService.referral.update.mockResolvedValue({});

      const result = await service.issueRewards('referral-123');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.userCredit.create).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.referral.update).toHaveBeenCalledWith({
        where: { id: 'referral-123' },
        data: { status: 'REWARDED' },
      });
    });

    it('should issue DISCOUNT rewards', async () => {
      const mockReferral = {
        id: 'referral-123',
        status: 'COMPLETED',
        referrerId: 'referrer-123',
        refereeId: 'referee-123',
        program: {
          referrerReward: { type: 'DISCOUNT', value: 20 },
          refereeReward: { type: 'DISCOUNT', value: 10 },
        },
      };

      mockPrismaService.referral.findUnique.mockResolvedValue(mockReferral);
      mockPrismaService.coupon.create.mockResolvedValue({});
      mockPrismaService.referral.update.mockResolvedValue({});

      const result = await service.issueRewards('referral-123');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.coupon.create).toHaveBeenCalledTimes(2);
    });

    it('should issue POINTS rewards', async () => {
      const mockReferral = {
        id: 'referral-123',
        status: 'COMPLETED',
        referrerId: 'referrer-123',
        refereeId: 'referee-123',
        program: {
          referrerReward: { type: 'POINTS', value: 100 },
          refereeReward: { type: 'POINTS', value: 50 },
        },
      };

      mockPrismaService.referral.findUnique.mockResolvedValue(mockReferral);
      mockPrismaService.loyaltyPoints.create.mockResolvedValue({});
      mockPrismaService.referral.update.mockResolvedValue({});

      const result = await service.issueRewards('referral-123');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.loyaltyPoints.create).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if referral not found', async () => {
      mockPrismaService.referral.findUnique.mockResolvedValue(null);

      await expect(service.issueRewards('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not completed', async () => {
      mockPrismaService.referral.findUnique.mockResolvedValue({
        id: 'referral-123',
        status: 'PENDING',
        program: {},
      });

      await expect(service.issueRewards('referral-123')).rejects.toThrow(BadRequestException);
    });

    it('should skip referee reward if no refereeId', async () => {
      const mockReferral = {
        id: 'referral-123',
        status: 'COMPLETED',
        referrerId: 'referrer-123',
        refereeId: null,
        program: {
          referrerReward: { type: 'CREDIT', value: 10 },
          refereeReward: { type: 'CREDIT', value: 5 },
        },
      };

      mockPrismaService.referral.findUnique.mockResolvedValue(mockReferral);
      mockPrismaService.userCredit.create.mockResolvedValue({});
      mockPrismaService.referral.update.mockResolvedValue({});

      await service.issueRewards('referral-123');

      expect(mockPrismaService.userCredit.create).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== Get User Referrals ====================

  describe('getUserReferrals', () => {
    it('should return user referrals', async () => {
      const mockReferrals = [
        {
          id: 'referral-1',
          referrerId: 'user-123',
          status: 'COMPLETED',
          program: { name: 'Program 1' },
          referee: { id: 'referee-1', email: 'ref1@example.com' },
        },
        {
          id: 'referral-2',
          referrerId: 'user-123',
          status: 'PENDING',
          program: { name: 'Program 1' },
          referee: { id: 'referee-2', email: 'ref2@example.com' },
        },
      ];

      mockPrismaService.referral.findMany.mockResolvedValue(mockReferrals);

      const result = await service.getUserReferrals('user-123');

      expect(result).toEqual(mockReferrals);
      expect(mockPrismaService.referral.findMany).toHaveBeenCalledWith({
        where: { referrerId: 'user-123' },
        include: {
          program: true,
          referee: {
            select: { id: true, email: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if no referrals', async () => {
      mockPrismaService.referral.findMany.mockResolvedValue([]);

      const result = await service.getUserReferrals('user-no-referrals');

      expect(result).toEqual([]);
    });
  });

  // ==================== Get Referral Analytics ====================

  describe('getReferralAnalytics', () => {
    it('should return referral analytics for all users', async () => {
      mockPrismaService.referral.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(30) // pending
        .mockResolvedValueOnce(50) // completed
        .mockResolvedValueOnce(20); // rewarded

      const result = await service.getReferralAnalytics();

      expect(result).toEqual({
        userId: undefined,
        total: 100,
        pending: 30,
        completed: 50,
        rewarded: 20,
        conversionRate: 50,
      });
    });

    it('should return referral analytics for specific user', async () => {
      mockPrismaService.referral.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3);

      const result = await service.getReferralAnalytics('user-123');

      expect(result.userId).toBe('user-123');
      expect(mockPrismaService.referral.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ referrerId: 'user-123' }),
        }),
      );
    });

    it('should handle zero referrals', async () => {
      mockPrismaService.referral.count.mockResolvedValue(0);

      const result = await service.getReferralAnalytics();

      expect(result.conversionRate).toBe(0);
    });
  });

  // ==================== Get Top Referrers ====================

  describe('getTopReferrers', () => {
    it('should return top referrers', async () => {
      const mockGroupBy = [
        { referrerId: 'user-1', _count: 50 },
        { referrerId: 'user-2', _count: 30 },
      ];

      mockPrismaService.referral.groupBy.mockResolvedValue(mockGroupBy);
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', email: 'top1@example.com', name: 'Top 1' })
        .mockResolvedValueOnce({ id: 'user-2', email: 'top2@example.com', name: 'Top 2' });

      const result = await service.getTopReferrers(50);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        user: { id: 'user-1', email: 'top1@example.com', name: 'Top 1' },
        referralCount: 50,
      });
    });

    it('should use default limit of 50', async () => {
      mockPrismaService.referral.groupBy.mockResolvedValue([]);

      await service.getTopReferrers();

      expect(mockPrismaService.referral.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });

    it('should only count completed and rewarded referrals', async () => {
      mockPrismaService.referral.groupBy.mockResolvedValue([]);

      await service.getTopReferrers();

      expect(mockPrismaService.referral.groupBy).toHaveBeenCalledWith({
        by: ['referrerId'],
        where: {
          status: { in: ['COMPLETED', 'REWARDED'] },
        },
        _count: true,
        orderBy: {
          _count: { referrerId: 'desc' },
        },
        take: 50,
      });
    });

    it('should return empty array when no referrers', async () => {
      mockPrismaService.referral.groupBy.mockResolvedValue([]);

      const result = await service.getTopReferrers();

      expect(result).toEqual([]);
    });
  });
});
