import { Test, TestingModule } from '@nestjs/testing';
import { AdvertisementsController } from './advertisements.controller';
import { AdvertisementsService } from './advertisements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BadRequestException } from '@nestjs/common';

describe('AdvertisementsController', () => {
  let controller: AdvertisementsController;
  let service: AdvertisementsService;

  const mockAdvertisementsService = {
    createCampaign: jest.fn(),
    findAllCampaigns: jest.fn(),
    findOneCampaign: jest.fn(),
    updateCampaign: jest.fn(),
    deleteCampaign: jest.fn(),
    getCampaignPerformance: jest.fn(),
    createAdvertisement: jest.fn(),
    findAllAdvertisements: jest.fn(),
    findOneAdvertisement: jest.fn(),
    updateAdvertisement: jest.fn(),
    deleteAdvertisement: jest.fn(),
    getAdPerformance: jest.fn(),
    getAdsForDisplay: jest.fn(),
    trackImpression: jest.fn(),
    trackClick: jest.fn(),
  };

  const mockVendorUser = {
    id: 'vendor-123',
    email: 'vendor@example.com',
    role: 'VENDOR',
  };

  const mockCustomerUser = {
    id: 'customer-123',
    email: 'customer@example.com',
    role: 'CUSTOMER',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdvertisementsController],
      providers: [
        {
          provide: AdvertisementsService,
          useValue: mockAdvertisementsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockVendorUser;
          return true;
        },
      })
      .compile();

    controller = module.get<AdvertisementsController>(AdvertisementsController);
    service = module.get<AdvertisementsService>(AdvertisementsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================
  // CAMPAIGN ENDPOINTS (Vendor Only)
  // ============================================

  describe('createCampaign', () => {
    it('should create campaign for vendor', async () => {
      const mockRequest = { user: mockVendorUser };
      const dto = {
        name: 'Summer Sale Campaign',
        budget: 1000,
        startDate: new Date(),
        endDate: new Date(),
      };
      const mockCampaign = { id: 'campaign-123', vendorId: 'vendor-123', ...dto };

      mockAdvertisementsService.createCampaign.mockResolvedValue(mockCampaign);

      const result = await controller.createCampaign(mockRequest as any, dto);

      expect(result).toEqual(mockCampaign);
      expect(mockAdvertisementsService.createCampaign).toHaveBeenCalledWith('vendor-123', dto);
    });

    it('should throw error if user is not vendor or admin', async () => {
      const mockRequest = { user: mockCustomerUser };
      const dto = { name: 'Campaign', budget: 1000 };

      try {
        await controller.createCampaign(mockRequest as any, dto);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Only vendors can create advertising campaigns');
      }
      expect(mockAdvertisementsService.createCampaign).not.toHaveBeenCalled();
    });
  });

  describe('findAllCampaigns', () => {
    it('should return all campaigns for vendor', async () => {
      const mockRequest = { user: mockVendorUser };
      const query = { status: 'ACTIVE', page: 1, limit: 10 };
      const mockCampaigns = [
        { id: 'campaign-1', name: 'Campaign 1' },
        { id: 'campaign-2', name: 'Campaign 2' },
      ];

      mockAdvertisementsService.findAllCampaigns.mockResolvedValue(mockCampaigns);

      const result = await controller.findAllCampaigns(mockRequest as any, query);

      expect(result).toEqual(mockCampaigns);
      expect(mockAdvertisementsService.findAllCampaigns).toHaveBeenCalledWith('vendor-123', query);
    });

    it('should throw error if user is not vendor or admin', async () => {
      const mockRequest = { user: mockCustomerUser };
      const query = {};

      try {
        await controller.findAllCampaigns(mockRequest as any, query);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Only vendors can access campaigns');
      }
      expect(mockAdvertisementsService.findAllCampaigns).not.toHaveBeenCalled();
    });
  });

  describe('findOneCampaign', () => {
    it('should return campaign by ID', async () => {
      const mockRequest = { user: mockVendorUser };
      const mockCampaign = { id: 'campaign-123', name: 'Summer Sale' };

      mockAdvertisementsService.findOneCampaign.mockResolvedValue(mockCampaign);

      const result = await controller.findOneCampaign('campaign-123', mockRequest as any);

      expect(result).toEqual(mockCampaign);
      expect(mockAdvertisementsService.findOneCampaign).toHaveBeenCalledWith(
        'campaign-123',
        'vendor-123'
      );
    });
  });

  describe('updateCampaign', () => {
    it('should update campaign', async () => {
      const mockRequest = { user: mockVendorUser };
      const dto = { name: 'Updated Campaign', budget: 1500 };
      const mockCampaign = { id: 'campaign-123', ...dto };

      mockAdvertisementsService.updateCampaign.mockResolvedValue(mockCampaign);

      const result = await controller.updateCampaign('campaign-123', mockRequest as any, dto);

      expect(result).toEqual(mockCampaign);
      expect(mockAdvertisementsService.updateCampaign).toHaveBeenCalledWith(
        'campaign-123',
        'vendor-123',
        dto
      );
    });
  });

  describe('deleteCampaign', () => {
    it('should delete campaign', async () => {
      const mockRequest = { user: mockVendorUser };
      const mockResult = { success: true };

      mockAdvertisementsService.deleteCampaign.mockResolvedValue(mockResult);

      const result = await controller.deleteCampaign('campaign-123', mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockAdvertisementsService.deleteCampaign).toHaveBeenCalledWith(
        'campaign-123',
        'vendor-123'
      );
    });
  });

  describe('getCampaignPerformance', () => {
    it('should return campaign performance analytics', async () => {
      const mockRequest = { user: mockVendorUser };
      const mockPerformance = {
        impressions: 10000,
        clicks: 500,
        conversions: 50,
        spend: 800,
        revenue: 2500,
      };

      mockAdvertisementsService.getCampaignPerformance.mockResolvedValue(mockPerformance);

      const result = await controller.getCampaignPerformance('campaign-123', mockRequest as any);

      expect(result).toEqual(mockPerformance);
      expect(mockAdvertisementsService.getCampaignPerformance).toHaveBeenCalledWith(
        'campaign-123',
        'vendor-123'
      );
    });
  });

  // ============================================
  // ADVERTISEMENT ENDPOINTS (Vendor Only)
  // ============================================

  describe('createAdvertisement', () => {
    it('should create advertisement for vendor', async () => {
      const mockRequest = { user: mockVendorUser };
      const dto = {
        campaignId: 'campaign-123',
        title: 'Summer Sale Ad',
        imageUrl: 'https://example.com/ad.jpg',
        targetUrl: 'https://example.com/sale',
      };
      const mockAd = { id: 'ad-123', vendorId: 'vendor-123', ...dto };

      mockAdvertisementsService.createAdvertisement.mockResolvedValue(mockAd);

      const result = await controller.createAdvertisement(mockRequest as any, dto);

      expect(result).toEqual(mockAd);
      expect(mockAdvertisementsService.createAdvertisement).toHaveBeenCalledWith('vendor-123', dto);
    });

    it('should throw error if user is not vendor or admin', async () => {
      const mockRequest = { user: mockCustomerUser };
      const dto = { campaignId: 'campaign-123', title: 'Ad' };

      try {
        await controller.createAdvertisement(mockRequest as any, dto);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Only vendors can create advertisements');
      }
      expect(mockAdvertisementsService.createAdvertisement).not.toHaveBeenCalled();
    });
  });

  describe('findAllAdvertisements', () => {
    it('should return all advertisements for vendor', async () => {
      const mockRequest = { user: mockVendorUser };
      const query = { campaignId: 'campaign-123', status: 'ACTIVE' };
      const mockAds = [
        { id: 'ad-1', title: 'Ad 1' },
        { id: 'ad-2', title: 'Ad 2' },
      ];

      mockAdvertisementsService.findAllAdvertisements.mockResolvedValue(mockAds);

      const result = await controller.findAllAdvertisements(mockRequest as any, query);

      expect(result).toEqual(mockAds);
      expect(mockAdvertisementsService.findAllAdvertisements).toHaveBeenCalledWith(
        'vendor-123',
        query
      );
    });

    it('should throw error if user is not vendor or admin', async () => {
      const mockRequest = { user: mockCustomerUser };
      const query = {};

      try {
        await controller.findAllAdvertisements(mockRequest as any, query);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Only vendors can access advertisements');
      }
      expect(mockAdvertisementsService.findAllAdvertisements).not.toHaveBeenCalled();
    });
  });

  describe('findOneAdvertisement', () => {
    it('should return advertisement by ID', async () => {
      const mockRequest = { user: mockVendorUser };
      const mockAd = { id: 'ad-123', title: 'Summer Sale Ad' };

      mockAdvertisementsService.findOneAdvertisement.mockResolvedValue(mockAd);

      const result = await controller.findOneAdvertisement('ad-123', mockRequest as any);

      expect(result).toEqual(mockAd);
      expect(mockAdvertisementsService.findOneAdvertisement).toHaveBeenCalledWith(
        'ad-123',
        'vendor-123'
      );
    });
  });

  describe('updateAdvertisement', () => {
    it('should update advertisement', async () => {
      const mockRequest = { user: mockVendorUser };
      const dto = { title: 'Updated Ad', imageUrl: 'https://example.com/new-ad.jpg' };
      const mockAd = { id: 'ad-123', ...dto };

      mockAdvertisementsService.updateAdvertisement.mockResolvedValue(mockAd);

      const result = await controller.updateAdvertisement('ad-123', mockRequest as any, dto);

      expect(result).toEqual(mockAd);
      expect(mockAdvertisementsService.updateAdvertisement).toHaveBeenCalledWith(
        'ad-123',
        'vendor-123',
        dto
      );
    });
  });

  describe('deleteAdvertisement', () => {
    it('should delete advertisement', async () => {
      const mockRequest = { user: mockVendorUser };
      const mockResult = { success: true };

      mockAdvertisementsService.deleteAdvertisement.mockResolvedValue(mockResult);

      const result = await controller.deleteAdvertisement('ad-123', mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockAdvertisementsService.deleteAdvertisement).toHaveBeenCalledWith(
        'ad-123',
        'vendor-123'
      );
    });
  });

  describe('getAdPerformance', () => {
    it('should return advertisement performance analytics', async () => {
      const mockRequest = { user: mockVendorUser };
      const mockPerformance = {
        impressions: 5000,
        clicks: 250,
        ctr: 0.05,
        conversions: 25,
      };

      mockAdvertisementsService.getAdPerformance.mockResolvedValue(mockPerformance);

      const result = await controller.getAdPerformance('ad-123', mockRequest as any);

      expect(result).toEqual(mockPerformance);
      expect(mockAdvertisementsService.getAdPerformance).toHaveBeenCalledWith(
        'ad-123',
        'vendor-123'
      );
    });
  });

  // ============================================
  // PUBLIC ENDPOINTS (Ad Serving & Tracking)
  // ============================================

  describe('getAdsForDisplay', () => {
    it('should return ads to display with default parameters', async () => {
      const mockAds = [
        { id: 'ad-1', title: 'Ad 1', imageUrl: 'https://example.com/ad1.jpg' },
        { id: 'ad-2', title: 'Ad 2', imageUrl: 'https://example.com/ad2.jpg' },
      ];

      mockAdvertisementsService.getAdsForDisplay.mockResolvedValue(mockAds);

      const result = await controller.getAdsForDisplay(undefined, undefined, undefined, undefined);

      expect(result).toEqual(mockAds);
      expect(mockAdvertisementsService.getAdsForDisplay).toHaveBeenCalledWith({
        placement: undefined,
        categoryId: undefined,
        keywords: [],
        limit: 5,
      });
    });

    it('should return ads with placement and category filters', async () => {
      const mockAds = [{ id: 'ad-1', title: 'Ad 1' }];

      mockAdvertisementsService.getAdsForDisplay.mockResolvedValue(mockAds);

      const result = await controller.getAdsForDisplay('sidebar', 'cat-123', undefined, undefined);

      expect(result).toEqual(mockAds);
      expect(mockAdvertisementsService.getAdsForDisplay).toHaveBeenCalledWith({
        placement: 'sidebar',
        categoryId: 'cat-123',
        keywords: [],
        limit: 5,
      });
    });

    it('should parse keywords from comma-separated string', async () => {
      const mockAds = [{ id: 'ad-1', title: 'Ad 1' }];

      mockAdvertisementsService.getAdsForDisplay.mockResolvedValue(mockAds);

      const result = await controller.getAdsForDisplay(
        undefined,
        undefined,
        'laptop, computer, electronics',
        undefined
      );

      expect(result).toEqual(mockAds);
      expect(mockAdvertisementsService.getAdsForDisplay).toHaveBeenCalledWith({
        placement: undefined,
        categoryId: undefined,
        keywords: ['laptop', 'computer', 'electronics'],
        limit: 5,
      });
    });

    it('should parse custom limit', async () => {
      const mockAds = [{ id: 'ad-1', title: 'Ad 1' }];

      mockAdvertisementsService.getAdsForDisplay.mockResolvedValue(mockAds);

      const result = await controller.getAdsForDisplay(undefined, undefined, undefined, '10');

      expect(result).toEqual(mockAds);
      expect(mockAdvertisementsService.getAdsForDisplay).toHaveBeenCalledWith({
        placement: undefined,
        categoryId: undefined,
        keywords: [],
        limit: 10,
      });
    });
  });

  describe('trackImpression', () => {
    it('should track ad impression with IP and user agent', async () => {
      const dto = { adId: 'ad-123', sessionId: 'session-456' };
      const ip = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';
      const mockResult = { success: true, impressionId: 'impression-123' };

      mockAdvertisementsService.trackImpression.mockResolvedValue(mockResult);

      const result = await controller.trackImpression(dto, ip, userAgent);

      expect(result).toEqual(mockResult);
      expect(mockAdvertisementsService.trackImpression).toHaveBeenCalledWith(dto, ip, userAgent);
    });

    it('should track impression without user agent', async () => {
      const dto = { adId: 'ad-123', sessionId: 'session-456' };
      const ip = '192.168.1.1';
      const mockResult = { success: true, impressionId: 'impression-123' };

      mockAdvertisementsService.trackImpression.mockResolvedValue(mockResult);

      const result = await controller.trackImpression(dto, ip, undefined);

      expect(result).toEqual(mockResult);
      expect(mockAdvertisementsService.trackImpression).toHaveBeenCalledWith(dto, ip, undefined);
    });
  });

  describe('trackClick', () => {
    it('should track ad click with IP and user agent', async () => {
      const dto = { adId: 'ad-123', sessionId: 'session-456' };
      const ip = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';
      const mockResult = { success: true, clickId: 'click-123' };

      mockAdvertisementsService.trackClick.mockResolvedValue(mockResult);

      const result = await controller.trackClick(dto, ip, userAgent);

      expect(result).toEqual(mockResult);
      expect(mockAdvertisementsService.trackClick).toHaveBeenCalledWith(dto, ip, userAgent);
    });

    it('should track click without user agent', async () => {
      const dto = { adId: 'ad-123', sessionId: 'session-456' };
      const ip = '192.168.1.1';
      const mockResult = { success: true, clickId: 'click-123' };

      mockAdvertisementsService.trackClick.mockResolvedValue(mockResult);

      const result = await controller.trackClick(dto, ip, undefined);

      expect(result).toEqual(mockResult);
      expect(mockAdvertisementsService.trackClick).toHaveBeenCalledWith(dto, ip, undefined);
    });
  });
});
