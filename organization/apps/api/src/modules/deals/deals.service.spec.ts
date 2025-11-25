import { Test, TestingModule } from '@nestjs/testing';
import { DealsService } from './deals.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  DealType,
  DealStatus,
  LoyaltyTier,
} from '@prisma/client';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

describe('DealsService', () => {
  let service: DealsService;
  let prisma: PrismaService;
  let emailService: EmailService;

  const mockPrismaService = {
    deal: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    dealProduct: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    dealAnalytics: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    dealPurchase: {
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    customerLoyalty: {
      findUnique: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    dealNotification: {
      updateMany: jest.fn(),
    },
  };

  const mockEmailService = {
    sendEmail: jest.fn().mockResolvedValue(undefined),
  };

  // Mock data
  const mockDeal = {
    id: 'deal-123',
    name: 'Flash Sale',
    description: 'Limited time offer',
    type: DealType.FLASH_SALE,
    status: DealStatus.SCHEDULED,
    startTime: new Date(Date.now() + 3600000), // 1 hour from now
    endTime: new Date(Date.now() + 7200000), // 2 hours from now
    earlyAccessHours: 0,
    minimumTier: null,
    discountPercentage: 20,
    discountAmount: null,
    buyQuantity: null,
    getQuantity: null,
    minimumPurchase: null,
    totalStock: 100,
    remainingStock: 100,
    limitPerCustomer: 5,
    badge: 'FLASH SALE',
    badgeColor: '#ff0000',
    featuredOrder: 1,
    isFeatured: true,
    bannerImage: null,
    stackableWithCoupons: false,
    stackableWithLoyalty: true,
    views: 0,
    clicks: 0,
    conversions: 0,
    revenue: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    dealProducts: [],
    _count: { dealProducts: 0, dealPurchases: 0 },
  };

  const mockDealProduct = {
    id: 'dp-1',
    dealId: 'deal-123',
    productId: 'product-123',
    dealPrice: 79.99,
    originalPrice: 99.99,
    stockAllocated: 50,
    stockRemaining: 50,
    isActive: true,
    product: {
      id: 'product-123',
      name: 'Laptop',
      slug: 'laptop',
      images: [],
      price: 99.99,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<DealsService>(DealsService);
    prisma = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDeal', () => {
    it('should create a new deal', async () => {
      // Arrange
      const dto = {
        name: 'Flash Sale',
        description: 'Limited time offer',
        type: DealType.FLASH_SALE,
        startTime: new Date(Date.now() + 3600000).toISOString(),
        endTime: new Date(Date.now() + 7200000).toISOString(),
        discountPercentage: 20,
        totalStock: 100,
        limitPerCustomer: 5,
        isFeatured: true,
      };
      mockPrismaService.deal.create.mockResolvedValue(mockDeal);
      mockPrismaService.dealAnalytics.create.mockResolvedValue({});
      mockPrismaService.deal.findUnique.mockResolvedValue({
        ...mockDeal,
        dealProducts: [],
      });

      // Act
      const result = await service.createDeal(dto);

      // Assert
      expect(result).toBeDefined();
      expect(mockPrismaService.deal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: dto.name,
          type: dto.type,
          discountPercentage: dto.discountPercentage,
        }),
        include: expect.any(Object),
      });
      expect(mockPrismaService.dealAnalytics.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when end time is before start time', async () => {
      // Arrange
      const dto = {
        name: 'Invalid Deal',
        description: 'Test',
        type: DealType.FLASH_SALE,
        startTime: new Date(Date.now() + 7200000).toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(), // Earlier than start
        discountPercentage: 20,
      };

      // Act & Assert
      await expect(service.createDeal(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when BOGO deal missing required fields', async () => {
      // Arrange
      const dto = {
        name: 'BOGO Deal',
        description: 'Buy one get one',
        type: DealType.BOGO,
        startTime: new Date(Date.now() + 3600000).toISOString(),
        endTime: new Date(Date.now() + 7200000).toISOString(),
        // Missing buyQuantity and getQuantity
      };

      // Act & Assert
      await expect(service.createDeal(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateDeal', () => {
    it('should update a deal', async () => {
      // Arrange
      const dto = {
        name: 'Updated Flash Sale',
        discountPercentage: 30,
      };
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDeal);
      mockPrismaService.deal.update.mockResolvedValue({
        ...mockDeal,
        ...dto,
      });

      // Act
      const result = await service.updateDeal('deal-123', dto);

      // Assert
      expect(result.name).toBe('Updated Flash Sale');
      expect(mockPrismaService.deal.update).toHaveBeenCalledWith({
        where: { id: 'deal-123' },
        data: expect.objectContaining({
          name: dto.name,
          discountPercentage: dto.discountPercentage,
        }),
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when deal not found', async () => {
      // Arrange
      mockPrismaService.deal.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateDeal('nonexistent', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteDeal', () => {
    it('should delete a scheduled deal', async () => {
      // Arrange
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDeal);
      mockPrismaService.deal.delete.mockResolvedValue(mockDeal);

      // Act
      const result = await service.deleteDeal('deal-123');

      // Assert
      expect(result.message).toBe('Deal deleted successfully');
      expect(mockPrismaService.deal.delete).toHaveBeenCalledWith({
        where: { id: 'deal-123' },
      });
    });

    it('should throw BadRequestException when trying to delete active deal', async () => {
      // Arrange
      mockPrismaService.deal.findUnique.mockResolvedValue({
        ...mockDeal,
        status: DealStatus.ACTIVE,
      });

      // Act & Assert
      await expect(service.deleteDeal('deal-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getDealById', () => {
    it('should return deal with time remaining', async () => {
      // Arrange
      mockPrismaService.deal.findUnique.mockResolvedValue({
        ...mockDeal,
        dealProducts: [],
      });

      // Act
      const result = await service.getDealById('deal-123');

      // Assert
      expect(result).toBeDefined();
      expect(result.timeRemaining).toBeDefined();
      expect(result.timeRemaining.status).toBe('upcoming');
    });

    it('should throw NotFoundException when deal not found', async () => {
      // Arrange
      mockPrismaService.deal.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getDealById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDeals', () => {
    it('should return deals with pagination', async () => {
      // Arrange
      const query = { page: 1, limit: 20 };
      mockPrismaService.deal.findMany.mockResolvedValue([mockDeal]);
      mockPrismaService.deal.count.mockResolvedValue(1);

      // Act
      const result = await service.getDeals(query);

      // Assert
      expect(result.deals).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should filter by active only', async () => {
      // Arrange
      const query = { activeOnly: true, limit: 20 };
      mockPrismaService.deal.findMany.mockResolvedValue([]);
      mockPrismaService.deal.count.mockResolvedValue(0);

      // Act
      await service.getDeals(query);

      // Assert
      expect(mockPrismaService.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: DealStatus.ACTIVE,
            startTime: { lte: expect.any(Date) },
            endTime: { gte: expect.any(Date) },
          }),
        }),
      );
    });
  });

  describe('addProductsToDeal', () => {
    it('should add products to deal', async () => {
      // Arrange
      const dto = {
        products: [
          {
            productId: 'product-123',
            dealPrice: 79.99,
            originalPrice: 99.99,
            stockAllocated: 50,
          },
        ],
      };
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDeal);
      mockPrismaService.product.findMany.mockResolvedValue([
        { id: 'product-123' },
      ]);
      mockPrismaService.dealProduct.create.mockResolvedValue(mockDealProduct);

      // Act
      const result = await service.addProductsToDeal('deal-123', dto);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.dealProduct.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dealId: 'deal-123',
          productId: 'product-123',
          dealPrice: 79.99,
        }),
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException when products not found', async () => {
      // Arrange
      const dto = {
        products: [{ productId: 'product-123', dealPrice: 79.99, originalPrice: 99.99, stockAllocated: 50 }],
      };
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDeal);
      mockPrismaService.product.findMany.mockResolvedValue([]); // No products found

      // Act & Assert
      await expect(
        service.addProductsToDeal('deal-123', dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeProductFromDeal', () => {
    it('should remove product from deal', async () => {
      // Arrange
      mockPrismaService.dealProduct.findFirst.mockResolvedValue(mockDealProduct);
      mockPrismaService.dealProduct.delete.mockResolvedValue(mockDealProduct);

      // Act
      const result = await service.removeProductFromDeal('deal-123', 'product-123');

      // Assert
      expect(result.message).toBe('Product removed from deal');
      expect(mockPrismaService.dealProduct.delete).toHaveBeenCalledWith({
        where: { id: 'dp-1' },
      });
    });

    it('should throw NotFoundException when product not in deal', async () => {
      // Arrange
      mockPrismaService.dealProduct.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.removeProductFromDeal('deal-123', 'product-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('calculateDealPrice', () => {
    it('should calculate percentage discount', async () => {
      // Arrange
      const dto = {
        dealId: 'deal-123',
        originalPrice: 100,
        quantity: 1,
      };
      const activeDeal = {
        ...mockDeal,
        status: DealStatus.ACTIVE,
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() + 3600000),
        dealProducts: [],
      };
      mockPrismaService.deal.findUnique.mockResolvedValue(activeDeal);

      // Act
      const result = await service.calculateDealPrice(dto);

      // Assert
      expect(result.discountedPrice).toBe(80); // 20% off 100
      expect(result.discountPercentage).toBe(20);
      expect(result.totalFinal).toBe(80);
    });

    it('should throw BadRequestException when deal is not active', async () => {
      // Arrange
      const dto = {
        dealId: 'deal-123',
        originalPrice: 100,
        quantity: 1,
      };
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDeal); // SCHEDULED status

      // Act & Assert
      await expect(service.calculateDealPrice(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should calculate BOGO discount', async () => {
      // Arrange
      const dto = {
        dealId: 'deal-123',
        originalPrice: 10,
        quantity: 4,
      };
      const bogoDeal = {
        ...mockDeal,
        type: DealType.BOGO,
        status: DealStatus.ACTIVE,
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() + 3600000),
        buyQuantity: 2,
        getQuantity: 1,
        discountPercentage: null,
        dealProducts: [],
      };
      mockPrismaService.deal.findUnique.mockResolvedValue(bogoDeal);

      // Act
      const result = await service.calculateDealPrice(dto);

      // Assert
      expect(result.totalFinal).toBeLessThan(result.totalOriginal);
      expect(result.savings).toBeGreaterThan(0);
    });
  });

  describe('checkDealEligibility', () => {
    it('should return eligible for valid active deal', async () => {
      // Arrange
      const dto = { dealId: 'deal-123', userId: 'user-123' };
      const activeDeal = {
        ...mockDeal,
        status: DealStatus.ACTIVE,
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() + 3600000),
      };
      mockPrismaService.deal.findUnique.mockResolvedValue(activeDeal);
      mockPrismaService.dealPurchase.aggregate.mockResolvedValue({
        _sum: { quantity: 0 },
      });

      // Act
      const result = await service.checkDealEligibility(dto);

      // Assert
      expect(result.isEligible).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it('should return ineligible when deal has not started', async () => {
      // Arrange
      const dto = { dealId: 'deal-123', userId: 'user-123' };
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDeal); // Future start time
      mockPrismaService.dealPurchase.aggregate.mockResolvedValue({
        _sum: { quantity: 0 },
      });

      // Act
      const result = await service.checkDealEligibility(dto);

      // Assert
      expect(result.isEligible).toBe(false);
      expect(result.reasons).toContain('Deal has not started yet');
    });

    it('should return ineligible when stock is sold out', async () => {
      // Arrange
      const dto = { dealId: 'deal-123', userId: 'user-123' };
      const soldOutDeal = {
        ...mockDeal,
        status: DealStatus.ACTIVE,
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() + 3600000),
        remainingStock: 0,
      };
      mockPrismaService.deal.findUnique.mockResolvedValue(soldOutDeal);
      mockPrismaService.dealPurchase.aggregate.mockResolvedValue({
        _sum: { quantity: 0 },
      });

      // Act
      const result = await service.checkDealEligibility(dto);

      // Assert
      expect(result.isEligible).toBe(false);
      expect(result.reasons).toContain('Deal is sold out');
    });

    it('should return ineligible when purchase limit reached', async () => {
      // Arrange
      const dto = { dealId: 'deal-123', userId: 'user-123' };
      const activeDeal = {
        ...mockDeal,
        status: DealStatus.ACTIVE,
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() + 3600000),
        limitPerCustomer: 5,
      };
      mockPrismaService.deal.findUnique.mockResolvedValue(activeDeal);
      mockPrismaService.dealPurchase.aggregate.mockResolvedValue({
        _sum: { quantity: 5 }, // Already purchased limit
      });

      // Act
      const result = await service.checkDealEligibility(dto);

      // Assert
      expect(result.isEligible).toBe(false);
      expect(result.reasons).toContain('Purchase limit reached for this deal');
    });
  });

  describe('recordDealPurchase', () => {
    it('should record deal purchase and update stock', async () => {
      // Arrange
      const dto = {
        dealId: 'deal-123',
        orderId: 'order-123',
        quantity: 2,
        purchasePrice: 160,
        discountApplied: 40,
      };
      const activeDeal = {
        ...mockDeal,
        status: DealStatus.ACTIVE,
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() + 3600000),
      };
      mockPrismaService.deal.findUnique.mockResolvedValue(activeDeal);
      mockPrismaService.dealPurchase.aggregate.mockResolvedValue({
        _sum: { quantity: 0 },
      });
      mockPrismaService.dealPurchase.create.mockResolvedValue({
        id: 'purchase-1',
        ...dto,
        userId: 'user-123',
      });
      mockPrismaService.deal.update.mockResolvedValue({});
      mockPrismaService.dealAnalytics.findUnique.mockResolvedValue({
        dealId: 'deal-123',
        totalViews: 100,
        clicks: 50,
        totalPurchases: 10,
        totalRevenue: 1000,
      });
      mockPrismaService.dealAnalytics.update.mockResolvedValue({});

      // Act
      const result = await service.recordDealPurchase(dto, 'user-123');

      // Assert
      expect(result).toBeDefined();
      expect(mockPrismaService.deal.update).toHaveBeenCalledWith({
        where: { id: 'deal-123' },
        data: {
          remainingStock: {
            decrement: 2,
          },
        },
      });
    });

    it('should throw ForbiddenException when not eligible', async () => {
      // Arrange
      const dto = {
        dealId: 'deal-123',
        orderId: 'order-123',
        quantity: 2,
      };
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDeal); // Not active
      mockPrismaService.dealPurchase.aggregate.mockResolvedValue({
        _sum: { quantity: 0 },
      });

      // Act & Assert
      await expect(
        service.recordDealPurchase(dto, 'user-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUserDealPurchases', () => {
    it('should return user deal purchases', async () => {
      // Arrange
      const mockPurchases = [
        {
          id: 'purchase-1',
          dealId: 'deal-123',
          userId: 'user-123',
          deal: { id: 'deal-123', name: 'Flash Sale', type: DealType.FLASH_SALE },
        },
      ];
      mockPrismaService.dealPurchase.findMany.mockResolvedValue(mockPurchases);

      // Act
      const result = await service.getUserDealPurchases('user-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.dealPurchase.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: expect.any(Object),
        orderBy: { purchasedAt: 'desc' },
        take: 20,
      });
    });
  });

  describe('trackDealView', () => {
    it('should track deal view', async () => {
      // Arrange
      const dto = { dealId: 'deal-123', userId: 'user-123' };
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDeal);
      mockPrismaService.deal.update.mockResolvedValue({});
      mockPrismaService.dealAnalytics.findUnique.mockResolvedValue({
        dealId: 'deal-123',
        totalViews: 10,
        clicks: 5,
        totalPurchases: 1,
        totalRevenue: 100,
      });
      mockPrismaService.dealAnalytics.update.mockResolvedValue({});

      // Act
      await service.trackDealView(dto);

      // Assert
      expect(mockPrismaService.deal.update).toHaveBeenCalledWith({
        where: { id: 'deal-123' },
        data: {
          views: {
            increment: 1,
          },
        },
      });
    });
  });

  describe('trackDealClick', () => {
    it('should track deal click', async () => {
      // Arrange
      const dto = { dealId: 'deal-123' };
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDeal);
      mockPrismaService.deal.update.mockResolvedValue({});
      mockPrismaService.dealAnalytics.findUnique.mockResolvedValue({
        dealId: 'deal-123',
        totalViews: 10,
        clicks: 5,
        totalPurchases: 1,
        totalRevenue: 100,
      });
      mockPrismaService.dealAnalytics.update.mockResolvedValue({});

      // Act
      await service.trackDealClick(dto);

      // Assert
      expect(mockPrismaService.deal.update).toHaveBeenCalledWith({
        where: { id: 'deal-123' },
        data: {
          clicks: {
            increment: 1,
          },
        },
      });
    });
  });

  describe('getDealAnalytics', () => {
    it('should return deal analytics with calculated metrics', async () => {
      // Arrange
      const mockAnalytics = {
        dealId: 'deal-123',
        totalViews: 100,
        uniqueViews: 80,
        clicks: 50,
        totalPurchases: 10,
        totalRevenue: 1000,
        initialStock: 100,
        stockRemaining: 50,
      };
      mockPrismaService.dealAnalytics.findUnique.mockResolvedValue(mockAnalytics);

      // Act
      const result = await service.getDealAnalytics('deal-123');

      // Assert
      expect(result.clickThroughRate).toBe(50); // 50/100 * 100
      expect(result.conversionRate).toBe(20); // 10/50 * 100
      expect(result.sellThroughRate).toBe(50); // (100-50)/100 * 100
      expect(result.averageOrderValue).toBe(100); // 1000/10
    });
  });

  describe('activateScheduledDeals', () => {
    it('should activate scheduled deals', async () => {
      // Arrange
      const scheduledDeals = [
        {
          ...mockDeal,
          startTime: new Date(Date.now() - 1000), // Past time
        },
      ];
      mockPrismaService.deal.findMany.mockResolvedValue(scheduledDeals);
      mockPrismaService.deal.update.mockResolvedValue({});

      // Act
      const result = await service.activateScheduledDeals();

      // Assert
      expect(result.message).toContain('Activated 1 deals');
      expect(mockPrismaService.deal.update).toHaveBeenCalledWith({
        where: { id: 'deal-123' },
        data: { status: DealStatus.ACTIVE },
      });
    });
  });

  describe('endExpiredDeals', () => {
    it('should end expired active deals', async () => {
      // Arrange
      const expiredDeals = [
        {
          ...mockDeal,
          status: DealStatus.ACTIVE,
          endTime: new Date(Date.now() - 1000), // Past time
        },
      ];
      mockPrismaService.deal.findMany.mockResolvedValue(expiredDeals);
      mockPrismaService.deal.update.mockResolvedValue({});

      // Act
      const result = await service.endExpiredDeals();

      // Assert
      expect(result.message).toContain('Ended 1 deals');
      expect(mockPrismaService.deal.update).toHaveBeenCalledWith({
        where: { id: 'deal-123' },
        data: { status: DealStatus.ENDED },
      });
    });
  });

  describe('notifyDeal', () => {
    it('should notify users about deal', async () => {
      // Arrange
      const dto = {
        dealId: 'deal-123',
        userId: 'user-123',
        notificationType: 'DEAL_ACTIVE',
      };
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDeal);
      mockPrismaService.dealNotification.updateMany.mockResolvedValue({
        count: 1,
      });

      // Act
      const result = await service.notifyDeal(dto);

      // Assert
      expect(result.count).toBe(1);
      expect(result.message).toContain('Sent 1 notifications');
    });
  });
});
