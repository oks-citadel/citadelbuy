import { Test, TestingModule } from '@nestjs/testing';
import { VendorCommissionsController, AdminCommissionsController } from './vendor-commissions.controller';
import { VendorCommissionsService } from './vendor-commissions.service';
import { VendorsService } from './vendors.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@prisma/client';

describe('VendorCommissionsController', () => {
  let controller: VendorCommissionsController;
  let commissionsService: VendorCommissionsService;
  let vendorsService: VendorsService;

  const mockCommissionsService = {
    getCommissionRules: jest.fn(),
    getCommissionRule: jest.fn(),
    createCommissionRule: jest.fn(),
    updateCommissionRule: jest.fn(),
    deleteCommissionRule: jest.fn(),
    calculateCommissionForOrder: jest.fn(),
    getCommissionSummary: jest.fn(),
  };

  const mockVendorsService = {
    getVendorProfile: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'vendor@example.com',
    role: UserRole.VENDOR,
  };

  const mockVendorProfile = {
    id: 'vendor-123',
    userId: 'user-123',
    businessName: 'Test Business',
  };

  const mockCommissionRule = {
    id: 'rule-123',
    vendorProfileId: 'vendor-123',
    name: 'Electronics Commission',
    commissionRate: 12.5,
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorCommissionsController],
      providers: [
        {
          provide: VendorCommissionsService,
          useValue: mockCommissionsService,
        },
        {
          provide: VendorsService,
          useValue: mockVendorsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockUser;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<VendorCommissionsController>(VendorCommissionsController);
    commissionsService = module.get<VendorCommissionsService>(VendorCommissionsService);
    vendorsService = module.get<VendorsService>(VendorsService);

    jest.clearAllMocks();
    mockVendorsService.getVendorProfile.mockResolvedValue(mockVendorProfile);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyRules', () => {
    it('should return commission rules for vendor', async () => {
      const mockRequest = { user: mockUser };
      const mockRules = [mockCommissionRule];

      mockCommissionsService.getCommissionRules.mockResolvedValue(mockRules);

      const result = await controller.getMyRules(mockRequest as any);

      expect(result).toEqual(mockRules);
      expect(mockVendorsService.getVendorProfile).toHaveBeenCalledWith('user-123');
      expect(mockCommissionsService.getCommissionRules).toHaveBeenCalledWith('vendor-123', false);
    });

    it('should include inactive rules when requested', async () => {
      const mockRequest = { user: mockUser };

      mockCommissionsService.getCommissionRules.mockResolvedValue([]);

      await controller.getMyRules(mockRequest as any, true);

      expect(mockCommissionsService.getCommissionRules).toHaveBeenCalledWith('vendor-123', true);
    });

    it('should handle string "true" for includeInactive', async () => {
      const mockRequest = { user: mockUser };

      mockCommissionsService.getCommissionRules.mockResolvedValue([]);

      await controller.getMyRules(mockRequest as any, 'true' as any);

      expect(mockCommissionsService.getCommissionRules).toHaveBeenCalledWith('vendor-123', true);
    });
  });

  describe('getRule', () => {
    it('should return a specific commission rule', async () => {
      const mockRequest = { user: mockUser };

      mockCommissionsService.getCommissionRule.mockResolvedValue(mockCommissionRule);

      const result = await controller.getRule(mockRequest as any, 'rule-123');

      expect(result).toEqual(mockCommissionRule);
      expect(mockCommissionsService.getCommissionRule).toHaveBeenCalledWith('vendor-123', 'rule-123');
    });
  });

  describe('createRule', () => {
    const createDto = {
      name: 'New Rule',
      commissionRate: 10,
      categoryId: 'cat-123',
      isActive: true,
    };

    it('should create a new commission rule', async () => {
      const mockRequest = { user: mockUser };
      const createdRule = { ...mockCommissionRule, ...createDto };

      mockCommissionsService.createCommissionRule.mockResolvedValue(createdRule);

      const result = await controller.createRule(mockRequest as any, createDto as any);

      expect(result).toEqual(createdRule);
      expect(mockCommissionsService.createCommissionRule).toHaveBeenCalledWith('vendor-123', createDto);
    });
  });

  describe('updateRule', () => {
    const updateDto = {
      name: 'Updated Rule',
      commissionRate: 15,
    };

    it('should update a commission rule', async () => {
      const mockRequest = { user: mockUser };
      const updatedRule = { ...mockCommissionRule, ...updateDto };

      mockCommissionsService.updateCommissionRule.mockResolvedValue(updatedRule);

      const result = await controller.updateRule(mockRequest as any, 'rule-123', updateDto as any);

      expect(result).toEqual(updatedRule);
      expect(mockCommissionsService.updateCommissionRule).toHaveBeenCalledWith(
        'vendor-123',
        'rule-123',
        updateDto,
      );
    });
  });

  describe('deleteRule', () => {
    it('should delete a commission rule', async () => {
      const mockRequest = { user: mockUser };
      const deleteResult = { success: true, message: 'Commission rule deleted successfully' };

      mockCommissionsService.deleteCommissionRule.mockResolvedValue(deleteResult);

      const result = await controller.deleteRule(mockRequest as any, 'rule-123');

      expect(result).toEqual(deleteResult);
      expect(mockCommissionsService.deleteCommissionRule).toHaveBeenCalledWith('vendor-123', 'rule-123');
    });
  });

  describe('calculateCommission', () => {
    it('should calculate commission for order amount', async () => {
      const mockRequest = { user: mockUser };
      const dto = { orderAmount: 100, categoryId: 'cat-123' };
      const calcResult = {
        ruleId: 'rule-123',
        ruleName: 'Electronics Commission',
        commissionRate: 12.5,
        commissionAmount: 12.5,
        orderAmount: 100,
      };

      mockCommissionsService.calculateCommissionForOrder.mockResolvedValue(calcResult);

      const result = await controller.calculateCommission(mockRequest as any, dto);

      expect(result).toEqual(calcResult);
      expect(mockCommissionsService.calculateCommissionForOrder).toHaveBeenCalledWith(
        'vendor-123',
        100,
        'cat-123',
      );
    });

    it('should calculate without category', async () => {
      const mockRequest = { user: mockUser };
      const dto = { orderAmount: 200 };

      mockCommissionsService.calculateCommissionForOrder.mockResolvedValue({});

      await controller.calculateCommission(mockRequest as any, dto);

      expect(mockCommissionsService.calculateCommissionForOrder).toHaveBeenCalledWith(
        'vendor-123',
        200,
        undefined,
      );
    });
  });

  describe('getCommissionSummary', () => {
    it('should return commission summary for period', async () => {
      const mockRequest = { user: mockUser };
      const summaryResult = {
        periodStart: expect.any(Date),
        periodEnd: expect.any(Date),
        totalOrders: 10,
        totalOrderValue: 1000,
        totalCommission: 150,
        netEarnings: 850,
      };

      mockCommissionsService.getCommissionSummary.mockResolvedValue(summaryResult);

      const result = await controller.getCommissionSummary(mockRequest as any);

      expect(result).toEqual(summaryResult);
      expect(mockCommissionsService.getCommissionSummary).toHaveBeenCalledWith(
        'vendor-123',
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('should use custom date range when provided', async () => {
      const mockRequest = { user: mockUser };

      mockCommissionsService.getCommissionSummary.mockResolvedValue({});

      await controller.getCommissionSummary(
        mockRequest as any,
        '2024-01-01',
        '2024-01-31',
      );

      expect(mockCommissionsService.getCommissionSummary).toHaveBeenCalledWith(
        'vendor-123',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );
    });
  });
});

describe('AdminCommissionsController', () => {
  let controller: AdminCommissionsController;
  let commissionsService: VendorCommissionsService;

  const mockCommissionsService = {
    getAllCommissionRules: jest.fn(),
    getCommissionStats: jest.fn(),
    getCommissionRules: jest.fn(),
    getCommissionSummary: jest.fn(),
  };

  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminCommissionsController],
      providers: [
        {
          provide: VendorCommissionsService,
          useValue: mockCommissionsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockAdminUser;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<AdminCommissionsController>(AdminCommissionsController);
    commissionsService = module.get<VendorCommissionsService>(VendorCommissionsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllRules', () => {
    it('should return all commission rules with pagination', async () => {
      const rulesResult = {
        data: [{ id: 'rule-1' }, { id: 'rule-2' }],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockCommissionsService.getAllCommissionRules.mockResolvedValue(rulesResult);

      const result = await controller.getAllRules();

      expect(result).toEqual(rulesResult);
      expect(mockCommissionsService.getAllCommissionRules).toHaveBeenCalledWith(1, 20, undefined);
    });

    it('should pass pagination and filter parameters', async () => {
      mockCommissionsService.getAllCommissionRules.mockResolvedValue({ data: [] });

      await controller.getAllRules(2, 10, 'vendor-123');

      expect(mockCommissionsService.getAllCommissionRules).toHaveBeenCalledWith(2, 10, 'vendor-123');
    });
  });

  describe('getStats', () => {
    it('should return overall commission statistics', async () => {
      const statsResult = {
        totalRules: 50,
        activeRules: 40,
        inactiveRules: 10,
        averageCommissionRate: 12.5,
      };

      mockCommissionsService.getCommissionStats.mockResolvedValue(statsResult);

      const result = await controller.getStats();

      expect(result).toEqual(statsResult);
      expect(mockCommissionsService.getCommissionStats).toHaveBeenCalledWith(undefined);
    });

    it('should filter stats by vendor', async () => {
      mockCommissionsService.getCommissionStats.mockResolvedValue({});

      await controller.getStats('vendor-123');

      expect(mockCommissionsService.getCommissionStats).toHaveBeenCalledWith('vendor-123');
    });
  });

  describe('getVendorRules', () => {
    it('should return rules for specific vendor', async () => {
      mockCommissionsService.getCommissionRules.mockResolvedValue([]);

      await controller.getVendorRules('vendor-123');

      expect(mockCommissionsService.getCommissionRules).toHaveBeenCalledWith('vendor-123', false);
    });

    it('should include inactive rules when requested', async () => {
      mockCommissionsService.getCommissionRules.mockResolvedValue([]);

      await controller.getVendorRules('vendor-123', true);

      expect(mockCommissionsService.getCommissionRules).toHaveBeenCalledWith('vendor-123', true);
    });
  });

  describe('getVendorSummary', () => {
    it('should return commission summary for vendor', async () => {
      const summaryResult = {
        periodStart: new Date(),
        periodEnd: new Date(),
        totalOrders: 5,
        totalCommission: 100,
      };

      mockCommissionsService.getCommissionSummary.mockResolvedValue(summaryResult);

      const result = await controller.getVendorSummary('vendor-123');

      expect(result).toEqual(summaryResult);
      expect(mockCommissionsService.getCommissionSummary).toHaveBeenCalledWith(
        'vendor-123',
        expect.any(Date),
        expect.any(Date),
      );
    });
  });
});
