import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let service: ReviewsService;

  const mockReviewsService = {
    create: jest.fn(),
    findByProduct: jest.fn(),
    getProductRatingStats: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    vote: jest.fn(),
    getUserVote: jest.fn(),
    findAll: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'CUSTOMER',
  };

  const mockReview = {
    id: 'review-1',
    userId: 'user-123',
    productId: 'product-1',
    rating: 5,
    title: 'Great product',
    comment: 'Very satisfied',
    status: 'APPROVED',
    helpful: 10,
    notHelpful: 2,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [
        {
          provide: ReviewsService,
          useValue: mockReviewsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .overrideGuard(AdminGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<ReviewsController>(ReviewsController);
    service = module.get<ReviewsService>(ReviewsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new review', async () => {
      const mockRequest = { user: mockUser };
      const createDto = {
        productId: 'product-1',
        rating: 5,
        title: 'Great product',
        comment: 'Very satisfied',
      };

      mockReviewsService.create.mockResolvedValue(mockReview);

      const result = await controller.create(mockRequest as any, createDto);

      expect(result).toEqual(mockReview);
      expect(mockReviewsService.create).toHaveBeenCalledWith('user-123', createDto);
    });
  });

  describe('findByProduct', () => {
    it('should return paginated reviews for a product', async () => {
      const productId = 'product-1';
      const mockResponse = {
        reviews: [mockReview],
        total: 1,
        page: 1,
        totalPages: 1,
        stats: {
          averageRating: 5,
          totalReviews: 1,
        },
      };

      mockReviewsService.findByProduct.mockResolvedValue(mockResponse);

      const result = await controller.findByProduct(productId, 1, 10, 'date');

      expect(result).toEqual(mockResponse);
      expect(mockReviewsService.findByProduct).toHaveBeenCalledWith('product-1', 1, 10, 'date');
    });

    it('should use default pagination and sort values', async () => {
      const mockResponse = {
        reviews: [],
        total: 0,
        page: 1,
        totalPages: 0,
      };

      mockReviewsService.findByProduct.mockResolvedValue(mockResponse);

      const result = await controller.findByProduct('product-1', 1, 10, 'date');

      expect(result).toEqual(mockResponse);
    });

    it('should sort by rating when specified', async () => {
      const mockResponse = {
        reviews: [mockReview],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockReviewsService.findByProduct.mockResolvedValue(mockResponse);

      await controller.findByProduct('product-1', 1, 10, 'rating');

      expect(mockReviewsService.findByProduct).toHaveBeenCalledWith('product-1', 1, 10, 'rating');
    });

    it('should sort by helpful when specified', async () => {
      const mockResponse = {
        reviews: [mockReview],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockReviewsService.findByProduct.mockResolvedValue(mockResponse);

      await controller.findByProduct('product-1', 1, 10, 'helpful');

      expect(mockReviewsService.findByProduct).toHaveBeenCalledWith('product-1', 1, 10, 'helpful');
    });
  });

  describe('getProductStats', () => {
    it('should return rating statistics for a product', async () => {
      const productId = 'product-1';
      const mockStats = {
        averageRating: 4.5,
        totalReviews: 100,
        ratingDistribution: {
          5: 50,
          4: 30,
          3: 15,
          2: 3,
          1: 2,
        },
      };

      mockReviewsService.getProductRatingStats.mockResolvedValue(mockStats);

      const result = await controller.getProductStats(productId);

      expect(result).toEqual(mockStats);
      expect(mockReviewsService.getProductRatingStats).toHaveBeenCalledWith('product-1');
    });
  });

  describe('findOne', () => {
    it('should return a single review by id', async () => {
      mockReviewsService.findOne.mockResolvedValue(mockReview);

      const result = await controller.findOne('review-1');

      expect(result).toEqual(mockReview);
      expect(mockReviewsService.findOne).toHaveBeenCalledWith('review-1');
    });
  });

  describe('update', () => {
    it('should update own review', async () => {
      const mockRequest = { user: mockUser };
      const updateDto = {
        rating: 4,
        title: 'Updated title',
        comment: 'Updated comment',
      };

      const updatedReview = { ...mockReview, ...updateDto };
      mockReviewsService.update.mockResolvedValue(updatedReview);

      const result = await controller.update('review-1', mockRequest as any, updateDto);

      expect(result).toEqual(updatedReview);
      expect(mockReviewsService.update).toHaveBeenCalledWith('review-1', 'user-123', updateDto);
    });
  });

  describe('remove', () => {
    it('should delete own review', async () => {
      const mockRequest = { user: mockUser };
      const mockResponse = { message: 'Review deleted successfully' };

      mockReviewsService.remove.mockResolvedValue(mockResponse);

      const result = await controller.remove('review-1', mockRequest as any);

      expect(result).toEqual(mockResponse);
      expect(mockReviewsService.remove).toHaveBeenCalledWith('review-1', 'user-123');
    });
  });

  describe('vote', () => {
    it('should record a vote on a review', async () => {
      const mockRequest = { user: mockUser };
      const voteDto = { isHelpful: true };
      const mockResponse = { message: 'Vote recorded successfully' };

      mockReviewsService.vote.mockResolvedValue(mockResponse);

      const result = await controller.vote('review-1', mockRequest as any, voteDto);

      expect(result).toEqual(mockResponse);
      expect(mockReviewsService.vote).toHaveBeenCalledWith('review-1', 'user-123', voteDto);
    });

    it('should record a negative vote', async () => {
      const mockRequest = { user: mockUser };
      const voteDto = { isHelpful: false };
      const mockResponse = { message: 'Vote recorded successfully' };

      mockReviewsService.vote.mockResolvedValue(mockResponse);

      await controller.vote('review-1', mockRequest as any, voteDto);

      expect(mockReviewsService.vote).toHaveBeenCalledWith('review-1', 'user-123', voteDto);
    });
  });

  describe('getMyVote', () => {
    it('should return current user vote on a review', async () => {
      const mockRequest = { user: mockUser };
      const mockVote = { isHelpful: true, votedAt: new Date() };

      mockReviewsService.getUserVote.mockResolvedValue(mockVote);

      const result = await controller.getMyVote('review-1', mockRequest as any);

      expect(result).toEqual(mockVote);
      expect(mockReviewsService.getUserVote).toHaveBeenCalledWith('review-1', 'user-123');
    });

    it('should return null when user has not voted', async () => {
      const mockRequest = { user: mockUser };

      mockReviewsService.getUserVote.mockResolvedValue(null);

      const result = await controller.getMyVote('review-1', mockRequest as any);

      expect(result).toBeNull();
    });
  });

  describe('findAll (Admin)', () => {
    it('should return all reviews for admin', async () => {
      const mockResponse = {
        reviews: [mockReview],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockReviewsService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(1, 20, undefined);

      expect(result).toEqual(mockResponse);
      expect(mockReviewsService.findAll).toHaveBeenCalledWith(1, 20, undefined);
    });

    it('should filter reviews by status', async () => {
      const mockResponse = {
        reviews: [mockReview],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockReviewsService.findAll.mockResolvedValue(mockResponse);

      await controller.findAll(1, 20, 'PENDING');

      expect(mockReviewsService.findAll).toHaveBeenCalledWith(1, 20, 'PENDING');
    });
  });

  describe('updateStatus (Admin)', () => {
    it('should update review status', async () => {
      const mockResponse = { ...mockReview, status: 'APPROVED' };

      mockReviewsService.updateStatus.mockResolvedValue(mockResponse);

      const result = await controller.updateStatus('review-1', 'APPROVED');

      expect(result).toEqual(mockResponse);
      expect(mockReviewsService.updateStatus).toHaveBeenCalledWith('review-1', 'APPROVED');
    });

    it('should reject a review', async () => {
      const mockResponse = { ...mockReview, status: 'REJECTED' };

      mockReviewsService.updateStatus.mockResolvedValue(mockResponse);

      await controller.updateStatus('review-1', 'REJECTED');

      expect(mockReviewsService.updateStatus).toHaveBeenCalledWith('review-1', 'REJECTED');
    });
  });
});
