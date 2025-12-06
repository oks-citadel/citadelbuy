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

describe('Checkout Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUser: TestUser;
  let authToken: string;
  let testProduct: TestProduct;
  let cartItemId: string;

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

    const cartResponse = await request(app.getHttpServer())
      .post('/cart/items')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        productId: testProduct.id,
        quantity: 2,
      });

    cartItemId = cartResponse.body.id;
  });

  describe('Guest Checkout', () => {
    it('should allow guest checkout with email', async () => {
      // Create cart without authentication
      const guestCartResponse = await request(app.getHttpServer())
        .post('/cart/guest')
        .send({
          items: [
            {
              productId: testProduct.id,
              quantity: 1,
            },
          ],
        })
        .expect(201);

      const guestCartId = guestCartResponse.body.id;

      const checkoutData = {
        cartId: guestCartId,
        email: 'guest@example.com',
        shippingAddress: {
          firstName: 'Guest',
          lastName: 'User',
          address: '123 Test St',
          city: 'Test City',
          state: 'TC',
          zipCode: '12345',
          country: 'US',
          phone: '1234567890',
        },
        paymentMethod: 'stripe',
        paymentToken: 'tok_visa', // Test token
      };

      const response = await request(app.getHttpServer())
        .post('/checkout/guest')
        .send(checkoutData)
        .expect(201);

      expect(response.body).toHaveProperty('orderId');
      expect(response.body).toHaveProperty('orderNumber');
      expect(response.body.email).toBe(checkoutData.email);
    });

    it('should validate guest email format', async () => {
      const checkoutData = {
        email: 'invalid-email',
        shippingAddress: {
          firstName: 'Guest',
          lastName: 'User',
          address: '123 Test St',
          city: 'Test City',
          state: 'TC',
          zipCode: '12345',
          country: 'US',
        },
        paymentMethod: 'stripe',
      };

      await request(app.getHttpServer())
        .post('/checkout/guest')
        .send(checkoutData)
        .expect(400);
    });

    it('should require all required address fields for guest checkout', async () => {
      const checkoutData = {
        email: 'guest@example.com',
        shippingAddress: {
          firstName: 'Guest',
          // Missing required fields
        },
        paymentMethod: 'stripe',
      };

      await request(app.getHttpServer())
        .post('/checkout/guest')
        .send(checkoutData)
        .expect(400);
    });
  });

  describe('Authenticated Checkout', () => {
    it('should checkout successfully with valid data', async () => {
      const checkoutData = {
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
          phone: '5551234567',
        },
        billingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
        paymentMethod: 'stripe',
        paymentToken: 'tok_visa',
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      expect(response.body).toHaveProperty('orderId');
      expect(response.body).toHaveProperty('orderNumber');
      expect(response.body).toHaveProperty('total');
      expect(response.body.userId).toBe(testUser.id);
    });

    it('should use billing address same as shipping if not provided', async () => {
      const checkoutData = {
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
          phone: '5551234567',
        },
        paymentMethod: 'stripe',
        paymentToken: 'tok_visa',
        useSameAddress: true,
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      expect(response.body).toHaveProperty('orderId');
    });

    it('should fail checkout with empty cart', async () => {
      // Clear cart
      await request(app.getHttpServer())
        .delete('/cart')
        .set('Authorization', `Bearer ${authToken}`);

      const checkoutData = {
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
        paymentMethod: 'stripe',
        paymentToken: 'tok_visa',
      };

      await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(400);
    });

    it('should create order with correct total', async () => {
      // Expected total: 2 items * $100 = $200
      const checkoutData = {
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
        paymentMethod: 'stripe',
        paymentToken: 'tok_visa',
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      expect(Number(response.body.total)).toBeCloseTo(200, 2);
    });

    it('should reduce product stock after checkout', async () => {
      const initialStock = testProduct.stock;

      const checkoutData = {
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
        paymentMethod: 'stripe',
        paymentToken: 'tok_visa',
      };

      await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      // Check product stock
      const product = await prisma.product.findUnique({
        where: { id: testProduct.id },
      });

      expect(product?.stock).toBe(initialStock - 2);
    });

    it('should clear cart after successful checkout', async () => {
      const checkoutData = {
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
        paymentMethod: 'stripe',
        paymentToken: 'tok_visa',
      };

      await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      // Verify cart is empty
      const cartResponse = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cartResponse.body.items.length).toBe(0);
    });
  });

  describe('Address Validation', () => {
    it('should validate US zip code format', async () => {
      const checkoutData = {
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: 'INVALID',
          country: 'US',
        },
        paymentMethod: 'stripe',
        paymentToken: 'tok_visa',
      };

      await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(400);
    });

    it('should validate required address fields', async () => {
      const requiredFields = [
        'firstName',
        'lastName',
        'address',
        'city',
        'zipCode',
        'country',
      ];

      for (const field of requiredFields) {
        const checkoutData = {
          shippingAddress: {
            firstName: 'John',
            lastName: 'Doe',
            address: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'US',
            [field]: undefined, // Remove required field
          },
          paymentMethod: 'stripe',
          paymentToken: 'tok_visa',
        };

        delete (checkoutData.shippingAddress as any)[field];

        await request(app.getHttpServer())
          .post('/checkout')
          .set('Authorization', `Bearer ${authToken}`)
          .send(checkoutData)
          .expect(400);
      }
    });

    it('should accept valid international address', async () => {
      const checkoutData = {
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'London',
          state: 'Greater London',
          zipCode: 'SW1A 1AA',
          country: 'GB',
        },
        paymentMethod: 'stripe',
        paymentToken: 'tok_visa',
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      expect(response.body).toHaveProperty('orderId');
    });
  });

  describe('Payment Processing', () => {
    it('should process Stripe payment', async () => {
      const checkoutData = {
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
        paymentMethod: 'stripe',
        paymentToken: 'tok_visa',
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      expect(response.body.paymentStatus).toBe('PAID');
    });

    it('should handle payment failure gracefully', async () => {
      const checkoutData = {
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
        paymentMethod: 'stripe',
        paymentToken: 'tok_chargeDeclined', // Test token for declined payment
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData);

      // Should either reject or mark as payment failed
      expect([400, 402, 201]).toContain(response.status);

      if (response.status === 201) {
        expect(response.body.paymentStatus).toBe('FAILED');
      }
    });

    it('should support PayPal payment method', async () => {
      const checkoutData = {
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
        paymentMethod: 'paypal',
        paypalOrderId: 'PAYPAL-ORDER-123',
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData);

      // Should accept PayPal as payment method
      expect([200, 201]).toContain(response.status);
    });

    it('should validate payment method is provided', async () => {
      const checkoutData = {
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
        // Missing paymentMethod
      };

      await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(400);
    });
  });

  describe('Order Confirmation', () => {
    it('should return order confirmation details', async () => {
      const checkoutData = {
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
        paymentMethod: 'stripe',
        paymentToken: 'tok_visa',
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      expect(response.body).toHaveProperty('orderId');
      expect(response.body).toHaveProperty('orderNumber');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body.status).toBe('PENDING');
    });

    it('should retrieve order by id', async () => {
      // Create order
      const checkoutData = {
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
        paymentMethod: 'stripe',
        paymentToken: 'tok_visa',
      };

      const checkoutResponse = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData);

      const orderId = checkoutResponse.body.orderId;

      // Retrieve order
      const response = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(orderId);
      expect(response.body.userId).toBe(testUser.id);
    });

    it('should include order items in confirmation', async () => {
      const checkoutData = {
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
        paymentMethod: 'stripe',
        paymentToken: 'tok_visa',
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(response.body.items[0]).toHaveProperty('productId');
      expect(response.body.items[0]).toHaveProperty('quantity');
      expect(response.body.items[0]).toHaveProperty('price');
    });
  });

  describe('Coupon at Checkout', () => {
    it('should apply coupon discount to order total', async () => {
      // Create and apply coupon
      const coupon = await createTestCoupon(prisma, {
        code: 'CHECKOUT10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
      });

      await request(app.getHttpServer())
        .post('/cart/apply-coupon')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          couponCode: coupon.code,
        });

      const checkoutData = {
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
        paymentMethod: 'stripe',
        paymentToken: 'tok_visa',
      };

      const response = await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      // Expected: $200 - 10% = $180
      expect(Number(response.body.total)).toBeCloseTo(180, 2);
      expect(response.body.discount).toBeGreaterThan(0);
    });

    it('should increment coupon usage count after checkout', async () => {
      const coupon = await createTestCoupon(prisma, {
        code: 'USEONCE',
      });

      const initialUses = coupon.currentUses;

      await request(app.getHttpServer())
        .post('/cart/apply-coupon')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          couponCode: coupon.code,
        });

      const checkoutData = {
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
        },
        paymentMethod: 'stripe',
        paymentToken: 'tok_visa',
      };

      await request(app.getHttpServer())
        .post('/checkout')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkoutData)
        .expect(201);

      // Verify coupon usage incremented
      const updatedCoupon = await prisma.coupon.findUnique({
        where: { id: coupon.id },
      });

      expect(updatedCoupon?.currentUses).toBe(initialUses + 1);
    });
  });
});
