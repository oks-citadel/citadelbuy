import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface RFQ {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  requirements: any;
  items: RFQItem[];
  status: 'DRAFT' | 'PUBLISHED' | 'REVIEWING' | 'AWARDED' | 'CANCELLED';
  deadline: Date;
  budget?: number;
  currency?: string;
}

export interface RFQItem {
  productId?: string;
  description: string;
  quantity: number;
  specifications: any;
  targetPrice?: number;
}

export interface RFQResponse {
  id: string;
  rfqId: string;
  vendorId: string;
  items: RFQResponseItem[];
  totalPrice: number;
  currency: string;
  deliveryTime: number;
  validUntil: Date;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED';
}

export interface RFQResponseItem {
  rfqItemIndex: number;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  leadTime: number;
  notes?: string;
}

@Injectable()
export class RFQService {
  private readonly logger = new Logger(RFQService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new RFQ
   */
  async createRFQ(data: Omit<RFQ, 'id'>) {
    this.logger.log(`Creating RFQ: ${data.title}`);

    const rfq = await this.prisma.rFQ.create({
      data: {
        organizationId: data.organizationId,
        title: data.title,
        description: data.description,
        requirements: data.requirements as any,
        items: data.items as any,
        status: data.status || 'DRAFT',
        deadline: data.deadline,
        budget: data.budget,
        currency: data.currency || 'USD',
      },
    });

    this.logger.log(`RFQ created: ${rfq.id}`);
    return rfq;
  }

  /**
   * Get all RFQs
   */
  async getRFQs(filters?: {
    organizationId?: string;
    status?: string;
    vendorId?: string;
  }) {
    const where: any = {};

    if (filters?.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const rfqs = await this.prisma.rFQ.findMany({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        responses: {
          where: filters?.vendorId ? { vendorId: filters.vendorId } : undefined,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rfqs;
  }

  /**
   * Get RFQ by ID
   */
  async getRFQById(id: string) {
    const rfq = await this.prisma.rFQ.findUnique({
      where: { id },
      include: {
        organization: true,
        responses: {
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
                rating: true,
              },
            },
          },
        },
      },
    });

    if (!rfq) {
      throw new NotFoundException(`RFQ ${id} not found`);
    }

    return rfq;
  }

  /**
   * Update RFQ
   */
  async updateRFQ(id: string, updates: Partial<RFQ>) {
    const rfq = await this.getRFQById(id);

    if (rfq.status === 'AWARDED') {
      throw new BadRequestException('Cannot update awarded RFQ');
    }

    return this.prisma.rFQ.update({
      where: { id },
      data: {
        title: updates.title,
        description: updates.description,
        requirements: updates.requirements as any,
        items: updates.items as any,
        status: updates.status,
        deadline: updates.deadline,
        budget: updates.budget,
      },
    });
  }

  /**
   * Publish RFQ (make it available to vendors)
   */
  async publishRFQ(id: string) {
    const rfq = await this.getRFQById(id);

    if (rfq.status !== 'DRAFT') {
      throw new BadRequestException('Only draft RFQs can be published');
    }

    const updated = await this.prisma.rFQ.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    // Notify eligible vendors
    await this.notifyVendors(updated);

    this.logger.log(`RFQ published: ${id}`);
    return updated;
  }

  /**
   * Submit vendor response to RFQ
   */
  async submitResponse(data: Omit<RFQResponse, 'id'>) {
    this.logger.log(`Submitting RFQ response for RFQ: ${data.rfqId}`);

    const rfq = await this.getRFQById(data.rfqId);

    if (rfq.status !== 'PUBLISHED') {
      throw new BadRequestException('RFQ is not accepting responses');
    }

    if (rfq.deadline && new Date() > new Date(rfq.deadline)) {
      throw new BadRequestException('RFQ deadline has passed');
    }

    // Check if vendor already submitted
    const existing = await this.prisma.rFQResponse.findFirst({
      where: {
        rfqId: data.rfqId,
        vendorId: data.vendorId,
      },
    });

    if (existing) {
      throw new BadRequestException('Vendor has already submitted a response');
    }

    const response = await this.prisma.rFQResponse.create({
      data: {
        rfq: { connect: { id: data.rfqId } },
        vendor: { connect: { id: data.vendorId } },
        proposal: data.items as any,
        quotedPrice: data.totalPrice,
        items: data.items as any,
        totalPrice: data.totalPrice,
        currency: data.currency,
        deliveryTime: data.deliveryTime,
        validUntil: data.validUntil,
        status: 'SUBMITTED',
      },
    });

    // Update RFQ status
    await this.prisma.rFQ.update({
      where: { id: data.rfqId },
      data: { status: 'REVIEWING' },
    });

    this.logger.log(`RFQ response submitted: ${response.id}`);
    return response;
  }

  /**
   * Get all responses for an RFQ
   */
  async getRFQResponses(rfqId: string) {
    await this.getRFQById(rfqId);

    return this.prisma.rFQResponse.findMany({
      where: { rfqId },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            rating: true,
            businessName: true,
          },
        },
      },
      orderBy: { totalPrice: 'asc' },
    });
  }

  /**
   * Compare RFQ responses
   */
  async compareResponses(rfqId: string) {
    const responses = await this.getRFQResponses(rfqId);

    if (responses.length === 0) {
      return {
        rfqId,
        responseCount: 0,
        comparison: null,
      };
    }

    const comparison = {
      lowestPrice: Math.min(...responses.map((r) => r.totalPrice ?? 0)),
      highestPrice: Math.max(...responses.map((r) => r.totalPrice ?? 0)),
      averagePrice: responses.reduce((sum, r) => sum + (r.totalPrice ?? 0), 0) / responses.length,
      fastestDelivery: Math.min(...responses.map((r) => r.deliveryTime ?? 0)),
      slowestDelivery: Math.max(...responses.map((r) => r.deliveryTime ?? 0)),
      recommendedVendor: this.selectRecommendedVendor(responses),
    };

    return {
      rfqId,
      responseCount: responses.length,
      responses: responses.map((r) => ({
        id: r.id,
        vendorId: r.vendorId,
        vendorName: (r as any).vendor?.name || 'Unknown',
        vendorRating: (r as any).vendor?.rating || 0,
        totalPrice: r.totalPrice,
        deliveryTime: r.deliveryTime,
        score: this.calculateResponseScore(r, comparison),
      })),
      comparison,
    };
  }

  /**
   * Award RFQ to a vendor
   */
  async awardRFQ(rfqId: string, responseId: string) {
    const rfq = await this.getRFQById(rfqId);
    const response = await this.prisma.rFQResponse.findUnique({
      where: { id: responseId },
    });

    if (!response || response.rfqId !== rfqId) {
      throw new NotFoundException('Response not found for this RFQ');
    }

    if (rfq.status === 'AWARDED') {
      throw new BadRequestException('RFQ already awarded');
    }

    // Update RFQ status
    await this.prisma.rFQ.update({
      where: { id: rfqId },
      data: {
        status: 'AWARDED',
        awardedResponseId: responseId,
        awardedAt: new Date(),
      },
    });

    // Update response status
    await this.prisma.rFQResponse.update({
      where: { id: responseId },
      data: { status: 'ACCEPTED' },
    });

    // Reject other responses
    await this.prisma.rFQResponse.updateMany({
      where: {
        rfqId,
        id: { not: responseId },
      },
      data: { status: 'REJECTED' },
    });

    this.logger.log(`RFQ ${rfqId} awarded to response ${responseId}`);

    // Create purchase order
    await this.createPurchaseOrder(rfqId, responseId);

    return { success: true, rfqId, responseId };
  }

  /**
   * Cancel RFQ
   */
  async cancelRFQ(id: string, reason: string) {
    const rfq = await this.getRFQById(id);

    if (rfq.status === 'AWARDED') {
      throw new BadRequestException('Cannot cancel awarded RFQ');
    }

    await this.prisma.rFQ.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason,
      },
    });

    this.logger.log(`RFQ cancelled: ${id}`);
    return { success: true };
  }

  /**
   * Get RFQ analytics
   */
  async getRFQAnalytics(organizationId?: string) {
    const where: any = organizationId ? { organizationId } : {};

    const total = await this.prisma.rFQ.count({ where });
    const published = await this.prisma.rFQ.count({
      where: { ...where, status: 'PUBLISHED' },
    });
    const awarded = await this.prisma.rFQ.count({
      where: { ...where, status: 'AWARDED' },
    });
    const cancelled = await this.prisma.rFQ.count({
      where: { ...where, status: 'CANCELLED' },
    });

    const avgResponseCount = await this.getAverageResponseCount(where);

    return {
      total,
      published,
      awarded,
      cancelled,
      awardRate: total > 0 ? (awarded / total) * 100 : 0,
      averageResponsesPerRFQ: avgResponseCount,
    };
  }

  /**
   * Notify vendors about new RFQ
   */
  private async notifyVendors(rfq: any) {
    // In production, send email/notification to eligible vendors
    this.logger.log(`Notifying vendors about RFQ: ${rfq.id}`);
  }

  /**
   * Calculate response score
   */
  private calculateResponseScore(response: any, comparison: any): number {
    // Price score (50%)
    const priceScore = (1 - (response.totalPrice - comparison.lowestPrice) /
      (comparison.highestPrice - comparison.lowestPrice || 1)) * 50;

    // Delivery score (30%)
    const deliveryScore = (1 - (response.deliveryTime - comparison.fastestDelivery) /
      (comparison.slowestDelivery - comparison.fastestDelivery || 1)) * 30;

    // Vendor rating score (20%)
    const ratingScore = (response.vendor?.rating || 0) / 5 * 20;

    return Math.round(priceScore + deliveryScore + ratingScore);
  }

  /**
   * Select recommended vendor
   */
  private selectRecommendedVendor(responses: any[]): any {
    let bestScore = -1;
    let recommended = null;

    for (const response of responses) {
      const comparison = {
        lowestPrice: Math.min(...responses.map((r) => r.totalPrice ?? 0)),
        highestPrice: Math.max(...responses.map((r) => r.totalPrice ?? 0)),
        fastestDelivery: Math.min(...responses.map((r) => r.deliveryTime ?? 0)),
        slowestDelivery: Math.max(...responses.map((r) => r.deliveryTime ?? 0)),
      };

      const score = this.calculateResponseScore(response, comparison);

      if (score > bestScore) {
        bestScore = score;
        recommended = response;
      }
    }

    return recommended ? {
      responseId: recommended.id,
      vendorId: recommended.vendorId,
      vendorName: recommended.vendor.name,
      score: bestScore,
    } : null;
  }

  /**
   * Get average response count
   */
  private async getAverageResponseCount(where: any): Promise<number> {
    const rfqs = await this.prisma.rFQ.findMany({
      where,
      include: {
        _count: {
          select: { responses: true },
        },
      },
    });

    if (rfqs.length === 0) {
      return 0;
    }

    const total = rfqs.reduce((sum, rfq) => sum + rfq._count.responses, 0);
    return total / rfqs.length;
  }

  /**
   * Create purchase order from awarded RFQ
   */
  private async createPurchaseOrder(rfqId: string, responseId: string) {
    // Integration with order system
    this.logger.log(`Creating purchase order for RFQ ${rfqId}, response ${responseId}`);
  }
}
