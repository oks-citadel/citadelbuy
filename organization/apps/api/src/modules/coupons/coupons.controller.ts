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
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto, ApplyCouponDto } from './dto/validate-coupon.dto';
import { CreateAutomaticDiscountDto } from './dto/create-automatic-discount.dto';
import { BulkGenerateCouponsDto } from './dto/bulk-generate-coupons.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Coupons & Discounts')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new coupon (Admin only)' })
  @ApiResponse({ status: 201, description: 'Coupon created successfully' })
  @ApiResponse({ status: 409, description: 'Coupon code already exists' })
  async createCoupon(@Body() dto: CreateCouponDto) {
    return this.couponsService.createCoupon(dto);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk generate coupons (Admin only)' })
  @ApiResponse({ status: 201, description: 'Coupons generated successfully' })
  async bulkGenerateCoupons(@Body() dto: BulkGenerateCouponsDto) {
    return this.couponsService.bulkGenerateCoupons(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all coupons with pagination (Admin only)' })
  @ApiResponse({ status: 200, description: 'Coupons retrieved successfully' })
  async getCoupons(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.couponsService.getCoupons({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      type: type as any,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search,
    });
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get coupon analytics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getCouponAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.couponsService.getCouponAnalytics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get coupon by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Coupon retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  async getCoupon(@Param('id') id: string) {
    return this.couponsService.getCoupon(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update coupon (Admin only)' })
  @ApiResponse({ status: 200, description: 'Coupon updated successfully' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  async updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.updateCoupon(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete coupon (Admin only)' })
  @ApiResponse({ status: 200, description: 'Coupon deleted successfully' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  async deleteCoupon(@Param('id') id: string) {
    return this.couponsService.deleteCoupon(id);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('validate')
  @ApiOperation({ summary: 'Validate a coupon code (Public)' })
  @ApiResponse({ status: 200, description: 'Coupon validation result' })
  async validateCoupon(@Body() dto: ValidateCouponDto) {
    return this.couponsService.validateCoupon(dto);
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply coupon to cart/order (Authenticated)' })
  @ApiResponse({ status: 200, description: 'Coupon applied successfully' })
  @ApiResponse({ status: 400, description: 'Invalid coupon' })
  async applyCoupon(@Body() dto: ApplyCouponDto) {
    return this.couponsService.applyCoupon(dto);
  }
}

@ApiTags('Automatic Discounts')
@Controller('automatic-discounts')
export class AutomaticDiscountsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create automatic discount (Admin only)' })
  @ApiResponse({ status: 201, description: 'Automatic discount created successfully' })
  async createAutomaticDiscount(@Body() dto: CreateAutomaticDiscountDto) {
    return this.couponsService.createAutomaticDiscount(dto);
  }

  @Get('applicable')
  @ApiOperation({ summary: 'Get applicable automatic discounts (Public)' })
  @ApiResponse({ status: 200, description: 'Applicable discounts retrieved' })
  async getApplicableDiscounts(
    @Query('subtotal') subtotal: number,
    @Query('productIds') productIds?: string,
    @Query('categoryIds') categoryIds?: string,
  ) {
    return this.couponsService.getApplicableAutomaticDiscounts({
      subtotal: Number(subtotal),
      productIds: productIds ? productIds.split(',') : undefined,
      categoryIds: categoryIds ? categoryIds.split(',') : undefined,
    });
  }
}
