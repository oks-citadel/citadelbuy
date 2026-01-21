import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface ABMAccount {
  id: string;
  organizationId: string;
  name: string;
  industry: string;
  size: string;
  revenue?: number;
  tier: 'STRATEGIC' | 'PRIORITY' | 'STANDARD';
  status: 'TARGET' | 'ENGAGED' | 'QUALIFIED' | 'CUSTOMER' | 'LOST';
  assignedTo?: string;
  metadata?: Record<string, any>;
}

export interface ABMCampaign {
  id: string;
  name: string;
  description?: string;
  targetAccounts: string[];
  strategy: 'ONE_TO_ONE' | 'ONE_TO_FEW' | 'ONE_TO_MANY';
  status: 'PLANNING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  budget?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface ABMEngagement {
  accountId: string;
  type: 'EMAIL' | 'MEETING' | 'CALL' | 'DEMO' | 'PROPOSAL' | 'EVENT';
  date: Date;
  outcome?: string;
  notes?: string;
  score?: number;
}

@Injectable()
export class ABMService {
  private readonly logger = new Logger(ABMService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create ABM account
   */
  async createAccount(account: Omit<ABMAccount, 'id'>) {
    this.logger.log(`Creating ABM account: ${account.name}`);

    const created = await this.prisma.aBMAccount.create({
      data: {
        organizationId: account.organizationId,
        name: account.name,
        industry: account.industry,
        size: account.size,
        revenue: account.revenue,
        tier: account.tier,
        status: account.status || 'TARGET',
        assignedTo: account.assignedTo,
        metadata: account.metadata as any,
        score: 0,
        engagementCount: 0,
      },
    });

    return created;
  }

  /**
   * Get ABM accounts
   */
  async getAccounts(filters?: {
    tier?: string;
    status?: string;
    industry?: string;
    assignedTo?: string;
  }) {
    const where: any = {};

    if (filters?.tier) {
      where.tier = filters.tier;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.industry) {
      where.industry = filters.industry;
    }

    if (filters?.assignedTo) {
      where.assignedTo = filters.assignedTo;
    }

    return this.prisma.aBMAccount.findMany({
      where,
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
  }

  /**
   * Get account by ID
   */
  async getAccountById(id: string) {
    const account = await this.prisma.aBMAccount.findUnique({
      where: { id },
      include: {
        organization: true,
        engagements: {
          orderBy: { date: 'desc' },
          take: 20,
        },
      },
    });

    if (!account) {
      throw new NotFoundException(`ABM account ${id} not found`);
    }

    return account;
  }

  /**
   * Update ABM account
   */
  async updateAccount(id: string, updates: Partial<ABMAccount>) {
    await this.getAccountById(id);

    return this.prisma.aBMAccount.update({
      where: { id },
      data: {
        name: updates.name,
        industry: updates.industry,
        size: updates.size,
        revenue: updates.revenue,
        tier: updates.tier,
        status: updates.status,
        assignedTo: updates.assignedTo,
        metadata: updates.metadata as any,
      },
    });
  }

  /**
   * Delete ABM account
   */
  async deleteAccount(id: string) {
    await this.getAccountById(id);

    await this.prisma.aBMAccount.delete({
      where: { id },
    });

    this.logger.log(`ABM account deleted: ${id}`);
    return { success: true };
  }

  /**
   * Create ABM campaign
   */
  async createCampaign(campaign: Omit<ABMCampaign, 'id'>) {
    this.logger.log(`Creating ABM campaign: ${campaign.name}`);

    const created = await this.prisma.aBMCampaign.create({
      data: {
        name: campaign.name,
        description: campaign.description,
        targetAccounts: campaign.targetAccounts,
        strategy: campaign.strategy,
        status: campaign.status || 'PLANNING',
        budget: campaign.budget,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
      },
    });

    return created;
  }

  /**
   * Get ABM campaigns
   */
  async getCampaigns(filters?: { status?: string; strategy?: string }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.strategy) {
      where.strategy = filters.strategy;
    }

    return this.prisma.aBMCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update ABM campaign
   */
  async updateCampaign(id: string, updates: Partial<ABMCampaign>) {
    const campaign = await this.prisma.aBMCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      throw new NotFoundException(`ABM campaign ${id} not found`);
    }

    return this.prisma.aBMCampaign.update({
      where: { id },
      data: {
        name: updates.name,
        description: updates.description,
        targetAccounts: updates.targetAccounts,
        strategy: updates.strategy,
        status: updates.status,
        budget: updates.budget,
        startDate: updates.startDate,
        endDate: updates.endDate,
      },
    });
  }

  /**
   * Track account engagement
   */
  async trackEngagement(engagement: ABMEngagement) {
    this.logger.log(`Tracking engagement for account: ${engagement.accountId}`);

    const account = await this.getAccountById(engagement.accountId);

    // Create engagement record
    const created = await this.prisma.aBMEngagement.create({
      data: {
        accountId: engagement.accountId,
        type: engagement.type,
        date: engagement.date,
        outcome: engagement.outcome,
        notes: engagement.notes,
        score: engagement.score || this.calculateEngagementScore(engagement.type),
      },
    });

    // Update account engagement count and score
    const newEngagementCount = account.engagementCount + 1;
    const scoreIncrement = created.score || 0;

    await this.prisma.aBMAccount.update({
      where: { id: engagement.accountId },
      data: {
        engagementCount: newEngagementCount,
        score: account.score + scoreIncrement,
        lastEngagementDate: engagement.date,
      },
    });

    return created;
  }

  /**
   * Get account engagements
   */
  async getAccountEngagements(accountId: string) {
    await this.getAccountById(accountId);

    return this.prisma.aBMEngagement.findMany({
      where: { accountId },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * Calculate account health score
   */
  async calculateAccountHealth(accountId: string) {
    const account = await this.getAccountById(accountId);

    // Factors: engagement frequency, recency, variety, revenue potential
    const engagements = await this.prisma.aBMEngagement.findMany({
      where: { accountId },
      orderBy: { date: 'desc' },
    });

    let healthScore = 0;

    // Engagement recency (0-30 points)
    if (account.lastEngagementDate) {
      const daysSinceLastEngagement = Math.floor(
        (Date.now() - new Date(account.lastEngagementDate).getTime()) / (1000 * 60 * 60 * 24),
      );
      healthScore += Math.max(0, 30 - daysSinceLastEngagement);
    }

    // Engagement frequency (0-30 points)
    const last30Days = engagements.filter(
      (e) => Date.now() - new Date(e.date).getTime() < 30 * 24 * 60 * 60 * 1000,
    );
    healthScore += Math.min(30, last30Days.length * 5);

    // Engagement variety (0-20 points)
    const uniqueTypes = new Set(engagements.map((e) => e.type));
    healthScore += uniqueTypes.size * 4;

    // Tier weight (0-20 points)
    const tierScores = { STRATEGIC: 20, PRIORITY: 15, STANDARD: 10 };
    healthScore += tierScores[account.tier as keyof typeof tierScores] || 0;

    return {
      accountId,
      accountName: account.name,
      healthScore: Math.min(100, healthScore),
      engagementCount: account.engagementCount,
      lastEngagement: account.lastEngagementDate,
      tier: account.tier,
      status: account.status,
    };
  }

  /**
   * Get ABM analytics
   */
  async getABMAnalytics() {
    const totalAccounts = await this.prisma.aBMAccount.count();
    const accountsByTier = await this.prisma.aBMAccount.groupBy({
      by: ['tier'],
      _count: true,
    });
    const accountsByStatus = await this.prisma.aBMAccount.groupBy({
      by: ['status'],
      _count: true,
    });

    const totalEngagements = await this.prisma.aBMEngagement.count();
    const activeCampaigns = await this.prisma.aBMCampaign.count({
      where: { status: 'ACTIVE' },
    });

    return {
      totalAccounts,
      accountsByTier,
      accountsByStatus,
      totalEngagements,
      activeCampaigns,
    };
  }

  /**
   * Calculate engagement score based on type
   */
  private calculateEngagementScore(type: string): number {
    const scores: Record<string, number> = {
      EMAIL: 1,
      CALL: 3,
      MEETING: 5,
      DEMO: 10,
      PROPOSAL: 15,
      EVENT: 8,
    };

    return scores[type] || 1;
  }
}
