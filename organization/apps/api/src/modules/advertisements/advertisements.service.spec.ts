import { Test, TestingModule } from '@nestjs/testing';
import { AdvertisementsService } from './advertisements.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AdStatus, CampaignStatus } from '@prisma/client';

describe('AdvertisementsService', () => {
  let service: AdvertisementsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    adCampaign: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    advertisement: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
    adImpression: {
      create: jest.fn(),
      groupBy: jest.fn(),
    },
    adClick: {
      create: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  const mockCampaign = {
    id: 'campaign-123',
    vendorId: 'vendor-123',
    name: 'Summer Sale Campaign',
    description: 'Promote summer products',
    totalBudget: 1000,
    dailyBudget: 50,
    spentAmount: 200,
    impressions: 5000,
    clicks: 250,
    conversions: 25,
    status: CampaignStatus.ACTIVE,
    startDate: new Date('2025-06-01'),
    endDate: new Date('2025-08-31'),
    createdAt: new Date(),
    updatedAt: new Date(),
    advertisements: [],
    vendor: {
      id: 'vendor-123',
      name: 'Test Vendor',
      email: 'vendor@example.com',
    },
  };

  const mockAdvertisement = {
    id: 'ad-123',
    campaignId: 'campaign-123',
    vendorId: 'vendor-123',
    productId: 'product-123',
    type: 'BANNER',
    title: 'Summer Sale',
    description: 'Get 50% off',
    imageUrl: 'https://example.com/banner.jpg',
    targetUrl: 'https://example.com/sale',
    bidAmount: 2.5,
    dailyBudget: 25,
    spentAmount: 50,
    impressions: 1000,
    clicks: 50,
    conversions: 5,
    status: AdStatus.ACTIVE,
    targetCategories: ['cat-1'],
    targetKeywords: ['summer', 'sale'],
    targetLocations: ['US'],
    startDate: new Date('2025-06-01'),
    endDate: new Date('2025-08-31'),
    createdAt: new Date(),
    updatedAt: new Date(),
    campaign: {
      id: 'campaign-123',
      spentAmount: 200,
      totalBudget: 1000,
      status: CampaignStatus.ACTIVE,
      startDate: new Date('2025-06-01'),
      endDate: new Date('2025-08-31'),
    },
    product: {
      id: 'product-123',
      name: 'Summer T-Shirt',
      price: 29.99,
      images: ['https://example.com/tshirt.jpg'],
      slug: 'summer-tshirt',
    },
  };

  const mockProduct = {
    id: 'product-123',
    vendorId: 'vendor-123',
    name: 'Summer T-Shirt',
    price: 29.99,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvertisementsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdvertisementsService>(AdvertisementsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== CAMPAIGN MANAGEMENT ====================

  describe('createCampaign', () => {
    it('should create a new campaign', async () => {
      const dto = {
        name: 'Summer Sale Campaign',
        description: 'Promote summer products',
        totalBudget: 1000,
        dailyBudget: 50,
        startDate: '2025-06-01',
        endDate: '2025-08-31',
      };

      mockPrismaService.adCampaign.create.mockResolvedValue(mockCampaign);

      const result = await service.createCampaign('vendor-123', dto);

      expect(result).toEqual(mockCampaign);
      expect(mockPrismaService.adCampaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vendorId: 'vendor-123',
            name: dto.name,
            totalBudget: dto.totalBudget,
            status: CampaignStatus.DRAFT,
          }),
        }),
      );
    });

    it('should throw BadRequestException when end date is before start date', async () => {
      const dto = {
        name: 'Test Campaign',
        totalBudget: 1000,
        startDate: '2025-08-31',
        endDate: '2025-06-01',
      };

      await expect(
        service.createCampaign('vendor-123', dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when daily budget exceeds total budget', async () => {
      const dto = {
        name: 'Test Campaign',
        totalBudget: 100,
        dailyBudget: 200,
        startDate: '2025-06-01',
      };

      await expect(
        service.createCampaign('vendor-123', dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllCampaigns', () => {
    it('should return all campaigns for vendor', async () => {
      mockPrismaService.adCampaign.findMany.mockResolvedValue([mockCampaign]);

      const result = await service.findAllCampaigns('vendor-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockCampaign);
    });

    it('should filter campaigns by status', async () => {
      mockPrismaService.adCampaign.findMany.mockResolvedValue([mockCampaign]);

      await service.findAllCampaigns('vendor-123', {
        status: CampaignStatus.ACTIVE,
      });

      expect(mockPrismaService.adCampaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CampaignStatus.ACTIVE,
          }),
        }),
      );
    });
  });

  describe('findOneCampaign', () => {
    it('should return campaign by id', async () => {
      mockPrismaService.adCampaign.findUnique.mockResolvedValue(mockCampaign);

      const result = await service.findOneCampaign('campaign-123', 'vendor-123');

      expect(result).toEqual(mockCampaign);
    });

    it('should throw NotFoundException when campaign not found', async () => {
      mockPrismaService.adCampaign.findUnique.mockResolvedValue(null);

      await expect(
        service.findOneCampaign('invalid-id', 'vendor-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when vendor does not own campaign', async () => {
      mockPrismaService.adCampaign.findUnique.mockResolvedValue(mockCampaign);

      await expect(
        service.findOneCampaign('campaign-123', 'other-vendor'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateCampaign', () => {
    it('should update campaign', async () => {
      const dto = {
        name: 'Updated Campaign',
        totalBudget: 1500,
      };

      mockPrismaService.adCampaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.adCampaign.update.mockResolvedValue({
        ...mockCampaign,
        ...dto,
      });

      const result = await service.updateCampaign('campaign-123', 'vendor-123', dto);

      expect(result.name).toBe('Updated Campaign');
      expect(mockPrismaService.adCampaign.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when updating with invalid dates', async () => {
      const dto = {
        startDate: '2025-08-31',
        endDate: '2025-06-01',
      };

      mockPrismaService.adCampaign.findUnique.mockResolvedValue(mockCampaign);

      await expect(
        service.updateCampaign('campaign-123', 'vendor-123', dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteCampaign', () => {
    it('should delete campaign', async () => {
      mockPrismaService.adCampaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.adCampaign.delete.mockResolvedValue(mockCampaign);

      const result = await service.deleteCampaign('campaign-123', 'vendor-123');

      expect(result).toEqual(mockCampaign);
      expect(mockPrismaService.adCampaign.delete).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
      });
    });
  });

  // ==================== ADVERTISEMENT MANAGEMENT ====================

  describe('createAdvertisement', () => {
    it('should create a new advertisement', async () => {
      const dto = {
        campaignId: 'campaign-123',
        productId: 'product-123',
        type: 'BANNER' as any,
        title: 'Summer Sale',
        description: 'Get 50% off',
        imageUrl: 'https://example.com/banner.jpg',
        targetUrl: 'https://example.com/sale',
        bidAmount: 2.5,
        dailyBudget: 25,
        targetCategories: ['cat-1'],
        targetKeywords: ['summer', 'sale'],
        startDate: '2025-06-01',
        endDate: '2025-08-31',
      };

      mockPrismaService.adCampaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.advertisement.create.mockResolvedValue(mockAdvertisement);

      const result = await service.createAdvertisement('vendor-123', dto);

      expect(result).toEqual(mockAdvertisement);
      expect(mockPrismaService.advertisement.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when campaign not found', async () => {
      const dto = {
        campaignId: 'invalid-campaign',
        type: 'BANNER' as any,
        title: 'Test Ad',
        targetUrl: 'https://example.com',
        bidAmount: 2.5,
        startDate: '2025-06-01',
      };

      mockPrismaService.adCampaign.findUnique.mockResolvedValue(null);

      await expect(
        service.createAdvertisement('vendor-123', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when vendor does not own campaign', async () => {
      const dto = {
        campaignId: 'campaign-123',
        type: 'BANNER' as any,
        title: 'Test Ad',
        targetUrl: 'https://example.com',
        bidAmount: 2.5,
        startDate: '2025-06-01',
      };

      mockPrismaService.adCampaign.findUnique.mockResolvedValue(mockCampaign);

      await expect(
        service.createAdvertisement('other-vendor', dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when product not found', async () => {
      const dto = {
        campaignId: 'campaign-123',
        productId: 'invalid-product',
        type: 'BANNER' as any,
        title: 'Test Ad',
        targetUrl: 'https://example.com',
        bidAmount: 2.5,
        startDate: '2025-06-01',
      };

      mockPrismaService.adCampaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(
        service.createAdvertisement('vendor-123', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when vendor does not own product', async () => {
      const dto = {
        campaignId: 'campaign-123',
        productId: 'product-123',
        type: 'BANNER' as any,
        title: 'Test Ad',
        targetUrl: 'https://example.com',
        bidAmount: 2.5,
        startDate: '2025-06-01',
      };

      mockPrismaService.adCampaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.product.findUnique.mockResolvedValue({
        ...mockProduct,
        vendorId: 'other-vendor',
      });

      await expect(
        service.createAdvertisement('vendor-123', dto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAllAdvertisements', () => {
    it('should return all advertisements for vendor', async () => {
      mockPrismaService.advertisement.findMany.mockResolvedValue([
        mockAdvertisement,
      ]);

      const result = await service.findAllAdvertisements('vendor-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockAdvertisement);
    });

    it('should filter advertisements by status, type, and campaign', async () => {
      mockPrismaService.advertisement.findMany.mockResolvedValue([]);

      await service.findAllAdvertisements('vendor-123', {
        status: AdStatus.ACTIVE,
        type: 'BANNER' as any,
        campaignId: 'campaign-123',
      });

      expect(mockPrismaService.advertisement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: AdStatus.ACTIVE,
            type: 'BANNER',
            campaignId: 'campaign-123',
          }),
        }),
      );
    });
  });

  describe('findOneAdvertisement', () => {
    it('should return advertisement by id', async () => {
      mockPrismaService.advertisement.findUnique.mockResolvedValue(
        mockAdvertisement,
      );

      const result = await service.findOneAdvertisement('ad-123', 'vendor-123');

      expect(result).toEqual(mockAdvertisement);
    });

    it('should throw NotFoundException when advertisement not found', async () => {
      mockPrismaService.advertisement.findUnique.mockResolvedValue(null);

      await expect(
        service.findOneAdvertisement('invalid-id', 'vendor-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when vendor does not own advertisement', async () => {
      mockPrismaService.advertisement.findUnique.mockResolvedValue(
        mockAdvertisement,
      );

      await expect(
        service.findOneAdvertisement('ad-123', 'other-vendor'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateAdvertisement', () => {
    it('should update advertisement', async () => {
      const dto = {
        title: 'Updated Ad Title',
        bidAmount: 3.0,
      };

      mockPrismaService.advertisement.findUnique.mockResolvedValue(
        mockAdvertisement,
      );
      mockPrismaService.advertisement.update.mockResolvedValue({
        ...mockAdvertisement,
        ...dto,
      });

      const result = await service.updateAdvertisement('ad-123', 'vendor-123', dto);

      expect(result.title).toBe('Updated Ad Title');
      expect(mockPrismaService.advertisement.update).toHaveBeenCalled();
    });
  });

  describe('deleteAdvertisement', () => {
    it('should delete advertisement', async () => {
      mockPrismaService.advertisement.findUnique.mockResolvedValue(
        mockAdvertisement,
      );
      mockPrismaService.advertisement.delete.mockResolvedValue(mockAdvertisement);

      const result = await service.deleteAdvertisement('ad-123', 'vendor-123');

      expect(result).toEqual(mockAdvertisement);
      expect(mockPrismaService.advertisement.delete).toHaveBeenCalledWith({
        where: { id: 'ad-123' },
      });
    });
  });

  // ==================== AD SERVING & SELECTION ====================

  describe('getAdsForDisplay', () => {
    it('should return eligible ads for display', async () => {
      mockPrismaService.advertisement.findMany.mockResolvedValue([
        mockAdvertisement,
      ]);
      mockPrismaService.adClick.aggregate.mockResolvedValue({
        _sum: { cost: 10 },
      });

      const result = await service.getAdsForDisplay({
        placement: 'homepage',
        limit: 5,
      });

      expect(result).toBeDefined();
      expect(mockPrismaService.advertisement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: AdStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should filter ads by category', async () => {
      mockPrismaService.advertisement.findMany.mockResolvedValue([]);

      await service.getAdsForDisplay({
        categoryId: 'cat-1',
        limit: 5,
      });

      expect(mockPrismaService.advertisement.findMany).toHaveBeenCalled();
    });

    it('should filter ads by keywords', async () => {
      mockPrismaService.advertisement.findMany.mockResolvedValue([]);

      await service.getAdsForDisplay({
        keywords: ['summer', 'sale'],
        limit: 5,
      });

      expect(mockPrismaService.advertisement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            targetKeywords: { hasSome: ['summer', 'sale'] },
          }),
        }),
      );
    });

    it('should filter out ads that exceeded campaign budget', async () => {
      const overBudgetAd = {
        ...mockAdvertisement,
        campaign: {
          ...mockAdvertisement.campaign,
          spentAmount: 1000,
          totalBudget: 1000,
        },
      };

      mockPrismaService.advertisement.findMany.mockResolvedValue([
        overBudgetAd,
      ]);

      const result = await service.getAdsForDisplay({ limit: 5 });

      expect(result).toHaveLength(0);
    });

    it('should filter out ads that exceeded daily budget', async () => {
      mockPrismaService.advertisement.findMany.mockResolvedValue([
        mockAdvertisement,
      ]);
      mockPrismaService.adClick.aggregate.mockResolvedValue({
        _sum: { cost: 30 }, // Exceeds dailyBudget of 25
      });

      const result = await service.getAdsForDisplay({ limit: 5 });

      expect(result).toHaveLength(0);
    });
  });

  // ==================== TRACKING & ANALYTICS ====================

  describe('trackImpression', () => {
    it('should track ad impression', async () => {
      mockPrismaService.advertisement.findUnique.mockResolvedValue(
        mockAdvertisement,
      );
      mockPrismaService.adImpression.create.mockResolvedValue({});
      mockPrismaService.advertisement.update.mockResolvedValue(mockAdvertisement);
      mockPrismaService.adCampaign.update.mockResolvedValue(mockCampaign);

      const result = await service.trackImpression({
        adId: 'ad-123',
        userId: 'user-123',
        placement: 'homepage',
      });

      expect(result.success).toBe(true);
      expect(mockPrismaService.adImpression.create).toHaveBeenCalled();
      expect(mockPrismaService.advertisement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { impressions: { increment: 1 } },
        }),
      );
    });

    it('should throw NotFoundException when ad not found', async () => {
      mockPrismaService.advertisement.findUnique.mockResolvedValue(null);

      await expect(
        service.trackImpression({ adId: 'invalid-id', placement: 'homepage' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('trackClick', () => {
    it('should track ad click and deduct budget', async () => {
      mockPrismaService.advertisement.findUnique.mockResolvedValue(
        mockAdvertisement,
      );
      mockPrismaService.adClick.create.mockResolvedValue({});
      mockPrismaService.advertisement.update.mockResolvedValue(mockAdvertisement);
      mockPrismaService.adCampaign.update.mockResolvedValue(mockCampaign);

      const result = await service.trackClick({
        adId: 'ad-123',
        userId: 'user-123',
        placement: 'homepage',
      });

      expect(result.success).toBe(true);
      expect(result.cost).toBe(2.5); // mockAdvertisement.bidAmount
      expect(mockPrismaService.adClick.create).toHaveBeenCalled();
      expect(mockPrismaService.advertisement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clicks: { increment: 1 },
            spentAmount: { increment: 2.5 },
          }),
        }),
      );
    });

    it('should throw BadRequestException when campaign budget exceeded', async () => {
      const adNearBudget = {
        ...mockAdvertisement,
        campaign: {
          ...mockAdvertisement.campaign,
          spentAmount: 998,
          totalBudget: 1000,
        },
      };

      mockPrismaService.advertisement.findUnique.mockResolvedValue(adNearBudget);
      mockPrismaService.advertisement.update.mockResolvedValue(adNearBudget);

      await expect(
        service.trackClick({ adId: 'ad-123', placement: 'homepage' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAdPerformance', () => {
    it('should return ad performance metrics', async () => {
      mockPrismaService.advertisement.findUnique.mockResolvedValue(
        mockAdvertisement,
      );
      mockPrismaService.adImpression.groupBy.mockResolvedValue([]);
      mockPrismaService.adClick.groupBy.mockResolvedValue([]);

      const result = await service.getAdPerformance('ad-123', 'vendor-123');

      expect(result).toBeDefined();
      expect(result.metrics.impressions).toBe(1000);
      expect(result.metrics.clicks).toBe(50);
      expect(result.metrics.ctr).toBe(5); // (50/1000) * 100
      expect(result.metrics.cpc).toBe(1); // 50/50
    });
  });

  describe('getCampaignPerformance', () => {
    it('should return campaign performance metrics', async () => {
      const campaignWithAds = {
        ...mockCampaign,
        advertisements: [mockAdvertisement],
      };

      mockPrismaService.adCampaign.findUnique.mockResolvedValue(
        campaignWithAds,
      );

      const result = await service.getCampaignPerformance(
        'campaign-123',
        'vendor-123',
      );

      expect(result).toBeDefined();
      expect(result.metrics.impressions).toBe(5000);
      expect(result.metrics.clicks).toBe(250);
      expect(result.metrics.ctr).toBe(5); // (250/5000) * 100
      expect(result.metrics.remainingBudget).toBe(800); // 1000 - 200
      expect(result.advertisements).toHaveLength(1);
    });
  });
});
