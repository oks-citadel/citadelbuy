import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService, CacheTTL } from '@/common/redis/cache.service';
import {
  CoreWebVitalDto,
  CoreWebVitalMetric,
  VitalRating,
  DeviceType,
  PageSpeedMetricsDto,
  VitalsHistoryDto,
  MobileFriendlinessDto,
  VitalsSummaryDto,
  ReportVitalsDto,
  AnalyzeUrlDto,
} from '../dto/vitals.dto';
import { CoreWebVitals } from '../interfaces/seo.interfaces';

interface StoredVitals {
  url: string;
  deviceType: DeviceType;
  lcp: number;
  inp: number;
  cls: number;
  fcp?: number;
  ttfb?: number;
  performanceScore: number;
  timestamp: Date;
}

@Injectable()
export class VitalsService {
  private readonly logger = new Logger(VitalsService.name);
  private readonly cachePrefix = 'seo:vitals:';

  // Thresholds based on Google's Core Web Vitals
  private readonly thresholds = {
    lcp: { good: 2500, poor: 4000 }, // milliseconds
    inp: { good: 200, poor: 500 }, // milliseconds
    cls: { good: 0.1, poor: 0.25 }, // score
    fcp: { good: 1800, poor: 3000 }, // milliseconds
    ttfb: { good: 800, poor: 1800 }, // milliseconds
  };

