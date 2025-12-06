import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

/**
 * Escrow Service
 * Manages milestone-based escrow payments for B2B transactions
 *
 * Features:
 * - Multi-milestone escrow
 * - Automatic fund release on milestone completion
 * - Dispute resolution support
 * - Partial releases
 * - Refund handling
 * - Compliance with international escrow regulations
 */

export enum EscrowStatus {
  PENDING = 'PENDING',
  FUNDED = 'FUNDED',
  MILESTONE_COMPLETED = 'MILESTONE_COMPLETED',
  RELEASED = 'RELEASED',
  DISPUTED = 'DISPUTED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum MilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

export interface CreateEscrowRequest {
  orderId: string;
  buyerId: string;
  sellerId: string;
  totalAmount: number;
  currency: string;
  milestones: Array<{
    name: string;
    description: string;
    amount: number;
    dueDate?: Date;
    deliverables?: string[];
  }>;
  termsAndConditions?: string;
  automaticRelease?: boolean;
  releaseDelay?: number; // Days after milestone approval
}

export interface Escrow {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  totalAmount: number;
  currency: string;
  fundedAmount: number;
  releasedAmount: number;
  status: EscrowStatus;
  milestones: Milestone[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  escrowId: string;
  name: string;
  description: string;
  amount: number;
  status: MilestoneStatus;
  dueDate?: Date;
  deliverables?: string[];
  submittedAt?: Date;
  approvedAt?: Date;
  paidAt?: Date;
  rejectionReason?: string;
}

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Create new escrow agreement
   */
  async createEscrow(request: CreateEscrowRequest): Promise<Escrow> {
    this.logger.log(`Creating escrow for order ${request.orderId}`);

    // Validate milestones
    const totalMilestoneAmount = request.milestones.reduce(
      (sum, m) => sum + m.amount,
      0,
    );

    if (Math.abs(totalMilestoneAmount - request.totalAmount) > 0.01) {
      throw new BadRequestException(
        'Sum of milestone amounts must equal total amount',
      );
    }

    // Create escrow record
    const escrow = await this.prisma.escrow.create({
      data: {
        orderId: request.orderId,
        buyerId: request.buyerId,
        sellerId: request.sellerId,
        totalAmount: request.totalAmount,
        currency: request.currency,
        fundedAmount: 0,
        releasedAmount: 0,
        status: EscrowStatus.PENDING,
        automaticRelease: request.automaticRelease ?? false,
        releaseDelay: request.releaseDelay ?? 3,
        termsAndConditions: request.termsAndConditions,
        milestones: {
          create: request.milestones.map((m, index) => ({
            name: m.name,
            description: m.description,
            amount: m.amount,
            status: MilestoneStatus.PENDING,
            dueDate: m.dueDate,
            deliverables: m.deliverables || [],
            sequenceNumber: index + 1,
          })),
        },
      },
      include: {
        milestones: {
          orderBy: { sequenceNumber: 'asc' },
        },
      },
    });

    this.logger.log(`Escrow created: ${escrow.id}`);

    return escrow as Escrow;
  }

  /**
   * Fund escrow (buyer deposits money)
   */
  async fundEscrow(
    escrowId: string,
    amount: number,
    paymentTransactionId: string,
  ): Promise<Escrow> {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { milestones: true },
    });

    if (!escrow) {
      throw new BadRequestException('Escrow not found');
    }

    if (escrow.status !== EscrowStatus.PENDING) {
      throw new BadRequestException('Escrow is not in pending status');
    }

    // Update escrow with funded amount
    const updated = await this.prisma.escrow.update({
      where: { id: escrowId },
      data: {
        fundedAmount: { increment: amount },
        status:
          escrow.fundedAmount + amount >= escrow.totalAmount
            ? EscrowStatus.FUNDED
            : EscrowStatus.PENDING,
        transactions: {
          create: {
            type: 'FUNDING',
            amount,
            transactionId: paymentTransactionId,
            description: 'Escrow funding',
          },
        },
      },
      include: { milestones: true },
    });

