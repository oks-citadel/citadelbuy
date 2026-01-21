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
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';
import {
  SeoDashboardDto,
  SeoOverviewDto,
  SeoTrendDto,
  SeoAlertDto,
  SeoGoalDto,
  SeoReportDto,
  SeoComparisonDto,
  CreateAlertDto,
  CreateGoalDto,
  UpdateGoalDto,
  GenerateReportDto,
  ComparePeriodsDto,
  ReportFormat,
} from '../dto/dashboard.dto';

@ApiTags('SEO - Dashboard')
@Controller('seo/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MARKETING)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get comprehensive SEO dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data', type: SeoDashboardDto })
  async getDashboard() {
    return this.dashboardService.getDashboard();
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get SEO overview metrics' })
  @ApiResponse({ status: 200, description: 'Overview metrics', type: SeoOverviewDto })
  async getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get SEO trends over time' })
  @ApiQuery({ name: 'period', enum: ['7d', '30d', '90d'], required: false })
  @ApiResponse({ status: 200, description: 'Trend data', type: [SeoTrendDto] })
  async getTrends(@Query('period') period?: '7d' | '30d' | '90d') {
    return this.dashboardService.getTrends(period);
  }

  // Alerts

  @Get('alerts')
  @ApiOperation({ summary: 'Get active SEO alerts' })
  @ApiResponse({ status: 200, description: 'Active alerts', type: [SeoAlertDto] })
  async getAlerts() {
    return this.dashboardService.getActiveAlerts();
  }

  @Post('alerts')
  @ApiOperation({ summary: 'Create alert' })
  @ApiResponse({ status: 201, description: 'Alert created', type: SeoAlertDto })
  async createAlert(@Body() dto: CreateAlertDto) {
    return this.dashboardService.upsertAlert(dto);
  }

  @Put('alerts/:id')
  @ApiOperation({ summary: 'Update alert' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: 200, description: 'Alert updated', type: SeoAlertDto })
  async updateAlert(@Param('id') id: string, @Body() dto: Partial<CreateAlertDto>) {
    return this.dashboardService.upsertAlert({ id, ...dto });
  }

  @Delete('alerts/:id')
  @ApiOperation({ summary: 'Delete alert' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: 204, description: 'Alert deleted' })
  async deleteAlert(@Param('id') id: string) {
    await this.dashboardService.deleteAlert(id);
    return { success: true };
  }

  // Goals

  @Get('goals')
  @ApiOperation({ summary: 'Get SEO goals' })
  @ApiResponse({ status: 200, description: 'Goals', type: [SeoGoalDto] })
  async getGoals() {
    return this.dashboardService.getGoals();
  }

  @Post('goals')
  @ApiOperation({ summary: 'Create goal' })
  @ApiResponse({ status: 201, description: 'Goal created', type: SeoGoalDto })
  async createGoal(@Body() dto: CreateGoalDto) {
    return this.dashboardService.upsertGoal(dto);
  }

  @Put('goals/:id')
  @ApiOperation({ summary: 'Update goal' })
  @ApiParam({ name: 'id', description: 'Goal ID' })
  @ApiResponse({ status: 200, description: 'Goal updated', type: SeoGoalDto })
  async updateGoal(@Param('id') id: string, @Body() dto: UpdateGoalDto) {
    return this.dashboardService.upsertGoal({ id, ...dto });
  }

  @Delete('goals/:id')
  @ApiOperation({ summary: 'Delete goal' })
  @ApiParam({ name: 'id', description: 'Goal ID' })
  @ApiResponse({ status: 204, description: 'Goal deleted' })
  async deleteGoal(@Param('id') id: string) {
    await this.dashboardService.deleteGoal(id);
    return { success: true };
  }

  // Reports

  @Post('reports')
  @ApiOperation({ summary: 'Generate SEO report' })
  @ApiResponse({ status: 200, description: 'Generated report' })
  async generateReport(@Body() dto: GenerateReportDto, @Res() res: Response) {
    const report = await this.dashboardService.generateReport(
      dto.period,
      dto.format,
      dto.sections,
    );

    if (dto.format === ReportFormat.JSON || !dto.format) {
      return res.json(report);
    }

    if (dto.format === ReportFormat.CSV) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="seo-report.csv"');
      return res.send(report);
    }

    if (dto.format === ReportFormat.HTML) {
      res.setHeader('Content-Type', 'text/html');
      return res.send(report);
    }

    return res.json(report);
  }

  @Post('compare')
  @ApiOperation({ summary: 'Compare SEO performance between periods' })
  @ApiResponse({ status: 200, description: 'Comparison results', type: SeoComparisonDto })
  async comparePeriods(@Body() dto: ComparePeriodsDto) {
    return this.dashboardService.comparePerformance(
      { start: dto.period1Start, end: dto.period1End },
      { start: dto.period2Start, end: dto.period2End },
    );
  }
}
