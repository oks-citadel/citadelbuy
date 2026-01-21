import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface EscrowAccount {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'FUNDED' | 'IN_PROGRESS' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';
  milestones?: EscrowMilestone[];
}

export interface EscrowMilestone {
  id: string;
  description: string;
  amount: number;
  percentage: number;
  status: 'PENDING' | 'APPROVED' | 'RELEASED' | 'DISPUTED';
  dueDate?: Date;
  completedDate?: Date;
  evidence?: any[];
}

export interface EscrowDispute {
  id: string;
  escrowId: string;
  initiatedBy: 'BUYER' | 'SELLER';
  reason: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'ESCALATED';
  resolution?: string;
}

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create escrow account for high-value transaction
   */
  async createEscrow(data: {
    orderId: string;
    buyerId: string;
    sellerId: string;
    amount: number;
    currency?: string;
    milestones?: Omit<EscrowMilestone, 'id'>[];
  }) {
    this.logger.log(`Creating escrow for order: ${data.orderId}`);

    // Validate order exists
    const order = await this.prisma.order.findUnique({
      where: { id: data.orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Create escrow account
    const escrow = await this.prisma.escrowAccount.create({
      data: {
        orderId: data.orderId,
        buyerId: data.buyerId,
        sellerId: data.sellerId,
        amount: data.amount,
        currency: data.currency || 'USD',
        status: 'PENDING',
        milestones: data.milestones as any,
        fees: this.calculateEscrowFees(data.amount),
      },
    });

    this.logger.log(`Escrow created: ${escrow.id}`);
    return escrow;
  }

  /**
   * Fund escrow account (buyer deposits funds)
   */
  async fundEscrow(escrowId: string, paymentDetails: any) {
    this.logger.log(`Funding escrow: ${escrowId}`);

    const escrow = await this.getEscrowById(escrowId);

    if (escrow.status !== 'PENDING') {
      throw new BadRequestException('Escrow is not in pending status');
    }

    // Process payment (integrate with payment gateway)
    const payment = await this.processEscrowPayment(escrow, paymentDetails);

    if (!payment.success) {
      throw new BadRequestException('Payment failed');
    }

    // Update escrow status
    const updated = await this.prisma.escrowAccount.update({
      where: { id: escrowId },
      data: {
        status: 'FUNDED',
        fundedAt: new Date(),
        paymentReference: payment.reference,
      },
    });

    // Notify seller that funds are in escrow
    await this.notifyParty(escrow.sellerId, 'ESCROW_FUNDED', escrow);

    this.logger.log(`Escrow funded: ${escrowId}`);
    return updated;
  }

  /**
   * Approve milestone completion
   */
  async approveMilestone(params: {
    escrowId: string;
    milestoneId: string;
    approvedBy: string;
    evidence?: any;
  }) {
    this.logger.log(`Approving milestone: ${params.milestoneId}`);

    const escrow = await this.getEscrowById(params.escrowId);

    if (escrow.status !== 'FUNDED' && escrow.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Invalid escrow status for milestone approval');
    }

    const milestones = (escrow.milestones as any[]) || [];
    const milestoneIndex = milestones.findIndex((m) => m.id === params.milestoneId);

    if (milestoneIndex === -1) {
      throw new NotFoundException('Milestone not found');
    }

    const milestone = milestones[milestoneIndex];

    if (milestone.status !== 'PENDING') {
      throw new BadRequestException('Milestone is not pending');
    }

    // Update milestone status
    milestone.status = 'APPROVED';
    milestone.completedDate = new Date();
    milestone.evidence = params.evidence;

    await this.prisma.escrowAccount.update({
      where: { id: params.escrowId },
      data: {
        status: 'IN_PROGRESS',
        milestones: milestones as any,
      },
    });

    this.logger.log(`Milestone approved: ${params.milestoneId}`);
    return milestone;
  }

  /**
   * Release milestone payment
   */
  async releaseMilestonePayment(params: {
    escrowId: string;
    milestoneId: string;
    releasedBy: string;
  }) {
    this.logger.log(`Releasing milestone payment: ${params.milestoneId}`);

    const escrow = await this.getEscrowById(params.escrowId);

    const milestones = (escrow.milestones as any[]) || [];
    const milestone = milestones.find((m) => m.id === params.milestoneId);

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    if (milestone.status !== 'APPROVED') {
      throw new BadRequestException('Milestone must be approved before release');
    }

    // Release payment to seller
    const payment = await this.releasePaymentToSeller(
      escrow.sellerId,
      milestone.amount,
      escrow.currency,
    );

    // Update milestone status
    milestone.status = 'RELEASED';
    milestone.releasedDate = new Date();

    await this.prisma.escrowAccount.update({
      where: { id: params.escrowId },
      data: {
        milestones: milestones as any,
        releasedAmount: (escrow.releasedAmount || 0) + milestone.amount,
      },
    });

    // Check if all milestones are released
    const allReleased = milestones.every((m) => m.status === 'RELEASED');

    if (allReleased) {
      await this.completeEscrow(params.escrowId);
    }

    this.logger.log(`Milestone payment released: ${params.milestoneId}`);
    return { success: true, payment };
  }

  /**
   * Release full escrow amount
   */
  async releaseEscrow(escrowId: string, releasedBy: string) {
    this.logger.log(`Releasing escrow: ${escrowId}`);

    const escrow = await this.getEscrowById(escrowId);

    if (escrow.status !== 'FUNDED' && escrow.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Invalid escrow status for release');
    }

    // Release remaining amount to seller
    const remainingAmount = escrow.amount - (escrow.releasedAmount || 0);

    const payment = await this.releasePaymentToSeller(
      escrow.sellerId,
      remainingAmount,
      escrow.currency,
    );

    // Update escrow status
    await this.prisma.escrowAccount.update({
      where: { id: escrowId },
      data: {
        status: 'RELEASED',
        releasedAmount: escrow.amount,
        releasedAt: new Date(),
        releasedBy,
      },
    });

    this.logger.log(`Escrow released: ${escrowId}`);
    return { success: true, payment };
  }

  /**
   * Refund escrow to buyer
   */
  async refundEscrow(escrowId: string, reason: string) {
    this.logger.log(`Refunding escrow: ${escrowId}`);

    const escrow = await this.getEscrowById(escrowId);

    if (escrow.status === 'RELEASED' || escrow.status === 'REFUNDED') {
      throw new BadRequestException('Escrow already completed');
    }

    // Refund to buyer
    const refundAmount = escrow.amount - (escrow.releasedAmount || 0);

    const refund = await this.processRefund(
      escrow.buyerId,
      refundAmount,
      escrow.currency,
    );

    // Update escrow status
    await this.prisma.escrowAccount.update({
      where: { id: escrowId },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
        refundReason: reason,
      },
    });

    this.logger.log(`Escrow refunded: ${escrowId}`);
    return { success: true, refund };
  }

  /**
   * Create dispute
   */
  async createDispute(data: {
    escrowId: string;
    initiatedBy: 'BUYER' | 'SELLER';
    userId: string;
    reason: string;
    details: string;
    evidence?: any[];
  }) {
    this.logger.log(`Creating dispute for escrow: ${data.escrowId}`);

    const escrow = await this.getEscrowById(data.escrowId);

    const dispute = await this.prisma.escrowDispute.create({
      data: {
        escrowId: data.escrowId,
        initiatedBy: data.initiatedBy,
        userId: data.userId,
        reason: data.reason,
        details: data.details,
        evidence: data.evidence as any,
        status: 'OPEN',
      },
    });

    // Update escrow status
    await this.prisma.escrowAccount.update({
      where: { id: data.escrowId },
      data: { status: 'DISPUTED' },
    });

    // Notify other party
    const otherParty = data.initiatedBy === 'BUYER' ? escrow.sellerId : escrow.buyerId;
    await this.notifyParty(otherParty, 'ESCROW_DISPUTED', { escrow, dispute });

    this.logger.log(`Dispute created: ${dispute.id}`);
    return dispute;
  }

  /**
   * Resolve dispute
   */
  async resolveDispute(params: {
    disputeId: string;
    resolution: 'RELEASE_TO_SELLER' | 'REFUND_TO_BUYER' | 'PARTIAL_RELEASE';
    partialAmount?: number;
    notes: string;
  }) {
    this.logger.log(`Resolving dispute: ${params.disputeId}`);

    const dispute = await this.prisma.escrowDispute.findUnique({
      where: { id: params.disputeId },
      include: { escrow: true },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Execute resolution
    switch (params.resolution) {
      case 'RELEASE_TO_SELLER':
        await this.releaseEscrow(dispute.escrowId, 'DISPUTE_RESOLUTION');
        break;
      case 'REFUND_TO_BUYER':
        await this.refundEscrow(dispute.escrowId, 'DISPUTE_RESOLUTION');
        break;
      case 'PARTIAL_RELEASE':
        if (!params.partialAmount) {
          throw new BadRequestException('Partial amount required');
        }
        // Release partial amount logic
        break;
    }

    // Update dispute status
    await this.prisma.escrowDispute.update({
      where: { id: params.disputeId },
      data: {
        status: 'RESOLVED',
        resolution: params.resolution,
        resolutionNotes: params.notes,
        resolvedAt: new Date(),
      },
    });

    this.logger.log(`Dispute resolved: ${params.disputeId}`);
    return { success: true };
  }

  /**
   * Get escrow by ID
   */
  async getEscrowById(id: string) {
    const escrow = await this.prisma.escrowAccount.findUnique({
      where: { id },
      include: {
        order: true,
        buyer: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        seller: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        disputes: true,
      },
    });

    if (!escrow) {
      throw new NotFoundException(`Escrow ${id} not found`);
    }

    return escrow;
  }

  /**
   * Get escrow analytics
   */
  async getEscrowAnalytics(params?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }) {
    const where: any = {};

    if (params?.startDate) {
      where.createdAt = { gte: params.startDate };
    }

    if (params?.endDate) {
      where.createdAt = { ...where.createdAt, lte: params.endDate };
    }

    if (params?.status) {
      where.status = params.status;
    }

    const total = await this.prisma.escrowAccount.count({ where });
    const totalVolume = await this.prisma.escrowAccount.aggregate({
      where,
      _sum: { amount: true },
    });

    const disputed = await this.prisma.escrowAccount.count({
      where: { ...where, status: 'DISPUTED' },
    });

    return {
      total,
      totalVolume: totalVolume._sum.amount || 0,
      disputed,
      disputeRate: total > 0 ? (disputed / total) * 100 : 0,
    };
  }

  /**
   * Calculate escrow fees
   */
  private calculateEscrowFees(amount: number): number {
    const feePercentage = 0.025; // 2.5%
    const minFee = 50;
    return Math.max(minFee, amount * feePercentage);
  }

  /**
   * Process escrow payment
   */
  private async processEscrowPayment(escrow: any, paymentDetails: any) {
    // Integration with payment gateway
    this.logger.log(`Processing escrow payment: ${escrow.id}`);
    return {
      success: true,
      reference: `PAY_${Date.now()}`,
    };
  }

  /**
   * Release payment to seller
   */
  private async releasePaymentToSeller(sellerId: string, amount: number, currency: string) {
    this.logger.log(`Releasing payment to seller ${sellerId}: ${amount} ${currency}`);
    return {
      success: true,
      transactionId: `TXN_${Date.now()}`,
    };
  }

  /**
   * Process refund
   */
  private async processRefund(buyerId: string, amount: number, currency: string) {
    this.logger.log(`Processing refund to buyer ${buyerId}: ${amount} ${currency}`);
    return {
      success: true,
      refundId: `REF_${Date.now()}`,
    };
  }

  /**
   * Complete escrow
   */
  private async completeEscrow(escrowId: string) {
    await this.prisma.escrowAccount.update({
      where: { id: escrowId },
      data: {
        status: 'RELEASED',
        completedAt: new Date(),
      },
    });

    this.logger.log(`Escrow completed: ${escrowId}`);
  }

  /**
   * Notify party
   */
  private async notifyParty(userId: string, event: string, data: any) {
    this.logger.log(`Notifying user ${userId} about ${event}`);
    // Integration with notification service
  }
}
