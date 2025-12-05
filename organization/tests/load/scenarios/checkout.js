/**
 * Checkout Flow Load Test Scenario
 *
 * Tests the complete checkout process including:
 * - Cart management (add/update/remove items)
 * - Shipping address management
 * - Payment method selection
 * - Order placement
 * - Coupon application
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
const checkoutSuccessRate = new Rate('checkout_success_rate');
const checkoutDuration = new Trend('checkout_complete_duration');
const cartOperations = new Counter('cart_operations');
const orderCreated = new Counter('orders_created');
const paymentProcessed = new Counter('payments_processed');

// Test configuration
export const options = {
  scenarios: {
    checkout_load: scenarios.load,
  },
  thresholds: {
    ...thresholds,
    'http_req_duration{endpoint:add_to_cart}': ['p(95)<600'],
    'http_req_duration{endpoint:checkout}': ['p(95)<1500'],
    'http_req_duration{endpoint:create_order}': ['p(95)<2000'],
    'checkout_success_rate': ['rate>0.90'], // 90% checkout success rate
    'orders_created': ['count>0'],
  },
};

/**
 * Main test function - simulates complete checkout flow
 */
export default function () {
  // Login first
  const tokens = login();
  if (!tokens) {
    console.error('Login failed, skipping checkout test');
    return;
  }

  sleep(1);

  // Simulate shopping behavior
  const cart = shoppingFlow(tokens.accessToken);
  if (!cart) {
    console.error('Shopping flow failed');
    return;
  }

  sleep(2);

  // Proceed to checkout
  const checkoutStartTime = Date.now();
  const order = checkoutFlow(tokens.accessToken, cart);

  if (order) {
    const checkoutTime = Date.now() - checkoutStartTime;
    checkoutDuration.add(checkoutTime);
    checkoutSuccessRate.add(1);
    orderCreated.add(1);
  } else {
    checkoutSuccessRate.add(0);
  }

  // User thinks about next action
  sleep(Math.random() * 3 + 2);
}

/**
 * Login helper
 */
function login() {
  const user = helpers.randomItem(testUsers);
  const url = `${API_URL}/auth/login`;

  const payload = JSON.stringify({
    email: user.email,
    password: user.password,
  });

  const response = http.post(url, payload, defaultOptions);

  if (response.status === 200 || response.status === 201) {
    const body = helpers.parseJSON(response);
    return {
      accessToken: body.accessToken || body.access_token,
      refreshToken: body.refreshToken || body.refresh_token,
    };
  }

  return null;
}

/**
 * Shopping flow - browse and add items to cart
 */
function shoppingFlow(accessToken) {
  const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
  const cartItems = [];

  for (let i = 0; i < numItems; i++) {
    const product = addProductToCart(accessToken);
    if (product) {
      cartItems.push(product);
    }
    sleep(Math.random() * 2 + 1);
  }

  // View cart
  const cart = viewCart(accessToken);

  // Random chance to update or remove items
  if (Math.random() > 0.7 && cartItems.length > 0) {
    updateCartItem(accessToken, cartItems[0]);
  }

  if (Math.random() > 0.9 && cartItems.length > 1) {
    removeFromCart(accessToken, cartItems[cartItems.length - 1]);
  }

  // Apply coupon (random chance)
  if (Math.random() > 0.7) {
    applyCoupon(accessToken, 'LOAD10');
  }

  return cart;
}

/**
 * Add product to cart
 */
function addProductToCart(accessToken) {
  const productId = helpers.randomItem(testProducts);
  const quantity = testData.randomQuantity();
  const url = `${API_URL}/cart/items`;

  const payload = JSON.stringify({
    productId: productId,
    quantity: quantity,
  });

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: tags.endpoint('add_to_cart'),
  };

  const response = http.post(url, payload, params);

  const success = check(response, {
    'add_to_cart: status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'add_to_cart: has cart data': (r) => {
      const body = helpers.parseJSON(r);
      return body && body.items;
    },
    'add_to_cart: response time < 600ms': (r) => r.timings.duration < 600,
  });

  if (success) {
    cartOperations.add(1);
    return { productId, quantity };
  }

  return null;
}

/**
 * View cart
 */
function viewCart(accessToken) {
  const url = `${API_URL}/cart`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: tags.endpoint('view_cart'),
  };

  const response = http.get(url, params);

  check(response, {
    'view_cart: status is 200': (r) => r.status === 200,
    'view_cart: has items': (r) => {
      const body = helpers.parseJSON(r);
      return body && body.items;
    },
    'view_cart: has total': (r) => {
      const body = helpers.parseJSON(r);
      return body && typeof body.total !== 'undefined';
    },
  });

  return helpers.parseJSON(response);
}

/**
 * Update cart item quantity
 */
function updateCartItem(accessToken, item) {
  const url = `${API_URL}/cart/items/${item.productId}`;
  const newQuantity = testData.randomQuantity();

  const payload = JSON.stringify({
    quantity: newQuantity,
  });

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: tags.endpoint('update_cart'),
  };

  const response = http.put(url, payload, params);

  check(response, {
    'update_cart: status is 200': (r) => r.status === 200,
    'update_cart: response time < 500ms': (r) => r.timings.duration < 500,
  });

  cartOperations.add(1);
}

