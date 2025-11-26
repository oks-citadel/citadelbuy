import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export interface PayoutSummary {
  vendorId: string;
  vendorName: string;
  periodStart: Date;
  periodEnd: Date;
  orderCount: number;
  grossAmount: number;
  commissionAmount: number;
  refundAmount: number;
  netAmount: number;
  status: string;
}

export interface PayoutDetails {
  id: string;
  vendorName: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  periodStart: Date;
  periodEnd: Date;
  totalSales: number;
  totalCommission: number;
  platformFees: number;
  adjustments: number;
  netAmount: number;
  transactionId?: string;
  processedAt?: Date;
  processedBy?: string;
  orderIds: string[];
  createdAt: Date;
}

@Injectable()
export class VendorPayoutsService {
  private readonly logger = new Logger(VendorPayoutsService.name);
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(apiKey || 'sk_test_dummy', {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Calculate pending payouts for all eligible vendors
   */
  async calculatePendingPayouts(periodStart: Date, periodEnd: Date): Promise<PayoutSummary[]> {
    const vendors = await this.prisma.vendorProfile.findMany({
      where: {
        isVerified: true,
        canSell: true,
      },
      select: {
        id: true,
        businessName: true,
        commissionRate: true,
        userId: true,
      },
    });

    const payoutSummaries: PayoutSummary[] = [];

    for (const vendor of vendors) {
      const summary = await this.calculateVendorPayout(vendor.id, periodStart, periodEnd);
      if (summary.netAmount > 0) {
        payoutSummaries.push({
          ...summary,
          vendorName: vendor.businessName,
          status: 'PENDING',
        });
      }
    }

    return payoutSummaries;
  }

  /**
   * Calculate payout for a single vendor
   */
  async calculateVendorPayout(
    vendorId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{
    vendorId: string;
    vendorName: string;
    periodStart: Date;
    periodEnd: Date;
    orderCount: number;
    grossAmount: number;
    commissionAmount: number;
    refundAmount: number;
    netAmount: number;
    orderIds: string[];
  }> {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        businessName: true,
        commissionRate: true,
        userId: true,
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Get completed orders for this vendor in the period
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
        items: {
          some: {
            product: {
              vendorId: vendor.userId,
            },
          },
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: { vendorId: true },
            },
          },
        },
        refunds: {
          where: { status: 'COMPLETED' },
        },
      },
    });

    // Calculate vendor's share of each order
    let grossAmount = 0;
    let refundAmount = 0;
    const orderIds: string[] = [];

    for (const order of orders) {
      const vendorItems = order.items.filter((item) => item.product.vendorId === vendor.userId);
      const vendorTotal = vendorItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      grossAmount += vendorTotal;
      orderIds.push(order.id);

      // Calculate refunds for this vendor's items
      for (const refund of order.refunds) {
        if (refund.status === 'COMPLETED') {
          // Approximate vendor's share of refund
          const orderTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
          const vendorRefundShare = (vendorTotal / orderTotal) * (refund.subtotal || 0);
          refundAmount += vendorRefundShare;
        }
      }
    }

    // Calculate commission
    const commissionRate = vendor.commissionRate || 15;
    const commissionAmount = (grossAmount * commissionRate) / 100;
    const netAmount = grossAmount - commissionAmount - refundAmount;

    return {
      vendorId: vendor.id,
      vendorName: vendor.businessName,
      periodStart,
      periodEnd,
      orderCount: orders.length,
      grossAmount: Math.round(grossAmount * 100) / 100,
      commissionAmount: Math.round(commissionAmount * 100) / 100,
      refundAmount: Math.round(refundAmount * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
      orderIds,
    };
  }

  /**
   * Create a payout record for a vendor
   */
  async createPayout(
    vendorId: string,
    periodStart: Date,
    periodEnd: Date,
    adminId?: string,
  ): Promise<PayoutDetails> {
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        businessName: true,
        commissionRate: true,
        userId: true,
        paypalEmail: true,
        stripeAccountId: true,
        bankName: true,
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Check for existing payout in this period
    const existingPayout = await this.prisma.vendorPayout.findFirst({
      where: {
        vendorProfileId: vendorId,
        periodStart,
        periodEnd,
        status: { not: 'FAILED' },
      },
    });

    if (existingPayout) {
      throw new BadRequestException('Payout already exists for this period');
    }

    // Calculate payout amounts
    const calculation = await this.calculateVendorPayout(vendorId, periodStart, periodEnd);

    if (calculation.netAmount <= 0) {
      throw new BadRequestException('No payout amount to process');
    }

    // Determine payout method
    let payoutMethod: 'BANK_TRANSFER' | 'PAYPAL' | 'STRIPE' | 'CHECK' = 'BANK_TRANSFER';
    if (vendor.stripeAccountId) {
      payoutMethod = 'STRIPE';
    } else if (vendor.paypalEmail) {
      payoutMethod = 'PAYPAL';
    }

    // Create payout record
    const payout = await this.prisma.vendorPayout.create({
      data: {
        vendorProfileId: vendorId,
        amount: calculation.netAmount,
        currency: 'USD',
        status: 'PENDING',
        method: payoutMethod,
        periodStart,
        periodEnd,
        totalSales: calculation.grossAmount,
        totalCommission: calculation.commissionAmount,
        netAmount: calculation.netAmount,
        orderIds: calculation.orderIds,
        reference: `PAY-${Date.now().toString(36).toUpperCase()}`,
      },
      include: {
        vendorProfile: {
          select: { businessName: true },
        },
      },
    });

    this.logger.log(`Payout created for vendor ${vendorId}: ${calculation.netAmount}`);

    return {
      id: payout.id,
      vendorName: payout.vendorProfile.businessName,
      amount: payout.amount,
      currency: payout.currency,
      status: payout.status,
      method: payout.method,
      periodStart: payout.periodStart,
      periodEnd: payout.periodEnd,
      totalSales: payout.totalSales,
      totalCommission: payout.totalCommission,
      platformFees: payout.platformFees,
      adjustments: payout.adjustments,
      netAmount: payout.netAmount,
      transactionId: payout.transactionId ?? undefined,
      processedAt: payout.processedAt ?? undefined,
      processedBy: payout.processedBy ?? undefined,
      orderIds: payout.orderIds,
      createdAt: payout.createdAt,
    };
  }

  /**
   * Process a pending payout (execute the actual payment)
   */
  async processPayout(payoutId: string, adminId: string): Promise<PayoutDetails> {
    const payout = await this.prisma.vendorPayout.findUnique({
      where: { id: payoutId },
      include: {
        vendorProfile: {
          select: {
            businessName: true,
            paypalEmail: true,
            stripeAccountId: true,
            bankName: true,
            accountNumber: true,
          },
        },
      },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== 'PENDING') {
      throw new BadRequestException('Payout is not in pending status');
    }

    // Update status to processing
    await this.prisma.vendorPayout.update({
      where: { id: payoutId },
      data: { status: 'PROCESSING' },
    });

    try {
      let transactionId: string | undefined;

      // Process based on payment method
      if (payout.method === 'STRIPE' && payout.vendorProfile.stripeAccountId) {
        // Create Stripe transfer
        const transfer = await this.stripe.transfers.create({
          amount: Math.round(payout.amount * 100),
          currency: payout.currency.toLowerCase(),
          destination: payout.vendorProfile.stripeAccountId,
          description: `Payout for ${payout.periodStart.toISOString().split('T')[0]} to ${payout.periodEnd.toISOString().split('T')[0]}`,
          metadata: {
            payoutId: payout.id,
            vendorId: payout.vendorProfileId,
          },
        });
        transactionId = transfer.id;
      } else {
        // For other methods, generate a reference ID
        // In production, integrate with PayPal, bank transfer APIs, etc.
        transactionId = `TXN-${Date.now().toString(36).toUpperCase()}`;
      }

      // Update payout as completed
      const updatedPayout = await this.prisma.vendorPayout.update({
        where: { id: payoutId },
        data: {
          status: 'COMPLETED',
          transactionId,
          processedAt: new Date(),
          processedBy: adminId,
        },
        include: {
          vendorProfile: {
            select: { businessName: true },
          },
        },
      });

      // Update vendor profile
      await this.prisma.vendorProfile.update({
        where: { id: payout.vendorProfileId },
        data: { lastPayoutAt: new Date() },
      });

      this.logger.log(`Payout ${payoutId} processed successfully: ${transactionId}`);

      return {
        id: updatedPayout.id,
        vendorName: updatedPayout.vendorProfile.businessName,
        amount: updatedPayout.amount,
        currency: updatedPayout.currency,
        status: updatedPayout.status,
        method: updatedPayout.method,
        periodStart: updatedPayout.periodStart,
        periodEnd: updatedPayout.periodEnd,
        totalSales: updatedPayout.totalSales,
        totalCommission: updatedPayout.totalCommission,
        platformFees: updatedPayout.platformFees,
        adjustments: updatedPayout.adjustments,
        netAmount: updatedPayout.netAmount,
        transactionId: updatedPayout.transactionId ?? undefined,
        processedAt: updatedPayout.processedAt ?? undefined,
        processedBy: updatedPayout.processedBy ?? undefined,
        orderIds: updatedPayout.orderIds,
        createdAt: updatedPayout.createdAt,
      };
    } catch (error: any) {
      // Mark payout as failed
      await this.prisma.vendorPayout.update({
        where: { id: payoutId },
        data: {
          status: 'FAILED',
          failureReason: error.message,
        },
      });

      this.logger.error(`Payout ${payoutId} failed: ${error.message}`);
      throw new BadRequestException(`Payout failed: ${error.message}`);
    }
  }

  /**
   * Get payouts for a vendor
   */
  async getVendorPayouts(
    vendorId: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
  ) {
    const where: any = { vendorProfileId: vendorId };
    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [payouts, total] = await Promise.all([
      this.prisma.vendorPayout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.vendorPayout.count({ where }),
    ]);

    return {
      data: payouts.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        method: p.method,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        netAmount: p.netAmount,
        transactionId: p.transactionId,
        processedAt: p.processedAt,
        createdAt: p.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all payouts (admin)
   */
  async getAllPayouts(
    page: number = 1,
    limit: number = 10,
    status?: string,
    vendorId?: string,
  ) {
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (vendorId) {
      where.vendorProfileId = vendorId;
    }

    const skip = (page - 1) * limit;

    const [payouts, total] = await Promise.all([
      this.prisma.vendorPayout.findMany({
        where,
        include: {
          vendorProfile: {
            select: { businessName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.vendorPayout.count({ where }),
    ]);

    return {
      data: payouts.map((p) => ({
        id: p.id,
        vendorId: p.vendorProfileId,
        vendorName: p.vendorProfile.businessName,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        method: p.method,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        netAmount: p.netAmount,
        transactionId: p.transactionId,
        processedAt: p.processedAt,
        createdAt: p.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get payout details
   */
  async getPayoutDetails(payoutId: string): Promise<PayoutDetails> {
    const payout = await this.prisma.vendorPayout.findUnique({
      where: { id: payoutId },
      include: {
        vendorProfile: {
          select: { businessName: true },
        },
      },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    return {
      id: payout.id,
      vendorName: payout.vendorProfile.businessName,
      amount: payout.amount,
      currency: payout.currency,
      status: payout.status,
      method: payout.method,
      periodStart: payout.periodStart,
      periodEnd: payout.periodEnd,
      totalSales: payout.totalSales,
      totalCommission: payout.totalCommission,
      platformFees: payout.platformFees,
      adjustments: payout.adjustments,
      netAmount: payout.netAmount,
      transactionId: payout.transactionId ?? undefined,
      processedAt: payout.processedAt ?? undefined,
      processedBy: payout.processedBy ?? undefined,
      orderIds: payout.orderIds,
      createdAt: payout.createdAt,
    };
  }

  /**
   * Get payout statistics
   */
  async getPayoutStats(vendorId?: string) {
    const where: any = {};
    if (vendorId) {
      where.vendorProfileId = vendorId;
    }

    const [pending, completed, failed, totalPaid] = await Promise.all([
      this.prisma.vendorPayout.aggregate({
        where: { ...where, status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.vendorPayout.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.vendorPayout.aggregate({
        where: { ...where, status: 'FAILED' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.vendorPayout.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _sum: { netAmount: true },
      }),
    ]);

    return {
      pending: {
        count: pending._count,
        amount: pending._sum.amount || 0,
      },
      completed: {
        count: completed._count,
        amount: completed._sum.amount || 0,
      },
      failed: {
        count: failed._count,
        amount: failed._sum.amount || 0,
      },
      totalPaid: totalPaid._sum.netAmount || 0,
    };
  }

  /**
   * Automated payout generation (runs on the 1st of each month)
   */
  @Cron('0 0 1 * *')
  async generateMonthlyPayouts() {
    this.logger.log('Starting automated monthly payout generation');

    // Calculate period (previous month)
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1, 0, 0, 0);

    try {
      const summaries = await this.calculatePendingPayouts(periodStart, periodEnd);

      for (const summary of summaries) {
        try {
          await this.createPayout(summary.vendorId, periodStart, periodEnd);
          this.logger.log(`Created payout for vendor ${summary.vendorId}: ${summary.netAmount}`);
        } catch (error: any) {
          this.logger.error(`Failed to create payout for vendor ${summary.vendorId}: ${error.message}`);
        }
      }

      this.logger.log(`Completed monthly payout generation: ${summaries.length} payouts created`);
    } catch (error: any) {
      this.logger.error(`Monthly payout generation failed: ${error.message}`);
    }
  }
}
