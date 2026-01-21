import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCampaignDto, UpdateCampaignDto, CampaignStatus, CampaignMetricsDto } from './dto/campaign.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new marketing campaign
   */
  async createCampaign(data: CreateCampaignDto) {
    try {
      this.logger.log(`Creating campaign: ${data.name}`);

      const campaign = await this.prisma.marketingCampaign.create({
        data: {
          name: data.name,
          description: data.description,
          type: data.type,
          status: CampaignStatus.DRAFT,
          organizationId: data.organizationId,
          targeting: data.targeting as any,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          budget: data.budget,
          currency: data.currency || 'USD',
          content: data.content as any,
          tags: data.tags,
          metrics: {
            impressions: 0,
            clicks: 0,
            conversions: 0,
            spend: 0,
            revenue: 0,
          },
        },
      });

      this.logger.log(`Campaign created: ${campaign.id}`);
      return campaign;
    } catch (error) {
      this.logger.error(`Failed to create campaign: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create campaign');
    }
  }

  /**
   * Get all campaigns with optional filters
   */
  async getCampaigns(filters?: {
    organizationId?: string;
    status?: CampaignStatus;
    type?: string;
    region?: string;
  }) {
    const where: any = {};

    if (filters?.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.region) {
      where.targeting = {
        path: ['regions'],
        array_contains: filters.region,
      };
    }

    const campaigns = await this.prisma.marketingCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return campaigns;
  }

  /**
   * Get a single campaign by ID
   */
  async getCampaignById(id: string) {
    const campaign = await this.prisma.marketingCampaign.findUnique({
      where: { id },
      include: {
        organization: true,
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    return campaign;
  }

  /**
   * Update a campaign
   */
  async updateCampaign(id: string, data: UpdateCampaignDto) {
    try {
      const campaign = await this.getCampaignById(id);

      // Validate status transitions
      if (data.status) {
        this.validateStatusTransition(campaign.status as CampaignStatus, data.status);
      }

      const updated = await this.prisma.marketingCampaign.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          status: data.status,
          targeting: data.targeting as any,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          budget: data.budget,
          content: data.content as any,
          tags: data.tags,
        },
      });

      this.logger.log(`Campaign updated: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update campaign: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a campaign
   */
  async deleteCampaign(id: string) {
    const campaign = await this.getCampaignById(id);

    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('Cannot delete a running campaign');
    }

    await this.prisma.marketingCampaign.delete({
      where: { id },
    });

    this.logger.log(`Campaign deleted: ${id}`);
    return { success: true };
  }

  /**
   * Start a campaign
   */
  async startCampaign(id: string) {
    const campaign = await this.getCampaignById(id);

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SCHEDULED) {
      throw new BadRequestException('Campaign cannot be started from current status');
    }

    const updated = await this.prisma.marketingCampaign.update({
      where: { id },
      data: {
        status: CampaignStatus.RUNNING,
        startDate: new Date(),
      },
    });

    this.logger.log(`Campaign started: ${id}`);
    return updated;
  }

  /**
   * Pause a campaign
   */
  async pauseCampaign(id: string) {
    const campaign = await this.getCampaignById(id);

    if (campaign.status !== CampaignStatus.RUNNING) {
      throw new BadRequestException('Only running campaigns can be paused');
    }

    const updated = await this.prisma.marketingCampaign.update({
      where: { id },
      data: {
        status: CampaignStatus.PAUSED,
      },
    });

    this.logger.log(`Campaign paused: ${id}`);
    return updated;
  }

  /**
   * Get campaign metrics and performance data
   */
  async getCampaignMetrics(params: CampaignMetricsDto) {
    const campaign = await this.getCampaignById(params.campaignId);

    // In a real implementation, this would aggregate data from various sources
    const metrics = {
      campaignId: campaign.id,
      campaignName: campaign.name,
      status: campaign.status,
      budget: campaign.budget,
      spend: (campaign.metrics as any)?.spend || 0,
      impressions: (campaign.metrics as any)?.impressions || 0,
      clicks: (campaign.metrics as any)?.clicks || 0,
      conversions: (campaign.metrics as any)?.conversions || 0,
      revenue: (campaign.metrics as any)?.revenue || 0,
      ctr: this.calculateCTR((campaign.metrics as any)?.impressions, (campaign.metrics as any)?.clicks),
      cpc: this.calculateCPC((campaign.metrics as any)?.spend, (campaign.metrics as any)?.clicks),
      cpa: this.calculateCPA((campaign.metrics as any)?.spend, (campaign.metrics as any)?.conversions),
      roi: this.calculateROI((campaign.metrics as any)?.revenue, (campaign.metrics as any)?.spend),
      startDate: campaign.startDate,
      endDate: campaign.endDate,
    };

    return metrics;
  }

  /**
   * Track campaign event (impression, click, conversion)
   */
  async trackCampaignEvent(campaignId: string, event: {
    type: 'impression' | 'click' | 'conversion';
    value?: number;
    metadata?: Record<string, any>;
  }) {
    const campaign = await this.getCampaignById(campaignId);

    const currentMetrics = (campaign.metrics as any) || {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
      revenue: 0,
    };

    // Update metrics based on event type
    switch (event.type) {
      case 'impression':
        currentMetrics.impressions += 1;
        break;
      case 'click':
        currentMetrics.clicks += 1;
        break;
      case 'conversion':
        currentMetrics.conversions += 1;
        if (event.value) {
          currentMetrics.revenue += event.value;
        }
        break;
    }

    await this.prisma.marketingCampaign.update({
      where: { id: campaignId },
      data: {
        metrics: currentMetrics,
      },
    });

    this.logger.log(`Campaign event tracked: ${campaignId} - ${event.type}`);
    return { success: true };
  }

  /**
   * Get campaigns by region
   */
  async getCampaignsByRegion(region: string) {
    const campaigns = await this.prisma.marketingCampaign.findMany({
      where: {
        status: CampaignStatus.RUNNING,
        OR: [
          {
            targeting: {
              path: ['regions'],
              array_contains: region,
            },
          },
          {
            targeting: {
              path: ['regions'],
              equals: Prisma.JsonNull,
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return campaigns;
  }

  // Helper methods for metrics calculation
  private calculateCTR(impressions: number = 0, clicks: number = 0): number {
    return impressions > 0 ? (clicks / impressions) * 100 : 0;
  }

  private calculateCPC(spend: number = 0, clicks: number = 0): number {
    return clicks > 0 ? spend / clicks : 0;
  }

  private calculateCPA(spend: number = 0, conversions: number = 0): number {
    return conversions > 0 ? spend / conversions : 0;
  }

  private calculateROI(revenue: number = 0, spend: number = 0): number {
    return spend > 0 ? ((revenue - spend) / spend) * 100 : 0;
  }

  private validateStatusTransition(currentStatus: CampaignStatus, newStatus: CampaignStatus) {
    const validTransitions: Record<CampaignStatus, CampaignStatus[]> = {
      [CampaignStatus.DRAFT]: [CampaignStatus.SCHEDULED, CampaignStatus.RUNNING, CampaignStatus.CANCELLED],
      [CampaignStatus.SCHEDULED]: [CampaignStatus.RUNNING, CampaignStatus.CANCELLED],
      [CampaignStatus.RUNNING]: [CampaignStatus.PAUSED, CampaignStatus.COMPLETED, CampaignStatus.CANCELLED],
      [CampaignStatus.PAUSED]: [CampaignStatus.RUNNING, CampaignStatus.COMPLETED, CampaignStatus.CANCELLED],
      [CampaignStatus.COMPLETED]: [],
      [CampaignStatus.CANCELLED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }
}
