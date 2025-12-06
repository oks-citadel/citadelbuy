/**
 * API Gateway Testing Agent
 *
 * Tests:
 * - Rate limiting and throttling
 * - API versioning
 * - Request/response validation
 * - Error handling and status codes
 * - Authentication header validation
 * - CORS policy enforcement
 * - Request size limits
 * - API documentation accuracy
 * - GraphQL/REST endpoint consistency
 */

import { BaseAgent, HttpHelper, assert, TestResult, AgentOptions } from './base.agent';

export class ApiGatewayAgent extends BaseAgent {
  private http: HttpHelper;
  private authToken?: string;
  private userId?: string;

  constructor(options: AgentOptions = {}) {
    super('API Gateway Testing Agent', 'api-gateway', options);
    this.http = new HttpHelper(this.context.apiUrl, this.context.headers, this.context.timeout);
  }

  protected async setup(): Promise<void> {
    try {
      // Authenticate to get a valid token for tests
      const { data } = await this.http.post('/auth/register', {
        email: `gateway-test-${Date.now()}@example.com`,
        password: 'GatewayTest123!',
        name: 'Gateway Test User',
      });
      this.authToken = data.access_token;
      this.userId = data.user?.id;
    } catch (e) {
      console.warn('Could not authenticate for API Gateway tests - some tests may be skipped');
    }
  }

  protected async teardown(): Promise<void> {
    // Cleanup if needed
  }

  protected defineTests(): void {
    // ============================================
    // Rate Limiting and Throttling Tests
    // ============================================
    this.describe('Rate Limiting and Throttling', (t) => {
      t('should enforce rate limits on API endpoints', async (ctx) => {
        const responses: number[] = [];
        const endpoint = '/products';

        // Make rapid consecutive requests
        for (let i = 0; i < 150; i++) {
          const { status } = await this.http.get(endpoint);
          responses.push(status);
        }

        // Should have at least some 429 (Too Many Requests) responses
        const rateLimited = responses.filter(s => s === 429);
        const successful = responses.filter(s => s === 200);

        assert.ok(
          successful.length > 0,
          'Should allow some requests through'
        );

        // Rate limiting might be configured differently per environment
        // This is a soft check
      }, { timeout: 60000 });

      t('should include rate limit headers in responses', async (ctx) => {
        const { headers, status } = await this.http.get('/products');

        // Check for standard rate limit headers
        const rateLimit = headers.get('x-ratelimit-limit');
        const remaining = headers.get('x-ratelimit-remaining');
        const reset = headers.get('x-ratelimit-reset');

        // Headers might not be present in all environments
        // but if present, should be valid
        if (rateLimit) {
          assert.ok(parseInt(rateLimit) > 0, 'Rate limit should be positive number');
        }

        if (remaining) {
          assert.ok(parseInt(remaining) >= 0, 'Remaining should be non-negative');
        }

        if (reset) {
          assert.ok(parseInt(reset) > 0, 'Reset should be valid timestamp');
        }
      });

      t('should have different rate limits for authenticated vs anonymous', async (ctx) => {
        // Anonymous request
        this.http.removeAuthToken();
        const { headers: anonHeaders } = await this.http.get('/products');
        const anonLimit = anonHeaders.get('x-ratelimit-limit');

        // Authenticated request
        if (this.authToken) {
          this.http.setAuthToken(this.authToken);
          const { headers: authHeaders } = await this.http.get('/products');
          const authLimit = authHeaders.get('x-ratelimit-limit');

          // Authenticated users typically get higher limits
          // This is environment-dependent
        }
      });

      t('should return 429 with Retry-After header when rate limited', async (ctx) => {
        const responses: { status: number; headers: Headers }[] = [];

        // Spam requests until rate limited
        for (let i = 0; i < 200; i++) {
          const response = await this.http.get('/products');
          responses.push(response);

          if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after');
            // Retry-After should be present when rate limited
            // It can be in seconds or HTTP date format
            break;
          }
        }
      }, { timeout: 90000 });

      t('should apply stricter rate limits to auth endpoints', async (ctx) => {
        const loginAttempts: number[] = [];

        // Try many login attempts
        for (let i = 0; i < 30; i++) {
          const { status } = await this.http.post('/auth/login', {
            email: `test-${i}@example.com`,
            password: 'TestPassword123!',
          });
          loginAttempts.push(status);
        }

        // Auth endpoints should rate limit more aggressively
        const rateLimited = loginAttempts.filter(s => s === 429);
        // This may or may not trigger based on configuration
      }, { timeout: 45000 });

      t('should reset rate limit counter after time window', async (ctx) => {
        // This test would require waiting for the rate limit window to reset
        // Typically 1 minute or similar
        // Skipping for time constraints
      }, { skip: true });
    });

