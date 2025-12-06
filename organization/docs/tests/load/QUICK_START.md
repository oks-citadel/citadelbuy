# k6 Load Testing Quick Start

## Installation

### Install k6

**macOS**:
```bash
brew install k6
```

**Windows**:
```bash
choco install k6
```

**Linux**:
```bash
# See https://k6.io/docs/getting-started/installation
```

### Verify Installation

```bash
k6 version
```

## Environment Setup

Set your target environment:

```bash
export BASE_URL=http://localhost:3000
export API_URL=http://localhost:4000
```

## Run Your First Test

### Quick Test (Single Scenario)

```bash
# From project root
k6 run tests/load/scenarios/auth.js
```

### Using the Test Runner

```bash
# Run single scenario
./scripts/run-load-tests.sh --scenario auth --duration 2m --vus 10

# Run all scenarios
./scripts/run-load-tests.sh --all --env staging --report

# Run stress test
./scripts/run-load-tests.sh --scenario checkout --type stress
```

## Available Scenarios

1. **auth** - Authentication flows (login, registration, token refresh)
2. **checkout** - Complete checkout process (cart to payment)
3. **search** - Product search and filtering
4. **api-stress** - Stress test for all API endpoints
5. **product-browse** - Product catalog browsing
6. **user-registration** - User signup flows
7. **order-history** - Order viewing and management
8. **admin-operations** - Admin panel operations

## Test Types

- **smoke**: Quick validation (1 VU, 1 min)
- **load**: Average load (10-20 VUs, 16 min)
- **stress**: Find breaking point (up to 100 VUs, 26 min)
- **spike**: Sudden traffic surge (10 to 100 VUs)
- **soak**: Sustained load (20 VUs, 30 min)

## Understanding Results

Key metrics to watch:
- **http_req_duration**: Response time (target p95 < 500ms)
- **http_req_failed**: Error rate (target < 1%)
- **checks**: Test assertions pass rate (target > 95%)

## Next Steps

1. Read the [comprehensive guide](../../docs/LOAD_TESTING_GUIDE.md)
2. Review [existing scenarios](./scenarios/)
3. Check the [pre-production checklist](../../docs/PRE_PRODUCTION_LOAD_TEST_CHECKLIST.md)
4. Set up [Grafana dashboard](../../infrastructure/grafana/k6-dashboard.json)

## Common Commands

```bash
# Smoke test
k6 run --scenario smoke tests/load/scenarios/auth.js

# Custom VUs and duration
k6 run --vus 50 --duration 5m tests/load/scenarios/checkout.js

# Output to JSON
k6 run --out json=results.json tests/load/scenarios/search.js

# Output to InfluxDB (for Grafana)
k6 run --out influxdb=http://localhost:8086/k6db tests/load/scenarios/checkout.js
```

## Support

- Full documentation: `docs/LOAD_TESTING_GUIDE.md`
- Test scenarios: `tests/load/scenarios/`
- k6 docs: https://k6.io/docs/
