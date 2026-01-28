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
import { VendorCouponsService, CreateVendorCouponDto, UpdateVendorCouponDto } from './vendor-coupons.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '@/common/types/auth-request.types';
import { VendorsService } from '../vendors/vendors.service';

@ApiTags('Vendor Coupons')
@Controller('vendor-coupons')
export class VendorCouponsController {
  constructor(
    private readonly vendorCouponsService: VendorCouponsService,
    private readonly vendorsService: VendorsService,
  ) {}

  // ==================== Vendor Endpoints ====================

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a vendor coupon (Vendor)' })
  @ApiResponse({ status: 201, description: 'Coupon created successfully' })
  @ApiResponse({ status: 409, description: 'Coupon code already exists' })
  async createCoupon(@Request() req: AuthRequest, @Body() dto: CreateVendorCouponDto) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.vendorCouponsService.createVendorCoupon(profile.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my coupons (Vendor)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  async getMyCoupons(
    @Request() req: AuthRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.vendorCouponsService.getVendorCoupons(profile.id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search,
    });
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get coupon analytics (Vendor)' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getCouponAnalytics(
    @Request() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.vendorCouponsService.getVendorCouponAnalytics(
      profile.id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get coupon by ID (Vendor)' })
  @ApiResponse({ status: 200, description: 'Coupon retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  async getCoupon(@Request() req: AuthRequest, @Param('id') id: string) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.vendorCouponsService.getVendorCoupon(profile.id, id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update coupon (Vendor)' })
  @ApiResponse({ status: 200, description: 'Coupon updated successfully' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  async updateCoupon(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateVendorCouponDto,
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.vendorCouponsService.updateVendorCoupon(profile.id, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete coupon (Vendor)' })
  @ApiResponse({ status: 200, description: 'Coupon deleted successfully' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  async deleteCoupon(@Request() req: AuthRequest, @Param('id') id: string) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.vendorCouponsService.deleteVendorCoupon(profile.id, id);
  }

  // ==================== Public Endpoints ====================

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate a vendor coupon code' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateCoupon(
    @Request() req: AuthRequest,
    @Body() body: { code: string; productIds: string[]; subtotal: number },
  ) {
    return this.vendorCouponsService.validateVendorCoupon(body.code, {
      userId: req.user.id,
      productIds: body.productIds,
      subtotal: body.subtotal,
    });
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply a vendor coupon to an order' })
  @ApiResponse({ status: 200, description: 'Coupon applied successfully' })
  @ApiResponse({ status: 400, description: 'Invalid coupon' })
  async applyCoupon(
    @Request() req: AuthRequest,
    @Body() body: { code: string; orderId: string; productIds: string[]; subtotal: number },
  ) {
    return this.vendorCouponsService.applyVendorCoupon(body.code, {
      userId: req.user.id,
      orderId: body.orderId,
      productIds: body.productIds,
      subtotal: body.subtotal,
    });
  }

  // ==================== Admin Endpoints ====================

  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending approval coupons (Admin)' })
  async getPendingCoupons() {
    return this.vendorCouponsService.getPendingApprovalCoupons();
  }

  @Post('admin/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve vendor coupon (Admin)' })
  async approveCoupon(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.vendorCouponsService.approveCoupon(id, req.user.id);
  }

  @Post('admin/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject vendor coupon (Admin)' })
  async rejectCoupon(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.vendorCouponsService.rejectCoupon(id, req.user.id, body.reason);
  }
}
