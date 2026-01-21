import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GiftCardsService } from './gift-cards.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '../../common/types/auth-request.types';
import {
  PurchaseGiftCardDto,
  CreatePromotionalGiftCardDto,
  RedeemGiftCardDto,
  CheckGiftCardBalanceDto,
  UpdateGiftCardDto,
  SendGiftCardEmailDto,
  ConvertToStoreCreditDto,
  GetGiftCardsQueryDto,
  TransferGiftCardDto,
  BulkCreateGiftCardsDto,
} from './dto/gift-card.dto';
import {
  AddStoreCreditDto,
  DeductStoreCreditDto,
  AdjustStoreCreditDto,
  GetStoreCreditHistoryDto,
} from './dto/store-credit.dto';

@ApiTags('Gift Cards')
@Controller('gift-cards')
export class GiftCardsController {
  constructor(private readonly giftCardsService: GiftCardsService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * Check gift card balance
   * POST /gift-cards/check-balance
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('check-balance')
  async checkBalance(@Body() dto: CheckGiftCardBalanceDto) {
    return this.giftCardsService.checkBalance(dto);
  }

  // ==================== CUSTOMER ENDPOINTS ====================

  /**
   * Purchase a gift card
   * POST /gift-cards/purchase
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async purchaseGiftCard(@Body() dto: PurchaseGiftCardDto, @Request() req: AuthRequest) {
    return this.giftCardsService.purchaseGiftCard(dto, req.user.userId);
  }

  /**
   * Redeem gift card
   * POST /gift-cards/redeem
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('redeem')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async redeemGiftCard(@Body() dto: RedeemGiftCardDto, @Request() req: AuthRequest) {
    return this.giftCardsService.redeemGiftCard(dto, req.user.userId);
  }

  /**
   * Get my purchased gift cards
   * GET /gift-cards/my-purchases
   */
  @Get('my-purchases')
  @UseGuards(JwtAuthGuard)
  async getMyPurchasedGiftCards(
    @Request() req: AuthRequest,
    @Query() query: GetGiftCardsQueryDto,
  ) {
    return this.giftCardsService.getUserPurchasedGiftCards(
      req.user.userId,
      query,
    );
  }

  /**
   * Get my redeemed gift cards
   * GET /gift-cards/my-redemptions
   */
  @Get('my-redemptions')
  @UseGuards(JwtAuthGuard)
  async getMyRedeemedGiftCards(
    @Request() req: AuthRequest,
    @Query() query: GetGiftCardsQueryDto,
  ) {
    return this.giftCardsService.getUserRedeemedGiftCards(
      req.user.userId,
      query,
    );
  }

  /**
   * Get gift card details
   * GET /gift-cards/:id
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getGiftCardById(@Param('id') id: string) {
    return this.giftCardsService.getGiftCardById(id);
  }

  /**
   * Convert gift card to store credit
   * POST /gift-cards/convert-to-credit
   */
  @Post('convert-to-credit')
  @UseGuards(JwtAuthGuard)
  async convertToStoreCredit(
    @Body() dto: ConvertToStoreCreditDto,
    @Request() req: AuthRequest,
  ) {
    return this.giftCardsService.convertToStoreCredit(dto, req.user.userId);
  }

  /**
   * Transfer gift card to another user
   * POST /gift-cards/transfer
   */
  @Post('transfer')
  @UseGuards(JwtAuthGuard)
  async transferGiftCard(
    @Body() dto: TransferGiftCardDto,
    @Request() req: AuthRequest,
  ) {
    return this.giftCardsService.transferGiftCard(dto, req.user.userId);
  }

  // ==================== STORE CREDIT ENDPOINTS ====================

  /**
   * Get my store credit
   * GET /gift-cards/store-credit/balance
   */
  @Get('store-credit/balance')
  @UseGuards(JwtAuthGuard)
  async getMyStoreCredit(@Request() req: AuthRequest) {
    return this.giftCardsService.getStoreCredit(req.user.userId);
  }

  /**
   * Get store credit history
   * GET /gift-cards/store-credit/history
   */
  @Get('store-credit/history')
  @UseGuards(JwtAuthGuard)
  async getStoreCreditHistory(
    @Request() req: AuthRequest,
    @Query() query: GetStoreCreditHistoryDto,
  ) {
    return this.giftCardsService.getStoreCreditHistory(
      req.user.userId,
      query,
    );
  }

  /**
   * Deduct store credit (for orders)
   * POST /gift-cards/store-credit/deduct
   */
  @Post('store-credit/deduct')
  @UseGuards(JwtAuthGuard)
  async deductStoreCredit(@Body() dto: DeductStoreCreditDto, @Request() req: AuthRequest) {
    // Ensure user can only deduct from their own account
    if (dto.userId !== req.user.userId) {
      dto.userId = req.user.userId;
    }
    return this.giftCardsService.deductStoreCredit(dto);
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Create promotional gift card
   * POST /gift-cards/admin/promotional
   */
  @Post('admin/promotional')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createPromotionalGiftCard(@Body() dto: CreatePromotionalGiftCardDto) {
    return this.giftCardsService.createPromotionalGiftCard(dto);
  }

  /**
   * Bulk create gift cards
   * POST /gift-cards/admin/bulk-create
   */
  @Post('admin/bulk-create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async bulkCreateGiftCards(@Body() dto: BulkCreateGiftCardsDto) {
    return this.giftCardsService.bulkCreateGiftCards(dto);
  }

  /**
   * Update gift card
   * PUT /gift-cards/admin/:id
   */
  @Put('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateGiftCard(@Param('id') id: string, @Body() dto: UpdateGiftCardDto) {
    return this.giftCardsService.updateGiftCard(id, dto);
  }

  /**
   * Cancel gift card
   * POST /gift-cards/admin/:id/cancel
   */
  @Post('admin/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async cancelGiftCard(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.giftCardsService.cancelGiftCard(id, reason);
  }

  /**
   * Send/resend gift card email
   * POST /gift-cards/admin/:id/send-email
   */
  @Post('admin/:id/send-email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async sendGiftCardEmail(@Param('id') id: string) {
    return this.giftCardsService.sendGiftCardEmail(id);
  }

  /**
   * Add store credit to user
   * POST /gift-cards/admin/store-credit/add
   */
  @Post('admin/store-credit/add')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async addStoreCredit(@Body() dto: AddStoreCreditDto) {
    return this.giftCardsService.addStoreCredit(dto);
  }

  /**
   * Adjust user store credit
   * POST /gift-cards/admin/store-credit/:userId/adjust
   */
  @Post('admin/store-credit/:userId/adjust')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adjustStoreCredit(
    @Param('userId') userId: string,
    @Body() dto: AdjustStoreCreditDto,
  ) {
    return this.giftCardsService.adjustStoreCredit(userId, dto);
  }

  /**
   * Get gift card statistics
   * GET /gift-cards/admin/statistics
   */
  @Get('admin/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.giftCardsService.getGiftCardStatistics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * Process scheduled deliveries (Cron)
   * POST /gift-cards/admin/process-scheduled
   */
  @Post('admin/process-scheduled')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async processScheduledDeliveries() {
    return this.giftCardsService.processScheduledDeliveries();
  }

  /**
   * Expire old gift cards (Cron)
   * POST /gift-cards/admin/expire-old
   */
  @Post('admin/expire-old')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async expireOldGiftCards() {
    return this.giftCardsService.expireOldGiftCards();
  }
}
