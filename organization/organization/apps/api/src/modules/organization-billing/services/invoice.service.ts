import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface InvoiceFilters {
  status?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Generate a new invoice for an organization
   * @param organizationId - Organization ID
   * @param items - Invoice line items
   * @returns Generated invoice
   */
  async generateInvoice(
    organizationId: string,
    items: InvoiceItem[],
  ) {
    this.logger.log(`Generating invoice for organization: ${organizationId}`);

    if (!items || items.length === 0) {
      throw new BadRequestException('Invoice must have at least one item');
    }

    // Validate organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Get billing record
    const billing = await this.prisma.organizationBilling.findUnique({
      where: { organizationId },
    });

    if (!billing) {
      throw new NotFoundException('Billing information not found');
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Create invoice
    const invoice = await this.prisma.organizationInvoice.create({
      data: {
        billingId: billing.id,
        number: invoiceNumber,
        amount: totalAmount,
        currency: 'USD',
        status: 'open',
        description: `Invoice for ${organization.name}`,
        lineItems: items as any,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    });

    this.logger.log(`Invoice generated successfully: ${invoice.number}`);

    return {
      id: invoice.id,
      number: invoice.number,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      dueDate: invoice.dueDate,
      lineItems: invoice.lineItems,
      createdAt: invoice.createdAt,
    };
  }

  /**
   * Get invoices for an organization with filters
   * @param organizationId - Organization ID
   * @param filters - Filter options
   * @returns List of invoices
   */
  async getInvoices(organizationId: string, filters: InvoiceFilters = {}) {
    this.logger.log(`Fetching invoices for organization: ${organizationId}`);

    // Get billing record
    const billing = await this.prisma.organizationBilling.findUnique({
      where: { organizationId },
    });

    if (!billing) {
      return {
        invoices: [],
        total: 0,
        limit: filters.limit || 10,
        offset: filters.offset || 0,
      };
    }

    // Build where clause
    const where: any = {
      billingId: billing.id,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    // Get total count
    const total = await this.prisma.organizationInvoice.count({ where });

    // Get invoices
    const invoices = await this.prisma.organizationInvoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 10,
      skip: filters.offset || 0,
    });

    return {
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
        description: invoice.description,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        pdfUrl: invoice.pdfUrl,
        createdAt: invoice.createdAt,
      })),
      total,
      limit: filters.limit || 10,
      offset: filters.offset || 0,
    };
  }

  /**
   * Get a single invoice by ID
   * @param invoiceId - Invoice ID
   * @returns Invoice details
   */
  async getInvoice(invoiceId: string) {
    const cacheKey = `invoice:${invoiceId}`;

    // Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return cached;
    }

    const invoice = await this.prisma.organizationInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        billing: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                primaryEmail: true,
                address: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const result = {
      id: invoice.id,
      number: invoice.number,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      description: invoice.description,
      lineItems: invoice.lineItems,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      pdfUrl: invoice.pdfUrl,
      stripeInvoiceId: invoice.stripeInvoiceId,
      createdAt: invoice.createdAt,
      organization: invoice.billing.organization,
    };

    // Cache the result
    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  /**
   * Mark an invoice as paid
   * @param invoiceId - Invoice ID
   * @returns Updated invoice
   */
  async markInvoicePaid(invoiceId: string) {
    this.logger.log(`Marking invoice as paid: ${invoiceId}`);

    const invoice = await this.prisma.organizationInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new BadRequestException('Invoice is already paid');
    }

    const updatedInvoice = await this.prisma.organizationInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'paid',
        paidAt: new Date(),
      },
    });

    // Clear cache
    await this.redis.del(`invoice:${invoiceId}`);

    this.logger.log(`Invoice marked as paid: ${invoice.number}`);

    return {
      id: updatedInvoice.id,
      number: updatedInvoice.number,
      status: updatedInvoice.status,
      paidAt: updatedInvoice.paidAt,
    };
  }

  /**
   * Void an invoice (cancel it)
   * @param invoiceId - Invoice ID
   * @returns Updated invoice
   */
  async voidInvoice(invoiceId: string) {
    this.logger.log(`Voiding invoice: ${invoiceId}`);

    const invoice = await this.prisma.organizationInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new BadRequestException('Cannot void a paid invoice');
    }

    if (invoice.status === 'void') {
      throw new BadRequestException('Invoice is already void');
    }

    const updatedInvoice = await this.prisma.organizationInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'void',
      },
    });

    // Clear cache
    await this.redis.del(`invoice:${invoiceId}`);

    this.logger.log(`Invoice voided: ${invoice.number}`);

    return {
      id: updatedInvoice.id,
      number: updatedInvoice.number,
      status: updatedInvoice.status,
    };
  }

  /**
   * Generate a unique invoice number
   * @returns Invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Get count of invoices this month
    const count = await this.prisma.organizationInvoice.count({
      where: {
        createdAt: {
          gte: new Date(year, new Date().getMonth(), 1),
          lt: new Date(year, new Date().getMonth() + 1, 1),
        },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `INV-${year}${month}-${sequence}`;
  }

  /**
   * Update invoice with Stripe invoice ID
   * @param invoiceId - Internal invoice ID
   * @param stripeInvoiceId - Stripe invoice ID
   * @param pdfUrl - PDF URL from Stripe
   */
  async updateStripeInvoiceInfo(
    invoiceId: string,
    stripeInvoiceId: string,
    pdfUrl?: string,
  ) {
    await this.prisma.organizationInvoice.update({
      where: { id: invoiceId },
      data: {
        stripeInvoiceId,
        pdfUrl,
      },
    });

    // Clear cache
    await this.redis.del(`invoice:${invoiceId}`);

    this.logger.log(`Invoice updated with Stripe info: ${invoiceId}`);
  }
}
