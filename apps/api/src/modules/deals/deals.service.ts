import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  CreateDealDto,
  UpdateDealDto,
  DealProductDto,
  AddProductsToDealDto,
  PurchaseDealDto,
  CalculateDealPriceDto,
  CheckDealEligibilityDto,
  TrackDealViewDto,
  TrackDealClickDto,
  GetDealsQueryDto,
  NotifyDealDto,
} from './dto/deal.dto';
import { DealType, DealStatus, LoyaltyTier, Prisma } from '@prisma/client';

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  // ==================== DEAL MANAGEMENT ====================

  /**
   * Create a new deal
   */
  async createDeal(dto: CreateDealDto) {
    // Validate dates
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    // Validate deal type specific fields
    this.validateDealTypeFields(dto);

    // Create deal
    const deal = await this.prisma.deal.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        status: DealStatus.SCHEDULED,
        startTime,
        endTime,
        earlyAccessHours: dto.earlyAccessHours || 0,
        minimumTier: dto.minimumTier,
        discountPercentage: dto.discountPercentage,
        discountAmount: dto.discountAmount,
        buyQuantity: dto.buyQuantity,
        getQuantity: dto.getQuantity,
        minimumPurchase: dto.minimumPurchase,
        totalStock: dto.totalStock,
        remainingStock: dto.totalStock,
        limitPerCustomer: dto.limitPerCustomer,
        badge: dto.badge,
        badgeColor: dto.badgeColor,
        featuredOrder: dto.featuredOrder,
        isFeatured: dto.isFeatured || false,
        bannerImage: dto.bannerImage,
        stackableWithCoupons: dto.stackableWithCoupons ?? false,
        stackableWithLoyalty: dto.stackableWithLoyalty ?? true,
      },
      include: {
        dealProducts: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
                price: true,
              },
            },
          },
        },
      },
    });

    // Add products if provided
    if (dto.products && dto.products.length > 0) {
      await this.addProductsToDeal(deal.id, { products: dto.products });
    }

    // Create analytics record
    await this.prisma.dealAnalytics.create({
      data: {
        dealId: deal.id,
      },
    });

    return this.getDealById(deal.id);
  }

  /**
   * Update deal
   */
  async updateDeal(dealId: string, dto: UpdateDealDto) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    // Validate dates if provided
    const startTime = dto.startTime ? new Date(dto.startTime) : deal.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : deal.endTime;

    if (endTime <= startTime) {
      throw new BadRequestException('End time must be after start time');
    }

    return this.prisma.deal.update({
      where: { id: dealId },
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
        earlyAccessHours: dto.earlyAccessHours,
        minimumTier: dto.minimumTier,
        discountPercentage: dto.discountPercentage,
        discountAmount: dto.discountAmount,
        totalStock: dto.totalStock,
        remainingStock: dto.totalStock !== undefined ? dto.totalStock : undefined,
        limitPerCustomer: dto.limitPerCustomer,
        badge: dto.badge,
        badgeColor: dto.badgeColor,
        featuredOrder: dto.featuredOrder,
        isFeatured: dto.isFeatured,
        bannerImage: dto.bannerImage,
        stackableWithCoupons: dto.stackableWithCoupons,
        stackableWithLoyalty: dto.stackableWithLoyalty,
      },
      include: {
        dealProducts: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
                price: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Delete deal
   */
  async deleteDeal(dealId: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    // Can only delete SCHEDULED or CANCELLED deals
    if (deal.status === DealStatus.ACTIVE || deal.status === DealStatus.ENDED) {
      throw new BadRequestException(
        'Cannot delete active or ended deals. Cancel it first.',
      );
    }

    await this.prisma.deal.delete({
      where: { id: dealId },
    });

    return { message: 'Deal deleted successfully' };
  }

  /**
   * Get deal by ID with full details
   */
  async getDealById(dealId: string, userId?: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        dealProducts: {
          where: { isActive: true },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
                price: true,
                stock: true,
                vendorId: true,
                vendor: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    // Check eligibility if user provided
    let eligibility = null;
    if (userId) {
      eligibility = await this.checkDealEligibility({
        dealId,
        userId,
      });
    }

    // Calculate time remaining
    const now = new Date();
    const timeRemaining = this.calculateTimeRemaining(deal.startTime, deal.endTime, now);

    return {
      ...deal,
      timeRemaining,
      eligibility,
    };
  }

  /**
   * Get all deals with filters
   */
  async getDeals(query: GetDealsQueryDto, userId?: string) {
    const {
      type,
      status,
      isFeatured,
      activeOnly,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.DealWhereInput = {};

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    if (activeOnly) {
      const now = new Date();
      where.status = DealStatus.ACTIVE;
      where.startTime = { lte: now };
      where.endTime = { gte: now };
    }

    const skip = (page - 1) * limit;

    const [deals, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        include: {
          dealProducts: {
            where: { isActive: true },
            take: 5, // Limit products in list view
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  images: true,
                  price: true,
                },
              },
            },
          },
          _count: {
            select: {
              dealProducts: true,
              dealPurchases: true,
            },
          },
        },
        orderBy: [
          { isFeatured: 'desc' },
          { featuredOrder: 'asc' },
          { startTime: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.deal.count({ where }),
    ]);

    // Add time remaining and eligibility for each deal
    const now = new Date();
    const dealsWithMeta = await Promise.all(
      deals.map(async (deal) => {
        const timeRemaining = this.calculateTimeRemaining(
          deal.startTime,
          deal.endTime,
          now,
        );

        let eligibility = null;
        if (userId) {
          eligibility = await this.checkDealEligibility({
            dealId: deal.id,
            userId,
          });
        }

        return {
          ...deal,
          timeRemaining,
          eligibility,
        };
      }),
    );

    return {
      deals: dealsWithMeta,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get featured deals
   */
  async getFeaturedDeals(userId?: string) {
    return this.getDeals(
      {
        isFeatured: true,
        activeOnly: true,
        limit: 10,
      },
      userId,
    );
  }

  /**
   * Get active deals
   */
  async getActiveDeals(userId?: string) {
    return this.getDeals(
      {
        activeOnly: true,
        limit: 50,
      },
      userId,
    );
  }

  // ==================== PRODUCT MANAGEMENT ====================

  /**
   * Add products to deal
   */
  async addProductsToDeal(dealId: string, dto: AddProductsToDealDto) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    // Verify all products exist
    const productIds = dto.products.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    // Create deal products
    const dealProducts = await Promise.all(
      dto.products.map((productDto) =>
        this.prisma.dealProduct.create({
          data: {
            dealId,
            productId: productDto.productId,
            dealPrice: productDto.dealPrice,
            originalPrice: productDto.originalPrice,
            stockAllocated: productDto.stockAllocated,
            stockRemaining: productDto.stockAllocated,
            isActive: productDto.isActive ?? true,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
                price: true,
              },
            },
          },
        }),
      ),
    );

    return dealProducts;
  }

  /**
   * Remove product from deal
   */
  async removeProductFromDeal(dealId: string, productId: string) {
    const dealProduct = await this.prisma.dealProduct.findFirst({
      where: {
        dealId,
        productId,
      },
    });

    if (!dealProduct) {
      throw new NotFoundException('Product not in this deal');
    }

    await this.prisma.dealProduct.delete({
      where: { id: dealProduct.id },
    });

    return { message: 'Product removed from deal' };
  }

  /**
   * Update deal product
   */
  async updateDealProduct(
    dealProductId: string,
    dto: Partial<DealProductDto>,
  ) {
    return this.prisma.dealProduct.update({
      where: { id: dealProductId },
      data: {
        dealPrice: dto.dealPrice,
        stockAllocated: dto.stockAllocated,
        stockRemaining: dto.stockAllocated,
        isActive: dto.isActive,
      },
      include: {
        product: true,
      },
    });
  }

  // ==================== PRICING & ELIGIBILITY ====================

  /**
   * Calculate deal price
   */
  async calculateDealPrice(dto: CalculateDealPriceDto) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dto.dealId },
      include: {
        dealProducts: {
          where: {
            productId: dto.productId,
            isActive: true,
          },
        },
      },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    // Check if deal is active
    const now = new Date();
    if (deal.status !== DealStatus.ACTIVE || deal.startTime > now || deal.endTime < now) {
      throw new BadRequestException('Deal is not currently active');
    }

    let finalPrice = dto.originalPrice;
    let discountAmount = 0;

    // Check if product has specific deal price
    if (dto.productId && deal.dealProducts.length > 0) {
      const dealProduct = deal.dealProducts[0];
      if (dealProduct.dealPrice) {
        finalPrice = dealProduct.dealPrice;
        discountAmount = dto.originalPrice - dealProduct.dealPrice;
      }
    }

    // Apply deal-level discount if no product-specific price
    if (!discountAmount) {
      switch (deal.type) {
        case DealType.PERCENTAGE_DISCOUNT:
        case DealType.FLASH_SALE:
        case DealType.DAILY_DEAL:
        case DealType.SEASONAL_SALE:
          if (deal.discountPercentage) {
            discountAmount = (dto.originalPrice * deal.discountPercentage) / 100;
            finalPrice = dto.originalPrice - discountAmount;
          }
          break;

        case DealType.FIXED_DISCOUNT:
          if (deal.discountAmount) {
            discountAmount = Math.min(deal.discountAmount, dto.originalPrice);
            finalPrice = dto.originalPrice - discountAmount;
          }
          break;

        case DealType.BOGO:
          // Calculate BOGO discount
          if (deal.buyQuantity && deal.getQuantity) {
            const sets = Math.floor(dto.quantity / (deal.buyQuantity + deal.getQuantity));
            const remaining = dto.quantity % (deal.buyQuantity + deal.getQuantity);
            const chargeableItems =
              sets * deal.buyQuantity +
              Math.min(remaining, deal.buyQuantity);
            finalPrice = (dto.originalPrice * chargeableItems) / dto.quantity;
            discountAmount = dto.originalPrice - finalPrice;
          }
          break;

        case DealType.BUNDLE_DEAL:
        case DealType.VOLUME_DISCOUNT:
          // These would require more complex logic based on quantity tiers
          // Simplified here for demonstration
          if (deal.discountPercentage) {
            discountAmount = (dto.originalPrice * deal.discountPercentage) / 100;
            finalPrice = dto.originalPrice - discountAmount;
          }
          break;
      }
    }

    // Apply quantity
    const totalOriginal = dto.originalPrice * dto.quantity;
    const totalFinal = finalPrice * dto.quantity;
    const totalDiscount = totalOriginal - totalFinal;

    return {
      dealId: deal.id,
      dealName: deal.name,
      dealType: deal.type,
      originalPrice: dto.originalPrice,
      discountedPrice: finalPrice,
      discountAmount,
      discountPercentage: (discountAmount / dto.originalPrice) * 100,
      quantity: dto.quantity,
      totalOriginal,
      totalFinal,
      totalDiscount,
      savings: totalDiscount,
    };
  }

  /**
   * Check if user is eligible for deal
   */
  async checkDealEligibility(dto: CheckDealEligibilityDto) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dto.dealId },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    const now = new Date();
    const reasons: string[] = [];
    let isEligible = true;

    // Check if deal is active
    if (deal.status !== DealStatus.ACTIVE) {
      isEligible = false;
      reasons.push('Deal is not active');
    }

    // Check time window
    if (deal.startTime > now) {
      isEligible = false;
      reasons.push('Deal has not started yet');
    }

    if (deal.endTime < now) {
      isEligible = false;
      reasons.push('Deal has ended');
    }

    // Check early access
    if (deal.earlyAccessHours && deal.minimumTier) {
      const earlyAccessEnd = new Date(
        deal.startTime.getTime() + deal.earlyAccessHours * 60 * 60 * 1000,
      );

      if (now < earlyAccessEnd) {
        // Still in early access period
        const userLoyalty = await this.prisma.customerLoyalty.findUnique({
          where: { userId: dto.userId },
        });

        if (!userLoyalty) {
          isEligible = false;
          reasons.push('Early access requires loyalty membership');
        } else if (
          !this.isTierEligible(userLoyalty.currentTier, deal.minimumTier)
        ) {
          isEligible = false;
          reasons.push(
            `Early access requires ${deal.minimumTier} tier or higher`,
          );
        }
      }
    }

    // Check tier requirement (outside early access)
    if (deal.minimumTier) {
      const userLoyalty = await this.prisma.customerLoyalty.findUnique({
        where: { userId: dto.userId },
      });

      if (!userLoyalty) {
        isEligible = false;
        reasons.push('Deal requires loyalty membership');
      } else if (
        !this.isTierEligible(userLoyalty.currentTier, deal.minimumTier)
      ) {
        isEligible = false;
        reasons.push(
          `Deal requires ${deal.minimumTier} tier or higher`,
        );
      }
    }

    // Check stock
    if (deal.totalStock !== null && deal.remainingStock !== null) {
      if (deal.remainingStock <= 0) {
        isEligible = false;
        reasons.push('Deal is sold out');
      } else if (dto.quantity && deal.remainingStock < dto.quantity) {
        isEligible = false;
        reasons.push(
          `Only ${deal.remainingStock} items remaining`,
        );
      }
    }

    // Check customer purchase limit
    if (deal.limitPerCustomer) {
      const purchaseCount = await this.prisma.dealPurchase.aggregate({
        where: {
          dealId: dto.dealId,
          userId: dto.userId,
        },
        _sum: {
          quantity: true,
        },
      });

      const totalPurchased = purchaseCount._sum.quantity || 0;
      const remaining = deal.limitPerCustomer - totalPurchased;

      if (remaining <= 0) {
        isEligible = false;
        reasons.push('Purchase limit reached for this deal');
      } else if (dto.quantity && remaining < dto.quantity) {
        isEligible = false;
        reasons.push(
          `Can only purchase ${remaining} more items from this deal`,
        );
      }
    }

    return {
      isEligible,
      reasons,
      deal: {
        id: deal.id,
        name: deal.name,
        status: deal.status,
        startTime: deal.startTime,
        endTime: deal.endTime,
        minimumTier: deal.minimumTier,
        remainingStock: deal.remainingStock,
      },
    };
  }

  // ==================== PURCHASE TRACKING ====================

  /**
   * Record deal purchase
   */
  async recordDealPurchase(dto: PurchaseDealDto, userId: string) {
    // Verify eligibility
    const eligibility = await this.checkDealEligibility({
      dealId: dto.dealId,
      userId,
      quantity: dto.quantity,
    });

    if (!eligibility.isEligible) {
      throw new ForbiddenException(
        `Not eligible for this deal: ${eligibility.reasons.join(', ')}`,
      );
    }

    const deal = await this.prisma.deal.findUnique({
      where: { id: dto.dealId },
    });

    // Create purchase record
    const purchase = await this.prisma.dealPurchase.create({
      data: {
        dealId: dto.dealId,
        userId,
        orderId: dto.orderId,
        quantity: dto.quantity,
        dealPrice: dto.purchasePrice || 0,
        savings: dto.discountApplied || 0,
      },
    });

    // Update remaining stock
    if (deal && deal.totalStock !== null && deal.remainingStock !== null) {
      await this.prisma.deal.update({
        where: { id: dto.dealId },
        data: {
          remainingStock: {
            decrement: dto.quantity,
          },
        },
      });
    }

    // Update product-specific stock if applicable
    if (dto.dealProductId) {
      await this.prisma.dealProduct.update({
        where: { id: dto.dealProductId },
        data: {
          stockRemaining: {
            decrement: dto.quantity,
          },
        },
      });
    }

    // Update analytics
    await this.updateDealAnalytics(dto.dealId, {
      conversions: 1,
      revenue: dto.purchasePrice,
    });

    return purchase;
  }

  /**
   * Get user's deal purchases
   */
  async getUserDealPurchases(userId: string, limit = 20) {
    return this.prisma.dealPurchase.findMany({
      where: { userId },
      include: {
        deal: {
          select: {
            id: true,
            name: true,
            type: true,
            badge: true,
          },
        },
        order: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        purchasedAt: 'desc',
      },
      take: limit,
    });
  }

  // ==================== ANALYTICS & TRACKING ====================

  /**
   * Track deal view
   */
  async trackDealView(dto: TrackDealViewDto) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dto.dealId },
    });

    if (!deal) {
      return;
    }

    // Update deal views
    await this.prisma.deal.update({
      where: { id: dto.dealId },
      data: {
        views: {
          increment: 1,
        },
      },
    });

    // Update analytics
    await this.updateDealAnalytics(dto.dealId, {
      views: 1,
      uniqueViews: dto.userId ? 1 : 0,
    });
  }

  /**
   * Track deal click
   */
  async trackDealClick(dto: TrackDealClickDto) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dto.dealId },
    });

    if (!deal) {
      return;
    }

    // Update deal clicks
    await this.prisma.deal.update({
      where: { id: dto.dealId },
      data: {
        clicks: {
          increment: 1,
        },
      },
    });

    // Update analytics
    await this.updateDealAnalytics(dto.dealId, {
      clicks: 1,
    });
  }

  /**
   * Get deal analytics
   */
  async getDealAnalytics(dealId: string) {
    const analytics = await this.prisma.dealAnalytics.findUnique({
      where: { dealId },
    });

    if (!analytics) {
      throw new NotFoundException('Deal analytics not found');
    }

    // Calculate derived metrics
    const ctr =
      analytics.totalViews > 0
        ? (analytics.clicks / analytics.totalViews) * 100
        : 0;

    const conversionRate =
      analytics.clicks > 0
        ? (analytics.totalPurchases / analytics.clicks) * 100
        : 0;

    const sellThroughRate =
      analytics.initialStock && analytics.initialStock > 0
        ? ((analytics.initialStock - (analytics.stockRemaining || 0)) /
            analytics.initialStock) *
          100
        : 0;

    return {
      ...analytics,
      clickThroughRate: ctr,
      conversionRate,
      sellThroughRate,
      averageOrderValue:
        analytics.totalPurchases > 0
          ? analytics.totalRevenue / analytics.totalPurchases
          : 0,
    };
  }

  /**
   * Get all deals analytics (Admin)
   */
  async getAllDealsAnalytics(startDate?: Date, endDate?: Date) {
    const where: Prisma.DealWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const deals = await this.prisma.deal.findMany({
      where,
      include: {
        _count: {
          select: {
            dealPurchases: true,
            dealProducts: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return deals.map((deal) => ({
      id: deal.id,
      name: deal.name,
      type: deal.type,
      status: deal.status,
      views: deal.views,
      clicks: deal.clicks,
      conversions: deal.conversions,
      revenue: deal.revenue,
      ctr: deal.views > 0 ? (deal.clicks / deal.views) * 100 : 0,
      conversionRate:
        deal.clicks > 0 ? (deal.conversions / deal.clicks) * 100 : 0,
      productsCount: deal._count.dealProducts,
      purchasesCount: deal._count.dealPurchases,
    }));
  }

  // ==================== NOTIFICATIONS ====================

  /**
   * Notify users about deal
   */
  async notifyDeal(dto: NotifyDealDto) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dto.dealId },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    let userIds: string[] = [];

    if (dto.userId) {
      // Notify specific user
      userIds = [dto.userId];
    } else if (dto.tier) {
      // Notify all users of specific tier
      const loyaltyAccounts = await this.prisma.customerLoyalty.findMany({
        where: { currentTier: dto.tier },
        select: { userId: true },
      });
      userIds = loyaltyAccounts.map((acc) => acc.userId);
    } else {
      // Notify all users (use with caution)
      const users = await this.prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    }

    // Send notifications via email (async, don't block the response)
    this.sendDealNotifications(dto.dealId, userIds, dto.notificationType).catch(
      (error) => {
        this.logger.error(`Failed to send deal notifications: ${error.message}`, error.stack);
      },
    );

    // Update last notified time for users who have notification preferences
    await this.prisma.dealNotification.updateMany({
      where: {
        dealId: dto.dealId,
        userId: { in: userIds },
      },
      data: {
        lastNotifiedAt: new Date(),
      },
    });

    return {
      message: `Sent ${userIds.length} notifications`,
      count: userIds.length,
    };
  }

  // ==================== CRON JOBS ====================

  /**
   * Activate scheduled deals
   */
  async activateScheduledDeals() {
    const now = new Date();

    const dealsToActivate = await this.prisma.deal.findMany({
      where: {
        status: DealStatus.SCHEDULED,
        startTime: {
          lte: now,
        },
      },
    });

    for (const deal of dealsToActivate) {
      await this.prisma.deal.update({
        where: { id: deal.id },
        data: { status: DealStatus.ACTIVE },
      });
    }

    return {
      message: `Activated ${dealsToActivate.length} deals`,
      deals: dealsToActivate.map((d) => d.id),
    };
  }

  /**
   * End expired deals
   */
  async endExpiredDeals() {
    const now = new Date();

    const dealsToEnd = await this.prisma.deal.findMany({
      where: {
        status: DealStatus.ACTIVE,
        endTime: {
          lt: now,
        },
      },
    });

    for (const deal of dealsToEnd) {
      await this.prisma.deal.update({
        where: { id: deal.id },
        data: { status: DealStatus.ENDED },
      });
    }

    return {
      message: `Ended ${dealsToEnd.length} deals`,
      deals: dealsToEnd.map((d) => d.id),
    };
  }

  // ==================== HELPER METHODS ====================

  private validateDealTypeFields(dto: CreateDealDto) {
    switch (dto.type) {
      case DealType.PERCENTAGE_DISCOUNT:
      case DealType.FLASH_SALE:
      case DealType.DAILY_DEAL:
      case DealType.SEASONAL_SALE:
        if (!dto.discountPercentage) {
          throw new BadRequestException(
            `${dto.type} requires discountPercentage`,
          );
        }
        break;

      case DealType.FIXED_DISCOUNT:
        if (!dto.discountAmount) {
          throw new BadRequestException(
            'FIXED_DISCOUNT requires discountAmount',
          );
        }
        break;

      case DealType.BOGO:
        if (!dto.buyQuantity || !dto.getQuantity) {
          throw new BadRequestException(
            'BOGO requires buyQuantity and getQuantity',
          );
        }
        break;
    }
  }

  private isTierEligible(userTier: LoyaltyTier, requiredTier: LoyaltyTier): boolean {
    const tierOrder = [
      LoyaltyTier.BRONZE,
      LoyaltyTier.SILVER,
      LoyaltyTier.GOLD,
      LoyaltyTier.PLATINUM,
      LoyaltyTier.DIAMOND,
    ];

    const userIndex = tierOrder.indexOf(userTier);
    const requiredIndex = tierOrder.indexOf(requiredTier);

    return userIndex >= requiredIndex;
  }

  private calculateTimeRemaining(
    startTime: Date,
    endTime: Date,
    now: Date,
  ) {
    if (now < startTime) {
      const ms = startTime.getTime() - now.getTime();
      return {
        status: 'upcoming' as const,
        milliseconds: ms,
        seconds: Math.floor(ms / 1000),
        minutes: Math.floor(ms / 60000),
        hours: Math.floor(ms / 3600000),
        days: Math.floor(ms / 86400000),
      };
    } else if (now >= startTime && now <= endTime) {
      const ms = endTime.getTime() - now.getTime();
      return {
        status: 'active' as const,
        milliseconds: ms,
        seconds: Math.floor(ms / 1000),
        minutes: Math.floor(ms / 60000),
        hours: Math.floor(ms / 3600000),
        days: Math.floor(ms / 86400000),
      };
    } else {
      return {
        status: 'ended' as const,
        milliseconds: 0,
        seconds: 0,
        minutes: 0,
        hours: 0,
        days: 0,
      };
    }
  }

  private async updateDealAnalytics(
    dealId: string,
    updates: {
      views?: number;
      uniqueViews?: number;
      clicks?: number;
      conversions?: number;
      revenue?: number;
    },
  ) {
    const analytics = await this.prisma.dealAnalytics.findUnique({
      where: { dealId },
    });

    if (!analytics) {
      return;
    }

    const data: Prisma.DealAnalyticsUpdateInput = {};

    if (updates.views) {
      data.totalViews = { increment: updates.views };
    }
    if (updates.uniqueViews) {
      data.uniqueViews = { increment: updates.uniqueViews };
    }
    if (updates.clicks) {
      data.clicks = { increment: updates.clicks };
    }
    if (updates.conversions) {
      data.totalPurchases = { increment: updates.conversions };
    }
    if (updates.revenue) {
      data.totalRevenue = { increment: updates.revenue };
    }

    await this.prisma.dealAnalytics.update({
      where: { dealId },
      data,
    });

    // Recalculate derived metrics
    const updated = await this.prisma.dealAnalytics.findUnique({
      where: { dealId },
    });

    if (updated) {
      const ctr =
        updated.totalViews > 0
          ? (updated.clicks / updated.totalViews) * 100
          : 0;

      const conversionRate =
        updated.clicks > 0
          ? (updated.totalPurchases / updated.clicks) * 100
          : 0;

      await this.prisma.dealAnalytics.update({
        where: { dealId },
        data: {
          clickThroughRate: ctr,
          conversionRate,
        },
      });
    }
  }

  /**
   * Send deal notifications via email
   */
  private async sendDealNotifications(
    dealId: string,
    userIds: string[],
    notificationType: string,
  ): Promise<void> {
    // Get deal details
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        dealProducts: {
          include: {
            product: {
              select: {
                name: true,
                images: true,
                price: true,
              },
            },
          },
        },
      },
    });

    if (!deal) {
      this.logger.warn(`Deal ${dealId} not found, skipping notifications`);
      return;
    }

    // Get user details
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    });

    // Send emails to all users
    const emailPromises = users.map((user) =>
      this.sendDealNotificationEmail(user, deal, notificationType),
    );

    await Promise.allSettled(emailPromises);
    this.logger.log(`Sent ${users.length} deal notification emails for deal ${dealId}`);
  }

  /**
   * Send individual deal notification email
   */
  private async sendDealNotificationEmail(
    user: { email: string; name: string },
    deal: any,
    notificationType: string,
  ): Promise<void> {
    const subject = this.getDealNotificationSubject(deal, notificationType);
    const html = this.generateDealNotificationEmailTemplate(user.name, deal, notificationType);

    try {
      await this.emailService['sendEmail']({ to: user.email, subject, html });
    } catch (error) {
      this.logger.error(
        `Failed to send deal notification email to ${user.email}: ${error.message}`,
      );
    }
  }

  /**
   * Get notification subject based on type
   */
  private getDealNotificationSubject(deal: any, notificationType: string): string {
    switch (notificationType) {
      case 'DEAL_STARTING':
        return `🔥 ${deal.name} is starting soon!`;
      case 'DEAL_ACTIVE':
        return `✨ ${deal.name} is now live!`;
      case 'DEAL_ENDING':
        return `⏰ Last chance: ${deal.name} ending soon`;
      case 'EARLY_ACCESS':
        return `🌟 Early Access: ${deal.name}`;
      default:
        return `📢 Special Deal: ${deal.name}`;
    }
  }

  /**
   * Generate deal notification email template
   */
  private generateDealNotificationEmailTemplate(
    userName: string,
    deal: any,
    notificationType: string,
  ): string {
    const discountText = deal.discountPercentage
      ? `${deal.discountPercentage}% OFF`
      : deal.discountAmount
        ? `$${deal.discountAmount} OFF`
        : 'Special Deal';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deal Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px;">${deal.name}</h1>
              <p style="color: #ffffff; margin: 10px 0 0; font-size: 24px; font-weight: bold;">${discountText}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #333333; margin: 0 0 20px;">Hello ${userName},</p>
              <p style="font-size: 16px; color: #666666; line-height: 1.6; margin: 0 0 20px;">
                ${deal.description}
              </p>
              <div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 5px 0; color: #666666;"><strong>Deal Period:</strong> ${new Date(deal.startTime).toLocaleString()} - ${new Date(deal.endTime).toLocaleString()}</p>
                ${deal.totalStock ? `<p style="margin: 5px 0; color: #666666;"><strong>Stock Available:</strong> ${deal.remainingStock} / ${deal.totalStock}</p>` : ''}
                ${deal.limitPerCustomer ? `<p style="margin: 5px 0; color: #666666;"><strong>Limit per customer:</strong> ${deal.limitPerCustomer}</p>` : ''}
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/deals/${deal.id}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-size: 16px; font-weight: bold;">
                  View Deal
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="font-size: 12px; color: #999999; margin: 0;">© 2025 Broxiva. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}
