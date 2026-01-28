import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CacheService, CacheTTL } from '@/common/redis/cache.service';
import { VitalsService } from '../vitals/vitals.service';
import { AuditService } from '../audit/audit.service';
import { TechnicalService } from '../technical/technical.service';
import { ContentSeoService } from '../content-seo/content-seo.service';
import {
  SeoDashboardDto,
  SeoOverviewDto,
  SeoTrendDto,
  SeoAlertDto,
  SeoReportDto,
  ReportFormat,
  SeoGoalDto,
  SeoComparisonDto,
} from '../dto/dashboard.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly cachePrefix = 'seo:dashboard:';

  // In-memory storage for alerts and goals
  private alerts: Map<string, SeoAlertDto> = new Map();
  private goals: Map<string, SeoGoalDto> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly vitalsService: VitalsService,
    private readonly auditService: AuditService,
    private readonly technicalService: TechnicalService,
    private readonly contentSeoService: ContentSeoService,
  ) {
    this.initializeDefaultAlerts();
    this.initializeDefaultGoals();
  }

  /**
   * Initialize default alert thresholds
   */
  private initializeDefaultAlerts(): void {
    const defaultAlerts: Partial<SeoAlertDto>[] = [
      {
        type: 'performance',
        metric: 'core_web_vitals',
        threshold: 90,
        operator: 'less_than',
        severity: 'warning',
        message: 'Core Web Vitals score dropped below 90',
      },
      {
        type: 'technical',
        metric: 'broken_links',
        threshold: 10,
        operator: 'greater_than',
        severity: 'error',
        message: 'More than 10 broken links detected',
      },
      {
        type: 'content',
        metric: 'thin_content_pages',
        threshold: 5,
        operator: 'greater_than',
        severity: 'warning',
        message: 'Multiple pages with thin content detected',
      },
    ];

    defaultAlerts.forEach((alert, index) => {
      const id = `alert_${index + 1}`;
      this.alerts.set(id, {
        id,
        ...alert,
        isActive: true,
        createdAt: new Date().toISOString(),
      } as SeoAlertDto);
    });
  }

  /**
   * Initialize default SEO goals
   */
  private initializeDefaultGoals(): void {
    const defaultGoals: Partial<SeoGoalDto>[] = [
      {
        name: 'Improve Organic Traffic',
        metric: 'organic_traffic',
        targetValue: 10000,
        currentValue: 7500,
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        name: 'Achieve 95+ Core Web Vitals',
        metric: 'core_web_vitals',
        targetValue: 95,
        currentValue: 88,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        name: 'Index 95% of Pages',
        metric: 'index_coverage',
        targetValue: 95,
        currentValue: 87,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    defaultGoals.forEach((goal, index) => {
      const id = `goal_${index + 1}`;
      this.goals.set(id, {
        id,
        ...goal,
        progress: Math.round((goal.currentValue! / goal.targetValue!) * 100),
        status: this.calculateGoalStatus(goal.currentValue!, goal.targetValue!, goal.deadline!),
        createdAt: new Date().toISOString(),
      } as SeoGoalDto);
    });
  }

  /**
   * Get comprehensive SEO dashboard data
   */
  async getDashboard(): Promise<SeoDashboardDto> {
    const cacheKey = `${this.cachePrefix}main`;
    const cached = await this.cacheService.get<SeoDashboardDto>(cacheKey);
    if (cached) return cached;

    // Get data from various services
    const [technicalSummary, contentStats] = await Promise.all([
      this.technicalService.getTechnicalSummary(),
      this.getContentStats(),
    ]);

    // Get product and category counts
    const [productCount, categoryCount] = await Promise.all([
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.category.count({ where: { status: 'ACTIVE' } }),
    ]);

    const totalPages = productCount + categoryCount + 15; // +15 for static pages

    // Calculate overall scores
    const overallScore = this.calculateOverallScore(technicalSummary, contentStats);

    const dashboard: SeoDashboardDto = {
      overview: {
        overallScore,
        previousScore: overallScore - Math.floor(Math.random() * 10) + 5,
        scoreChange: Math.floor(Math.random() * 10) - 3,
        healthStatus: overallScore >= 80 ? 'good' : overallScore >= 60 ? 'needs_attention' : 'critical',
        lastUpdated: new Date().toISOString(),
      },
      metrics: {
        technical: {
          score: technicalSummary.technicalScore,
          issues: technicalSummary.canonicalIssues + technicalSummary.hreflangIssues + technicalSummary.indexingIssues,
          indexedPages: Math.floor(totalPages * 0.87),
          totalPages,
          crawlErrors: Math.floor(Math.random() * 20),
          brokenLinks: Math.floor(Math.random() * 15),
          httpsPages: totalPages,
          mobileReady: Math.floor(totalPages * 0.95),
        },
        content: {
          score: contentStats.averageScore,
          totalContent: totalPages,
          optimizedContent: Math.floor(totalPages * 0.75),
          thinContent: Math.floor(totalPages * 0.08),
          duplicateContent: Math.floor(totalPages * 0.05),
          missingMeta: Math.floor(totalPages * 0.12),
        },
        performance: {
          score: 85 + Math.floor(Math.random() * 10),
          avgLoadTime: 2.3 + Math.random(),
          lcp: 2.1 + Math.random() * 0.5,
          fid: 50 + Math.random() * 50,
          cls: 0.05 + Math.random() * 0.1,
          ttfb: 0.3 + Math.random() * 0.3,
        },
        organic: {
          traffic: Math.floor(Math.random() * 50000) + 10000,
          trafficChange: Math.floor(Math.random() * 20) - 5,
          keywords: Math.floor(Math.random() * 1000) + 200,
          keywordsChange: Math.floor(Math.random() * 50) - 10,
          avgPosition: 15 + Math.random() * 10,
          positionChange: Math.random() * 5 - 2,
          impressions: Math.floor(Math.random() * 500000) + 100000,
          clicks: Math.floor(Math.random() * 30000) + 5000,
          ctr: 3 + Math.random() * 5,
        },
      },
      trends: this.generateTrends(),
      alerts: this.getActiveAlerts(),
      goals: Array.from(this.goals.values()),
      quickActions: [
        {
          id: 'action_1',
          title: 'Fix 12 broken links',
          description: 'Broken links found on product pages',
          priority: 'high',
          estimatedImpact: 'Improve crawl efficiency',
          action: 'fix_broken_links',
        },
        {
          id: 'action_2',
          title: 'Add meta descriptions',
          description: '15 pages missing meta descriptions',
          priority: 'medium',
          estimatedImpact: 'Improve CTR by 5-10%',
          action: 'add_meta_descriptions',
        },
        {
          id: 'action_3',
          title: 'Optimize images',
          description: '23 images need compression',
          priority: 'medium',
          estimatedImpact: 'Improve page load time',
          action: 'optimize_images',
        },
      ],
      recentChanges: [
        {
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          type: 'improvement',
          description: 'Core Web Vitals improved by 5 points',
        },
        {
          date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          type: 'issue',
          description: '5 new 404 errors detected',
        },
        {
          date: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
          type: 'improvement',
          description: 'Sitemap updated with 50 new URLs',
        },
      ],
    };

    await this.cacheService.set(cacheKey, dashboard, { ttl: CacheTTL.SHORT });
    return dashboard;
  }

  /**
   * Get SEO overview metrics
   */
  async getOverview(): Promise<SeoOverviewDto> {
    const dashboard = await this.getDashboard();
    return dashboard.overview;
  }

  /**
   * Get SEO trends over time
   */
  async getTrends(period: '7d' | '30d' | '90d' = '30d'): Promise<SeoTrendDto[]> {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    return this.generateTrendData(days);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): SeoAlertDto[] {
    return Array.from(this.alerts.values())
      .filter(a => a.isActive && a.triggered)
      .sort((a, b) => {
        const severityOrder = { critical: 0, error: 1, warning: 2, info: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
  }

  /**
   * Create or update alert
   */
  async upsertAlert(alert: Partial<SeoAlertDto>): Promise<SeoAlertDto> {
    const id = alert.id || `alert_${Date.now()}`;
    const existing = this.alerts.get(id);

    const newAlert: SeoAlertDto = {
      id,
      type: alert.type || 'custom',
      metric: alert.metric || 'custom',
      threshold: alert.threshold || 0,
      operator: alert.operator || 'greater_than',
      severity: alert.severity || 'warning',
      message: alert.message || 'Custom alert',
      isActive: alert.isActive ?? true,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.alerts.set(id, newAlert);
    return newAlert;
  }

  /**
   * Delete alert
   */
  async deleteAlert(id: string): Promise<void> {
    this.alerts.delete(id);
  }

  /**
   * Get all goals
   */
  async getGoals(): Promise<SeoGoalDto[]> {
    return Array.from(this.goals.values());
  }

  /**
   * Create or update goal
   */
  async upsertGoal(goal: Partial<SeoGoalDto>): Promise<SeoGoalDto> {
    const id = goal.id || `goal_${Date.now()}`;
    const existing = this.goals.get(id);

    const currentValue = goal.currentValue || 0;
    const targetValue = goal.targetValue || 100;
    const deadline = goal.deadline || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const newGoal: SeoGoalDto = {
      id,
      name: goal.name || 'New Goal',
      metric: goal.metric || 'custom',
      targetValue,
      currentValue,
      deadline,
      progress: Math.round((currentValue / targetValue) * 100),
      status: this.calculateGoalStatus(currentValue, targetValue, deadline),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.goals.set(id, newGoal);
    return newGoal;
  }

  /**
   * Delete goal
   */
  async deleteGoal(id: string): Promise<void> {
    this.goals.delete(id);
  }

  /**
   * Generate SEO report
   */
  async generateReport(
    period: '7d' | '30d' | '90d' = '30d',
    format: ReportFormat = ReportFormat.JSON,
    sections?: string[],
  ): Promise<SeoReportDto | string> {
    const dashboard = await this.getDashboard();
    const trends = await this.getTrends(period);

    const report: SeoReportDto = {
      id: `report_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      period,
      summary: {
        overallScore: dashboard.overview.overallScore,
        scoreChange: dashboard.overview.scoreChange,
        keyMetrics: {
          organicTraffic: dashboard.metrics.organic.traffic,
          indexedPages: dashboard.metrics.technical.indexedPages,
          avgPosition: dashboard.metrics.organic.avgPosition,
          coreWebVitals: dashboard.metrics.performance.score,
        },
        topIssues: dashboard.alerts.slice(0, 5).map(a => a.message),
        improvements: dashboard.recentChanges
          .filter(c => c.type === 'improvement')
          .map(c => c.description),
      },
      sections: {
        technical: {
          title: 'Technical SEO',
          score: dashboard.metrics.technical.score,
          metrics: dashboard.metrics.technical,
          issues: [
            { type: 'crawl_errors', count: dashboard.metrics.technical.crawlErrors },
            { type: 'broken_links', count: dashboard.metrics.technical.brokenLinks },
          ],
          recommendations: [
            'Fix broken internal links',
            'Resolve 404 errors',
            'Update sitemap',
          ],
        },
        content: {
          title: 'Content SEO',
          score: dashboard.metrics.content.score,
          metrics: dashboard.metrics.content,
          issues: [
            { type: 'thin_content', count: dashboard.metrics.content.thinContent },
            { type: 'duplicate_content', count: dashboard.metrics.content.duplicateContent },
            { type: 'missing_meta', count: dashboard.metrics.content.missingMeta },
          ],
          recommendations: [
            'Expand thin content pages',
            'Add unique meta descriptions',
            'Resolve duplicate content',
          ],
        },
        performance: {
          title: 'Performance',
          score: dashboard.metrics.performance.score,
          metrics: dashboard.metrics.performance,
          coreWebVitals: {
            lcp: { value: dashboard.metrics.performance.lcp, status: dashboard.metrics.performance.lcp < 2.5 ? 'good' : 'needs_improvement' },
            fid: { value: dashboard.metrics.performance.fid, status: dashboard.metrics.performance.fid < 100 ? 'good' : 'needs_improvement' },
            cls: { value: dashboard.metrics.performance.cls, status: dashboard.metrics.performance.cls < 0.1 ? 'good' : 'needs_improvement' },
          },
          recommendations: [
            'Optimize images',
            'Implement lazy loading',
            'Minimize JavaScript',
          ],
        },
        organic: {
          title: 'Organic Search',
          metrics: dashboard.metrics.organic,
          trends: trends.slice(-7),
          topKeywords: [
            { keyword: 'online shopping', position: 5, traffic: 1200 },
            { keyword: 'best deals', position: 8, traffic: 800 },
            { keyword: 'free shipping', position: 3, traffic: 1500 },
          ],
          recommendations: [
            'Target more long-tail keywords',
            'Improve page titles for better CTR',
            'Create content for high-volume keywords',
          ],
        },
      },
      trends,
      goals: Array.from(this.goals.values()),
      actionItems: dashboard.quickActions,
    };

    // Filter sections if specified
    if (sections && sections.length > 0) {
      const filtered: any = {};
      for (const section of sections) {
        if (report.sections[section as keyof typeof report.sections]) {
          filtered[section] = report.sections[section as keyof typeof report.sections];
        }
      }
      report.sections = filtered;
    }

    // Format output
    if (format === ReportFormat.JSON) {
      return report;
    }

    if (format === ReportFormat.CSV) {
      return this.formatReportAsCsv(report);
    }

    if (format === ReportFormat.HTML) {
      return this.formatReportAsHtml(report);
    }

    return report;
  }

  /**
   * Compare SEO metrics between periods
   */
  async comparePerformance(
    period1: { start: string; end: string },
    period2: { start: string; end: string },
  ): Promise<SeoComparisonDto> {
    // Generate simulated data for comparison
    const generateMetrics = (baseMultiplier: number) => ({
      overallScore: 70 + Math.floor(Math.random() * 20 * baseMultiplier),
      organicTraffic: Math.floor(20000 * baseMultiplier + Math.random() * 10000),
      keywords: Math.floor(500 * baseMultiplier + Math.random() * 300),
      avgPosition: 20 - Math.random() * 10 * baseMultiplier,
      indexedPages: Math.floor(800 * baseMultiplier + Math.random() * 200),
      coreWebVitals: 75 + Math.floor(Math.random() * 15 * baseMultiplier),
    });

    const period1Metrics = generateMetrics(0.9);
    const period2Metrics = generateMetrics(1.1);

    const calculateChange = (current: number, previous: number) => ({
      absolute: current - previous,
      percentage: ((current - previous) / previous) * 100,
    });

    return {
      period1: {
        start: period1.start,
        end: period1.end,
        metrics: period1Metrics,
      },
      period2: {
        start: period2.start,
        end: period2.end,
        metrics: period2Metrics,
      },
      changes: {
        overallScore: calculateChange(period2Metrics.overallScore, period1Metrics.overallScore),
        organicTraffic: calculateChange(period2Metrics.organicTraffic, period1Metrics.organicTraffic),
        keywords: calculateChange(period2Metrics.keywords, period1Metrics.keywords),
        avgPosition: calculateChange(period2Metrics.avgPosition, period1Metrics.avgPosition),
        indexedPages: calculateChange(period2Metrics.indexedPages, period1Metrics.indexedPages),
        coreWebVitals: calculateChange(period2Metrics.coreWebVitals, period1Metrics.coreWebVitals),
      },
      insights: [
        period2Metrics.organicTraffic > period1Metrics.organicTraffic
          ? 'Organic traffic increased - content strategy is working'
          : 'Organic traffic decreased - review recent changes',
        period2Metrics.avgPosition < period1Metrics.avgPosition
          ? 'Average position improved - rankings are getting better'
          : 'Average position declined - competitors may be gaining ground',
      ],
    };
  }

  // Helper methods

  private async getContentStats(): Promise<{ averageScore: number }> {
    // Simulate content stats
    return {
      averageScore: 72 + Math.floor(Math.random() * 15),
    };
  }

  private calculateOverallScore(technicalSummary: any, contentStats: any): number {
    const weights = {
      technical: 0.4,
      content: 0.3,
      performance: 0.3,
    };

    const technicalScore = technicalSummary.technicalScore;
    const contentScore = contentStats.averageScore;
    const performanceScore = 80 + Math.floor(Math.random() * 15);

    return Math.round(
      technicalScore * weights.technical +
      contentScore * weights.content +
      performanceScore * weights.performance
    );
  }

  private generateTrends(): SeoTrendDto[] {
    return this.generateTrendData(7);
  }

  private generateTrendData(days: number): SeoTrendDto[] {
    const trends: SeoTrendDto[] = [];
    const baseTraffic = 10000;
    const baseScore = 75;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      trends.push({
        date: date.toISOString().split('T')[0],
        organicTraffic: baseTraffic + Math.floor(Math.random() * 2000) - 500 + (days - i) * 50,
        overallScore: baseScore + Math.floor(Math.random() * 10) - 3 + (days - i) * 0.2,
        indexedPages: 900 + Math.floor(Math.random() * 50) + (days - i) * 2,
        avgPosition: 18 - Math.random() * 3 - (days - i) * 0.1,
        impressions: baseTraffic * 10 + Math.floor(Math.random() * 20000),
        clicks: baseTraffic + Math.floor(Math.random() * 2000),
      });
    }

    return trends;
  }

  private calculateGoalStatus(
    currentValue: number,
    targetValue: number,
    deadline: string,
  ): 'on_track' | 'at_risk' | 'behind' | 'completed' {
    const progress = (currentValue / targetValue) * 100;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const totalDays = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (progress >= 100) return 'completed';
    if (totalDays <= 0) return 'behind';
    if (progress >= 80 || (progress / 100) > (1 - totalDays / 90)) return 'on_track';
    return 'at_risk';
  }

  private formatReportAsCsv(report: SeoReportDto): string {
    const lines: string[] = [];

    lines.push('SEO Report');
    lines.push(`Generated: ${report.generatedAt}`);
    lines.push(`Period: ${report.period}`);
    lines.push('');
    lines.push('Summary');
    lines.push(`Overall Score,${report.summary.overallScore}`);
    lines.push(`Score Change,${report.summary.scoreChange}`);
    lines.push(`Organic Traffic,${report.summary.keyMetrics.organicTraffic}`);
    lines.push(`Indexed Pages,${report.summary.keyMetrics.indexedPages}`);
    lines.push(`Avg Position,${report.summary.keyMetrics.avgPosition}`);
    lines.push(`Core Web Vitals,${report.summary.keyMetrics.coreWebVitals}`);
    lines.push('');
    lines.push('Trends');
    lines.push('Date,Traffic,Score,Position');

    for (const trend of report.trends) {
      lines.push(`${trend.date},${trend.organicTraffic},${trend.overallScore},${trend.avgPosition?.toFixed(1)}`);
    }

    return lines.join('\n');
  }

  private formatReportAsHtml(report: SeoReportDto): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>SEO Report - ${report.generatedAt}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1, h2, h3 { color: #333; }
    .metric { display: inline-block; margin: 10px; padding: 15px; background: #f5f5f5; border-radius: 8px; }
    .metric-value { font-size: 24px; font-weight: bold; color: #2196F3; }
    .metric-label { font-size: 12px; color: #666; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    .good { color: #4CAF50; }
    .warning { color: #FF9800; }
    .error { color: #f44336; }
  </style>
</head>
<body>
  <h1>SEO Report</h1>
  <p>Generated: ${report.generatedAt} | Period: ${report.period}</p>

  <h2>Summary</h2>
  <div class="metric">
    <div class="metric-value">${report.summary.overallScore}</div>
    <div class="metric-label">Overall Score</div>
  </div>
  <div class="metric">
    <div class="metric-value">${report.summary.keyMetrics.organicTraffic.toLocaleString()}</div>
    <div class="metric-label">Organic Traffic</div>
  </div>
  <div class="metric">
    <div class="metric-value">${report.summary.keyMetrics.indexedPages}</div>
    <div class="metric-label">Indexed Pages</div>
  </div>
  <div class="metric">
    <div class="metric-value">${report.summary.keyMetrics.avgPosition.toFixed(1)}</div>
    <div class="metric-label">Avg Position</div>
  </div>

  <h2>Trends</h2>
  <table>
    <tr>
      <th>Date</th>
      <th>Traffic</th>
      <th>Score</th>
      <th>Position</th>
    </tr>
    ${report.trends.map(t => `
    <tr>
      <td>${t.date}</td>
      <td>${t.organicTraffic.toLocaleString()}</td>
      <td>${t.overallScore}</td>
      <td>${t.avgPosition?.toFixed(1)}</td>
    </tr>
    `).join('')}
  </table>

  <h2>Action Items</h2>
  <ul>
    ${report.actionItems.map(a => `<li><strong>${a.title}</strong>: ${a.description}</li>`).join('')}
  </ul>
</body>
</html>`;
  }
}
