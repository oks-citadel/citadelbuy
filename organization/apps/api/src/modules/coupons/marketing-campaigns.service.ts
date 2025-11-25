import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MarketingCampaignType, MarketingCampaignStatus } from '@prisma/client';

export interface CreateCampaignDto {
  name: string;
  description?: string;
  type: MarketingCampaignType;
  startDate: string;
  endDate: string;
  budget?: number;
  targetRevenue?: number;
  tags?: string[];
  metadata?: Record<string, any>;
  couponIds?: string[];
}

export interface UpdateCampaignDto extends Partial<CreateCampaignDto> {
  status?: MarketingCampaignStatus;
}

@Injectable()
export class MarketingCampaignsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new marketing campaign
   */
  async createCampaign(adminId: string, dto: CreateCampaignDto) {
    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const campaign = await this.prisma.marketingCampaign.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        startDate,
        endDate,
        budget: dto.budget,
        targetRevenue: dto.targetRevenue,
        tags: dto.tags || [],
        metadata: dto.metadata,
        createdById: adminId,
        status: startDate <= new Date() ? MarketingCampaignStatus.ACTIVE : MarketingCampaignStatus.SCHEDULED,
      },
    });

    // Link coupons if provided
    if (dto.couponIds && dto.couponIds.length > 0) {
      await this.addCouponsToCampaign(campaign.id, dto.couponIds);
    }

    return campaign;
  }

  /**
   * Get all campaigns with filtering
   */
  async getCampaigns(params: {
    page?: number;
    limit?: number;
    status?: MarketingCampaignStatus;
    type?: MarketingCampaignType;
    search?: string;
  }) {
    const { page = 1, limit = 20, status, type, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } },
      ];
    }

    const [campaigns, total] = await Promise.all([
      this.prisma.marketingCampaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          coupons: {
            include: {
              campaign: false,
            },
          },
          _count: {
            select: { coupons: true },
          },
        },
      }),
      this.prisma.marketingCampaign.count({ where }),
    ]);

    return {
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(id: string) {
    const campaign = await this.prisma.marketingCampaign.findUnique({
      where: { id },
      include: {
        coupons: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  /**
   * Update campaign
   */
  async updateCampaign(id: string, dto: UpdateCampaignDto) {
    await this.getCampaign(id);

    // Validate dates if provided
    if (dto.startDate && dto.endDate) {
      if (new Date(dto.startDate) >= new Date(dto.endDate)) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    const campaign = await this.prisma.marketingCampaign.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        budget: dto.budget,
        targetRevenue: dto.targetRevenue,
        tags: dto.tags,
        metadata: dto.metadata,
        status: dto.status,
      },
    });

    // Update linked coupons if provided
    if (dto.couponIds) {
      await this.setCampaignCoupons(id, dto.couponIds);
    }

    return campaign;
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(id: string) {
    await this.getCampaign(id);

    await this.prisma.marketingCampaign.delete({
      where: { id },
    });

    return { message: 'Campaign deleted successfully' };
  }

  /**
   * Add coupons to campaign
   */
  async addCouponsToCampaign(campaignId: string, couponIds: string[]) {
    const campaign = await this.getCampaign(campaignId);

    // Verify coupons exist
    const coupons = await this.prisma.coupon.findMany({
      where: { id: { in: couponIds } },
      select: { id: true },
    });

    if (coupons.length !== couponIds.length) {
      throw new BadRequestException('Some coupons do not exist');
    }

    // Create links
    const existingLinks = await this.prisma.campaignCoupon.findMany({
      where: { campaignId },
      select: { couponId: true },
    });

    const existingCouponIds = existingLinks.map((l) => l.couponId);
    const newCouponIds = couponIds.filter((id) => !existingCouponIds.includes(id));

    if (newCouponIds.length > 0) {
      await this.prisma.campaignCoupon.createMany({
        data: newCouponIds.map((couponId) => ({
          campaignId,
          couponId,
        })),
      });
    }

    return { added: newCouponIds.length };
  }

  /**
   * Remove coupon from campaign
   */
  async removeCouponFromCampaign(campaignId: string, couponId: string) {
    await this.prisma.campaignCoupon.deleteMany({
      where: { campaignId, couponId },
    });

    return { message: 'Coupon removed from campaign' };
  }

  /**
   * Set campaign coupons (replace all)
   */
  private async setCampaignCoupons(campaignId: string, couponIds: string[]) {
    // Delete existing links
    await this.prisma.campaignCoupon.deleteMany({
      where: { campaignId },
    });

    // Create new links
    if (couponIds.length > 0) {
      await this.prisma.campaignCoupon.createMany({
        data: couponIds.map((couponId) => ({
          campaignId,
          couponId,
        })),
      });
    }
  }

  /**
   * Update campaign metrics (called when coupons are used)
   */
  async updateCampaignMetrics(couponId: string, orderAmount: number, discountAmount: number) {
    // Find campaigns using this coupon
    const campaignCoupons = await this.prisma.campaignCoupon.findMany({
      where: { couponId },
      include: { campaign: true },
    });

    for (const cc of campaignCoupons) {
      if (cc.campaign.status === MarketingCampaignStatus.ACTIVE) {
        // Update campaign coupon stats
        await this.prisma.campaignCoupon.update({
          where: { id: cc.id },
          data: {
            usageCount: { increment: 1 },
            revenue: { increment: orderAmount },
            discount: { increment: discountAmount },
          },
        });

        // Update campaign totals
        await this.prisma.marketingCampaign.update({
          where: { id: cc.campaignId },
          data: {
            totalOrders: { increment: 1 },
            totalDiscount: { increment: discountAmount },
            actualRevenue: { increment: orderAmount },
            budgetUsed: { increment: discountAmount },
          },
        });
      }
    }
  }

  /**
   * Track campaign impression
   */
  async trackImpression(campaignId: string) {
    await this.prisma.marketingCampaign.update({
      where: { id: campaignId },
      data: { impressions: { increment: 1 } },
    });
  }

  /**
   * Track campaign click
   */
  async trackClick(campaignId: string) {
    await this.prisma.marketingCampaign.update({
      where: { id: campaignId },
      data: { clicks: { increment: 1 } },
    });
  }

  /**
   * Track campaign conversion
   */
  async trackConversion(campaignId: string) {
    await this.prisma.marketingCampaign.update({
      where: { id: campaignId },
      data: { conversions: { increment: 1 } },
    });
  }

  /**
   * Get active campaigns for display
   */
  async getActiveCampaigns() {
    const now = new Date();

    return this.prisma.marketingCampaign.findMany({
      where: {
        status: MarketingCampaignStatus.ACTIVE,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        coupons: true,
      },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * Auto-update campaign statuses (cron job)
   */
  async updateCampaignStatuses() {
    const now = new Date();

    // Activate scheduled campaigns
    await this.prisma.marketingCampaign.updateMany({
      where: {
        status: MarketingCampaignStatus.SCHEDULED,
        startDate: { lte: now },
      },
      data: { status: MarketingCampaignStatus.ACTIVE },
    });

    // Complete expired campaigns
    await this.prisma.marketingCampaign.updateMany({
      where: {
        status: MarketingCampaignStatus.ACTIVE,
        endDate: { lt: now },
      },
      data: { status: MarketingCampaignStatus.COMPLETED },
    });

    // Pause campaigns that exceeded budget
    const budgetExceededCampaigns = await this.prisma.marketingCampaign.findMany({
      where: {
        status: MarketingCampaignStatus.ACTIVE,
        budget: { not: null },
      },
    });

    for (const campaign of budgetExceededCampaigns) {
      if (campaign.budget && campaign.budgetUsed >= campaign.budget) {
        await this.prisma.marketingCampaign.update({
          where: { id: campaign.id },
          data: { status: MarketingCampaignStatus.PAUSED },
        });
      }
    }
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [campaigns, stats] = await Promise.all([
      this.prisma.marketingCampaign.findMany({
        where,
        include: {
          coupons: true,
        },
      }),
      this.prisma.marketingCampaign.aggregate({
        where,
        _sum: {
          totalOrders: true,
          totalDiscount: true,
          actualRevenue: true,
          impressions: true,
          clicks: true,
          conversions: true,
        },
        _count: true,
      }),
    ]);

    // Calculate performance by type
    const performanceByType = await this.prisma.marketingCampaign.groupBy({
      by: ['type'],
      where,
      _sum: {
        totalOrders: true,
        totalDiscount: true,
        actualRevenue: true,
      },
      _count: true,
    });

    // Calculate ROI for completed campaigns
    const completedCampaigns = campaigns.filter(
      (c) => c.status === MarketingCampaignStatus.COMPLETED,
    );

    const avgROI = completedCampaigns.length > 0
      ? completedCampaigns.reduce((sum, c) => {
          if (c.totalDiscount > 0) {
            return sum + ((c.actualRevenue - c.totalDiscount) / c.totalDiscount) * 100;
          }
          return sum;
        }, 0) / completedCampaigns.length
      : 0;

    return {
      totalCampaigns: stats._count,
      totalOrders: stats._sum.totalOrders || 0,
      totalDiscount: stats._sum.totalDiscount || 0,
      totalRevenue: stats._sum.actualRevenue || 0,
      totalImpressions: stats._sum.impressions || 0,
      totalClicks: stats._sum.clicks || 0,
      totalConversions: stats._sum.conversions || 0,
      averageROI: Math.round(avgROI * 100) / 100,
      clickThroughRate: stats._sum.impressions
        ? ((stats._sum.clicks || 0) / stats._sum.impressions) * 100
        : 0,
      conversionRate: stats._sum.clicks
        ? ((stats._sum.conversions || 0) / stats._sum.clicks) * 100
        : 0,
      performanceByType,
    };
  }
}
