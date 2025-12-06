import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { VoteReviewDto } from './dto/vote-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new review
   */
  async create(userId: string, createReviewDto: CreateReviewDto) {
    const { productId, rating, comment, images } = createReviewDto;

    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    // Check if user already reviewed this product
    const existingReview = await this.prisma.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingReview) {
      throw new ConflictException('You have already reviewed this product');
    }

    // Check if user purchased this product (for verified purchase badge)
    const hasPurchased = await this.prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          userId,
          status: 'DELIVERED',
        },
      },
    });

    // Create review with photo support
    // Note: images field not in Review model yet - storing in separate table or skipping
    const review = await this.prisma.review.create({
      data: {
        userId,
        productId,
        rating,
        comment,
        isVerifiedPurchase: !!hasPurchased,
        status: 'APPROVED', // Auto-approve for now, can be changed to PENDING for moderation
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return review;
  }

  /**
   * Get all reviews for a product
   */
  async findByProduct(
    productId: string,
    page: number = 1,
    limit: number = 10,
    sortBy: 'date' | 'rating' | 'helpful' = 'date',
    filters?: {
      verifiedOnly?: boolean;
      withPhotos?: boolean;
      minRating?: number;
    },
  ) {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    const skip = (page - 1) * limit;

    // Build where clause with filters
    const where: any = {
      productId,
      status: 'APPROVED',
    };

    if (filters?.verifiedOnly) {
      where.isVerifiedPurchase = true;
    }

    if (filters?.withPhotos) {
      where.images = {
        isEmpty: false,
      };
    }

    if (filters?.minRating) {
      where.rating = {
        gte: filters.minRating,
      };
    }

    // Build orderBy clause
    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'rating') {
      orderBy = { rating: 'desc' };
    } else if (sortBy === 'helpful') {
      orderBy = { helpfulCount: 'desc' };
    }

    // Get reviews
    const [reviews, total, stats] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.review.count({
        where,
      }),
      this.getProductRatingStats(productId),
    ]);

    return {
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    };
  }

  /**
   * Get product rating statistics
   */
  async getProductRatingStats(productId: string) {
    const reviews = await this.prisma.review.findMany({
      where: {
        productId,
        status: 'APPROVED',
      },
      select: {
        rating: true,
      },
    });

    const totalReviews = reviews.length;
    if (totalReviews === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0,
        },
      };
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / totalReviews;

    // Calculate rating distribution
    const ratingDistribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    return {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews,
      ratingDistribution,
    };
  }

  /**
   * Get a single review by ID
   */
  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID '${id}' not found`);
    }

    return review;
  }

  /**
   * Update a review
   */
  async update(id: string, userId: string, updateReviewDto: UpdateReviewDto) {
    const review = await this.findOne(id);

    // Only the review author can update their review
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    // Cannot update status via this endpoint (admin only)
    delete updateReviewDto.status;

    return this.prisma.review.update({
      where: { id },
      data: updateReviewDto,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Delete a review
   */
  async remove(id: string, userId: string) {
    const review = await this.findOne(id);

    // Only the review author can delete their review
    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.review.delete({
      where: { id },
    });

    return {
      message: 'Review deleted successfully',
      deletedId: id,
    };
  }

  /**
   * Vote on a review (helpful/not helpful)
   */
  async vote(reviewId: string, userId: string, voteDto: VoteReviewDto) {
    // Check if review exists
    const review = await this.findOne(reviewId);

    // Check if user already voted on this review
    const existingVote = await this.prisma.reviewVote.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId,
        },
      },
    });

    if (existingVote) {
      // Update existing vote
      await this.prisma.reviewVote.update({
        where: {
          reviewId_userId: {
            reviewId,
            userId,
          },
        },
        data: {
          isHelpful: voteDto.isHelpful,
        },
      });
    } else {
      // Create new vote
      await this.prisma.reviewVote.create({
        data: {
          reviewId,
          userId,
          isHelpful: voteDto.isHelpful,
        },
      });
    }

    // Update helpful count
    const helpfulCount = await this.prisma.reviewVote.count({
      where: {
        reviewId,
        isHelpful: true,
      },
    });

    await this.prisma.review.update({
      where: { id: reviewId },
      data: { helpfulCount },
    });

    return {
      message: 'Vote recorded successfully',
      helpfulCount,
    };
  }

  /**
   * Get user's vote on a review
   */
  async getUserVote(reviewId: string, userId: string) {
    const vote = await this.prisma.reviewVote.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId,
        },
      },
    });

    return vote;
  }

  /**
   * Admin: Update review status
   */
  async updateStatus(id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED') {
    const review = await this.findOne(id);

    return this.prisma.review.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Admin: Get all reviews (including pending)
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
    status?: 'PENDING' | 'APPROVED' | 'REJECTED',
  ) {
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
