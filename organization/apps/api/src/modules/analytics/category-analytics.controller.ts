import { Controller, Get, Post, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CategoryAnalyticsService } from './category-analytics.service';
import {
  CategoryAnalyticsQueryDto,
  TrackCategoryEventDto,
  CategoryPerformanceDto,
  CategoryFunnelDto,
  CategoryComparisonDto,
} from './dto/category-analytics.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('analytics/categories')
@Controller('analytics/categories')
export class CategoryAnalyticsController {
  constructor(private readonly categoryAnalyticsService: CategoryAnalyticsService) {}

  @Post('track')
  @ApiOperation({ summary: 'Track category event (public endpoint for frontend tracking)' })
  @ApiResponse({
    status: 201,
    description: 'Event tracked successfully',
  })
  async trackEvent(@Body() dto: TrackCategoryEventDto, @Request() req: any) {
    await this.categoryAnalyticsService.trackEvent(dto, req);
    return { message: 'Event tracked successfully' };
  }

  @Get('performance/:categoryId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get comprehensive category performance analytics (Admin only)' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category performance analytics retrieved successfully',
    type: CategoryPerformanceDto,
  })
  async getCategoryPerformance(
    @Param('categoryId') categoryId: string,
    @Query() query: CategoryAnalyticsQueryDto,
  ): Promise<CategoryPerformanceDto> {
    return this.categoryAnalyticsService.getCategoryPerformance(categoryId, query);
  }

  @Get('funnel/:categoryId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get category conversion funnel (Admin only)' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category funnel data retrieved successfully',
    type: CategoryFunnelDto,
  })
  async getCategoryFunnel(
    @Param('categoryId') categoryId: string,
    @Query() query: CategoryAnalyticsQueryDto,
  ): Promise<CategoryFunnelDto> {
    return this.categoryAnalyticsService.getCategoryFunnel(categoryId, query);
  }

  @Get('comparison')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get category comparison analytics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Category comparison data retrieved successfully',
    type: CategoryComparisonDto,
  })
  async getCategoryComparison(@Query() query: CategoryAnalyticsQueryDto): Promise<CategoryComparisonDto> {
    return this.categoryAnalyticsService.getCategoryComparison(query);
  }

  @Get('trending')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get trending categories by views (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Trending categories retrieved successfully',
  })
  async getTrendingCategories(@Query() query: CategoryAnalyticsQueryDto) {
    return this.categoryAnalyticsService.getTrendingCategories(query);
  }

  @Get('timeseries/:categoryId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get category time-series data (Admin only)' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({
    status: 200,
    description: 'Category time-series data retrieved successfully',
  })
  async getCategoryTimeSeries(
    @Param('categoryId') categoryId: string,
    @Query() query: CategoryAnalyticsQueryDto,
  ) {
    return this.categoryAnalyticsService.getCategoryTimeSeries(categoryId, query);
  }

  @Post('aggregate')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually trigger category analytics aggregation (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Analytics aggregation triggered successfully',
  })
  async aggregateAnalytics() {
    await this.categoryAnalyticsService.aggregateCategoryAnalytics();
    return { message: 'Analytics aggregation completed successfully' };
  }
}
