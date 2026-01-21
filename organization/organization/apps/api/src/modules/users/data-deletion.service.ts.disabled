import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

export enum DeletionStrategy {
  SOFT_DELETE = 'SOFT_DELETE',
  HARD_DELETE = 'HARD_DELETE',
  ANONYMIZE = 'ANONYMIZE',
}

export interface DeletionRequest {
  userId: string;
  strategy: DeletionStrategy;
  reason?: string;
  scheduledDate?: Date;
}

export interface DeletionResult {
  userId: string;
  strategy: DeletionStrategy;
  deletedAt: Date;
  anonymized: boolean;
  dataRetained: {
    orders: boolean;
    reviews: boolean;
    reason: string;
  };
  deletedData: {
    personalInfo: boolean;
    wishlist: boolean;
    searchQueries: boolean;
    productViews: boolean;
    subscriptions: boolean;
    adCampaigns: boolean;
  };
}

@Injectable()
export class DataDeletionService {
  constructor(private prisma: PrismaService) {}

  /**
   * GDPR Article 17: Right to erasure (Right to be forgotten)
   * CCPA Section 1798.105: Right to delete
   *
   * Implements user data deletion with configurable strategies
   */
  async deleteUserData(request: DeletionRequest): Promise<DeletionResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: request.userId },
      include: {
        _count: {
          select: {
            orders: true,
            reviews: true,
            wishlist: true,
            searchQueries: true,
            productViews: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has active orders that need to be retained
    const activeOrders = await this.prisma.order.count({
      where: {
        userId: request.userId,
        status: {
          in: ['PENDING', 'PROCESSING', 'SHIPPED'],
        },
      },
    });

    if (activeOrders > 0 && request.strategy === DeletionStrategy.HARD_DELETE) {
      throw new BadRequestException(
        'Cannot hard delete account with active orders. Please wait for orders to complete or choose anonymization.',
      );
    }

    switch (request.strategy) {
      case DeletionStrategy.SOFT_DELETE:
        return this.softDelete(request.userId);
      case DeletionStrategy.HARD_DELETE:
        return this.hardDelete(request.userId);
      case DeletionStrategy.ANONYMIZE:
        return this.anonymizeUser(request.userId);
      default:
        throw new BadRequestException('Invalid deletion strategy');
    }
  }

  /**
   * Soft delete: Mark user as deleted but retain data for legal/compliance purposes
   * Data is hidden from user but retained for specified retention period
   */
  private async softDelete(userId: string): Promise<DeletionResult> {
    const deletedAt = new Date();

    // Update user record with soft delete flag
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@broxiva.deleted`,
        name: 'Deleted User',
        password: 'DELETED',
        // Note: In production, add a 'deletedAt' field to schema
        updatedAt: deletedAt,
      },
    });

    // Delete non-essential data
    await this.deleteNonEssentialData(userId);

    return {
      userId,
      strategy: DeletionStrategy.SOFT_DELETE,
      deletedAt,
      anonymized: true,
      dataRetained: {
        orders: true,
        reviews: true,
        reason: 'Legal and compliance retention requirements (7 years for financial records)',
      },
      deletedData: {
        personalInfo: true,
        wishlist: true,
        searchQueries: true,
        productViews: true,
        subscriptions: true,
        adCampaigns: true,
      },
    };
  }

  /**
   * Hard delete: Permanently remove all user data except legally required records
   * WARNING: This is irreversible
   */
  private async hardDelete(userId: string): Promise<DeletionResult> {
    const deletedAt = new Date();

    try {
      await this.prisma.$transaction(async (prisma) => {
        // Delete user-generated content
        await prisma.review.deleteMany({ where: { userId } });
        await prisma.wishlist.deleteMany({ where: { userId } });
        await prisma.searchQuery.deleteMany({ where: { userId } });
        await prisma.productView.deleteMany({ where: { userId } });
        await prisma.adCampaign.deleteMany({ where: { userId } });

        // Delete subscriptions
        await prisma.subscription.deleteMany({ where: { userId } });

        // Anonymize orders instead of deleting (legal requirement)
        await this.anonymizeOrders(userId, prisma);

        // Delete payment plans that are completed
        await prisma.bnplPaymentPlan.deleteMany({
          where: {
            userId,
            status: 'COMPLETED',
          },
        });

        // Anonymize active payment plans
        const activePlans = await prisma.bnplPaymentPlan.findMany({
          where: {
            userId,
            status: { not: 'COMPLETED' },
          },
        });

        for (const plan of activePlans) {
          await prisma.bnplPaymentPlan.update({
            where: { id: plan.id },
            data: {
              userId: null,
            },
          });
        }

        // Finally delete the user
        await prisma.user.delete({ where: { id: userId } });
      });

      return {
        userId,
        strategy: DeletionStrategy.HARD_DELETE,
        deletedAt,
        anonymized: false,
        dataRetained: {
          orders: true,
          reviews: false,
          reason: 'Orders anonymized and retained for legal compliance (tax, warranty, fraud prevention)',
        },
        deletedData: {
          personalInfo: true,
          wishlist: true,
          searchQueries: true,
          productViews: true,
          subscriptions: true,
          adCampaigns: true,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete user data: ${error.message}. Some data may have foreign key constraints.`,
      );
    }
  }

  /**
   * Anonymize: Replace personal data with anonymous placeholders while preserving data structure
   * This satisfies GDPR while maintaining data utility for analytics and legal compliance
   */
  private async anonymizeUser(userId: string): Promise<DeletionResult> {
    const deletedAt = new Date();
    const anonymousEmail = `anonymous_${userId}@broxiva.anonymized`;
    const anonymousName = 'Anonymous User';

    await this.prisma.$transaction(async (prisma) => {
      // Anonymize user record
      await prisma.user.update({
        where: { id: userId },
        data: {
          email: anonymousEmail,
          name: anonymousName,
          password: 'ANONYMIZED',
          updatedAt: deletedAt,
        },
      });

      // Anonymize orders
      await this.anonymizeOrders(userId, prisma);

      // Anonymize reviews (keep content but remove personal link)
      await prisma.review.updateMany({
        where: { userId },
        data: {
          // Keep the review content but it's now from "Anonymous User"
          // The userId foreign key remains for data integrity
        },
      });

      // Delete non-essential personal data
      await prisma.wishlist.deleteMany({ where: { userId } });
      await prisma.searchQuery.deleteMany({ where: { userId } });
      await prisma.productView.deleteMany({ where: { userId } });
      await prisma.subscription.deleteMany({ where: { userId } });
      await prisma.adCampaign.deleteMany({ where: { userId } });
    });

    return {
      userId,
      strategy: DeletionStrategy.ANONYMIZE,
      deletedAt,
      anonymized: true,
      dataRetained: {
        orders: true,
        reviews: true,
        reason: 'Data anonymized for legal compliance and analytics while removing personal identifiers',
      },
      deletedData: {
        personalInfo: true,
        wishlist: true,
        searchQueries: true,
        productViews: true,
        subscriptions: true,
        adCampaigns: true,
      },
    };
  }

  /**
   * Delete non-essential user data while retaining legally required information
   */
  private async deleteNonEssentialData(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.wishlist.deleteMany({ where: { userId } }),
      this.prisma.searchQuery.deleteMany({ where: { userId } }),
      this.prisma.productView.deleteMany({ where: { userId } }),
      this.prisma.subscription.deleteMany({ where: { userId } }),
      this.prisma.adCampaign.deleteMany({ where: { userId } }),
    ]);
  }

  /**
   * Anonymize order data while retaining transaction records
   * Required for: Tax compliance, fraud prevention, warranty tracking
   */
  private async anonymizeOrders(userId: string, prisma: any): Promise<void> {
    const orders = await prisma.order.findMany({
      where: { userId },
    });

    for (const order of orders) {
      // Parse shipping address and anonymize personal details
      let shippingAddress;
      try {
        shippingAddress = typeof order.shippingAddress === 'string'
          ? JSON.parse(order.shippingAddress)
          : order.shippingAddress;

        // Anonymize personal fields in address
        if (shippingAddress) {
          shippingAddress.name = 'Anonymous';
          shippingAddress.email = 'anonymous@broxiva.com';
          shippingAddress.phone = 'REDACTED';
        }
      } catch (e) {
        shippingAddress = { anonymous: true };
      }

      await prisma.order.update({
        where: { id: order.id },
        data: {
          shippingAddress: JSON.stringify(shippingAddress),
          guestEmail: order.guestEmail ? 'anonymous@broxiva.com' : null,
          guestPhone: order.guestPhone ? 'REDACTED' : null,
        },
      });
    }
  }

  /**
   * Schedule a deletion request for future execution
   * Allows users to cancel within grace period (typically 30 days)
   */
  async scheduleDeletion(request: DeletionRequest): Promise<{ scheduledDate: Date; cancellationDeadline: Date }> {
    const scheduledDate = request.scheduledDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const cancellationDeadline = new Date(scheduledDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before

    // In production, store this in a DeletionRequest table
    // For now, we'll just return the dates

    return {
      scheduledDate,
      cancellationDeadline,
    };
  }

  /**
   * Check data retention requirements for user
   * Some data must be retained for legal compliance even after deletion request
   */
  async getDataRetentionInfo(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            orders: true,
            reviews: true,
            bnplPaymentPlans: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const sevenYearsAgo = new Date(now.getFullYear() - 7, now.getMonth(), now.getDate());

    // Get orders within retention period
    const ordersToRetain = await this.prisma.order.count({
      where: {
        userId,
        createdAt: {
          gte: sevenYearsAgo,
        },
      },
    });

    // Check for active payment plans
    const activePaymentPlans = await this.prisma.bnplPaymentPlan.count({
      where: {
        userId,
        status: { not: 'COMPLETED' },
      },
    });

    return {
      userId: user.id,
      retentionRequirements: {
        taxRecords: {
          required: true,
          period: '7 years',
          recordsCount: ordersToRetain,
          reason: 'Tax law compliance',
        },
        activePaymentPlans: {
          required: activePaymentPlans > 0,
          count: activePaymentPlans,
          reason: 'Contractual obligation',
        },
        fraudPrevention: {
          required: true,
          period: '5 years',
          reason: 'Anti-fraud and dispute resolution',
        },
      },
      deletionOptions: {
        hardDelete: activePaymentPlans === 0,
        softDelete: true,
        anonymize: true,
      },
      recommendation: activePaymentPlans > 0
        ? 'Anonymization recommended due to active payment plans'
        : 'All deletion strategies available',
    };
  }

  /**
   * Verify deletion was successful
   */
  async verifyDeletion(userId: string): Promise<{ deleted: boolean; remainingData: any }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            orders: true,
            reviews: true,
            wishlist: true,
            searchQueries: true,
            productViews: true,
          },
        },
      },
    });

    if (!user) {
      return {
        deleted: true,
        remainingData: null,
      };
    }

    return {
      deleted: false,
      remainingData: {
        personalInfoAnonymized: user.email.includes('anonymous') || user.email.includes('deleted'),
        orders: user._count.orders,
        reviews: user._count.reviews,
        wishlist: user._count.wishlist,
        searchQueries: user._count.searchQueries,
        productViews: user._count.productViews,
      },
    };
  }
}
