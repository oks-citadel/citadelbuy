import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Behavior query parameters
 */
export class BehaviorQueryDto {
  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by page URL' })
  @IsOptional()
  @IsString()
  pageUrl?: string;

  @ApiPropertyOptional({ description: 'Filter by page path pattern' })
  @IsOptional()
  @IsString()
  pagePattern?: string;

  @ApiPropertyOptional({ description: 'Device type filter' })
  @IsOptional()
  @IsString()
  deviceType?: string;
}

/**
 * Heatmap data point
 */
export class HeatmapPointDto {
  @ApiProperty({ description: 'X coordinate (percentage from left)' })
  x: number;

  @ApiProperty({ description: 'Y coordinate (percentage from top)' })
  y: number;

  @ApiProperty({ description: 'Intensity/count at this point' })
  value: number;
}

/**
 * Heatmap data for a page
 */
export class HeatmapDataDto {
  @ApiProperty({ description: 'Page URL' })
  pageUrl: string;

  @ApiProperty({ description: 'Heatmap type (click, move, scroll)' })
  type: 'click' | 'move' | 'scroll';

  @ApiProperty({ description: 'Total interactions' })
  totalInteractions: number;

  @ApiProperty({ description: 'Unique sessions' })
  uniqueSessions: number;

  @ApiProperty({ description: 'Heatmap data points', type: [HeatmapPointDto] })
  data: HeatmapPointDto[];

  @ApiProperty({ description: 'Date range' })
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Click element data
 */
export class ClickElementDto {
  @ApiProperty({ description: 'Element selector or identifier' })
  element: string;

  @ApiPropertyOptional({ description: 'Element text content' })
  text?: string;

  @ApiProperty({ description: 'Click count' })
  clicks: number;

  @ApiProperty({ description: 'Unique clickers' })
  uniqueClickers: number;

  @ApiProperty({ description: 'Click rate (clicks per page view)' })
  clickRate: number;
}

/**
 * Clickmap data for a page
 */
export class ClickmapDataDto {
  @ApiProperty({ description: 'Page URL' })
  pageUrl: string;

  @ApiProperty({ description: 'Total page views' })
  totalPageViews: number;

  @ApiProperty({ description: 'Total clicks' })
  totalClicks: number;

  @ApiProperty({ description: 'Clicks per visit' })
  clicksPerVisit: number;

  @ApiProperty({ description: 'Top clicked elements', type: [ClickElementDto] })
  elements: ClickElementDto[];

  @ApiProperty({ description: 'Click density zones' })
  densityZones: Array<{
    zone: string;
    percentage: number;
  }>;
}

/**
 * Scroll depth zone
 */
export class ScrollDepthZoneDto {
  @ApiProperty({ description: 'Depth percentage (0, 25, 50, 75, 100)' })
  depth: number;

  @ApiProperty({ description: 'Number of users reaching this depth' })
  users: number;

  @ApiProperty({ description: 'Percentage of total users' })
  percentage: number;
}

/**
 * Scrollmap data for a page
 */
export class ScrollmapDataDto {
  @ApiProperty({ description: 'Page URL' })
  pageUrl: string;

  @ApiProperty({ description: 'Total page views' })
  totalPageViews: number;

  @ApiProperty({ description: 'Average scroll depth (0-100)' })
  avgScrollDepth: number;

  @ApiProperty({ description: 'Average time on page (seconds)' })
  avgTimeOnPage: number;

  @ApiProperty({ description: 'Scroll depth distribution', type: [ScrollDepthZoneDto] })
  depthDistribution: ScrollDepthZoneDto[];

  @ApiProperty({ description: 'Fold visibility (above the fold vs below)' })
  foldAnalysis: {
    aboveFoldTime: number;
    belowFoldTime: number;
    foldPosition: number;
  };
}

/**
 * Session recording metadata
 */
export class RecordingMetadataDto {
  @ApiProperty({ description: 'Recording ID' })
  id: string;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiPropertyOptional({ description: 'User ID' })
  userId?: string;

  @ApiProperty({ description: 'Recording start time' })
  startTime: string;

  @ApiProperty({ description: 'Recording end time' })
  endTime: string;

  @ApiProperty({ description: 'Duration in seconds' })
  durationSeconds: number;

  @ApiProperty({ description: 'Number of pages visited' })
  pagesVisited: number;

  @ApiProperty({ description: 'Number of events recorded' })
  eventCount: number;

  @ApiProperty({ description: 'Device type' })
  deviceType: string;

  @ApiProperty({ description: 'Browser' })
  browser: string;

  @ApiProperty({ description: 'Operating system' })
  os: string;

  @ApiProperty({ description: 'Country' })
  country: string;

  @ApiProperty({ description: 'Entry page' })
  entryPage: string;

  @ApiProperty({ description: 'Exit page' })
  exitPage: string;

  @ApiProperty({ description: 'Whether the session converted' })
  converted: boolean;

  @ApiProperty({ description: 'Tags applied to this recording' })
  tags: string[];

  @ApiPropertyOptional({ description: 'Recording notes' })
  notes?: string;
}

/**
 * Recordings list response
 */
export class RecordingsListDto {
  @ApiProperty({ description: 'Recordings', type: [RecordingMetadataDto] })
  recordings: RecordingMetadataDto[];

  @ApiProperty({ description: 'Pagination' })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Recordings query parameters
 */
export class RecordingsQueryDto extends BehaviorQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Minimum duration in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minDuration?: number;

  @ApiPropertyOptional({ description: 'Maximum duration in seconds' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxDuration?: number;

  @ApiPropertyOptional({ description: 'Filter by tags' })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter converted sessions only' })
  @IsOptional()
  convertedOnly?: boolean;

  @ApiPropertyOptional({ description: 'Filter by error occurrence' })
  @IsOptional()
  hasErrors?: boolean;
}

/**
 * Behavior summary
 */
export class BehaviorSummaryDto {
  @ApiProperty({ description: 'Date range' })
  dateRange: {
    startDate: string;
    endDate: string;
  };

  @ApiProperty({ description: 'Top visited pages' })
  topPages: Array<{
    url: string;
    views: number;
    uniqueVisitors: number;
    avgTimeOnPage: number;
    bounceRate: number;
  }>;

  @ApiProperty({ description: 'Top entry pages' })
  topEntryPages: Array<{
    url: string;
    entries: number;
    bounceRate: number;
  }>;

  @ApiProperty({ description: 'Top exit pages' })
  topExitPages: Array<{
    url: string;
    exits: number;
    exitRate: number;
  }>;

  @ApiProperty({ description: 'Site-wide average scroll depth' })
  avgScrollDepth: number;

  @ApiProperty({ description: 'Site-wide average time on page' })
  avgTimeOnPage: number;

  @ApiProperty({ description: 'Total recorded sessions' })
  totalRecordings: number;
}
