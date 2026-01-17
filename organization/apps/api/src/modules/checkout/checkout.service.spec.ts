import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutService } from './checkout.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { OrdersService } from '../orders/orders.service';
import { CouponsService } from '../coupons/coupons.service';
import { CartAbandonmentService } from '../cart/cart-abandonment.service';
import { ShippingService } from '../shipping/shipping.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Mock Stripe to prevent real API calls
jest.mock('stripe', () => {
  const mockStripeInstance = {
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_mock_123',
        client_secret: 'pi_mock_secret',
        status: 'requires_payment_method',
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'pi_mock_123',
        status: 'succeeded',
      }),
    },
    paymentMethods: {
      list: jest.fn().mockResolvedValue({ data: [] }),
      attach: jest.fn().mockResolvedValue({}),
      retrieve: jest.fn().mockResolvedValue({ customer: 'cus_mock' }),
      detach: jest.fn().mockResolvedValue({}),
    },
    customers: {
      list: jest.fn().mockResolvedValue({ data: [] }),
      create: jest.fn().mockResolvedValue({ id: 'cus_mock_123' }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'cus_mock_123',
        invoice_settings: { default_payment_method: null },
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    setupIntents: {
      create: jest.fn().mockResolvedValue({
        client_secret: 'seti_mock_secret',
      }),
    },
  };
  const MockStripe = jest.fn().mockImplementation(() => mockStripeInstance);
  // Support both ES module default import and CommonJS require
  MockStripe.default = MockStripe;
  return MockStripe;
});

