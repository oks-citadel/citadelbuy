import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthRequest } from '../../common/types/auth-request.types';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to a plan' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
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
    if (action !== 'createProduct' && action !== 'createAd') {
      throw new BadRequestException('Invalid action');
    }

    const can = await this.subscriptionsService.canPerformAction(
      req.user.id,
      action as 'createProduct' | 'createAd'
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
