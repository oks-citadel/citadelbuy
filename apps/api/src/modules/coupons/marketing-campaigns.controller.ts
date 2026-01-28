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
import { MarketingCampaignsService, CreateCampaignDto, UpdateCampaignDto } from './marketing-campaigns.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole, MarketingCampaignStatus, MarketingCampaignType } from '@prisma/client';
import { AuthRequest } from '@/common/types/auth-request.types';

@ApiTags('Marketing Campaigns')
@Controller('marketing-campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class MarketingCampaignsController {
  constructor(private readonly campaignsService: MarketingCampaignsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new marketing campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  async createCampaign(@Request() req: AuthRequest, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.createCampaign(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all marketing campaigns' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: MarketingCampaignStatus })
  @ApiQuery({ name: 'type', required: false, enum: MarketingCampaignType })
  @ApiQuery({ name: 'search', required: false })
  async getCampaigns(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: MarketingCampaignStatus,
    @Query('type') type?: MarketingCampaignType,
    @Query('search') search?: string,
  ) {
    return this.campaignsService.getCampaigns({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      type,
      search,
    });
  }

  @Get('active')
  @ApiOperation({ summary: 'Get currently active campaigns' })
  async getActiveCampaigns() {
    return this.campaignsService.getActiveCampaigns();
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get campaign analytics' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.campaignsService.getCampaignAnalytics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiResponse({ status: 200, description: 'Campaign retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async getCampaign(@Param('id') id: string) {
    return this.campaignsService.getCampaign(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update campaign' })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async updateCampaign(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignsService.updateCampaign(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete campaign' })
  @ApiResponse({ status: 200, description: 'Campaign deleted successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async deleteCampaign(@Param('id') id: string) {
    return this.campaignsService.deleteCampaign(id);
  }

  @Post(':id/coupons')
  @ApiOperation({ summary: 'Add coupons to campaign' })
  async addCoupons(
    @Param('id') id: string,
    @Body() body: { couponIds: string[] },
  ) {
    return this.campaignsService.addCouponsToCampaign(id, body.couponIds);
  }

  @Delete(':id/coupons/:couponId')
  @ApiOperation({ summary: 'Remove coupon from campaign' })
  async removeCoupon(
    @Param('id') id: string,
    @Param('couponId') couponId: string,
  ) {
    return this.campaignsService.removeCouponFromCampaign(id, couponId);
  }

  @Post(':id/track/impression')
  @ApiOperation({ summary: 'Track campaign impression' })
  async trackImpression(@Param('id') id: string) {
    await this.campaignsService.trackImpression(id);
    return { success: true };
  }

  @Post(':id/track/click')
  @ApiOperation({ summary: 'Track campaign click' })
  async trackClick(@Param('id') id: string) {
    await this.campaignsService.trackClick(id);
    return { success: true };
  }

  @Post('update-statuses')
  @ApiOperation({ summary: 'Manually trigger campaign status updates' })
  async updateStatuses() {
    await this.campaignsService.updateCampaignStatuses();
    return { message: 'Campaign statuses updated' };
  }
}
