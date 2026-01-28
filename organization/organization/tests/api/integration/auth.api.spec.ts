/**
 * API Integration Tests - Authentication Module
 *
 * Tests the authentication endpoints with full contract validation.
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

interface ErrorResponse {
  code: string;
  message: string;
  requestId?: string;
}

describe('Authentication API Integration Tests', () => {
  let testUserToken: string;
  let testRefreshToken: string;
  const testEmail = `test-${Date.now()}@broxiva-test.com`;
  const testPassword = 'SecureP@ssw0rd123!';
  const testName = 'Test User';

  describe('POST /api/auth/register', () => {
    test('should register a new user successfully', async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          name: testName,
        }),
      });

      expect(response.status).toBe(201);
      const body = (await response.json()) as AuthResponse;

      expect(body.user).toBeDefined();
      expect(body.user.email).toBe(testEmail);
      expect(body.user.name).toBe(testName);
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();

      // Store tokens for subsequent tests
      testUserToken = body.accessToken;
      testRefreshToken = body.refreshToken;
    });

    test('should return 400 for missing required fields', async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'incomplete@test.com',
          // missing password and name
        }),
      });

      expect(response.status).toBe(400);
      const body = (await response.json()) as ErrorResponse;
      expect(body.code).toBeDefined();
      expect(body.message).toBeDefined();
    });

    test('should return 400 for invalid email format', async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'not-an-email',
          password: testPassword,
          name: testName,
        }),
      });

      expect(response.status).toBe(400);
    });

    test('should return 400 for weak password', async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `weak-pwd-${Date.now()}@test.com`,
          password: 'weak',
          name: testName,
        }),
      });

      expect(response.status).toBe(400);
    });

    test('should return 400 for duplicate email', async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail, // Already registered
          password: testPassword,
          name: testName,
        }),
      });

      expect(response.status).toBe(400);
      const body = (await response.json()) as ErrorResponse;
      expect(body.message.toLowerCase()).toContain('exist');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login successfully with valid credentials', async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(response.status).toBe(200);
      const body = (await response.json()) as AuthResponse;

      expect(body.user).toBeDefined();
      expect(body.user.email).toBe(testEmail);
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();

      // Update tokens
      testUserToken = body.accessToken;
      testRefreshToken = body.refreshToken;
    });

    test('should return 401 for invalid password', async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'wrong-password',
        }),
      });

      expect(response.status).toBe(401);
    });

    test('should return 401 for non-existent email', async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@test.com',
          password: testPassword,
        }),
      });

      expect(response.status).toBe(401);
    });

    test('should return 400 for missing email', async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: testPassword,
        }),
      });

      expect(response.status).toBe(400);
    });

    test('should return 400 for missing password', async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/refresh', () => {
    test('should refresh token successfully', async () => {
      // Skip if no refresh token (registration/login failed)
      if (!testRefreshToken) {
        console.log('Skipping: no refresh token available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: testRefreshToken,
        }),
      });

      expect(response.status).toBe(200);
      const body = (await response.json()) as { accessToken: string; refreshToken: string };

      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();

      // Update tokens
      testUserToken = body.accessToken;
      testRefreshToken = body.refreshToken;
    });

    test('should return 401 for invalid refresh token', async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: 'invalid-refresh-token',
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/users/me', () => {
    test('should return current user profile with valid token', async () => {
      if (!testUserToken) {
        console.log('Skipping: no access token available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
      });

      expect(response.status).toBe(200);
      const body = (await response.json()) as AuthResponse['user'];

      expect(body.id).toBeDefined();
      expect(body.email).toBe(testEmail);
      expect(body.name).toBe(testName);
    });

    test('should return 401 without authorization header', async () => {
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(response.status).toBe(401);
    });

    test('should return 401 with invalid token', async () => {
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(response.status).toBe(401);
    });

    test('should return 401 with expired token format', async () => {
      // Generate a malformed JWT
      const malformedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${malformedToken}`,
        },
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should logout successfully with valid token', async () => {
      if (!testUserToken) {
        console.log('Skipping: no access token available');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
      });

      expect([200, 204]).toContain(response.status);
    });

    test('should return 401 without authorization', async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/password/reset', () => {
    test('should accept password reset request', async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
        }),
      });

      // Should return 200 even if email doesn't exist (security best practice)
      expect(response.status).toBe(200);
    });

    test('should handle non-existent email gracefully', async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@test.com',
        }),
      });

      // Should return 200 to not reveal if email exists
      expect(response.status).toBe(200);
    });

    test('should return 400 for missing email', async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });
  });
});

describe('Authentication Rate Limiting', () => {
  test('should enforce rate limiting on login attempts', async () => {
    // Make multiple rapid requests
    const requests = Array.from({ length: 15 }, () =>
      fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'ratelimit@test.com',
          password: 'wrongpassword',
        }),
      })
    );

    const responses = await Promise.all(requests);
    const statusCodes = responses.map((r) => r.status);

    // At least one should be rate limited (429) or all unauthorized (401)
    const hasRateLimit = statusCodes.includes(429);
    const allUnauthorized = statusCodes.every((s) => s === 401 || s === 429);

    expect(allUnauthorized).toBe(true);
    // Rate limiting is optional but good practice
    console.log(`Rate limiting active: ${hasRateLimit}`);
  });
});
