/**
 * k6 Performance Load Test
 *
 * Comprehensive load test for the API.
 * Simulates realistic user traffic patterns.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const successRate = new Rate('success');
const loginAttempts = new Counter('login_attempts');
const productViews = new Counter('product_views');
const cartOperations = new Counter('cart_operations');

// Response time trends per endpoint
const healthCheckTrend = new Trend('health_check_ms', true);
const productsListTrend = new Trend('products_list_ms', true);
const productDetailTrend = new Trend('product_detail_ms', true);
const authTrend = new Trend('auth_ms', true);
const cartTrend = new Trend('cart_ms', true);
const searchTrend = new Trend('search_ms', true);

// Configuration
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:4000';

export const options = {
  // Load test stages
  stages: [
    { duration: '2m', target: 20 },   // Ramp up to 20 users
    { duration: '5m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '3m', target: 100 },  // Peak load
    { duration: '5m', target: 100 },  // Stay at peak
    { duration: '3m', target: 50 },   // Ramp down
    { duration: '2m', target: 0 },    // Ramp down to 0
  ],

  // Thresholds
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    errors: ['rate<0.05'],
    success: ['rate>0.95'],
    health_check_ms: ['p(95)<200'],
    products_list_ms: ['p(95)<1000'],
    product_detail_ms: ['p(95)<500'],
    auth_ms: ['p(95)<1000'],
    cart_ms: ['p(95)<800'],
    search_ms: ['p(95)<1500'],
  },

  // Tags for better filtering
  tags: {
    testType: 'load',
    environment: __ENV.ENVIRONMENT || 'test',
  },
};

// Scenario weights (percentage of total traffic)
const SCENARIOS = {
  browsing: 0.50,    // 50% browse products
  searching: 0.20,   // 20% search
  authenticated: 0.20, // 20% logged-in user actions
  checkout: 0.10,    // 10% checkout flow
};

export default function () {
  const scenario = selectScenario();

  switch (scenario) {
    case 'browsing':
      browsingScenario();
      break;
    case 'searching':
      searchingScenario();
      break;
    case 'authenticated':
      authenticatedScenario();
      break;
    case 'checkout':
      checkoutScenario();
      break;
  }

  sleep(randomIntBetween(1, 3));
}

function selectScenario() {
  const rand = Math.random();
  let cumulative = 0;

  for (const [scenario, weight] of Object.entries(SCENARIOS)) {
    cumulative += weight;
    if (rand < cumulative) {
      return scenario;
    }
  }

  return 'browsing';
}

function browsingScenario() {
  group('Browsing Flow', function () {
    // 1. Check health (represents homepage load)
    const healthRes = http.get(`${BASE_URL}/api/health`);
    healthCheckTrend.add(healthRes.timings.duration);
    recordResult(healthRes.status === 200);

    sleep(randomIntBetween(1, 2));

    // 2. Get products list
    const productsRes = http.get(`${BASE_URL}/api/products?limit=20`);
    productsListTrend.add(productsRes.timings.duration);
    productViews.add(1);

    const productsSuccess = check(productsRes, {
      'products status 200': (r) => r.status === 200,
      'products has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          const products = Array.isArray(body) ? body : body.data;
          return products && products.length > 0;
        } catch (e) {
          return false;
        }
      },
    });
    recordResult(productsSuccess);

    sleep(randomIntBetween(2, 4));

    // 3. View a product detail
    if (productsRes.status === 200) {
      try {
        const body = JSON.parse(productsRes.body);
        const products = Array.isArray(body) ? body : body.data;
        if (products && products.length > 0) {
          const randomProduct = products[randomIntBetween(0, products.length - 1)];
          const detailRes = http.get(`${BASE_URL}/api/products/${randomProduct.id}`);
          productDetailTrend.add(detailRes.timings.duration);
          productViews.add(1);

          recordResult(detailRes.status === 200);
        }
      } catch (e) {
        // Ignore
      }
    }

    sleep(randomIntBetween(2, 5));

    // 4. Get categories
    const categoriesRes = http.get(`${BASE_URL}/api/categories`);
    recordResult(categoriesRes.status === 200);
  });
}

function searchingScenario() {
  group('Search Flow', function () {
    const searchTerms = ['shirt', 'phone', 'laptop', 'watch', 'bag', 'shoes', 'camera'];
    const term = searchTerms[randomIntBetween(0, searchTerms.length - 1)];

    // Search for products
    const searchRes = http.get(`${BASE_URL}/api/search?q=${term}`);

    // Fallback to products endpoint with search param
    if (searchRes.status === 404) {
      const altRes = http.get(`${BASE_URL}/api/products?search=${term}`);
      searchTrend.add(altRes.timings.duration);
      recordResult(altRes.status === 200);
    } else {
      searchTrend.add(searchRes.timings.duration);
      recordResult(searchRes.status === 200);
    }

    sleep(randomIntBetween(1, 3));

    // Filter by price range
    const priceRes = http.get(
      `${BASE_URL}/api/products?minPrice=${randomIntBetween(10, 50)}&maxPrice=${randomIntBetween(100, 500)}`
    );
    recordResult(priceRes.status === 200);

    sleep(randomIntBetween(2, 4));

    // Sort by price
    const sortRes = http.get(`${BASE_URL}/api/products?sort=price&order=asc&limit=10`);
    recordResult(sortRes.status === 200);
  });
}

function authenticatedScenario() {
  group('Authenticated User Flow', function () {
    // Login
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        email: 'customer@broxiva.com',
        password: 'password123',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    loginAttempts.add(1);
    authTrend.add(loginRes.timings.duration);

    if (loginRes.status !== 200) {
      recordResult(false);
      return;
    }

    let token;
    try {
      const body = JSON.parse(loginRes.body);
      token = body.accessToken;
    } catch (e) {
      recordResult(false);
      return;
    }

    recordResult(true);
    sleep(1);

    // Get user profile
    const profileRes = http.get(`${BASE_URL}/api/users/me`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    recordResult(profileRes.status === 200);

    sleep(randomIntBetween(1, 2));

    // Get cart
    const cartRes = http.get(`${BASE_URL}/api/cart`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    cartTrend.add(cartRes.timings.duration);
    cartOperations.add(1);
    recordResult(cartRes.status === 200);

    sleep(randomIntBetween(2, 4));

    // Browse products
    const productsRes = http.get(`${BASE_URL}/api/products?limit=10`);
    recordResult(productsRes.status === 200);

    // Add to cart
    if (productsRes.status === 200) {
      try {
        const body = JSON.parse(productsRes.body);
        const products = Array.isArray(body) ? body : body.data;
        if (products && products.length > 0) {
          const randomProduct = products[randomIntBetween(0, products.length - 1)];

          const addCartRes = http.post(
            `${BASE_URL}/api/cart/items`,
            JSON.stringify({
              productId: randomProduct.id,
              quantity: 1,
            }),
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            }
          );
          cartTrend.add(addCartRes.timings.duration);
          cartOperations.add(1);
          recordResult([200, 201].includes(addCartRes.status));
        }
      } catch (e) {
        // Ignore
      }
    }
  });
}

function checkoutScenario() {
  group('Checkout Flow', function () {
    // Login
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        email: 'customer@broxiva.com',
        password: 'password123',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    loginAttempts.add(1);
    authTrend.add(loginRes.timings.duration);

    if (loginRes.status !== 200) {
      recordResult(false);
      return;
    }

    let token;
    try {
      token = JSON.parse(loginRes.body).accessToken;
    } catch (e) {
      recordResult(false);
      return;
    }

    recordResult(true);
    sleep(1);

    // Get products
    const productsRes = http.get(`${BASE_URL}/api/products?limit=5`);
    if (productsRes.status !== 200) {
      recordResult(false);
      return;
    }

    recordResult(true);

    // Add product to cart
    try {
      const products = JSON.parse(productsRes.body);
      const productList = Array.isArray(products) ? products : products.data;

      if (productList && productList.length > 0) {
        const product = productList[0];

        const addRes = http.post(
          `${BASE_URL}/api/cart/items`,
          JSON.stringify({
            productId: product.id,
            quantity: randomIntBetween(1, 3),
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        cartTrend.add(addRes.timings.duration);
        cartOperations.add(1);
        recordResult([200, 201].includes(addRes.status));
      }
    } catch (e) {
      // Ignore
    }

    sleep(randomIntBetween(2, 4));

    // Get cart
    const cartRes = http.get(`${BASE_URL}/api/cart`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    cartTrend.add(cartRes.timings.duration);
    cartOperations.add(1);
    recordResult(cartRes.status === 200);

    sleep(1);

    // Checkout estimate (if endpoint exists)
    const estimateRes = http.post(
      `${BASE_URL}/api/checkout/estimate`,
      JSON.stringify({
        shippingAddress: {
          country: 'US',
          state: 'CA',
          city: 'San Francisco',
          zipCode: '94102',
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Don't fail if endpoint doesn't exist
    if (estimateRes.status !== 404) {
      recordResult(estimateRes.status === 200);
    }
  });
}

function recordResult(success) {
  successRate.add(success);
  errorRate.add(!success);
}

export function handleSummary(data) {
  return {
    'tests/perf/results/load-summary.json': JSON.stringify(data, null, 2),
    stdout: generateTextSummary(data),
  };
}

function generateTextSummary(data) {
  const metrics = data.metrics;
  const checks = data.root_group?.checks || {};

  return `
================================================================================
                          LOAD TEST SUMMARY
================================================================================

Test Duration: ${Math.round((data.state?.testRunDurationMs || 0) / 1000 / 60)} minutes
Total Requests: ${metrics.http_reqs?.values?.count || 0}
Virtual Users (Peak): ${metrics.vus_max?.values?.max || 0}

Overall Performance:
  - Success Rate: ${((metrics.success?.values?.rate || 0) * 100).toFixed(2)}%
  - Error Rate: ${((metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%
  - Requests/sec: ${(metrics.http_reqs?.values?.rate || 0).toFixed(2)}

Response Times (ms):
  - p50: ${Math.round(metrics.http_req_duration?.values?.med || 0)}
  - p90: ${Math.round(metrics.http_req_duration?.values['p(90)'] || 0)}
  - p95: ${Math.round(metrics.http_req_duration?.values['p(95)'] || 0)}
  - p99: ${Math.round(metrics.http_req_duration?.values['p(99)'] || 0)}
  - max: ${Math.round(metrics.http_req_duration?.values?.max || 0)}

Endpoint Performance (p95 ms):
  - Health Check: ${Math.round(metrics.health_check_ms?.values['p(95)'] || 0)}
  - Products List: ${Math.round(metrics.products_list_ms?.values['p(95)'] || 0)}
  - Product Detail: ${Math.round(metrics.product_detail_ms?.values['p(95)'] || 0)}
  - Authentication: ${Math.round(metrics.auth_ms?.values['p(95)'] || 0)}
  - Cart Operations: ${Math.round(metrics.cart_ms?.values['p(95)'] || 0)}
  - Search: ${Math.round(metrics.search_ms?.values['p(95)'] || 0)}

Operations:
  - Login Attempts: ${metrics.login_attempts?.values?.count || 0}
  - Product Views: ${metrics.product_views?.values?.count || 0}
  - Cart Operations: ${metrics.cart_operations?.values?.count || 0}

Threshold Results:
  - http_req_duration p(95)<1000ms: ${(metrics.http_req_duration?.values['p(95)'] || 0) < 1000 ? 'PASS' : 'FAIL'}
  - http_req_duration p(99)<2000ms: ${(metrics.http_req_duration?.values['p(99)'] || 0) < 2000 ? 'PASS' : 'FAIL'}
  - errors rate<5%: ${(metrics.errors?.values?.rate || 0) < 0.05 ? 'PASS' : 'FAIL'}
  - success rate>95%: ${(metrics.success?.values?.rate || 0) > 0.95 ? 'PASS' : 'FAIL'}

================================================================================
`;
}
