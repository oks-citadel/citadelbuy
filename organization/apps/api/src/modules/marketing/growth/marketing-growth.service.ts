import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  IGrowthService,
  GrowthCampaign,
  CreateCampaignInput,
  UpdateCampaignInput,
  CampaignQuery,
  PaginatedCampaigns,
  CampaignMetrics,
  LandingPage,
  CreateLandingPageInput,
  UpdateLandingPageInput,
  LandingPageMetrics,
  ReferralProgram,
  CreateReferralProgramInput,
  Referral,
  CreateReferralInput,
  AffiliateProgram,
  CreateAffiliateProgramInput,
  Affiliate,
  RegisterAffiliateInput,
  AffiliateClick,
  TrackClickInput,
  AffiliateStats,
} from './interfaces/growth.interface';

@Injectable()
export class MarketingGrowthService implements IGrowthService {
  private readonly logger = new Logger(MarketingGrowthService.name);

  // In-memory storage for demo
  private campaigns: Map<string, GrowthCampaign> = new Map();
  private landingPages: Map<string, LandingPage> = new Map();
  private referralPrograms: Map<string, ReferralProgram> = new Map();
  private referrals: Map<string, Referral> = new Map();
  private affiliatePrograms: Map<string, AffiliateProgram> = new Map();
  private affiliates: Map<string, Affiliate> = new Map();
  private affiliateClicks: Map<string, AffiliateClick> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  // Campaign Management
  async createCampaign(data: CreateCampaignInput): Promise<GrowthCampaign> {
    this.logger.log(`Creating growth campaign: ${data.name}`);

    const id = `campaign-${Date.now()}`;
    const now = new Date();

    const campaign: GrowthCampaign = {
      id,
      name: data.name,
      description: data.description,
      type: data.type,
      status: 'DRAFT',
      organizationId: data.organizationId,
      startDate: data.startDate,
      endDate: data.endDate,
      budget: data.budget,
      spent: 0,
      targetSegments: data.targetSegments || [],
      goals: data.goals || {},
      createdAt: now,
      updatedAt: now,
    };

    this.campaigns.set(id, campaign);
    return campaign;
  }

  async updateCampaign(id: string, data: UpdateCampaignInput): Promise<GrowthCampaign> {
    const campaign = this.campaigns.get(id);
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    const updated: GrowthCampaign = {
      ...campaign,
      ...data,
      updatedAt: new Date(),
    };

    this.campaigns.set(id, updated);
    return updated;
  }

  async getCampaign(id: string): Promise<GrowthCampaign | null> {
    return this.campaigns.get(id) || null;
  }

