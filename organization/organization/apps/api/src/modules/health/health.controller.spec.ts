import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  HealthCheckService,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HttpHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;

  const mockHealthCheckService = {
    check: jest.fn(),
  };

  const mockPrismaHealthIndicator = {
    pingCheck: jest.fn(),
  };

  const mockMemoryHealthIndicator = {
    checkHeap: jest.fn(),
    checkRSS: jest.fn(),
  };

  const mockDiskHealthIndicator = {
    checkStorage: jest.fn(),
  };

  const mockHttpHealthIndicator = {
    pingCheck: jest.fn(),
  };

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  const mockRedisService = {
    isRedisConnected: jest.fn().mockReturnValue(true),
    set: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockResolvedValue('test'),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        NODE_ENV: 'test',
        STRIPE_SECRET_KEY: 'sk_test_xxx',
        PAYPAL_CLIENT_ID: 'paypal_test_xxx',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: PrismaHealthIndicator,
          useValue: mockPrismaHealthIndicator,
        },
        {
          provide: MemoryHealthIndicator,
          useValue: mockMemoryHealthIndicator,
        },
        {
          provide: DiskHealthIndicator,
          useValue: mockDiskHealthIndicator,
        },
        {
          provide: HttpHealthIndicator,
          useValue: mockHttpHealthIndicator,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('ping', () => {
    it('should return ok status with timestamp', () => {
      const result = controller.ping();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('albHealthCheck', () => {
    it('should return 200 with empty body', () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      controller.albHealthCheck(mockRes as any);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalled();
    });
  });

  describe('check', () => {
    it('should perform full health check', async () => {
      const mockHealthResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          redis: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          disk: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
          redis: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          disk: { status: 'up' },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(mockHealthResult);

      const result = await controller.check();

      expect(result).toEqual(mockHealthResult);
      expect(mockHealthCheckService.check).toHaveBeenCalled();
      expect(mockHealthCheckService.check).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.any(Function),
          expect.any(Function),
          expect.any(Function),
          expect.any(Function),
          expect.any(Function),
        ])
      );
    });

    it('should check database, redis, memory, and disk', async () => {
      mockHealthCheckService.check.mockImplementation(async (checks) => {
        // Execute all health check functions
        for (const check of checks) {
          await check();
        }
        return { status: 'ok' };
      });

      await controller.check();

      expect(mockHealthCheckService.check).toHaveBeenCalled();
    });
  });

  describe('live', () => {
    it('should perform liveness check', async () => {
      const mockLiveResult = {
        status: 'ok',
        info: {
          memory_heap: { status: 'up' },
        },
        error: {},
        details: {
          memory_heap: { status: 'up' },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(mockLiveResult);

      const result = await controller.live();

      expect(result).toEqual(mockLiveResult);
      expect(mockHealthCheckService.check).toHaveBeenCalled();
      expect(mockHealthCheckService.check).toHaveBeenCalledWith([expect.any(Function)]);
    });

    it('should only check memory heap for liveness', async () => {
      mockHealthCheckService.check.mockImplementation(async (checks) => {
        expect(checks).toHaveLength(1);
        return { status: 'ok' };
      });

      await controller.live();

      expect(mockHealthCheckService.check).toHaveBeenCalled();
    });
  });

  describe('ready', () => {
    it('should perform readiness check', async () => {
      const mockReadyResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          redis: { status: 'up' },
          memory_heap: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
          redis: { status: 'up' },
          memory_heap: { status: 'up' },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(mockReadyResult);

      const result = await controller.ready();

      expect(result).toEqual(mockReadyResult);
      expect(mockHealthCheckService.check).toHaveBeenCalled();
      expect(mockHealthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should check database, redis, and memory for readiness', async () => {
      mockHealthCheckService.check.mockImplementation(async (checks) => {
        expect(checks).toHaveLength(3);
        return { status: 'ok' };
      });

      await controller.ready();

      expect(mockHealthCheckService.check).toHaveBeenCalled();
    });
  });

  describe('getVersion', () => {
    it('should return version information', () => {
      const result = controller.getVersion();

      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('build');
      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('node');
      expect(result).toHaveProperty('timestamp');
      expect(result.environment).toBe('test');
    });
  });

  describe('getDetailedHealth', () => {
    it('should return detailed health information when all services are up', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      mockRedisService.isRedisConnected.mockReturnValue(true);
      mockRedisService.set.mockResolvedValue(true);
      mockRedisService.get.mockImplementation((key: string) => {
        if (key === 'health:check') {
          return Promise.resolve(new Date().toISOString());
        }
        return Promise.resolve(null);
      });

      const result = await controller.getDetailedHealth();

      expect(result.status).toBeDefined();
      expect(result.checks).toBeDefined();
      expect(result.checks.database).toBeDefined();
      expect(result.checks.redis).toBeDefined();
      expect(result.checks.memory).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should return unhealthy status when database is down', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Connection failed'));
      mockRedisService.isRedisConnected.mockReturnValue(true);

      const result = await controller.getDetailedHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('down');
    });

    it('should return unhealthy status when redis is down', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      mockRedisService.isRedisConnected.mockReturnValue(false);

      const result = await controller.getDetailedHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.redis.status).toBe('down');
    });
  });

  describe('checkExternalServices', () => {
    beforeEach(() => {
      // Mock global fetch
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return healthy when external services are reachable', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
      });

      const result = await controller.checkExternalServices();

      expect(result.status).toBe('healthy');
      expect(result.services).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should return unhealthy when external services are down', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await controller.checkExternalServices();

      expect(result.status).toBe('unhealthy');
    });

    it('should handle timeout for external services', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ status: 200 }), 10000))
      );

      const result = await controller.checkExternalServices();

      // Should timeout after 5 seconds
      expect(result.services).toBeDefined();
      Object.values(result.services).forEach((service) => {
        if (service.status === 'down') {
          expect(service.message).toContain('Timeout');
        }
      });
    }, 10000);
  });

  describe('deepHealthCheck', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({ status: 200 });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should combine internal and external health checks', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      mockRedisService.isRedisConnected.mockReturnValue(true);

      const result = await controller.deepHealthCheck();

      expect(result.status).toBeDefined();
      expect(result.internal).toBeDefined();
      expect(result.external).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.environment).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should return unhealthy if any check fails', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('DB down'));
      mockRedisService.isRedisConnected.mockReturnValue(false);

      const result = await controller.deepHealthCheck();

      expect(result.status).toBe('unhealthy');
    });
  });
});
