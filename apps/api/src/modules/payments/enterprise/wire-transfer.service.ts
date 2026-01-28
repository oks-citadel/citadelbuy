import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

/**
 * Wire Transfer Service
 * Handles international wire transfers (SWIFT, ACH, SEPA)
 *
 * Features:
 * - SWIFT transfers
 * - ACH (US)
 * - SEPA (Europe)
 * - BACS (UK)
 * - Tracking and reconciliation
 */

export enum WireTransferNetwork {
  SWIFT = 'SWIFT',
  ACH = 'ACH',
  SEPA = 'SEPA',
  BACS = 'BACS',
  WIRE = 'WIRE',
}

export enum WireTransferStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  RECEIVED = 'RECEIVED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface CreateWireTransferRequest {
  senderId: string;
  recipientId: string;
  amount: number;
  currency: string;
  network: WireTransferNetwork;
  senderAccount: {
    accountNumber: string;
    bankName: string;
    swiftCode?: string;
    routingNumber?: string;
    iban?: string;
  };
  recipientAccount: {
    accountNumber: string;
    bankName: string;
    swiftCode?: string;
    routingNumber?: string;
    iban?: string;
  };
  purpose: string;
  reference?: string;
}

@Injectable()
export class WireTransferService {
  private readonly logger = new Logger(WireTransferService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async createTransfer(request: CreateWireTransferRequest) {
    const transferFee = this.calculateTransferFee(
      request.amount,
      request.network,
      request.currency,
    );

    return this.prisma.wireTransfer.create({
      data: {
        senderId: request.senderId,
        recipientId: request.recipientId,
        amount: request.amount,
        currency: request.currency,
        network: request.network,
        senderAccount: JSON.stringify(request.senderAccount),
        recipientAccount: JSON.stringify(request.recipientAccount),
        purpose: request.purpose,
        reference: request.reference,
        status: WireTransferStatus.PENDING,
        transferNumber: this.generateTransferNumber(),
        fee: transferFee,
        estimatedArrival: this.estimateArrivalTime(request.network),
      },
    });
  }

  async initiateTransfer(transferId: string) {
    // In production, this would integrate with banking APIs
    return this.prisma.wireTransfer.update({
      where: { id: transferId },
      data: {
        status: WireTransferStatus.PROCESSING,
        initiatedAt: new Date(),
      },
    });
  }

  async trackTransfer(transferId: string) {
    return this.prisma.wireTransfer.findUnique({
      where: { id: transferId },
      include: {
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  private calculateTransferFee(
    amount: number,
    network: WireTransferNetwork,
    currency: string,
  ): number {
    const fees = {
      [WireTransferNetwork.SWIFT]: 25, // $25 flat fee
      [WireTransferNetwork.ACH]: 1, // $1
      [WireTransferNetwork.SEPA]: 0.5, // €0.50
      [WireTransferNetwork.BACS]: 0.25, // £0.25
      [WireTransferNetwork.WIRE]: 15, // $15
    };

    return fees[network] || 25;
  }

  private estimateArrivalTime(network: WireTransferNetwork): Date {
    const now = new Date();
    const delays = {
      [WireTransferNetwork.SWIFT]: 1, // 1-3 business days
      [WireTransferNetwork.ACH]: 1, // 1-2 business days
      [WireTransferNetwork.SEPA]: 1, // 1 business day
      [WireTransferNetwork.BACS]: 3, // 3 business days
      [WireTransferNetwork.WIRE]: 0, // Same day
    };

    now.setDate(now.getDate() + (delays[network] || 1));
    return now;
  }

  private generateTransferNumber(): string {
    return `WT-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  }
}
