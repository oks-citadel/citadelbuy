/**
 * Admin Panel Operations Load Test Scenario
 *
 * Tests administrative operations including:
 * - Admin dashboard metrics
 * - User management (list, view, update, disable)
 * - Product management (CRUD operations)
 * - Order management (view, update status, refund)
 * - Report generation
 * - System settings
 * - Analytics queries
 * - Bulk operations
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import {
  API_URL,
  testProducts,
  helpers,
  tags,
  defaultOptions,
  scenarios,
  thresholds,
} from '../k6-config.js';

// Custom metrics
const dashboardLoads = new Counter('admin_dashboard_loads');
const userManagementOps = new Counter('user_management_operations');
const productManagementOps = new Counter('product_management_operations');
const orderManagementOps = new Counter('order_management_operations');
const reportGenerations = new Counter('report_generations');
const bulkOperations = new Counter('bulk_operations');
const adminQueryDuration = new Trend('admin_query_duration');
const reportGenerationDuration = new Trend('report_generation_duration');
const adminErrorRate = new Rate('admin_error_rate');

// Admin test user (should have admin privileges)
const adminUser = {
  email: 'admin@broxiva.test',
  password: 'Admin@1234',
};

// Test configuration - Using lighter load for admin operations
export const options = {
  scenarios: {
    admin_operations: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 3 },   // Ramp up to 3 admin users
        { duration: '3m', target: 3 },   // Stay at 3 users
        { duration: '2m', target: 5 },   // Ramp up to 5 users
        { duration: '3m', target: 5 },   // Stay at 5 users
        { duration: '1m', target: 0 },   // Ramp down
      ],
    },
  },
  thresholds: {
    ...thresholds,
    'http_req_duration{endpoint:admin_dashboard}': ['p(95)<1000'],
    'http_req_duration{endpoint:admin_users}': ['p(95)<1200'],
    'http_req_duration{endpoint:admin_products}': ['p(95)<1000'],
    'http_req_duration{endpoint:admin_orders}': ['p(95)<1500'],
    'http_req_duration{endpoint:admin_reports}': ['p(95)<3000'],
    'admin_error_rate': ['rate<0.10'],
    'admin_dashboard_loads': ['count>0'],
  },
};

/**
 * Main test function - Simulates admin operations
 */
export default function () {
  // Admin login
  const adminToken = adminLogin();
  if (!adminToken) {
    console.error('Admin login failed');
    adminErrorRate.add(1);
    return;
  }

  sleep(1);

  const scenario = Math.random();

  if (scenario < 0.25) {
    // 25% - Dashboard and analytics
    loadAdminDashboard(adminToken);
  } else if (scenario < 0.45) {
    // 20% - User management operations
    performUserManagement(adminToken);
  } else if (scenario < 0.65) {
    // 20% - Product management operations
    performProductManagement(adminToken);
  } else if (scenario < 0.85) {
    // 20% - Order management operations
    performOrderManagement(adminToken);
  } else {
    // 15% - Reports and analytics
    generateReports(adminToken);
  }

  // Admin think time
  sleep(Math.random() * 3 + 2);
}

/**
 * Admin login
 */
function adminLogin() {
  const url = `${API_URL}/auth/login`;

  const payload = JSON.stringify({
    email: adminUser.email,
    password: adminUser.password,
  });

  const params = {
    ...defaultOptions,
    tags: { ...tags.endpoint('login'), userType: 'admin' },
  };

  const response = http.post(url, payload, params);

  const success = check(response, {
    'admin_login: status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'admin_login: has access token': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.accessToken || body.access_token);
    },
    'admin_login: has admin role': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.role === 'admin' || body.isAdmin || body.user?.role === 'admin');
    },
  });

  if (success) {
    const body = helpers.parseJSON(response);
    return body.accessToken || body.access_token;
  }

  return null;
}

/**
 * Load admin dashboard
 */
function loadAdminDashboard(adminToken) {
  const startTime = Date.now();

  // Load dashboard metrics
  const metricsLoaded = getAdminMetrics(adminToken);

  if (metricsLoaded) {
    dashboardLoads.add(1);
  }

  sleep(2);

  // Load recent activities
  getRecentActivities(adminToken);

  sleep(1);

  // Load quick stats
  getQuickStats(adminToken);

  const duration = Date.now() - startTime;
  adminQueryDuration.add(duration);
}

