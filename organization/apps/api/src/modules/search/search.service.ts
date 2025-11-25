import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SearchProductsDto } from './dto/search-products.dto';
import { TrackSearchDto } from './dto/track-search.dto';
import { AutocompleteDto } from './dto/autocomplete.dto';
import { CreateSavedSearchDto, UpdateSavedSearchDto } from './dto/saved-search.dto';
import { TrackViewDto } from './dto/track-view.dto';
import { Prisma } from '@prisma/client';
import { SearchProviderFactory } from './providers/search-provider.factory';
import { SearchParams, SearchFilters, SearchSort } from './providers/search-provider.interface';

@Injectable()
export class SearchService {
  constructor(
    private prisma: PrismaService,
    private searchProviderFactory: SearchProviderFactory,
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
}
