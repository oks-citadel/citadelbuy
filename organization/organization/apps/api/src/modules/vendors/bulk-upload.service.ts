import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface BulkProductRow {
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId?: string;
  categoryName?: string;
  sku?: string;
  images?: string[];
  tags?: string[];
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
}

export interface BulkUploadResult {
  jobId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  createdProductIds: string[];
}

export interface BulkUploadJob {
  id: string;
  vendorId: string;
  fileName: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  errors: any[];
  createdProductIds: string[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

@Injectable()
export class BulkUploadService {
  private readonly logger = new Logger(BulkUploadService.name);
  private processingJobs = new Map<string, boolean>();

  constructor(private prisma: PrismaService) {}

  /**
   * Initialize a bulk upload job
   */
  async initializeBulkUpload(
    vendorId: string,
    fileName: string,
    totalRows: number,
  ): Promise<BulkUploadJob> {
    // Verify vendor exists
    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const job = await this.prisma.bulkUploadJob.create({
      data: {
        vendorId,
        fileName,
        status: 'PENDING',
        totalRows,
        processedRows: 0,
        successCount: 0,
        errorCount: 0,
        errors: [],
        createdProductIds: [],
      },
    });

    return {
      id: job.id,
      vendorId: job.vendorId,
      fileName: job.fileName,
      status: job.status as BulkUploadJob['status'],
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      successCount: job.successCount,
      errorCount: job.errorCount,
      errors: job.errors as any[],
      createdProductIds: job.createdProductIds as string[],
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt ?? undefined,
    };
  }

  /**
   * Process bulk upload data
   */
  async processBulkUpload(
    jobId: string,
    vendorId: string,
    products: BulkProductRow[],
  ): Promise<BulkUploadResult> {
    // Check if job exists
    const job = await this.prisma.bulkUploadJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Upload job not found');
    }

    if (job.vendorId !== vendorId) {
      throw new BadRequestException('Job does not belong to this vendor');
    }

    if (this.processingJobs.get(jobId)) {
      throw new BadRequestException('Job is already being processed');
    }

    this.processingJobs.set(jobId, true);

    try {
      // Update job status
      await this.prisma.bulkUploadJob.update({
        where: { id: jobId },
        data: {
          status: 'PROCESSING',
          totalRows: products.length,
        },
      });

      const errors: BulkUploadResult['errors'] = [];
      const createdProductIds: string[] = [];
      let successCount = 0;
      let processedRows = 0;

      // Get category mapping
      const categories = await this.prisma.category.findMany({
        select: { id: true, name: true, slug: true },
      });
      const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
      const categoryBySlug = new Map(categories.map((c) => [c.slug.toLowerCase(), c.id]));
      const categoryById = new Map(categories.map((c) => [c.id, true]));

      // Process each product
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const rowNumber = i + 1;

        try {
          // Validate required fields
          if (!product.name || product.name.trim().length < 2) {
            errors.push({ row: rowNumber, field: 'name', message: 'Product name is required (min 2 characters)' });
            continue;
          }

          if (!product.description || product.description.trim().length < 10) {
            errors.push({ row: rowNumber, field: 'description', message: 'Description is required (min 10 characters)' });
            continue;
          }

          if (typeof product.price !== 'number' || product.price < 0) {
            errors.push({ row: rowNumber, field: 'price', message: 'Valid price is required' });
            continue;
          }

          if (typeof product.stock !== 'number' || product.stock < 0) {
            errors.push({ row: rowNumber, field: 'stock', message: 'Valid stock quantity is required' });
            continue;
          }

          // Resolve category
          let categoryId = product.categoryId;

          if (!categoryId && product.categoryName) {
            const nameLower = product.categoryName.toLowerCase();
            categoryId = categoryByName.get(nameLower) || categoryBySlug.get(nameLower);
          }

          if (!categoryId || !categoryById.has(categoryId)) {
            errors.push({ row: rowNumber, field: 'category', message: `Category not found: ${product.categoryId || product.categoryName}` });
            continue;
          }

          // Generate slug
          const slug = this.generateSlug(product.name, vendorId);

          // Check for duplicate SKU
          if (product.sku) {
            const existingSku = await this.prisma.product.findFirst({
              where: { sku: product.sku },
            });
            if (existingSku) {
              errors.push({ row: rowNumber, field: 'sku', message: `SKU already exists: ${product.sku}` });
              continue;
            }
          }

          // Create product
          const newProduct = await this.prisma.product.create({
            data: {
              name: product.name.trim(),
              description: product.description.trim(),
              price: product.price,
              stock: product.stock,
              categoryId,
              vendorId,
              slug,
              sku: product.sku || null,
              images: product.images || [],
              tags: product.tags || [],
              weight: product.weight || null,
              dimensions: product.dimensions ? JSON.stringify(product.dimensions) : null,
            },
          });

          createdProductIds.push(newProduct.id);
          successCount++;
        } catch (error: any) {
          this.logger.error(`Error processing row ${rowNumber}:`, error);
          errors.push({ row: rowNumber, message: error.message || 'Unknown error' });
        }

        processedRows++;

        // Update progress every 10 rows or at the end
        if (processedRows % 10 === 0 || processedRows === products.length) {
          await this.prisma.bulkUploadJob.update({
            where: { id: jobId },
            data: {
              processedRows,
              successCount,
              errorCount: errors.length,
              errors,
              createdProductIds,
            },
          });
        }
      }

      // Finalize job
      const finalStatus = errors.length === 0 ? 'COMPLETED' : (successCount === 0 ? 'FAILED' : 'COMPLETED');

      await this.prisma.bulkUploadJob.update({
        where: { id: jobId },
        data: {
          status: finalStatus,
          processedRows: products.length,
          successCount,
          errorCount: errors.length,
          errors,
          createdProductIds,
          completedAt: new Date(),
        },
      });

      this.logger.log(`Bulk upload job ${jobId} completed: ${successCount} success, ${errors.length} errors`);

      return {
        jobId,
        status: finalStatus,
        totalRows: products.length,
        processedRows: products.length,
        successCount,
        errorCount: errors.length,
        errors,
        createdProductIds,
      };
    } finally {
      this.processingJobs.delete(jobId);
    }
  }

