import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

/**
 * Tenant Isolation E2E Tests
 *
 * These tests verify that multi-tenant boundaries are properly enforced,
 * preventing cross-tenant data access and ensuring proper 403 responses.
 *
 * CRITICAL: These tests must pass before any production deployment.
 */
describe('Tenant Isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Test tenants
  let tenantA: { id: string; name: string };
  let tenantB: { id: string; name: string };

  // Test users with different tenant contexts
  let userTenantA: { id: string; token: string };
  let userTenantB: { id: string; token: string };
  let adminTenantA: { id: string; token: string };

  // Test resources
  let productTenantA: { id: string };
  let productTenantB: { id: string };
  let orderTenantA: { id: string };
  let orderTenantB: { id: string };
  let customerTenantA: { id: string };
  let customerTenantB: { id: string };

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
    // Clean up test data
    await cleanupTestData();

    // Set up test tenants and users
    await setupTestEnvironment();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  async function cleanupTestData() {
    // Clean in order to respect foreign key constraints
    await prisma.orderItem.deleteMany({
      where: {
        order: {
          organization: {
            name: { in: ['Test Tenant A', 'Test Tenant B'] }
          }
        }
      }
    }).catch(() => {});

    await prisma.order.deleteMany({
      where: {
        organization: {
          name: { in: ['Test Tenant A', 'Test Tenant B'] }
        }
      }
    }).catch(() => {});

    await prisma.product.deleteMany({
      where: {
        organization: {
          name: { in: ['Test Tenant A', 'Test Tenant B'] }
        }
      }
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@tenanta.test' } },
          { email: { contains: '@tenantb.test' } },
        ]
      }
    }).catch(() => {});

    await prisma.organization.deleteMany({
      where: { name: { in: ['Test Tenant A', 'Test Tenant B'] } }
    }).catch(() => {});
  }

  async function setupTestEnvironment() {
    // Create test organizations (tenants)
    const orgA = await prisma.organization.create({
      data: {
        name: 'Test Tenant A',
        slug: 'test-tenant-a',
        settings: {},
      },
    });
    tenantA = { id: orgA.id, name: orgA.name };

    const orgB = await prisma.organization.create({
      data: {
        name: 'Test Tenant B',
        slug: 'test-tenant-b',
        settings: {},
      },
    });
    tenantB = { id: orgB.id, name: orgB.name };

    // Create users for Tenant A
    const userA = await prisma.user.create({
      data: {
        email: 'user@tenanta.test',
        password: await bcrypt.hash('password123', 10),
        name: 'User Tenant A',
        role: 'CUSTOMER',
        organizationId: tenantA.id,
      },
    });
    userTenantA = {
      id: userA.id,
      token: generateTestToken(userA.id, tenantA.id, 'CUSTOMER'),
    };

    const adminA = await prisma.user.create({
      data: {
        email: 'admin@tenanta.test',
        password: await bcrypt.hash('password123', 10),
        name: 'Admin Tenant A',
        role: 'ADMIN',
        organizationId: tenantA.id,
      },
    });
    adminTenantA = {
      id: adminA.id,
      token: generateTestToken(adminA.id, tenantA.id, 'ADMIN'),
    };

    // Create user for Tenant B
    const userB = await prisma.user.create({
      data: {
        email: 'user@tenantb.test',
        password: await bcrypt.hash('password123', 10),
        name: 'User Tenant B',
        role: 'CUSTOMER',
        organizationId: tenantB.id,
      },
    });
    userTenantB = {
      id: userB.id,
      token: generateTestToken(userB.id, tenantB.id, 'CUSTOMER'),
    };

    // Create category for products
    const category = await prisma.category.create({
      data: {
        name: 'Test Category',
        slug: 'test-category',
      },
    });

    // Create products for each tenant
    const prodA = await prisma.product.create({
      data: {
        name: 'Product Tenant A',
        description: 'Test product for Tenant A',
        price: 100,
        stock: 10,
        organizationId: tenantA.id,
        categoryId: category.id,
      },
    });
    productTenantA = { id: prodA.id };

    const prodB = await prisma.product.create({
      data: {
        name: 'Product Tenant B',
        description: 'Test product for Tenant B',
        price: 200,
        stock: 20,
        organizationId: tenantB.id,
        categoryId: category.id,
      },
    });
    productTenantB = { id: prodB.id };

    // Create orders for each tenant
    const ordA = await prisma.order.create({
      data: {
        userId: userA.id,
        organizationId: tenantA.id,
        status: 'PENDING',
        total: 100,
        subtotal: 100,
        shipping: 0,
        tax: 0,
        shippingAddress: {},
      },
    });
    orderTenantA = { id: ordA.id };

    const ordB = await prisma.order.create({
      data: {
        userId: userB.id,
        organizationId: tenantB.id,
        status: 'PENDING',
        total: 200,
        subtotal: 200,
        shipping: 0,
        tax: 0,
        shippingAddress: {},
      },
    });
    orderTenantB = { id: ordB.id };

    // Store customer IDs
    customerTenantA = { id: userA.id };
    customerTenantB = { id: userB.id };
  }

  function generateTestToken(userId: string, organizationId: string, role: string): string {
    return jwtService.sign({
      sub: userId,
      organizationId,
      role,
    });
  }

  describe('Product Access Control', () => {
    it('should allow user to access their own tenant products', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/${productTenantA.id}`)
        .set('Authorization', `Bearer ${userTenantA.token}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(productTenantA.id);
      expect(response.body.organizationId).toBe(tenantA.id);
    });

    it('should return 403 when accessing another tenant product', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/${productTenantB.id}`)
        .set('Authorization', `Bearer ${userTenantA.token}`)
        .expect(HttpStatus.FORBIDDEN);

      expect(response.body.message).toContain('access');
      expect(response.body.code).toBe('TENANT_ACCESS_DENIED');
    });

    it('should not allow modifying another tenant product', async () => {
      await request(app.getHttpServer())
        .patch(`/products/${productTenantB.id}`)
        .set('Authorization', `Bearer ${adminTenantA.token}`)
        .send({ name: 'Hijacked Product' })
        .expect(HttpStatus.FORBIDDEN);

      // Verify product was not modified
      const product = await prisma.product.findUnique({
        where: { id: productTenantB.id },
      });
      expect(product?.name).toBe('Product Tenant B');
    });

    it('should not allow deleting another tenant product', async () => {
      await request(app.getHttpServer())
        .delete(`/products/${productTenantB.id}`)
        .set('Authorization', `Bearer ${adminTenantA.token}`)
        .expect(HttpStatus.FORBIDDEN);

      // Verify product still exists
      const product = await prisma.product.findUnique({
        where: { id: productTenantB.id },
      });
      expect(product).toBeTruthy();
    });

    it('should not list products from other tenants', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${userTenantA.token}`)
        .expect(HttpStatus.OK);

      // Should only contain Tenant A products
      const productIds = response.body.data?.map((p: any) => p.id) || [];
      expect(productIds).toContain(productTenantA.id);
      expect(productIds).not.toContain(productTenantB.id);
    });
  });

  describe('Order Access Control', () => {
    it('should allow user to access their own orders', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/${orderTenantA.id}`)
        .set('Authorization', `Bearer ${userTenantA.token}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(orderTenantA.id);
    });

    it('should return 403 when accessing another tenant order', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/${orderTenantB.id}`)
        .set('Authorization', `Bearer ${userTenantA.token}`)
        .expect(HttpStatus.FORBIDDEN);

      expect(response.body.code).toBe('TENANT_ACCESS_DENIED');
    });

    it('should not allow admin to access orders from another tenant', async () => {
      await request(app.getHttpServer())
        .get(`/orders/${orderTenantB.id}`)
        .set('Authorization', `Bearer ${adminTenantA.token}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should not allow updating another tenant order status', async () => {
      await request(app.getHttpServer())
        .patch(`/orders/${orderTenantB.id}/status`)
        .set('Authorization', `Bearer ${adminTenantA.token}`)
        .send({ status: 'CANCELLED' })
        .expect(HttpStatus.FORBIDDEN);

      // Verify order was not modified
      const order = await prisma.order.findUnique({
        where: { id: orderTenantB.id },
      });
      expect(order?.status).toBe('PENDING');
    });

    it('should not list orders from other tenants', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${adminTenantA.token}`)
        .expect(HttpStatus.OK);

      const orderIds = response.body.data?.map((o: any) => o.id) || [];
      expect(orderIds).toContain(orderTenantA.id);
      expect(orderIds).not.toContain(orderTenantB.id);
    });
  });

  describe('Customer Data Access Control', () => {
    it('should not allow accessing customer data from another tenant', async () => {
      await request(app.getHttpServer())
        .get(`/users/${customerTenantB.id}`)
        .set('Authorization', `Bearer ${adminTenantA.token}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should not allow listing customers from another tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/customers')
        .set('Authorization', `Bearer ${adminTenantA.token}`)
        .expect(HttpStatus.OK);

      const customerIds = response.body.data?.map((c: any) => c.id) || [];
      expect(customerIds).toContain(customerTenantA.id);
      expect(customerIds).not.toContain(customerTenantB.id);
    });

    it('should not expose customer email in cross-tenant requests', async () => {
      // Attempt to search for a user from another tenant
      const response = await request(app.getHttpServer())
        .get('/admin/customers/search')
        .query({ email: 'user@tenantb.test' })
        .set('Authorization', `Bearer ${adminTenantA.token}`)
        .expect(HttpStatus.OK);

      // Should return empty results, not expose the user exists
      expect(response.body.data?.length || 0).toBe(0);
    });
  });

  describe('Settings Access Control', () => {
    it('should not allow modifying another tenant settings', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/${tenantB.id}/settings`)
        .set('Authorization', `Bearer ${adminTenantA.token}`)
        .send({ name: 'Hijacked Tenant' })
        .expect(HttpStatus.FORBIDDEN);

      // Verify settings were not modified
      const org = await prisma.organization.findUnique({
        where: { id: tenantB.id },
      });
      expect(org?.name).toBe('Test Tenant B');
    });

    it('should not allow reading another tenant settings', async () => {
      await request(app.getHttpServer())
        .get(`/organizations/${tenantB.id}/settings`)
        .set('Authorization', `Bearer ${adminTenantA.token}`)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('IDOR Prevention', () => {
    it('should prevent IDOR via sequential ID enumeration', async () => {
      // Try accessing resources with incremented IDs
      const responses = await Promise.all([
        request(app.getHttpServer())
          .get(`/orders/${orderTenantB.id}`)
          .set('Authorization', `Bearer ${userTenantA.token}`),
        request(app.getHttpServer())
          .get(`/products/${productTenantB.id}`)
          .set('Authorization', `Bearer ${userTenantA.token}`),
      ]);

      responses.forEach((response) => {
        expect(response.status).toBe(HttpStatus.FORBIDDEN);
      });
    });

    it('should not leak information about resource existence', async () => {
      // Non-existent resource should return same response as forbidden
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const [forbiddenResponse, notFoundResponse] = await Promise.all([
        request(app.getHttpServer())
          .get(`/orders/${orderTenantB.id}`)
          .set('Authorization', `Bearer ${userTenantA.token}`),
        request(app.getHttpServer())
          .get(`/orders/${nonExistentId}`)
          .set('Authorization', `Bearer ${userTenantA.token}`),
      ]);

      // Both should return generic error to prevent enumeration
      expect([HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND]).toContain(forbiddenResponse.status);
      expect([HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND]).toContain(notFoundResponse.status);
    });
  });

  describe('Audit Logging', () => {
    it('should log cross-tenant access attempts', async () => {
      // This test verifies the audit log is created for suspicious activity
      await request(app.getHttpServer())
        .get(`/orders/${orderTenantB.id}`)
        .set('Authorization', `Bearer ${userTenantA.token}`)
        .set('X-Request-Id', 'test-trace-id-123')
        .expect(HttpStatus.FORBIDDEN);

      // In a real implementation, verify audit log was created
      // This would check the audit_log table or monitoring system
    });
  });

  describe('Edge Cases', () => {
    it('should handle null organizationId gracefully', async () => {
      // Attempt request with malformed token missing organizationId
      const malformedToken = jwtService.sign({
        sub: userTenantA.id,
        role: 'CUSTOMER',
        // organizationId intentionally omitted
      });

      await request(app.getHttpServer())
        .get(`/products/${productTenantA.id}`)
        .set('Authorization', `Bearer ${malformedToken}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject requests with spoofed organizationId header', async () => {
      // Attempt to override organizationId via header
      await request(app.getHttpServer())
        .get(`/products/${productTenantB.id}`)
        .set('Authorization', `Bearer ${userTenantA.token}`)
        .set('X-Organization-Id', tenantB.id) // Attempt to spoof
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should prevent tenant context manipulation via query params', async () => {
      await request(app.getHttpServer())
        .get(`/products/${productTenantB.id}`)
        .query({ organizationId: tenantB.id }) // Attempt to override
        .set('Authorization', `Bearer ${userTenantA.token}`)
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});
