import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface ReferralProgram {
  id: string;
  name: string;
  description?: string;
  referrerReward: {
    type: 'DISCOUNT' | 'CREDIT' | 'CASHBACK' | 'POINTS';
    value: number;
    currency?: string;
  };
  refereeReward: {
    type: 'DISCOUNT' | 'CREDIT' | 'CASHBACK' | 'POINTS';
    value: number;
    currency?: string;
  };
  requirementType?: 'FIRST_ORDER' | 'MIN_ORDER_VALUE' | 'NONE';
  requirementValue?: number;
  expiryDays?: number;
  maxRedemptions?: number;
  active: boolean;
}

export interface Referral {
  id: string;
  referrerId: string;
  refereeEmail: string;
  refereeId?: string;
  code: string;
  programId: string;
  status: 'PENDING' | 'COMPLETED' | 'REWARDED' | 'EXPIRED';
  createdAt: Date;
  completedAt?: Date;
}

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a referral program
   */
  async createReferralProgram(program: Omit<ReferralProgram, 'id'>) {
    this.logger.log(`Creating referral program: ${program.name}`);

    const created = await this.prisma.referralProgram.create({
      data: {
        name: program.name,
        description: program.description,
        referrerReward: program.referrerReward as any,
        refereeReward: program.refereeReward as any,
        requirementType: program.requirementType || 'NONE',
        requirementValue: program.requirementValue,
        expiryDays: program.expiryDays,
        maxRedemptions: program.maxRedemptions,
        active: program.active,
      },
    });

    return created;
  }

  /**
   * Get all referral programs
   */
  async getReferralPrograms(activeOnly: boolean = false) {
    const where: any = {};
    if (activeOnly) {
      where.active = true;
    }

    return this.prisma.referralProgram.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update referral program
   */
  async updateReferralProgram(id: string, updates: Partial<ReferralProgram>) {
    const program = await this.prisma.referralProgram.findUnique({
      where: { id },
    });

    if (!program) {
      throw new NotFoundException(`Referral program ${id} not found`);
    }

    return this.prisma.referralProgram.update({
      where: { id },
      data: {
        name: updates.name,
        description: updates.description,
        referrerReward: updates.referrerReward as any,
        refereeReward: updates.refereeReward as any,
        requirementType: updates.requirementType,
        requirementValue: updates.requirementValue,
        expiryDays: updates.expiryDays,
        maxRedemptions: updates.maxRedemptions,
        active: updates.active,
      },
    });
  }

  /**
   * Generate referral code for a user
   */
  async generateReferralCode(userId: string, programId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const program = await this.prisma.referralProgram.findUnique({
      where: { id: programId },
    });

    if (!program) {
      throw new NotFoundException(`Referral program ${programId} not found`);
    }

    if (!program.active) {
      throw new BadRequestException('Referral program is not active');
    }

    // Check if user already has a code for this program
    const existing = await this.prisma.referralCode.findFirst({
      where: {
        userId,
        programId,
      },
    });

    if (existing) {
      return existing.code;
    }

    // Generate unique code
    const code = this.generateUniqueCode(user.email);

    await this.prisma.referralCode.create({
      data: {
        userId,
        programId,
        code,
        usageCount: 0,
      },
    });

    this.logger.log(`Generated referral code for user ${userId}: ${code}`);
    return code;
  }

  /**
   * Create a referral (when someone uses a code)
   */
  async createReferral(params: {
    code: string;
    refereeEmail: string;
    refereeId?: string;
  }) {
    const referralCode = await this.prisma.referralCode.findUnique({
      where: { code: params.code },
      include: {
        program: true,
      },
    });

    if (!referralCode) {
      throw new NotFoundException(`Referral code ${params.code} not found`);
    }

    if (!referralCode.program.active) {
      throw new BadRequestException('Referral program is not active');
    }

    // Check max redemptions
    if (
      referralCode.program.maxRedemptions &&
      referralCode.usageCount >= referralCode.program.maxRedemptions
    ) {
      throw new BadRequestException('Referral code has reached maximum redemptions');
    }

    // Check if referee already used this code
    const existing = await this.prisma.referral.findFirst({
      where: {
        referralCodeId: referralCode.id,
        refereeEmail: params.refereeEmail,
      },
    });

    if (existing) {
      throw new BadRequestException('This email has already used this referral code');
    }

    const referral = await this.prisma.referral.create({
      data: {
        referralCodeId: referralCode.id,
        referrerId: referralCode.userId,
        refereeEmail: params.refereeEmail,
        refereeId: params.refereeId,
        programId: referralCode.programId,
        status: 'PENDING',
      },
    });

    // Update usage count
    await this.prisma.referralCode.update({
      where: { id: referralCode.id },
      data: {
        usageCount: referralCode.usageCount + 1,
      },
    });

    this.logger.log(`Created referral: ${referral.id}`);
    return referral;
  }

  /**
   * Complete a referral (when requirements are met)
   */
  async completeReferral(referralId: string, orderId?: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { id: referralId },
      include: {
        program: true,
        referrer: true,
        referee: true,
      },
    });

    if (!referral) {
      throw new NotFoundException(`Referral ${referralId} not found`);
    }

    if (referral.status !== 'PENDING') {
      throw new BadRequestException('Referral is not in pending status');
    }

    // Check if requirements are met
    const requirementsMet = await this.checkRequirements(referral, orderId);

    if (!requirementsMet) {
      throw new BadRequestException('Referral requirements not met');
    }

    // Mark as completed
    await this.prisma.referral.update({
      where: { id: referralId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    this.logger.log(`Referral completed: ${referralId}`);
    return { success: true };
  }

  /**
   * Issue rewards for a completed referral
   */
  async issueRewards(referralId: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { id: referralId },
      include: {
        program: true,
      },
    });

    if (!referral) {
      throw new NotFoundException(`Referral ${referralId} not found`);
    }

    if (referral.status !== 'COMPLETED') {
      throw new BadRequestException('Referral must be completed before issuing rewards');
    }

    // Issue referrer reward
    await this.issueReward(
      referral.referrerId,
      referral.program.referrerReward as any,
      'REFERRER',
    );

    // Issue referee reward
    if (referral.refereeId) {
      await this.issueReward(
        referral.refereeId,
        referral.program.refereeReward as any,
        'REFEREE',
      );
    }

    // Mark as rewarded
    await this.prisma.referral.update({
      where: { id: referralId },
      data: {
        status: 'REWARDED',
      },
    });

    this.logger.log(`Rewards issued for referral: ${referralId}`);
    return { success: true };
  }

  /**
   * Get user's referrals
   */
  async getUserReferrals(userId: string) {
    return this.prisma.referral.findMany({
      where: {
        referrerId: userId,
      },
      include: {
        program: true,
        referee: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get referral analytics
   */
  async getReferralAnalytics(userId?: string) {
    const where: any = {};
    if (userId) {
      where.referrerId = userId;
    }

    const total = await this.prisma.referral.count({ where });
    const pending = await this.prisma.referral.count({
      where: { ...where, status: 'PENDING' },
    });
    const completed = await this.prisma.referral.count({
      where: { ...where, status: 'COMPLETED' },
    });
    const rewarded = await this.prisma.referral.count({
      where: { ...where, status: 'REWARDED' },
    });

    const conversionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      userId,
      total,
      pending,
      completed,
      rewarded,
      conversionRate,
    };
  }

  /**
   * Get top referrers
   */
  async getTopReferrers(limit: number = 50) {
    const referrers = await this.prisma.referral.groupBy({
      by: ['referrerId'],
      where: {
        status: { in: ['COMPLETED', 'REWARDED'] },
      },
      _count: true,
      orderBy: {
        _count: {
          referrerId: 'desc',
        },
      },
      take: limit,
    });

    const results = [];

    for (const referrer of referrers) {
      const user = await this.prisma.user.findUnique({
        where: { id: referrer.referrerId },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      results.push({
        user,
        referralCount: referrer._count,
      });
    }

    return results;
  }

  /**
   * Generate unique referral code
   */
  private generateUniqueCode(email: string): string {
    const prefix = email.split('@')[0].substring(0, 4).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${random}`;
  }

  /**
   * Check if referral requirements are met
   */
  private async checkRequirements(referral: any, orderId?: string): Promise<boolean> {
    if (!referral.program.requirementType || referral.program.requirementType === 'NONE') {
      return true;
    }

    if (!orderId) {
      return false;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return false;
    }

    switch (referral.program.requirementType) {
      case 'FIRST_ORDER':
        const orderCount = await this.prisma.order.count({
          where: { userId: referral.refereeId },
        });
        return orderCount === 1;

      case 'MIN_ORDER_VALUE':
        return order.total >= (referral.program.requirementValue || 0);

      default:
        return true;
    }
  }

  /**
   * Issue a reward to a user
   */
  private async issueReward(userId: string, reward: any, type: 'REFERRER' | 'REFEREE') {
    this.logger.log(`Issuing ${type} reward to user ${userId}`);

    switch (reward.type) {
      case 'CREDIT':
        await this.prisma.userCredit.create({
          data: {
            userId,
            amount: reward.value,
            currency: reward.currency || 'USD',
            source: `REFERRAL_${type}`,
          },
        });
        break;

      case 'DISCOUNT':
        await this.prisma.coupon.create({
          data: {
            code: this.generateUniqueCode('REFERRAL'),
            type: 'PERCENTAGE',
            value: reward.value,
            userId,
            source: `REFERRAL_${type}`,
          },
        });
        break;

      case 'POINTS':
        await this.prisma.loyaltyPoints.create({
          data: {
            userId,
            points: reward.value,
            source: `REFERRAL_${type}`,
          },
        });
        break;

      default:
        this.logger.warn(`Unknown reward type: ${reward.type}`);
    }
  }
}
