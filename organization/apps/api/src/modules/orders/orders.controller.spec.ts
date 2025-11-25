import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  const mockOrdersService = {
    findByUserId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'CUSTOMER',
  };

  const mockOrder = {
    id: 'order-1',
    userId: 'user-123',
    total: 199.99,
    status: 'PENDING',
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        quantity: 2,
        price: 99.99,
        product: {
          id: 'product-1',
          name: 'Test Product',
        },
      },
    ],
    shippingAddress: {
      street: '123 Main St',
      city: 'Test City',
      state: 'TS',
      zip: '12345',
      country: 'USA',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockUser;
          return true;
        },
      })
      .compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all orders for the user', async () => {
      const mockRequest = { user: mockUser };
      const mockOrders = [mockOrder, { ...mockOrder, id: 'order-2' }];

      mockOrdersService.findByUserId.mockResolvedValue(mockOrders);

      const result = await controller.findAll(mockRequest);

      expect(result).toEqual(mockOrders);
      expect(mockOrdersService.findByUserId).toHaveBeenCalledWith('user-123');
      expect(mockOrdersService.findByUserId).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when user has no orders', async () => {
      const mockRequest = { user: mockUser };

      mockOrdersService.findByUserId.mockResolvedValue([]);

      const result = await controller.findAll(mockRequest);

      expect(result).toEqual([]);
      expect(mockOrdersService.findByUserId).toHaveBeenCalledWith('user-123');
    });

    it('should extract user id from request', async () => {
      const differentUser = { id: 'user-456', email: 'other@example.com', role: 'CUSTOMER' };
      const mockRequest = { user: differentUser };

      mockOrdersService.findByUserId.mockResolvedValue([]);

      await controller.findAll(mockRequest);

      expect(mockOrdersService.findByUserId).toHaveBeenCalledWith('user-456');
    });
  });

  describe('findById', () => {
    it('should return order by id', async () => {
      const mockRequest = { user: mockUser };

      mockOrdersService.findById.mockResolvedValue(mockOrder);

      const result = await controller.findById('order-1', mockRequest);

      expect(result).toEqual(mockOrder);
      expect(mockOrdersService.findById).toHaveBeenCalledWith('order-1', 'user-123');
    });

    it('should pass both order id and user id to service', async () => {
      const mockRequest = { user: mockUser };

      mockOrdersService.findById.mockResolvedValue(mockOrder);

      await controller.findById('order-123', mockRequest);

      expect(mockOrdersService.findById).toHaveBeenCalledWith('order-123', 'user-123');
    });

    it('should handle different user accessing order', async () => {
      const differentUser = { id: 'user-456', email: 'other@example.com', role: 'CUSTOMER' };
      const mockRequest = { user: differentUser };

      mockOrdersService.findById.mockResolvedValue(null);

      const result = await controller.findById('order-1', mockRequest);

      expect(result).toBeNull();
      expect(mockOrdersService.findById).toHaveBeenCalledWith('order-1', 'user-456');
    });
  });

  describe('create', () => {
    it('should create a new order', async () => {
      const mockRequest = { user: mockUser };
      const createOrderDto = {
        items: [
          {
            productId: 'product-1',
            quantity: 2,
          },
        ],
        shippingAddress: {
          street: '123 Main St',
          city: 'Test City',
          state: 'TS',
          zip: '12345',
          country: 'USA',
        },
        paymentMethod: 'CREDIT_CARD',
      };

      mockOrdersService.create.mockResolvedValue(mockOrder);

      const result = await controller.create(mockRequest, createOrderDto);

      expect(result).toEqual(mockOrder);
      expect(mockOrdersService.create).toHaveBeenCalledWith('user-123', createOrderDto);
    });

    it('should pass user id and order data to service', async () => {
      const mockRequest = { user: mockUser };
      const createOrderDto = {
        items: [
          {
            productId: 'product-2',
            quantity: 1,
          },
        ],
        shippingAddress: {
          street: '456 Oak Ave',
          city: 'Another City',
          state: 'AC',
          zip: '54321',
          country: 'USA',
        },
        paymentMethod: 'PAYPAL',
      };

      const createdOrder = { ...mockOrder, id: 'order-2' };
      mockOrdersService.create.mockResolvedValue(createdOrder);

      await controller.create(mockRequest, createOrderDto);

      expect(mockOrdersService.create).toHaveBeenCalledWith('user-123', createOrderDto);
    });

    it('should handle order with multiple items', async () => {
      const mockRequest = { user: mockUser };
      const createOrderDto = {
        items: [
          {
            productId: 'product-1',
            quantity: 2,
          },
          {
            productId: 'product-2',
            quantity: 1,
          },
          {
            productId: 'product-3',
            quantity: 3,
          },
        ],
        shippingAddress: {
          street: '789 Pine Rd',
          city: 'Big City',
          state: 'BC',
          zip: '99999',
          country: 'USA',
        },
        paymentMethod: 'CREDIT_CARD',
      };

      const largeOrder = { ...mockOrder, total: 599.97 };
      mockOrdersService.create.mockResolvedValue(largeOrder);

      const result = await controller.create(mockRequest, createOrderDto);

      expect(result.total).toBe(599.97);
      expect(mockOrdersService.create).toHaveBeenCalledWith('user-123', createOrderDto);
    });
  });
});
