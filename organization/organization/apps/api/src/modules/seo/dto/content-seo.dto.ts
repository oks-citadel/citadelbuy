import { IsString, IsOptional, IsArray, IsNumber, IsEnum, IsUrl, Min, Max, IsBoolean, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum KeywordDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  VERY_HARD = 'very_hard',
}

export enum ContentFreshnessStatus {
  FRESH = 'fresh',
  NEEDS_UPDATE = 'needs_update',
  STALE = 'stale',
  OUTDATED = 'outdated',
}

export enum LinkType {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
  BROKEN = 'broken',
}

export class KeywordDto {
  @ApiProperty({ description: 'Keyword or phrase' })
  keyword: string;

  @ApiPropertyOptional({ description: 'Search volume (monthly)' })
  searchVolume?: number;

  @ApiPropertyOptional({ description: 'Keyword difficulty', enum: KeywordDifficulty })
  difficulty?: KeywordDifficulty;

  @ApiPropertyOptional({ description: 'Cost per click (CPC)' })
  cpc?: number;

  @ApiPropertyOptional({ description: 'Competition level (0-1)' })
  competition?: number;

  @ApiPropertyOptional({ description: 'Current ranking position' })
  currentRanking?: number;

  @ApiPropertyOptional({ description: 'Trend direction' })
  trend?: 'rising' | 'stable' | 'declining';

  @ApiPropertyOptional({ description: 'Related keywords', type: [String] })
  relatedKeywords?: string[];
}

export class KeywordResearchDto {
  @ApiProperty({ description: 'Seed keyword or topic' })
  @IsString()
  keyword: string;

  @ApiPropertyOptional({ description: 'Target country code (ISO 3166-1 alpha-2)' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Target language code' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Include long-tail variations', default: true })
  @IsOptional()
  @IsBoolean()
  includeLongTail?: boolean;

  @ApiPropertyOptional({ description: 'Include question keywords', default: true })
  @IsOptional()
  @IsBoolean()
  includeQuestions?: boolean;

