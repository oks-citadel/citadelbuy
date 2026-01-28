import { Test, TestingModule } from '@nestjs/testing';
import { LandingPageController } from './landing-page.controller';
import { LandingPageService } from './landing-page.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LandingPageStatus, LandingPageTemplate } from './dto/landing-page.dto';

describe('LandingPageController', () => {
  let controller: LandingPageController;
  let service: LandingPageService;

  const mockLandingPageService = {
    createLandingPage: jest.fn(),
    getLandingPages: jest.fn(),
    getLandingPageById: jest.fn(),
    getLandingPageBySlug: jest.fn(),
    updateLandingPage: jest.fn(),
    deleteLandingPage: jest.fn(),
    publishLandingPage: jest.fn(),
    archiveLandingPage: jest.fn(),
    trackPageView: jest.fn(),
    trackConversion: jest.fn(),
    getPageAnalytics: jest.fn(),
    duplicateLandingPage: jest.fn(),
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LandingPageController],
      providers: [
        {
          provide: LandingPageService,
          useValue: mockLandingPageService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<LandingPageController>(LandingPageController);
    service = module.get<LandingPageService>(LandingPageService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createLandingPage', () => {
    it('should create a new landing page', async () => {
      const createDto = {
        name: 'Summer Sale Landing Page',
        slug: 'summer-sale-2024',
        template: LandingPageTemplate.PROMOTIONAL,
        organizationId: 'org-123',
        campaignId: 'campaign-123',
        region: 'US',
        language: 'en',
      };

      mockLandingPageService.createLandingPage.mockResolvedValue(mockLandingPage);

      const result = await controller.createLandingPage(createDto);

      expect(result).toEqual(mockLandingPage);
      expect(mockLandingPageService.createLandingPage).toHaveBeenCalledWith(createDto);
    });
  });

  describe('getLandingPages', () => {
    it('should return all landing pages without filters', async () => {
      const mockPages = [mockLandingPage];
      mockLandingPageService.getLandingPages.mockResolvedValue(mockPages);

      const result = await controller.getLandingPages();

      expect(result).toEqual(mockPages);
      expect(mockLandingPageService.getLandingPages).toHaveBeenCalledWith({
        organizationId: undefined,
        campaignId: undefined,
        status: undefined,
        region: undefined,
        language: undefined,
      });
    });

    it('should return landing pages with organization filter', async () => {
      const mockPages = [mockLandingPage];
      mockLandingPageService.getLandingPages.mockResolvedValue(mockPages);

      const result = await controller.getLandingPages('org-123');

      expect(result).toEqual(mockPages);
      expect(mockLandingPageService.getLandingPages).toHaveBeenCalledWith({
        organizationId: 'org-123',
        campaignId: undefined,
        status: undefined,
        region: undefined,
        language: undefined,
      });
    });

    it('should return landing pages with campaign filter', async () => {
      const mockPages = [mockLandingPage];
      mockLandingPageService.getLandingPages.mockResolvedValue(mockPages);

      const result = await controller.getLandingPages(undefined, 'campaign-123');

      expect(result).toEqual(mockPages);
      expect(mockLandingPageService.getLandingPages).toHaveBeenCalledWith({
        organizationId: undefined,
        campaignId: 'campaign-123',
        status: undefined,
        region: undefined,
        language: undefined,
      });
    });

    it('should return landing pages with status filter', async () => {
      const mockPages = [mockLandingPage];
      mockLandingPageService.getLandingPages.mockResolvedValue(mockPages);

      const result = await controller.getLandingPages(undefined, undefined, LandingPageStatus.PUBLISHED);

      expect(result).toEqual(mockPages);
      expect(mockLandingPageService.getLandingPages).toHaveBeenCalledWith({
        organizationId: undefined,
        campaignId: undefined,
        status: LandingPageStatus.PUBLISHED,
        region: undefined,
        language: undefined,
      });
    });

    it('should return landing pages with region filter', async () => {
      const mockPages = [mockLandingPage];
      mockLandingPageService.getLandingPages.mockResolvedValue(mockPages);

      const result = await controller.getLandingPages(undefined, undefined, undefined, 'US');

      expect(result).toEqual(mockPages);
      expect(mockLandingPageService.getLandingPages).toHaveBeenCalledWith({
        organizationId: undefined,
        campaignId: undefined,
        status: undefined,
        region: 'US',
        language: undefined,
      });
    });

    it('should return landing pages with language filter', async () => {
      const mockPages = [mockLandingPage];
      mockLandingPageService.getLandingPages.mockResolvedValue(mockPages);

      const result = await controller.getLandingPages(undefined, undefined, undefined, undefined, 'en');

      expect(result).toEqual(mockPages);
      expect(mockLandingPageService.getLandingPages).toHaveBeenCalledWith({
        organizationId: undefined,
        campaignId: undefined,
        status: undefined,
        region: undefined,
        language: 'en',
      });
    });

    it('should return landing pages with multiple filters', async () => {
      const mockPages = [mockLandingPage];
      mockLandingPageService.getLandingPages.mockResolvedValue(mockPages);

      const result = await controller.getLandingPages(
        'org-123',
        'campaign-123',
        LandingPageStatus.PUBLISHED,
        'US',
        'en'
      );

      expect(result).toEqual(mockPages);
      expect(mockLandingPageService.getLandingPages).toHaveBeenCalledWith({
        organizationId: 'org-123',
        campaignId: 'campaign-123',
        status: LandingPageStatus.PUBLISHED,
        region: 'US',
        language: 'en',
      });
    });

    it('should return empty array when no pages found', async () => {
      mockLandingPageService.getLandingPages.mockResolvedValue([]);

      const result = await controller.getLandingPages();

      expect(result).toEqual([]);
    });
  });

  describe('getLandingPageBySlug', () => {
    it('should return landing page by slug', async () => {
      mockLandingPageService.getLandingPageBySlug.mockResolvedValue(mockLandingPage);

      const result = await controller.getLandingPageBySlug('summer-sale-2024');

      expect(result).toEqual(mockLandingPage);
      expect(mockLandingPageService.getLandingPageBySlug).toHaveBeenCalledWith('summer-sale-2024');
    });
  });

  describe('getLandingPageById', () => {
    it('should return landing page by id', async () => {
      mockLandingPageService.getLandingPageById.mockResolvedValue(mockLandingPage);

      const result = await controller.getLandingPageById('page-123');

      expect(result).toEqual(mockLandingPage);
      expect(mockLandingPageService.getLandingPageById).toHaveBeenCalledWith('page-123');
    });
  });

  describe('updateLandingPage', () => {
    it('should update a landing page', async () => {
      const updateDto = {
        name: 'Updated Landing Page',
        title: 'Updated Title',
        description: 'Updated description',
      };
      const updatedPage = { ...mockLandingPage, ...updateDto };
      mockLandingPageService.updateLandingPage.mockResolvedValue(updatedPage);

      const result = await controller.updateLandingPage('page-123', updateDto);

      expect(result).toEqual(updatedPage);
      expect(mockLandingPageService.updateLandingPage).toHaveBeenCalledWith('page-123', updateDto);
    });

    it('should update landing page status', async () => {
      const updateDto = { status: LandingPageStatus.PUBLISHED };
      const updatedPage = { ...mockLandingPage, status: LandingPageStatus.PUBLISHED };
      mockLandingPageService.updateLandingPage.mockResolvedValue(updatedPage);

      const result = await controller.updateLandingPage('page-123', updateDto);

      expect(result.status).toBe(LandingPageStatus.PUBLISHED);
    });

    it('should update SEO metadata', async () => {
      const updateDto = {
        seoMetadata: {
          title: 'Updated SEO Title',
          description: 'Updated SEO description',
          keywords: ['new', 'keywords'],
        },
      };
      const updatedPage = { ...mockLandingPage, ...updateDto };
      mockLandingPageService.updateLandingPage.mockResolvedValue(updatedPage);

      const result = await controller.updateLandingPage('page-123', updateDto);

      expect(result.seoMetadata).toEqual(updateDto.seoMetadata);
    });

    it('should update CTA buttons', async () => {
      const updateDto = {
        primaryCTA: {
          text: 'Buy Now',
          url: 'https://example.com/buy',
          trackConversions: true,
        },
      };
      const updatedPage = { ...mockLandingPage, ...updateDto };
      mockLandingPageService.updateLandingPage.mockResolvedValue(updatedPage);

      const result = await controller.updateLandingPage('page-123', updateDto);

      expect(result.primaryCTA).toEqual(updateDto.primaryCTA);
    });
  });

  describe('deleteLandingPage', () => {
    it('should delete a landing page', async () => {
      mockLandingPageService.deleteLandingPage.mockResolvedValue({ success: true });

      const result = await controller.deleteLandingPage('page-123');

      expect(result).toEqual({ success: true });
      expect(mockLandingPageService.deleteLandingPage).toHaveBeenCalledWith('page-123');
    });
  });

  describe('publishLandingPage', () => {
    it('should publish a landing page', async () => {
      const publishedPage = {
        ...mockLandingPage,
        status: LandingPageStatus.PUBLISHED,
        publishedAt: new Date(),
      };
      mockLandingPageService.publishLandingPage.mockResolvedValue(publishedPage);

      const result = await controller.publishLandingPage('page-123');

      expect(result.status).toBe(LandingPageStatus.PUBLISHED);
      expect(mockLandingPageService.publishLandingPage).toHaveBeenCalledWith('page-123');
    });
  });

  describe('archiveLandingPage', () => {
    it('should archive a landing page', async () => {
      const archivedPage = { ...mockLandingPage, status: LandingPageStatus.ARCHIVED };
      mockLandingPageService.archiveLandingPage.mockResolvedValue(archivedPage);

      const result = await controller.archiveLandingPage('page-123');

      expect(result.status).toBe(LandingPageStatus.ARCHIVED);
      expect(mockLandingPageService.archiveLandingPage).toHaveBeenCalledWith('page-123');
    });
  });

  describe('trackPageView', () => {
    it('should track page view without visitor id', async () => {
      mockLandingPageService.trackPageView.mockResolvedValue(undefined);

      await controller.trackPageView('page-123', {});

      expect(mockLandingPageService.trackPageView).toHaveBeenCalledWith('page-123', undefined);
    });

    it('should track page view with visitor id', async () => {
      mockLandingPageService.trackPageView.mockResolvedValue(undefined);

      await controller.trackPageView('page-123', { visitorId: 'visitor-123' });

      expect(mockLandingPageService.trackPageView).toHaveBeenCalledWith('page-123', 'visitor-123');
    });
  });

  describe('trackConversion', () => {
    it('should track primary CTA conversion', async () => {
      mockLandingPageService.trackConversion.mockResolvedValue({ success: true });

      const result = await controller.trackConversion('page-123', { ctaType: 'primary' });

      expect(result).toEqual({ success: true });
      expect(mockLandingPageService.trackConversion).toHaveBeenCalledWith('page-123', 'primary');
    });

    it('should track secondary CTA conversion', async () => {
      mockLandingPageService.trackConversion.mockResolvedValue({ success: true });

      const result = await controller.trackConversion('page-123', { ctaType: 'secondary' });

      expect(result).toEqual({ success: true });
      expect(mockLandingPageService.trackConversion).toHaveBeenCalledWith('page-123', 'secondary');
    });
  });

  describe('getPageAnalytics', () => {
    it('should return page analytics', async () => {
      const mockAnalytics = {
        pageId: 'page-123',
        pageName: 'Summer Sale Landing Page',
        slug: 'summer-sale-2024',
        status: LandingPageStatus.PUBLISHED,
        views: 10000,
        uniqueVisitors: 8000,
        conversions: 500,
        conversionRate: '5.00',
        bounceRate: 30,
        avgTimeOnPage: 120,
        createdAt: new Date(),
        publishedAt: new Date(),
      };
      mockLandingPageService.getPageAnalytics.mockResolvedValue(mockAnalytics);

      const result = await controller.getPageAnalytics('page-123');

      expect(result).toEqual(mockAnalytics);
      expect(mockLandingPageService.getPageAnalytics).toHaveBeenCalledWith('page-123');
    });
  });

  describe('duplicateLandingPage', () => {
    it('should duplicate a landing page', async () => {
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
      mockLandingPageService.duplicateLandingPage.mockResolvedValue(duplicatedPage);

      const result = await controller.duplicateLandingPage('page-123', { newSlug: 'summer-sale-2024-copy' });

      expect(result).toEqual(duplicatedPage);
      expect(result.id).not.toBe(mockLandingPage.id);
      expect(result.slug).toBe('summer-sale-2024-copy');
      expect(result.status).toBe(LandingPageStatus.DRAFT);
      expect(mockLandingPageService.duplicateLandingPage).toHaveBeenCalledWith('page-123', 'summer-sale-2024-copy');
    });
  });
});