/**
 * Remove item from cart
 */
function removeFromCart(accessToken, item) {
  const url = `${API_URL}/cart/items/${item.productId}`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: tags.endpoint('remove_from_cart'),
  };

  const response = http.del(url, null, params);

  check(response, {
    'remove_from_cart: status is 200 or 204': (r) => r.status === 200 || r.status === 204,
    'remove_from_cart: response time < 500ms': (r) => r.timings.duration < 500,
  });

  cartOperations.add(1);
}

/**
 * Apply coupon code
 */
function applyCoupon(accessToken, couponCode) {
  const url = `${API_URL}/cart/coupon`;

  const payload = JSON.stringify({
    code: couponCode,
  });

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: tags.endpoint('apply_coupon'),
  };

  const response = http.post(url, payload, params);

  check(response, {
    'apply_coupon: status is 200 or 404': (r) => r.status === 200 || r.status === 404, // 404 if invalid
    'apply_coupon: response time < 600ms': (r) => r.timings.duration < 600,
  });
}

/**
 * Complete checkout flow
 */
function checkoutFlow(accessToken, cart) {
  // Step 1: Get shipping options
  const shippingOptions = getShippingOptions(accessToken);
  sleep(1);

  // Step 2: Set shipping address
  setShippingAddress(accessToken);
  sleep(1);

  // Step 3: Calculate totals
  calculateTotals(accessToken);
  sleep(1);

  // Step 4: Create order
  const order = createOrder(accessToken, shippingOptions);

  if (order) {
    sleep(1);

    // Step 5: Process payment
    const payment = processPayment(accessToken, order.id);

    if (payment) {
      paymentProcessed.add(1);
      return order;
    }
  }

  return null;
}

/**
 * Get shipping options
 */
function getShippingOptions(accessToken) {
  const url = `${API_URL}/shipping/options`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: tags.endpoint('shipping_options'),
  };

  const response = http.get(url, params);

  check(response, {
    'shipping_options: status is 200': (r) => r.status === 200,
    'shipping_options: has options': (r) => {
      const body = helpers.parseJSON(r);
      return body && Array.isArray(body);
    },
  });

  const options = helpers.parseJSON(response);
  return options && options.length > 0 ? options[0] : null;
}

/**
 * Set shipping address
 */
function setShippingAddress(accessToken) {
  const url = `${API_URL}/checkout/shipping-address`;

  const payload = JSON.stringify({
    firstName: 'Load',
    lastName: 'Test',
    address1: '123 Test Street',
    city: 'Test City',
    state: 'CA',
    postalCode: '12345',
    country: 'US',
    phone: '555-0123',
  });

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: tags.endpoint('set_shipping_address'),
  };

  const response = http.post(url, payload, params);

  check(response, {
    'set_shipping_address: status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'set_shipping_address: response time < 700ms': (r) => r.timings.duration < 700,
  });
}

/**
 * Calculate order totals
 */
function calculateTotals(accessToken) {
  const url = `${API_URL}/checkout/calculate`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: tags.endpoint('calculate_totals'),
  };

  const response = http.get(url, params);

  check(response, {
    'calculate_totals: status is 200': (r) => r.status === 200,
    'calculate_totals: has subtotal': (r) => {
      const body = helpers.parseJSON(r);
      return body && typeof body.subtotal !== 'undefined';
    },
    'calculate_totals: has tax': (r) => {
      const body = helpers.parseJSON(r);
      return body && typeof body.tax !== 'undefined';
    },
    'calculate_totals: has total': (r) => {
      const body = helpers.parseJSON(r);
      return body && typeof body.total !== 'undefined';
    },
  });
}

/**
 * Create order
 */
function createOrder(accessToken, shippingOption) {
  const url = `${API_URL}/checkout/order`;

  const payload = JSON.stringify({
    shippingMethodId: shippingOption ? shippingOption.id : 1,
    paymentMethodId: 'pm_card_visa',
  });

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: { ...tags.endpoint('create_order'), ...tags.critical },
  };

  const response = http.post(url, payload, params);

  const success = check(response, {
    'create_order: status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'create_order: has order ID': (r) => {
      const body = helpers.parseJSON(r);
      return body && body.id;
    },
    'create_order: response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  return success ? helpers.parseJSON(response) : null;
}

/**
 * Process payment
 */
function processPayment(accessToken, orderId) {
  const url = `${API_URL}/payments/process`;

  const payload = JSON.stringify({
    orderId: orderId,
    paymentMethod: 'stripe',
    paymentMethodId: 'pm_card_visa',
  });

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: { ...tags.endpoint('process_payment'), ...tags.payment, ...tags.critical },
  };

  const response = http.post(url, payload, params);

  const success = check(response, {
    'process_payment: status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'process_payment: has payment confirmation': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.status || body.paymentStatus);
    },
    'process_payment: response time < 3000ms': (r) => r.timings.duration < 3000,
  });

  return success ? helpers.parseJSON(response) : null;
}

/**
 * Setup function
 */
export function setup() {
  console.log('Starting Checkout Flow Load Test');
  console.log(`API URL: ${API_URL}`);
  console.log(`Test products available: ${testProducts.length}`);
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('Checkout Flow Load Test completed');
}
