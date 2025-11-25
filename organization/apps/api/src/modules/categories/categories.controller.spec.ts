import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ExecutionContext } from '@nestjs/common';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: CategoriesService;

  const mockCategoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    getTopLevelCategories: jest.fn(),
    findBySlug: jest.fn(),
    findOne: jest.fn(),
    getProductsByCategory: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockCategory = {
    id: 'cat-1',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic products',
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .overrideGuard(AdminGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get<CategoriesService>(CategoriesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new category', async () => {
      const createDto = {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic products',
      };

      mockCategoriesService.create.mockResolvedValue(mockCategory);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockCategory);
      expect(mockCategoriesService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return all categories excluding empty ones by default', async () => {
      const mockCategories = [mockCategory];
      mockCategoriesService.findAll.mockResolvedValue(mockCategories);

      const result = await controller.findAll(undefined);

      expect(result).toEqual(mockCategories);
      expect(mockCategoriesService.findAll).toHaveBeenCalledWith(false);
    });

    it('should include empty categories when includeEmpty is true', async () => {
      const mockCategories = [mockCategory, { ...mockCategory, id: 'cat-2' }];
      mockCategoriesService.findAll.mockResolvedValue(mockCategories);

      const result = await controller.findAll('true');

      expect(result).toEqual(mockCategories);
      expect(mockCategoriesService.findAll).toHaveBeenCalledWith(true);
    });

    it('should exclude empty categories when includeEmpty is false', async () => {
      const mockCategories = [mockCategory];
      mockCategoriesService.findAll.mockResolvedValue(mockCategories);

      const result = await controller.findAll('false');

      expect(result).toEqual(mockCategories);
      expect(mockCategoriesService.findAll).toHaveBeenCalledWith(false);
    });
  });

  describe('getTopLevelCategories', () => {
    it('should return top-level categories with children', async () => {
      const mockTopLevel = [
        {
          ...mockCategory,
          children: [
            {
              id: 'cat-2',
              name: 'Laptops',
              slug: 'laptops',
              parentId: 'cat-1',
            },
          ],
        },
      ];

      mockCategoriesService.getTopLevelCategories.mockResolvedValue(mockTopLevel);

      const result = await controller.getTopLevelCategories();

      expect(result).toEqual(mockTopLevel);
      expect(mockCategoriesService.getTopLevelCategories).toHaveBeenCalled();
    });
  });

  describe('findBySlug', () => {
    it('should return category by slug', async () => {
      mockCategoriesService.findBySlug.mockResolvedValue(mockCategory);

      const result = await controller.findBySlug('electronics');

      expect(result).toEqual(mockCategory);
      expect(mockCategoriesService.findBySlug).toHaveBeenCalledWith('electronics');
    });
  });

  describe('findOne', () => {
    it('should return category by id', async () => {
      mockCategoriesService.findOne.mockResolvedValue(mockCategory);

      const result = await controller.findOne('cat-1');

      expect(result).toEqual(mockCategory);
      expect(mockCategoriesService.findOne).toHaveBeenCalledWith('cat-1');
    });
  });

  describe('getProductsByCategory', () => {
    it('should return paginated products for category', async () => {
      const mockProducts = {
        products: [
          { id: 'prod-1', name: 'Product 1' },
          { id: 'prod-2', name: 'Product 2' },
        ],
        total: 50,
        page: 1,
        totalPages: 3,
      };

      mockCategoriesService.getProductsByCategory.mockResolvedValue(mockProducts);

      const result = await controller.getProductsByCategory('cat-1', 1, 20);

      expect(result).toEqual(mockProducts);
      expect(mockCategoriesService.getProductsByCategory).toHaveBeenCalledWith('cat-1', 1, 20);
    });

    it('should use default pagination values', async () => {
      const mockProducts = {
        products: [],
        total: 0,
        page: 1,
        totalPages: 0,
      };

      mockCategoriesService.getProductsByCategory.mockResolvedValue(mockProducts);

      const result = await controller.getProductsByCategory('cat-1', 1, 20);

      expect(result).toEqual(mockProducts);
      expect(mockCategoriesService.getProductsByCategory).toHaveBeenCalledWith('cat-1', 1, 20);
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const updateDto = {
        name: 'Updated Electronics',
        description: 'Updated description',
      };

      const updatedCategory = {
        ...mockCategory,
        ...updateDto,
      };

      mockCategoriesService.update.mockResolvedValue(updatedCategory);

      const result = await controller.update('cat-1', updateDto);

      expect(result).toEqual(updatedCategory);
      expect(mockCategoriesService.update).toHaveBeenCalledWith('cat-1', updateDto);
    });
  });

  describe('remove', () => {
    it('should delete a category', async () => {
      const mockResponse = { message: 'Category deleted successfully' };
      mockCategoriesService.remove.mockResolvedValue(mockResponse);

      const result = await controller.remove('cat-1');

      expect(result).toEqual(mockResponse);
      expect(mockCategoriesService.remove).toHaveBeenCalledWith('cat-1');
    });
  });
});
