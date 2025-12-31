import { Test, TestingModule } from '@nestjs/testing';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { VendorStatus, VendorApplicationStatus } from '@prisma/client';

describe('VendorsController', () => {
  let controller: VendorsController;
  let service: VendorsService;

  const mockVendorsService = {
    registerVendor: jest.fn(),
    getVendorProfile: jest.fn(),
    updateVendorProfile: jest.fn(),
    getVendorDashboard: jest.fn(),
    updateBankingInfo: jest.fn(),
    getPayouts: jest.fn(),
    getAllVendors: jest.fn(),
    approveVendorApplication: jest.fn(),
  };

  const mockUser = {
    userId: 'user-123',
    email: 'vendor@example.com',
    role: 'VENDOR',
  };

  const mockAdminUser = {
    userId: 'admin-123',
    email: 'admin@example.com',
    role: 'ADMIN',
  };

  const mockVendorProfile = {
    id: 'vendor-profile-123',
    userId: 'user-123',
    businessName: 'Test Business',
    businessType: 'LLC',
    status: VendorStatus.ACTIVE,
    isVerified: true,
    canSell: true,
    commissionRate: 15.0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorsController],
      providers: [
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

    controller = module.get<VendorsController>(VendorsController);
    service = module.get<VendorsService>(VendorsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const registrationDto = {
      businessName: 'New Business',
      businessType: 'LLC',
      taxId: 'TAX789',
      businessAddress: '456 New St',
      businessPhone: '555-5678',
      businessEmail: 'newbusiness@example.com',
    };

    it('should register a new vendor', async () => {
      const mockRequest = { user: mockUser };
      const expectedResult = {
        vendorProfile: { id: 'new-vendor', ...registrationDto },
        application: { id: 'new-app', status: VendorApplicationStatus.PENDING },
      };

      mockVendorsService.registerVendor.mockResolvedValue(expectedResult);

      const result = await controller.register(mockRequest as any, registrationDto as any);

      expect(result).toEqual(expectedResult);
      expect(mockVendorsService.registerVendor).toHaveBeenCalledWith('user-123', registrationDto);
    });

    it('should pass user id from request to service', async () => {
      const differentUser = { userId: 'user-456', email: 'other@example.com', role: 'CUSTOMER' };
      const mockRequest = { user: differentUser };

      mockVendorsService.registerVendor.mockResolvedValue({});

      await controller.register(mockRequest as any, registrationDto as any);

      expect(mockVendorsService.registerVendor).toHaveBeenCalledWith('user-456', registrationDto);
    });
  });

  describe('getProfile', () => {
    it('should return vendor profile for authenticated user', async () => {
      const mockRequest = { user: mockUser };

      mockVendorsService.getVendorProfile.mockResolvedValue(mockVendorProfile);

      const result = await controller.getProfile(mockRequest as any);

      expect(result).toEqual(mockVendorProfile);
      expect(mockVendorsService.getVendorProfile).toHaveBeenCalledWith('user-123');
    });

    it('should handle different user ids', async () => {
      const differentUser = { userId: 'user-456', email: 'other@example.com', role: 'VENDOR' };
      const mockRequest = { user: differentUser };

      mockVendorsService.getVendorProfile.mockResolvedValue(null);

      await controller.getProfile(mockRequest as any);

      expect(mockVendorsService.getVendorProfile).toHaveBeenCalledWith('user-456');
    });
  });

  describe('updateProfile', () => {
    const updateDto = {
      businessName: 'Updated Business',
      description: 'Updated description',
    };

    it('should update vendor profile', async () => {
      const mockRequest = { user: mockUser };
      const updatedProfile = { ...mockVendorProfile, ...updateDto };

      mockVendorsService.updateVendorProfile.mockResolvedValue(updatedProfile);

      const result = await controller.updateProfile(mockRequest as any, updateDto as any);

      expect(result).toEqual(updatedProfile);
      expect(mockVendorsService.updateVendorProfile).toHaveBeenCalledWith('user-123', updateDto);
    });
  });

  describe('getDashboard', () => {
    it('should return vendor dashboard metrics', async () => {
      const mockRequest = { user: mockUser };
      const dashboardData = {
        profile: {
          businessName: 'Test Business',
          status: VendorStatus.ACTIVE,
          isVerified: true,
          canSell: true,
          commissionRate: 15.0,
        },
        metrics: {
          totalRevenue: 10000,
          totalOrders: 100,
          totalProducts: 25,
          averageRating: 4.5,
          totalSales: 150,
        },
      };

      mockVendorsService.getVendorDashboard.mockResolvedValue(dashboardData);

      const result = await controller.getDashboard(mockRequest as any);

      expect(result).toEqual(dashboardData);
      expect(mockVendorsService.getVendorDashboard).toHaveBeenCalledWith('user-123');
    });
  });

  describe('updateBanking', () => {
    const bankingDto = {
      bankName: 'Test Bank',
      accountNumber: '123456789',
      routingNumber: '987654321',
    };

    it('should update banking information', async () => {
      const mockRequest = { user: mockUser };
      const expectedResult = { success: true, message: 'Banking information updated successfully' };

      mockVendorsService.updateBankingInfo.mockResolvedValue(expectedResult);

      const result = await controller.updateBanking(mockRequest as any, bankingDto as any);

      expect(result).toEqual(expectedResult);
      expect(mockVendorsService.updateBankingInfo).toHaveBeenCalledWith('user-123', bankingDto);
    });
  });

  describe('getPayouts', () => {
    it('should return paginated payouts', async () => {
      const mockRequest = { user: mockUser };
      const payoutsResult = {
        payouts: [{ id: 'payout-1', amount: 500 }],
        total: 1,
        limit: 20,
        offset: 0,
      };

      mockVendorsService.getPayouts.mockResolvedValue(payoutsResult);

      const result = await controller.getPayouts(mockRequest as any);

      expect(result).toEqual(payoutsResult);
      expect(mockVendorsService.getPayouts).toHaveBeenCalledWith('user-123', undefined, undefined);
    });

    it('should pass pagination parameters', async () => {
      const mockRequest = { user: mockUser };

      mockVendorsService.getPayouts.mockResolvedValue({ payouts: [], total: 0 });

      await controller.getPayouts(mockRequest as any, 10, 20);

      expect(mockVendorsService.getPayouts).toHaveBeenCalledWith('user-123', 10, 20);
    });
  });

  describe('getAllVendors (Admin)', () => {
    it('should return all vendors for admin', async () => {
      const vendorsResult = {
        vendors: [mockVendorProfile],
        total: 1,
        limit: 20,
        offset: 0,
      };

      mockVendorsService.getAllVendors.mockResolvedValue(vendorsResult);

      const result = await controller.getAllVendors({});

      expect(result).toEqual(vendorsResult);
      expect(mockVendorsService.getAllVendors).toHaveBeenCalledWith({});
    });

    it('should pass query filters to service', async () => {
      const query = {
        status: VendorStatus.ACTIVE,
        isVerified: true,
        search: 'Test',
        limit: 10,
        offset: 0,
      };

      mockVendorsService.getAllVendors.mockResolvedValue({ vendors: [], total: 0 });

      await controller.getAllVendors(query as any);

      expect(mockVendorsService.getAllVendors).toHaveBeenCalledWith(query);
    });
  });

  describe('approveApplication (Admin)', () => {
    const approveDto = {
      notes: 'Approved after review',
      commissionRate: 12.5,
    };

    it('should approve vendor application', async () => {
      const expectedResult = {
        application: { id: 'app-123', status: VendorApplicationStatus.APPROVED },
        profile: { id: 'vendor-123', status: VendorStatus.ACTIVE },
      };

      mockVendorsService.approveVendorApplication.mockResolvedValue(expectedResult);

      const result = await controller.approveApplication('app-123', approveDto as any);

      expect(result).toEqual(expectedResult);
      expect(mockVendorsService.approveVendorApplication).toHaveBeenCalledWith('app-123', approveDto);
    });

    it('should pass application id and dto to service', async () => {
      mockVendorsService.approveVendorApplication.mockResolvedValue({});

      await controller.approveApplication('different-app-id', approveDto as any);

      expect(mockVendorsService.approveVendorApplication).toHaveBeenCalledWith(
        'different-app-id',
        approveDto,
      );
    });
  });
});
