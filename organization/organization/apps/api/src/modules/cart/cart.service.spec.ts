import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CartService', () => {
  let service: CartService;
  let prisma: PrismaService;

  const mockPrismaService = {
    cart: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    cartItem: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
    productVariant: {
      findUnique: jest.fn(),
    },
    cartAbandonment: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrCreateCart', () => {
    const mockCart = {
      id: 'cart-123',
      userId: 'user-123',
      sessionId: null,
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      convertedToOrder: false,
      lastActivityAt: new Date(),
    };

    it('should return existing cart for user', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(mockCart);
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.cart.update.mockResolvedValue(mockCart);

      const result = await service.getOrCreateCart('user-123');

      expect(result).toEqual(mockCart);
      expect(mockPrismaService.cart.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          convertedToOrder: false,
        },
        include: expect.any(Object),
      });
    });

    it('should create new cart if user cart does not exist', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(null);
      mockPrismaService.cart.create.mockResolvedValue(mockCart);
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.cart.update.mockResolvedValue(mockCart);

      const result = await service.getOrCreateCart('user-123');

      expect(mockPrismaService.cart.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
          }),
        })
      );
      expect(result).toEqual(mockCart);
    });

    it('should return existing cart for guest session', async () => {
      const guestCart = { ...mockCart, userId: null, sessionId: 'session-123' };
      mockPrismaService.cart.findFirst.mockResolvedValue(guestCart);
      mockPrismaService.cart.findUnique.mockResolvedValue(guestCart);
      mockPrismaService.cart.update.mockResolvedValue(guestCart);

      const result = await service.getOrCreateCart(undefined, 'session-123');

      expect(result).toEqual(guestCart);
      expect(mockPrismaService.cart.findFirst).toHaveBeenCalledWith({
        where: {
          sessionId: 'session-123',
          convertedToOrder: false,
        },
        include: expect.any(Object),
      });
    });

    it('should create guest cart with expiration', async () => {
      const guestCart = { ...mockCart, userId: null, sessionId: 'session-123' };
      mockPrismaService.cart.findFirst.mockResolvedValue(null);
      mockPrismaService.cart.create.mockResolvedValue(guestCart);
      mockPrismaService.cart.findUnique.mockResolvedValue(guestCart);
      mockPrismaService.cart.update.mockResolvedValue(guestCart);

      await service.getOrCreateCart(undefined, 'session-123');

      expect(mockPrismaService.cart.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionId: 'session-123',
            expiresAt: expect.any(Date),
          }),
        })
      );
    });

    it('should throw error if neither userId nor sessionId provided', async () => {
      await expect(service.getOrCreateCart()).rejects.toThrow(BadRequestException);
      await expect(service.getOrCreateCart()).rejects.toThrow(
        'Either userId or sessionId must be provided'
      );
    });
  });

  describe('getCartById', () => {
    it('should return cart by ID', async () => {
      const mockCart = {
        id: 'cart-123',
        items: [],
      };

      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);

      const result = await service.getCartById('cart-123');

      expect(result).toEqual(mockCart);
      expect(mockPrismaService.cart.findUnique).toHaveBeenCalledWith({
        where: { id: 'cart-123' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if cart not found', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(null);

      await expect(service.getCartById('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.getCartById('nonexistent')).rejects.toThrow('Cart not found');
    });
  });

  describe('addToCart', () => {
    const mockProduct = {
      id: 'product-123',
      name: 'Test Product',
      price: 29.99,
      stock: 100,
    };

    const mockCart = {
      id: 'cart-123',
      userId: 'user-123',
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
    };

    it('should add new product to cart', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.cart.findFirst.mockResolvedValue(mockCart);
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.cart.update.mockResolvedValue(mockCart);
      mockPrismaService.cartItem.findFirst.mockResolvedValue(null);
      mockPrismaService.cartItem.create.mockResolvedValue({
        id: 'item-123',
        cartId: 'cart-123',
        productId: 'product-123',
        quantity: 2,
        price: 29.99,
      });

      await service.addToCart({
        productId: 'product-123',
        quantity: 2,
      }, 'user-123');

      expect(mockPrismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'product-123' },
      });
      expect(mockPrismaService.cartItem.create).toHaveBeenCalledWith({
        data: {
          cartId: 'cart-123',
          productId: 'product-123',
          variantId: undefined,
          quantity: 2,
          price: 29.99,
        },
      });
    });

    it('should update quantity if product already in cart', async () => {
      const existingItem = {
        id: 'item-123',
        cartId: 'cart-123',
        productId: 'product-123',
        quantity: 1,
        price: 29.99,
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.cart.findFirst.mockResolvedValue(mockCart);
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.cart.update.mockResolvedValue(mockCart);
      mockPrismaService.cartItem.findFirst.mockResolvedValue(existingItem);
      mockPrismaService.cartItem.update.mockResolvedValue({
        ...existingItem,
        quantity: 3,
      });

      await service.addToCart({
        productId: 'product-123',
        quantity: 2,
      }, 'user-123');

      expect(mockPrismaService.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-123' },
        data: {
          quantity: 3, // 1 + 2
          price: 29.99,
        },
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(
        service.addToCart({
          productId: 'nonexistent',
          quantity: 1,
        }, 'user-123')
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle product variant', async () => {
      const mockVariant = {
        id: 'variant-123',
        price: 34.99,
        stock: 50,
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.productVariant.findUnique.mockResolvedValue(mockVariant);
      mockPrismaService.cart.findFirst.mockResolvedValue(mockCart);
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.cart.update.mockResolvedValue(mockCart);
      mockPrismaService.cartItem.findFirst.mockResolvedValue(null);
      mockPrismaService.cartItem.create.mockResolvedValue({
        id: 'item-123',
        cartId: 'cart-123',
        productId: 'product-123',
        variantId: 'variant-123',
        quantity: 1,
        price: 34.99,
      });

      await service.addToCart({
        productId: 'product-123',
        variantId: 'variant-123',
        quantity: 1,
      }, 'user-123');

      expect(mockPrismaService.productVariant.findUnique).toHaveBeenCalledWith({
        where: { id: 'variant-123' },
      });
      expect(mockPrismaService.cartItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          variantId: 'variant-123',
          price: 34.99,
        }),
      });
    });

    it('should throw NotFoundException if variant not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.productVariant.findUnique.mockResolvedValue(null);

      await expect(
        service.addToCart({
          productId: 'product-123',
          variantId: 'nonexistent',
          quantity: 1,
        }, 'user-123')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCartItem', () => {
    const mockCartItem = {
      id: 'item-123',
      cartId: 'cart-123',
      productId: 'product-123',
      quantity: 2,
      cart: {
        id: 'cart-123',
        userId: 'user-123',
        sessionId: null,
      },
    };

    const mockCart = {
      id: 'cart-123',
      items: [],
    };

    it('should update cart item quantity', async () => {
      mockPrismaService.cartItem.findUnique.mockResolvedValue(mockCartItem);
      mockPrismaService.cartItem.update.mockResolvedValue({
        ...mockCartItem,
        quantity: 5,
      });
      mockPrismaService.cart.update.mockResolvedValue(mockCart);
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);

      await service.updateCartItem('item-123', { quantity: 5 }, 'user-123');

      expect(mockPrismaService.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-123' },
        data: { quantity: 5 },
      });
    });

    it('should delete cart item if quantity is 0', async () => {
      mockPrismaService.cartItem.findUnique.mockResolvedValue(mockCartItem);
      mockPrismaService.cartItem.delete.mockResolvedValue(mockCartItem);
      mockPrismaService.cart.update.mockResolvedValue(mockCart);
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);

      await service.updateCartItem('item-123', { quantity: 0 }, 'user-123');

      expect(mockPrismaService.cartItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-123' },
      });
      expect(mockPrismaService.cartItem.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if cart item not found', async () => {
      mockPrismaService.cartItem.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCartItem('nonexistent', { quantity: 1 }, 'user-123')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if cart item does not belong to user', async () => {
      mockPrismaService.cartItem.findUnique.mockResolvedValue(mockCartItem);

      await expect(
        service.updateCartItem('item-123', { quantity: 1 }, 'different-user')
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateCartItem('item-123', { quantity: 1 }, 'different-user')
      ).rejects.toThrow('Cart item does not belong to user');
    });

    it('should verify session ownership for guest carts', async () => {
      const guestCartItem = {
        ...mockCartItem,
        cart: {
          id: 'cart-123',
          userId: null,
          sessionId: 'session-123',
        },
      };

      mockPrismaService.cartItem.findUnique.mockResolvedValue(guestCartItem);

      await expect(
        service.updateCartItem('item-123', { quantity: 1 }, undefined, 'wrong-session')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeFromCart', () => {
    const mockCartItem = {
      id: 'item-123',
      cartId: 'cart-123',
      cart: {
        id: 'cart-123',
        userId: 'user-123',
        sessionId: null,
      },
    };

    const mockCart = {
      id: 'cart-123',
      items: [],
    };

    it('should remove item from cart', async () => {
      mockPrismaService.cartItem.findUnique.mockResolvedValue(mockCartItem);
      mockPrismaService.cartItem.delete.mockResolvedValue(mockCartItem);
      mockPrismaService.cart.update.mockResolvedValue(mockCart);
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);

      await service.removeFromCart('item-123', 'user-123');

      expect(mockPrismaService.cartItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-123' },
      });
    });

    it('should throw NotFoundException if cart item not found', async () => {
      mockPrismaService.cartItem.findUnique.mockResolvedValue(null);

      await expect(service.removeFromCart('nonexistent', 'user-123')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should verify ownership before removing', async () => {
      mockPrismaService.cartItem.findUnique.mockResolvedValue(mockCartItem);

      await expect(service.removeFromCart('item-123', 'different-user')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('clearCart', () => {
    const mockCart = {
      id: 'cart-123',
      userId: 'user-123',
      items: [],
    };

    it('should clear all items from cart', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(mockCart);
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.cart.update.mockResolvedValue(mockCart);
      mockPrismaService.cartItem.deleteMany.mockResolvedValue({ count: 3 });

      await service.clearCart('user-123');

      expect(mockPrismaService.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-123' },
      });
    });
  });

  describe('mergeCart', () => {
    const userCart = {
      id: 'user-cart-123',
      userId: 'user-123',
      items: [
        {
          id: 'user-item-1',
          productId: 'product-1',
          variantId: null,
          quantity: 2,
        },
      ],
    };

    const guestCart = {
      id: 'guest-cart-123',
      sessionId: 'session-123',
      items: [
        {
          id: 'guest-item-1',
          productId: 'product-1',
          variantId: null,
          quantity: 1,
        },
        {
          id: 'guest-item-2',
          productId: 'product-2',
          variantId: null,
          quantity: 3,
        },
      ],
    };

    it('should merge guest cart into user cart', async () => {
      mockPrismaService.cart.findFirst
        .mockResolvedValueOnce(userCart)
        .mockResolvedValueOnce(guestCart);
      mockPrismaService.cart.findUnique.mockResolvedValue(userCart);
      mockPrismaService.cart.update.mockResolvedValue(userCart);
      mockPrismaService.cartItem.findFirst
        .mockResolvedValueOnce(userCart.items[0])
        .mockResolvedValueOnce(null);
      mockPrismaService.cartItem.update.mockResolvedValue({});

      await service.mergeCart('user-123', { guestSessionId: 'session-123' });

      // Should combine quantities for existing product
      expect(mockPrismaService.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-item-1' },
          data: {
            quantity: 3, // 2 + 1
          },
        })
      );

      // Should move new product to user cart
      expect(mockPrismaService.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'guest-item-2' },
          data: {
            cartId: 'user-cart-123',
          },
        })
      );
    });

    it('should return user cart if guest cart is empty', async () => {
      const emptyGuestCart = { ...guestCart, items: [] };
      mockPrismaService.cart.findFirst
        .mockResolvedValueOnce(userCart)
        .mockResolvedValueOnce(emptyGuestCart);
      mockPrismaService.cart.findUnique.mockResolvedValue(userCart);
      mockPrismaService.cart.update.mockResolvedValue(userCart);

      const result = await service.mergeCart('user-123', { guestSessionId: 'session-123' });

      expect(result).toEqual(userCart);
      expect(mockPrismaService.cartItem.update).not.toHaveBeenCalled();
    });

    it('should return user cart if guest cart does not exist', async () => {
      mockPrismaService.cart.findFirst
        .mockResolvedValueOnce(userCart)
        .mockResolvedValueOnce(null);
      mockPrismaService.cart.findUnique.mockResolvedValue(userCart);
      mockPrismaService.cart.update.mockResolvedValue(userCart);

      const result = await service.mergeCart('user-123', { guestSessionId: 'session-123' });

      expect(result).toEqual(userCart);
    });
  });

  describe('lockPrices', () => {
    const mockCart = {
      id: 'cart-123',
      items: [
        {
          id: 'item-1',
          product: { price: 29.99 },
          variant: null,
        },
        {
          id: 'item-2',
          product: { price: 49.99 },
          variant: { price: 44.99 },
        },
      ],
    };

    it('should lock prices for all cart items', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.cartItem.findMany.mockResolvedValue(mockCart.items);
      mockPrismaService.cartItem.update.mockResolvedValue({});
      mockPrismaService.cart.update.mockResolvedValue(mockCart);

      await service.lockPrices('cart-123', { durationHours: 24 });

      expect(mockPrismaService.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { lockedPrice: 29.99 },
      });

      expect(mockPrismaService.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-2' },
        data: { lockedPrice: 44.99 }, // Uses variant price
      });

      expect(mockPrismaService.cart.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cart-123' },
          data: expect.objectContaining({
            priceLocked: true,
            priceLockedAt: expect.any(Date),
            priceLockedUntil: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('createShareLink', () => {
    const mockCart = {
      id: 'cart-123',
      items: [],
    };

    it('should create share link with unique token', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.cart.update.mockResolvedValue({
        ...mockCart,
        shareToken: 'abc123',
      });

      const result = await service.createShareLink('cart-123');

      expect(result).toHaveProperty('shareToken');
      expect(result).toHaveProperty('shareUrl');
      expect(result.shareUrl).toContain('/cart/shared/');
      expect(mockPrismaService.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-123' },
        data: { shareToken: expect.any(String) },
      });
    });
  });

  describe('getCartByShareToken', () => {
    const mockCart = {
      id: 'cart-123',
      shareToken: 'abc123',
      items: [],
    };

    it('should return cart by share token', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);

      const result = await service.getCartByShareToken('abc123');

      expect(result).toEqual(mockCart);
      expect(mockPrismaService.cart.findUnique).toHaveBeenCalledWith({
        where: { shareToken: 'abc123' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if shared cart not found', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(null);

      await expect(service.getCartByShareToken('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('trackAbandonment', () => {
    const mockCart = {
      id: 'cart-123',
      total: 99.99,
      items: [
        { quantity: 2 },
        { quantity: 1 },
      ],
    };

    it('should track cart abandonment', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.cartAbandonment.upsert.mockResolvedValue({});
      mockPrismaService.cart.update.mockResolvedValue(mockCart);

      const result = await service.trackAbandonment('cart-123', {
        email: 'user@example.com',
        phone: '1234567890',
      });

      expect(result).toHaveProperty('message');
      expect(mockPrismaService.cartAbandonment.upsert).toHaveBeenCalledWith({
        where: { cartId: 'cart-123' },
        create: expect.objectContaining({
          cartId: 'cart-123',
          email: 'user@example.com',
          phone: '1234567890',
          cartValue: 99.99,
          itemCount: 3,
        }),
        update: expect.objectContaining({
          email: 'user@example.com',
          phone: '1234567890',
          cartValue: 99.99,
          itemCount: 3,
        }),
      });

      expect(mockPrismaService.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-123' },
        data: { isAbandoned: true },
      });
    });
  });

  describe('getAbandonedCarts', () => {
    const mockAbandonments = [
      {
        id: 'abandon-1',
        cartValue: 99.99,
        email: 'user1@example.com',
      },
      {
        id: 'abandon-2',
        cartValue: 149.99,
        email: 'user2@example.com',
      },
    ];

    it('should return paginated abandoned carts', async () => {
      mockPrismaService.cartAbandonment.findMany.mockResolvedValue(mockAbandonments);
      mockPrismaService.cartAbandonment.count.mockResolvedValue(2);

      const result = await service.getAbandonedCarts({ page: 1, limit: 20 });

      expect(result.abandonments).toEqual(mockAbandonments);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by minimum cart value', async () => {
      mockPrismaService.cartAbandonment.findMany.mockResolvedValue([mockAbandonments[1]]);
      mockPrismaService.cartAbandonment.count.mockResolvedValue(1);

      await service.getAbandonedCarts({ page: 1, limit: 20, minValue: 100 });

      expect(mockPrismaService.cartAbandonment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            cartValue: { gte: 100 },
          }),
        })
      );
    });
  });

  describe('reserveInventory', () => {
    const mockCart = {
      id: 'cart-123',
      items: [
        {
          id: 'item-1',
          quantity: 2,
          product: { stock: 10 },
          variant: null,
        },
      ],
    };

    it('should reserve inventory for cart items', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(mockCart);
      mockPrismaService.cartItem.update.mockResolvedValue({});

      const result = await service.reserveInventory('cart-123', 15);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('expiresAt');
      expect(mockPrismaService.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: expect.objectContaining({
            inventoryReserved: true,
            reservedAt: expect.any(Date),
            reservationExpiry: expect.any(Date),
          }),
        })
      );
    });

    it('should throw BadRequestException if not enough stock', async () => {
      const lowStockCart = {
        ...mockCart,
        items: [
          {
            id: 'item-1',
            quantity: 20,
            product: { stock: 10 },
            variant: null,
          },
        ],
      };

      mockPrismaService.cart.findUnique.mockResolvedValue(lowStockCart);

      await expect(service.reserveInventory('cart-123', 15)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('releaseInventory', () => {
    it('should release inventory reservations', async () => {
      mockPrismaService.cartItem.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.releaseInventory('cart-123');

      expect(result).toHaveProperty('message');
      expect(mockPrismaService.cartItem.updateMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-123' },
        data: {
          inventoryReserved: false,
          reservedAt: null,
          reservationExpiry: null,
        },
      });
    });
  });
});