  async listCampaigns(query: CampaignQuery): Promise<PaginatedCampaigns> {
    let items = Array.from(this.campaigns.values());

    if (query.organizationId) {
      items = items.filter((c) => c.organizationId === query.organizationId);
    }
    if (query.type) {
      items = items.filter((c) => c.type === query.type);
    }
    if (query.status) {
      items = items.filter((c) => c.status === query.status);
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const total = items.length;

    items = items.slice((page - 1) * limit, page * limit);

    return { items, total, page, limit };
  }

  async getCampaignMetrics(id: string): Promise<CampaignMetrics> {
    const campaign = this.campaigns.get(id);
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    return {
      impressions: Math.floor(Math.random() * 100000),
      clicks: Math.floor(Math.random() * 5000),
      conversions: Math.floor(Math.random() * 500),
      revenue: Math.floor(Math.random() * 50000),
      ctr: Math.random() * 5,
      conversionRate: Math.random() * 10,
      roi: Math.random() * 300,
      costPerAcquisition: Math.random() * 50,
    };
  }

  // Landing Pages
  async createLandingPage(data: CreateLandingPageInput): Promise<LandingPage> {
    this.logger.log(`Creating landing page: ${data.name}`);

    const id = `landing-${Date.now()}`;
    const now = new Date();

    const page: LandingPage = {
      id,
      name: data.name,
      slug: data.slug,
      organizationId: data.organizationId,
      campaignId: data.campaignId,
      variants: data.variants.map((v, i) => ({
        id: `variant-${Date.now()}-${i}`,
        name: v.name,
        trafficAllocation: v.trafficAllocation,
        content: v.content,
        config: v.config,
        views: 0,
        conversions: 0,
      })),
      isActive: true,
      abTestEnabled: data.abTestEnabled || false,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      createdAt: now,
      updatedAt: now,
    };

    this.landingPages.set(id, page);
    return page;
  }

  async updateLandingPage(id: string, data: UpdateLandingPageInput): Promise<LandingPage> {
    const page = this.landingPages.get(id);
    if (!page) {
      throw new NotFoundException(`Landing page ${id} not found`);
    }

    const updated: LandingPage = {
      ...page,
      ...data,
      updatedAt: new Date(),
    };

    this.landingPages.set(id, updated);
    return updated;
  }

  async getLandingPage(id: string): Promise<LandingPage | null> {
    return this.landingPages.get(id) || null;
  }

  async getLandingPageBySlug(slug: string): Promise<LandingPage | null> {
    return Array.from(this.landingPages.values()).find((p) => p.slug === slug) || null;
  }

  async recordPageView(id: string, variantId: string): Promise<void> {
    const page = this.landingPages.get(id);
    if (page) {
      const variant = page.variants.find((v) => v.id === variantId);
      if (variant) {
        variant.views++;
        this.landingPages.set(id, page);
      }
    }
  }

  async getLandingPageMetrics(id: string): Promise<LandingPageMetrics> {
    const page = this.landingPages.get(id);
    if (!page) {
      throw new NotFoundException(`Landing page ${id} not found`);
    }

    const totalViews = page.variants.reduce((sum, v) => sum + v.views, 0);
    const totalConversions = page.variants.reduce((sum, v) => sum + v.conversions, 0);

    return {
      totalViews,
      totalConversions,
      conversionRate: totalViews > 0 ? (totalConversions / totalViews) * 100 : 0,
      variants: page.variants.map((v) => ({
        id: v.id,
        name: v.name,
        views: v.views,
        conversions: v.conversions,
        conversionRate: v.views > 0 ? (v.conversions / v.views) * 100 : 0,
      })),
      winningVariant: page.variants.length > 1 ? page.variants[0].id : undefined,
      statisticalSignificance: 95,
    };
  }

  // Referral System
  async createReferralProgram(data: CreateReferralProgramInput): Promise<ReferralProgram> {
    this.logger.log(`Creating referral program: ${data.name}`);

    const id = `refprog-${Date.now()}`;

    const program: ReferralProgram = {
      id,
      name: data.name,
      organizationId: data.organizationId,
      referrerRewardType: data.referrerRewardType,
      referrerRewardValue: data.referrerRewardValue,
      refereeRewardType: data.refereeRewardType,
      refereeRewardValue: data.refereeRewardValue,
      maxReferralsPerUser: data.maxReferralsPerUser,
      minPurchaseAmount: data.minPurchaseAmount,
      rewardExpiryDays: data.rewardExpiryDays,
      isActive: true,
      createdAt: new Date(),
    };

    this.referralPrograms.set(id, program);
    return program;
  }

  async createReferral(data: CreateReferralInput): Promise<Referral> {
    this.logger.log(`Creating referral from ${data.referrerId} to ${data.refereeEmail}`);

    const id = `ref-${Date.now()}`;
    const code = this.generateReferralCode();

    const referral: Referral = {
      id,
      programId: data.programId || 'default',
      referrerId: data.referrerId,
      refereeEmail: data.refereeEmail,
      code,
      channel: data.channel,
      status: 'pending',
      referrerRewardIssued: false,
      refereeRewardIssued: false,
      createdAt: new Date(),
    };

    this.referrals.set(id, referral);
    return referral;
  }

  private generateReferralCode(): string {
    return `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  async getReferralByCode(code: string): Promise<Referral | null> {
    return Array.from(this.referrals.values()).find((r) => r.code === code) || null;
  }

  async getReferralsByUser(userId: string): Promise<Referral[]> {
    return Array.from(this.referrals.values()).filter((r) => r.referrerId === userId);
  }

  async processReferralConversion(referralId: string, orderId: string): Promise<void> {
    this.logger.log(`Processing referral conversion: ${referralId} for order ${orderId}`);

    const referral = this.referrals.get(referralId);
    if (referral) {
      referral.status = 'converted';
      referral.convertedAt = new Date();
      this.referrals.set(referralId, referral);
    }
  }

  // Affiliate Tracking
  async createAffiliateProgram(data: CreateAffiliateProgramInput): Promise<AffiliateProgram> {
    this.logger.log(`Creating affiliate program: ${data.name}`);

    const id = `affprog-${Date.now()}`;

    const program: AffiliateProgram = {
      id,
      name: data.name,
      organizationId: data.organizationId,
      commissionType: data.commissionType,
      commissionValue: data.commissionValue,
      cookieDuration: data.cookieDuration || 30,
      minPayoutThreshold: data.minPayoutThreshold || 50,
      terms: data.terms,
      isActive: true,
      createdAt: new Date(),
    };

    this.affiliatePrograms.set(id, program);
    return program;
  }

  async registerAffiliate(data: RegisterAffiliateInput): Promise<Affiliate> {
    this.logger.log(`Registering affiliate: ${data.userId}`);

    const id = `aff-${Date.now()}`;
    const code = `AFF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const affiliate: Affiliate = {
      id,
      userId: data.userId,
      programId: data.programId,
      code,
      websiteUrl: data.websiteUrl,
      socialMedia: data.socialMedia,
      promotionMethods: data.promotionMethods,
      status: 'pending',
      totalClicks: 0,
      totalConversions: 0,
      totalRevenue: 0,
      totalCommission: 0,
      pendingPayout: 0,
      createdAt: new Date(),
    };

    this.affiliates.set(id, affiliate);
    return affiliate;
  }

  async trackAffiliateClick(data: TrackClickInput): Promise<AffiliateClick> {
    this.logger.log(`Tracking affiliate click: ${data.affiliateId}`);

    const id = `click-${Date.now()}`;

    const click: AffiliateClick = {
      id,
      affiliateId: data.affiliateId,
      campaignId: data.campaignId,
      sourceUrl: data.sourceUrl,
      landingPage: data.landingPage,
      metadata: data.metadata,
      converted: false,
      createdAt: new Date(),
    };

    this.affiliateClicks.set(id, click);

    // Update affiliate stats
    const affiliate = this.affiliates.get(data.affiliateId);
    if (affiliate) {
      affiliate.totalClicks++;
      this.affiliates.set(data.affiliateId, affiliate);
    }

    return click;
  }

  async getAffiliateStats(affiliateId: string): Promise<AffiliateStats> {
    const affiliate = this.affiliates.get(affiliateId);
    if (!affiliate) {
      throw new NotFoundException(`Affiliate ${affiliateId} not found`);
    }

    return {
      totalClicks: affiliate.totalClicks,
      totalConversions: affiliate.totalConversions,
      conversionRate: affiliate.totalClicks > 0
        ? (affiliate.totalConversions / affiliate.totalClicks) * 100
        : 0,
      totalRevenue: affiliate.totalRevenue,
      totalCommission: affiliate.totalCommission,
      pendingPayout: affiliate.pendingPayout,
      paidOut: affiliate.totalCommission - affiliate.pendingPayout,
      clicksByDay: [
        { date: '2024-01-01', clicks: 45 },
        { date: '2024-01-02', clicks: 52 },
        { date: '2024-01-03', clicks: 38 },
      ],
      conversionsByDay: [
        { date: '2024-01-01', conversions: 5, revenue: 450 },
        { date: '2024-01-02', conversions: 7, revenue: 630 },
        { date: '2024-01-03', conversions: 4, revenue: 380 },
      ],
    };
  }

  async processAffiliateConversion(clickId: string, orderId: string, amount: number): Promise<void> {
    this.logger.log(`Processing affiliate conversion: click ${clickId}, order ${orderId}`);

    const click = this.affiliateClicks.get(clickId);
    if (click) {
      click.converted = true;
      this.affiliateClicks.set(clickId, click);

      const affiliate = this.affiliates.get(click.affiliateId);
      if (affiliate) {
        const program = this.affiliatePrograms.get(affiliate.programId);
        if (program) {
          const commission = program.commissionType === 'percentage'
            ? amount * (program.commissionValue / 100)
            : program.commissionValue;

          affiliate.totalConversions++;
          affiliate.totalRevenue += amount;
          affiliate.totalCommission += commission;
          affiliate.pendingPayout += commission;
          this.affiliates.set(click.affiliateId, affiliate);
        }
      }
    }
  }
}
