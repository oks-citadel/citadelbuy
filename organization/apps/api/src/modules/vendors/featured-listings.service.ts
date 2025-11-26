import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FeaturedPosition, FeaturedStatus } from '@prisma/client';

export interface CreateFeaturedListingDto {
  productId: string;
  position: FeaturedPosition;
  startDate: Date;
  endDate: Date;
  categoryId?: string;
}

export interface FeaturedListingDetails {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  vendorId: string;
  vendorName: string;
  position: FeaturedPosition;
  priority: number;
  startDate: Date;
  endDate: Date;
  cost: number;
  status: FeaturedStatus;
  impressions: number;
  clicks: number;
  ctr: number;
  paymentStatus?: string;
  createdAt: Date;
}

@Injectable()
export class FeaturedListingsService {
  private readonly logger = new Logger(FeaturedListingsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get available featured slots
   */
  async getAvailableSlots(position?: FeaturedPosition, categoryId?: string) {
    const where: any = { isActive: true };
    if (position) {
      where.position = position;
    }
    if (categoryId) {
      where.OR = [{ categoryId }, { categoryId: null }];
    }

    const slots = await this.prisma.featuredSlot.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    // For each slot, check how many active listings exist
    const slotsWithAvailability = await Promise.all(
      slots.map(async (slot) => {
        const activeListings = await this.prisma.featuredListing.count({
          where: {
            position: slot.position,
            status: 'ACTIVE',
            endDate: { gte: new Date() },
          },
        });

        return {
          id: slot.id,
          position: slot.position,
          category: slot.category,
          maxListings: slot.maxListings,
          currentListings: activeListings,
          availableSpots: Math.max(0, slot.maxListings - activeListings),
          dailyRate: slot.dailyRate,
          weeklyRate: slot.weeklyRate,
          monthlyRate: slot.monthlyRate,
        };
      }),
    );

    return slotsWithAvailability;
  }

  /**
   * Calculate the cost for a featured listing
   */
  calculateCost(slot: any, startDate: Date, endDate: Date): number {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (days >= 28) {
      return slot.monthlyRate * Math.ceil(days / 30);
    } else if (days >= 7) {
      return slot.weeklyRate * Math.ceil(days / 7);
    } else {
      return slot.dailyRate * days;
    }
  }

  /**
   * Create a featured listing request
   */
  async createFeaturedListing(
    vendorId: string,
    dto: CreateFeaturedListingDto,
  ): Promise<FeaturedListingDetails> {
    // Verify product belongs to vendor
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        vendor: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      select: { userId: true, businessName: true },
    });

    if (!vendor || product.vendorId !== vendor.userId) {
      throw new BadRequestException('Product does not belong to this vendor');
    }

    // Check if there's an existing active listing for this product
    const existingListing = await this.prisma.featuredListing.findFirst({
      where: {
        productId: dto.productId,
        status: { in: ['PENDING', 'ACTIVE'] },
        endDate: { gte: new Date() },
      },
    });

    if (existingListing) {
      throw new BadRequestException('Product already has an active or pending featured listing');
    }

    // Get slot and calculate cost
    const slot = await this.prisma.featuredSlot.findFirst({
      where: {
        position: dto.position,
        OR: dto.categoryId
          ? [{ categoryId: dto.categoryId }, { categoryId: null }]
          : [{ categoryId: null }],
        isActive: true,
      },
    });

    if (!slot) {
      throw new BadRequestException('Featured slot not available for this position');
    }

    // Check availability
    const activeListings = await this.prisma.featuredListing.count({
      where: {
        position: dto.position,
        status: 'ACTIVE',
        endDate: { gte: new Date() },
      },
    });

    if (activeListings >= slot.maxListings) {
      throw new BadRequestException('No available spots for this position');
    }

    const cost = this.calculateCost(slot, dto.startDate, dto.endDate);

