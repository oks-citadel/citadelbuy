import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuditService } from './audit.service';
import {
  ScheduleAuditDto,
  AuditResultDto,
  AuditSummaryDto,
  SEOIssueDto,
  BrokenLinkDto,
  RedirectChainDto,
  QueryIssuesDto,
  SEOIssueSeverity,
  SEOIssueCategory,
} from '../dto/audit.dto';

@ApiTags('SEO - Audit')
@Controller('seo/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary: 'Get audit summary',
    description: 'Returns a summary of all SEO audits including current score and top issues.',
  })
  @ApiResponse({ status: 200, description: 'Audit summary', type: AuditSummaryDto })
  async getAuditSummary(): Promise<AuditSummaryDto> {
    return this.auditService.getAuditSummary();
  }

  @Get('latest')
  @ApiOperation({
    summary: 'Get latest audit result',
    description: 'Returns the most recent SEO audit result.',
  })
  @ApiResponse({ status: 200, description: 'Latest audit result', type: AuditResultDto })
  async getLatestAudit(): Promise<AuditResultDto | null> {
    return this.auditService.getLatestAudit();
  }

  @Get(':auditId')
  @ApiOperation({
    summary: 'Get audit result by ID',
    description: 'Returns the SEO audit result for a specific audit.',
  })
  @ApiParam({ name: 'auditId', description: 'Audit ID' })
  @ApiResponse({ status: 200, description: 'Audit result', type: AuditResultDto })
  async getAuditResult(@Param('auditId') auditId: string): Promise<AuditResultDto | null> {
    return this.auditService.getAuditResult(auditId);
  }

  @Post('schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Schedule a new SEO audit',
    description: 'Schedules a new SEO audit with the specified configuration.',
  })
  @ApiResponse({ status: 201, description: 'Audit scheduled', type: AuditResultDto })
  async scheduleAudit(@Body() dto: ScheduleAuditDto): Promise<AuditResultDto> {
    return this.auditService.scheduleAudit(dto);
  }

  @Get('issues')
  @ApiOperation({
    summary: 'Get SEO issues',
    description: 'Returns a list of SEO issues found during audits with filtering.',
  })
  @ApiQuery({ name: 'severity', enum: SEOIssueSeverity, required: false })
  @ApiQuery({ name: 'category', enum: SEOIssueCategory, required: false })
  @ApiQuery({ name: 'urlPattern', type: String, required: false })
  @ApiQuery({ name: 'includeResolved', type: Boolean, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({
    status: 200,
    description: 'List of SEO issues',
    schema: {
      type: 'object',
      properties: {
        issues: { type: 'array', items: { $ref: '#/components/schemas/SEOIssueDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async getIssues(@Query() query: QueryIssuesDto) {
    return this.auditService.getIssues(query);
  }

  @Get('broken-links')
  @ApiOperation({
    summary: 'Get broken links',
    description: 'Returns a list of broken links found during audits.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of broken links',
    type: [BrokenLinkDto],
  })
  async getBrokenLinks(): Promise<BrokenLinkDto[]> {
    return this.auditService.getBrokenLinks();
  }

  @Get('redirects')
  @ApiOperation({
    summary: 'Get redirect chain analysis',
    description: 'Returns analysis of redirect chains found during audits.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of redirect chains',
    type: [RedirectChainDto],
  })
  async getRedirectChains(): Promise<RedirectChainDto[]> {
    return this.auditService.getRedirectChains();
  }

  @Post('issues/:issueId/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Mark issue as resolved',
    description: 'Marks a specific SEO issue as resolved.',
  })
  @ApiParam({ name: 'issueId', description: 'Issue ID' })
  @ApiResponse({ status: 200, description: 'Issue resolved' })
  async resolveIssue(@Param('issueId') issueId: string) {
    const resolved = await this.auditService.resolveIssue(issueId);
    return { success: resolved };
  }

  @Post('clear')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Clear all audit data',
    description: 'Clears all stored audit data (Admin only).',
  })
  @ApiResponse({ status: 200, description: 'Audit data cleared' })
  async clearAuditData() {
    await this.auditService.clearAuditData();
    return { success: true, message: 'All audit data cleared' };
  }
}
