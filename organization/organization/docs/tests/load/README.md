# Load Testing with k6

This directory contains load testing scenarios for the Broxiva e-commerce platform using [k6](https://k6.io/), a modern load testing tool.

## Overview

The load testing suite includes comprehensive tests for:
- Authentication flows
- Checkout process
- Product search and discovery
- API stress testing

## Prerequisites

### Install k6

**macOS (Homebrew):**
```bash
brew install k6
```

**Windows (Chocolatey):**
```bash
choco install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Docker:**
```bash
docker pull grafana/k6
```

## Environment Setup

Set the following environment variables before running tests:

```bash
export BASE_URL=http://localhost:3000
export API_URL=http://localhost:4000
```

Or create a `.env` file:
```
BASE_URL=http://localhost:3000
API_URL=http://localhost:4000
```

## Test Scenarios

### 1. Authentication Load Test (`scenarios/auth.js`)

Tests authentication endpoints including login, registration, token refresh, and social login.

**Run the test:**
```bash
k6 run tests/load/scenarios/auth.js
```

**With custom configuration:**
```bash
k6 run --vus 10 --duration 30s tests/load/scenarios/auth.js
```

**Key metrics:**
- Login success/failure rate
- Registration success rate
- Token refresh duration
- Response times for auth operations

### 2. Checkout Flow Test (`scenarios/checkout.js`)

Tests the complete e-commerce checkout process from cart to order placement.

**Run the test:**
```bash
k6 run tests/load/scenarios/checkout.js
```

**With environment variables:**
```bash
BASE_URL=https://staging.broxiva.com API_URL=https://api.staging.broxiva.com k6 run tests/load/scenarios/checkout.js
```

**Key metrics:**
- Checkout success rate
- Complete checkout duration
- Cart operation counts
- Payment processing metrics

### 3. Search & Discovery Test (`scenarios/search.js`)

Tests product search, filtering, category browsing, and product detail views.

**Run the test:**
```bash
k6 run tests/load/scenarios/search.js
```

**Key metrics:**
- Search result counts
- Search relevance rate
- Product view counts
- Category browsing metrics

### 4. API Stress Test (`scenarios/api-stress.js`)

Comprehensive stress test for all major API endpoints to identify breaking points.

**Run the test:**
```bash
k6 run tests/load/scenarios/api-stress.js
```

**Key metrics:**
- Error rates under stress
- Rate limiting effectiveness
- Server error counts
- Cached response metrics

## Test Scenarios Types

Each test file supports multiple scenario types defined in `k6-config.js`:

### Smoke Test
Minimal load to verify basic functionality.
```bash
k6 run --scenario smoke tests/load/scenarios/auth.js
```

### Load Test
Average expected load simulation.
```bash
k6 run --scenario load tests/load/scenarios/checkout.js
```

### Stress Test
Find the system's breaking point.
```bash
k6 run --scenario stress tests/load/scenarios/api-stress.js
```

### Spike Test
Sudden traffic surge simulation.
```bash
k6 run --scenario spike tests/load/scenarios/search.js
```

### Soak Test
Sustained load over extended period.
```bash
k6 run --scenario soak tests/load/scenarios/checkout.js
```

## Running Tests with Docker

If you prefer to use Docker:

```bash
docker run --rm -i \
  -e BASE_URL=http://host.docker.internal:3000 \
  -e API_URL=http://host.docker.internal:4000 \
  -v $(pwd):/app \
  grafana/k6 run /app/tests/load/scenarios/auth.js
```

## Advanced Usage

### Custom Virtual Users and Duration

```bash
k6 run --vus 50 --duration 5m tests/load/scenarios/checkout.js
```

### Custom Thresholds

Create a custom options file or modify the scenario directly:

```javascript
export const options = {
  vus: 100,
  duration: '10m',
  thresholds: {
    'http_req_duration': ['p(95)<1000'],
    'http_req_failed': ['rate<0.01'],
  },
};
```

### Output to Different Formats

**JSON output:**
```bash
k6 run --out json=results.json tests/load/scenarios/auth.js
```

**CSV output:**
```bash
k6 run --out csv=results.csv tests/load/scenarios/checkout.js
```

**InfluxDB output:**
```bash
k6 run --out influxdb=http://localhost:8086/k6 tests/load/scenarios/search.js
```

### Cloud Output (k6 Cloud)

```bash
k6 cloud tests/load/scenarios/api-stress.js
```

## Test Data Setup

Before running load tests, ensure your test environment has:

1. **Test Users** - Pre-seeded test users defined in `k6-config.js`:
   - `loadtest1@broxiva.test` - `loadtest5@broxiva.test`
   - All with password: `Test@1234`

2. **Test Products** - Sample products with IDs 1-30

3. **Test Coupons** - Sample coupon code: `LOAD10`

### Seed Test Data

Run the database seeder with load test data:

```bash
cd apps/api
npm run seed:loadtest
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Load Tests
on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install k6
        run: |
          curl -L https://github.com/grafana/k6/releases/download/v0.45.0/k6-v0.45.0-linux-amd64.tar.gz | tar xvz
          sudo mv k6-v0.45.0-linux-amd64/k6 /usr/local/bin/

      - name: Run Load Tests
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
          API_URL: ${{ secrets.STAGING_API_URL }}
        run: |
          k6 run tests/load/scenarios/auth.js
          k6 run tests/load/scenarios/checkout.js
          k6 run tests/load/scenarios/search.js
```

## Interpreting Results

### Key Metrics

- **http_req_duration** - Response time
  - p(95) - 95th percentile (95% of requests faster than this)
  - p(99) - 99th percentile

- **http_req_failed** - Failed requests rate
  - Should be < 1% for production

- **iteration_duration** - Complete test iteration time

- **checks** - Assertion pass rate
  - Should be > 95%

### Sample Output

```
     ✓ login: status is 200 or 201
     ✓ login: has access token
     ✓ login: response time < 800ms

     checks.........................: 95.23% ✓ 1905 ✗ 95
     data_received..................: 2.3 MB 38 kB/s
     data_sent......................: 890 kB 15 kB/s
     http_req_duration..............: avg=245.32ms min=89.21ms med=198.76ms max=1.2s p(95)=456.89ms p(99)=678.45ms
     http_req_failed................: 2.34%  ✓ 47   ✗ 1953
     iterations.....................: 2000   33.33/s
     login_success..................: 1953   count
     vus............................: 10     min=10 max=10
     vus_max........................: 10     min=10 max=10
```

### Performance Targets

**Good Performance:**
- p(95) < 500ms for most endpoints
- p(95) < 1500ms for checkout/payment
- Error rate < 1%
- Check success rate > 95%

**Acceptable Performance:**
- p(95) < 1000ms for most endpoints
- p(95) < 2500ms for checkout/payment
- Error rate < 5%
- Check success rate > 90%

## Troubleshooting

### Connection Refused

Ensure your application is running:
```bash
# Terminal 1 - Start API
cd apps/api
npm run start:dev

# Terminal 2 - Start Web
cd apps/web
npm run dev

# Terminal 3 - Run tests
k6 run tests/load/scenarios/auth.js
```

### Rate Limiting

If you hit rate limits:
1. Reduce VUs: `--vus 5`
2. Increase think time in test scripts
3. Adjust rate limiting configuration in your application

### High Error Rates

1. Check application logs for errors
2. Monitor database connections
3. Check Redis/cache availability
4. Verify test data exists

### Memory Issues

For large tests, increase k6 memory:
```bash
k6 run --no-summary tests/load/scenarios/api-stress.js
```

## Best Practices

1. **Start Small** - Begin with smoke tests, gradually increase load
2. **Monitor Resources** - Watch CPU, memory, database during tests
3. **Test Realistic Scenarios** - Match production traffic patterns
4. **Use Think Time** - Add realistic delays between requests
5. **Isolate Tests** - Test staging/test environment, not production
6. **Version Control Results** - Track performance over time
7. **Set Baselines** - Establish performance benchmarks
8. **Regular Testing** - Run load tests regularly, not just before release

## Integration with Monitoring

### Grafana Dashboard

Import k6 metrics to Grafana for visualization:

```bash
k6 run --out influxdb=http://localhost:8086/k6db tests/load/scenarios/checkout.js
```

### New Relic / DataDog

Use custom outputs or APM integration to correlate load test results with application metrics.

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)
- [k6 Cloud](https://k6.io/cloud/)
- [Performance Testing Guidance](https://k6.io/docs/test-types/introduction/)

## Support

For issues or questions:
- Check the k6 community forum
- Review application logs during test runs
- Contact the DevOps team for infrastructure questions
