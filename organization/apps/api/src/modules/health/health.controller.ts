import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '@/common/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private prisma: PrismaService,
  ) {}

  /**
   * Basic health check
   * Returns 200 if service is running
   */
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Check if database is responsive
      () => this.prismaHealth.pingCheck('database', this.prisma),

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
   */
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      // Check database connection
      () => this.prismaHealth.pingCheck('database', this.prisma),

      // Check memory usage
      () => this.memory.checkHeap('memory_heap', 400 * 1024 * 1024),
    ]);
  }
}
