import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  HealthCheckService,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '@/common/prisma/prisma.service';

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

  const mockPrismaService = {};

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
          provide: PrismaService,
          useValue: mockPrismaService,
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

  describe('check', () => {
    it('should perform full health check', async () => {
      const mockHealthResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          disk: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
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
        ])
      );
    });

    it('should check database, memory, and disk', async () => {
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
          memory_heap: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
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
      ]);
    });

    it('should check database and memory for readiness', async () => {
      mockHealthCheckService.check.mockImplementation(async (checks) => {
        expect(checks).toHaveLength(2);
        return { status: 'ok' };
      });

      await controller.ready();

      expect(mockHealthCheckService.check).toHaveBeenCalled();
    });
  });
});
