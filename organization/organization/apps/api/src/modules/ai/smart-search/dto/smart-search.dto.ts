import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsArray,
  IsObject,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Enums
export enum SearchIntent {
  GENERAL_SEARCH = 'general_search',
  PRICE_CONSCIOUS = 'price_conscious',
  QUALITY_FOCUSED = 'quality_focused',
  COMPARISON = 'comparison',
  RESEARCH = 'research',
}

export enum SemanticIntent {
  PURCHASE = 'purchase',
  RESEARCH = 'research',
  SPECIFIC = 'specific',
  SUPPORT = 'support',
  GENERAL = 'general',
}

export enum SortOption {
  RELEVANCE = 'relevance',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  RATING = 'rating',
  NEWEST = 'newest',
  POPULARITY = 'popularity',
}

// Request DTOs
export class SmartSearchQueryDto {
  @ApiProperty({ description: 'Search query string', example: 'wireless headphones under $100' })
  @IsString()
  @IsNotEmpty()
  q: string;

  @ApiPropertyOptional({ description: 'User ID for personalized results' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Category filter' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Minimum price filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Minimum rating filter (1-5)', example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Sort option', enum: SortOption, default: SortOption.RELEVANCE })
  @IsOptional()
  @IsEnum(SortOption)
  sortBy?: SortOption;

  @ApiPropertyOptional({ description: 'Include only in-stock items', default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  inStockOnly?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Results per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class AutocompleteQueryDto {
  @ApiProperty({ description: 'Partial search query', example: 'wire' })
  @IsString()
  @IsNotEmpty()
  q: string;

  @ApiPropertyOptional({ description: 'User ID for personalized suggestions' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Maximum number of suggestions', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number;
}

export class SemanticSearchQueryDto {
  @ApiProperty({ description: 'Natural language query', example: 'I need something for my morning run' })
  @IsString()
  @IsNotEmpty()
  q: string;

  @ApiPropertyOptional({ description: 'Include related concepts in search' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  expandConcepts?: boolean;
}

export class TrackSearchDto {
  @ApiProperty({ description: 'Search query that was executed', example: 'wireless headphones' })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({ description: 'User ID who performed the search' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'Number of results returned', example: 25 })
  @IsNumber()
  @Min(0)
  results: number;

  @ApiPropertyOptional({ description: 'Search session ID for analytics' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Clicked product IDs from search results' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clickedProducts?: string[];
}

export class PopularSuggestionsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Time range in days', default: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(90)
  days?: number;

  @ApiPropertyOptional({ description: 'Maximum suggestions to return', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}

// Response DTOs
export class SearchQueryInfoDto {
  @ApiProperty({ description: 'Original query string' })
  original: string;

  @ApiProperty({ description: 'Corrected/normalized query' })
  corrected: string;

  @ApiProperty({ description: 'Detected search intent' })
  intent: string;

  @ApiProperty({ description: 'Extracted entities (price, color, brand, etc.)' })
  entities: Record<string, any>;

  @ApiProperty({ description: 'Query confidence score' })
  confidence: number;
}

export class ProductResultDto {
  @ApiProperty({ description: 'Product ID' })
  id: string;

  @ApiProperty({ description: 'Product name' })
  name: string;

  @ApiPropertyOptional({ description: 'Product description' })
  description: string | null;

  @ApiProperty({ description: 'Product price' })
  price: number;

  @ApiProperty({ description: 'Product images' })
  images: string[];

  @ApiProperty({ description: 'Category ID' })
  categoryId: string;

  @ApiProperty({ description: 'Category name' })
  categoryName: string;

  @ApiProperty({ description: 'Vendor ID' })
  vendorId: string;

  @ApiProperty({ description: 'Vendor name' })
  vendorName: string;

  @ApiProperty({ description: 'Stock quantity' })
  stock: number;

  @ApiPropertyOptional({ description: 'Average rating' })
  avgRating: number | null;

  @ApiProperty({ description: 'Number of reviews' })
  reviewCount: number;

  @ApiProperty({ description: 'Search relevance score' })
  relevanceScore: number;
}

export class SmartSearchResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Processed query information' })
  query: SearchQueryInfoDto;

  @ApiProperty({ description: 'Search results', type: [ProductResultDto] })
  results: ProductResultDto[];

  @ApiProperty({ description: 'Related search suggestions' })
  suggestions: string[];

  @ApiProperty({ description: 'Search metadata' })
  metadata: {
    correctedQuery: boolean;
    confidence: number;
    intent: string;
    totalResults: number;
    page: number;
    totalPages: number;
  };
}

export class AutocompleteResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Original partial query' })
  query: string;

  @ApiProperty({ description: 'Autocomplete suggestions' })
  suggestions: Array<{
    text: string;
    type: 'product' | 'category' | 'brand' | 'query';
    count?: number;
    productId?: string;
  }>;
}

export class SemanticSearchResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Original query' })
  query: string;

  @ApiProperty({ description: 'Detected semantic intent', enum: SemanticIntent })
  semanticIntent: SemanticIntent;

  @ApiProperty({ description: 'Related concepts discovered' })
  relatedConcepts: string[];

  @ApiProperty({ description: 'Expanded query with related terms' })
  expandedQuery: string;
}

export class TrendingQueryDto {
  @ApiProperty({ description: 'Search query' })
  query: string;

  @ApiProperty({ description: 'Search count' })
  count: number;

  @ApiProperty({ description: 'Trending indicator' })
  trending: boolean;

  @ApiPropertyOptional({ description: 'Trend direction' })
  trendDirection?: 'up' | 'down' | 'stable';

  @ApiPropertyOptional({ description: 'Percentage change from previous period' })
  changePercent?: number;
}

export class TrendingResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Trending queries', type: [TrendingQueryDto] })
  trending: TrendingQueryDto[];

  @ApiProperty({ description: 'Time period for trending data' })
  period: string;
}

export class PopularSearchDto {
  @ApiProperty({ description: 'Search query' })
  query: string;

  @ApiProperty({ description: 'Search count' })
  count: number;

  @ApiPropertyOptional({ description: 'Category' })
  category?: string;
}

export class TrackSearchResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Tracking confirmation' })
  tracked: boolean;
}