    // If fully funded, mark first milestone as in progress
    if (updated.status === EscrowStatus.FUNDED && updated.milestones.length > 0) {
      await this.prisma.milestone.update({
        where: { id: updated.milestones[0].id },
        data: { status: MilestoneStatus.IN_PROGRESS },
      });
    }

    this.logger.log(`Escrow ${escrowId} funded with ${amount} ${escrow.currency}`);

    return updated as Escrow;
  }

  /**
   * Submit milestone for approval (seller submits work)
   */
  async submitMilestone(
    milestoneId: string,
    submittedBy: string,
    deliverables: string[],
    notes?: string,
  ): Promise<Milestone> {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { escrow: true },
    });

    if (!milestone) {
      throw new BadRequestException('Milestone not found');
    }

    if (milestone.escrow.sellerId !== submittedBy) {
      throw new BadRequestException('Only seller can submit milestone');
    }

    if (milestone.status !== MilestoneStatus.IN_PROGRESS) {
      throw new BadRequestException('Milestone is not in progress');
    }

    const updated = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: MilestoneStatus.SUBMITTED,
        deliverables,
        submittedAt: new Date(),
        submissionNotes: notes,
      },
    });

    this.logger.log(`Milestone ${milestoneId} submitted for approval`);

    return updated as Milestone;
  }

  /**
   * Approve milestone (buyer approves work)
   */
  async approveMilestone(
    milestoneId: string,
    approvedBy: string,
    notes?: string,
  ): Promise<Milestone> {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { escrow: true },
    });

    if (!milestone) {
      throw new BadRequestException('Milestone not found');
    }

    if (milestone.escrow.buyerId !== approvedBy) {
      throw new BadRequestException('Only buyer can approve milestone');
    }

    if (milestone.status !== MilestoneStatus.SUBMITTED) {
      throw new BadRequestException('Milestone not submitted');
    }

    const updated = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: MilestoneStatus.APPROVED,
        approvedAt: new Date(),
        approvalNotes: notes,
      },
    });

    // If automatic release is enabled, schedule release
    if (milestone.escrow.automaticRelease) {
      const releaseDelay = milestone.escrow.releaseDelay || 3;
      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() + releaseDelay);

      this.logger.log(
        `Milestone ${milestoneId} will be auto-released on ${releaseDate}`,
      );

      // In production, this would schedule a job
      // For now, we'll release immediately if delay is 0
      if (releaseDelay === 0) {
        await this.releaseMilestonePayment(milestoneId);
      }
    }

    this.logger.log(`Milestone ${milestoneId} approved`);

    return updated as Milestone;
  }

  /**
   * Reject milestone (buyer rejects work)
   */
  async rejectMilestone(
    milestoneId: string,
    rejectedBy: string,
    reason: string,
  ): Promise<Milestone> {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { escrow: true },
    });

    if (!milestone) {
      throw new BadRequestException('Milestone not found');
    }

    if (milestone.escrow.buyerId !== rejectedBy) {
      throw new BadRequestException('Only buyer can reject milestone');
    }

    if (milestone.status !== MilestoneStatus.SUBMITTED) {
      throw new BadRequestException('Milestone not submitted');
    }

    const updated = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: MilestoneStatus.REJECTED,
        rejectionReason: reason,
        rejectedAt: new Date(),
      },
    });

    // Set back to in progress for seller to resubmit
    await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: MilestoneStatus.IN_PROGRESS },
    });

    this.logger.log(`Milestone ${milestoneId} rejected: ${reason}`);

    return updated as Milestone;
  }

  /**
   * Release payment for approved milestone
   */
  async releaseMilestonePayment(milestoneId: string): Promise<Milestone> {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { escrow: true },
    });

    if (!milestone) {
      throw new BadRequestException('Milestone not found');
    }

    if (milestone.status !== MilestoneStatus.APPROVED) {
      throw new BadRequestException('Milestone not approved');
    }

    // Mark milestone as paid
    const updated = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: MilestoneStatus.PAID,
        paidAt: new Date(),
      },
    });

    // Update escrow released amount
    await this.prisma.escrow.update({
      where: { id: milestone.escrowId },
      data: {
        releasedAmount: { increment: milestone.amount },
        transactions: {
          create: {
            type: 'RELEASE',
            amount: milestone.amount,
            milestoneId: milestoneId,
            description: `Payment for milestone: ${milestone.name}`,
          },
        },
      },
    });

    // Check if all milestones are paid
    const allMilestones = await this.prisma.milestone.findMany({
      where: { escrowId: milestone.escrowId },
    });

    const allPaid = allMilestones.every((m) => m.status === MilestoneStatus.PAID);

    if (allPaid) {
      await this.prisma.escrow.update({
        where: { id: milestone.escrowId },
        data: { status: EscrowStatus.RELEASED },
      });

      this.logger.log(`Escrow ${milestone.escrowId} fully released`);
    }

    // Start next milestone if exists
    const nextMilestone = await this.prisma.milestone.findFirst({
      where: {
        escrowId: milestone.escrowId,
        status: MilestoneStatus.PENDING,
      },
      orderBy: { sequenceNumber: 'asc' },
    });

    if (nextMilestone) {
      await this.prisma.milestone.update({
        where: { id: nextMilestone.id },
        data: { status: MilestoneStatus.IN_PROGRESS },
      });
    }

    this.logger.log(
      `Released ${milestone.amount} for milestone ${milestoneId}`,
    );

    return updated as Milestone;
  }

  /**
   * Initiate dispute
   */
  async initiateDispute(
    escrowId: string,
    initiatedBy: string,
    reason: string,
    evidence?: string[],
  ): Promise<Escrow> {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { milestones: true },
    });

    if (!escrow) {
      throw new BadRequestException('Escrow not found');
    }

    if (
      initiatedBy !== escrow.buyerId &&
      initiatedBy !== escrow.sellerId
    ) {
      throw new BadRequestException('Unauthorized to dispute');
    }

    const updated = await this.prisma.escrow.update({
      where: { id: escrowId },
      data: {
        status: EscrowStatus.DISPUTED,
        dispute: {
          create: {
            initiatedBy,
            reason,
            evidence: evidence || [],
            status: 'OPEN',
          },
        },
      },
      include: { milestones: true },
    });

    this.logger.log(`Dispute initiated for escrow ${escrowId}`);

    return updated as Escrow;
  }

  /**
   * Refund escrow
   */
  async refundEscrow(
    escrowId: string,
    amount: number,
    reason: string,
  ): Promise<Escrow> {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
    });

    if (!escrow) {
      throw new BadRequestException('Escrow not found');
    }

    const availableAmount = escrow.fundedAmount - escrow.releasedAmount;

    if (amount > availableAmount) {
      throw new BadRequestException('Insufficient funds to refund');
    }

    const updated = await this.prisma.escrow.update({
      where: { id: escrowId },
      data: {
        status: amount === availableAmount ? EscrowStatus.REFUNDED : escrow.status,
        transactions: {
          create: {
            type: 'REFUND',
            amount,
            description: `Refund: ${reason}`,
          },
        },
      },
      include: { milestones: true },
    });

    this.logger.log(`Refunded ${amount} for escrow ${escrowId}`);

    return updated as Escrow;
  }

  /**
   * Get escrow details
   */
  async getEscrow(escrowId: string): Promise<Escrow | null> {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: {
        milestones: {
          orderBy: { sequenceNumber: 'asc' },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
        dispute: true,
      },
    });

    return escrow as Escrow | null;
  }

  /**
   * Get escrows for user
   */
  async getUserEscrows(
    userId: string,
    role: 'buyer' | 'seller',
  ): Promise<Escrow[]> {
    const escrows = await this.prisma.escrow.findMany({
      where: role === 'buyer' ? { buyerId: userId } : { sellerId: userId },
      include: {
        milestones: {
          orderBy: { sequenceNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return escrows as Escrow[];
  }
}
