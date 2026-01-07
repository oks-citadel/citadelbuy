import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyService } from './loyalty.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  LoyaltyTier,
  PointTransactionType,
  ReferralStatus,
  OrderStatus,
} from '@prisma/client';

describe('LoyaltyService', () => {
  let service: LoyaltyService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    customerLoyalty: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    loyaltyProgram: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    loyaltyTierBenefit: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    pointTransaction: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    reward: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    rewardRedemption: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    referral: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockLoyaltyProgram = {
    id: 'program-1',
    name: 'Broxiva Rewards',
    isActive: true,
    pointsPerDollar: 1,
    minimumRedeemPoints: 100,
    pointsExpiryDays: 365,
    signupBonusPoints: 100,
    reviewRewardPoints: 50,
    birthdayRewardPoints: 200,
    referrerRewardPoints: 500,
    refereeRewardPoints: 250,
    referralMinPurchase: 50,
  };

  const mockLoyalty = {
    id: 'loyalty-123',
    userId: 'user-123',
    currentPoints: 500,
    lifetimePoints: 1000,
    totalPointsEarned: 1000,
    currentTier: LoyaltyTier.BRONZE,
    lifetimeSpending: 250,
    tierSpending: 250,
    tierSince: new Date(),
    referralCode: 'ABC123DE',
    referredBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
    },
  };

  const mockTierBenefit = {
    tier: LoyaltyTier.BRONZE,
    name: 'Bronze Member',
    pointsMultiplier: 1,
    discountPercentage: 0,
    minimumSpending: 0,
    minimumPoints: 0,
    isActive: true,
  };

  const mockReward = {
    id: 'reward-123',
    name: '$10 Off Coupon',
    description: 'Get $10 off your next purchase',
    type: 'DISCOUNT_FIXED',
    pointsCost: 1000,
    discountAmount: 10,
    discountPercentage: null,
    minimumPurchase: 50,
    minimumTier: null,
    stock: 100,
    isActive: true,
    validFrom: null,
    validUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LoyaltyService>(LoyaltyService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== LOYALTY ACCOUNT ====================

  describe('createLoyaltyAccount', () => {
    it('should create loyalty account with signup bonus', async () => {
      // Use mockImplementation to handle different queries properly
      let findUniqueCallCount = 0;
      mockPrismaService.customerLoyalty.findUnique.mockImplementation((args) => {
        findUniqueCallCount++;
        // First call: Check if user has existing account (by userId)
        if (args.where.userId) {
          if (findUniqueCallCount === 1) {
            return Promise.resolve(null); // No existing account
          }
          // Later calls for getCustomerLoyalty
          return Promise.resolve(mockLoyalty);
        }
        // Referral code check (by referralCode)
        if (args.where.referralCode) {
          return Promise.resolve(null); // Code doesn't exist, so it's unique
        }
        return Promise.resolve(null);
      });
      mockPrismaService.loyaltyProgram.findFirst.mockResolvedValue(mockLoyaltyProgram);
      mockPrismaService.customerLoyalty.create.mockResolvedValue(mockLoyalty);
      mockPrismaService.pointTransaction.create.mockResolvedValue({});
      mockPrismaService.customerLoyalty.update.mockResolvedValue(mockLoyalty);
      mockPrismaService.loyaltyTierBenefit.findUnique.mockResolvedValue(mockTierBenefit);
      mockPrismaService.pointTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.rewardRedemption.findMany.mockResolvedValue([]);

      const result = await service.createLoyaltyAccount('user-123');

      expect(result).toBeDefined();
      expect(mockPrismaService.customerLoyalty.create).toHaveBeenCalled();
      expect(mockPrismaService.pointTransaction.create).toHaveBeenCalled(); // Signup bonus
    });

    it('should return existing loyalty account', async () => {
      mockPrismaService.customerLoyalty.findUnique.mockResolvedValue(mockLoyalty);

      const result = await service.createLoyaltyAccount('user-123');

      expect(result).toEqual(mockLoyalty);
      expect(mockPrismaService.customerLoyalty.create).not.toHaveBeenCalled();
    });
  });

  describe('getCustomerLoyalty', () => {
    it('should return loyalty account with tier benefits', async () => {
      mockPrismaService.customerLoyalty.findUnique.mockResolvedValue(mockLoyalty);
      mockPrismaService.loyaltyTierBenefit.findUnique.mockResolvedValue(mockTierBenefit);
      mockPrismaService.pointTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.rewardRedemption.findMany.mockResolvedValue([]);

      const result = await service.getCustomerLoyalty('user-123');

      expect(result).toBeDefined();
      expect(result.tierBenefit).toEqual(mockTierBenefit);
      expect(result.recentTransactions).toEqual([]);
    });

    it('should throw NotFoundException when loyalty account not found', async () => {
      mockPrismaService.customerLoyalty.findUnique.mockResolvedValue(null);

      await expect(service.getCustomerLoyalty('user-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== POINTS EARNING ====================

  describe('earnPointsFromPurchase', () => {
    it('should earn points from delivered order with tier multiplier', async () => {
      const order = {
        id: 'order-123',
        userId: 'user-123',
        total: 100,
        status: OrderStatus.DELIVERED,
      };

      // Use mockImplementation to consistently return mockLoyalty for all findUnique calls
      mockPrismaService.customerLoyalty.findUnique.mockImplementation(() => {
        return Promise.resolve(mockLoyalty);
      });
      mockPrismaService.loyaltyProgram.findFirst.mockResolvedValue(mockLoyaltyProgram);
      mockPrismaService.order.findUnique.mockResolvedValue(order);
      mockPrismaService.pointTransaction.findFirst.mockResolvedValue(null);
      mockPrismaService.loyaltyTierBenefit.findUnique.mockResolvedValue(mockTierBenefit);
      mockPrismaService.loyaltyTierBenefit.findMany.mockResolvedValue([mockTierBenefit]); // getEligibleTier
      mockPrismaService.pointTransaction.create.mockResolvedValue({});
      mockPrismaService.customerLoyalty.update.mockResolvedValue(mockLoyalty);
      mockPrismaService.referral.findFirst.mockResolvedValue(null);
      mockPrismaService.pointTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.rewardRedemption.findMany.mockResolvedValue([]);

      const result = await service.earnPointsFromPurchase(
        { orderId: 'order-123' },
        'user-123',
      );

      expect(result).toBeDefined();
      expect(mockPrismaService.pointTransaction.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when order not found', async () => {
      mockPrismaService.customerLoyalty.findUnique.mockResolvedValue(mockLoyalty);
      mockPrismaService.loyaltyProgram.findFirst.mockResolvedValue(mockLoyaltyProgram);
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.earnPointsFromPurchase({ orderId: 'invalid' }, 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when order not delivered', async () => {
      const order = {
        id: 'order-123',
        userId: 'user-123',
        total: 100,
        status: OrderStatus.PENDING,
      };

      mockPrismaService.customerLoyalty.findUnique.mockResolvedValue(mockLoyalty);
      mockPrismaService.loyaltyProgram.findFirst.mockResolvedValue(mockLoyaltyProgram);
      mockPrismaService.order.findUnique.mockResolvedValue(order);

      await expect(
        service.earnPointsFromPurchase({ orderId: 'order-123' }, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when points already earned', async () => {
      const order = {
        id: 'order-123',
        userId: 'user-123',
        total: 100,
        status: OrderStatus.DELIVERED,
      };

      mockPrismaService.customerLoyalty.findUnique.mockResolvedValue(mockLoyalty);
      mockPrismaService.loyaltyProgram.findFirst.mockResolvedValue(mockLoyaltyProgram);
      mockPrismaService.order.findUnique.mockResolvedValue(order);
      mockPrismaService.pointTransaction.findFirst.mockResolvedValue({
        id: 'txn-1',
        type: PointTransactionType.EARNED_PURCHASE,
      });

      await expect(
        service.earnPointsFromPurchase({ orderId: 'order-123' }, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('earnPointsFromReview', () => {
    it('should earn points for product review', async () => {
      // Use mockImplementation to handle different queries by userId vs id
      mockPrismaService.customerLoyalty.findUnique.mockImplementation((args) => {
        // All queries should return mockLoyalty
        return Promise.resolve(mockLoyalty);
      });
      mockPrismaService.loyaltyProgram.findFirst.mockResolvedValue(mockLoyaltyProgram);
      mockPrismaService.pointTransaction.findFirst.mockResolvedValue(null);
      mockPrismaService.pointTransaction.create.mockResolvedValue({});
      mockPrismaService.customerLoyalty.update.mockResolvedValue(mockLoyalty);
      mockPrismaService.loyaltyTierBenefit.findUnique.mockResolvedValue(mockTierBenefit);
      mockPrismaService.pointTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.rewardRedemption.findMany.mockResolvedValue([]);

      const result = await service.earnPointsFromReview('user-123', 'product-123');

      expect(result).toBeDefined();
      expect(mockPrismaService.pointTransaction.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when points already earned for review', async () => {
      mockPrismaService.customerLoyalty.findUnique.mockResolvedValue(mockLoyalty);
      mockPrismaService.loyaltyProgram.findFirst.mockResolvedValue(mockLoyaltyProgram);
      mockPrismaService.pointTransaction.findFirst.mockResolvedValue({
        id: 'txn-1',
        type: PointTransactionType.EARNED_REVIEW,
      });

      await expect(
        service.earnPointsFromReview('user-123', 'product-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('awardBirthdayPoints', () => {
    it('should award birthday points', async () => {
      // Use mockImplementation to handle different queries
      mockPrismaService.customerLoyalty.findUnique.mockImplementation(() => {
        return Promise.resolve(mockLoyalty);
      });
      mockPrismaService.loyaltyProgram.findFirst.mockResolvedValue(mockLoyaltyProgram);
      mockPrismaService.pointTransaction.findFirst.mockResolvedValue(null);
      mockPrismaService.pointTransaction.create.mockResolvedValue({});
      mockPrismaService.customerLoyalty.update.mockResolvedValue(mockLoyalty);
      mockPrismaService.loyaltyTierBenefit.findUnique.mockResolvedValue(mockTierBenefit);
      mockPrismaService.pointTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.rewardRedemption.findMany.mockResolvedValue([]);

      const result = await service.awardBirthdayPoints('user-123');

      expect(result).toBeDefined();
      expect(mockPrismaService.pointTransaction.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when birthday points already awarded this year', async () => {
      mockPrismaService.customerLoyalty.findUnique.mockResolvedValue(mockLoyalty);
      mockPrismaService.loyaltyProgram.findFirst.mockResolvedValue(mockLoyaltyProgram);
      mockPrismaService.pointTransaction.findFirst.mockResolvedValue({
        id: 'txn-1',
        type: PointTransactionType.EARNED_BIRTHDAY,
        createdAt: new Date(),
      });

      await expect(service.awardBirthdayPoints('user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('adjustPoints', () => {
    it('should manually adjust points', async () => {
      // Use mockImplementation to handle all findUnique queries
      mockPrismaService.customerLoyalty.findUnique.mockImplementation(() => {
        return Promise.resolve(mockLoyalty);
      });
      mockPrismaService.pointTransaction.create.mockResolvedValue({});
      mockPrismaService.customerLoyalty.update.mockResolvedValue(mockLoyalty);
      mockPrismaService.loyaltyTierBenefit.findUnique.mockResolvedValue(mockTierBenefit);
      mockPrismaService.pointTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.rewardRedemption.findMany.mockResolvedValue([]);

      const result = await service.adjustPoints('user-123', {
        points: 100,
        reason: 'Customer compensation',
      });

      expect(result).toBeDefined();
      expect(mockPrismaService.pointTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: PointTransactionType.ADJUSTED_MANUAL,
            points: 100,
          }),
        }),
      );
    });
  });

  describe('getPointHistory', () => {
    it('should return point transaction history', async () => {
      const transactions = [
        {
          id: 'txn-1',
          type: PointTransactionType.EARNED_PURCHASE,
          points: 100,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.customerLoyalty.findUnique.mockResolvedValue(mockLoyalty);
      mockPrismaService.pointTransaction.findMany.mockResolvedValue(transactions);

      const result = await service.getPointHistory('user-123', 50);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(PointTransactionType.EARNED_PURCHASE);
    });
  });

  describe('expirePoints', () => {
    it('should expire old points and create expiry transactions', async () => {
      const expiredTransaction = {
        id: 'txn-1',
        loyaltyId: 'loyalty-123',
        points: 100,
        expiresAt: new Date('2020-01-01'),
        isExpired: false,
      };

      mockPrismaService.pointTransaction.findMany.mockResolvedValue([
        expiredTransaction,
      ]);
      mockPrismaService.pointTransaction.update.mockResolvedValue({});
      mockPrismaService.customerLoyalty.findUnique.mockResolvedValue(mockLoyalty);
      mockPrismaService.customerLoyalty.update.mockResolvedValue(mockLoyalty);
      mockPrismaService.pointTransaction.create.mockResolvedValue({});

      const result = await service.expirePoints();

      expect(result.expired).toBe(1);
      expect(mockPrismaService.pointTransaction.update).toHaveBeenCalled();
      expect(mockPrismaService.customerLoyalty.update).toHaveBeenCalled();
    });
  });

  // ==================== REFERRAL SYSTEM ====================

  describe('createReferral', () => {
    it('should create a new referral', async () => {
      mockPrismaService.customerLoyalty.findUnique.mockResolvedValue(mockLoyalty);
      mockPrismaService.referral.findFirst.mockResolvedValue(null);
      mockPrismaService.referral.create.mockResolvedValue({
        id: 'ref-123',
        referrerId: mockLoyalty.id,
        refereeEmail: 'friend@example.com',
        status: ReferralStatus.PENDING,
      });

      const result = await service.createReferral('user-123', {
        refereeEmail: 'friend@example.com',
      });

      expect(result).toBeDefined();
      expect(mockPrismaService.referral.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when referral already exists', async () => {
      mockPrismaService.customerLoyalty.findUnique.mockResolvedValue(mockLoyalty);
      mockPrismaService.referral.findFirst.mockResolvedValue({
        id: 'ref-123',
        status: ReferralStatus.PENDING,
      });

      await expect(
        service.createReferral('user-123', {
          refereeEmail: 'friend@example.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('applyReferralCode', () => {
    it('should apply referral code when user signs up', async () => {
      const referrer = { ...mockLoyalty, id: 'loyalty-referrer', userId: 'user-referrer' };
      const referee = { ...mockLoyalty, id: 'loyalty-referee', userId: 'user-123', referredBy: null };

      mockPrismaService.customerLoyalty.findUnique
        .mockResolvedValueOnce(referrer) // Find by referral code
        .mockResolvedValueOnce(referee); // ensureLoyaltyAccount
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
      });
      mockPrismaService.referral.create.mockResolvedValue({
        id: 'ref-123',
        referrerId: referrer.id,
        refereeId: referee.id,
        status: ReferralStatus.COMPLETED,
      });
      mockPrismaService.customerLoyalty.update.mockResolvedValue(referee);

      const result = await service.applyReferralCode('user-123', 'ABC123DE');

      expect(result).toBeDefined();
      expect(mockPrismaService.referral.create).toHaveBeenCalled();
      expect(mockPrismaService.customerLoyalty.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when referral code invalid', async () => {
      mockPrismaService.customerLoyalty.findUnique.mockResolvedValue(null);

      await expect(
        service.applyReferralCode('user-123', 'INVALID'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when referral code already applied', async () => {
      const referrer = { ...mockLoyalty, id: 'loyalty-referrer' };
      const referee = {
        ...mockLoyalty,
        id: 'loyalty-referee',
        referredBy: 'other-user',
      };

      mockPrismaService.customerLoyalty.findUnique
        .mockResolvedValueOnce(referrer)
        .mockResolvedValueOnce(referee);

      await expect(
        service.applyReferralCode('user-123', 'ABC123DE'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when trying to refer yourself', async () => {
      mockPrismaService.customerLoyalty.findUnique
        .mockResolvedValueOnce(mockLoyalty)
        .mockResolvedValueOnce(mockLoyalty);

      await expect(
        service.applyReferralCode('user-123', 'ABC123DE'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== REWARDS CATALOG ====================

  describe('createReward', () => {
    it('should create a new reward', async () => {
      mockPrismaService.reward.create.mockResolvedValue(mockReward);

      const result = await service.createReward({
        name: '$10 Off Coupon',
        description: 'Get $10 off',
        type: 'DISCOUNT_FIXED',
        pointsCost: 1000,
        discountAmount: 10,
      });

      expect(result).toEqual(mockReward);
      expect(mockPrismaService.reward.create).toHaveBeenCalled();
    });
  });

  describe('getAvailableRewards', () => {
    it('should return rewards user can afford', async () => {
      mockPrismaService.customerLoyalty.findUnique.mockResolvedValue(mockLoyalty);
      mockPrismaService.reward.findMany.mockResolvedValue([mockReward]);

      const result = await service.getAvailableRewards('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].canAfford).toBe(false); // User has 500 points, reward costs 1000
    });
  });

  describe('redeemReward', () => {
    it('should redeem reward and deduct points', async () => {
      const loyaltyWithPoints = { ...mockLoyalty, currentPoints: 1500 };

      mockPrismaService.customerLoyalty.findUnique
        .mockResolvedValueOnce(loyaltyWithPoints)
        .mockResolvedValueOnce(loyaltyWithPoints);
      mockPrismaService.reward.findUnique.mockResolvedValue(mockReward);
      mockPrismaService.pointTransaction.create.mockResolvedValue({});
      mockPrismaService.customerLoyalty.update.mockResolvedValue(loyaltyWithPoints);
      mockPrismaService.reward.update.mockResolvedValue(mockReward);
      mockPrismaService.rewardRedemption.create.mockResolvedValue({
        id: 'redemption-123',
        loyaltyId: loyaltyWithPoints.id,
        rewardId: mockReward.id,
        pointsSpent: mockReward.pointsCost,
        reward: mockReward,
      });

      const result = await service.redeemReward('user-123', {
        rewardId: 'reward-123',
      });

      expect(result).toBeDefined();
      expect(mockPrismaService.pointTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            points: -1000,
            type: PointTransactionType.REDEEMED_PRODUCT,
          }),
        }),
      );
    });

    it('should throw BadRequestException when reward not active', async () => {
      const inactiveReward = { ...mockReward, isActive: false };

      mockPrismaService.customerLoyalty.findUnique.mockResolvedValue(mockLoyalty);
      mockPrismaService.reward.findUnique.mockResolvedValue(inactiveReward);

      await expect(
        service.redeemReward('user-123', { rewardId: 'reward-123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when insufficient points', async () => {
      mockPrismaService.customerLoyalty.findUnique.mockResolvedValue(mockLoyalty);
      mockPrismaService.reward.findUnique.mockResolvedValue(mockReward);

      await expect(
        service.redeemReward('user-123', { rewardId: 'reward-123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when reward out of stock', async () => {
      const outOfStockReward = { ...mockReward, stock: 0 };
      const loyaltyWithPoints = { ...mockLoyalty, currentPoints: 1500 };

      mockPrismaService.customerLoyalty.findUnique.mockResolvedValue(
        loyaltyWithPoints,
      );
      mockPrismaService.reward.findUnique.mockResolvedValue(outOfStockReward);

      await expect(
        service.redeemReward('user-123', { rewardId: 'reward-123' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('applyRedemptionToOrder', () => {
    it('should apply redemption to order and calculate discount', async () => {
      const redemption = {
        id: 'redemption-123',
        loyaltyId: mockLoyalty.id,
        rewardId: mockReward.id,
        isUsed: false,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        reward: mockReward,
      };

      const order = {
        id: 'order-123',
        userId: 'user-123',
        subtotal: 100,
      };

      mockPrismaService.customerLoyalty.findUnique.mockResolvedValue(mockLoyalty);
      mockPrismaService.rewardRedemption.findUnique.mockResolvedValue(redemption);
      mockPrismaService.order.findUnique.mockResolvedValue(order);
      mockPrismaService.rewardRedemption.update.mockResolvedValue({
        ...redemption,
        isUsed: true,
      });

      const result = await service.applyRedemptionToOrder('user-123', {
        redemptionId: 'redemption-123',
        orderId: 'order-123',
      });

      expect(result).toBeDefined();
      expect(result.discount).toBe(10); // Fixed discount of $10
      expect(mockPrismaService.rewardRedemption.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when redemption already used', async () => {
      const usedRedemption = {
        id: 'redemption-123',
        loyaltyId: mockLoyalty.id,
        isUsed: true,
        reward: mockReward,
      };

      mockPrismaService.customerLoyalty.findUnique.mockResolvedValue(mockLoyalty);
      mockPrismaService.rewardRedemption.findUnique.mockResolvedValue(
        usedRedemption,
      );

      await expect(
        service.applyRedemptionToOrder('user-123', {
          redemptionId: 'redemption-123',
          orderId: 'order-123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when order below minimum purchase', async () => {
      const redemption = {
        id: 'redemption-123',
        loyaltyId: mockLoyalty.id,
        isUsed: false,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        reward: mockReward,
      };

      const order = {
        id: 'order-123',
        userId: 'user-123',
        subtotal: 25, // Below minimum of $50
      };

      mockPrismaService.customerLoyalty.findUnique.mockResolvedValue(mockLoyalty);
      mockPrismaService.rewardRedemption.findUnique.mockResolvedValue(redemption);
      mockPrismaService.order.findUnique.mockResolvedValue(order);

      await expect(
        service.applyRedemptionToOrder('user-123', {
          redemptionId: 'redemption-123',
          orderId: 'order-123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== TIER MANAGEMENT ====================

  describe('getTierLeaderboard', () => {
    it('should return tier leaderboard', async () => {
      const leaderboard = [
        { ...mockLoyalty, currentTier: LoyaltyTier.PLATINUM },
        { ...mockLoyalty, currentTier: LoyaltyTier.GOLD },
      ];

      mockPrismaService.customerLoyalty.findMany.mockResolvedValue(leaderboard);

      const result = await service.getTierLeaderboard(100);

      expect(result).toHaveLength(2);
      expect(result[0].currentTier).toBe(LoyaltyTier.PLATINUM);
    });
  });

  // ==================== LOYALTY PROGRAM ====================

  describe('getActiveLoyaltyProgram', () => {
    it('should return active loyalty program', async () => {
      mockPrismaService.loyaltyProgram.findFirst.mockResolvedValue(
        mockLoyaltyProgram,
      );

      const result = await service.getActiveLoyaltyProgram();

      expect(result).toEqual(mockLoyaltyProgram);
    });

    it('should return default program when none exists', async () => {
      mockPrismaService.loyaltyProgram.findFirst.mockResolvedValue(null);

      const result = await service.getActiveLoyaltyProgram();

      expect(result).toBeDefined();
      expect(result.name).toBe('Default Loyalty Program');
      expect(result.pointsPerDollar).toBe(1);
    });
  });

  describe('initializeLoyaltyProgram', () => {
    it('should create default loyalty program', async () => {
      mockPrismaService.loyaltyProgram.findFirst.mockResolvedValue(null);
      mockPrismaService.loyaltyProgram.create.mockResolvedValue(mockLoyaltyProgram);

      const result = await service.initializeLoyaltyProgram();

      expect(result).toBeDefined();
      expect(mockPrismaService.loyaltyProgram.create).toHaveBeenCalled();
    });

    it('should return existing program', async () => {
      mockPrismaService.loyaltyProgram.findFirst.mockResolvedValue(
        mockLoyaltyProgram,
      );

      const result = await service.initializeLoyaltyProgram();

      expect(result).toEqual(mockLoyaltyProgram);
      expect(mockPrismaService.loyaltyProgram.create).not.toHaveBeenCalled();
    });
  });

  // ==================== TIER BENEFITS ====================

  describe('getAllTierBenefits', () => {
    it('should return all active tier benefits', async () => {
      const benefits = [mockTierBenefit];

      mockPrismaService.loyaltyTierBenefit.findMany.mockResolvedValue(benefits);

      const result = await service.getAllTierBenefits();

      expect(result).toHaveLength(1);
      expect(result[0].tier).toBe(LoyaltyTier.BRONZE);
    });
  });

  describe('initializeTierBenefits', () => {
    it('should initialize default tier benefits', async () => {
      mockPrismaService.loyaltyTierBenefit.findUnique.mockResolvedValue(null);
      mockPrismaService.loyaltyTierBenefit.create.mockResolvedValue(
        mockTierBenefit,
      );

      const result = await service.initializeTierBenefits();

      expect(result.created).toBe(5); // Bronze, Silver, Gold, Platinum, Diamond
      expect(mockPrismaService.loyaltyTierBenefit.create).toHaveBeenCalledTimes(5);
    });
  });

  // ==================== STATISTICS ====================

  describe('getLoyaltyStatistics', () => {
    it('should return comprehensive loyalty statistics', async () => {
      mockPrismaService.customerLoyalty.count.mockResolvedValue(100);
      mockPrismaService.customerLoyalty.aggregate.mockResolvedValue({
        _sum: {
          currentPoints: 50000,
          lifetimePoints: 100000,
        },
      });
      mockPrismaService.rewardRedemption.count.mockResolvedValue(250);
      mockPrismaService.referral.count.mockResolvedValue(50);
      mockPrismaService.customerLoyalty.groupBy.mockResolvedValue([
        { currentTier: LoyaltyTier.BRONZE, _count: 60 },
        { currentTier: LoyaltyTier.SILVER, _count: 25 },
        { currentTier: LoyaltyTier.GOLD, _count: 10 },
        { currentTier: LoyaltyTier.PLATINUM, _count: 4 },
        { currentTier: LoyaltyTier.DIAMOND, _count: 1 },
      ]);

      const result = await service.getLoyaltyStatistics();

      expect(result.totalCustomers).toBe(100);
      expect(result.totalPointsIssued).toBe(100000);
      expect(result.totalPointsActive).toBe(50000);
      expect(result.totalRedemptions).toBe(250);
      expect(result.successfulReferrals).toBe(50);
      expect(result.tierDistribution[LoyaltyTier.BRONZE]).toBe(60);
    });
  });
});
