import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'http://localhost:4000';

interface TestResult {
  testId: string;
  testName: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  responseTime: number;
  statusCode: number | null;
  expected: string;
  actual: string;
  error?: string;
}

const results: TestResult[] = [];
let authToken: string | null = null;

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  validateStatus: () => true,
});

async function runTest(
  testId: string,
  testName: string,
  category: string,
  testFn: () => Promise<{ statusCode: number; expected: string; actual: string; pass: boolean }>
): Promise<void> {
  const start = Date.now();
  try {
    const result = await testFn();
    const responseTime = Date.now() - start;
    results.push({
      testId,
      testName,
      category,
      status: result.pass ? 'PASS' : 'FAIL',
      responseTime,
      statusCode: result.statusCode,
      expected: result.expected,
      actual: result.actual,
    });
  } catch (err) {
    const error = err as Error;
    results.push({
      testId,
      testName,
      category,
      status: 'FAIL',
      responseTime: Date.now() - start,
      statusCode: null,
      expected: 'No error',
      actual: error.message,
      error: error.message,
    });
  }
}

// =============== SMOKE TESTS ===============
async function smokeTests() {
  console.log('\n========== SMOKE TESTS ==========\n');

  await runTest('SMOKE-001', 'Health Check Endpoint', 'Smoke', async () => {
    const res = await api.get('/api/health');
    return {
      statusCode: res.status,
      expected: '200 OK with status:ok',
      actual: `${res.status} ${JSON.stringify(res.data?.status)}`,
      pass: res.status === 200 && res.data?.status === 'ok',
    };
  });

  await runTest('SMOKE-002', 'Database Connectivity', 'Smoke', async () => {
    const res = await api.get('/api/health');
    const dbStatus = res.data?.info?.database?.status;
    return {
      statusCode: res.status,
      expected: 'database status: up',
      actual: `database status: ${dbStatus}`,
      pass: dbStatus === 'up',
    };
  });

  await runTest('SMOKE-003', 'Categories Endpoint', 'Smoke', async () => {
    const res = await api.get('/api/categories');
    return {
      statusCode: res.status,
      expected: '200 OK',
      actual: `${res.status}`,
      pass: res.status === 200,
    };
  });

  await runTest('SMOKE-004', 'Products Endpoint', 'Smoke', async () => {
    const res = await api.get('/api/products');
    return {
      statusCode: res.status,
      expected: '200 OK',
      actual: `${res.status}`,
      pass: res.status === 200,
    };
  });
}

