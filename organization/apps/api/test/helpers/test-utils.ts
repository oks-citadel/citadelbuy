import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';

/**
 * Create a testing module with common mocks
 */
export async function createTestingModule(metadata: any): Promise<TestingModule> {
  return Test.createTestingModule(metadata)
    .overrideProvider(PrismaService)
    .useValue(createMockPrismaService())
    .overrideProvider(RedisService)
    .useValue(createMockRedisService())
    .overrideProvider(ConfigService)
    .useValue(createMockConfigService())
    .compile();
}

/**
 * Mock Prisma Service with all common models
 */
export function createMockPrismaService(): any {
  const mockModel = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
    upsert: jest.fn(),
  };

  return {
    user: { ...mockModel },
    product: { ...mockModel },
    order: { ...mockModel },
    orderItem: { ...mockModel },
    category: { ...mockModel },
    cart: { ...mockModel },
    cartItem: { ...mockModel },
    coupon: { ...mockModel },
    review: { ...mockModel },
    wishlist: { ...mockModel },
    wishlistItem: { ...mockModel },
    organization: { ...mockModel },
    organizationMember: { ...mockModel },
    organizationRole: { ...mockModel },
    organizationInvitation: { ...mockModel },
    $transaction: jest.fn((callback) => {
      if (typeof callback === 'function') {
        return callback(createMockPrismaService());
      }
      return Promise.all(callback);
    }),
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $executeRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
  };
}

/**
 * Mock Redis Service
 */
export function createMockRedisService(): any {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    delMany: jest.fn().mockResolvedValue(1),
    delPattern: jest.fn().mockResolvedValue(0),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(-1),
    incr: jest.fn().mockResolvedValue(1),
    incrBy: jest.fn().mockResolvedValue(1),
    decr: jest.fn().mockResolvedValue(0),
    decrBy: jest.fn().mockResolvedValue(0),
    keys: jest.fn().mockResolvedValue([]),
    flushAll: jest.fn().mockResolvedValue('OK'),
    isRedisConnected: jest.fn().mockReturnValue(true),
    getStats: jest.fn().mockResolvedValue({
      connected: true,
      keys: 0,
      memory: '0',
      uptime: 0,
    }),
    hGet: jest.fn().mockResolvedValue(null),
    hSet: jest.fn().mockResolvedValue(1),
    hGetAll: jest.fn().mockResolvedValue({}),
    hDel: jest.fn().mockResolvedValue(1),
    sAdd: jest.fn().mockResolvedValue(1),
    sMembers: jest.fn().mockResolvedValue([]),
    sRem: jest.fn().mockResolvedValue(1),
    zAdd: jest.fn().mockResolvedValue(1),
    zRange: jest.fn().mockResolvedValue([]),
    zRem: jest.fn().mockResolvedValue(1),
  };
}

/**
 * Mock Config Service
 */
export function createMockConfigService() {
  return {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'test-jwt-secret-key-for-testing-only-do-not-use-in-production',
        JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-key-for-testing-only',
        JWT_EXPIRATION: '1h',
        JWT_REFRESH_EXPIRATION: '7d',
        NODE_ENV: 'test',
        PORT: 3000,
        API_URL: 'http://localhost:3000',
        FRONTEND_URL: 'http://localhost:3001',
        EMAIL_HOST: 'smtp.mailtrap.io',
        EMAIL_PORT: 587,
        EMAIL_USER: 'test',
        EMAIL_PASSWORD: 'test',
        EMAIL_FROM: 'test@citadelbuy.com',
        STRIPE_SECRET_KEY: 'sk_test_mock',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_mock',
        PAYPAL_CLIENT_ID: 'test_client_id',
        PAYPAL_CLIENT_SECRET: 'test_client_secret',
        AWS_ACCESS_KEY_ID: 'test_access_key',
        AWS_SECRET_ACCESS_KEY: 'test_secret_key',
        AWS_REGION: 'us-east-1',
        AWS_S3_BUCKET: 'test-bucket',
        ELASTICSEARCH_NODE: 'http://localhost:9200',
        SEARCH_PROVIDER: 'internal',
        THROTTLE_LIMIT: '1000000',
      };
      return config[key] ?? defaultValue;
    }),
    getOrThrow: jest.fn((key: string) => {
      const value = createMockConfigService().get(key);
      if (value === undefined) {
        throw new Error(`Configuration key "${key}" is not defined`);
      }
      return value;
    }),
  };
}

