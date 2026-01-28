import { Controller, Get, HttpCode, HttpStatus, Res, Logger, Req } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HttpHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { RequestWithCorrelation } from '@/common/middleware/correlation-id.middleware';

/**
 * Health status type for external services
 */
interface ServiceHealthStatus {
  status: 'up' | 'down' | 'degraded' | 'unknown';
  responseTime?: number;
  message?: string;
  lastChecked?: string;
}

/**
 * Dependency health status for readiness check
 */
interface DependencyHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
}

/**
 * Liveness check response
 */
interface LivenessResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
}

/**
 * Readiness check response
 */
interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  timestamp: string;
  correlationId?: string;
  dependencies: DependencyHealth[];
}

/**
 * Detailed health check response
 */
interface DetailedHealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version: string;
  environment: string;
  timestamp: string;
  uptime: number;
  correlationId?: string;
  checks: {
    database: ServiceHealthStatus;
    redis: ServiceHealthStatus;
    memory: {
      heap: number;
      rss: number;
      external: number;
      heapLimit: number;
      percentUsed: number;
    };
    disk?: {
      free: number;
      total: number;
      percentUsed: number;
    };
    externalServices?: Record<string, ServiceHealthStatus>;
  };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly stripeApiUrl: string;
  private readonly paypalApiUrl: string;

  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private http: HttpHealthIndicator,
    private prisma: PrismaService,
    private redis: RedisService,
    private configService: ConfigService,
  ) {
    // Configure external service URLs for health checks
    this.stripeApiUrl = 'https://api.stripe.com/v1';
    this.paypalApiUrl = this.configService.get<string>('NODE_ENV') === 'production'
      ? 'https://api.paypal.com/v1'
      : 'https://api.sandbox.paypal.com/v1';
  }

  /**
   * Simple ping endpoint for ALB/Load Balancer health checks
   * Returns 200 OK with minimal response time
   * This endpoint does NOT check dependencies to ensure fast response
   */
  @Get('ping')
  @HttpCode(HttpStatus.OK)
  ping(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * ALB health check endpoint
   * Returns 200 with empty body for minimal response size
   * Used by AWS Application Load Balancer health checks
   */
  @Get('alb')
  @HttpCode(HttpStatus.OK)
  albHealthCheck(@Res() res: Response): void {
    res.status(HttpStatus.OK).send();
  }

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

      // Disk storage should have at least 10% free (containers typically use more)
      () =>
        this.disk.checkStorage('disk', {
          path: process.platform === 'win32' ? 'C:\\' : '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }

  /**
   * Liveness probe - /health/live
   * Returns 200 if the application is alive and running
   * Used by Kubernetes/orchestrators to detect if the app should be restarted
   *
   * This is a lightweight check that does NOT test external dependencies
   * If this fails, the pod/container should be killed and restarted
   */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Returns 200 if the application is alive. Does not check dependencies.',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not healthy and should be restarted',
  })
  async live(@Res({ passthrough: true }) res: Response): Promise<LivenessResponse> {
    try {
      // Check if memory usage is within acceptable limits
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const heapLimitMB = 500; // 500MB limit

      if (heapUsedMB > heapLimitMB) {
        res.status(HttpStatus.SERVICE_UNAVAILABLE);
        return {
          status: 'error',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        };
      }

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    } catch (error) {
      this.logger.error('Liveness check failed', error);
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };
    }
  }

  /**
   * Readiness probe - /health/ready
   * Returns 200 if the application is ready to receive traffic
   * Used by Kubernetes/orchestrators to know when to route traffic
   *
   * Checks all critical dependencies:
   * - Database (PostgreSQL via Prisma)
   * - Cache (Redis)
   *
   * If this fails, no new traffic should be sent to this instance
   */
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Readiness probe',
    description: 'Returns 200 if the application is ready to receive traffic. Checks database and Redis.',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is ready to receive traffic',
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not ready - dependencies are unhealthy',
  })
  async ready(
    @Req() req: RequestWithCorrelation,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReadinessResponse> {
    const correlationId = req.correlationContext?.correlationId;
    const dependencies: DependencyHealth[] = [];
    let isReady = true;

    // Check database
    const dbHealth = await this.checkDatabaseHealth();
    dependencies.push(dbHealth);
    if (dbHealth.status === 'down') {
      isReady = false;
    }

    // Check Redis
    const redisHealth = await this.checkRedisHealth();
    dependencies.push(redisHealth);
    if (redisHealth.status === 'down') {
      isReady = false;
    }

    if (!isReady) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      correlationId,
      dependencies,
    };
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<DependencyHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;
      return {
        name: 'database',
        status: responseTime > 1000 ? 'degraded' : 'up',
        responseTime,
        message: responseTime > 1000 ? 'High latency' : undefined,
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'down',
        responseTime: Date.now() - start,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Check Redis health
   */
  private async checkRedisHealth(): Promise<DependencyHealth> {
    const start = Date.now();
    try {
      const isConnected = this.redis.isRedisConnected();
      if (!isConnected) {
        return {
          name: 'redis',
          status: 'down',
          responseTime: Date.now() - start,
          message: 'Not connected',
        };
      }

      // Verify with a read/write test
      const testKey = `health:ready:${Date.now()}`;
      await this.redis.set(testKey, 'ok', 10);
      const value = await this.redis.get(testKey);
      await this.redis.del(testKey);

      const responseTime = Date.now() - start;
      if (value !== 'ok') {
        return {
          name: 'redis',
          status: 'degraded',
          responseTime,
          message: 'Read/write verification failed',
        };
      }

      return {
        name: 'redis',
        status: responseTime > 500 ? 'degraded' : 'up',
        responseTime,
        message: responseTime > 500 ? 'High latency' : undefined,
      };
    } catch (error) {
      return {
        name: 'redis',
        status: 'down',
        responseTime: Date.now() - start,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
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
  @ApiOperation({
    summary: 'Detailed health check',
    description: 'Returns comprehensive health information including memory, database, and Redis status',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed health information',
  })
  async getDetailedHealth(
    @Req() req: RequestWithCorrelation,
  ): Promise<DetailedHealthResponse> {
    const correlationId = req.correlationContext?.correlationId;
    const timestamp = new Date().toISOString();
    const checks: DetailedHealthResponse['checks'] = {
      database: { status: 'unknown', lastChecked: timestamp },
      redis: { status: 'unknown', lastChecked: timestamp },
      memory: {
        heap: 0,
        rss: 0,
        external: 0,
        heapLimit: 0,
        percentUsed: 0,
      },
    };

    // Database check
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database.responseTime = Date.now() - start;
      checks.database.status = checks.database.responseTime > 1000 ? 'degraded' : 'up';
      if (checks.database.status === 'degraded') {
        checks.database.message = 'Database response time is high';
      }
    } catch (error) {
      checks.database.status = 'down';
      checks.database.message = error instanceof Error ? error.message : 'Database connection failed';
      this.logger.error('Database health check failed', error);
    }

    // Redis check
    try {
      const start = Date.now();
      const isConnected = this.redis.isRedisConnected();
      if (isConnected) {
        await this.redis.set('health:check', timestamp, 10);
        const value = await this.redis.get('health:check');
        if (value !== timestamp) {
          throw new Error('Redis read/write verification failed');
        }
      }
      checks.redis.responseTime = Date.now() - start;
      checks.redis.status = isConnected
        ? (checks.redis.responseTime > 500 ? 'degraded' : 'up')
        : 'down';
      if (checks.redis.status === 'degraded') {
        checks.redis.message = 'Redis response time is high';
      } else if (!isConnected) {
        checks.redis.message = 'Redis is not connected';
      }
    } catch (error) {
      checks.redis.status = 'down';
      checks.redis.message = error instanceof Error ? error.message : 'Redis connection failed';
      this.logger.error('Redis health check failed', error);
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    const v8 = require('v8');
    const heapStats = v8.getHeapStatistics();
    checks.memory = {
      heap: Math.round(memUsage.heapUsed / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      heapLimit: Math.round(heapStats.heap_size_limit / 1024 / 1024),
      percentUsed: Math.round((memUsage.heapUsed / heapStats.heap_size_limit) * 100),
    };

    // Determine overall status
    let status: DetailedHealthResponse['status'] = 'healthy';
    if (checks.database.status === 'down' || checks.redis.status === 'down') {
      status = 'unhealthy';
    } else if (checks.database.status === 'degraded' || checks.redis.status === 'degraded') {
      status = 'degraded';
    } else if (checks.memory.percentUsed > 90) {
      status = 'degraded';
    }

    return {
      status,
      version: process.env.npm_package_version || '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp,
      uptime: process.uptime(),
      correlationId,
      checks,
    };
  }

  /**
   * External services health check
   * Checks connectivity to third-party services (Stripe, PayPal, etc.)
   * Note: This is a heavier check and should not be used for load balancer health checks
   */
  @Get('external')
  @ApiOperation({
    summary: 'External services health check',
    description: 'Checks connectivity to third-party services like Stripe and PayPal',
  })
  async checkExternalServices(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    services: Record<string, ServiceHealthStatus>;
    timestamp: string;
  }> {
    const timestamp = new Date().toISOString();
    const services: Record<string, ServiceHealthStatus> = {};

    // Check Stripe API (if configured)
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      services.stripe = await this.checkExternalService('Stripe', async () => {
        // Simple check - Stripe returns 401 for invalid key but that means API is reachable
        const response = await fetch(this.stripeApiUrl, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${stripeKey}` },
        });
        // 200 or 401 both indicate Stripe is reachable
        return response.status === 200 || response.status === 401;
      });
    }

    // Check PayPal API (if configured)
    const paypalClientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    if (paypalClientId) {
      services.paypal = await this.checkExternalService('PayPal', async () => {
        const response = await fetch(this.paypalApiUrl, {
          method: 'GET',
        });
        // Any response means PayPal is reachable
        return response.status < 500;
      });
    }

    // Determine overall status
    const serviceStatuses = Object.values(services);
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    if (serviceStatuses.some(s => s.status === 'down')) {
      status = 'unhealthy';
    } else if (serviceStatuses.some(s => s.status === 'degraded')) {
      status = 'degraded';
    }

    return {
      status,
      services,
      timestamp,
    };
  }

  /**
   * Helper method to check an external service
   */
  private async checkExternalService(
    serviceName: string,
    checkFn: () => Promise<boolean>,
  ): Promise<ServiceHealthStatus> {
    const start = Date.now();
    try {
      const isHealthy = await Promise.race([
        checkFn(),
        new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        ),
      ]);
      const responseTime = Date.now() - start;
      return {
        status: isHealthy ? (responseTime > 2000 ? 'degraded' : 'up') : 'down',
        responseTime,
        lastChecked: new Date().toISOString(),
        message: responseTime > 2000 ? `High latency: ${responseTime}ms` : undefined,
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - start,
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Deep health check - combines all checks
   * This is a comprehensive check for debugging and monitoring dashboards
   * NOT recommended for load balancer health checks due to response time
   */
  @Get('deep')
  @ApiOperation({
    summary: 'Deep health check',
    description: 'Comprehensive health check including internal and external services',
  })
  async deepHealthCheck(@Req() req: RequestWithCorrelation) {
    const [detailed, external] = await Promise.all([
      this.getDetailedHealth(req),
      this.checkExternalServices(),
    ]);

    // Combine statuses
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (detailed.status === 'unhealthy' || external.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (detailed.status === 'degraded' || external.status === 'degraded') {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      version: detailed.version,
      environment: detailed.environment,
      timestamp: new Date().toISOString(),
      uptime: detailed.uptime,
      internal: {
        status: detailed.status,
        checks: detailed.checks,
      },
      external: {
        status: external.status,
        services: external.services,
      },
    };
  }
}