/**
 * Get admin dashboard metrics
 */
function getAdminMetrics(adminToken) {
  const url = `${API_URL}/admin/dashboard/metrics`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${adminToken}`,
    },
    tags: tags.endpoint('admin_dashboard'),
  };

  const response = http.get(url, params);

  const success = check(response, {
    'admin_metrics: status is 200': (r) => r.status === 200,
    'admin_metrics: has total users': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.totalUsers !== undefined);
    },
    'admin_metrics: has total orders': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.totalOrders !== undefined);
    },
    'admin_metrics: has revenue': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.totalRevenue !== undefined || body.revenue !== undefined);
    },
    'admin_metrics: response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  if (!success) {
    adminErrorRate.add(1);
  } else {
    adminErrorRate.add(0);
  }

  return success;
}

/**
 * Get recent activities
 */
function getRecentActivities(adminToken) {
  const url = `${API_URL}/admin/activities?limit=50`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${adminToken}`,
    },
    tags: tags.endpoint('admin_activities'),
  };

  const response = http.get(url, params);

  check(response, {
    'admin_activities: status is 200': (r) => r.status === 200,
    'admin_activities: has activities': (r) => {
      const body = helpers.parseJSON(r);
      return body && Array.isArray(body.activities || body.data || body);
    },
    'admin_activities: response time < 800ms': (r) => r.timings.duration < 800,
  });
}

/**
 * Get quick stats
 */
function getQuickStats(adminToken) {
  const url = `${API_URL}/admin/stats/quick`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${adminToken}`,
    },
    tags: tags.endpoint('admin_stats'),
  };

  const response = http.get(url, params);

  check(response, {
    'admin_stats: status is 200': (r) => r.status === 200,
    'admin_stats: has statistics': (r) => {
      const body = helpers.parseJSON(r);
      return body && typeof body === 'object';
    },
    'admin_stats: response time < 700ms': (r) => r.timings.duration < 700,
  });
}

/**
 * Perform user management operations
 */
function performUserManagement(adminToken) {
  const operation = Math.random();

  if (operation < 0.4) {
    // 40% - List users with filters
    listUsers(adminToken);
  } else if (operation < 0.7) {
    // 30% - View user details
    viewUserDetails(adminToken);
  } else if (operation < 0.9) {
    // 20% - Search users
    searchUsers(adminToken);
  } else {
    // 10% - Update user (disable/enable)
    updateUserStatus(adminToken);
  }

  userManagementOps.add(1);
}

/**
 * List users
 */
function listUsers(adminToken) {
  const page = Math.floor(Math.random() * 5) + 1;
  const limit = [20, 50, 100][Math.floor(Math.random() * 3)];
  const url = `${API_URL}/admin/users?page=${page}&limit=${limit}`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${adminToken}`,
    },
    tags: tags.endpoint('admin_users'),
  };

  const response = http.get(url, params);

  check(response, {
    'admin_users: status is 200': (r) => r.status === 200,
    'admin_users: has users': (r) => {
      const body = helpers.parseJSON(r);
      return body && Array.isArray(body.users || body.data || body);
    },
    'admin_users: has pagination': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.total !== undefined || body.totalPages !== undefined);
    },
    'admin_users: response time < 1200ms': (r) => r.timings.duration < 1200,
  });
}

/**
 * View user details
 */
function viewUserDetails(adminToken) {
  const userId = Math.floor(Math.random() * 1000) + 1;
  const url = `${API_URL}/admin/users/${userId}`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${adminToken}`,
    },
    tags: tags.endpoint('admin_user_detail'),
  };

  const response = http.get(url, params);

  check(response, {
    'admin_user_detail: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'admin_user_detail: response time < 800ms': (r) => r.timings.duration < 800,
  });

  // Get user orders
  if (response.status === 200 && Math.random() > 0.5) {
    sleep(1);
    getUserOrders(adminToken, userId);
  }
}

/**
 * Get user orders (admin view)
 */
function getUserOrders(adminToken, userId) {
  const url = `${API_URL}/admin/users/${userId}/orders`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${adminToken}`,
    },
    tags: tags.endpoint('admin_user_orders'),
  };

  const response = http.get(url, params);

  check(response, {
    'admin_user_orders: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'admin_user_orders: response time < 1000ms': (r) => r.timings.duration < 1000,
  });
}

