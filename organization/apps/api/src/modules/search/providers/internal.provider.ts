import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  SearchProviderInterface,
  ProductDocument,
  SearchParams,
  SearchResults,
  AutocompleteResults,
  SearchFacets,
  FacetValue,
  PriceRange,
} from './search-provider.interface';

/**
 * Internal Search Provider (Fallback)
 * Uses PostgreSQL full-text search capabilities
 */
@Injectable()
export class InternalProvider implements SearchProviderInterface {
  private readonly logger = new Logger(InternalProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  getProviderName(): string {
    return 'Internal';
  }

  async isAvailable(): Promise<boolean> {
    return true; // Always available as fallback
  }

  async indexProduct(product: ProductDocument): Promise<void> {
    // No-op for internal provider - uses direct database queries
    this.logger.debug(`Product ${product.id} indexed (internal - no-op)`);
  }

  async bulkIndexProducts(products: ProductDocument[]): Promise<void> {
    // No-op for internal provider
    this.logger.debug(`${products.length} products bulk indexed (internal - no-op)`);
  }

  async deleteProduct(productId: string): Promise<void> {
    // No-op for internal provider
    this.logger.debug(`Product ${productId} deleted from index (internal - no-op)`);
  }

  async updateProduct(
    productId: string,
    updates: Partial<ProductDocument>,
  ): Promise<void> {
    // No-op for internal provider
    this.logger.debug(`Product ${productId} updated in index (internal - no-op)`);
  }

  async searchProducts(params: SearchParams): Promise<SearchResults> {
    const {
      query = '',
      filters = {},
      sort = { field: 'relevance', order: 'desc' },
      page = 1,
      limit = 20,
      facets = [],
    } = params;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      isActive: true,
      deletedAt: null,
    };

    // Text search
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
        { barcode: { contains: query, mode: 'insensitive' } },
        {
          category: {
            name: { contains: query, mode: 'insensitive' },
          },
        },
        {
          vendor: {
            name: { contains: query, mode: 'insensitive' },
          },
        },
      ];
    }

    // Filters
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      where.categoryId = { in: filters.categoryIds };
    }

    if (filters.vendorIds && filters.vendorIds.length > 0) {
      where.vendorId = { in: filters.vendorIds };
    }

    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      where.price = {};
      if (filters.priceMin !== undefined) {
        where.price.gte = filters.priceMin;
      }
      if (filters.priceMax !== undefined) {
        where.price.lte = filters.priceMax;
      }
    }

    if (filters.inStock) {
      where.stock = { gt: 0 };
    }

    if (filters.minRating) {
      where.avgRating = { gte: filters.minRating };
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags,
      };
    }

    if (filters.hasDiscount) {
      where.compareAtPrice = { not: null };
      where.AND = [
        { price: { not: null } },
        { compareAtPrice: { not: null } },
      ];
    }

    if (filters.isNew) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.createdAt = { gte: thirtyDaysAgo };
    }

    // Build order by
    let orderBy: any = {};
    switch (sort.field) {
      case 'price':
        orderBy = { price: sort.order };
        break;
      case 'rating':
        orderBy = { avgRating: sort.order };
        break;
      case 'sales':
        orderBy = { salesCount: sort.order };
        break;
      case 'newest':
        orderBy = { createdAt: sort.order };
        break;
      case 'name':
        orderBy = { name: sort.order };
        break;
      default:
        // Relevance - order by sales count as proxy
        orderBy = { salesCount: 'desc' };
    }

    const startTime = Date.now();

    try {
      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy,
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
        }),
        this.prisma.product.count({ where }),
      ]);

      const took = Date.now() - startTime;

      // Transform to ProductDocument
      const productDocuments: ProductDocument[] = products.map((product) => {
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
          compareAtPrice: undefined, // Not in schema
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
          tags: [], // Not in schema
          avgRating,
          reviewCount: product.reviews.length,
          salesCount: 0, // Not tracked in current schema
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

      // Get facets if requested
      const searchFacets =
        facets.length > 0 || Object.keys(filters).length === 0
          ? await this.getFacetsInternal(where, filters)
          : {};

      return {
        products: productDocuments,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        facets: searchFacets,
        took,
      };
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`);
      throw error;
    }
  }

  async getAutocomplete(query: string, limit = 10): Promise<AutocompleteResults> {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { sku: { contains: query, mode: 'insensitive' } },
            {
              category: {
                name: { contains: query, mode: 'insensitive' },
              },
            },
          ],
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
        },
      });

      const productSuggestions = products.slice(0, Math.floor(limit / 2)).map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        image: p.images[0],
        price: p.price,
        categoryName: p.category.name,
      }));

      // Get unique names and categories
      const uniqueNames = new Set<string>();
      products.forEach((p) => {
        if (p.name.toLowerCase().includes(query.toLowerCase())) {
          uniqueNames.add(p.name);
        }
        if (p.category.name.toLowerCase().includes(query.toLowerCase())) {
          uniqueNames.add(p.category.name);
        }
      });

      const suggestions = Array.from(uniqueNames)
        .slice(0, Math.floor(limit / 2))
        .map((text) => ({
          text,
          type: 'keyword' as const,
          count: 1,
        }));

      return {
        suggestions,
        products: productSuggestions,
      };
    } catch (error) {
      this.logger.error(`Autocomplete failed: ${error.message}`);
      return { suggestions: [], products: [] };
    }
  }

  async getFacets(query?: string, filters?: any): Promise<SearchFacets> {
    const where: any = {};

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    return this.getFacetsInternal(where, filters || {});
  }

  private async getFacetsInternal(
    where: any,
    activeFilters: any,
  ): Promise<SearchFacets> {
    const facets: SearchFacets = {};

    try {
      // Get category facets
      const categories = await this.prisma.product.groupBy({
        by: ['categoryId'],
        where,
        _count: true,
      });

      const categoryDetails = await this.prisma.category.findMany({
        where: {
          id: { in: categories.map((c) => c.categoryId) },
        },
        select: {
          id: true,
          name: true,
        },
      });

      facets.categories = categories.map((c) => {
        const category = categoryDetails.find((cd) => cd.id === c.categoryId);
        return {
          value: c.categoryId,
          label: category?.name || c.categoryId,
          count: c._count,
          selected: activeFilters.categoryIds?.includes(c.categoryId) || false,
        };
      });

      // Get vendor facets
      const vendors = await this.prisma.product.groupBy({
        by: ['vendorId'],
        where,
        _count: true,
      });

      const vendorDetails = await this.prisma.user.findMany({
        where: {
          id: { in: vendors.map((v) => v.vendorId) },
        },
        select: {
          id: true,
          name: true,
        },
      });

      facets.vendors = vendors.map((v) => {
        const vendor = vendorDetails.find((vd) => vd.id === v.vendorId);
        return {
          value: v.vendorId,
          label: vendor?.name || v.vendorId,
          count: v._count,
          selected: activeFilters.vendorIds?.includes(v.vendorId) || false,
        };
      });

      // Get price range
      const priceStats = await this.prisma.product.aggregate({
        where,
        _min: { price: true },
        _max: { price: true },
      });

      if (priceStats._min.price !== null && priceStats._max.price !== null) {
        facets.priceRanges = this.generatePriceRanges(
          priceStats._min.price,
          priceStats._max.price,
          activeFilters,
        );
      }

      // Get rating facets - skip as avgRating is not in schema
      // Would need to calculate from reviews dynamically
      facets.ratings = [];

      return facets;
    } catch (error) {
      this.logger.error(`Failed to get facets: ${error.message}`);
      return {};
    }
  }

  private generatePriceRanges(
    min: number,
    max: number,
    activeFilters: any,
  ): PriceRange[] {
    const ranges: PriceRange[] = [];
    const step = (max - min) / 5;

    for (let i = 0; i < 5; i++) {
      const rangeMin = Math.floor(min + i * step);
      const rangeMax = Math.floor(min + (i + 1) * step);

      ranges.push({
        min: rangeMin,
        max: rangeMax,
        label: `$${rangeMin} - $${rangeMax}`,
        count: 0,
        selected:
          activeFilters.priceMin === rangeMin &&
          activeFilters.priceMax === rangeMax,
      });
    }

    return ranges;
  }
}
