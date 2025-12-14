import { NextResponse } from 'next/server';

/**
 * GET /api/health
 *
 * Health check endpoint for Kubernetes probes and load balancers.
 * Returns the health status of the application.
 */
export async function GET() {
  const startTime = Date.now();

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || 'unknown',
    commit: process.env.GIT_SHA?.slice(0, 7) || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    checks: {
      server: 'ok',
      memory: 'ok',
    },
  };

  // Memory check
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

  if (heapUsedMB / heapTotalMB > 0.9) {
    health.checks.memory = 'warning';
    health.status = 'degraded';
  }

  const responseTime = Date.now() - startTime;

  return NextResponse.json(
    {
      ...health,
      responseTime: `${responseTime}ms`,
      memory: {
        heapUsed: `${heapUsedMB}MB`,
        heapTotal: `${heapTotalMB}MB`,
      },
    },
    {
      status: health.status === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
        'X-Health-Status': health.status,
        'X-Response-Time': `${responseTime}ms`,
      },
    }
  );
}

/**
 * HEAD /api/health
 *
 * Lightweight health check for Kubernetes liveness probes.
 */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Health-Status': 'ok',
    },
  });
}
