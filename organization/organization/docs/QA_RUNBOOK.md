# Broxiva QA Runbook

**Version:** 2.0.0
**Last Updated:** 2026-01-19

This runbook provides instructions for running, debugging, and interpreting QA tests for the Broxiva platform.

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Test Suites Overview](#2-test-suites-overview)
3. [Running Tests Locally](#3-running-tests-locally)
4. [CI/CD Pipeline](#4-cicd-pipeline)
5. [Interpreting Results](#5-interpreting-results)
6. [Debugging Failed Tests](#6-debugging-failed-tests)
7. [Test Data Management](#7-test-data-management)
8. [Adding New Tests](#8-adding-new-tests)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Quick Start

### Prerequisites

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma:generate

# Start local services (Docker)
pnpm docker:up

# Wait for services to be ready
# Database, Redis, Elasticsearch should be running
```

### Run All Tests

```bash
# Run all test suites
pnpm test

# Run specific suite
pnpm test:smoke         # Quick smoke tests
pnpm test:api           # API unit tests
pnpm test:api:smoke     # API smoke tests
pnpm test:api:regression # Full API regression
pnpm test:ui:smoke      # UI smoke tests (Playwright)
pnpm test:ui:regression # Full UI regression
pnpm test:a11y          # Accessibility tests
pnpm test:visual        # Visual regression tests
pnpm test:perf          # Performance tests (k6)
```

---

## 2. Test Suites Overview

### Suite Hierarchy

| Suite | Purpose | Run Time | When to Run |
|-------|---------|----------|-------------|
| **Smoke** | Verify basic functionality | <3 min | Every PR |
| **Unit** | Test individual functions | <5 min | Every PR |
| **Integration** | Test API contracts | <10 min | Every PR |
| **Regression** | Full end-to-end coverage | <30 min | Nightly, Pre-release |
| **Performance** | Load and stress testing | <15 min | Nightly, Pre-release |
| **Accessibility** | WCAG compliance | <10 min | Nightly |
| **Visual** | UI screenshot comparison | <10 min | Nightly |

### Test File Locations

```
tests/
├── api/
│   ├── contracts/           # OpenAPI schema validation
│   ├── integration/         # API integration tests
│   ├── jest.config.js       # Jest configuration
│   └── results/             # Test results (gitignored)
├── e2e/
│   ├── web/                 # Playwright E2E tests
│   │   ├── auth.spec.ts
│   │   ├── checkout.spec.ts
│   │   └── products.spec.ts
│   ├── playwright.config.ts
│   └── playwright-report/   # HTML reports (gitignored)
├── smoke/
│   └── smoke-test.spec.ts   # Smoke tests
├── perf/
│   ├── smoke.js             # k6 smoke test
│   ├── load.js              # k6 load test
│   └── results/             # Performance results (gitignored)
├── a11y/
│   └── accessibility.spec.ts
└── visual/
    └── visual.spec.ts
```

---

## 3. Running Tests Locally

### API Tests

```bash
# Start API server (in separate terminal)
cd apps/api && pnpm dev

# Run API unit tests
pnpm test:api

# Run API integration tests with specific file
cd tests/api && npx jest integration/auth.api.spec.ts

# Run with coverage
pnpm test:api -- --coverage

# Run with verbose output
pnpm test:api -- --verbose
```

### UI Tests (Playwright)

```bash
# Start web app (in separate terminal)
cd apps/web && pnpm dev

# Run all UI tests
pnpm test:ui

# Run in headed mode (see browser)
pnpm test:ui -- --headed

# Run specific test file
pnpm test:ui -- tests/e2e/web/auth.spec.ts

# Run specific browser only
pnpm test:ui -- --project=chromium

# Debug mode (step through tests)
pnpm test:ui -- --debug

# Generate report
pnpm test:ui:report
```

### Performance Tests (k6)

```bash
# Install k6 (if not installed)
# macOS: brew install k6
# Linux: see https://k6.io/docs/get-started/installation/

# Start API server first
cd apps/api && pnpm start:prod

# Run smoke test
k6 run tests/perf/smoke.js --env API_BASE_URL=http://localhost:4000

# Run load test
k6 run tests/perf/load.js --env API_BASE_URL=http://localhost:4000

# Run with custom output
k6 run tests/perf/smoke.js --out json=results.json
```

### Accessibility Tests

```bash
# Run accessibility tests
pnpm test:a11y

# With specific page
pnpm test:a11y -- --grep "homepage"
```

---

## 4. CI/CD Pipeline

### Pipeline Architecture

```
PR Opened/Updated
      │
      ▼
┌─────────────────┐
│   Lint & Type   │ ─── Fails? ──► PR Blocked
└─────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│         Parallel Execution          │
│  ┌─────────┐ ┌─────────┐ ┌───────┐  │
│  │API Unit │ │Web Unit │ │ Build │  │
│  └─────────┘ └─────────┘ └───────┘  │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│         Smoke Tests                 │
│  ┌───────────┐ ┌─────────────────┐  │
│  │ API Smoke │ │   UI Smoke      │  │
│  └───────────┘ └─────────────────┘  │
└─────────────────────────────────────┘
      │
      ▼
┌─────────────────┐
│  Allure Report  │
└─────────────────┘
      │
      ▼
    PR Ready
```

### Viewing CI Results

1. **GitHub Actions**: Navigate to repository > Actions tab
2. **Allure Report**: Link posted as PR comment
3. **Artifacts**: Download from workflow run page

### Nightly Pipeline

Runs at 2 AM UTC daily:
- Full API regression
- Full UI regression (all browsers)
- Accessibility audit
- Visual regression
- Performance baseline

---

## 5. Interpreting Results

### Test Status Indicators

| Status | Meaning | Action |
|--------|---------|--------|
| Pass | Test completed successfully | None |
| Fail | Assertion failed | Investigate and fix |
| Skip | Test was skipped | Review skip reason |
| Timeout | Test exceeded time limit | Check for infinite loops/slow API |
| Flaky | Intermittent failures | Improve test stability |

### Reading Allure Reports

1. **Overview Dashboard**
   - Pass/fail ratio
   - Trend over time
   - Broken tests list

2. **Test Details**
   - Full test name and description
   - Steps executed
   - Attachments (screenshots, traces)
   - Stack trace on failure

3. **Categories**
   - Product defects (actual bugs)
   - Test defects (test issues)
   - Known issues (marked)

### Reading Playwright Reports

```bash
# Open HTML report after test run
pnpm exec playwright show-report tests/e2e/playwright-report
```

Report includes:
- Test execution timeline
- Screenshots on failure
- Video recordings
- Network traces
- Browser console logs

### Reading k6 Results

Key metrics to watch:
- **http_req_duration p95**: 95th percentile response time
- **http_req_failed**: Percentage of failed requests
- **vus**: Virtual users at any point
- **iterations**: Total test iterations completed

---

## 6. Debugging Failed Tests

### API Test Failures

1. **Check API is running**
   ```bash
   curl http://localhost:4000/api/health
   ```

2. **Run single test with verbose**
   ```bash
   npx jest tests/api/integration/auth.api.spec.ts --verbose
   ```

3. **Check database state**
   ```bash
   pnpm prisma:studio
   ```

4. **Review logs**
   ```bash
   # API logs
   docker-compose logs api
   ```

### UI Test Failures

1. **Run in headed mode**
   ```bash
   pnpm test:ui -- --headed --project=chromium
   ```

2. **Run in debug mode**
   ```bash
   pnpm test:ui -- --debug
   ```

3. **Review trace**
   ```bash
   pnpm exec playwright show-trace tests/e2e/test-results/trace.zip
   ```

4. **Check for selector changes**
   - Inspect element in browser
   - Update `data-testid` if needed

### Common Failure Patterns

| Pattern | Cause | Fix |
|---------|-------|-----|
| Timeout on element | Element not rendered | Add proper wait condition |
| 401 Unauthorized | Token expired/invalid | Check auth setup |
| 500 Server Error | Backend bug | Check API logs |
| Flaky pass/fail | Race condition | Add explicit waits |
| Element not visible | CSS/z-index issue | Check element state |

---

## 7. Test Data Management

### Seeded Test Users

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| `customer@broxiva.com` | `password123` | Customer | Standard flows |
| `vendor@broxiva.com` | `password123` | Vendor | Vendor portal |
| `admin@broxiva.com` | `password123` | Admin | Admin panel |

### Seeding Data

```bash
# Seed all test data
pnpm db:seed

# Reset and reseed
pnpm db:reset && pnpm db:seed
```

### Test Isolation

- Each test should be independent
- Use unique identifiers (timestamps, UUIDs)
- Clean up created data when possible
- Don't rely on execution order

---

## 8. Adding New Tests

### API Test Template

```typescript
// tests/api/integration/[module].api.spec.ts

import { describe, test, expect } from '@jest/globals';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

describe('Module API Tests', () => {
  describe('GET /api/endpoint', () => {
    test('should return expected response', async () => {
      const response = await fetch(`${API_BASE_URL}/api/endpoint`);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('expected_field');
    });

    test('should return 401 without auth', async () => {
      const response = await fetch(`${API_BASE_URL}/api/protected`);
      expect(response.status).toBe(401);
    });
  });
});
```

### Playwright Test Template

```typescript
// tests/e2e/web/[feature].spec.ts

import { test, expect } from '@playwright/test';

test.describe('Feature Flow', () => {
  test('should complete flow successfully', async ({ page }) => {
    // Navigate
    await page.goto('/feature');

    // Wait for element (prefer test IDs)
    await expect(page.getByTestId('feature-title')).toBeVisible();

    // Interact
    await page.getByTestId('action-button').click();

    // Assert
    await expect(page).toHaveURL(/success/);
  });
});
```

### Best Practices

1. **Use `data-testid`** for selectors
2. **Avoid arbitrary waits** (`sleep(1000)`)
3. **Test one thing per test**
4. **Use descriptive test names**
5. **Include negative test cases**
6. **Document skipped tests**

---

## 9. Troubleshooting

### "API not ready" Error

```bash
# Check if API is running
curl http://localhost:4000/api/health

# Check Docker services
docker-compose ps

# Restart services
pnpm docker:down && pnpm docker:up
```

### "Database connection failed"

```bash
# Check PostgreSQL
docker-compose logs postgres

# Reset database
pnpm db:push
```

### "Redis connection failed"

```bash
# Check Redis
docker-compose logs redis

# Test Redis connection
redis-cli ping
```

### Playwright Browser Issues

```bash
# Reinstall browsers
pnpm exec playwright install --with-deps

# Clear cache
rm -rf ~/.cache/ms-playwright
```

### k6 "command not found"

```bash
# Install k6
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

### Flaky Tests

1. **Identify pattern**: Run test multiple times
2. **Check for race conditions**: Add explicit waits
3. **Check for data dependencies**: Ensure test isolation
4. **Check for timing issues**: Use `waitFor` APIs
5. **Mark as flaky** (temporarily): Add retry configuration

---

## Support

- **Slack**: #qa-automation
- **Issues**: GitHub Issues with `qa` label
- **Dashboard**: [Allure Report](https://broxiva.github.io/broxiva/allure-report)

---

## Appendix: Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `API_BASE_URL` | API server URL | `http://localhost:4000` |
| `BASE_URL` | Web app URL | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL connection | See `.env.example` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `CI` | CI environment flag | `false` |
| `NODE_ENV` | Environment mode | `development` |
