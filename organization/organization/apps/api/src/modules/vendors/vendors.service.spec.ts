import { Test, TestingModule } from '@nestjs/testing';
import { VendorsService } from './vendors.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { VendorStatus, VendorApplicationStatus } from '@prisma/client';

describe('VendorsService', () => {
  let service: VendorsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    vendorProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    vendorApplication: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    vendorPayout: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'vendor@example.com',
    name: 'Test Vendor',
  };

  const mockVendorProfile = {
    id: 'vendor-profile-123',
    userId: 'user-123',
    businessName: 'Test Business',
    businessType: 'LLC',
    taxId: 'TAX123456',
    businessAddress: '123 Business St',
    businessPhone: '555-1234',
    businessEmail: 'business@example.com',
    website: 'https://testbusiness.com',
    description: 'A test business description',
    logoUrl: 'https://example.com/logo.png',
    bannerUrl: 'https://example.com/banner.png',
    socialMedia: { twitter: '@testbusiness' },
    status: VendorStatus.ACTIVE,
    isVerified: true,
    canSell: true,
    commissionRate: 15.0,
    totalRevenue: 10000,
    totalOrders: 100,
    totalSales: 150,
    averageRating: 4.5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVendorApplication = {
    id: 'application-123',
    vendorProfileId: 'vendor-profile-123',
    status: VendorApplicationStatus.PENDING,
    applicationData: {},
    documentsSubmitted: [],
    submittedAt: new Date(),
    businessInfoComplete: true,
    bankingInfoComplete: false,
    documentsComplete: false,
    agreementSigned: false,
  };

  beforeEach(async () => {
    // Set up encryption key for tests
    process.env.BANKING_ENCRYPTION_KEY = '12345678901234567890123456789012'; // 32 bytes

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VendorsService>(VendorsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.BANKING_ENCRYPTION_KEY;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerVendor', () => {
    const registrationDto = {
      businessName: 'New Business',
      businessType: 'LLC',
      taxId: 'TAX789',
      businessAddress: '456 New St',
      businessPhone: '555-5678',
      businessEmail: 'newbusiness@example.com',
      website: 'https://newbusiness.com',
      description: 'New business description',
      documents: ['doc1.pdf', 'doc2.pdf'],
    };

    it('should successfully register a new vendor', async () => {
      const newVendorProfile = {
        id: 'vendor-new',
        userId: 'user-new',
        ...registrationDto,
        status: VendorStatus.PENDING_VERIFICATION,
        isVerified: false,
        canSell: false,
      };

      const newApplication = {
        id: 'app-new',
        vendorProfileId: 'vendor-new',
        status: VendorApplicationStatus.PENDING,
      };

      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          vendorProfile: {
            create: jest.fn().mockResolvedValue(newVendorProfile),
          },
          vendorApplication: {
            create: jest.fn().mockResolvedValue(newApplication),
          },
        });
      });

      const result = await service.registerVendor('user-new', registrationDto);

      expect(mockPrismaService.vendorProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-new' },
      });
    });

    it('should throw ConflictException if user already has a vendor profile', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);

      await expect(service.registerVendor('user-123', registrationDto)).rejects.toThrow(
        ConflictException,
      );

      expect(mockPrismaService.vendorProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });
  });

  describe('getVendorProfile', () => {
    it('should return vendor profile with related data', async () => {
      const profileWithRelations = {
        ...mockVendorProfile,
        application: mockVendorApplication,
        payouts: [],
        commissionRules: [],
      };

      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(profileWithRelations);

      const result = await service.getVendorProfile('user-123');

      expect(result).toEqual(profileWithRelations);
      expect(mockPrismaService.vendorProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: {
          application: true,
          payouts: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
          commissionRules: {
            where: { isActive: true },
          },
        },
      });
    });

    it('should throw NotFoundException if profile not found', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(null);

      await expect(service.getVendorProfile('nonexistent-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getVendorDashboard', () => {
    it('should return dashboard metrics', async () => {
      const profileWithRelations = {
        ...mockVendorProfile,
        application: mockVendorApplication,
        payouts: [],
        commissionRules: [],
      };

      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(profileWithRelations);
      mockPrismaService.product.count.mockResolvedValue(25);

      const result = await service.getVendorDashboard('user-123');

      expect(result).toEqual({
        profile: {
          businessName: 'Test Business',
          status: VendorStatus.ACTIVE,
          isVerified: true,
          canSell: true,
          commissionRate: 15.0,
          logoUrl: 'https://example.com/logo.png',
        },
        metrics: {
          totalRevenue: 10000,
          totalOrders: 100,
          totalProducts: 25,
          averageRating: 4.5,
          totalSales: 150,
        },
      });
    });

    it('should handle missing metrics with default values', async () => {
      const profileWithoutMetrics = {
        ...mockVendorProfile,
        totalRevenue: null,
        totalOrders: null,
        totalSales: null,
        averageRating: null,
        application: mockVendorApplication,
        payouts: [],
        commissionRules: [],
      };

      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(profileWithoutMetrics);
      mockPrismaService.product.count.mockResolvedValue(0);

      const result = await service.getVendorDashboard('user-123');

      expect(result.metrics).toEqual({
        totalRevenue: 0,
        totalOrders: 0,
        totalProducts: 0,
        averageRating: 0,
        totalSales: 0,
      });
    });
  });

  describe('updateVendorProfile', () => {
    const updateDto = {
      businessName: 'Updated Business Name',
      description: 'Updated description',
    };

    it('should update vendor profile successfully', async () => {
      const updatedProfile = {
        ...mockVendorProfile,
        ...updateDto,
      };

      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.vendorProfile.update.mockResolvedValue(updatedProfile);

      const result = await service.updateVendorProfile('user-123', updateDto);

      expect(result.businessName).toBe('Updated Business Name');
      expect(mockPrismaService.vendorProfile.update).toHaveBeenCalledWith({
        where: { id: mockVendorProfile.id },
        data: expect.objectContaining({
          businessName: updateDto.businessName,
          description: updateDto.description,
        }),
      });
    });

    it('should throw NotFoundException if profile not found', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(null);

      await expect(service.updateVendorProfile('nonexistent-user', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateBankingInfo', () => {
    const bankingDto = {
      bankName: 'Test Bank',
      accountNumber: '123456789',
      routingNumber: '987654321',
      paypalEmail: 'vendor@paypal.com',
    };

    it('should update banking info with encrypted account number', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.vendorProfile.update.mockResolvedValue(mockVendorProfile);

      const result = await service.updateBankingInfo('user-123', bankingDto);

      expect(result).toEqual({ success: true, message: 'Banking information updated successfully' });
      expect(mockPrismaService.vendorProfile.update).toHaveBeenCalledWith({
        where: { id: mockVendorProfile.id },
        data: expect.objectContaining({
          bankName: 'Test Bank',
          routingNumber: '987654321',
          paypalEmail: 'vendor@paypal.com',
          accountNumber: expect.any(String), // Encrypted
        }),
      });
    });

    it('should throw NotFoundException if profile not found', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(null);

      await expect(service.updateBankingInfo('nonexistent-user', bankingDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPayouts', () => {
    const mockPayouts = [
      { id: 'payout-1', amount: 500, status: 'COMPLETED' },
      { id: 'payout-2', amount: 750, status: 'PENDING' },
    ];

    it('should return paginated payouts', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.vendorPayout.findMany.mockResolvedValue(mockPayouts);
      mockPrismaService.vendorPayout.count.mockResolvedValue(2);

      const result = await service.getPayouts('user-123', 10, 0);

      expect(result).toEqual({
        payouts: mockPayouts,
        total: 2,
        limit: 10,
        offset: 0,
      });
    });

    it('should use default pagination values', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.vendorPayout.findMany.mockResolvedValue([]);
      mockPrismaService.vendorPayout.count.mockResolvedValue(0);

      const result = await service.getPayouts('user-123');

      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should throw NotFoundException if profile not found', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(null);

      await expect(service.getPayouts('nonexistent-user')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approveVendorApplication', () => {
    const approveDto = {
      notes: 'Application approved',
      commissionRate: 12.5,
    };

    it('should approve vendor application and activate profile', async () => {
      const applicationWithProfile = {
        ...mockVendorApplication,
        vendorProfile: mockVendorProfile,
      };

      mockPrismaService.vendorApplication.findUnique.mockResolvedValue(applicationWithProfile);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const updatedApp = { ...mockVendorApplication, status: VendorApplicationStatus.APPROVED };
        const updatedProfile = { ...mockVendorProfile, status: VendorStatus.ACTIVE, isVerified: true };
        return callback({
          vendorApplication: {
            update: jest.fn().mockResolvedValue(updatedApp),
          },
          vendorProfile: {
            update: jest.fn().mockResolvedValue(updatedProfile),
          },
        });
      });

      await service.approveVendorApplication('application-123', approveDto);

      expect(mockPrismaService.vendorApplication.findUnique).toHaveBeenCalledWith({
        where: { id: 'application-123' },
        include: { vendorProfile: true },
      });
    });

    it('should throw NotFoundException if application not found', async () => {
      mockPrismaService.vendorApplication.findUnique.mockResolvedValue(null);

      await expect(service.approveVendorApplication('nonexistent-app', approveDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAllVendors', () => {
    const mockVendors = [
      { ...mockVendorProfile, application: mockVendorApplication, _count: { payouts: 5 } },
      {
        ...mockVendorProfile,
        id: 'vendor-2',
        businessName: 'Business 2',
        application: mockVendorApplication,
        _count: { payouts: 3 },
      },
    ];

    it('should return paginated vendors without filters', async () => {
      mockPrismaService.vendorProfile.findMany.mockResolvedValue(mockVendors);
      mockPrismaService.vendorProfile.count.mockResolvedValue(2);

      const result = await service.getAllVendors({});

      expect(result).toEqual({
        vendors: mockVendors,
        total: 2,
        limit: 20,
        offset: 0,
      });
    });

    it('should filter vendors by status', async () => {
      mockPrismaService.vendorProfile.findMany.mockResolvedValue([mockVendors[0]]);
      mockPrismaService.vendorProfile.count.mockResolvedValue(1);

      await service.getAllVendors({ status: VendorStatus.ACTIVE });

      expect(mockPrismaService.vendorProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: VendorStatus.ACTIVE },
        }),
      );
    });

    it('should filter vendors by isVerified', async () => {
      mockPrismaService.vendorProfile.findMany.mockResolvedValue(mockVendors);
      mockPrismaService.vendorProfile.count.mockResolvedValue(2);

      await service.getAllVendors({ isVerified: true });

      expect(mockPrismaService.vendorProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isVerified: true },
        }),
      );
    });

    it('should search vendors by business name or email', async () => {
      mockPrismaService.vendorProfile.findMany.mockResolvedValue([mockVendors[0]]);
      mockPrismaService.vendorProfile.count.mockResolvedValue(1);

      await service.getAllVendors({ search: 'Test' });

      expect(mockPrismaService.vendorProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { businessName: { contains: 'Test', mode: 'insensitive' } },
              { businessEmail: { contains: 'Test', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('should handle pagination parameters', async () => {
      mockPrismaService.vendorProfile.findMany.mockResolvedValue([]);
      mockPrismaService.vendorProfile.count.mockResolvedValue(0);

      await service.getAllVendors({ limit: 10, offset: 20 });

      expect(mockPrismaService.vendorProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });
  });
});
