import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SearchProductsDto } from './dto/search-products.dto';
import { TrackSearchDto } from './dto/track-search.dto';
import { AutocompleteDto } from './dto/autocomplete.dto';
import { CreateSavedSearchDto, UpdateSavedSearchDto } from './dto/saved-search.dto';
import { TrackViewDto } from './dto/track-view.dto';
import { Prisma } from '@prisma/client';
import { SearchProviderFactory } from './providers/search-provider.factory';
import { SearchParams, SearchFilters, SearchSort } from './providers/search-provider.interface';

// Embedding cache to reduce API calls
interface EmbeddingCache {
  embedding: number[];
  timestamp: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private embeddingCache: Map<string, EmbeddingCache> = new Map();
  private readonly EMBEDDING_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private prisma: PrismaService,
    private searchProviderFactory: SearchProviderFactory,
    private configService: ConfigService,
  ) {}

  /**
   * Advanced product search with filters, sorting, and pagination
   * Uses configured search provider (Elasticsearch, Algolia, or Internal)
   */
  async searchProducts(searchDto: SearchProductsDto) {
    const {
      query,
      categoryIds,
      vendorIds,
      priceMin,
      priceMax,
      minRating,
      inStock,
      tags,
      attributes,
      hasDiscount,
      isNew,
      facets,
      sortBy = 'relevance',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = searchDto;

    // Get search provider
    const provider = await this.searchProviderFactory.getProvider();

    // Build search filters
    const filters: SearchFilters = {
      ...(categoryIds && categoryIds.length > 0 && { categoryIds }),
      ...(vendorIds && vendorIds.length > 0 && { vendorIds }),
      ...(priceMin !== undefined && { priceMin }),
      ...(priceMax !== undefined && { priceMax }),
      ...(minRating !== undefined && { minRating }),
      ...(inStock !== undefined && { inStock }),
      ...(tags && tags.length > 0 && { tags }),
      ...(attributes && Object.keys(attributes).length > 0 && { attributes }),
      ...(hasDiscount !== undefined && { hasDiscount }),
      ...(isNew !== undefined && { isNew }),
    };

    // Build sort params
    const sort: SearchSort = {
      field: sortBy as any,
      order: sortOrder,
    };

    // Build search params
    const searchParams: SearchParams = {
      query,
      filters,
      sort,
      page,
      limit,
      facets,
    };

    // Execute search through provider
    const results = await provider.searchProducts(searchParams);

    return {
      ...results,
      provider: provider.getProviderName(),
    };
  }

  /**
   * Get autocomplete suggestions
   * Uses configured search provider for fast autocomplete
   */
  async getAutocomplete(dto: AutocompleteDto) {
    const { query, limit = 10 } = dto;

    if (!query || query.length < 2) {
      return { suggestions: [], products: [] };
    }

    // Get search provider
    const provider = await this.searchProviderFactory.getProvider();

    // Get autocomplete results from provider
    const results = await provider.getAutocomplete(query, limit);

    // Enhance with popular searches from database
    const dbSuggestions = await this.prisma.searchSuggestion.findMany({
      where: {
        keyword: {
          contains: query,
          mode: 'insensitive',
        },
        enabled: true,
      },
      orderBy: [{ priority: 'desc' }, { searchCount: 'desc' }],
      take: 3,
    });

    // Merge suggestions, prioritizing database suggestions
    const allSuggestions = [
      ...dbSuggestions.map((s) => ({
        text: s.keyword,
        type: 'keyword' as const,
        count: s.searchCount,
      })),
      ...results.suggestions,
    ];

    // Remove duplicates and limit
    const uniqueSuggestions = Array.from(
      new Map(allSuggestions.map((item) => [item.text.toLowerCase(), item])).values(),
    ).slice(0, limit);

    return {
      suggestions: uniqueSuggestions,
      products: results.products,
      provider: provider.getProviderName(),
    };
  }

  /**
   * Track search query
   */
  async trackSearch(dto: TrackSearchDto) {
    const searchQuery = await this.prisma.searchQuery.create({
      data: {
        userId: dto.userId || null,
        sessionId: dto.sessionId || null,
        query: dto.query,
        filters: dto.filters ?? undefined,
        resultsCount: dto.resultsCount,
        clickedItems: dto.clickedItems || [],
        converted: dto.converted || false,
        source: dto.source || 'SEARCH_BAR',
        metadata: dto.metadata ?? undefined,
      },
    });

    // Update or create search suggestion
    await this.upsertSearchSuggestion(dto.query);

    return searchQuery;
  }

  /**
   * Update search query with clicked items
   */
  async updateSearchClick(searchId: string, productId: string) {
    return this.prisma.searchQuery.update({
      where: { id: searchId },
      data: {
        clickedItems: {
          push: productId,
        },
      },
    });
  }

  /**
   * Mark search as converted (led to purchase)
   */
  async markSearchConverted(searchId: string) {
    return this.prisma.searchQuery.update({
      where: { id: searchId },
      data: {
        converted: true,
      },
    });
  }

  /**
   * Track product view
   */
  async trackProductView(dto: TrackViewDto) {
    return this.prisma.productView.create({
      data: {
        productId: dto.productId,
        userId: dto.userId || null,
        sessionId: dto.sessionId || null,
        source: dto.source || null,
        metadata: dto.metadata ?? undefined,
      },
    });
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(limit: number = 10, categoryId?: string) {
    return this.prisma.searchSuggestion.findMany({
      where: {
        enabled: true,
        ...(categoryId && { category: categoryId }),
      },
      orderBy: [{ searchCount: 'desc' }, { priority: 'desc' }],
      take: limit,
    });
  }

  /**
   * Get trending searches (last 7 days)
   */
  async getTrendingSearches(limit: number = 10) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const searches = await this.prisma.searchQuery.groupBy({
      by: ['query'],
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      _count: {
        query: true,
      },
      orderBy: {
        _count: {
          query: 'desc',
        },
      },
      take: limit,
    });

    return searches.map((s) => ({
      query: s.query,
      count: s._count.query,
    }));
  }

  /**
   * Get user's search history
   */
  async getUserSearchHistory(userId: string, limit: number = 20) {
    return this.prisma.searchQuery.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        query: true,
        filters: true,
        resultsCount: true,
        createdAt: true,
      },
    });
  }

  /**
   * Clear user's search history
   */
  async clearSearchHistory(userId: string) {
    return this.prisma.searchQuery.deleteMany({
      where: {
        userId,
      },
    });
  }

  /**
   * Create saved search
   */
  async createSavedSearch(userId: string, dto: CreateSavedSearchDto) {
    return this.prisma.savedSearch.create({
      data: {
        userId,
        name: dto.name,
        query: dto.query,
        filters: dto.filters ?? undefined,
        notifyOnNew: dto.notifyOnNew || false,
      },
    });
  }

  /**
   * Get user's saved searches
   */
  async getSavedSearches(userId: string) {
    return this.prisma.savedSearch.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Update saved search
   */
  async updateSavedSearch(userId: string, searchId: string, dto: UpdateSavedSearchDto) {
    const search = await this.prisma.savedSearch.findFirst({
      where: {
        id: searchId,
        userId,
      },
    });

    if (!search) {
      throw new NotFoundException('Saved search not found');
    }

    return this.prisma.savedSearch.update({
      where: {
        id: searchId,
      },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.query && { query: dto.query }),
        ...(dto.filters !== undefined && { filters: dto.filters }),
        ...(dto.notifyOnNew !== undefined && { notifyOnNew: dto.notifyOnNew }),
      },
    });
  }

  /**
   * Delete saved search
   */
  async deleteSavedSearch(userId: string, searchId: string) {
    const search = await this.prisma.savedSearch.findFirst({
      where: {
        id: searchId,
        userId,
      },
    });

    if (!search) {
      throw new NotFoundException('Saved search not found');
    }

    return this.prisma.savedSearch.delete({
      where: {
        id: searchId,
      },
    });
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(startDate?: Date, endDate?: Date) {
    const where = {
      ...(startDate && endDate && {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      }),
    };

    const [totalSearches, uniqueQueries, avgResults, conversionRate] = await Promise.all([
      this.prisma.searchQuery.count({ where }),
      this.prisma.searchQuery.groupBy({
        by: ['query'],
        where,
      }),
      this.prisma.searchQuery.aggregate({
        where,
        _avg: {
          resultsCount: true,
        },
      }),
      this.getSearchConversionRate(where),
    ]);

    const topSearches = await this.prisma.searchQuery.groupBy({
      by: ['query'],
      where,
      _count: {
        query: true,
      },
      orderBy: {
        _count: {
          query: 'desc',
        },
      },
      take: 10,
    });

    const zeroResultSearches = await this.prisma.searchQuery.count({
      where: {
        ...where,
        resultsCount: 0,
      },
    });

    return {
      totalSearches,
      uniqueQueries: uniqueQueries.length,
      avgResultsPerSearch: avgResults._avg.resultsCount || 0,
      conversionRate,
      zeroResultSearches,
      topSearches: topSearches.map((s) => ({
        query: s.query,
        count: s._count.query,
      })),
    };
  }

  /**
   * Get most viewed products
   */
  async getMostViewedProducts(limit: number = 10, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const views = await this.prisma.productView.groupBy({
      by: ['productId'],
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        productId: true,
      },
      orderBy: {
        _count: {
          productId: 'desc',
        },
      },
      take: limit,
    });

    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: views.map((v) => v.productId),
        },
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
        category: true,
      },
    });

    return views.map((view) => {
      const product = products.find((p) => p.id === view.productId);
      return {
        product,
        viewCount: view._count.productId,
      };
    });
  }

  // Private helper methods

  private async upsertSearchSuggestion(query: string) {
    const normalized = query.trim().toLowerCase();

    if (normalized.length < 2) {
      return;
    }

    const existing = await this.prisma.searchSuggestion.findUnique({
      where: { keyword: normalized },
    });

    if (existing) {
      return this.prisma.searchSuggestion.update({
        where: { keyword: normalized },
        data: {
          searchCount: {
            increment: 1,
          },
        },
      });
    } else {
      return this.prisma.searchSuggestion.create({
        data: {
          keyword: normalized,
          searchCount: 1,
        },
      });
    }
  }

  private async getSearchConversionRate(where: any) {
    const [converted, total] = await Promise.all([
      this.prisma.searchQuery.count({
        where: {
          ...where,
          converted: true,
        },
      }),
      this.prisma.searchQuery.count({ where }),
    ]);

    return total > 0 ? (converted / total) * 100 : 0;
  }

  /**
   * Get search facets for filtering
   */
  async getSearchFacets(query?: string, filters?: any) {
    const provider = await this.searchProviderFactory.getProvider();
    return provider.getFacets(query, filters);
  }

  /**
   * Get available search providers and their status
   */
  async getAvailableProviders() {
    return this.searchProviderFactory.getAvailableProviders();
  }

  /**
   * Get current search provider name
   */
  async getCurrentProvider() {
    const provider = await this.searchProviderFactory.getProvider();
    return {
      name: provider.getProviderName(),
      available: await provider.isAvailable(),
    };
  }

  /**
   * Index a product for search
   */
  async indexProduct(productId: string) {
    const provider = await this.searchProviderFactory.getProvider();

    // Fetch product with all required relations
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
        variants: {
          select: {
            id: true,
            price: true,
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Calculate average rating
    const avgRating =
      product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) /
          product.reviews.length
        : undefined;

    // Transform to ProductDocument
    const productDocument = {
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: product.price,
      compareAtPrice: undefined,
      sku: product.sku || undefined,
      barcode: product.barcode || undefined,
      images: product.images,
      categoryId: product.categoryId,
      categoryName: product.category.name,
      categorySlug: product.category.slug,
      vendorId: product.vendorId,
      vendorName: product.vendor.name,
      stock: product.stock,
      inStock: product.stock > 0,
      tags: [],
      avgRating,
      reviewCount: product.reviews.length,
      salesCount: 0,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      hasVariants: product.variants.length > 0,
      variantCount: product.variants.length,
      minVariantPrice:
        product.variants.length > 0
          ? Math.min(...product.variants.map((v) => v.price ?? 0))
          : undefined,
      maxVariantPrice:
        product.variants.length > 0
          ? Math.max(...product.variants.map((v) => v.price ?? 0))
          : undefined,
    };

    await provider.indexProduct(productDocument);
  }

  /**
   * Bulk index products for search
   */
  async bulkIndexProducts(productIds?: string[]) {
    const provider = await this.searchProviderFactory.getProvider();

    const where = productIds ? { id: { in: productIds } } : {};

    // Fetch products with all required relations
    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
        variants: {
          select: {
            id: true,
            price: true,
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
      },
    });

    // Transform to ProductDocuments
    const productDocuments = products.map((product) => {
      // Calculate average rating
      const avgRating =
        product.reviews.length > 0
          ? product.reviews.reduce((sum, r) => sum + r.rating, 0) /
            product.reviews.length
          : undefined;

      return {
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: product.price,
        compareAtPrice: undefined,
        sku: product.sku || undefined,
        barcode: product.barcode || undefined,
        images: product.images,
        categoryId: product.categoryId,
        categoryName: product.category.name,
        categorySlug: product.category.slug,
        vendorId: product.vendorId,
        vendorName: product.vendor.name,
        stock: product.stock,
        inStock: product.stock > 0,
        tags: [],
        avgRating,
        reviewCount: product.reviews.length,
        salesCount: 0,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        hasVariants: product.variants.length > 0,
        variantCount: product.variants.length,
        minVariantPrice:
          product.variants.length > 0
            ? Math.min(...product.variants.map((v) => v.price ?? 0))
            : undefined,
        maxVariantPrice:
          product.variants.length > 0
            ? Math.max(...product.variants.map((v) => v.price ?? 0))
            : undefined,
      };
    });

    await provider.bulkIndexProducts(productDocuments);

    return {
      indexed: productDocuments.length,
      provider: provider.getProviderName(),
    };
  }

  /**
   * Delete product from search index
   */
  async deleteProductFromIndex(productId: string) {
    const provider = await this.searchProviderFactory.getProvider();
    await provider.deleteProduct(productId);
  }

  /**
   * Update product in search index
   */
  async updateProductInIndex(productId: string) {
    // Just re-index the product
    await this.indexProduct(productId);
  }

  // ==================== Semantic Search with Embeddings ====================

  /**
   * Semantic search using OpenAI embeddings for natural language queries
   * Falls back to keyword search if embeddings are not configured
   */
  async semanticSearch(query: string, options: {
    limit?: number;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
  } = {}) {
    const { limit = 20, categoryId, minPrice, maxPrice } = options;

    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!openaiKey) {
      this.logger.warn('OPENAI_API_KEY not configured. Falling back to keyword search.');
      return this.fallbackKeywordSearch(query, options);
    }

    try {
      // Get query embedding
      const queryEmbedding = await this.getEmbedding(query, openaiKey);

      // Get products with their embeddings from database
      // In a production system, you would store embeddings in a vector database
      // For now, we'll compute similarity in memory
      const products = await this.getProductsWithEmbeddings(categoryId, minPrice, maxPrice);

      // Calculate cosine similarity for each product
      const scoredProducts = await Promise.all(
        products.map(async (product) => {
          let productEmbedding = product.embedding;

          // Generate embedding for products that don't have one cached
          if (!productEmbedding) {
            const productText = `${product.name} ${product.description || ''} ${product.categoryName}`;
            productEmbedding = await this.getEmbedding(productText, openaiKey);
          }

          const similarity = this.cosineSimilarity(queryEmbedding, productEmbedding);

          return {
            ...product,
            semanticScore: similarity,
          };
        })
      );

      // Sort by semantic similarity and take top results
      scoredProducts.sort((a, b) => b.semanticScore - a.semanticScore);
      const topResults = scoredProducts.slice(0, limit);

      return {
        products: topResults.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          images: p.images,
          categoryId: p.categoryId,
          categoryName: p.categoryName,
          vendorId: p.vendorId,
          vendorName: p.vendorName,
          stock: p.stock,
          semanticScore: p.semanticScore,
        })),
        total: topResults.length,
        searchType: 'semantic',
        query,
      };
    } catch (error: any) {
      this.logger.error(`Semantic search failed: ${error.message}`);
      // Fall back to keyword search
      return this.fallbackKeywordSearch(query, options);
    }
  }

  /**
   * Get embedding from OpenAI API with caching
   */
  private async getEmbedding(text: string, apiKey: string): Promise<number[]> {
    const cacheKey = text.toLowerCase().trim();

    // Check cache
    const cached = this.embeddingCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.EMBEDDING_CACHE_TTL) {
      return cached.embedding;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.slice(0, 8000), // Limit text length
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const embedding = data.data[0].embedding;

      // Cache the embedding
      this.embeddingCache.set(cacheKey, {
        embedding,
        timestamp: Date.now(),
      });

      // Clean old cache entries periodically
      if (this.embeddingCache.size > 10000) {
        this.cleanEmbeddingCache();
      }

      return embedding;
    } catch (error: any) {
      this.logger.error(`Failed to get embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Get products with cached embeddings for semantic search
   */
  private async getProductsWithEmbeddings(
    categoryId?: string,
    minPrice?: number,
    maxPrice?: number,
  ) {
    const where: any = {
      status: 'ACTIVE',
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    const products = await this.prisma.product.findMany({
      where,
      take: 500, // Limit for in-memory processing
      include: {
        category: { select: { name: true } },
        vendor: { select: { id: true, name: true } },
      },
    });

    return products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      images: p.images,
      categoryId: p.categoryId,
      categoryName: p.category.name,
      vendorId: p.vendorId,
      vendorName: p.vendor.name,
      stock: p.stock,
      embedding: null as number[] | null, // Will be computed if needed
    }));
  }

  /**
   * Fallback keyword search when embeddings are not available
   */
  private async fallbackKeywordSearch(query: string, options: {
    limit?: number;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
  }) {
    const { limit = 20, categoryId, minPrice, maxPrice } = options;

    const where: any = {
      status: 'ACTIVE',
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    const products = await this.prisma.product.findMany({
      where,
      take: limit,
      include: {
        category: { select: { name: true } },
        vendor: { select: { id: true, name: true } },
      },
    });

    return {
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        images: p.images,
        categoryId: p.categoryId,
        categoryName: p.category.name,
        vendorId: p.vendorId,
        vendorName: p.vendor.name,
        stock: p.stock,
        semanticScore: null,
      })),
      total: products.length,
      searchType: 'keyword',
      query,
    };
  }

  /**
   * Clean old entries from embedding cache
   */
  private cleanEmbeddingCache() {
    const now = Date.now();
    for (const [key, value] of this.embeddingCache.entries()) {
      if (now - value.timestamp > this.EMBEDDING_CACHE_TTL) {
        this.embeddingCache.delete(key);
      }
    }
  }

  /**
   * Find similar products using semantic similarity
   */
  async findSimilarProducts(productId: string, limit: number = 10) {
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');

    // Get the source product
    const sourceProduct = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: { select: { name: true } },
      },
    });

    if (!sourceProduct) {
      throw new NotFoundException('Product not found');
    }

    if (!openaiKey) {
      // Fall back to category-based similar products
      return this.getCategorySimilarProducts(sourceProduct.categoryId, productId, limit);
    }

    try {
      const productText = `${sourceProduct.name} ${sourceProduct.description || ''} ${sourceProduct.category.name}`;
      const sourceEmbedding = await this.getEmbedding(productText, openaiKey);

      // Get other products in the same category
      const candidates = await this.prisma.product.findMany({
        where: {
          id: { not: productId },
          categoryId: sourceProduct.categoryId,
          stock: { gt: 0 }, // Only in-stock products
        },
        take: 100,
        include: {
          category: { select: { name: true } },
          vendor: { select: { id: true, name: true } },
        },
      });

      // Calculate similarity for each candidate
      const scoredProducts = await Promise.all(
        candidates.map(async (product) => {
          const candidateText = `${product.name} ${product.description || ''} ${product.category?.name || ''}`;
          const candidateEmbedding = await this.getEmbedding(candidateText, openaiKey);
          const similarity = this.cosineSimilarity(sourceEmbedding, candidateEmbedding);

          return {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            images: product.images,
            categoryName: product.category?.name || '',
            vendorName: product.vendor?.name || '',
            similarity,
          };
        })
      );

      // Sort by similarity and return top results
      scoredProducts.sort((a, b) => b.similarity - a.similarity);

      return {
        sourceProduct: {
          id: sourceProduct.id,
          name: sourceProduct.name,
        },
        similarProducts: scoredProducts.slice(0, limit),
        searchType: 'semantic',
      };
    } catch (error: any) {
      this.logger.error(`Similar products search failed: ${error.message}`);
      return this.getCategorySimilarProducts(sourceProduct.categoryId, productId, limit);
    }
  }

  /**
   * Fallback: Get similar products from same category
   */
  private async getCategorySimilarProducts(categoryId: string, excludeProductId: string, limit: number) {
    const products = await this.prisma.product.findMany({
      where: {
        categoryId,
        id: { not: excludeProductId },
        stock: { gt: 0 }, // Only in-stock products
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { name: true } },
        vendor: { select: { id: true, name: true } },
      },
    });

    return {
      sourceProduct: { id: excludeProductId },
      similarProducts: products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        images: p.images,
        categoryName: p.category?.name || '',
        vendorName: p.vendor?.name || '',
        similarity: null,
      })),
      searchType: 'category',
    };
  }
}
