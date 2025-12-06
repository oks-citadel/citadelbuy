import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceService } from '../services/invoice.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;

  const mockPrismaService = {
    organization: {
      findUnique: jest.fn(),
    },
    organizationBilling: {
      findUnique: jest.fn(),
    },
    organizationInvoice: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateInvoice', () => {
    const organizationId = 'org-123';
    const items = [
      {
        description: 'Pro Plan - Monthly',
        quantity: 1,
        unitPrice: 99.99,
        amount: 99.99,
      },
      {
        description: 'Additional User Seats',
        quantity: 5,
        unitPrice: 10.0,
        amount: 50.0,
      },
    ];

    it('should generate invoice successfully with multiple items', async () => {
      const mockOrganization = {
        id: organizationId,
        name: 'Test Org',
      };

      const mockBilling = {
        id: 'billing-123',
        organizationId,
      };

      const mockInvoice = {
        id: 'inv-123',
        billingId: 'billing-123',
        number: 'INV-202101-0001',
        amount: 149.99,
        currency: 'USD',
        status: 'open',
        description: 'Invoice for Test Org',
        lineItems: items,
        dueDate: expect.any(Date),
        createdAt: new Date('2021-01-01'),
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization as any);
      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(mockBilling as any);
      mockPrismaService.organizationInvoice.count.mockResolvedValue(0);
      mockPrismaService.organizationInvoice.create.mockResolvedValue(mockInvoice as any);

      const result = await service.generateInvoice(organizationId, items);

      expect(result).toEqual({
        id: 'inv-123',
        number: 'INV-202101-0001',
        amount: 149.99,
        currency: 'USD',
        status: 'open',
        dueDate: expect.any(Date),
        lineItems: items,
        createdAt: mockInvoice.createdAt,
      });

      expect(mockPrismaService.organizationInvoice.create).toHaveBeenCalledWith({
        data: {
          billingId: 'billing-123',
          number: expect.stringMatching(/^INV-\d{6}-\d{4}$/),
          amount: 149.99,
          currency: 'USD',
          status: 'open',
          description: 'Invoice for Test Org',
          lineItems: items,
          dueDate: expect.any(Date),
        },
      });
    });

    it('should throw BadRequestException if items array is empty', async () => {
      await expect(service.generateInvoice(organizationId, [])).rejects.toThrow(
        BadRequestException,
      );

      expect(mockPrismaService.organization.findUnique).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if items is null', async () => {
      await expect(service.generateInvoice(organizationId, null as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.generateInvoice(organizationId, items)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockPrismaService.organizationBilling.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if billing not found', async () => {
      const mockOrganization = {
        id: organizationId,
        name: 'Test Org',
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization as any);
      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(null);

      await expect(service.generateInvoice(organizationId, items)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should calculate total amount correctly', async () => {
      const mockOrganization = { id: organizationId, name: 'Test Org' };
      const mockBilling = { id: 'billing-123', organizationId };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization as any);
      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(mockBilling as any);
      mockPrismaService.organizationInvoice.count.mockResolvedValue(0);
      mockPrismaService.organizationInvoice.create.mockResolvedValue({
        id: 'inv-123',
        amount: 149.99,
      } as any);

      await service.generateInvoice(organizationId, items);

      expect(mockPrismaService.organizationInvoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 149.99,
          }),
        }),
      );
    });

    it('should generate sequential invoice numbers', async () => {
      const mockOrganization = { id: organizationId, name: 'Test Org' };
      const mockBilling = { id: 'billing-123', organizationId };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization as any);
      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(mockBilling as any);
      mockPrismaService.organizationInvoice.count.mockResolvedValue(5);
      mockPrismaService.organizationInvoice.create.mockResolvedValue({
        id: 'inv-123',
        number: 'INV-202112-0006',
      } as any);

      const result = await service.generateInvoice(organizationId, items);

      expect(result.number).toMatch(/^INV-\d{6}-\d{4}$/);
    });

    it('should set due date to 30 days from now', async () => {
      const mockOrganization = { id: organizationId, name: 'Test Org' };
      const mockBilling = { id: 'billing-123', organizationId };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization as any);
      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(mockBilling as any);
      mockPrismaService.organizationInvoice.count.mockResolvedValue(0);

      const now = Date.now();
      const expectedDueDate = new Date(now + 30 * 24 * 60 * 60 * 1000);

      mockPrismaService.organizationInvoice.create.mockImplementation((args: any) => {
        const dueDate = args.data.dueDate;
        expect(dueDate.getTime()).toBeGreaterThan(now + 29 * 24 * 60 * 60 * 1000);
        expect(dueDate.getTime()).toBeLessThan(now + 31 * 24 * 60 * 60 * 1000);
        return Promise.resolve({ id: 'inv-123', dueDate } as any);
      });

      await service.generateInvoice(organizationId, items);

      expect(mockPrismaService.organizationInvoice.create).toHaveBeenCalled();
    });
  });

  describe('getInvoices', () => {
    const organizationId = 'org-123';

    it('should return invoices with pagination', async () => {
      const mockBilling = { id: 'billing-123', organizationId };
      const mockInvoices = [
        {
          id: 'inv-1',
          number: 'INV-202101-0001',
          amount: 99.99,
          currency: 'USD',
          status: 'paid',
          description: 'Test invoice 1',
          dueDate: new Date('2021-01-15'),
          paidAt: new Date('2021-01-10'),
          pdfUrl: 'https://invoice1.pdf',
          createdAt: new Date('2021-01-01'),
        },
        {
          id: 'inv-2',
          number: 'INV-202102-0001',
          amount: 149.99,
          currency: 'USD',
          status: 'open',
          description: 'Test invoice 2',
          dueDate: new Date('2021-02-15'),
          paidAt: null,
          pdfUrl: null,
          createdAt: new Date('2021-02-01'),
        },
      ];

      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(mockBilling as any);
      mockPrismaService.organizationInvoice.count.mockResolvedValue(2);
      mockPrismaService.organizationInvoice.findMany.mockResolvedValue(mockInvoices as any);

      const result = await service.getInvoices(organizationId, { limit: 10, offset: 0 });

      expect(result).toEqual({
        invoices: mockInvoices.map((inv) => ({
          id: inv.id,
          number: inv.number,
          amount: inv.amount,
          currency: inv.currency,
          status: inv.status,
          description: inv.description,
          dueDate: inv.dueDate,
          paidAt: inv.paidAt,
          pdfUrl: inv.pdfUrl,
          createdAt: inv.createdAt,
        })),
        total: 2,
        limit: 10,
        offset: 0,
      });
    });

    it('should return empty array if no billing exists', async () => {
      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(null);

      const result = await service.getInvoices(organizationId);

      expect(result).toEqual({
        invoices: [],
        total: 0,
        limit: 10,
        offset: 0,
      });

      expect(mockPrismaService.organizationInvoice.findMany).not.toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      const mockBilling = { id: 'billing-123', organizationId };

      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(mockBilling as any);
      mockPrismaService.organizationInvoice.count.mockResolvedValue(1);
      mockPrismaService.organizationInvoice.findMany.mockResolvedValue([]);

      await service.getInvoices(organizationId, { status: 'paid' });

      expect(mockPrismaService.organizationInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'paid',
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      const mockBilling = { id: 'billing-123', organizationId };
      const startDate = new Date('2021-01-01');
      const endDate = new Date('2021-12-31');

      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(mockBilling as any);
      mockPrismaService.organizationInvoice.count.mockResolvedValue(0);
      mockPrismaService.organizationInvoice.findMany.mockResolvedValue([]);

      await service.getInvoices(organizationId, { startDate, endDate });

      expect(mockPrismaService.organizationInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        }),
      );
    });

    it('should filter by start date only', async () => {
      const mockBilling = { id: 'billing-123', organizationId };
      const startDate = new Date('2021-01-01');

      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(mockBilling as any);
      mockPrismaService.organizationInvoice.count.mockResolvedValue(0);
      mockPrismaService.organizationInvoice.findMany.mockResolvedValue([]);

      await service.getInvoices(organizationId, { startDate });

      expect(mockPrismaService.organizationInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
            },
          }),
        }),
      );
    });

    it('should filter by end date only', async () => {
      const mockBilling = { id: 'billing-123', organizationId };
      const endDate = new Date('2021-12-31');

      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(mockBilling as any);
      mockPrismaService.organizationInvoice.count.mockResolvedValue(0);
      mockPrismaService.organizationInvoice.findMany.mockResolvedValue([]);

      await service.getInvoices(organizationId, { endDate });

      expect(mockPrismaService.organizationInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              lte: endDate,
            },
          }),
        }),
      );
    });

    it('should apply custom limit and offset', async () => {
      const mockBilling = { id: 'billing-123', organizationId };

      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(mockBilling as any);
      mockPrismaService.organizationInvoice.count.mockResolvedValue(100);
      mockPrismaService.organizationInvoice.findMany.mockResolvedValue([]);

      await service.getInvoices(organizationId, { limit: 25, offset: 50 });

      expect(mockPrismaService.organizationInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
          skip: 50,
        }),
      );
    });

    it('should order by createdAt descending', async () => {
      const mockBilling = { id: 'billing-123', organizationId };

      mockPrismaService.organizationBilling.findUnique.mockResolvedValue(mockBilling as any);
      mockPrismaService.organizationInvoice.count.mockResolvedValue(0);
      mockPrismaService.organizationInvoice.findMany.mockResolvedValue([]);

      await service.getInvoices(organizationId);

      expect(mockPrismaService.organizationInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('getInvoice', () => {
    const invoiceId = 'inv-123';

    it('should return cached invoice if available', async () => {
      const cachedInvoice = {
        id: invoiceId,
        number: 'INV-202101-0001',
        amount: 99.99,
      };

      mockRedisService.get.mockResolvedValue(cachedInvoice);

      const result = await service.getInvoice(invoiceId);

      expect(result).toEqual(cachedInvoice);
      expect(mockRedisService.get).toHaveBeenCalledWith(`invoice:${invoiceId}`);
      expect(mockPrismaService.organizationInvoice.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not cached', async () => {
      const mockInvoice = {
        id: invoiceId,
        number: 'INV-202101-0001',
        amount: 99.99,
        currency: 'USD',
        status: 'paid',
        description: 'Test invoice',
        lineItems: [{ description: 'Item 1', amount: 99.99 }],
        dueDate: new Date('2021-01-15'),
        paidAt: new Date('2021-01-10'),
        pdfUrl: 'https://invoice.pdf',
        stripeInvoiceId: 'in_stripe123',
        createdAt: new Date('2021-01-01'),
        billing: {
          organization: {
            id: 'org-123',
            name: 'Test Org',
            slug: 'test-org',
            primaryEmail: 'test@example.com',
            address: '123 Main St',
          },
        },
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationInvoice.findUnique.mockResolvedValue(mockInvoice as any);
      mockRedisService.set.mockResolvedValue('OK' as any);

      const result = await service.getInvoice(invoiceId);

      expect(result).toEqual({
        id: invoiceId,
        number: 'INV-202101-0001',
        amount: 99.99,
        currency: 'USD',
        status: 'paid',
        description: 'Test invoice',
        lineItems: mockInvoice.lineItems,
        dueDate: mockInvoice.dueDate,
        paidAt: mockInvoice.paidAt,
        pdfUrl: 'https://invoice.pdf',
        stripeInvoiceId: 'in_stripe123',
        createdAt: mockInvoice.createdAt,
        organization: mockInvoice.billing.organization,
      });

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `invoice:${invoiceId}`,
        expect.any(Object),
        300,
      );
    });

    it('should throw NotFoundException if invoice not found', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationInvoice.findUnique.mockResolvedValue(null);

      await expect(service.getInvoice(invoiceId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('markInvoicePaid', () => {
    const invoiceId = 'inv-123';

    it('should mark invoice as paid successfully', async () => {
      const mockInvoice = {
        id: invoiceId,
        number: 'INV-202101-0001',
        status: 'open',
      };

      const mockUpdatedInvoice = {
        id: invoiceId,
        number: 'INV-202101-0001',
        status: 'paid',
        paidAt: new Date('2021-01-10'),
      };

      mockPrismaService.organizationInvoice.findUnique.mockResolvedValue(mockInvoice as any);
      mockPrismaService.organizationInvoice.update.mockResolvedValue(mockUpdatedInvoice as any);
      mockRedisService.del.mockResolvedValue(1);

      const result = await service.markInvoicePaid(invoiceId);

      expect(result).toEqual({
        id: invoiceId,
        number: 'INV-202101-0001',
        status: 'paid',
        paidAt: mockUpdatedInvoice.paidAt,
      });

      expect(mockPrismaService.organizationInvoice.update).toHaveBeenCalledWith({
        where: { id: invoiceId },
        data: {
          status: 'paid',
          paidAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if invoice not found', async () => {
      mockPrismaService.organizationInvoice.findUnique.mockResolvedValue(null);

      await expect(service.markInvoicePaid(invoiceId)).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.organizationInvoice.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if invoice already paid', async () => {
      const mockInvoice = {
        id: invoiceId,
        status: 'paid',
        paidAt: new Date('2021-01-05'),
      };

      mockPrismaService.organizationInvoice.findUnique.mockResolvedValue(mockInvoice as any);

      await expect(service.markInvoicePaid(invoiceId)).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.organizationInvoice.update).not.toHaveBeenCalled();
    });

    it('should clear cache after marking as paid', async () => {
      const mockInvoice = { id: invoiceId, status: 'open' };

      mockPrismaService.organizationInvoice.findUnique.mockResolvedValue(mockInvoice as any);
      mockPrismaService.organizationInvoice.update.mockResolvedValue({
        id: invoiceId,
        status: 'paid',
      } as any);
      mockRedisService.del.mockResolvedValue(1);

      await service.markInvoicePaid(invoiceId);

      expect(mockRedisService.del).toHaveBeenCalledWith(`invoice:${invoiceId}`);
    });
  });

  describe('voidInvoice', () => {
    const invoiceId = 'inv-123';

    it('should void invoice successfully', async () => {
      const mockInvoice = {
        id: invoiceId,
        number: 'INV-202101-0001',
        status: 'open',
      };

      const mockUpdatedInvoice = {
        id: invoiceId,
        number: 'INV-202101-0001',
        status: 'void',
      };

      mockPrismaService.organizationInvoice.findUnique.mockResolvedValue(mockInvoice as any);
      mockPrismaService.organizationInvoice.update.mockResolvedValue(mockUpdatedInvoice as any);
      mockRedisService.del.mockResolvedValue(1);

      const result = await service.voidInvoice(invoiceId);

      expect(result).toEqual({
        id: invoiceId,
        number: 'INV-202101-0001',
        status: 'void',
      });

      expect(mockPrismaService.organizationInvoice.update).toHaveBeenCalledWith({
        where: { id: invoiceId },
        data: {
          status: 'void',
        },
      });
    });

    it('should throw NotFoundException if invoice not found', async () => {
      mockPrismaService.organizationInvoice.findUnique.mockResolvedValue(null);

      await expect(service.voidInvoice(invoiceId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if invoice is paid', async () => {
      const mockInvoice = {
        id: invoiceId,
        status: 'paid',
      };

      mockPrismaService.organizationInvoice.findUnique.mockResolvedValue(mockInvoice as any);

      await expect(service.voidInvoice(invoiceId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if invoice already void', async () => {
      const mockInvoice = {
        id: invoiceId,
        status: 'void',
      };

      mockPrismaService.organizationInvoice.findUnique.mockResolvedValue(mockInvoice as any);

      await expect(service.voidInvoice(invoiceId)).rejects.toThrow(BadRequestException);
    });

    it('should clear cache after voiding', async () => {
      const mockInvoice = { id: invoiceId, status: 'open' };

      mockPrismaService.organizationInvoice.findUnique.mockResolvedValue(mockInvoice as any);
      mockPrismaService.organizationInvoice.update.mockResolvedValue({
        id: invoiceId,
        status: 'void',
      } as any);
      mockRedisService.del.mockResolvedValue(1);

      await service.voidInvoice(invoiceId);

      expect(mockRedisService.del).toHaveBeenCalledWith(`invoice:${invoiceId}`);
    });
  });

  describe('updateStripeInvoiceInfo', () => {
    const invoiceId = 'inv-123';
    const stripeInvoiceId = 'in_stripe123';
    const pdfUrl = 'https://stripe.com/invoice.pdf';

    it('should update invoice with Stripe info successfully', async () => {
      mockPrismaService.organizationInvoice.update.mockResolvedValue({
        id: invoiceId,
        stripeInvoiceId,
        pdfUrl,
      } as any);
      mockRedisService.del.mockResolvedValue(1);

      await service.updateStripeInvoiceInfo(invoiceId, stripeInvoiceId, pdfUrl);

      expect(mockPrismaService.organizationInvoice.update).toHaveBeenCalledWith({
        where: { id: invoiceId },
        data: {
          stripeInvoiceId,
          pdfUrl,
        },
      });
    });

    it('should update without PDF URL', async () => {
      mockPrismaService.organizationInvoice.update.mockResolvedValue({
        id: invoiceId,
        stripeInvoiceId,
      } as any);
      mockRedisService.del.mockResolvedValue(1);

      await service.updateStripeInvoiceInfo(invoiceId, stripeInvoiceId);

      expect(mockPrismaService.organizationInvoice.update).toHaveBeenCalledWith({
        where: { id: invoiceId },
        data: {
          stripeInvoiceId,
          pdfUrl: undefined,
        },
      });
    });

    it('should clear cache after update', async () => {
      mockPrismaService.organizationInvoice.update.mockResolvedValue({ id: invoiceId } as any);
      mockRedisService.del.mockResolvedValue(1);

      await service.updateStripeInvoiceInfo(invoiceId, stripeInvoiceId, pdfUrl);

      expect(mockRedisService.del).toHaveBeenCalledWith(`invoice:${invoiceId}`);
    });
  });
});
