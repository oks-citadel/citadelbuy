import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * Invoice Financing Service
 * Provides working capital financing for B2B transactions
 *
 * Types:
 * - Invoice Factoring (sell invoices at discount)
 * - Invoice Discounting (use invoices as collateral)
 * - Supply Chain Financing
 */

export enum FinancingStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  FUNDED = 'FUNDED',
  REPAID = 'REPAID',
  DEFAULTED = 'DEFAULTED',
}

export interface CreateFinancingRequest {
  supplierId: string;
  buyerId: string;
  invoiceId: string;
  invoiceAmount: number;
  currency: string;
  paymentTerms: number; // days
  financingType: 'FACTORING' | 'DISCOUNTING' | 'SUPPLY_CHAIN';
  requestedAmount: number;
}

@Injectable()
export class InvoiceFinancingService {
  private readonly logger = new Logger(InvoiceFinancingService.name);
  private readonly DISCOUNT_RATE = 0.02; // 2% per month
  private readonly ADVANCE_RATE = 0.85; // 85% of invoice value

  constructor(private prisma: PrismaService) {}

  async requestFinancing(request: CreateFinancingRequest) {
    const maxAdvance = request.invoiceAmount * this.ADVANCE_RATE;
    const approvedAmount = Math.min(request.requestedAmount, maxAdvance);

    const discountDays = request.paymentTerms;
    const discountFee =
      (approvedAmount * this.DISCOUNT_RATE * discountDays) / 30;

    const netAmount = approvedAmount - discountFee;

    return this.prisma.invoiceFinancing.create({
      data: {
        supplierId: request.supplierId,
        buyerId: request.buyerId,
        invoiceId: request.invoiceId,
        invoiceAmount: request.invoiceAmount,
        currency: request.currency,
        requestedAmount: request.requestedAmount,
        approvedAmount,
        discountFee,
        netAmount,
        paymentTerms: request.paymentTerms,
        financingType: request.financingType,
        status: FinancingStatus.PENDING,
        referenceNumber: this.generateReferenceNumber(),
      },
    });
  }

  async approveFinancing(financingId: string) {
    return this.prisma.invoiceFinancing.update({
      where: { id: financingId },
      data: {
        status: FinancingStatus.APPROVED,
        approvedAt: new Date(),
      },
    });
  }

  async fundFinancing(financingId: string, transactionId: string) {
    return this.prisma.invoiceFinancing.update({
      where: { id: financingId },
      data: {
        status: FinancingStatus.FUNDED,
        fundedAt: new Date(),
        disbursementTransactionId: transactionId,
      },
    });
  }

  async repayFinancing(
    financingId: string,
    amount: number,
    transactionId: string,
  ) {
    const financing = await this.prisma.invoiceFinancing.findUnique({
      where: { id: financingId },
    });

    if (!financing) {
      throw new Error('Financing not found');
    }

    const totalOwed = financing.approvedAmount;
    const isFullyRepaid = amount >= totalOwed;

    return this.prisma.invoiceFinancing.update({
      where: { id: financingId },
      data: {
        status: isFullyRepaid ? FinancingStatus.REPAID : financing.status,
        repaidAmount: { increment: amount },
        repaidAt: isFullyRepaid ? new Date() : undefined,
        repaymentTransactionId: transactionId,
      },
    });
  }

  private generateReferenceNumber(): string {
    return `IF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  async calculateFinancingTerms(invoiceAmount: number, paymentTerms: number) {
    const maxAdvance = invoiceAmount * this.ADVANCE_RATE;
    const discountFee = (maxAdvance * this.DISCOUNT_RATE * paymentTerms) / 30;
    const netAmount = maxAdvance - discountFee;

    return {
      invoiceAmount,
      maxAdvance,
      advanceRate: this.ADVANCE_RATE,
      discountRate: this.DISCOUNT_RATE,
      paymentTerms,
      discountFee,
      netAmount,
      effectiveAPR:
        ((discountFee / netAmount) * 365) / paymentTerms,
    };
  }
}