/**
 * Create mock request object
 */
export function createMockRequest(overrides: any = {}) {
  return {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'CUSTOMER',
      name: 'Test User',
    },
    headers: {},
    query: {},
    params: {},
    body: {},
    method: 'GET',
    url: '/test',
    ip: '127.0.0.1',
    get: jest.fn((header: string) => {
      return overrides.headers?.[header.toLowerCase()];
    }),
    ...overrides,
  };
}

/**
 * Create mock response object
 */
export function createMockResponse() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    type: jest.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Wait for async operations
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create mock execution context
 */
export function createMockExecutionContext(request: any = {}) {
  return {
    switchToHttp: () => ({
      getRequest: () => createMockRequest(request),
      getResponse: () => createMockResponse(),
      getNext: () => jest.fn(),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
    getArgs: () => [],
    getArgByIndex: () => ({}),
    switchToRpc: () => ({
      getData: () => ({}),
      getContext: () => ({}),
    }),
    switchToWs: () => ({
      getData: () => ({}),
      getClient: () => ({}),
    }),
    getType: () => 'http',
  } as any;
}

/**
 * Create mock call handler
 */
export function createMockCallHandler(result: any = {}) {
  return {
    handle: () => ({
      pipe: jest.fn().mockReturnValue(result),
      toPromise: jest.fn().mockResolvedValue(result),
    }),
  } as any;
}

/**
 * Database Helper - Clean up all test data
 */
export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  // Delete in reverse order of dependencies
  const tables = [
    'orderItem',
    'order',
    'cartItem',
    'cart',
    'couponUsage',
    'coupon',
    'review',
    'wishlistItem',
    'wishlist',
    'product',
    'category',
    'organizationMember',
    'organizationInvitation',
    'organizationRole',
    'organization',
    'user',
  ];

  for (const table of tables) {
    try {
      await (prisma as any)[table]?.deleteMany();
    } catch (error) {
      // Ignore errors for tables that don't exist
      console.warn(`Failed to clean ${table}:`, error.message);
    }
  }
}

/**
 * Authentication Helper - Generate JWT token for testing
 */
export function generateTestToken(
  payload: { userId: string; email: string; role?: string },
  secret: string = 'test-jwt-secret-key-for-testing-only-do-not-use-in-production',
  expiresIn: string = '1h',
): string {
  const jwtService = new JwtService({ secret });
  return jwtService.sign(
    {
      sub: payload.userId,
      email: payload.email,
      role: payload.role || 'CUSTOMER',
    },
    { expiresIn },
  );
}

/**
 * Authentication Helper - Create authenticated request
 */
export async function createAuthenticatedRequest(
  app: INestApplication,
  email: string,
  password: string,
): Promise<{ token: string; user: any }> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    token: response.body.access_token,
    user: response.body.user,
  };
}

/**
 * Request Helper - Make authenticated request
 */
export function makeAuthenticatedRequest(
  app: INestApplication,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  token: string,
) {
  return request(app.getHttpServer())
    [method](path)
    .set('Authorization', `Bearer ${token}`);
}

/**
 * Assertion Helper - Check if object has required fields
 */
export function expectToHaveFields(obj: any, fields: string[]): void {
  fields.forEach((field) => {
    expect(obj).toHaveProperty(field);
  });
}

/**
 * Assertion Helper - Check if object does not have forbidden fields
 */
export function expectNotToHaveFields(obj: any, fields: string[]): void {
  fields.forEach((field) => {
    expect(obj).not.toHaveProperty(field);
  });
}

