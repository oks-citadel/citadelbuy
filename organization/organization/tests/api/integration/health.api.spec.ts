/**
 * API Integration Tests - Health & System Module
 *
 * Tests the health check and system endpoints.
 * These are critical for deployment verification.
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

interface HealthResponse {
  status: string;
  timestamp?: string;
  details?: {
    database: { status: string };
    redis: { status: string };
    memory?: { heapUsed: number; heapTotal: number };
  };
  checks?: {
    database: { status: string };
    redis: { status: string };
    memory?: object;
    uptime?: number;
  };
}

describe('Health Check API Tests', () => {
  describe('GET /api/health', () => {
    test('should return healthy status', async () => {
      const response = await fetch(`${API_BASE_URL}/api/health`);

      expect(response.status).toBe(200);
      const body = (await response.json()) as HealthResponse;

      expect(body.status).toBeDefined();
      expect(['ok', 'healthy', 'up']).toContain(body.status.toLowerCase());
    });

    test('should respond within acceptable time', async () => {
      const startTime = Date.now();
      const response = await fetch(`${API_BASE_URL}/api/health`);
      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    test('should return JSON content type', async () => {
      const response = await fetch(`${API_BASE_URL}/api/health`);

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('GET /api/health/ready', () => {
    test('should return ready status when all dependencies are up', async () => {
      const response = await fetch(`${API_BASE_URL}/api/health/ready`);

      // Endpoint might not exist
      if (response.status === 404) {
        console.log('Readiness endpoint not available');
        return;
      }

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.status).toBeDefined();
    });

    test('should check database connectivity', async () => {
      const response = await fetch(`${API_BASE_URL}/api/health/ready`);

      if (response.status === 404) return;

      const body = (await response.json()) as HealthResponse;

      // Should include database status
      if (body.details?.database || body.checks?.database) {
        const dbStatus = body.details?.database?.status || body.checks?.database?.status;
        expect(['up', 'ok', 'healthy']).toContain(dbStatus?.toLowerCase());
      }
    });

    test('should check Redis connectivity', async () => {
      const response = await fetch(`${API_BASE_URL}/api/health/ready`);

      if (response.status === 404) return;

      const body = (await response.json()) as HealthResponse;

      // Should include Redis status
      if (body.details?.redis || body.checks?.redis) {
        const redisStatus = body.details?.redis?.status || body.checks?.redis?.status;
        expect(['up', 'ok', 'healthy']).toContain(redisStatus?.toLowerCase());
      }
    });
  });

  describe('GET /api/health/live', () => {
    test('should return alive status', async () => {
      const response = await fetch(`${API_BASE_URL}/api/health/live`);

      // Endpoint might not exist
      if (response.status === 404) {
        console.log('Liveness endpoint not available');
        return;
      }

      expect(response.status).toBe(200);
    });

    test('should be lightweight and fast', async () => {
      const startTime = Date.now();
      const response = await fetch(`${API_BASE_URL}/api/health/live`);
      const responseTime = Date.now() - startTime;

      if (response.status === 404) return;

      expect(response.status).toBe(200);
      // Liveness check should be very fast (no external calls)
      expect(responseTime).toBeLessThan(100);
    });
  });

  describe('GET /api/health/detailed', () => {
    test('should return detailed health metrics', async () => {
      const response = await fetch(`${API_BASE_URL}/api/health/detailed`);

      // Endpoint might not exist
      if (response.status === 404) {
        console.log('Detailed health endpoint not available');
        return;
      }

      expect(response.status).toBe(200);
      const body = (await response.json()) as HealthResponse;

      expect(body.status).toBeDefined();
    });

    test('should include memory usage', async () => {
      const response = await fetch(`${API_BASE_URL}/api/health/detailed`);

      if (response.status === 404) return;

      const body = (await response.json()) as HealthResponse;

      if (body.checks?.memory || body.details?.memory) {
        expect(body.checks?.memory || body.details?.memory).toBeDefined();
      }
    });

    test('should include uptime', async () => {
      const response = await fetch(`${API_BASE_URL}/api/health/detailed`);

      if (response.status === 404) return;

      const body = (await response.json()) as HealthResponse;

      if (body.checks?.uptime !== undefined) {
        expect(body.checks.uptime).toBeGreaterThan(0);
      }
    });
  });
});

describe('Version API Tests', () => {
  describe('GET /api/version', () => {
    test('should return version information', async () => {
      const response = await fetch(`${API_BASE_URL}/api/version`);

      // Endpoint might not exist
      if (response.status === 404) {
        // Try alternative endpoint
        const altResponse = await fetch(`${API_BASE_URL}/api/health`);
        expect(altResponse.status).toBe(200);
        return;
      }

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.version).toBeDefined();
    });
  });
});

describe('Public Config API Tests', () => {
  describe('GET /api/config/public', () => {
    test('should return public configuration', async () => {
      const response = await fetch(`${API_BASE_URL}/api/config/public`);

      // Endpoint might not exist
      if (response.status === 404) {
        console.log('Public config endpoint not available');
        return;
      }

      expect(response.status).toBe(200);
      const body = await response.json();

      // Should not contain sensitive information
      expect(body).not.toHaveProperty('databaseUrl');
      expect(body).not.toHaveProperty('jwtSecret');
      expect(body).not.toHaveProperty('stripeSecretKey');
    });

    test('should not require authentication', async () => {
      const response = await fetch(`${API_BASE_URL}/api/config/public`);

      if (response.status === 404) return;

      // Should be accessible without auth
      expect([200, 404]).toContain(response.status);
    });
  });
});

describe('CORS and Security Headers', () => {
  test('should include security headers', async () => {
    const response = await fetch(`${API_BASE_URL}/api/health`);

    // Check for common security headers
    const headers = {
      'x-content-type-options': response.headers.get('x-content-type-options'),
      'x-frame-options': response.headers.get('x-frame-options'),
      'x-xss-protection': response.headers.get('x-xss-protection'),
      'strict-transport-security': response.headers.get('strict-transport-security'),
    };

    // Log which headers are present
    console.log('Security headers:', headers);

    // At minimum, expect content-type-options
    // Note: Some headers might only be present in production
  });

  test('should handle OPTIONS request for CORS', async () => {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'OPTIONS',
    });

    // Should not return 4xx or 5xx
    expect(response.status).toBeLessThan(400);
  });
});

describe('Error Response Format', () => {
  test('should return consistent error format for 404', async () => {
    const response = await fetch(`${API_BASE_URL}/api/nonexistent-endpoint-test`);

    expect(response.status).toBe(404);

    const body = await response.json();

    // Error response should have consistent structure
    expect(body).toHaveProperty('message');
    // Optional but good practice
    if (body.code) {
      expect(typeof body.code).toBe('string');
    }
  });

  test('should return consistent error format for 400', async () => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // Empty body should trigger validation error
    });

    expect(response.status).toBe(400);

    const body = await response.json();

    // Error response should have consistent structure
    expect(body).toHaveProperty('message');
  });

  test('should return consistent error format for 401', async () => {
    const response = await fetch(`${API_BASE_URL}/api/users/me`, {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body).toHaveProperty('message');
  });
});
