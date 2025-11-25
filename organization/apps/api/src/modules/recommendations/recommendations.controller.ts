import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Headers, Optional } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserActionType } from '@prisma/client';
import { AuthRequest } from '../../common/types/auth-request.types';

@ApiTags('recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  // ==================== Behavior Tracking ====================

  @Post('track')
  @ApiOperation({ summary: 'Track user behavior (Public)' })
  trackBehavior(@Body() data: {
    userId?: string;
    sessionId?: string;
    productId?: string;
    categoryId?: string;
    actionType: UserActionType;
    searchQuery?: string;
    metadata?: any;
  }) {
    return this.recommendationsService.trackBehavior(data);
  }

  @Post('track/recommendation-click')
  @ApiOperation({ summary: 'Track when user clicks on a recommendation' })
  trackRecommendationClick(
    @Body() data: {
      productId: string;
      userId?: string;
      sessionId?: string;
      recommendationType?: string;
      position?: number;
    },
  ) {
    return this.recommendationsService.logRecommendationEvent(
      data.productId,
      data.userId,
      data.sessionId,
      data.recommendationType,
      data.position,
    );
  }

  // ==================== Homepage Recommendations ====================

  @Get('homepage')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get all homepage recommendation sections' })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiResponse({
    status: 200,
    description: 'Returns multiple recommendation sections for homepage',
  })
  async getHomepageRecommendations(
    @Request() req: AuthRequest,
    @Query('sessionId') sessionId?: string,
  ) {
    const userId = req.user?.id;
    return this.recommendationsService.getHomepageRecommendations(userId, sessionId);
  }

  // ==================== User Personalized Recommendations ====================

  @Get('personalized')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personalized recommendations' })
  getPersonalized(@Request() req: AuthRequest, @Query('limit') limit?: string) {
    return this.recommendationsService.getPersonalizedRecommendations(
      req.user.id,
      limit ? parseInt(limit) : 10
    );
  }

  @Get('for-you')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get collaborative filtering based recommendations' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getForYou(@Request() req: AuthRequest, @Query('limit') limit?: string) {
    return this.recommendationsService.getCollaborativeFilteringRecommendations(
      req.user.id,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('user-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user preference profile' })
  async getUserProfile(@Request() req: AuthRequest) {
    return this.recommendationsService.buildUserPreferenceProfile(req.user.id);
  }

  @Get('recently-viewed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recently viewed products' })
  getRecentlyViewed(@Request() req: AuthRequest, @Query('limit') limit?: string) {
    return this.recommendationsService.getRecentlyViewed(
      req.user.id,
      limit ? parseInt(limit) : 10
    );
  }

  // ==================== Product Page Recommendations ====================

  @Get('product/:productId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get all recommendation sections for a product page' })
  async getProductPageRecommendations(
    @Param('productId') productId: string,
    @Request() req: AuthRequest,
  ) {
    return this.recommendationsService.getProductPageRecommendations(
      productId,
      req.user?.id,
    );
  }

  @Get('similar/:productId')
  @ApiOperation({ summary: 'Get similar products' })
  getSimilar(@Param('productId') productId: string, @Query('limit') limit?: string) {
    return this.recommendationsService.getSimilarProducts(
      productId,
      limit ? parseInt(limit) : 6
    );
  }

  @Get('frequently-bought-together/:productId')
  @ApiOperation({ summary: 'Get frequently bought together' })
  getFrequentlyBought(@Param('productId') productId: string, @Query('limit') limit?: string) {
    return this.recommendationsService.getFrequentlyBoughtTogether(
      productId,
      limit ? parseInt(limit) : 4,
    );
  }

  @Get('complementary/:productId')
  @ApiOperation({ summary: 'Get complementary products from different categories' })
  getComplementary(@Param('productId') productId: string, @Query('limit') limit?: string) {
    return this.recommendationsService.getComplementaryProducts(
      productId,
      limit ? parseInt(limit) : 6,
    );
  }

  // ==================== Cart Recommendations ====================

  @Post('cart')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get recommendations based on cart contents' })
  async getCartRecommendations(
    @Body() body: { productIds: string[] },
    @Request() req: AuthRequest,
    @Query('limit') limit?: string,
  ) {
    return this.recommendationsService.getCartRecommendations(
      body.productIds,
      req.user?.id,
      limit ? parseInt(limit) : 8,
    );
  }

  // ==================== Browse/Discovery ====================

  @Get('trending')
  @ApiOperation({ summary: 'Get trending products' })
  getTrending(@Query('limit') limit?: string) {
    return this.recommendationsService.getTrendingProducts(limit ? parseInt(limit) : 10);
  }

  @Get('new-arrivals')
  @ApiOperation({ summary: 'Get new arrival products' })
  getNewArrivals(@Query('limit') limit?: string) {
    return this.recommendationsService.getNewArrivals(limit ? parseInt(limit) : 12);
  }

  @Get('best-sellers')
  @ApiOperation({ summary: 'Get best selling products' })
  getBestSellers(@Query('limit') limit?: string) {
    return this.recommendationsService.getBestSellers(limit ? parseInt(limit) : 12);
  }

  @Get('category/:categoryId')
  @ApiOperation({ summary: 'Get recommendations by category' })
  getByCategory(@Param('categoryId') categoryId: string, @Query('limit') limit?: string) {
    return this.recommendationsService.getRecommendationsByCategory(
      categoryId,
      limit ? parseInt(limit) : 10,
    );
  }

  // ==================== Admin Endpoints ====================

  @Get('admin/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recommendation performance analytics (Admin)' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.recommendationsService.getRecommendationAnalytics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Post('admin/precompute')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger precomputation of recommendations (Admin)' })
  async triggerPrecompute(@Query('batchSize') batchSize?: string) {
    return this.recommendationsService.precomputeRecommendations(
      batchSize ? parseInt(batchSize) : 100,
    );
  }

  @Post('admin/recompute-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Recompute all product recommendations (Admin)' })
  async recomputeAll() {
    return this.recommendationsService.recomputeAllRecommendations();
  }

  @Post('admin/cleanup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clean up old behavior data (Admin)' })
  @ApiQuery({ name: 'daysToKeep', required: false })
  async cleanup(@Query('daysToKeep') daysToKeep?: string) {
    return this.recommendationsService.cleanupOldBehaviorData(
      daysToKeep ? parseInt(daysToKeep) : 180,
    );
  }
}
