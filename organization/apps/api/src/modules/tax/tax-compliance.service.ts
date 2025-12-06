import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * Tax Compliance Service
 * Handles tax reporting and compliance for multiple jurisdictions
 */

@Injectable()
export class TaxComplianceService {
  private readonly logger = new Logger(TaxComplianceService.name);

  constructor(private prisma: PrismaService) {}

  async generateTaxReport(
    period: { start: Date; end: Date },
    jurisdiction: string,
  ) {
    const transactions = await this.prisma.taxCalculation.findMany({
      where: {
        calculatedAt: { gte: period.start, lte: period.end },
        country: jurisdiction,
      },
    });

    const totalTax = transactions.reduce((sum, t) => sum + t.taxAmount, 0);
    const totalSales = transactions.reduce((sum, t) => sum + t.subtotal, 0);

    return {
      period,
      jurisdiction,
      transactionCount: transactions.length,
      totalSales,
      totalTax,
      averageTaxRate: totalSales > 0 ? totalTax / totalSales : 0,
      breakdown: this.breakdownByTaxType(transactions),
    };
  }

  private breakdownByTaxType(transactions: any[]) {
    const breakdown: Record<string, { count: number; total: number }> = {};

    transactions.forEach((t) => {
      const taxBreakdown = t.taxBreakdown as any[];
      taxBreakdown?.forEach((item: any) => {
        if (!breakdown[item.taxType]) {
          breakdown[item.taxType] = { count: 0, total: 0 };
        }
        breakdown[item.taxType].count += 1;
        breakdown[item.taxType].total += item.amount;
      });
    });

    return breakdown;
  }

  async exportTaxData(period: { start: Date; end: Date }, format: 'CSV' | 'JSON') {
    const transactions = await this.prisma.taxCalculation.findMany({
      where: {
        calculatedAt: { gte: period.start, lte: period.end },
      },
      include: { order: true },
    });

    if (format === 'CSV') {
      return this.convertToCSV(transactions);
    }

    return JSON.stringify(transactions, null, 2);
  }

  private convertToCSV(data: any[]): string {
    const headers = ['Date', 'OrderID', 'Country', 'Subtotal', 'TaxAmount', 'Total'];
    const rows = data.map((t) => [
      t.calculatedAt.toISOString(),
      t.orderId,
      t.country,
      t.subtotal,
      t.taxAmount,
      t.subtotal + t.taxAmount,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
