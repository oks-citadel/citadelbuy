import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
    },
    review: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    orderItem: {
      findFirst: jest.fn(),
    },
    reviewVote: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockProduct = {
    id: 'product-123',
    name: 'Test Product',
  };

  const mockReview = {
    id: 'review-123',
    userId: 'user-123',
    productId: 'product-123',
    rating: 5,
    comment: 'Great product!',
    isVerifiedPurchase: true,
    status: 'APPROVED',
    helpfulCount: 10,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    user: {
      id: 'user-123',
      name: 'Test User',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a review with verified purchase', async () => {
      // Arrange
      const userId = 'user-123';
      const createReviewDto = {
        productId: 'product-123',
        rating: 5,
        comment: 'Excellent product!',
      };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.review.findUnique.mockResolvedValue(null);
      mockPrismaService.orderItem.findFirst.mockResolvedValue({
        id: 'order-item-1',
      });
      mockPrismaService.review.create.mockResolvedValue(mockReview);

      // Act
      const result = await service.create(userId, createReviewDto);

      // Assert
      expect(result).toEqual(mockReview);
      expect(mockPrismaService.review.create).toHaveBeenCalledWith({
        data: {
          userId,
          productId: createReviewDto.productId,
          rating: createReviewDto.rating,
          comment: createReviewDto.comment,
          isVerifiedPurchase: true,
          status: 'APPROVED',
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
    });

    it('should create a review without verified purchase', async () => {
      // Arrange
      const userId = 'user-123';
      const createReviewDto = {
        productId: 'product-123',
        rating: 4,
        comment: 'Good product',
      };
      const unverifiedReview = { ...mockReview, isVerifiedPurchase: false };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.review.findUnique.mockResolvedValue(null);
      mockPrismaService.orderItem.findFirst.mockResolvedValue(null);
      mockPrismaService.review.create.mockResolvedValue(unverifiedReview);

      // Act
      const result = await service.create(userId, createReviewDto);

      // Assert
      expect(result.isVerifiedPurchase).toBe(false);
    });

    it('should throw NotFoundException when product does not exist', async () => {
      // Arrange
      const userId = 'user-123';
      const createReviewDto = {
        productId: 'non-existent-product',
        rating: 5,
        comment: 'Great!',
      };
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(userId, createReviewDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(userId, createReviewDto)).rejects.toThrow(
        "Product with ID 'non-existent-product' not found",
      );
    });

    it('should throw ConflictException when user already reviewed the product', async () => {
      // Arrange
      const userId = 'user-123';
      const createReviewDto = {
        productId: 'product-123',
        rating: 5,
        comment: 'Great!',
      };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);

      // Act & Assert
      await expect(service.create(userId, createReviewDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(userId, createReviewDto)).rejects.toThrow(
        'You have already reviewed this product',
      );
    });
  });

  describe('findByProduct', () => {
    it('should return paginated reviews with stats', async () => {
      // Arrange
      const productId = 'product-123';
      const mockReviews = [mockReview];
      const mockStats = {
        averageRating: 4.5,
        totalReviews: 10,
        ratingDistribution: { 5: 5, 4: 3, 3: 1, 2: 1, 1: 0 },
      };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.review.findMany
        .mockResolvedValueOnce(mockReviews)
        .mockResolvedValueOnce([
          { rating: 5 },
          { rating: 4 },
          { rating: 5 },
        ]);
      mockPrismaService.review.count.mockResolvedValue(10);

      // Act
      const result = await service.findByProduct(productId, 1, 10, 'date');

      // Assert
      expect(result.reviews).toEqual(mockReviews);
      expect(result.pagination).toEqual({
        total: 10,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(result.stats).toBeDefined();
    });

    it('should sort reviews by rating', async () => {
      // Arrange
      const productId = 'product-123';
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.review.findMany.mockResolvedValue([]);
      mockPrismaService.review.count.mockResolvedValue(0);

      // Act
      await service.findByProduct(productId, 1, 10, 'rating');

      // Assert
      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { rating: 'desc' },
        }),
      );
    });

    it('should sort reviews by helpful count', async () => {
      // Arrange
      const productId = 'product-123';
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.review.findMany.mockResolvedValue([]);
      mockPrismaService.review.count.mockResolvedValue(0);

      // Act
      await service.findByProduct(productId, 1, 10, 'helpful');

      // Assert
      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { helpfulCount: 'desc' },
        }),
      );
    });

    it('should throw NotFoundException when product does not exist', async () => {
      // Arrange
      const productId = 'non-existent-product';
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findByProduct(productId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProductRatingStats', () => {
    it('should return correct rating statistics', async () => {
      // Arrange
      const productId = 'product-123';
      const mockReviews = [
        { rating: 5 },
        { rating: 5 },
        { rating: 4 },
        { rating: 3 },
        { rating: 5 },
      ];
      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);

      // Act
      const result = await service.getProductRatingStats(productId);

      // Assert
      expect(result).toEqual({
        averageRating: 4.4, // (5+5+4+3+5)/5 = 4.4
        totalReviews: 5,
        ratingDistribution: {
          5: 3,
          4: 1,
          3: 1,
          2: 0,
          1: 0,
        },
      });
    });

    it('should return zeros when no reviews exist', async () => {
      // Arrange
      const productId = 'product-123';
      mockPrismaService.review.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getProductRatingStats(productId);

      // Assert
      expect(result).toEqual({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0,
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a review by ID', async () => {
      // Arrange
      const reviewId = 'review-123';
      const reviewWithProduct = {
        ...mockReview,
        product: mockProduct,
      };
      mockPrismaService.review.findUnique.mockResolvedValue(reviewWithProduct);

      // Act
      const result = await service.findOne(reviewId);

      // Assert
      expect(result).toEqual(reviewWithProduct);
    });

    it('should throw NotFoundException when review not found', async () => {
      // Arrange
      const reviewId = 'non-existent-review';
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(reviewId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(reviewId)).rejects.toThrow(
        "Review with ID 'non-existent-review' not found",
      );
    });
  });

  describe('update', () => {
    it('should update a review successfully', async () => {
      // Arrange
      const reviewId = 'review-123';
      const userId = 'user-123';
      const updateReviewDto = {
        rating: 4,
        comment: 'Updated comment',
      };
      const updatedReview = { ...mockReview, ...updateReviewDto };
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.update.mockResolvedValue(updatedReview);

      // Act
      const result = await service.update(reviewId, userId, updateReviewDto);

      // Assert
      expect(result).toEqual(updatedReview);
      expect(mockPrismaService.review.update).toHaveBeenCalledWith({
        where: { id: reviewId },
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
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      // Arrange
      const reviewId = 'review-123';
      const differentUserId = 'different-user';
      const updateReviewDto = { comment: 'Trying to update' };
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);

      // Act & Assert
      await expect(
        service.update(reviewId, differentUserId, updateReviewDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(reviewId, differentUserId, updateReviewDto),
      ).rejects.toThrow('You can only update your own reviews');
    });

    it('should remove status field from update DTO', async () => {
      // Arrange
      const reviewId = 'review-123';
      const userId = 'user-123';
      const updateReviewDto: any = {
        rating: 4,
        comment: 'Updated',
        status: 'PENDING',
      };
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.update.mockResolvedValue(mockReview);

      // Act
      await service.update(reviewId, userId, updateReviewDto);

      // Assert
      expect(updateReviewDto.status).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('should delete a review successfully', async () => {
      // Arrange
      const reviewId = 'review-123';
      const userId = 'user-123';
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.delete.mockResolvedValue(mockReview);

      // Act
      const result = await service.remove(reviewId, userId);

      // Assert
      expect(result).toEqual({
        message: 'Review deleted successfully',
        deletedId: reviewId,
      });
      expect(mockPrismaService.review.delete).toHaveBeenCalledWith({
        where: { id: reviewId },
      });
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      // Arrange
      const reviewId = 'review-123';
      const differentUserId = 'different-user';
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);

      // Act & Assert
      await expect(
        service.remove(reviewId, differentUserId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.remove(reviewId, differentUserId),
      ).rejects.toThrow('You can only delete your own reviews');
    });
  });

  describe('vote', () => {
    it('should create a new vote', async () => {
      // Arrange
      const reviewId = 'review-123';
      const userId = 'voter-123';
      const voteDto = { isHelpful: true };
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.reviewVote.findUnique.mockResolvedValue(null);
      mockPrismaService.reviewVote.create.mockResolvedValue({
        reviewId,
        userId,
        isHelpful: true,
      });
      mockPrismaService.reviewVote.count.mockResolvedValue(11);
      mockPrismaService.review.update.mockResolvedValue({
        ...mockReview,
        helpfulCount: 11,
      });

      // Act
      const result = await service.vote(reviewId, userId, voteDto);

      // Assert
      expect(result).toEqual({
        message: 'Vote recorded successfully',
        helpfulCount: 11,
      });
      expect(mockPrismaService.reviewVote.create).toHaveBeenCalledWith({
        data: {
          reviewId,
          userId,
          isHelpful: true,
        },
      });
    });

    it('should update an existing vote', async () => {
      // Arrange
      const reviewId = 'review-123';
      const userId = 'voter-123';
      const voteDto = { isHelpful: false };
      const existingVote = { reviewId, userId, isHelpful: true };
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.reviewVote.findUnique.mockResolvedValue(existingVote);
      mockPrismaService.reviewVote.update.mockResolvedValue({
        ...existingVote,
        isHelpful: false,
      });
      mockPrismaService.reviewVote.count.mockResolvedValue(9);
      mockPrismaService.review.update.mockResolvedValue({
        ...mockReview,
        helpfulCount: 9,
      });

      // Act
      const result = await service.vote(reviewId, userId, voteDto);

      // Assert
      expect(result.helpfulCount).toBe(9);
      expect(mockPrismaService.reviewVote.update).toHaveBeenCalled();
    });
  });

  describe('getUserVote', () => {
    it('should return user vote if exists', async () => {
      // Arrange
      const reviewId = 'review-123';
      const userId = 'voter-123';
      const mockVote = { reviewId, userId, isHelpful: true };
      mockPrismaService.reviewVote.findUnique.mockResolvedValue(mockVote);

      // Act
      const result = await service.getUserVote(reviewId, userId);

      // Assert
      expect(result).toEqual(mockVote);
    });

    it('should return null if no vote exists', async () => {
      // Arrange
      const reviewId = 'review-123';
      const userId = 'voter-123';
      mockPrismaService.reviewVote.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.getUserVote(reviewId, userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update review status successfully', async () => {
      // Arrange
      const reviewId = 'review-123';
      const status = 'REJECTED';
      const updatedReview = {
        ...mockReview,
        status,
        product: mockProduct,
      };
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.update.mockResolvedValue(updatedReview);

      // Act
      const result = await service.updateStatus(reviewId, status);

      // Assert
      expect(result.status).toBe(status);
      expect(mockPrismaService.review.update).toHaveBeenCalledWith({
        where: { id: reviewId },
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
    });
  });

  describe('findAll', () => {
    it('should return all reviews with pagination', async () => {
      // Arrange
      const mockReviews = [mockReview];
      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);
      mockPrismaService.review.count.mockResolvedValue(25);

      // Act
      const result = await service.findAll(1, 20);

      // Assert
      expect(result.reviews).toEqual(mockReviews);
      expect(result.pagination).toEqual({
        total: 25,
        page: 1,
        limit: 20,
        totalPages: 2,
      });
    });

    it('should filter reviews by status', async () => {
      // Arrange
      const mockReviews = [mockReview];
      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);
      mockPrismaService.review.count.mockResolvedValue(5);

      // Act
      await service.findAll(1, 20, 'PENDING');

      // Assert
      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING' },
        }),
      );
    });
  });
});
