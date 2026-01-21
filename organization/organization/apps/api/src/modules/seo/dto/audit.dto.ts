import { IsString, IsOptional, IsArray, IsNumber, IsBoolean, IsEnum, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SEOIssueSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum SEOIssueCategory {
  META = 'meta',
  CONTENT = 'content',
  TECHNICAL = 'technical',
  MOBILE = 'mobile',
  PERFORMANCE = 'performance',
  LINKS = 'links',
  IMAGES = 'images',
  STRUCTURED_DATA = 'structured_data',
  SECURITY = 'security',
  INDEXABILITY = 'indexability',
}

export enum AuditStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class ScheduleAuditDto {
  @ApiPropertyOptional({ description: 'Specific URLs to audit', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  urls?: string[];

  @ApiPropertyOptional({ description: 'Maximum pages to crawl', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  maxPages?: number;

  @ApiPropertyOptional({ description: 'Crawl depth', default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  depth?: number;

  @ApiPropertyOptional({ description: 'Include external link checking', default: false })
  @IsOptional()
  @IsBoolean()
  checkExternalLinks?: boolean;

  @ApiPropertyOptional({ description: 'Include image analysis', default: true })
  @IsOptional()
  @IsBoolean()
  analyzeImages?: boolean;

  @ApiPropertyOptional({ description: 'Include structured data validation', default: true })
  @IsOptional()
  @IsBoolean()
  validateStructuredData?: boolean;

  @ApiPropertyOptional({ description: 'Check mobile friendliness', default: true })
  @IsOptional()
  @IsBoolean()
  checkMobileFriendliness?: boolean;

  @ApiPropertyOptional({ description: 'Schedule time (cron expression)' })
  @IsOptional()
  @IsString()
  cronSchedule?: string;

  @ApiPropertyOptional({ description: 'Notify on completion via email' })
  @IsOptional()
  @IsString()
  notifyEmail?: string;
}

export class SEOIssueDto {
  @ApiProperty({ description: 'Issue ID' })
  id: string;

  @ApiProperty({ description: 'Affected URL' })
  url: string;

  @ApiProperty({ description: 'Issue category', enum: SEOIssueCategory })
  category: SEOIssueCategory;

  @ApiProperty({ description: 'Issue severity', enum: SEOIssueSeverity })
  severity: SEOIssueSeverity;

  @ApiProperty({ description: 'Issue title' })
  title: string;

  @ApiProperty({ description: 'Issue description' })
  description: string;

  @ApiPropertyOptional({ description: 'How to fix the issue' })
  recommendation?: string;

  @ApiPropertyOptional({ description: 'Current value that caused the issue' })
  currentValue?: string;

  @ApiPropertyOptional({ description: 'Expected/recommended value' })
  expectedValue?: string;

  @ApiPropertyOptional({ description: 'Impact score (0-100)' })
  impactScore?: number;

  @ApiProperty({ description: 'Date when issue was detected' })
  detectedAt: string;

  @ApiPropertyOptional({ description: 'Is the issue resolved' })
  resolved?: boolean;

  @ApiPropertyOptional({ description: 'Date when issue was resolved' })
  resolvedAt?: string;
}

export class BrokenLinkDto {
  @ApiProperty({ description: 'Source URL containing the broken link' })
  sourceUrl: string;

  @ApiProperty({ description: 'The broken link URL' })
  targetUrl: string;

  @ApiProperty({ description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ description: 'Link anchor text' })
  anchorText: string;

  @ApiProperty({ description: 'Is external link' })
  isExternal: boolean;

  @ApiProperty({ description: 'Link type (anchor, image, script, etc.)' })
  linkType: string;

  @ApiProperty({ description: 'Date detected' })
  detectedAt: string;
}

export class RedirectChainDto {
  @ApiProperty({ description: 'Original URL' })
  originalUrl: string;

  @ApiProperty({ description: 'Final destination URL' })
  finalUrl: string;

  @ApiProperty({ description: 'Redirect chain', type: [Object] })
  chain: {
    url: string;
    statusCode: number;
    redirectType: string;
  }[];

  @ApiProperty({ description: 'Total number of redirects' })
  redirectCount: number;

  @ApiProperty({ description: 'Is the chain too long (>3 redirects)' })
  isTooLong: boolean;

  @ApiPropertyOptional({ description: 'Has redirect loop' })
  hasLoop?: boolean;
}

export class AuditResultDto {
  @ApiProperty({ description: 'Audit ID' })
  id: string;

  @ApiProperty({ description: 'Audit status', enum: AuditStatus })
  status: AuditStatus;

  @ApiProperty({ description: 'Audit start time' })
  startedAt: string;

  @ApiPropertyOptional({ description: 'Audit completion time' })
  completedAt?: string;

  @ApiProperty({ description: 'Total pages crawled' })
  pagesCrawled: number;

  @ApiProperty({ description: 'Total issues found' })
  issuesCount: number;

  @ApiProperty({ description: 'Issues by severity' })
  issuesBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };

  @ApiProperty({ description: 'Issues by category' })
  issuesByCategory: Record<string, number>;

  @ApiProperty({ description: 'Overall SEO score (0-100)' })
  seoScore: number;

  @ApiPropertyOptional({ description: 'Error message if audit failed' })
  error?: string;
}

export class AuditSummaryDto {
  @ApiProperty({ description: 'Total audits performed' })
  totalAudits: number;

  @ApiProperty({ description: 'Last audit date' })
  lastAuditDate?: string;

  @ApiProperty({ description: 'Current SEO score' })
  currentScore: number;

  @ApiProperty({ description: 'Score trend (improvement/decline)' })
  scoreTrend: number;

  @ApiProperty({ description: 'Open issues count' })
  openIssues: number;

  @ApiProperty({ description: 'Resolved issues count (last 30 days)' })
  resolvedIssues: number;

  @ApiProperty({ description: 'Critical issues count' })
  criticalIssues: number;

  @ApiProperty({ description: 'Top issues to fix', type: [SEOIssueDto] })
  topIssues: SEOIssueDto[];
}

export class QueryIssuesDto {
  @ApiPropertyOptional({ description: 'Filter by severity', enum: SEOIssueSeverity })
  @IsOptional()
  @IsEnum(SEOIssueSeverity)
  severity?: SEOIssueSeverity;

  @ApiPropertyOptional({ description: 'Filter by category', enum: SEOIssueCategory })
  @IsOptional()
  @IsEnum(SEOIssueCategory)
  category?: SEOIssueCategory;

  @ApiPropertyOptional({ description: 'Filter by URL pattern' })
  @IsOptional()
  @IsString()
  urlPattern?: string;

  @ApiPropertyOptional({ description: 'Include resolved issues', default: false })
  @IsOptional()
  @IsBoolean()
  includeResolved?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
