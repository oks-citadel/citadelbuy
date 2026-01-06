export interface IGrowthService {
  // Campaign Management
  createCampaign(data: CreateCampaignInput): Promise<GrowthCampaign>;
  updateCampaign(id: string, data: UpdateCampaignInput): Promise<GrowthCampaign>;
  getCampaign(id: string): Promise<GrowthCampaign | null>;
  listCampaigns(query: CampaignQuery): Promise<PaginatedCampaigns>;
  getCampaignMetrics(id: string): Promise<CampaignMetrics>;

  // Landing Pages
  createLandingPage(data: CreateLandingPageInput): Promise<LandingPage>;
  updateLandingPage(id: string, data: UpdateLandingPageInput): Promise<LandingPage>;
  getLandingPage(id: string): Promise<LandingPage | null>;
  getLandingPageBySlug(slug: string): Promise<LandingPage | null>;
  recordPageView(id: string, variantId: string): Promise<void>;
  getLandingPageMetrics(id: string): Promise<LandingPageMetrics>;

  // Referral System
  createReferralProgram(data: CreateReferralProgramInput): Promise<ReferralProgram>;
  createReferral(data: CreateReferralInput): Promise<Referral>;
  getReferralByCode(code: string): Promise<Referral | null>;
  getReferralsByUser(userId: string): Promise<Referral[]>;
  processReferralConversion(referralId: string, orderId: string): Promise<void>;

  // Affiliate Tracking
  createAffiliateProgram(data: CreateAffiliateProgramInput): Promise<AffiliateProgram>;
  registerAffiliate(data: RegisterAffiliateInput): Promise<Affiliate>;
  trackAffiliateClick(data: TrackClickInput): Promise<AffiliateClick>;
  getAffiliateStats(affiliateId: string): Promise<AffiliateStats>;
  processAffiliateConversion(clickId: string, orderId: string, amount: number): Promise<void>;
}

// Campaign Types
export interface GrowthCampaign {
  id: string;
  name: string;
  description?: string;
  type: GrowthCampaignType;
  status: CampaignStatus;
  organizationId?: string;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  spent: number;
  targetSegments: string[];
  goals: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export type GrowthCampaignType = 'ACQUISITION' | 'ACTIVATION' | 'RETENTION' | 'REFERRAL' | 'REVENUE';
export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';

export interface CreateCampaignInput {
  name: string;
  description?: string;
  type: GrowthCampaignType;
  organizationId?: string;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  targetSegments?: string[];
  goals?: Record<string, number>;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string;
  status?: CampaignStatus;
  endDate?: Date;
  budget?: number;
  goals?: Record<string, number>;
}

export interface CampaignQuery {
  organizationId?: string;
  type?: GrowthCampaignType;
  status?: CampaignStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedCampaigns {
  items: GrowthCampaign[];
  total: number;
  page: number;
  limit: number;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  conversionRate: number;
  roi: number;
  costPerAcquisition: number;
}

// Landing Page Types
export interface LandingPage {
  id: string;
  name: string;
  slug: string;
  organizationId?: string;
  campaignId?: string;
  variants: LandingPageVariant[];
  isActive: boolean;
  abTestEnabled: boolean;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LandingPageVariant {
  id: string;
  name: string;
  trafficAllocation: number;
  content?: string;
  config?: Record<string, any>;
  views: number;
  conversions: number;
}

export interface CreateLandingPageInput {
  name: string;
  slug: string;
  organizationId?: string;
  campaignId?: string;
  variants: Omit<LandingPageVariant, 'id' | 'views' | 'conversions'>[];
  metaTitle?: string;
  metaDescription?: string;
  abTestEnabled?: boolean;
}

export interface UpdateLandingPageInput {
  name?: string;
  slug?: string;
  variants?: Omit<LandingPageVariant, 'views' | 'conversions'>[];
  isActive?: boolean;
}

export interface LandingPageMetrics {
  totalViews: number;
  totalConversions: number;
  conversionRate: number;
  variants: VariantMetrics[];
  winningVariant?: string;
  statisticalSignificance?: number;
}

export interface VariantMetrics {
  id: string;
  name: string;
  views: number;
  conversions: number;
  conversionRate: number;
  improvement?: number;
}

// Referral Types
export interface ReferralProgram {
  id: string;
  name: string;
  organizationId?: string;
  referrerRewardType: RewardType;
  referrerRewardValue: number;
  refereeRewardType: RewardType;
  refereeRewardValue: number;
  maxReferralsPerUser?: number;
  minPurchaseAmount?: number;
  rewardExpiryDays?: number;
  isActive: boolean;
  createdAt: Date;
}

export type RewardType = 'discount' | 'credit' | 'points' | 'cash';

export interface Referral {
  id: string;
  programId: string;
  referrerId: string;
  refereeEmail: string;
  refereeId?: string;
  code: string;
  channel?: string;
  status: ReferralStatus;
  referrerRewardIssued: boolean;
  refereeRewardIssued: boolean;
  createdAt: Date;
  convertedAt?: Date;
}

export type ReferralStatus = 'pending' | 'clicked' | 'signed_up' | 'converted' | 'rewarded' | 'expired';

export interface CreateReferralProgramInput {
  name: string;
  organizationId?: string;
  referrerRewardType: RewardType;
  referrerRewardValue: number;
  refereeRewardType: RewardType;
  refereeRewardValue: number;
  maxReferralsPerUser?: number;
  minPurchaseAmount?: number;
  rewardExpiryDays?: number;
}

export interface CreateReferralInput {
  referrerId: string;
  refereeEmail: string;
  programId?: string;
  channel?: string;
}

// Affiliate Types
export interface AffiliateProgram {
  id: string;
  name: string;
  organizationId?: string;
  commissionType: CommissionType;
  commissionValue: number;
  cookieDuration: number;
  minPayoutThreshold: number;
  terms?: string;
  isActive: boolean;
  createdAt: Date;
}

export type CommissionType = 'percentage' | 'fixed';

export interface CreateAffiliateProgramInput {
  name: string;
  organizationId?: string;
  commissionType: CommissionType;
  commissionValue: number;
  cookieDuration?: number;
  minPayoutThreshold?: number;
  terms?: string;
}

export interface Affiliate {
  id: string;
  userId: string;
  programId: string;
  code: string;
  websiteUrl?: string;
  socialMedia?: Record<string, string>;
  promotionMethods?: string[];
  status: AffiliateStatus;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  totalCommission: number;
  pendingPayout: number;
  createdAt: Date;
}

export type AffiliateStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface RegisterAffiliateInput {
  userId: string;
  programId: string;
  websiteUrl?: string;
  socialMedia?: Record<string, string>;
  promotionMethods?: string[];
}

export interface AffiliateClick {
  id: string;
  affiliateId: string;
  campaignId?: string;
  sourceUrl?: string;
  landingPage?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  converted: boolean;
  createdAt: Date;
}

export interface TrackClickInput {
  affiliateId: string;
  campaignId?: string;
  sourceUrl?: string;
  landingPage?: string;
  metadata?: Record<string, any>;
}

export interface AffiliateStats {
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  totalRevenue: number;
  totalCommission: number;
  pendingPayout: number;
  paidOut: number;
  clicksByDay: Array<{ date: string; clicks: number }>;
  conversionsByDay: Array<{ date: string; conversions: number; revenue: number }>;
}