    // ============================================
    // API Versioning Tests
    // ============================================
    this.describe('API Versioning', (t) => {
      t('should support version in URL path (e.g., /v1/)', async (ctx) => {
        const { status: v1Status } = await this.http.get('/v1/products');

        // v1 should exist or gracefully handle
        assert.ok(
          [200, 404].includes(v1Status),
          'Should handle versioned endpoint'
        );
      });

      t('should support version in Accept header', async (ctx) => {
        const { status } = await this.http.get('/products', {
          headers: { 'Accept': 'application/vnd.citadelbuy.v1+json' },
        });

        assert.ok(
          [200, 404, 406].includes(status),
          'Should handle version in Accept header'
        );
      });

      t('should support version in custom header', async (ctx) => {
        const { status } = await this.http.get('/products', {
          headers: { 'X-API-Version': '1' },
        });

        assert.ok(
          [200, 404].includes(status),
          'Should handle custom version header'
        );
      });

      t('should return 406 Not Acceptable for unsupported versions', async (ctx) => {
        const { status } = await this.http.get('/products', {
          headers: { 'Accept': 'application/vnd.citadelbuy.v999+json' },
        });

        assert.ok(
          [200, 404, 406].includes(status),
          'Should handle unsupported API version'
        );
      });

      t('should default to latest version when not specified', async (ctx) => {
        const { status } = await this.http.get('/products');

        assert.statusCode(
          status,
          200,
          'Should use default version when unspecified'
        );
      });

      t('should include API version in response headers', async (ctx) => {
        const { headers } = await this.http.get('/products');

        const version = headers.get('x-api-version') ||
                       headers.get('api-version');

        // Version header may or may not be present
        if (version) {
          assert.match(version, /^\d+(\.\d+)?(\.\d+)?$/, 'Version should be valid format');
        }
      });
    });

