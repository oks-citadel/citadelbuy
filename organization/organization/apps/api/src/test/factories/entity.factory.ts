import { UserRole, OrderStatus } from '@prisma/client';

/**
 * Factory for creating mock User entities
 */
export class UserFactory {
  static create(overrides: Partial<any> = {}) {
    return {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      password: '$2b$10$hashedpassword',
      name: 'Test User',
      role: UserRole.CUSTOMER,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    };
  }

  static createCustomer(overrides: Partial<any> = {}) {
    return this.create({ role: UserRole.CUSTOMER, ...overrides });
  }

  static createVendor(overrides: Partial<any> = {}) {
    return this.create({ role: UserRole.VENDOR, ...overrides });
  }

  static createAdmin(overrides: Partial<any> = {}) {
    return this.create({ role: UserRole.ADMIN, ...overrides });
  }

  static createMany(count: number, overrides: Partial<any> = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.create({ id: `user-${i}`, email: `user${i}@example.com`, ...overrides }),
    );
  }
}

/**
 * Factory for creating mock Product entities
 */
export class ProductFactory {
  static create(overrides: Partial<any> = {}) {
    return {
      id: 'prod-123',
      name: 'Test Product',
      slug: 'test-product',
      description: 'A test product description',
      price: 99.99,
      stock: 100,
      imageUrl: 'https://example.com/image.jpg',
      categoryId: 'cat-1',
      vendorId: 'vendor-1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<any> = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.create({
        id: `prod-${i}`,
        name: `Product ${i}`,
        slug: `product-${i}`,
        ...overrides,
      }),
    );
  }
}

/**
 * Factory for creating mock Order entities
 */
export class OrderFactory {
  static create(overrides: Partial<any> = {}) {
    return {
      id: 'order-123',
      userId: 'user-1',
      status: OrderStatus.PENDING,
      total: 199.98,
      shippingAddress: '123 Main St, City, State 12345',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      items: [],
      ...overrides,
    };
  }

  static createWithItems(itemCount: number, overrides: Partial<any> = {}) {
    return this.create({
      items: Array.from({ length: itemCount }, (_, i) =>
        OrderItemFactory.create({
          orderId: overrides.id || 'order-123',
          productId: `prod-${i}`,
        }),
      ),
      ...overrides,
    });
  }

  static createMany(count: number, overrides: Partial<any> = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.create({ id: `order-${i}`, ...overrides }),
    );
  }
}

/**
 * Factory for creating mock OrderItem entities
 */
export class OrderItemFactory {
  static create(overrides: Partial<any> = {}) {
    return {
      id: 'item-123',
      orderId: 'order-1',
      productId: 'prod-1',
      quantity: 1,
      price: 99.99,
      createdAt: new Date('2024-01-01'),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<any> = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.create({ id: `item-${i}`, productId: `prod-${i}`, ...overrides }),
    );
  }
}

/**
 * Factory for creating mock Category entities
 */
export class CategoryFactory {
  static create(overrides: Partial<any> = {}) {
    return {
      id: 'cat-123',
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and accessories',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<any> = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.create({
        id: `cat-${i}`,
        name: `Category ${i}`,
        slug: `category-${i}`,
        ...overrides,
      }),
    );
  }
}

/**
 * Factory for creating mock Review entities
 */
export class ReviewFactory {
  static create(overrides: Partial<any> = {}) {
    return {
      id: 'review-123',
      productId: 'prod-1',
      userId: 'user-1',
      rating: 5,
      comment: 'Great product!',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<any> = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.create({ id: `review-${i}`, ...overrides }),
    );
  }
}

/**
 * Factory for creating mock Payment entities
 */
export class PaymentFactory {
  static create(overrides: Partial<any> = {}) {
    return {
      id: 'pay-123',
      orderId: 'order-1',
      amount: 199.98,
      method: 'CREDIT_CARD',
      status: 'COMPLETED',
      transactionId: 'txn_abc123',
      createdAt: new Date('2024-01-01'),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<any> = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.create({ id: `pay-${i}`, transactionId: `txn_${i}`, ...overrides }),
    );
  }
}

/**
 * Factory for creating DTOs
 */
export class DtoFactory {
  static createProductDto(overrides: Partial<any> = {}) {
    return {
      name: 'Test Product',
      description: 'A test product',
      price: 99.99,
      stock: 100,
      categoryId: 'cat-1',
      ...overrides,
    };
  }

  static createUserDto(overrides: Partial<any> = {}) {
    return {
      email: 'test@example.com',
      password: 'Password123!',
      name: 'Test User',
      ...overrides,
    };
  }

  static createOrderDto(overrides: Partial<any> = {}) {
    return {
      items: [
        {
          productId: 'prod-1',
          quantity: 1,
        },
      ],
      shippingAddress: '123 Main St',
      ...overrides,
    };
  }
}
