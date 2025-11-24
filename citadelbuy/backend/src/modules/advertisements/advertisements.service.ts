import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import { TrackImpressionDto } from './dto/track-impression.dto';
import { TrackClickDto } from './dto/track-click.dto';
import { AdQueryDto, CampaignQueryDto } from './dto/ad-query.dto';
import { AdStatus, CampaignStatus } from '@prisma/client';

@Injectable()
export class AdvertisementsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // CAMPAIGN MANAGEMENT
  // ============================================

  /**
   * Create new ad campaign
   */
  async createCampaign(vendorId: string, dto: CreateCampaignDto) {
    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    if (endDate && endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Validate daily budget doesn't exceed total budget
    if (dto.dailyBudget && dto.dailyBudget > dto.totalBudget) {
      throw new BadRequestException('Daily budget cannot exceed total budget');
    }

    return this.prisma.adCampaign.create({
      data: {
        vendorId,
        name: dto.name,
        description: dto.description,
        totalBudget: dto.totalBudget,
        dailyBudget: dto.dailyBudget,
        startDate,
        endDate,
        status: CampaignStatus.DRAFT,
      },
      include: {
        advertisements: true,
      },
    });
  }

  /**
   * Get all campaigns for a vendor
   */
  async findAllCampaigns(vendorId: string, query?: CampaignQueryDto) {
    const where: any = { vendorId };

    if (query?.status) {
      where.status = query.status;
    }

    return this.prisma.adCampaign.findMany({
      where,
      include: {
        advertisements: {
          select: {
            id: true,
            type: true,
            status: true,
            impressions: true,
            clicks: true,
            spentAmount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single campaign by ID
   */
  async findOneCampaign(id: string, vendorId: string) {
    const campaign = await this.prisma.adCampaign.findUnique({
      where: { id },
      include: {
        advertisements: true,
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Check ownership (unless admin)
    if (campaign.vendorId !== vendorId) {
      throw new ForbiddenException('You do not have access to this campaign');
    }

    return campaign;
  }

  /**
   * Update campaign
   */
  async updateCampaign(id: string, vendorId: string, dto: UpdateCampaignDto) {
    const campaign = await this.findOneCampaign(id, vendorId);

    // Validate dates if provided
    if (dto.startDate || dto.endDate) {
      const startDate = dto.startDate ? new Date(dto.startDate) : campaign.startDate;
      const endDate = dto.endDate ? new Date(dto.endDate) : campaign.endDate;

      if (endDate && endDate <= startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    return this.prisma.adCampaign.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.totalBudget && { totalBudget: dto.totalBudget }),
        ...(dto.dailyBudget !== undefined && { dailyBudget: dto.dailyBudget }),
        ...(dto.status && { status: dto.status }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
      },
      include: {
        advertisements: true,
      },
    });
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(id: string, vendorId: string) {
    await this.findOneCampaign(id, vendorId);

    return this.prisma.adCampaign.delete({
      where: { id },
    });
  }

  // ============================================
  // ADVERTISEMENT MANAGEMENT
  // ============================================

  /**
   * Create new advertisement
   */
  async createAdvertisement(vendorId: string, dto: CreateAdvertisementDto) {
    // Verify campaign ownership
    const campaign = await this.prisma.adCampaign.findUnique({
      where: { id: dto.campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.vendorId !== vendorId) {
      throw new ForbiddenException('You do not have access to this campaign');
    }

    // Verify product ownership if productId provided
    if (dto.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (product.vendorId !== vendorId) {
        throw new ForbiddenException('You do not own this product');
      }
    }

    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    if (endDate && endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    return this.prisma.advertisement.create({
      data: {
        campaignId: dto.campaignId,
        vendorId,
        productId: dto.productId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        imageUrl: dto.imageUrl,
        targetUrl: dto.targetUrl,
        bidAmount: dto.bidAmount,
        dailyBudget: dto.dailyBudget,
        targetCategories: dto.targetCategories || [],
        targetKeywords: dto.targetKeywords || [],
        targetLocations: dto.targetLocations || [],
        startDate,
        endDate,
        status: AdStatus.DRAFT,
      },
      include: {
        campaign: true,
        product: true,
      },
    });
  }

  /**
   * Get all advertisements for a vendor
   */
  async findAllAdvertisements(vendorId: string, query?: AdQueryDto) {
    const where: any = { vendorId };

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.type) {
      where.type = query.type;
    }

    if (query?.campaignId) {
      where.campaignId = query.campaignId;
    }

    return this.prisma.advertisement.findMany({
      where,
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single advertisement by ID
   */
  async findOneAdvertisement(id: string, vendorId: string) {
    const ad = await this.prisma.advertisement.findUnique({
      where: { id },
      include: {
        campaign: true,
        product: true,
        keywords: true,
      },
    });

    if (!ad) {
      throw new NotFoundException('Advertisement not found');
    }

    if (ad.vendorId !== vendorId) {
      throw new ForbiddenException('You do not have access to this advertisement');
    }

    return ad;
  }

  /**
   * Update advertisement
   */
  async updateAdvertisement(id: string, vendorId: string, dto: UpdateAdvertisementDto) {
    await this.findOneAdvertisement(id, vendorId);

    return this.prisma.advertisement.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.targetUrl !== undefined && { targetUrl: dto.targetUrl }),
        ...(dto.bidAmount && { bidAmount: dto.bidAmount }),
        ...(dto.dailyBudget !== undefined && { dailyBudget: dto.dailyBudget }),
        ...(dto.status && { status: dto.status }),
        ...(dto.targetCategories && { targetCategories: dto.targetCategories }),
        ...(dto.targetKeywords && { targetKeywords: dto.targetKeywords }),
        ...(dto.targetLocations && { targetLocations: dto.targetLocations }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
      },
      include: {
        campaign: true,
        product: true,
      },
    });
  }

  /**
   * Delete advertisement
   */
  async deleteAdvertisement(id: string, vendorId: string) {
    await this.findOneAdvertisement(id, vendorId);

    return this.prisma.advertisement.delete({
      where: { id },
    });
  }

  // ============================================
  // AD SERVING & SELECTION
  // ============================================

  /**
   * Get ads to display based on context (placement, keywords, category)
   */
  async getAdsForDisplay(context: {
    placement?: string;
    categoryId?: string;
    keywords?: string[];
    limit?: number;
  }) {
    const now = new Date();
    const { placement, categoryId, keywords, limit = 5 } = context;

    // Build where clause
    const where: any = {
      status: AdStatus.ACTIVE,
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
      campaign: {
        status: CampaignStatus.ACTIVE,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
    };

    // Filter by category if provided
    if (categoryId) {
      where.OR = [
        { targetCategories: { has: categoryId } },
        { targetCategories: { isEmpty: true } }, // Ads targeting all categories
      ];
    }

    // Filter by keywords if provided
    if (keywords && keywords.length > 0) {
      where.targetKeywords = {
        hasSome: keywords,
      };
    }

    // Get eligible ads
    const ads = await this.prisma.advertisement.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
            slug: true,
          },
        },
        campaign: {
          select: {
            id: true,
            spentAmount: true,
            totalBudget: true,
          },
        },
      },
      orderBy: {
        bidAmount: 'desc', // Higher bids get priority
      },
      take: limit * 2, // Get more than needed for filtering
    });

    // Check budget constraints and filter out ads that exceeded budget
    const eligibleAds = await Promise.all(
      ads.map(async (ad) => {
        // Check campaign budget
        if (ad.campaign.spentAmount >= ad.campaign.totalBudget) {
          return null;
        }

        // Check daily budget if set
        if (ad.dailyBudget) {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);

          const todaySpent = await this.prisma.adClick.aggregate({
            where: {
              adId: ad.id,
              timestamp: { gte: todayStart },
            },
            _sum: { cost: true },
          });

          if (todaySpent._sum.cost && todaySpent._sum.cost >= ad.dailyBudget) {
            return null;
          }
        }

        return ad;
      })
    );

    // Filter out null values and return requested limit
    return eligibleAds.filter((ad) => ad !== null).slice(0, limit);
  }

  // ============================================
  // TRACKING & ANALYTICS
  // ============================================

  /**
   * Track ad impression
   */
  async trackImpression(dto: TrackImpressionDto, ipAddress?: string, userAgent?: string) {
    const ad = await this.prisma.advertisement.findUnique({
      where: { id: dto.adId },
    });

    if (!ad) {
      throw new NotFoundException('Advertisement not found');
    }

    // Create impression record
    await this.prisma.adImpression.create({
      data: {
        adId: dto.adId,
        userId: dto.userId,
        ipAddress,
        userAgent,
        location: dto.location,
        placement: dto.placement,
      },
    });

    // Update cached impression count on ad and campaign
    await Promise.all([
      this.prisma.advertisement.update({
        where: { id: dto.adId },
        data: { impressions: { increment: 1 } },
      }),
      this.prisma.adCampaign.update({
        where: { id: ad.campaignId },
        data: { impressions: { increment: 1 } },
      }),
    ]);

    return { success: true };
  }

  /**
   * Track ad click
   */
  async trackClick(dto: TrackClickDto, ipAddress?: string, userAgent?: string) {
    const ad = await this.prisma.advertisement.findUnique({
      where: { id: dto.adId },
      include: { campaign: true },
    });

    if (!ad) {
      throw new NotFoundException('Advertisement not found');
    }

    // Calculate cost (bid amount)
    const cost = ad.bidAmount;

    // Check if campaign has enough budget
    if (ad.campaign.spentAmount + cost > ad.campaign.totalBudget) {
      // Mark ad as out of budget
      await this.prisma.advertisement.update({
        where: { id: dto.adId },
        data: { status: AdStatus.OUT_OF_BUDGET },
      });
      throw new BadRequestException('Campaign budget exceeded');
    }

    // Create click record
    await this.prisma.adClick.create({
      data: {
        adId: dto.adId,
        userId: dto.userId,
        ipAddress,
        userAgent,
        location: dto.location,
        placement: dto.placement,
        cost,
      },
    });

    // Update cached metrics and spent amounts
    await Promise.all([
      this.prisma.advertisement.update({
        where: { id: dto.adId },
        data: {
          clicks: { increment: 1 },
          spentAmount: { increment: cost },
        },
      }),
      this.prisma.adCampaign.update({
        where: { id: ad.campaignId },
        data: {
          clicks: { increment: 1 },
          spentAmount: { increment: cost },
        },
      }),
    ]);

    return { success: true, cost };
  }

  /**
   * Get ad performance analytics
   */
  async getAdPerformance(adId: string, vendorId: string) {
    const ad = await this.findOneAdvertisement(adId, vendorId);

    // Calculate CTR (Click-Through Rate)
    const ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0;

    // Calculate CPC (Cost Per Click)
    const cpc = ad.clicks > 0 ? ad.spentAmount / ad.clicks : 0;

    // Calculate conversion rate
    const conversionRate = ad.clicks > 0 ? (ad.conversions / ad.clicks) * 100 : 0;

    // Get daily breakdown
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const [dailyImpressions, dailyClicks] = await Promise.all([
      this.prisma.adImpression.groupBy({
        by: ['timestamp'],
        where: {
          adId,
          timestamp: { gte: last30Days },
        },
        _count: { id: true },
      }),
      this.prisma.adClick.groupBy({
        by: ['timestamp'],
        where: {
          adId,
          timestamp: { gte: last30Days },
        },
        _count: { id: true },
        _sum: { cost: true },
      }),
    ]);

    return {
      ad: {
        id: ad.id,
        title: ad.title,
        type: ad.type,
        status: ad.status,
      },
      metrics: {
        impressions: ad.impressions,
        clicks: ad.clicks,
        conversions: ad.conversions,
        spentAmount: ad.spentAmount,
        ctr: Math.round(ctr * 100) / 100,
        cpc: Math.round(cpc * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
      },
      dailyBreakdown: {
        impressions: dailyImpressions,
        clicks: dailyClicks,
      },
    };
  }

  /**
   * Get campaign performance analytics
   */
  async getCampaignPerformance(campaignId: string, vendorId: string) {
    const campaign = await this.findOneCampaign(campaignId, vendorId);

    // Calculate overall metrics
    const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
    const cpc = campaign.clicks > 0 ? campaign.spentAmount / campaign.clicks : 0;
    const conversionRate = campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0;
    const budgetUsed = (campaign.spentAmount / campaign.totalBudget) * 100;

    // Get ad-level performance
    const adPerformance = campaign.advertisements.map((ad) => ({
      id: ad.id,
      title: ad.title,
      type: ad.type,
      status: ad.status,
      impressions: ad.impressions,
      clicks: ad.clicks,
      conversions: ad.conversions,
      spentAmount: ad.spentAmount,
      ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0,
    }));

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        totalBudget: campaign.totalBudget,
        dailyBudget: campaign.dailyBudget,
      },
      metrics: {
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        conversions: campaign.conversions,
        spentAmount: campaign.spentAmount,
        remainingBudget: campaign.totalBudget - campaign.spentAmount,
        budgetUsedPercentage: Math.round(budgetUsed * 100) / 100,
        ctr: Math.round(ctr * 100) / 100,
        cpc: Math.round(cpc * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
      },
      advertisements: adPerformance,
    };
  }
}