  // In-memory storage for vitals (in production, use database)
  private vitalsStore: StoredVitals[] = [];

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get vitals summary
   */
  async getVitalsSummary(): Promise<VitalsSummaryDto> {
    const allVitals = this.vitalsStore;

    if (allVitals.length === 0) {
      return {
        passRate: 0,
        totalUrls: 0,
        passingUrls: 0,
        averageLcp: 0,
        averageInp: 0,
        averageCls: 0,
        averagePerformanceScore: 0,
        urlsWithIssues: [],
        lastUpdated: new Date().toISOString(),
      };
    }

    // Group by URL and get latest vitals
    const urlMap = new Map<string, StoredVitals>();
    for (const vital of allVitals) {
      const existing = urlMap.get(vital.url);
      if (!existing || vital.timestamp > existing.timestamp) {
        urlMap.set(vital.url, vital);
      }
    }

    const latestVitals = Array.from(urlMap.values());
    const passingUrls = latestVitals.filter((v) => this.passesAllVitals(v));

    const urlsWithIssues = latestVitals
      .filter((v) => !this.passesAllVitals(v))
      .map((v) => ({
        url: v.url,
        failingMetrics: this.getFailingMetrics(v),
        performanceScore: v.performanceScore,
      }));

    return {
      passRate: (passingUrls.length / latestVitals.length) * 100,
      totalUrls: latestVitals.length,
      passingUrls: passingUrls.length,
      averageLcp: this.average(latestVitals.map((v) => v.lcp)),
      averageInp: this.average(latestVitals.map((v) => v.inp)),
      averageCls: this.average(latestVitals.map((v) => v.cls)),
      averagePerformanceScore: this.average(latestVitals.map((v) => v.performanceScore)),
      urlsWithIssues,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get vitals for a specific URL
   */
  async getUrlVitals(url: string, deviceType: DeviceType = DeviceType.MOBILE): Promise<PageSpeedMetricsDto | null> {
    const cacheKey = `${this.cachePrefix}url:${url}:${deviceType}`;

    const cached = await this.cacheService.get<PageSpeedMetricsDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get from store
    const vitals = this.vitalsStore
      .filter((v) => v.url === url && v.deviceType === deviceType)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    if (!vitals) {
      return null;
    }

    const metrics = this.buildPageSpeedMetrics(vitals);

    await this.cacheService.set(cacheKey, metrics, { ttl: CacheTTL.MEDIUM });

    return metrics;
  }

  /**
   * Analyze URL and return page speed metrics
   */
  async analyzeUrl(dto: AnalyzeUrlDto): Promise<PageSpeedMetricsDto> {
    const cacheKey = `${this.cachePrefix}analyze:${dto.url}:${dto.deviceType || DeviceType.MOBILE}`;

    if (!dto.forceRefresh) {
      const cached = await this.cacheService.get<PageSpeedMetricsDto>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // In a real implementation, this would call Google PageSpeed Insights API
    // or use Lighthouse to analyze the URL
    // For now, we'll simulate realistic metrics

    const metrics = this.simulatePageSpeedAnalysis(dto.url, dto.deviceType || DeviceType.MOBILE);

    // Store the vitals
    this.vitalsStore.push({
      url: dto.url,
      deviceType: dto.deviceType || DeviceType.MOBILE,
      lcp: metrics.coreWebVitals.find((v) => v.metric === CoreWebVitalMetric.LCP)?.value || 0,
      inp: metrics.coreWebVitals.find((v) => v.metric === CoreWebVitalMetric.INP)?.value || 0,
      cls: metrics.coreWebVitals.find((v) => v.metric === CoreWebVitalMetric.CLS)?.value || 0,
      fcp: metrics.firstContentfulPaint,
      ttfb: metrics.coreWebVitals.find((v) => v.metric === CoreWebVitalMetric.TTFB)?.value,
      performanceScore: metrics.performanceScore,
      timestamp: new Date(),
    });

    await this.cacheService.set(cacheKey, metrics, { ttl: CacheTTL.LONG });

    return metrics;
  }

  /**
   * Report client-side vitals (RUM data)
   */
  async reportVitals(dto: ReportVitalsDto): Promise<void> {
    this.vitalsStore.push({
      url: dto.url,
      deviceType: dto.deviceType || DeviceType.MOBILE,
      lcp: dto.lcp,
      inp: dto.inp,
      cls: dto.cls,
      fcp: dto.fcp,
      ttfb: dto.ttfb,
      performanceScore: this.calculatePerformanceScore(dto),
      timestamp: new Date(),
    });

    this.logger.debug(`Vitals reported for ${dto.url}: LCP=${dto.lcp}ms, INP=${dto.inp}ms, CLS=${dto.cls}`);
  }

  /**
   * Get vitals history for a URL
   */
  async getVitalsHistory(url: string, startDate?: Date, endDate?: Date): Promise<VitalsHistoryDto> {
    let vitals = this.vitalsStore.filter((v) => v.url === url);

    if (startDate) {
      vitals = vitals.filter((v) => v.timestamp >= startDate);
    }
    if (endDate) {
      vitals = vitals.filter((v) => v.timestamp <= endDate);
    }

    vitals = vitals.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const history = vitals.map((v) => ({
      date: v.timestamp.toISOString(),
      lcp: v.lcp,
      inp: v.inp,
      cls: v.cls,
      performanceScore: v.performanceScore,
    }));

    // Calculate trends
    const trends = this.calculateTrends(vitals);

    return {
      url,
      startDate: startDate?.toISOString() || vitals[0]?.timestamp.toISOString() || new Date().toISOString(),
      endDate: endDate?.toISOString() || new Date().toISOString(),
      history,
      trends,
    };
  }

  /**
   * Check mobile friendliness
   */
  async checkMobileFriendliness(url: string): Promise<MobileFriendlinessDto> {
    // In a real implementation, this would use Google's Mobile-Friendly Test API
    // For now, we'll simulate the analysis

    const issues: MobileFriendlinessDto['issues'] = [];
    let score = 100;

    // Simulate various mobile issues
    const hasViewport = Math.random() > 0.1; // 90% have viewport
    const hasLegibleFont = Math.random() > 0.2; // 80% have legible fonts
    const hasProperTouchTargets = Math.random() > 0.3; // 70% have proper touch targets
    const contentFitsViewport = Math.random() > 0.15; // 85% fit viewport

    if (!hasViewport) {
      issues.push({
        type: 'viewport',
        description: 'Viewport meta tag is not configured',
        severity: 'critical',
      });
      score -= 30;
    }

    if (!hasLegibleFont) {
      issues.push({
        type: 'font_size',
        description: 'Text is too small to read on mobile devices',
        severity: 'warning',
      });
      score -= 15;
    }

    if (!hasProperTouchTargets) {
      issues.push({
        type: 'touch_targets',
        description: 'Touch elements are too close together',
        severity: 'warning',
      });
      score -= 10;
    }

    if (!contentFitsViewport) {
      issues.push({
        type: 'content_width',
        description: 'Content wider than screen requires horizontal scrolling',
        severity: 'warning',
      });
      score -= 15;
    }

    return {
      url,
      isMobileFriendly: issues.filter((i) => i.severity === 'critical').length === 0,
      score: Math.max(0, score),
      issues,
      viewport: {
        isConfigured: hasViewport,
        width: hasViewport ? 'device-width' : 'not set',
        initialScale: hasViewport ? '1.0' : 'not set',
      },
      fontSizes: {
        isLegible: hasLegibleFont,
        smallTextPercentage: hasLegibleFont ? Math.random() * 5 : 20 + Math.random() * 30,
      },
      touchTargets: {
        areProperlySpaced: hasProperTouchTargets,
        tooSmallCount: hasProperTouchTargets ? 0 : Math.floor(Math.random() * 10) + 1,
        tooCloseCount: hasProperTouchTargets ? 0 : Math.floor(Math.random() * 5),
      },
      contentWidth: {
        fitsViewport: contentFitsViewport,
        horizontalScrollRequired: !contentFitsViewport,
      },
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Get pagespeed diagnostics
   */
  async getPageSpeedDiagnostics(url: string): Promise<{
    url: string;
    diagnostics: Array<{
      id: string;
      title: string;
      description: string;
      score?: number;
      displayValue?: string;
    }>;
    opportunities: Array<{
      id: string;
      title: string;
      description: string;
      savings?: { bytes?: number; ms?: number };
    }>;
  }> {
    // Simulated diagnostics
    return {
      url,
      diagnostics: [
        {
          id: 'dom-size',
          title: 'Avoid an excessive DOM size',
          description: 'A large DOM can increase memory usage and cause longer style calculations.',
          displayValue: `${Math.floor(Math.random() * 1500) + 500} elements`,
        },
        {
          id: 'critical-request-chains',
          title: 'Avoid chaining critical requests',
          description: 'Reduce the length of chains and the download size of resources.',
          displayValue: `${Math.floor(Math.random() * 5) + 1} chains found`,
        },
        {
          id: 'mainthread-work',
          title: 'Minimize main-thread work',
          description: 'Reduce the time spent parsing, compiling, and executing JS.',
          displayValue: `${(Math.random() * 3 + 1).toFixed(1)} s`,
        },
      ],
      opportunities: [
        {
          id: 'render-blocking-resources',
          title: 'Eliminate render-blocking resources',
          description: 'Resources are blocking the first paint of your page.',
          savings: { ms: Math.floor(Math.random() * 500) + 100 },
        },
        {
          id: 'unused-css',
          title: 'Remove unused CSS',
          description: 'Reduce unused rules from stylesheets.',
          savings: { bytes: Math.floor(Math.random() * 50000) + 10000 },
        },
        {
          id: 'uses-optimized-images',
          title: 'Properly size images',
          description: 'Serve images that are appropriately-sized to save cellular data.',
          savings: { bytes: Math.floor(Math.random() * 200000) + 50000 },
        },
      ],
    };
  }

  // Helper methods

  private buildPageSpeedMetrics(vitals: StoredVitals): PageSpeedMetricsDto {
    return {
      url: vitals.url,
      deviceType: vitals.deviceType,
      performanceScore: vitals.performanceScore,
      coreWebVitals: [
        this.buildVitalDto(CoreWebVitalMetric.LCP, vitals.lcp, 'ms'),
        this.buildVitalDto(CoreWebVitalMetric.INP, vitals.inp, 'ms'),
        this.buildVitalDto(CoreWebVitalMetric.CLS, vitals.cls, ''),
        ...(vitals.fcp ? [this.buildVitalDto(CoreWebVitalMetric.FCP, vitals.fcp, 'ms')] : []),
        ...(vitals.ttfb ? [this.buildVitalDto(CoreWebVitalMetric.TTFB, vitals.ttfb, 'ms')] : []),
      ],
      firstContentfulPaint: vitals.fcp,
      analyzedAt: vitals.timestamp.toISOString(),
    };
  }

  private buildVitalDto(metric: CoreWebVitalMetric, value: number, unit: string): CoreWebVitalDto {
    const thresholds = this.thresholds[metric.toLowerCase() as keyof typeof this.thresholds];

    let rating: VitalRating;
    if (metric === CoreWebVitalMetric.CLS) {
      rating = value <= thresholds.good ? VitalRating.GOOD
        : value <= thresholds.poor ? VitalRating.NEEDS_IMPROVEMENT
        : VitalRating.POOR;
    } else {
      rating = value <= thresholds.good ? VitalRating.GOOD
        : value <= thresholds.poor ? VitalRating.NEEDS_IMPROVEMENT
        : VitalRating.POOR;
    }

    return {
      metric,
      value,
      rating,
      unit,
      goodThreshold: thresholds.good,
      poorThreshold: thresholds.poor,
    };
  }

  private simulatePageSpeedAnalysis(url: string, deviceType: DeviceType): PageSpeedMetricsDto {
    // Simulate realistic metrics with some variance
    const isMobile = deviceType === DeviceType.MOBILE;
    const multiplier = isMobile ? 1.3 : 1; // Mobile is typically slower

    const lcp = (Math.random() * 3000 + 1500) * multiplier; // 1.5-4.5s for mobile
    const inp = (Math.random() * 200 + 50) * multiplier; // 50-250ms
    const cls = Math.random() * 0.2; // 0-0.2
    const fcp = (Math.random() * 1500 + 1000) * multiplier; // 1-2.5s
    const ttfb = (Math.random() * 500 + 200) * multiplier; // 200-700ms

    const performanceScore = this.calculatePerformanceScore({ lcp, inp, cls, fcp, ttfb });

    return {
      url,
      deviceType,
      performanceScore,
      coreWebVitals: [
        this.buildVitalDto(CoreWebVitalMetric.LCP, Math.round(lcp), 'ms'),
        this.buildVitalDto(CoreWebVitalMetric.INP, Math.round(inp), 'ms'),
        this.buildVitalDto(CoreWebVitalMetric.CLS, Math.round(cls * 1000) / 1000, ''),
        this.buildVitalDto(CoreWebVitalMetric.FCP, Math.round(fcp), 'ms'),
        this.buildVitalDto(CoreWebVitalMetric.TTFB, Math.round(ttfb), 'ms'),
      ],
      firstContentfulPaint: fcp,
      speedIndex: fcp * 1.5,
      timeToInteractive: lcp + inp,
      totalBlockingTime: inp * 2,
      pageSize: Math.floor(Math.random() * 2000000) + 500000, // 500KB - 2.5MB
      requestCount: Math.floor(Math.random() * 80) + 20, // 20-100 requests
      domSize: Math.floor(Math.random() * 1500) + 500, // 500-2000 elements
      analyzedAt: new Date().toISOString(),
    };
  }

  private calculatePerformanceScore(dto: { lcp: number; inp: number; cls: number; fcp?: number; ttfb?: number }): number {
    let score = 100;

    // LCP scoring (25% weight)
    if (dto.lcp > this.thresholds.lcp.poor) score -= 25;
    else if (dto.lcp > this.thresholds.lcp.good) score -= 12;

    // INP scoring (25% weight)
    if (dto.inp > this.thresholds.inp.poor) score -= 25;
    else if (dto.inp > this.thresholds.inp.good) score -= 12;

    // CLS scoring (25% weight)
    if (dto.cls > this.thresholds.cls.poor) score -= 25;
    else if (dto.cls > this.thresholds.cls.good) score -= 12;

    // FCP scoring (15% weight)
    if (dto.fcp) {
      if (dto.fcp > this.thresholds.fcp.poor) score -= 15;
      else if (dto.fcp > this.thresholds.fcp.good) score -= 7;
    }

    // TTFB scoring (10% weight)
    if (dto.ttfb) {
      if (dto.ttfb > this.thresholds.ttfb.poor) score -= 10;
      else if (dto.ttfb > this.thresholds.ttfb.good) score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  private passesAllVitals(vitals: StoredVitals): boolean {
    return (
      vitals.lcp <= this.thresholds.lcp.good &&
      vitals.inp <= this.thresholds.inp.good &&
      vitals.cls <= this.thresholds.cls.good
    );
  }

  private getFailingMetrics(vitals: StoredVitals): CoreWebVitalMetric[] {
    const failing: CoreWebVitalMetric[] = [];

    if (vitals.lcp > this.thresholds.lcp.good) failing.push(CoreWebVitalMetric.LCP);
    if (vitals.inp > this.thresholds.inp.good) failing.push(CoreWebVitalMetric.INP);
    if (vitals.cls > this.thresholds.cls.good) failing.push(CoreWebVitalMetric.CLS);

    return failing;
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private calculateTrends(vitals: StoredVitals[]): VitalsHistoryDto['trends'] {
    if (vitals.length < 2) {
      return {
        lcpTrend: 'stable',
        inpTrend: 'stable',
        clsTrend: 'stable',
        overallTrend: 'stable',
      };
    }

    const half = Math.floor(vitals.length / 2);
    const firstHalf = vitals.slice(0, half);
    const secondHalf = vitals.slice(half);

    const lcpTrend = this.getTrend(
      this.average(firstHalf.map((v) => v.lcp)),
      this.average(secondHalf.map((v) => v.lcp)),
      true, // lower is better
    );

    const inpTrend = this.getTrend(
      this.average(firstHalf.map((v) => v.inp)),
      this.average(secondHalf.map((v) => v.inp)),
      true,
    );

    const clsTrend = this.getTrend(
      this.average(firstHalf.map((v) => v.cls)),
      this.average(secondHalf.map((v) => v.cls)),
      true,
    );

    const scoreTrend = this.getTrend(
      this.average(firstHalf.map((v) => v.performanceScore)),
      this.average(secondHalf.map((v) => v.performanceScore)),
      false, // higher is better
    );

    return {
      lcpTrend,
      inpTrend,
      clsTrend,
      overallTrend: scoreTrend,
    };
  }

  private getTrend(
    first: number,
    second: number,
    lowerIsBetter: boolean,
  ): 'improving' | 'stable' | 'declining' {
    const threshold = 0.05; // 5% change threshold
    const change = (second - first) / first;

    if (Math.abs(change) < threshold) return 'stable';

    if (lowerIsBetter) {
      return change < 0 ? 'improving' : 'declining';
    } else {
      return change > 0 ? 'improving' : 'declining';
    }
  }
}
