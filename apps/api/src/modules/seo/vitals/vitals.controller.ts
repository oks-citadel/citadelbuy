import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { VitalsService } from './vitals.service';
import {
  VitalsSummaryDto,
  PageSpeedMetricsDto,
  VitalsHistoryDto,
  MobileFriendlinessDto,
  ReportVitalsDto,
  AnalyzeUrlDto,
  DeviceType,
} from '../dto/vitals.dto';

@ApiTags('SEO - Core Web Vitals')
@Controller('seo/vitals')
export class VitalsController {
  constructor(private readonly vitalsService: VitalsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get Core Web Vitals summary',
    description: 'Returns a summary of Core Web Vitals metrics across all monitored URLs.',
  })
  @ApiResponse({ status: 200, description: 'Vitals summary', type: VitalsSummaryDto })
  async getVitalsSummary(): Promise<VitalsSummaryDto> {
    return this.vitalsService.getVitalsSummary();
  }

  @Get('url')
  @ApiOperation({
    summary: 'Get vitals for a specific URL',
    description: 'Returns the Core Web Vitals metrics for a specific URL.',
  })
  @ApiQuery({ name: 'url', description: 'URL to get vitals for' })
  @ApiQuery({ name: 'deviceType', enum: DeviceType, required: false })
  @ApiResponse({ status: 200, description: 'URL vitals', type: PageSpeedMetricsDto })
  async getUrlVitals(
    @Query('url') url: string,
    @Query('deviceType') deviceType?: DeviceType,
  ): Promise<PageSpeedMetricsDto | null> {
    return this.vitalsService.getUrlVitals(url, deviceType);
  }

  @Post('analyze')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Analyze URL performance',
    description: 'Performs a full PageSpeed analysis on a URL and returns metrics.',
  })
  @ApiResponse({ status: 200, description: 'PageSpeed metrics', type: PageSpeedMetricsDto })
  async analyzeUrl(@Body() dto: AnalyzeUrlDto): Promise<PageSpeedMetricsDto> {
    return this.vitalsService.analyzeUrl(dto);
  }

  @Post('report')
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 reports per minute
  @ApiOperation({
    summary: 'Report client-side vitals',
    description: 'Endpoint for reporting Real User Monitoring (RUM) data from the frontend.',
  })
  @ApiResponse({ status: 201, description: 'Vitals reported successfully' })
  async reportVitals(@Body() dto: ReportVitalsDto) {
    await this.vitalsService.reportVitals(dto);
    return { success: true };
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get vitals history',
    description: 'Returns historical Core Web Vitals data for a URL with trend analysis.',
  })
  @ApiQuery({ name: 'url', description: 'URL to get history for' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO string)' })
  @ApiResponse({ status: 200, description: 'Vitals history', type: VitalsHistoryDto })
  async getVitalsHistory(
    @Query('url') url: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<VitalsHistoryDto> {
    return this.vitalsService.getVitalsHistory(
      url,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('mobile-friendly')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Check mobile friendliness',
    description: 'Analyzes a URL for mobile-friendliness issues.',
  })
  @ApiQuery({ name: 'url', description: 'URL to check' })
  @ApiResponse({ status: 200, description: 'Mobile friendliness result', type: MobileFriendlinessDto })
  async checkMobileFriendliness(@Query('url') url: string): Promise<MobileFriendlinessDto> {
    return this.vitalsService.checkMobileFriendliness(url);
  }

  @Get('pagespeed')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Get PageSpeed diagnostics',
    description: 'Returns detailed PageSpeed diagnostics and optimization opportunities.',
  })
  @ApiQuery({ name: 'url', description: 'URL to analyze' })
  @ApiResponse({
    status: 200,
    description: 'PageSpeed diagnostics',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        diagnostics: { type: 'array' },
        opportunities: { type: 'array' },
      },
    },
  })
  async getPageSpeedDiagnostics(@Query('url') url: string) {
    return this.vitalsService.getPageSpeedDiagnostics(url);
  }

  @Get('thresholds')
  @ApiOperation({
    summary: 'Get CWV thresholds',
    description: 'Returns the threshold values used to determine good/needs improvement/poor ratings.',
  })
  @ApiResponse({
    status: 200,
    description: 'CWV thresholds',
    schema: {
      type: 'object',
      properties: {
        lcp: {
          type: 'object',
          properties: {
            good: { type: 'number', example: 2500 },
            poor: { type: 'number', example: 4000 },
            unit: { type: 'string', example: 'ms' },
          },
        },
        inp: {
          type: 'object',
          properties: {
            good: { type: 'number', example: 200 },
            poor: { type: 'number', example: 500 },
            unit: { type: 'string', example: 'ms' },
          },
        },
        cls: {
          type: 'object',
          properties: {
            good: { type: 'number', example: 0.1 },
            poor: { type: 'number', example: 0.25 },
            unit: { type: 'string', example: '' },
          },
        },
      },
    },
  })
  getThresholds() {
    return {
      lcp: { good: 2500, poor: 4000, unit: 'ms', description: 'Largest Contentful Paint' },
      inp: { good: 200, poor: 500, unit: 'ms', description: 'Interaction to Next Paint' },
      cls: { good: 0.1, poor: 0.25, unit: '', description: 'Cumulative Layout Shift' },
      fcp: { good: 1800, poor: 3000, unit: 'ms', description: 'First Contentful Paint' },
      ttfb: { good: 800, poor: 1800, unit: 'ms', description: 'Time to First Byte' },
    };
  }
}
