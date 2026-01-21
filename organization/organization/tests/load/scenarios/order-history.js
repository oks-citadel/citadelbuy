/**
 * Order History and Management Load Test Scenario
 *
 * Tests order-related operations including:
 * - View order history
 * - View order details
 * - Track order shipment
 * - Download invoices
 * - Cancel orders
 * - Return/refund requests
 * - Reorder items
 * - Order filtering and search
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import {
  API_URL,
  testUsers,
  helpers,
  tags,
  defaultOptions,
  scenarios,
  thresholds,
} from '../k6-config.js';

// Custom metrics
const orderListViews = new Counter('order_list_views');
const orderDetailViews = new Counter('order_detail_views');
const trackingRequests = new Counter('tracking_requests');
const invoiceDownloads = new Counter('invoice_downloads');
const cancelRequests = new Counter('cancel_requests');
const returnRequests = new Counter('return_requests');
const reorderRequests = new Counter('reorder_requests');
const orderSearches = new Counter('order_searches');
const orderListLoadTime = new Trend('order_list_load_time');
const orderDetailLoadTime = new Trend('order_detail_load_time');

// Order statuses
const orderStatuses = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

// Test configuration
export const options = {
  scenarios: {
    order_management: scenarios.load,
  },
  thresholds: {
    ...thresholds,
    'http_req_duration{endpoint:order_list}': ['p(95)<700'],
    'http_req_duration{endpoint:order_detail}': ['p(95)<600'],
    'http_req_duration{endpoint:tracking}': ['p(95)<800'],
    'http_req_duration{endpoint:invoice}': ['p(95)<1000'],
    'order_list_views': ['count>0'],
    'order_detail_views': ['count>0'],
  },
};

/**
 * Main test function - Simulates various order management patterns
 */
export default function () {
  // Login first to get access token
  const tokens = login();
  if (!tokens) {
    console.error('Login failed, skipping order management test');
    return;
  }

  sleep(1);

  const scenario = Math.random();

  if (scenario < 0.3) {
    // 30% - Browse order history
    browseOrderHistory(tokens.accessToken);
  } else if (scenario < 0.5) {
    // 20% - View specific order details
    viewOrderDetails(tokens.accessToken);
  } else if (scenario < 0.65) {
    // 15% - Track order shipment
    trackOrder(tokens.accessToken);
  } else if (scenario < 0.75) {
    // 10% - Download invoice
    downloadInvoice(tokens.accessToken);
  } else if (scenario < 0.85) {
    // 10% - Search orders
    searchOrders(tokens.accessToken);
  } else if (scenario < 0.92) {
    // 7% - Cancel order
    cancelOrder(tokens.accessToken);
  } else {
    // 8% - Request return/refund
    requestReturn(tokens.accessToken);
  }

  // User think time
  sleep(Math.random() * 2 + 1);
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
 * Browse order history
 */
function browseOrderHistory(accessToken) {
  const page = Math.floor(Math.random() * 3) + 1; // Pages 1-3
  const limit = [10, 20, 50][Math.floor(Math.random() * 3)];

  const startTime = Date.now();
  const orders = getOrderList(accessToken, page, limit);
  const loadTime = Date.now() - startTime;

  orderListLoadTime.add(loadTime);
  orderListViews.add(1);

  if (orders && orders.length > 0) {
    sleep(2);

    // View details of a few orders
    const ordersToView = Math.min(orders.length, Math.floor(Math.random() * 3) + 1);
    for (let i = 0; i < ordersToView; i++) {
      const order = orders[i];
      viewOrderDetails(accessToken, order.id);
      sleep(Math.random() * 2 + 1);
    }
  }

  // Filter by status
  if (Math.random() > 0.6) {
    sleep(1);
    const status = helpers.randomItem(orderStatuses);
    filterOrdersByStatus(accessToken, status);
  }
}

/**
 * Get order list
 */
function getOrderList(accessToken, page = 1, limit = 20) {
  const url = `${API_URL}/orders?page=${page}&limit=${limit}`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: tags.endpoint('order_list'),
  };

  const response = http.get(url, params);

  const success = check(response, {
    'order_list: status is 200': (r) => r.status === 200,
    'order_list: has orders': (r) => {
      const body = helpers.parseJSON(r);
      return body && Array.isArray(body.orders || body.data || body);
    },
    'order_list: has pagination': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.total !== undefined || body.totalPages !== undefined);
    },
    'order_list: response time < 700ms': (r) => r.timings.duration < 700,
  });

  if (success) {
    const body = helpers.parseJSON(response);
    return body.orders || body.data || body;
  }

  return [];
}