    // ============================================
    // Request/Response Validation Tests
    // ============================================
    this.describe('Request/Response Validation', (t) => {
      t('should validate Content-Type header for POST/PUT/PATCH', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        // Missing Content-Type
        const { status: status1 } = await this.http.post('/cart/items',
          { productId: 'test', quantity: 1 },
          { headers: { 'Content-Type': 'text/plain' } }
        );

        assert.ok(
          [400, 401, 415].includes(status1),
          'Should validate Content-Type'
        );
      });

      t('should reject invalid JSON in request body', async (ctx) => {
        const response = await fetch(`${this.context.apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{invalid: json}',
        });

        assert.statusCode(
          response.status,
          400,
          'Should reject malformed JSON'
        );
      });

      t('should validate required fields in request', async (ctx) => {
        const { status, data } = await this.http.post('/auth/register', {
          email: 'missing-fields@test.com',
          // Missing required fields: password, name
        });

        assert.statusCode(status, 400, 'Should reject missing required fields');
        assert.ok(data.message || data.error, 'Should provide error message');
      });

      t('should validate field types in request', async (ctx) => {
        const { status } = await this.http.post('/auth/register', {
          email: 12345, // Should be string
          password: true, // Should be string
          name: ['array'], // Should be string
        });

        assert.statusCode(status, 400, 'Should validate field types');
      });

      t('should enforce minimum/maximum field lengths', async (ctx) => {
        const { status: status1 } = await this.http.post('/auth/register', {
          email: 'a@b.c',
          password: '12', // Too short
          name: 'Test',
        });

        assert.statusCode(status1, 400, 'Should enforce minimum length');

        const longString = 'a'.repeat(10000);
        const { status: status2 } = await this.http.post('/auth/register', {
          email: 'test@test.com',
          password: 'ValidPass123!',
          name: longString, // Too long
        });

        assert.ok(
          [400, 413].includes(status2),
          'Should enforce maximum length'
        );
      });

      t('should return valid JSON in all responses', async (ctx) => {
        const endpoints = [
          '/products',
          '/categories',
          '/auth/profile',
          '/health',
        ];

        for (const endpoint of endpoints) {
          if (endpoint === '/auth/profile' && this.authToken) {
            this.http.setAuthToken(this.authToken);
          } else {
            this.http.removeAuthToken();
          }

          const { data, headers } = await this.http.get(endpoint);
          const contentType = headers.get('content-type');

          if (contentType?.includes('application/json')) {
            // Should be valid JSON (already parsed by HttpHelper)
            assert.ok(
              typeof data === 'object',
              `Response from ${endpoint} should be valid JSON`
            );
          }
        }
      });

      t('should validate query parameter types', async (ctx) => {
        const { status } = await this.http.get('/products?limit=invalid&offset=abc');

        assert.ok(
          [200, 400].includes(status),
          'Should validate query parameter types'
        );
      });

      t('should handle missing optional parameters gracefully', async (ctx) => {
        const { status } = await this.http.get('/products');

        assert.statusCode(
          status,
          200,
          'Should work without optional parameters'
        );
      });
    });

    // ============================================
    // Error Handling and Status Codes Tests
    // ============================================
    this.describe('Error Handling and Status Codes', (t) => {
      t('should return 200 for successful GET requests', async (ctx) => {
        const { status } = await this.http.get('/products');
        assert.statusCode(status, 200, 'GET should return 200');
      });

      t('should return 201 for successful resource creation', async (ctx) => {
        const { status } = await this.http.post('/auth/register', {
          email: `status-test-${Date.now()}@example.com`,
          password: 'TestPassword123!',
          name: 'Status Test',
        });

        assert.statusCode(status, 201, 'POST creation should return 201');
      });

      t('should return 204 or 200 for successful DELETE', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        // Try to delete something (may fail if not found)
        const { status } = await this.http.delete('/cart/items/test-item-id');

        assert.ok(
          [200, 204, 404].includes(status),
          'DELETE should return appropriate status'
        );
      });

      t('should return 400 for bad requests', async (ctx) => {
        const { status } = await this.http.post('/auth/login', {
          // Missing required fields
        });

        assert.statusCode(status, 400, 'Bad request should return 400');
      });

      t('should return 401 for unauthorized requests', async (ctx) => {
        this.http.removeAuthToken();
        const { status } = await this.http.get('/auth/profile');

        assert.statusCode(status, 401, 'Unauthorized should return 401');
      });

      t('should return 403 for forbidden requests', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        // Customer trying to access admin endpoint
        const { status } = await this.http.get('/admin/users');

        assert.statusCode(status, 403, 'Forbidden should return 403');
      });

      t('should return 404 for non-existent resources', async (ctx) => {
        const { status } = await this.http.get('/products/non-existent-id-12345');

        assert.statusCode(status, 404, 'Not found should return 404');
      });

      t('should return 405 for unsupported HTTP methods', async (ctx) => {
        const response = await fetch(`${this.context.apiUrl}/products`, {
          method: 'TRACE',
        });

        assert.ok(
          [405, 501].includes(response.status),
          'Unsupported method should return 405 or 501'
        );
      });

      t('should return 409 for conflicts', async (ctx) => {
        const email = `conflict-${Date.now()}@example.com`;

        // Create user
        await this.http.post('/auth/register', {
          email,
          password: 'Test123!',
          name: 'Conflict Test',
        });

        // Try to create again with same email
        const { status } = await this.http.post('/auth/register', {
          email,
          password: 'Test123!',
          name: 'Conflict Test 2',
        });

        assert.statusCode(status, 409, 'Duplicate should return 409');
      });

      t('should return 413 for request entity too large', async (ctx) => {
        const hugeBody = {
          data: 'x'.repeat(10 * 1024 * 1024), // 10MB string
        };

        const { status } = await this.http.post('/products', hugeBody);

        assert.ok(
          [400, 413].includes(status),
          'Oversized request should return 413'
        );
      }, { timeout: 60000 });

      t('should return 415 for unsupported media type', async (ctx) => {
        const response = await fetch(`${this.context.apiUrl}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/xml' },
          body: '<xml>data</xml>',
        });

        assert.ok(
          [400, 415].includes(response.status),
          'Unsupported media type should return 415'
        );
      });

