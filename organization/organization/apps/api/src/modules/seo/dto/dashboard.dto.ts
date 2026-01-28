import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SeoOverviewDto {
  @ApiProperty({ description: 'Overall SEO score (0-100)' })
  overallScore: number;

  @ApiProperty({ description: 'Previous period score' })
  previousScore: number;

  @ApiProperty({ description: 'Score change from previous period' })
  scoreChange: number;

  @ApiProperty({ description: 'Health status' })
  healthStatus: 'good' | 'needs_attention' | 'critical';

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdated: string;
}

export class SeoTrendDto {
  @ApiProperty({ description: 'Date' })
  date: string;

  @ApiProperty({ description: 'Organic traffic' })
  organicTraffic: number;

  @ApiProperty({ description: 'Overall score' })
  overallScore: number;

  @ApiPropertyOptional({ description: 'Indexed pages' })
  indexedPages?: number;

  @ApiPropertyOptional({ description: 'Average position' })
  avgPosition?: number;

  @ApiPropertyOptional({ description: 'Impressions' })
  impressions?: number;

  @ApiPropertyOptional({ description: 'Clicks' })
  clicks?: number;
}

export class SeoAlertDto {
  @ApiProperty({ description: 'Alert ID' })
  id: string;

  @ApiProperty({ description: 'Alert type' })
  type: 'performance' | 'technical' | 'content' | 'ranking' | 'custom';

  @ApiProperty({ description: 'Metric being monitored' })
  metric: string;

  @ApiProperty({ description: 'Threshold value' })
  threshold: number;

  @ApiProperty({ description: 'Comparison operator' })
  operator: 'greater_than' | 'less_than' | 'equals';

  @ApiProperty({ description: 'Alert severity' })
  severity: 'critical' | 'error' | 'warning' | 'info';

  @ApiProperty({ description: 'Alert message' })
  message: string;

  @ApiProperty({ description: 'Whether alert is active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Whether alert is triggered' })
  triggered?: boolean;

  @ApiPropertyOptional({ description: 'When alert was triggered' })
  triggeredAt?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;

  @ApiPropertyOptional({ description: 'Updated timestamp' })
  updatedAt?: string;
}

export class SeoGoalDto {
  @ApiProperty({ description: 'Goal ID' })
  id: string;

  @ApiProperty({ description: 'Goal name' })
  name: string;

  @ApiProperty({ description: 'Metric being tracked' })
  metric: string;

  @ApiProperty({ description: 'Target value' })
  targetValue: number;

  @ApiProperty({ description: 'Current value' })
  currentValue: number;

  @ApiProperty({ description: 'Deadline' })
  deadline: string;

  @ApiProperty({ description: 'Progress percentage' })
  progress: number;

  @ApiProperty({ description: 'Goal status' })
  status: 'on_track' | 'at_risk' | 'behind' | 'completed';

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;

  @ApiPropertyOptional({ description: 'Updated timestamp' })
  updatedAt?: string;
}

export class QuickActionDto {
  @ApiProperty({ description: 'Action ID' })
  id: string;

  @ApiProperty({ description: 'Action title' })
  title: string;

  @ApiProperty({ description: 'Action description' })
  description: string;

  @ApiProperty({ description: 'Priority' })
  priority: 'high' | 'medium' | 'low';

  @ApiProperty({ description: 'Estimated impact' })
  estimatedImpact: string;

  @ApiProperty({ description: 'Action identifier' })
  action: string;
}

export class RecentChangeDto {
  @ApiProperty({ description: 'Change date' })
  date: string;

  @ApiProperty({ description: 'Change type' })
  type: 'improvement' | 'issue' | 'info';

  @ApiProperty({ description: 'Change description' })
  description: string;
}

export class SeoDashboardDto {
  @ApiProperty({ description: 'Overview metrics', type: SeoOverviewDto })
  overview: SeoOverviewDto;

  @ApiProperty({ description: 'Detailed metrics' })
  metrics: {
    technical: {
      score: number;
      issues: number;
      indexedPages: number;
      totalPages: number;
      crawlErrors: number;
      brokenLinks: number;
      httpsPages: number;
      mobileReady: number;
    };
    content: {
      score: number;
      totalContent: number;
      optimizedContent: number;
      thinContent: number;
      duplicateContent: number;
      missingMeta: number;
    };
    performance: {
      score: number;
      avgLoadTime: number;
      lcp: number;
      fid: number;
      cls: number;
      ttfb: number;
    };
    organic: {
      traffic: number;
      trafficChange: number;
      keywords: number;
      keywordsChange: number;
      avgPosition: number;
      positionChange: number;
      impressions: number;
      clicks: number;
      ctr: number;
    };
  };