/**
 * View order details
 */
function viewOrderDetails(accessToken, orderId = null) {
  // Use provided orderId or generate random one
  const id = orderId || Math.floor(Math.random() * 1000) + 1;
  const url = `${API_URL}/orders/${id}`;

  const startTime = Date.now();

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: tags.endpoint('order_detail'),
  };

  const response = http.get(url, params);

  const loadTime = Date.now() - startTime;
  orderDetailLoadTime.add(loadTime);

  const success = check(response, {
    'order_detail: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'order_detail: has order data': (r) => {
      if (r.status === 404) return true; // 404 is acceptable
      const body = helpers.parseJSON(r);
      return body && body.id && body.status;
    },
    'order_detail: has items': (r) => {
      if (r.status === 404) return true;
      const body = helpers.parseJSON(r);
      return body && Array.isArray(body.items || body.orderItems);
    },
    'order_detail: has totals': (r) => {
      if (r.status === 404) return true;
      const body = helpers.parseJSON(r);
      return body && (body.total !== undefined || body.totalAmount !== undefined);
    },
    'order_detail: response time < 600ms': (r) => r.timings.duration < 600,
  });

  if (success && response.status === 200) {
    orderDetailViews.add(1);

    const order = helpers.parseJSON(response);

    // Additional actions on order detail page
    if (Math.random() > 0.7) {
      sleep(1);

      // Random action
      const action = Math.random();
      if (action < 0.4) {
        // Track shipment
        getOrderTracking(accessToken, id);
      } else if (action < 0.7) {
        // Download invoice
        getInvoice(accessToken, id);
      } else {
        // Reorder items
        reorderItems(accessToken, id);
      }
    }

    return order;
  }

  return null;
}

/**
 * Track order shipment
 */
function trackOrder(accessToken) {
  const orderId = Math.floor(Math.random() * 1000) + 1;
  getOrderTracking(accessToken, orderId);
}

/**
 * Get order tracking information
 */
function getOrderTracking(accessToken, orderId) {
  const url = `${API_URL}/orders/${orderId}/tracking`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: tags.endpoint('tracking'),
  };

  const response = http.get(url, params);

  const success = check(response, {
    'tracking: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'tracking: has tracking info': (r) => {
      if (r.status === 404) return true;
      const body = helpers.parseJSON(r);
      return body && (body.trackingNumber || body.status);
    },
    'tracking: has tracking events': (r) => {
      if (r.status === 404) return true;
      const body = helpers.parseJSON(r);
      return body && Array.isArray(body.events || body.trackingEvents);
    },
    'tracking: response time < 800ms': (r) => r.timings.duration < 800,
  });

  if (success && response.status === 200) {
    trackingRequests.add(1);
  }
}

/**
 * Download invoice
 */
function downloadInvoice(accessToken) {
  const orderId = Math.floor(Math.random() * 1000) + 1;
  getInvoice(accessToken, orderId);
}

/**
 * Get invoice (PDF or data)
 */
function getInvoice(accessToken, orderId) {
  const url = `${API_URL}/orders/${orderId}/invoice`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json, application/pdf',
    },
    tags: tags.endpoint('invoice'),
  };

  const response = http.get(url, params);

  const success = check(response, {
    'invoice: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'invoice: has invoice data or PDF': (r) => {
      if (r.status === 404) return true;
      return r.body && r.body.length > 0;
    },
    'invoice: response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  if (success && response.status === 200) {
    invoiceDownloads.add(1);
  }
}

/**
 * Filter orders by status
 */
function filterOrdersByStatus(accessToken, status) {
  const url = `${API_URL}/orders?status=${status}&limit=20`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: { ...tags.endpoint('order_list'), filtered: 'true' },
  };

  const response = http.get(url, params);

  check(response, {
    'order_filter: status is 200': (r) => r.status === 200,
    'order_filter: has filtered orders': (r) => {
      const body = helpers.parseJSON(r);
      return body && Array.isArray(body.orders || body.data || body);
    },
    'order_filter: response time < 700ms': (r) => r.timings.duration < 700,
  });
}

/**
 * Search orders
 */
