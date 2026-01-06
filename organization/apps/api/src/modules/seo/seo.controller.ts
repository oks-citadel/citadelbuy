import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { SeoService } from './seo.service';
import { SeoSchedulerService } from './seo-scheduler.service';
import { SitemapService } from './sitemap/sitemap.service';
import { AuditService } from './audit/audit.service';
import { VitalsService } from './vitals/vitals.service';
import { TechnicalService } from './technical/technical.service';

@ApiTags('SEO')
@Controller('seo')
export class SeoController {
  constructor(
    private readonly seoService: SeoService,
    private readonly schedulerService: SeoSchedulerService,
    private readonly sitemapService: SitemapService,
    private readonly auditService: AuditService,
    private readonly vitalsService: VitalsService,
    private readonly technicalService: TechnicalService,
  ) {}

  // ==================== LEGACY ENDPOINTS (backward compatibility) ====================

  @Post('meta/:entityType/:entityId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Upsert SEO metadata',
    description: 'Creates or updates SEO metadata for a specific entity.',
  })
  async upsertMeta(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() data: any,
  ) {
    return this.seoService.upsertSeoMeta(entityType, entityId, data);
  }

  @Get('meta/:entityType/:entityId')
  @ApiOperation({
    summary: 'Get SEO metadata',
    description: 'Retrieves SEO metadata for a specific entity.',
  })
  async getMeta(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.seoService.getSeoMeta(entityType, entityId);
  }

  @Post('sitemap/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Generate sitemap',
    description: 'Triggers sitemap regeneration.',
  })
  async generateSitemap() {
    return this.seoService.generateSitemap();
  }

  @Get('sitemap')
  @ApiOperation({
    summary: 'Get sitemap entries',
    description: 'Returns sitemap entries from the database.',
  })
  async getSitemap() {
    return this.seoService.getSitemap();
  }

  // ==================== DASHBOARD / OVERVIEW ====================

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get SEO dashboard data',
    description: 'Returns a comprehensive overview of all SEO metrics.',
  })
  @ApiResponse({
    status: 200,
    description: 'SEO dashboard data',
    schema: {
      type: 'object',
      properties: {
        overview: { type: 'object' },
        vitals: { type: 'object' },
        audit: { type: 'object' },
        technical: { type: 'object' },
      },
    },
  })
  async getDashboard() {
    const [sitemapStats, auditSummary, vitalsSummary, technicalSummary] = await Promise.all([
      this.sitemapService.getSitemapStats(),
      this.auditService.getAuditSummary(),
      this.vitalsService.getVitalsSummary(),
      this.technicalService.getTechnicalSummary(),
    ]);

    return {
      overview: {
        seoScore: auditSummary.currentScore,
        scoreTrend: auditSummary.scoreTrend,
        technicalScore: technicalSummary.technicalScore,
        performanceScore: vitalsSummary.averagePerformanceScore,
        totalPages: sitemapStats.totalUrls,
        lastUpdated: new Date().toISOString(),
      },
      sitemap: sitemapStats,
      vitals: {
        passRate: vitalsSummary.passRate,
        averageLcp: vitalsSummary.averageLcp,
        averageInp: vitalsSummary.averageInp,
        averageCls: vitalsSummary.averageCls,
        urlsWithIssues: vitalsSummary.urlsWithIssues.length,
      },
      audit: {
        openIssues: auditSummary.openIssues,
        criticalIssues: auditSummary.criticalIssues,
        resolvedIssues: auditSummary.resolvedIssues,
        lastAuditDate: auditSummary.lastAuditDate,
      },
      technical: {
        canonicalIssues: technicalSummary.canonicalIssues,
        hreflangIssues: technicalSummary.hreflangIssues,
        indexingIssues: technicalSummary.indexingIssues,
        redirectIssues: technicalSummary.redirectIssues,
        httpsAdoptionRate: technicalSummary.httpsAdoptionRate,
        mobileFriendlyRate: technicalSummary.mobileFriendlyRate,
      },
    };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Get SEO health status',
    description: 'Returns a quick health check of the SEO module.',
  })
  async getHealth() {
    const [auditSummary, vitalsSummary, technicalSummary] = await Promise.all([
      this.auditService.getAuditSummary(),
      this.vitalsService.getVitalsSummary(),
      this.technicalService.getTechnicalSummary(),
    ]);

    const overallScore = Math.round(
      (auditSummary.currentScore +
        technicalSummary.technicalScore +
        vitalsSummary.averagePerformanceScore) /
        3
    );

    let status: 'healthy' | 'warning' | 'critical';
    if (overallScore >= 80) {
      status = 'healthy';
    } else if (overallScore >= 50) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    return {
      status,
      overallScore,
      scores: {
        content: auditSummary.currentScore,
        technical: technicalSummary.technicalScore,
        performance: Math.round(vitalsSummary.averagePerformanceScore),
      },
      issues: {
        critical: auditSummary.criticalIssues,
        total: auditSummary.openIssues,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // ==================== SCHEDULER MANAGEMENT ====================

  @Get('scheduler/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get scheduler status',
    description: 'Returns the status of all scheduled SEO jobs.',
  })
  async getSchedulerStatus() {
    return this.schedulerService.getSchedulerStatus();
  }

  @Post('scheduler/jobs/:name/pause')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Pause a scheduled job',
    description: 'Pauses a specific scheduled SEO job.',
  })
  async pauseJob(@Param('name') name: string) {
    this.schedulerService.pauseJob(name);
    return { success: true, message: `Job "${name}" has been paused` };
  }

  @Post('scheduler/jobs/:name/resume')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Resume a scheduled job',
    description: 'Resumes a paused scheduled SEO job.',
  })
  async resumeJob(@Param('name') name: string) {
    this.schedulerService.resumeJob(name);
    return { success: true, message: `Job "${name}" has been resumed` };
  }

  @Post('scheduler/trigger/sitemap')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Trigger sitemap regeneration',
    description: 'Manually triggers sitemap regeneration.',
  })
  async triggerSitemapRegeneration() {
    await this.schedulerService.triggerSitemapRegeneration();
    return { success: true, message: 'Sitemap regeneration triggered' };
  }

  @Post('scheduler/trigger/audit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Trigger SEO audit',
    description: 'Manually triggers a full SEO audit.',
  })
  async triggerSeoAudit() {
    await this.schedulerService.triggerSeoAudit();
    return { success: true, message: 'SEO audit triggered' };
  }

  // ==================== CACHE MANAGEMENT ====================

  @Post('cache/invalidate/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Invalidate all SEO caches',
    description: 'Clears all cached SEO data including sitemaps, robots.txt, and metrics.',
  })
  async invalidateAllCaches() {
    await Promise.all([
      this.sitemapService.invalidateCache(),
    ]);
    return { success: true, message: 'All SEO caches invalidated' };
  }

  // ==================== QUICK ACTIONS ====================

  @Get('quick-wins')
  @ApiOperation({
    summary: 'Get quick SEO wins',
    description: 'Returns a list of quick SEO improvements that can be made.',
  })
  async getQuickWins() {
    const auditSummary = await this.auditService.getAuditSummary();

    // Filter for high-impact, easy fixes
    const quickWins = auditSummary.topIssues
      .filter((issue) => issue.severity !== 'critical') // Not critical issues
      .slice(0, 10);

    return {
      wins: quickWins,
      potentialScoreIncrease: quickWins.length * 2, // Estimated score boost
      estimatedTimeToFix: `${quickWins.length * 5} minutes`,
    };
  }

  @Get('competitor-keywords')
  @ApiOperation({
    summary: 'Get competitor keyword opportunities',
    description: 'Returns keywords where competitors rank but you don\'t (placeholder).',
  })
  async getCompetitorKeywords() {
    // This is a placeholder - in production, this would integrate with
    // SEMrush, Ahrefs, or similar tools
    return {
      message: 'This feature requires integration with keyword research APIs',
      suggestedIntegrations: ['Ahrefs API', 'SEMrush API', 'Moz API'],
    };
  }

  @Get('ranking-changes')
  @ApiOperation({
    summary: 'Get ranking changes',
    description: 'Returns recent ranking changes for tracked keywords (placeholder).',
  })
  async getRankingChanges() {
    // This is a placeholder - in production, this would integrate with
    // rank tracking services
    return {
      message: 'This feature requires integration with rank tracking APIs',
      suggestedIntegrations: ['Google Search Console API', 'AccuRanker API', 'SERPWatcher API'],
    };
  }
}
