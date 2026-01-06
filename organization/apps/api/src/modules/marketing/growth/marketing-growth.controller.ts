import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { MarketingGrowthService } from './marketing-growth.service';
import {
  CreateGrowthCampaignDto,
  UpdateGrowthCampaignDto,
  GrowthCampaignQueryDto,
  CreateLandingPageDto,
  UpdateLandingPageDto,
  CreateReferralProgramDto,
  CreateReferralDto,
  CreateAffiliateProgramDto,
  RegisterAffiliateDto,
  TrackAffiliateClickDto,
} from './dto/growth.dto';

@ApiTags('Marketing - Growth')
@Controller('marketing/growth')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MarketingGrowthController {
  constructor(private readonly growthService: MarketingGrowthService) {}

  // Campaign Endpoints
  @Post('campaigns')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Create growth campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async createCampaign(@Body() dto: CreateGrowthCampaignDto) {
    return this.growthService.createCampaign({
      name: dto.name,
      description: dto.description,
      type: dto.type,
      organizationId: dto.organizationId,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      budget: dto.budget,
      targetSegments: dto.targetSegments,
      goals: dto.goals,
    });
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'List growth campaigns' })
  @ApiResponse({ status: 200, description: 'Campaigns retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async listCampaigns(@Query() query: GrowthCampaignQueryDto) {
    return this.growthService.listCampaigns({
      organizationId: query.organizationId,
      type: query.type,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getCampaign(@Param('id') id: string) {
    return this.growthService.getCampaign(id);
  }

  @Put('campaigns/:id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Update campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign updated' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async updateCampaign(@Param('id') id: string, @Body() dto: UpdateGrowthCampaignDto) {
    return this.growthService.updateCampaign(id, {
      name: dto.name,
      description: dto.description,
      status: dto.status,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      budget: dto.budget,
      goals: dto.goals,
    });
  }

  @Get('campaigns/:id/metrics')
  @ApiOperation({ summary: 'Get campaign metrics' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getCampaignMetrics(@Param('id') id: string) {
    return this.growthService.getCampaignMetrics(id);
  }

  // Landing Page Endpoints
  @Post('landing-pages')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Create landing page with A/B variants' })
  @ApiResponse({ status: 201, description: 'Landing page created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createLandingPage(@Body() dto: CreateLandingPageDto) {
    return this.growthService.createLandingPage({
      name: dto.name,
      slug: dto.slug,
      organizationId: dto.organizationId,
      campaignId: dto.campaignId,
      variants: dto.variants,
      metaTitle: dto.metaTitle,
      metaDescription: dto.metaDescription,
      abTestEnabled: dto.abTestEnabled,
    });
  }

  @Get('landing-pages/:id')
  @ApiOperation({ summary: 'Get landing page by ID' })
  @ApiParam({ name: 'id', description: 'Landing page ID' })
  @ApiResponse({ status: 200, description: 'Landing page retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getLandingPage(@Param('id') id: string) {
    return this.growthService.getLandingPage(id);
  }

  @Get('landing-pages/slug/:slug')
  @ApiOperation({ summary: 'Get landing page by slug' })
  @ApiParam({ name: 'slug', description: 'Landing page slug' })
  @ApiResponse({ status: 200, description: 'Landing page retrieved' })
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  async getLandingPageBySlug(@Param('slug') slug: string) {
    return this.growthService.getLandingPageBySlug(slug);
  }

  @Put('landing-pages/:id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Update landing page' })
  @ApiParam({ name: 'id', description: 'Landing page ID' })
  @ApiResponse({ status: 200, description: 'Landing page updated' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async updateLandingPage(@Param('id') id: string, @Body() dto: UpdateLandingPageDto) {
    return this.growthService.updateLandingPage(id, dto);
  }

  @Post('landing-pages/:id/view/:variantId')
  @ApiOperation({ summary: 'Record page view for A/B testing' })
  @ApiParam({ name: 'id', description: 'Landing page ID' })
  @ApiParam({ name: 'variantId', description: 'Variant ID' })
  @ApiResponse({ status: 200, description: 'View recorded' })
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  async recordPageView(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
  ) {
    await this.growthService.recordPageView(id, variantId);
    return { success: true };
  }

  @Get('landing-pages/:id/metrics')
  @ApiOperation({ summary: 'Get landing page A/B test metrics' })
  @ApiParam({ name: 'id', description: 'Landing page ID' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getLandingPageMetrics(@Param('id') id: string) {
    return this.growthService.getLandingPageMetrics(id);
  }

  // Referral Endpoints
  @Post('referrals/programs')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Create referral program' })
  @ApiResponse({ status: 201, description: 'Program created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async createReferralProgram(@Body() dto: CreateReferralProgramDto) {
    return this.growthService.createReferralProgram({
      name: dto.name,
      organizationId: dto.organizationId,
      referrerRewardType: dto.referrerRewardType as any,
      referrerRewardValue: dto.referrerRewardValue,
      refereeRewardType: dto.refereeRewardType as any,
      refereeRewardValue: dto.refereeRewardValue,
      maxReferralsPerUser: dto.maxReferralsPerUser,
      minPurchaseAmount: dto.minPurchaseAmount,
      rewardExpiryDays: dto.rewardExpiryDays,
    });
  }

  @Post('referrals')
  @ApiOperation({ summary: 'Create referral' })
  @ApiResponse({ status: 201, description: 'Referral created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async createReferral(@Body() dto: CreateReferralDto) {
    return this.growthService.createReferral({
      referrerId: dto.referrerId,
      refereeEmail: dto.refereeEmail,
      programId: dto.programId,
      channel: dto.channel,
    });
  }

  @Get('referrals/code/:code')
  @ApiOperation({ summary: 'Get referral by code' })
  @ApiParam({ name: 'code', description: 'Referral code' })
  @ApiResponse({ status: 200, description: 'Referral retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getReferralByCode(@Param('code') code: string) {
    return this.growthService.getReferralByCode(code);
  }

  @Get('referrals/user/:userId')
  @ApiOperation({ summary: 'Get referrals by user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Referrals retrieved' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getReferralsByUser(@Param('userId') userId: string) {
    return this.growthService.getReferralsByUser(userId);
  }

  @Post('referrals/:id/convert')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Process referral conversion' })
  @ApiParam({ name: 'id', description: 'Referral ID' })
  @ApiResponse({ status: 200, description: 'Conversion processed' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async processReferralConversion(
    @Param('id') id: string,
    @Body() body: { orderId: string },
  ) {
    await this.growthService.processReferralConversion(id, body.orderId);
    return { success: true };
  }

  // Affiliate Endpoints
  @Post('affiliates/programs')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Create affiliate program' })
  @ApiResponse({ status: 201, description: 'Program created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async createAffiliateProgram(@Body() dto: CreateAffiliateProgramDto) {
    return this.growthService.createAffiliateProgram({
      name: dto.name,
      organizationId: dto.organizationId,
      commissionType: dto.commissionType as any,
      commissionValue: dto.commissionValue,
      cookieDuration: dto.cookieDuration,
      minPayoutThreshold: dto.minPayoutThreshold,
      terms: dto.terms,
    });
  }

  @Post('affiliates/register')
  @ApiOperation({ summary: 'Register as affiliate' })
  @ApiResponse({ status: 201, description: 'Affiliate registered' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async registerAffiliate(@Body() dto: RegisterAffiliateDto) {
    return this.growthService.registerAffiliate({
      userId: dto.userId,
      programId: dto.programId,
      websiteUrl: dto.websiteUrl,
      socialMedia: dto.socialMedia,
      promotionMethods: dto.promotionMethods,
    });
  }

  @Post('affiliates/track')
  @ApiOperation({ summary: 'Track affiliate click' })
  @ApiResponse({ status: 201, description: 'Click tracked' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  async trackAffiliateClick(@Body() dto: TrackAffiliateClickDto) {
    return this.growthService.trackAffiliateClick({
      affiliateId: dto.affiliateId,
      campaignId: dto.campaignId,
      sourceUrl: dto.sourceUrl,
      landingPage: dto.landingPage,
      metadata: dto.metadata,
    });
  }

  @Get('affiliates/:id/stats')
  @ApiOperation({ summary: 'Get affiliate statistics' })
  @ApiParam({ name: 'id', description: 'Affiliate ID' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getAffiliateStats(@Param('id') id: string) {
    return this.growthService.getAffiliateStats(id);
  }

  @Post('affiliates/convert')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Process affiliate conversion' })
  @ApiResponse({ status: 200, description: 'Conversion processed' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async processAffiliateConversion(
    @Body() body: { clickId: string; orderId: string; amount: number },
  ) {
    await this.growthService.processAffiliateConversion(body.clickId, body.orderId, body.amount);
    return { success: true };
  }
}
