#!/bin/bash

###############################################################################
# Broxiva API Health Check Script
#
# Purpose: Verify all critical API endpoints are responding correctly
# Usage: ./scripts/health-check.sh [API_URL]
#
# Exit Codes:
#   0 - All health checks passed
#   1 - One or more health checks failed
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${1:-http://localhost:4000}"
TIMEOUT=10
FAILURES=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Broxiva API Health Check${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "API URL: ${API_URL}"
echo -e "Timeout: ${TIMEOUT}s"
echo ""

###############################################################################
# Helper Functions
###############################################################################

check_endpoint() {
    local endpoint=$1
    local expected_status=$2
    local description=$3

    echo -n "Checking ${description}... "

    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "${API_URL}${endpoint}" 2>&1)

    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP ${response})"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: ${expected_status}, Got: ${response})"
        FAILURES=$((FAILURES + 1))
        return 1
    fi
}

check_endpoint_json() {
    local endpoint=$1
    local jq_filter=$2
    local expected_value=$3
    local description=$4

    echo -n "Checking ${description}... "

    response=$(curl -s --max-time $TIMEOUT "${API_URL}${endpoint}" 2>&1)
    http_code=$(echo "$response" | tail -n1)

    if command -v jq &> /dev/null; then
        result=$(echo "$response" | jq -r "$jq_filter" 2>/dev/null || echo "error")

        if [ "$result" = "$expected_value" ]; then
            echo -e "${GREEN}✓ PASS${NC} (${jq_filter} = ${result})"
            return 0
        else
            echo -e "${RED}✗ FAIL${NC} (Expected: ${expected_value}, Got: ${result})"
            FAILURES=$((FAILURES + 1))
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ SKIP${NC} (jq not installed)"
        return 0
    fi
}

check_response_time() {
    local endpoint=$1
    local max_time=$2
    local description=$3

    echo -n "Checking ${description} response time... "

    response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time $TIMEOUT "${API_URL}${endpoint}" 2>&1)
    response_time_ms=$(echo "$response_time * 1000" | bc 2>/dev/null || echo "0")
    response_time_int=${response_time_ms%.*}

    if [ "$response_time_int" -lt "$max_time" ]; then
        echo -e "${GREEN}✓ PASS${NC} (${response_time_int}ms < ${max_time}ms)"
        return 0
    else
        echo -e "${YELLOW}⚠ SLOW${NC} (${response_time_int}ms > ${max_time}ms)"
        return 0
    fi
}

###############################################################################
# Health Check Tests
###############################################################################

echo -e "${BLUE}[1/5] System Health Checks${NC}"
echo "-----------------------------------"
check_endpoint "/api/health" "200" "API health endpoint"
check_endpoint "/api/health/live" "200" "Liveness probe"
check_endpoint "/api/health/ready" "200" "Readiness probe"
check_endpoint_json "/api/health" ".status" "ok" "Health status is 'ok'"
check_response_time "/api/health" "1000" "Health endpoint"
echo ""

echo -e "${BLUE}[2/5] Database & Cache Connectivity${NC}"
echo "-----------------------------------"
check_endpoint_json "/api/health" ".details.database.status" "up" "Database connection"
check_endpoint_json "/api/health" ".details.redis.status" "up" "Redis connection"
check_endpoint_json "/api/health/detailed" ".status" "healthy" "Detailed health status"
echo ""

echo -e "${BLUE}[3/5] Critical API Endpoints${NC}"
echo "-----------------------------------"
check_endpoint "/api/products" "200" "Products listing"
check_endpoint "/api/categories" "200" "Categories listing"
check_endpoint "/api/auth/check" "200" "Auth check endpoint"
check_response_time "/api/products" "2000" "Products endpoint"
echo ""

echo -e "${BLUE}[4/5] Search & Recommendations${NC}"
echo "-----------------------------------"
check_endpoint "/api/search?q=test" "200" "Search endpoint"
check_endpoint "/api/recommendations" "200" "Recommendations endpoint"
echo ""

echo -e "${BLUE}[5/5] Static Resources${NC}"
echo "-----------------------------------"
# Check if API docs are accessible in non-production
if [ "$API_URL" = "http://localhost:4000" ]; then
    check_endpoint "/api/docs" "200" "API documentation (Swagger)"
fi
echo ""

###############################################################################
# Summary
###############################################################################

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Health Check Summary${NC}"
echo -e "${BLUE}========================================${NC}"

if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✓ All health checks passed!${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}✗ ${FAILURES} health check(s) failed!${NC}"
    echo ""
    exit 1
fi