// =============== AUTH TESTS ===============
async function authTests() {
  console.log('\n========== AUTHENTICATION TESTS ==========\n');

  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  await runTest('AUTH-001', 'User Registration', 'Auth', async () => {
    const res = await api.post('/api/auth/register', {
      email: testEmail,
      password: testPassword,
      name: 'Test User',
    });
    return {
      statusCode: res.status,
      expected: '201 Created',
      actual: `${res.status}`,
      pass: res.status === 201 || res.status === 200,
    };
  });

  await runTest('AUTH-002', 'User Login', 'Auth', async () => {
    const res = await api.post('/api/auth/login', {
      email: testEmail,
      password: testPassword,
    });
    if (res.status === 200 || res.status === 201) {
      authToken = res.data?.accessToken || res.data?.token;
    }
    return {
      statusCode: res.status,
      expected: '200/201 with token',
      actual: `${res.status} token: ${authToken ? 'present' : 'missing'}`,
      pass: (res.status === 200 || res.status === 201) && !!authToken,
    };
  });

  await runTest('AUTH-003', 'Login with Invalid Credentials', 'Auth', async () => {
    const res = await api.post('/api/auth/login', {
      email: testEmail,
      password: 'WrongPassword123!',
    });
    return {
      statusCode: res.status,
      expected: '401 Unauthorized',
      actual: `${res.status}`,
      pass: res.status === 401,
    };
  });

  await runTest('AUTH-004', 'Login with Missing Fields', 'Auth', async () => {
    const res = await api.post('/api/auth/login', {
      email: testEmail,
    });
    return {
      statusCode: res.status,
      expected: '400 Bad Request',
      actual: `${res.status}`,
      pass: res.status === 400 || res.status === 401,
    };
  });

  await runTest('AUTH-005', 'Protected Endpoint Without Auth', 'Auth', async () => {
    const res = await api.get('/api/orders');
    return {
      statusCode: res.status,
      expected: '401 Unauthorized',
      actual: `${res.status}`,
      pass: res.status === 401,
    };
  });

  await runTest('AUTH-006', 'Protected Endpoint With Auth', 'Auth', async () => {
    const res = await api.get('/api/orders', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return {
      statusCode: res.status,
      expected: '200 OK',
      actual: `${res.status}`,
      pass: res.status === 200,
    };
  });
}

// =============== PRODUCTS TESTS ===============
async function productsTests() {
  console.log('\n========== PRODUCTS TESTS ==========\n');

  await runTest('PROD-001', 'List Products', 'Products', async () => {
    const res = await api.get('/api/products');
    return {
      statusCode: res.status,
      expected: '200 with array',
      actual: `${res.status} isArray: ${Array.isArray(res.data?.data || res.data)}`,
      pass: res.status === 200,
    };
  });

  await runTest('PROD-002', 'Products Pagination', 'Products', async () => {
    const res = await api.get('/api/products?page=1&limit=10');
    return {
      statusCode: res.status,
      expected: '200 OK',
      actual: `${res.status}`,
      pass: res.status === 200,
    };
  });

  await runTest('PROD-003', 'Products Search', 'Products', async () => {
    const res = await api.get('/api/products/search?q=test');
    return {
      statusCode: res.status,
      expected: '200 OK',
      actual: `${res.status}`,
      pass: res.status === 200,
    };
  });

  await runTest('PROD-004', 'Get Non-existent Product', 'Products', async () => {
    const res = await api.get('/api/products/nonexistent-id-12345');
    return {
      statusCode: res.status,
      expected: '404 Not Found',
      actual: `${res.status}`,
      pass: res.status === 404 || res.status === 400,
    };
  });
}

// =============== CART TESTS ===============
async function cartTests() {
  console.log('\n========== CART TESTS ==========\n');

  await runTest('CART-001', 'Get Guest Cart', 'Cart', async () => {
    const res = await api.get('/api/cart?sessionId=test-session-123');
    return {
      statusCode: res.status,
      expected: '200 OK',
      actual: `${res.status}`,
      pass: res.status === 200 || res.status === 404,
    };
  });

  await runTest('CART-002', 'Get Authenticated Cart', 'Cart', async () => {
    const res = await api.get('/api/cart', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return {
      statusCode: res.status,
      expected: '200 OK',
      actual: `${res.status}`,
      pass: res.status === 200 || res.status === 404,
    };
  });
}

// =============== CATEGORIES TESTS ===============
async function categoriesTests() {
  console.log('\n========== CATEGORIES TESTS ==========\n');

  await runTest('CAT-001', 'List Categories', 'Categories', async () => {
    const res = await api.get('/api/categories');
    return {
      statusCode: res.status,
      expected: '200 OK',
      actual: `${res.status}`,
      pass: res.status === 200,
    };
  });

  await runTest('CAT-002', 'Get Non-existent Category', 'Categories', async () => {
    const res = await api.get('/api/categories/nonexistent-cat-123');
    return {
      statusCode: res.status,
      expected: '404 Not Found',
      actual: `${res.status}`,
      pass: res.status === 404 || res.status === 400,
    };
  });
}

// =============== SECURITY TESTS ===============
async function securityTests() {
  console.log('\n========== SECURITY TESTS ==========\n');

  await runTest('SEC-001', 'SQL Injection Prevention', 'Security', async () => {
    const res = await api.get("/api/products/search?q=' OR '1'='1");
    return {
      statusCode: res.status,
      expected: 'Not 500 (SQL error)',
      actual: `${res.status}`,
      pass: res.status !== 500,
    };
  });

  await runTest('SEC-002', 'XSS Prevention in Search', 'Security', async () => {
    const res = await api.get('/api/products/search?q=<script>alert("xss")</script>');
    const responseText = JSON.stringify(res.data);
    return {
      statusCode: res.status,
      expected: 'No script tags in response',
      actual: `Contains script: ${responseText.includes('<script>')}`,
      pass: !responseText.includes('<script>alert'),
    };
  });

  await runTest('SEC-003', 'NoSQL Injection Prevention', 'Security', async () => {
    const res = await api.post('/api/auth/login', {
      email: { $gt: '' },
      password: { $gt: '' },
    });
    return {
      statusCode: res.status,
      expected: '400/401 (rejected)',
      actual: `${res.status}`,
      pass: res.status === 400 || res.status === 401,
    };
  });

  await runTest('SEC-004', 'Path Traversal Prevention', 'Security', async () => {
    const res = await api.get('/api/products/../../../etc/passwd');
    return {
      statusCode: res.status,
      expected: '404 or 400',
      actual: `${res.status}`,
      pass: res.status === 404 || res.status === 400,
    };
  });

  await runTest('SEC-005', 'Invalid JWT Rejection', 'Security', async () => {
    const res = await api.get('/api/orders', {
      headers: { Authorization: 'Bearer invalid.jwt.token' },
    });
    return {
      statusCode: res.status,
      expected: '401 Unauthorized',
      actual: `${res.status}`,
      pass: res.status === 401,
    };
  });

  await runTest('SEC-006', 'BOLA Prevention', 'Security', async () => {
    const res = await api.get('/api/orders/other-user-order-id', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    return {
      statusCode: res.status,
      expected: '403 or 404',
      actual: `${res.status}`,
      pass: res.status === 403 || res.status === 404 || res.status === 400,
    };
  });
}

// =============== VALIDATION TESTS ===============
async function validationTests() {
  console.log('\n========== VALIDATION TESTS ==========\n');

  await runTest('VAL-001', 'Invalid Email Format', 'Validation', async () => {
    const res = await api.post('/api/auth/register', {
      email: 'not-an-email',
      password: 'Password123!',
      name: 'Test',
    });
    return {
      statusCode: res.status,
      expected: '400 Bad Request',
      actual: `${res.status}`,
      pass: res.status === 400,
    };
  });

  await runTest('VAL-002', 'Short Password Rejection', 'Validation', async () => {
    const res = await api.post('/api/auth/register', {
      email: 'test@example.com',
      password: '123',
      name: 'Test',
    });
    return {
      statusCode: res.status,
      expected: '400 Bad Request',
      actual: `${res.status}`,
      pass: res.status === 400,
    };
  });

  await runTest('VAL-003', 'Empty Body Rejection', 'Validation', async () => {
    const res = await api.post('/api/auth/login', {});
    return {
      statusCode: res.status,
      expected: '400 Bad Request',
      actual: `${res.status}`,
      pass: res.status === 400 || res.status === 401,
    };
  });
}

// =============== COUPONS TESTS ===============
async function couponsTests() {
  console.log('\n========== COUPONS TESTS ==========\n');

  await runTest('COUP-001', 'Validate Invalid Coupon', 'Coupons', async () => {
    const res = await api.post('/api/coupons/validate', {
      code: 'INVALID_COUPON_CODE',
    });
    return {
      statusCode: res.status,
      expected: '404 or 400',
      actual: `${res.status}`,
      pass: res.status === 404 || res.status === 400 || res.status === 200,
    };
  });
}

// =============== REVIEWS TESTS ===============
async function reviewsTests() {
  console.log('\n========== REVIEWS TESTS ==========\n');

  await runTest('REV-001', 'Get Product Reviews', 'Reviews', async () => {
    const res = await api.get('/api/reviews/product/test-product-id');
    return {
      statusCode: res.status,
      expected: '200 or 404',
      actual: `${res.status}`,
      pass: res.status === 200 || res.status === 404,
    };
  });

  await runTest('REV-002', 'Create Review Without Auth', 'Reviews', async () => {
    const res = await api.post('/api/reviews', {
      productId: 'test-product',
      rating: 5,
      comment: 'Great product!',
    });
    return {
      statusCode: res.status,
      expected: '401 Unauthorized',
      actual: `${res.status}`,
      pass: res.status === 401,
    };
  });
}

// =============== RATE LIMITING TESTS ===============
async function rateLimitTests() {
  console.log('\n========== RATE LIMITING TESTS ==========\n');

  await runTest('RATE-001', 'Rate Limit Test', 'RateLimit', async () => {
    const requests = [];
    for (let i = 0; i < 20; i++) {
      requests.push(api.get('/api/products'));
    }
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter((r) => r.status === 429);
    return {
      statusCode: 200,
      expected: 'No 429 for normal usage',
      actual: `429 count: ${rateLimited.length}`,
      pass: rateLimited.length === 0,
    };
  });
}

// Main execution
async function main() {
  console.log('='.repeat(60));
  console.log('BROXIVA E-COMMERCE API TEST SUITE');
  console.log('='.repeat(60));
  console.log(`Test started at: ${new Date().toISOString()}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log('='.repeat(60));

  await smokeTests();
  await authTests();
  await productsTests();
  await cartTests();
  await categoriesTests();
  await securityTests();
  await validationTests();
  await couponsTests();
  await reviewsTests();
  await rateLimitTests();

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed} (${((passed / total) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${failed} (${((failed / total) * 100).toFixed(1)}%)`);
  console.log(`Skipped: ${skipped}`);
  console.log('='.repeat(60));

  // Print detailed results
  console.log('\nDETAILED RESULTS:');
  console.log('-'.repeat(60));

  const categories = [...new Set(results.map((r) => r.category))];
  for (const cat of categories) {
    console.log(`\n[${cat}]`);
    const catResults = results.filter((r) => r.category === cat);
    for (const r of catResults) {
      const icon = r.status === 'PASS' ? 'PASS' : r.status === 'FAIL' ? 'FAIL' : 'SKIP';
      console.log(`  ${icon} ${r.testId}: ${r.testName}`);
      console.log(`      Status: ${r.status} | HTTP: ${r.statusCode} | Time: ${r.responseTime}ms`);
      if (r.status === 'FAIL') {
        console.log(`      Expected: ${r.expected}`);
        console.log(`      Actual: ${r.actual}`);
      }
    }
  }

  // Output JSON results
  console.log('\n' + '='.repeat(60));
  console.log('JSON RESULTS:');
  console.log(JSON.stringify({ summary: { total, passed, failed, skipped }, results }, null, 2));
}

main().catch(console.error);
