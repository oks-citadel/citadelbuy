import { Controller, Get, Query, UseGuards, Request, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthRequest } from '../../common/types/auth-request.types';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get dashboard overview (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard analytics retrieved successfully',
  })
  getDashboard(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getDashboardOverview(query);
  }

  @Get('sales')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get sales analytics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Sales analytics retrieved successfully',
  })
  getSales(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getSalesAnalytics(query);
  }

  @Get('products')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get product performance analytics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Product analytics retrieved successfully',
  })
  getProducts(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getProductAnalytics(query);
  }

  @Get('customers')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get customer insights (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Customer analytics retrieved successfully',
  })
  getCustomers(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getCustomerAnalytics(query);
  }

  @Get('inventory')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get inventory analytics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Inventory analytics retrieved successfully',
  })
  getInventory(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getInventoryAnalytics(query);
  }

  @Get('vendor/:vendorId')
  @ApiOperation({ summary: 'Get vendor-specific analytics (Vendor/Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Vendor analytics retrieved successfully',
  })
  getVendorAnalytics(
    @Param('vendorId') vendorId: string,
    @Query() query: AnalyticsQueryDto,
    @Request() req: AuthRequest,
  ) {
    // Vendors can only see their own analytics, admins can see all
    const requestedVendorId = req.user.role === 'ADMIN' ? vendorId : req.user.id;
    return this.analyticsService.getVendorAnalytics(requestedVendorId, query);
  }
}
