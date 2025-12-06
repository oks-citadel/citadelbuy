#!/bin/bash

# ============================================
# CitadelBuy Smoke Test Suite
# ============================================
# Comprehensive smoke tests for staging environment
# Tests critical paths and validates deployment health

set -euo pipefail

# Color codes
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly TIMESTAMP=$(date +%Y%m%d_%H%M%S)
readonly TEST_LOG="${PROJECT_ROOT}/logs/smoke-tests-${TIMESTAMP}.log"

# Test Configuration
readonly K8S_NAMESPACE="${1:-citadelbuy-staging}"
readonly CONFIG_FILE="${PROJECT_ROOT}/tests/smoke/smoke-config.json"
readonly MAX_RETRIES=5
readonly RETRY_DELAY=3
readonly TIMEOUT=10

# Test Results
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Create logs directory
mkdir -p "${PROJECT_ROOT}/logs"

# ============================================
# Utility Functions
# ============================================

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case "$level" in
        INFO)
            echo -e "${BLUE}[INFO]${NC} ${message}"
            echo "[${timestamp}] [INFO] ${message}" >> "$TEST_LOG"
            ;;
        SUCCESS)
            echo -e "${GREEN}[SUCCESS]${NC} ${message}"
            echo "[${timestamp}] [SUCCESS] ${message}" >> "$TEST_LOG"
            ;;
        WARNING)
            echo -e "${YELLOW}[WARNING]${NC} ${message}"
            echo "[${timestamp}] [WARNING] ${message}" >> "$TEST_LOG"
            ;;
        ERROR)
            echo -e "${RED}[ERROR]${NC} ${message}"
            echo "[${timestamp}] [ERROR] ${message}" >> "$TEST_LOG"
            ;;
    esac
}

get_ingress_url() {
    local service=$1
    local ingress_host

    # Try to get ingress host from Kubernetes
    ingress_host=$(kubectl get ingress -n "$K8S_NAMESPACE" -o json 2>/dev/null | \
        jq -r ".items[] | select(.metadata.name | contains(\"$service\")) | .spec.rules[0].host" 2>/dev/null || echo "")

    if [ -z "$ingress_host" ] || [ "$ingress_host" == "null" ]; then
        # Fallback to LoadBalancer IP
        ingress_host=$(kubectl get service "$service" -n "$K8S_NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    fi

    if [ -z "$ingress_host" ]; then
        # Fallback to default staging URL
        case $service in
            *api*)
                echo "${STAGING_API_URL:-https://staging-api.citadelbuy.com}"
                ;;
            *web*)
                echo "${STAGING_WEB_URL:-https://staging.citadelbuy.com}"
                ;;
            *)
                echo ""
                ;;
        esac
    else
        echo "https://${ingress_host}"
    fi
}

make_http_request() {
    local method=$1
    local url=$2
    local data=${3:-}
    local headers=${4:-}

    local curl_cmd="curl -s -w '\n%{http_code}' -X ${method} '${url}' --max-time ${TIMEOUT}"

    if [ -n "$headers" ]; then
        curl_cmd="${curl_cmd} ${headers}"
    fi

    if [ -n "$data" ]; then
        curl_cmd="${curl_cmd} -d '${data}' -H 'Content-Type: application/json'"
    fi

    eval "$curl_cmd"
}

test_passed() {
    local test_name=$1
    ((TESTS_PASSED++))
    log SUCCESS "PASS: $test_name"
}

test_failed() {
    local test_name=$1
    local reason=${2:-"Unknown reason"}
    ((TESTS_FAILED++))
    log ERROR "FAIL: $test_name - $reason"
}

test_skipped() {
    local test_name=$1
    local reason=${2:-"Skipped"}
    ((TESTS_SKIPPED++))
    log WARNING "SKIP: $test_name - $reason"
}

# ============================================
# Health Check Tests
# ============================================

test_api_health() {
    local test_name="API Health Check"
    ((TESTS_RUN++))

    log INFO "Running: $test_name"

    local api_url
    api_url=$(get_ingress_url "citadelbuy-api")

    if [ -z "$api_url" ]; then
        test_failed "$test_name" "Could not determine API URL"
        return 1
    fi

    local response
    response=$(make_http_request "GET" "${api_url}/api/health" "" "")

    local body=$(echo "$response" | head -n -1)
    local status_code=$(echo "$response" | tail -n 1)

    if [ "$status_code" -eq 200 ]; then
        # Check if response contains expected health indicators
        if echo "$body" | jq -e '.status == "ok" or .database.status == "up"' > /dev/null 2>&1; then
            test_passed "$test_name"
            return 0
        else
            test_failed "$test_name" "Health response missing expected fields"
            return 1
        fi
    else
        test_failed "$test_name" "HTTP Status: $status_code"
        return 1
    fi
}

