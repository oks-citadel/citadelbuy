import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Basic health check
   * Returns 200 if service is running with all dependencies healthy
   */
  @Get()
  @HealthCheck()
  async check() {
    return this.health.check([
      // Check if database is responsive
      () => this.prismaHealth.pingCheck('database', this.prisma),

      // Check if Redis is responsive
      async () => {
        try {
          const isConnected = this.redis.isRedisConnected();
          return {
            redis: {
              status: isConnected ? 'up' : 'down',
            },
          };
        } catch (error) {
          return {
            redis: {
              status: 'down',
              message: error.message,
            },
          };
        }
      },

      // Memory heap should not use more than 300MB
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),

      // Memory RSS should not use more than 500MB
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),

      // Disk storage should have at least 50% free
      () =>
        this.disk.checkStorage('disk', {
          path: process.platform === 'win32' ? 'C:\\' : '/',
          thresholdPercent: 0.5,
        }),
    ]);
  }

  /**
   * Liveness probe
   * Returns 200 if the application is alive
   * Used by orchestrators (Kubernetes, Railway) to detect if app should be restarted
   * Note: This is a lightweight check that doesn't test external dependencies
   */
  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([
      // Basic check - is the service running?
      () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024),
    ]);
  }

  /**
   * Readiness probe
   * Returns 200 if the application is ready to receive traffic
   * Used by orchestrators to know when to start routing traffic
   * Checks critical dependencies: database and cache
   */
  @Get('ready')
  @HealthCheck()
  async ready() {
    return this.health.check([
      // Check database connection
      () => this.prismaHealth.pingCheck('database', this.prisma),

      // Check Redis connection
      async () => {
        try {
          const isConnected = this.redis.isRedisConnected();
          if (!isConnected) {
            throw new Error('Redis is not connected');
          }
          return {
            redis: {
              status: 'up',
            },
          };
        } catch (error) {
          throw new Error(`Redis is not ready: ${error.message}`);
        }
      },

      // Check memory usage
      () => this.memory.checkHeap('memory_heap', 400 * 1024 * 1024),
    ]);
  }

  /**
   * Version information
   * Returns API version, build SHA, and environment
   */
  @Get('version')
  getVersion() {
    return {
      version: process.env.npm_package_version || '2.0.0',
      build: process.env.BUILD_SHA || process.env.GIT_COMMIT_SHA || 'development',
      environment: process.env.NODE_ENV || 'development',
      node: process.version,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Detailed health check with metrics
   * Returns comprehensive health information for monitoring
   */
  @Get('detailed')
  async getDetailedHealth() {
    const checks = {
      database: { status: 'unknown', responseTime: 0 },
      redis: { status: 'unknown', responseTime: 0 },
      memory: { heap: 0, rss: 0, external: 0 },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };

    // Database check
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database.responseTime = Date.now() - start;
      checks.database.status = 'up';
    } catch (error) {
      checks.database.status = 'down';
    }

    // Redis check
    try {
      const start = Date.now();
      const isConnected = this.redis.isRedisConnected();
      // Perform a simple operation to verify Redis is working
      if (isConnected) {
        await this.redis.set('health:check', 'ok', 10);
      }
      checks.redis.responseTime = Date.now() - start;
      checks.redis.status = isConnected ? 'up' : 'down';
    } catch (error) {
      checks.redis.status = 'down';
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    checks.memory = {
      heap: Math.round(memUsage.heapUsed / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    };

    return {
      status: checks.database.status === 'up' && checks.redis.status === 'up' ? 'healthy' : 'unhealthy',
      checks,
    };
  }
}