  /**
   * Get bulk upload job status
   */
  async getJobStatus(jobId: string, vendorId: string): Promise<BulkUploadJob> {
    const job = await this.prisma.bulkUploadJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Upload job not found');
    }

    if (job.vendorId !== vendorId) {
      throw new BadRequestException('Job does not belong to this vendor');
    }

    return {
      id: job.id,
      vendorId: job.vendorId,
      fileName: job.fileName,
      status: job.status as BulkUploadJob['status'],
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      successCount: job.successCount,
      errorCount: job.errorCount,
      errors: job.errors as any[],
      createdProductIds: job.createdProductIds as string[],
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt ?? undefined,
    };
  }

  /**
   * Get all bulk upload jobs for a vendor
   */
  async getVendorJobs(
    vendorId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      this.prisma.bulkUploadJob.findMany({
        where: { vendorId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.bulkUploadJob.count({ where: { vendorId } }),
    ]);

    return {
      data: jobs.map((job) => ({
        id: job.id,
        fileName: job.fileName,
        status: job.status,
        totalRows: job.totalRows,
        processedRows: job.processedRows,
        successCount: job.successCount,
        errorCount: job.errorCount,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Parse CSV content to product rows
   */
  parseCSV(content: string): BulkProductRow[] {
    const lines = content.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      throw new BadRequestException('CSV file must have at least a header and one data row');
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const products: BulkProductRow[] = [];

    // Required column mapping
    const nameIndex = headers.findIndex((h) => h === 'name' || h === 'product_name' || h === 'title');
    const descIndex = headers.findIndex((h) => h === 'description' || h === 'desc');
    const priceIndex = headers.findIndex((h) => h === 'price');
    const stockIndex = headers.findIndex((h) => h === 'stock' || h === 'quantity' || h === 'qty');
    const categoryIdIndex = headers.findIndex((h) => h === 'category_id' || h === 'categoryid');
    const categoryNameIndex = headers.findIndex((h) => h === 'category' || h === 'category_name');
    const skuIndex = headers.findIndex((h) => h === 'sku');
    const imagesIndex = headers.findIndex((h) => h === 'images' || h === 'image_urls');
    const tagsIndex = headers.findIndex((h) => h === 'tags');

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);

      if (values.length === 0) continue;

      const product: BulkProductRow = {
        name: values[nameIndex]?.trim() || '',
        description: values[descIndex]?.trim() || '',
        price: parseFloat(values[priceIndex]) || 0,
        stock: parseInt(values[stockIndex], 10) || 0,
      };

      if (categoryIdIndex >= 0 && values[categoryIdIndex]) {
        product.categoryId = values[categoryIdIndex].trim();
      }

      if (categoryNameIndex >= 0 && values[categoryNameIndex]) {
        product.categoryName = values[categoryNameIndex].trim();
      }

      if (skuIndex >= 0 && values[skuIndex]) {
        product.sku = values[skuIndex].trim();
      }

      if (imagesIndex >= 0 && values[imagesIndex]) {
        product.images = values[imagesIndex].split('|').map((url) => url.trim()).filter(Boolean);
      }

      if (tagsIndex >= 0 && values[tagsIndex]) {
        product.tags = values[tagsIndex].split('|').map((tag) => tag.trim()).filter(Boolean);
      }

      products.push(product);
    }

    return products;
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  /**
   * Generate CSV template for bulk upload
   */
  generateTemplate(): string {
    const headers = [
      'name',
      'description',
      'price',
      'stock',
      'category_id',
      'category_name',
      'sku',
      'images',
      'tags',
    ];

    const example = [
      'Sample Product',
      'This is a sample product description with at least 10 characters',
      '29.99',
      '100',
      '',
      'Electronics',
      'SKU-001',
      'https://example.com/image1.jpg|https://example.com/image2.jpg',
      'tag1|tag2|tag3',
    ];

    return headers.join(',') + '\n' + example.join(',');
  }

  /**
   * Validate products before upload
   */
  async validateProducts(vendorId: string, products: BulkProductRow[]): Promise<{
    valid: boolean;
    totalRows: number;
    validRows: number;
    errors: Array<{ row: number; field?: string; message: string }>;
  }> {
    const errors: Array<{ row: number; field?: string; message: string }> = [];

    // Get categories for validation
    const categories = await this.prisma.category.findMany({
      select: { id: true, name: true, slug: true },
    });
    const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
    const categoryById = new Map(categories.map((c) => [c.id, true]));

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const rowNumber = i + 1;

      if (!product.name || product.name.trim().length < 2) {
        errors.push({ row: rowNumber, field: 'name', message: 'Product name is required (min 2 characters)' });
      }

      if (!product.description || product.description.trim().length < 10) {
        errors.push({ row: rowNumber, field: 'description', message: 'Description is required (min 10 characters)' });
      }

      if (typeof product.price !== 'number' || isNaN(product.price) || product.price < 0) {
        errors.push({ row: rowNumber, field: 'price', message: 'Valid price is required' });
      }

      if (typeof product.stock !== 'number' || isNaN(product.stock) || product.stock < 0) {
        errors.push({ row: rowNumber, field: 'stock', message: 'Valid stock quantity is required' });
      }

      // Validate category
      let categoryFound = false;
      if (product.categoryId && categoryById.has(product.categoryId)) {
        categoryFound = true;
      } else if (product.categoryName && categoryByName.has(product.categoryName.toLowerCase())) {
        categoryFound = true;
      }

      if (!categoryFound) {
        errors.push({ row: rowNumber, field: 'category', message: 'Valid category is required' });
      }
    }

    return {
      valid: errors.length === 0,
      totalRows: products.length,
      validRows: products.length - errors.length,
      errors,
    };
  }

  /**
   * Cancel a pending/processing job
   */
  async cancelJob(jobId: string, vendorId: string): Promise<void> {
    const job = await this.prisma.bulkUploadJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Upload job not found');
    }

    if (job.vendorId !== vendorId) {
      throw new BadRequestException('Job does not belong to this vendor');
    }

    if (job.status === 'COMPLETED' || job.status === 'FAILED') {
      throw new BadRequestException('Cannot cancel a completed or failed job');
    }

    await this.prisma.bulkUploadJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
      },
    });

    this.processingJobs.delete(jobId);
  }

  /**
   * Clean up old completed jobs (runs daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldJobs() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deleted = await this.prisma.bulkUploadJob.deleteMany({
      where: {
        status: { in: ['COMPLETED', 'FAILED'] },
        completedAt: { lt: thirtyDaysAgo },
      },
    });

    if (deleted.count > 0) {
      this.logger.log(`Cleaned up ${deleted.count} old bulk upload jobs`);
    }
  }

  /**
   * Generate unique slug for product
   */
  private generateSlug(name: string, vendorId: string): string {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const uniqueSuffix = Date.now().toString(36);
    return `${baseSlug}-${uniqueSuffix}`;
  }
}