test_api_readiness() {
    local test_name="API Readiness Probe"
    ((TESTS_RUN++))

    log INFO "Running: $test_name"

    local api_url
    api_url=$(get_ingress_url "citadelbuy-api")

    if [ -z "$api_url" ]; then
        test_failed "$test_name" "Could not determine API URL"
        return 1
    fi

    local response
    response=$(make_http_request "GET" "${api_url}/api/health/ready" "" "")

    local status_code=$(echo "$response" | tail -n 1)

    if [ "$status_code" -eq 200 ]; then
        test_passed "$test_name"
        return 0
    else
        test_failed "$test_name" "HTTP Status: $status_code"
        return 1
    fi
}

test_database_connection() {
    local test_name="Database Connection"
    ((TESTS_RUN++))

    log INFO "Running: $test_name"

    local api_url
    api_url=$(get_ingress_url "citadelbuy-api")

    if [ -z "$api_url" ]; then
        test_failed "$test_name" "Could not determine API URL"
        return 1
    fi

    local response
    response=$(make_http_request "GET" "${api_url}/api/health/detailed" "" "")

    local body=$(echo "$response" | head -n -1)
    local status_code=$(echo "$response" | tail -n 1)

    if [ "$status_code" -eq 200 ]; then
        if echo "$body" | jq -e '.checks.database.status == "up"' > /dev/null 2>&1; then
            test_passed "$test_name"
            return 0
        else
            test_failed "$test_name" "Database status is not up"
            return 1
        fi
    else
        test_failed "$test_name" "HTTP Status: $status_code"
        return 1
    fi
}

test_redis_connection() {
    local test_name="Redis Connection"
    ((TESTS_RUN++))

    log INFO "Running: $test_name"

    local api_url
    api_url=$(get_ingress_url "citadelbuy-api")

    if [ -z "$api_url" ]; then
        test_failed "$test_name" "Could not determine API URL"
        return 1
    fi

    local response
    response=$(make_http_request "GET" "${api_url}/api/health/detailed" "" "")

    local body=$(echo "$response" | head -n -1)
    local status_code=$(echo "$response" | tail -n 1)

    if [ "$status_code" -eq 200 ]; then
        if echo "$body" | jq -e '.checks.redis.status == "up"' > /dev/null 2>&1; then
            test_passed "$test_name"
            return 0
        else
            test_failed "$test_name" "Redis status is not up"
            return 1
        fi
    else
        test_failed "$test_name" "HTTP Status: $status_code"
        return 1
    fi
}

# ============================================
# Authentication Tests
# ============================================

test_auth_login() {
    local test_name="Authentication - Login Flow"
    ((TESTS_RUN++))

    log INFO "Running: $test_name"

    local api_url
    api_url=$(get_ingress_url "citadelbuy-api")

    if [ -z "$api_url" ]; then
        test_failed "$test_name" "Could not determine API URL"
        return 1
    fi

    # Test with demo credentials (should fail but endpoint should work)
    local login_data='{"email":"test@example.com","password":"testpassword"}'
    local response
    response=$(make_http_request "POST" "${api_url}/api/auth/login" "$login_data" "")

    local status_code=$(echo "$response" | tail -n 1)

    # We expect 401 (unauthorized) or 400 (validation error), not 500 or connection errors
    if [ "$status_code" -eq 401 ] || [ "$status_code" -eq 400 ] || [ "$status_code" -eq 404 ]; then
        test_passed "$test_name"
        return 0
    elif [ "$status_code" -eq 200 ]; then
        test_passed "$test_name"
        return 0
    else
        test_failed "$test_name" "Unexpected HTTP Status: $status_code"
        return 1
    fi
}

test_auth_register_endpoint() {
    local test_name="Authentication - Register Endpoint"
    ((TESTS_RUN++))

    log INFO "Running: $test_name"

    local api_url
    api_url=$(get_ingress_url "citadelbuy-api")

    if [ -z "$api_url" ]; then
        test_failed "$test_name" "Could not determine API URL"
        return 1
    fi

    # Test register endpoint (should respond even if data is invalid)
    local register_data='{"email":"test@example.com","password":"testpassword","name":"Test User"}'
    local response
    response=$(make_http_request "POST" "${api_url}/api/auth/register" "$register_data" "")

    local status_code=$(echo "$response" | tail -n 1)

    # We expect some HTTP response (not connection error)
    if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 600 ]; then
        test_passed "$test_name"
        return 0
    else
        test_failed "$test_name" "No HTTP response received"
        return 1
    fi
}

