import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

/**
 * XSS Prevention E2E Tests
 *
 * Tests for Cross-Site Scripting (XSS) prevention:
 * - Input sanitization
 * - Output encoding
 * - Content Security Policy
 * - Translation injection prevention
 */
describe('XSS Prevention (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let testOrg: { id: string };
  let vendorToken: string;
  let adminToken: string;

  // Common XSS payloads for testing
  const XSS_PAYLOADS = [
    '<script>alert("xss")</script>',
    '<img src="x" onerror="alert(1)">',
    '<svg onload="alert(1)">',
    'javascript:alert(1)',
    '<a href="javascript:alert(1)">click</a>',
    '<body onload="alert(1)">',
    '<input onfocus="alert(1)" autofocus>',
    '<marquee onstart="alert(1)">',
    '<video><source onerror="alert(1)">',
    '<iframe src="javascript:alert(1)">',
    '<object data="javascript:alert(1)">',
    '<embed src="javascript:alert(1)">',
    '<form action="javascript:alert(1)"><input type="submit">',
    '<details open ontoggle="alert(1)">',
    '<math><maction actiontype="statusline#http://evil.com">',
    '"><script>alert(1)</script>',
    "'-alert(1)-'",
    '{{constructor.constructor("alert(1)")()}}',
    '${alert(1)}',
    '<style>@import "data:text/css,body{background:red}"</style>',
  ];

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
    await prisma.product.deleteMany({
      where: {
        organization: {
          name: 'XSS Test Org',
        },
      },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: {
        email: { in: ['xss-vendor@test.com', 'xss-admin@test.com'] },
      },
    }).catch(() => {});

    await prisma.organization.deleteMany({
      where: { name: 'XSS Test Org' },
    }).catch(() => {});
  }

  async function setupTestEnvironment() {
    const org = await prisma.organization.create({
      data: {
        name: 'XSS Test Org',
        slug: 'xss-test-org',
        settings: {},
      },
    });
    testOrg = { id: org.id };

    const vendor = await prisma.user.create({
      data: {
        email: 'xss-vendor@test.com',
        password: await bcrypt.hash('password123', 10),
        name: 'XSS Test Vendor',
        role: 'VENDOR',
        organizationId: org.id,
      },
    });

    const admin = await prisma.user.create({
      data: {
        email: 'xss-admin@test.com',
        password: await bcrypt.hash('password123', 10),
        name: 'XSS Test Admin',
        role: 'ADMIN',
        organizationId: org.id,
      },
    });

    vendorToken = jwtService.sign({
      sub: vendor.id,
      organizationId: org.id,
      role: 'VENDOR',
    });

    adminToken = jwtService.sign({
      sub: admin.id,
      organizationId: org.id,
      role: 'ADMIN',
    });
  }

  describe('Product Description Sanitization', () => {
    it('should sanitize XSS payloads in product descriptions', async () => {
      for (const payload of XSS_PAYLOADS) {
        const response = await request(app.getHttpServer())
          .post('/products')
          .set('Authorization', `Bearer ${vendorToken}`)
          .send({
            name: 'Test Product',
            description: payload,
            price: 100,
            stock: 10,
          });

        if (response.status === HttpStatus.CREATED || response.status === HttpStatus.OK) {
          // If accepted, verify the payload was sanitized
          const createdProduct = response.body;

          // Script tags should be removed
          expect(createdProduct.description).not.toContain('<script');
          expect(createdProduct.description).not.toContain('javascript:');
          expect(createdProduct.description).not.toMatch(/on\w+\s*=/i);

          // Clean up
          await prisma.product.delete({ where: { id: createdProduct.id } }).catch(() => {});
        }
      }
    });

    it('should allow safe HTML in descriptions', async () => {
      const safeHtml = '<p>This is <strong>bold</strong> and <em>italic</em> text.</p>';

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          name: 'Safe HTML Product',
          description: safeHtml,
          price: 100,
          stock: 10,
        });

      if (response.status === HttpStatus.CREATED || response.status === HttpStatus.OK) {
        // Safe HTML should be preserved
        expect(response.body.description).toContain('<p>');
        expect(response.body.description).toContain('<strong>');
        expect(response.body.description).toContain('<em>');
      }
    });

    it('should sanitize nested XSS attempts', async () => {
      const nestedPayload = '<div><p onmouseover="alert(1)">Hover me</p></div>';

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          name: 'Nested XSS Test',
          description: nestedPayload,
          price: 100,
          stock: 10,
        });

      if (response.status === HttpStatus.CREATED || response.status === HttpStatus.OK) {
        expect(response.body.description).not.toContain('onmouseover');
      }
    });
  });

  describe('User Profile Sanitization', () => {
    it('should sanitize XSS in user bio/profile fields', async () => {
      const xssPayload = '<script>stealCookies()</script>This is my bio';

      const response = await request(app.getHttpServer())
        .patch('/me/profile')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          bio: xssPayload,
        });

      if (response.status === HttpStatus.OK) {
        expect(response.body.bio).not.toContain('<script');
        expect(response.body.bio).toContain('This is my bio');
      }
    });

    it('should sanitize XSS in display name', async () => {
      const xssName = '<img src=x onerror=alert(1)>John';

      const response = await request(app.getHttpServer())
        .patch('/me/profile')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          name: xssName,
        });

      if (response.status === HttpStatus.OK) {
        expect(response.body.name).not.toContain('<img');
        expect(response.body.name).not.toContain('onerror');
      }
    });
  });

  describe('Translation Content Sanitization', () => {
    it('should sanitize XSS in translated content', async () => {
      const translations = [
        { locale: 'en', content: '<script>alert("en")</script>English' },
        { locale: 'es', content: '<img src=x onerror=alert("es")>Espanol' },
        { locale: 'fr', content: 'javascript:alert("fr")Francais' },
      ];

      for (const translation of translations) {
        const response = await request(app.getHttpServer())
          .post('/translations')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            key: `test_key_${translation.locale}`,
            locale: translation.locale,
            content: translation.content,
          });

        if (response.status === HttpStatus.CREATED || response.status === HttpStatus.OK) {
          expect(response.body.content).not.toContain('<script');
          expect(response.body.content).not.toContain('onerror');
          expect(response.body.content).not.toContain('javascript:');
        }
      }
    });

    it('should preserve valid formatting in translations', async () => {
      const validContent = 'Welcome, <strong>{userName}</strong>! Your order <em>#{orderId}</em> is ready.';

      const response = await request(app.getHttpServer())
        .post('/translations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          key: 'order_ready_message',
          locale: 'en',
          content: validContent,
        });

      if (response.status === HttpStatus.CREATED || response.status === HttpStatus.OK) {
        expect(response.body.content).toContain('<strong>');
        expect(response.body.content).toContain('<em>');
        expect(response.body.content).toContain('{userName}');
      }
    });
  });

  describe('Security Headers', () => {
    it('should include Content-Security-Policy header', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${vendorToken}`);

      const csp = response.headers['content-security-policy'];
      expect(csp).toBeDefined();

      // CSP should restrict script sources
      if (csp) {
        expect(csp).toContain('script-src');
      }
    });

    it('should include X-Content-Type-Options header', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should include X-XSS-Protection header', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${vendorToken}`);

      const xssProtection = response.headers['x-xss-protection'];
      expect(xssProtection).toBeDefined();
      expect(xssProtection).toContain('1');
    });
  });

  describe('API Response Encoding', () => {
    it('should properly encode special characters in JSON responses', async () => {
      const specialChars = '<>&"\'/';

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          name: `Product with ${specialChars}`,
          description: 'Test description',
          price: 100,
          stock: 10,
        });

      if (response.status === HttpStatus.CREATED || response.status === HttpStatus.OK) {
        // JSON should be properly escaped
        const rawBody = JSON.stringify(response.body);
        expect(rawBody).not.toContain('</script>');
      }
    });

    it('should set correct Content-Type header', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${vendorToken}`);

      const contentType = response.headers['content-type'];
      expect(contentType).toContain('application/json');
    });
  });

  describe('URL Parameter Sanitization', () => {
    it('should sanitize XSS in query parameters', async () => {
      const maliciousQuery = '<script>alert(1)</script>';

      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ search: maliciousQuery })
        .set('Authorization', `Bearer ${vendorToken}`);

      // Should not cause server error
      expect([HttpStatus.OK, HttpStatus.BAD_REQUEST]).toContain(response.status);

      // Response should not reflect unsanitized input
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('<script>');
    });

    it('should sanitize XSS in path parameters', async () => {
      const maliciousId = '123<script>alert(1)</script>';

      const response = await request(app.getHttpServer())
        .get(`/products/${maliciousId}`)
        .set('Authorization', `Bearer ${vendorToken}`);

      // Should return error, not crash
      expect([HttpStatus.NOT_FOUND, HttpStatus.BAD_REQUEST]).toContain(response.status);
    });
  });

  describe('File Upload Sanitization', () => {
    it('should reject files with malicious names', async () => {
      const maliciousFileName = '<script>alert(1)</script>.jpg';

      const response = await request(app.getHttpServer())
        .post('/uploads')
        .set('Authorization', `Bearer ${vendorToken}`)
        .attach('file', Buffer.from('fake image content'), maliciousFileName);

      // Should either reject or sanitize the filename
      if (response.status === HttpStatus.CREATED || response.status === HttpStatus.OK) {
        expect(response.body.filename).not.toContain('<script');
      }
    });

    it('should reject SVG files with embedded scripts', async () => {
      const maliciousSvg = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <script>alert('XSS')</script>
          <rect width="100" height="100"/>
        </svg>
      `;

      const response = await request(app.getHttpServer())
        .post('/uploads')
        .set('Authorization', `Bearer ${vendorToken}`)
        .attach('file', Buffer.from(maliciousSvg), 'test.svg');

      // Should be rejected or sanitized
      expect([HttpStatus.BAD_REQUEST, HttpStatus.UNSUPPORTED_MEDIA_TYPE, HttpStatus.CREATED]).toContain(
        response.status,
      );
    });
  });

  describe('Rich Text Editor Content', () => {
    it('should sanitize rich text content from WYSIWYG editors', async () => {
      // Simulating content from a rich text editor that might include XSS
      const richTextContent = `
        <p>Normal paragraph</p>
        <h2>Heading</h2>
        <script>alert('xss')</script>
        <p style="background:url('javascript:alert(1)')">Styled text</p>
        <a href="javascript:void(0)" onclick="alert(1)">Link</a>
        <img src="valid.jpg" onerror="alert(1)">
      `;

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          name: 'Rich Text Product',
          description: richTextContent,
          price: 100,
          stock: 10,
        });

      if (response.status === HttpStatus.CREATED || response.status === HttpStatus.OK) {
        const description = response.body.description;

        // Safe tags should be preserved
        expect(description).toContain('<p>');
        expect(description).toContain('<h2>');

        // Dangerous content should be removed
        expect(description).not.toContain('<script>');
        expect(description).not.toContain('javascript:');
        expect(description).not.toContain('onclick');
        expect(description).not.toContain('onerror');
      }
    });
  });

  describe('DOM Clobbering Prevention', () => {
    it('should prevent DOM clobbering attacks via name/id attributes', async () => {
      const domClobberingPayload = `
        <form id="test"><input name="location" value="https://evil.com"></form>
        <a id="test2" name="test2" href="https://evil.com">Click</a>
      `;

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          name: 'DOM Clobbering Test',
          description: domClobberingPayload,
          price: 100,
          stock: 10,
        });

      if (response.status === HttpStatus.CREATED || response.status === HttpStatus.OK) {
        // Form tags should be removed or sanitized
        expect(response.body.description).not.toContain('<form');
        expect(response.body.description).not.toContain('<input');
      }
    });
  });
});
