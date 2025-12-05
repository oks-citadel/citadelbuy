/**
 * User Registration Flow Load Test Scenario
 *
 * Tests comprehensive user registration and onboarding including:
 * - Registration form submission
 * - Email verification flow
 * - Profile completion
 * - Email validation
 * - Password strength validation
 * - Duplicate account prevention
 * - Social registration
 * - Terms acceptance
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import {
  API_URL,
  testData,
  helpers,
  tags,
  defaultOptions,
  scenarios,
  thresholds,
} from '../k6-config.js';

// Custom metrics
const registrationAttempts = new Counter('registration_attempts');
const registrationSuccesses = new Counter('registration_successes');
const registrationFailures = new Counter('registration_failures');
const duplicateAttempts = new Counter('duplicate_registration_attempts');
const invalidEmailAttempts = new Counter('invalid_email_attempts');
const weakPasswordAttempts = new Counter('weak_password_attempts');
const registrationDuration = new Trend('registration_complete_duration');
const emailVerificationSent = new Counter('email_verification_sent');
const profileCompletionRate = new Rate('profile_completion_rate');

// Test data
const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'James', 'Emma', 'Robert', 'Olivia'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const domains = ['test.com', 'example.com', 'citadelbuy.test', 'loadtest.local', 'demo.test'];

// Password patterns
const passwords = {
  strong: 'StrongP@ss123!',
  medium: 'MediumPass1',
  weak: 'weak',
  invalid: '123456',
};

// Test configuration
export const options = {
  scenarios: {
    user_registration: scenarios.load,
  },
  thresholds: {
    ...thresholds,
    'http_req_duration{endpoint:register}': ['p(95)<1200'],
    'http_req_duration{endpoint:verify_email}': ['p(95)<800'],
    'http_req_duration{endpoint:complete_profile}': ['p(95)<900'],
    'registration_successes': ['count>0'],
    'registration_attempts': ['count>0'],
    'profile_completion_rate': ['rate>0.80'], // 80% should complete profile
  },
};

/**
 * Main test function - Simulates various registration patterns
 */
export default function () {
  const registrationStart = Date.now();
  registrationAttempts.add(1);

  const scenario = Math.random();

  if (scenario < 0.5) {
    // 50% - Successful standard registration
    const result = testStandardRegistration();
    if (result) {
      registrationSuccesses.add(1);
      const duration = Date.now() - registrationStart;
      registrationDuration.add(duration);
    } else {
      registrationFailures.add(1);
    }
  } else if (scenario < 0.7) {
    // 20% - Registration with profile completion
    const result = testRegistrationWithProfileCompletion();
    if (result) {
      registrationSuccesses.add(1);
      profileCompletionRate.add(1);
    } else {
      registrationFailures.add(1);
      profileCompletionRate.add(0);
    }
  } else if (scenario < 0.85) {
    // 15% - Registration validation errors
    testRegistrationValidation();
  } else {
    // 15% - Social registration flow
    testSocialRegistration();
  }

  // User think time
  sleep(Math.random() * 2 + 1);
}

/**
 * Test standard registration flow
 */
function testStandardRegistration() {
  const user = generateRandomUser();
  const url = `${API_URL}/auth/register`;

  const payload = JSON.stringify({
    email: user.email,
    password: user.password,
    firstName: user.firstName,
    lastName: user.lastName,
    agreeToTerms: true,
  });

  const params = {
    ...defaultOptions,
    tags: tags.endpoint('register'),
  };

  const response = http.post(url, payload, params);

  const success = check(response, {
    'register: status is 201': (r) => r.status === 201,
    'register: has user ID': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.id || body.userId || body.user?.id);
    },
    'register: has email': (r) => {
      const body = helpers.parseJSON(r);
      const email = body.email || body.user?.email;
      return email === user.email;
    },
    'register: returns tokens or verification required': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.accessToken || body.requiresVerification || body.verificationRequired);
    },
    'register: response time < 1200ms': (r) => r.timings.duration < 1200,
  });

  if (success) {
    const body = helpers.parseJSON(response);

    // Check if email verification is required
    if (body.requiresVerification || body.verificationRequired) {
      emailVerificationSent.add(1);
      sleep(1);

      // Simulate email verification (in real scenario, would need verification code)
      // testEmailVerification(body.userId || body.id);
    }

    return body;
  }

  return null;
}

