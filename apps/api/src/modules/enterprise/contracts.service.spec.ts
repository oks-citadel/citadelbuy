import { Test, TestingModule } from '@nestjs/testing';
import { ContractsService, EnterpriseContract } from './contracts.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('ContractsService', () => {
  let service: ContractsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    enterpriseContract: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ContractsService>(ContractsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createContract', () => {
    const mockContractData: Omit<EnterpriseContract, 'id'> = {
      organizationId: 'org-123',
      vendorId: 'vendor-456',
      title: 'Master Service Agreement',
      type: 'MASTER_AGREEMENT',
      status: 'DRAFT',
      terms: { payment: '30 days', warranty: '1 year' },
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-01-01'),
      autoRenew: true,
      renewalTermDays: 365,
      value: 100000,
      currency: 'USD',
    };

    it('should create a contract successfully', async () => {
      const mockContract = {
        id: 'contract-789',
        ...mockContractData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.enterpriseContract.create.mockResolvedValue(mockContract);

      const result = await service.createContract(mockContractData);

      expect(result).toEqual(mockContract);
      expect(mockPrismaService.enterpriseContract.create).toHaveBeenCalledWith({
        data: {
          organizationId: mockContractData.organizationId,
          vendorId: mockContractData.vendorId,
          title: mockContractData.title,
          type: mockContractData.type,
          status: mockContractData.status,
          terms: mockContractData.terms,
          startDate: mockContractData.startDate,
          endDate: mockContractData.endDate,
          autoRenew: mockContractData.autoRenew,
          renewalTermDays: mockContractData.renewalTermDays,
          value: mockContractData.value,
          currency: mockContractData.currency,
        },
      });
    });

    it('should default status to DRAFT when not provided', async () => {
      const dataWithoutStatus = {
        ...mockContractData,
        status: undefined as any,
      };

      const mockContract = {
        id: 'contract-789',
        ...dataWithoutStatus,
        status: 'DRAFT',
        createdAt: new Date(),
      };

      mockPrismaService.enterpriseContract.create.mockResolvedValue(mockContract);

      await service.createContract(dataWithoutStatus);

      expect(mockPrismaService.enterpriseContract.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'DRAFT',
        }),
      });
    });

    it('should default currency to USD when not provided', async () => {
      const dataWithoutCurrency = {
        ...mockContractData,
        currency: undefined,
      };

      const mockContract = {
        id: 'contract-789',
        ...dataWithoutCurrency,
        currency: 'USD',
        createdAt: new Date(),
      };

      mockPrismaService.enterpriseContract.create.mockResolvedValue(mockContract);

      await service.createContract(dataWithoutCurrency);

      expect(mockPrismaService.enterpriseContract.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          currency: 'USD',
        }),
      });
    });

    it('should create contract without vendorId', async () => {
      const dataWithoutVendor = {
        ...mockContractData,
        vendorId: undefined,
      };

      const mockContract = {
        id: 'contract-789',
        ...dataWithoutVendor,
        createdAt: new Date(),
      };

      mockPrismaService.enterpriseContract.create.mockResolvedValue(mockContract);

      await service.createContract(dataWithoutVendor);

      expect(mockPrismaService.enterpriseContract.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          vendorId: undefined,
        }),
      });
    });

    it('should handle different contract types', async () => {
      const contractTypes: EnterpriseContract['type'][] = [
        'MASTER_AGREEMENT',
        'PURCHASE_AGREEMENT',
        'SERVICE_AGREEMENT',
        'NDA',
        'SLA',
      ];

      for (const type of contractTypes) {
        const data = { ...mockContractData, type };
        const mockContract = { id: `contract-${type}`, ...data, createdAt: new Date() };
        mockPrismaService.enterpriseContract.create.mockResolvedValue(mockContract);

        const result = await service.createContract(data);

        expect(result.type).toBe(type);
      }
    });

    it('should handle prisma errors gracefully', async () => {
      const error = new Error('Database connection failed');
      mockPrismaService.enterpriseContract.create.mockRejectedValue(error);

      await expect(service.createContract(mockContractData)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should set endDate to current date when not provided', async () => {
      const dataWithoutEndDate = {
        ...mockContractData,
        endDate: undefined,
      };

      mockPrismaService.enterpriseContract.create.mockResolvedValue({
        id: 'contract-789',
        ...dataWithoutEndDate,
        endDate: expect.any(Date),
        createdAt: new Date(),
      });

      await service.createContract(dataWithoutEndDate);

      expect(mockPrismaService.enterpriseContract.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          endDate: expect.any(Date),
        }),
      });
    });
  });

  describe('getContracts', () => {
    const mockContracts = [
      {
        id: 'contract-1',
        organizationId: 'org-123',
        title: 'Contract 1',
        status: 'ACTIVE',
        type: 'MASTER_AGREEMENT',
        organization: { id: 'org-123', name: 'Org 1' },
        vendor: { id: 'vendor-1', name: 'Vendor 1' },
        createdAt: new Date(),
      },
      {
        id: 'contract-2',
        organizationId: 'org-123',
        title: 'Contract 2',
        status: 'DRAFT',
        type: 'NDA',
        organization: { id: 'org-123', name: 'Org 1' },
        vendor: { id: 'vendor-2', name: 'Vendor 2' },
        createdAt: new Date(),
      },
    ];

    it('should return all contracts without filters', async () => {
      mockPrismaService.enterpriseContract.findMany.mockResolvedValue(mockContracts);

      const result = await service.getContracts();

      expect(result).toEqual(mockContracts);
      expect(mockPrismaService.enterpriseContract.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          organization: {
            select: { id: true, name: true },
          },
          vendor: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by organizationId', async () => {
      mockPrismaService.enterpriseContract.findMany.mockResolvedValue([mockContracts[0]]);

      const result = await service.getContracts({ organizationId: 'org-123' });

      expect(result).toHaveLength(1);
      expect(mockPrismaService.enterpriseContract.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-123' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by vendorId', async () => {
      mockPrismaService.enterpriseContract.findMany.mockResolvedValue([mockContracts[0]]);

      const result = await service.getContracts({ vendorId: 'vendor-1' });

      expect(result).toHaveLength(1);
      expect(mockPrismaService.enterpriseContract.findMany).toHaveBeenCalledWith({
        where: { vendorId: 'vendor-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by status', async () => {
      mockPrismaService.enterpriseContract.findMany.mockResolvedValue([mockContracts[0]]);

      const result = await service.getContracts({ status: 'ACTIVE' });

      expect(result).toHaveLength(1);
      expect(mockPrismaService.enterpriseContract.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by type', async () => {
      mockPrismaService.enterpriseContract.findMany.mockResolvedValue([mockContracts[1]]);

      const result = await service.getContracts({ type: 'NDA' });

      expect(result).toHaveLength(1);
      expect(mockPrismaService.enterpriseContract.findMany).toHaveBeenCalledWith({
        where: { type: 'NDA' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by multiple criteria', async () => {
      mockPrismaService.enterpriseContract.findMany.mockResolvedValue([mockContracts[0]]);

      const result = await service.getContracts({
        organizationId: 'org-123',
        status: 'ACTIVE',
        type: 'MASTER_AGREEMENT',
      });

      expect(result).toHaveLength(1);
      expect(mockPrismaService.enterpriseContract.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-123',
          status: 'ACTIVE',
          type: 'MASTER_AGREEMENT',
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no contracts found', async () => {
      mockPrismaService.enterpriseContract.findMany.mockResolvedValue([]);

      const result = await service.getContracts({ organizationId: 'nonexistent' });

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockPrismaService.enterpriseContract.findMany.mockRejectedValue(error);

      await expect(service.getContracts()).rejects.toThrow('Database error');
    });
  });

  describe('checkExpiringContracts', () => {
    it('should return contracts expiring within default 30 days', async () => {
      const mockExpiringContracts = [
        {
          id: 'contract-1',
          title: 'Contract 1',
          status: 'ACTIVE',
          endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        },
      ];

      mockPrismaService.enterpriseContract.findMany.mockResolvedValue(mockExpiringContracts);

      const result = await service.checkExpiringContracts();

      expect(result).toEqual(mockExpiringContracts);
      expect(mockPrismaService.enterpriseContract.findMany).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
          endDate: {
            lte: expect.any(Date),
            gte: expect.any(Date),
          },
        },
      });
    });

    it('should return contracts expiring within custom days ahead', async () => {
      const daysAhead = 60;
      const mockExpiringContracts = [
        {
          id: 'contract-1',
          title: 'Contract 1',
          status: 'ACTIVE',
          endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
        },
      ];

      mockPrismaService.enterpriseContract.findMany.mockResolvedValue(mockExpiringContracts);

      const result = await service.checkExpiringContracts(daysAhead);

      expect(result).toEqual(mockExpiringContracts);
    });

    it('should return empty array when no contracts are expiring', async () => {
      mockPrismaService.enterpriseContract.findMany.mockResolvedValue([]);

      const result = await service.checkExpiringContracts();

      expect(result).toEqual([]);
    });

    it('should only check ACTIVE contracts', async () => {
      mockPrismaService.enterpriseContract.findMany.mockResolvedValue([]);

      await service.checkExpiringContracts(30);

      expect(mockPrismaService.enterpriseContract.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: 'ACTIVE',
        }),
      });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockPrismaService.enterpriseContract.findMany.mockRejectedValue(error);

      await expect(service.checkExpiringContracts()).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should filter out past contracts', async () => {
      mockPrismaService.enterpriseContract.findMany.mockResolvedValue([]);

      await service.checkExpiringContracts(30);

      const callArgs = mockPrismaService.enterpriseContract.findMany.mock.calls[0][0];
      expect(callArgs.where.endDate.gte).toBeDefined();
      // The gte date should be approximately now
      const geDate = new Date(callArgs.where.endDate.gte);
      expect(geDate.getTime()).toBeGreaterThanOrEqual(Date.now() - 1000);
    });

    it('should handle zero days ahead', async () => {
      mockPrismaService.enterpriseContract.findMany.mockResolvedValue([]);

      await service.checkExpiringContracts(0);

      expect(mockPrismaService.enterpriseContract.findMany).toHaveBeenCalled();
    });

    it('should handle large number of days ahead', async () => {
      const daysAhead = 365;
      mockPrismaService.enterpriseContract.findMany.mockResolvedValue([]);

      await service.checkExpiringContracts(daysAhead);

      expect(mockPrismaService.enterpriseContract.findMany).toHaveBeenCalled();
    });
  });
});
