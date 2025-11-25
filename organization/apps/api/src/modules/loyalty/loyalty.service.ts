import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  LoyaltyTier,
  PointTransactionType,
  ReferralStatus,
  OrderStatus,
} from '@prisma/client';
import {
  EarnPointsDto,
  AdjustPointsDto,
  CreateReferralDto,
  UpdateLoyaltyProgramDto,
  CreateTierBenefitDto,
  UpdateTierBenefitDto,
} from './dto/loyalty.dto';
import {
  CreateRewardDto,
  UpdateRewardDto,
  RedeemRewardDto,
  ApplyRewardDto,
} from './dto/reward.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // CUSTOMER LOYALTY ACCOUNT
  // ============================================

  /**
   * Create loyalty account for new customer
   */
  async createLoyaltyAccount(userId: string) {
    // Check if loyalty account already exists
    const existing = await this.prisma.customerLoyalty.findUnique({
      where: { userId },
    });

    if (existing) {
      return existing;
    }

    // Generate unique referral code
    const referralCode = await this.generateReferralCode();

    // Get active loyalty program
    const program = await this.getActiveLoyaltyProgram();

    // Create loyalty account
    const loyalty = await this.prisma.customerLoyalty.create({
      data: {
        userId,
        referralCode,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Award signup bonus if configured
    if (program && program.signupBonusPoints > 0) {
      await this.addPoints(
        loyalty.id,
        program.signupBonusPoints,
        PointTransactionType.EARNED_SIGNUP,
        'Welcome bonus for joining the loyalty program'
      );
    }

    return this.getCustomerLoyalty(userId);
  }

  /**
   * Get customer loyalty account
   */
  async getCustomerLoyalty(userId: string) {
    const loyalty = await this.prisma.customerLoyalty.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!loyalty) {
      throw new NotFoundException('Loyalty account not found');
    }

    // Get tier benefits
    const tierBenefit = await this.getTierBenefitByTier(loyalty.currentTier);

    // Get recent transactions
    const recentTransactions = await this.prisma.pointTransaction.findMany({
      where: { loyaltyId: loyalty.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get available redemptions
    const availableRedemptions = await this.prisma.rewardRedemption.findMany({
      where: {
        loyaltyId: loyalty.id,
        isUsed: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        reward: true,
      },
    });

    return {
      ...loyalty,
      tierBenefit,
      recentTransactions,
      availableRedemptions,
    };
  }

  /**
   * Generate unique referral code
   */
  private async generateReferralCode(): Promise<string> {
    let code: string = '';
    let exists = true;

    while (exists) {
      code = randomBytes(4).toString('hex').toUpperCase();
      const existing = await this.prisma.customerLoyalty.findUnique({
        where: { referralCode: code },
      });
      exists = !!existing;
    }

    return code;
  }

  // ============================================
  // POINTS MANAGEMENT
  // ============================================

  /**
   * Earn points from purchase
   */
  async earnPointsFromPurchase(dto: EarnPointsDto, userId: string) {
    const loyalty = await this.ensureLoyaltyAccount(userId);
    const program = await this.getActiveLoyaltyProgram();

    // Get order
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new BadRequestException('Order does not belong to this user');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Points are awarded only for delivered orders');
    }

    // Check if points already earned for this order
    const existingTransaction = await this.prisma.pointTransaction.findFirst({
      where: {
        loyaltyId: loyalty.id,
        orderId: dto.orderId,
        type: PointTransactionType.EARNED_PURCHASE,
      },
    });

    if (existingTransaction) {
      throw new BadRequestException('Points already earned for this order');
    }

    // Calculate points
    const tierBenefit = await this.getTierBenefitByTier(loyalty.currentTier);
    const basePoints = Math.floor(order.total * program.pointsPerDollar);
    const multiplier = tierBenefit?.pointsMultiplier || 1;
    const points = Math.floor(basePoints * multiplier);

    // Add points
    await this.addPoints(
      loyalty.id,
      points,
      PointTransactionType.EARNED_PURCHASE,
      `Points earned from order #${order.id.substring(0, 8)}`,
      program.pointsExpiryDays ?? undefined,
      dto.orderId
    );

    // Update lifetime spending and check tier upgrade
    await this.updateLifetimeSpending(loyalty.id, order.total);

    // Check if this is a referral completion
    await this.checkReferralCompletion(loyalty.id, order.id, order.total);

    return this.getCustomerLoyalty(userId);
  }

  /**
   * Earn points from product review
   */
  async earnPointsFromReview(userId: string, productId: string) {
    const loyalty = await this.ensureLoyaltyAccount(userId);
    const program = await this.getActiveLoyaltyProgram();

    if (program.reviewRewardPoints <= 0) {
      return loyalty;
    }

    // Check if points already earned for this product review
    const existingTransaction = await this.prisma.pointTransaction.findFirst({
      where: {
        loyaltyId: loyalty.id,
        productId,
        type: PointTransactionType.EARNED_REVIEW,
      },
    });

    if (existingTransaction) {
      throw new BadRequestException('Points already earned for reviewing this product');
    }

    await this.addPoints(
      loyalty.id,
      program.reviewRewardPoints,
      PointTransactionType.EARNED_REVIEW,
      'Points earned for writing a product review',
      program.pointsExpiryDays ?? undefined,
      undefined,
      productId
    );

    return this.getCustomerLoyalty(userId);
  }

  /**
   * Award birthday points
   */
  async awardBirthdayPoints(userId: string) {
    const loyalty = await this.ensureLoyaltyAccount(userId);
    const program = await this.getActiveLoyaltyProgram();

    if (program.birthdayRewardPoints <= 0) {
      return loyalty;
    }

    // Check if birthday points already awarded this year
    const thisYear = new Date().getFullYear();
    const existingTransaction = await this.prisma.pointTransaction.findFirst({
      where: {
        loyaltyId: loyalty.id,
        type: PointTransactionType.EARNED_BIRTHDAY,
        createdAt: {
          gte: new Date(`${thisYear}-01-01`),
        },
      },
    });

    if (existingTransaction) {
      throw new BadRequestException('Birthday points already awarded this year');
    }

    await this.addPoints(
      loyalty.id,
      program.birthdayRewardPoints,
      PointTransactionType.EARNED_BIRTHDAY,
      'Happy Birthday! Enjoy your bonus points',
      program.pointsExpiryDays ?? undefined
    );

    return this.getCustomerLoyalty(userId);
  }

  /**
   * Adjust points manually (admin only)
   */
  async adjustPoints(userId: string, dto: AdjustPointsDto) {
    const loyalty = await this.ensureLoyaltyAccount(userId);

    await this.addPoints(
      loyalty.id,
      dto.points,
      PointTransactionType.ADJUSTED_MANUAL,
      dto.reason
    );

    return this.getCustomerLoyalty(userId);
  }

  /**
   * Add points to customer account
   */
  private async addPoints(
    loyaltyId: string,
    points: number,
    type: PointTransactionType,
    description: string,
    expiryDays?: number,
    orderId?: string,
    productId?: string,
    referralId?: string
  ) {
    const expiresAt = expiryDays
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
      : null;

    // Create transaction
    await this.prisma.pointTransaction.create({
      data: {
        loyaltyId,
        type,
        points,
        description,
        expiresAt,
        orderId,
        productId,
        referralId,
      },
    });

    // Update customer loyalty points
    const loyalty = await this.prisma.customerLoyalty.findUnique({
      where: { id: loyaltyId },
    });

    if (!loyalty) {
      throw new NotFoundException('Customer loyalty account not found');
    }

    await this.prisma.customerLoyalty.update({
      where: { id: loyaltyId },
      data: {
        currentPoints: loyalty.currentPoints + points,
        totalPointsEarned: points > 0 ? loyalty.totalPointsEarned + points : loyalty.totalPointsEarned,
        lifetimePoints: points > 0 ? loyalty.lifetimePoints + points : loyalty.lifetimePoints,
      },
    });
  }

  /**
   * Get point transaction history
   */
  async getPointHistory(userId: string, limit = 50) {
    const loyalty = await this.ensureLoyaltyAccount(userId);

    return this.prisma.pointTransaction.findMany({
      where: { loyaltyId: loyalty.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        order: {
          select: {
            id: true,
            total: true,
            createdAt: true,
          },
        },
      },
    });
  }

  /**
   * Expire old points
   * Should be run as a cron job
   */
  async expirePoints() {
    const expiredTransactions = await this.prisma.pointTransaction.findMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
        isExpired: false,
        points: { gt: 0 }, // Only positive (earned) points can expire
      },
    });

    for (const transaction of expiredTransactions) {
      // Mark transaction as expired
      await this.prisma.pointTransaction.update({
        where: { id: transaction.id },
        data: { isExpired: true },
      });

      // Deduct points from customer account
      const loyalty = await this.prisma.customerLoyalty.findUnique({
        where: { id: transaction.loyaltyId },
      });

      if (!loyalty) {
        continue; // Skip if loyalty account not found
      }

      await this.prisma.customerLoyalty.update({
        where: { id: transaction.loyaltyId },
        data: {
          currentPoints: Math.max(0, loyalty.currentPoints - transaction.points),
        },
      });

      // Create expiry transaction record
      await this.addPoints(
        transaction.loyaltyId,
        -transaction.points,
        PointTransactionType.EXPIRED,
        `${transaction.points} points expired`
      );
    }

    return { expired: expiredTransactions.length };
  }

  // ============================================
  // TIER MANAGEMENT
  // ============================================

  /**
   * Update lifetime spending and check for tier upgrade
   */
  private async updateLifetimeSpending(loyaltyId: string, amount: number) {
    const loyalty = await this.prisma.customerLoyalty.findUnique({
      where: { id: loyaltyId },
    });

    if (!loyalty) {
      throw new NotFoundException('Customer loyalty account not found');
    }

    const newLifetimeSpending = loyalty.lifetimeSpending + amount;
    const newTierSpending = loyalty.tierSpending + amount;

    // Check for tier upgrade
    const eligibleTier = await this.getEligibleTier(
      newLifetimeSpending,
      loyalty.lifetimePoints
    );

    const shouldUpgrade =
      this.getTierValue(eligibleTier) > this.getTierValue(loyalty.currentTier);

    await this.prisma.customerLoyalty.update({
      where: { id: loyaltyId },
      data: {
        lifetimeSpending: newLifetimeSpending,
        tierSpending: newTierSpending,
        ...(shouldUpgrade && {
          currentTier: eligibleTier,
          tierSince: new Date(),
          tierSpending: 0,
        }),
      },
    });

    return shouldUpgrade;
  }

  /**
   * Get eligible tier based on spending and points
   */
  private async getEligibleTier(lifetimeSpending: number, lifetimePoints: number): Promise<LoyaltyTier> {
    const benefits = await this.prisma.loyaltyTierBenefit.findMany({
      where: { isActive: true },
      orderBy: [{ minimumSpending: 'desc' }, { minimumPoints: 'desc' }],
    });

    for (const benefit of benefits) {
      if (
        lifetimeSpending >= benefit.minimumSpending &&
        lifetimePoints >= benefit.minimumPoints
      ) {
        return benefit.tier;
      }
    }

    return LoyaltyTier.BRONZE;
  }

  /**
   * Get numeric value for tier comparison
   */
  private getTierValue(tier: LoyaltyTier): number {
    const tierValues = {
      [LoyaltyTier.BRONZE]: 1,
      [LoyaltyTier.SILVER]: 2,
      [LoyaltyTier.GOLD]: 3,
      [LoyaltyTier.PLATINUM]: 4,
      [LoyaltyTier.DIAMOND]: 5,
    };
    return tierValues[tier] || 0;
  }

  /**
   * Get tier leaderboard
   */
  async getTierLeaderboard(limit = 100) {
    return this.prisma.customerLoyalty.findMany({
      orderBy: [
        { currentTier: 'desc' },
        { lifetimeSpending: 'desc' },
      ],
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  // ============================================
  // REFERRAL SYSTEM
  // ============================================

  /**
   * Create referral
   */
  async createReferral(userId: string, dto: CreateReferralDto) {
    const loyalty = await this.ensureLoyaltyAccount(userId);

    // Check for existing pending referral with same email
    if (dto.refereeEmail) {
      const existing = await this.prisma.referral.findFirst({
        where: {
          referrerId: loyalty.id,
          refereeEmail: dto.refereeEmail,
          status: ReferralStatus.PENDING,
        },
      });

      if (existing) {
        throw new BadRequestException('Referral already exists for this email');
      }
    }

    // Set expiry (90 days from now)
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    return this.prisma.referral.create({
      data: {
        referrerId: loyalty.id,
        refereeEmail: dto.refereeEmail,
        refereePhone: dto.refereePhone,
        expiresAt,
      },
    });
  }

  /**
   * Get user's referrals
   */
  async getUserReferrals(userId: string) {
    const loyalty = await this.ensureLoyaltyAccount(userId);

    return this.prisma.referral.findMany({
      where: { referrerId: loyalty.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check and complete referral when referee makes purchase
   */
  private async checkReferralCompletion(loyaltyId: string, orderId: string, orderTotal: number) {
    const loyalty = await this.prisma.customerLoyalty.findUnique({
      where: { id: loyaltyId },
      include: { user: true },
    });

    if (!loyalty) {
      return; // Loyalty account not found
    }

    if (!loyalty.referredBy) {
      return; // Not a referred user
    }

    const program = await this.getActiveLoyaltyProgram();

    // Check if order meets minimum purchase requirement
    if (orderTotal < program.referralMinPurchase) {
      return;
    }

    // Find the referral record
    const referral = await this.prisma.referral.findFirst({
      where: {
        refereeId: loyaltyId,
        status: ReferralStatus.COMPLETED,
        referrerRewarded: false,
      },
    });

    if (!referral) {
      return;
    }

    // Update referral with purchase info
    await this.prisma.referral.update({
      where: { id: referral.id },
      data: {
        firstPurchaseId: orderId,
        firstPurchaseAmount: orderTotal,
        status: ReferralStatus.REWARDED,
      },
    });

    // Award points to referrer
    await this.addPoints(
      referral.referrerId,
      program.referrerRewardPoints,
      PointTransactionType.EARNED_REFERRAL,
      'Referral reward: Your friend made a purchase',
      program.pointsExpiryDays ?? undefined,
      undefined,
      undefined,
      referral.id
    );

    await this.prisma.referral.update({
      where: { id: referral.id },
      data: {
        referrerRewarded: true,
        referrerRewardedAt: new Date(),
        referrerPoints: program.referrerRewardPoints,
      },
    });

    // Award points to referee (if not already awarded)
    if (!referral.refereeRewarded) {
      await this.addPoints(
        loyaltyId,
        program.refereeRewardPoints,
        PointTransactionType.EARNED_REFERRAL,
        'Welcome! Bonus points for being referred',
        program.pointsExpiryDays ?? undefined,
        undefined,
        undefined,
        referral.id
      );

      await this.prisma.referral.update({
        where: { id: referral.id },
        data: {
          refereeRewarded: true,
          refereeRewardedAt: new Date(),
          refereePoints: program.refereeRewardPoints,
        },
      });
    }
  }

  /**
   * Apply referral code when user signs up
   */
  async applyReferralCode(userId: string, referralCode: string) {
    const referrer = await this.prisma.customerLoyalty.findUnique({
      where: { referralCode },
    });

    if (!referrer) {
      throw new NotFoundException('Invalid referral code');
    }

    const referee = await this.ensureLoyaltyAccount(userId);

    if (referee.referredBy) {
      throw new BadRequestException('Referral code already applied');
    }

    if (referrer.userId === userId) {
      throw new BadRequestException('Cannot refer yourself');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create referral record
    const referral = await this.prisma.referral.create({
      data: {
        referrerId: referrer.id,
        refereeId: referee.id,
        refereeEmail: user.email,
        status: ReferralStatus.COMPLETED,
      },
    });

    // Link referee to referrer
    await this.prisma.customerLoyalty.update({
      where: { id: referee.id },
      data: { referredBy: referrer.userId },
    });

    return referral;
  }

  // ============================================
  // REWARDS CATALOG
  // ============================================

  /**
   * Create reward
   */
  async createReward(dto: CreateRewardDto) {
    return this.prisma.reward.create({
      data: {
        ...dto,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      },
    });
  }

  /**
   * Get all rewards
   */
  async getAllRewards(includeInactive = false) {
    return this.prisma.reward.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { pointsCost: 'asc' },
    });
  }

  /**
   * Get available rewards for user
   */
  async getAvailableRewards(userId: string) {
    const loyalty = await this.ensureLoyaltyAccount(userId);

    const rewards = await this.prisma.reward.findMany({
      where: {
        isActive: true,
        OR: [
          { validFrom: null },
          { validFrom: { lte: new Date() } },
        ],
        AND: [
          {
            OR: [
              { validUntil: null },
              { validUntil: { gte: new Date() } },
            ],
          },
          {
            OR: [
              { minimumTier: null },
              {
                minimumTier: {
                  in: this.getTiersUpTo(loyalty.currentTier),
                },
              },
            ],
          },
          {
            OR: [
              { stock: null },
              { stock: { gt: 0 } },
            ],
          },
        ],
      },
      orderBy: { pointsCost: 'asc' },
    });

    // Mark which rewards user can afford
    return rewards.map((reward) => ({
      ...reward,
      canAfford: loyalty.currentPoints >= reward.pointsCost,
      userPoints: loyalty.currentPoints,
    }));
  }

  /**
   * Get tiers up to and including current tier
   */
  private getTiersUpTo(tier: LoyaltyTier): LoyaltyTier[] {
    const tiers = [
      LoyaltyTier.BRONZE,
      LoyaltyTier.SILVER,
      LoyaltyTier.GOLD,
      LoyaltyTier.PLATINUM,
      LoyaltyTier.DIAMOND,
    ];

    const tierIndex = tiers.indexOf(tier);
    return tiers.slice(0, tierIndex + 1);
  }

  /**
   * Update reward
   */
  async updateReward(id: string, dto: UpdateRewardDto) {
    await this.getRewardById(id);

    return this.prisma.reward.update({
      where: { id },
      data: {
        ...dto,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
    });
  }

  /**
   * Delete reward
   */
  async deleteReward(id: string) {
    await this.getRewardById(id);

    return this.prisma.reward.delete({
      where: { id },
    });
  }

  /**
   * Get reward by ID
   */
  private async getRewardById(id: string) {
    const reward = await this.prisma.reward.findUnique({
      where: { id },
    });

    if (!reward) {
      throw new NotFoundException('Reward not found');
    }

    return reward;
  }

  /**
   * Redeem reward
   */
  async redeemReward(userId: string, dto: RedeemRewardDto) {
    const loyalty = await this.ensureLoyaltyAccount(userId);
    const reward = await this.getRewardById(dto.rewardId);

    // Validate reward is active and available
    if (!reward.isActive) {
      throw new BadRequestException('Reward is not active');
    }

    if (reward.validFrom && new Date() < reward.validFrom) {
      throw new BadRequestException('Reward is not yet available');
    }

    if (reward.validUntil && new Date() > reward.validUntil) {
      throw new BadRequestException('Reward has expired');
    }

    if (reward.stock !== null && reward.stock <= 0) {
      throw new BadRequestException('Reward is out of stock');
    }

    // Check tier requirement
    if (reward.minimumTier) {
      const userTierValue = this.getTierValue(loyalty.currentTier);
      const requiredTierValue = this.getTierValue(reward.minimumTier);

      if (userTierValue < requiredTierValue) {
        throw new BadRequestException(
          `This reward requires ${reward.minimumTier} tier or higher`
        );
      }
    }

    // Check if user has enough points
    if (loyalty.currentPoints < reward.pointsCost) {
      throw new BadRequestException('Insufficient points');
    }

    // Deduct points
    await this.addPoints(
      loyalty.id,
      -reward.pointsCost,
      PointTransactionType.REDEEMED_PRODUCT,
      `Redeemed: ${reward.name}`
    );

    // Decrease stock if applicable
    if (reward.stock !== null) {
      await this.prisma.reward.update({
        where: { id: reward.id },
        data: { stock: reward.stock - 1 },
      });
    }

    // Create redemption record
    const expiresAt = reward.validUntil || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    return this.prisma.rewardRedemption.create({
      data: {
        loyaltyId: loyalty.id,
        rewardId: reward.id,
        pointsSpent: reward.pointsCost,
        expiresAt,
      },
      include: {
        reward: true,
      },
    });
  }

  /**
   * Get user's reward redemptions
   */
  async getUserRedemptions(userId: string) {
    const loyalty = await this.ensureLoyaltyAccount(userId);

    return this.prisma.rewardRedemption.findMany({
      where: { loyaltyId: loyalty.id },
      orderBy: { createdAt: 'desc' },
      include: {
        reward: true,
        order: {
          select: {
            id: true,
            total: true,
            createdAt: true,
          },
        },
      },
    });
  }

  /**
   * Apply redemption to order
   * This is called during checkout to calculate discount
   */
  async applyRedemptionToOrder(userId: string, dto: ApplyRewardDto) {
    const loyalty = await this.ensureLoyaltyAccount(userId);

    const redemption = await this.prisma.rewardRedemption.findUnique({
      where: { id: dto.redemptionId },
      include: { reward: true },
    });

    if (!redemption) {
      throw new NotFoundException('Redemption not found');
    }

    if (redemption.loyaltyId !== loyalty.id) {
      throw new BadRequestException('Redemption does not belong to this user');
    }

    if (redemption.isUsed) {
      throw new BadRequestException('Redemption already used');
    }

    if (redemption.expiresAt && new Date() > redemption.expiresAt) {
      throw new BadRequestException('Redemption has expired');
    }

    // Verify order belongs to user
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order || order.userId !== userId) {
      throw new BadRequestException('Invalid order');
    }

    // Check minimum purchase requirement
    if (redemption.reward.minimumPurchase && order.subtotal < redemption.reward.minimumPurchase) {
      throw new BadRequestException(
        `Order must be at least $${redemption.reward.minimumPurchase} to use this reward`
      );
    }

    // Mark redemption as used
    await this.prisma.rewardRedemption.update({
      where: { id: redemption.id },
      data: {
        isUsed: true,
        usedAt: new Date(),
        orderId: order.id,
      },
    });

    return {
      redemption,
      discount: this.calculateRewardDiscount(redemption.reward, order.subtotal),
    };
  }

  /**
   * Calculate discount from reward
   */
  private calculateRewardDiscount(reward: any, orderSubtotal: number): number {
    switch (reward.type) {
      case 'DISCOUNT_PERCENTAGE':
        return (orderSubtotal * reward.discountPercentage) / 100;
      case 'DISCOUNT_FIXED':
        return Math.min(reward.discountAmount, orderSubtotal);
      case 'FREE_SHIPPING':
        return 0; // Handled separately in shipping calculation
      default:
        return 0;
    }
  }

  // ============================================
  // LOYALTY PROGRAM CONFIGURATION
  // ============================================

  /**
   * Get active loyalty program
   */
  async getActiveLoyaltyProgram() {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { isActive: true },
    });

    if (!program) {
      // Return default configuration
      return {
        id: 'default',
        name: 'Default Loyalty Program',
        description: null,
        isActive: true,
        pointsPerDollar: 1,
        minimumRedeemPoints: 100,
        pointsExpiryDays: null,
        signupBonusPoints: 100,
        reviewRewardPoints: 50,
        birthdayRewardPoints: 200,
        referrerRewardPoints: 500,
        refereeRewardPoints: 250,
        referralMinPurchase: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return program;
  }

  /**
   * Update loyalty program
   */
  async updateLoyaltyProgram(id: string, dto: UpdateLoyaltyProgramDto) {
    return this.prisma.loyaltyProgram.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Initialize default loyalty program
   */
  async initializeLoyaltyProgram() {
    const existing = await this.prisma.loyaltyProgram.findFirst();

    if (existing) {
      return existing;
    }

    return this.prisma.loyaltyProgram.create({
      data: {
        name: 'CitadelBuy Rewards',
        description: 'Earn points on every purchase and redeem for exclusive rewards',
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
      },
    });
  }

  // ============================================
  // TIER BENEFITS
  // ============================================

  /**
   * Create tier benefit
   */
  async createTierBenefit(dto: CreateTierBenefitDto) {
    return this.prisma.loyaltyTierBenefit.create({
      data: dto,
    });
  }

  /**
   * Get all tier benefits
   */
  async getAllTierBenefits() {
    return this.prisma.loyaltyTierBenefit.findMany({
      where: { isActive: true },
      orderBy: { minimumSpending: 'asc' },
    });
  }

  /**
   * Get tier benefit by tier
   */
  async getTierBenefitByTier(tier: LoyaltyTier) {
    return this.prisma.loyaltyTierBenefit.findUnique({
      where: { tier },
    });
  }

  /**
   * Update tier benefit
   */
  async updateTierBenefit(tier: LoyaltyTier, dto: UpdateTierBenefitDto) {
    return this.prisma.loyaltyTierBenefit.update({
      where: { tier },
      data: dto,
    });
  }

  /**
   * Initialize default tier benefits
   */
  async initializeTierBenefits() {
    const tiers = [
      {
        tier: LoyaltyTier.BRONZE,
        name: 'Bronze Member',
        description: 'Welcome to our loyalty program!',
        minimumSpending: 0,
        minimumPoints: 0,
        pointsMultiplier: 1,
        discountPercentage: 0,
        freeShipping: false,
        earlyAccessHours: 0,
        prioritySupport: false,
        exclusiveProducts: false,
        badgeIcon: '🥉',
        badgeColor: '#CD7F32',
      },
      {
        tier: LoyaltyTier.SILVER,
        name: 'Silver Member',
        description: 'Enjoy enhanced rewards and benefits',
        minimumSpending: 500,
        minimumPoints: 1000,
        pointsMultiplier: 1.25,
        discountPercentage: 2,
        freeShipping: false,
        earlyAccessHours: 6,
        prioritySupport: false,
        exclusiveProducts: false,
        badgeIcon: '🥈',
        badgeColor: '#C0C0C0',
      },
      {
        tier: LoyaltyTier.GOLD,
        name: 'Gold Member',
        description: 'Premium member with exclusive perks',
        minimumSpending: 1500,
        minimumPoints: 3000,
        pointsMultiplier: 1.5,
        discountPercentage: 5,
        freeShipping: true,
        earlyAccessHours: 12,
        prioritySupport: true,
        exclusiveProducts: false,
        badgeIcon: '🥇',
        badgeColor: '#FFD700',
      },
      {
        tier: LoyaltyTier.PLATINUM,
        name: 'Platinum Member',
        description: 'VIP status with maximum benefits',
        minimumSpending: 3000,
        minimumPoints: 6000,
        pointsMultiplier: 2,
        discountPercentage: 10,
        freeShipping: true,
        earlyAccessHours: 24,
        prioritySupport: true,
        exclusiveProducts: true,
        badgeIcon: '💎',
        badgeColor: '#E5E4E2',
      },
      {
        tier: LoyaltyTier.DIAMOND,
        name: 'Diamond Member',
        description: 'Elite tier with unparalleled rewards',
        minimumSpending: 10000,
        minimumPoints: 20000,
        pointsMultiplier: 3,
        discountPercentage: 15,
        freeShipping: true,
        earlyAccessHours: 48,
        prioritySupport: true,
        exclusiveProducts: true,
        badgeIcon: '💠',
        badgeColor: '#B9F2FF',
      },
    ];

    const created = [];
    for (const tierData of tiers) {
      const existing = await this.prisma.loyaltyTierBenefit.findUnique({
        where: { tier: tierData.tier },
      });

      if (!existing) {
        const created_tier = await this.prisma.loyaltyTierBenefit.create({
          data: tierData,
        });
        created.push(created_tier);
      }
    }

    return { message: 'Tier benefits initialized', created: created.length };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Ensure user has loyalty account
   */
  private async ensureLoyaltyAccount(userId: string) {
    let loyalty = await this.prisma.customerLoyalty.findUnique({
      where: { userId },
    });

    if (!loyalty) {
      loyalty = await this.createLoyaltyAccount(userId);
    }

    return loyalty;
  }

  /**
   * Get loyalty statistics
   */
  async getLoyaltyStatistics() {
    const [
      totalCustomers,
      totalPoints,
      totalRedemptions,
      totalReferrals,
      tierDistribution,
    ] = await Promise.all([
      this.prisma.customerLoyalty.count(),
      this.prisma.customerLoyalty.aggregate({
        _sum: { currentPoints: true, lifetimePoints: true },
      }),
      this.prisma.rewardRedemption.count(),
      this.prisma.referral.count({ where: { status: ReferralStatus.REWARDED } }),
      this.prisma.customerLoyalty.groupBy({
        by: ['currentTier'],
        _count: true,
      }),
    ]);

    return {
      totalCustomers,
      totalPointsIssued: totalPoints._sum.lifetimePoints || 0,
      totalPointsActive: totalPoints._sum.currentPoints || 0,
      totalRedemptions,
      successfulReferrals: totalReferrals,
      tierDistribution: tierDistribution.reduce((acc, item) => {
        acc[item.currentTier] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}
