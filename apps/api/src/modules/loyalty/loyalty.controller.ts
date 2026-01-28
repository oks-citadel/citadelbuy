import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole, LoyaltyTier } from '@prisma/client';
import { AuthRequest } from '../../common/types/auth-request.types';
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

@ApiTags('loyalty')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  // ============================================
  // CUSTOMER LOYALTY ACCOUNT
  // ============================================

  @Get('my-account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my loyalty account' })
  @ApiResponse({ status: 200, description: 'Loyalty account with points, tier, and recent activity' })
  async getMyLoyaltyAccount(@Request() req: AuthRequest) {
    return this.loyaltyService.getCustomerLoyalty(req.user.userId);
  }

  @Post('my-account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create loyalty account (auto-created on first request)' })
  @ApiResponse({ status: 201, description: 'Loyalty account created' })
  async createMyLoyaltyAccount(@Request() req: AuthRequest) {
    return this.loyaltyService.createLoyaltyAccount(req.user.userId);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get tier leaderboard' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Top loyalty members by tier and spending' })
  async getLeaderboard(@Query('limit') limit?: string) {
    return this.loyaltyService.getTierLeaderboard(limit ? parseInt(limit) : 100);
  }

  // ============================================
  // POINTS MANAGEMENT
  // ============================================

  @Post('points/earn/purchase')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Earn points from a delivered order' })
  @ApiResponse({ status: 200, description: 'Points earned successfully' })
  @ApiResponse({ status: 400, description: 'Points already earned or order not delivered' })
  async earnPointsFromPurchase(@Request() req: AuthRequest, @Body() dto: EarnPointsDto) {
    return this.loyaltyService.earnPointsFromPurchase(dto, req.user.userId);
  }

  @Post('points/earn/review/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Earn points for writing a product review' })
  @ApiResponse({ status: 200, description: 'Review points earned' })
  @ApiResponse({ status: 400, description: 'Points already earned for this review' })
  async earnPointsFromReview(@Request() req: AuthRequest, @Param('productId') productId: string) {
    return this.loyaltyService.earnPointsFromReview(req.user.userId, productId);
  }

  @Post('points/birthday')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Award birthday points (once per year)' })
  @ApiResponse({ status: 200, description: 'Birthday points awarded' })
  @ApiResponse({ status: 400, description: 'Birthday points already awarded this year' })
  async awardBirthdayPoints(@Request() req: AuthRequest) {
    return this.loyaltyService.awardBirthdayPoints(req.user.userId);
  }

  @Get('points/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get point transaction history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Point transaction history' })
  async getPointHistory(@Request() req: AuthRequest, @Query('limit') limit?: string) {
    return this.loyaltyService.getPointHistory(
      req.user.userId,
      limit ? parseInt(limit) : 50
    );
  }

  @Post('points/adjust/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually adjust user points (admin only)' })
  @ApiResponse({ status: 200, description: 'Points adjusted successfully' })
  async adjustPoints(@Param('userId') userId: string, @Body() dto: AdjustPointsDto) {
    return this.loyaltyService.adjustPoints(userId, dto);
  }

  @Post('points/expire')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run point expiration job (admin only)' })
  @ApiResponse({ status: 200, description: 'Expired points processed' })
  async expirePoints() {
    return this.loyaltyService.expirePoints();
  }

  // ============================================
  // TIER BENEFITS
  // ============================================

  @Get('tiers')
  @ApiOperation({ summary: 'Get all tier benefits' })
  @ApiResponse({ status: 200, description: 'List of all loyalty tiers and their benefits' })
  async getAllTierBenefits() {
    return this.loyaltyService.getAllTierBenefits();
  }

  @Get('tiers/:tier')
  @ApiOperation({ summary: 'Get specific tier benefits' })
  @ApiResponse({ status: 200, description: 'Tier benefit details' })
  async getTierBenefit(@Param('tier') tier: LoyaltyTier) {
    return this.loyaltyService.getTierBenefitByTier(tier);
  }

  @Post('tiers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create tier benefit (admin only)' })
  @ApiResponse({ status: 201, description: 'Tier benefit created' })
  async createTierBenefit(@Body() dto: CreateTierBenefitDto) {
    return this.loyaltyService.createTierBenefit(dto);
  }

  @Put('tiers/:tier')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tier benefit (admin only)' })
  @ApiResponse({ status: 200, description: 'Tier benefit updated' })
  async updateTierBenefit(
    @Param('tier') tier: LoyaltyTier,
    @Body() dto: UpdateTierBenefitDto
  ) {
    return this.loyaltyService.updateTierBenefit(tier, dto);
  }

  @Post('tiers/initialize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize default tier benefits (admin only)' })
  @ApiResponse({ status: 201, description: 'Tier benefits initialized' })
  async initializeTierBenefits() {
    return this.loyaltyService.initializeTierBenefits();
  }

  // ============================================
  // REFERRAL PROGRAM
  // ============================================

  @Post('referrals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a referral invitation' })
  @ApiResponse({ status: 201, description: 'Referral created with unique link' })
  async createReferral(@Request() req: AuthRequest, @Body() dto: CreateReferralDto) {
    return this.loyaltyService.createReferral(req.user.userId, dto);
  }

  @Get('referrals/my-referrals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my referrals' })
  @ApiResponse({ status: 200, description: 'List of referrals with status' })
  async getMyReferrals(@Request() req: AuthRequest) {
    return this.loyaltyService.getUserReferrals(req.user.userId);
  }

  @Post('referrals/apply/:referralCode')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply referral code when signing up' })
  @ApiResponse({ status: 200, description: 'Referral code applied successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or already used referral code' })
  async applyReferralCode(@Request() req: AuthRequest, @Param('referralCode') referralCode: string) {
    return this.loyaltyService.applyReferralCode(req.user.userId, referralCode);
  }

  // ============================================
  // REWARDS CATALOG
  // ============================================

  @Get('rewards')
  @ApiOperation({ summary: 'Get all active rewards' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of available rewards' })
  async getAllRewards(@Query('includeInactive') includeInactive?: string) {
    return this.loyaltyService.getAllRewards(includeInactive === 'true');
  }

  @Get('rewards/available')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get rewards available for my tier and points' })
  @ApiResponse({ status: 200, description: 'Rewards user can access and afford' })
  async getAvailableRewards(@Request() req: AuthRequest) {
    return this.loyaltyService.getAvailableRewards(req.user.userId);
  }

  @Post('rewards')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new reward (admin only)' })
  @ApiResponse({ status: 201, description: 'Reward created' })
  async createReward(@Body() dto: CreateRewardDto) {
    return this.loyaltyService.createReward(dto);
  }

  @Put('rewards/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update reward (admin only)' })
  @ApiResponse({ status: 200, description: 'Reward updated' })
  async updateReward(@Param('id') id: string, @Body() dto: UpdateRewardDto) {
    return this.loyaltyService.updateReward(id, dto);
  }

  @Delete('rewards/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete reward (admin only)' })
  @ApiResponse({ status: 200, description: 'Reward deleted' })
  async deleteReward(@Param('id') id: string) {
    return this.loyaltyService.deleteReward(id);
  }

  // ============================================
  // REWARD REDEMPTIONS
  // ============================================

  @Post('redemptions/redeem')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Redeem points for a reward' })
  @ApiResponse({ status: 201, description: 'Reward redeemed successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient points or reward unavailable' })
  async redeemReward(@Request() req: AuthRequest, @Body() dto: RedeemRewardDto) {
    return this.loyaltyService.redeemReward(req.user.userId, dto);
  }

  @Get('redemptions/my-redemptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my reward redemptions' })
  @ApiResponse({ status: 200, description: 'List of redeemed rewards' })
  async getMyRedemptions(@Request() req: AuthRequest) {
    return this.loyaltyService.getUserRedemptions(req.user.userId);
  }

  @Post('redemptions/apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply redemption to order during checkout' })
  @ApiResponse({ status: 200, description: 'Redemption applied to order' })
  @ApiResponse({ status: 400, description: 'Redemption invalid or expired' })
  async applyRedemptionToOrder(@Request() req: AuthRequest, @Body() dto: ApplyRewardDto) {
    return this.loyaltyService.applyRedemptionToOrder(req.user.userId, dto);
  }

  // ============================================
  // LOYALTY PROGRAM CONFIGURATION
  // ============================================

  @Get('program')
  @ApiOperation({ summary: 'Get active loyalty program configuration' })
  @ApiResponse({ status: 200, description: 'Loyalty program settings' })
  async getLoyaltyProgram() {
    return this.loyaltyService.getActiveLoyaltyProgram();
  }

  @Put('program/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update loyalty program configuration (admin only)' })
  @ApiResponse({ status: 200, description: 'Program updated' })
  async updateLoyaltyProgram(
    @Param('id') id: string,
    @Body() dto: UpdateLoyaltyProgramDto
  ) {
    return this.loyaltyService.updateLoyaltyProgram(id, dto);
  }

  @Post('program/initialize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize default loyalty program (admin only)' })
  @ApiResponse({ status: 201, description: 'Loyalty program initialized' })
  async initializeLoyaltyProgram() {
    return this.loyaltyService.initializeLoyaltyProgram();
  }

  // ============================================
  // STATISTICS & ANALYTICS
  // ============================================

  @Get('statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get loyalty program statistics (admin only)' })
  @ApiResponse({ status: 200, description: 'Program-wide loyalty statistics' })
  async getLoyaltyStatistics() {
    return this.loyaltyService.getLoyaltyStatistics();
  }
}
