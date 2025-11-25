import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  QueryCategoriesDto,
  CategoryTreeQueryDto,
  CategorySearchDto,
  TrendingCategoriesDto,
  MoveCategoryDto,
  ReorderCategoryDto,
  BulkCategoriesDto,
} from './dto/query-category.dto';
import { CategoryStatus, Prisma } from '@prisma/client';

export interface CategoryWithChildren {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  level: number;
  sortOrder: number;
  iconUrl: string | null;
  bannerImageUrl: string | null;
  thumbnailUrl: string | null;
  status: CategoryStatus;
  isFeatured: boolean;
  productCount: number;
  viewCount: bigint;
  children?: CategoryWithChildren[];
  _count?: { products: number };
}

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);
  // Simple in-memory cache for category tree (TTL managed manually)
  private categoryTreeCache: { data: any; timestamp: number } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  // ==================== SLUG GENERATION ====================

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private async ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.category.findUnique({
        where: { slug },
      });

      if (!existing || existing.id === excludeId) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  // ==================== CLOSURE TABLE MANAGEMENT ====================

  private async updateClosureTable(categoryId: string, parentId: string | null): Promise<void> {
    // Delete existing closure entries for this category as descendant
    await this.prisma.categoryClosure.deleteMany({
      where: { descendantId: categoryId },
    });

    // Self-reference (depth 0)
    await this.prisma.categoryClosure.create({
      data: {
        ancestorId: categoryId,
        descendantId: categoryId,
        depth: 0,
      },
    });

    // If there's a parent, create closure entries
    if (parentId) {
      // Get all ancestors of the parent
      const parentClosures = await this.prisma.categoryClosure.findMany({
        where: { descendantId: parentId },
      });

      // Create closure entries for each ancestor
      for (const closure of parentClosures) {
        await this.prisma.categoryClosure.create({
          data: {
            ancestorId: closure.ancestorId,
            descendantId: categoryId,
            depth: closure.depth + 1,
          },
        });
      }
    }
  }

  private async rebuildClosureForSubtree(categoryId: string): Promise<void> {
    // Get the category and its current parent
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: { children: true },
    });

    if (!category) return;

    // Update closure for this category
    await this.updateClosureTable(categoryId, category.parentId);

    // Recursively update children
    for (const child of category.children) {
      await this.rebuildClosureForSubtree(child.id);
    }
  }

  // ==================== CACHE MANAGEMENT ====================
  // Simple in-memory cache implementation (no external dependencies)

  private async invalidateCache(_keys: string[]): Promise<void> {
    // Invalidate tree cache on any category change
    this.categoryTreeCache = null;
  }

  private async getCached<T>(key: string): Promise<T | null> {
    if (key === 'category:tree' && this.categoryTreeCache) {
      const now = Date.now();
      if (now - this.categoryTreeCache.timestamp < this.CACHE_TTL) {
        return this.categoryTreeCache.data as T;
      }
      this.categoryTreeCache = null;
    }
    return null;
  }

  private async setCache<T>(key: string, value: T, _ttl: number = 3600): Promise<void> {
    if (key === 'category:tree') {
      this.categoryTreeCache = { data: value, timestamp: Date.now() };
    }
    // For other keys, we don't cache (could expand later)
  }

  // ==================== CREATE ====================

  async create(createCategoryDto: CreateCategoryDto, userId?: string) {
    // Generate slug if not provided
    const slug = createCategoryDto.slug || this.generateSlug(createCategoryDto.name);
    const uniqueSlug = await this.ensureUniqueSlug(slug);

    // If parent is specified, verify it exists and get its level
    let level = 0;
    if (createCategoryDto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: createCategoryDto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(
          `Parent category with ID '${createCategoryDto.parentId}' not found`,
        );
      }

      level = parent.level + 1;
    }

    // Create the category
    const category = await this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        slug: uniqueSlug,
        description: createCategoryDto.description,
        parentId: createCategoryDto.parentId,
        level,
        sortOrder: createCategoryDto.sortOrder ?? 0,
        iconUrl: createCategoryDto.iconUrl,
        bannerImageUrl: createCategoryDto.bannerImageUrl,
        thumbnailUrl: createCategoryDto.thumbnailUrl,
        status: createCategoryDto.status ?? CategoryStatus.DRAFT,
        isFeatured: createCategoryDto.isFeatured ?? false,
        metaTitle: createCategoryDto.metaTitle,
        metaDescription: createCategoryDto.metaDescription,
        metaKeywords: createCategoryDto.metaKeywords,
        seoContent: createCategoryDto.seoContent,
        createdById: userId,
        updatedById: userId,
      },
      include: {
        parent: true,
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    // Update closure table
    await this.updateClosureTable(category.id, category.parentId);

    // Create translations if provided
    if (createCategoryDto.translations?.length) {
      await this.prisma.categoryTranslation.createMany({
        data: createCategoryDto.translations.map((t) => ({
          categoryId: category.id,
          languageCode: t.languageCode,
          name: t.name,
          description: t.description,
          metaTitle: t.metaTitle,
          metaDescription: t.metaDescription,
        })),
      });
    }

    // Invalidate cache
    await this.invalidateCache(['category:tree', 'category:featured', 'categories:all']);

    return category;
  }

  // ==================== READ - LIST ====================

  async findAll(query: QueryCategoriesDto = {}) {
    const {
      level,
      parentId,
      includeChildren = false,
      includeProducts = true,
      status = 'active',
      featured,
      sort = 'sortOrder',
      order = 'asc',
      limit = 20,
      offset = 0,
      search,
    } = query;

    const where: Prisma.CategoryWhereInput = {
      deletedAt: null,
    };

    // Status filter
    if (status !== 'all') {
      where.status = status.toUpperCase() as CategoryStatus;
    }

    // Level filter
    if (level !== undefined) {
      where.level = level;
    }

    // Parent filter
    if (parentId !== undefined) {
      where.parentId = parentId;
    }

    // Featured filter
    if (featured) {
      where.isFeatured = true;
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Sort mapping
    const orderBy: Prisma.CategoryOrderByWithRelationInput = {};
    switch (sort) {
      case 'name':
        orderBy.name = order;
        break;
      case 'productCount':
        orderBy.productCount = order;
        break;
      case 'createdAt':
        orderBy.createdAt = order;
        break;
      case 'viewCount':
        orderBy.viewCount = order;
        break;
      default:
        orderBy.sortOrder = order;
    }

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        include: {
          parent: true,
          children: includeChildren,
          _count: includeProducts
            ? { select: { products: true, children: true } }
            : undefined,
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      data: categories,
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + categories.length < total,
      },
    };
  }

  // ==================== READ - TREE ====================

  async getTree(query: CategoryTreeQueryDto = {}) {
    const { maxDepth = 3, includeProducts = true, status = 'active' } = query;

    const cacheKey = `category:tree:${maxDepth}:${status}`;
    const cached = await this.getCached<CategoryWithChildren[]>(cacheKey);
    if (cached) return { data: cached };

    const where: Prisma.CategoryWhereInput = {
      deletedAt: null,
      level: 0, // Only get root categories
    };

    if (status !== 'all') {
      where.status = status.toUpperCase() as CategoryStatus;
    }

    const rootCategories = await this.prisma.category.findMany({
      where,
      include: {
        _count: includeProducts
          ? { select: { products: true, children: true } }
          : undefined,
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Build tree recursively
    const buildTree = async (
      categories: any[],
      depth: number,
    ): Promise<CategoryWithChildren[]> => {
      if (depth >= maxDepth) return categories;

      const result: CategoryWithChildren[] = [];

      for (const category of categories) {
        const children = await this.prisma.category.findMany({
          where: {
            parentId: category.id,
            deletedAt: null,
            ...(status !== 'all' && { status: status.toUpperCase() as CategoryStatus }),
          },
          include: {
            _count: includeProducts
              ? { select: { products: true, children: true } }
              : undefined,
          },
          orderBy: { sortOrder: 'asc' },
        });

        const categoryWithChildren: CategoryWithChildren = {
          ...category,
          children: children.length > 0 ? await buildTree(children, depth + 1) : [],
        };

        result.push(categoryWithChildren);
      }

      return result;
    };

    const tree = await buildTree(rootCategories, 0);
    await this.setCache(cacheKey, tree, 3600); // Cache for 1 hour

    return { data: tree };
  }

  // ==================== READ - SINGLE ====================

  async findOne(id: string, options: { includeBreadcrumb?: boolean; includeChildren?: boolean; includeSiblings?: boolean; includeFilters?: boolean } = {}) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: options.includeChildren ?? false,
        translations: true,
        filters: options.includeFilters ?? false,
        promotions: {
          where: {
            isActive: true,
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
          },
        },
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    if (!category || category.deletedAt) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    let breadcrumb: any[] = [];
    if (options.includeBreadcrumb) {
      breadcrumb = await this.getBreadcrumb(id);
    }

    let siblings: any[] = [];
    if (options.includeSiblings) {
      siblings = await this.prisma.category.findMany({
        where: {
          parentId: category.parentId,
          id: { not: id },
          deletedAt: null,
          status: CategoryStatus.ACTIVE,
        },
        orderBy: { sortOrder: 'asc' },
      });
    }

    return {
      ...category,
      breadcrumb,
      siblings,
    };
  }

  async findBySlug(slug: string, options: { includeBreadcrumb?: boolean; includeChildren?: boolean } = {}) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: options.includeChildren ?? false,
        translations: true,
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    if (!category || category.deletedAt) {
      throw new NotFoundException(`Category with slug '${slug}' not found`);
    }

    let breadcrumb: any[] = [];
    if (options.includeBreadcrumb) {
      breadcrumb = await this.getBreadcrumb(category.id);
    }

    return {
      ...category,
      breadcrumb,
    };
  }

  // ==================== READ - BREADCRUMB ====================

  async getBreadcrumb(categoryId: string) {
    const closures = await this.prisma.categoryClosure.findMany({
      where: { descendantId: categoryId },
      include: {
        ancestor: {
          select: {
            id: true,
            name: true,
            slug: true,
            level: true,
          },
        },
      },
      orderBy: { depth: 'desc' },
    });

    return closures.map((c) => c.ancestor);
  }

  // ==================== READ - FEATURED ====================

  async getFeatured(limit: number = 10) {
    const cacheKey = `category:featured:${limit}`;
    const cached = await this.getCached<any[]>(cacheKey);
    if (cached) return { data: cached };

    const categories = await this.prisma.category.findMany({
      where: {
        isFeatured: true,
        status: CategoryStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
      take: limit,
    });

    await this.setCache(cacheKey, categories, 3600);

    return { data: categories };
  }

  // ==================== READ - TRENDING ====================

  async getTrending(query: TrendingCategoriesDto = {}) {
    const { period = 'week', limit = 10 } = query;

    let dateFrom: Date;
    const now = new Date();

    switch (period) {
      case 'day':
        dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // week
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get categories with most views in the period
    const categoryViews = await this.prisma.categoryView.groupBy({
      by: ['categoryId'],
      where: {
        createdAt: { gte: dateFrom },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: limit,
    });

    const categoryIds = categoryViews.map((cv) => cv.categoryId);

    const categories = await this.prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        status: CategoryStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    // Sort by view count from the groupBy
    const viewCountMap = new Map(categoryViews.map((cv) => [cv.categoryId, cv._count.id]));
    categories.sort((a, b) => (viewCountMap.get(b.id) || 0) - (viewCountMap.get(a.id) || 0));

    return {
      data: categories.map((cat) => ({
        ...cat,
        recentViews: viewCountMap.get(cat.id) || 0,
      })),
    };
  }

  // ==================== READ - SEARCH ====================

  async search(query: CategorySearchDto) {
    const { query: searchQuery, fuzzy = false, limit = 10 } = query;

    if (!searchQuery || searchQuery.length < 2) {
      return { data: [] };
    }

    const categories = await this.prisma.category.findMany({
      where: {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
          { metaKeywords: { contains: searchQuery, mode: 'insensitive' } },
        ],
        status: CategoryStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { products: true },
        },
      },
      take: limit,
      orderBy: [
        { isFeatured: 'desc' },
        { productCount: 'desc' },
      ],
    });

    return { data: categories };
  }

  // ==================== READ - PRODUCTS IN CATEGORY ====================

  async getProductsByCategory(
    categoryId: string,
    page: number = 1,
    limit: number = 24,
    filters: any = {},
  ) {
    await this.findOne(categoryId);

    const skip = (page - 1) * limit;

    // Get all descendant category IDs using closure table
    const descendants = await this.prisma.categoryClosure.findMany({
      where: { ancestorId: categoryId },
      select: { descendantId: true },
    });

    const categoryIds = descendants.map((d) => d.descendantId);

    const where: Prisma.ProductWhereInput = {
      categoryId: { in: categoryIds },
    };

    // Apply filters
    if (filters.priceMin !== undefined) {
      where.price = { ...((where.price as any) || {}), gte: filters.priceMin };
    }
    if (filters.priceMax !== undefined) {
      where.price = { ...((where.price as any) || {}), lte: filters.priceMax };
    }
    if (filters.inStock) {
      where.stock = { gt: 0 };
    }

    // Sort mapping
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    switch (filters.sort) {
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'popular':
        // Sort by number of order items (sales popularity)
        orderBy = { orderItems: { _count: 'desc' } };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          vendor: {
            select: { id: true, name: true },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  // ==================== READ - CATEGORY FILTERS ====================

  async getFilters(categoryId: string) {
    await this.findOne(categoryId);

    const filters = await this.prisma.categoryFilter.findMany({
      where: {
        categoryId,
        isActive: true,
      },
      orderBy: { displayOrder: 'asc' },
    });

    return { data: filters };
  }

  // ==================== UPDATE ====================

  async update(id: string, updateCategoryDto: UpdateCategoryDto, userId?: string) {
    const existingCategory = await this.findOne(id);

    // Handle slug update
    let slug = updateCategoryDto.slug;
    if (slug) {
      slug = await this.ensureUniqueSlug(slug, id);
    }

    // Handle parent change
    let level = existingCategory.level;
    const parentChanged = updateCategoryDto.parentId !== undefined &&
                          updateCategoryDto.parentId !== existingCategory.parentId;

    if (parentChanged) {
      if (updateCategoryDto.parentId) {
        // Prevent circular reference
        const descendants = await this.prisma.categoryClosure.findMany({
          where: { ancestorId: id },
          select: { descendantId: true },
        });
        const descendantIds = descendants.map((d) => d.descendantId);

        if (descendantIds.includes(updateCategoryDto.parentId)) {
          throw new BadRequestException('Cannot move category to its own descendant');
        }

        const parent = await this.prisma.category.findUnique({
          where: { id: updateCategoryDto.parentId },
        });

        if (!parent) {
          throw new NotFoundException(
            `Parent category with ID '${updateCategoryDto.parentId}' not found`,
          );
        }

        level = parent.level + 1;
      } else {
        level = 0;
      }
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        ...(updateCategoryDto.name && { name: updateCategoryDto.name }),
        ...(slug && { slug }),
        ...(updateCategoryDto.description !== undefined && { description: updateCategoryDto.description }),
        ...(updateCategoryDto.parentId !== undefined && { parentId: updateCategoryDto.parentId }),
        ...(parentChanged && { level }),
        ...(updateCategoryDto.sortOrder !== undefined && { sortOrder: updateCategoryDto.sortOrder }),
        ...(updateCategoryDto.iconUrl !== undefined && { iconUrl: updateCategoryDto.iconUrl }),
        ...(updateCategoryDto.bannerImageUrl !== undefined && { bannerImageUrl: updateCategoryDto.bannerImageUrl }),
        ...(updateCategoryDto.thumbnailUrl !== undefined && { thumbnailUrl: updateCategoryDto.thumbnailUrl }),
        ...(updateCategoryDto.status && { status: updateCategoryDto.status }),
        ...(updateCategoryDto.isFeatured !== undefined && { isFeatured: updateCategoryDto.isFeatured }),
        ...(updateCategoryDto.metaTitle !== undefined && { metaTitle: updateCategoryDto.metaTitle }),
        ...(updateCategoryDto.metaDescription !== undefined && { metaDescription: updateCategoryDto.metaDescription }),
        ...(updateCategoryDto.metaKeywords !== undefined && { metaKeywords: updateCategoryDto.metaKeywords }),
        ...(updateCategoryDto.seoContent !== undefined && { seoContent: updateCategoryDto.seoContent }),
        updatedById: userId,
      },
      include: {
        parent: true,
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    // Rebuild closure table if parent changed
    if (parentChanged) {
      await this.rebuildClosureForSubtree(id);
    }

    // Handle translations update
    if (updateCategoryDto.translations) {
      // Delete existing translations
      await this.prisma.categoryTranslation.deleteMany({
        where: { categoryId: id },
      });

      // Create new translations
      await this.prisma.categoryTranslation.createMany({
        data: updateCategoryDto.translations.map((t) => ({
          categoryId: id,
          languageCode: t.languageCode,
          name: t.name,
          description: t.description,
          metaTitle: t.metaTitle,
          metaDescription: t.metaDescription,
        })),
      });
    }

    // Invalidate cache
    await this.invalidateCache([
      'category:tree',
      'category:featured',
      'categories:all',
      `category:${id}`,
    ]);

    return category;
  }

  // ==================== UPDATE STATUS ====================

  async updateStatus(id: string, status: CategoryStatus, userId?: string) {
    await this.findOne(id);

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        status,
        updatedById: userId,
      },
    });

    await this.invalidateCache(['category:tree', 'category:featured', `category:${id}`]);

    return category;
  }

  // ==================== MOVE ====================

  async move(id: string, moveDto: MoveCategoryDto, userId?: string) {
    return this.update(id, { parentId: moveDto.newParentId ?? undefined }, userId);
  }

  // ==================== REORDER ====================

  async reorder(id: string, reorderDto: ReorderCategoryDto, userId?: string) {
    await this.findOne(id);

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        sortOrder: reorderDto.sortOrder,
        updatedById: userId,
      },
    });

    await this.invalidateCache(['category:tree']);

    return category;
  }

  // ==================== DELETE ====================

  async remove(id: string, force: boolean = false) {
    const category = await this.findOne(id);

    // Check for children
    if (category._count && category._count.children > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${category._count.children} child categories. Please delete or move them first.`,
      );
    }

    // Check for products
    if (category._count && category._count.products > 0 && !force) {
      throw new BadRequestException(
        `Cannot delete category with ${category._count.products} products. Use force=true to delete anyway, or reassign products first.`,
      );
    }

    if (force) {
      // Hard delete
      await this.prisma.category.delete({
        where: { id },
      });
    } else {
      // Soft delete
      await this.prisma.category.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    }

    await this.invalidateCache(['category:tree', 'category:featured', 'categories:all']);

    return {
      success: true,
      message: force ? 'Category permanently deleted' : 'Category deleted successfully',
      deletedId: id,
    };
  }

  // ==================== RESTORE ====================

  async restore(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    if (!category.deletedAt) {
      throw new BadRequestException('Category is not deleted');
    }

    const restored = await this.prisma.category.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.invalidateCache(['category:tree', 'category:featured', 'categories:all']);

    return restored;
  }

  // ==================== BULK OPERATIONS ====================

  async bulkOperation(bulkDto: BulkCategoriesDto, userId?: string) {
    const results: any[] = [];
    const errors: any[] = [];

    for (const operation of bulkDto.operations) {
      try {
        let result: any;
        switch (operation.action) {
          case 'create':
            result = await this.create(operation.data, userId);
            break;
          case 'update':
            result = await this.update(operation.data.id, operation.data, userId);
            break;
          case 'delete':
            result = await this.remove(operation.data.id, operation.data.force);
            break;
        }
        results.push({ success: true, data: result });
      } catch (error: any) {
        errors.push({
          success: false,
          error: error.message,
          data: operation.data,
        });
      }
    }

    return {
      results,
      summary: {
        success: results.filter((r) => r.success).length,
        failed: errors.length,
        errors,
      },
    };
  }

  // ==================== TRACK VIEW ====================

  async trackView(categoryId: string, data: { userId?: string; sessionId?: string; ipAddress?: string; userAgent?: string; referer?: string }) {
    await this.findOne(categoryId);

    // Create view record
    await this.prisma.categoryView.create({
      data: {
        categoryId,
        userId: data.userId,
        sessionId: data.sessionId || 'anonymous',
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        referer: data.referer,
      },
    });

    // Increment view count
    await this.prisma.category.update({
      where: { id: categoryId },
      data: { viewCount: { increment: 1 } },
    });

    return { success: true };
  }

  // ==================== TOP LEVEL CATEGORIES (Legacy support) ====================

  async getTopLevelCategories() {
    return this.findAll({ level: 0, status: 'active' });
  }

  // ==================== UPDATE PRODUCT COUNTS ====================

  async updateProductCounts() {
    const categories = await this.prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    for (const category of categories) {
      await this.prisma.category.update({
        where: { id: category.id },
        data: { productCount: category._count.products },
      });
    }

    this.logger.log('Product counts updated for all categories');
  }
}
