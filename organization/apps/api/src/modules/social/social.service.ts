import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ShareProductDto } from './dto/share-product.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { FollowVendorDto } from './dto/follow-vendor.dto';
import { TrackInteractionDto } from './dto/track-interaction.dto';
import { ActivityFeedType, InteractionType, UserRole } from '@prisma/client';

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  // ==================== Product Sharing ====================

  async shareProduct(userId: string | null, dto: ShareProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const share = await this.prisma.productShare.create({
      data: {
        productId: dto.productId,
        userId,
        platform: dto.platform,
        shareUrl: dto.shareUrl,
      },
    });

    if (userId) {
      await this.createActivityFeed({
        userId,
        activityType: ActivityFeedType.PRODUCT_SHARED,
        title: `Shared ${product.name}`,
        description: `Shared on ${dto.platform}`,
        metadata: { productId: product.id, platform: dto.platform },
        imageUrl: product.images[0],
        linkUrl: `/products/${product.slug}`,
      });
    }

    return share;
  }

  async getProductShareStats(productId: string) {
    const shares = await this.prisma.productShare.findMany({
      where: { productId },
    });

    const byPlatform = shares.reduce((acc, share) => {
      acc[share.platform] = (acc[share.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalShares: shares.length,
      byPlatform,
    };
  }

  // ==================== Review Helpful ====================

  async markReviewHelpful(reviewId: string, userId: string, isHelpful: boolean = true) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const existing = await this.prisma.reviewHelpful.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId,
        },
      },
    });

    if (existing) {
      if (existing.isHelpful === isHelpful) {
        await this.prisma.reviewHelpful.delete({
          where: { id: existing.id },
        });
        await this.prisma.review.update({
          where: { id: reviewId },
          data: { helpfulCount: { decrement: isHelpful ? 1 : 0 } },
        });
        return { removed: true };
      } else {
        await this.prisma.reviewHelpful.update({
          where: { id: existing.id },
          data: { isHelpful },
        });
        const increment = isHelpful ? 1 : -1;
        await this.prisma.review.update({
          where: { id: reviewId },
          data: { helpfulCount: { increment } },
        });
        return { updated: true };
      }
    }

    await this.prisma.reviewHelpful.create({
      data: {
        reviewId,
        userId,
        isHelpful,
      },
    });

    if (isHelpful) {
      await this.prisma.review.update({
        where: { id: reviewId },
        data: { helpfulCount: { increment: 1 } },
      });
    }

    return { created: true };
  }

  async getReviewHelpfulStats(reviewId: string) {
    const [helpful, notHelpful] = await Promise.all([
      this.prisma.reviewHelpful.count({
        where: { reviewId, isHelpful: true },
      }),
      this.prisma.reviewHelpful.count({
        where: { reviewId, isHelpful: false },
      }),
    ]);

    return {
      helpful,
      notHelpful,
      total: helpful + notHelpful,
      ratio: helpful + notHelpful > 0 ? (helpful / (helpful + notHelpful)) * 100 : 0,
    };
  }

  // ==================== Vendor Following ====================

  async followVendor(userId: string, dto: FollowVendorDto) {
    const vendor = await this.prisma.user.findUnique({
      where: { id: dto.vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (vendor.role !== UserRole.VENDOR && vendor.role !== UserRole.ADMIN) {
      throw new BadRequestException('User is not a vendor');
    }

    if (userId === dto.vendorId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const existing = await this.prisma.vendorFollow.findUnique({
      where: {
        userId_vendorId: {
          userId,
          vendorId: dto.vendorId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Already following this vendor');
    }

    const follow = await this.prisma.vendorFollow.create({
      data: {
        userId,
        vendorId: dto.vendorId,
        notifyOnNewProducts: dto.notifyOnNewProducts ?? true,
        notifyOnDeals: dto.notifyOnDeals ?? true,
      },
    });

    await this.createActivityFeed({
      userId,
      activityType: ActivityFeedType.VENDOR_FOLLOWED,
      title: `Started following ${vendor.name}`,
      description: 'New vendor followed',
      metadata: { vendorId: vendor.id },
      linkUrl: `/vendors/${vendor.id}`,
    });

    return follow;
  }

  async unfollowVendor(userId: string, vendorId: string) {
    const follow = await this.prisma.vendorFollow.findUnique({
      where: {
        userId_vendorId: {
          userId,
          vendorId,
        },
      },
    });

    if (!follow) {
      throw new NotFoundException('Not following this vendor');
    }

    await this.prisma.vendorFollow.delete({
      where: { id: follow.id },
    });

    return { message: 'Unfollowed successfully' };
  }

  async getFollowedVendors(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [follows, total] = await Promise.all([
      this.prisma.vendorFollow.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              email: true,
              vendorProfile: true,
            },
          },
        },
      }),
      this.prisma.vendorFollow.count({ where: { userId } }),
    ]);

    return {
      follows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getVendorFollowers(vendorId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [followers, total] = await Promise.all([
      this.prisma.vendorFollow.findMany({
        where: { vendorId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.vendorFollow.count({ where: { vendorId } }),
    ]);

    return {
      followers,
      total,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async isFollowingVendor(userId: string, vendorId: string): Promise<boolean> {
    const follow = await this.prisma.vendorFollow.findUnique({
      where: {
        userId_vendorId: {
          userId,
          vendorId,
        },
      },
    });

    return !!follow;
  }

  // ==================== Activity Feed ====================

  async createActivityFeed(data: {
    userId?: string;
    activityType: ActivityFeedType;
    title: string;
    description?: string;
    metadata?: any;
    imageUrl?: string;
    linkUrl?: string;
    isPublic?: boolean;
  }) {
    return this.prisma.activityFeed.create({
      data,
    });
  }

  async getActivityFeed(params: {
    userId?: string;
    activityType?: ActivityFeedType;
    page?: number;
    limit?: number;
    isPublic?: boolean;
  }) {
    const { userId, activityType, page = 1, limit = 20, isPublic } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (activityType) where.activityType = activityType;
    if (isPublic !== undefined) where.isPublic = isPublic;

    const [activities, total] = await Promise.all([
      this.prisma.activityFeed.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.activityFeed.count({ where }),
    ]);

    return {
      activities,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUserFeed(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const following = await this.prisma.vendorFollow.findMany({
      where: { userId },
      select: { vendorId: true },
    });

    const vendorIds = following.map((f) => f.vendorId);
    vendorIds.push(userId);

    const [activities, total] = await Promise.all([
      this.prisma.activityFeed.findMany({
        where: {
          userId: { in: vendorIds },
          isPublic: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.activityFeed.count({
        where: {
          userId: { in: vendorIds },
          isPublic: true,
        },
      }),
    ]);

    return {
      activities,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ==================== User Interactions ====================

  async trackInteraction(userId: string, dto: TrackInteractionDto) {
    return this.prisma.userInteraction.create({
      data: {
        userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        interactionType: dto.interactionType,
        metadata: dto.metadata,
      },
    });
  }

  async getInteractionStats(params: {
    targetType?: InteractionType;
    targetId?: string;
    interactionType?: string;
  }) {
    const where: any = {};
    if (params.targetType) where.targetType = params.targetType;
    if (params.targetId) where.targetId = params.targetId;
    if (params.interactionType) where.interactionType = params.interactionType;

    const [total, byType] = await Promise.all([
      this.prisma.userInteraction.count({ where }),
      this.prisma.userInteraction.groupBy({
        by: ['interactionType'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      byType: byType.reduce((acc, item) => {
        acc[item.interactionType] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // ==================== Social Comments ====================

  async createComment(userId: string, dto: CreateCommentDto) {
    if (dto.parentId) {
      const parent = await this.prisma.socialComment.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new NotFoundException('Parent comment not found');
      }

      if (parent.targetType !== dto.targetType || parent.targetId !== dto.targetId) {
        throw new BadRequestException('Parent comment does not match target');
      }
    }

    return this.prisma.socialComment.create({
      data: {
        userId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        comment: dto.comment,
        parentId: dto.parentId,
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
  }

  async getComments(params: {
    targetType: string;
    targetId: string;
    page?: number;
    limit?: number;
  }) {
    const { targetType, targetId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      targetType,
      targetId,
      parentId: null,
      isHidden: false,
    };

    const [comments, total] = await Promise.all([
      this.prisma.socialComment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          replies: {
            where: { isHidden: false },
            orderBy: { createdAt: 'asc' },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.socialComment.count({ where }),
    ]);

    return {
      comments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async likeComment(commentId: string) {
    return this.prisma.socialComment.update({
      where: { id: commentId },
      data: { likesCount: { increment: 1 } },
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.socialComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new BadRequestException('Cannot delete comment from another user');
    }

    await this.prisma.socialComment.update({
      where: { id: commentId },
      data: { isHidden: true },
    });

    return { message: 'Comment deleted successfully' };
  }

  // ==================== User Badges ====================

  async awardBadge(userId: string, badgeType: string, title: string, description?: string, iconUrl?: string) {
    const badge = await this.prisma.userBadge.create({
      data: {
        userId,
        badgeType,
        title,
        description,
        iconUrl,
      },
    });

    await this.createActivityFeed({
      userId,
      activityType: ActivityFeedType.ACHIEVEMENT_EARNED,
      title: `Earned badge: ${title}`,
      description,
      metadata: { badgeType, badgeId: badge.id },
      imageUrl: iconUrl,
    });

    return badge;
  }

  async getUserBadges(userId: string) {
    return this.prisma.userBadge.findMany({
      where: { userId },
      orderBy: { earnedAt: 'desc' },
    });
  }
}
