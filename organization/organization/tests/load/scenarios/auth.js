/**
 * Authentication Load Test Scenario
 *
 * Tests the authentication endpoints including:
 * - User registration
 * - User login
 * - Token refresh
 * - Social authentication
 * - Password reset flow
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import {
  API_URL,
  testData,
  testUsers,
  helpers,
  tags,
  defaultOptions,
  scenarios,
  thresholds,
} from '../k6-config.js';

// Custom metrics
const loginSuccessCounter = new Counter('login_success');
const loginFailureCounter = new Counter('login_failure');
const registrationSuccessCounter = new Counter('registration_success');
const tokenRefreshTrend = new Trend('token_refresh_duration');

// Test configuration
export const options = {
  scenarios: {
    auth_load: scenarios.load,
  },
  thresholds: {
    ...thresholds,
    'http_req_duration{endpoint:register}': ['p(95)<1000'],
    'http_req_duration{endpoint:login}': ['p(95)<800'],
    'http_req_duration{endpoint:refresh}': ['p(95)<500'],
    'login_success': ['count>0'],
    'registration_success': ['count>0'],
  },
};

/**
 * Main test function
 */
export default function () {
  const scenario = Math.random();

  if (scenario < 0.4) {
    // 40% - Login with existing user
    testLogin();
  } else if (scenario < 0.7) {
    // 30% - Register new user and login
    testRegistration();
  } else if (scenario < 0.85) {
    // 15% - Token refresh flow
    testTokenRefresh();
  } else {
    // 15% - Social login simulation
    testSocialLogin();
  }

  // Simulate user think time
  sleep(Math.random() * 3 + 1);
}

/**
 * Test user login
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
    tags: tags.endpoint('login'),
  };

  const response = http.post(url, payload, params);

  const success = check(response, {
    'login: status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'login: has access token': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.accessToken || body.access_token);
    },
    'login: has refresh token': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.refreshToken || body.refresh_token);
    },
    'login: response time < 800ms': (r) => r.timings.duration < 800,
  });

  if (success) {
    loginSuccessCounter.add(1);

    // Parse tokens for subsequent requests
    const body = helpers.parseJSON(response);
    if (body) {
      return {
        accessToken: body.accessToken || body.access_token,
        refreshToken: body.refreshToken || body.refresh_token,
      };
    }
  } else {
    loginFailureCounter.add(1);
    console.error(`Login failed: ${response.status} - ${response.body}`);
  }

  return null;
}

/**
 * Test user registration
 */
function testRegistration() {
  const newUser = testData.randomUser();
  const url = `${API_URL}/auth/register`;

  const payload = JSON.stringify({
    email: newUser.email,
    password: newUser.password,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
  });

  const params = {
    ...defaultOptions,
    tags: tags.endpoint('register'),
  };

  const response = http.post(url, payload, params);

  const success = check(response, {
    'register: status is 201': (r) => r.status === 201,
    'register: has user data': (r) => {
      const body = helpers.parseJSON(r);
      return body && body.email === newUser.email;
    },
    'register: response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  if (success) {
    registrationSuccessCounter.add(1);

    // Attempt login after registration
    sleep(1);
    const loginResponse = testLogin();
    return loginResponse;
  } else {
    console.error(`Registration failed: ${response.status} - ${response.body}`);
  }

  return null;
}

/**
 * Test token refresh
 */
function testTokenRefresh() {
  // First, login to get tokens
  const tokens = testLogin();

  if (!tokens || !tokens.refreshToken) {
    console.error('Cannot test token refresh without valid tokens');
    return;
  }

  sleep(1);

  const url = `${API_URL}/auth/refresh`;

  const payload = JSON.stringify({
    refreshToken: tokens.refreshToken,
  });

  const params = {
    ...defaultOptions,
    tags: tags.endpoint('refresh'),
  };

  const startTime = Date.now();
  const response = http.post(url, payload, params);
  const duration = Date.now() - startTime;

  check(response, {
    'refresh: status is 200': (r) => r.status === 200,
    'refresh: has new access token': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.accessToken || body.access_token);
    },
    'refresh: response time < 500ms': (r) => r.timings.duration < 500,
  });

  tokenRefreshTrend.add(duration);
}

/**
 * Test social login flow
 */
function testSocialLogin() {
  const providers = ['google', 'facebook', 'github'];
  const provider = helpers.randomItem(providers);
  const url = `${API_URL}/auth/social/${provider}`;

  // Generate mock social token
  const payload = JSON.stringify({
    provider: provider,
    token: `mock_${provider}_token_${Date.now()}`,
    email: testData.randomEmail(),
  });

  const params = {
    ...defaultOptions,
    tags: { ...tags.endpoint('social_login'), provider },
  };

  const response = http.post(url, payload, params);

  check(response, {
    'social_login: status is 200 or 201 or 400': (r) =>
      r.status === 200 || r.status === 201 || r.status === 400, // 400 expected for mock tokens
    'social_login: has response': (r) => r.body && r.body.length > 0,
    'social_login: response time < 1000ms': (r) => r.timings.duration < 1000,
  });
}

/**
 * Test password reset flow
 */
export function testPasswordReset() {
  const user = helpers.randomItem(testUsers);

  // Request password reset
  const resetUrl = `${API_URL}/auth/forgot-password`;
  const resetPayload = JSON.stringify({
    email: user.email,
  });

  const resetParams = {
    ...defaultOptions,
    tags: tags.endpoint('forgot_password'),
  };

  const resetResponse = http.post(resetUrl, resetPayload, resetParams);

  check(resetResponse, {
    'forgot_password: status is 200': (r) => r.status === 200,
    'forgot_password: has success message': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.message || body.success);
    },
    'forgot_password: response time < 800ms': (r) => r.timings.duration < 800,
  });
}

/**
 * Test logout
 */
export function testLogout(accessToken) {
  const url = `${API_URL}/auth/logout`;

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: tags.endpoint('logout'),
  };

  const response = http.post(url, null, params);

  check(response, {
    'logout: status is 200 or 204': (r) => r.status === 200 || r.status === 204,
    'logout: response time < 500ms': (r) => r.timings.duration < 500,
  });
}

/**
 * Setup function - runs once per VU
 */
export function setup() {
  console.log('Starting Authentication Load Test');
  console.log(`API URL: ${API_URL}`);
  console.log(`Test users available: ${testUsers.length}`);
}

/**
 * Teardown function - runs once at the end
 */
export function teardown(data) {
  console.log('Authentication Load Test completed');
}
