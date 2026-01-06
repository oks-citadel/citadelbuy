export * from './marketing-growth.module';
export * from './marketing-growth.controller';
export * from './marketing-growth.service';
export * from './dto';
// Note: interfaces are exported separately to avoid duplicate export conflicts with dto enums
export type {
  IGrowthService,
  GrowthCampaign,
  CreateCampaignInput,
  UpdateCampaignInput,
  CampaignQuery,
  PaginatedCampaigns,
  CampaignMetrics,
  LandingPage,
  LandingPageVariant,
  CreateLandingPageInput,
  UpdateLandingPageInput,
  LandingPageMetrics,
  VariantMetrics,
  ReferralProgram,
  RewardType,
  Referral,
  ReferralStatus,
  CreateReferralProgramInput,
  CreateReferralInput,
  AffiliateProgram,
  CommissionType,
  Affiliate,
  AffiliateStatus,
  RegisterAffiliateInput,
  AffiliateClick,
  TrackClickInput,
  AffiliateStats,
  CreateAffiliateProgramInput,
} from './interfaces/growth.interface';