  @ApiPropertyOptional({ description: 'Maximum results to return', default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class KeywordResearchResultDto {
  @ApiProperty({ description: 'Seed keyword' })
  seedKeyword: string;

  @ApiProperty({ description: 'Primary keyword suggestions', type: [KeywordDto] })
  primaryKeywords: KeywordDto[];

  @ApiProperty({ description: 'Long-tail keyword variations', type: [KeywordDto] })
  longTailKeywords: KeywordDto[];

  @ApiProperty({ description: 'Question-based keywords', type: [KeywordDto] })
  questionKeywords: KeywordDto[];

  @ApiProperty({ description: 'Related topics', type: [String] })
  relatedTopics: string[];

  @ApiProperty({ description: 'Search intent analysis' })
  searchIntent: {
    informational: number;
    navigational: number;
    transactional: number;
    commercial: number;
  };
}

export class ContentOptimizationDto {
  @ApiProperty({ description: 'Content to optimize' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Target keyword' })
  @IsOptional()
  @IsString()
  targetKeyword?: string;

  @ApiPropertyOptional({ description: 'Secondary keywords', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondaryKeywords?: string[];

  @ApiPropertyOptional({ description: 'Page title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Meta description' })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'Page URL' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ description: 'Content type (article, product, category, etc.)' })
  @IsOptional()
  @IsString()
  contentType?: string;
}

export class ContentOptimizationResultDto {
  @ApiProperty({ description: 'Overall SEO score (0-100)' })
  seoScore: number;

  @ApiProperty({ description: 'Readability score (0-100)' })
  readabilityScore: number;

  @ApiProperty({ description: 'Keyword density' })
  keywordDensity: number;

  @ApiProperty({ description: 'Word count' })
  wordCount: number;

  @ApiProperty({ description: 'Title analysis' })
  titleAnalysis: {
    length: number;
    hasKeyword: boolean;
    isOptimalLength: boolean;
    suggestions: string[];
  };

  @ApiProperty({ description: 'Meta description analysis' })
  metaDescriptionAnalysis: {
    length: number;
    hasKeyword: boolean;
    isOptimalLength: boolean;
    suggestions: string[];
  };

  @ApiProperty({ description: 'Heading structure analysis' })
  headingAnalysis: {
    hasH1: boolean;
    h1Count: number;
    h2Count: number;
    h3Count: number;
    hasKeywordInHeadings: boolean;
    suggestions: string[];
  };

  @ApiProperty({ description: 'Content suggestions', type: [Object] })
  suggestions: {
    category: string;
    priority: 'high' | 'medium' | 'low';
    message: string;
    currentValue?: string;
    recommendedValue?: string;
  }[];

  @ApiProperty({ description: 'LSI keywords to include', type: [String] })
  lsiKeywords: string[];

  @ApiPropertyOptional({ description: 'Competitor analysis' })
  competitorAnalysis?: {
    averageWordCount: number;
    topRankingKeywords: string[];
    contentGaps: string[];
  };
}

export class InternalLinkDto {
  @ApiProperty({ description: 'Source URL' })
  sourceUrl: string;

  @ApiProperty({ description: 'Target URL' })
  targetUrl: string;

  @ApiProperty({ description: 'Anchor text' })
  anchorText: string;

  @ApiProperty({ description: 'Link type', enum: LinkType })
  linkType: LinkType;

  @ApiPropertyOptional({ description: 'Is dofollow' })
  isDofollow?: boolean;

  @ApiPropertyOptional({ description: 'Link context' })
  context?: string;
}

export class InternalLinkRecommendationDto {
  @ApiProperty({ description: 'Source URL' })
  sourceUrl: string;

  @ApiProperty({ description: 'Recommended target URL' })
  targetUrl: string;

  @ApiProperty({ description: 'Recommended anchor text' })
  suggestedAnchorText: string;

  @ApiProperty({ description: 'Relevance score (0-100)' })
  relevanceScore: number;

  @ApiProperty({ description: 'Recommendation reason' })
  reason: string;

  @ApiPropertyOptional({ description: 'Content snippet for placement' })
  placementContext?: string;
}

export class InternalLinkingAnalysisDto {
  @ApiProperty({ description: 'Total internal links' })
  totalInternalLinks: number;

  @ApiProperty({ description: 'Total pages analyzed' })
  totalPages: number;

  @ApiProperty({ description: 'Average internal links per page' })
  averageLinksPerPage: number;

  @ApiProperty({ description: 'Orphan pages (no internal links pointing to them)', type: [String] })
  orphanPages: string[];

  @ApiProperty({ description: 'Pages with too few links', type: [Object] })
  underlinkedPages: {
    url: string;
    incomingLinks: number;
    outgoingLinks: number;
  }[];

  @ApiProperty({ description: 'Pages with too many links', type: [Object] })
  overlinkedPages: {
    url: string;
    outgoingLinks: number;
  }[];

  @ApiProperty({ description: 'Link recommendations', type: [InternalLinkRecommendationDto] })
  recommendations: InternalLinkRecommendationDto[];

  @ApiProperty({ description: 'Link equity distribution' })
  linkEquityDistribution: {
    highAuthority: string[];
    mediumAuthority: string[];
    lowAuthority: string[];
  };
}

export class ContentFreshnessDto {
  @ApiProperty({ description: 'URL' })
  url: string;

  @ApiProperty({ description: 'Content title' })
  title: string;

  @ApiProperty({ description: 'Last modified date' })
  lastModified: string;

  @ApiProperty({ description: 'Days since last update' })
  daysSinceUpdate: number;

  @ApiProperty({ description: 'Freshness status', enum: ContentFreshnessStatus })
  status: ContentFreshnessStatus;

  @ApiPropertyOptional({ description: 'Traffic trend since last update' })
  trafficTrend?: 'increasing' | 'stable' | 'decreasing';

  @ApiPropertyOptional({ description: 'Ranking trend since last update' })
  rankingTrend?: 'improving' | 'stable' | 'declining';

  @ApiPropertyOptional({ description: 'Update recommendations', type: [String] })
  recommendations?: string[];

  @ApiPropertyOptional({ description: 'Priority score (0-100)' })
  priorityScore?: number;
}

export class ContentFreshnessReportDto {
  @ApiProperty({ description: 'Total content items' })
  totalContent: number;

  @ApiProperty({ description: 'Fresh content count' })
  freshCount: number;

  @ApiProperty({ description: 'Needs update count' })
  needsUpdateCount: number;

  @ApiProperty({ description: 'Stale content count' })
  staleCount: number;

  @ApiProperty({ description: 'Outdated content count' })
  outdatedCount: number;

  @ApiProperty({ description: 'Content items', type: [ContentFreshnessDto] })
  items: ContentFreshnessDto[];

  @ApiProperty({ description: 'Top priority updates', type: [ContentFreshnessDto] })
  topPriorityUpdates: ContentFreshnessDto[];
}

export class QueryContentFreshnessDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: ContentFreshnessStatus })
  @IsOptional()
  @IsEnum(ContentFreshnessStatus)
  status?: ContentFreshnessStatus;

  @ApiPropertyOptional({ description: 'Minimum days since update' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minDaysSinceUpdate?: number;

  @ApiPropertyOptional({ description: 'Maximum days since update' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDaysSinceUpdate?: number;

  @ApiPropertyOptional({ description: 'Content type filter' })
  @IsOptional()
  @IsString()
  contentType?: string;

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

  @ApiPropertyOptional({ description: 'Sort by field (daysSinceUpdate, priorityScore, trafficTrend)' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
