#!/bin/bash

###############################################################################
# Broxiva Deployment Verification Script
#
# Purpose: Verify a deployment is successful and all systems operational
# Usage: ./scripts/verify-deployment.sh [ENVIRONMENT]
#
# Environments: dev, staging, production
#
# Exit Codes:
#   0 - Deployment verified successfully
#   1 - Deployment verification failed
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT="${1:-staging}"
TIMEOUT=30
RETRY_COUNT=5
RETRY_DELAY=10

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Broxiva Deployment Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "Timestamp: $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Set URLs based on environment
case "$ENVIRONMENT" in
    dev)
        API_URL="https://api-dev.broxiva.com"
        WEB_URL="https://dev.broxiva.com"
        ;;
    staging)
        API_URL="https://api-staging.broxiva.com"
        WEB_URL="https://staging.broxiva.com"
        ;;
    production)
        API_URL="https://api.broxiva.com"
        WEB_URL="https://broxiva.com"
        ;;
    *)
        echo -e "${RED}Invalid environment: ${ENVIRONMENT}${NC}"
        echo "Valid environments: dev, staging, production"
        exit 1
        ;;
esac

echo "API URL: ${API_URL}"
echo "Web URL: ${WEB_URL}"
echo ""

FAILURES=0

###############################################################################
# Helper Functions
###############################################################################

wait_for_service() {
    local url=$1
    local service_name=$2
    local attempts=0

    echo -n "Waiting for ${service_name} to be ready... "

    while [ $attempts -lt $RETRY_COUNT ]; do
        if curl -s -f --max-time $TIMEOUT "${url}" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Ready${NC}"
            return 0
        fi

        attempts=$((attempts + 1))
        echo -n "."
        sleep $RETRY_DELAY
    done

    echo -e "${RED}✗ Failed${NC}"
    FAILURES=$((FAILURES + 1))
    return 1
}

check_health() {
    local url=$1
    local description=$2

    echo -n "Checking ${description}... "

    response=$(curl -s --max-time $TIMEOUT "${url}" 2>&1)
    status=$(echo "$response" | jq -r '.status' 2>/dev/null || echo "unknown")

    if [ "$status" = "ok" ] || [ "$status" = "healthy" ]; then
        echo -e "${GREEN}✓ PASS${NC} (${status})"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (${status})"
        FAILURES=$((FAILURES + 1))
        return 1
    fi
}

check_database() {
    echo -n "Checking database connectivity... "

    response=$(curl -s --max-time $TIMEOUT "${API_URL}/api/health" 2>&1)
    db_status=$(echo "$response" | jq -r '.details.database.status' 2>/dev/null || echo "unknown")

    if [ "$db_status" = "up" ]; then
        echo -e "${GREEN}✓ Connected${NC}"
        return 0
    else
        echo -e "${RED}✗ Disconnected${NC}"
        FAILURES=$((FAILURES + 1))
        return 1
    fi
}

check_redis() {
    echo -n "Checking Redis connectivity... "

    response=$(curl -s --max-time $TIMEOUT "${API_URL}/api/health" 2>&1)
    redis_status=$(echo "$response" | jq -r '.details.redis.status' 2>/dev/null || echo "unknown")

    if [ "$redis_status" = "up" ]; then
        echo -e "${GREEN}✓ Connected${NC}"
        return 0
    else
        echo -e "${RED}✗ Disconnected${NC}"
        FAILURES=$((FAILURES + 1))
        return 1
    fi
}

check_web_rendering() {
    local url=$1
    local description=$2

    echo -n "Checking ${description}... "

    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "${url}" 2>&1)

    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ Renders (HTTP ${http_code})${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed (HTTP ${http_code})${NC}"
        FAILURES=$((FAILURES + 1))
        return 1
    fi
}

###############################################################################
# Verification Steps
###############################################################################

echo -e "${BLUE}[1/6] Service Availability${NC}"
echo "-----------------------------------"
wait_for_service "${API_URL}/api/health" "API Service"
wait_for_service "${WEB_URL}" "Web Service"
echo ""

echo -e "${BLUE}[2/6] API Health Checks${NC}"
echo "-----------------------------------"
check_health "${API_URL}/api/health" "API health"
check_health "${API_URL}/api/health/live" "Liveness probe"
check_health "${API_URL}/api/health/ready" "Readiness probe"
check_health "${API_URL}/api/health/detailed" "Detailed health"
echo ""

echo -e "${BLUE}[3/6] Database & Cache${NC}"
echo "-----------------------------------"
check_database
check_redis
echo ""

echo -e "${BLUE}[4/6] Critical API Endpoints${NC}"
echo "-----------------------------------"
check_web_rendering "${API_URL}/api/products" "Products API"
check_web_rendering "${API_URL}/api/categories" "Categories API"
check_web_rendering "${API_URL}/api/search?q=test" "Search API"
echo ""

echo -e "${BLUE}[5/6] Frontend Pages${NC}"
echo "-----------------------------------"
check_web_rendering "${WEB_URL}" "Homepage"
check_web_rendering "${WEB_URL}/products" "Products page"
check_web_rendering "${WEB_URL}/auth/login" "Login page"
echo ""

echo -e "${BLUE}[6/6] Performance Checks${NC}"
echo "-----------------------------------"

# Check API response time
echo -n "Checking API response time... "
api_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time $TIMEOUT "${API_URL}/api/health" 2>&1)
api_time_ms=$(echo "$api_time * 1000" | bc 2>/dev/null | cut -d'.' -f1)

if [ "$api_time_ms" -lt 1000 ]; then
    echo -e "${GREEN}✓ Fast${NC} (${api_time_ms}ms)"
elif [ "$api_time_ms" -lt 2000 ]; then
    echo -e "${YELLOW}⚠ Acceptable${NC} (${api_time_ms}ms)"
else
    echo -e "${YELLOW}⚠ Slow${NC} (${api_time_ms}ms)"
fi

# Check web response time
echo -n "Checking web response time... "
web_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time $TIMEOUT "${WEB_URL}" 2>&1)
web_time_ms=$(echo "$web_time * 1000" | bc 2>/dev/null | cut -d'.' -f1)

if [ "$web_time_ms" -lt 2000 ]; then
    echo -e "${GREEN}✓ Fast${NC} (${web_time_ms}ms)"
elif [ "$web_time_ms" -lt 5000 ]; then
    echo -e "${YELLOW}⚠ Acceptable${NC} (${web_time_ms}ms)"
else
    echo -e "${YELLOW}⚠ Slow${NC} (${web_time_ms}ms)"
fi
echo ""

###############################################################################
# Summary
###############################################################################

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Environment: ${ENVIRONMENT}"
echo "API URL: ${API_URL}"
echo "Web URL: ${WEB_URL}"
echo ""

if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✓ Deployment verified successfully!${NC}"
    echo -e "${GREEN}All systems operational.${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Deployment verification failed!${NC}"
    echo -e "${RED}${FAILURES} check(s) failed.${NC}"
    echo ""
    echo "Please investigate the failed checks above."
    exit 1
fi