  @ApiProperty({ description: 'Trends', type: [SeoTrendDto] })
  trends: SeoTrendDto[];

  @ApiProperty({ description: 'Active alerts', type: [SeoAlertDto] })
  alerts: SeoAlertDto[];

  @ApiProperty({ description: 'Goals', type: [SeoGoalDto] })
  goals: SeoGoalDto[];

  @ApiProperty({ description: 'Quick actions', type: [QuickActionDto] })
  quickActions: QuickActionDto[];

  @ApiProperty({ description: 'Recent changes', type: [RecentChangeDto] })
  recentChanges: RecentChangeDto[];
}

export enum ReportFormat {
  JSON = 'json',
  CSV = 'csv',
  HTML = 'html',
  PDF = 'pdf',
}

export class SeoReportDto {
  @ApiProperty({ description: 'Report ID' })
  id: string;

  @ApiProperty({ description: 'Generated timestamp' })
  generatedAt: string;

  @ApiProperty({ description: 'Report period' })
  period: '7d' | '30d' | '90d';

  @ApiProperty({ description: 'Report summary' })
  summary: {
    overallScore: number;
    scoreChange: number;
    keyMetrics: {
      organicTraffic: number;
      indexedPages: number;
      avgPosition: number;
      coreWebVitals: number;
    };
    topIssues: string[];
    improvements: string[];
  };

  @ApiProperty({ description: 'Report sections' })
  sections: Record<string, any>;

  @ApiProperty({ description: 'Trends data', type: [SeoTrendDto] })
  trends: SeoTrendDto[];

  @ApiProperty({ description: 'Goals', type: [SeoGoalDto] })
  goals: SeoGoalDto[];

  @ApiProperty({ description: 'Action items', type: [QuickActionDto] })
  actionItems: QuickActionDto[];
}

export class SeoComparisonDto {
  @ApiProperty({ description: 'First period' })
  period1: {
    start: string;
    end: string;
    metrics: Record<string, number>;
  };

  @ApiProperty({ description: 'Second period' })
  period2: {
    start: string;
    end: string;
    metrics: Record<string, number>;
  };

  @ApiProperty({ description: 'Changes between periods' })
  changes: Record<string, { absolute: number; percentage: number }>;

  @ApiProperty({ description: 'Insights', type: [String] })
  insights: string[];
}

// Request DTOs

export class CreateAlertDto {
  @ApiProperty({ description: 'Alert type' })
  @IsString()
  type: 'performance' | 'technical' | 'content' | 'ranking' | 'custom';

  @ApiProperty({ description: 'Metric to monitor' })
  @IsString()
  metric: string;

  @ApiProperty({ description: 'Threshold value' })
  @IsNumber()
  threshold: number;

  @ApiProperty({ description: 'Comparison operator' })
  @IsString()
  operator: 'greater_than' | 'less_than' | 'equals';

  @ApiProperty({ description: 'Alert severity' })
  @IsString()
  severity: 'critical' | 'error' | 'warning' | 'info';

  @ApiProperty({ description: 'Alert message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Whether alert is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateGoalDto {
  @ApiProperty({ description: 'Goal name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Metric to track' })
  @IsString()
  metric: string;

  @ApiProperty({ description: 'Target value' })
  @IsNumber()
  targetValue: number;

  @ApiProperty({ description: 'Current value' })
  @IsNumber()
  currentValue: number;

  @ApiProperty({ description: 'Deadline' })
  @IsDateString()
  deadline: string;
}

export class UpdateGoalDto {
  @ApiPropertyOptional({ description: 'Goal name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Target value' })
  @IsOptional()
  @IsNumber()
  targetValue?: number;

  @ApiPropertyOptional({ description: 'Current value' })
  @IsOptional()
  @IsNumber()
  currentValue?: number;

  @ApiPropertyOptional({ description: 'Deadline' })
  @IsOptional()
  @IsDateString()
  deadline?: string;
}

export class GenerateReportDto {
  @ApiPropertyOptional({ description: 'Report period', default: '30d' })
  @IsOptional()
  @IsString()
  period?: '7d' | '30d' | '90d';

  @ApiPropertyOptional({ description: 'Report format', enum: ReportFormat, default: ReportFormat.JSON })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;

  @ApiPropertyOptional({ description: 'Sections to include', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sections?: string[];
}

export class ComparePeriodsDto {
  @ApiProperty({ description: 'First period start date' })
  @IsDateString()
  period1Start: string;

  @ApiProperty({ description: 'First period end date' })
  @IsDateString()
  period1End: string;

  @ApiProperty({ description: 'Second period start date' })
  @IsDateString()
  period2Start: string;

  @ApiProperty({ description: 'Second period end date' })
  @IsDateString()
  period2End: string;
}
