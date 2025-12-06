import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ElasticsearchEnhancedProvider } from '../providers/elasticsearch-enhanced.provider';

/**
 * Category and Vendor Indexing Service
 * Handles indexing of categories and vendors to Elasticsearch
 * for enhanced autocomplete and faceted search
 */
@Injectable()
export class CategoryVendorIndexingService {
  private readonly logger = new Logger(CategoryVendorIndexingService.name);
  private provider: ElasticsearchEnhancedProvider;

  constructor(private readonly prisma: PrismaService) {
    this.provider = new ElasticsearchEnhancedProvider();
  }

  /**
   * Index all categories
   */
  async indexAllCategories(): Promise<{ indexed: number; failed: number }> {
    this.logger.log('Starting category indexing...');
    let indexed = 0;
    let failed = 0;

    try {
      const categories = await this.prisma.category.findMany({
        include: {
          _count: {
            select: { products: true },
          },
        },
      });

      this.logger.log(`Found ${categories.length} categories to index`);

      for (const category of categories) {
        try {
          const categoryDocument = {
            id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description || '',
            parentId: category.parentId || null,
            productCount: category._count.products,
            level: 0, // Calculate based on parent hierarchy if needed
            path: category.slug,
            isActive: true,
            createdAt: category.createdAt,
          };

          await this.provider.indexCategory(categoryDocument);
          indexed++;
        } catch (error) {
          this.logger.error(`Failed to index category ${category.id}: ${error.message}`);
          failed++;
        }
      }

      this.logger.log(`Category indexing completed: ${indexed} indexed, ${failed} failed`);
      return { indexed, failed };
    } catch (error) {
      this.logger.error(`Category indexing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Index all vendors
   */
  async indexAllVendors(): Promise<{ indexed: number; failed: number }> {
    this.logger.log('Starting vendor indexing...');
    let indexed = 0;
    let failed = 0;

    try {
      const vendors = await this.prisma.vendor.findMany({
        include: {
          _count: {
            select: { products: true },
          },
          products: {
            select: {
              reviews: {
                select: { rating: true },
              },
            },
          },
        },
      });

      this.logger.log(`Found ${vendors.length} vendors to index`);

      for (const vendor of vendors) {
        try {
          // Calculate average rating across all vendor products
          let totalRatings = 0;
          let ratingCount = 0;

          vendor.products.forEach((product) => {
            product.reviews.forEach((review) => {
              totalRatings += review.rating;
              ratingCount++;
            });
          });

          const avgRating = ratingCount > 0 ? totalRatings / ratingCount : 0;

          const vendorDocument = {
            id: vendor.id,
            name: vendor.name,
            slug: vendor.id, // Use ID as slug if vendor doesn't have slug field
            description: vendor.description || '',
            productCount: vendor._count.products,
            avgRating,
            isActive: vendor.isActive,
            createdAt: vendor.createdAt,
          };

          await this.provider.indexVendor(vendorDocument);
          indexed++;
        } catch (error) {
          this.logger.error(`Failed to index vendor ${vendor.id}: ${error.message}`);
          failed++;
        }
      }

      this.logger.log(`Vendor indexing completed: ${indexed} indexed, ${failed} failed`);
      return { indexed, failed };
    } catch (error) {
      this.logger.error(`Vendor indexing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Index a single category
   */
  async indexCategory(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new Error(`Category ${categoryId} not found`);
    }

    const categoryDocument = {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      parentId: category.parentId || null,
      productCount: category._count.products,
      level: 0,
      path: category.slug,
      isActive: true,
      createdAt: category.createdAt,
    };

    await this.provider.indexCategory(categoryDocument);
    this.logger.log(`Indexed category: ${category.name}`);
  }

  /**
   * Index a single vendor
   */
  async indexVendor(vendorId: string): Promise<void> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        _count: {
          select: { products: true },
        },
        products: {
          select: {
            reviews: {
              select: { rating: true },
            },
          },
        },
      },
    });

    if (!vendor) {
      throw new Error(`Vendor ${vendorId} not found`);
    }

    let totalRatings = 0;
    let ratingCount = 0;

    vendor.products.forEach((product) => {
      product.reviews.forEach((review) => {
        totalRatings += review.rating;
        ratingCount++;
      });
    });

    const avgRating = ratingCount > 0 ? totalRatings / ratingCount : 0;

    const vendorDocument = {
      id: vendor.id,
      name: vendor.name,
      slug: vendor.id,
      description: vendor.description || '',
      productCount: vendor._count.products,
      avgRating,
      isActive: vendor.isActive,
      createdAt: vendor.createdAt,
    };

    await this.provider.indexVendor(vendorDocument);
    this.logger.log(`Indexed vendor: ${vendor.name}`);
  }

  /**
   * Delete category from index
   */
  async deleteCategory(categoryId: string): Promise<void> {
    await this.provider.deleteCategory(categoryId);
    this.logger.log(`Deleted category ${categoryId} from index`);
  }

  /**
   * Delete vendor from index
   */
  async deleteVendor(vendorId: string): Promise<void> {
    await this.provider.deleteVendor(vendorId);
    this.logger.log(`Deleted vendor ${vendorId} from index`);
  }

  /**
   * Rebuild all category and vendor indices
   */
  async rebuildAll(): Promise<{
    categories: { indexed: number; failed: number };
    vendors: { indexed: number; failed: number };
  }> {
    this.logger.log('Starting full rebuild of categories and vendors...');

    const categories = await this.indexAllCategories();
    const vendors = await this.indexAllVendors();

    this.logger.log('Full rebuild completed');

    return { categories, vendors };
  }
}