    // Create the listing
    const listing = await this.prisma.featuredListing.create({
      data: {
        productId: dto.productId,
        vendorId,
        position: dto.position,
        priority: 0,
        startDate: dto.startDate,
        endDate: dto.endDate,
        cost,
        status: 'PENDING',
        paymentStatus: 'pending',
      },
      include: {
        product: {
          select: { name: true, images: true },
        },
        vendor: {
          select: { businessName: true },
        },
      },
    });

    this.logger.log(`Featured listing created for product ${dto.productId}: ${cost}`);

    return this.formatListingDetails(listing);
  }

  /**
   * Approve and activate a featured listing (after payment)
   */
  async activateListing(listingId: string, paymentId: string): Promise<FeaturedListingDetails> {
    const listing = await this.prisma.featuredListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Featured listing not found');
    }

    if (listing.status !== 'PENDING') {
      throw new BadRequestException('Listing is not in pending status');
    }

    const now = new Date();
    const status = listing.startDate <= now ? 'ACTIVE' : 'PENDING';

    const updatedListing = await this.prisma.featuredListing.update({
      where: { id: listingId },
      data: {
        status,
        paymentId,
        paymentStatus: 'paid',
      },
      include: {
        product: {
          select: { name: true, images: true },
        },
        vendor: {
          select: { businessName: true },
        },
      },
    });

    return this.formatListingDetails(updatedListing);
  }

  /**
   * Cancel a featured listing
   */
  async cancelListing(listingId: string, vendorId: string): Promise<void> {
    const listing = await this.prisma.featuredListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Featured listing not found');
    }

    if (listing.vendorId !== vendorId) {
      throw new BadRequestException('Listing does not belong to this vendor');
    }

    if (listing.status === 'EXPIRED' || listing.status === 'CANCELLED') {
      throw new BadRequestException('Listing already cancelled or expired');
    }

    await this.prisma.featuredListing.update({
      where: { id: listingId },
      data: {
        status: 'CANCELLED',
        paymentStatus: listing.paymentStatus === 'paid' ? 'refunded' : 'cancelled',
      },
    });

    this.logger.log(`Featured listing ${listingId} cancelled`);
  }

  /**
   * Get vendor's featured listings
   */
  async getVendorListings(
    vendorId: string,
    page: number = 1,
    limit: number = 10,
    status?: FeaturedStatus,
  ) {
    const where: any = { vendorId };
    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      this.prisma.featuredListing.findMany({
        where,
        include: {
          product: {
            select: { name: true, images: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.featuredListing.count({ where }),
    ]);

    return {
      data: listings.map((l) => ({
        id: l.id,
        productId: l.productId,
        productName: l.product.name,
        productImage: l.product.images[0],
        position: l.position,
        startDate: l.startDate,
        endDate: l.endDate,
        cost: l.cost,
        status: l.status,
        impressions: l.impressions,
        clicks: l.clicks,
        ctr: l.impressions > 0 ? (l.clicks / l.impressions) * 100 : 0,
        paymentStatus: l.paymentStatus,
        createdAt: l.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get active featured products for display
   */
  async getFeaturedProducts(position: FeaturedPosition, categoryId?: string, limit: number = 10) {
    const where: any = {
      status: 'ACTIVE',
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
      position,
    };

    const listings = await this.prisma.featuredListing.findMany({
      where,
      include: {
        product: {
          include: {
            category: true,
            vendor: {
              select: { name: true },
            },
            reviews: {
              select: { rating: true },
            },
          },
        },
        vendor: {
          select: { businessName: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: limit,
    });

    // Increment impressions
    const listingIds = listings.map((l) => l.id);
    if (listingIds.length > 0) {
      await this.prisma.featuredListing.updateMany({
        where: { id: { in: listingIds } },
        data: { impressions: { increment: 1 } },
      });
    }

    return listings.map((l) => ({
      listingId: l.id,
      product: {
        id: l.product.id,
        name: l.product.name,
        slug: l.product.slug,
        price: l.product.price,
        images: l.product.images,
        category: l.product.category,
        vendorName: l.product.vendor.name,
        rating:
          l.product.reviews.length > 0
            ? l.product.reviews.reduce((sum, r) => sum + r.rating, 0) / l.product.reviews.length
            : 0,
        reviewCount: l.product.reviews.length,
      },
      vendorName: l.vendor.businessName,
      position: l.position,
      isFeatured: true,
    }));
  }

  /**
   * Track a click on a featured listing
   */
  async trackClick(listingId: string): Promise<void> {
    await this.prisma.featuredListing.update({
      where: { id: listingId },
      data: { clicks: { increment: 1 } },
    });
  }

  /**
   * Get all listings (admin)
   */
  async getAllListings(
    page: number = 1,
    limit: number = 10,
    status?: FeaturedStatus,
    position?: FeaturedPosition,
  ) {
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (position) {
      where.position = position;
    }

    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      this.prisma.featuredListing.findMany({
        where,
        include: {
          product: {
            select: { name: true, images: true },
          },
          vendor: {
            select: { businessName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.featuredListing.count({ where }),
    ]);

    return {
      data: listings.map((l) => this.formatListingDetails(l)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get featured listing statistics
   */
  async getListingStats(vendorId?: string) {
    const where: any = {};
    if (vendorId) {
      where.vendorId = vendorId;
    }

    const [active, pending, expired, revenue, totalClicks, totalImpressions] = await Promise.all([
      this.prisma.featuredListing.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.featuredListing.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.featuredListing.count({ where: { ...where, status: 'EXPIRED' } }),
      this.prisma.featuredListing.aggregate({
        where: { ...where, paymentStatus: 'paid' },
        _sum: { cost: true },
      }),
      this.prisma.featuredListing.aggregate({
        where,
        _sum: { clicks: true },
      }),
      this.prisma.featuredListing.aggregate({
        where,
        _sum: { impressions: true },
      }),
    ]);

    const clicks = totalClicks._sum.clicks || 0;
    const impressions = totalImpressions._sum.impressions || 0;

    return {
      active,
      pending,
      expired,
      totalRevenue: revenue._sum.cost || 0,
      totalClicks: clicks,
      totalImpressions: impressions,
      averageCtr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    };
  }

  /**
   * Update listing statuses (runs every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async updateListingStatuses() {
    const now = new Date();

    // Activate pending listings that should start
    const activated = await this.prisma.featuredListing.updateMany({
      where: {
        status: 'PENDING',
        paymentStatus: 'paid',
        startDate: { lte: now },
        endDate: { gt: now },
      },
      data: { status: 'ACTIVE' },
    });

    // Expire active listings that have ended
    const expired = await this.prisma.featuredListing.updateMany({
      where: {
        status: 'ACTIVE',
        endDate: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });

    if (activated.count > 0 || expired.count > 0) {
      this.logger.log(`Updated listings: ${activated.count} activated, ${expired.count} expired`);
    }
  }

  /**
   * Create or update a featured slot (admin)
   */
  async upsertSlot(data: {
    position: FeaturedPosition;
    categoryId?: string;
    maxListings: number;
    dailyRate: number;
    weeklyRate: number;
    monthlyRate: number;
    isActive?: boolean;
  }) {
    const existing = await this.prisma.featuredSlot.findFirst({
      where: {
        position: data.position,
        categoryId: data.categoryId || null,
      },
    });

    if (existing) {
      return this.prisma.featuredSlot.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.featuredSlot.create({
      data: {
        ...data,
        categoryId: data.categoryId || null,
      },
    });
  }

  private formatListingDetails(listing: any): FeaturedListingDetails {
    return {
      id: listing.id,
      productId: listing.productId,
      productName: listing.product?.name || '',
      productImage: listing.product?.images?.[0],
      vendorId: listing.vendorId,
      vendorName: listing.vendor?.businessName || '',
      position: listing.position,
      priority: listing.priority,
      startDate: listing.startDate,
      endDate: listing.endDate,
      cost: listing.cost,
      status: listing.status,
      impressions: listing.impressions,
      clicks: listing.clicks,
      ctr: listing.impressions > 0 ? (listing.clicks / listing.impressions) * 100 : 0,
      paymentStatus: listing.paymentStatus,
      createdAt: listing.createdAt,
    };
  }
}
