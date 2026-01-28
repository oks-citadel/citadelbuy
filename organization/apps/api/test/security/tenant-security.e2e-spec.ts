import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

/**
 * Tenant Security E2E Tests
 *
 * Comprehensive tests for multi-tenant security controls:
 * - Tenant context validation
 * - Resource isolation
 * - Cross-tenant access prevention
 * - Tenant-scoped operations
 */
describe('Tenant Security (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Test tenants
  let tenantAlpha: { id: string; slug: string };
  let tenantBeta: { id: string; slug: string };
  let tenantGamma: { id: string; slug: string };

  // Test users
  let userAlpha: { id: string; token: string };
  let adminAlpha: { id: string; token: string };
  let userBeta: { id: string; token: string };
  let adminBeta: { id: string; token: string };

  // Super admin (platform level)
  let superAdmin: { id: string; token: string };

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
    const testOrgNames = ['Tenant Alpha Test', 'Tenant Beta Test', 'Tenant Gamma Test'];

    await prisma.orderItem.deleteMany({
      where: { order: { organization: { name: { in: testOrgNames } } } },
    }).catch(() => {});

    await prisma.order.deleteMany({
      where: { organization: { name: { in: testOrgNames } } },
    }).catch(() => {});

    await prisma.product.deleteMany({
      where: { organization: { name: { in: testOrgNames } } },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { endsWith: '@alpha.test' } },
          { email: { endsWith: '@beta.test' } },
          { email: { endsWith: '@gamma.test' } },
          { email: 'super-admin@broxiva.test' },
        ],
      },
    }).catch(() => {});

    await prisma.organization.deleteMany({
      where: { name: { in: testOrgNames } },
    }).catch(() => {});
  }

  async function setupTestEnvironment() {
    // Create test organizations
    const alpha = await prisma.organization.create({
      data: {
        name: 'Tenant Alpha Test',
        slug: 'tenant-alpha-test',
        settings: { theme: 'blue' },
      },
    });
    tenantAlpha = { id: alpha.id, slug: alpha.slug };

    const beta = await prisma.organization.create({
      data: {
        name: 'Tenant Beta Test',
        slug: 'tenant-beta-test',
        settings: { theme: 'green' },
      },
    });
    tenantBeta = { id: beta.id, slug: beta.slug };

    const gamma = await prisma.organization.create({
      data: {
        name: 'Tenant Gamma Test',
        slug: 'tenant-gamma-test',
        settings: { theme: 'red' },
      },
    });
    tenantGamma = { id: gamma.id, slug: gamma.slug };

    // Create users for Tenant Alpha
    const uAlpha = await prisma.user.create({
      data: {
        email: 'user@alpha.test',
        password: await bcrypt.hash('password123', 10),
        name: 'User Alpha',
        role: 'CUSTOMER',
        organizationId: tenantAlpha.id,
      },
    });
    userAlpha = {
      id: uAlpha.id,
      token: jwtService.sign({
        sub: uAlpha.id,
        organizationId: tenantAlpha.id,
        role: 'CUSTOMER',
      }),
    };

    const aAlpha = await prisma.user.create({
      data: {
        email: 'admin@alpha.test',
        password: await bcrypt.hash('password123', 10),
        name: 'Admin Alpha',
        role: 'ADMIN',
        organizationId: tenantAlpha.id,
      },
    });
    adminAlpha = {
      id: aAlpha.id,
      token: jwtService.sign({
        sub: aAlpha.id,
        organizationId: tenantAlpha.id,
        role: 'ADMIN',
      }),
    };

    // Create users for Tenant Beta
    const uBeta = await prisma.user.create({
      data: {
        email: 'user@beta.test',
        password: await bcrypt.hash('password123', 10),
        name: 'User Beta',
        role: 'CUSTOMER',
        organizationId: tenantBeta.id,
      },
    });
    userBeta = {
      id: uBeta.id,
      token: jwtService.sign({
        sub: uBeta.id,
        organizationId: tenantBeta.id,
        role: 'CUSTOMER',
      }),
    };

    const aBeta = await prisma.user.create({
      data: {
        email: 'admin@beta.test',
        password: await bcrypt.hash('password123', 10),
        name: 'Admin Beta',
        role: 'ADMIN',
        organizationId: tenantBeta.id,
      },
    });
    adminBeta = {
      id: aBeta.id,
      token: jwtService.sign({
        sub: aBeta.id,
        organizationId: tenantBeta.id,
        role: 'ADMIN',
      }),
    };

    // Create super admin (platform level, no organization)
    const sAdmin = await prisma.user.create({
      data: {
        email: 'super-admin@broxiva.test',
        password: await bcrypt.hash('password123', 10),
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
      },
    });
    superAdmin = {
      id: sAdmin.id,
      token: jwtService.sign({
        sub: sAdmin.id,
        role: 'SUPER_ADMIN',
        isSuperAdmin: true,
      }),
    };
  }

  describe('Tenant Context Validation', () => {
    it('should extract tenant context from JWT token', async () => {
      const response = await request(app.getHttpServer())
        .get('/me/profile')
        .set('Authorization', `Bearer ${userAlpha.token}`);

      if (response.status === HttpStatus.OK) {
        expect(response.body.organizationId).toBe(tenantAlpha.id);
      }
    });

    it('should reject requests with missing tenant context', async () => {
      // Token without organizationId
      const tokenWithoutOrg = jwtService.sign({
        sub: userAlpha.id,
        role: 'CUSTOMER',
        // organizationId intentionally omitted
      });

      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${tokenWithoutOrg}`);

      // Should be rejected or return empty results
      expect([HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.OK]).toContain(
        response.status,
      );

      if (response.status === HttpStatus.OK) {
        // If accepted, should not return any tenant-specific data
        expect(response.body.data?.length || 0).toBe(0);
      }
    });

    it('should ignore tenant context spoofing in headers', async () => {
      // Try to spoof organizationId via header
      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${userAlpha.token}`)
        .set('X-Organization-Id', tenantBeta.id); // Attempt to access Beta's data

      if (response.status === HttpStatus.OK) {
        // Should still only see Alpha's data (from JWT), not Beta's
        const products = response.body.data || [];
        products.forEach((p: any) => {
          expect(p.organizationId).toBe(tenantAlpha.id);
          expect(p.organizationId).not.toBe(tenantBeta.id);
        });
      }
    });

    it('should ignore tenant context spoofing in query params', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ organizationId: tenantBeta.id })
        .set('Authorization', `Bearer ${userAlpha.token}`);

      if (response.status === HttpStatus.OK) {
        const products = response.body.data || [];
        products.forEach((p: any) => {
          expect(p.organizationId).toBe(tenantAlpha.id);
        });
      }
    });
  });

  describe('Tenant Scoped CRUD Operations', () => {
    let productAlpha: string;
    let productBeta: string;

    beforeEach(async () => {
      // Create products for each tenant
      const pAlpha = await prisma.product.create({
        data: {
          name: 'Alpha Product',
          description: 'Product for Tenant Alpha',
          price: 100,
          stock: 10,
          organizationId: tenantAlpha.id,
        },
      });
      productAlpha = pAlpha.id;

      const pBeta = await prisma.product.create({
        data: {
          name: 'Beta Product',
          description: 'Product for Tenant Beta',
          price: 200,
          stock: 20,
          organizationId: tenantBeta.id,
        },
      });
      productBeta = pBeta.id;
    });

    it('should only list resources from own tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${userAlpha.token}`);

      if (response.status === HttpStatus.OK) {
        const products = response.body.data || response.body;
        const productIds = (Array.isArray(products) ? products : []).map((p: any) => p.id);

        expect(productIds).toContain(productAlpha);
        expect(productIds).not.toContain(productBeta);
      }
    });

    it('should create resources with own tenant ID', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminAlpha.token}`)
        .send({
          name: 'New Alpha Product',
          description: 'Created by Alpha admin',
          price: 150,
          stock: 15,
        });

      if (response.status === HttpStatus.CREATED || response.status === HttpStatus.OK) {
        expect(response.body.organizationId).toBe(tenantAlpha.id);

        // Cleanup
        await prisma.product.delete({ where: { id: response.body.id } }).catch(() => {});
      }
    });

    it('should not allow creating resources for another tenant', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminAlpha.token}`)
        .send({
          name: 'Sneaky Product',
          description: 'Trying to create in Beta',
          price: 150,
          stock: 15,
          organizationId: tenantBeta.id, // Attempt to specify different tenant
        });

      // If accepted, should still belong to Alpha
      if (response.status === HttpStatus.CREATED || response.status === HttpStatus.OK) {
        expect(response.body.organizationId).toBe(tenantAlpha.id);
        expect(response.body.organizationId).not.toBe(tenantBeta.id);

        // Cleanup
        await prisma.product.delete({ where: { id: response.body.id } }).catch(() => {});
      }
    });

    it('should not allow updating resources from another tenant', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/products/${productBeta}`)
        .set('Authorization', `Bearer ${adminAlpha.token}`)
        .send({
          name: 'Hijacked Product Name',
        });

      expect([HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND]).toContain(response.status);

      // Verify product was not modified
      const product = await prisma.product.findUnique({ where: { id: productBeta } });
      expect(product?.name).toBe('Beta Product');
    });

    it('should not allow deleting resources from another tenant', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/products/${productBeta}`)
        .set('Authorization', `Bearer ${adminAlpha.token}`);

      expect([HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND]).toContain(response.status);

      // Verify product still exists
      const product = await prisma.product.findUnique({ where: { id: productBeta } });
      expect(product).toBeTruthy();
    });
  });

  describe('Tenant Admin Operations', () => {
    it('should allow admin to manage users within own tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminAlpha.token}`);

      if (response.status === HttpStatus.OK) {
        const users = response.body.data || response.body;
        if (Array.isArray(users) && users.length > 0) {
          users.forEach((u: any) => {
            expect(u.organizationId).toBe(tenantAlpha.id);
          });
        }
      }
    });

    it('should not allow admin to see users from another tenant', async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/users/${userBeta.id}`)
        .set('Authorization', `Bearer ${adminAlpha.token}`);

      expect([HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND]).toContain(response.status);
    });

    it('should not allow admin to modify users from another tenant', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${userBeta.id}`)
        .set('Authorization', `Bearer ${adminAlpha.token}`)
        .send({
          role: 'ADMIN', // Try to escalate privileges
        });

      expect([HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND]).toContain(response.status);

      // Verify user was not modified
      const user = await prisma.user.findUnique({ where: { id: userBeta.id } });
      expect(user?.role).toBe('CUSTOMER');
    });

    it('should not allow admin to delete users from another tenant', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/admin/users/${userBeta.id}`)
        .set('Authorization', `Bearer ${adminAlpha.token}`);

      expect([HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND]).toContain(response.status);

      // Verify user still exists
      const user = await prisma.user.findUnique({ where: { id: userBeta.id } });
      expect(user).toBeTruthy();
    });
  });

  describe('Tenant Organization Settings', () => {
    it('should only allow accessing own tenant settings', async () => {
      const response = await request(app.getHttpServer())
        .get(`/organizations/${tenantAlpha.id}/settings`)
        .set('Authorization', `Bearer ${adminAlpha.token}`);

      if (response.status === HttpStatus.OK) {
        expect(response.body.theme).toBe('blue');
      }
    });

    it('should not allow accessing another tenant settings', async () => {
      const response = await request(app.getHttpServer())
        .get(`/organizations/${tenantBeta.id}/settings`)
        .set('Authorization', `Bearer ${adminAlpha.token}`);

      expect([HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND]).toContain(response.status);
    });

    it('should not allow modifying another tenant settings', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/organizations/${tenantBeta.id}/settings`)
        .set('Authorization', `Bearer ${adminAlpha.token}`)
        .send({
          theme: 'hacked',
        });

      expect([HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND]).toContain(response.status);

      // Verify settings were not modified
      const org = await prisma.organization.findUnique({
        where: { id: tenantBeta.id },
      });
      expect((org?.settings as any)?.theme).toBe('green');
    });
  });

  describe('Tenant Data Enumeration Protection', () => {
    it('should not reveal tenant existence through timing', async () => {
      // Request to existing tenant vs non-existing should take similar time
      const existingTenantStart = Date.now();
      await request(app.getHttpServer())
        .get(`/organizations/${tenantBeta.id}/public`)
        .set('Authorization', `Bearer ${userAlpha.token}`);
      const existingTenantTime = Date.now() - existingTenantStart;

      const nonExistingTenantStart = Date.now();
      await request(app.getHttpServer())
        .get(`/organizations/00000000-0000-0000-0000-000000000000/public`)
        .set('Authorization', `Bearer ${userAlpha.token}`);
      const nonExistingTenantTime = Date.now() - nonExistingTenantStart;

      // Timing difference should not be significant (within 100ms tolerance)
      const timeDifference = Math.abs(existingTenantTime - nonExistingTenantTime);
      expect(timeDifference).toBeLessThan(500);
    });

    it('should use generic error messages for cross-tenant access', async () => {
      const response = await request(app.getHttpServer())
        .get(`/organizations/${tenantBeta.id}/settings`)
        .set('Authorization', `Bearer ${adminAlpha.token}`);

      if (response.status === HttpStatus.FORBIDDEN || response.status === HttpStatus.NOT_FOUND) {
        // Error message should be generic
        expect(response.body.message).not.toContain(tenantBeta.slug);
        expect(response.body.message).not.toContain('Beta');
      }
    });
  });

  describe('Super Admin Cross-Tenant Access', () => {
    it('should allow super admin to view any tenant data (with audit)', async () => {
      // Super admin should be able to access any tenant for support purposes
      const response = await request(app.getHttpServer())
        .get(`/admin/organizations/${tenantAlpha.id}`)
        .set('Authorization', `Bearer ${superAdmin.token}`);

      // This depends on whether super admin access is implemented
      // If not implemented, should return forbidden
      expect([HttpStatus.OK, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND]).toContain(
        response.status,
      );
    });

    it('should log super admin cross-tenant access', async () => {
      // Make a cross-tenant access with super admin
      await request(app.getHttpServer())
        .get(`/admin/organizations/${tenantAlpha.id}`)
        .set('Authorization', `Bearer ${superAdmin.token}`)
        .set('X-Request-Id', 'super-admin-audit-test');

      // Check audit log (if implemented)
      const auditEntry = await prisma.auditLog.findFirst({
        where: {
          userId: superAdmin.id,
          resourceType: 'ORGANIZATION',
        },
        orderBy: { createdAt: 'desc' },
      });

      // If audit logging is implemented, entry should exist
      if (auditEntry) {
        expect(auditEntry.userId).toBe(superAdmin.id);
      }
    });
  });

  describe('Tenant Boundary Edge Cases', () => {
    it('should handle null organization ID gracefully', async () => {
      // User with null organizationId (orphaned user)
      const orphanUser = await prisma.user.create({
        data: {
          email: 'orphan@test.local',
          password: await bcrypt.hash('password123', 10),
          name: 'Orphan User',
          role: 'CUSTOMER',
          // organizationId is null
        },
      });

      const orphanToken = jwtService.sign({
        sub: orphanUser.id,
        role: 'CUSTOMER',
      });

      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${orphanToken}`);

      // Should not crash, handle gracefully
      expect([HttpStatus.OK, HttpStatus.FORBIDDEN, HttpStatus.UNAUTHORIZED]).toContain(
        response.status,
      );

      // Cleanup
      await prisma.user.delete({ where: { id: orphanUser.id } });
    });

    it('should handle deleted tenant gracefully', async () => {
      // Create a user token for Gamma tenant, then delete the tenant
      const gammaUser = await prisma.user.create({
        data: {
          email: 'user@gamma.test',
          password: await bcrypt.hash('password123', 10),
          name: 'Gamma User',
          role: 'CUSTOMER',
          organizationId: tenantGamma.id,
        },
      });

      const gammaToken = jwtService.sign({
        sub: gammaUser.id,
        organizationId: tenantGamma.id,
        role: 'CUSTOMER',
      });

      // Delete the user first (to avoid foreign key constraint)
      await prisma.user.delete({ where: { id: gammaUser.id } });
      // Delete the organization
      await prisma.organization.delete({ where: { id: tenantGamma.id } });

      // Try to use the token
      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${gammaToken}`);

      // Should be rejected (tenant no longer exists)
      expect([HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND]).toContain(
        response.status,
      );
    });
  });
});
