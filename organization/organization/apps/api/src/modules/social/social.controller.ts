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
import { SocialService } from './social.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/common/guards/optional-jwt-auth.guard';
import { ShareProductDto } from './dto/share-product.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { FollowVendorDto } from './dto/follow-vendor.dto';
import { TrackInteractionDto } from './dto/track-interaction.dto';
import { ActivityFeedType, InteractionType } from '@prisma/client';
import { AuthRequest, OptionalAuthRequest } from '@/common/types/auth-request.types';

@ApiTags('Social Features')
@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  // ==================== Product Sharing ====================

  @Post('share/product')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Share a product' })
  async shareProduct(@Request() req: AuthRequest, @Body() dto: ShareProductDto) {
    const userId = req.user?.id || null;
    return this.socialService.shareProduct(userId, dto);
  }

  @Get('share/product/:productId/stats')
  @ApiOperation({ summary: 'Get product share statistics' })
  async getProductShareStats(@Param('productId') productId: string) {
    return this.socialService.getProductShareStats(productId);
  }

  // ==================== Review Helpful ====================

  @Post('reviews/:reviewId/helpful')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark review as helpful or not' })
  async markReviewHelpful(
    @Request() req: AuthRequest,
    @Param('reviewId') reviewId: string,
    @Body() body: { isHelpful: boolean },
  ) {
    return this.socialService.markReviewHelpful(reviewId, req.user.id, body.isHelpful);
  }

  @Get('reviews/:reviewId/helpful/stats')
  @ApiOperation({ summary: 'Get review helpful statistics' })
  async getReviewHelpfulStats(@Param('reviewId') reviewId: string) {
    return this.socialService.getReviewHelpfulStats(reviewId);
  }

  // ==================== Vendor Following ====================

  @Post('follow/vendor')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow a vendor' })
  async followVendor(@Request() req: AuthRequest, @Body() dto: FollowVendorDto) {
    return this.socialService.followVendor(req.user.id, dto);
  }

  @Delete('follow/vendor/:vendorId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow a vendor' })
  async unfollowVendor(@Request() req: AuthRequest, @Param('vendorId') vendorId: string) {
    return this.socialService.unfollowVendor(req.user.id, vendorId);
  }

  @Get('follow/vendors')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get followed vendors' })
  async getFollowedVendors(
    @Request() req: AuthRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.socialService.getFollowedVendors(
      req.user.id,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('follow/vendor/:vendorId/followers')
  @ApiOperation({ summary: 'Get vendor followers' })
  async getVendorFollowers(
    @Param('vendorId') vendorId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.socialService.getVendorFollowers(
      vendorId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('follow/vendor/:vendorId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if following vendor' })
  async isFollowingVendor(@Request() req: AuthRequest, @Param('vendorId') vendorId: string) {
    const isFollowing = await this.socialService.isFollowingVendor(req.user.id, vendorId);
    return { isFollowing };
  }

  // ==================== Activity Feed ====================

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personalized activity feed' })
  async getUserFeed(
    @Request() req: AuthRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.socialService.getUserFeed(
      req.user.id,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('feed/user/:userId')
  @ApiOperation({ summary: 'Get user activity feed' })
  async getActivityFeed(
    @Param('userId') userId: string,
    @Query('activityType') activityType?: ActivityFeedType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.socialService.getActivityFeed({
      userId,
      activityType,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      isPublic: true,
    });
  }

  // ==================== User Interactions ====================

  @Post('interactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Track user interaction' })
  async trackInteraction(@Request() req: AuthRequest, @Body() dto: TrackInteractionDto) {
    return this.socialService.trackInteraction(req.user.id, dto);
  }

  @Get('interactions/stats')
  @ApiOperation({ summary: 'Get interaction statistics' })
  async getInteractionStats(
    @Query('targetType') targetType?: InteractionType,
    @Query('targetId') targetId?: string,
    @Query('interactionType') interactionType?: string,
  ) {
    return this.socialService.getInteractionStats({
      targetType,
      targetId,
      interactionType,
    });
  }

  // ==================== Social Comments ====================

  @Post('comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a comment' })
  async createComment(@Request() req: AuthRequest, @Body() dto: CreateCommentDto) {
    return this.socialService.createComment(req.user.id, dto);
  }

  @Get('comments')
  @ApiOperation({ summary: 'Get comments' })
  async getComments(
    @Query('targetType') targetType: string,
    @Query('targetId') targetId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.socialService.getComments({
      targetType,
      targetId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('comments/:commentId/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a comment' })
  async likeComment(@Param('commentId') commentId: string) {
    return this.socialService.likeComment(commentId);
  }

  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment' })
  async deleteComment(@Request() req: AuthRequest, @Param('commentId') commentId: string) {
    return this.socialService.deleteComment(commentId, req.user.id);
  }

  // ==================== User Badges ====================

  @Get('badges/:userId')
  @ApiOperation({ summary: 'Get user badges' })
  async getUserBadges(@Param('userId') userId: string) {
    return this.socialService.getUserBadges(userId);
  }
}
