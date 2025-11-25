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
import { DealsService } from './deals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '../../common/types/auth-request.types';
import {
  CreateDealDto,
  UpdateDealDto,
  AddProductsToDealDto,
  PurchaseDealDto,
  CalculateDealPriceDto,
  CheckDealEligibilityDto,
  TrackDealViewDto,
  TrackDealClickDto,
  GetDealsQueryDto,
  NotifyDealDto,
  DealProductDto,
} from './dto/deal.dto';

@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * Get all deals with optional filters
   * GET /deals
   */
  @Get()
  async getDeals(@Query() query: GetDealsQueryDto, @Request() req?: AuthRequest) {
    const userId = req?.user?.userId;
    return this.dealsService.getDeals(query, userId);
  }

  /**
   * Get featured deals
   * GET /deals/featured
   */
  @Get('featured')
  async getFeaturedDeals(@Request() req?: AuthRequest) {
    const userId = req?.user?.userId;
    return this.dealsService.getFeaturedDeals(userId);
  }

  /**
   * Get active deals
   * GET /deals/active
   */
  @Get('active')
  async getActiveDeals(@Request() req?: AuthRequest) {
    const userId = req?.user?.userId;
    return this.dealsService.getActiveDeals(userId);
  }

  /**
   * Get deal by ID
   * GET /deals/:id
   */
  @Get(':id')
  async getDealById(@Param('id') id: string, @Request() req?: AuthRequest) {
    const userId = req?.user?.userId;
    return this.dealsService.getDealById(id, userId);
  }

  /**
   * Calculate deal price for product
   * POST /deals/calculate-price
   */
  @Post('calculate-price')
  async calculateDealPrice(@Body() dto: CalculateDealPriceDto) {
    return this.dealsService.calculateDealPrice(dto);
  }

  /**
   * Track deal view
   * POST /deals/:id/track-view
   */
  @Post(':id/track-view')
  async trackDealView(
    @Param('id') id: string,
    @Body() dto: Omit<TrackDealViewDto, 'dealId'>,
  ) {
    return this.dealsService.trackDealView({ dealId: id, ...dto });
  }

  /**
   * Track deal click
   * POST /deals/:id/track-click
   */
  @Post(':id/track-click')
  async trackDealClick(
    @Param('id') id: string,
    @Body() dto: Omit<TrackDealClickDto, 'dealId'>,
  ) {
    return this.dealsService.trackDealClick({ dealId: id, ...dto });
  }

  // ==================== CUSTOMER ENDPOINTS ====================

  /**
   * Check deal eligibility
   * GET /deals/:id/eligibility
   */
  @Get(':id/eligibility')
  @UseGuards(JwtAuthGuard)
  async checkDealEligibility(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Query('quantity') quantity?: number,
  ) {
    return this.dealsService.checkDealEligibility({
      dealId: id,
      userId: req.user.userId,
      quantity: quantity ? parseInt(quantity as any) : undefined,
    });
  }

  /**
   * Record deal purchase
   * POST /deals/purchase
   */
  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  async recordDealPurchase(@Body() dto: PurchaseDealDto, @Request() req: AuthRequest) {
    return this.dealsService.recordDealPurchase(dto, req.user.userId);
  }

  /**
   * Get my deal purchases
   * GET /deals/my-purchases
   */
  @Get('my/purchases')
  @UseGuards(JwtAuthGuard)
  async getMyDealPurchases(
    @Request() req: AuthRequest,
    @Query('limit') limit?: number,
  ) {
    return this.dealsService.getUserDealPurchases(
      req.user.userId,
      limit ? parseInt(limit as any) : 20,
    );
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Create deal (Admin)
   * POST /deals
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createDeal(@Body() dto: CreateDealDto) {
    return this.dealsService.createDeal(dto);
  }

  /**
   * Update deal (Admin)
   * PUT /deals/:id
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateDeal(@Param('id') id: string, @Body() dto: UpdateDealDto) {
    return this.dealsService.updateDeal(id, dto);
  }

  /**
   * Delete deal (Admin)
   * DELETE /deals/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteDeal(@Param('id') id: string) {
    return this.dealsService.deleteDeal(id);
  }

  /**
   * Add products to deal (Admin)
   * POST /deals/:id/products
   */
  @Post(':id/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async addProductsToDeal(
    @Param('id') id: string,
    @Body() dto: AddProductsToDealDto,
  ) {
    return this.dealsService.addProductsToDeal(id, dto);
  }

  /**
   * Remove product from deal (Admin)
   * DELETE /deals/:dealId/products/:productId
   */
  @Delete(':dealId/products/:productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async removeProductFromDeal(
    @Param('dealId') dealId: string,
    @Param('productId') productId: string,
  ) {
    return this.dealsService.removeProductFromDeal(dealId, productId);
  }

  /**
   * Update deal product (Admin)
   * PUT /deals/products/:dealProductId
   */
  @Put('products/:dealProductId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateDealProduct(
    @Param('dealProductId') dealProductId: string,
    @Body() dto: Partial<DealProductDto>,
  ) {
    return this.dealsService.updateDealProduct(dealProductId, dto);
  }

  /**
   * Get deal analytics (Admin)
   * GET /deals/:id/analytics
   */
  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getDealAnalytics(@Param('id') id: string) {
    return this.dealsService.getDealAnalytics(id);
  }

  /**
   * Get all deals analytics (Admin)
   * GET /deals/admin/analytics
   */
  @Get('admin/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllDealsAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dealsService.getAllDealsAnalytics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * Send deal notifications (Admin)
   * POST /deals/:id/notify
   */
  @Post(':id/notify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async notifyDeal(
    @Param('id') id: string,
    @Body() dto: Omit<NotifyDealDto, 'dealId'>,
  ) {
    return this.dealsService.notifyDeal({ dealId: id, ...dto });
  }

  /**
   * Activate scheduled deals (Admin/Cron)
   * POST /deals/admin/activate-scheduled
   */
  @Post('admin/activate-scheduled')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async activateScheduledDeals() {
    return this.dealsService.activateScheduledDeals();
  }

  /**
   * End expired deals (Admin/Cron)
   * POST /deals/admin/end-expired
   */
  @Post('admin/end-expired')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async endExpiredDeals() {
    return this.dealsService.endExpiredDeals();
  }
}
