import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsDashboardService } from './analytics-dashboard.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AnalyticsPeriod } from '@prisma/client';
import { AuthRequest } from '../../common/types/auth-request.types';

@ApiTags('Analytics Dashboard')
@Controller('analytics-dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsDashboardController {
  constructor(private readonly analyticsService: AnalyticsDashboardService) {}

  @Get('vendor/overview')
  @Roles('VENDOR', 'ADMIN')
  @ApiOperation({ summary: 'Get vendor overview analytics' })
  @ApiResponse({ status: 200, description: 'Vendor overview returned successfully' })
  async getVendorOverview(
    @Request() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('vendorId') vendorId?: string,
  ) {
    const actualVendorId = req.user.role === 'ADMIN' ? (vendorId || req.user.id) : req.user.id;

    const start = startDate ? new Date(startDate) : this.getDefaultStartDate();
    const end = endDate ? new Date(endDate) : new Date();

    return this.analyticsService.getVendorOverview(actualVendorId, start, end);
  }

  @Get('vendor/sales')
  @Roles('VENDOR', 'ADMIN')
  @ApiOperation({ summary: 'Get vendor sales analytics' })
  @ApiResponse({ status: 200, description: 'Vendor sales returned successfully' })
  @ApiQuery({ name: 'period', enum: AnalyticsPeriod, required: false })
  async getVendorSales(
    @Request() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('period') period?: AnalyticsPeriod,
    @Query('vendorId') vendorId?: string,
  ) {
    const actualVendorId = req.user.role === 'ADMIN' ? (vendorId || req.user.id) : req.user.id;

    const start = startDate ? new Date(startDate) : this.getDefaultStartDate();
    const end = endDate ? new Date(endDate) : new Date();

    return this.analyticsService.getVendorSales(
      actualVendorId,
      start,
      end,
      period || AnalyticsPeriod.DAILY,
    );
  }

  @Get('vendor/products')
  @Roles('VENDOR', 'ADMIN')
  @ApiOperation({ summary: 'Get vendor product performance' })
  @ApiResponse({ status: 200, description: 'Product performance returned successfully' })
  async getVendorProductPerformance(
    @Request() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Query('vendorId') vendorId?: string,
  ) {
    const actualVendorId = req.user.role === 'ADMIN' ? (vendorId || req.user.id) : req.user.id;

    const start = startDate ? new Date(startDate) : this.getDefaultStartDate();
    const end = endDate ? new Date(endDate) : new Date();

    return this.analyticsService.getVendorProductPerformance(
      actualVendorId,
      start,
      end,
      limit ? Number(limit) : 10,
    );
  }

  @Get('vendor/comparison')
  @Roles('VENDOR', 'ADMIN')
  @ApiOperation({ summary: 'Get comparison data (current vs previous period)' })
  @ApiResponse({ status: 200, description: 'Comparison data returned successfully' })
  async getComparisonData(
    @Request() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('vendorId') vendorId?: string,
  ) {
    const actualVendorId = req.user.role === 'ADMIN' ? (vendorId || req.user.id) : req.user.id;

    const start = startDate ? new Date(startDate) : this.getDefaultStartDate();
    const end = endDate ? new Date(endDate) : new Date();

    return this.analyticsService.getComparisonData(actualVendorId, start, end);
  }

  @Get('product/:productId')
  @Roles('VENDOR', 'ADMIN')
  @ApiOperation({ summary: 'Get product analytics' })
  @ApiResponse({ status: 200, description: 'Product analytics returned successfully' })
  @ApiQuery({ name: 'period', enum: AnalyticsPeriod, required: false })
  async getProductAnalytics(
    @Param('productId') productId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('period') period?: AnalyticsPeriod,
  ) {
    const start = startDate ? new Date(startDate) : this.getDefaultStartDate();
    const end = endDate ? new Date(endDate) : new Date();

    return this.analyticsService.getProductAnalytics(
      productId,
      start,
      end,
      period || AnalyticsPeriod.DAILY,
    );
  }

  @Get('revenue')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get revenue breakdown (Admin only)' })
  @ApiResponse({ status: 200, description: 'Revenue breakdown returned successfully' })
  async getRevenueBreakdown(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : this.getDefaultStartDate();
    const end = endDate ? new Date(endDate) : new Date();

    return this.analyticsService.getRevenueBreakdown(start, end);
  }

  @Get('traffic')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get traffic analytics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Traffic analytics returned successfully' })
  @ApiQuery({ name: 'period', enum: AnalyticsPeriod, required: false })
  async getTrafficAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('period') period?: AnalyticsPeriod,
  ) {
    const start = startDate ? new Date(startDate) : this.getDefaultStartDate();
    const end = endDate ? new Date(endDate) : new Date();

    return this.analyticsService.getTrafficAnalytics(
      start,
      end,
      period || AnalyticsPeriod.DAILY,
    );
  }

  @Get('categories')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get category analytics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Category analytics returned successfully' })
  async getCategoryAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : this.getDefaultStartDate();
    const end = endDate ? new Date(endDate) : new Date();

    return this.analyticsService.getCategoryAnalytics(start, end);
  }

  @Get('realtime')
  @Roles('VENDOR', 'ADMIN')
  @ApiOperation({ summary: 'Get real-time dashboard metrics' })
  @ApiResponse({ status: 200, description: 'Real-time metrics returned successfully' })
  async getRealTimeDashboard(@Request() req: AuthRequest) {
    const vendorId = req.user.role === 'VENDOR' ? req.user.id : undefined;
    return this.analyticsService.getRealTimeDashboard(vendorId);
  }

  private getDefaultStartDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Last 30 days
    return date;
  }
}
