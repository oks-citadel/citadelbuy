# Smoke Test Suite

Comprehensive smoke tests for CitadelBuy staging environment validation.

## Overview

The smoke test suite validates critical functionality after deployment to ensure the application is working correctly before promoting to production or allowing broader testing.

## Test Categories

### 1. Health Checks
- API health endpoint
- Database connectivity
- Redis connectivity
- Memory usage
- Service readiness

### 2. Authentication
- Login flow
- Registration endpoint
- Token validation
- Session management

### 3. Product Operations
- Product listing
- Product search
- Category browsing
- Product details

### 4. Cart Operations
- View cart
- Add to cart
- Update cart
- Remove from cart

### 5. Checkout Flow
- Checkout initialization
- Payment processing readiness
- Order creation

### 6. Admin Panel
- Admin authentication
- Admin endpoints accessibility
- Protected routes

### 7. Performance
- API response times
- Database query performance
- Cache hit rates
- Resource utilization

## Configuration

### smoke-config.json

The main configuration file defines:
- Endpoint URLs
- Expected response schemas
- Performance thresholds
- Test data
- Critical user paths

### Environment Variables

```bash
STAGING_API_URL=https://staging-api.citadelbuy.com
STAGING_WEB_URL=https://staging.citadelbuy.com
SMOKE_TEST_TIMEOUT=10
SMOKE_TEST_RETRIES=3
```

## Running Tests

### Basic Usage

```bash
# Run all smoke tests
./scripts/smoke-tests.sh

# Run with specific namespace
./scripts/smoke-tests.sh citadelbuy-staging

# Run with custom configuration
SMOKE_CONFIG=./tests/smoke/custom-config.json ./scripts/smoke-tests.sh
```

### From CI/CD Pipeline

```bash
# Set environment variables
export STAGING_API_URL="https://staging-api.citadelbuy.com"
export K8S_NAMESPACE="citadelbuy-staging"

# Run smoke tests
./scripts/smoke-tests.sh citadelbuy-staging
```

### Manual Testing

```bash
# Test specific endpoint
curl -f https://staging-api.citadelbuy.com/api/health

# Test with authentication
curl -f -H "Authorization: Bearer $TOKEN" \
  https://staging-api.citadelbuy.com/api/products
```

## Test Results

### Output Formats

1. **Console Output**: Real-time test results with color coding
2. **Log Files**: Detailed logs in `logs/smoke-tests-*.log`
3. **Test Reports**: Summary reports in `logs/smoke-tests-report-*.txt`

### Interpreting Results

```
[PASS] Test Name - Test passed successfully
[FAIL] Test Name - Reason for failure
[SKIP] Test Name - Test was skipped
```

### Exit Codes

- `0`: All tests passed
- `1`: One or more tests failed
- `2`: Configuration or setup error

## Adding New Tests

### 1. Define Test Function

```bash
test_new_feature() {
    local test_name="New Feature Test"
    ((TESTS_RUN++))

    log INFO "Running: $test_name"

    # Test logic here
    local response
    response=$(make_http_request "GET" "$api_url/api/new-endpoint" "" "")

    local status_code=$(echo "$response" | tail -n 1)

    if [ "$status_code" -eq 200 ]; then
        test_passed "$test_name"
        return 0
    else
        test_failed "$test_name" "HTTP Status: $status_code"
        return 1
    fi
}
```

### 2. Add to Test Suite

Add your test function to `run_all_tests()` in `smoke-tests.sh`:

```bash
run_all_tests() {
    # ... existing tests ...

    log INFO "===== New Feature Tests ====="
    test_new_feature
    echo ""
}
```

### 3. Update Configuration

Add expected responses to `smoke-config.json`:

```json
{
  "expectedResponses": {
    "newFeature": {
      "statusCode": 200,
      "schema": {
        "type": "object",
        "required": ["data"],
        "properties": {
          "data": {
            "type": "string"
          }
        }
      }
    }
  }
}
```

## Best Practices

### Test Design
1. Keep tests independent and idempotent
2. Use descriptive test names
3. Test critical paths thoroughly
4. Include negative test cases
5. Set appropriate timeouts

### Performance
1. Run tests in parallel when possible
2. Cache authentication tokens
3. Minimize test data creation
4. Clean up test data after runs

### Maintenance
1. Update tests with API changes
2. Review and adjust thresholds regularly
3. Remove obsolete tests
4. Document test expectations

## Troubleshooting

### Common Issues

#### Tests Timing Out
```bash
# Increase timeout
export SMOKE_TEST_TIMEOUT=30
./scripts/smoke-tests.sh
```

#### Connection Refused
```bash
# Verify services are running
kubectl get pods -n citadelbuy-staging

# Check service endpoints
kubectl get svc -n citadelbuy-staging
```

#### Authentication Failures
```bash
# Verify test credentials
# Check auth service logs
kubectl logs -n citadelbuy-staging deployment/citadelbuy-api -f
```

### Debug Mode

Enable verbose logging:

```bash
# Set debug environment variable
export DEBUG=true
./scripts/smoke-tests.sh
```

## Integration with CI/CD

### GitHub Actions

```yaml
- name: Run Smoke Tests
  run: |
    export STAGING_API_URL="${{ secrets.STAGING_API_URL }}"
    export K8S_NAMESPACE="citadelbuy-staging"
    ./scripts/smoke-tests.sh citadelbuy-staging
```

### Jenkins

```groovy
stage('Smoke Tests') {
    steps {
        sh '''
            export STAGING_API_URL="${STAGING_API_URL}"
            ./scripts/smoke-tests.sh citadelbuy-staging
        '''
    }
}
```

### GitLab CI

```yaml
smoke_tests:
  stage: test
  script:
    - export STAGING_API_URL="${STAGING_API_URL}"
    - ./scripts/smoke-tests.sh citadelbuy-staging
```

## Continuous Monitoring

### Scheduled Tests

Run smoke tests on a schedule to detect issues early:

```bash
# Add to crontab
0 */6 * * * /path/to/citadelbuy/scripts/smoke-tests.sh citadelbuy-staging
```

### Alerting

Configure notifications in `smoke-config.json`:

```json
{
  "notifications": {
    "slack": {
      "enabled": true,
      "webhookUrl": "https://hooks.slack.com/...",
      "channels": ["#staging-alerts"]
    }
  }
}
```

## Contributing

When adding new features to CitadelBuy, ensure corresponding smoke tests are added:

1. Identify critical functionality
2. Write smoke tests
3. Update configuration
4. Test locally
5. Submit with feature PR

## Support

For issues or questions:
- Create an issue in the repository
- Contact the DevOps team
- Check deployment logs
- Review staging environment status
