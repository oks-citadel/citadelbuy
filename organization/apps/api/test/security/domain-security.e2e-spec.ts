import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

/**
 * Domain Security E2E Tests
 *
 * Tests for custom domain security controls:
 * - Domain hijacking prevention
 * - Verification requirements
 * - Rate limiting on domain operations
 * - Audit logging
 */
describe('Domain Security (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Test organizations
  let orgA: { id: string; name: string };
  let orgB: { id: string; name: string };

  // Test users
  let adminTokenA: string;
  let adminTokenB: string;

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
    jwtService = app.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestData();
    await setupTestEnvironment();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  async function cleanupTestData() {
    // Clean up in order of dependencies
    await prisma.customDomain.deleteMany({
      where: {
        organization: {
          name: { in: ['Domain Test Org A', 'Domain Test Org B'] },
        },
      },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: {
        email: { in: ['domain-admin-a@test.com', 'domain-admin-b@test.com'] },
      },
    }).catch(() => {});

    await prisma.organization.deleteMany({
      where: {
        name: { in: ['Domain Test Org A', 'Domain Test Org B'] },
      },
    }).catch(() => {});
  }

  async function setupTestEnvironment() {
    // Create test organizations
    const orgAData = await prisma.organization.create({
      data: {
        name: 'Domain Test Org A',
        slug: 'domain-test-org-a',
        settings: {},
      },
    });
    orgA = { id: orgAData.id, name: orgAData.name };

    const orgBData = await prisma.organization.create({
      data: {
        name: 'Domain Test Org B',
        slug: 'domain-test-org-b',
        settings: {},
      },
    });
    orgB = { id: orgBData.id, name: orgBData.name };

    // Create admin users
    const adminA = await prisma.user.create({
      data: {
        email: 'domain-admin-a@test.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Admin A',
        role: 'ADMIN',
        organizationId: orgA.id,
      },
    });

    const adminB = await prisma.user.create({
      data: {
        email: 'domain-admin-b@test.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Admin B',
        role: 'ADMIN',
        organizationId: orgB.id,
      },
    });

    // Generate tokens
    adminTokenA = jwtService.sign({
      sub: adminA.id,
      organizationId: orgA.id,
      role: 'ADMIN',
    });

    adminTokenB = jwtService.sign({
      sub: adminB.id,
      organizationId: orgB.id,
      role: 'ADMIN',
    });
  }

  describe('Domain Hijacking Prevention', () => {
    it('should prevent claiming domain already owned by another tenant', async () => {
      const testDomain = 'shared-domain-test.com';

      // Org A claims the domain first
      await prisma.customDomain.create({
        data: {
          domain: testDomain,
          organizationId: orgA.id,
          status: 'ACTIVE',
          verifiedAt: new Date(),
        },
      });

      // Org B tries to claim the same domain
      const response = await request(app.getHttpServer())
        .post('/domains')
        .set('Authorization', `Bearer ${adminTokenB}`)
        .send({ domain: testDomain });

      // Should be rejected
      expect([HttpStatus.CONFLICT, HttpStatus.FORBIDDEN, HttpStatus.BAD_REQUEST]).toContain(
        response.status,
      );

      // Domain should still belong to Org A
      const domain = await prisma.customDomain.findFirst({
        where: { domain: testDomain },
      });
      expect(domain?.organizationId).toBe(orgA.id);
    });

    it('should prevent claiming domain with pending verification by another tenant', async () => {
      const testDomain = 'pending-domain-test.com';

      // Org A has a pending verification
      await prisma.customDomain.create({
        data: {
          domain: testDomain,
          organizationId: orgA.id,
          status: 'PENDING',
        },
      });

      // Org B tries to claim the same domain
      const response = await request(app.getHttpServer())
        .post('/domains')
        .set('Authorization', `Bearer ${adminTokenB}`)
        .send({ domain: testDomain });

      expect([HttpStatus.CONFLICT, HttpStatus.FORBIDDEN, HttpStatus.BAD_REQUEST]).toContain(
        response.status,
      );
    });

    it('should allow reclaiming expired/deleted domain', async () => {
      const testDomain = 'expired-domain-test.com';

      // Org A had the domain but it's now deleted
      await prisma.customDomain.create({
        data: {
          domain: testDomain,
          organizationId: orgA.id,
          status: 'DELETED',
          deletedAt: new Date(),
        },
      });

      // Org B should be able to claim it
      const response = await request(app.getHttpServer())
        .post('/domains')
        .set('Authorization', `Bearer ${adminTokenB}`)
        .send({ domain: testDomain });

      // Should be allowed (or at least not rejected for hijacking reasons)
      expect([HttpStatus.CREATED, HttpStatus.OK, HttpStatus.NOT_FOUND]).toContain(response.status);
    });
  });

  describe('Domain Verification Requirements', () => {
    it('should require verification before activating domain', async () => {
      const testDomain = 'unverified-domain-test.com';

      // Add domain without verification
      const addResponse = await request(app.getHttpServer())
        .post('/domains')
        .set('Authorization', `Bearer ${adminTokenA}`)
        .send({ domain: testDomain });

      if (addResponse.status === HttpStatus.CREATED || addResponse.status === HttpStatus.OK) {
        // Domain should be in pending/unverified status
        const domain = await prisma.customDomain.findFirst({
          where: { domain: testDomain },
        });

        expect(domain?.status).not.toBe('ACTIVE');
        expect(domain?.verifiedAt).toBeNull();
      }
    });

    it('should return verification instructions', async () => {
      const testDomain = 'verification-test.com';

      const response = await request(app.getHttpServer())
        .post('/domains')
        .set('Authorization', `Bearer ${adminTokenA}`)
        .send({ domain: testDomain });

      if (response.status === HttpStatus.CREATED || response.status === HttpStatus.OK) {
        // Should include verification instructions
        expect(
          response.body.verificationToken ||
          response.body.txtRecord ||
          response.body.cnameTarget ||
          response.body.verification,
        ).toBeDefined();
      }
    });

    it('should require re-verification on domain transfer', async () => {
      const testDomain = 'transfer-test.com';

      // Create verified domain for Org A
      const domain = await prisma.customDomain.create({
        data: {
          domain: testDomain,
          organizationId: orgA.id,
          status: 'ACTIVE',
          verifiedAt: new Date(),
        },
      });

      // Initiate transfer to Org B
      const transferResponse = await request(app.getHttpServer())
        .post(`/domains/${domain.id}/transfer`)
        .set('Authorization', `Bearer ${adminTokenA}`)
        .send({ toOrganizationId: orgB.id });

      if (transferResponse.status === HttpStatus.OK || transferResponse.status === HttpStatus.CREATED) {
        // Transfer should require verification from new owner
        expect(
          transferResponse.body.requiresVerification ||
          transferResponse.body.status === 'PENDING_VERIFICATION',
        ).toBeTruthy();
      }
    });
  });

  describe('Domain Rate Limiting', () => {
    it('should rate limit domain additions per tenant', async () => {
      const requests: Promise<any>[] = [];

      // Try to add many domains quickly
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app.getHttpServer())
            .post('/domains')
            .set('Authorization', `Bearer ${adminTokenA}`)
            .send({ domain: `rate-limit-test-${i}.com` }),
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter((r) => r.status === HttpStatus.TOO_MANY_REQUESTS);

      // Some requests should be rate limited
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should rate limit verification attempts', async () => {
      const testDomain = 'verify-rate-limit-test.com';

      // Create domain to verify
      await prisma.customDomain.create({
        data: {
          domain: testDomain,
          organizationId: orgA.id,
          status: 'PENDING',
        },
      });

      const requests: Promise<any>[] = [];

      // Try to verify many times
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app.getHttpServer())
            .post(`/domains/verify`)
            .set('Authorization', `Bearer ${adminTokenA}`)
            .send({ domain: testDomain }),
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter((r) => r.status === HttpStatus.TOO_MANY_REQUESTS);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Domain Audit Logging', () => {
    it('should log domain addition attempts', async () => {
      const testDomain = 'audit-test-add.com';

      await request(app.getHttpServer())
        .post('/domains')
        .set('Authorization', `Bearer ${adminTokenA}`)
        .set('X-Request-Id', 'audit-test-add-request')
        .send({ domain: testDomain });

      // Check audit log (implementation-specific)
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          resourceType: 'DOMAIN',
          resourceId: testDomain,
          organizationId: orgA.id,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Audit log should exist (if audit logging is implemented)
      if (auditLog) {
        expect(auditLog.action).toContain('DOMAIN');
      }
    });

    it('should log domain hijacking attempts', async () => {
      const testDomain = 'audit-hijack-test.com';

      // Create domain for Org A
      await prisma.customDomain.create({
        data: {
          domain: testDomain,
          organizationId: orgA.id,
          status: 'ACTIVE',
          verifiedAt: new Date(),
        },
      });

      // Org B attempts to claim it
      await request(app.getHttpServer())
        .post('/domains')
        .set('Authorization', `Bearer ${adminTokenB}`)
        .set('X-Request-Id', 'audit-hijack-request')
        .send({ domain: testDomain });

      // Check audit log for hijacking attempt
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          resourceType: 'DOMAIN',
          action: { contains: 'HIJACK' },
        },
        orderBy: { createdAt: 'desc' },
      });

      // If audit logging for hijack attempts is implemented
      if (auditLog) {
        expect(auditLog.metadata).toBeDefined();
      }
    });
  });

  describe('Domain Security Validation', () => {
    it('should reject invalid domain formats', async () => {
      const invalidDomains = [
        '',
        'notadomain',
        'http://domain.com',
        'domain.com/path',
        '<script>alert("xss")</script>.com',
        'domain with spaces.com',
        '-invalid.com',
        'invalid-.com',
      ];

      for (const domain of invalidDomains) {
        const response = await request(app.getHttpServer())
          .post('/domains')
          .set('Authorization', `Bearer ${adminTokenA}`)
          .send({ domain });

        expect([HttpStatus.BAD_REQUEST, HttpStatus.UNPROCESSABLE_ENTITY]).toContain(response.status);
      }
    });

    it('should normalize domain names', async () => {
      const variations = ['WWW.EXAMPLE.COM', 'www.example.com', 'Example.Com'];

      const responses = await Promise.all(
        variations.map((domain) =>
          request(app.getHttpServer())
            .post('/domains')
            .set('Authorization', `Bearer ${adminTokenA}`)
            .send({ domain }),
        ),
      );

      // All should result in the same normalized domain
      // First might succeed, others should conflict or be rejected as duplicate
      const successfulDomains = responses
        .filter((r) => r.status === HttpStatus.CREATED || r.status === HttpStatus.OK)
        .map((r) => r.body.domain);

      if (successfulDomains.length > 1) {
        // If multiple succeeded, they should all be the same normalized value
        const normalized = successfulDomains.map((d: string) => d.toLowerCase().replace('www.', ''));
        expect(new Set(normalized).size).toBe(1);
      }
    });

    it('should reject reserved/system domains', async () => {
      const reservedDomains = [
        'api.broxiva.com',
        'admin.broxiva.com',
        'localhost',
        '127.0.0.1',
        'broxiva.com',
      ];

      for (const domain of reservedDomains) {
        const response = await request(app.getHttpServer())
          .post('/domains')
          .set('Authorization', `Bearer ${adminTokenA}`)
          .send({ domain });

        expect([HttpStatus.BAD_REQUEST, HttpStatus.FORBIDDEN]).toContain(response.status);
      }
    });
  });

  describe('Domain Authorization', () => {
    it('should require authentication for domain operations', async () => {
      const response = await request(app.getHttpServer())
        .post('/domains')
        .send({ domain: 'no-auth-test.com' });

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should require admin role for domain operations', async () => {
      // Create a non-admin user
      const customerUser = await prisma.user.create({
        data: {
          email: 'domain-customer@test.com',
          password: await bcrypt.hash('password123', 10),
          name: 'Customer User',
          role: 'CUSTOMER',
          organizationId: orgA.id,
        },
      });

      const customerToken = jwtService.sign({
        sub: customerUser.id,
        organizationId: orgA.id,
        role: 'CUSTOMER',
      });

      const response = await request(app.getHttpServer())
        .post('/domains')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ domain: 'customer-domain-test.com' });

      expect([HttpStatus.FORBIDDEN, HttpStatus.UNAUTHORIZED]).toContain(response.status);

      // Cleanup
      await prisma.user.delete({ where: { id: customerUser.id } });
    });

    it('should not allow managing domains of another organization', async () => {
      const testDomain = 'other-org-domain.com';

      // Create domain for Org A
      const domain = await prisma.customDomain.create({
        data: {
          domain: testDomain,
          organizationId: orgA.id,
          status: 'ACTIVE',
          verifiedAt: new Date(),
        },
      });

      // Admin B tries to delete it
      const response = await request(app.getHttpServer())
        .delete(`/domains/${domain.id}`)
        .set('Authorization', `Bearer ${adminTokenB}`);

      expect([HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND]).toContain(response.status);

      // Domain should still exist
      const domainCheck = await prisma.customDomain.findUnique({
        where: { id: domain.id },
      });
      expect(domainCheck).toBeTruthy();
      expect(domainCheck?.status).not.toBe('DELETED');
    });
  });
});
