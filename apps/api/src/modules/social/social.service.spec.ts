import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { SocialService } from './social.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ActivityFeedType, UserRole } from '@prisma/client';

describe('SocialService', () => {
  let service: SocialService;
  let prisma: PrismaService;

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
    },
    productShare: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    review: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    reviewHelpful: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    vendorFollow: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    activityFeed: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    userInteraction: {
      create: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    socialComment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    userBadge: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockProduct = {
    id: 'product-123',
    name: 'Test Product',
    slug: 'test-product',
    images: ['https://example.com/image.jpg'],
  };

  const mockProductShare = {
    id: 'share-123',
    productId: 'product-123',
    userId: 'user-123',
    platform: 'FACEBOOK',
    shareUrl: 'https://facebook.com/share/123',
    createdAt: new Date('2025-01-15T10:00:00Z'),
  };

  const mockReview = {
    id: 'review-123',
    productId: 'product-123',
    userId: 'user-456',
    rating: 5,
    comment: 'Great product!',
    helpfulCount: 10,
    createdAt: new Date('2025-01-15T10:00:00Z'),
  };

  const mockVendor = {
    id: 'vendor-123',
    name: 'Test Vendor',
    email: 'vendor@example.com',
    role: UserRole.VENDOR,
    vendorProfile: {
      storeName: 'Test Store',
    },
  };

  const mockVendorFollow = {
    id: 'follow-123',
    userId: 'user-123',
    vendorId: 'vendor-123',
    notifyOnNewProducts: true,
    notifyOnDeals: true,
    createdAt: new Date('2025-01-15T10:00:00Z'),
  };

  const mockActivityFeed = {
    id: 'activity-123',
    userId: 'user-123',
    activityType: ActivityFeedType.PRODUCT_SHARED,
    title: 'Shared Test Product',
    description: 'Shared on Facebook',
    metadata: { productId: 'product-123' },
    imageUrl: 'https://example.com/image.jpg',
    linkUrl: '/products/test-product',
    isPublic: true,
    createdAt: new Date('2025-01-15T10:00:00Z'),
  };

  const mockSocialComment = {
    id: 'comment-123',
    userId: 'user-123',
    targetType: 'PRODUCT',
    targetId: 'product-123',
    comment: 'Nice product!',
    parentId: null,
    likesCount: 5,
    isHidden: false,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    user: {
      id: 'user-123',
      name: 'John Doe',
    },
    replies: [],
  };

  const mockUserBadge = {
    id: 'badge-123',
    userId: 'user-123',
    badgeType: 'TOP_REVIEWER',
    title: 'Top Reviewer',
    description: 'Left 100 helpful reviews',
    iconUrl: 'https://example.com/badge.png',
    earnedAt: new Date('2025-01-15T10:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SocialService>(SocialService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('shareProduct', () => {
    it('should share a product successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const dto = {
        productId: 'product-123',
        platform: 'FACEBOOK',
        shareUrl: 'https://facebook.com/share/123',
      };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.productShare.create.mockResolvedValue(mockProductShare);
      mockPrismaService.activityFeed.create.mockResolvedValue(mockActivityFeed);

      // Act
      const result = await service.shareProduct(userId, dto);

      // Assert
      expect(result).toEqual(mockProductShare);
      expect(mockPrismaService.productShare.create).toHaveBeenCalledWith({
        data: {
          productId: dto.productId,
          userId,
          platform: dto.platform,
          shareUrl: dto.shareUrl,
        },
      });
    });

    it('should share product anonymously (userId is null)', async () => {
      // Arrange
      const dto = {
        productId: 'product-123',
        platform: 'TWITTER',
        shareUrl: 'https://twitter.com/share/123',
      };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.productShare.create.mockResolvedValue({
        ...mockProductShare,
        userId: null,
      });

      // Act
      const result = await service.shareProduct(null, dto);

      // Assert
      expect(result.userId).toBeNull();
      expect(mockPrismaService.activityFeed.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when product does not exist', async () => {
      // Arrange
      const userId = 'user-123';
      const dto = {
        productId: 'non-existent',
        platform: 'FACEBOOK',
        shareUrl: 'https://facebook.com/share/123',
      };
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.shareProduct(userId, dto)).rejects.toThrow(NotFoundException);
      await expect(service.shareProduct(userId, dto)).rejects.toThrow('Product not found');
    });
  });

  describe('getProductShareStats', () => {
    it('should return share statistics for a product', async () => {
      // Arrange
      const productId = 'product-123';
      const mockShares = [
        { ...mockProductShare, platform: 'FACEBOOK' },
        { ...mockProductShare, id: 'share-456', platform: 'FACEBOOK' },
        { ...mockProductShare, id: 'share-789', platform: 'TWITTER' },
      ];
      mockPrismaService.productShare.findMany.mockResolvedValue(mockShares);

      // Act
      const result = await service.getProductShareStats(productId);

      // Assert
      expect(result).toEqual({
        totalShares: 3,
        byPlatform: {
          FACEBOOK: 2,
          TWITTER: 1,
        },
      });
    });

    it('should return zero stats when no shares exist', async () => {
      // Arrange
      const productId = 'product-123';
      mockPrismaService.productShare.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getProductShareStats(productId);

      // Assert
      expect(result).toEqual({
        totalShares: 0,
        byPlatform: {},
      });
    });
  });

  describe('markReviewHelpful', () => {
    it('should create new helpful mark', async () => {
      // Arrange
      const reviewId = 'review-123';
      const userId = 'user-123';
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.reviewHelpful.findUnique.mockResolvedValue(null);
      mockPrismaService.reviewHelpful.create.mockResolvedValue({
        id: 'helpful-123',
        reviewId,
        userId,
        isHelpful: true,
      });
      mockPrismaService.review.update.mockResolvedValue({
        ...mockReview,
        helpfulCount: 11,
      });

      // Act
      const result = await service.markReviewHelpful(reviewId, userId, true);

      // Assert
      expect(result).toEqual({ created: true });
    });

    it('should remove existing helpful mark when same value', async () => {
      // Arrange
      const reviewId = 'review-123';
      const userId = 'user-123';
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.reviewHelpful.findUnique.mockResolvedValue({
        id: 'helpful-123',
        reviewId,
        userId,
        isHelpful: true,
      });
      mockPrismaService.reviewHelpful.delete.mockResolvedValue({});
      mockPrismaService.review.update.mockResolvedValue({
        ...mockReview,
        helpfulCount: 9,
      });

      // Act
      const result = await service.markReviewHelpful(reviewId, userId, true);

      // Assert
      expect(result).toEqual({ removed: true });
    });

    it('should update existing helpful mark when value changes', async () => {
      // Arrange
      const reviewId = 'review-123';
      const userId = 'user-123';
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.reviewHelpful.findUnique.mockResolvedValue({
        id: 'helpful-123',
        reviewId,
        userId,
        isHelpful: false,
      });
      mockPrismaService.reviewHelpful.update.mockResolvedValue({});
      mockPrismaService.review.update.mockResolvedValue({});

      // Act
      const result = await service.markReviewHelpful(reviewId, userId, true);

      // Assert
      expect(result).toEqual({ updated: true });
    });

    it('should throw NotFoundException when review does not exist', async () => {
      // Arrange
      const reviewId = 'non-existent';
      const userId = 'user-123';
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.markReviewHelpful(reviewId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getReviewHelpfulStats', () => {
    it('should return helpful statistics for a review', async () => {
      // Arrange
      const reviewId = 'review-123';
      mockPrismaService.reviewHelpful.count
        .mockResolvedValueOnce(15) // helpful
        .mockResolvedValueOnce(5); // not helpful

      // Act
      const result = await service.getReviewHelpfulStats(reviewId);

      // Assert
      expect(result).toEqual({
        helpful: 15,
        notHelpful: 5,
        total: 20,
        ratio: 75,
      });
    });

    it('should return zero ratio when no votes', async () => {
      // Arrange
      const reviewId = 'review-123';
      mockPrismaService.reviewHelpful.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      // Act
      const result = await service.getReviewHelpfulStats(reviewId);

      // Assert
      expect(result.ratio).toBe(0);
    });
  });

  describe('followVendor', () => {
    it('should follow a vendor successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const dto = {
        vendorId: 'vendor-123',
        notifyOnNewProducts: true,
        notifyOnDeals: false,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockVendor);
      mockPrismaService.vendorFollow.findUnique.mockResolvedValue(null);
      mockPrismaService.vendorFollow.create.mockResolvedValue(mockVendorFollow);
      mockPrismaService.activityFeed.create.mockResolvedValue(mockActivityFeed);

      // Act
      const result = await service.followVendor(userId, dto);

      // Assert
      expect(result).toEqual(mockVendorFollow);
    });

    it('should throw NotFoundException when vendor does not exist', async () => {
      // Arrange
      const userId = 'user-123';
      const dto = { vendorId: 'non-existent' };
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.followVendor(userId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user is not a vendor', async () => {
      // Arrange
      const userId = 'user-123';
      const dto = { vendorId: 'regular-user' };
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockVendor,
        role: UserRole.CUSTOMER,
      });

      // Act & Assert
      await expect(service.followVendor(userId, dto)).rejects.toThrow(BadRequestException);
      await expect(service.followVendor(userId, dto)).rejects.toThrow('User is not a vendor');
    });

    it('should throw BadRequestException when trying to follow self', async () => {
      // Arrange
      const userId = 'vendor-123';
      const dto = { vendorId: 'vendor-123' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockVendor);

      // Act & Assert
      await expect(service.followVendor(userId, dto)).rejects.toThrow(BadRequestException);
      await expect(service.followVendor(userId, dto)).rejects.toThrow('Cannot follow yourself');
    });

    it('should throw ConflictException when already following', async () => {
      // Arrange
      const userId = 'user-123';
      const dto = { vendorId: 'vendor-123' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockVendor);
      mockPrismaService.vendorFollow.findUnique.mockResolvedValue(mockVendorFollow);

      // Act & Assert
      await expect(service.followVendor(userId, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('unfollowVendor', () => {
    it('should unfollow a vendor successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const vendorId = 'vendor-123';
      mockPrismaService.vendorFollow.findUnique.mockResolvedValue(mockVendorFollow);
      mockPrismaService.vendorFollow.delete.mockResolvedValue(mockVendorFollow);

      // Act
      const result = await service.unfollowVendor(userId, vendorId);

      // Assert
      expect(result).toEqual({ message: 'Unfollowed successfully' });
    });

    it('should throw NotFoundException when not following', async () => {
      // Arrange
      const userId = 'user-123';
      const vendorId = 'vendor-123';
      mockPrismaService.vendorFollow.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.unfollowVendor(userId, vendorId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getFollowedVendors', () => {
    it('should return paginated followed vendors', async () => {
      // Arrange
      const userId = 'user-123';
      const mockFollows = [{ ...mockVendorFollow, vendor: mockVendor }];
      mockPrismaService.vendorFollow.findMany.mockResolvedValue(mockFollows);
      mockPrismaService.vendorFollow.count.mockResolvedValue(1);

      // Act
      const result = await service.getFollowedVendors(userId, 1, 20);

      // Assert
      expect(result.follows).toEqual(mockFollows);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('getVendorFollowers', () => {
    it('should return paginated vendor followers', async () => {
      // Arrange
      const vendorId = 'vendor-123';
      const mockFollowers = [
        {
          ...mockVendorFollow,
          user: { id: 'user-123', name: 'John Doe', email: 'john@example.com' },
        },
      ];
      mockPrismaService.vendorFollow.findMany.mockResolvedValue(mockFollowers);
      mockPrismaService.vendorFollow.count.mockResolvedValue(1);

      // Act
      const result = await service.getVendorFollowers(vendorId, 1, 20);

      // Assert
      expect(result.followers).toEqual(mockFollowers);
      expect(result.total).toBe(1);
    });
  });

  describe('isFollowingVendor', () => {
    it('should return true when following', async () => {
      // Arrange
      const userId = 'user-123';
      const vendorId = 'vendor-123';
      mockPrismaService.vendorFollow.findUnique.mockResolvedValue(mockVendorFollow);

      // Act
      const result = await service.isFollowingVendor(userId, vendorId);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when not following', async () => {
      // Arrange
      const userId = 'user-123';
      const vendorId = 'vendor-123';
      mockPrismaService.vendorFollow.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.isFollowingVendor(userId, vendorId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('createActivityFeed', () => {
    it('should create activity feed entry', async () => {
      // Arrange
      const data = {
        userId: 'user-123',
        activityType: ActivityFeedType.PRODUCT_SHARED,
        title: 'Shared a product',
        description: 'Shared on Facebook',
        metadata: { productId: 'product-123' },
      };
      mockPrismaService.activityFeed.create.mockResolvedValue(mockActivityFeed);

      // Act
      const result = await service.createActivityFeed(data);

      // Assert
      expect(result).toEqual(mockActivityFeed);
      expect(mockPrismaService.activityFeed.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('getActivityFeed', () => {
    it('should return paginated activity feed', async () => {
      // Arrange
      const params = { userId: 'user-123', page: 1, limit: 20 };
      const mockActivities = [mockActivityFeed];
      mockPrismaService.activityFeed.findMany.mockResolvedValue(mockActivities);
      mockPrismaService.activityFeed.count.mockResolvedValue(1);

      // Act
      const result = await service.getActivityFeed(params);

      // Assert
      expect(result.activities).toEqual(mockActivities);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should filter by activity type', async () => {
      // Arrange
      const params = {
        activityType: ActivityFeedType.PRODUCT_SHARED,
        page: 1,
        limit: 20,
      };
      mockPrismaService.activityFeed.findMany.mockResolvedValue([]);
      mockPrismaService.activityFeed.count.mockResolvedValue(0);

      // Act
      await service.getActivityFeed(params);

      // Assert
      expect(mockPrismaService.activityFeed.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            activityType: ActivityFeedType.PRODUCT_SHARED,
          }),
        }),
      );
    });
  });

  describe('getUserFeed', () => {
    it('should return user feed including followed vendors activities', async () => {
      // Arrange
      const userId = 'user-123';
      mockPrismaService.vendorFollow.findMany.mockResolvedValue([
        { vendorId: 'vendor-123' },
        { vendorId: 'vendor-456' },
      ]);
      mockPrismaService.activityFeed.findMany.mockResolvedValue([mockActivityFeed]);
      mockPrismaService.activityFeed.count.mockResolvedValue(1);

      // Act
      const result = await service.getUserFeed(userId, 1, 20);

      // Assert
      expect(result.activities).toEqual([mockActivityFeed]);
      expect(mockPrismaService.activityFeed.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: { in: ['vendor-123', 'vendor-456', 'user-123'] },
            isPublic: true,
          },
        }),
      );
    });
  });

  describe('trackInteraction', () => {
    it('should track user interaction', async () => {
      // Arrange
      const userId = 'user-123';
      const dto = {
        targetType: 'PRODUCT',
        targetId: 'product-123',
        interactionType: 'VIEW',
        metadata: { duration: 30 },
      };
      const mockInteraction = {
        id: 'interaction-123',
        ...dto,
        userId,
        createdAt: new Date(),
      };
      mockPrismaService.userInteraction.create.mockResolvedValue(mockInteraction);

      // Act
      const result = await service.trackInteraction(userId, dto);

      // Assert
      expect(result).toEqual(mockInteraction);
    });
  });

  describe('getInteractionStats', () => {
    it('should return interaction statistics', async () => {
      // Arrange
      const params = { targetId: 'product-123' };
      mockPrismaService.userInteraction.count.mockResolvedValue(100);
      mockPrismaService.userInteraction.groupBy.mockResolvedValue([
        { interactionType: 'VIEW', _count: 80 },
        { interactionType: 'CLICK', _count: 20 },
      ]);

      // Act
      const result = await service.getInteractionStats(params);

      // Assert
      expect(result).toEqual({
        total: 100,
        byType: {
          VIEW: 80,
          CLICK: 20,
        },
      });
    });
  });

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const dto = {
        targetType: 'PRODUCT',
        targetId: 'product-123',
        comment: 'Nice product!',
      };
      mockPrismaService.socialComment.create.mockResolvedValue(mockSocialComment);

      // Act
      const result = await service.createComment(userId, dto);

      // Assert
      expect(result).toEqual(mockSocialComment);
    });

    it('should create a reply to existing comment', async () => {
      // Arrange
      const userId = 'user-123';
      const dto = {
        targetType: 'PRODUCT',
        targetId: 'product-123',
        comment: 'I agree!',
        parentId: 'comment-123',
      };
      mockPrismaService.socialComment.findUnique.mockResolvedValue(mockSocialComment);
      mockPrismaService.socialComment.create.mockResolvedValue({
        ...mockSocialComment,
        id: 'comment-456',
        parentId: 'comment-123',
        comment: 'I agree!',
      });

      // Act
      const result = await service.createComment(userId, dto);

      // Assert
      expect(result.parentId).toBe('comment-123');
    });

    it('should throw NotFoundException when parent comment does not exist', async () => {
      // Arrange
      const userId = 'user-123';
      const dto = {
        targetType: 'PRODUCT',
        targetId: 'product-123',
        comment: 'I agree!',
        parentId: 'non-existent',
      };
      mockPrismaService.socialComment.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createComment(userId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when parent comment has different target', async () => {
      // Arrange
      const userId = 'user-123';
      const dto = {
        targetType: 'PRODUCT',
        targetId: 'product-456',
        comment: 'I agree!',
        parentId: 'comment-123',
      };
      mockPrismaService.socialComment.findUnique.mockResolvedValue(mockSocialComment);

      // Act & Assert
      await expect(service.createComment(userId, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getComments', () => {
    it('should return paginated comments', async () => {
      // Arrange
      const params = {
        targetType: 'PRODUCT',
        targetId: 'product-123',
        page: 1,
        limit: 20,
      };
      mockPrismaService.socialComment.findMany.mockResolvedValue([mockSocialComment]);
      mockPrismaService.socialComment.count.mockResolvedValue(1);

      // Act
      const result = await service.getComments(params);

      // Assert
      expect(result.comments).toEqual([mockSocialComment]);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('likeComment', () => {
    it('should increment likes count', async () => {
      // Arrange
      const commentId = 'comment-123';
      mockPrismaService.socialComment.update.mockResolvedValue({
        ...mockSocialComment,
        likesCount: 6,
      });

      // Act
      const result = await service.likeComment(commentId);

      // Assert
      expect(result.likesCount).toBe(6);
      expect(mockPrismaService.socialComment.update).toHaveBeenCalledWith({
        where: { id: commentId },
        data: { likesCount: { increment: 1 } },
      });
    });
  });

  describe('deleteComment', () => {
    it('should soft delete own comment', async () => {
      // Arrange
      const commentId = 'comment-123';
      const userId = 'user-123';
      mockPrismaService.socialComment.findUnique.mockResolvedValue(mockSocialComment);
      mockPrismaService.socialComment.update.mockResolvedValue({
        ...mockSocialComment,
        isHidden: true,
      });

      // Act
      const result = await service.deleteComment(commentId, userId);

      // Assert
      expect(result).toEqual({ message: 'Comment deleted successfully' });
    });

    it('should throw NotFoundException when comment does not exist', async () => {
      // Arrange
      const commentId = 'non-existent';
      const userId = 'user-123';
      mockPrismaService.socialComment.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteComment(commentId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when deleting other user comment', async () => {
      // Arrange
      const commentId = 'comment-123';
      const userId = 'other-user';
      mockPrismaService.socialComment.findUnique.mockResolvedValue(mockSocialComment);

      // Act & Assert
      await expect(service.deleteComment(commentId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('awardBadge', () => {
    it('should award badge and create activity feed', async () => {
      // Arrange
      const userId = 'user-123';
      const badgeType = 'TOP_REVIEWER';
      const title = 'Top Reviewer';
      const description = 'Left 100 helpful reviews';
      const iconUrl = 'https://example.com/badge.png';
      mockPrismaService.userBadge.create.mockResolvedValue(mockUserBadge);
      mockPrismaService.activityFeed.create.mockResolvedValue(mockActivityFeed);

      // Act
      const result = await service.awardBadge(userId, badgeType, title, description, iconUrl);

      // Assert
      expect(result).toEqual(mockUserBadge);
      expect(mockPrismaService.activityFeed.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          activityType: ActivityFeedType.ACHIEVEMENT_EARNED,
          title: `Earned badge: ${title}`,
        }),
      });
    });
  });

  describe('getUserBadges', () => {
    it('should return user badges', async () => {
      // Arrange
      const userId = 'user-123';
      const mockBadges = [mockUserBadge];
      mockPrismaService.userBadge.findMany.mockResolvedValue(mockBadges);

      // Act
      const result = await service.getUserBadges(userId);

      // Assert
      expect(result).toEqual(mockBadges);
      expect(mockPrismaService.userBadge.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { earnedAt: 'desc' },
      });
    });
  });
});
