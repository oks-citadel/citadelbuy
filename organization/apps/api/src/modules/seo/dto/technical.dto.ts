import { IsString, IsOptional, IsArray, IsBoolean, IsUrl, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum IndexStatus {
  INDEXED = 'indexed',
  NOT_INDEXED = 'not_indexed',
  PENDING = 'pending',
  BLOCKED = 'blocked',
  ERROR = 'error',
}

export enum HreflangRelation {
  ALTERNATE = 'alternate',
  CANONICAL = 'canonical',
}

export class CanonicalUrlDto {
  @ApiProperty({ description: 'Source URL' })
  sourceUrl: string;

  @ApiProperty({ description: 'Canonical URL' })
  canonicalUrl: string;

  @ApiProperty({ description: 'Is self-referencing' })
  isSelfReferencing: boolean;

  @ApiPropertyOptional({ description: 'Has issues' })
  hasIssues?: boolean;

  @ApiPropertyOptional({ description: 'Issue description' })
  issueDescription?: string;
}

export class HreflangTagDto {
  @ApiProperty({ description: 'Language code (e.g., en, en-US, fr)' })
  hreflang: string;

  @ApiProperty({ description: 'URL for this language/region' })
  href: string;

  @ApiProperty({ description: 'Relation type', enum: HreflangRelation })
  rel: HreflangRelation;
}

export class HreflangMappingDto {
  @ApiProperty({ description: 'Base URL' })
  baseUrl: string;

  @ApiProperty({ description: 'Hreflang tags for this URL', type: [HreflangTagDto] })
  hreflangTags: HreflangTagDto[];

  @ApiPropertyOptional({ description: 'Has x-default tag' })
  hasXDefault?: boolean;

  @ApiPropertyOptional({ description: 'Validation issues', type: [String] })
  issues?: string[];
}

export class IndexCoverageDto {
  @ApiProperty({ description: 'URL' })
  url: string;

  @ApiProperty({ description: 'Index status', enum: IndexStatus })
  status: IndexStatus;

  @ApiPropertyOptional({ description: 'Last crawl date' })
  lastCrawled?: string;

  @ApiPropertyOptional({ description: 'Indexing issue' })
  issue?: string;

  @ApiPropertyOptional({ description: 'Robots meta tag content' })
  robotsMeta?: string;

  @ApiPropertyOptional({ description: 'Is blocked by robots.txt' })
  blockedByRobots?: boolean;

  @ApiPropertyOptional({ description: 'Has noindex tag' })
  hasNoindex?: boolean;

  @ApiPropertyOptional({ description: 'Canonical URL' })
  canonical?: string;

  @ApiPropertyOptional({ description: 'HTTP status code' })
  httpStatus?: number;
}

export class IndexCoverageSummaryDto {
  @ApiProperty({ description: 'Total URLs' })
  totalUrls: number;

  @ApiProperty({ description: 'Indexed URLs' })
  indexedUrls: number;

  @ApiProperty({ description: 'Not indexed URLs' })
  notIndexedUrls: number;

  @ApiProperty({ description: 'Blocked URLs' })
  blockedUrls: number;

  @ApiProperty({ description: 'Error URLs' })
  errorUrls: number;

  @ApiProperty({ description: 'Index rate percentage' })
  indexRate: number;

  @ApiProperty({ description: 'Coverage by status' })
  byStatus: Record<string, number>;

  @ApiProperty({ description: 'Top indexing issues' })
  topIssues: {
    issue: string;
    count: number;
    urls: string[];
  }[];
}

export class UpdateCanonicalDto {
  @ApiProperty({ description: 'Source URL' })
  @IsUrl()
  sourceUrl: string;

  @ApiProperty({ description: 'Canonical URL' })
  @IsUrl()
  canonicalUrl: string;
}

export class UpdateHreflangDto {
  @ApiProperty({ description: 'Base URL' })
  @IsUrl()
  baseUrl: string;

  @ApiProperty({ description: 'Hreflang mappings', type: [HreflangTagDto] })
  @IsArray()
  hreflangTags: HreflangTagDto[];

  @ApiPropertyOptional({ description: 'Include x-default', default: true })
  @IsOptional()
  @IsBoolean()
  includeXDefault?: boolean;

  @ApiPropertyOptional({ description: 'Default language/region for x-default' })
  @IsOptional()
  @IsString()
  xDefaultUrl?: string;
}

export class ReindexRequestDto {
  @ApiProperty({ description: 'URLs to request reindexing', type: [String] })
  @IsArray()
  @IsUrl({}, { each: true })
  urls: string[];

  @ApiPropertyOptional({ description: 'Priority level (higher = faster processing)', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;

  @ApiPropertyOptional({ description: 'Reason for reindex request' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReindexResponseDto {
  @ApiProperty({ description: 'Request ID' })
  requestId: string;

  @ApiProperty({ description: 'Number of URLs queued' })
  urlsQueued: number;

  @ApiProperty({ description: 'Estimated processing time' })
  estimatedProcessingTime: string;

  @ApiProperty({ description: 'Request timestamp' })
  requestedAt: string;
}

export class TechnicalSEOSummaryDto {
  @ApiProperty({ description: 'Total pages analyzed' })
  totalPages: number;

  @ApiProperty({ description: 'Pages with canonical issues' })
  canonicalIssues: number;

  @ApiProperty({ description: 'Pages with hreflang issues' })
  hreflangIssues: number;

  @ApiProperty({ description: 'Pages with indexing issues' })
  indexingIssues: number;

  @ApiProperty({ description: 'Pages with redirect issues' })
  redirectIssues: number;

  @ApiProperty({ description: 'HTTPS adoption rate' })
  httpsAdoptionRate: number;

  @ApiProperty({ description: 'Mobile friendly rate' })
  mobileFriendlyRate: number;

  @ApiProperty({ description: 'Average page load time (seconds)' })
  avgPageLoadTime: number;

  @ApiProperty({ description: 'Technical SEO score (0-100)' })
  technicalScore: number;

  @ApiProperty({ description: 'Last analysis date' })
  lastAnalyzedAt: string;
}

export class QueryTechnicalDto {
  @ApiPropertyOptional({ description: 'Filter by URL pattern' })
  @IsOptional()
  @IsString()
  urlPattern?: string;

  @ApiPropertyOptional({ description: 'Filter by index status', enum: IndexStatus })
  @IsOptional()
  @IsEnum(IndexStatus)
  indexStatus?: IndexStatus;

  @ApiPropertyOptional({ description: 'Show only pages with issues', default: false })
  @IsOptional()
  @IsBoolean()
  hasIssuesOnly?: boolean;

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
}

export class DuplicateContentDto {
  @ApiProperty({ description: 'Primary URL' })
  primaryUrl: string;

  @ApiProperty({ description: 'Duplicate URLs', type: [String] })
  duplicateUrls: string[];

  @ApiProperty({ description: 'Similarity percentage' })
  similarityPercentage: number;

  @ApiProperty({ description: 'Content hash' })
  contentHash: string;

  @ApiPropertyOptional({ description: 'Recommended canonical' })
  recommendedCanonical?: string;
}

export class StructuredDataValidationDto {
  @ApiProperty({ description: 'URL' })
  url: string;

  @ApiProperty({ description: 'Is valid' })
  isValid: boolean;

  @ApiProperty({ description: 'Detected schema types', type: [String] })
  detectedTypes: string[];

  @ApiProperty({ description: 'Validation errors', type: [Object] })
  errors: {
    type: string;
    message: string;
    path?: string;
  }[];

  @ApiProperty({ description: 'Validation warnings', type: [Object] })
  warnings: {
    type: string;
    message: string;
    path?: string;
  }[];

  @ApiPropertyOptional({ description: 'Raw JSON-LD data' })
  rawData?: Record<string, any>[];
}
