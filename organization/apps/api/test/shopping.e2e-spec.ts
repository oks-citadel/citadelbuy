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
  TestCategory,
} from './helpers/test-helpers';

describe('Shopping Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUser: TestUser;
  let authToken: string;
  let testCategory: TestCategory;
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

    // Create test category and product
    testCategory = await createTestCategory(prisma);
    testProduct = await createTestProduct(prisma, testCategory.id);
  });

  describe('Browse Products', () => {
    it('should list all products', async () => {
      // Create additional products
      await createTestProduct(prisma, testCategory.id, {
        name: 'Product 2',
        price: 149.99,
      });
      await createTestProduct(prisma, testCategory.id, {
        name: 'Product 3',
        price: 199.99,
      });

      const response = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should get single product by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/${testProduct.id}`)
        .expect(200);

      expect(response.body.id).toBe(testProduct.id);
      expect(response.body.name).toBe(testProduct.name);
      expect(response.body.price).toBe(testProduct.price);
    });

    it('should get products by category', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products?categoryId=${testCategory.id}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].categoryId).toBe(testCategory.id);
    });

    it('should search products by name', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products?search=${testProduct.name}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(
        response.body.data.some((p: any) => p.name.includes(testProduct.name)),
      ).toBe(true);
    });

    it('should filter products by price range', async () => {
      await createTestProduct(prisma, testCategory.id, {
        name: 'Cheap Product',
        price: 10.0,
      });
      await createTestProduct(prisma, testCategory.id, {
        name: 'Expensive Product',
        price: 500.0,
      });

      const response = await request(app.getHttpServer())
        .get('/products?minPrice=50&maxPrice=150')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((product: any) => {
        expect(product.price).toBeGreaterThanOrEqual(50);
        expect(product.price).toBeLessThanOrEqual(150);
      });
    });

    it('should sort products by price ascending', async () => {
      await createTestProduct(prisma, testCategory.id, {
        name: 'Product A',
        price: 50.0,
      });
      await createTestProduct(prisma, testCategory.id, {
        name: 'Product B',
        price: 150.0,
      });

      const response = await request(app.getHttpServer())
        .get('/products?sortBy=price&order=asc')
        .expect(200);

      const prices = response.body.data.map((p: any) => p.price);
      const sortedPrices = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sortedPrices);
    });

    it('should paginate products', async () => {
      // Create 15 products
      for (let i = 0; i < 15; i++) {
        await createTestProduct(prisma, testCategory.id, {
          name: `Product ${i}`,
        });
      }

      const response = await request(app.getHttpServer())
        .get('/products?page=1&limit=10')
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(10);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
    });
  });

  describe('Cart Operations', () => {
    it('should add product to cart', async () => {
      const response = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct.id,
          quantity: 2,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.productId).toBe(testProduct.id);
      expect(response.body.quantity).toBe(2);
    });

    it('should get current user cart', async () => {
      // Add items to cart
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct.id,
          quantity: 1,
        });

      const response = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('total');
    });

    it('should update cart item quantity', async () => {
      // Add item to cart
      const addResponse = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct.id,
          quantity: 1,
        });

      const cartItemId = addResponse.body.id;

      // Update quantity
      const response = await request(app.getHttpServer())
        .patch(`/cart/items/${cartItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 5,
        })
        .expect(200);

      expect(response.body.quantity).toBe(5);
    });

    it('should remove item from cart', async () => {
      // Add item to cart
      const addResponse = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct.id,
          quantity: 1,
        });

      const cartItemId = addResponse.body.id;

      // Remove item
      await request(app.getHttpServer())
        .delete(`/cart/items/${cartItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify item is removed
      const cartResponse = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const itemExists = cartResponse.body.items.some(
        (item: any) => item.id === cartItemId,
      );
      expect(itemExists).toBe(false);
    });

    it('should clear entire cart', async () => {
      // Add multiple items
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct.id,
          quantity: 1,
        });

      const product2 = await createTestProduct(prisma, testCategory.id, {
        name: 'Product 2',
      });

      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: product2.id,
          quantity: 2,
        });

      // Clear cart
      await request(app.getHttpServer())
        .delete('/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify cart is empty
      const cartResponse = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cartResponse.body.items.length).toBe(0);
    });

    it('should prevent adding out-of-stock items', async () => {
      const outOfStockProduct = await createTestProduct(
        prisma,
        testCategory.id,
        {
          name: 'Out of Stock Product',
          stock: 0,
        },
      );

      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: outOfStockProduct.id,
          quantity: 1,
        })
        .expect(400);
    });

    it('should prevent adding quantity exceeding stock', async () => {
      const limitedProduct = await createTestProduct(prisma, testCategory.id, {
        name: 'Limited Stock Product',
        stock: 5,
      });

      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: limitedProduct.id,
          quantity: 10,
        })
        .expect(400);
    });

    it('should calculate cart total correctly', async () => {
      // Add items with known prices
      const product1 = await createTestProduct(prisma, testCategory.id, {
        name: 'Product 1',
        price: 10.0,
      });
      const product2 = await createTestProduct(prisma, testCategory.id, {
        name: 'Product 2',
        price: 20.0,
      });

      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: product1.id,
          quantity: 2,
        });

      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: product2.id,
          quantity: 3,
        });

      const response = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Expected: (10 * 2) + (20 * 3) = 80
      expect(Number(response.body.total)).toBeCloseTo(80, 2);
    });
  });

  describe('Apply Coupon Code', () => {
    beforeEach(async () => {
      // Add product to cart
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct.id,
          quantity: 1,
        });
    });

    it('should apply valid percentage coupon', async () => {
      const coupon = await createTestCoupon(prisma, {
        code: 'SAVE10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
      });

      const response = await request(app.getHttpServer())
        .post('/cart/apply-coupon')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          couponCode: coupon.code,
        })
        .expect(200);

      expect(response.body).toHaveProperty('discount');
      expect(Number(response.body.discount)).toBeGreaterThan(0);
    });

    it('should apply valid fixed amount coupon', async () => {
      const coupon = await createTestCoupon(prisma, {
        code: 'SAVE20',
        discountType: 'FIXED',
        discountValue: 20,
      });

      const response = await request(app.getHttpServer())
        .post('/cart/apply-coupon')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          couponCode: coupon.code,
        })
        .expect(200);

      expect(Number(response.body.discount)).toBe(20);
    });

    it('should reject invalid coupon code', async () => {
      await request(app.getHttpServer())
        .post('/cart/apply-coupon')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          couponCode: 'INVALID123',
        })
        .expect(404);
    });

    it('should reject expired coupon', async () => {
      const expiredCoupon = await prisma.coupon.create({
        data: {
          code: 'EXPIRED',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          minPurchase: 0,
          maxUses: 100,
          currentUses: 0,
          isActive: true,
          startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        },
      });

      await request(app.getHttpServer())
        .post('/cart/apply-coupon')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          couponCode: expiredCoupon.code,
        })
        .expect(400);
    });

    it('should remove applied coupon', async () => {
      const coupon = await createTestCoupon(prisma, {
        code: 'REMOVE10',
      });

      // Apply coupon
      await request(app.getHttpServer())
        .post('/cart/apply-coupon')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          couponCode: coupon.code,
        });

      // Remove coupon
      const response = await request(app.getHttpServer())
        .delete('/cart/remove-coupon')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.discount).toBe(0);
    });
  });

  describe('Wishlist Operations', () => {
    it('should add product to wishlist', async () => {
      const response = await request(app.getHttpServer())
        .post('/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct.id,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.productId).toBe(testProduct.id);
    });

    it('should get user wishlist', async () => {
      // Add product to wishlist
      await request(app.getHttpServer())
        .post('/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct.id,
        });

      const response = await request(app.getHttpServer())
        .get('/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should remove product from wishlist', async () => {
      // Add product to wishlist
      const addResponse = await request(app.getHttpServer())
        .post('/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct.id,
        });

      const wishlistItemId = addResponse.body.id;

      // Remove from wishlist
      await request(app.getHttpServer())
        .delete(`/wishlist/${wishlistItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify removal
      const response = await request(app.getHttpServer())
        .get('/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const itemExists = response.body.some(
        (item: any) => item.id === wishlistItemId,
      );
      expect(itemExists).toBe(false);
    });

    it('should move wishlist item to cart', async () => {
      // Add to wishlist
      await request(app.getHttpServer())
        .post('/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct.id,
        });

      // Move to cart
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct.id,
          quantity: 1,
        })
        .expect(201);

      // Verify in cart
      const cartResponse = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const inCart = cartResponse.body.items.some(
        (item: any) => item.productId === testProduct.id,
      );
      expect(inCart).toBe(true);
    });
  });
});