# ============================================
# Product Tests
# ============================================

test_product_listing() {
    local test_name="Product Listing"
    ((TESTS_RUN++))

    log INFO "Running: $test_name"

    local api_url
    api_url=$(get_ingress_url "citadelbuy-api")

    if [ -z "$api_url" ]; then
        test_failed "$test_name" "Could not determine API URL"
        return 1
    fi

    local response
    response=$(make_http_request "GET" "${api_url}/api/products?page=1&limit=10" "" "")

    local body=$(echo "$response" | head -n -1)
    local status_code=$(echo "$response" | tail -n 1)

    if [ "$status_code" -eq 200 ]; then
        # Check if response is valid JSON with expected structure
        if echo "$body" | jq -e 'type == "object" or type == "array"' > /dev/null 2>&1; then
            test_passed "$test_name"
            return 0
        else
            test_failed "$test_name" "Invalid JSON response"
            return 1
        fi
    else
        test_failed "$test_name" "HTTP Status: $status_code"
        return 1
    fi
}

test_product_search() {
    local test_name="Product Search"
    ((TESTS_RUN++))

    log INFO "Running: $test_name"

    local api_url
    api_url=$(get_ingress_url "citadelbuy-api")

    if [ -z "$api_url" ]; then
        test_failed "$test_name" "Could not determine API URL"
        return 1
    fi

    local response
    response=$(make_http_request "GET" "${api_url}/api/products/search?q=test" "" "")

    local status_code=$(echo "$response" | tail -n 1)

    if [ "$status_code" -eq 200 ] || [ "$status_code" -eq 404 ]; then
        test_passed "$test_name"
        return 0
    else
        test_failed "$test_name" "HTTP Status: $status_code"
        return 1
    fi
}

# ============================================
# Cart Tests
# ============================================

test_cart_operations() {
    local test_name="Cart Operations"
    ((TESTS_RUN++))

    log INFO "Running: $test_name"

    local api_url
    api_url=$(get_ingress_url "citadelbuy-api")

    if [ -z "$api_url" ]; then
        test_failed "$test_name" "Could not determine API URL"
        return 1
    fi

    # Test getting cart (should require auth or return guest cart)
    local response
    response=$(make_http_request "GET" "${api_url}/api/cart" "" "")

    local status_code=$(echo "$response" | tail -n 1)

    # Accept 200 (guest cart), 401 (requires auth), or 404 (not found)
    if [ "$status_code" -eq 200 ] || [ "$status_code" -eq 401 ] || [ "$status_code" -eq 404 ]; then
        test_passed "$test_name"
        return 0
    else
        test_failed "$test_name" "HTTP Status: $status_code"
        return 1
    fi
}

# ============================================
# Checkout Tests
# ============================================

test_checkout_endpoint() {
    local test_name="Checkout Endpoint"
    ((TESTS_RUN++))

    log INFO "Running: $test_name"

    local api_url
    api_url=$(get_ingress_url "citadelbuy-api")

    if [ -z "$api_url" ]; then
        test_failed "$test_name" "Could not determine API URL"
        return 1
    fi

    # Test checkout endpoint availability (should require auth)
    local response
    response=$(make_http_request "POST" "${api_url}/api/checkout" '{"items":[]}' "")

    local status_code=$(echo "$response" | tail -n 1)

    # Accept 401 (requires auth), 400 (validation error), or 404 (not found)
    if [ "$status_code" -eq 401 ] || [ "$status_code" -eq 400 ] || [ "$status_code" -eq 404 ]; then
        test_passed "$test_name"
        return 0
    else
        test_failed "$test_name" "HTTP Status: $status_code"
        return 1
    fi
}

# ============================================
# Admin Panel Tests
# ============================================

test_admin_access() {
    local test_name="Admin Panel Access"
    ((TESTS_RUN++))

    log INFO "Running: $test_name"

    local api_url
    api_url=$(get_ingress_url "citadelbuy-api")

    if [ -z "$api_url" ]; then
        test_failed "$test_name" "Could not determine API URL"
        return 1
    fi

    # Test admin endpoint (should require authentication)
    local response
    response=$(make_http_request "GET" "${api_url}/api/admin/orders" "" "")

    local status_code=$(echo "$response" | tail -n 1)

    # Should return 401 (unauthorized) or 403 (forbidden), not 500
    if [ "$status_code" -eq 401 ] || [ "$status_code" -eq 403 ]; then
        test_passed "$test_name"
        return 0
    else
        test_failed "$test_name" "HTTP Status: $status_code (expected 401 or 403)"
        return 1
    fi
}

