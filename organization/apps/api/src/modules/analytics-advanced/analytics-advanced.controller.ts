import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsAdvancedService } from './analytics-advanced.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole, ReportType, MetricPeriod } from '@prisma/client';
import { GenerateReportDto } from './dto/generate-report.dto';
import { CreateWidgetDto } from './dto/create-widget.dto';
import { AuthRequest } from '@/common/types/auth-request.types';

@ApiTags('Advanced Analytics')
@Controller('analytics-advanced')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AnalyticsAdvancedController {
  constructor(private readonly analyticsService: AnalyticsAdvancedService) {}

  // ==================== Dashboard Overview ====================

  @Get('dashboard/overview')
  @ApiOperation({ summary: 'Get dashboard overview (Admin)' })
  async getDashboardOverview() {
    return this.analyticsService.getDashboardOverview();
  }

  // ==================== Sales Reports ====================

  @Post('reports/sales/generate')
  @ApiOperation({ summary: 'Generate sales report (Admin)' })
  async generateSalesReport(@Body() dto: GenerateReportDto) {
    return this.analyticsService.generateSalesReport(dto);
  }

  @Get('reports/sales')
  @ApiOperation({ summary: 'Get sales reports (Admin)' })
  async getSalesReports(
    @Query('reportType') reportType?: ReportType,
    @Query('limit') limit?: number,
  ) {
    return this.analyticsService.getSalesReports(
      reportType,
      limit ? Number(limit) : undefined,
    );
  }

  // ==================== Revenue Metrics ====================

  @Post('metrics/revenue/generate')
  @ApiOperation({ summary: 'Generate revenue metrics (Admin)' })
  async generateRevenueMetrics(
    @Body() body: { period: MetricPeriod; metricDate: string },
  ) {
    return this.analyticsService.generateRevenueMetrics(
      body.period,
      new Date(body.metricDate),
    );
  }

  @Get('metrics/revenue')
  @ApiOperation({ summary: 'Get revenue metrics (Admin)' })
  async getRevenueMetrics(
    @Query('period') period?: MetricPeriod,
    @Query('limit') limit?: number,
  ) {
    return this.analyticsService.getRevenueMetrics(
      period,
      limit ? Number(limit) : undefined,
    );
  }

  // ==================== Customer Insights ====================

  @Post('insights/customer/:userId/generate')
  @ApiOperation({ summary: 'Generate customer insight (Admin)' })
  async generateCustomerInsight(@Param('userId') userId: string) {
    return this.analyticsService.generateCustomerInsight(userId);
  }

  @Get('insights/customer')
  @ApiOperation({ summary: 'Get customer insights (Admin)' })
  async getCustomerInsights(
    @Query('customerSegment') customerSegment?: string,
    @Query('loyaltyTier') loyaltyTier?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.analyticsService.getCustomerInsights({
      customerSegment,
      loyaltyTier,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // ==================== Product Performance ====================

  @Post('performance/product/:productId/generate')
  @ApiOperation({ summary: 'Generate product performance (Admin)' })
  async generateProductPerformance(@Param('productId') productId: string) {
    return this.analyticsService.generateProductPerformance(productId);
  }

  @Get('performance/products/top')
  @ApiOperation({ summary: 'Get top performing products (Admin)' })
  async getTopProducts(
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: 'revenue' | 'purchases' | 'views',
  ) {
    return this.analyticsService.getTopProducts(
      limit ? Number(limit) : undefined,
      sortBy || 'revenue',
    );
  }

  // ==================== Conversion Funnel ====================

  @Post('funnel/generate')
  @ApiOperation({ summary: 'Generate conversion funnel (Admin)' })
  async generateConversionFunnel(
    @Body() body: { period: MetricPeriod; funnelDate: string },
  ) {
    return this.analyticsService.generateConversionFunnel(
      body.period,
      new Date(body.funnelDate),
    );
  }

  @Get('funnel')
  @ApiOperation({ summary: 'Get conversion funnels (Admin)' })
  async getConversionFunnels(
    @Query('period') period?: MetricPeriod,
    @Query('limit') limit?: number,
  ) {
    return this.analyticsService.getConversionFunnels(
      period,
      limit ? Number(limit) : undefined,
    );
  }

  // ==================== Dashboard Widgets ====================

  @Post('widgets')
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  @ApiOperation({ summary: 'Create dashboard widget' })
  async createWidget(@Request() req: AuthRequest, @Body() dto: CreateWidgetDto) {
    return this.analyticsService.createWidget(req.user.id, dto);
  }

  @Get('widgets')
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  @ApiOperation({ summary: 'Get user dashboard widgets' })
  async getUserWidgets(@Request() req: AuthRequest) {
    return this.analyticsService.getUserWidgets(req.user.id);
  }

  @Delete('widgets/:widgetId')
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  @ApiOperation({ summary: 'Delete dashboard widget' })
  async deleteWidget(@Request() req: AuthRequest, @Param('widgetId') widgetId: string) {
    return this.analyticsService.deleteWidget(widgetId, req.user.id);
  }
}
