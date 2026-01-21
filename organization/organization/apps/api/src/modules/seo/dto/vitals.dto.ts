import { IsString, IsOptional, IsNumber, IsEnum, IsArray, IsDateString, Min, Max, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CoreWebVitalMetric {
  LCP = 'LCP', // Largest Contentful Paint
  INP = 'INP', // Interaction to Next Paint (replaced FID)
  CLS = 'CLS', // Cumulative Layout Shift
  FCP = 'FCP', // First Contentful Paint
  TTFB = 'TTFB', // Time to First Byte
}

export enum VitalRating {
  GOOD = 'good',
  NEEDS_IMPROVEMENT = 'needs-improvement',
  POOR = 'poor',
}

export enum DeviceType {
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
  TABLET = 'tablet',
}

export class CoreWebVitalDto {
  @ApiProperty({ description: 'Metric name', enum: CoreWebVitalMetric })
  metric: CoreWebVitalMetric;

  @ApiProperty({ description: 'Metric value' })
  value: number;

  @ApiProperty({ description: 'Rating', enum: VitalRating })
  rating: VitalRating;

  @ApiProperty({ description: 'Unit of measurement' })
  unit: string;

  @ApiPropertyOptional({ description: 'Threshold for good rating' })
  goodThreshold?: number;

  @ApiPropertyOptional({ description: 'Threshold for poor rating' })
  poorThreshold?: number;

  @ApiPropertyOptional({ description: 'Percentile (p75)' })
  percentile?: number;
}

export class PageSpeedMetricsDto {
  @ApiProperty({ description: 'URL analyzed' })
  url: string;

  @ApiProperty({ description: 'Device type', enum: DeviceType })
  deviceType: DeviceType;

  @ApiProperty({ description: 'Overall performance score (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  performanceScore: number;

  @ApiProperty({ description: 'Core Web Vitals', type: [CoreWebVitalDto] })
  coreWebVitals: CoreWebVitalDto[];

  @ApiPropertyOptional({ description: 'First Contentful Paint (seconds)' })
  firstContentfulPaint?: number;

  @ApiPropertyOptional({ description: 'Speed Index (seconds)' })
  speedIndex?: number;

  @ApiPropertyOptional({ description: 'Time to Interactive (seconds)' })
  timeToInteractive?: number;

  @ApiPropertyOptional({ description: 'Total Blocking Time (ms)' })
  totalBlockingTime?: number;

  @ApiPropertyOptional({ description: 'Page size in bytes' })
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Number of requests' })
  requestCount?: number;

  @ApiPropertyOptional({ description: 'DOM size (number of elements)' })
  domSize?: number;

  @ApiProperty({ description: 'Timestamp of the analysis' })
  analyzedAt: string;
}

export class VitalsHistoryDto {
  @ApiProperty({ description: 'URL' })
  url: string;

  @ApiProperty({ description: 'Start date of history' })
  startDate: string;

  @ApiProperty({ description: 'End date of history' })
  endDate: string;

  @ApiProperty({ description: 'Historical data points' })
  history: {
    date: string;
    lcp: number;
    inp: number;
    cls: number;
    performanceScore: number;
  }[];

  @ApiProperty({ description: 'Trend analysis' })
  trends: {
    lcpTrend: 'improving' | 'stable' | 'declining';
    inpTrend: 'improving' | 'stable' | 'declining';
    clsTrend: 'improving' | 'stable' | 'declining';
    overallTrend: 'improving' | 'stable' | 'declining';
  };
}

export class MobileFriendlinessDto {
  @ApiProperty({ description: 'URL analyzed' })
  url: string;

  @ApiProperty({ description: 'Is the page mobile friendly' })
  isMobileFriendly: boolean;

  @ApiProperty({ description: 'Mobile friendliness score (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @ApiProperty({ description: 'Issues found', type: [Object] })
  issues: {
    type: string;
    description: string;
    severity: 'critical' | 'warning' | 'info';
  }[];

  @ApiPropertyOptional({ description: 'Viewport configuration' })
  viewport?: {
    isConfigured: boolean;
    width: string;
    initialScale: string;
  };

  @ApiPropertyOptional({ description: 'Font size analysis' })
  fontSizes?: {
    isLegible: boolean;
    smallTextPercentage: number;
  };

  @ApiPropertyOptional({ description: 'Touch targets analysis' })
  touchTargets?: {
    areProperlySpaced: boolean;
    tooSmallCount: number;
    tooCloseCount: number;
  };

  @ApiPropertyOptional({ description: 'Content width analysis' })
  contentWidth?: {
    fitsViewport: boolean;
    horizontalScrollRequired: boolean;
  };

  @ApiProperty({ description: 'Timestamp of the analysis' })
  analyzedAt: string;
}

export class QueryVitalsDto {
  @ApiPropertyOptional({ description: 'URL to analyze' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ description: 'Device type', enum: DeviceType })
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @ApiPropertyOptional({ description: 'Start date for historical data' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for historical data' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class AnalyzeUrlDto {
  @ApiProperty({ description: 'URL to analyze' })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({ description: 'Device type', enum: DeviceType, default: DeviceType.MOBILE })
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @ApiPropertyOptional({ description: 'Force fresh analysis (bypass cache)', default: false })
  @IsOptional()
  forceRefresh?: boolean;
}

export class VitalsSummaryDto {
  @ApiProperty({ description: 'Overall CWV pass rate (percentage of URLs passing)' })
  passRate: number;

  @ApiProperty({ description: 'Total URLs monitored' })
  totalUrls: number;

  @ApiProperty({ description: 'URLs passing all CWV thresholds' })
  passingUrls: number;

  @ApiProperty({ description: 'Average LCP across all URLs' })
  averageLcp: number;

  @ApiProperty({ description: 'Average INP across all URLs' })
  averageInp: number;

  @ApiProperty({ description: 'Average CLS across all URLs' })
  averageCls: number;

  @ApiProperty({ description: 'Average performance score' })
  averagePerformanceScore: number;

  @ApiProperty({ description: 'URLs with issues', type: [Object] })
  urlsWithIssues: {
    url: string;
    failingMetrics: CoreWebVitalMetric[];
    performanceScore: number;
  }[];

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdated: string;
}

export class ReportVitalsDto {
  @ApiProperty({ description: 'URL being reported' })
  @IsUrl()
  url: string;

  @ApiProperty({ description: 'LCP value in milliseconds' })
  @IsNumber()
  @Min(0)
  lcp: number;

  @ApiProperty({ description: 'INP value in milliseconds' })
  @IsNumber()
  @Min(0)
  inp: number;

  @ApiProperty({ description: 'CLS value' })
  @IsNumber()
  @Min(0)
  cls: number;

  @ApiPropertyOptional({ description: 'FCP value in milliseconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fcp?: number;

  @ApiPropertyOptional({ description: 'TTFB value in milliseconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ttfb?: number;

  @ApiPropertyOptional({ description: 'Device type', enum: DeviceType })
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @ApiPropertyOptional({ description: 'Connection type (4g, 3g, 2g, slow-2g)' })
  @IsOptional()
  @IsString()
  connectionType?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;
}
