import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * Letter of Credit Service
 * Manages documentary credits for international trade
 *
 * LC Types:
 * - Sight LC (immediate payment)
 * - Usance LC (deferred payment)
 * - Irrevocable LC
 * - Confirmed LC
 * - Transferable LC
 */

export enum LCStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  ADVISED = 'ADVISED',
  CONFIRMED = 'CONFIRMED',
  PRESENTED = 'PRESENTED',
  ACCEPTED = 'ACCEPTED',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export interface CreateLCRequest {
  applicant: string; // Buyer
  beneficiary: string; // Seller
  amount: number;
  currency: string;
  issuingBank: string;
  advisingBank?: string;
  confirmingBank?: string;
  lcType: 'SIGHT' | 'USANCE' | 'DEFERRED';
  expiryDate: Date;
  shipmentDate: Date;
  description: string;
  termsAndConditions: string[];
  requiredDocuments: string[];
}

@Injectable()
export class LetterOfCreditService {
  private readonly logger = new Logger(LetterOfCreditService.name);

  constructor(private prisma: PrismaService) {}

  async createLC(request: CreateLCRequest) {
    return this.prisma.letterOfCredit.create({
      data: {
        ...request,
        status: LCStatus.DRAFT,
        lcNumber: this.generateLCNumber(),
      },
    });
  }

  async issueLC(lcId: string, issuingBankRef: string) {
    return this.prisma.letterOfCredit.update({
      where: { id: lcId },
      data: {
        status: LCStatus.ISSUED,
        issuedAt: new Date(),
        issuingBankRef,
      },
    });
  }

  async presentDocuments(lcId: string, documents: string[]) {
    return this.prisma.letterOfCredit.update({
      where: { id: lcId },
      data: {
        status: LCStatus.PRESENTED,
        presentedDocuments: documents,
        presentedAt: new Date(),
      },
    });
  }

  async acceptLC(lcId: string) {
    return this.prisma.letterOfCredit.update({
      where: { id: lcId },
      data: {
        status: LCStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });
  }

  async payLC(lcId: string, paymentRef: string) {
    return this.prisma.letterOfCredit.update({
      where: { id: lcId },
      data: {
        status: LCStatus.PAID,
        paidAt: new Date(),
        paymentRef,
      },
    });
  }

  private generateLCNumber(): string {
    const prefix = 'LC';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }
}
