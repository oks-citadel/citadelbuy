import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockProductsService = {
    findAll: jest.fn(),
    search: jest.fn(),
    findOne: jest.fn(),
    getRelatedProducts: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockProduct = {
    id: 'product-1',
    name: 'Test Product',
    slug: 'test-product',
    description: 'A test product',
    price: 99.99,
    stock: 100,
    categoryId: 'cat-1',
    vendorId: 'vendor-1',
    images: ['image1.jpg'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const query = {
        page: 1,
        limit: 20,
        category: 'electronics',
      };

      const mockResponse = {
        products: [mockProduct],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockProductsService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockResponse);
      expect(mockProductsService.findAll).toHaveBeenCalledWith(query);
    });

    it('should handle empty query parameters', async () => {
      const mockResponse = {
        products: [],
        total: 0,
        page: 1,
        totalPages: 0,
      };

      mockProductsService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll({});

      expect(result).toEqual(mockResponse);
    });
  });

  describe('search', () => {
    it('should search products with query string', async () => {
      const mockResponse = {
        products: [mockProduct],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockProductsService.search.mockResolvedValue(mockResponse);

      const result = await controller.search('laptop', undefined, undefined, undefined, undefined, undefined, undefined);

      expect(result).toEqual(mockResponse);
      expect(mockProductsService.search).toHaveBeenCalledWith({
        query: 'laptop',
        category: undefined,
        minPrice: undefined,
        maxPrice: undefined,
        sort: undefined,
        page: 1,
        limit: 20,
      });
    });

    it('should search with price range filter', async () => {
      const mockResponse = {
        products: [mockProduct],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockProductsService.search.mockResolvedValue(mockResponse);

      await controller.search('laptop', undefined, '100', '500', undefined, undefined, undefined);

      expect(mockProductsService.search).toHaveBeenCalledWith({
        query: 'laptop',
        category: undefined,
        minPrice: 100,
        maxPrice: 500,
        sort: undefined,
        page: 1,
        limit: 20,
      });
    });

    it('should search with category filter', async () => {
      const mockResponse = {
        products: [mockProduct],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockProductsService.search.mockResolvedValue(mockResponse);

      await controller.search('laptop', 'cat-1', undefined, undefined, undefined, undefined, undefined);

      expect(mockProductsService.search).toHaveBeenCalledWith({
        query: 'laptop',
        category: 'cat-1',
        minPrice: undefined,
        maxPrice: undefined,
        sort: undefined,
        page: 1,
        limit: 20,
      });
    });

    it('should search with sort parameter', async () => {
      const mockResponse = {
        products: [mockProduct],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockProductsService.search.mockResolvedValue(mockResponse);

      await controller.search('laptop', undefined, undefined, undefined, 'price-asc', undefined, undefined);

      expect(mockProductsService.search).toHaveBeenCalledWith({
        query: 'laptop',
        category: undefined,
        minPrice: undefined,
        maxPrice: undefined,
        sort: 'price-asc',
        page: 1,
        limit: 20,
      });
    });

    it('should search with custom pagination', async () => {
      const mockResponse = {
        products: [mockProduct],
        total: 100,
        page: 2,
        totalPages: 10,
      };

      mockProductsService.search.mockResolvedValue(mockResponse);

      await controller.search('laptop', undefined, undefined, undefined, undefined, '2', '10');

      expect(mockProductsService.search).toHaveBeenCalledWith({
        query: 'laptop',
        category: undefined,
        minPrice: undefined,
        maxPrice: undefined,
        sort: undefined,
        page: 2,
        limit: 10,
      });
    });

    it('should use default pagination values', async () => {
      const mockResponse = {
        products: [],
        total: 0,
        page: 1,
        totalPages: 0,
      };

      mockProductsService.search.mockResolvedValue(mockResponse);

      await controller.search(undefined, undefined, undefined, undefined, undefined, undefined, undefined);

      expect(mockProductsService.search).toHaveBeenCalledWith({
        query: undefined,
        category: undefined,
        minPrice: undefined,
        maxPrice: undefined,
        sort: undefined,
        page: 1,
        limit: 20,
      });
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      mockProductsService.findOne.mockResolvedValue(mockProduct);

      const result = await controller.findOne('product-1');

      expect(result).toEqual(mockProduct);
      expect(mockProductsService.findOne).toHaveBeenCalledWith('product-1');
    });
  });

  describe('getRelatedProducts', () => {
    it('should return related products with default limit', async () => {
      const mockRelated = [
        { ...mockProduct, id: 'product-2' },
        { ...mockProduct, id: 'product-3' },
      ];

      mockProductsService.getRelatedProducts.mockResolvedValue(mockRelated);

      const result = await controller.getRelatedProducts('product-1', undefined);

      expect(result).toEqual(mockRelated);
      expect(mockProductsService.getRelatedProducts).toHaveBeenCalledWith('product-1', 4);
    });

    it('should return related products with custom limit', async () => {
      const mockRelated = [
        { ...mockProduct, id: 'product-2' },
        { ...mockProduct, id: 'product-3' },
      ];

      mockProductsService.getRelatedProducts.mockResolvedValue(mockRelated);

      const result = await controller.getRelatedProducts('product-1', '8');

      expect(result).toEqual(mockRelated);
      expect(mockProductsService.getRelatedProducts).toHaveBeenCalledWith('product-1', 8);
    });
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const createDto = {
        name: 'New Product',
        slug: 'new-product',
        description: 'A new product',
        price: 149.99,
        stock: 50,
        categoryId: 'cat-1',
        vendorId: 'vendor-1',
      };

      const createdProduct = { ...mockProduct, ...createDto };
      mockProductsService.create.mockResolvedValue(createdProduct);

      const result = await controller.create(createDto);

      expect(result).toEqual(createdProduct);
      expect(mockProductsService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const updateDto = {
        name: 'Updated Product',
        price: 199.99,
      };

      const updatedProduct = { ...mockProduct, ...updateDto };
      mockProductsService.update.mockResolvedValue(updatedProduct);

      const result = await controller.update('product-1', updateDto);

      expect(result).toEqual(updatedProduct);
      expect(mockProductsService.update).toHaveBeenCalledWith('product-1', updateDto);
    });
  });

  describe('delete', () => {
    it('should delete a product', async () => {
      mockProductsService.delete.mockResolvedValue(undefined);

      await controller.delete('product-1');

      expect(mockProductsService.delete).toHaveBeenCalledWith('product-1');
    });
  });
});
