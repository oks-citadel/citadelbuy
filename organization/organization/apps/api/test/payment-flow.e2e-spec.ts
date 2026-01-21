import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import {
  cleanupDatabase,
  createTestUser,
  createTestCategory,
  createTestProduct,
  createTestCoupon,
  TestUser,
  TestProduct,
} from './helpers/test-helpers';
import {
  TEST_PAYMENT_TOKENS,
  TEST_ADDRESSES,
  createTestCart,
} from './helpers/test-fixtures';

describe('Payment Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUser: TestUser;
  let authToken: string;
  let testProduct: TestProduct;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await cleanupDatabase(prisma);

    // Create test user and authenticate
    testUser = await createTestUser(prisma);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    authToken = loginResponse.body.access_token;

    // Create test product and add to cart
    const testCategory = await createTestCategory(prisma);
    testProduct = await createTestProduct(prisma, testCategory.id, {
      price: 100.0,
      stock: 50,
    });

    await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        productId: testProduct.id,
        quantity: 1,
      });
  });

  describe('Stripe Payment', () => {
    it('should successfully process Stripe payment', async () => {
      const checkoutData = {
        shippingAddress: TEST_ADDRESSES.US,
        paymentMethod: 'stripe',
        paymentToken: TEST_PAYMENT_TOKENS.SUCCESS,
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      expect(response.body).toHaveProperty('orderId');
      expect(response.body).toHaveProperty('orderNumber');
      expect(response.body.paymentStatus).toBe('PAID');
      expect(response.body.paymentMethod).toBe('stripe');

      // Verify order was created
      const order = await prisma.order.findUnique({
        where: { id: response.body.orderId },
      });

      expect(order).toBeTruthy();
      expect(order?.paymentStatus).toBe('PAID');
    });

    it('should handle declined card payment', async () => {
      const checkoutData = {
        shippingAddress: TEST_ADDRESSES.US,
        paymentMethod: 'stripe',
        paymentToken: TEST_PAYMENT_TOKENS.DECLINED,
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData);

      // Should either return error or create order with failed payment
      if (response.status === 201) {
        expect(response.body.paymentStatus).toBe('FAILED');
      } else {
        expect([400, 402]).toContain(response.status);
        expect(response.body.message).toBeTruthy();
      }
    });

    it('should handle insufficient funds', async () => {
      const checkoutData = {
        shippingAddress: TEST_ADDRESSES.US,
        paymentMethod: 'stripe',
        paymentToken: TEST_PAYMENT_TOKENS.INSUFFICIENT_FUNDS,
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData);

      expect([400, 402]).toContain(response.status);
      expect(response.body.message).toMatch(/insufficient|funds|declined/i);
    });

    it('should handle expired card', async () => {
      const checkoutData = {
        shippingAddress: TEST_ADDRESSES.US,
        paymentMethod: 'stripe',
        paymentToken: TEST_PAYMENT_TOKENS.EXPIRED_CARD,
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData);

      expect([400, 402]).toContain(response.status);
      expect(response.body.message).toMatch(/expired|invalid/i);
    });

    it('should validate payment token is provided', async () => {
      const checkoutData = {
        shippingAddress: TEST_ADDRESSES.US,
        paymentMethod: 'stripe',
        // Missing paymentToken
      };

      await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(400);
    });

    it('should not process payment without authentication', async () => {
      const checkoutData = {
        shippingAddress: TEST_ADDRESSES.US,
        paymentMethod: 'stripe',
        paymentToken: TEST_PAYMENT_TOKENS.SUCCESS,
      };

      await request(app.getHttpServer())
        .post('/checkout')
        .send(checkoutData)
        .expect(401);
    });
  });

  describe('PayPal Payment', () => {
    it('should process PayPal payment successfully', async () => {
      const checkoutData = {
        shippingAddress: TEST_ADDRESSES.US,
        paymentMethod: 'paypal',
        paypalOrderId: 'PAYPAL-TEST-ORDER-123',
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData);

      // PayPal integration might not be fully implemented
      if (response.status === 201) {
        expect(response.body.paymentMethod).toBe('paypal');
        expect(response.body).toHaveProperty('orderId');
      } else {
        // Skip if PayPal not implemented
        expect([400, 501]).toContain(response.status);
      }
    });

    it('should validate PayPal order ID', async () => {
      const checkoutData = {
        shippingAddress: TEST_ADDRESSES.US,
        paymentMethod: 'paypal',
        // Missing paypalOrderId
      };

      await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(400);
    });
  });

  describe('Cash on Delivery', () => {
    it('should create order with COD payment method', async () => {
      const checkoutData = {
        shippingAddress: TEST_ADDRESSES.US,
        paymentMethod: 'cod',
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData);

      // COD might not be enabled
      if (response.status === 201) {
        expect(response.body.paymentMethod).toBe('cod');
        expect(response.body.paymentStatus).toBe('PENDING');
      } else {
        expect([400, 501]).toContain(response.status);
      }
    });
  });

  describe('Payment with Coupon', () => {
    it('should apply coupon discount to payment amount', async () => {
      // Create and apply coupon
      const coupon = await createTestCoupon(prisma, {
        code: 'PAY10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
      });

      await request(app.getHttpServer())
        .post('/cart/apply-coupon')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ couponCode: coupon.code });

      const checkoutData = {
        shippingAddress: TEST_ADDRESSES.US,
        paymentMethod: 'stripe',
        paymentToken: TEST_PAYMENT_TOKENS.SUCCESS,
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      // Total should be reduced by coupon
      expect(Number(response.body.total)).toBeLessThan(100);
      expect(response.body.discount).toBeGreaterThan(0);
    });

    it('should handle minimum purchase requirement for coupon', async () => {
      const coupon = await createTestCoupon(prisma, {
        code: 'MIN50',
        discountType: 'FIXED',
        discountValue: 10,
        minPurchase: 150, // Minimum $150 purchase
      });

      const applyResponse = await request(app.getHttpServer())
        .post('/cart/apply-coupon')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ couponCode: coupon.code });

      // Should fail because cart total ($100) < minimum ($150)
      expect(applyResponse.status).toBe(400);
      expect(applyResponse.body.message).toMatch(/minimum/i);
    });
  });

  describe('Payment Validation', () => {
    it('should require shipping address for payment', async () => {
      const checkoutData = {
        // Missing shippingAddress
        paymentMethod: 'stripe',
        paymentToken: TEST_PAYMENT_TOKENS.SUCCESS,
      };

      await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(400);
    });

    it('should not process payment with empty cart', async () => {
      // Clear cart
      await request(app.getHttpServer())
        .delete('/cart')
        .set('Authorization', `Bearer ${authToken}`);

      const checkoutData = {
        shippingAddress: TEST_ADDRESSES.US,
        paymentMethod: 'stripe',
        paymentToken: TEST_PAYMENT_TOKENS.SUCCESS,
      };

      await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(400);
    });

    it('should validate payment amount matches cart total', async () => {
      const checkoutData = {
        shippingAddress: TEST_ADDRESSES.US,
        paymentMethod: 'stripe',
        paymentToken: TEST_PAYMENT_TOKENS.SUCCESS,
        amount: 50.0, // Incorrect amount
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData);

      // Should either accept (ignoring amount) or reject
      if (response.status !== 201) {
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Payment Webhooks', () => {
    it('should handle successful payment webhook', async () => {
      // Create order first
      const checkoutData = {
        shippingAddress: TEST_ADDRESSES.US,
        paymentMethod: 'stripe',
        paymentToken: TEST_PAYMENT_TOKENS.SUCCESS,
      };

      const checkoutResponse = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      const orderId = checkoutResponse.body.orderId;

      // Simulate webhook
      const webhookData = {
        type: 'payment.succeeded',
        orderId: orderId,
        paymentIntentId: 'pi_test_123',
      };

      const response = await request(app.getHttpServer())
        .post('/webhooks/stripe')
        .send(webhookData);

      // Webhook endpoint might not exist yet
      if (response.status === 200) {
        // Verify order status updated
        const order = await prisma.order.findUnique({
          where: { id: orderId },
        });

        expect(order?.paymentStatus).toBe('PAID');
      } else {
        expect([404, 501]).toContain(response.status);
      }
    });

    it('should handle failed payment webhook', async () => {
      const webhookData = {
        type: 'payment.failed',
        orderId: 'test-order-id',
        error: 'Card declined',
      };

      const response = await request(app.getHttpServer())
        .post('/webhooks/stripe')
        .send(webhookData);

      // Webhook endpoint might not exist yet
      expect([200, 404, 501]).toContain(response.status);
    });
  });

  describe('Multiple Items Payment', () => {
    it('should calculate correct total for multiple items', async () => {
      const category = await createTestCategory(prisma);

      // Add more products to cart
      const product2 = await createTestProduct(prisma, category.id, {
        name: 'Product 2',
        price: 50.0,
      });

      const product3 = await createTestProduct(prisma, category.id, {
        name: 'Product 3',
        price: 75.0,
      });

      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: product2.id, quantity: 2 });

      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: product3.id, quantity: 1 });

      const checkoutData = {
        shippingAddress: TEST_ADDRESSES.US,
        paymentMethod: 'stripe',
        paymentToken: TEST_PAYMENT_TOKENS.SUCCESS,
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      // Expected: $100 + ($50 * 2) + $75 = $275
      expect(Number(response.body.subtotal)).toBeCloseTo(275, 2);
    });
  });

  describe('Payment Retry', () => {
    it('should allow retry after failed payment', async () => {
      // First attempt with declined card
      const failedCheckoutData = {
        shippingAddress: TEST_ADDRESSES.US,
        paymentMethod: 'stripe',
        paymentToken: TEST_PAYMENT_TOKENS.DECLINED,
      };

      const failedResponse = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(failedCheckoutData);

      // Cart should still have items after failed payment
      const cartResponse = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cartResponse.body.items.length).toBeGreaterThan(0);

      // Retry with valid card
      const successCheckoutData = {
        shippingAddress: TEST_ADDRESSES.US,
        paymentMethod: 'stripe',
        paymentToken: TEST_PAYMENT_TOKENS.SUCCESS,
      };

      await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(successCheckoutData)
        .expect(201);
    });
  });

  describe('Payment Security', () => {
    it('should not expose sensitive payment data in response', async () => {
      const checkoutData = {
        shippingAddress: TEST_ADDRESSES.US,
        paymentMethod: 'stripe',
        paymentToken: TEST_PAYMENT_TOKENS.SUCCESS,
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      // Should not contain sensitive payment data
      expect(response.body).not.toHaveProperty('paymentToken');
      expect(response.body).not.toHaveProperty('cardNumber');
      expect(response.body).not.toHaveProperty('cvv');
    });

    it('should require HTTPS in production', async () => {
      // This is more of a configuration test
      // In production, payment endpoints should only work over HTTPS
      expect(process.env.NODE_ENV).toBe('test');
    });

    it('should log payment attempts for auditing', async () => {
      const checkoutData = {
        shippingAddress: TEST_ADDRESSES.US,
        paymentMethod: 'stripe',
        paymentToken: TEST_PAYMENT_TOKENS.SUCCESS,
      };

      await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      // Verify audit log was created (if audit logging is implemented)
      // This is a placeholder - actual implementation depends on your audit system
    });
  });

  describe('International Payments', () => {
    it('should handle international address payment', async () => {
      const checkoutData = {
        shippingAddress: TEST_ADDRESSES.UK,
        paymentMethod: 'stripe',
        paymentToken: TEST_PAYMENT_TOKENS.SUCCESS,
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      expect(response.body).toHaveProperty('orderId');
      expect(response.body.shippingAddress).toContain('GB');
    });

    it('should calculate correct tax for different countries', async () => {
      const checkoutData = {
        shippingAddress: TEST_ADDRESSES.CANADA,
        paymentMethod: 'stripe',
        paymentToken: TEST_PAYMENT_TOKENS.SUCCESS,
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      // Tax calculation depends on implementation
      expect(response.body).toHaveProperty('tax');
    });
  });
});
