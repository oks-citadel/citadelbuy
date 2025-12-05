import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QueryProductsDto, SortBy } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(query: QueryProductsDto) {
    const { search, category, minPrice, maxPrice, sortBy, page = 1, limit = 12 } = query;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.categoryId = category;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    // Build orderBy clause
    let orderBy: any = { createdAt: 'desc' }; // default: newest first

    if (sortBy) {
      switch (sortBy) {
        case SortBy.PRICE_ASC:
          orderBy = { price: 'asc' };
          break;
        case SortBy.PRICE_DESC:
          orderBy = { price: 'desc' };
          break;
        case SortBy.NEWEST:
          orderBy = { createdAt: 'desc' };
          break;
        case SortBy.POPULAR:
          // Handle popularity sorting separately
          return this.findAllByPopularity(where, page, limit);
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find products sorted by popularity (based on sales and reviews)
   */
  private async findAllByPopularity(where: any, page: number, limit: number) {
    // Fetch all products matching the where clause with their analytics
    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        _count: {
          select: {
            orderItems: true,
            reviews: true,
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
      },
    });

    // Calculate popularity score for each product
    const productsWithScore = products.map((product) => {
      const salesCount = product._count.orderItems;
      const reviewCount = product._count.reviews;
      const avgRating =
        reviewCount > 0
          ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
          : 0;

      // Popularity score formula:
      // (sales * 10) + (avgRating * reviewCount * 2) + (reviewCount * 5)
      // This weights sales heavily, but also considers review quality and quantity
      const popularityScore = salesCount * 10 + avgRating * reviewCount * 2 + reviewCount * 5;

      return {
        ...product,
        popularityScore,
      };
    });

    // Sort by popularity score descending
    productsWithScore.sort((a, b) => b.popularityScore - a.popularityScore);

    // Apply pagination
    const total = productsWithScore.length;
    const skip = (page - 1) * limit;
    const paginatedProducts = productsWithScore.slice(skip, skip + limit);

    // Remove the temporary score field and _count
    const finalProducts = paginatedProducts.map(({ popularityScore, _count, ...product }) => product);

    return {
      data: finalProducts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async search(params: {
    query?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      query,
      category,
      minPrice,
      maxPrice,
      sort = 'relevance',
      page = 1,
      limit = 20,
    } = params;

    // Build where clause
    const where: any = {};

    // Full-text search in name and description
    if (query && query.trim()) {
      where.OR = [
        { name: { contains: query.trim(), mode: 'insensitive' } },
        { description: { contains: query.trim(), mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (category) {
      where.categoryId = category;
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    // Build orderBy clause based on sort parameter
    let orderBy: any = { createdAt: 'desc' }; // default: newest first

    if (sort) {
      switch (sort) {
        case 'price-asc':
          orderBy = { price: 'asc' };
          break;
        case 'price-desc':
          orderBy = { price: 'desc' };
          break;
        case 'name-asc':
          orderBy = { name: 'asc' };
          break;
        case 'name-desc':
          orderBy = { name: 'desc' };
          break;
        case 'date-desc':
          orderBy = { createdAt: 'desc' };
          break;
        case 'date-asc':
          orderBy = { createdAt: 'asc' };
          break;
        case 'relevance':
        default:
          // For relevance, if there's a search query, order by name match first
          if (query && query.trim()) {
            orderBy = { name: 'asc' };
          } else {
            orderBy = { createdAt: 'desc' };
          }
          break;
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          vendor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        query,
        category,
        minPrice,
        maxPrice,
        sort,
      },
    };
  }

  async findOne(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        variants: {
          orderBy: {
            isDefault: 'desc',
          },
        },
      },
    });
  }

  /**
   * Get related products (same category, excluding current product)
   */
  async getRelatedProducts(productId: string, limit: number = 4) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true },
    });

    if (!product) {
      return [];
    }

    return this.prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: productId },
      },
      include: {
        category: true,
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(data: CreateProductDto) {
    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const product = await this.prisma.product.create({
      data: {
        ...data,
        slug: `${slug}-${Date.now()}`,
      },
      include: {
        category: true,
      },
    });

    // Emit event for search indexing
    this.eventEmitter.emit('product.created', { productId: product.id });

    return product;
  }

  async update(id: string, data: Partial<CreateProductDto>) {
    const product = await this.prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });

    // Emit event for search re-indexing
    this.eventEmitter.emit('product.updated', { productId: product.id });

    return product;
  }

  async delete(id: string) {
    const product = await this.prisma.product.delete({
      where: { id },
    });

    // Emit event for search index removal
    this.eventEmitter.emit('product.deleted', { productId: product.id });

    return product;
  }

  async getProductStats() {
    const [
      totalProducts,
      totalCategories,
      lowStockProducts,
      outOfStockProducts,
      averagePrice,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.category.count(),
      this.prisma.product.count({
        where: {
          stock: {
            lte: 10,
            gt: 0,
          },
        },
      }),
      this.prisma.product.count({
        where: {
          stock: 0,
        },
      }),
      this.prisma.product.aggregate({
        _avg: {
          price: true,
        },
      }),
    ]);

    return {
      totalProducts,
      totalCategories,
      lowStockProducts,
      outOfStockProducts,
      averagePrice: averagePrice._avg.price || 0,
    };
  }
}
