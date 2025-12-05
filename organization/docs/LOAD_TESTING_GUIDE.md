# CitadelBuy Load Testing Guide

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Test Scenarios](#test-scenarios)
- [Running Tests](#running-tests)
- [Interpreting Results](#interpreting-results)
- [Performance Baselines](#performance-baselines)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Advanced Topics](#advanced-topics)

## Overview

CitadelBuy uses [k6](https://k6.io/) for load testing and performance validation. This guide provides comprehensive instructions for running, analyzing, and maintaining load tests for the platform.

### Why Load Testing?

- **Performance Validation**: Ensure the system meets performance requirements under expected load
- **Capacity Planning**: Determine system capacity and identify bottlenecks
- **Regression Prevention**: Catch performance regressions before they reach production
- **SLA Compliance**: Validate service level agreements and response time objectives
- **Scalability Testing**: Understand system behavior under various load conditions

### Test Philosophy

Our load testing strategy follows these principles:

1. **Realistic Scenarios**: Tests simulate actual user behavior patterns
2. **Environment Parity**: Test environments mirror production configurations
3. **Continuous Testing**: Load tests run regularly, not just before releases
4. **Actionable Results**: Tests provide clear metrics and actionable insights
5. **Progressive Load**: Tests gradually increase load to identify breaking points

## Prerequisites

### System Requirements

- **Operating System**: Linux, macOS, or Windows
- **RAM**: Minimum 4GB (8GB+ recommended for stress tests)
- **CPU**: 2+ cores recommended
- **Network**: Stable connection to target environment

### Required Software

1. **k6**: Load testing tool
2. **Git**: Version control (for accessing test scripts)
3. **Node.js**: For test data generation (optional)
4. **Docker**: For containerized test execution (optional)

### Access Requirements

- Access to target environment (local, staging, or production)
- Valid test user credentials
- Network access to API endpoints
- (Optional) InfluxDB and Grafana for metrics visualization

## Installation

### Install k6

#### macOS (Homebrew)

```bash
brew install k6
```

#### Windows (Chocolatey)

```bash
choco install k6
```

#### Windows (Scoop)

```bash
scoop install k6
```

#### Linux (Debian/Ubuntu)

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

#### Using Docker

```bash
docker pull grafana/k6:latest
```

### Verify Installation

```bash
k6 version
```

Expected output: `k6 v0.45.0` (or later)

### Clone Repository

```bash
git clone <repository-url>
cd organization
```

### Environment Configuration

Create a `.env` file in the `tests/load` directory:

```bash
# Local Development
BASE_URL=http://localhost:3000
API_URL=http://localhost:4000

# Staging
# BASE_URL=https://staging.citadelbuy.com
# API_URL=https://api-staging.citadelbuy.com

# Production (use with caution!)
# BASE_URL=https://citadelbuy.com
# API_URL=https://api.citadelbuy.com
```

## Test Scenarios

CitadelBuy includes eight comprehensive load test scenarios:

### 1. Authentication Tests (`auth.js`)

Tests authentication flows including login, registration, token refresh, and social authentication.

**Key Metrics**:
- Login success/failure rate
- Registration success rate
- Token refresh duration
- Password reset flow performance

**Run Command**:
```bash
k6 run tests/load/scenarios/auth.js
```

### 2. Checkout Flow Tests (`checkout.js`)

Tests the complete e-commerce checkout process from cart to order placement.

**Key Metrics**:
- Checkout success rate
- Complete checkout duration
- Cart operation performance
- Payment processing time

**Run Command**:
```bash
k6 run tests/load/scenarios/checkout.js
```

### 3. Product Search Tests (`search.js`)

Tests product search, filtering, and discovery features.

**Key Metrics**:
- Search result relevance
- Search response time
- Product view counts
- Category browsing performance

**Run Command**:
```bash
k6 run tests/load/scenarios/search.js
```

### 4. API Stress Tests (`api-stress.js`)

Comprehensive stress test for all major API endpoints to identify breaking points.

**Key Metrics**:
- Error rates under stress
- Rate limiting effectiveness
- Server error counts
- System recovery time

**Run Command**:
```bash
k6 run tests/load/scenarios/api-stress.js
```

### 5. Product Browse Tests (`product-browse.js`)

Tests realistic product catalog browsing patterns.

**Key Metrics**:
- Page view counts
- Product detail view performance
- Browse session duration
- Products viewed per session

**Run Command**:
```bash
k6 run tests/load/scenarios/product-browse.js
```

### 6. User Registration Tests (`user-registration.js`)

Tests user signup flows with various validation scenarios.

**Key Metrics**:
- Registration success/failure rate
- Profile completion rate
- Email validation performance
- Duplicate prevention effectiveness

**Run Command**:
```bash
k6 run tests/load/scenarios/user-registration.js
```

### 7. Order History Tests (`order-history.js`)

Tests order viewing, tracking, and management operations.

**Key Metrics**:
- Order list load time
- Order detail view performance
- Tracking request performance
- Invoice download time

**Run Command**:
```bash
k6 run tests/load/scenarios/order-history.js
```

### 8. Admin Operations Tests (`admin-operations.js`)

Tests administrative panel operations with reduced concurrent users.

**Key Metrics**:
- Dashboard load time
- User/product/order management performance
- Report generation duration
- Bulk operation performance

**Run Command**:
```bash
k6 run tests/load/scenarios/admin-operations.js
```

## Running Tests

### Basic Test Execution

Run a single scenario:

```bash
k6 run tests/load/scenarios/auth.js
```

### Using the Test Runner Script

The `run-load-tests.sh` script provides a convenient way to run tests with various configurations:

#### Run Single Scenario

```bash
./scripts/run-load-tests.sh --scenario auth --duration 2m --vus 10
```

#### Run All Scenarios

```bash
./scripts/run-load-tests.sh --all --env staging --report
```

#### Run Stress Test

```bash
./scripts/run-load-tests.sh --scenario checkout --type stress
```

#### Generate HTML Reports

```bash
./scripts/run-load-tests.sh --scenario search --report
```

#### Compare with Baseline

```bash
./scripts/run-load-tests.sh --all --compare
```

### Test Types

k6 supports multiple test types, each serving different purposes:

#### Smoke Test

Quick validation with minimal load to verify basic functionality.

```bash
k6 run --scenario smoke tests/load/scenarios/auth.js
```

**Configuration**:
- VUs: 1
- Duration: 1 minute

#### Load Test

Average expected load simulation.

```bash
k6 run --scenario load tests/load/scenarios/checkout.js
```

**Configuration**:
- VUs: Ramps from 0 to 20
- Duration: 16 minutes (with ramp-up/down)

#### Stress Test

Find the system's breaking point by gradually increasing load.

```bash
k6 run --scenario stress tests/load/scenarios/api-stress.js
```

**Configuration**:
- VUs: Ramps from 0 to 100
- Duration: 26 minutes

#### Spike Test

Sudden traffic surge simulation.

```bash
k6 run --scenario spike tests/load/scenarios/search.js
```

**Configuration**:
- VUs: Sudden spike from 10 to 100
- Duration: 6.5 minutes

#### Soak Test

Sustained load over extended period to identify memory leaks and degradation.

```bash
k6 run --scenario soak tests/load/scenarios/checkout.js
```

**Configuration**:
- VUs: 20 (constant)
- Duration: 30 minutes

### Custom Configuration

Override default settings using command-line options:

```bash
# Custom VUs and duration
k6 run --vus 50 --duration 5m tests/load/scenarios/auth.js

# Custom thresholds
k6 run --thresholds 'http_req_duration=p(95)<500' tests/load/scenarios/search.js

# Output to file
k6 run --out json=results.json tests/load/scenarios/checkout.js

# Multiple outputs
k6 run --out json=results.json --out csv=metrics.csv tests/load/scenarios/auth.js
```

### Environment-Specific Testing

#### Local Development

```bash
export BASE_URL=http://localhost:3000
export API_URL=http://localhost:4000
k6 run tests/load/scenarios/auth.js
```

#### Staging Environment

```bash
export BASE_URL=https://staging.citadelbuy.com
export API_URL=https://api-staging.citadelbuy.com
k6 run tests/load/scenarios/checkout.js
```

#### Production (Caution!)

```bash
# Only run during maintenance windows or with approval
export BASE_URL=https://citadelbuy.com
export API_URL=https://api.citadelbuy.com
k6 run --vus 5 --duration 1m tests/load/scenarios/auth.js
```

## Interpreting Results

### Understanding k6 Output

k6 provides comprehensive metrics after each test run:

```
     ✓ login: status is 200 or 201
     ✓ login: has access token
     ✓ login: response time < 800ms

     checks.........................: 95.23% ✓ 1905      ✗ 95
     data_received..................: 2.3 MB 38 kB/s
     data_sent......................: 890 kB 15 kB/s
     http_req_duration..............: avg=245.32ms min=89.21ms med=198.76ms max=1.2s p(95)=456.89ms p(99)=678.45ms
     http_req_failed................: 2.34%  ✓ 47        ✗ 1953
     iterations.....................: 2000   33.33/s
     vus............................: 10     min=10 max=10
     vus_max........................: 10     min=10 max=10
```

### Key Metrics Explained

#### HTTP Request Duration

- **avg**: Average response time
- **min**: Fastest request
- **med**: Median (50th percentile)
- **max**: Slowest request
- **p(95)**: 95% of requests faster than this value
- **p(99)**: 99% of requests faster than this value

**Target**: p(95) < 500ms for most endpoints, < 1500ms for checkout/payment

#### HTTP Request Failed Rate

Percentage of failed HTTP requests (4xx, 5xx errors).

**Target**: < 1% for production, < 5% under stress

#### Checks Pass Rate

Percentage of assertion checks that passed.

**Target**: > 95%

#### Iterations

Number of complete test iterations executed.

**Target**: Varies by test scenario

#### Virtual Users (VUs)

Number of concurrent virtual users.

**Target**: Match expected production load

### Status Code Analysis

- **2xx**: Success - Expected for most requests
- **3xx**: Redirect - Acceptable for certain flows
- **4xx**: Client error - May indicate validation issues
- **5xx**: Server error - Indicates system problems

### Threshold Evaluation

Thresholds define pass/fail criteria. If any threshold fails, the test fails:

```
✓ http_req_duration..............: p(95)<500ms
✗ http_req_failed................: rate<0.01
```

### Custom Metrics

Each scenario includes custom metrics for specific insights:

**Authentication**:
- `login_success`: Successful login count
- `registration_success`: Successful registration count
- `token_refresh_duration`: Token refresh performance

**Checkout**:
- `checkout_success_rate`: Percentage of successful checkouts
- `orders_created`: Number of orders created
- `payments_processed`: Number of successful payments

**Search**:
- `search_results_count`: Average search results returned
- `search_relevance_rate`: Percentage of searches with results
- `product_views`: Number of product detail views

## Performance Baselines

### Target Response Times (p95)

| Endpoint Category | Target p(95) | Acceptable p(95) | Critical p(95) |
|------------------|--------------|------------------|----------------|
| Homepage | 800ms | 1200ms | 2000ms |
| Product List | 600ms | 1000ms | 1500ms |
| Product Detail | 400ms | 700ms | 1200ms |
| Search | 600ms | 900ms | 1500ms |
| Login | 800ms | 1200ms | 2000ms |
| Registration | 1000ms | 1500ms | 2500ms |
| Cart Operations | 600ms | 900ms | 1500ms |
| Checkout | 1500ms | 2500ms | 4000ms |
| Payment | 2000ms | 3500ms | 6000ms |
| Admin Dashboard | 1000ms | 1500ms | 2500ms |

### Error Rate Targets

| Environment | Target | Acceptable | Critical |
|-------------|--------|------------|----------|
| Production | < 0.1% | < 1% | > 5% |
| Staging | < 1% | < 5% | > 10% |
| Stress Test | < 5% | < 10% | > 20% |

### Throughput Baselines

| Metric | Minimum | Target | Excellent |
|--------|---------|--------|-----------|
| Requests/sec | 50 | 100 | 200+ |
| Checkout Success Rate | 85% | 95% | 99%+ |
| Check Pass Rate | 90% | 95% | 99%+ |

### Capacity Planning

**Expected Production Load**:
- Average concurrent users: 50-100
- Peak concurrent users: 200-500
- Average requests/sec: 100-200
- Peak requests/sec: 500-1000

**System Should Handle**:
- 2x average load comfortably
- 5x average load under stress
- 10x average load for short bursts

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/load-tests.yml`:

```yaml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:
  pull_request:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'tests/load/**'

jobs:
  smoke-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install k6
        run: |
          curl -L https://github.com/grafana/k6/releases/download/v0.45.0/k6-v0.45.0-linux-amd64.tar.gz | tar xvz
          sudo mv k6-v0.45.0-linux-amd64/k6 /usr/local/bin/

      - name: Run Smoke Tests
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
          API_URL: ${{ secrets.STAGING_API_URL }}
        run: |
          k6 run --scenario smoke tests/load/scenarios/auth.js
          k6 run --scenario smoke tests/load/scenarios/checkout.js

      - name: Upload Results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: load-test-results
          path: test-results/

  load-test:
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
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
          ./scripts/run-load-tests.sh --all --env staging --report

      - name: Upload Results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: load-test-results
          path: test-results/
```

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
load-tests:
  image: grafana/k6:latest
  stage: test
  only:
    - schedules
    - main
  script:
    - k6 run --env BASE_URL=$STAGING_URL --env API_URL=$STAGING_API_URL tests/load/scenarios/auth.js
    - k6 run --env BASE_URL=$STAGING_URL --env API_URL=$STAGING_API_URL tests/load/scenarios/checkout.js
  artifacts:
    paths:
      - test-results/
    expire_in: 30 days
```

### Jenkins

Create `Jenkinsfile`:

```groovy
pipeline {
    agent any

    triggers {
        cron('H 2 * * *')  // Daily at 2 AM
    }

    environment {
        BASE_URL = credentials('staging-base-url')
        API_URL = credentials('staging-api-url')
    }

    stages {
        stage('Setup') {
            steps {
                sh 'k6 version'
            }
        }

        stage('Smoke Tests') {
            steps {
                sh '''
                    k6 run --scenario smoke tests/load/scenarios/auth.js
                    k6 run --scenario smoke tests/load/scenarios/checkout.js
                '''
            }
        }

        stage('Load Tests') {
            when {
                branch 'main'
            }
            steps {
                sh './scripts/run-load-tests.sh --all --env staging --report'
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'test-results/**/*', allowEmptyArchive: true
        }
    }
}
```

## Best Practices

### Test Data Management

1. **Use Dedicated Test Users**: Create specific test accounts that won't affect production data
2. **Reset Data Between Tests**: Clean up test data to ensure consistent results
3. **Avoid Hardcoded Credentials**: Use environment variables or secret management
4. **Generate Realistic Data**: Use data that mimics production patterns

### Test Execution

1. **Start Small**: Begin with smoke tests before running full load tests
2. **Test Incrementally**: Gradually increase load to identify breaking points
3. **Monitor Resources**: Watch CPU, memory, and database during tests
4. **Test Regularly**: Schedule automated tests, don't wait for releases
5. **Document Results**: Track performance trends over time

### Environment Considerations

1. **Use Dedicated Test Environments**: Don't test against production without approval
2. **Match Production Configuration**: Ensure test environment mirrors production
3. **Consider Network Conditions**: Account for network latency and bandwidth
4. **Isolate Tests**: Run one test at a time to avoid interference

### Result Analysis

1. **Look for Trends**: Compare results across test runs
2. **Identify Patterns**: Look for patterns in failures or slow requests
3. **Correlate with Logs**: Review application logs during test execution
4. **Share Results**: Communicate findings with development and operations teams

### Maintenance

1. **Update Tests**: Keep tests current with application changes
2. **Review Thresholds**: Adjust thresholds as system evolves
3. **Refactor Tests**: Improve test code quality and maintainability
4. **Version Control**: Track test changes with git

## Troubleshooting

### Common Issues

#### Connection Refused

**Problem**: Tests fail with "connection refused" errors.

**Solution**:
1. Verify application is running:
   ```bash
   curl http://localhost:4000/health
   ```
2. Check environment variables are set correctly
3. Verify firewall rules allow connections

#### High Error Rates

**Problem**: Tests show > 5% error rate.

**Solution**:
1. Check application logs for errors
2. Monitor database connections and query performance
3. Verify Redis/cache availability
4. Check rate limiting configuration
5. Review system resource utilization

#### Rate Limiting

**Problem**: Tests hit rate limits (429 errors).

**Solution**:
1. Reduce virtual users: `--vus 5`
2. Increase think time in test scripts
3. Adjust rate limiting configuration for test environment
4. Use distributed testing for higher loads

#### Memory Issues

**Problem**: k6 or application runs out of memory.

**Solution**:
1. Reduce virtual users
2. Use `--no-summary` flag for k6
3. Increase system memory
4. Check for memory leaks in application

#### Slow Tests

**Problem**: Tests take too long to complete.

**Solution**:
1. Reduce test duration
2. Use parallel test execution
3. Optimize test scenarios
4. Use faster hardware

### Debugging Tips

#### Enable Verbose Logging

```bash
k6 run --http-debug tests/load/scenarios/auth.js
```

#### Use Custom Tags

Add tags to identify specific requests:

```javascript
const response = http.get(url, {
  tags: { name: 'debug_request', scenario: 'auth' }
});
```

#### Output to InfluxDB

Send metrics to InfluxDB for detailed analysis:

```bash
k6 run --out influxdb=http://localhost:8086/k6db tests/load/scenarios/checkout.js
```

#### Review Summary Export

Export detailed summary for analysis:

```bash
k6 run --summary-export=summary.json tests/load/scenarios/search.js
```

## Advanced Topics

### Distributed Load Testing

For generating higher loads, distribute k6 across multiple machines:

```bash
# Machine 1
k6 run --out influxdb=http://influxdb:8086/k6db tests/load/scenarios/checkout.js

# Machine 2
k6 run --out influxdb=http://influxdb:8086/k6db tests/load/scenarios/checkout.js
```

### Custom Executors

k6 supports various executors for different load patterns:

```javascript
export const options = {
  scenarios: {
    constant_load: {
      executor: 'constant-arrival-rate',
      rate: 30,
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 50,
    },
    ramping_load: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      stages: [
        { target: 50, duration: '2m' },
        { target: 50, duration: '3m' },
        { target: 0, duration: '2m' },
      ],
      preAllocatedVUs: 100,
    },
  },
};
```

### Real-Time Monitoring

Set up Grafana dashboard for real-time visualization:

1. Start InfluxDB:
   ```bash
   docker run -d -p 8086:8086 influxdb:1.8
   ```

2. Start Grafana:
   ```bash
   docker run -d -p 3000:3000 grafana/grafana
   ```

3. Import dashboard:
   ```bash
   # Use infrastructure/grafana/k6-dashboard.json
   ```

4. Run tests with InfluxDB output:
   ```bash
   k6 run --out influxdb=http://localhost:8086/k6db tests/load/scenarios/checkout.js
   ```

### Cloud Execution

Run tests in k6 Cloud for managed execution:

```bash
# Sign up at k6.io/cloud
k6 login cloud

# Run test in cloud
k6 cloud tests/load/scenarios/api-stress.js
```

### Performance Comparison

Compare current run against baseline:

```bash
# Save baseline
k6 run --summary-export=baseline.json tests/load/scenarios/auth.js

# Compare current run
k6 run --summary-export=current.json tests/load/scenarios/auth.js
# Use custom script to compare baseline.json and current.json
```

## When to Run Load Tests

### Pre-Release Checklist

Run the following before each release:

- [ ] Smoke tests on all scenarios
- [ ] Load tests on critical paths (auth, checkout, search)
- [ ] Stress test on API endpoints
- [ ] Review and compare with baseline
- [ ] Document any performance changes

### Continuous Testing Schedule

- **Daily**: Smoke tests on staging
- **Weekly**: Full load test suite on staging
- **Monthly**: Stress tests and capacity planning
- **Pre-Release**: Comprehensive test suite
- **Post-Incident**: Targeted tests for affected areas

### Testing Triggers

Run load tests when:
- Adding new features
- Modifying critical paths
- Changing infrastructure
- Before major releases
- After performance incidents
- During capacity planning

## Support and Resources

### Documentation

- [k6 Official Documentation](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)
- [k6 Community Forum](https://community.k6.io/)

### Internal Resources

- Test scenarios: `tests/load/scenarios/`
- Test runner: `scripts/run-load-tests.sh`
- Dashboard: `infrastructure/grafana/k6-dashboard.json`
- Configuration: `tests/load/k6-config.js`

### Getting Help

- Review this guide and test documentation
- Check k6 community forum for common issues
- Contact DevOps team for infrastructure questions
- Review application logs during failed tests

---

**Last Updated**: December 2024
**Version**: 1.0
**Maintainer**: DevOps Team
