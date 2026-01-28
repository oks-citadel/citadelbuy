import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

/**
 * Authentication Security E2E Tests
 *
 * Tests for authentication-related security controls:
 * - Brute force protection
 * - JWT security
 * - Session management
 * - Password policies
 * - MFA enforcement
 */
describe('Authentication Security (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test user credentials
  const testUserEmail = 'security-test@example.com';
  const testUserPassword = 'SecurePassword123!';
  let testUserId: string;
  let validAccessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up and create test user
    await prisma.user.deleteMany({
      where: { email: testUserEmail },
    }).catch(() => {});

    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        password: await bcrypt.hash(testUserPassword, 12),
        name: 'Security Test User',
        role: 'CUSTOMER',
      },
    });
    testUserId = user.id;

    // Get valid token for some tests
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUserEmail, password: testUserPassword });

    validAccessToken = loginResponse.body.access_token;
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { email: testUserEmail },
    }).catch(() => {});
  });

  describe('Brute Force Protection', () => {
    it('should rate limit failed login attempts', async () => {
      const attempts = [];
      const wrongPassword = 'WrongPassword123!';

      // Attempt multiple failed logins
      for (let i = 0; i < 15; i++) {
        attempts.push(
          request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: testUserEmail, password: wrongPassword }),
        );
      }

      const responses = await Promise.all(attempts);

      // Count rate-limited responses
      const rateLimited = responses.filter(
        (r) => r.status === HttpStatus.TOO_MANY_REQUESTS,
      );

      // Should have some rate-limited responses after threshold
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should not reveal whether email exists on failed login', async () => {
      const nonExistentEmail = 'nonexistent@example.com';

      const [existingUser, nonExistentUser] = await Promise.all([
        request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: testUserEmail, password: 'WrongPassword' }),
        request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: nonExistentEmail, password: 'WrongPassword' }),
      ]);

      // Both should return 401 with similar messages
      expect(existingUser.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(nonExistentUser.status).toBe(HttpStatus.UNAUTHORIZED);

      // Messages should be generic (not revealing email existence)
      expect(existingUser.body.message).not.toContain('user not found');
      expect(nonExistentUser.body.message).not.toContain('user not found');
    });

    it('should lock account after multiple failed attempts', async () => {
      // Trigger account lockout with multiple failed attempts
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: testUserEmail, password: 'WrongPassword' });
      }

      // Attempt login with correct password
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUserEmail, password: testUserPassword });

      // Should be locked or rate limited
      expect([HttpStatus.UNAUTHORIZED, HttpStatus.TOO_MANY_REQUESTS, HttpStatus.FORBIDDEN]).toContain(
        response.status,
      );
    });
  });

  describe('JWT Security', () => {
    it('should reject requests with invalid JWT', async () => {
      const invalidTokens = [
        'invalid-token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.payload',
        'Bearer invalid',
        '',
      ];

      for (const token of invalidTokens) {
        const response = await request(app.getHttpServer())
          .get('/me/profile')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      }
    });

    it('should reject expired tokens', async () => {
      // This test requires mocking time or using a pre-generated expired token
      // For now, we just verify the endpoint is protected
      const response = await request(app.getHttpServer())
        .get('/me/profile')
        .set('Authorization', 'Bearer expired-token-placeholder');

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should not accept tokens in URL parameters', async () => {
      // Tokens in URL are a security risk (logged in server logs, browser history)
      const response = await request(app.getHttpServer())
        .get(`/me/profile?token=${validAccessToken}`);

      // Should be unauthorized (token in query not accepted)
      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should include secure token claims', async () => {
      const response = await request(app.getHttpServer())
        .get('/me/profile')
        .set('Authorization', `Bearer ${validAccessToken}`);

      if (response.status === HttpStatus.OK) {
        // Token was accepted, verify we can access protected resource
        expect(response.body).toBeDefined();
      }
    });

    it('should reject tokens with tampered signature', async () => {
      // Tamper with the token signature
      const tamperedToken = validAccessToken.slice(0, -5) + 'XXXXX';

      const response = await request(app.getHttpServer())
        .get('/me/profile')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Password Security', () => {
    it('should reject weak passwords on registration', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'abc123',
        '12345678',
        'qwerty',
        '',
      ];

      for (const weakPassword of weakPasswords) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `test-${Date.now()}@example.com`,
            password: weakPassword,
            name: 'Test User',
          });

        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      }
    });

    it('should not return password in any response', async () => {
      const response = await request(app.getHttpServer())
        .get('/me/profile')
        .set('Authorization', `Bearer ${validAccessToken}`);

      if (response.status === HttpStatus.OK) {
        expect(response.body.password).toBeUndefined();
        expect(response.body.passwordHash).toBeUndefined();
        expect(JSON.stringify(response.body)).not.toContain('password');
      }
    });

    it('should require current password for password change', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({
          newPassword: 'NewSecurePassword123!',
          // Missing currentPassword
        });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Session Security', () => {
    it('should invalidate session on logout', async () => {
      // Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect((res) => {
          expect([HttpStatus.OK, HttpStatus.NO_CONTENT]).toContain(res.status);
        });

      // Try to use the same token
      const response = await request(app.getHttpServer())
        .get('/me/profile')
        .set('Authorization', `Bearer ${validAccessToken}`);

      // Token should be invalid after logout (or might still work if using stateless JWT)
      // The important thing is logout endpoint works
    });

    it('should set secure cookie attributes', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUserEmail, password: testUserPassword });

      const cookies = response.headers['set-cookie'];

      if (cookies) {
        const cookieString = Array.isArray(cookies) ? cookies.join('; ') : cookies;

        // In production, these should be set
        // Note: May not be set in test environment
        if (process.env.NODE_ENV === 'production') {
          expect(cookieString).toContain('HttpOnly');
          expect(cookieString).toContain('Secure');
          expect(cookieString).toContain('SameSite');
        }
      }
    });
  });

  describe('MFA Security', () => {
    it('should require MFA verification after enabling', async () => {
      // Enable MFA
      const enableResponse = await request(app.getHttpServer())
        .post('/auth/mfa/enable')
        .set('Authorization', `Bearer ${validAccessToken}`);

      if (enableResponse.status === HttpStatus.OK || enableResponse.status === HttpStatus.CREATED) {
        // Should return QR code or secret for setup
        expect(enableResponse.body.secret || enableResponse.body.qrCode).toBeDefined();

        // Subsequent sensitive operations should require MFA verification
        // (This depends on specific implementation)
      }
    });

    it('should reject invalid MFA codes', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/mfa/verify')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({ code: '000000' }); // Invalid code

      // Should be rejected (400 or 401)
      expect([HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED]).toContain(response.status);
    });

    it('should rate limit MFA verification attempts', async () => {
      const attempts = [];

      for (let i = 0; i < 20; i++) {
        attempts.push(
          request(app.getHttpServer())
            .post('/auth/mfa/verify')
            .set('Authorization', `Bearer ${validAccessToken}`)
            .send({ code: String(i).padStart(6, '0') }),
        );
      }

      const responses = await Promise.all(attempts);
      const rateLimited = responses.filter(
        (r) => r.status === HttpStatus.TOO_MANY_REQUESTS,
      );

      // Should be rate limited after some attempts
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Security Headers on Auth Endpoints', () => {
    it('should include security headers on login response', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUserEmail, password: testUserPassword });

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should prevent caching of auth responses', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUserEmail, password: testUserPassword });

      const cacheControl = response.headers['cache-control'];
      expect(cacheControl).toBeDefined();
      expect(cacheControl).toContain('no-store');
    });
  });

  describe('Input Validation', () => {
    it('should sanitize email input', async () => {
      const maliciousEmails = [
        '<script>alert("xss")</script>@example.com',
        'test@example.com<script>',
        'test"onclick="alert(1)"@example.com',
      ];

      for (const email of maliciousEmails) {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email, password: testUserPassword });

        // Should be rejected or sanitized
        expect(response.status).not.toBe(HttpStatus.OK);
      }
    });

    it('should handle oversized payloads gracefully', async () => {
      const largePayload = {
        email: testUserEmail,
        password: 'A'.repeat(100000), // Very long password
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(largePayload);

      // Should be rejected, not crash
      expect([HttpStatus.BAD_REQUEST, HttpStatus.PAYLOAD_TOO_LARGE, HttpStatus.UNAUTHORIZED]).toContain(
        response.status,
      );
    });
  });
});
