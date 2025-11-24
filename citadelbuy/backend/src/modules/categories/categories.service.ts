import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new category
   */
  async create(createCategoryDto: CreateCategoryDto) {
    // Check if slug already exists
    const existingCategory = await this.prisma.category.findUnique({
      where: { slug: createCategoryDto.slug },
    });

    if (existingCategory) {
      throw new ConflictException(
        `Category with slug '${createCategoryDto.slug}' already exists`,
      );
    }

    return this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        slug: createCategoryDto.slug,
        description: createCategoryDto.description,
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });
  }

  /**
   * Get all categories with optional filters
   */
  async findAll(includeEmpty: boolean = true) {
    const categories = await this.prisma.category.findMany({
      where: includeEmpty
        ? {}
        : {
            products: {
              some: {},
            },
          },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return categories;
  }

  /**
   * Get a specific category by ID
   */
  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    return category;
  }

  /**
   * Get a category by slug
   */
  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug '${slug}' not found`);
    }

    return category;
  }

  /**
   * Update a category
   */
  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    // Check if category exists
    await this.findOne(id);

    // If slug is being updated, check if new slug already exists
    if (updateCategoryDto.slug) {
      const existingCategory = await this.prisma.category.findUnique({
        where: { slug: updateCategoryDto.slug },
      });

      if (existingCategory && existingCategory.id !== id) {
        throw new ConflictException(
          `Category with slug '${updateCategoryDto.slug}' already exists`,
        );
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });
  }

  /**
   * Delete a category
   */
  async remove(id: string) {
    // Check if category exists
    const category = await this.findOne(id);

    // Check if category has products
    if (category._count.products > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${category._count.products} products. Please reassign or delete the products first.`,
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return {
      message: 'Category deleted successfully',
      deletedId: id,
    };
  }

  /**
   * Get all products in a category
   */
  async getProductsByCategory(
    categoryId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    // Verify category exists
    await this.findOne(categoryId);

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          categoryId,
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
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.product.count({
        where: {
          categoryId,
        },
      }),
    ]);

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all categories (alias for findAll for compatibility)
   */
  async getTopLevelCategories() {
    return this.findAll(false); // Return only categories with products
  }
}
