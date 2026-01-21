import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { MarketingAnalyticsService } from './marketing-analytics.service';
import {
  CreateFunnelDto,
  FunnelQueryDto,
  CohortQueryDto,
  AttributionQueryDto,
  CompareAttributionDto,
  RecordSessionDto,
  RecordEventDto,
  HeatmapQueryDto,
  RecordingQueryDto,
} from './dto/analytics.dto';

@ApiTags('Marketing - Analytics')
@Controller('marketing/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MarketingAnalyticsController {
  constructor(private readonly analyticsService: MarketingAnalyticsService) {}

  // Funnel Endpoints
  @Post('funnels')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Create funnel definition' })
  @ApiResponse({ status: 201, description: 'Funnel created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createFunnel(@Body() dto: CreateFunnelDto) {
    return this.analyticsService.createFunnel({
      name: dto.name,
      organizationId: dto.organizationId,
      steps: dto.steps,
      conversionWindowDays: dto.conversionWindowDays,
    });
  }

  @Get('funnels')
  @ApiOperation({ summary: 'Get funnels' })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiResponse({ status: 200, description: 'Funnels retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getFunnels(@Query('organizationId') organizationId: string) {
    return this.analyticsService.getFunnels(organizationId);
  }

  @Post('funnels/analyze')
  @ApiOperation({ summary: 'Analyze funnel performance' })
  @ApiResponse({ status: 200, description: 'Funnel analysis returned' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async analyzeFunnel(@Body() dto: FunnelQueryDto) {
    return this.analyticsService.analyzeFunnel({
      funnelId: dto.funnelId,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      segmentId: dto.segmentId,
      groupBy: dto.groupBy,
    });
  }

  // Cohort Endpoints
  @Post('cohorts/analyze')
  @ApiOperation({ summary: 'Analyze cohorts' })
  @ApiResponse({ status: 200, description: 'Cohort analysis returned' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async analyzeCohort(@Body() dto: CohortQueryDto) {
    return this.analyticsService.analyzeCohort({
      organizationId: dto.organizationId,
      cohortType: dto.cohortType,
      metric: dto.metric,
      granularity: dto.granularity,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      periods: dto.periods,
    });
  }

  // Attribution Endpoints
  @Post('attribution/analyze')
  @ApiOperation({ summary: 'Analyze attribution' })
  @ApiResponse({ status: 200, description: 'Attribution analysis returned' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async analyzeAttribution(@Body() dto: AttributionQueryDto) {
    return this.analyticsService.analyzeAttribution({
      organizationId: dto.organizationId,
      model: dto.model,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      lookbackDays: dto.lookbackDays,
      conversionEvent: dto.conversionEvent,
      channelGrouping: dto.channelGrouping,
    });
  }

  @Post('attribution/compare')
  @ApiOperation({ summary: 'Compare attribution models' })
  @ApiResponse({ status: 200, description: 'Attribution comparison returned' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async compareAttributionModels(@Body() dto: CompareAttributionDto) {
    return this.analyticsService.compareAttributionModels({
      organizationId: dto.organizationId,
      models: dto.models,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
    });
  }

  // Heatmap/Recording Endpoints
  @Post('sessions')
  @ApiOperation({ summary: 'Start session recording' })
  @ApiResponse({ status: 201, description: 'Session started' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  async recordSession(@Body() dto: RecordSessionDto) {
    return this.analyticsService.recordSession({
      sessionId: dto.sessionId,
      userId: dto.userId,
      pageUrl: dto.pageUrl,
      viewportWidth: dto.viewportWidth,
      viewportHeight: dto.viewportHeight,
      deviceType: dto.deviceType,
    });
  }

  @Post('sessions/event')
  @ApiOperation({ summary: 'Record session event' })
  @ApiResponse({ status: 201, description: 'Event recorded' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 1000, ttl: 60000 } })
  async recordEvent(@Body() dto: RecordEventDto) {
    await this.analyticsService.recordEvent({
      sessionId: dto.sessionId,
      eventType: dto.eventType,
      timestamp: dto.timestamp,
      x: dto.x,
      y: dto.y,
      scrollDepth: dto.scrollDepth,
      targetSelector: dto.targetSelector,
    });
    return { success: true };
  }

  @Post('heatmaps')
  @ApiOperation({ summary: 'Get heatmap data' })
  @ApiResponse({ status: 200, description: 'Heatmap data returned' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getHeatmap(@Body() dto: HeatmapQueryDto) {
    return this.analyticsService.getHeatmap({
      organizationId: dto.organizationId,
      pageUrl: dto.pageUrl,
      type: dto.type,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      deviceType: dto.deviceType,
    });
  }

  @Get('recordings')
  @ApiOperation({ summary: 'List session recordings' })
  @ApiResponse({ status: 200, description: 'Recordings list returned' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getRecordings(@Query() query: RecordingQueryDto) {
    return this.analyticsService.getRecordings({
      organizationId: query.organizationId,
      pageUrl: query.pageUrl,
      userId: query.userId,
      minDuration: query.minDuration,
      hasError: query.hasError,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('recordings/:sessionId')
  @ApiOperation({ summary: 'Get session recording' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Recording returned' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getRecording(@Param('sessionId') sessionId: string) {
    return this.analyticsService.getRecording(sessionId);
  }
}
