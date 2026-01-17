import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProductsService } from './products.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QueryProductsDto, SortBy } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    category: {
      count: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated products with default parameters', async () => {
      const mockProducts = [
        {
          id: 'product-1',
          name: 'Test Product 1',
          price: 29.99,
          category: { id: 'cat-1', name: 'Electronics' },
        },
        {
          id: 'product-2',
          name: 'Test Product 2',
          price: 49.99,
          category: { id: 'cat-1', name: 'Electronics' },
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(2);

      const query: QueryProductsDto = {};
      const result = await service.findAll(query);

      expect(result).toEqual({
        data: mockProducts,
        total: 2,
        page: 1,
        limit: 12,
        totalPages: 1,
      });

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 12,
        include: { category: true },
      });
    });

    it('should filter products by search term', async () => {
      const mockProducts = [
        {
          id: 'product-1',
          name: 'Gaming Laptop',
          description: 'High performance laptop',
          price: 1299.99,
        },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(1);

      const query: QueryProductsDto = { search: 'laptop' };
      await service.findAll(query);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { name: { contains: 'laptop', mode: 'insensitive' } },
            { description: { contains: 'laptop', mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 12,
        include: { category: true },
      });
    });

    it('should filter products by category', async () => {
      const categoryId = 'cat-electronics';
      const mockProducts = [
        { id: 'product-1', categoryId, name: 'Laptop' },
        { id: 'product-2', categoryId, name: 'Phone' },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(2);

      const query: QueryProductsDto = { category: categoryId };
      await service.findAll(query);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, categoryId },
        }),
      );
    });

    it('should filter products by price range', async () => {
      const mockProducts = [
        { id: 'product-1', name: 'Product 1', price: 50 },
        { id: 'product-2', name: 'Product 2', price: 75 },
      ];

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(2);

      const query: QueryProductsDto = { minPrice: 25, maxPrice: 100 };
      await service.findAll(query);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isActive: true,
            price: {
              gte: 25,
              lte: 100,
            },
          },
        }),
      );
    });

    it('should sort products by price ascending', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      const query: QueryProductsDto = { sortBy: SortBy.PRICE_ASC };
      await service.findAll(query);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: 'asc' },
        }),
      );
    });

    it('should sort products by price descending', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      const query: QueryProductsDto = { sortBy: SortBy.PRICE_DESC };
      await service.findAll(query);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: 'desc' },
        }),
      );
    });

    it('should sort products by newest first', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      const query: QueryProductsDto = { sortBy: SortBy.NEWEST };
      await service.findAll(query);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      const mockProducts = Array(10)
        .fill(null)
        .map((_, i) => ({
          id: `product-${i}`,
          name: `Product ${i}`,
          price: 29.99,
        }));

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(50);

      const query: QueryProductsDto = { page: 2, limit: 10 };
      const result = await service.findAll(query);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(5);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page 2 - 1) * 10
          take: 10,
        }),
      );
    });

    it('should combine multiple filters', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      const query: QueryProductsDto = {
        search: 'laptop',
        category: 'cat-electronics',
        minPrice: 500,
        maxPrice: 2000,
        sortBy: SortBy.PRICE_ASC,
      };

      await service.findAll(query);

      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { name: { contains: 'laptop', mode: 'insensitive' } },
            { description: { contains: 'laptop', mode: 'insensitive' } },
          ],
          categoryId: 'cat-electronics',
          price: {
            gte: 500,
            lte: 2000,
          },
        },
        orderBy: { price: 'asc' },
        skip: 0,
        take: 12,
        include: { category: true },
      });
    });
  });

  describe('findOne', () => {
    it('should return a single product by ID', async () => {
      const productId = 'product-123';
      const mockProduct = {
        id: productId,
        name: 'Test Product',
        price: 99.99,
        category: { id: 'cat-1', name: 'Electronics' },
        vendor: {
          id: 'vendor-1',
          name: 'Test Vendor',
          email: 'vendor@test.com',
        },
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findOne(productId);

      expect(result).toEqual(mockProduct);
      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: productId },
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
    });

    it('should return null if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      const result = await service.findOne('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new product with generated slug', async () => {
      const createProductDto: CreateProductDto = {
        name: 'Gaming Laptop Pro',
        description: 'High performance gaming laptop',
        price: 1299.99,
        images: ['image1.jpg', 'image2.jpg'],
        categoryId: 'cat-electronics',
        vendorId: 'vendor-1',
        stock: 50,
      };

      const mockCreatedProduct = {
        id: 'product-new',
        ...createProductDto,
        slug: expect.stringContaining('gaming-laptop-pro-'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.product.create.mockResolvedValue(mockCreatedProduct);

      const result = await service.create(createProductDto);

      expect(result).toEqual(mockCreatedProduct);
      expect(mockPrismaService.product.create).toHaveBeenCalledWith({
        data: {
          ...createProductDto,
          slug: expect.stringMatching(/gaming-laptop-pro-\d+/),
        },
        include: { category: true },
      });
    });

    it('should handle product names with special characters in slug', async () => {
      const createProductDto: CreateProductDto = {
        name: 'Test Product!! @#$ 123',
        description: 'Test',
        price: 99.99,
        images: ['image.jpg'],
        categoryId: 'cat-1',
        vendorId: 'vendor-1',
        stock: 10,
      };

      mockPrismaService.product.create.mockResolvedValue({
        id: 'product-new',
        ...createProductDto,
      });

      await service.create(createProductDto);

      expect(mockPrismaService.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          slug: expect.stringMatching(/test-product-123-\d+/),
        }),
        include: { category: true },
      });
    });
  });

  describe('update', () => {
    it('should update an existing product', async () => {
      const productId = 'product-123';
      const updateData = {
        name: 'Updated Product Name',
        price: 149.99,
        stock: 25,
      };

      const mockUpdatedProduct = {
        id: productId,
        ...updateData,
        category: { id: 'cat-1', name: 'Electronics' },
      };

      mockPrismaService.product.update.mockResolvedValue(mockUpdatedProduct);

      const result = await service.update(productId, updateData);

      expect(result).toEqual(mockUpdatedProduct);
      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: updateData,
        include: { category: true },
      });
    });

    it('should allow partial updates', async () => {
      const productId = 'product-123';
      const updateData = { price: 199.99 }; // Only updating price

      mockPrismaService.product.update.mockResolvedValue({
        id: productId,
        ...updateData,
      });

      await service.update(productId, updateData);

      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: updateData,
        include: { category: true },
      });
    });
  });

  describe('delete', () => {
    it('should delete a product', async () => {
      const productId = 'product-123';
      const mockDeletedProduct = {
        id: productId,
        name: 'Deleted Product',
      };

      mockPrismaService.product.delete.mockResolvedValue(mockDeletedProduct);

      const result = await service.delete(productId);

      expect(result).toEqual(mockDeletedProduct);
      expect(mockPrismaService.product.delete).toHaveBeenCalledWith({
        where: { id: productId },
      });
    });
  });

  describe('getProductStats', () => {
    it('should return product statistics', async () => {
      mockPrismaService.product.count
        .mockResolvedValueOnce(150) // total products
        .mockResolvedValueOnce(8) // low stock
        .mockResolvedValueOnce(3); // out of stock

      mockPrismaService.category.count.mockResolvedValue(12);

      mockPrismaService.product.aggregate.mockResolvedValue({
        _avg: { price: 249.99 },
      });

      const result = await service.getProductStats();

      expect(result).toEqual({
        totalProducts: 150,
        totalCategories: 12,
        lowStockProducts: 8,
        outOfStockProducts: 3,
        averagePrice: 249.99,
      });
    });

    it('should handle zero average price', async () => {
      mockPrismaService.product.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      mockPrismaService.category.count.mockResolvedValue(0);

      mockPrismaService.product.aggregate.mockResolvedValue({
        _avg: { price: null },
      });

      const result = await service.getProductStats();

      expect(result.averagePrice).toBe(0);
    });

    it('should correctly identify low stock products', async () => {
      // Low stock should be products with stock <= 10 and > 0
      mockPrismaService.product.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(15) // low stock (1-10 units)
        .mockResolvedValueOnce(5); // out of stock (0 units)

      mockPrismaService.category.count.mockResolvedValue(10);
      mockPrismaService.product.aggregate.mockResolvedValue({
        _avg: { price: 99.99 },
      });

      await service.getProductStats();

      expect(mockPrismaService.product.count).toHaveBeenNthCalledWith(2, {
        where: {
          stock: {
            lte: 10,
            gt: 0,
          },
        },
      });
    });

    it('should correctly identify out of stock products', async () => {
      mockPrismaService.product.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(10) // low stock
        .mockResolvedValueOnce(8); // out of stock

      mockPrismaService.category.count.mockResolvedValue(10);
      mockPrismaService.product.aggregate.mockResolvedValue({
        _avg: { price: 99.99 },
      });

      await service.getProductStats();

      expect(mockPrismaService.product.count).toHaveBeenNthCalledWith(3, {
        where: {
          stock: 0,
        },
      });
    });
  });
});
