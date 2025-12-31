import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { LandingPageService } from './landing-page.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LandingPageStatus, LandingPageTemplate } from './dto/landing-page.dto';

describe('LandingPageService', () => {
  let service: LandingPageService;
  let prisma: PrismaService;

  const mockPrismaService = {
    landingPage: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    marketingCampaign: {
      update: jest.fn(),
    },
  };

  const mockLandingPage = {
    id: 'page-123',
    name: 'Summer Sale Landing Page',
    slug: 'summer-sale-2024',
    title: 'Summer Sale - Up to 50% Off',
    description: 'Check out our amazing summer deals',
    template: LandingPageTemplate.PROMOTIONAL,
    status: LandingPageStatus.DRAFT,
    region: 'US',
    language: 'en',
    organizationId: 'org-123',
    campaignId: 'campaign-123',
    seoMetadata: {
      title: 'Summer Sale 2024',
      description: 'Best deals of the summer',
      keywords: ['sale', 'summer', 'deals'],
    },
    primaryCTA: {
      text: 'Shop Now',
      url: 'https://example.com/shop',
      trackConversions: true,
    },
    secondaryCTA: {
      text: 'Learn More',
      url: 'https://example.com/about',
    },
    content: { hero: { headline: 'Summer Sale!' } },
    tags: ['summer', 'sale'],
    analytics: {
      views: 0,
      uniqueVisitors: 0,
      conversions: 0,
      bounceRate: 0,
      avgTimeOnPage: 0,
    },
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    organization: {
      id: 'org-123',
      name: 'Test Organization',
      slug: 'test-org',
    },
    campaign: {
      id: 'campaign-123',
      name: 'Summer Campaign',
      status: 'RUNNING',
      metrics: {
        conversions: 100,
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandingPageService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LandingPageService>(LandingPageService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLandingPage', () => {
    it('should create a new landing page successfully', async () => {
      const createDto = {
        name: 'Summer Sale Landing Page',
        slug: 'summer-sale-2024',
        template: LandingPageTemplate.PROMOTIONAL,
        organizationId: 'org-123',
        campaignId: 'campaign-123',
        region: 'US',
        language: 'en',
      };

      mockPrismaService.landingPage.findUnique.mockResolvedValue(null);
      mockPrismaService.landingPage.create.mockResolvedValue(mockLandingPage);

      const result = await service.createLandingPage(createDto);

      expect(result).toEqual(mockLandingPage);
      expect(mockPrismaService.landingPage.findUnique).toHaveBeenCalledWith({
        where: { slug: createDto.slug },
      });
      expect(mockPrismaService.landingPage.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          slug: createDto.slug,
          title: createDto.name,
          description: undefined,
          template: createDto.template,
          status: LandingPageStatus.DRAFT,
          region: createDto.region,
          language: createDto.language,
          organizationId: createDto.organizationId,
          campaignId: createDto.campaignId,
          seoMetadata: undefined,
          primaryCTA: undefined,
          secondaryCTA: undefined,
          content: undefined,
          tags: undefined,
          analytics: {
            views: 0,
            uniqueVisitors: 0,
            conversions: 0,
            bounceRate: 0,
            avgTimeOnPage: 0,
          },
        },
      });
    });

    it('should use default language en when not provided', async () => {
      const createDto = {
        name: 'Test Page',
        slug: 'test-page',
        template: LandingPageTemplate.LEAD_GENERATION,
      };

      mockPrismaService.landingPage.findUnique.mockResolvedValue(null);
      mockPrismaService.landingPage.create.mockResolvedValue(mockLandingPage);

      await service.createLandingPage(createDto);

      expect(mockPrismaService.landingPage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            language: 'en',
          }),
        })
      );
    });

    it('should throw ConflictException when slug already exists', async () => {
      const createDto = {
        name: 'Test Page',
        slug: 'summer-sale-2024',
        template: LandingPageTemplate.PROMOTIONAL,
      };

      mockPrismaService.landingPage.findUnique.mockResolvedValue(mockLandingPage);

      await expect(service.createLandingPage(createDto)).rejects.toThrow(ConflictException);
      await expect(service.createLandingPage(createDto)).rejects.toThrow(
        "Landing page with slug 'summer-sale-2024' already exists"
      );
    });

    it('should use title if provided instead of name', async () => {
      const createDto = {
        name: 'Page Name',
        slug: 'test-page',
        title: 'Custom Title',
        template: LandingPageTemplate.EVENT,
      };

      mockPrismaService.landingPage.findUnique.mockResolvedValue(null);
      mockPrismaService.landingPage.create.mockResolvedValue(mockLandingPage);

      await service.createLandingPage(createDto);

      expect(mockPrismaService.landingPage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Custom Title',
          }),
        })
      );
    });
  });

  describe('getLandingPages', () => {
    it('should return all landing pages without filters', async () => {
      const mockPages = [mockLandingPage];
      mockPrismaService.landingPage.findMany.mockResolvedValue(mockPages);

      const result = await service.getLandingPages();

      expect(result).toEqual(mockPages);
      expect(mockPrismaService.landingPage.findMany).toHaveBeenCalledWith({
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
          campaign: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      });
    });

    it('should return landing pages filtered by organizationId', async () => {
      mockPrismaService.landingPage.findMany.mockResolvedValue([mockLandingPage]);

      await service.getLandingPages({ organizationId: 'org-123' });

      expect(mockPrismaService.landingPage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-123',
          }),
        })
      );
    });

    it('should return landing pages filtered by campaignId', async () => {
      mockPrismaService.landingPage.findMany.mockResolvedValue([mockLandingPage]);

      await service.getLandingPages({ campaignId: 'campaign-123' });

      expect(mockPrismaService.landingPage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            campaignId: 'campaign-123',
          }),
        })
      );
    });

    it('should return landing pages filtered by status', async () => {
      mockPrismaService.landingPage.findMany.mockResolvedValue([]);

      await service.getLandingPages({ status: LandingPageStatus.PUBLISHED });

      expect(mockPrismaService.landingPage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: LandingPageStatus.PUBLISHED,
          }),
        })
      );
    });

    it('should return landing pages filtered by region', async () => {
      mockPrismaService.landingPage.findMany.mockResolvedValue([mockLandingPage]);

      await service.getLandingPages({ region: 'US' });

      expect(mockPrismaService.landingPage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            region: 'US',
          }),
        })
      );
    });

    it('should return landing pages filtered by language', async () => {
      mockPrismaService.landingPage.findMany.mockResolvedValue([mockLandingPage]);

      await service.getLandingPages({ language: 'en' });

      expect(mockPrismaService.landingPage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            language: 'en',
          }),
        })
      );
    });

    it('should return empty array when no pages found', async () => {
      mockPrismaService.landingPage.findMany.mockResolvedValue([]);

      const result = await service.getLandingPages();

      expect(result).toEqual([]);
    });
  });

  describe('getLandingPageById', () => {
    it('should return a landing page by id', async () => {
      mockPrismaService.landingPage.findUnique.mockResolvedValue(mockLandingPage);

      const result = await service.getLandingPageById('page-123');

      expect(result).toEqual(mockLandingPage);
      expect(mockPrismaService.landingPage.findUnique).toHaveBeenCalledWith({
        where: { id: 'page-123' },
        include: {
          organization: true,
          campaign: true,
        },
      });
    });

    it('should throw NotFoundException when page not found', async () => {
      mockPrismaService.landingPage.findUnique.mockResolvedValue(null);

      await expect(service.getLandingPageById('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.getLandingPageById('non-existent')).rejects.toThrow('Landing page non-existent not found');
    });
  });

  describe('getLandingPageBySlug', () => {
    it('should return a landing page by slug and track view', async () => {
      mockPrismaService.landingPage.findUnique.mockResolvedValue(mockLandingPage);
      mockPrismaService.landingPage.update.mockResolvedValue(mockLandingPage);

      const result = await service.getLandingPageBySlug('summer-sale-2024');

      expect(result).toEqual(mockLandingPage);
      expect(mockPrismaService.landingPage.findUnique).toHaveBeenCalledWith({
        where: { slug: 'summer-sale-2024' },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          campaign: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when slug not found', async () => {
      mockPrismaService.landingPage.findUnique.mockResolvedValue(null);

      await expect(service.getLandingPageBySlug('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.getLandingPageBySlug('non-existent')).rejects.toThrow(
        "Landing page with slug 'non-existent' not found"
      );
    });
  });

  describe('updateLandingPage', () => {
    it('should update a landing page successfully', async () => {
      const updateDto = {
        name: 'Updated Page Name',
        title: 'Updated Title',
        description: 'Updated description',
      };
      const updatedPage = { ...mockLandingPage, ...updateDto };

      mockPrismaService.landingPage.findUnique.mockResolvedValue(mockLandingPage);
      mockPrismaService.landingPage.update.mockResolvedValue(updatedPage);

      const result = await service.updateLandingPage('page-123', updateDto);

      expect(result).toEqual(updatedPage);
      expect(mockPrismaService.landingPage.update).toHaveBeenCalledWith({
        where: { id: 'page-123' },
        data: {
          name: updateDto.name,
          title: updateDto.title,
          description: updateDto.description,
          status: undefined,
          seoMetadata: undefined,
          primaryCTA: undefined,
          secondaryCTA: undefined,
          content: undefined,
          tags: undefined,
        },
      });
    });

    it('should update landing page with SEO metadata', async () => {
      const updateDto = {
        seoMetadata: {
          title: 'New SEO Title',
          description: 'New SEO description',
          keywords: ['new', 'keywords'],
        },
      };
      const updatedPage = { ...mockLandingPage, ...updateDto };

      mockPrismaService.landingPage.findUnique.mockResolvedValue(mockLandingPage);
      mockPrismaService.landingPage.update.mockResolvedValue(updatedPage);

      const result = await service.updateLandingPage('page-123', updateDto);

      expect(result.seoMetadata).toEqual(updateDto.seoMetadata);
    });

    it('should update landing page with CTA buttons', async () => {
      const updateDto = {
        primaryCTA: {
          text: 'New CTA',
          url: 'https://new-url.com',
          trackConversions: true,
        },
      };
      const updatedPage = { ...mockLandingPage, ...updateDto };

      mockPrismaService.landingPage.findUnique.mockResolvedValue(mockLandingPage);
      mockPrismaService.landingPage.update.mockResolvedValue(updatedPage);

      const result = await service.updateLandingPage('page-123', updateDto);

      expect(result.primaryCTA).toEqual(updateDto.primaryCTA);
    });

    it('should throw NotFoundException when page not found', async () => {
      mockPrismaService.landingPage.findUnique.mockResolvedValue(null);

      await expect(service.updateLandingPage('non-existent', { name: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteLandingPage', () => {
    it('should delete a landing page successfully', async () => {
      mockPrismaService.landingPage.findUnique.mockResolvedValue(mockLandingPage);
      mockPrismaService.landingPage.delete.mockResolvedValue(mockLandingPage);

      const result = await service.deleteLandingPage('page-123');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.landingPage.delete).toHaveBeenCalledWith({
        where: { id: 'page-123' },
      });
    });

    it('should throw NotFoundException when page not found', async () => {
      mockPrismaService.landingPage.findUnique.mockResolvedValue(null);

      await expect(service.deleteLandingPage('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('publishLandingPage', () => {
    it('should publish a draft landing page', async () => {
      const publishedPage = {
        ...mockLandingPage,
        status: LandingPageStatus.PUBLISHED,
        publishedAt: new Date(),
      };

      mockPrismaService.landingPage.findUnique.mockResolvedValue(mockLandingPage);
      mockPrismaService.landingPage.update.mockResolvedValue(publishedPage);

      const result = await service.publishLandingPage('page-123');

      expect(result.status).toBe(LandingPageStatus.PUBLISHED);
      expect(mockPrismaService.landingPage.update).toHaveBeenCalledWith({
        where: { id: 'page-123' },
        data: {
          status: LandingPageStatus.PUBLISHED,
          publishedAt: expect.any(Date),
        },
      });
    });

    it('should throw BadRequestException when page is already published', async () => {
      const publishedPage = { ...mockLandingPage, status: LandingPageStatus.PUBLISHED };
      mockPrismaService.landingPage.findUnique.mockResolvedValue(publishedPage);

      await expect(service.publishLandingPage('page-123')).rejects.toThrow(BadRequestException);
      await expect(service.publishLandingPage('page-123')).rejects.toThrow('Page is already published');
    });

    it('should throw NotFoundException when page not found', async () => {
      mockPrismaService.landingPage.findUnique.mockResolvedValue(null);

      await expect(service.publishLandingPage('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('archiveLandingPage', () => {
    it('should archive a landing page', async () => {
      const archivedPage = { ...mockLandingPage, status: LandingPageStatus.ARCHIVED };

      mockPrismaService.landingPage.findUnique.mockResolvedValue(mockLandingPage);
      mockPrismaService.landingPage.update.mockResolvedValue(archivedPage);

      const result = await service.archiveLandingPage('page-123');

      expect(result.status).toBe(LandingPageStatus.ARCHIVED);
      expect(mockPrismaService.landingPage.update).toHaveBeenCalledWith({
        where: { id: 'page-123' },
        data: {
          status: LandingPageStatus.ARCHIVED,
        },
      });
    });

    it('should throw NotFoundException when page not found', async () => {
      mockPrismaService.landingPage.findUnique.mockResolvedValue(null);

      await expect(service.archiveLandingPage('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('trackPageView', () => {
    it('should track page view without visitor id', async () => {
      mockPrismaService.landingPage.findUnique.mockResolvedValue(mockLandingPage);
      mockPrismaService.landingPage.update.mockResolvedValue(mockLandingPage);

      await service.trackPageView('page-123');

      expect(mockPrismaService.landingPage.update).toHaveBeenCalledWith({
        where: { id: 'page-123' },
        data: {
          analytics: expect.objectContaining({
            views: 1,
          }),
        },
      });
    });

    it('should track page view with visitor id', async () => {
      mockPrismaService.landingPage.findUnique.mockResolvedValue(mockLandingPage);
      mockPrismaService.landingPage.update.mockResolvedValue(mockLandingPage);

      await service.trackPageView('page-123', 'visitor-123');

      expect(mockPrismaService.landingPage.update).toHaveBeenCalledWith({
        where: { id: 'page-123' },
        data: {
          analytics: expect.objectContaining({
            views: 1,
            uniqueVisitors: 1,
          }),
        },
      });
    });

    it('should accumulate page views', async () => {
      const pageWithViews = {
        ...mockLandingPage,
        analytics: {
          views: 100,
          uniqueVisitors: 80,
          conversions: 10,
          bounceRate: 25,
          avgTimeOnPage: 60,
        },
      };
      mockPrismaService.landingPage.findUnique.mockResolvedValue(pageWithViews);
      mockPrismaService.landingPage.update.mockResolvedValue(pageWithViews);

      await service.trackPageView('page-123');

      expect(mockPrismaService.landingPage.update).toHaveBeenCalledWith({
        where: { id: 'page-123' },
        data: {
          analytics: expect.objectContaining({
            views: 101, // 100 + 1
          }),
        },
      });
    });

    it('should not throw when page not found', async () => {
      mockPrismaService.landingPage.findUnique.mockResolvedValue(null);

      await expect(service.trackPageView('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('trackConversion', () => {
    it('should track conversion and update page analytics', async () => {
      mockPrismaService.landingPage.findUnique.mockResolvedValue(mockLandingPage);
      mockPrismaService.landingPage.update.mockResolvedValue(mockLandingPage);
      mockPrismaService.marketingCampaign.update.mockResolvedValue({});

      const result = await service.trackConversion('page-123', 'primary');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.landingPage.update).toHaveBeenCalledWith({
        where: { id: 'page-123' },
        data: {
          analytics: expect.objectContaining({
            conversions: 1,
          }),
        },
      });
    });

    it('should update linked campaign metrics', async () => {
      mockPrismaService.landingPage.findUnique.mockResolvedValue(mockLandingPage);
      mockPrismaService.landingPage.update.mockResolvedValue(mockLandingPage);
      mockPrismaService.marketingCampaign.update.mockResolvedValue({});

      await service.trackConversion('page-123', 'primary');

      expect(mockPrismaService.marketingCampaign.update).toHaveBeenCalledWith({
        where: { id: 'campaign-123' },
        data: {
          metrics: expect.objectContaining({
            conversions: 101, // 100 + 1
          }),
        },
      });
    });

    it('should throw NotFoundException when page not found', async () => {
      mockPrismaService.landingPage.findUnique.mockResolvedValue(null);

      await expect(service.trackConversion('non-existent', 'primary')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPageAnalytics', () => {
    it('should return page analytics with conversion rate', async () => {
      const pageWithAnalytics = {
        ...mockLandingPage,
        analytics: {
          views: 1000,
          uniqueVisitors: 800,
          conversions: 50,
          bounceRate: 30,
          avgTimeOnPage: 120,
        },
      };
      mockPrismaService.landingPage.findUnique.mockResolvedValue(pageWithAnalytics);

      const result = await service.getPageAnalytics('page-123');

      expect(result).toEqual({
        pageId: 'page-123',
        pageName: 'Summer Sale Landing Page',
        slug: 'summer-sale-2024',
        status: LandingPageStatus.DRAFT,
        views: 1000,
        uniqueVisitors: 800,
        conversions: 50,
        conversionRate: '5.00', // (50/1000) * 100
        bounceRate: 30,
        avgTimeOnPage: 120,
        createdAt: expect.any(Date),
        publishedAt: null,
      });
    });

    it('should return zero conversion rate for zero views', async () => {
      mockPrismaService.landingPage.findUnique.mockResolvedValue(mockLandingPage);

      const result = await service.getPageAnalytics('page-123');

      expect(result.conversionRate).toBe('0.00');
    });

    it('should throw NotFoundException when page not found', async () => {
      mockPrismaService.landingPage.findUnique.mockResolvedValue(null);

      await expect(service.getPageAnalytics('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('duplicateLandingPage', () => {
    it('should duplicate a landing page successfully', async () => {
      const duplicatedPage = {
        ...mockLandingPage,
        id: 'page-456',
        name: 'Summer Sale Landing Page (Copy)',
        slug: 'summer-sale-2024-copy',
        status: LandingPageStatus.DRAFT,
        analytics: {
          views: 0,
          uniqueVisitors: 0,
          conversions: 0,
          bounceRate: 0,
          avgTimeOnPage: 0,
        },
      };

      mockPrismaService.landingPage.findUnique
        .mockResolvedValueOnce(mockLandingPage) // getLandingPageById
        .mockResolvedValueOnce(null); // check slug uniqueness
      mockPrismaService.landingPage.create.mockResolvedValue(duplicatedPage);

      const result = await service.duplicateLandingPage('page-123', 'summer-sale-2024-copy');

      expect(result).toEqual(duplicatedPage);
      expect(result.id).not.toBe(mockLandingPage.id);
      expect(result.slug).toBe('summer-sale-2024-copy');
      expect(result.name).toBe('Summer Sale Landing Page (Copy)');
      expect(result.status).toBe(LandingPageStatus.DRAFT);
      expect(result.analytics.views).toBe(0);
    });

    it('should throw ConflictException when new slug already exists', async () => {
      mockPrismaService.landingPage.findUnique
        .mockResolvedValueOnce(mockLandingPage) // getLandingPageById
        .mockResolvedValueOnce({ id: 'existing-page' }); // check slug uniqueness

      await expect(service.duplicateLandingPage('page-123', 'existing-slug')).rejects.toThrow(ConflictException);
      await expect(service.duplicateLandingPage('page-123', 'existing-slug')).rejects.toThrow(
        "Landing page with slug 'existing-slug' already exists"
      );
    });

    it('should throw NotFoundException when original page not found', async () => {
      mockPrismaService.landingPage.findUnique.mockResolvedValue(null);

      await expect(service.duplicateLandingPage('non-existent', 'new-slug')).rejects.toThrow(NotFoundException);
    });

    it('should copy all content from original page', async () => {
      mockPrismaService.landingPage.findUnique
        .mockResolvedValueOnce(mockLandingPage)
        .mockResolvedValueOnce(null);
      mockPrismaService.landingPage.create.mockResolvedValue({
        ...mockLandingPage,
        id: 'page-456',
        slug: 'new-slug',
      });

      await service.duplicateLandingPage('page-123', 'new-slug');

      expect(mockPrismaService.landingPage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Summer Sale Landing Page (Copy)',
          slug: 'new-slug',
          title: mockLandingPage.title,
          description: mockLandingPage.description,
          template: mockLandingPage.template,
          status: LandingPageStatus.DRAFT,
          region: mockLandingPage.region,
          language: mockLandingPage.language,
          organizationId: mockLandingPage.organizationId,
          campaignId: mockLandingPage.campaignId,
          seoMetadata: mockLandingPage.seoMetadata,
          primaryCTA: mockLandingPage.primaryCTA,
          secondaryCTA: mockLandingPage.secondaryCTA,
          content: mockLandingPage.content,
          tags: mockLandingPage.tags,
          analytics: {
            views: 0,
            uniqueVisitors: 0,
            conversions: 0,
            bounceRate: 0,
            avgTimeOnPage: 0,
          },
        }),
      });
    });
  });

  describe('getPagesByRegion', () => {
    it('should return published pages for a region', async () => {
      const mockPages = [mockLandingPage];
      mockPrismaService.landingPage.findMany.mockResolvedValue(mockPages);

      const result = await service.getPagesByRegion('US');

      expect(result).toEqual(mockPages);
      expect(mockPrismaService.landingPage.findMany).toHaveBeenCalledWith({
        where: {
          region: 'US',
          status: LandingPageStatus.PUBLISHED,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no pages found for region', async () => {
      mockPrismaService.landingPage.findMany.mockResolvedValue([]);

      const result = await service.getPagesByRegion('JP');

      expect(result).toEqual([]);
    });
  });
});
