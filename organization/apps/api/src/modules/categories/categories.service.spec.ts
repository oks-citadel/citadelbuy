import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    category: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockCategory = {
    id: 'category-123',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices and accessories',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    _count: {
      products: 5,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new category successfully', async () => {
      // Arrange
      const createCategoryDto = {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices',
      };
      mockPrismaService.category.findUnique.mockResolvedValue(null);
      mockPrismaService.category.create.mockResolvedValue(mockCategory);

      // Act
      const result = await service.create(createCategoryDto);

      // Assert
      expect(result).toEqual(mockCategory);
      expect(mockPrismaService.category.findUnique).toHaveBeenCalledWith({
        where: { slug: createCategoryDto.slug },
      });
      expect(mockPrismaService.category.create).toHaveBeenCalledWith({
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
    });

    it('should throw ConflictException if slug already exists', async () => {
      // Arrange
      const createCategoryDto = {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices',
      };
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      // Act & Assert
      await expect(service.create(createCategoryDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createCategoryDto)).rejects.toThrow(
        "Category with slug 'electronics' already exists",
      );
    });
  });

  describe('findAll', () => {
    it('should return all categories including empty ones by default', async () => {
      // Arrange
      const mockCategories = [mockCategory];
      mockPrismaService.category.findMany.mockResolvedValue(mockCategories);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(mockCategories);
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        where: {},
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
    });

    it('should return only categories with products when includeEmpty is false', async () => {
      // Arrange
      const mockCategories = [mockCategory];
      mockPrismaService.category.findMany.mockResolvedValue(mockCategories);

      // Act
      const result = await service.findAll(false);

      // Assert
      expect(result).toEqual(mockCategories);
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        where: {
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
    });

    it('should return empty array when no categories exist', async () => {
      // Arrange
      mockPrismaService.category.findMany.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a category by ID', async () => {
      // Arrange
      const categoryId = 'category-123';
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      // Act
      const result = await service.findOne(categoryId);

      // Assert
      expect(result).toEqual(mockCategory);
      expect(mockPrismaService.category.findUnique).toHaveBeenCalledWith({
        where: { id: categoryId },
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when category is not found', async () => {
      // Arrange
      const categoryId = 'non-existent-id';
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(categoryId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(categoryId)).rejects.toThrow(
        "Category with ID 'non-existent-id' not found",
      );
    });
  });

  describe('findBySlug', () => {
    it('should return a category by slug', async () => {
      // Arrange
      const slug = 'electronics';
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);

      // Act
      const result = await service.findBySlug(slug);

      // Assert
      expect(result).toEqual(mockCategory);
      expect(mockPrismaService.category.findUnique).toHaveBeenCalledWith({
        where: { slug },
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when slug is not found', async () => {
      // Arrange
      const slug = 'non-existent-slug';
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findBySlug(slug)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findBySlug(slug)).rejects.toThrow(
        "Category with slug 'non-existent-slug' not found",
      );
    });
  });

  describe('update', () => {
    it('should update a category successfully', async () => {
      // Arrange
      const categoryId = 'category-123';
      const updateCategoryDto = {
        name: 'Updated Electronics',
        description: 'Updated description',
      };
      const updatedCategory = { ...mockCategory, ...updateCategoryDto };
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.category.update.mockResolvedValue(updatedCategory);

      // Act
      const result = await service.update(categoryId, updateCategoryDto);

      // Assert
      expect(result).toEqual(updatedCategory);
      expect(mockPrismaService.category.update).toHaveBeenCalledWith({
        where: { id: categoryId },
        data: updateCategoryDto,
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      });
    });

    it('should update category slug if new slug is unique', async () => {
      // Arrange
      const categoryId = 'category-123';
      const updateCategoryDto = {
        slug: 'new-electronics-slug',
      };
      const updatedCategory = { ...mockCategory, ...updateCategoryDto };
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce(mockCategory) // findOne check
        .mockResolvedValueOnce(null); // slug uniqueness check
      mockPrismaService.category.update.mockResolvedValue(updatedCategory);

      // Act
      const result = await service.update(categoryId, updateCategoryDto);

      // Assert
      expect(result).toEqual(updatedCategory);
    });

    it('should throw ConflictException if new slug already exists', async () => {
      // Arrange
      const categoryId = 'category-123';
      const updateCategoryDto = {
        slug: 'existing-slug',
      };
      const existingCategory = { ...mockCategory, id: 'different-id' };
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce(mockCategory) // findOne check
        .mockResolvedValueOnce(existingCategory); // slug uniqueness check

      // Act & Assert
      await expect(
        service.update(categoryId, updateCategoryDto),
      ).rejects.toThrow(
        "Category with slug 'existing-slug' already exists",
      );
    });

    it('should allow updating same category with same slug', async () => {
      // Arrange
      const categoryId = 'category-123';
      const updateCategoryDto = {
        slug: 'electronics',
      };
      const updatedCategory = { ...mockCategory };
      mockPrismaService.category.findUnique
        .mockResolvedValueOnce(mockCategory) // findOne check
        .mockResolvedValueOnce(mockCategory); // slug check returns same category
      mockPrismaService.category.update.mockResolvedValue(updatedCategory);

      // Act
      const result = await service.update(categoryId, updateCategoryDto);

      // Assert
      expect(result).toEqual(updatedCategory);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      // Arrange
      const categoryId = 'non-existent-id';
      const updateCategoryDto = { name: 'Updated Name' };
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update(categoryId, updateCategoryDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a category successfully when it has no products', async () => {
      // Arrange
      const categoryId = 'category-123';
      const emptyCategory = { ...mockCategory, _count: { products: 0 } };
      mockPrismaService.category.findUnique.mockResolvedValue(emptyCategory);
      mockPrismaService.category.delete.mockResolvedValue(emptyCategory);

      // Act
      const result = await service.remove(categoryId);

      // Assert
      expect(result).toEqual({
        message: 'Category deleted successfully',
        deletedId: categoryId,
      });
      expect(mockPrismaService.category.delete).toHaveBeenCalledWith({
        where: { id: categoryId },
      });
    });

    it('should throw BadRequestException when category has products', async () => {
      // Arrange
      const categoryId = 'category-123';
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory); // Has 5 products

      // Act & Assert
      await expect(service.remove(categoryId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.remove(categoryId)).rejects.toThrow(
        'Cannot delete category with 5 products',
      );
    });

    it('should throw NotFoundException when category does not exist', async () => {
      // Arrange
      const categoryId = 'non-existent-id';
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(categoryId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProductsByCategory', () => {
    it('should return paginated products for a category', async () => {
      // Arrange
      const categoryId = 'category-123';
      const mockProducts = [
        {
          id: 'product-1',
          name: 'Product 1',
          categoryId,
          category: mockCategory,
          vendor: { id: 'vendor-1', name: 'Vendor 1' },
        },
        {
          id: 'product-2',
          name: 'Product 2',
          categoryId,
          category: mockCategory,
          vendor: { id: 'vendor-2', name: 'Vendor 2' },
        },
      ];
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.product.count.mockResolvedValue(10);

      // Act
      const result = await service.getProductsByCategory(categoryId, 1, 20);

      // Assert
      expect(result).toEqual({
        products: mockProducts,
        pagination: {
          total: 10,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      });
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
        where: { categoryId },
        include: {
          category: true,
          vendor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip: 0,
        take: 20,
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should handle pagination correctly for page 2', async () => {
      // Arrange
      const categoryId = 'category-123';
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(50);

      // Act
      const result = await service.getProductsByCategory(categoryId, 2, 20);

      // Assert
      expect(result.pagination).toEqual({
        total: 50,
        page: 2,
        limit: 20,
        totalPages: 3,
      });
      expect(mockPrismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (2-1) * 20
          take: 20,
        }),
      );
    });

    it('should throw NotFoundException when category does not exist', async () => {
      // Arrange
      const categoryId = 'non-existent-id';
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getProductsByCategory(categoryId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return empty products array when category has no products', async () => {
      // Arrange
      const categoryId = 'category-123';
      const emptyCategory = { ...mockCategory, _count: { products: 0 } };
      mockPrismaService.category.findUnique.mockResolvedValue(emptyCategory);
      mockPrismaService.product.findMany.mockResolvedValue([]);
      mockPrismaService.product.count.mockResolvedValue(0);

      // Act
      const result = await service.getProductsByCategory(categoryId);

      // Assert
      expect(result.products).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  describe('getTopLevelCategories', () => {
    it('should return only categories with products', async () => {
      // Arrange
      const mockCategories = [mockCategory];
      mockPrismaService.category.findMany.mockResolvedValue(mockCategories);

      // Act
      const result = await service.getTopLevelCategories();

      // Assert
      expect(result).toEqual(mockCategories);
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        where: {
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
    });
  });
});
