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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CommerceService } from './commerce.service';
import {
  CreateOfferDto,
  CreateCouponDto,
  ValidateCouponDto,
  CreateInAppMessageDto,
  CreateTrialPlanDto,
  StartTrialDto,
  OfferQueryDto,
} from './dto/commerce.dto';

@ApiTags('Marketing - Commerce Extensions')
@Controller('marketing/commerce')
export class CommerceController {
  constructor(private readonly commerceService: CommerceService) {}

  // Upsell/Cross-sell Endpoints
  @Post('offers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create upsell/cross-sell offer' })
  @ApiResponse({ status: 201, description: 'Offer created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createOffer(@Body() dto: CreateOfferDto) {
    return this.commerceService.createOffer(dto);
  }

  @Get('offers')
  @ApiOperation({ summary: 'Get offers' })
  @ApiResponse({ status: 200, description: 'Offers retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getOffers(@Query() query: OfferQueryDto) {
    return this.commerceService.getOffers(query);
  }

  @Get('offers/product/:productId')
  @ApiOperation({ summary: 'Get offers for product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiQuery({ name: 'trigger', required: false })
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  async getOffersForProduct(
    @Param('productId') productId: string,
    @Query('trigger') trigger?: string,
  ) {
    return this.commerceService.getOffersForProduct(productId, trigger || 'PRODUCT_VIEW');
  }

  @Post('offers/:id/impression')
  @ApiOperation({ summary: 'Track offer impression' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  async trackOfferImpression(@Param('id') id: string) {
    await this.commerceService.trackOfferImpression(id);
    return { success: true };
  }

  @Post('offers/:id/conversion')
  @ApiOperation({ summary: 'Track offer conversion' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async trackOfferConversion(@Param('id') id: string) {
    await this.commerceService.trackOfferConversion(id);
    return { success: true };
  }

  @Put('offers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update offer' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async updateOffer(@Param('id') id: string, @Body() dto: Partial<CreateOfferDto>) {
    return this.commerceService.updateOffer(id, dto);
  }

  @Delete('offers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete offer' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiResponse({ status: 204, description: 'Offer deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteOffer(@Param('id') id: string) {
    await this.commerceService.deleteOffer(id);
  }

  // Coupon Endpoints
  @Post('coupons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create coupon' })
  @ApiResponse({ status: 201, description: 'Coupon created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createCoupon(@Body() dto: CreateCouponDto) {
    return this.commerceService.createCoupon({
      ...dto,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
    });
  }

  @Get('coupons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get coupons' })
  @ApiQuery({ name: 'organizationId', required: true })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getCoupons(@Query('organizationId') organizationId: string) {
    return this.commerceService.getCoupons(organizationId);
  }

  @Post('coupons/validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate coupon' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async validateCoupon(@Body() dto: ValidateCouponDto) {
    return this.commerceService.validateCoupon(dto.code, dto.userId, dto.orderTotal, dto.productIds);
  }

  @Post('coupons/:id/apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply coupon (after order)' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async applyCoupon(@Param('id') id: string, @Body() body: { userId: string }) {
    await this.commerceService.applyCoupon(id, body.userId);
    return { success: true };
  }

  @Put('coupons/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update coupon' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async updateCoupon(@Param('id') id: string, @Body() dto: Partial<CreateCouponDto>) {
    return this.commerceService.updateCoupon(id, {
      ...dto,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
    });
  }

  @Delete('coupons/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete coupon' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  @ApiResponse({ status: 204, description: 'Coupon deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteCoupon(@Param('id') id: string) {
    await this.commerceService.deleteCoupon(id);
  }

  // In-App Messaging Endpoints
  @Post('messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create in-app message' })
  @ApiResponse({ status: 201, description: 'Message created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createInAppMessage(@Body() dto: CreateInAppMessageDto) {
    return this.commerceService.createInAppMessage(dto);
  }

  @Get('messages')
  @ApiOperation({ summary: 'Get in-app messages' })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'segment', required: false })
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  async getInAppMessages(
    @Query('organizationId') organizationId: string,
    @Query('page') page?: string,
    @Query('segment') segment?: string,
  ) {
    return this.commerceService.getInAppMessages(organizationId, page, segment);
  }

  @Post('messages/:id/impression')
  @ApiOperation({ summary: 'Track message impression' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  async trackMessageImpression(@Param('id') id: string) {
    await this.commerceService.trackMessageImpression(id);
    return { success: true };
  }

  @Post('messages/:id/click')
  @ApiOperation({ summary: 'Track message click' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  async trackMessageClick(@Param('id') id: string) {
    await this.commerceService.trackMessageClick(id);
    return { success: true };
  }

  @Put('messages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update message' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async updateInAppMessage(@Param('id') id: string, @Body() dto: Partial<CreateInAppMessageDto>) {
    return this.commerceService.updateInAppMessage(id, dto);
  }

  @Delete('messages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete message' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({ status: 204, description: 'Message deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteInAppMessage(@Param('id') id: string) {
    await this.commerceService.deleteInAppMessage(id);
  }

  // Trial Conversion Endpoints
  @Post('trials/plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create trial plan' })
  @ApiResponse({ status: 201, description: 'Plan created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async createTrialPlan(@Body() dto: CreateTrialPlanDto) {
    return this.commerceService.createTrialPlan(dto);
  }

  @Post('trials/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start trial' })
  @ApiResponse({ status: 201, description: 'Trial started' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async startTrial(@Body() dto: StartTrialDto) {
    return this.commerceService.startTrial(dto.userId, dto.planId);
  }

  @Get('trials/user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user trials' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getUserTrials(@Param('userId') userId: string) {
    return this.commerceService.getUserTrials(userId);
  }

  @Post('trials/:id/convert')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Convert trial to paid' })
  @ApiParam({ name: 'id', description: 'Trial ID' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async convertTrial(@Param('id') id: string) {
    return this.commerceService.convertTrial(id);
  }

  @Get('trials/plans/:planId/metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get trial metrics' })
  @ApiParam({ name: 'planId', description: 'Plan ID' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getTrialMetrics(@Param('planId') planId: string) {
    return this.commerceService.getTrialMetrics(planId);
  }
}
