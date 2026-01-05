import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { IdempotencyInterceptor } from '@/common/interceptors/idempotency.interceptor';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionTierService } from './services/subscription-tier.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthRequest } from '../../common/types/auth-request.types';
import { VENDOR_SUBSCRIPTION_TIERS, FeatureKey } from './constants';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly subscriptionTierService: SubscriptionTierService,
  ) {}

  // ============================================
  // SUBSCRIPTION PLANS (Admin & Public)
  // ============================================

  @Post('plans')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create subscription plan (Admin only)' })
  @ApiResponse({ status: 201, description: 'Plan created successfully' })
  createPlan(@Body() dto: CreateSubscriptionPlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get all subscription plans (Public)' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  findAllPlans(@Query('includeInactive') includeInactive?: string) {
    return this.subscriptionsService.findAllPlans(includeInactive === 'true');
  }

  @Get('plans/type/:type')
  @ApiOperation({ summary: 'Get plans by type (customer or vendor)' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  findPlansByType(@Param('type') type: 'customer' | 'vendor') {
    if (type !== 'customer' && type !== 'vendor') {
      throw new BadRequestException('Type must be "customer" or "vendor"');
    }
    return this.subscriptionsService.findPlansByType(type);
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get subscription plan by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Plan retrieved successfully' })
  findOnePlan(@Param('id') id: string) {
    return this.subscriptionsService.findOnePlan(id);
  }

  @Patch('plans/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update subscription plan (Admin only)' })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  updatePlan(@Param('id') id: string, @Body() dto: UpdateSubscriptionPlanDto) {
    return this.subscriptionsService.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete subscription plan (Admin only)' })
  @ApiResponse({ status: 200, description: 'Plan deleted successfully' })
  deletePlan(@Param('id') id: string) {
    return this.subscriptionsService.deletePlan(id);
  }

  // ============================================
  // USER SUBSCRIPTIONS
  // ============================================

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to a plan' })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Unique key for idempotent request (prevents duplicate subscriptions)',
    required: false,
  })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  @ApiResponse({ status: 409, description: 'Request with this idempotency key is being processed' })
  subscribe(@Request() req: AuthRequest, @Body() dto: SubscribeDto) {
    return this.subscriptionsService.subscribe(req.user.id, dto);
  }

  @Get('my-subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user subscription' })
  @ApiResponse({ status: 200, description: 'Subscription retrieved successfully' })
  getUserSubscription(@Request() req: AuthRequest) {
    return this.subscriptionsService.getUserSubscription(req.user.id);
  }

  @Get('my-subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all user subscriptions' })
  @ApiResponse({ status: 200, description: 'Subscriptions retrieved successfully' })
  getUserSubscriptions(@Request() req: AuthRequest) {
    return this.subscriptionsService.getUserSubscriptions(req.user.id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled successfully' })
  cancelSubscription(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.subscriptionsService.cancelSubscription(req.user.id, id);
  }

  @Post(':id/reactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivate cancelled subscription' })
  @ApiResponse({ status: 200, description: 'Subscription reactivated successfully' })
  reactivateSubscription(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.subscriptionsService.reactivateSubscription(req.user.id, id);
  }

  @Post(':id/change-plan')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change subscription plan' })
  @ApiResponse({ status: 200, description: 'Plan changed successfully' })
  changePlan(@Request() req: AuthRequest, @Param('id') id: string, @Body() body: { planId: string }) {
    return this.subscriptionsService.changePlan(req.user.id, id, body.planId);
  }

  // ============================================
  // BENEFITS & FEATURES
  // ============================================

  @Get('benefits')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user subscription benefits' })
  @ApiResponse({ status: 200, description: 'Benefits retrieved successfully' })
  getUserBenefits(@Request() req: AuthRequest) {
    return this.subscriptionsService.getUserBenefits(req.user.id);
  }

  @Get('can-perform/:action')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user can perform action' })
  @ApiResponse({ status: 200, description: 'Permission checked successfully' })
  async canPerformAction(@Request() req: AuthRequest, @Param('action') action: string) {
    const validActions = ['createProduct', 'createFeaturedListing', 'createOrder'];
    if (!validActions.includes(action)) {
      throw new BadRequestException('Invalid action. Valid actions: ' + validActions.join(', '));
    }

    const can = await this.subscriptionsService.canPerformAction(
      req.user.id,
      action as 'createProduct' | 'createFeaturedListing' | 'createOrder'
    );

    return { can };
  }

  // ============================================
  // INVOICES
  // ============================================

  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user invoices' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  getInvoices(@Request() req: AuthRequest, @Query('subscriptionId') subscriptionId?: string) {
    return this.subscriptionsService.getInvoices(req.user.id, subscriptionId);
  }

  // ============================================
  // VENDOR TIERS (New endpoints)
  // ============================================

  @Get('vendor-tiers')
  @ApiOperation({ summary: 'Get all vendor subscription tiers (Public)' })
  @ApiResponse({ status: 200, description: 'Vendor tiers retrieved successfully' })
  getVendorTiers() {
    return VENDOR_SUBSCRIPTION_TIERS.map((tier) => ({
      type: tier.type,
      slug: tier.slug,
      name: tier.name,
      description: tier.description,
      monthlyPrice: tier.monthlyPrice,
      yearlyPrice: tier.yearlyPrice,
      transactionFee: tier.transactionFee,
      isPopular: tier.isPopular,
      displayOrder: tier.displayOrder,
      trialDays: tier.trialDays,
      features: tier.features,
    }));
  }

  @Get('vendor-tiers/:slug')
  @ApiOperation({ summary: 'Get vendor tier by slug (Public)' })
  @ApiResponse({ status: 200, description: 'Vendor tier retrieved successfully' })
  getVendorTierBySlug(@Param('slug') slug: string) {
    const tier = VENDOR_SUBSCRIPTION_TIERS.find((t) => t.slug === slug);

    if (!tier) {
      throw new BadRequestException(`Tier '${slug}' not found`);
    }

    return {
      type: tier.type,
      slug: tier.slug,
      name: tier.name,
      description: tier.description,
      monthlyPrice: tier.monthlyPrice,
      yearlyPrice: tier.yearlyPrice,
      transactionFee: tier.transactionFee,
      isPopular: tier.isPopular,
      displayOrder: tier.displayOrder,
      trialDays: tier.trialDays,
      features: tier.features,
    };
  }

  @Get('my-tier')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current vendor tier and subscription summary' })
  @ApiResponse({ status: 200, description: 'Tier summary retrieved successfully' })
  async getMyTier(@Request() req: AuthRequest) {
    return this.subscriptionTierService.getVendorSubscriptionSummary(req.user.id);
  }

  @Get('my-tier/usage')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current vendor usage metrics' })
  @ApiResponse({ status: 200, description: 'Usage metrics retrieved successfully' })
  async getMyUsage(@Request() req: AuthRequest) {
    const usage = await this.subscriptionTierService.getVendorUsage(req.user.id);
    const [productLimit, orderLimit, discountLimit] = await Promise.all([
      this.subscriptionTierService.checkProductLimit(req.user.id),
      this.subscriptionTierService.checkOrderLimit(req.user.id),
      this.subscriptionTierService.checkDiscountCodeLimit(req.user.id),
    ]);

    return {
      usage,
      limits: {
        products: productLimit,
        orders: orderLimit,
        discountCodes: discountLimit,
      },
    };
  }

  @Get('my-tier/feature/:feature')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if vendor has access to a specific feature' })
  @ApiResponse({ status: 200, description: 'Feature access checked successfully' })
  async checkFeatureAccess(
    @Request() req: AuthRequest,
    @Param('feature') feature: string,
  ) {
    const hasAccess = await this.subscriptionTierService.hasFeatureAccess(
      req.user.id,
      feature as FeatureKey,
    );

    return { feature, hasAccess };
  }

  @Get('my-tier/upgrade-options')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get available upgrade options for vendor' })
  @ApiResponse({ status: 200, description: 'Upgrade options retrieved successfully' })
  async getUpgradeOptions(@Request() req: AuthRequest) {
    return this.subscriptionTierService.getUpgradeOptions(req.user.id);
  }

  @Get('my-tier/transaction-fee')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor transaction fee rate' })
  @ApiResponse({ status: 200, description: 'Transaction fee retrieved successfully' })
  async getTransactionFee(@Request() req: AuthRequest) {
    const rate = await this.subscriptionTierService.getTransactionFeeRate(req.user.id);
    return { transactionFeeRate: rate };
  }

  @Post('my-tier/calculate-fee')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calculate transaction fee for an amount' })
  @ApiResponse({ status: 200, description: 'Transaction fee calculated successfully' })
  async calculateTransactionFee(
    @Request() req: AuthRequest,
    @Body() body: { amount: number },
  ) {
    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException('Amount must be a positive number');
    }

    const rate = await this.subscriptionTierService.getTransactionFeeRate(req.user.id);
    const fee = await this.subscriptionTierService.calculateTransactionFee(
      req.user.id,
      body.amount,
    );

    return {
      amount: body.amount,
      transactionFeeRate: rate,
      transactionFee: fee,
      netAmount: Number((body.amount - fee).toFixed(2)),
    };
  }

  // ============================================
  // ADMIN OPERATIONS
  // ============================================

  @Post('process')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process subscriptions (renewals, expirations) - Admin only' })
  @ApiResponse({ status: 200, description: 'Subscriptions processed successfully' })
  async processSubscriptions() {
    await this.subscriptionsService.processSubscriptions();
    return { message: 'Subscriptions processed successfully' };
  }
}
