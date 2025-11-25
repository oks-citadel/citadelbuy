import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('WishlistService', () => {
  let service: WishlistService;
  let prisma: PrismaService;

  const mockPrismaService = {
    wishlist: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
  };

  const mockProduct = {
    id: 'product-123',
    name: 'Test Product',
    price: 99.99,
    category: {
      id: 'cat-1',
      name: 'Electronics',
    },
    vendor: {
      id: 'vendor-1',
      name: 'Test Vendor',
    },
  };

  const mockWishlistItem = {
    id: 'wishlist-123',
    userId: 'user-123',
    productId: 'product-123',
    product: mockProduct,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WishlistService>(WishlistService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all wishlist items for a user', async () => {
      // Arrange
      const userId = 'user-123';
      const mockWishlistItems = [mockWishlistItem];
      mockPrismaService.wishlist.findMany.mockResolvedValue(mockWishlistItems);

      // Act
      const result = await service.findAll(userId);

      // Assert
      expect(result).toEqual([
        {
          id: mockWishlistItem.id,
          productId: mockWishlistItem.productId,
          product: mockWishlistItem.product,
          addedAt: mockWishlistItem.createdAt,
        },
      ]);
      expect(mockPrismaService.wishlist.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          product: {
            include: {
              category: true,
              vendor: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should return empty array when wishlist is empty', async () => {
      // Arrange
      const userId = 'user-123';
      mockPrismaService.wishlist.findMany.mockResolvedValue([]);

      // Act
      const result = await service.findAll(userId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should order items by creation date descending', async () => {
      // Arrange
      const userId = 'user-123';
      mockPrismaService.wishlist.findMany.mockResolvedValue([]);

      // Act
      await service.findAll(userId);

      // Assert
      expect(mockPrismaService.wishlist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            createdAt: 'desc',
          },
        }),
      );
    });
  });

  describe('add', () => {
    it('should add a product to wishlist successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const addToWishlistDto = { productId: 'product-123' };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.wishlist.findUnique.mockResolvedValue(null);
      mockPrismaService.wishlist.create.mockResolvedValue(mockWishlistItem);

      // Act
      const result = await service.add(userId, addToWishlistDto);

      // Assert
      expect(result).toEqual({
        id: mockWishlistItem.id,
        productId: mockWishlistItem.productId,
        product: mockWishlistItem.product,
        addedAt: mockWishlistItem.createdAt,
      });
      expect(mockPrismaService.wishlist.create).toHaveBeenCalledWith({
        data: {
          userId,
          productId: addToWishlistDto.productId,
        },
        include: {
          product: {
            include: {
              category: true,
              vendor: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    it('should throw NotFoundException when product does not exist', async () => {
      // Arrange
      const userId = 'user-123';
      const addToWishlistDto = { productId: 'non-existent-product' };
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.add(userId, addToWishlistDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.add(userId, addToWishlistDto)).rejects.toThrow(
        "Product with ID 'non-existent-product' not found",
      );
    });

    it('should throw ConflictException when product is already in wishlist', async () => {
      // Arrange
      const userId = 'user-123';
      const addToWishlistDto = { productId: 'product-123' };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.wishlist.findUnique.mockResolvedValue(
        mockWishlistItem,
      );

      // Act & Assert
      await expect(service.add(userId, addToWishlistDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.add(userId, addToWishlistDto)).rejects.toThrow(
        'Product is already in your wishlist',
      );
    });
  });

  describe('remove', () => {
    it('should remove a product from wishlist successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const productId = 'product-123';
      mockPrismaService.wishlist.findUnique.mockResolvedValue(
        mockWishlistItem,
      );
      mockPrismaService.wishlist.delete.mockResolvedValue(mockWishlistItem);

      // Act
      const result = await service.remove(userId, productId);

      // Assert
      expect(result).toEqual({
        message: 'Product removed from wishlist',
        productId,
      });
      expect(mockPrismaService.wishlist.delete).toHaveBeenCalledWith({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });
    });

    it('should throw NotFoundException when product is not in wishlist', async () => {
      // Arrange
      const userId = 'user-123';
      const productId = 'product-123';
      mockPrismaService.wishlist.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(userId, productId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.remove(userId, productId)).rejects.toThrow(
        'Product not found in your wishlist',
      );
    });

    it('should verify ownership before removing', async () => {
      // Arrange
      const userId = 'user-123';
      const productId = 'product-123';
      mockPrismaService.wishlist.findUnique.mockResolvedValue(
        mockWishlistItem,
      );
      mockPrismaService.wishlist.delete.mockResolvedValue(mockWishlistItem);

      // Act
      await service.remove(userId, productId);

      // Assert
      expect(mockPrismaService.wishlist.findUnique).toHaveBeenCalledWith({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });
    });
  });

  describe('isInWishlist', () => {
    it('should return true when product is in wishlist', async () => {
      // Arrange
      const userId = 'user-123';
      const productId = 'product-123';
      mockPrismaService.wishlist.findUnique.mockResolvedValue(
        mockWishlistItem,
      );

      // Act
      const result = await service.isInWishlist(userId, productId);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when product is not in wishlist', async () => {
      // Arrange
      const userId = 'user-123';
      const productId = 'product-123';
      mockPrismaService.wishlist.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.isInWishlist(userId, productId);

      // Assert
      expect(result).toBe(false);
    });

    it('should query with correct composite key', async () => {
      // Arrange
      const userId = 'user-123';
      const productId = 'product-123';
      mockPrismaService.wishlist.findUnique.mockResolvedValue(null);

      // Act
      await service.isInWishlist(userId, productId);

      // Assert
      expect(mockPrismaService.wishlist.findUnique).toHaveBeenCalledWith({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });
    });
  });

  describe('getCount', () => {
    it('should return the number of items in wishlist', async () => {
      // Arrange
      const userId = 'user-123';
      mockPrismaService.wishlist.count.mockResolvedValue(5);

      // Act
      const result = await service.getCount(userId);

      // Assert
      expect(result).toBe(5);
      expect(mockPrismaService.wishlist.count).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should return 0 when wishlist is empty', async () => {
      // Arrange
      const userId = 'user-123';
      mockPrismaService.wishlist.count.mockResolvedValue(0);

      // Act
      const result = await service.getCount(userId);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all items from wishlist', async () => {
      // Arrange
      const userId = 'user-123';
      mockPrismaService.wishlist.deleteMany.mockResolvedValue({ count: 5 });

      // Act
      const result = await service.clear(userId);

      // Assert
      expect(result).toEqual({
        message: 'Wishlist cleared successfully',
      });
      expect(mockPrismaService.wishlist.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should successfully clear even when wishlist is empty', async () => {
      // Arrange
      const userId = 'user-123';
      mockPrismaService.wishlist.deleteMany.mockResolvedValue({ count: 0 });

      // Act
      const result = await service.clear(userId);

      // Assert
      expect(result).toEqual({
        message: 'Wishlist cleared successfully',
      });
    });

    it('should only delete items for the specific user', async () => {
      // Arrange
      const userId = 'user-123';
      mockPrismaService.wishlist.deleteMany.mockResolvedValue({ count: 3 });

      // Act
      await service.clear(userId);

      // Assert
      expect(mockPrismaService.wishlist.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });
});
