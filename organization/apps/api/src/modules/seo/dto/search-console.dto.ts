import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum DeviceType {
  DESKTOP = 'DESKTOP',
  MOBILE = 'MOBILE',
  TABLET = 'TABLET',
}

export enum SearchType {
  WEB = 'web',
  IMAGE = 'image',
  VIDEO = 'video',
  NEWS = 'news',
  DISCOVER = 'discover',
  GOOGLE_NEWS = 'googleNews',
}

export enum AggregationType {
  AUTO = 'auto',
  BY_PROPERTY = 'byProperty',
  BY_PAGE = 'byPage',
}

export class SearchConsoleQueryDto {
  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)', example: '2024-01-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Device type filter', enum: DeviceType })
  @IsOptional()
  @IsEnum(DeviceType)
  device?: DeviceType;

  @ApiPropertyOptional({ description: 'Search type', enum: SearchType, default: SearchType.WEB })
  @IsOptional()
  @IsEnum(SearchType)
  searchType?: SearchType;

  @ApiPropertyOptional({ description: 'Country filter (3-letter country code)', example: 'USA' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Query filter (search term)' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Page URL filter' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ description: 'Number of results to return', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(25000)
  limit?: number;

  @ApiPropertyOptional({ description: 'Aggregation type', enum: AggregationType })
  @IsOptional()
  @IsEnum(AggregationType)
  aggregationType?: AggregationType;
}

export class SearchAnalyticsFilterDto {
  @ApiProperty({ description: 'Dimension to filter', example: 'query' })
  @IsString()
  dimension: string;

  @ApiProperty({ description: 'Filter operator', example: 'contains' })
  @IsString()
  operator: string;

  @ApiProperty({ description: 'Filter expression' })
  @IsString()
  expression: string;
}

export class SearchPerformanceDto {
  @ApiProperty({ description: 'Site URL' })
  siteUrl: string;

  @ApiProperty({ description: 'Start date' })
  startDate: string;

  @ApiProperty({ description: 'End date' })
  endDate: string;

  @ApiProperty({ description: 'Performance data rows' })
  rows: Array<{
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;

  @ApiProperty({ description: 'Aggregated totals' })
  totals: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
}

export class SearchQueryDataDto {
  @ApiProperty({ description: 'Search query/keyword' })
  query: string;

  @ApiProperty({ description: 'Number of clicks' })
  clicks: number;

  @ApiProperty({ description: 'Number of impressions' })
  impressions: number;

  @ApiProperty({ description: 'Click-through rate (%)' })
  ctr: number;

  @ApiProperty({ description: 'Average position' })
  position: number;
}

export class PagePerformanceDto {
  @ApiProperty({ description: 'Page URL' })
  page: string;

  @ApiProperty({ description: 'Number of clicks' })
  clicks: number;

  @ApiProperty({ description: 'Number of impressions' })
  impressions: number;

  @ApiProperty({ description: 'Click-through rate (%)' })
  ctr: number;

  @ApiProperty({ description: 'Average position' })
  position: number;

  @ApiPropertyOptional({ description: 'Top queries for this page', type: [String] })
  topQueries?: string[];
}

export class SitemapStatusDto {
  @ApiProperty({ description: 'Sitemap URL' })
  path: string;

  @ApiPropertyOptional({ description: 'Last submission date' })
  lastSubmitted?: string;

  @ApiPropertyOptional({ description: 'Last download date' })
  lastDownloaded?: string;

  @ApiProperty({ description: 'Whether sitemap is pending' })
  isPending: boolean;

  @ApiProperty({ description: 'Whether this is a sitemap index' })
  isSitemapsIndex: boolean;

  @ApiProperty({ description: 'Number of warnings' })
  warnings: number;

  @ApiProperty({ description: 'Number of errors' })
  errors: number;

  @ApiPropertyOptional({ description: 'Number of URLs submitted' })
  urlsSubmitted?: number;

  @ApiPropertyOptional({ description: 'Number of URLs indexed' })
  urlsIndexed?: number;
}

export class CrawlErrorDto {
  @ApiProperty({ description: 'Error URL' })
  url: string;

  @ApiProperty({ description: 'Error category' })
  category: string;

  @ApiProperty({ description: 'Platform (web, mobile, etc.)' })
  platform: string;

  @ApiProperty({ description: 'First detected date' })
  firstDetected: string;

  @ApiProperty({ description: 'Last crawled date' })
  lastCrawled: string;

  @ApiPropertyOptional({ description: 'HTTP response code' })
  responseCode?: number;

  @ApiPropertyOptional({ description: 'URLs linking to this error page', type: [String] })
  linkedFromUrls?: string[];
}

export class IndexCoverageReportDto {
  @ApiProperty({ description: 'Site URL' })
  siteUrl: string;

  @ApiProperty({ description: 'Last updated date' })
  lastUpdated: string;

  @ApiProperty({ description: 'Summary counts' })
  summary: {
    valid: number;
    validWithWarnings: number;
    error: number;
    excluded: number;
  };

  @ApiProperty({ description: 'Valid pages breakdown' })
  validPages: {
    submittedAndIndexed: number;
    indexedNotSubmitted: number;
  };

  @ApiProperty({ description: 'Warning pages breakdown' })
  warningPages: {
    indexedThoughBlockedByRobots: number;
    pageWithRedirect: number;
    softNotFound: number;
  };

  @ApiProperty({ description: 'Error pages breakdown' })
  errorPages: {
    serverError: number;
    notFound: number;
    redirectError: number;
    blockedByRobots: number;
  };

  @ApiProperty({ description: 'Excluded pages breakdown' })
  excludedPages: {
    blockedByRobots: number;
    blockedByNoindex: number;
    duplicateWithoutCanonical: number;
    notFoundFromSitemap: number;
    alternatePageWithCanonical: number;
    crawledNotIndexed: number;
  };
}

export class SubmitSitemapDto {
  @ApiProperty({ description: 'Site URL', example: 'https://example.com' })
  @IsString()
  siteUrl: string;

  @ApiProperty({ description: 'Sitemap URL', example: 'https://example.com/sitemap.xml' })
  @IsString()
  sitemapUrl: string;
}

export class InspectUrlDto {
  @ApiProperty({ description: 'Site URL', example: 'https://example.com' })
  @IsString()
  siteUrl: string;

  @ApiProperty({ description: 'URL to inspect', example: 'https://example.com/products/example' })
  @IsString()
  inspectionUrl: string;
}

export class RequestIndexingDto {
  @ApiProperty({ description: 'URL to request indexing', example: 'https://example.com/new-page' })
  @IsString()
  url: string;
}

export class OAuthCallbackDto {
  @ApiProperty({ description: 'Authorization code' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Redirect URI' })
  @IsString()
  redirectUri: string;
}
