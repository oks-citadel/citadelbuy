#!/usr/bin/env node

/**
 * CitadelBuy Order Processing Workflow Test Suite
 *
 * This script runs comprehensive tests against the n8n workflow
 * to ensure all scenarios are handled correctly.
 *
 * Usage:
 *   node test-workflow.js
 *   WEBHOOK_URL=https://n8n.example.com/webhook/... node test-workflow.js
 *   node test-workflow.js --scenario standard_order
 *   node test-workflow.js --verbose
 */

const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  webhookUrl: process.env.WEBHOOK_URL || process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/citadelbuy-order-webhook',
  webhookSecret: process.env.CITADELBUY_WEBHOOK_SECRET || 'your-webhook-secret-key',
  timeout: parseInt(process.env.TEST_TIMEOUT) || 30000,
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  scenarioFilter: null
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

/**
 * Generate HMAC signature
 */
function generateSignature(payload, secret) {
  const payloadString = JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
}

/**
 * Send webhook request
 */
async function sendWebhook(payload, options = {}) {
  const signature = generateSignature(payload, CONFIG.webhookSecret);

  const config = {
    method: 'POST',
    url: CONFIG.webhookUrl,
    headers: {
      'Content-Type': 'application/json',
      'X-CitadelBuy-Signature': signature,
      ...options.headers
    },
    data: payload,
    timeout: CONFIG.timeout,
    validateStatus: () => true // Don't throw on any status code
  };

  const startTime = Date.now();

  try {
    const response = await axios(config);
    const duration = Date.now() - startTime;

    return {
      success: true,
      status: response.status,
      data: response.data,
      duration,
      headers: response.headers
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    return {
      success: false,
      error: error.message,
      duration,
      code: error.code
    };
  }
}

/**
 * Log test result
 */
function logTest(name, passed, message = '', details = null) {
  results.total++;
  if (passed) {
    results.passed++;
    console.log(`${colors.green}✓${colors.reset} ${name}`);
  } else {
    results.failed++;
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    if (message) {
      console.log(`  ${colors.dim}${message}${colors.reset}`);
    }
  }

  if (CONFIG.verbose && details) {
    console.log(`  ${colors.dim}${JSON.stringify(details, null, 2)}${colors.reset}`);
  }

  results.tests.push({
    name,
    passed,
    message,
    details,
    timestamp: new Date().toISOString()
  });
}

/**
 * Run a single test scenario
 */
async function runScenario(scenarioName, scenario, payload) {
  console.log(`\n${colors.bright}${colors.cyan}Testing: ${scenarioName}${colors.reset}`);
  console.log(`${colors.dim}${scenario.description}${colors.reset}\n`);

  // Send webhook
  const response = await sendWebhook(payload);

  // Check response
  if (!response.success) {
    logTest(
      `${scenarioName}: Request successful`,
      false,
      `Request failed: ${response.error}`,
      response
    );
    return;
  }

  logTest(
    `${scenarioName}: Request successful`,
    true,
    `Completed in ${response.duration}ms`
  );

  // Validate response code
  const expectedCode = scenario.expected_response_code || 200;
  logTest(
    `${scenarioName}: Response code ${expectedCode}`,
    response.status === expectedCode,
    `Expected ${expectedCode}, got ${response.status}`,
    { status: response.status, data: response.data }
  );

  // Check for validation errors if expected
  if (scenario.expected_validation_errors !== undefined) {
    const hasValidationErrors = response.data?.validation_errors || response.data?.validation?.errors;
    logTest(
      `${scenarioName}: Validation errors present`,
      !!hasValidationErrors === scenario.expected_validation_errors,
      `Expected validation errors: ${scenario.expected_validation_errors}`,
      hasValidationErrors
    );
  }

  // Check success response structure
  if (expectedCode === 200) {
    logTest(
      `${scenarioName}: Success response format`,
      response.data?.success === true,
      'Response should have success: true',
      response.data
    );

    logTest(
      `${scenarioName}: Order ID in response`,
      !!response.data?.order_id,
      'Response should contain order_id',
      response.data
    );
  }

  // Log performance
  const performanceThreshold = 5000; // 5 seconds
  logTest(
    `${scenarioName}: Performance (<${performanceThreshold}ms)`,
    response.duration < performanceThreshold,
    `Duration: ${response.duration}ms`,
    { duration: response.duration }
  );
}

/**
 * Test HMAC signature validation
 */
async function testHMACValidation() {
  console.log(`\n${colors.bright}${colors.cyan}Testing: HMAC Signature Validation${colors.reset}\n`);

  // Load a test payload
  const testPayloads = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-payloads.json')));
  const payload = testPayloads.test_payloads.standard_order;

  // Test 1: Valid signature
  const validResponse = await sendWebhook(payload);
  logTest(
    'HMAC: Valid signature accepted',
    validResponse.status === 200,
    `Expected 200, got ${validResponse.status}`
  );

  // Test 2: Invalid signature
  const invalidResponse = await sendWebhook(payload, {
    headers: { 'X-CitadelBuy-Signature': 'invalid-signature-12345' }
  });
  logTest(
    'HMAC: Invalid signature rejected',
    invalidResponse.status === 401,
    `Expected 401, got ${invalidResponse.status}`
  );

  // Test 3: Missing signature
  const config = {
    method: 'POST',
    url: CONFIG.webhookUrl,
    headers: { 'Content-Type': 'application/json' },
    data: payload,
    validateStatus: () => true
  };

  try {
    const missingResponse = await axios(config);
    logTest(
      'HMAC: Missing signature rejected',
      missingResponse.status === 401,
      `Expected 401, got ${missingResponse.status}`
    );
  } catch (error) {
    logTest(
      'HMAC: Missing signature rejected',
      false,
      `Request failed: ${error.message}`
    );
  }
}

/**
 * Test data validation
 */
async function testDataValidation() {
  console.log(`\n${colors.bright}${colors.cyan}Testing: Data Validation${colors.reset}\n`);

  const testCases = [
    {
      name: 'Missing order_id',
      payload: {
        event: 'order.created',
        data: {
          customer: { email: 'test@example.com' },
          total: 100
        }
      },
      shouldFail: true
    },
    {
      name: 'Missing customer email',
      payload: {
        event: 'order.created',
        data: {
          order_id: 'TEST-123',
          customer: { id: 'cust_123' },
          total: 100,
          line_items: []
        }
      },
      shouldFail: true
    },
    {
      name: 'Empty line items',
      payload: {
        event: 'order.created',
        data: {
          order_id: 'TEST-123',
          customer: { id: 'cust_123', email: 'test@example.com' },
          total: 100,
          line_items: []
        }
      },
      shouldFail: true
    },
    {
      name: 'Negative total',
      payload: {
        event: 'order.created',
        data: {
          order_id: 'TEST-123',
          customer: { id: 'cust_123', email: 'test@example.com' },
          total: -100,
          line_items: [{ sku: 'TEST', quantity: 1, price: 10 }]
        }
      },
      shouldFail: true
    }
  ];

  for (const testCase of testCases) {
    const response = await sendWebhook(testCase.payload);
    const failed = response.status === 400;

    logTest(
      `Validation: ${testCase.name}`,
      failed === testCase.shouldFail,
      `Expected ${testCase.shouldFail ? 'failure' : 'success'}, got ${failed ? 'failure' : 'success'}`,
      { status: response.status, data: response.data }
    );
  }
}

/**
 * Test concurrent requests
 */
async function testConcurrency() {
  console.log(`\n${colors.bright}${colors.cyan}Testing: Concurrent Requests${colors.reset}\n`);

  const testPayloads = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-payloads.json')));
  const payload = testPayloads.test_payloads.standard_order;

  const concurrentRequests = 10;
  const startTime = Date.now();

  const promises = Array(concurrentRequests)
    .fill(null)
    .map((_, i) => {
      const modifiedPayload = {
        ...payload,
        data: {
          ...payload.data,
          order_id: `ORD-CONCURRENT-${i}`,
          order_number: `#CONC${i}`
        }
      };
      return sendWebhook(modifiedPayload);
    });

  const responses = await Promise.all(promises);
  const duration = Date.now() - startTime;

  const successCount = responses.filter(r => r.status === 200).length;

  logTest(
    `Concurrency: ${concurrentRequests} simultaneous requests`,
    successCount === concurrentRequests,
    `${successCount}/${concurrentRequests} succeeded in ${duration}ms`,
    { duration, successCount, totalRequests: concurrentRequests }
  );

  const avgDuration = duration / concurrentRequests;
  logTest(
    'Concurrency: Average response time',
    avgDuration < 3000,
    `Average: ${avgDuration.toFixed(0)}ms`,
    { avgDuration }
  );
}

/**
 * Main test runner
 */
async function main() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  CitadelBuy Order Processing Workflow Test Suite');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(colors.reset);

  console.log(`${colors.dim}Webhook URL: ${CONFIG.webhookUrl}${colors.reset}`);
  console.log(`${colors.dim}Timeout: ${CONFIG.timeout}ms${colors.reset}`);
  console.log(`${colors.dim}Verbose: ${CONFIG.verbose}${colors.reset}\n`);

  // Check if webhook secret is default
  if (CONFIG.webhookSecret === 'your-webhook-secret-key') {
    console.log(`${colors.yellow}⚠️  WARNING: Using default webhook secret${colors.reset}\n`);
  }

  // Load test data
  let testData;
  try {
    testData = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-payloads.json')));
  } catch (error) {
    console.error(`${colors.red}✗ Failed to load test-payloads.json: ${error.message}${colors.reset}`);
    process.exit(1);
  }

  const startTime = Date.now();

  // Run HMAC validation tests
  await testHMACValidation();

  // Run data validation tests
  await testDataValidation();

  // Run scenario tests
  console.log(`\n${colors.bright}${colors.blue}Running Scenario Tests${colors.reset}\n`);

  for (const [scenarioKey, scenario] of Object.entries(testData.test_scenarios)) {
    // Apply scenario filter if specified
    const scenarioArg = process.argv.find(arg => arg.startsWith('--scenario='));
    if (scenarioArg) {
      const requestedScenario = scenarioArg.split('=')[1];
      if (!scenarioKey.includes(requestedScenario) && scenario.payload !== requestedScenario) {
        results.skipped++;
        continue;
      }
    }

    const payload = testData.test_payloads[scenario.payload];
    if (!payload) {
      console.log(`${colors.yellow}⚠️  Skipping ${scenarioKey}: Payload '${scenario.payload}' not found${colors.reset}`);
      results.skipped++;
      continue;
    }

    await runScenario(scenarioKey, scenario, payload);

    // Small delay between scenarios to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Run concurrency test
  if (!process.argv.includes('--no-concurrency')) {
    await testConcurrency();
  }

  // Print summary
  const totalDuration = Date.now() - startTime;

  console.log(`\n${colors.bright}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}Test Summary${colors.reset}\n`);

  console.log(`Total Tests:    ${results.total}`);
  console.log(`${colors.green}Passed:         ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed:         ${results.failed}${colors.reset}`);
  console.log(`${colors.yellow}Skipped:        ${results.skipped}${colors.reset}`);
  console.log(`Duration:       ${totalDuration}ms\n`);

  const passRate = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : 0;
  console.log(`Pass Rate:      ${passRate}%`);

  if (results.failed > 0) {
    console.log(`\n${colors.red}${colors.bright}TESTS FAILED${colors.reset}\n`);

    console.log('Failed tests:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  ${colors.red}✗${colors.reset} ${t.name}`);
        if (t.message) {
          console.log(`    ${colors.dim}${t.message}${colors.reset}`);
        }
      });
  } else if (results.total > 0) {
    console.log(`\n${colors.green}${colors.bright}ALL TESTS PASSED${colors.reset}\n`);
  }

  console.log(`${colors.bright}═══════════════════════════════════════════════════════════${colors.reset}`);

  // Save results
  const resultsFile = path.join(__dirname, 'test-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    config: CONFIG,
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
      passRate: parseFloat(passRate),
      duration: totalDuration
    },
    tests: results.tests
  }, null, 2));

  console.log(`\n${colors.dim}Results saved to: ${resultsFile}${colors.reset}\n`);

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}✗ Fatal error: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = { sendWebhook, generateSignature };