# ============================================
# Performance Tests
# ============================================

test_api_response_time() {
    local test_name="API Response Time"
    ((TESTS_RUN++))

    log INFO "Running: $test_name"

    local api_url
    api_url=$(get_ingress_url "citadelbuy-api")

    if [ -z "$api_url" ]; then
        test_failed "$test_name" "Could not determine API URL"
        return 1
    fi

    local start_time=$(date +%s%N)
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${api_url}/api/health" 2>/dev/null || echo "000")
    local end_time=$(date +%s%N)

    local elapsed_ms=$(( (end_time - start_time) / 1000000 ))

    if [ "$response" -eq 200 ] && [ "$elapsed_ms" -lt 2000 ]; then
        log INFO "Response time: ${elapsed_ms}ms"
        test_passed "$test_name"
        return 0
    elif [ "$elapsed_ms" -ge 2000 ]; then
        test_failed "$test_name" "Response time too slow: ${elapsed_ms}ms"
        return 1
    else
        test_failed "$test_name" "HTTP Status: $response"
        return 1
    fi
}

# ============================================
# Web Frontend Tests
# ============================================

test_web_homepage() {
    local test_name="Web Homepage"
    ((TESTS_RUN++))

    log INFO "Running: $test_name"

    local web_url
    web_url=$(get_ingress_url "citadelbuy-web")

    if [ -z "$web_url" ]; then
        test_skipped "$test_name" "Could not determine Web URL"
        return 0
    fi

    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$web_url" 2>/dev/null || echo "000")

    if [ "$response" -eq 200 ]; then
        test_passed "$test_name"
        return 0
    else
        test_failed "$test_name" "HTTP Status: $response"
        return 1
    fi
}

# ============================================
# Test Orchestration
# ============================================

run_all_tests() {
    log INFO "Starting smoke test suite..."
    log INFO "Target namespace: $K8S_NAMESPACE"
    echo ""

    # Health Check Tests
    log INFO "===== Health Check Tests ====="
    test_api_health
    test_api_readiness
    test_database_connection
    test_redis_connection
    echo ""

    # Authentication Tests
    log INFO "===== Authentication Tests ====="
    test_auth_login
    test_auth_register_endpoint
    echo ""

    # Product Tests
    log INFO "===== Product Tests ====="
    test_product_listing
    test_product_search
    echo ""

    # Cart Tests
    log INFO "===== Cart Tests ====="
    test_cart_operations
    echo ""

    # Checkout Tests
    log INFO "===== Checkout Tests ====="
    test_checkout_endpoint
    echo ""

    # Admin Tests
    log INFO "===== Admin Tests ====="
    test_admin_access
    echo ""

    # Performance Tests
    log INFO "===== Performance Tests ====="
    test_api_response_time
    echo ""

    # Web Frontend Tests
    log INFO "===== Web Frontend Tests ====="
    test_web_homepage
    echo ""
}

generate_test_report() {
    local report_file="${PROJECT_ROOT}/logs/smoke-tests-report-${TIMESTAMP}.txt"

    cat > "$report_file" << EOF
CitadelBuy Smoke Test Report
=============================
Timestamp: $(date)
Namespace: $K8S_NAMESPACE

Test Results:
  Total:   $TESTS_RUN
  Passed:  $TESTS_PASSED
  Failed:  $TESTS_FAILED
  Skipped: $TESTS_SKIPPED

Pass Rate: $(awk "BEGIN {printf \"%.2f\", ($TESTS_PASSED/$TESTS_RUN)*100}")%

Status: $([ $TESTS_FAILED -eq 0 ] && echo "SUCCESS" || echo "FAILED")

Detailed Log: $TEST_LOG
EOF

    cat "$report_file"
    log INFO "Test report saved to: $report_file"
}

# ============================================
# Main Execution
# ============================================

main() {
    log INFO "CitadelBuy Smoke Test Suite"
    log INFO "Test log: $TEST_LOG"
    echo ""

    # Check prerequisites
    if ! command -v curl &> /dev/null; then
        log ERROR "curl is not installed"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        log ERROR "jq is not installed"
        exit 1
    fi

    if ! command -v kubectl &> /dev/null; then
        log ERROR "kubectl is not installed"
        exit 1
    fi

    # Run all tests
    run_all_tests

    # Generate report
    generate_test_report

    # Exit with appropriate code
    if [ $TESTS_FAILED -eq 0 ]; then
        log SUCCESS "All smoke tests passed!"
        exit 0
    else
        log ERROR "Some smoke tests failed!"
        exit 1
    fi
}

# Run main function
main "$@"
