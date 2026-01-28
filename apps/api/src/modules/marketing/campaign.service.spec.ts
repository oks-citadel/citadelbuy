import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CampaignType, CampaignStatus } from './dto/campaign.dto';

describe('CampaignService', () => {
  let service: CampaignService;
  let prisma: PrismaService;

  const mockPrismaService = {
    marketingCampaign: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
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
    organization: {
      id: 'org-123',
      name: 'Test Organization',
      slug: 'test-org',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CampaignService>(CampaignService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCampaign', () => {
    it('should create a new campaign successfully', async () => {
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

      mockPrismaService.marketingCampaign.create.mockResolvedValue(mockCampaign);

      const result = await service.createCampaign(createDto);

      expect(result).toEqual(mockCampaign);
      expect(mockPrismaService.marketingCampaign.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          description: createDto.description,
          type: createDto.type,
          status: CampaignStatus.DRAFT,
          organizationId: createDto.organizationId,
          targeting: createDto.targeting,
          startDate: new Date(createDto.startDate),
          endDate: new Date(createDto.endDate),
          budget: createDto.budget,
          currency: createDto.currency,
          content: undefined,
          tags: createDto.tags,
          metrics: {
            impressions: 0,
            clicks: 0,
            conversions: 0,
            spend: 0,
            revenue: 0,
          },
        },
      });
    });

    it('should create campaign with default currency USD', async () => {
      const createDto = {
        name: 'Campaign',
        description: 'Test',
        type: CampaignType.EMAIL,
      };

      mockPrismaService.marketingCampaign.create.mockResolvedValue(mockCampaign);

      await service.createCampaign(createDto);

      expect(mockPrismaService.marketingCampaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currency: 'USD',
          }),
        })
      );
    });

    it('should throw BadRequestException on creation failure', async () => {
      const createDto = {
        name: 'Campaign',
        description: 'Test',
        type: CampaignType.EMAIL,
      };

      mockPrismaService.marketingCampaign.create.mockRejectedValue(new Error('Database error'));

      await expect(service.createCampaign(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCampaigns', () => {
    it('should return all campaigns without filters', async () => {
      const mockCampaigns = [mockCampaign];
      mockPrismaService.marketingCampaign.findMany.mockResolvedValue(mockCampaigns);

      const result = await service.getCampaigns();

      expect(result).toEqual(mockCampaigns);
      expect(mockPrismaService.marketingCampaign.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    });

    it('should return campaigns filtered by organizationId', async () => {
      mockPrismaService.marketingCampaign.findMany.mockResolvedValue([mockCampaign]);

      await service.getCampaigns({ organizationId: 'org-123' });

      expect(mockPrismaService.marketingCampaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-123',
          }),
        })
      );
    });

    it('should return campaigns filtered by status', async () => {
      mockPrismaService.marketingCampaign.findMany.mockResolvedValue([]);

      await service.getCampaigns({ status: CampaignStatus.RUNNING });

      expect(mockPrismaService.marketingCampaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CampaignStatus.RUNNING,
          }),
        })
      );
    });

    it('should return campaigns filtered by type', async () => {
      mockPrismaService.marketingCampaign.findMany.mockResolvedValue([]);

      await service.getCampaigns({ type: 'EMAIL' });

      expect(mockPrismaService.marketingCampaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'EMAIL',
          }),
        })
      );
    });

    it('should return campaigns filtered by region', async () => {
      mockPrismaService.marketingCampaign.findMany.mockResolvedValue([mockCampaign]);

      await service.getCampaigns({ region: 'US' });

      expect(mockPrismaService.marketingCampaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            targeting: {
              path: ['regions'],
              array_contains: 'US',
            },
          }),
        })
      );
    });

    it('should return empty array when no campaigns found', async () => {
      mockPrismaService.marketingCampaign.findMany.mockResolvedValue([]);

      const result = await service.getCampaigns();

      expect(result).toEqual([]);
    });
  });

  describe('getCampaignById', () => {
    it('should return a campaign by id', async () => {
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(mockCampaign);

      const result = await service.getCampaignById('campaign-123');

      expect(result).toEqual(mockCampaign);
      expect(mockPrismaService.marketingCampaign.findUnique).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
        include: {
          organization: true,
        },
      });
    });

    it('should throw NotFoundException when campaign not found', async () => {
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(null);

      await expect(service.getCampaignById('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.getCampaignById('non-existent')).rejects.toThrow('Campaign non-existent not found');
    });
  });

  describe('updateCampaign', () => {
    it('should update a campaign successfully', async () => {
      const updateDto = {
        name: 'Updated Campaign',
        description: 'Updated description',
        budget: 15000,
      };
      const updatedCampaign = { ...mockCampaign, ...updateDto };

      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.marketingCampaign.update.mockResolvedValue(updatedCampaign);

      const result = await service.updateCampaign('campaign-123', updateDto);

      expect(result).toEqual(updatedCampaign);
      expect(mockPrismaService.marketingCampaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
        data: {
          name: updateDto.name,
          description: updateDto.description,
          status: undefined,
          targeting: undefined,
          startDate: undefined,
          endDate: undefined,
          budget: updateDto.budget,
          content: undefined,
          tags: undefined,
        },
      });
    });

    it('should update campaign with valid status transition', async () => {
      const updateDto = { status: CampaignStatus.SCHEDULED };
      const updatedCampaign = { ...mockCampaign, status: CampaignStatus.SCHEDULED };

      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.marketingCampaign.update.mockResolvedValue(updatedCampaign);

      const result = await service.updateCampaign('campaign-123', updateDto);

      expect(result.status).toBe(CampaignStatus.SCHEDULED);
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      const completedCampaign = { ...mockCampaign, status: CampaignStatus.COMPLETED };
      const updateDto = { status: CampaignStatus.RUNNING };

      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(completedCampaign);

      await expect(service.updateCampaign('campaign-123', updateDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when campaign not found', async () => {
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(null);

      await expect(service.updateCampaign('non-existent', { name: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteCampaign', () => {
    it('should delete a campaign successfully', async () => {
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.marketingCampaign.delete.mockResolvedValue(mockCampaign);

      const result = await service.deleteCampaign('campaign-123');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.marketingCampaign.delete).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
      });
    });

    it('should throw BadRequestException when deleting a running campaign', async () => {
      const runningCampaign = { ...mockCampaign, status: CampaignStatus.RUNNING };
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(runningCampaign);

      await expect(service.deleteCampaign('campaign-123')).rejects.toThrow(BadRequestException);
      await expect(service.deleteCampaign('campaign-123')).rejects.toThrow('Cannot delete a running campaign');
    });

    it('should throw NotFoundException when campaign not found', async () => {
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(null);

      await expect(service.deleteCampaign('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('startCampaign', () => {
    it('should start a draft campaign', async () => {
      const startedCampaign = { ...mockCampaign, status: CampaignStatus.RUNNING };
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.marketingCampaign.update.mockResolvedValue(startedCampaign);

      const result = await service.startCampaign('campaign-123');

      expect(result.status).toBe(CampaignStatus.RUNNING);
      expect(mockPrismaService.marketingCampaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
        data: {
          status: CampaignStatus.RUNNING,
          startDate: expect.any(Date),
        },
      });
    });

    it('should start a scheduled campaign', async () => {
      const scheduledCampaign = { ...mockCampaign, status: CampaignStatus.SCHEDULED };
      const startedCampaign = { ...scheduledCampaign, status: CampaignStatus.RUNNING };

      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(scheduledCampaign);
      mockPrismaService.marketingCampaign.update.mockResolvedValue(startedCampaign);

      const result = await service.startCampaign('campaign-123');

      expect(result.status).toBe(CampaignStatus.RUNNING);
    });

    it('should throw BadRequestException when starting a running campaign', async () => {
      const runningCampaign = { ...mockCampaign, status: CampaignStatus.RUNNING };
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(runningCampaign);

      await expect(service.startCampaign('campaign-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when starting a completed campaign', async () => {
      const completedCampaign = { ...mockCampaign, status: CampaignStatus.COMPLETED };
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(completedCampaign);

      await expect(service.startCampaign('campaign-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('pauseCampaign', () => {
    it('should pause a running campaign', async () => {
      const runningCampaign = { ...mockCampaign, status: CampaignStatus.RUNNING };
      const pausedCampaign = { ...runningCampaign, status: CampaignStatus.PAUSED };

      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(runningCampaign);
      mockPrismaService.marketingCampaign.update.mockResolvedValue(pausedCampaign);

      const result = await service.pauseCampaign('campaign-123');

      expect(result.status).toBe(CampaignStatus.PAUSED);
      expect(mockPrismaService.marketingCampaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
        data: {
          status: CampaignStatus.PAUSED,
        },
      });
    });

    it('should throw BadRequestException when pausing a non-running campaign', async () => {
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(mockCampaign); // DRAFT status

      await expect(service.pauseCampaign('campaign-123')).rejects.toThrow(BadRequestException);
      await expect(service.pauseCampaign('campaign-123')).rejects.toThrow('Only running campaigns can be paused');
    });
  });

  describe('getCampaignMetrics', () => {
    it('should return campaign metrics', async () => {
      const campaignWithMetrics = {
        ...mockCampaign,
        metrics: {
          impressions: 10000,
          clicks: 500,
          conversions: 50,
          spend: 5000,
          revenue: 25000,
        },
      };
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(campaignWithMetrics);

      const result = await service.getCampaignMetrics({ campaignId: 'campaign-123' });

      expect(result).toEqual({
        campaignId: 'campaign-123',
        campaignName: 'Summer Sale Campaign',
        status: CampaignStatus.DRAFT,
        budget: 10000,
        spend: 5000,
        impressions: 10000,
        clicks: 500,
        conversions: 50,
        revenue: 25000,
        ctr: 5, // (500/10000) * 100
        cpc: 10, // 5000/500
        cpa: 100, // 5000/50
        roi: 400, // ((25000-5000)/5000) * 100
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });
    });

    it('should return zero metrics for new campaign', async () => {
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(mockCampaign);

      const result = await service.getCampaignMetrics({ campaignId: 'campaign-123' });

      expect(result.impressions).toBe(0);
      expect(result.clicks).toBe(0);
      expect(result.conversions).toBe(0);
      expect(result.ctr).toBe(0);
    });

    it('should throw NotFoundException when campaign not found', async () => {
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(null);

      await expect(service.getCampaignMetrics({ campaignId: 'non-existent' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('trackCampaignEvent', () => {
    it('should track impression event', async () => {
      const updatedMetrics = {
        ...mockCampaign,
        metrics: { ...mockCampaign.metrics, impressions: 1 },
      };
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.marketingCampaign.update.mockResolvedValue(updatedMetrics);

      const result = await service.trackCampaignEvent('campaign-123', { type: 'impression' });

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.marketingCampaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
        data: {
          metrics: expect.objectContaining({
            impressions: 1,
          }),
        },
      });
    });

    it('should track click event', async () => {
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.marketingCampaign.update.mockResolvedValue(mockCampaign);

      await service.trackCampaignEvent('campaign-123', { type: 'click' });

      expect(mockPrismaService.marketingCampaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
        data: {
          metrics: expect.objectContaining({
            clicks: 1,
          }),
        },
      });
    });

    it('should track conversion event with value', async () => {
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.marketingCampaign.update.mockResolvedValue(mockCampaign);

      await service.trackCampaignEvent('campaign-123', { type: 'conversion', value: 150 });

      expect(mockPrismaService.marketingCampaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
        data: {
          metrics: expect.objectContaining({
            conversions: 1,
            revenue: 150,
          }),
        },
      });
    });

    it('should accumulate metrics', async () => {
      const campaignWithMetrics = {
        ...mockCampaign,
        metrics: {
          impressions: 100,
          clicks: 10,
          conversions: 5,
          spend: 0,
          revenue: 500,
        },
      };
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(campaignWithMetrics);
      mockPrismaService.marketingCampaign.update.mockResolvedValue(campaignWithMetrics);

      await service.trackCampaignEvent('campaign-123', { type: 'conversion', value: 100 });

      expect(mockPrismaService.marketingCampaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
        data: {
          metrics: expect.objectContaining({
            conversions: 6, // 5 + 1
            revenue: 600, // 500 + 100
          }),
        },
      });
    });
  });

  describe('getCampaignsByRegion', () => {
    it('should return running campaigns for a region', async () => {
      mockPrismaService.marketingCampaign.findMany.mockResolvedValue([mockCampaign]);

      const result = await service.getCampaignsByRegion('US');

      expect(result).toEqual([mockCampaign]);
      expect(mockPrismaService.marketingCampaign.findMany).toHaveBeenCalledWith({
        where: {
          status: CampaignStatus.RUNNING,
          OR: [
            {
              targeting: {
                path: ['regions'],
                array_contains: 'US',
              },
            },
            {
              targeting: {
                path: ['regions'],
                equals: expect.anything(),
              },
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no campaigns for region', async () => {
      mockPrismaService.marketingCampaign.findMany.mockResolvedValue([]);

      const result = await service.getCampaignsByRegion('JP');

      expect(result).toEqual([]);
    });
  });

  describe('status transition validation', () => {
    it('should allow DRAFT to SCHEDULED transition', async () => {
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.marketingCampaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.SCHEDULED,
      });

      const result = await service.updateCampaign('campaign-123', { status: CampaignStatus.SCHEDULED });

      expect(result.status).toBe(CampaignStatus.SCHEDULED);
    });

    it('should allow DRAFT to RUNNING transition', async () => {
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.marketingCampaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.RUNNING,
      });

      const result = await service.updateCampaign('campaign-123', { status: CampaignStatus.RUNNING });

      expect(result.status).toBe(CampaignStatus.RUNNING);
    });

    it('should allow DRAFT to CANCELLED transition', async () => {
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrismaService.marketingCampaign.update.mockResolvedValue({
        ...mockCampaign,
        status: CampaignStatus.CANCELLED,
      });

      const result = await service.updateCampaign('campaign-123', { status: CampaignStatus.CANCELLED });

      expect(result.status).toBe(CampaignStatus.CANCELLED);
    });

    it('should allow RUNNING to PAUSED transition', async () => {
      const runningCampaign = { ...mockCampaign, status: CampaignStatus.RUNNING };
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(runningCampaign);
      mockPrismaService.marketingCampaign.update.mockResolvedValue({
        ...runningCampaign,
        status: CampaignStatus.PAUSED,
      });

      const result = await service.updateCampaign('campaign-123', { status: CampaignStatus.PAUSED });

      expect(result.status).toBe(CampaignStatus.PAUSED);
    });

    it('should allow PAUSED to RUNNING transition', async () => {
      const pausedCampaign = { ...mockCampaign, status: CampaignStatus.PAUSED };
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(pausedCampaign);
      mockPrismaService.marketingCampaign.update.mockResolvedValue({
        ...pausedCampaign,
        status: CampaignStatus.RUNNING,
      });

      const result = await service.updateCampaign('campaign-123', { status: CampaignStatus.RUNNING });

      expect(result.status).toBe(CampaignStatus.RUNNING);
    });

    it('should not allow CANCELLED to any transition', async () => {
      const cancelledCampaign = { ...mockCampaign, status: CampaignStatus.CANCELLED };
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(cancelledCampaign);

      await expect(service.updateCampaign('campaign-123', { status: CampaignStatus.RUNNING })).rejects.toThrow(
        BadRequestException
      );
    });

    it('should not allow COMPLETED to any transition', async () => {
      const completedCampaign = { ...mockCampaign, status: CampaignStatus.COMPLETED };
      mockPrismaService.marketingCampaign.findUnique.mockResolvedValue(completedCampaign);

      await expect(service.updateCampaign('campaign-123', { status: CampaignStatus.RUNNING })).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