/**
 * Assertion Helper - Check if response is paginated
 */
export function expectPaginatedResponse(response: any): void {
  expect(response).toHaveProperty('data');
  expect(response).toHaveProperty('meta');
  expect(response.meta).toHaveProperty('total');
  expect(response.meta).toHaveProperty('page');
  expect(response.meta).toHaveProperty('pageSize');
  expect(Array.isArray(response.data)).toBe(true);
}

/**
 * Assertion Helper - Check if date is recent (within last N seconds)
 */
export function expectRecentDate(date: string | Date, withinSeconds: number = 10): void {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = Math.abs(now.getTime() - dateObj.getTime()) / 1000;
  expect(diff).toBeLessThan(withinSeconds);
}

/**
 * Assertion Helper - Check if array contains object with matching properties
 */
export function expectArrayToContainObject(arr: any[], matchProps: any): void {
  const found = arr.some((item) =>
    Object.keys(matchProps).every((key) => item[key] === matchProps[key]),
  );
  expect(found).toBe(true);
}

/**
 * Mock Email Service
 */
export function createMockEmailService() {
  return {
    sendEmail: jest.fn().mockResolvedValue(true),
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    sendOrderConfirmationEmail: jest.fn().mockResolvedValue(true),
    sendShippingUpdateEmail: jest.fn().mockResolvedValue(true),
    sendCartAbandonmentEmail: jest.fn().mockResolvedValue(true),
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
  };
}

/**
 * Mock Payment Service (Stripe)
 */
export function createMockStripeService() {
  return {
    createPaymentIntent: jest.fn().mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret',
      status: 'requires_payment_method',
    }),
    confirmPaymentIntent: jest.fn().mockResolvedValue({
      id: 'pi_test_123',
      status: 'succeeded',
    }),
    createRefund: jest.fn().mockResolvedValue({
      id: 'ref_test_123',
      status: 'succeeded',
    }),
    createCustomer: jest.fn().mockResolvedValue({
      id: 'cus_test_123',
    }),
  };
}

/**
 * Mock Storage Service (S3)
 */
export function createMockStorageService() {
  return {
    uploadFile: jest.fn().mockResolvedValue({
      url: 'https://s3.amazonaws.com/test-bucket/test-file.jpg',
      key: 'test-file.jpg',
    }),
    deleteFile: jest.fn().mockResolvedValue(true),
    getSignedUrl: jest.fn().mockResolvedValue('https://s3.amazonaws.com/test-bucket/test-file.jpg?signature=test'),
  };
}

/**
 * Mock Search Service (Elasticsearch)
 */
export function createMockSearchService() {
  return {
    indexProduct: jest.fn().mockResolvedValue(true),
    searchProducts: jest.fn().mockResolvedValue({
      hits: [],
      total: 0,
    }),
    deleteProduct: jest.fn().mockResolvedValue(true),
    bulkIndex: jest.fn().mockResolvedValue(true),
  };
}

/**
 * Test Data Generator - Random string
 */
export function randomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, length + 2);
}

/**
 * Test Data Generator - Random email
 */
export function randomEmail(): string {
  return `test-${randomString(8)}@example.com`;
}

/**
 * Test Data Generator - Random number
 */
export function randomNumber(min: number = 0, max: number = 100): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Test Data Generator - Random boolean
 */
export function randomBoolean(): boolean {
  return Math.random() >= 0.5;
}

/**
 * Test Data Generator - Random date
 */
export function randomDate(start: Date = new Date(2020, 0, 1), end: Date = new Date()): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Hash password for testing
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare password for testing
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Setup E2E test application with common configuration
 */
export async function setupE2ETestApp(moduleFixture: TestingModule): Promise<INestApplication> {
  const app = moduleFixture.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.init();
  return app;
}

/**
 * Cleanup E2E test application
 */
export async function cleanupE2ETestApp(app: INestApplication, prisma?: PrismaService): Promise<void> {
  if (prisma) {
    await cleanDatabase(prisma);
  }
  await app.close();
}
