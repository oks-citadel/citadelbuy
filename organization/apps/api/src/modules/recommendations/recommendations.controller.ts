import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserActionType } from '@prisma/client';
import { AuthRequest } from '../../common/types/auth-request.types';

@ApiTags('recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Post('track')
  @ApiOperation({ summary: 'Track user behavior (Public)' })
  trackBehavior(@Body() data: {
    userId?: string;
    sessionId?: string;
    productId?: string;
    categoryId?: string;
    actionType: UserActionType;
  }) {
    return this.recommendationsService.trackBehavior(data);
  }

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
  getFrequentlyBought(@Param('productId') productId: string) {
    return this.recommendationsService.getFrequentlyBoughtTogether(productId);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending products' })
  getTrending(@Query('limit') limit?: string) {
    return this.recommendationsService.getTrendingProducts(limit ? parseInt(limit) : 10);
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
}
