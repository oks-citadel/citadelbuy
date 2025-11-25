import { Test, TestingModule } from '@nestjs/testing';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';

describe('WishlistController', () => {
  let controller: WishlistController;
  let service: WishlistService;

  const mockWishlistService = {
    findAll: jest.fn(),
    getCount: jest.fn(),
    isInWishlist: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'CUSTOMER',
  };

  const mockWishlistItems = [
    {
      id: 'wishlist-1',
      userId: 'user-123',
      productId: 'product-1',
      product: {
        id: 'product-1',
        name: 'Test Product 1',
        price: 99.99,
      },
      createdAt: new Date(),
    },
    {
      id: 'wishlist-2',
      userId: 'user-123',
      productId: 'product-2',
      product: {
        id: 'product-2',
        name: 'Test Product 2',
        price: 149.99,
      },
      createdAt: new Date(),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WishlistController],
      providers: [
        {
          provide: WishlistService,
          useValue: mockWishlistService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockUser;
          return true;
        },
      })
      .compile();

    controller = module.get<WishlistController>(WishlistController);
    service = module.get<WishlistService>(WishlistService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all wishlist items for user', async () => {
      const mockRequest = { user: mockUser };
      mockWishlistService.findAll.mockResolvedValue(mockWishlistItems);

      const result = await controller.findAll(mockRequest as any);

      expect(result).toEqual(mockWishlistItems);
      expect(mockWishlistService.findAll).toHaveBeenCalledWith('user-123');
      expect(mockWishlistService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when wishlist is empty', async () => {
      const mockRequest = { user: mockUser };
      mockWishlistService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockRequest as any);

      expect(result).toEqual([]);
      expect(mockWishlistService.findAll).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getCount', () => {
    it('should return wishlist item count', async () => {
      const mockRequest = { user: mockUser };
      mockWishlistService.getCount.mockResolvedValue(5);

      const result = await controller.getCount(mockRequest as any);

      expect(result).toEqual({ count: 5 });
      expect(mockWishlistService.getCount).toHaveBeenCalledWith('user-123');
    });

    it('should return zero count for empty wishlist', async () => {
      const mockRequest = { user: mockUser };
      mockWishlistService.getCount.mockResolvedValue(0);

      const result = await controller.getCount(mockRequest as any);

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('checkProduct', () => {
    it('should return true when product is in wishlist', async () => {
      const mockRequest = { user: mockUser };
      const productId = 'product-1';
      mockWishlistService.isInWishlist.mockResolvedValue(true);

      const result = await controller.checkProduct(mockRequest as any, productId);

      expect(result).toEqual({ inWishlist: true });
      expect(mockWishlistService.isInWishlist).toHaveBeenCalledWith('user-123', 'product-1');
    });

    it('should return false when product is not in wishlist', async () => {
      const mockRequest = { user: mockUser };
      const productId = 'product-999';
      mockWishlistService.isInWishlist.mockResolvedValue(false);

      const result = await controller.checkProduct(mockRequest as any, productId);

      expect(result).toEqual({ inWishlist: false });
      expect(mockWishlistService.isInWishlist).toHaveBeenCalledWith('user-123', 'product-999');
    });
  });

  describe('add', () => {
    it('should add product to wishlist', async () => {
      const mockRequest = { user: mockUser };
      const addDto = { productId: 'product-1' };
      const mockWishlistItem = mockWishlistItems[0];

      mockWishlistService.add.mockResolvedValue(mockWishlistItem);

      const result = await controller.add(mockRequest as any, addDto);

      expect(result).toEqual(mockWishlistItem);
      expect(mockWishlistService.add).toHaveBeenCalledWith('user-123', addDto);
    });
  });

  describe('remove', () => {
    it('should remove product from wishlist', async () => {
      const mockRequest = { user: mockUser };
      const productId = 'product-1';
      const mockResponse = { message: 'Product removed from wishlist' };

      mockWishlistService.remove.mockResolvedValue(mockResponse);

      const result = await controller.remove(mockRequest as any, productId);

      expect(result).toEqual(mockResponse);
      expect(mockWishlistService.remove).toHaveBeenCalledWith('user-123', 'product-1');
    });
  });

  describe('clear', () => {
    it('should clear entire wishlist', async () => {
      const mockRequest = { user: mockUser };
      const mockResponse = { message: 'Wishlist cleared successfully' };

      mockWishlistService.clear.mockResolvedValue(mockResponse);

      const result = await controller.clear(mockRequest as any);

      expect(result).toEqual(mockResponse);
      expect(mockWishlistService.clear).toHaveBeenCalledWith('user-123');
    });
  });
});
