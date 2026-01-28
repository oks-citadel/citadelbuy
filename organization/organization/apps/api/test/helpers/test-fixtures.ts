import { PrismaService } from '../../src/common/prisma/prisma.service';
import { TestUser, TestProduct } from './test-helpers';

export interface TestOrder {
  id: string;
  userId: string;
  orderNumber: string;
  total: number;
  status: string;
}

export interface TestAddress {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
}

export interface TestPayment {
  method: 'stripe' | 'paypal' | 'cod';
  token?: string;
  paypalOrderId?: string;
}

/**
 * Default test addresses
 */
export const TEST_ADDRESSES = {
  US: {
    firstName: 'John',
    lastName: 'Doe',
    address: '123 Main Street',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'US',
    phone: '5551234567',
  },
  UK: {
    firstName: 'Jane',
    lastName: 'Smith',
    address: '10 Downing Street',
    city: 'London',
    state: 'Greater London',
    zipCode: 'SW1A 1AA',
    country: 'GB',
    phone: '442071234567',
  },
  CANADA: {
    firstName: 'Bob',
    lastName: 'Johnson',
    address: '123 Maple Ave',
    city: 'Toronto',
    state: 'ON',
    zipCode: 'M5H 2N2',
    country: 'CA',
    phone: '4161234567',
  },
};

/**
 * Test payment tokens for different scenarios
 */
export const TEST_PAYMENT_TOKENS = {
  SUCCESS: 'tok_visa',
  DECLINED: 'tok_chargeDeclined',
  INSUFFICIENT_FUNDS: 'tok_chargeDeclinedInsufficientFunds',
  EXPIRED_CARD: 'tok_chargeDeclinedExpiredCard',
  PROCESSING_ERROR: 'tok_chargeDeclinedProcessingError',
};

/**
 * Create a test order with items
 */
export async function createTestOrder(
  prisma: PrismaService,
  userId: string,
  products: TestProduct[],
  data?: Partial<TestOrder>,
): Promise<TestOrder> {
  const timestamp = Date.now();
  const total = products.reduce((sum, p) => sum + p.price, 0);

  const order = await prisma.order.create({
    data: {
      userId,
      orderNumber: data?.orderNumber || `ORD-${timestamp}`,
      total: data?.total || total,
      subtotal: total,
      tax: 0,
      shipping: 0,
      status: data?.status || 'PENDING',
      paymentStatus: 'PAID',
      paymentMethod: 'stripe',
      shippingAddress: JSON.stringify(TEST_ADDRESSES.US),
      billingAddress: JSON.stringify(TEST_ADDRESSES.US),
      items: {
        create: products.map((product) => ({
          productId: product.id,
          quantity: 1,
          price: product.price,
          name: product.name,
        })),
      },
    },
    include: {
      items: true,
    },
  });

  return {
    id: order.id,
    userId: order.userId,
    orderNumber: order.orderNumber,
    total: Number(order.total),
    status: order.status,
  };
}

/**
 * Create multiple test orders for a user
 */
export async function createTestOrders(
  prisma: PrismaService,
  userId: string,
  products: TestProduct[],
  count: number,
): Promise<TestOrder[]> {
  const orders: TestOrder[] = [];

  for (let i = 0; i < count; i++) {
    const order = await createTestOrder(prisma, userId, products, {
      orderNumber: `ORD-${Date.now()}-${i}`,
    });
    orders.push(order);
  }

  return orders;
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  prisma: PrismaService,
  orderId: string,
  status: string,
): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: { status },
  });
}

/**
 * Create a test cart with items
 */
export async function createTestCart(
  prisma: PrismaService,
  userId: string,
  products: TestProduct[],
): Promise<any> {
  // First check if user already has a cart
  let cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        userId,
      },
    });
  }

  // Add items to cart
  for (const product of products) {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        quantity: 1,
      },
    });
  }

  return prisma.cart.findUnique({
    where: { id: cart.id },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });
}

/**
 * Add shipping method to database
 */
export async function createTestShippingMethod(
  prisma: PrismaService,
  data?: {
    name?: string;
    price?: number;
    estimatedDays?: string;
  },
) {
  try {
    return await prisma.shippingMethod.create({
      data: {
        name: data?.name || 'Standard Shipping',
        price: data?.price || 10.0,
        estimatedDays: data?.estimatedDays || '5-7 business days',
        isActive: true,
      },
    });
  } catch (error) {
    // If ShippingMethod table doesn't exist, return mock data
    return {
      id: `mock-shipping-${Date.now()}`,
      name: data?.name || 'Standard Shipping',
      price: data?.price || 10.0,
      estimatedDays: data?.estimatedDays || '5-7 business days',
    };
  }
}

/**
 * Create test review for a product
 */
export async function createTestReview(
  prisma: PrismaService,
  userId: string,
  productId: string,
  data?: {
    rating?: number;
    comment?: string;
  },
) {
  return await prisma.review.create({
    data: {
      userId,
      productId,
      rating: data?.rating || 5,
      comment: data?.comment || 'Great product!',
    },
  });
}

/**
 * Create test address for a user
 */
export async function createTestUserAddress(
  prisma: PrismaService,
  userId: string,
  address?: Partial<TestAddress>,
) {
  const defaultAddress = {
    ...TEST_ADDRESSES.US,
    ...address,
  };

  try {
    return await prisma.address.create({
      data: {
        userId,
        ...defaultAddress,
        isDefault: true,
      },
    });
  } catch (error) {
    // If Address table doesn't exist, return mock
    return {
      id: `mock-address-${Date.now()}`,
      userId,
      ...defaultAddress,
    };
  }
}

/**
 * Create test payment method for a user
 */
export async function createTestPaymentMethod(
  prisma: PrismaService,
  userId: string,
  data?: {
    type?: string;
    last4?: string;
    expiryMonth?: number;
    expiryYear?: number;
  },
) {
  try {
    return await prisma.paymentMethod.create({
      data: {
        userId,
        type: data?.type || 'card',
        last4: data?.last4 || '4242',
        expiryMonth: data?.expiryMonth || 12,
        expiryYear: data?.expiryYear || 2030,
        isDefault: true,
      },
    });
  } catch (error) {
    // If PaymentMethod table doesn't exist, return mock
    return {
      id: `mock-payment-${Date.now()}`,
      userId,
      type: data?.type || 'card',
      last4: data?.last4 || '4242',
    };
  }
}

/**
 * Create test refund for an order
 */
export async function createTestRefund(
  prisma: PrismaService,
  orderId: string,
  amount: number,
) {
  try {
    return await prisma.refund.create({
      data: {
        orderId,
        amount,
        reason: 'Test refund',
        status: 'COMPLETED',
      },
    });
  } catch (error) {
    return {
      id: `mock-refund-${Date.now()}`,
      orderId,
      amount,
      status: 'COMPLETED',
    };
  }
}

/**
 * Wait for order status to change
 */
export async function waitForOrderStatus(
  prisma: PrismaService,
  orderId: string,
  expectedStatus: string,
  timeout = 10000,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (order?.status === expectedStatus) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

/**
 * Get order history for user
 */
export async function getOrderHistory(
  prisma: PrismaService,
  userId: string,
): Promise<TestOrder[]> {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
    },
  });

  return orders.map((order) => ({
    id: order.id,
    userId: order.userId,
    orderNumber: order.orderNumber,
    total: Number(order.total),
    status: order.status,
  }));
}
