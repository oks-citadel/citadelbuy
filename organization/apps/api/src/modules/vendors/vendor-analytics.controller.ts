import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Param,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { VendorAnalyticsService } from './vendor-analytics.service';
import { VendorsService } from './vendors.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { AuthRequest } from '@/common/types/auth-request.types';

@ApiTags('Vendor Analytics')
@Controller('vendor-analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorAnalyticsController {
  constructor(
    private readonly analyticsService: VendorAnalyticsService,
    private readonly vendorsService: VendorsService,
  ) {}

  // ==================== Dashboard Overview ====================

  @Get('dashboard')
  @ApiOperation({ summary: 'Get vendor dashboard overview' })
  @ApiQuery({ name: 'period', required: false, enum: ['today', 'week', 'month', 'year'] })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboard(
    @Request() req: AuthRequest,
    @Query('period') period: 'today' | 'week' | 'month' | 'year' = 'month',
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.analyticsService.getDashboardOverview(profile.id, period);
  }

  // ==================== Sales Analytics ====================

  @Get('sales')
  @ApiOperation({ summary: 'Get detailed sales metrics' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getSalesMetrics(
    @Request() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    const dateRange = {
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
    };
    return this.analyticsService.getSalesMetrics(profile.id, dateRange);
  }

  @Get('sales/comparison')
  @ApiOperation({ summary: 'Get sales comparison with previous period' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'year'] })
  async getSalesComparison(
    @Request() req: AuthRequest,
    @Query('period') period: 'week' | 'month' | 'year' = 'month',
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.analyticsService.getSalesComparison(profile.id, period);
  }

  @Get('sales/trend')
  @ApiOperation({ summary: 'Get sales trend over time' })
  @ApiQuery({ name: 'period', required: false, enum: ['today', 'week', 'month', 'year'] })
  async getSalesTrend(
    @Request() req: AuthRequest,
    @Query('period') period: 'today' | 'week' | 'month' | 'year' = 'month',
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    const dateRange = this.getDateRange(period);
    return this.analyticsService.getSalesTrend(profile.id, dateRange, period);
  }

  // ==================== Product Analytics ====================

  @Get('products')
  @ApiOperation({ summary: 'Get product performance metrics' })
  async getProductMetrics(@Request() req: AuthRequest) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.analyticsService.getProductMetrics(profile.id);
  }

  @Get('products/top-selling')
  @ApiOperation({ summary: 'Get top selling products' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getTopSellingProducts(
    @Request() req: AuthRequest,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    const dateRange = startDate && endDate
      ? { startDate: new Date(startDate), endDate: new Date(endDate) }
      : undefined;
    return this.analyticsService.getTopSellingProducts(
      profile.id,
      limit ? parseInt(limit) : 10,
      dateRange,
    );
  }

  // ==================== Traffic Analytics ====================

  @Get('traffic')
  @ApiOperation({ summary: 'Get traffic and visitor metrics' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getTrafficMetrics(
    @Request() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    const dateRange = {
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
    };
    return this.analyticsService.getTrafficMetrics(profile.id, dateRange);
  }

  // ==================== Customer Analytics ====================

  @Get('customers')
  @ApiOperation({ summary: 'Get customer metrics and insights' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getCustomerMetrics(
    @Request() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    const dateRange = {
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
    };
    return this.analyticsService.getCustomerMetrics(profile.id, dateRange);
  }

  @Get('customers/top')
  @ApiOperation({ summary: 'Get top customers by spending' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTopCustomers(
    @Request() req: AuthRequest,
    @Query('limit') limit?: string,
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    const dateRange = {
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    };
    return this.analyticsService.getTopCustomers(
      profile.id,
      dateRange,
      limit ? parseInt(limit) : 10,
    );
  }

  // ==================== Performance Analytics ====================

  @Get('performance')
  @ApiOperation({ summary: 'Get seller performance metrics' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getPerformanceMetrics(
    @Request() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    const dateRange = {
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
    };
    return this.analyticsService.getPerformanceMetrics(profile.id, dateRange);
  }

  // ==================== Revenue Breakdown ====================

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue breakdown with commissions' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getRevenueBreakdown(
    @Request() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    const dateRange = {
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
    };
    return this.analyticsService.getRevenueBreakdown(profile.id, dateRange);
  }

  // ==================== Categories Analytics ====================

  @Get('categories')
  @ApiOperation({ summary: 'Get top performing categories' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getTopCategories(
    @Request() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    const dateRange = {
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
    };
    return this.analyticsService.getTopCategories(profile.id, dateRange);
  }

  // ==================== Recent Orders ====================

  @Get('orders/recent')
  @ApiOperation({ summary: 'Get recent orders' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentOrders(
    @Request() req: AuthRequest,
    @Query('limit') limit?: string,
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    return this.analyticsService.getRecentOrders(profile.id, limit ? parseInt(limit) : 10);
  }

  // ==================== Export Analytics ====================

  @Get('export')
  @ApiOperation({ summary: 'Export analytics data' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async exportAnalytics(
    @Request() req: AuthRequest,
    @Res() res: Response,
    @Query('format') format: 'json' | 'csv' = 'json',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const profile = await this.vendorsService.getVendorProfile(req.user.id);
    const dateRange = {
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
    };

    const data = await this.analyticsService.exportAnalytics(profile.id, dateRange, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics.csv');
      return res.send(data);
    }

    return res.json(data);
  }

  // ==================== Helper Methods ====================

  private getDateRange(period: 'today' | 'week' | 'month' | 'year') {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  }
}