/**
 * Search users
 */
function searchUsers(adminToken) {
  const searchTerms = ['john', 'admin', 'test', 'smith', 'loadtest'];
  const query = helpers.randomItem(searchTerms);
  const url = `${API_URL}/admin/users/search?q=${encodeURIComponent(query)}`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${adminToken}`,
    },
    tags: tags.endpoint('admin_user_search'),
  };

  const response = http.get(url, params);

  check(response, {
    'admin_user_search: status is 200': (r) => r.status === 200,
    'admin_user_search: has results': (r) => {
      const body = helpers.parseJSON(r);
      return body && Array.isArray(body.users || body.results || body.data || body);
    },
    'admin_user_search: response time < 1000ms': (r) => r.timings.duration < 1000,
  });
}

/**
 * Update user status
 */
function updateUserStatus(adminToken) {
  const userId = Math.floor(Math.random() * 1000) + 1;
  const url = `${API_URL}/admin/users/${userId}/status`;

  const payload = JSON.stringify({
    status: Math.random() > 0.5 ? 'active' : 'disabled',
    reason: 'Load test status update',
  });

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${adminToken}`,
    },
    tags: { ...tags.endpoint('admin_user_update'), ...tags.critical },
  };

  const response = http.put(url, payload, params);

  check(response, {
    'admin_user_update: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'admin_user_update: response time < 900ms': (r) => r.timings.duration < 900,
  });
}

/**
 * Perform product management operations
 */
function performProductManagement(adminToken) {
  const operation = Math.random();

  if (operation < 0.4) {
    // 40% - List products
    listProducts(adminToken);
  } else if (operation < 0.7) {
    // 30% - View/edit product
    viewProduct(adminToken);
  } else if (operation < 0.85) {
    // 15% - Update product inventory
    updateProductInventory(adminToken);
  } else {
    // 15% - Bulk operations
    performBulkProductOperation(adminToken);
  }

  productManagementOps.add(1);
}

/**
 * List products (admin view)
 */
function listProducts(adminToken) {
  const page = Math.floor(Math.random() * 10) + 1;
  const limit = [20, 50, 100][Math.floor(Math.random() * 3)];
  const url = `${API_URL}/admin/products?page=${page}&limit=${limit}`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${adminToken}`,
    },
    tags: tags.endpoint('admin_products'),
  };

  const response = http.get(url, params);

  check(response, {
    'admin_products: status is 200': (r) => r.status === 200,
    'admin_products: has products': (r) => {
      const body = helpers.parseJSON(r);
      return body && Array.isArray(body.products || body.data || body);
    },
    'admin_products: response time < 1000ms': (r) => r.timings.duration < 1000,
  });
}

/**
 * View product (admin)
 */
function viewProduct(adminToken) {
  const productId = helpers.randomItem(testProducts);
  const url = `${API_URL}/admin/products/${productId}`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${adminToken}`,
    },
    tags: tags.endpoint('admin_product_detail'),
  };

  const response = http.get(url, params);

  check(response, {
    'admin_product_detail: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'admin_product_detail: response time < 700ms': (r) => r.timings.duration < 700,
  });
}

/**
 * Update product inventory
 */
