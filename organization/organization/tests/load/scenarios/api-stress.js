/**
 * API Stress Test Scenario
 *
 * Comprehensive stress testing for all major API endpoints:
 * - Tests system behavior under extreme load
 * - Identifies breaking points
 * - Validates error handling and recovery
 * - Tests rate limiting and throttling
 * - Validates caching mechanisms
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import {
  API_URL,
  testData,
  testUsers,
  testProducts,
  helpers,
  tags,
  defaultOptions,
  scenarios,
  thresholds,
} from '../k6-config.js';

// Custom metrics
const errorRate = new Rate('error_rate');
const rateLimitHits = new Counter('rate_limit_hits');
const serverErrors = new Counter('server_errors');
const timeouts = new Counter('timeouts');
const successfulRequests = new Counter('successful_requests');
const cachedResponses = new Counter('cached_responses');

// Test configuration - Using stress scenario
export const options = {
  scenarios: {
    api_stress: scenarios.stress,
  },
  thresholds: {
    ...thresholds,
    'error_rate': ['rate<0.10'], // Less than 10% errors under stress
    'http_req_failed': ['rate<0.10'],
    'http_req_duration': ['p(95)<2000'], // Relaxed threshold for stress test
    'server_errors': ['count<100'], // Limited server errors allowed
  },
};

/**
 * Main test function - Random API endpoint testing
 */
export default function () {
  const scenario = Math.random();

  if (scenario < 0.15) {
    // 15% - Authentication endpoints
    stressAuthEndpoints();
  } else if (scenario < 0.30) {
    // 15% - Product endpoints
    stressProductEndpoints();
  } else if (scenario < 0.45) {
    // 15% - Cart endpoints
    stressCartEndpoints();
  } else if (scenario < 0.60) {
    // 15% - Order endpoints
    stressOrderEndpoints();
  } else if (scenario < 0.75) {
    // 15% - Search endpoints
    stressSearchEndpoints();
  } else if (scenario < 0.85) {
    // 10% - User profile endpoints
    stressUserEndpoints();
  } else {
    // 15% - Mixed random endpoints
    stressMixedEndpoints();
  }

  // Minimal sleep to create stress
  sleep(Math.random() * 0.5);
}

/**
 * Stress test authentication endpoints
 */
function stressAuthEndpoints() {
  const endpoints = [
    () => testLogin(),
    () => testRegister(),
    () => testRefreshToken(),
    () => testLogout(),
  ];

  const test = helpers.randomItem(endpoints);
  test();
}

/**
 * Test login under stress
 */
function testLogin() {
  const user = helpers.randomItem(testUsers);
  const url = `${API_URL}/auth/login`;

  const payload = JSON.stringify({
    email: user.email,
    password: user.password,
  });

  const params = {
    ...defaultOptions,
    tags: { ...tags.endpoint('login'), stress: 'true' },
  };

  const response = http.post(url, payload, params);
  validateResponse(response, 'login', [200, 201]);
}

/**
 * Test registration under stress
 */
function testRegister() {
  const user = testData.randomUser();
  const url = `${API_URL}/auth/register`;

  const payload = JSON.stringify({
    email: user.email,
    password: user.password,
    firstName: user.firstName,
    lastName: user.lastName,
  });

  const params = {
    ...defaultOptions,
    tags: { ...tags.endpoint('register'), stress: 'true' },
  };

  const response = http.post(url, payload, params);
  validateResponse(response, 'register', [201, 400, 409]); // Allow conflicts under stress
}

/**
 * Test token refresh under stress
 */
function testRefreshToken() {
  const url = `${API_URL}/auth/refresh`;

  const payload = JSON.stringify({
    refreshToken: 'mock_refresh_token_' + Date.now(),
  });

  const params = {
    ...defaultOptions,
    tags: { ...tags.endpoint('refresh'), stress: 'true' },
  };

  const response = http.post(url, payload, params);
  validateResponse(response, 'refresh', [200, 401]); // Expect some failures with mock tokens
}

/**
 * Test logout under stress
 */
