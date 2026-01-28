/**
 * k6 Performance Smoke Test
 *
 * Quick smoke test to verify API performance baseline.
 * Runs for 1 minute with 10 virtual users.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const healthCheckDuration = new Trend('health_check_duration');
const productsListDuration = new Trend('products_list_duration');
const authDuration = new Trend('auth_duration');

// Configuration
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:4000';

export const options = {
  // Smoke test configuration
  stages: [
    { duration: '30s', target: 10 }, // Ramp up to 10 users
    { duration: '1m', target: 10 },  // Stay at 10 users
    { duration: '30s', target: 0 },  // Ramp down
  ],

  // Thresholds
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be < 500ms
    errors: ['rate<0.1'],             // Error rate should be < 10%
    health_check_duration: ['p(95)<200'],
    products_list_duration: ['p(95)<1000'],
  },
};

// Test data
const testUsers = [
  { email: 'customer@broxiva.com', password: 'password123' },
];

export default function () {
  // Health check
  testHealthEndpoint();

  // Products listing
  testProductsEndpoint();

  // Categories listing
  testCategoriesEndpoint();

  // Authentication (if test user exists)
  if (Math.random() < 0.3) { // 30% of iterations test auth
    testAuthEndpoint();
  }

  sleep(1);
}

function testHealthEndpoint() {
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/api/health`);
  const duration = Date.now() - startTime;

  healthCheckDuration.add(duration);

  const success = check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 200ms': (r) => r.timings.duration < 200,
    'health check returns healthy status': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'ok' || body.status === 'healthy';
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);
}

function testProductsEndpoint() {
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/api/products?limit=10`);
  const duration = Date.now() - startTime;

  productsListDuration.add(duration);

  const success = check(response, {
    'products list status is 200': (r) => r.status === 200,
    'products list response time < 1000ms': (r) => r.timings.duration < 1000,
    'products list returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        const products = Array.isArray(body) ? body : body.data;
        return Array.isArray(products);
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);

  // If we got products, test a single product detail
  if (response.status === 200) {
    try {
      const body = JSON.parse(response.body);
      const products = Array.isArray(body) ? body : body.data;
      if (products && products.length > 0) {
        const productId = products[0].id;
        testProductDetailEndpoint(productId);
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }
}

function testProductDetailEndpoint(productId) {
  const response = http.get(`${BASE_URL}/api/products/${productId}`);

  const success = check(response, {
    'product detail status is 200': (r) => r.status === 200,
    'product detail response time < 500ms': (r) => r.timings.duration < 500,
    'product detail has id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id === productId;
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);
}

function testCategoriesEndpoint() {
  const response = http.get(`${BASE_URL}/api/categories`);

  const success = check(response, {
    'categories list status is 200': (r) => r.status === 200,
    'categories list response time < 500ms': (r) => r.timings.duration < 500,
    'categories list returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        const categories = Array.isArray(body) ? body : body.data;
        return Array.isArray(categories);
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);
}

function testAuthEndpoint() {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];

  const startTime = Date.now();
  const response = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify(user),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  const duration = Date.now() - startTime;

  authDuration.add(duration);

  const success = check(response, {
    'login status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'login response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!success);

  // If login successful, test authenticated endpoint
  if (response.status === 200) {
    try {
      const body = JSON.parse(response.body);
      if (body.accessToken) {
        testAuthenticatedEndpoint(body.accessToken);
      }
    } catch (e) {
      // Ignore
    }
  }
}

function testAuthenticatedEndpoint(token) {
  const response = http.get(`${BASE_URL}/api/users/me`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const success = check(response, {
    'user profile status is 200': (r) => r.status === 200,
    'user profile response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);
}

export function handleSummary(data) {
  return {
    'tests/perf/results/smoke-summary.json': JSON.stringify(data, null, 2),
    stdout: generateTextSummary(data),
  };
}

function generateTextSummary(data) {
  const metrics = data.metrics;

  return `
================================================================================
                          SMOKE TEST SUMMARY
================================================================================

Total Requests: ${metrics.http_reqs?.values?.count || 0}
Failed Requests: ${Math.round((metrics.errors?.values?.rate || 0) * 100)}%

Response Times (ms):
  - p50: ${Math.round(metrics.http_req_duration?.values?.med || 0)}
  - p90: ${Math.round(metrics.http_req_duration?.values['p(90)'] || 0)}
  - p95: ${Math.round(metrics.http_req_duration?.values['p(95)'] || 0)}
  - p99: ${Math.round(metrics.http_req_duration?.values['p(99)'] || 0)}

Endpoint Performance (p95):
  - Health Check: ${Math.round(metrics.health_check_duration?.values['p(95)'] || 0)}ms
  - Products List: ${Math.round(metrics.products_list_duration?.values['p(95)'] || 0)}ms
  - Authentication: ${Math.round(metrics.auth_duration?.values['p(95)'] || 0)}ms

Thresholds:
  - http_req_duration p(95)<500ms: ${data.thresholds?.http_req_duration ? 'PASS' : 'FAIL'}
  - errors rate<10%: ${data.thresholds?.errors ? 'PASS' : 'FAIL'}

================================================================================
`;
}
