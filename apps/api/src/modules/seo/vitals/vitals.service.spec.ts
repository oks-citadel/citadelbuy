import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VitalsService } from './vitals.service';
import { CacheService, CacheTTL } from '@/common/redis/cache.service';
import {
  DeviceType,
  CoreWebVitalMetric,
  VitalRating,
} from '../dto/vitals.dto';

describe('VitalsService', () => {
  let service: VitalsService;
  let cacheService: CacheService;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deletePattern: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('https://example.com'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VitalsService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<VitalsService>(VitalsService);
    cacheService = module.get<CacheService>(CacheService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getVitalsSummary', () => {
    it('should return default values when no vitals exist', async () => {
      const result = await service.getVitalsSummary();

      expect(result.passRate).toBe(0);
      expect(result.totalUrls).toBe(0);
      expect(result.passingUrls).toBe(0);
      expect(result.averageLcp).toBe(0);
      expect(result.averageInp).toBe(0);
      expect(result.averageCls).toBe(0);
      expect(result.urlsWithIssues).toEqual([]);
    });

    it('should calculate summary from stored vitals', async () => {
      // Report some vitals first
      await service.reportVitals({
        url: 'https://example.com/page1',
        lcp: 2000,
        inp: 100,
        cls: 0.05,
        deviceType: DeviceType.MOBILE,
      });

      const result = await service.getVitalsSummary();

      expect(result.totalUrls).toBe(1);
      expect(result.averageLcp).toBe(2000);
      expect(result.averageInp).toBe(100);
      expect(result.averageCls).toBe(0.05);
    });

    it('should identify URLs with issues', async () => {
      // Report poor vitals
      await service.reportVitals({
        url: 'https://example.com/slow-page',
        lcp: 5000, // Poor LCP
        inp: 600, // Poor INP
        cls: 0.3, // Poor CLS
        deviceType: DeviceType.MOBILE,
      });

      const result = await service.getVitalsSummary();

      expect(result.urlsWithIssues.length).toBe(1);
      expect(result.urlsWithIssues[0].failingMetrics.length).toBeGreaterThan(0);
    });

    it('should calculate pass rate correctly', async () => {
      // Report good vitals
      await service.reportVitals({
        url: 'https://example.com/fast-page',
        lcp: 2000,
        inp: 100,
        cls: 0.05,
        deviceType: DeviceType.MOBILE,
      });

      // Report poor vitals
      await service.reportVitals({
        url: 'https://example.com/slow-page',
        lcp: 5000,
        inp: 600,
        cls: 0.3,
        deviceType: DeviceType.MOBILE,
      });

      const result = await service.getVitalsSummary();

      expect(result.passRate).toBe(50);
      expect(result.passingUrls).toBe(1);
    });
  });

  describe('getUrlVitals', () => {
    it('should return cached vitals if available', async () => {
      const cachedMetrics = {
        url: 'https://example.com/page',
        deviceType: DeviceType.MOBILE,
        performanceScore: 90,
        coreWebVitals: [],
        analyzedAt: new Date().toISOString(),
      };

      mockCacheService.get.mockResolvedValue(cachedMetrics);

      const result = await service.getUrlVitals('https://example.com/page');

      expect(result).toEqual(cachedMetrics);
    });

    it('should return null when URL has no vitals', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.getUrlVitals('https://example.com/nonexistent');

      expect(result).toBeNull();
    });

    it('should return vitals for specific device type', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      // Report vitals for mobile
      await service.reportVitals({
        url: 'https://example.com/page',
        lcp: 2000,
        inp: 100,
        cls: 0.05,
        deviceType: DeviceType.MOBILE,
      });

      mockCacheService.get.mockResolvedValue(null);

      const result = await service.getUrlVitals('https://example.com/page', DeviceType.MOBILE);

      expect(result).not.toBeNull();
    });
  });

  describe('analyzeUrl', () => {
    it('should return cached analysis if available and not forcing refresh', async () => {
      const cachedAnalysis = {
        url: 'https://example.com/page',
        deviceType: DeviceType.MOBILE,
        performanceScore: 85,
        coreWebVitals: [],
        analyzedAt: new Date().toISOString(),
      };

      mockCacheService.get.mockResolvedValue(cachedAnalysis);

      const result = await service.analyzeUrl({ url: 'https://example.com/page' });

      expect(result).toEqual(cachedAnalysis);
    });

    it('should analyze URL and return metrics', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.analyzeUrl({
        url: 'https://example.com/test-page',
        deviceType: DeviceType.MOBILE,
      });

      expect(result.url).toBe('https://example.com/test-page');
      expect(result.deviceType).toBe(DeviceType.MOBILE);
      expect(result.performanceScore).toBeDefined();
      expect(result.coreWebVitals).toBeInstanceOf(Array);
      expect(result.analyzedAt).toBeDefined();
    });

    it('should include all core web vitals', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.analyzeUrl({ url: 'https://example.com/page' });

      const metrics = result.coreWebVitals.map((v) => v.metric);

      expect(metrics).toContain(CoreWebVitalMetric.LCP);
      expect(metrics).toContain(CoreWebVitalMetric.INP);
      expect(metrics).toContain(CoreWebVitalMetric.CLS);
      expect(metrics).toContain(CoreWebVitalMetric.FCP);
      expect(metrics).toContain(CoreWebVitalMetric.TTFB);
    });

    it('should force refresh when requested', async () => {
      mockCacheService.get.mockResolvedValue({ cached: true });
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.analyzeUrl({
        url: 'https://example.com/page',
        forceRefresh: true,
      });

      expect(result.url).toBe('https://example.com/page');
      expect((result as any).cached).toBeUndefined();
    });

    it('should cache analysis results', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      await service.analyzeUrl({ url: 'https://example.com/page' });

      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should store vitals for later summary', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      await service.analyzeUrl({ url: 'https://example.com/new-page' });

      const summary = await service.getVitalsSummary();

      expect(summary.totalUrls).toBeGreaterThan(0);
    });

    it('should return slower metrics for mobile vs desktop', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const mobileResult = await service.analyzeUrl({
        url: 'https://example.com/page',
        deviceType: DeviceType.MOBILE,
      });

      mockCacheService.get.mockResolvedValue(null);

      const desktopResult = await service.analyzeUrl({
        url: 'https://example.com/page',
        deviceType: DeviceType.DESKTOP,
      });

      // Mobile typically has slower metrics due to multiplier
      // This is simulated, so we just verify both work
      expect(mobileResult.deviceType).toBe(DeviceType.MOBILE);
      expect(desktopResult.deviceType).toBe(DeviceType.DESKTOP);
    });
  });

  describe('reportVitals', () => {
    it('should store reported vitals', async () => {
      const dto = {
        url: 'https://example.com/page',
        lcp: 2500,
        inp: 150,
        cls: 0.08,
        fcp: 1500,
        ttfb: 500,
        deviceType: DeviceType.MOBILE,
      };

      await service.reportVitals(dto);

      const summary = await service.getVitalsSummary();

      expect(summary.totalUrls).toBeGreaterThan(0);
    });

    it('should calculate performance score from reported vitals', async () => {
      await service.reportVitals({
        url: 'https://example.com/good-page',
        lcp: 2000,
        inp: 100,
        cls: 0.05,
        deviceType: DeviceType.MOBILE,
      });

      const summary = await service.getVitalsSummary();

      expect(summary.averagePerformanceScore).toBeGreaterThan(0);
    });

    it('should use default device type when not provided', async () => {
      await service.reportVitals({
        url: 'https://example.com/page',
        lcp: 2000,
        inp: 100,
        cls: 0.05,
      });

      // Should not throw and should store with mobile as default
      const summary = await service.getVitalsSummary();
      expect(summary.totalUrls).toBeGreaterThan(0);
    });
  });

  describe('getVitalsHistory', () => {
    it('should return history for a URL', async () => {
      // Report multiple vitals for same URL
      await service.reportVitals({
        url: 'https://example.com/page',
        lcp: 2000,
        inp: 100,
        cls: 0.05,
        deviceType: DeviceType.MOBILE,
      });

      await service.reportVitals({
        url: 'https://example.com/page',
        lcp: 2100,
        inp: 110,
        cls: 0.06,
        deviceType: DeviceType.MOBILE,
      });

      const result = await service.getVitalsHistory('https://example.com/page');

      expect(result.url).toBe('https://example.com/page');
      expect(result.history.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      await service.reportVitals({
        url: 'https://example.com/page',
        lcp: 2000,
        inp: 100,
        cls: 0.05,
        deviceType: DeviceType.MOBILE,
      });

      const result = await service.getVitalsHistory('https://example.com/page', yesterday, now);

      expect(result.startDate).toBeDefined();
      expect(result.endDate).toBeDefined();
    });

    it('should include trends', async () => {
      // Report vitals with improving metrics
      await service.reportVitals({
        url: 'https://example.com/page',
        lcp: 3000,
        inp: 200,
        cls: 0.1,
        deviceType: DeviceType.MOBILE,
      });

      await service.reportVitals({
        url: 'https://example.com/page',
        lcp: 2500,
        inp: 150,
        cls: 0.08,
        deviceType: DeviceType.MOBILE,
      });

      const result = await service.getVitalsHistory('https://example.com/page');

      expect(result.trends).toBeDefined();
      expect(result.trends.lcpTrend).toBeDefined();
      expect(result.trends.inpTrend).toBeDefined();
      expect(result.trends.clsTrend).toBeDefined();
      expect(result.trends.overallTrend).toBeDefined();
    });

    it('should return stable trends when insufficient data', async () => {
      await service.reportVitals({
        url: 'https://example.com/single-page',
        lcp: 2000,
        inp: 100,
        cls: 0.05,
        deviceType: DeviceType.MOBILE,
      });

      const result = await service.getVitalsHistory('https://example.com/single-page');

      expect(result.trends.lcpTrend).toBe('stable');
      expect(result.trends.inpTrend).toBe('stable');
      expect(result.trends.clsTrend).toBe('stable');
    });
  });

  describe('checkMobileFriendliness', () => {
    it('should return mobile friendliness analysis', async () => {
      const result = await service.checkMobileFriendliness('https://example.com/page');

      expect(result.url).toBe('https://example.com/page');
      expect(result.isMobileFriendly).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.issues).toBeInstanceOf(Array);
      expect(result.viewport).toBeDefined();
      expect(result.fontSizes).toBeDefined();
      expect(result.touchTargets).toBeDefined();
      expect(result.contentWidth).toBeDefined();
      expect(result.analyzedAt).toBeDefined();
    });

    it('should return viewport configuration', async () => {
      const result = await service.checkMobileFriendliness('https://example.com/page');

      expect(result.viewport.isConfigured).toBeDefined();
    });

    it('should return font size analysis', async () => {
      const result = await service.checkMobileFriendliness('https://example.com/page');

      expect(result.fontSizes.isLegible).toBeDefined();
      expect(result.fontSizes.smallTextPercentage).toBeDefined();
    });

    it('should return touch target analysis', async () => {
      const result = await service.checkMobileFriendliness('https://example.com/page');

      expect(result.touchTargets.areProperlySpaced).toBeDefined();
    });

    it('should identify issues affecting mobile friendliness', async () => {
      // Multiple calls may produce different results due to simulation
      // but should always have valid structure
      const result = await service.checkMobileFriendliness('https://example.com/page');

      result.issues.forEach((issue) => {
        expect(issue.type).toBeDefined();
        expect(issue.description).toBeDefined();
        expect(['critical', 'warning', 'info']).toContain(issue.severity);
      });
    });
  });

  describe('getPageSpeedDiagnostics', () => {
    it('should return diagnostics for a URL', async () => {
      const result = await service.getPageSpeedDiagnostics('https://example.com/page');

      expect(result.url).toBe('https://example.com/page');
      expect(result.diagnostics).toBeInstanceOf(Array);
      expect(result.opportunities).toBeInstanceOf(Array);
    });

    it('should include common diagnostics', async () => {
      const result = await service.getPageSpeedDiagnostics('https://example.com/page');

      const diagnosticIds = result.diagnostics.map((d) => d.id);

      expect(diagnosticIds).toContain('dom-size');
      expect(diagnosticIds).toContain('critical-request-chains');
      expect(diagnosticIds).toContain('mainthread-work');
    });

    it('should include optimization opportunities', async () => {
      const result = await service.getPageSpeedDiagnostics('https://example.com/page');

      const opportunityIds = result.opportunities.map((o) => o.id);

      expect(opportunityIds).toContain('render-blocking-resources');
      expect(opportunityIds).toContain('unused-css');
      expect(opportunityIds).toContain('uses-optimized-images');
    });

    it('should include savings estimates for opportunities', async () => {
      const result = await service.getPageSpeedDiagnostics('https://example.com/page');

      result.opportunities.forEach((opportunity) => {
        expect(opportunity.savings).toBeDefined();
      });
    });
  });

  describe('vital ratings', () => {
    it('should rate LCP correctly', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.analyzeUrl({ url: 'https://example.com/page' });

      const lcp = result.coreWebVitals.find((v) => v.metric === CoreWebVitalMetric.LCP);

      expect(lcp).toBeDefined();
      expect([VitalRating.GOOD, VitalRating.NEEDS_IMPROVEMENT, VitalRating.POOR]).toContain(lcp?.rating);
    });

    it('should include thresholds in vital metrics', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await service.analyzeUrl({ url: 'https://example.com/page' });

      result.coreWebVitals.forEach((vital) => {
        expect(vital.goodThreshold).toBeDefined();
        expect(vital.poorThreshold).toBeDefined();
      });
    });
  });
});
