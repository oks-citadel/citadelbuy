/**
 * Test Infrastructure Verification
 *
 * This test file verifies that all test helper utilities work correctly.
 * Run this test to ensure the test infrastructure is properly set up.
 */

import {
  createMockPrismaService,
  createMockRedisService,
  createMockConfigService,
  createMockRequest,
  createMockResponse,
  generateTestToken,
  randomString,
  randomEmail,
  randomNumber,
  randomBoolean,
  randomDate,
  expectToHaveFields,
  expectNotToHaveFields,
  expectArrayToContainObject,
} from './test-utils';

import {
  MockEmailService,
  MockPaymentService,
  MockStorageService,
  MockSearchService,
  MockCacheService,
  MockQueueService,
  MockNotificationService,
  MockAnalyticsService,
} from './mocks';

import {
  userFixtures,
  categoryFixtures,
  productFixtures,
  orderFixtures,
  couponFixtures,
  organizationFixtures,
  generateUserFixture,
  generateCategoryFixture,
  generateProductFixture,
  generateCouponFixture,
} from './fixtures';

describe('Test Infrastructure Verification', () => {
  describe('Mock Services', () => {
    it('should create mock Prisma service', () => {
      const mockPrisma = createMockPrismaService();
      expect(mockPrisma).toBeDefined();
      expect(mockPrisma.user).toBeDefined();
      expect(mockPrisma.product).toBeDefined();
      expect(mockPrisma.$transaction).toBeDefined();
    });

    it('should create mock Redis service', () => {
      const mockRedis = createMockRedisService();
      expect(mockRedis).toBeDefined();
      expect(mockRedis.get).toBeDefined();
      expect(mockRedis.set).toBeDefined();
      expect(mockRedis.del).toBeDefined();
    });

    it('should create mock Config service', () => {
      const mockConfig = createMockConfigService();
      expect(mockConfig).toBeDefined();
      expect(mockConfig.get('JWT_SECRET')).toBe('test-jwt-secret-key-for-testing-only-do-not-use-in-production');
      expect(mockConfig.get('NODE_ENV')).toBe('test');
    });
  });

  describe('Mock Request/Response', () => {
    it('should create mock request', () => {
      const req = createMockRequest();
      expect(req).toBeDefined();
      expect(req.user).toBeDefined();
      expect(req.user.email).toBe('test@example.com');
    });

    it('should create mock response', () => {
      const res = createMockResponse();
      expect(res).toBeDefined();
      expect(res.status).toBeDefined();
      expect(res.json).toBeDefined();
      expect(res.send).toBeDefined();
    });
  });

  describe('Authentication Helpers', () => {
    it('should generate test JWT token', () => {
      const token = generateTestToken({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'CUSTOMER',
      });
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('Test Data Generators', () => {
    it('should generate random string', () => {
      const str = randomString(10);
      expect(str).toBeDefined();
      expect(typeof str).toBe('string');
      expect(str.length).toBeGreaterThan(0);
    });

    it('should generate random email', () => {
      const email = randomEmail();
      expect(email).toBeDefined();
      expect(email).toContain('@example.com');
      expect(email).toMatch(/^test-[a-z0-9]+@example\.com$/);
    });

    it('should generate random number in range', () => {
      const num = randomNumber(10, 20);
      expect(num).toBeGreaterThanOrEqual(10);
      expect(num).toBeLessThanOrEqual(20);
    });

    it('should generate random boolean', () => {
      const bool = randomBoolean();
      expect(typeof bool).toBe('boolean');
    });

    it('should generate random date', () => {
      const date = randomDate();
      expect(date).toBeInstanceOf(Date);
    });
  });

  describe('Assertion Helpers', () => {
    it('should check for required fields', () => {
      const obj = { id: '1', name: 'Test', email: 'test@example.com' };
      expect(() => expectToHaveFields(obj, ['id', 'name', 'email'])).not.toThrow();
    });

    it('should check for forbidden fields', () => {
      const obj = { id: '1', name: 'Test' };
      expect(() => expectNotToHaveFields(obj, ['password', 'secret'])).not.toThrow();
    });

    it('should check if array contains object with properties', () => {
      const arr = [
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' },
      ];
      expect(() => expectArrayToContainObject(arr, { id: '2' })).not.toThrow();
    });
  });

  describe('Mock Email Service', () => {
    let emailService: MockEmailService;

    beforeEach(() => {
      emailService = new MockEmailService();
    });

    it('should send email', async () => {
      const result = await emailService.sendEmail('test@example.com', 'Subject', 'Content');
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();

      const sentEmails = emailService.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].to).toBe('test@example.com');
    });

    it('should find email by recipient', async () => {
      await emailService.sendEmail('user1@example.com', 'Subject', 'Content');
      await emailService.sendEmail('user2@example.com', 'Subject', 'Content');

      const email = emailService.findEmailByRecipient('user1@example.com');
      expect(email).toBeDefined();
      expect(email.to).toBe('user1@example.com');
    });
  });

  describe('Mock Payment Service', () => {
    let paymentService: MockPaymentService;

    beforeEach(() => {
      paymentService = new MockPaymentService();
    });

    it('should create payment intent', async () => {
      const intent = await paymentService.createPaymentIntent(1000, 'usd');
      expect(intent).toBeDefined();
      expect(intent.id).toContain('pi_test_');
      expect(intent.amount).toBe(1000);
      expect(intent.status).toBe('requires_payment_method');
    });

    it('should confirm payment intent', async () => {
      const intent = await paymentService.createPaymentIntent(1000, 'usd');
      const confirmed = await paymentService.confirmPaymentIntent(intent.id);
      expect(confirmed.status).toBe('succeeded');
    });

    it('should create customer', async () => {
      const customer = await paymentService.createCustomer('test@example.com', 'Test User');
      expect(customer).toBeDefined();
      expect(customer.id).toContain('cus_test_');
      expect(customer.email).toBe('test@example.com');
    });
  });

  describe('Mock Storage Service', () => {
    let storageService: MockStorageService;

    beforeEach(() => {
      storageService = new MockStorageService();
    });

    it('should upload file', async () => {
      const file = await storageService.uploadFile({ size: 1024 }, 'test.jpg');
      expect(file).toBeDefined();
      expect(file.key).toBe('test.jpg');
      expect(file.url).toContain('test.jpg');
    });

    it('should check if file exists', async () => {
      await storageService.uploadFile({ size: 1024 }, 'test.jpg');
      expect(storageService.fileExists('test.jpg')).toBe(true);
      expect(storageService.fileExists('nonexistent.jpg')).toBe(false);
    });

    it('should delete file', async () => {
      await storageService.uploadFile({ size: 1024 }, 'test.jpg');
      await storageService.deleteFile('test.jpg');
      expect(storageService.fileExists('test.jpg')).toBe(false);
    });
  });

  describe('Mock Search Service', () => {
    let searchService: MockSearchService;

    beforeEach(() => {
      searchService = new MockSearchService();
    });

    it('should index product', async () => {
      const result = await searchService.indexProduct('prod-1', {
        name: 'iPhone',
        price: 999,
      });
      expect(result.success).toBe(true);
      expect(result.id).toBe('prod-1');
    });

    it('should search products', async () => {
      await searchService.indexProduct('prod-1', { name: 'iPhone 15', price: 999 });
      await searchService.indexProduct('prod-2', { name: 'Samsung Galaxy', price: 899 });

      const results = await searchService.searchProducts('iphone');
      expect(results.hits).toHaveLength(1);
      expect(results.hits[0]._source.name).toBe('iPhone 15');
    });
  });

  describe('Mock Cache Service', () => {
    let cacheService: MockCacheService;

    beforeEach(() => {
      cacheService = new MockCacheService();
    });

    it('should set and get value', async () => {
      await cacheService.set('key', 'value');
      const value = await cacheService.get('key');
      expect(value).toBe('value');
    });

    it('should delete value', async () => {
      await cacheService.set('key', 'value');
      await cacheService.del('key');
      const value = await cacheService.get('key');
      expect(value).toBeNull();
    });

    it('should increment counter', async () => {
      await cacheService.set('counter', 5);
      const result = await cacheService.incr('counter');
      expect(result).toBe(6);
    });
  });

  describe('Mock Queue Service', () => {
    let queueService: MockQueueService;

    beforeEach(() => {
      queueService = new MockQueueService();
    });

    it('should add job to queue', async () => {
      const job = await queueService.addJob('emails', { to: 'test@example.com' });
      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.status).toBe('waiting');
    });

    it('should get jobs from queue', async () => {
      await queueService.addJob('emails', { to: 'user1@example.com' });
      await queueService.addJob('emails', { to: 'user2@example.com' });

      const jobs = await queueService.getJobs('emails');
      expect(jobs).toHaveLength(2);
    });
  });

  describe('Fixtures', () => {
    it('should have user fixtures', () => {
      expect(userFixtures.customer).toBeDefined();
      expect(userFixtures.vendor).toBeDefined();
      expect(userFixtures.admin).toBeDefined();
      expect(userFixtures.customer.email).toBe('customer@example.com');
    });

    it('should generate user fixture', () => {
      const user = generateUserFixture({ role: 'VENDOR' });
      expect(user).toBeDefined();
      expect(user.email).toContain('@example.com');
      expect(user.role).toBe('VENDOR');
    });

    it('should have category fixtures', () => {
      expect(categoryFixtures.electronics).toBeDefined();
      expect(categoryFixtures.electronics.name).toBe('Electronics');
    });

    it('should generate category fixture', () => {
      const category = generateCategoryFixture({ isFeatured: true });
      expect(category).toBeDefined();
      expect(category.isFeatured).toBe(true);
    });

    it('should have product fixtures', () => {
      expect(productFixtures.laptop).toBeDefined();
      expect(productFixtures.phone).toBeDefined();
      expect(productFixtures.laptop.name).toBe('MacBook Pro 16"');
    });

    it('should generate product fixture', () => {
      const product = generateProductFixture('category-id', { price: 199.99 });
      expect(product).toBeDefined();
      expect(product.categoryId).toBe('category-id');
      expect(product.price).toBe(199.99);
    });

    it('should have coupon fixtures', () => {
      expect(couponFixtures.percentage).toBeDefined();
      expect(couponFixtures.fixed).toBeDefined();
      expect(couponFixtures.percentage.code).toBe('SAVE10');
    });

    it('should generate coupon fixture', () => {
      const coupon = generateCouponFixture({ discountValue: 15 });
      expect(coupon).toBeDefined();
      expect(coupon.discountValue).toBe(15);
    });

    it('should have organization fixtures', () => {
      expect(organizationFixtures.business).toBeDefined();
      expect(organizationFixtures.enterprise).toBeDefined();
    });

    it('should have order fixtures', () => {
      expect(orderFixtures.pending).toBeDefined();
      expect(orderFixtures.processing).toBeDefined();
      expect(orderFixtures.shipped).toBeDefined();
    });
  });
});