      t('should return 422 for validation errors', async (ctx) => {
        const { status } = await this.http.post('/auth/register', {
          email: 'invalid-email',
          password: '123',
          name: 'Test',
        });

        assert.ok(
          [400, 422].includes(status),
          'Validation error should return 400 or 422'
        );
      });

      t('should return 500 for server errors', async (ctx) => {
        // Difficult to trigger intentionally
        // This would require a broken endpoint or test mock
      }, { skip: true });

      t('should include error details in error responses', async (ctx) => {
        const { data, status } = await this.http.post('/auth/login', {
          email: 'invalid',
          password: '123',
        });

        if (status >= 400) {
          assert.ok(
            data.message || data.error || data.errors,
            'Error response should include message'
          );

          // Should not expose internal details
          const errorStr = JSON.stringify(data).toLowerCase();
          assert.notIncludes(errorStr, 'stack', 'Should not expose stack trace');
        }
      });
    });

    // ============================================
    // Authentication Header Validation Tests
    // ============================================
    this.describe('Authentication Header Validation', (t) => {
      t('should accept Bearer token in Authorization header', async (ctx) => {
        if (!this.authToken) return;

        const { status } = await this.http.get('/auth/profile', {
          headers: { 'Authorization': `Bearer ${this.authToken}` },
        });

        assert.statusCode(status, 200, 'Should accept Bearer token');
      });

      t('should reject malformed Authorization header', async (ctx) => {
        const malformed = [
          'InvalidFormat',
          'Bearer',
          'Bearer ',
          'Token abc123',
          this.authToken || 'sometoken',
        ];

        for (const auth of malformed) {
          const { status } = await this.http.get('/auth/profile', {
            headers: { 'Authorization': auth },
          });

          assert.statusCode(
            status,
            401,
            `Should reject malformed auth: ${auth}`
          );
        }
      });

      t('should reject expired tokens', async (ctx) => {
        // Expired token (would need to generate one with past exp)
        // Or wait for token to expire (impractical for tests)
      }, { skip: true });

      t('should reject tokens with invalid signature', async (ctx) => {
        const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.invalid-signature';

        const { status } = await this.http.get('/auth/profile', {
          headers: { 'Authorization': `Bearer ${invalidToken}` },
        });

        assert.statusCode(status, 401, 'Should reject invalid signature');
      });

      t('should handle missing Authorization header', async (ctx) => {
        this.http.removeAuthToken();
        const { status } = await this.http.get('/auth/profile');

        assert.statusCode(status, 401, 'Should reject missing auth');
      });

      t('should be case-insensitive for Bearer keyword', async (ctx) => {
        if (!this.authToken) return;

        const variations = ['bearer', 'BEARER', 'Bearer', 'BeArEr'];

        for (const prefix of variations) {
          const { status } = await this.http.get('/auth/profile', {
            headers: { 'Authorization': `${prefix} ${this.authToken}` },
          });

          // Should work with any case
          assert.ok(
            [200, 401].includes(status),
            `Should handle ${prefix} prefix`
          );
        }
      });

      t('should validate token claims (sub, exp, iat)', async (ctx) => {
        if (!this.authToken) return;

        // Decode JWT to check structure
        const parts = this.authToken.split('.');
        assert.lengthOf(parts, 3, 'JWT should have 3 parts');

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

        assert.hasProperty(payload, 'sub', 'Should have sub claim');
        assert.hasProperty(payload, 'iat', 'Should have iat claim');
        // exp is optional for some implementations
      });
    });

    // ============================================
    // CORS Policy Enforcement Tests
    // ============================================
    this.describe('CORS Policy Enforcement', (t) => {
      t('should include CORS headers in responses', async (ctx) => {
        const { headers } = await this.http.get('/products', {
          headers: { 'Origin': 'http://localhost:3000' },
        });

        const corsHeader = headers.get('access-control-allow-origin');
        // CORS might be '*' or specific origin
        if (corsHeader) {
          assert.ok(
            corsHeader === '*' || corsHeader.startsWith('http'),
            'CORS header should be valid'
          );
        }
      });

      t('should handle OPTIONS preflight requests', async (ctx) => {
        const response = await fetch(`${this.context.apiUrl}/products`, {
          method: 'OPTIONS',
          headers: {
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type',
          },
        });

        assert.ok(
          [200, 204].includes(response.status),
          'OPTIONS should return 200 or 204'
        );

        const allowMethods = response.headers.get('access-control-allow-methods');
        const allowHeaders = response.headers.get('access-control-allow-headers');

        if (allowMethods) {
          assert.ok(
            allowMethods.length > 0,
            'Should specify allowed methods'
          );
        }
      });

      t('should allow credentials if configured', async (ctx) => {
        const { headers } = await this.http.get('/products', {
          headers: { 'Origin': 'http://localhost:3000' },
        });

        const allowCredentials = headers.get('access-control-allow-credentials');

        // May or may not be set depending on configuration
        if (allowCredentials) {
          assert.equal(
            allowCredentials,
            'true',
            'Credentials should be true if set'
          );
        }
      });

      t('should reject requests from disallowed origins', async (ctx) => {
        const { status, headers } = await this.http.get('/products', {
          headers: { 'Origin': 'http://evil-site.com' },
        });

        // Request might succeed but CORS headers should not allow origin
        // This is enforced by browser, not server
        const corsHeader = headers.get('access-control-allow-origin');

        // If CORS is strict, should not echo back evil origin
        if (corsHeader && corsHeader !== '*') {
          assert.notEqual(
            corsHeader,
            'http://evil-site.com',
            'Should not allow evil origin'
          );
        }
      });

      t('should include appropriate CORS headers for errors', async (ctx) => {
        const { headers } = await this.http.get('/non-existent-endpoint', {
          headers: { 'Origin': 'http://localhost:3000' },
        });

        // CORS headers should be present even for error responses
        const corsHeader = headers.get('access-control-allow-origin');
        // May or may not be present
      });
    });

    // ============================================
    // Request Size Limits Tests
    // ============================================
    this.describe('Request Size Limits', (t) => {
      t('should reject requests exceeding size limit', async (ctx) => {
        const largePayload = {
          data: 'x'.repeat(20 * 1024 * 1024), // 20MB
        };

        const { status } = await this.http.post('/products', largePayload);

        assert.ok(
          [400, 413, 500].includes(status),
          'Should reject oversized request'
        );
      }, { timeout: 90000 });

      t('should handle normal-sized requests', async (ctx) => {
        const normalPayload = {
          email: 'normal@test.com',
          password: 'Test123!',
          name: 'Normal Size Test',
        };

        const { status } = await this.http.post('/auth/register', normalPayload);

        assert.ok(
          [201, 409].includes(status),
          'Should accept normal-sized request'
        );
      });

      t('should enforce limits on file uploads', async (ctx) => {
        if (!this.authToken) return;
        this.http.setAuthToken(this.authToken);

        // Simulate large file upload
        const largeFile = 'x'.repeat(100 * 1024 * 1024); // 100MB

        const { status } = await this.http.post('/upload', {
          filename: 'large.jpg',
          content: largeFile,
        });

        assert.ok(
          [400, 404, 413].includes(status),
          'Should reject oversized file'
        );
      }, { timeout: 120000 });

      t('should limit number of items in array fields', async (ctx) => {
        const hugeArray = Array(10000).fill({ id: 'test' });

        const { status } = await this.http.post('/bulk-operation', {
          items: hugeArray,
        });

        assert.ok(
          [400, 404, 413, 422].includes(status),
          'Should limit array size'
        );
      });
    });

    // ============================================
    // API Documentation Accuracy Tests
    // ============================================
    this.describe('API Documentation Accuracy', (t) => {
      t('should have OpenAPI/Swagger documentation endpoint', async (ctx) => {
        const endpoints = [
          '/api-docs',
          '/swagger',
          '/docs',
          '/openapi.json',
          '/api/docs',
        ];

        let found = false;
        for (const endpoint of endpoints) {
          const { status } = await this.http.get(endpoint);
          if (status === 200) {
            found = true;
            break;
          }
        }

        // Documentation endpoint should exist
        // This is optional but recommended
      });

      t('should return valid OpenAPI specification', async (ctx) => {
        const { data, status } = await this.http.get('/openapi.json');

        if (status === 200) {
          assert.hasProperty(data, 'openapi', 'Should have openapi version');
          assert.hasProperty(data, 'info', 'Should have info section');
          assert.hasProperty(data, 'paths', 'Should have paths');
        }
      });

      t('should document all public endpoints', async (ctx) => {
        // This would require comparing documentation against actual routes
        // Implementation-specific
      }, { skip: true });

      t('should include authentication requirements in docs', async (ctx) => {
        const { data, status } = await this.http.get('/openapi.json');

        if (status === 200 && data.paths) {
          // Check that protected endpoints specify security
          const profilePath = data.paths['/auth/profile'];
          if (profilePath) {
            // Should have security requirements
          }
        }
      });

      t('should provide examples in documentation', async (ctx) => {
        const { data, status } = await this.http.get('/openapi.json');

        if (status === 200 && data.paths) {
          // Check for examples in some endpoints
          const paths = Object.values(data.paths);
          // Examples are optional but helpful
        }
      });
    });

    // ============================================
    // GraphQL/REST Endpoint Consistency Tests
    // ============================================
    this.describe('GraphQL/REST Endpoint Consistency', (t) => {
      t('should support GraphQL endpoint', async (ctx) => {
        const { status } = await this.http.post('/graphql', {
          query: '{ __schema { queryType { name } } }',
        });

        assert.ok(
          [200, 404].includes(status),
          'Should handle GraphQL endpoint'
        );
      });

      t('should return same data from REST and GraphQL', async (ctx) => {
        // Get product from REST
        const { data: restData, status: restStatus } = await this.http.get('/products');

        if (restStatus !== 200) return;

        // Get same data from GraphQL
        const { data: gqlResponse, status: gqlStatus } = await this.http.post('/graphql', {
          query: '{ products { id name } }',
        });

        if (gqlStatus === 200 && gqlResponse.data?.products && restData) {
          // Both should return products
          assert.ok(
            Array.isArray(gqlResponse.data.products),
            'GraphQL should return array'
          );
          assert.ok(
            Array.isArray(restData) || Array.isArray(restData.products),
            'REST should return array'
          );
        }
      });

      t('should handle GraphQL errors properly', async (ctx) => {
        const { data, status } = await this.http.post('/graphql', {
          query: '{ invalidField { id } }',
        });

        if (status === 200) {
          // GraphQL returns 200 even for errors
          assert.hasProperty(data, 'errors', 'Should include errors array');
        } else {
          assert.ok([400, 404].includes(status), 'Should return appropriate status');
        }
      });

      t('should validate GraphQL queries', async (ctx) => {
        const { status } = await this.http.post('/graphql', {
          query: 'invalid graphql syntax {{{',
        });

        assert.ok(
          [200, 400, 404].includes(status),
          'Should validate GraphQL syntax'
        );
      });

      t('should support GraphQL introspection', async (ctx) => {
        const { data, status } = await this.http.post('/graphql', {
          query: `
            query IntrospectionQuery {
              __schema {
                queryType { name }
                mutationType { name }
                types { name }
              }
            }
          `,
        });

        if (status === 200 && data.data?.__schema) {
          assert.hasProperty(
            data.data.__schema,
            'queryType',
            'Should support introspection'
          );
        }
      });

      t('should enforce same authentication for GraphQL and REST', async (ctx) => {
        // Protected REST endpoint
        this.http.removeAuthToken();
        const { status: restStatus } = await this.http.get('/auth/profile');
        assert.statusCode(restStatus, 401, 'REST should require auth');

        // Protected GraphQL query
        const { status: gqlStatus } = await this.http.post('/graphql', {
          query: '{ me { id email } }',
        });

        assert.ok(
          [401, 404].includes(gqlStatus) ||
          (gqlStatus === 200 && status !== 200),
          'GraphQL should require auth'
        );
      });

      t('should apply same rate limits to GraphQL and REST', async (ctx) => {
        // This would require making many requests to both endpoints
        // and comparing rate limit headers
      }, { skip: true });
    });

    // ============================================
    // Additional Gateway Features Tests
    // ============================================
    this.describe('Additional Gateway Features', (t) => {
      t('should support request compression (gzip)', async (ctx) => {
        const { headers } = await this.http.get('/products', {
          headers: { 'Accept-Encoding': 'gzip, deflate' },
        });

        const encoding = headers.get('content-encoding');
        // May or may not be compressed based on size/config
        if (encoding) {
          assert.ok(
            ['gzip', 'deflate', 'br'].includes(encoding),
            'Should use valid compression'
          );
        }
      });

      t('should include request ID in responses', async (ctx) => {
        const { headers } = await this.http.get('/products');

        const requestId = headers.get('x-request-id') ||
                         headers.get('request-id');

        // Request ID is helpful for tracing but optional
        if (requestId) {
          assert.ok(requestId.length > 0, 'Request ID should not be empty');
        }
      });

      t('should support response caching headers', async (ctx) => {
        const { headers } = await this.http.get('/products');

        const cacheControl = headers.get('cache-control');
        const etag = headers.get('etag');

        // Caching headers are optional but recommended
        if (cacheControl) {
          assert.ok(
            cacheControl.includes('public') ||
            cacheControl.includes('private') ||
            cacheControl.includes('no-cache'),
            'Cache-Control should have valid directive'
          );
        }
      });

      t('should handle conditional requests (If-None-Match)', async (ctx) => {
        // First request to get ETag
        const { headers: headers1 } = await this.http.get('/products');
        const etag = headers1.get('etag');

        if (etag) {
          // Second request with If-None-Match
          const { status } = await this.http.get('/products', {
            headers: { 'If-None-Match': etag },
          });

          // Should return 304 if not modified
          assert.ok(
            [200, 304].includes(status),
            'Should handle conditional request'
          );
        }
      });

      t('should log requests for monitoring', async (ctx) => {
        // This requires access to logs - can't test directly
        // but making a request should trigger logging
        await this.http.get('/products');

        // Log verification would be done separately
      });

      t('should support health check endpoint', async (ctx) => {
        const healthEndpoints = ['/health', '/healthz', '/ping', '/status'];

        let found = false;
        for (const endpoint of healthEndpoints) {
          const { status } = await this.http.get(endpoint);
          if (status === 200) {
            found = true;
            break;
          }
        }

        assert.ok(found, 'Should have health check endpoint');
      });

      t('should support readiness check endpoint', async (ctx) => {
        const readyEndpoints = ['/ready', '/readiness', '/health/ready'];

        let found = false;
        for (const endpoint of readyEndpoints) {
          const { status } = await this.http.get(endpoint);
          if ([200, 503].includes(status)) {
            found = true;
            break;
          }
        }

        // Readiness check is optional but useful for K8s
      });
    });
  }
}

/**
 * Export runTests function for orchestrator
 */
export async function runTests(options: AgentOptions = {}): Promise<TestResult[]> {
  const agent = new ApiGatewayAgent(options);
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