function searchOrders(accessToken) {
  // Search by order number or product name
  const searchTerms = [
    'ORD-12345',
    'laptop',
    'phone',
    'shirt',
    'December',
    '2024',
  ];

  const query = helpers.randomItem(searchTerms);
  const url = `${API_URL}/orders/search?q=${encodeURIComponent(query)}`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: tags.endpoint('order_search'),
  };

  const response = http.get(url, params);

  const success = check(response, {
    'order_search: status is 200': (r) => r.status === 200,
    'order_search: has results': (r) => {
      const body = helpers.parseJSON(r);
      return body && Array.isArray(body.orders || body.results || body.data || body);
    },
    'order_search: response time < 800ms': (r) => r.timings.duration < 800,
  });

  if (success) {
    orderSearches.add(1);
  }
}

/**
 * Cancel order
 */
function cancelOrder(accessToken) {
  const orderId = Math.floor(Math.random() * 1000) + 1;
  const url = `${API_URL}/orders/${orderId}/cancel`;

  const payload = JSON.stringify({
    reason: 'Changed my mind',
  });

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: { ...tags.endpoint('cancel_order'), ...tags.critical },
  };

  const response = http.post(url, payload, params);

  const success = check(response, {
    'cancel_order: status is 200 or 400 or 404': (r) =>
      r.status === 200 || r.status === 400 || r.status === 404, // 400 if already shipped, 404 if not found
    'cancel_order: has response message': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.message || body.status);
    },
    'cancel_order: response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  if (success) {
    cancelRequests.add(1);
  }
}

/**
 * Request return/refund
 */
function requestReturn(accessToken) {
  const orderId = Math.floor(Math.random() * 1000) + 1;
  const url = `${API_URL}/orders/${orderId}/return`;

  const payload = JSON.stringify({
    reason: 'Product defective',
    items: [
      {
        orderItemId: 1,
        quantity: 1,
        reason: 'Defective',
      },
    ],
    refundMethod: 'original_payment',
  });

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: { ...tags.endpoint('return_order'), ...tags.critical },
  };

  const response = http.post(url, payload, params);

  const success = check(response, {
    'return_order: status is 200 or 201 or 400 or 404': (r) =>
      r.status === 200 || r.status === 201 || r.status === 400 || r.status === 404,
    'return_order: has response': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.returnId || body.message || body.status);
    },
    'return_order: response time < 1200ms': (r) => r.timings.duration < 1200,
  });

  if (success && (response.status === 200 || response.status === 201)) {
    returnRequests.add(1);
  }
}

/**
 * Reorder items from previous order
 */
function reorderItems(accessToken, orderId) {
  const url = `${API_URL}/orders/${orderId}/reorder`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: tags.endpoint('reorder'),
  };

  const response = http.post(url, null, params);

  const success = check(response, {
    'reorder: status is 200 or 201 or 404': (r) =>
      r.status === 200 || r.status === 201 || r.status === 404,
    'reorder: cart updated or order created': (r) => {
      if (r.status === 404) return true;
      const body = helpers.parseJSON(r);
      return body && (body.cartId || body.orderId || body.items);
    },
    'reorder: response time < 900ms': (r) => r.timings.duration < 900,
  });

  if (success && (response.status === 200 || response.status === 201)) {
    reorderRequests.add(1);
  }
}

/**
 * Get order statistics for user
 */
export function getOrderStatistics(accessToken) {
  const url = `${API_URL}/orders/statistics`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: tags.endpoint('order_stats'),
  };

  const response = http.get(url, params);

  check(response, {
    'order_stats: status is 200': (r) => r.status === 200,
    'order_stats: has total orders': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.totalOrders !== undefined || body.count !== undefined);
    },
    'order_stats: has total spent': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.totalSpent !== undefined || body.totalAmount !== undefined);
    },
    'order_stats: response time < 600ms': (r) => r.timings.duration < 600,
  });
}

/**
 * Get order by date range
 */
export function getOrdersByDateRange(accessToken, startDate, endDate) {
  const url = `${API_URL}/orders?startDate=${startDate}&endDate=${endDate}`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: { ...tags.endpoint('order_list'), dateRange: 'true' },
  };

  const response = http.get(url, params);

  check(response, {
    'order_date_range: status is 200': (r) => r.status === 200,
    'order_date_range: has orders': (r) => {
      const body = helpers.parseJSON(r);
      return body && Array.isArray(body.orders || body.data || body);
    },
    'order_date_range: response time < 800ms': (r) => r.timings.duration < 800,
  });
}

/**
 * Setup function
 */
export function setup() {
  console.log('Starting Order History Load Test');
  console.log(`API URL: ${API_URL}`);
  console.log('Testing order viewing, tracking, and management operations');
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('Order History Load Test completed');
  console.log('Review order management metrics and response times');
}
