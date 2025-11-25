import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { LoyaltyTier } from '@prisma/client';

describe('LoyaltyController', () => {
  let controller: LoyaltyController;
  let service: LoyaltyService;

  const mockLoyaltyService = {
    getCustomerLoyalty: jest.fn(),
    createLoyaltyAccount: jest.fn(),
    getTierLeaderboard: jest.fn(),
    earnPointsFromPurchase: jest.fn(),
    earnPointsFromReview: jest.fn(),
    awardBirthdayPoints: jest.fn(),
    getPointHistory: jest.fn(),
    adjustPoints: jest.fn(),
    expirePoints: jest.fn(),
    getAllTierBenefits: jest.fn(),
    getTierBenefitByTier: jest.fn(),
    createTierBenefit: jest.fn(),
    updateTierBenefit: jest.fn(),
    initializeTierBenefits: jest.fn(),
    createReferral: jest.fn(),
    getUserReferrals: jest.fn(),
    applyReferralCode: jest.fn(),
    getAllRewards: jest.fn(),
    getAvailableRewards: jest.fn(),
    createReward: jest.fn(),
    updateReward: jest.fn(),
    deleteReward: jest.fn(),
    redeemReward: jest.fn(),
    getUserRedemptions: jest.fn(),
    applyRedemptionToOrder: jest.fn(),
    getActiveLoyaltyProgram: jest.fn(),
    updateLoyaltyProgram: jest.fn(),
    initializeLoyaltyProgram: jest.fn(),
    getLoyaltyStatistics: jest.fn(),
  };

  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'CUSTOMER',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoyaltyController],
      providers: [
        {
          provide: LoyaltyService,
          useValue: mockLoyaltyService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockUser;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<LoyaltyController>(LoyaltyController);
    service = module.get<LoyaltyService>(LoyaltyService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================
  // CUSTOMER LOYALTY ACCOUNT
  // ============================================

  describe('getMyLoyaltyAccount', () => {
    it('should return user loyalty account', async () => {
      const mockRequest = { user: mockUser };
      const mockAccount = {
        userId: 'user-123',
        points: 500,
        tier: LoyaltyTier.SILVER,
        totalSpent: 1500,
      };

      mockLoyaltyService.getCustomerLoyalty.mockResolvedValue(mockAccount);

      const result = await controller.getMyLoyaltyAccount(mockRequest as any);

      expect(result).toEqual(mockAccount);
      expect(mockLoyaltyService.getCustomerLoyalty).toHaveBeenCalledWith('user-123');
    });
  });

  describe('createMyLoyaltyAccount', () => {
    it('should create loyalty account for user', async () => {
      const mockRequest = { user: mockUser };
      const mockAccount = {
        userId: 'user-123',
        points: 0,
        tier: LoyaltyTier.BRONZE,
      };

      mockLoyaltyService.createLoyaltyAccount.mockResolvedValue(mockAccount);

      const result = await controller.createMyLoyaltyAccount(mockRequest as any);

      expect(result).toEqual(mockAccount);
      expect(mockLoyaltyService.createLoyaltyAccount).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getLeaderboard', () => {
    it('should return leaderboard with default limit', async () => {
      const mockLeaderboard = [
        { userId: 'user-1', tier: LoyaltyTier.PLATINUM, points: 5000 },
        { userId: 'user-2', tier: LoyaltyTier.GOLD, points: 3000 },
      ];

      mockLoyaltyService.getTierLeaderboard.mockResolvedValue(mockLeaderboard);

      const result = await controller.getLeaderboard(undefined);

      expect(result).toEqual(mockLeaderboard);
      expect(mockLoyaltyService.getTierLeaderboard).toHaveBeenCalledWith(100);
    });

    it('should return leaderboard with custom limit', async () => {
      const mockLeaderboard = [
        { userId: 'user-1', tier: LoyaltyTier.PLATINUM, points: 5000 },
      ];

      mockLoyaltyService.getTierLeaderboard.mockResolvedValue(mockLeaderboard);

      const result = await controller.getLeaderboard('10');

      expect(result).toEqual(mockLeaderboard);
      expect(mockLoyaltyService.getTierLeaderboard).toHaveBeenCalledWith(10);
    });
  });

  // ============================================
  // POINTS MANAGEMENT
  // ============================================

  describe('earnPointsFromPurchase', () => {
    it('should earn points from purchase', async () => {
      const mockRequest = { user: mockUser };
      const dto = { orderId: 'order-123', amount: 100 };
      const mockResult = { pointsEarned: 100, newBalance: 600 };

      mockLoyaltyService.earnPointsFromPurchase.mockResolvedValue(mockResult);

      const result = await controller.earnPointsFromPurchase(mockRequest as any, dto);

      expect(result).toEqual(mockResult);
      expect(mockLoyaltyService.earnPointsFromPurchase).toHaveBeenCalledWith(dto, 'user-123');
    });
  });

  describe('earnPointsFromReview', () => {
    it('should earn points from product review', async () => {
      const mockRequest = { user: mockUser };
      const mockResult = { pointsEarned: 50, newBalance: 550 };

      mockLoyaltyService.earnPointsFromReview.mockResolvedValue(mockResult);

      const result = await controller.earnPointsFromReview(mockRequest as any, 'product-123');

      expect(result).toEqual(mockResult);
      expect(mockLoyaltyService.earnPointsFromReview).toHaveBeenCalledWith('user-123', 'product-123');
    });
  });

  describe('awardBirthdayPoints', () => {
    it('should award birthday points', async () => {
      const mockRequest = { user: mockUser };
      const mockResult = { pointsAwarded: 100, message: 'Happy Birthday!' };

      mockLoyaltyService.awardBirthdayPoints.mockResolvedValue(mockResult);

      const result = await controller.awardBirthdayPoints(mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockLoyaltyService.awardBirthdayPoints).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getPointHistory', () => {
    it('should return point history with default limit', async () => {
      const mockRequest = { user: mockUser };
      const mockHistory = [
        { id: 'tx-1', points: 100, type: 'EARN', date: new Date() },
        { id: 'tx-2', points: -50, type: 'REDEEM', date: new Date() },
      ];

      mockLoyaltyService.getPointHistory.mockResolvedValue(mockHistory);

      const result = await controller.getPointHistory(mockRequest as any, undefined);

      expect(result).toEqual(mockHistory);
      expect(mockLoyaltyService.getPointHistory).toHaveBeenCalledWith('user-123', 50);
    });

    it('should return point history with custom limit', async () => {
      const mockRequest = { user: mockUser };
      const mockHistory = [{ id: 'tx-1', points: 100, type: 'EARN' }];

      mockLoyaltyService.getPointHistory.mockResolvedValue(mockHistory);

      const result = await controller.getPointHistory(mockRequest as any, '20');

      expect(result).toEqual(mockHistory);
      expect(mockLoyaltyService.getPointHistory).toHaveBeenCalledWith('user-123', 20);
    });
  });

  describe('adjustPoints (Admin)', () => {
    it('should adjust user points', async () => {
      const dto = { points: 100, reason: 'Customer service adjustment' };
      const mockResult = { success: true, newBalance: 600 };

      mockLoyaltyService.adjustPoints.mockResolvedValue(mockResult);

      const result = await controller.adjustPoints('user-456', dto);

      expect(result).toEqual(mockResult);
      expect(mockLoyaltyService.adjustPoints).toHaveBeenCalledWith('user-456', dto);
    });
  });

  describe('expirePoints (Admin)', () => {
    it('should expire points', async () => {
      const mockResult = { expired: 50, affectedUsers: 10 };

      mockLoyaltyService.expirePoints.mockResolvedValue(mockResult);

      const result = await controller.expirePoints();

      expect(result).toEqual(mockResult);
      expect(mockLoyaltyService.expirePoints).toHaveBeenCalled();
    });
  });

  // ============================================
  // TIER BENEFITS
  // ============================================

  describe('getAllTierBenefits', () => {
    it('should return all tier benefits', async () => {
      const mockBenefits = [
        { tier: LoyaltyTier.BRONZE, discount: 5, benefits: ['Free shipping over $50'] },
        { tier: LoyaltyTier.SILVER, discount: 10, benefits: ['Free shipping over $25'] },
      ];

      mockLoyaltyService.getAllTierBenefits.mockResolvedValue(mockBenefits);

      const result = await controller.getAllTierBenefits();

      expect(result).toEqual(mockBenefits);
      expect(mockLoyaltyService.getAllTierBenefits).toHaveBeenCalled();
    });
  });

  describe('getTierBenefit', () => {
    it('should return specific tier benefits', async () => {
      const mockBenefit = {
        tier: LoyaltyTier.GOLD,
        discount: 15,
        benefits: ['Free shipping', 'Priority support'],
      };

      mockLoyaltyService.getTierBenefitByTier.mockResolvedValue(mockBenefit);

      const result = await controller.getTierBenefit(LoyaltyTier.GOLD);

      expect(result).toEqual(mockBenefit);
      expect(mockLoyaltyService.getTierBenefitByTier).toHaveBeenCalledWith(LoyaltyTier.GOLD);
    });
  });

  describe('createTierBenefit (Admin)', () => {
    it('should create tier benefit', async () => {
      const dto = {
        tier: LoyaltyTier.PLATINUM,
        discount: 20,
        benefits: ['Free shipping', 'VIP support'],
      };
      const mockBenefit = { id: 'benefit-1', ...dto };

      mockLoyaltyService.createTierBenefit.mockResolvedValue(mockBenefit);

      const result = await controller.createTierBenefit(dto);

      expect(result).toEqual(mockBenefit);
      expect(mockLoyaltyService.createTierBenefit).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateTierBenefit (Admin)', () => {
    it('should update tier benefit', async () => {
      const dto = { discount: 25 };
      const mockBenefit = { tier: LoyaltyTier.PLATINUM, discount: 25 };

      mockLoyaltyService.updateTierBenefit.mockResolvedValue(mockBenefit);

      const result = await controller.updateTierBenefit(LoyaltyTier.PLATINUM, dto);

      expect(result).toEqual(mockBenefit);
      expect(mockLoyaltyService.updateTierBenefit).toHaveBeenCalledWith(LoyaltyTier.PLATINUM, dto);
    });
  });

  describe('initializeTierBenefits (Admin)', () => {
    it('should initialize default tier benefits', async () => {
      const mockResult = { success: true, tiersCreated: 4 };

      mockLoyaltyService.initializeTierBenefits.mockResolvedValue(mockResult);

      const result = await controller.initializeTierBenefits();

      expect(result).toEqual(mockResult);
      expect(mockLoyaltyService.initializeTierBenefits).toHaveBeenCalled();
    });
  });

  // ============================================
  // REFERRAL PROGRAM
  // ============================================

  describe('createReferral', () => {
    it('should create referral', async () => {
      const mockRequest = { user: mockUser };
      const dto = { refereeEmail: 'friend@example.com' };
      const mockReferral = {
        id: 'ref-123',
        referrerId: 'user-123',
        referralCode: 'REF123',
      };

      mockLoyaltyService.createReferral.mockResolvedValue(mockReferral);

      const result = await controller.createReferral(mockRequest as any, dto);

      expect(result).toEqual(mockReferral);
      expect(mockLoyaltyService.createReferral).toHaveBeenCalledWith('user-123', dto);
    });
  });

  describe('getMyReferrals', () => {
    it('should return user referrals', async () => {
      const mockRequest = { user: mockUser };
      const mockReferrals = [
        { id: 'ref-1', referralCode: 'REF123', status: 'COMPLETED' },
        { id: 'ref-2', referralCode: 'REF456', status: 'PENDING' },
      ];

      mockLoyaltyService.getUserReferrals.mockResolvedValue(mockReferrals);

      const result = await controller.getMyReferrals(mockRequest as any);

      expect(result).toEqual(mockReferrals);
      expect(mockLoyaltyService.getUserReferrals).toHaveBeenCalledWith('user-123');
    });
  });

  describe('applyReferralCode', () => {
    it('should apply referral code', async () => {
      const mockRequest = { user: mockUser };
      const mockResult = {
        success: true,
        pointsEarned: 500,
        message: 'Referral code applied',
      };

      mockLoyaltyService.applyReferralCode.mockResolvedValue(mockResult);

      const result = await controller.applyReferralCode(mockRequest as any, 'REF123');

      expect(result).toEqual(mockResult);
      expect(mockLoyaltyService.applyReferralCode).toHaveBeenCalledWith('user-123', 'REF123');
    });
  });

  // ============================================
  // REWARDS CATALOG
  // ============================================

  describe('getAllRewards', () => {
    it('should return active rewards only', async () => {
      const mockRewards = [
        { id: 'reward-1', name: '$10 Off', isActive: true },
        { id: 'reward-2', name: 'Free Shipping', isActive: true },
      ];

      mockLoyaltyService.getAllRewards.mockResolvedValue(mockRewards);

      const result = await controller.getAllRewards(undefined);

      expect(result).toEqual(mockRewards);
      expect(mockLoyaltyService.getAllRewards).toHaveBeenCalledWith(false);
    });

    it('should include inactive rewards when requested', async () => {
      const mockRewards = [
        { id: 'reward-1', name: '$10 Off', isActive: true },
        { id: 'reward-2', name: 'Old Reward', isActive: false },
      ];

      mockLoyaltyService.getAllRewards.mockResolvedValue(mockRewards);

      const result = await controller.getAllRewards('true');

      expect(result).toEqual(mockRewards);
      expect(mockLoyaltyService.getAllRewards).toHaveBeenCalledWith(true);
    });
  });

  describe('getAvailableRewards', () => {
    it('should return rewards available for user', async () => {
      const mockRequest = { user: mockUser };
      const mockRewards = [
        { id: 'reward-1', name: '$5 Off', pointsCost: 500 },
        { id: 'reward-2', name: 'Free Shipping', pointsCost: 200 },
      ];

      mockLoyaltyService.getAvailableRewards.mockResolvedValue(mockRewards);

      const result = await controller.getAvailableRewards(mockRequest as any);

      expect(result).toEqual(mockRewards);
      expect(mockLoyaltyService.getAvailableRewards).toHaveBeenCalledWith('user-123');
    });
  });

  describe('createReward (Admin)', () => {
    it('should create reward', async () => {
      const dto = {
        name: '$20 Off',
        description: 'Save $20 on your next order',
        pointsCost: 2000,
        type: 'DISCOUNT',
      };
      const mockReward = { id: 'reward-3', ...dto };

      mockLoyaltyService.createReward.mockResolvedValue(mockReward);

      const result = await controller.createReward(dto);

      expect(result).toEqual(mockReward);
      expect(mockLoyaltyService.createReward).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateReward (Admin)', () => {
    it('should update reward', async () => {
      const dto = { pointsCost: 1800 };
      const mockReward = { id: 'reward-1', pointsCost: 1800 };

      mockLoyaltyService.updateReward.mockResolvedValue(mockReward);

      const result = await controller.updateReward('reward-1', dto);

      expect(result).toEqual(mockReward);
      expect(mockLoyaltyService.updateReward).toHaveBeenCalledWith('reward-1', dto);
    });
  });

  describe('deleteReward (Admin)', () => {
    it('should delete reward', async () => {
      const mockResult = { success: true };

      mockLoyaltyService.deleteReward.mockResolvedValue(mockResult);

      const result = await controller.deleteReward('reward-1');

      expect(result).toEqual(mockResult);
      expect(mockLoyaltyService.deleteReward).toHaveBeenCalledWith('reward-1');
    });
  });

  // ============================================
  // REWARD REDEMPTIONS
  // ============================================

  describe('redeemReward', () => {
    it('should redeem reward', async () => {
      const mockRequest = { user: mockUser };
      const dto = { rewardId: 'reward-1' };
      const mockResult = {
        redemptionId: 'redemption-123',
        pointsDeducted: 500,
        code: 'SAVE10',
      };

      mockLoyaltyService.redeemReward.mockResolvedValue(mockResult);

      const result = await controller.redeemReward(mockRequest as any, dto);

      expect(result).toEqual(mockResult);
      expect(mockLoyaltyService.redeemReward).toHaveBeenCalledWith('user-123', dto);
    });
  });

  describe('getMyRedemptions', () => {
    it('should return user redemptions', async () => {
      const mockRequest = { user: mockUser };
      const mockRedemptions = [
        { id: 'redemption-1', rewardId: 'reward-1', status: 'ACTIVE' },
        { id: 'redemption-2', rewardId: 'reward-2', status: 'USED' },
      ];

      mockLoyaltyService.getUserRedemptions.mockResolvedValue(mockRedemptions);

      const result = await controller.getMyRedemptions(mockRequest as any);

      expect(result).toEqual(mockRedemptions);
      expect(mockLoyaltyService.getUserRedemptions).toHaveBeenCalledWith('user-123');
    });
  });

  describe('applyRedemptionToOrder', () => {
    it('should apply redemption to order', async () => {
      const mockRequest = { user: mockUser };
      const dto = { redemptionId: 'redemption-123', orderId: 'order-456' };
      const mockResult = {
        success: true,
        discountApplied: 10,
        message: 'Redemption applied',
      };

      mockLoyaltyService.applyRedemptionToOrder.mockResolvedValue(mockResult);

      const result = await controller.applyRedemptionToOrder(mockRequest as any, dto);

      expect(result).toEqual(mockResult);
      expect(mockLoyaltyService.applyRedemptionToOrder).toHaveBeenCalledWith('user-123', dto);
    });
  });

  // ============================================
  // LOYALTY PROGRAM CONFIGURATION
  // ============================================

  describe('getLoyaltyProgram', () => {
    it('should return loyalty program configuration', async () => {
      const mockProgram = {
        id: 'program-1',
        pointsPerDollar: 10,
        referralBonus: 500,
        birthdayBonus: 100,
      };

      mockLoyaltyService.getActiveLoyaltyProgram.mockResolvedValue(mockProgram);

      const result = await controller.getLoyaltyProgram();

      expect(result).toEqual(mockProgram);
      expect(mockLoyaltyService.getActiveLoyaltyProgram).toHaveBeenCalled();
    });
  });

  describe('updateLoyaltyProgram (Admin)', () => {
    it('should update loyalty program', async () => {
      const dto = { pointsPerDollar: 15 };
      const mockProgram = { id: 'program-1', pointsPerDollar: 15 };

      mockLoyaltyService.updateLoyaltyProgram.mockResolvedValue(mockProgram);

      const result = await controller.updateLoyaltyProgram('program-1', dto);

      expect(result).toEqual(mockProgram);
      expect(mockLoyaltyService.updateLoyaltyProgram).toHaveBeenCalledWith('program-1', dto);
    });
  });

  describe('initializeLoyaltyProgram (Admin)', () => {
    it('should initialize loyalty program', async () => {
      const mockResult = { success: true, programId: 'program-1' };

      mockLoyaltyService.initializeLoyaltyProgram.mockResolvedValue(mockResult);

      const result = await controller.initializeLoyaltyProgram();

      expect(result).toEqual(mockResult);
      expect(mockLoyaltyService.initializeLoyaltyProgram).toHaveBeenCalled();
    });
  });

  // ============================================
  // STATISTICS & ANALYTICS
  // ============================================

  describe('getLoyaltyStatistics (Admin)', () => {
    it('should return loyalty statistics', async () => {
      const mockStats = {
        totalMembers: 5000,
        activeMembers: 3500,
        totalPointsEarned: 500000,
        totalPointsRedeemed: 200000,
        tierDistribution: {
          BRONZE: 2000,
          SILVER: 1500,
          GOLD: 1000,
          PLATINUM: 500,
        },
      };

      mockLoyaltyService.getLoyaltyStatistics.mockResolvedValue(mockStats);

      const result = await controller.getLoyaltyStatistics();

      expect(result).toEqual(mockStats);
      expect(mockLoyaltyService.getLoyaltyStatistics).toHaveBeenCalled();
    });
  });
});