function testLogout() {
  const url = `${API_URL}/auth/logout`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer mock_token_${Date.now()}`,
    },
    tags: { ...tags.endpoint('logout'), stress: 'true' },
  };

  const response = http.post(url, null, params);
  validateResponse(response, 'logout', [200, 204, 401]);
}

/**
 * Stress test product endpoints
 */
function stressProductEndpoints() {
  const endpoints = [
    () => testProductList(),
    () => testProductDetail(),
    () => testProductSearch(),
    () => testProductCategories(),
  ];

  const test = helpers.randomItem(endpoints);
  test();
}

/**
 * Test product list under stress
 */
function testProductList() {
  const page = Math.floor(Math.random() * 10) + 1;
  const limit = [10, 20, 50, 100][Math.floor(Math.random() * 4)];
  const url = `${API_URL}/products?page=${page}&limit=${limit}`;

  const params = {
    ...defaultOptions,
    tags: { ...tags.endpoint('product_list'), stress: 'true' },
  };

  const response = http.get(url, params);
  validateResponse(response, 'product_list', [200]);

  // Check for cache headers
  if (response.headers['X-Cache-Hit'] || response.headers['x-cache-hit']) {
    cachedResponses.add(1);
  }
}

/**
 * Test product detail under stress
 */
function testProductDetail() {
  const productId = helpers.randomItem(testProducts);
  const url = `${API_URL}/products/${productId}`;

  const params = {
    ...defaultOptions,
    tags: { ...tags.endpoint('product_detail'), stress: 'true' },
  };

  const response = http.get(url, params);
  validateResponse(response, 'product_detail', [200, 404]);

  if (response.headers['X-Cache-Hit'] || response.headers['x-cache-hit']) {
    cachedResponses.add(1);
  }
}

/**
 * Test product search under stress
 */
function testProductSearch() {
  const query = testData.randomSearchTerm();
  const url = `${API_URL}/products/search?q=${encodeURIComponent(query)}`;

  const params = {
    ...defaultOptions,
    tags: { ...tags.endpoint('search'), stress: 'true' },
  };

  const response = http.get(url, params);
  validateResponse(response, 'search', [200]);
}

/**
 * Test categories under stress
 */
function testProductCategories() {
  const url = `${API_URL}/categories`;

  const params = {
    ...defaultOptions,
    tags: { ...tags.endpoint('categories'), stress: 'true' },
  };

  const response = http.get(url, params);
  validateResponse(response, 'categories', [200]);

  if (response.headers['X-Cache-Hit'] || response.headers['x-cache-hit']) {
    cachedResponses.add(1);
  }
}

/**
 * Stress test cart endpoints
 */
function stressCartEndpoints() {
  const accessToken = `Bearer mock_token_${Date.now()}`;

  const endpoints = [
    () => testGetCart(accessToken),
    () => testAddToCart(accessToken),
    () => testUpdateCart(accessToken),
    () => testRemoveFromCart(accessToken),
  ];

  const test = helpers.randomItem(endpoints);
  test();
}

/**
 * Test get cart under stress
 */
function testGetCart(accessToken) {
  const url = `${API_URL}/cart`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': accessToken,
    },
    tags: { ...tags.endpoint('get_cart'), stress: 'true' },
  };

  const response = http.get(url, params);
  validateResponse(response, 'get_cart', [200, 401]);
}

/**
 * Test add to cart under stress
 */
function testAddToCart(accessToken) {
  const url = `${API_URL}/cart/items`;

  const payload = JSON.stringify({
    productId: helpers.randomItem(testProducts),
    quantity: testData.randomQuantity(),
  });

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': accessToken,
    },
    tags: { ...tags.endpoint('add_to_cart'), stress: 'true' },
  };

  const response = http.post(url, payload, params);
  validateResponse(response, 'add_to_cart', [200, 201, 401, 404]);
}

/**
 * Test update cart under stress
 */
function testUpdateCart(accessToken) {
  const productId = helpers.randomItem(testProducts);
  const url = `${API_URL}/cart/items/${productId}`;

  const payload = JSON.stringify({
    quantity: testData.randomQuantity(),
  });

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': accessToken,
    },
    tags: { ...tags.endpoint('update_cart'), stress: 'true' },
  };

  const response = http.put(url, payload, params);
  validateResponse(response, 'update_cart', [200, 401, 404]);
}

/**
 * Test remove from cart under stress
 */
function testRemoveFromCart(accessToken) {
  const productId = helpers.randomItem(testProducts);
  const url = `${API_URL}/cart/items/${productId}`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': accessToken,
    },
    tags: { ...tags.endpoint('remove_from_cart'), stress: 'true' },
  };

  const response = http.del(url, null, params);
  validateResponse(response, 'remove_from_cart', [200, 204, 401, 404]);
}

/**
 * Stress test order endpoints
 */
function stressOrderEndpoints() {
  const accessToken = `Bearer mock_token_${Date.now()}`;

  const endpoints = [
    () => testGetOrders(accessToken),
    () => testGetOrderDetail(accessToken),
    () => testCreateOrder(accessToken),
  ];

  const test = helpers.randomItem(endpoints);
  test();
}

/**
 * Test get orders under stress
 */
function testGetOrders(accessToken) {
  const url = `${API_URL}/orders`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': accessToken,
    },
    tags: { ...tags.endpoint('get_orders'), stress: 'true' },
  };

  const response = http.get(url, params);
  validateResponse(response, 'get_orders', [200, 401]);
}

/**
 * Test get order detail under stress
 */
function testGetOrderDetail(accessToken) {
  const orderId = Math.floor(Math.random() * 1000) + 1;
  const url = `${API_URL}/orders/${orderId}`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': accessToken,
    },
    tags: { ...tags.endpoint('get_order_detail'), stress: 'true' },
  };

  const response = http.get(url, params);
  validateResponse(response, 'get_order_detail', [200, 401, 404]);
}

/**
 * Test create order under stress
 */
function testCreateOrder(accessToken) {
  const url = `${API_URL}/checkout/order`;

  const payload = JSON.stringify({
    shippingMethodId: 1,
    paymentMethodId: 'pm_test',
  });

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': accessToken,
    },
    tags: { ...tags.endpoint('create_order'), stress: 'true', ...tags.critical },
  };

  const response = http.post(url, payload, params);
  validateResponse(response, 'create_order', [200, 201, 400, 401]);
}

/**
 * Stress test search endpoints
 */
function stressSearchEndpoints() {
  const query = testData.randomSearchTerm();
  const url = `${API_URL}/products/search?q=${encodeURIComponent(query)}&limit=50`;

  const params = {
    ...defaultOptions,
    tags: { ...tags.endpoint('search'), stress: 'true' },
  };

  const response = http.get(url, params);
  validateResponse(response, 'search', [200]);
}

/**
 * Stress test user endpoints
 */
function stressUserEndpoints() {
  const accessToken = `Bearer mock_token_${Date.now()}`;

  const endpoints = [
    () => testGetProfile(accessToken),
    () => testUpdateProfile(accessToken),
    () => testGetAddresses(accessToken),
  ];

  const test = helpers.randomItem(endpoints);
  test();
}

/**
 * Test get profile under stress
 */
function testGetProfile(accessToken) {
  const url = `${API_URL}/users/profile`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': accessToken,
    },
    tags: { ...tags.endpoint('get_profile'), stress: 'true' },
  };

  const response = http.get(url, params);
  validateResponse(response, 'get_profile', [200, 401]);
}

/**
 * Test update profile under stress
 */
function testUpdateProfile(accessToken) {
  const url = `${API_URL}/users/profile`;

  const payload = JSON.stringify({
    firstName: 'Stress',
    lastName: 'Test',
  });

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': accessToken,
    },
    tags: { ...tags.endpoint('update_profile'), stress: 'true' },
  };

  const response = http.put(url, payload, params);
  validateResponse(response, 'update_profile', [200, 401]);
}

/**
 * Test get addresses under stress
 */
function testGetAddresses(accessToken) {
  const url = `${API_URL}/users/addresses`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': accessToken,
    },
    tags: { ...tags.endpoint('get_addresses'), stress: 'true' },
  };

  const response = http.get(url, params);
  validateResponse(response, 'get_addresses', [200, 401]);
}

/**
 * Stress test mixed endpoints
 */
function stressMixedEndpoints() {
  // Rapidly hit multiple endpoints in sequence
  const accessToken = `Bearer mock_token_${Date.now()}`;

  testProductList();
  testProductDetail();
  testGetCart(accessToken);
  testProductSearch();
}

/**
 * Validate response and record metrics
 */
function validateResponse(response, endpoint, expectedStatuses = [200]) {
  const isExpected = expectedStatuses.includes(response.status);
  const isSuccess = response.status >= 200 && response.status < 300;
  const isRateLimited = response.status === 429;
  const isServerError = response.status >= 500;
  const isTimeout = response.timings.duration > defaultOptions.timeout;

  check(response, {
    [`${endpoint}: expected status`]: () => isExpected,
    [`${endpoint}: not timeout`]: () => !isTimeout,
  });

  if (isSuccess) {
    successfulRequests.add(1);
    errorRate.add(0);
  } else {
    errorRate.add(1);

    if (isRateLimited) {
      rateLimitHits.add(1);
    }

    if (isServerError) {
      serverErrors.add(1);
      console.error(`Server error on ${endpoint}: ${response.status} - ${response.body}`);
    }

    if (isTimeout) {
      timeouts.add(1);
    }
  }
}

/**
 * Setup function
 */
export function setup() {
  console.log('Starting API Stress Test');
  console.log(`API URL: ${API_URL}`);
  console.log('This test will push the system to its limits');
  console.log('Monitor server resources during this test');
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('API Stress Test completed');
  console.log('Review metrics for system performance under stress');
}
