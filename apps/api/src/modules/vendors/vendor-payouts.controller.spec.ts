import { Test, TestingModule } from '@nestjs/testing';
import { VendorPayoutsController, AdminPayoutsController } from './vendor-payouts.controller';
import { VendorPayoutsService } from './vendor-payouts.service';
import { VendorsService } from './vendors.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@prisma/client';

describe('VendorPayoutsController', () => {
  let controller: VendorPayoutsController;
  let payoutsService: VendorPayoutsService;
  let vendorsService: VendorsService;

  const mockPayoutsService = {
    getVendorPayouts: jest.fn(),
    getPayoutStats: jest.fn(),
    calculateVendorPayout: jest.fn(),
    getPayoutDetails: jest.fn(),
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

  const mockPayout = {
    id: 'payout-123',
    vendorProfileId: 'vendor-123',
    amount: 500,
    currency: 'USD',
    status: 'PENDING',
    method: 'PAYPAL',
    periodStart: new Date(),
    periodEnd: new Date(),
    netAmount: 500,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorPayoutsController],
      providers: [
        {
          provide: VendorPayoutsService,
          useValue: mockPayoutsService,
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

    controller = module.get<VendorPayoutsController>(VendorPayoutsController);
    payoutsService = module.get<VendorPayoutsService>(VendorPayoutsService);
    vendorsService = module.get<VendorsService>(VendorsService);

    jest.clearAllMocks();
    mockVendorsService.getVendorProfile.mockResolvedValue(mockVendorProfile);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyPayouts', () => {
    it('should return paginated payouts for vendor', async () => {
      const mockRequest = { user: mockUser };
      const payoutsResult = {
        data: [mockPayout],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockPayoutsService.getVendorPayouts.mockResolvedValue(payoutsResult);

      const result = await controller.getMyPayouts(mockRequest as any);

      expect(result).toEqual(payoutsResult);
      expect(mockVendorsService.getVendorProfile).toHaveBeenCalledWith('user-123');
      expect(mockPayoutsService.getVendorPayouts).toHaveBeenCalledWith(
        'vendor-123',
        1,
        10,
        undefined,
      );
    });

    it('should pass pagination and filter parameters', async () => {
      const mockRequest = { user: mockUser };

      mockPayoutsService.getVendorPayouts.mockResolvedValue({ data: [] });

      await controller.getMyPayouts(mockRequest as any, 2, 20, 'COMPLETED');

      expect(mockPayoutsService.getVendorPayouts).toHaveBeenCalledWith(
        'vendor-123',
        2,
        20,
        'COMPLETED',
      );
    });
  });

  describe('getMyPayoutStats', () => {
    it('should return payout statistics for vendor', async () => {
      const mockRequest = { user: mockUser };
      const statsResult = {
        pending: { count: 2, amount: 1000 },
        completed: { count: 10, amount: 5000 },
        failed: { count: 0, amount: 0 },
        totalPaid: 5000,
      };

      mockPayoutsService.getPayoutStats.mockResolvedValue(statsResult);

      const result = await controller.getMyPayoutStats(mockRequest as any);

      expect(result).toEqual(statsResult);
      expect(mockPayoutsService.getPayoutStats).toHaveBeenCalledWith('vendor-123');
    });
  });

  describe('calculateMyPendingPayout', () => {
    it('should calculate pending payout for current month by default', async () => {
      const mockRequest = { user: mockUser };
      const calcResult = {
        vendorId: 'vendor-123',
        netAmount: 500,
        orderCount: 10,
      };

      mockPayoutsService.calculateVendorPayout.mockResolvedValue(calcResult);

      const result = await controller.calculateMyPendingPayout(mockRequest as any);

      expect(result).toEqual(calcResult);
      expect(mockPayoutsService.calculateVendorPayout).toHaveBeenCalledWith(
        'vendor-123',
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('should use custom date range when provided', async () => {
      const mockRequest = { user: mockUser };

      mockPayoutsService.calculateVendorPayout.mockResolvedValue({});

      await controller.calculateMyPendingPayout(
        mockRequest as any,
        '2024-01-01',
        '2024-01-31',
      );

      expect(mockPayoutsService.calculateVendorPayout).toHaveBeenCalledWith(
        'vendor-123',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );
    });
  });

  describe('getPayoutDetails', () => {
    it('should return payout details', async () => {
      const mockRequest = { user: mockUser };

      mockPayoutsService.getPayoutDetails.mockResolvedValue(mockPayout);

      const result = await controller.getPayoutDetails(mockRequest as any, 'payout-123');

      expect(result).toEqual(mockPayout);
      expect(mockPayoutsService.getPayoutDetails).toHaveBeenCalledWith('payout-123');
    });
  });
});

describe('AdminPayoutsController', () => {
  let controller: AdminPayoutsController;
  let payoutsService: VendorPayoutsService;

  const mockPayoutsService = {
    getAllPayouts: jest.fn(),
    getPayoutStats: jest.fn(),
    calculatePendingPayouts: jest.fn(),
    createPayout: jest.fn(),
    processPayout: jest.fn(),
    getPayoutDetails: jest.fn(),
    generateMonthlyPayouts: jest.fn(),
  };

  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPayoutsController],
      providers: [
        {
          provide: VendorPayoutsService,
          useValue: mockPayoutsService,
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

    controller = module.get<AdminPayoutsController>(AdminPayoutsController);
    payoutsService = module.get<VendorPayoutsService>(VendorPayoutsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllPayouts', () => {
    it('should return all payouts with pagination', async () => {
      const payoutsResult = {
        data: [{ id: 'payout-1' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockPayoutsService.getAllPayouts.mockResolvedValue(payoutsResult);

      const result = await controller.getAllPayouts();

      expect(result).toEqual(payoutsResult);
      expect(mockPayoutsService.getAllPayouts).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
      );
    });

    it('should pass all filter parameters', async () => {
      mockPayoutsService.getAllPayouts.mockResolvedValue({ data: [] });

      await controller.getAllPayouts(2, 20, 'PENDING', 'vendor-123');

      expect(mockPayoutsService.getAllPayouts).toHaveBeenCalledWith(
        2,
        20,
        'PENDING',
        'vendor-123',
      );
    });
  });

  describe('getOverallStats', () => {
    it('should return overall payout statistics', async () => {
      const statsResult = {
        pending: { count: 10, amount: 5000 },
        completed: { count: 100, amount: 50000 },
        failed: { count: 2, amount: 500 },
        totalPaid: 50000,
      };

      mockPayoutsService.getPayoutStats.mockResolvedValue(statsResult);

      const result = await controller.getOverallStats();

      expect(result).toEqual(statsResult);
      expect(mockPayoutsService.getPayoutStats).toHaveBeenCalledWith();
    });
  });

  describe('calculatePendingPayouts', () => {
    it('should calculate pending payouts for all vendors', async () => {
      const dto = {
        periodStart: '2024-01-01',
        periodEnd: '2024-01-31',
      };
      const pendingPayouts = [
        { vendorId: 'v1', netAmount: 500 },
        { vendorId: 'v2', netAmount: 750 },
      ];

      mockPayoutsService.calculatePendingPayouts.mockResolvedValue(pendingPayouts);

      const result = await controller.calculatePendingPayouts(dto);

      expect(result).toEqual(pendingPayouts);
      expect(mockPayoutsService.calculatePendingPayouts).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );
    });
  });

  describe('createPayout', () => {
    it('should create a payout for vendor', async () => {
      const mockRequest = { user: mockAdminUser };
      const dto = {
        vendorId: 'vendor-123',
        periodStart: '2024-01-01',
        periodEnd: '2024-01-31',
      };
      const createdPayout = {
        id: 'payout-new',
        vendorId: 'vendor-123',
        amount: 500,
      };

      mockPayoutsService.createPayout.mockResolvedValue(createdPayout);

      const result = await controller.createPayout(mockRequest as any, dto);

      expect(result).toEqual(createdPayout);
      expect(mockPayoutsService.createPayout).toHaveBeenCalledWith(
        'vendor-123',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        'admin-123',
      );
    });
  });

  describe('processPayout', () => {
    it('should process a pending payout', async () => {
      const mockRequest = { user: mockAdminUser };
      const processedPayout = {
        id: 'payout-123',
        status: 'COMPLETED',
        transactionId: 'TXN-123',
      };

      mockPayoutsService.processPayout.mockResolvedValue(processedPayout);

      const result = await controller.processPayout(mockRequest as any, 'payout-123');

      expect(result).toEqual(processedPayout);
      expect(mockPayoutsService.processPayout).toHaveBeenCalledWith('payout-123', 'admin-123');
    });
  });

  describe('getPayoutDetails', () => {
    it('should return payout details', async () => {
      const payoutDetails = {
        id: 'payout-123',
        amount: 500,
        status: 'PENDING',
      };

      mockPayoutsService.getPayoutDetails.mockResolvedValue(payoutDetails);

      const result = await controller.getPayoutDetails('payout-123');

      expect(result).toEqual(payoutDetails);
      expect(mockPayoutsService.getPayoutDetails).toHaveBeenCalledWith('payout-123');
    });
  });

  describe('generateMonthlyPayouts', () => {
    it('should trigger monthly payout generation', async () => {
      mockPayoutsService.generateMonthlyPayouts.mockResolvedValue(undefined);

      const result = await controller.generateMonthlyPayouts();

      expect(result).toEqual({ message: 'Monthly payout generation completed' });
      expect(mockPayoutsService.generateMonthlyPayouts).toHaveBeenCalled();
    });
  });
});