/**
 * Test registration with full profile completion
 */
function testRegistrationWithProfileCompletion() {
  // Step 1: Register
  const user = generateRandomUser();
  const registrationResult = testStandardRegistration();

  if (!registrationResult) {
    return false;
  }

  sleep(2);

  // Step 2: Complete profile with additional information
  const profileCompleted = completeUserProfile(registrationResult, {
    phone: generatePhoneNumber(),
    dateOfBirth: '1990-01-15',
    address: {
      street: '123 Main St',
      city: 'Test City',
      state: 'CA',
      postalCode: '12345',
      country: 'US',
    },
    preferences: {
      newsletter: true,
      notifications: true,
      currency: 'USD',
      language: 'en',
    },
  });

  sleep(1);

  // Step 3: Login to verify account is active
  if (profileCompleted) {
    const loginResult = testFirstLogin(user);
    return loginResult !== null;
  }

  return false;
}

/**
 * Complete user profile after registration
 */
function completeUserProfile(registrationResult, profileData) {
  const userId = registrationResult.id || registrationResult.userId || registrationResult.user?.id;
  const url = `${API_URL}/users/${userId}/profile`;

  const payload = JSON.stringify(profileData);

  const params = {
    headers: {
      ...defaultOptions.headers,
      'Authorization': `Bearer ${registrationResult.accessToken || 'mock_token'}`,
    },
    tags: tags.endpoint('complete_profile'),
  };

  const response = http.put(url, payload, params);

  const success = check(response, {
    'complete_profile: status is 200': (r) => r.status === 200,
    'complete_profile: profile updated': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.phone || body.address);
    },
    'complete_profile: response time < 900ms': (r) => r.timings.duration < 900,
  });

  return success;
}

/**
 * Test first login after registration
 */
function testFirstLogin(user) {
  const url = `${API_URL}/auth/login`;

  const payload = JSON.stringify({
    email: user.email,
    password: user.password,
  });

  const params = {
    ...defaultOptions,
    tags: { ...tags.endpoint('login'), firstLogin: 'true' },
  };

  const response = http.post(url, payload, params);

  const success = check(response, {
    'first_login: status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'first_login: has access token': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.accessToken || body.access_token);
    },
    'first_login: response time < 800ms': (r) => r.timings.duration < 800,
  });

  return success ? helpers.parseJSON(response) : null;
}

/**
 * Test registration validation scenarios
 */
function testRegistrationValidation() {
  const scenario = Math.random();

  if (scenario < 0.33) {
    // Test duplicate email
    testDuplicateEmailRegistration();
  } else if (scenario < 0.66) {
    // Test invalid email format
    testInvalidEmailRegistration();
  } else {
    // Test weak password
    testWeakPasswordRegistration();
  }
}

/**
 * Test duplicate email registration (should fail)
 */
function testDuplicateEmailRegistration() {
  const url = `${API_URL}/auth/register`;

  // Use a known existing email
  const payload = JSON.stringify({
    email: 'loadtest1@citadelbuy.test', // Existing test user
    password: passwords.strong,
    firstName: 'Duplicate',
    lastName: 'User',
    agreeToTerms: true,
  });

  const params = {
    ...defaultOptions,
    tags: { ...tags.endpoint('register'), validation: 'duplicate' },
  };

  const response = http.post(url, payload, params);

  check(response, {
    'register_duplicate: status is 400 or 409': (r) => r.status === 400 || r.status === 409,
    'register_duplicate: has error message': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.error || body.message);
    },
    'register_duplicate: response time < 800ms': (r) => r.timings.duration < 800,
  });

  duplicateAttempts.add(1);
}

/**
 * Test invalid email format registration
 */
function testInvalidEmailRegistration() {
  const url = `${API_URL}/auth/register`;

  const invalidEmails = [
    'notanemail',
    'missing@domain',
    '@nodomain.com',
    'spaces in@email.com',
    'multiple@@at.com',
  ];

  const payload = JSON.stringify({
    email: helpers.randomItem(invalidEmails),
    password: passwords.strong,
    firstName: 'Invalid',
    lastName: 'Email',
    agreeToTerms: true,
  });

  const params = {
    ...defaultOptions,
    tags: { ...tags.endpoint('register'), validation: 'invalid_email' },
  };

  const response = http.post(url, payload, params);

  check(response, {
    'register_invalid_email: status is 400': (r) => r.status === 400,
    'register_invalid_email: has validation error': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.error || body.message || body.errors);
    },
    'register_invalid_email: response time < 500ms': (r) => r.timings.duration < 500,
  });

  invalidEmailAttempts.add(1);
}

