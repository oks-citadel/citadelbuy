import { Test, TestingModule } from '@nestjs/testing';
import { FeaturedListingsService, CreateFeaturedListingDto } from './featured-listings.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FeaturedPosition, FeaturedStatus } from '@prisma/client';

describe('FeaturedListingsService', () => {
  let service: FeaturedListingsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    featuredSlot: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    featuredListing: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
    vendorProfile: {
      findUnique: jest.fn(),
    },
  };

  const mockVendorProfile = {
    id: 'vendor-123',
    userId: 'user-123',
    businessName: 'Test Business',
  };

  const mockProduct = {
    id: 'product-123',
    name: 'Test Product',
    vendorId: 'user-123',
    images: ['image.jpg'],
    vendor: { id: 'vendor-123' },
  };

  const mockFeaturedSlot = {
    id: 'slot-123',
    position: FeaturedPosition.HOMEPAGE_BANNER,
    categoryId: null,
    maxListings: 10,
    dailyRate: 10,
    weeklyRate: 50,
    monthlyRate: 150,
    isActive: true,
  };

  const mockFeaturedListing = {
    id: 'listing-123',
    productId: 'product-123',
    vendorId: 'vendor-123',
    position: FeaturedPosition.HOMEPAGE_BANNER,
    priority: 0,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    cost: 150,
    status: FeaturedStatus.PENDING,
    paymentStatus: 'pending',
    impressions: 0,
    clicks: 0,
    createdAt: new Date(),
    product: { name: 'Test Product', images: ['image.jpg'] },
    vendor: { businessName: 'Test Business' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeaturedListingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FeaturedListingsService>(FeaturedListingsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAvailableSlots', () => {
    it('should return available slots with availability info', async () => {
      mockPrismaService.featuredSlot.findMany.mockResolvedValue([mockFeaturedSlot]);
      mockPrismaService.featuredListing.count.mockResolvedValue(3);

      const result = await service.getAvailableSlots();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'slot-123',
        position: FeaturedPosition.HOMEPAGE_BANNER,
        category: undefined,
        maxListings: 10,
        currentListings: 3,
        availableSpots: 7,
        dailyRate: 10,
        weeklyRate: 50,
        monthlyRate: 150,
      });
    });

    it('should filter slots by position', async () => {
      mockPrismaService.featuredSlot.findMany.mockResolvedValue([]);
      mockPrismaService.featuredListing.count.mockResolvedValue(0);

      await service.getAvailableSlots(FeaturedPosition.HOMEPAGE_BANNER);

      expect(mockPrismaService.featuredSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            position: FeaturedPosition.HOMEPAGE_BANNER,
          }),
        }),
      );
    });

    it('should filter slots by category', async () => {
      mockPrismaService.featuredSlot.findMany.mockResolvedValue([]);

      await service.getAvailableSlots(undefined, 'cat-123');

      expect(mockPrismaService.featuredSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ categoryId: 'cat-123' }, { categoryId: null }],
          }),
        }),
      );
    });
  });

  describe('calculateCost', () => {
    it('should calculate daily rate for short periods', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-05'); // 4 days

      const result = service.calculateCost(mockFeaturedSlot, startDate, endDate);

      expect(result).toBe(50); // 5 days * 10 daily rate
    });

    it('should calculate weekly rate for 7+ days', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-14'); // 13 days

      const result = service.calculateCost(mockFeaturedSlot, startDate, endDate);

      expect(result).toBe(100); // 2 weeks * 50 weekly rate
    });

    it('should calculate monthly rate for 28+ days', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-02-15'); // 45 days

      const result = service.calculateCost(mockFeaturedSlot, startDate, endDate);

      expect(result).toBe(300); // 2 months * 150 monthly rate
    });
  });

  describe('createFeaturedListing', () => {
    const createDto: CreateFeaturedListingDto = {
      productId: 'product-123',
      position: FeaturedPosition.HOMEPAGE_BANNER,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
    };

    it('should create a featured listing', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.featuredListing.findFirst.mockResolvedValue(null);
      mockPrismaService.featuredSlot.findFirst.mockResolvedValue(mockFeaturedSlot);
      mockPrismaService.featuredListing.count.mockResolvedValue(3);
      mockPrismaService.featuredListing.create.mockResolvedValue(mockFeaturedListing);

      const result = await service.createFeaturedListing('vendor-123', createDto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('productId', 'product-123');
      expect(result).toHaveProperty('status', FeaturedStatus.PENDING);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.createFeaturedListing('vendor-123', createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if product belongs to different vendor', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        ...mockProduct,
        vendorId: 'other-user',
      });
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);

      await expect(service.createFeaturedListing('vendor-123', createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if product already has active listing', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.featuredListing.findFirst.mockResolvedValue(mockFeaturedListing);

      await expect(service.createFeaturedListing('vendor-123', createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if no slot available', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.featuredListing.findFirst.mockResolvedValue(null);
      mockPrismaService.featuredSlot.findFirst.mockResolvedValue(null);

      await expect(service.createFeaturedListing('vendor-123', createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if no available spots', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.featuredListing.findFirst.mockResolvedValue(null);
      mockPrismaService.featuredSlot.findFirst.mockResolvedValue(mockFeaturedSlot);
      mockPrismaService.featuredListing.count.mockResolvedValue(10); // Max reached

      await expect(service.createFeaturedListing('vendor-123', createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('activateListing', () => {
    it('should activate a pending listing', async () => {
      const pendingListing = {
        ...mockFeaturedListing,
        status: FeaturedStatus.PENDING,
        startDate: new Date(Date.now() - 1000), // Started in past
      };

      mockPrismaService.featuredListing.findUnique.mockResolvedValue(pendingListing);
      mockPrismaService.featuredListing.update.mockResolvedValue({
        ...pendingListing,
        status: FeaturedStatus.ACTIVE,
        paymentStatus: 'paid',
      });

      const result = await service.activateListing('listing-123', 'payment-123');

      expect(result.status).toBe(FeaturedStatus.ACTIVE);
      expect(mockPrismaService.featuredListing.update).toHaveBeenCalledWith({
        where: { id: 'listing-123' },
        data: expect.objectContaining({
          paymentId: 'payment-123',
          paymentStatus: 'paid',
        }),
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if listing not found', async () => {
      mockPrismaService.featuredListing.findUnique.mockResolvedValue(null);

      await expect(service.activateListing('nonexistent', 'payment-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if listing is not pending', async () => {
      mockPrismaService.featuredListing.findUnique.mockResolvedValue({
        ...mockFeaturedListing,
        status: FeaturedStatus.ACTIVE,
      });

      await expect(service.activateListing('listing-123', 'payment-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancelListing', () => {
    it('should cancel a listing', async () => {
      mockPrismaService.featuredListing.findUnique.mockResolvedValue(mockFeaturedListing);
      mockPrismaService.featuredListing.update.mockResolvedValue({
        ...mockFeaturedListing,
        status: FeaturedStatus.CANCELLED,
      });

      await service.cancelListing('listing-123', 'vendor-123');

      expect(mockPrismaService.featuredListing.update).toHaveBeenCalledWith({
        where: { id: 'listing-123' },
        data: expect.objectContaining({
          status: FeaturedStatus.CANCELLED,
        }),
      });
    });

    it('should throw NotFoundException if listing not found', async () => {
      mockPrismaService.featuredListing.findUnique.mockResolvedValue(null);

      await expect(service.cancelListing('nonexistent', 'vendor-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if listing belongs to different vendor', async () => {
      mockPrismaService.featuredListing.findUnique.mockResolvedValue({
        ...mockFeaturedListing,
        vendorId: 'other-vendor',
      });

      await expect(service.cancelListing('listing-123', 'vendor-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if listing already cancelled', async () => {
      mockPrismaService.featuredListing.findUnique.mockResolvedValue({
        ...mockFeaturedListing,
        status: FeaturedStatus.CANCELLED,
      });

      await expect(service.cancelListing('listing-123', 'vendor-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getVendorListings', () => {
    it('should return paginated listings for vendor', async () => {
      mockPrismaService.featuredListing.findMany.mockResolvedValue([mockFeaturedListing]);
      mockPrismaService.featuredListing.count.mockResolvedValue(1);

      const result = await service.getVendorListings('vendor-123', 1, 10);

      expect(result).toEqual({
        data: expect.any(Array),
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      mockPrismaService.featuredListing.findMany.mockResolvedValue([]);
      mockPrismaService.featuredListing.count.mockResolvedValue(0);

      await service.getVendorListings('vendor-123', 1, 10, FeaturedStatus.ACTIVE);

      expect(mockPrismaService.featuredListing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { vendorId: 'vendor-123', status: FeaturedStatus.ACTIVE },
        }),
      );
    });
  });

  describe('getFeaturedProducts', () => {
    it('should return featured products for display', async () => {
      const listingWithProduct = {
        ...mockFeaturedListing,
        product: {
          id: 'product-123',
          name: 'Test Product',
          slug: 'test-product',
          price: 99.99,
          images: ['image.jpg'],
          category: { id: 'cat-123', name: 'Electronics' },
          vendor: { name: 'Test Business' },
          reviews: [{ rating: 5 }, { rating: 4 }],
        },
      };

      mockPrismaService.featuredListing.findMany.mockResolvedValue([listingWithProduct]);
      mockPrismaService.featuredListing.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.getFeaturedProducts(FeaturedPosition.HOMEPAGE_BANNER);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('listingId');
      expect(result[0]).toHaveProperty('product');
      expect(result[0].isFeatured).toBe(true);
    });

    it('should increment impressions', async () => {
      mockPrismaService.featuredListing.findMany.mockResolvedValue([mockFeaturedListing]);
      mockPrismaService.featuredListing.updateMany.mockResolvedValue({ count: 1 });

      await service.getFeaturedProducts(FeaturedPosition.HOMEPAGE_BANNER);

      expect(mockPrismaService.featuredListing.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['listing-123'] } },
        data: { impressions: { increment: 1 } },
      });
    });
  });

  describe('trackClick', () => {
    it('should increment clicks', async () => {
      mockPrismaService.featuredListing.update.mockResolvedValue(mockFeaturedListing);

      await service.trackClick('listing-123');

      expect(mockPrismaService.featuredListing.update).toHaveBeenCalledWith({
        where: { id: 'listing-123' },
        data: { clicks: { increment: 1 } },
      });
    });
  });

  describe('getAllListings', () => {
    it('should return all listings with pagination', async () => {
      mockPrismaService.featuredListing.findMany.mockResolvedValue([mockFeaturedListing]);
      mockPrismaService.featuredListing.count.mockResolvedValue(1);

      const result = await service.getAllListings(1, 10);

      expect(result).toEqual({
        data: expect.any(Array),
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter by status and position', async () => {
      mockPrismaService.featuredListing.findMany.mockResolvedValue([]);
      mockPrismaService.featuredListing.count.mockResolvedValue(0);

      await service.getAllListings(1, 10, FeaturedStatus.ACTIVE, FeaturedPosition.HOMEPAGE_BANNER);

      expect(mockPrismaService.featuredListing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: FeaturedStatus.ACTIVE,
            position: FeaturedPosition.HOMEPAGE_BANNER,
          },
        }),
      );
    });
  });

  describe('getListingStats', () => {
    it('should return listing statistics', async () => {
      mockPrismaService.featuredListing.count
        .mockResolvedValueOnce(5) // active
        .mockResolvedValueOnce(2) // pending
        .mockResolvedValueOnce(10); // expired

      mockPrismaService.featuredListing.aggregate
        .mockResolvedValueOnce({ _sum: { cost: 1500 } }) // revenue
        .mockResolvedValueOnce({ _sum: { clicks: 500 } }) // clicks
        .mockResolvedValueOnce({ _sum: { impressions: 10000 } }); // impressions

      const result = await service.getListingStats();

      expect(result).toEqual({
        active: 5,
        pending: 2,
        expired: 10,
        totalRevenue: 1500,
        totalClicks: 500,
        totalImpressions: 10000,
        averageCtr: 5, // 500/10000 * 100
      });
    });

    it('should filter stats by vendor', async () => {
      mockPrismaService.featuredListing.count.mockResolvedValue(0);
      mockPrismaService.featuredListing.aggregate.mockResolvedValue({
        _sum: { cost: 0, clicks: 0, impressions: 0 },
      });

      await service.getListingStats('vendor-123');

      expect(mockPrismaService.featuredListing.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          vendorId: 'vendor-123',
        }),
      });
    });
  });

  describe('upsertSlot', () => {
    const slotData = {
      position: FeaturedPosition.HOMEPAGE_BANNER,
      maxListings: 10,
      dailyRate: 15,
      weeklyRate: 75,
      monthlyRate: 200,
    };

    it('should create a new slot', async () => {
      mockPrismaService.featuredSlot.findFirst.mockResolvedValue(null);
      mockPrismaService.featuredSlot.create.mockResolvedValue({
        id: 'new-slot',
        ...slotData,
      });

      const result = await service.upsertSlot(slotData);

      expect(result).toHaveProperty('id', 'new-slot');
      expect(mockPrismaService.featuredSlot.create).toHaveBeenCalled();
    });

    it('should update existing slot', async () => {
      mockPrismaService.featuredSlot.findFirst.mockResolvedValue(mockFeaturedSlot);
      mockPrismaService.featuredSlot.update.mockResolvedValue({
        ...mockFeaturedSlot,
        ...slotData,
      });

      const result = await service.upsertSlot(slotData);

      expect(mockPrismaService.featuredSlot.update).toHaveBeenCalledWith({
        where: { id: 'slot-123' },
        data: slotData,
      });
    });
  });

  describe('updateListingStatuses', () => {
    it('should activate pending listings that should start', async () => {
      mockPrismaService.featuredListing.updateMany
        .mockResolvedValueOnce({ count: 3 }) // activated
        .mockResolvedValueOnce({ count: 2 }); // expired

      await service.updateListingStatuses();

      expect(mockPrismaService.featuredListing.updateMany).toHaveBeenCalledTimes(2);
    });
  });
});
