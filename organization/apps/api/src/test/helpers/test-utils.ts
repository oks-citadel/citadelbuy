import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { ConfigService } from '@nestjs/config';

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
 * Mock Prisma Service
 */
export function createMockPrismaService(): any {
  return {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(createMockPrismaService())),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
}

/**
 * Mock Redis Service
 */
export function createMockRedisService(): any {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
    delMany: jest.fn().mockResolvedValue(true),
    delPattern: jest.fn().mockResolvedValue(0),
    exists: jest.fn().mockResolvedValue(false),
    expire: jest.fn().mockResolvedValue(true),
    ttl: jest.fn().mockResolvedValue(-1),
    incr: jest.fn().mockResolvedValue(1),
    incrBy: jest.fn().mockResolvedValue(1),
    decr: jest.fn().mockResolvedValue(0),
    isRedisConnected: jest.fn().mockReturnValue(true),
    getStats: jest.fn().mockResolvedValue({
      connected: true,
      keys: 0,
      memory: '0',
    }),
  };
}

/**
 * Mock Config Service
 */
export function createMockConfigService() {
  return {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        JWT_SECRET: 'test-secret',
        JWT_EXPIRES_IN: '1h',
        NODE_ENV: 'test',
      };
      return config[key] ?? defaultValue;
    }),
  };
}

/**
 * Create mock request object
 */
export function createMockRequest(overrides: any = {}) {
  return {
    user: {
      id: '123',
      email: 'test@example.com',
      role: 'CUSTOMER',
    },
    headers: {},
    query: {},
    params: {},
    body: {},
    method: 'GET',
    url: '/test',
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
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
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
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
    getArgs: () => [],
    getArgByIndex: () => ({}),
    switchToRpc: () => ({}),
    switchToWs: () => ({}),
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
