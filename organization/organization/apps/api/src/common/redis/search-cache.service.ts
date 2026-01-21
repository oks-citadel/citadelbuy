import { Injectable, Logger } from '@nestjs/common';
import { CacheService, CachePrefix, CacheTTL } from './cache.service';

export interface SearchCacheOptions {
  query: string;
  filters?: Record<string, any>;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface SearchResultsData {
  products: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets?: any;
  took?: number;
}

/**
 * Search Results Caching Service
 * Handles caching for search queries, autocomplete, and facets
 */
@Injectable()
export class SearchCacheService {
  private readonly logger = new Logger(SearchCacheService.name);

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Get search results from cache
   */
  async getSearchResults(options: SearchCacheOptions): Promise<SearchResultsData | null> {
    const cacheKey = this.buildSearchKey(options);

    return this.cacheService.get<SearchResultsData>(cacheKey, {
      prefix: CachePrefix.SEARCH,
    });
  }

  /**
   * Set search results in cache
   */
  async setSearchResults(
    options: SearchCacheOptions,
    results: SearchResultsData,
    ttl: number = CacheTTL.MEDIUM,
  ): Promise<boolean> {
    const cacheKey = this.buildSearchKey(options);

    return this.cacheService.set(cacheKey, results, {
      prefix: CachePrefix.SEARCH,
      ttl,
    });
  }

  /**
   * Get or load search results
   */
  async getOrLoadSearchResults(
    options: SearchCacheOptions,
    loader: () => Promise<SearchResultsData>,
  ): Promise<SearchResultsData> {
    const cacheKey = this.buildSearchKey(options);

    return this.cacheService.getOrSet(cacheKey, loader, {
      prefix: CachePrefix.SEARCH,
      ttl: CacheTTL.MEDIUM,
    });
  }

  /**
   * Cache autocomplete suggestions
   */
  async setAutocompleteSuggestions(
    query: string,
    suggestions: any[],
    ttl: number = CacheTTL.LONG,
  ): Promise<boolean> {
    const cacheKey = `autocomplete:${this.normalizeQuery(query)}`;

    return this.cacheService.set(cacheKey, suggestions, {
      prefix: CachePrefix.SEARCH,
      ttl,
    });
  }

  /**
   * Get autocomplete suggestions from cache
   */
  async getAutocompleteSuggestions(query: string): Promise<any[] | null> {
    const cacheKey = `autocomplete:${this.normalizeQuery(query)}`;

    return this.cacheService.get<any[]>(cacheKey, {
      prefix: CachePrefix.SEARCH,
    });
  }

  /**
   * Cache search facets
   */
  async setSearchFacets(
    query: string,
    facets: any,
    ttl: number = CacheTTL.MEDIUM_LONG,
  ): Promise<boolean> {
    const cacheKey = `facets:${this.normalizeQuery(query)}`;

    return this.cacheService.set(cacheKey, facets, {
      prefix: CachePrefix.SEARCH,
      ttl,
    });
  }

  /**
   * Get search facets from cache
   */
  async getSearchFacets(query: string): Promise<any | null> {
    const cacheKey = `facets:${this.normalizeQuery(query)}`;

    return this.cacheService.get(cacheKey, {
      prefix: CachePrefix.SEARCH,
    });
  }

  /**
   * Cache popular searches
   */
  async setPopularSearches(
    searches: string[],
    ttl: number = CacheTTL.HALF_DAY,
  ): Promise<boolean> {
    return this.cacheService.set('popular', searches, {
      prefix: CachePrefix.SEARCH,
      ttl,
    });
  }

  /**
   * Get popular searches from cache
   */
  async getPopularSearches(): Promise<string[] | null> {
    return this.cacheService.get<string[]>('popular', {
      prefix: CachePrefix.SEARCH,
    });
  }

  /**
   * Cache trending searches
   */
  async setTrendingSearches(
    searches: Array<{ query: string; count: number }>,
    ttl: number = CacheTTL.MEDIUM_LONG,
  ): Promise<boolean> {
    return this.cacheService.set('trending', searches, {
      prefix: CachePrefix.TRENDING,
      ttl,
    });
  }

  /**
   * Get trending searches from cache
   */
  async getTrendingSearches(): Promise<Array<{ query: string; count: number }> | null> {
    return this.cacheService.get<Array<{ query: string; count: number }>>('trending', {
      prefix: CachePrefix.TRENDING,
    });
  }

  /**
   * Cache category facets
   */
  async setCategoryFacets(
    categoryId: string,
    facets: any,
    ttl: number = CacheTTL.LONG,
  ): Promise<boolean> {
    return this.cacheService.set(`category:${categoryId}`, facets, {
      prefix: CachePrefix.SEARCH,
      ttl,
    });
  }

  /**
   * Get category facets from cache
   */
  async getCategoryFacets(categoryId: string): Promise<any | null> {
    return this.cacheService.get(`category:${categoryId}`, {
      prefix: CachePrefix.SEARCH,
    });
  }

  /**
   * Invalidate all search results
   */
  async invalidateAllSearches(): Promise<void> {
    await this.cacheService.invalidateAllSearches();
  }

  /**
   * Invalidate search results for specific query
   */
  async invalidateSearchQuery(query: string): Promise<void> {
    const normalizedQuery = this.normalizeQuery(query);
    await this.cacheService.deletePattern(`*${normalizedQuery}*`, CachePrefix.SEARCH);

    this.logger.log(`Invalidated search cache for query: ${query}`);
  }

  /**
   * Invalidate category search results
   */
  async invalidateCategorySearches(categoryId: string): Promise<void> {
    await this.cacheService.deletePattern(`*category:${categoryId}*`, CachePrefix.SEARCH);

    this.logger.log(`Invalidated search cache for category: ${categoryId}`);
  }

  /**
   * Build cache key for search
   */
  private buildSearchKey(options: SearchCacheOptions): string {
    const parts: string[] = [];

    // Normalize and add query
    parts.push(`q:${this.normalizeQuery(options.query)}`);

    // Add filters
    if (options.filters && Object.keys(options.filters).length > 0) {
      const filterStr = Object.entries(options.filters)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
        .join('|');

      parts.push(`f:${filterStr}`);
    }

    // Add sort
    if (options.sort) {
      parts.push(`s:${options.sort}`);
    }

    // Add pagination
    parts.push(`p:${options.page || 1}`);
    parts.push(`l:${options.limit || 20}`);

    return parts.join(':');
  }

  /**
   * Normalize search query for consistent caching
   */
  private normalizeQuery(query: string): string {
    return query.trim().toLowerCase().replace(/\s+/g, '_');
  }

  /**
   * Get search cache statistics
   */
  async getSearchCacheStats(): Promise<{
    searchKeys: number;
    trendingKeys: number;
    autocompleteKeys: number;
  }> {
    const [searchKeys, trendingKeys, autocompleteKeys] = await Promise.all([
      this.cacheService.getKeys(`${CachePrefix.SEARCH}*`),
      this.cacheService.getKeys(`${CachePrefix.TRENDING}*`),
      this.cacheService.getKeys(`${CachePrefix.SEARCH}autocomplete:*`),
    ]);

    return {
      searchKeys: searchKeys.length,
      trendingKeys: trendingKeys.length,
      autocompleteKeys: autocompleteKeys.length,
    };
  }
}
