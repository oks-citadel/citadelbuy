import { Test, TestingModule } from '@nestjs/testing';
import { BulkUploadService, BulkProductRow } from './bulk-upload.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('BulkUploadService', () => {
  let service: BulkUploadService;
  let prisma: PrismaService;

  const mockPrismaService = {
    vendorProfile: {
      findUnique: jest.fn(),
    },
    bulkUploadJob: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    product: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockVendorProfile = {
    id: 'vendor-123',
    userId: 'user-123',
    businessName: 'Test Business',
  };

  const mockBulkUploadJob = {
    id: 'job-123',
    vendorId: 'vendor-123',
    fileName: 'products.csv',
    status: 'PENDING',
    totalRows: 10,
    processedRows: 0,
    successCount: 0,
    errorCount: 0,
    errors: [],
    createdProductIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
  };

  const mockCategory = {
    id: 'cat-123',
    name: 'Electronics',
    slug: 'electronics',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkUploadService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BulkUploadService>(BulkUploadService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initializeBulkUpload', () => {
    it('should create a new bulk upload job', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(mockVendorProfile);
      mockPrismaService.bulkUploadJob.create.mockResolvedValue(mockBulkUploadJob);

      const result = await service.initializeBulkUpload('vendor-123', 'products.csv', 10);

      expect(result).toEqual(expect.objectContaining({
        id: 'job-123',
        vendorId: 'vendor-123',
        fileName: 'products.csv',
        status: 'PENDING',
        totalRows: 10,
      }));

      expect(mockPrismaService.bulkUploadJob.create).toHaveBeenCalledWith({
        data: {
          vendorId: 'vendor-123',
          fileName: 'products.csv',
          status: 'PENDING',
          totalRows: 10,
          processedRows: 0,
          successCount: 0,
          errorCount: 0,
          errors: [],
          createdProductIds: [],
        },
      });
    });

    it('should throw NotFoundException if vendor not found', async () => {
      mockPrismaService.vendorProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.initializeBulkUpload('nonexistent', 'products.csv', 10),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('processBulkUpload', () => {
    const validProducts: BulkProductRow[] = [
      {
        name: 'Test Product',
        description: 'This is a test product description',
        price: 99.99,
        stock: 100,
        categoryId: 'cat-123',
      },
    ];

    it('should process products successfully', async () => {
      mockPrismaService.bulkUploadJob.findUnique.mockResolvedValue(mockBulkUploadJob);
      mockPrismaService.bulkUploadJob.update.mockResolvedValue(mockBulkUploadJob);
      mockPrismaService.category.findMany.mockResolvedValue([mockCategory]);
      mockPrismaService.product.create.mockResolvedValue({ id: 'new-product' });

      const result = await service.processBulkUpload('job-123', 'vendor-123', validProducts);

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
      expect(result.createdProductIds).toContain('new-product');
    });

    it('should throw NotFoundException if job not found', async () => {
      mockPrismaService.bulkUploadJob.findUnique.mockResolvedValue(null);

      await expect(
        service.processBulkUpload('nonexistent', 'vendor-123', validProducts),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if job belongs to different vendor', async () => {
      mockPrismaService.bulkUploadJob.findUnique.mockResolvedValue({
        ...mockBulkUploadJob,
        vendorId: 'other-vendor',
      });

      await expect(
        service.processBulkUpload('job-123', 'vendor-123', validProducts),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject products with invalid names', async () => {
      mockPrismaService.bulkUploadJob.findUnique.mockResolvedValue(mockBulkUploadJob);
      mockPrismaService.bulkUploadJob.update.mockResolvedValue(mockBulkUploadJob);
      mockPrismaService.category.findMany.mockResolvedValue([mockCategory]);

      const invalidProducts: BulkProductRow[] = [
        {
          name: 'X', // Too short
          description: 'Valid description here',
          price: 99.99,
          stock: 100,
          categoryId: 'cat-123',
        },
      ];

      const result = await service.processBulkUpload('job-123', 'vendor-123', invalidProducts);

      expect(result.errorCount).toBe(1);
      expect(result.errors[0].field).toBe('name');
    });

    it('should reject products with invalid descriptions', async () => {
      mockPrismaService.bulkUploadJob.findUnique.mockResolvedValue(mockBulkUploadJob);
      mockPrismaService.bulkUploadJob.update.mockResolvedValue(mockBulkUploadJob);
      mockPrismaService.category.findMany.mockResolvedValue([mockCategory]);

      const invalidProducts: BulkProductRow[] = [
        {
          name: 'Valid Name',
          description: 'Short', // Too short
          price: 99.99,
          stock: 100,
          categoryId: 'cat-123',
        },
      ];

      const result = await service.processBulkUpload('job-123', 'vendor-123', invalidProducts);

      expect(result.errorCount).toBe(1);
      expect(result.errors[0].field).toBe('description');
    });

    it('should reject products with invalid categories', async () => {
      mockPrismaService.bulkUploadJob.findUnique.mockResolvedValue(mockBulkUploadJob);
      mockPrismaService.bulkUploadJob.update.mockResolvedValue(mockBulkUploadJob);
      mockPrismaService.category.findMany.mockResolvedValue([mockCategory]);

      const invalidProducts: BulkProductRow[] = [
        {
          name: 'Valid Name',
          description: 'Valid description here',
          price: 99.99,
          stock: 100,
          categoryId: 'invalid-category',
        },
      ];

      const result = await service.processBulkUpload('job-123', 'vendor-123', invalidProducts);

      expect(result.errorCount).toBe(1);
      expect(result.errors[0].field).toBe('category');
    });

    it('should reject products with duplicate SKU', async () => {
      mockPrismaService.bulkUploadJob.findUnique.mockResolvedValue(mockBulkUploadJob);
      mockPrismaService.bulkUploadJob.update.mockResolvedValue(mockBulkUploadJob);
      mockPrismaService.category.findMany.mockResolvedValue([mockCategory]);
      mockPrismaService.product.findFirst.mockResolvedValue({ id: 'existing', sku: 'SKU-001' });

      const productsWithDuplicateSku: BulkProductRow[] = [
        {
          name: 'Valid Name',
          description: 'Valid description here',
          price: 99.99,
          stock: 100,
          categoryId: 'cat-123',
          sku: 'SKU-001',
        },
      ];

      const result = await service.processBulkUpload('job-123', 'vendor-123', productsWithDuplicateSku);

      expect(result.errorCount).toBe(1);
      expect(result.errors[0].field).toBe('sku');
    });
  });

  describe('getJobStatus', () => {
    it('should return job status', async () => {
      mockPrismaService.bulkUploadJob.findUnique.mockResolvedValue(mockBulkUploadJob);

      const result = await service.getJobStatus('job-123', 'vendor-123');

      expect(result).toEqual(expect.objectContaining({
        id: 'job-123',
        status: 'PENDING',
      }));
    });

    it('should throw NotFoundException if job not found', async () => {
      mockPrismaService.bulkUploadJob.findUnique.mockResolvedValue(null);

      await expect(service.getJobStatus('nonexistent', 'vendor-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if job belongs to different vendor', async () => {
      mockPrismaService.bulkUploadJob.findUnique.mockResolvedValue({
        ...mockBulkUploadJob,
        vendorId: 'other-vendor',
      });

      await expect(service.getJobStatus('job-123', 'vendor-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getVendorJobs', () => {
    it('should return paginated jobs for vendor', async () => {
      mockPrismaService.bulkUploadJob.findMany.mockResolvedValue([mockBulkUploadJob]);
      mockPrismaService.bulkUploadJob.count.mockResolvedValue(1);

      const result = await service.getVendorJobs('vendor-123', 1, 10);

      expect(result).toEqual({
        data: expect.any(Array),
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should use default pagination values', async () => {
      mockPrismaService.bulkUploadJob.findMany.mockResolvedValue([]);
      mockPrismaService.bulkUploadJob.count.mockResolvedValue(0);

      const result = await service.getVendorJobs('vendor-123');

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('parseCSV', () => {
    it('should parse valid CSV content', () => {
      const csvContent = `name,description,price,stock,category_id
"Test Product","This is a test description",99.99,100,cat-123`;

      const result = service.parseCSV(csvContent);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'Test Product',
        description: 'This is a test description',
        price: 99.99,
        stock: 100,
        categoryId: 'cat-123',
      });
    });

    it('should handle CSV with category name', () => {
      const csvContent = `name,description,price,stock,category
"Test Product","This is a test description",99.99,100,Electronics`;

      const result = service.parseCSV(csvContent);

      expect(result[0].categoryName).toBe('Electronics');
    });

    it('should handle CSV with images and tags', () => {
      const csvContent = `name,description,price,stock,category,images,tags
"Test Product","This is a test description",99.99,100,Electronics,img1.jpg|img2.jpg,tag1|tag2`;

      const result = service.parseCSV(csvContent);

      expect(result[0].images).toEqual(['img1.jpg', 'img2.jpg']);
      expect(result[0].tags).toEqual(['tag1', 'tag2']);
    });

    it('should throw BadRequestException for empty CSV', () => {
      const csvContent = 'name,description,price,stock';

      expect(() => service.parseCSV(csvContent)).toThrow(BadRequestException);
    });

    it('should handle quoted values with commas', () => {
      const csvContent = `name,description,price,stock,category
"Product, Special","Description with, comma",99.99,100,Electronics`;

      const result = service.parseCSV(csvContent);

      expect(result[0].name).toBe('Product, Special');
      expect(result[0].description).toBe('Description with, comma');
    });
  });

  describe('generateTemplate', () => {
    it('should generate CSV template', () => {
      const template = service.generateTemplate();

      expect(template).toContain('name,description,price,stock');
      expect(template).toContain('Sample Product');
    });
  });

  describe('validateProducts', () => {
    it('should validate products successfully', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([mockCategory]);

      const products: BulkProductRow[] = [
        {
          name: 'Valid Product',
          description: 'This is a valid description',
          price: 99.99,
          stock: 100,
          categoryId: 'cat-123',
        },
      ];

      const result = await service.validateProducts('vendor-123', products);

      expect(result.valid).toBe(true);
      expect(result.validRows).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors', async () => {
      mockPrismaService.category.findMany.mockResolvedValue([mockCategory]);

      const products: BulkProductRow[] = [
        {
          name: 'X', // Invalid
          description: 'Short', // Invalid
          price: -10, // Invalid
          stock: -5, // Invalid
          categoryId: 'invalid', // Invalid
        },
      ];

      const result = await service.validateProducts('vendor-123', products);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('cancelJob', () => {
    it('should cancel a pending job', async () => {
      mockPrismaService.bulkUploadJob.findUnique.mockResolvedValue(mockBulkUploadJob);
      mockPrismaService.bulkUploadJob.update.mockResolvedValue({
        ...mockBulkUploadJob,
        status: 'FAILED',
      });

      await service.cancelJob('job-123', 'vendor-123');

      expect(mockPrismaService.bulkUploadJob.update).toHaveBeenCalledWith({
        where: { id: 'job-123' },
        data: {
          status: 'FAILED',
          completedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if job not found', async () => {
      mockPrismaService.bulkUploadJob.findUnique.mockResolvedValue(null);

      await expect(service.cancelJob('nonexistent', 'vendor-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if job belongs to different vendor', async () => {
      mockPrismaService.bulkUploadJob.findUnique.mockResolvedValue({
        ...mockBulkUploadJob,
        vendorId: 'other-vendor',
      });

      await expect(service.cancelJob('job-123', 'vendor-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for completed job', async () => {
      mockPrismaService.bulkUploadJob.findUnique.mockResolvedValue({
        ...mockBulkUploadJob,
        status: 'COMPLETED',
      });

      await expect(service.cancelJob('job-123', 'vendor-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for failed job', async () => {
      mockPrismaService.bulkUploadJob.findUnique.mockResolvedValue({
        ...mockBulkUploadJob,
        status: 'FAILED',
      });

      await expect(service.cancelJob('job-123', 'vendor-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
