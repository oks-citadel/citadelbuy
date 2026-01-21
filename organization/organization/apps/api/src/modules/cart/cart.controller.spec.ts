import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';

describe('CartController', () => {
  let controller: CartController;
  let service: CartService;

  const mockCartService = {
    getOrCreateCart: jest.fn(),
    addToCart: jest.fn(),
    updateCartItem: jest.fn(),
    removeFromCart: jest.fn(),
    clearCart: jest.fn(),
    mergeCart: jest.fn(),
    lockPrices: jest.fn(),
    createShareLink: jest.fn(),
    getCartByShareToken: jest.fn(),
    trackAbandonment: jest.fn(),
    getAbandonedCarts: jest.fn(),
    reserveInventory: jest.fn(),
    releaseInventory: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'CUSTOMER',
  };

  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: 'ADMIN',
  };

  const mockProduct = {
    id: 'product-1',
    name: 'Test Product',
    slug: 'test-product',
    price: 99.99,
    images: ['image1.jpg'],
    stock: 100,
  };

  const mockCartItem = {
    id: 'cart-item-1',
    productId: 'product-1',
    variantId: null,
    quantity: 2,
    price: 99.99,
    product: mockProduct,
    variant: null,
  };

  const mockCart = {
    id: 'cart-1',
    userId: 'user-123',
    sessionId: null,
    items: [mockCartItem],
    subtotal: 199.98,
    tax: 19.998,
    total: 219.978,
    priceLocked: false,
    priceLockedAt: null,
    priceLockedUntil: null,
    shareToken: null,
    isAbandoned: false,
    convertedToOrder: false,
    lastActivityAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: mockCartService,
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
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockUser;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<CartController>(CartController);
    service = module.get<CartService>(CartService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCart', () => {
    it('should return cart for authenticated user', async () => {
      const mockRequest = { user: mockUser } as any;
      mockCartService.getOrCreateCart.mockResolvedValue(mockCart);

      const result = await controller.getCart(mockRequest, undefined);

      expect(result).toEqual(mockCart);
      expect(mockCartService.getOrCreateCart).toHaveBeenCalledWith('user-123', undefined);
      expect(mockCartService.getOrCreateCart).toHaveBeenCalledTimes(1);
    });

    it('should return cart for guest user with sessionId', async () => {
      const mockRequest = { user: undefined } as any;
      const guestCart = { ...mockCart, userId: null, sessionId: 'session-abc' };
      mockCartService.getOrCreateCart.mockResolvedValue(guestCart);

      const result = await controller.getCart(mockRequest, 'session-abc');

      expect(result).toEqual(guestCart);
      expect(mockCartService.getOrCreateCart).toHaveBeenCalledWith(undefined, 'session-abc');
    });

    it('should return empty cart when no items exist', async () => {
      const mockRequest = { user: mockUser } as any;
      const emptyCart = { ...mockCart, items: [], subtotal: 0, tax: 0, total: 0 };
      mockCartService.getOrCreateCart.mockResolvedValue(emptyCart);

      const result = await controller.getCart(mockRequest, undefined);

      expect(result).toEqual(emptyCart);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('addToCart', () => {
    it('should add item to cart', async () => {
      const mockRequest = { user: mockUser } as any;
      const addToCartDto = {
        productId: 'product-1',
        quantity: 2,
      };

      mockCartService.addToCart.mockResolvedValue(mockCart);

      const result = await controller.addToCart(mockRequest, addToCartDto);

      expect(result).toEqual(mockCart);
      expect(mockCartService.addToCart).toHaveBeenCalledWith(addToCartDto, 'user-123');
    });

    it('should add item with variant to cart', async () => {
      const mockRequest = { user: mockUser } as any;
      const addToCartDto = {
        productId: 'product-1',
        variantId: 'variant-1',
        quantity: 1,
      };

      const cartWithVariant = {
        ...mockCart,
        items: [{ ...mockCartItem, variantId: 'variant-1' }],
      };
      mockCartService.addToCart.mockResolvedValue(cartWithVariant);

      const result = await controller.addToCart(mockRequest, addToCartDto);

      expect(result).toEqual(cartWithVariant);
      expect(mockCartService.addToCart).toHaveBeenCalledWith(addToCartDto, 'user-123');
    });

    it('should add item to guest cart with sessionId', async () => {
      const mockRequest = { user: undefined } as any;
      const addToCartDto = {
        productId: 'product-1',
        quantity: 1,
        sessionId: 'session-abc',
      };

      const guestCart = { ...mockCart, userId: null, sessionId: 'session-abc' };
      mockCartService.addToCart.mockResolvedValue(guestCart);

      const result = await controller.addToCart(mockRequest, addToCartDto);

      expect(result).toEqual(guestCart);
      expect(mockCartService.addToCart).toHaveBeenCalledWith(addToCartDto, undefined);
    });
  });

  describe('updateCartItem', () => {
    it('should update cart item quantity', async () => {
      const mockRequest = { user: mockUser } as any;
      const updateCartItemDto = { quantity: 5 };
      const updatedCart = {
        ...mockCart,
        items: [{ ...mockCartItem, quantity: 5 }],
      };

      mockCartService.updateCartItem.mockResolvedValue(updatedCart);

      const result = await controller.updateCartItem(mockRequest, 'cart-item-1', updateCartItemDto, undefined);

      expect(result).toEqual(updatedCart);
      expect(mockCartService.updateCartItem).toHaveBeenCalledWith(
        'cart-item-1',
        updateCartItemDto,
        'user-123',
        undefined,
      );
    });

    it('should update cart item with sessionId for guest', async () => {
      const mockRequest = { user: undefined } as any;
      const updateCartItemDto = { quantity: 3 };

      mockCartService.updateCartItem.mockResolvedValue(mockCart);

      await controller.updateCartItem(mockRequest, 'cart-item-1', updateCartItemDto, 'session-abc');

      expect(mockCartService.updateCartItem).toHaveBeenCalledWith(
        'cart-item-1',
        updateCartItemDto,
        undefined,
        'session-abc',
      );
    });

    it('should remove item when quantity is set to 0', async () => {
      const mockRequest = { user: mockUser } as any;
      const updateCartItemDto = { quantity: 0 };
      const emptyCart = { ...mockCart, items: [] };

      mockCartService.updateCartItem.mockResolvedValue(emptyCart);

      const result = await controller.updateCartItem(mockRequest, 'cart-item-1', updateCartItemDto, undefined);

      expect(result.items).toHaveLength(0);
      expect(mockCartService.updateCartItem).toHaveBeenCalledWith(
        'cart-item-1',
        updateCartItemDto,
        'user-123',
        undefined,
      );
    });
  });

  describe('removeFromCart', () => {
    it('should remove item from cart', async () => {
      const mockRequest = { user: mockUser } as any;
      const emptyCart = { ...mockCart, items: [], subtotal: 0, tax: 0, total: 0 };

      mockCartService.removeFromCart.mockResolvedValue(emptyCart);

      const result = await controller.removeFromCart(mockRequest, 'cart-item-1', undefined);

      expect(result).toEqual(emptyCart);
      expect(mockCartService.removeFromCart).toHaveBeenCalledWith('cart-item-1', 'user-123', undefined);
    });

    it('should remove item from guest cart with sessionId', async () => {
      const mockRequest = { user: undefined } as any;

      mockCartService.removeFromCart.mockResolvedValue(mockCart);

      await controller.removeFromCart(mockRequest, 'cart-item-1', 'session-abc');

      expect(mockCartService.removeFromCart).toHaveBeenCalledWith('cart-item-1', undefined, 'session-abc');
    });
  });

  describe('clearCart', () => {
    it('should clear entire cart for user', async () => {
      const mockRequest = { user: mockUser } as any;
      const emptyCart = { ...mockCart, items: [], subtotal: 0, tax: 0, total: 0 };

      mockCartService.clearCart.mockResolvedValue(emptyCart);

      const result = await controller.clearCart(mockRequest, undefined);

      expect(result).toEqual(emptyCart);
      expect(result.items).toHaveLength(0);
      expect(mockCartService.clearCart).toHaveBeenCalledWith('user-123', undefined);
    });

    it('should clear guest cart with sessionId', async () => {
      const mockRequest = { user: undefined } as any;
      const emptyCart = { ...mockCart, items: [], userId: null, sessionId: 'session-abc' };

      mockCartService.clearCart.mockResolvedValue(emptyCart);

      const result = await controller.clearCart(mockRequest, 'session-abc');

      expect(result).toEqual(emptyCart);
      expect(mockCartService.clearCart).toHaveBeenCalledWith(undefined, 'session-abc');
    });
  });

  describe('mergeCart', () => {
    it('should merge guest cart into user cart', async () => {
      const mockRequest = { user: mockUser } as any;
      const mergeCartDto = { guestSessionId: 'session-abc' };
      const mergedCart = {
        ...mockCart,
        items: [mockCartItem, { ...mockCartItem, id: 'cart-item-2', productId: 'product-2' }],
      };

      mockCartService.mergeCart.mockResolvedValue(mergedCart);

      const result = await controller.mergeCart(mockRequest, mergeCartDto);

      expect(result).toEqual(mergedCart);
      expect(mockCartService.mergeCart).toHaveBeenCalledWith('user-123', mergeCartDto);
    });

    it('should return user cart when guest cart is empty', async () => {
      const mockRequest = { user: mockUser } as any;
      const mergeCartDto = { guestSessionId: 'empty-session' };

      mockCartService.mergeCart.mockResolvedValue(mockCart);

      const result = await controller.mergeCart(mockRequest, mergeCartDto);

      expect(result).toEqual(mockCart);
      expect(mockCartService.mergeCart).toHaveBeenCalledWith('user-123', mergeCartDto);
    });
  });

  describe('lockPrices', () => {
    it('should lock prices in cart', async () => {
      const lockPricesDto = { durationHours: 24 };
      const lockedCart = {
        ...mockCart,
        priceLocked: true,
        priceLockedAt: new Date(),
        priceLockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockCartService.lockPrices.mockResolvedValue(lockedCart);

      const result = await controller.lockPrices('cart-1', lockPricesDto);

      expect(result).toEqual(lockedCart);
      expect(result.priceLocked).toBe(true);
      expect(mockCartService.lockPrices).toHaveBeenCalledWith('cart-1', lockPricesDto);
    });

    it('should lock prices for 1 hour', async () => {
      const lockPricesDto = { durationHours: 1 };

      mockCartService.lockPrices.mockResolvedValue({ ...mockCart, priceLocked: true });

      await controller.lockPrices('cart-1', lockPricesDto);

      expect(mockCartService.lockPrices).toHaveBeenCalledWith('cart-1', { durationHours: 1 });
    });
  });

  describe('createShareLink', () => {
    it('should create shareable cart link', async () => {
      const shareResponse = {
        shareToken: 'abc123def456',
        shareUrl: '/cart/shared/abc123def456',
      };

      mockCartService.createShareLink.mockResolvedValue(shareResponse);

      const result = await controller.createShareLink('cart-1');

      expect(result).toEqual(shareResponse);
      expect(result.shareToken).toBeDefined();
      expect(result.shareUrl).toContain('/cart/shared/');
      expect(mockCartService.createShareLink).toHaveBeenCalledWith('cart-1');
    });
  });

  describe('getSharedCart', () => {
    it('should get cart by share token', async () => {
      const sharedCart = { ...mockCart, shareToken: 'abc123def456' };

      mockCartService.getCartByShareToken.mockResolvedValue(sharedCart);

      const result = await controller.getSharedCart('abc123def456');

      expect(result).toEqual(sharedCart);
      expect(mockCartService.getCartByShareToken).toHaveBeenCalledWith('abc123def456');
    });
  });

  describe('trackAbandonment', () => {
    it('should track cart abandonment with email', async () => {
      const trackAbandonmentDto = {
        email: 'user@example.com',
      };
      const response = { message: 'Cart abandonment tracked successfully' };

      mockCartService.trackAbandonment.mockResolvedValue(response);

      const result = await controller.trackAbandonment('cart-1', trackAbandonmentDto);

      expect(result).toEqual(response);
      expect(mockCartService.trackAbandonment).toHaveBeenCalledWith('cart-1', trackAbandonmentDto);
    });

    it('should track cart abandonment with email and phone', async () => {
      const trackAbandonmentDto = {
        email: 'user@example.com',
        phone: '+1234567890',
      };

      mockCartService.trackAbandonment.mockResolvedValue({ message: 'Cart abandonment tracked successfully' });

      await controller.trackAbandonment('cart-1', trackAbandonmentDto);

      expect(mockCartService.trackAbandonment).toHaveBeenCalledWith('cart-1', trackAbandonmentDto);
    });
  });

  describe('getAbandonedCarts', () => {
    it('should get abandoned carts with default pagination', async () => {
      const abandonedCartsResponse = {
        abandonments: [
          {
            id: 'abandonment-1',
            cartId: 'cart-1',
            email: 'user@example.com',
            cartValue: 199.99,
            itemCount: 2,
            cart: mockCart,
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockCartService.getAbandonedCarts.mockResolvedValue(abandonedCartsResponse);

      const result = await controller.getAbandonedCarts(undefined, undefined, undefined);

      expect(result).toEqual(abandonedCartsResponse);
      expect(mockCartService.getAbandonedCarts).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        minValue: undefined,
      });
    });

    it('should get abandoned carts with custom pagination', async () => {
      const abandonedCartsResponse = {
        abandonments: [],
        pagination: {
          page: 2,
          limit: 10,
          total: 15,
          totalPages: 2,
        },
      };

      mockCartService.getAbandonedCarts.mockResolvedValue(abandonedCartsResponse);

      const result = await controller.getAbandonedCarts(2, 10, undefined);

      expect(result).toEqual(abandonedCartsResponse);
      expect(mockCartService.getAbandonedCarts).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        minValue: undefined,
      });
    });

    it('should filter abandoned carts by minimum value', async () => {
      const abandonedCartsResponse = {
        abandonments: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };

      mockCartService.getAbandonedCarts.mockResolvedValue(abandonedCartsResponse);

      const result = await controller.getAbandonedCarts(undefined, undefined, 100);

      expect(result).toEqual(abandonedCartsResponse);
      expect(mockCartService.getAbandonedCarts).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        minValue: 100,
      });
    });
  });

  describe('reserveInventory', () => {
    it('should reserve inventory with default duration', async () => {
      const reservationResponse = {
        message: 'Inventory reserved successfully',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      };

      mockCartService.reserveInventory.mockResolvedValue(reservationResponse);

      const result = await controller.reserveInventory('cart-1', undefined);

      expect(result).toEqual(reservationResponse);
      expect(mockCartService.reserveInventory).toHaveBeenCalledWith('cart-1', undefined);
    });

    it('should reserve inventory with custom duration', async () => {
      const reservationResponse = {
        message: 'Inventory reserved successfully',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      };

      mockCartService.reserveInventory.mockResolvedValue(reservationResponse);

      const result = await controller.reserveInventory('cart-1', 30);

      expect(result).toEqual(reservationResponse);
      expect(mockCartService.reserveInventory).toHaveBeenCalledWith('cart-1', 30);
    });
  });

  describe('releaseInventory', () => {
    it('should release inventory reservations', async () => {
      const releaseResponse = { message: 'Inventory released successfully' };

      mockCartService.releaseInventory.mockResolvedValue(releaseResponse);

      const result = await controller.releaseInventory('cart-1');

      expect(result).toEqual(releaseResponse);
      expect(mockCartService.releaseInventory).toHaveBeenCalledWith('cart-1');
    });
  });
});
