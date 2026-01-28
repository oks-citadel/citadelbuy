import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { VoteReviewDto } from './dto/vote-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuthRequest } from '../../common/types/auth-request.types';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new review' })
  @ApiResponse({
    status: 201,
    description: 'Review created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'User has already reviewed this product',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  create(@Request() req: AuthRequest, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(req.user.id, createReviewDto);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get all reviews for a product' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['date', 'rating', 'helpful'],
    description: 'Sort reviews by (default: date)',
  })
  @ApiQuery({
    name: 'verifiedOnly',
    required: false,
    type: Boolean,
    description: 'Show only verified purchase reviews',
  })
  @ApiQuery({
    name: 'withPhotos',
    required: false,
    type: Boolean,
    description: 'Show only reviews with photos',
  })
  @ApiQuery({
    name: 'minRating',
    required: false,
    type: Number,
    description: 'Minimum rating filter (1-5)',
  })
  @ApiResponse({
    status: 200,
    description: 'Reviews retrieved successfully with pagination and stats',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  findByProduct(
    @Param('productId') productId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('sortBy', new DefaultValuePipe('date')) sortBy: 'date' | 'rating' | 'helpful',
    @Query('verifiedOnly') verifiedOnly?: boolean,
    @Query('withPhotos') withPhotos?: boolean,
    @Query('minRating') minRating?: number,
  ) {
    const filters = {
      verifiedOnly: verifiedOnly === true || verifiedOnly === 'true' as any,
      withPhotos: withPhotos === true || withPhotos === 'true' as any,
      minRating: minRating ? Number(minRating) : undefined,
    };
    return this.reviewsService.findByProduct(productId, page, limit, sortBy, filters);
  }

  @Get('product/:productId/stats')
  @ApiOperation({ summary: 'Get rating statistics for a product' })
  @ApiResponse({
    status: 200,
    description: 'Rating statistics retrieved successfully',
  })
  getProductStats(@Param('productId') productId: string) {
    return this.reviewsService.getProductRatingStats(productId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single review by ID' })
  @ApiResponse({
    status: 200,
    description: 'Review found',
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own review' })
  @ApiResponse({
    status: 200,
    description: 'Review updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Can only update own reviews',
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  update(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, req.user.id, updateReviewDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete own review' })
  @ApiResponse({
    status: 200,
    description: 'Review deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Can only delete own reviews',
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  remove(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.reviewsService.remove(id, req.user.id);
  }

  @Post(':id/vote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vote on a review (helpful/not helpful)' })
  @ApiResponse({
    status: 201,
    description: 'Vote recorded successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  vote(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() voteDto: VoteReviewDto,
  ) {
    return this.reviewsService.vote(id, req.user.id, voteDto);
  }

  @Get(':id/my-vote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user vote on a review' })
  @ApiResponse({
    status: 200,
    description: 'Vote status retrieved',
  })
  getMyVote(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.reviewsService.getUserVote(id, req.user.id);
  }

  // Admin endpoints
  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all reviews (Admin only)' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    description: 'Filter by status',
  })
  @ApiResponse({
    status: 200,
    description: 'Reviews retrieved successfully',
  })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED',
  ) {
    return this.reviewsService.findAll(page, limit, status);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update review status (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Review status updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'PENDING' | 'APPROVED' | 'REJECTED',
  ) {
    return this.reviewsService.updateStatus(id, status);
  }
}