function updateProductInventory(adminToken) {
  const productId = helpers.randomItem(testProducts);
  const url = `${API_URL}/admin/products/${productId}/inventory`;

  const payload = JSON.stringify({
    quantity: Math.floor(Math.random() * 100) + 50,
    operation: 'set',
  });

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${adminToken}`,
    },
    tags: { ...tags.endpoint('admin_inventory_update'), ...tags.critical },
  };

  const response = http.put(url, payload, params);

  check(response, {
    'admin_inventory_update: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'admin_inventory_update: response time < 800ms': (r) => r.timings.duration < 800,
  });
}

/**
 * Perform bulk product operation
 */
function performBulkProductOperation(adminToken) {
  const url = `${API_URL}/admin/products/bulk`;

  const productIds = [1, 2, 3, 4, 5].slice(0, Math.floor(Math.random() * 5) + 1);

  const payload = JSON.stringify({
    productIds: productIds,
    operation: 'update_status',
    status: 'active',
  });

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${adminToken}`,
    },
    tags: { ...tags.endpoint('admin_bulk_operation'), ...tags.critical },
  };

  const response = http.post(url, payload, params);

  check(response, {
    'admin_bulk_operation: status is 200 or 207': (r) => r.status === 200 || r.status === 207, // 207 Multi-Status
    'admin_bulk_operation: response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  bulkOperations.add(1);
}

/**
 * Perform order management operations
 */
function performOrderManagement(adminToken) {
  const operation = Math.random();

  if (operation < 0.5) {
    // 50% - List orders
    listOrders(adminToken);
  } else if (operation < 0.8) {
    // 30% - View order details
    viewOrderDetails(adminToken);
  } else {
    // 20% - Update order status
    updateOrderStatus(adminToken);
  }

  orderManagementOps.add(1);
}

/**
 * List orders (admin view)
 */
function listOrders(adminToken) {
  const page = Math.floor(Math.random() * 10) + 1;
  const limit = [20, 50, 100][Math.floor(Math.random() * 3)];
  const status = ['pending', 'processing', 'shipped', 'delivered'][Math.floor(Math.random() * 4)];

  const url = `${API_URL}/admin/orders?page=${page}&limit=${limit}&status=${status}`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${adminToken}`,
    },
    tags: tags.endpoint('admin_orders'),
  };

  const response = http.get(url, params);

  check(response, {
    'admin_orders: status is 200': (r) => r.status === 200,
    'admin_orders: has orders': (r) => {
      const body = helpers.parseJSON(r);
      return body && Array.isArray(body.orders || body.data || body);
    },
    'admin_orders: response time < 1500ms': (r) => r.timings.duration < 1500,
  });
}

/**
 * View order details (admin)
 */
function viewOrderDetails(adminToken) {
  const orderId = Math.floor(Math.random() * 1000) + 1;
  const url = `${API_URL}/admin/orders/${orderId}`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${adminToken}`,
    },
    tags: tags.endpoint('admin_order_detail'),
  };

  const response = http.get(url, params);

  check(response, {
    'admin_order_detail: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'admin_order_detail: response time < 1000ms': (r) => r.timings.duration < 1000,
  });
}

/**
 * Update order status
 */
function updateOrderStatus(adminToken) {
  const orderId = Math.floor(Math.random() * 1000) + 1;
  const url = `${API_URL}/admin/orders/${orderId}/status`;

  const statuses = ['processing', 'shipped', 'delivered'];
  const payload = JSON.stringify({
    status: helpers.randomItem(statuses),
    notes: 'Status updated via load test',
  });

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${adminToken}`,
    },
    tags: { ...tags.endpoint('admin_order_update'), ...tags.critical },
  };

  const response = http.put(url, payload, params);

  check(response, {
    'admin_order_update: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'admin_order_update: response time < 1200ms': (r) => r.timings.duration < 1200,
  });
}

/**
 * Generate reports
 */
function generateReports(adminToken) {
  const reportTypes = ['sales', 'users', 'products', 'revenue', 'inventory'];
  const reportType = helpers.randomItem(reportTypes);

  const startTime = Date.now();
  generateReport(adminToken, reportType);
  const duration = Date.now() - startTime;

  reportGenerationDuration.add(duration);
  reportGenerations.add(1);
}

/**
 * Generate specific report
 */
function generateReport(adminToken, reportType) {
  const url = `${API_URL}/admin/reports/${reportType}`;

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${adminToken}`,
    },
    tags: tags.endpoint('admin_reports'),
  };

  const response = http.get(`${url}?startDate=${startDate}&endDate=${endDate}`, params);

  check(response, {
    'admin_reports: status is 200': (r) => r.status === 200,
    'admin_reports: has report data': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.data || body.report || body.results);
    },
    'admin_reports: response time < 3000ms': (r) => r.timings.duration < 3000,
  });
}

/**
 * Setup function
 */
export function setup() {
  console.log('Starting Admin Operations Load Test');
  console.log(`API URL: ${API_URL}`);
  console.log('Testing admin panel operations with reduced concurrent users');
  console.log('WARNING: This test performs write operations');
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('Admin Operations Load Test completed');
  console.log('Review admin operation metrics and query performance');
}
