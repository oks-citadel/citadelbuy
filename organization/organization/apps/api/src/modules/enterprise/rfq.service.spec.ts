import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RFQService, RFQ, RFQResponse } from './rfq.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('RFQService', () => {
  let service: RFQService;
  let prisma: PrismaService;

  const mockPrismaService = {
    rFQ: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    rFQResponse: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RFQService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RFQService>(RFQService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRFQ', () => {
    const mockRFQData: Omit<RFQ, 'id'> = {
      organizationId: 'org-123',
      title: 'Office Supplies RFQ',
      description: 'Request for office supplies quotation',
      requirements: { delivery: 'within 2 weeks', payment: 'Net 30' },
      items: [
        {
          description: 'Printer Paper A4',
          quantity: 100,
          specifications: { quality: 'Premium' },
          targetPrice: 5,
        },
      ],
      status: 'DRAFT',
      deadline: new Date('2024-12-31'),
      budget: 10000,
      currency: 'USD',
    };

    it('should create RFQ successfully', async () => {
      const mockRFQ = {
        id: 'rfq-001',
        ...mockRFQData,
        createdAt: new Date(),
      };

      mockPrismaService.rFQ.create.mockResolvedValue(mockRFQ);

      const result = await service.createRFQ(mockRFQData);

      expect(result).toEqual(mockRFQ);
      expect(mockPrismaService.rFQ.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: mockRFQData.organizationId,
          title: mockRFQData.title,
          description: mockRFQData.description,
          status: 'DRAFT',
        }),
      });
    });

    it('should default status to DRAFT when not provided', async () => {
      const dataWithoutStatus = {
        ...mockRFQData,
        status: undefined as any,
      };

      mockPrismaService.rFQ.create.mockResolvedValue({
        id: 'rfq-001',
        ...dataWithoutStatus,
        status: 'DRAFT',
      });

      await service.createRFQ(dataWithoutStatus);

      expect(mockPrismaService.rFQ.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'DRAFT',
        }),
      });
    });

    it('should default currency to USD when not provided', async () => {
      const dataWithoutCurrency = {
        ...mockRFQData,
        currency: undefined,
      };

      mockPrismaService.rFQ.create.mockResolvedValue({
        id: 'rfq-001',
        ...dataWithoutCurrency,
        currency: 'USD',
      });

      await service.createRFQ(dataWithoutCurrency);

      expect(mockPrismaService.rFQ.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          currency: 'USD',
        }),
      });
    });

    it('should create RFQ without budget', async () => {
      const dataWithoutBudget = {
        ...mockRFQData,
        budget: undefined,
      };

      mockPrismaService.rFQ.create.mockResolvedValue({
        id: 'rfq-001',
        ...dataWithoutBudget,
      });

      await service.createRFQ(dataWithoutBudget);

      expect(mockPrismaService.rFQ.create).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockPrismaService.rFQ.create.mockRejectedValue(error);

      await expect(service.createRFQ(mockRFQData)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('getRFQs', () => {
    const mockRFQs = [
      {
        id: 'rfq-001',
        organizationId: 'org-123',
        title: 'RFQ 1',
        status: 'PUBLISHED',
        organization: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
        responses: [],
      },
      {
        id: 'rfq-002',
        organizationId: 'org-123',
        title: 'RFQ 2',
        status: 'DRAFT',
        organization: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
        responses: [],
      },
    ];

    it('should return all RFQs without filters', async () => {
      mockPrismaService.rFQ.findMany.mockResolvedValue(mockRFQs);

      const result = await service.getRFQs();

      expect(result).toEqual(mockRFQs);
      expect(mockPrismaService.rFQ.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          responses: {
            where: undefined,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by organizationId', async () => {
      mockPrismaService.rFQ.findMany.mockResolvedValue([mockRFQs[0]]);

      const result = await service.getRFQs({ organizationId: 'org-123' });

      expect(mockPrismaService.rFQ.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-123' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by status', async () => {
      mockPrismaService.rFQ.findMany.mockResolvedValue([mockRFQs[0]]);

      const result = await service.getRFQs({ status: 'PUBLISHED' });

      expect(mockPrismaService.rFQ.findMany).toHaveBeenCalledWith({
        where: { status: 'PUBLISHED' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter responses by vendorId', async () => {
      mockPrismaService.rFQ.findMany.mockResolvedValue(mockRFQs);

      await service.getRFQs({ vendorId: 'vendor-123' });

      expect(mockPrismaService.rFQ.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          organization: expect.any(Object),
          responses: {
            where: { vendorId: 'vendor-123' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no RFQs found', async () => {
      mockPrismaService.rFQ.findMany.mockResolvedValue([]);

      const result = await service.getRFQs({ organizationId: 'nonexistent' });

      expect(result).toEqual([]);
    });
  });

  describe('getRFQById', () => {
    const mockRFQ = {
      id: 'rfq-001',
      organizationId: 'org-123',
      title: 'Test RFQ',
      status: 'PUBLISHED',
      organization: { id: 'org-123', name: 'Test Org' },
      responses: [
        {
          id: 'response-001',
          vendorId: 'vendor-123',
          vendor: { id: 'vendor-123', name: 'Vendor 1', rating: 4.5 },
        },
      ],
    };

    it('should return RFQ with related data', async () => {
      mockPrismaService.rFQ.findUnique.mockResolvedValue(mockRFQ);

      const result = await service.getRFQById('rfq-001');

      expect(result).toEqual(mockRFQ);
      expect(mockPrismaService.rFQ.findUnique).toHaveBeenCalledWith({
        where: { id: 'rfq-001' },
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
    });

    it('should throw NotFoundException when RFQ not found', async () => {
      mockPrismaService.rFQ.findUnique.mockResolvedValue(null);

      await expect(service.getRFQById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getRFQById('nonexistent')).rejects.toThrow(
        'RFQ nonexistent not found',
      );
    });
  });

  describe('updateRFQ', () => {
    const mockRFQ = {
      id: 'rfq-001',
      organizationId: 'org-123',
      title: 'Test RFQ',
      status: 'DRAFT',
      organization: {},
      responses: [],
    };

    it('should update RFQ successfully', async () => {
      const updates = { title: 'Updated RFQ Title' };
      const updatedRFQ = { ...mockRFQ, ...updates };

      mockPrismaService.rFQ.findUnique.mockResolvedValue(mockRFQ);
      mockPrismaService.rFQ.update.mockResolvedValue(updatedRFQ);

      const result = await service.updateRFQ('rfq-001', updates);

      expect(result.title).toBe('Updated RFQ Title');
      expect(mockPrismaService.rFQ.update).toHaveBeenCalledWith({
        where: { id: 'rfq-001' },
        data: expect.objectContaining({
          title: 'Updated RFQ Title',
        }),
      });
    });

    it('should throw NotFoundException when RFQ not found', async () => {
      mockPrismaService.rFQ.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRFQ('nonexistent', { title: 'New Title' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when updating awarded RFQ', async () => {
      const awardedRFQ = { ...mockRFQ, status: 'AWARDED' };
      mockPrismaService.rFQ.findUnique.mockResolvedValue(awardedRFQ);

      await expect(
        service.updateRFQ('rfq-001', { title: 'New Title' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateRFQ('rfq-001', { title: 'New Title' }),
      ).rejects.toThrow('Cannot update awarded RFQ');
    });

    it('should update multiple fields', async () => {
      const updates = {
        title: 'New Title',
        description: 'New Description',
        budget: 20000,
      };

      mockPrismaService.rFQ.findUnique.mockResolvedValue(mockRFQ);
      mockPrismaService.rFQ.update.mockResolvedValue({ ...mockRFQ, ...updates });

      await service.updateRFQ('rfq-001', updates);

      expect(mockPrismaService.rFQ.update).toHaveBeenCalledWith({
        where: { id: 'rfq-001' },
        data: expect.objectContaining(updates),
      });
    });
  });

  describe('publishRFQ', () => {
    const mockDraftRFQ = {
      id: 'rfq-001',
      title: 'Test RFQ',
      status: 'DRAFT',
      organization: {},
      responses: [],
    };

    it('should publish RFQ successfully', async () => {
      const publishedRFQ = {
        ...mockDraftRFQ,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      };

      mockPrismaService.rFQ.findUnique.mockResolvedValue(mockDraftRFQ);
      mockPrismaService.rFQ.update.mockResolvedValue(publishedRFQ);

      const result = await service.publishRFQ('rfq-001');

      expect(result.status).toBe('PUBLISHED');
      expect(mockPrismaService.rFQ.update).toHaveBeenCalledWith({
        where: { id: 'rfq-001' },
        data: {
          status: 'PUBLISHED',
          publishedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException when RFQ not found', async () => {
      mockPrismaService.rFQ.findUnique.mockResolvedValue(null);

      await expect(service.publishRFQ('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when RFQ is not draft', async () => {
      const publishedRFQ = { ...mockDraftRFQ, status: 'PUBLISHED' };
      mockPrismaService.rFQ.findUnique.mockResolvedValue(publishedRFQ);

      await expect(service.publishRFQ('rfq-001')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.publishRFQ('rfq-001')).rejects.toThrow(
        'Only draft RFQs can be published',
      );
    });

    it('should throw BadRequestException when RFQ is cancelled', async () => {
      const cancelledRFQ = { ...mockDraftRFQ, status: 'CANCELLED' };
      mockPrismaService.rFQ.findUnique.mockResolvedValue(cancelledRFQ);

      await expect(service.publishRFQ('rfq-001')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('submitResponse', () => {
    const mockRFQ = {
      id: 'rfq-001',
      status: 'PUBLISHED',
      deadline: new Date(Date.now() + 86400000), // Tomorrow
      organization: {},
      responses: [],
    };

    const mockResponseData: Omit<RFQResponse, 'id'> = {
      rfqId: 'rfq-001',
      vendorId: 'vendor-123',
      items: [
        {
          rfqItemIndex: 0,
          unitPrice: 4.5,
          quantity: 100,
          totalPrice: 450,
          leadTime: 7,
        },
      ],
      totalPrice: 450,
      currency: 'USD',
      deliveryTime: 7,
      validUntil: new Date('2024-12-31'),
      status: 'SUBMITTED',
    };

    it('should submit response successfully', async () => {
      const mockResponse = {
        id: 'response-001',
        ...mockResponseData,
        createdAt: new Date(),
      };

      mockPrismaService.rFQ.findUnique.mockResolvedValue(mockRFQ);
      mockPrismaService.rFQResponse.findFirst.mockResolvedValue(null);
      mockPrismaService.rFQResponse.create.mockResolvedValue(mockResponse);
      mockPrismaService.rFQ.update.mockResolvedValue({ ...mockRFQ, status: 'REVIEWING' });

      const result = await service.submitResponse(mockResponseData);

      expect(result).toEqual(mockResponse);
      expect(mockPrismaService.rFQResponse.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          totalPrice: mockResponseData.totalPrice,
          status: 'SUBMITTED',
        }),
      });
    });

    it('should throw NotFoundException when RFQ not found', async () => {
      mockPrismaService.rFQ.findUnique.mockResolvedValue(null);

      await expect(service.submitResponse(mockResponseData)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when RFQ is not published', async () => {
      const draftRFQ = { ...mockRFQ, status: 'DRAFT' };
      mockPrismaService.rFQ.findUnique.mockResolvedValue(draftRFQ);

      await expect(service.submitResponse(mockResponseData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.submitResponse(mockResponseData)).rejects.toThrow(
        'RFQ is not accepting responses',
      );
    });

    it('should throw BadRequestException when deadline has passed', async () => {
      const expiredRFQ = {
        ...mockRFQ,
        deadline: new Date(Date.now() - 86400000), // Yesterday
      };
      mockPrismaService.rFQ.findUnique.mockResolvedValue(expiredRFQ);

      await expect(service.submitResponse(mockResponseData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.submitResponse(mockResponseData)).rejects.toThrow(
        'RFQ deadline has passed',
      );
    });

    it('should throw BadRequestException when vendor already submitted', async () => {
      mockPrismaService.rFQ.findUnique.mockResolvedValue(mockRFQ);
      mockPrismaService.rFQResponse.findFirst.mockResolvedValue({
        id: 'existing-response',
        vendorId: 'vendor-123',
      });

      await expect(service.submitResponse(mockResponseData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.submitResponse(mockResponseData)).rejects.toThrow(
        'Vendor has already submitted a response',
      );
    });

    it('should update RFQ status to REVIEWING after first response', async () => {
      mockPrismaService.rFQ.findUnique.mockResolvedValue(mockRFQ);
      mockPrismaService.rFQResponse.findFirst.mockResolvedValue(null);
      mockPrismaService.rFQResponse.create.mockResolvedValue({
        id: 'response-001',
        ...mockResponseData,
      });
      mockPrismaService.rFQ.update.mockResolvedValue({ ...mockRFQ, status: 'REVIEWING' });

      await service.submitResponse(mockResponseData);

      expect(mockPrismaService.rFQ.update).toHaveBeenCalledWith({
        where: { id: 'rfq-001' },
        data: { status: 'REVIEWING' },
      });
    });
  });

  describe('getRFQResponses', () => {
    const mockRFQ = {
      id: 'rfq-001',
      organization: {},
      responses: [],
    };

    const mockResponses = [
      {
        id: 'response-001',
        rfqId: 'rfq-001',
        vendorId: 'vendor-123',
        totalPrice: 450,
        vendor: { id: 'vendor-123', name: 'Vendor 1', rating: 4.5, businessName: 'Business 1' },
      },
      {
        id: 'response-002',
        rfqId: 'rfq-001',
        vendorId: 'vendor-456',
        totalPrice: 500,
        vendor: { id: 'vendor-456', name: 'Vendor 2', rating: 4.0, businessName: 'Business 2' },
      },
    ];

    it('should return all responses for RFQ', async () => {
      mockPrismaService.rFQ.findUnique.mockResolvedValue(mockRFQ);
      mockPrismaService.rFQResponse.findMany.mockResolvedValue(mockResponses);

      const result = await service.getRFQResponses('rfq-001');

      expect(result).toEqual(mockResponses);
      expect(mockPrismaService.rFQResponse.findMany).toHaveBeenCalledWith({
        where: { rfqId: 'rfq-001' },
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
    });

    it('should throw NotFoundException when RFQ not found', async () => {
      mockPrismaService.rFQ.findUnique.mockResolvedValue(null);

      await expect(service.getRFQResponses('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return empty array when no responses', async () => {
      mockPrismaService.rFQ.findUnique.mockResolvedValue(mockRFQ);
      mockPrismaService.rFQResponse.findMany.mockResolvedValue([]);

      const result = await service.getRFQResponses('rfq-001');

      expect(result).toEqual([]);
    });
  });

  describe('compareResponses', () => {
    const mockRFQ = {
      id: 'rfq-001',
      organization: {},
      responses: [],
    };

    const mockResponses = [
      {
        id: 'response-001',
        vendorId: 'vendor-123',
        totalPrice: 450,
        deliveryTime: 7,
        vendor: { id: 'vendor-123', name: 'Vendor 1', rating: 4.5 },
      },
      {
        id: 'response-002',
        vendorId: 'vendor-456',
        totalPrice: 500,
        deliveryTime: 5,
        vendor: { id: 'vendor-456', name: 'Vendor 2', rating: 5.0 },
      },
      {
        id: 'response-003',
        vendorId: 'vendor-789',
        totalPrice: 400,
        deliveryTime: 10,
        vendor: { id: 'vendor-789', name: 'Vendor 3', rating: 3.5 },
      },
    ];

    it('should compare responses and return analysis', async () => {
      mockPrismaService.rFQ.findUnique.mockResolvedValue(mockRFQ);
      mockPrismaService.rFQResponse.findMany.mockResolvedValue(mockResponses);

      const result = await service.compareResponses('rfq-001');

      expect(result.rfqId).toBe('rfq-001');
      expect(result.responseCount).toBe(3);
      expect(result.comparison.lowestPrice).toBe(400);
      expect(result.comparison.highestPrice).toBe(500);
      expect(result.comparison.fastestDelivery).toBe(5);
      expect(result.comparison.slowestDelivery).toBe(10);
      expect(result.comparison.recommendedVendor).toBeDefined();
    });

    it('should return null comparison when no responses', async () => {
      mockPrismaService.rFQ.findUnique.mockResolvedValue(mockRFQ);
      mockPrismaService.rFQResponse.findMany.mockResolvedValue([]);

      const result = await service.compareResponses('rfq-001');

      expect(result).toEqual({
        rfqId: 'rfq-001',
        responseCount: 0,
        comparison: null,
      });
    });

    it('should calculate average price correctly', async () => {
      mockPrismaService.rFQ.findUnique.mockResolvedValue(mockRFQ);
      mockPrismaService.rFQResponse.findMany.mockResolvedValue(mockResponses);

      const result = await service.compareResponses('rfq-001');

      expect(result.comparison.averagePrice).toBe(450); // (450 + 500 + 400) / 3
    });

    it('should include score for each response', async () => {
      mockPrismaService.rFQ.findUnique.mockResolvedValue(mockRFQ);
      mockPrismaService.rFQResponse.findMany.mockResolvedValue(mockResponses);

      const result = await service.compareResponses('rfq-001');

      expect(result.responses.length).toBe(3);
      result.responses.forEach((response: any) => {
        expect(response.score).toBeDefined();
        expect(typeof response.score).toBe('number');
      });
    });
  });

  describe('awardRFQ', () => {
    const mockRFQ = {
      id: 'rfq-001',
      status: 'REVIEWING',
      organization: {},
      responses: [],
    };

    const mockResponse = {
      id: 'response-001',
      rfqId: 'rfq-001',
      vendorId: 'vendor-123',
    };

    it('should award RFQ successfully', async () => {
      mockPrismaService.rFQ.findUnique.mockResolvedValue(mockRFQ);
      mockPrismaService.rFQResponse.findUnique.mockResolvedValue(mockResponse);
      mockPrismaService.rFQ.update.mockResolvedValue({ ...mockRFQ, status: 'AWARDED' });
      mockPrismaService.rFQResponse.update.mockResolvedValue({
        ...mockResponse,
        status: 'ACCEPTED',
      });
      mockPrismaService.rFQResponse.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.awardRFQ('rfq-001', 'response-001');

      expect(result.success).toBe(true);
      expect(result.rfqId).toBe('rfq-001');
      expect(result.responseId).toBe('response-001');
    });

    it('should throw NotFoundException when RFQ not found', async () => {
      mockPrismaService.rFQ.findUnique.mockResolvedValue(null);

      await expect(
        service.awardRFQ('nonexistent', 'response-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when response not found', async () => {
      mockPrismaService.rFQ.findUnique.mockResolvedValue(mockRFQ);
      mockPrismaService.rFQResponse.findUnique.mockResolvedValue(null);

      await expect(
        service.awardRFQ('rfq-001', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when response belongs to different RFQ', async () => {
      const differentRFQResponse = { ...mockResponse, rfqId: 'different-rfq' };
      mockPrismaService.rFQ.findUnique.mockResolvedValue(mockRFQ);
      mockPrismaService.rFQResponse.findUnique.mockResolvedValue(differentRFQResponse);

      await expect(
        service.awardRFQ('rfq-001', 'response-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when RFQ already awarded', async () => {
      const awardedRFQ = { ...mockRFQ, status: 'AWARDED' };
      mockPrismaService.rFQ.findUnique.mockResolvedValue(awardedRFQ);
      mockPrismaService.rFQResponse.findUnique.mockResolvedValue(mockResponse);

      await expect(
        service.awardRFQ('rfq-001', 'response-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject other responses when awarding', async () => {
      mockPrismaService.rFQ.findUnique.mockResolvedValue(mockRFQ);
      mockPrismaService.rFQResponse.findUnique.mockResolvedValue(mockResponse);
      mockPrismaService.rFQ.update.mockResolvedValue({ ...mockRFQ, status: 'AWARDED' });
      mockPrismaService.rFQResponse.update.mockResolvedValue({
        ...mockResponse,
        status: 'ACCEPTED',
      });
      mockPrismaService.rFQResponse.updateMany.mockResolvedValue({ count: 2 });

      await service.awardRFQ('rfq-001', 'response-001');

      expect(mockPrismaService.rFQResponse.updateMany).toHaveBeenCalledWith({
        where: {
          rfqId: 'rfq-001',
          id: { not: 'response-001' },
        },
        data: { status: 'REJECTED' },
      });
    });
  });

  describe('cancelRFQ', () => {
    const mockRFQ = {
      id: 'rfq-001',
      status: 'PUBLISHED',
      organization: {},
      responses: [],
    };

    it('should cancel RFQ successfully', async () => {
      mockPrismaService.rFQ.findUnique.mockResolvedValue(mockRFQ);
      mockPrismaService.rFQ.update.mockResolvedValue({
        ...mockRFQ,
        status: 'CANCELLED',
        cancellationReason: 'Budget constraints',
      });

      const result = await service.cancelRFQ('rfq-001', 'Budget constraints');

      expect(result.success).toBe(true);
      expect(mockPrismaService.rFQ.update).toHaveBeenCalledWith({
        where: { id: 'rfq-001' },
        data: {
          status: 'CANCELLED',
          cancellationReason: 'Budget constraints',
        },
      });
    });

    it('should throw NotFoundException when RFQ not found', async () => {
      mockPrismaService.rFQ.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelRFQ('nonexistent', 'Reason'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when RFQ already awarded', async () => {
      const awardedRFQ = { ...mockRFQ, status: 'AWARDED' };
      mockPrismaService.rFQ.findUnique.mockResolvedValue(awardedRFQ);

      await expect(
        service.cancelRFQ('rfq-001', 'Reason'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.cancelRFQ('rfq-001', 'Reason'),
      ).rejects.toThrow('Cannot cancel awarded RFQ');
    });

    it('should allow cancelling draft RFQ', async () => {
      const draftRFQ = { ...mockRFQ, status: 'DRAFT' };
      mockPrismaService.rFQ.findUnique.mockResolvedValue(draftRFQ);
      mockPrismaService.rFQ.update.mockResolvedValue({
        ...draftRFQ,
        status: 'CANCELLED',
      });

      const result = await service.cancelRFQ('rfq-001', 'No longer needed');

      expect(result.success).toBe(true);
    });
  });

  describe('getRFQAnalytics', () => {
    it('should return analytics without organization filter', async () => {
      mockPrismaService.rFQ.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(30) // published
        .mockResolvedValueOnce(50) // awarded
        .mockResolvedValueOnce(10); // cancelled

      mockPrismaService.rFQ.findMany.mockResolvedValue([
        { _count: { responses: 5 } },
        { _count: { responses: 3 } },
        { _count: { responses: 7 } },
      ]);

      const result = await service.getRFQAnalytics();

      expect(result).toEqual({
        total: 100,
        published: 30,
        awarded: 50,
        cancelled: 10,
        awardRate: 50, // (50/100) * 100
        averageResponsesPerRFQ: 5, // (5+3+7)/3
      });
    });

    it('should filter by organization', async () => {
      mockPrismaService.rFQ.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(5);

      mockPrismaService.rFQ.findMany.mockResolvedValue([
        { _count: { responses: 4 } },
        { _count: { responses: 6 } },
      ]);

      const result = await service.getRFQAnalytics('org-123');

      expect(result.total).toBe(50);
      expect(mockPrismaService.rFQ.count).toHaveBeenCalledWith({
        where: { organizationId: 'org-123' },
      });
    });

    it('should handle zero RFQs', async () => {
      mockPrismaService.rFQ.count.mockResolvedValue(0);
      mockPrismaService.rFQ.findMany.mockResolvedValue([]);

      const result = await service.getRFQAnalytics();

      expect(result).toEqual({
        total: 0,
        published: 0,
        awarded: 0,
        cancelled: 0,
        awardRate: 0,
        averageResponsesPerRFQ: 0,
      });
    });

    it('should calculate award rate correctly', async () => {
      mockPrismaService.rFQ.count
        .mockResolvedValueOnce(200) // total
        .mockResolvedValueOnce(50) // published
        .mockResolvedValueOnce(80) // awarded
        .mockResolvedValueOnce(20); // cancelled

      mockPrismaService.rFQ.findMany.mockResolvedValue([]);

      const result = await service.getRFQAnalytics();

      expect(result.awardRate).toBe(40); // (80/200) * 100
    });
  });
});