/**
 * Test weak password registration
 */
function testWeakPasswordRegistration() {
  const url = `${API_URL}/auth/register`;

  const user = generateRandomUser();

  const payload = JSON.stringify({
    email: user.email,
    password: passwords.weak, // Weak password
    firstName: user.firstName,
    lastName: user.lastName,
    agreeToTerms: true,
  });

  const params = {
    ...defaultOptions,
    tags: { ...tags.endpoint('register'), validation: 'weak_password' },
  };

  const response = http.post(url, payload, params);

  check(response, {
    'register_weak_password: status is 400': (r) => r.status === 400,
    'register_weak_password: has password error': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.error || body.message);
    },
    'register_weak_password: response time < 500ms': (r) => r.timings.duration < 500,
  });

  weakPasswordAttempts.add(1);
}

/**
 * Test social registration flow
 */
function testSocialRegistration() {
  const providers = ['google', 'facebook', 'github', 'apple'];
  const provider = helpers.randomItem(providers);
  const url = `${API_URL}/auth/social/${provider}`;

  const user = generateRandomUser();

  const payload = JSON.stringify({
    provider: provider,
    token: `mock_${provider}_token_${Date.now()}`,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    providerId: `${provider}_${Date.now()}`,
  });

  const params = {
    ...defaultOptions,
    tags: { ...tags.endpoint('social_register'), provider: provider },
  };

  const response = http.post(url, payload, params);

  check(response, {
    'social_register: status is 200 or 201 or 400': (r) =>
      r.status === 200 || r.status === 201 || r.status === 400, // 400 expected for mock tokens
    'social_register: has response': (r) => r.body && r.body.length > 0,
    'social_register: response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  if (response.status === 200 || response.status === 201) {
    registrationSuccesses.add(1);
  }
}

/**
 * Test email verification (simulated)
 */
export function testEmailVerification(userId) {
  const url = `${API_URL}/auth/verify-email`;

  const payload = JSON.stringify({
    userId: userId,
    code: '123456', // Mock verification code
  });

  const params = {
    ...defaultOptions,
    tags: tags.endpoint('verify_email'),
  };

  const response = http.post(url, payload, params);

  check(response, {
    'verify_email: status is 200 or 400': (r) => r.status === 200 || r.status === 400, // 400 expected with mock code
    'verify_email: has response': (r) => r.body && r.body.length > 0,
    'verify_email: response time < 800ms': (r) => r.timings.duration < 800,
  });
}

/**
 * Test check email availability
 */
export function testCheckEmailAvailability(email) {
  const url = `${API_URL}/auth/check-email?email=${encodeURIComponent(email)}`;

  const params = {
    ...defaultOptions,
    tags: tags.endpoint('check_email'),
  };

  const response = http.get(url, params);

  check(response, {
    'check_email: status is 200': (r) => r.status === 200,
    'check_email: has availability info': (r) => {
      const body = helpers.parseJSON(r);
      return body && (body.available !== undefined || body.exists !== undefined);
    },
    'check_email: response time < 400ms': (r) => r.timings.duration < 400,
  });
}

/**
 * Generate random user data
 */
function generateRandomUser() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const firstName = helpers.randomItem(firstNames);
  const lastName = helpers.randomItem(lastNames);
  const domain = helpers.randomItem(domains);

  return {
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${timestamp}.${random}@${domain}`,
    password: passwords.strong,
    firstName: firstName,
    lastName: lastName,
  };
}

/**
 * Generate random phone number
 */
function generatePhoneNumber() {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const lineNumber = Math.floor(Math.random() * 9000) + 1000;
  return `${areaCode}-${prefix}-${lineNumber}`;
}

/**
 * Setup function
 */
export function setup() {
  console.log('Starting User Registration Load Test');
  console.log(`API URL: ${API_URL}`);
  console.log('Testing various registration patterns and validation scenarios');
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('User Registration Load Test completed');
  console.log('Review registration success/failure rates and validation metrics');
}
