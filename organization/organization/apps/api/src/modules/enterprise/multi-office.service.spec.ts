import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MultiOfficeService, Office, OfficeApprovalRule } from './multi-office.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('MultiOfficeService', () => {
  let service: MultiOfficeService;
  let prisma: PrismaService;

  const mockPrismaService = {
    organization: {
      findUnique: jest.fn(),
    },
    office: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    officeTransfer: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    expense: {
      aggregate: jest.fn(),
    },
    purchase: {
      aggregate: jest.fn(),
    },
    order: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    inventory: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiOfficeService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MultiOfficeService>(MultiOfficeService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOffice', () => {
    const mockOfficeData: Omit<Office, 'id'> = {
      organizationId: 'org-123',
      name: 'New York Office',
      code: 'NYC-001',
      type: 'REGIONAL',
      address: { street: '123 Broadway', city: 'New York', state: 'NY' },
      contactInfo: { phone: '555-1234', email: 'nyc@company.com' },
      operatingHours: { monday: '9am-5pm' },
      isActive: true,
    };

    it('should create office successfully', async () => {
      const mockOrg = { id: 'org-123', name: 'Test Organization' };
      const mockOffice = {
        id: 'office-001',
        ...mockOfficeData,
        createdAt: new Date(),
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.office.findFirst.mockResolvedValue(null);
      mockPrismaService.office.create.mockResolvedValue(mockOffice);

      const result = await service.createOffice(mockOfficeData);

      expect(result).toEqual(mockOffice);
      expect(mockPrismaService.organization.findUnique).toHaveBeenCalledWith({
        where: { id: mockOfficeData.organizationId },
      });
      expect(mockPrismaService.office.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: mockOfficeData.organizationId,
          name: mockOfficeData.name,
          code: mockOfficeData.code,
          type: mockOfficeData.type,
        }),
      });
    });

    it('should throw NotFoundException when organization does not exist', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.createOffice(mockOfficeData)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createOffice(mockOfficeData)).rejects.toThrow(
        'Organization not found',
      );
    });

    it('should throw BadRequestException when office code already exists', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({ id: 'org-123' });
      mockPrismaService.office.findFirst.mockResolvedValue({ id: 'existing-office' });

      await expect(service.createOffice(mockOfficeData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createOffice(mockOfficeData)).rejects.toThrow(
        'Office code already exists',
      );
    });

    it('should default isActive to true when not provided', async () => {
      const dataWithoutIsActive = {
        ...mockOfficeData,
        isActive: undefined as any,
      };

      mockPrismaService.organization.findUnique.mockResolvedValue({ id: 'org-123' });
      mockPrismaService.office.findFirst.mockResolvedValue(null);
      mockPrismaService.office.create.mockResolvedValue({
        id: 'office-001',
        ...dataWithoutIsActive,
        isActive: true,
      });

      await service.createOffice(dataWithoutIsActive);

      expect(mockPrismaService.office.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isActive: true,
        }),
      });
    });

    it('should handle different office types', async () => {
      const officeTypes: Office['type'][] = ['HEADQUARTERS', 'REGIONAL', 'BRANCH', 'WAREHOUSE'];

      for (const type of officeTypes) {
        const data = { ...mockOfficeData, type, code: `${type}-001` };
        mockPrismaService.organization.findUnique.mockResolvedValue({ id: 'org-123' });
        mockPrismaService.office.findFirst.mockResolvedValue(null);
        mockPrismaService.office.create.mockResolvedValue({ id: `office-${type}`, ...data });

        const result = await service.createOffice(data);

        expect(result.type).toBe(type);
      }
    });
  });

  describe('getOffices', () => {
    const mockOffices = [
      {
        id: 'office-1',
        organizationId: 'org-123',
        name: 'Headquarters',
        type: 'HEADQUARTERS',
        isActive: true,
      },
      {
        id: 'office-2',
        organizationId: 'org-123',
        name: 'Regional Office',
        type: 'REGIONAL',
        isActive: true,
      },
    ];

    it('should return all offices for organization', async () => {
      mockPrismaService.office.findMany.mockResolvedValue(mockOffices);

      const result = await service.getOffices('org-123');

      expect(result).toEqual(mockOffices);
      expect(mockPrismaService.office.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-123' },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      });
    });

    it('should filter by type', async () => {
      mockPrismaService.office.findMany.mockResolvedValue([mockOffices[0]]);

      const result = await service.getOffices('org-123', { type: 'HEADQUARTERS' });

      expect(result).toHaveLength(1);
      expect(mockPrismaService.office.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-123',
          type: 'HEADQUARTERS',
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      });
    });

    it('should filter by isActive', async () => {
      mockPrismaService.office.findMany.mockResolvedValue(mockOffices);

      const result = await service.getOffices('org-123', { isActive: true });

      expect(result).toEqual(mockOffices);
      expect(mockPrismaService.office.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-123',
          isActive: true,
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      });
    });

    it('should filter inactive offices', async () => {
      mockPrismaService.office.findMany.mockResolvedValue([]);

      const result = await service.getOffices('org-123', { isActive: false });

      expect(mockPrismaService.office.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-123',
          isActive: false,
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      });
    });

    it('should return empty array when no offices found', async () => {
      mockPrismaService.office.findMany.mockResolvedValue([]);

      const result = await service.getOffices('org-123');

      expect(result).toEqual([]);
    });
  });

  describe('getOfficeById', () => {
    const mockOffice = {
      id: 'office-001',
      organizationId: 'org-123',
      name: 'New York Office',
      type: 'REGIONAL',
      organization: { id: 'org-123', name: 'Test Organization' },
    };

    it('should return office with organization details', async () => {
      mockPrismaService.office.findUnique.mockResolvedValue(mockOffice);

      const result = await service.getOfficeById('office-001');

      expect(result).toEqual(mockOffice);
      expect(mockPrismaService.office.findUnique).toHaveBeenCalledWith({
        where: { id: 'office-001' },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when office not found', async () => {
      mockPrismaService.office.findUnique.mockResolvedValue(null);

      await expect(service.getOfficeById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getOfficeById('nonexistent')).rejects.toThrow(
        'Office nonexistent not found',
      );
    });
  });

  describe('updateOffice', () => {
    const mockOffice = {
      id: 'office-001',
      organizationId: 'org-123',
      name: 'Old Name',
      type: 'REGIONAL',
      isActive: true,
      organization: { id: 'org-123', name: 'Test Organization' },
    };

    it('should update office successfully', async () => {
      const updates = { name: 'New Name', type: 'BRANCH' as const };
      const updatedOffice = { ...mockOffice, ...updates };

      mockPrismaService.office.findUnique.mockResolvedValue(mockOffice);
      mockPrismaService.office.update.mockResolvedValue(updatedOffice);

      const result = await service.updateOffice('office-001', updates);

      expect(result.name).toBe('New Name');
      expect(mockPrismaService.office.update).toHaveBeenCalledWith({
        where: { id: 'office-001' },
        data: expect.objectContaining({
          name: 'New Name',
          type: 'BRANCH',
        }),
      });
    });

    it('should throw NotFoundException when office not found', async () => {
      mockPrismaService.office.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOffice('nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update address information', async () => {
      const newAddress = { street: '456 Park Ave', city: 'New York' };

      mockPrismaService.office.findUnique.mockResolvedValue(mockOffice);
      mockPrismaService.office.update.mockResolvedValue({
        ...mockOffice,
        address: newAddress,
      });

      await service.updateOffice('office-001', { address: newAddress });

      expect(mockPrismaService.office.update).toHaveBeenCalledWith({
        where: { id: 'office-001' },
        data: expect.objectContaining({
          address: newAddress,
        }),
      });
    });

    it('should deactivate office', async () => {
      mockPrismaService.office.findUnique.mockResolvedValue(mockOffice);
      mockPrismaService.office.update.mockResolvedValue({
        ...mockOffice,
        isActive: false,
      });

      await service.updateOffice('office-001', { isActive: false });

      expect(mockPrismaService.office.update).toHaveBeenCalledWith({
        where: { id: 'office-001' },
        data: expect.objectContaining({
          isActive: false,
        }),
      });
    });
  });

  describe('setApprovalRules', () => {
    const mockOffice = {
      id: 'office-001',
      organizationId: 'org-123',
      organization: { id: 'org-123', name: 'Test Organization' },
    };

    const mockRules: OfficeApprovalRule[] = [
      {
        officeId: 'office-001',
        approvalType: 'PURCHASE',
        minAmount: 0,
        maxAmount: 1000,
        approvers: ['manager-1'],
        requiresMultipleApprovals: false,
      },
      {
        officeId: 'office-001',
        approvalType: 'PURCHASE',
        minAmount: 1000,
        maxAmount: 10000,
        approvers: ['manager-1', 'director-1'],
        requiresMultipleApprovals: true,
      },
    ];

    it('should set approval rules successfully', async () => {
      mockPrismaService.office.findUnique.mockResolvedValue(mockOffice);
      mockPrismaService.office.update.mockResolvedValue({
        ...mockOffice,
        approvalRules: mockRules,
      });

      const result = await service.setApprovalRules('office-001', mockRules);

      expect(result.success).toBe(true);
      expect(mockPrismaService.office.update).toHaveBeenCalledWith({
        where: { id: 'office-001' },
        data: {
          approvalRules: mockRules,
        },
      });
    });

    it('should throw NotFoundException when office not found', async () => {
      mockPrismaService.office.findUnique.mockResolvedValue(null);

      await expect(
        service.setApprovalRules('nonexistent', mockRules),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getApprovalRequirements', () => {
    const mockOfficeWithRules = {
      id: 'office-001',
      organizationId: 'org-123',
      approvalRules: [
        {
          approvalType: 'PURCHASE',
          minAmount: 0,
          maxAmount: 1000,
          approvers: ['manager-1'],
          requiresMultipleApprovals: false,
        },
        {
          approvalType: 'PURCHASE',
          minAmount: 1000,
          maxAmount: 10000,
          approvers: ['manager-1', 'director-1'],
          requiresMultipleApprovals: true,
        },
        {
          approvalType: 'EXPENSE',
          minAmount: 0,
          maxAmount: 500,
          approvers: ['supervisor-1'],
          requiresMultipleApprovals: false,
        },
      ],
      organization: { id: 'org-123', name: 'Test Organization' },
    };

    it('should return approval requirements for matching rule', async () => {
      mockPrismaService.office.findUnique.mockResolvedValue(mockOfficeWithRules);

      const result = await service.getApprovalRequirements({
        officeId: 'office-001',
        type: 'PURCHASE',
        amount: 500,
      });

      expect(result).toEqual({
        requiresApproval: true,
        approvers: ['manager-1'],
        requiresMultiple: false,
      });
    });

    it('should return higher threshold rule for larger amounts', async () => {
      mockPrismaService.office.findUnique.mockResolvedValue(mockOfficeWithRules);

      const result = await service.getApprovalRequirements({
        officeId: 'office-001',
        type: 'PURCHASE',
        amount: 5000,
      });

      expect(result).toEqual({
        requiresApproval: true,
        approvers: ['manager-1', 'director-1'],
        requiresMultiple: true,
      });
    });

    it('should return no approval required when no matching rule', async () => {
      mockPrismaService.office.findUnique.mockResolvedValue(mockOfficeWithRules);

      const result = await service.getApprovalRequirements({
        officeId: 'office-001',
        type: 'CONTRACT',
        amount: 5000,
      });

      expect(result).toEqual({
        requiresApproval: false,
        approvers: [],
      });
    });

    it('should return no approval for amounts exceeding all rules', async () => {
      mockPrismaService.office.findUnique.mockResolvedValue(mockOfficeWithRules);

      const result = await service.getApprovalRequirements({
        officeId: 'office-001',
        type: 'PURCHASE',
        amount: 50000, // Above all defined rules
      });

      expect(result).toEqual({
        requiresApproval: false,
        approvers: [],
      });
    });

    it('should handle office with no approval rules', async () => {
      const officeWithoutRules = {
        ...mockOfficeWithRules,
        approvalRules: null,
      };
      mockPrismaService.office.findUnique.mockResolvedValue(officeWithoutRules);

      const result = await service.getApprovalRequirements({
        officeId: 'office-001',
        type: 'PURCHASE',
        amount: 500,
      });

      expect(result).toEqual({
        requiresApproval: false,
        approvers: [],
      });
    });
  });

  describe('createTransfer', () => {
    const mockTransferData = {
      fromOfficeId: 'office-001',
      toOfficeId: 'office-002',
      items: [
        { productId: 'product-1', quantity: 10 },
        { productId: 'product-2', quantity: 5 },
      ],
      requestedBy: 'user-001',
      reason: 'Stock rebalancing',
    };

    const mockOffice1 = {
      id: 'office-001',
      organization: { id: 'org-123', name: 'Test Organization' },
    };

    const mockOffice2 = {
      id: 'office-002',
      organization: { id: 'org-123', name: 'Test Organization' },
    };

    it('should create transfer successfully', async () => {
      const mockTransfer = {
        id: 'transfer-001',
        ...mockTransferData,
        status: 'PENDING',
        createdAt: new Date(),
      };

      mockPrismaService.office.findUnique
        .mockResolvedValueOnce(mockOffice1)
        .mockResolvedValueOnce(mockOffice2);
      mockPrismaService.officeTransfer.create.mockResolvedValue(mockTransfer);

      const result = await service.createTransfer(mockTransferData);

      expect(result).toEqual(mockTransfer);
      expect(mockPrismaService.officeTransfer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fromOfficeId: mockTransferData.fromOfficeId,
          toOfficeId: mockTransferData.toOfficeId,
          status: 'PENDING',
        }),
      });
    });

    it('should throw NotFoundException when source office not found', async () => {
      mockPrismaService.office.findUnique.mockResolvedValueOnce(null);

      await expect(service.createTransfer(mockTransferData)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when destination office not found', async () => {
      mockPrismaService.office.findUnique
        .mockResolvedValueOnce(mockOffice1)
        .mockResolvedValueOnce(null);

      await expect(service.createTransfer(mockTransferData)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when transferring to same office', async () => {
      const sameOfficeTransfer = {
        ...mockTransferData,
        toOfficeId: 'office-001',
      };

      mockPrismaService.office.findUnique
        .mockResolvedValueOnce(mockOffice1)
        .mockResolvedValueOnce(mockOffice1);

      await expect(service.createTransfer(sameOfficeTransfer)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createTransfer(sameOfficeTransfer)).rejects.toThrow(
        'Cannot transfer to same office',
      );
    });
  });

  describe('approveTransfer', () => {
    const mockTransfer = {
      id: 'transfer-001',
      fromOfficeId: 'office-001',
      toOfficeId: 'office-002',
      status: 'PENDING',
      items: [{ productId: 'product-1', quantity: 10 }],
    };

    it('should approve transfer successfully', async () => {
      mockPrismaService.officeTransfer.findUnique.mockResolvedValue(mockTransfer);
      mockPrismaService.officeTransfer.update.mockResolvedValue({
        ...mockTransfer,
        status: 'IN_TRANSIT',
        approvedBy: 'manager-001',
        approvedAt: new Date(),
      });

      const result = await service.approveTransfer('transfer-001', 'manager-001');

      expect(result.success).toBe(true);
      expect(mockPrismaService.officeTransfer.update).toHaveBeenCalledWith({
        where: { id: 'transfer-001' },
        data: expect.objectContaining({
          status: 'IN_TRANSIT',
          approvedBy: 'manager-001',
        }),
      });
    });

    it('should throw NotFoundException when transfer not found', async () => {
      mockPrismaService.officeTransfer.findUnique.mockResolvedValue(null);

      await expect(
        service.approveTransfer('nonexistent', 'manager-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when transfer not pending', async () => {
      const approvedTransfer = { ...mockTransfer, status: 'IN_TRANSIT' };
      mockPrismaService.officeTransfer.findUnique.mockResolvedValue(approvedTransfer);

      await expect(
        service.approveTransfer('transfer-001', 'manager-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeTransfer', () => {
    const mockTransfer = {
      id: 'transfer-001',
      fromOfficeId: 'office-001',
      toOfficeId: 'office-002',
      status: 'IN_TRANSIT',
      items: [{ productId: 'product-1', quantity: 10 }],
    };

    it('should complete transfer successfully', async () => {
      mockPrismaService.officeTransfer.findUnique.mockResolvedValue(mockTransfer);
      mockPrismaService.officeTransfer.update.mockResolvedValue({
        ...mockTransfer,
        status: 'DELIVERED',
        receivedBy: 'receiver-001',
        deliveredAt: new Date(),
      });
      mockPrismaService.inventory.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.inventory.upsert.mockResolvedValue({});

      const result = await service.completeTransfer('transfer-001', 'receiver-001');

      expect(result.success).toBe(true);
      expect(mockPrismaService.officeTransfer.update).toHaveBeenCalledWith({
        where: { id: 'transfer-001' },
        data: expect.objectContaining({
          status: 'DELIVERED',
          receivedBy: 'receiver-001',
        }),
      });
    });

    it('should throw NotFoundException when transfer not found', async () => {
      mockPrismaService.officeTransfer.findUnique.mockResolvedValue(null);

      await expect(
        service.completeTransfer('nonexistent', 'receiver-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when transfer not in transit', async () => {
      const pendingTransfer = { ...mockTransfer, status: 'PENDING' };
      mockPrismaService.officeTransfer.findUnique.mockResolvedValue(pendingTransfer);

      await expect(
        service.completeTransfer('transfer-001', 'receiver-001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update inventory for both offices', async () => {
      const transferWithItems = {
        ...mockTransfer,
        items: [
          { productId: 'product-1', quantity: 10 },
          { productId: 'product-2', quantity: 5 },
        ],
      };

      mockPrismaService.officeTransfer.findUnique.mockResolvedValue(transferWithItems);
      mockPrismaService.officeTransfer.update.mockResolvedValue({
        ...transferWithItems,
        status: 'DELIVERED',
      });
      mockPrismaService.inventory.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.inventory.upsert.mockResolvedValue({});

      await service.completeTransfer('transfer-001', 'receiver-001');

      expect(mockPrismaService.inventory.updateMany).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.inventory.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('getOfficeBudget', () => {
    const mockPeriod = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
    };

    const mockOffice = {
      id: 'office-001',
      organization: { id: 'org-123', name: 'Test Organization' },
    };

    it('should return budget summary', async () => {
      mockPrismaService.office.findUnique.mockResolvedValue(mockOffice);
      mockPrismaService.expense.aggregate.mockResolvedValue({
        _sum: { amount: 50000 },
      });
      mockPrismaService.purchase.aggregate.mockResolvedValue({
        _sum: { total: 100000 },
      });

      const result = await service.getOfficeBudget('office-001', mockPeriod);

      expect(result).toEqual({
        officeId: 'office-001',
        period: mockPeriod,
        totalExpenses: 50000,
        totalPurchases: 100000,
        totalSpend: 150000,
      });
    });

    it('should throw NotFoundException when office not found', async () => {
      mockPrismaService.office.findUnique.mockResolvedValue(null);

      await expect(
        service.getOfficeBudget('nonexistent', mockPeriod),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle zero expenses and purchases', async () => {
      mockPrismaService.office.findUnique.mockResolvedValue(mockOffice);
      mockPrismaService.expense.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      mockPrismaService.purchase.aggregate.mockResolvedValue({
        _sum: { total: null },
      });

      const result = await service.getOfficeBudget('office-001', mockPeriod);

      expect(result).toEqual({
        officeId: 'office-001',
        period: mockPeriod,
        totalExpenses: 0,
        totalPurchases: 0,
        totalSpend: 0,
      });
    });
  });

  describe('getOfficeMetrics', () => {
    const mockPeriod = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
    };

    const mockOffice = {
      id: 'office-001',
      organization: { id: 'org-123', name: 'Test Organization' },
    };

    it('should return office performance metrics', async () => {
      mockPrismaService.office.findUnique.mockResolvedValue(mockOffice);
      mockPrismaService.order.count.mockResolvedValue(100);
      mockPrismaService.order.aggregate.mockResolvedValue({
        _sum: { total: 500000 },
      });

      const result = await service.getOfficeMetrics('office-001', mockPeriod);

      expect(result).toEqual({
        officeId: 'office-001',
        period: mockPeriod,
        totalOrders: 100,
        totalRevenue: 500000,
        averageOrderValue: 5000,
      });
    });

    it('should throw NotFoundException when office not found', async () => {
      mockPrismaService.office.findUnique.mockResolvedValue(null);

      await expect(
        service.getOfficeMetrics('nonexistent', mockPeriod),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle zero orders', async () => {
      mockPrismaService.office.findUnique.mockResolvedValue(mockOffice);
      mockPrismaService.order.count.mockResolvedValue(0);
      mockPrismaService.order.aggregate.mockResolvedValue({
        _sum: { total: null },
      });

      const result = await service.getOfficeMetrics('office-001', mockPeriod);

      expect(result).toEqual({
        officeId: 'office-001',
        period: mockPeriod,
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
      });
    });
  });

  describe('consolidateInventory', () => {
    const mockOffices = [
      { id: 'office-001', name: 'Office 1' },
      { id: 'office-002', name: 'Office 2' },
    ];

    it('should consolidate inventory across all offices', async () => {
      mockPrismaService.office.findMany.mockResolvedValue(mockOffices);
      mockPrismaService.inventory.findMany
        .mockResolvedValueOnce([
          { productId: 'product-1', quantity: 50 },
          { productId: 'product-2', quantity: 30 },
        ])
        .mockResolvedValueOnce([
          { productId: 'product-1', quantity: 30 },
          { productId: 'product-3', quantity: 20 },
        ]);

      const result = await service.consolidateInventory('org-123');

      expect(result.organizationId).toBe('org-123');
      expect(result.totalProducts).toBe(3);
      expect(result.inventory).toHaveLength(3);

      const product1 = result.inventory.find((i: any) => i.productId === 'product-1');
      expect(product1.totalQuantity).toBe(80);
      expect(product1.offices).toHaveLength(2);
    });

    it('should return empty inventory when no offices', async () => {
      mockPrismaService.office.findMany.mockResolvedValue([]);

      const result = await service.consolidateInventory('org-123');

      expect(result).toEqual({
        organizationId: 'org-123',
        totalProducts: 0,
        inventory: [],
      });
    });

    it('should handle offices with no inventory', async () => {
      mockPrismaService.office.findMany.mockResolvedValue(mockOffices);
      mockPrismaService.inventory.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.consolidateInventory('org-123');

      expect(result).toEqual({
        organizationId: 'org-123',
        totalProducts: 0,
        inventory: [],
      });
    });
  });
});
