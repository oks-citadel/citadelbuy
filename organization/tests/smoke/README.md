# CitadelBuy Smoke Tests

Comprehensive smoke tests to verify critical system functionality after deployments.

## Quick Start

### Run All Smoke Tests

```bash
# From project root
pnpm exec playwright test tests/smoke/smoke-test.spec.ts

# With specific environment
PLAYWRIGHT_BASE_URL=https://staging.citadelbuy.com \
API_BASE_URL=https://api-staging.citadelbuy.com \
pnpm exec playwright test tests/smoke/
```

### Run Health Check Script

```bash
# Local API
./scripts/health-check.sh http://localhost:4000

# Staging API
./scripts/health-check.sh https://api-staging.citadelbuy.com

# Production API
./scripts/health-check.sh https://api.citadelbuy.com
```

### Run Deployment Verification

```bash
# Verify staging deployment
./scripts/verify-deployment.sh staging

# Verify production deployment
./scripts/verify-deployment.sh production
```

## Test Suites

### 1. API Health Tests
- ✅ Health endpoint verification
- ✅ Database connectivity
- ✅ Redis connectivity
- ✅ Liveness probe
- ✅ Readiness probe
- ✅ Detailed health metrics

### 2. Critical API Endpoints
- ✅ Products listing
- ✅ Categories listing
- ✅ Search functionality
- ✅ Authentication check

### 3. Frontend Rendering
- ✅ Homepage loads
- ✅ Products page loads
- ✅ Navigation renders
- ✅ Login page accessible
- ✅ 404 handling

### 4. Authentication Flow
- ✅ Login page accessible
- ✅ Register page accessible
- ✅ Form validation

### 5. Shopping Flow
- ✅ Browse products
- ✅ View product details
- ✅ Cart accessible

### 6. Performance Tests
- ✅ Homepage load time < 5s
- ✅ Products load time < 5s
- ✅ API response time < 1s

### 7. Responsive Design
- ✅ Mobile viewport (375x667)
- ✅ Tablet viewport (768x1024)
- ✅ Desktop viewport (1920x1080)

## CI/CD Integration

Smoke tests run automatically:
- **After deployments** - Via `deployment_status` trigger
- **Manual trigger** - Via GitHub Actions UI
- **Hourly monitoring** - Via cron schedule

### Manual Trigger

```bash
# Via GitHub CLI
gh workflow run smoke-test.yml -f environment=staging

# Via GitHub UI
Actions → Smoke Tests → Run workflow → Select environment
```

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

## Dependencies

- **Bash** - For shell scripts
- **curl** - For HTTP requests
- **jq** - For JSON parsing (optional)
- **bc** - For response time calculations
- **Node.js 20+** - For Playwright tests
- **pnpm** - For package management

## Environment Variables

```bash
# API URL
API_BASE_URL=http://localhost:4000

# Web URL
PLAYWRIGHT_BASE_URL=http://localhost:3000

# Timeouts
SMOKE_TEST_TIMEOUT=30000
```

## Troubleshooting

### Health Check Fails

1. Check if API is running: `curl http://localhost:4000/api/health`
2. Check database: `psql -U citadelbuy -d citadelbuy_dev -c "SELECT 1;"`
3. Check Redis: `redis-cli ping`

### E2E Tests Fail

1. Check Playwright installation: `pnpm exec playwright install`
2. Check web app is running: `curl http://localhost:3000`
3. Check test logs: `playwright-report/index.html`

### Scripts Not Executable

```bash
chmod +x scripts/health-check.sh
chmod +x scripts/verify-deployment.sh
```

## Further Reading

- See `SMOKE_TEST_REPORT.md` for complete documentation
- See `.github/workflows/smoke-test.yml` for CI configuration
- See `apps/api/src/modules/health/health.controller.ts` for health endpoints
