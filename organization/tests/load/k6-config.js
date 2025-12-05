/**
 * k6 Load Testing Configuration for CitadelBuy
 *
 * This configuration file defines common settings, thresholds, and utilities
 * for load testing the CitadelBuy e-commerce platform.
 */

import { SharedArray } from 'k6/data';
import { check } from 'k6';

// Base URL configuration
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const API_URL = __ENV.API_URL || 'http://localhost:4000';

// Load test scenarios configuration
export const scenarios = {
  // Smoke test - verify basic functionality
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '1m',
  },

  // Load test - average load simulation
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 10 },  // Ramp up to 10 users
      { duration: '5m', target: 10 },  // Stay at 10 users
      { duration: '2m', target: 20 },  // Ramp up to 20 users
      { duration: '5m', target: 20 },  // Stay at 20 users
      { duration: '2m', target: 0 },   // Ramp down
    ],
  },

  // Stress test - find breaking point
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 20 },   // Ramp up to 20 users
      { duration: '5m', target: 20 },   // Stay at 20 users
      { duration: '2m', target: 50 },   // Ramp up to 50 users
      { duration: '5m', target: 50 },   // Stay at 50 users
      { duration: '2m', target: 100 },  // Ramp up to 100 users
      { duration: '5m', target: 100 },  // Stay at 100 users
      { duration: '5m', target: 0 },    // Ramp down
    ],
  },

  // Spike test - sudden traffic surge
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 10 },   // Normal load
      { duration: '30s', target: 100 }, // Spike!
      { duration: '3m', target: 100 },  // Maintain spike
      { duration: '1m', target: 10 },   // Back to normal
      { duration: '1m', target: 0 },    // Ramp down
    ],
  },

  // Soak test - sustained load over time
  soak: {
    executor: 'constant-vus',
    vus: 20,
    duration: '30m',
  },
};

// Performance thresholds
export const thresholds = {
  // HTTP-specific metrics
  'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% of requests should be below 500ms
  'http_req_failed': ['rate<0.05'],                 // Error rate should be less than 5%

  // Custom metrics thresholds
  'http_req_duration{endpoint:login}': ['p(95)<800'],
  'http_req_duration{endpoint:checkout}': ['p(95)<1500'],
  'http_req_duration{endpoint:search}': ['p(95)<600'],
  'http_req_duration{endpoint:product_details}': ['p(95)<400'],

  // Iteration-based metrics
  'iteration_duration': ['p(95)<3000'],

  // Check success rate
  'checks': ['rate>0.95'], // 95% of checks should pass
};

// Test data generators
export const testData = {
  // Generate random email
  randomEmail: () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `test-${timestamp}-${random}@citadelbuy.test`;
  },

  // Generate random user credentials
  randomUser: () => ({
    email: testData.randomEmail(),
    password: 'Test@1234',
    firstName: 'Load',
    lastName: 'Test',
  }),

  // Generate random product search term
  randomSearchTerm: () => {
    const terms = ['laptop', 'phone', 'headphones', 'camera', 'watch', 'tablet', 'speaker'];
    return terms[Math.floor(Math.random() * terms.length)];
  },

  // Generate random product ID (1-1000)
  randomProductId: () => Math.floor(Math.random() * 1000) + 1,

  // Generate random quantity (1-5)
  randomQuantity: () => Math.floor(Math.random() * 5) + 1,
};

// Sample test users (pre-seeded in database)
export const testUsers = new SharedArray('users', function () {
  return [
    { email: 'loadtest1@citadelbuy.test', password: 'Test@1234' },
    { email: 'loadtest2@citadelbuy.test', password: 'Test@1234' },
    { email: 'loadtest3@citadelbuy.test', password: 'Test@1234' },
    { email: 'loadtest4@citadelbuy.test', password: 'Test@1234' },
    { email: 'loadtest5@citadelbuy.test', password: 'Test@1234' },
  ];
});

// Sample product IDs (pre-seeded in database)
export const testProducts = new SharedArray('products', function () {
  return [1, 2, 3, 4, 5, 10, 15, 20, 25, 30];
});

// HTTP request options
export const defaultOptions = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: '30s',
};

// Helper functions
export const helpers = {
  // Check response is successful
  checkResponse: (response, endpoint = 'default') => {
    return check(response, {
      [`${endpoint}: status is 200`]: (r) => r.status === 200,
      [`${endpoint}: response time < 1s`]: (r) => r.timings.duration < 1000,
      [`${endpoint}: has valid response`]: (r) => r.body && r.body.length > 0,
    });
  },

  // Check response with custom status
  checkResponseStatus: (response, expectedStatus, endpoint = 'default') => {
    return check(response, {
      [`${endpoint}: status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
      [`${endpoint}: has valid response`]: (r) => r.body && r.body.length > 0,
    });
  },

  // Parse JSON response safely
  parseJSON: (response) => {
    try {
      return JSON.parse(response.body);
    } catch (e) {
      console.error('Failed to parse JSON:', e.message);
      return null;
    }
  },

  // Sleep with jitter to simulate realistic user behavior
  sleepWithJitter: (sleep, min = 1, max = 3) => {
    const jitter = Math.random() * (max - min) + min;
    sleep(jitter);
  },

  // Get random item from array
  randomItem: (array) => {
    return array[Math.floor(Math.random() * array.length)];
  },
};

// Tags for grouping metrics
export const tags = {
  endpoint: (name) => ({ endpoint: name }),
  scenario: (name) => ({ scenario: name }),
  critical: { critical: 'true' },
  payment: { payment: 'true' },
};

// Export default configuration
export default {
  thresholds,
  scenarios,
};