describe('CheckoutService', () => {
  let service: CheckoutService;
  let prisma: PrismaService;
  let paymentsService: PaymentsService;
  let ordersService: OrdersService;
  let couponsService: CouponsService;
  let cartAbandonmentService: CartAbandonmentService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    savedAddress: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    cart: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    cartItem: {
      deleteMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    order: {
      create: jest.fn(),
    },
    coupon: {
      findUnique: jest.fn(),
    },
  };

  const mockPaymentsService = {
    createPaymentIntent: jest.fn(),
  };

  const mockOrdersService = {
    create: jest.fn(),
    updateOrderStatus: jest.fn(),
  };

  const mockCouponsService = {
    validateCoupon: jest.fn(),
    applyCoupon: jest.fn(),
  };

  const mockCartAbandonmentService = {
    validateRecoveryDiscount: jest.fn().mockResolvedValue({ valid: false }),
    markCartRecovered: jest.fn(),
  };

  const mockShippingService = {
    calculateShipping: jest.fn(),
    getShippingOptions: jest.fn(),
    calculatePackageDimensions: jest.fn().mockResolvedValue({
      weight: 2,
      length: 10,
      width: 8,
      height: 4,
    }),
    compareRates: jest.fn().mockResolvedValue({
      freeShippingEligible: false,
      rates: [
        {
          carrier: 'USPS',
          service: 'Priority',
          totalRate: 7.99,
          estimatedDays: 3,
        },
      ],
    }),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('sk_test_dummy'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
        {
          provide: CouponsService,
          useValue: mockCouponsService,
        },
        {
          provide: CartAbandonmentService,
          useValue: mockCartAbandonmentService,
        },
        {
          provide: ShippingService,
          useValue: mockShippingService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CheckoutService>(CheckoutService);
    prisma = module.get<PrismaService>(PrismaService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
    ordersService = module.get<OrdersService>(OrdersService);
    couponsService = module.get<CouponsService>(CouponsService);
    cartAbandonmentService = module.get<CartAbandonmentService>(CartAbandonmentService);

    jest.clearAllMocks();

    // Mock getSavedPaymentMethods to avoid Stripe API calls (after clearAllMocks)
    jest.spyOn(service, 'getSavedPaymentMethods').mockResolvedValue([]);

    // Reset mock return values that are cleared by clearAllMocks
    mockCartAbandonmentService.validateRecoveryDiscount.mockResolvedValue({ valid: false });
    mockShippingService.calculatePackageDimensions.mockResolvedValue({
      weight: 2,
      length: 10,
      width: 8,
      height: 4,
    });
    mockShippingService.compareRates.mockResolvedValue({
      freeShippingEligible: false,
      rates: [
        {
          carrier: 'USPS',
          service: 'Priority',
          totalRate: 7.99,
          estimatedDays: 3,
        },
      ],
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSavedAddresses', () => {
    const mockAddresses = [
      {
        id: 'addr-1',
        userId: 'user-123',
        isDefault: true,
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
      },
      {
        id: 'addr-2',
        userId: 'user-123',
        isDefault: false,
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        street: '456 Second Ave',
        city: 'Brooklyn',
        state: 'NY',
        postalCode: '11201',
        country: 'US',
      },
    ];

    it('should return user saved addresses', async () => {
      mockPrismaService.savedAddress.findMany.mockResolvedValue(mockAddresses);

      const result = await service.getSavedAddresses('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].isDefault).toBe(true);
      expect(mockPrismaService.savedAddress.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    });

    it('should return empty array if no addresses', async () => {
      mockPrismaService.savedAddress.findMany.mockResolvedValue([]);

      const result = await service.getSavedAddresses('user-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('saveAddress', () => {
    const addressData = {
      isDefault: true,
      fullName: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
    };

    it('should save a new address', async () => {
      mockPrismaService.savedAddress.updateMany.mockResolvedValue({});
      mockPrismaService.savedAddress.create.mockResolvedValue({
        id: 'addr-new',
        userId: 'user-123',
        ...addressData,
      });

      const result = await service.saveAddress('user-123', addressData);

      expect(result).toHaveProperty('id');
      expect(result.fullName).toBe('John Doe');
      expect(mockPrismaService.savedAddress.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          ...addressData,
        },
      });
    });

    it('should unset other default addresses if setting as default', async () => {
      mockPrismaService.savedAddress.updateMany.mockResolvedValue({});
      mockPrismaService.savedAddress.create.mockResolvedValue({
        id: 'addr-new',
        userId: 'user-123',
        ...addressData,
      });

      await service.saveAddress('user-123', addressData);

      expect(mockPrismaService.savedAddress.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isDefault: true },
        data: { isDefault: false },
      });
    });

    it('should not unset defaults if not setting as default', async () => {
      const nonDefaultAddress = { ...addressData, isDefault: false };
      mockPrismaService.savedAddress.create.mockResolvedValue({
        id: 'addr-new',
        userId: 'user-123',
        ...nonDefaultAddress,
      });

      await service.saveAddress('user-123', nonDefaultAddress);

      expect(mockPrismaService.savedAddress.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('updateAddress', () => {
    const existingAddress = {
      id: 'addr-1',
      userId: 'user-123',
      isDefault: false,
      fullName: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
    };

    it('should update an existing address', async () => {
      mockPrismaService.savedAddress.findFirst.mockResolvedValue(existingAddress);
      mockPrismaService.savedAddress.update.mockResolvedValue({
        ...existingAddress,
        street: '789 New St',
      });

      const result = await service.updateAddress('user-123', 'addr-1', { street: '789 New St' });

      expect(result.street).toBe('789 New St');
      expect(mockPrismaService.savedAddress.update).toHaveBeenCalledWith({
        where: { id: 'addr-1' },
        data: { street: '789 New St' },
      });
    });

    it('should throw NotFoundException if address not found', async () => {
      mockPrismaService.savedAddress.findFirst.mockResolvedValue(null);

      await expect(
        service.updateAddress('user-123', 'nonexistent', { street: 'New St' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should unset other defaults when setting as default', async () => {
      mockPrismaService.savedAddress.findFirst.mockResolvedValue(existingAddress);
      mockPrismaService.savedAddress.updateMany.mockResolvedValue({});
      mockPrismaService.savedAddress.update.mockResolvedValue({
        ...existingAddress,
        isDefault: true,
      });

      await service.updateAddress('user-123', 'addr-1', { isDefault: true });

      expect(mockPrismaService.savedAddress.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isDefault: true, NOT: { id: 'addr-1' } },
        data: { isDefault: false },
      });
    });
  });

  describe('deleteAddress', () => {
    const existingAddress = {
      id: 'addr-1',
      userId: 'user-123',
    };

    it('should delete an address', async () => {
      mockPrismaService.savedAddress.findFirst.mockResolvedValue(existingAddress);
      mockPrismaService.savedAddress.delete.mockResolvedValue(existingAddress);

      await service.deleteAddress('user-123', 'addr-1');

      expect(mockPrismaService.savedAddress.delete).toHaveBeenCalledWith({
        where: { id: 'addr-1' },
      });
    });

    it('should throw NotFoundException if address not found', async () => {
      mockPrismaService.savedAddress.findFirst.mockResolvedValue(null);

      await expect(service.deleteAddress('user-123', 'nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('guestCheckout', () => {
    const guestCheckoutRequest = {
      items: [
        { productId: 'product-1', quantity: 2, price: 29.99 },
        { productId: 'product-2', quantity: 1, price: 49.99 },
      ],
      shippingAddress: {
        fullName: 'Guest User',
        email: 'guest@example.com',
        phone: '1234567890',
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
      },
      guestEmail: 'guest@example.com',
    };

    const mockProducts = [
      { id: 'product-1', price: 29.99, stock: 100 },
      { id: 'product-2', price: 49.99, stock: 50 },
    ];

    it('should process guest checkout', async () => {
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.order.create.mockResolvedValue({
        id: 'order-123',
        total: 118.38,
        items: [],
      });
      mockPaymentsService.createPaymentIntent.mockResolvedValue({
        clientSecret: 'pi_secret',
        paymentIntentId: 'pi_123',
      });

      const result = await service.guestCheckout(guestCheckoutRequest);

      expect(result).toHaveProperty('orderId');
      expect(result).toHaveProperty('clientSecret');
      expect(result).toHaveProperty('paymentIntentId');
      expect(result.total).toBeGreaterThan(0);
      expect(mockPrismaService.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            guestEmail: 'guest@example.com',
            isGuestOrder: true,
          }),
        })
      );
    });

    it('should throw BadRequestException if product not found', async () => {
      mockPrismaService.product.findMany.mockResolvedValue([mockProducts[0]]);

      await expect(service.guestCheckout(guestCheckoutRequest)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if insufficient stock', async () => {
      const lowStockProducts = [
        { id: 'product-1', price: 29.99, stock: 1 },
        { id: 'product-2', price: 49.99, stock: 50 },
      ];
      mockPrismaService.product.findMany.mockResolvedValue(lowStockProducts);

      await expect(service.guestCheckout(guestCheckoutRequest)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should apply coupon discount for guest', async () => {
      const mockCoupon = {
        code: 'SAVE10',
        type: 'PERCENTAGE',
        value: 10,
        isActive: true,
        startDate: new Date('2024-01-01'),
        endDate: null,
        minOrderValue: 0,
        maxDiscountAmount: null,
      };

      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockPrismaService.order.create.mockResolvedValue({
        id: 'order-123',
        items: [],
      });
      mockPaymentsService.createPaymentIntent.mockResolvedValue({
        clientSecret: 'pi_secret',
        paymentIntentId: 'pi_123',
      });

      const requestWithCoupon = {
        ...guestCheckoutRequest,
        couponCode: 'SAVE10',
      };

      const result = await service.guestCheckout(requestWithCoupon);

      expect(result.discount).toBeGreaterThan(0);
    });

    it('should calculate tax and total correctly', async () => {
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.order.create.mockResolvedValue({
        id: 'order-123',
        items: [],
      });
      mockPaymentsService.createPaymentIntent.mockResolvedValue({
        clientSecret: 'pi_secret',
        paymentIntentId: 'pi_123',
      });

      const result = await service.guestCheckout(guestCheckoutRequest);

      const subtotal = 2 * 29.99 + 1 * 49.99;
      const expectedTax = Math.round(subtotal * 0.08 * 100) / 100;
      const expectedShipping = 7.99; // From mock shipping service

      expect(result.subtotal).toBe(subtotal);
      expect(result.tax).toBe(expectedTax);
      expect(result.shipping).toBe(expectedShipping);
      expect(result.total).toBe(subtotal + expectedTax + expectedShipping);
    });

    it('should allow authenticated users to use guest checkout', async () => {
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
      mockPrismaService.order.create.mockResolvedValue({
        id: 'order-123',
        items: [],
      });
      mockPaymentsService.createPaymentIntent.mockResolvedValue({
        clientSecret: 'pi_secret',
        paymentIntentId: 'pi_123',
      });

      const result = await service.guestCheckout(guestCheckoutRequest, 'user-123');

      expect(mockPrismaService.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            isGuestOrder: false,
          }),
        })
      );
    });
  });

  describe('initializeCheckout', () => {
    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      name: 'Test User',
    };

    const mockCart = {
      id: 'cart-123',
      userId: 'user-123',
      items: [
        {
          productId: 'product-1',
          quantity: 2,
          product: {
            id: 'product-1',
            name: 'Product 1',
            price: 29.99,
            images: ['image1.jpg'],
          },
        },
      ],
    };

    it('should initialize checkout with cart', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.cart.findFirst.mockResolvedValue(mockCart);
      mockPrismaService.savedAddress.findMany.mockResolvedValue([]);
      mockCouponsService.validateCoupon.mockResolvedValue({
        valid: false,
        message: 'Invalid coupon',
      });

      const result = await service.initializeCheckout('user-123', { cartId: 'cart-123' });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('subtotal');
      expect(result).toHaveProperty('tax');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('addresses');
      expect(result).toHaveProperty('paymentMethods');
      expect(result.items).toHaveLength(1);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.initializeCheckout('nonexistent', { cartId: 'cart-123' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if cart not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.cart.findFirst.mockResolvedValue(null);

      await expect(
        service.initializeCheckout('user-123', { cartId: 'nonexistent' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should initialize checkout with single product', async () => {
      const mockProduct = {
        id: 'product-1',
        name: 'Product 1',
        price: 29.99,
        images: ['image1.jpg'],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.savedAddress.findMany.mockResolvedValue([]);
      mockCouponsService.validateCoupon.mockResolvedValue({
        valid: false,
        message: 'Invalid coupon',
      });

      const result = await service.initializeCheckout('user-123', {
        productId: 'product-1',
        quantity: 2,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(2);
      expect(result.items[0].productId).toBe('product-1');
    });

    it('should validate and apply coupon', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.cart.findFirst.mockResolvedValue(mockCart);
      mockPrismaService.savedAddress.findMany.mockResolvedValue([]);
      mockCouponsService.validateCoupon.mockResolvedValue({
        valid: true,
        message: 'Coupon applied',
        discountAmount: 10,
      });

      const result = await service.initializeCheckout('user-123', {
        cartId: 'cart-123',
        couponCode: 'SAVE10',
      });

      expect(result.coupon.applied).toBe(true);
      expect(result.discount).toBe(10);
      expect(result.coupon.code).toBe('SAVE10');
    });

    it('should check for express checkout eligibility', async () => {
      const mockAddresses = [
        {
          id: 'addr-1',
          isDefault: true,
          fullName: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.cart.findFirst.mockResolvedValue(mockCart);
      mockPrismaService.savedAddress.findMany.mockResolvedValue(mockAddresses);
      mockCouponsService.validateCoupon.mockResolvedValue({
        valid: false,
        message: 'Invalid coupon',
      });

      // Mock Stripe payment methods - would need to be added to service
      jest.spyOn(service, 'getSavedPaymentMethods').mockResolvedValue([
        {
          id: 'pm-1',
          stripePaymentMethodId: 'pm_123',
          type: 'card',
          last4: '4242',
          brand: 'visa',
          expMonth: 12,
          expYear: 2025,
          isDefault: true,
        },
      ]);

      const result = await service.initializeCheckout('user-123', { cartId: 'cart-123' });

      expect(result.canExpressCheckout).toBe(true);
      expect(result.selectedAddress).toBeDefined();
      expect(result.paymentMethods).toHaveLength(1);
    });
  });
});
