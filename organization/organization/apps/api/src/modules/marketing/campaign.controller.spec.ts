import { Test, TestingModule } from '@nestjs/testing';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CampaignType, CampaignStatus } from './dto/campaign.dto';

describe('CampaignController', () => {
  let controller: CampaignController;
  let service: CampaignService;

  const mockCampaignService = {
    createCampaign: jest.fn(),
    getCampaigns: jest.fn(),
    getCampaignById: jest.fn(),
    updateCampaign: jest.fn(),
    deleteCampaign: jest.fn(),
    startCampaign: jest.fn(),
    pauseCampaign: jest.fn(),
    getCampaignMetrics: jest.fn(),
    trackCampaignEvent: jest.fn(),
    getCampaignsByRegion: jest.fn(),
  };

  const mockCampaign = {
    id: 'campaign-123',
    name: 'Summer Sale Campaign',
    description: 'Amazing summer deals',
    type: CampaignType.EMAIL,
    status: CampaignStatus.DRAFT,
    organizationId: 'org-123',
    targeting: { regions: ['US', 'CA'] },
    startDate: new Date('2024-06-01'),
    endDate: new Date('2024-08-31'),
    budget: 10000,
    currency: 'USD',
    content: { subject: 'Summer Sale!', body: 'Check out our deals' },
    tags: ['summer', 'sale'],
    metrics: {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
      revenue: 0,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampaignController],
      providers: [
        {
          provide: CampaignService,
          useValue: mockCampaignService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<CampaignController>(CampaignController);
    service = module.get<CampaignService>(CampaignService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createCampaign', () => {
    it('should create a new campaign', async () => {
      const createDto = {
        name: 'Summer Sale Campaign',
        description: 'Amazing summer deals',
        type: CampaignType.EMAIL,
        organizationId: 'org-123',
        targeting: { regions: ['US', 'CA'] },
        startDate: '2024-06-01',
        endDate: '2024-08-31',
        budget: 10000,
        currency: 'USD',
        tags: ['summer', 'sale'],
      };

      mockCampaignService.createCampaign.mockResolvedValue(mockCampaign);

      const result = await controller.createCampaign(createDto);

      expect(result).toEqual(mockCampaign);
      expect(mockCampaignService.createCampaign).toHaveBeenCalledWith(createDto);
    });
  });

  describe('getCampaigns', () => {
    it('should return all campaigns without filters', async () => {
      const mockCampaigns = [mockCampaign];
      mockCampaignService.getCampaigns.mockResolvedValue(mockCampaigns);

      const result = await controller.getCampaigns();

      expect(result).toEqual(mockCampaigns);
      expect(mockCampaignService.getCampaigns).toHaveBeenCalledWith({
        organizationId: undefined,
        status: undefined,
        type: undefined,
        region: undefined,
      });
    });

    it('should return campaigns with organization filter', async () => {
      const mockCampaigns = [mockCampaign];
      mockCampaignService.getCampaigns.mockResolvedValue(mockCampaigns);

      const result = await controller.getCampaigns('org-123');

      expect(result).toEqual(mockCampaigns);
      expect(mockCampaignService.getCampaigns).toHaveBeenCalledWith({
        organizationId: 'org-123',
        status: undefined,
        type: undefined,
        region: undefined,
      });
    });

    it('should return campaigns with status filter', async () => {
      const mockCampaigns = [mockCampaign];
      mockCampaignService.getCampaigns.mockResolvedValue(mockCampaigns);

      const result = await controller.getCampaigns(undefined, CampaignStatus.RUNNING);

      expect(result).toEqual(mockCampaigns);
      expect(mockCampaignService.getCampaigns).toHaveBeenCalledWith({
        organizationId: undefined,
        status: CampaignStatus.RUNNING,
        type: undefined,
        region: undefined,
      });
    });

    it('should return campaigns with type filter', async () => {
      const mockCampaigns = [mockCampaign];
      mockCampaignService.getCampaigns.mockResolvedValue(mockCampaigns);

      const result = await controller.getCampaigns(undefined, undefined, 'EMAIL');

      expect(result).toEqual(mockCampaigns);
      expect(mockCampaignService.getCampaigns).toHaveBeenCalledWith({
        organizationId: undefined,
        status: undefined,
        type: 'EMAIL',
        region: undefined,
      });
    });

    it('should return campaigns with region filter', async () => {
      const mockCampaigns = [mockCampaign];
      mockCampaignService.getCampaigns.mockResolvedValue(mockCampaigns);

      const result = await controller.getCampaigns(undefined, undefined, undefined, 'US');

      expect(result).toEqual(mockCampaigns);
      expect(mockCampaignService.getCampaigns).toHaveBeenCalledWith({
        organizationId: undefined,
        status: undefined,
        type: undefined,
        region: 'US',
      });
    });

    it('should return campaigns with multiple filters', async () => {
      const mockCampaigns = [mockCampaign];
      mockCampaignService.getCampaigns.mockResolvedValue(mockCampaigns);

      const result = await controller.getCampaigns('org-123', CampaignStatus.RUNNING, 'EMAIL', 'US');

      expect(result).toEqual(mockCampaigns);
      expect(mockCampaignService.getCampaigns).toHaveBeenCalledWith({
        organizationId: 'org-123',
        status: CampaignStatus.RUNNING,
        type: 'EMAIL',
        region: 'US',
      });
    });

    it('should return empty array when no campaigns found', async () => {
      mockCampaignService.getCampaigns.mockResolvedValue([]);

      const result = await controller.getCampaigns();

      expect(result).toEqual([]);
    });
  });

  describe('getCampaignById', () => {
    it('should return a campaign by id', async () => {
      mockCampaignService.getCampaignById.mockResolvedValue(mockCampaign);

      const result = await controller.getCampaignById('campaign-123');

      expect(result).toEqual(mockCampaign);
      expect(mockCampaignService.getCampaignById).toHaveBeenCalledWith('campaign-123');
    });
  });

  describe('updateCampaign', () => {
    it('should update a campaign', async () => {
      const updateDto = {
        name: 'Updated Summer Sale',
        description: 'Even better deals',
        budget: 15000,
      };
      const updatedCampaign = { ...mockCampaign, ...updateDto };
      mockCampaignService.updateCampaign.mockResolvedValue(updatedCampaign);

      const result = await controller.updateCampaign('campaign-123', updateDto);

      expect(result).toEqual(updatedCampaign);
      expect(mockCampaignService.updateCampaign).toHaveBeenCalledWith('campaign-123', updateDto);
    });

    it('should update campaign status', async () => {
      const updateDto = { status: CampaignStatus.SCHEDULED };
      const updatedCampaign = { ...mockCampaign, status: CampaignStatus.SCHEDULED };
      mockCampaignService.updateCampaign.mockResolvedValue(updatedCampaign);

      const result = await controller.updateCampaign('campaign-123', updateDto);

      expect(result).toEqual(updatedCampaign);
      expect(mockCampaignService.updateCampaign).toHaveBeenCalledWith('campaign-123', updateDto);
    });
  });

  describe('deleteCampaign', () => {
    it('should delete a campaign', async () => {
      mockCampaignService.deleteCampaign.mockResolvedValue({ success: true });

      const result = await controller.deleteCampaign('campaign-123');

      expect(result).toEqual({ success: true });
      expect(mockCampaignService.deleteCampaign).toHaveBeenCalledWith('campaign-123');
    });
  });

  describe('startCampaign', () => {
    it('should start a campaign', async () => {
      const startedCampaign = { ...mockCampaign, status: CampaignStatus.RUNNING };
      mockCampaignService.startCampaign.mockResolvedValue(startedCampaign);

      const result = await controller.startCampaign('campaign-123');

      expect(result).toEqual(startedCampaign);
      expect(mockCampaignService.startCampaign).toHaveBeenCalledWith('campaign-123');
    });
  });

  describe('pauseCampaign', () => {
    it('should pause a running campaign', async () => {
      const pausedCampaign = { ...mockCampaign, status: CampaignStatus.PAUSED };
      mockCampaignService.pauseCampaign.mockResolvedValue(pausedCampaign);

      const result = await controller.pauseCampaign('campaign-123');

      expect(result).toEqual(pausedCampaign);
      expect(mockCampaignService.pauseCampaign).toHaveBeenCalledWith('campaign-123');
    });
  });

  describe('getCampaignMetrics', () => {
    it('should return campaign metrics', async () => {
      const mockMetrics = {
        campaignId: 'campaign-123',
        campaignName: 'Summer Sale Campaign',
        status: CampaignStatus.RUNNING,
        budget: 10000,
        spend: 5000,
        impressions: 100000,
        clicks: 5000,
        conversions: 500,
        revenue: 25000,
        ctr: 5,
        cpc: 1,
        cpa: 10,
        roi: 400,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-08-31'),
      };
      mockCampaignService.getCampaignMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getCampaignMetrics('campaign-123');

      expect(result).toEqual(mockMetrics);
      expect(mockCampaignService.getCampaignMetrics).toHaveBeenCalledWith({ campaignId: 'campaign-123' });
    });
  });

  describe('trackEvent', () => {
    it('should track impression event', async () => {
      const event = { type: 'impression' as const };
      mockCampaignService.trackCampaignEvent.mockResolvedValue({ success: true });

      const result = await controller.trackEvent('campaign-123', event);

      expect(result).toEqual({ success: true });
      expect(mockCampaignService.trackCampaignEvent).toHaveBeenCalledWith('campaign-123', event);
    });

    it('should track click event', async () => {
      const event = { type: 'click' as const };
      mockCampaignService.trackCampaignEvent.mockResolvedValue({ success: true });

      const result = await controller.trackEvent('campaign-123', event);

      expect(result).toEqual({ success: true });
      expect(mockCampaignService.trackCampaignEvent).toHaveBeenCalledWith('campaign-123', event);
    });

    it('should track conversion event with value', async () => {
      const event = {
        type: 'conversion' as const,
        value: 150,
        metadata: { productId: 'prod-123' },
      };
      mockCampaignService.trackCampaignEvent.mockResolvedValue({ success: true });

      const result = await controller.trackEvent('campaign-123', event);

      expect(result).toEqual({ success: true });
      expect(mockCampaignService.trackCampaignEvent).toHaveBeenCalledWith('campaign-123', event);
    });
  });

  describe('getCampaignsByRegion', () => {
    it('should return campaigns by region', async () => {
      const mockCampaigns = [mockCampaign];
      mockCampaignService.getCampaignsByRegion.mockResolvedValue(mockCampaigns);

      const result = await controller.getCampaignsByRegion('US');

      expect(result).toEqual(mockCampaigns);
      expect(mockCampaignService.getCampaignsByRegion).toHaveBeenCalledWith('US');
    });

    it('should return empty array for region with no campaigns', async () => {
      mockCampaignService.getCampaignsByRegion.mockResolvedValue([]);

      const result = await controller.getCampaignsByRegion('JP');

      expect(result).toEqual([]);
      expect(mockCampaignService.getCampaignsByRegion).toHaveBeenCalledWith('JP');
    });
  });
});
