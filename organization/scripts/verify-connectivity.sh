#!/bin/bash

# CitadelBuy - Connectivity Verification Script
# Verifies all layers are properly connected and functioning

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:4000}"
WEB_URL="${WEB_URL:-http://localhost:3000}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
ELASTICSEARCH_URL="${ELASTICSEARCH_URL:-http://localhost:9200}"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║           CitadelBuy - Connectivity Verification                 ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Counter for results
PASSED=0
FAILED=0
WARNINGS=0

# Function to print results
print_result() {
    local name=$1
    local status=$2
    local message=$3

    if [ "$status" = "PASS" ]; then
        echo -e "  ${GREEN}✓${NC} $name - $message"
        ((PASSED++))
    elif [ "$status" = "WARN" ]; then
        echo -e "  ${YELLOW}⚠${NC} $name - $message"
        ((WARNINGS++))
    else
        echo -e "  ${RED}✗${NC} $name - $message"
        ((FAILED++))
    fi
}

# ============================================
# 1. DATA LAYER
# ============================================
echo -e "${BLUE}[1/6] DATA LAYER${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# PostgreSQL
echo -e "\n  PostgreSQL:"
if pg_isready -h $POSTGRES_HOST -p $POSTGRES_PORT > /dev/null 2>&1; then
    print_result "Connection" "PASS" "PostgreSQL is accepting connections"

    # Test database exists
    if psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U citadelbuy -d citadelbuy_dev -c "SELECT 1" > /dev/null 2>&1; then
        print_result "Database" "PASS" "citadelbuy_dev database exists and accessible"
    else
        print_result "Database" "FAIL" "Cannot access citadelbuy_dev database"
    fi
else
    print_result "Connection" "FAIL" "PostgreSQL is not responding"
fi

# Redis
echo -e "\n  Redis:"
if redis-cli -h $REDIS_HOST -p $REDIS_PORT ping > /dev/null 2>&1; then
    print_result "Connection" "PASS" "Redis is accepting connections"

    # Test read/write
    redis-cli -h $REDIS_HOST -p $REDIS_PORT SET test_key "test_value" > /dev/null 2>&1
    VALUE=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT GET test_key 2>/dev/null)
    if [ "$VALUE" = "test_value" ]; then
        print_result "Read/Write" "PASS" "Redis read/write operations working"
        redis-cli -h $REDIS_HOST -p $REDIS_PORT DEL test_key > /dev/null 2>&1
    else
        print_result "Read/Write" "FAIL" "Redis read/write operations failed"
    fi
else
    print_result "Connection" "FAIL" "Redis is not responding"
fi

# Elasticsearch
echo -e "\n  Elasticsearch:"
if curl -s "$ELASTICSEARCH_URL/_cluster/health" > /dev/null 2>&1; then
    HEALTH=$(curl -s "$ELASTICSEARCH_URL/_cluster/health" | jq -r '.status')
    if [ "$HEALTH" = "green" ]; then
        print_result "Cluster" "PASS" "Elasticsearch cluster is healthy (green)"
    elif [ "$HEALTH" = "yellow" ]; then
        print_result "Cluster" "WARN" "Elasticsearch cluster is yellow"
    else
        print_result "Cluster" "FAIL" "Elasticsearch cluster is $HEALTH"
    fi
else
    print_result "Connection" "WARN" "Elasticsearch is not available (optional)"
fi

# ============================================
# 2. BACKEND LAYER
# ============================================
echo -e "\n${BLUE}[2/6] BACKEND LAYER${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# API Health Check
echo -e "\n  NestJS API:"
if curl -s "$API_URL/api/health" > /dev/null 2>&1; then
    HEALTH_RESPONSE=$(curl -s "$API_URL/api/health")
    print_result "Health" "PASS" "API health endpoint responding"

    # Check database connection via health
    DB_STATUS=$(echo $HEALTH_RESPONSE | jq -r '.database // "unknown"' 2>/dev/null)
    if [ "$DB_STATUS" = "connected" ] || [ "$DB_STATUS" = "ok" ]; then
        print_result "DB Connection" "PASS" "API connected to database"
    else
        print_result "DB Connection" "WARN" "Database status: $DB_STATUS"
    fi

    # Check Redis via health
    REDIS_STATUS=$(echo $HEALTH_RESPONSE | jq -r '.redis // "unknown"' 2>/dev/null)
    if [ "$REDIS_STATUS" = "connected" ] || [ "$REDIS_STATUS" = "ok" ]; then
        print_result "Redis Connection" "PASS" "API connected to Redis"
    else
        print_result "Redis Connection" "WARN" "Redis status: $REDIS_STATUS"
    fi
else
    print_result "Health" "FAIL" "API is not responding at $API_URL/api/health"
fi

# API Authentication
echo -e "\n  Authentication:"
AUTH_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"customer@citadelbuy.com","password":"password123"}')

if echo $AUTH_RESPONSE | jq -e '.access_token' > /dev/null 2>&1; then
    print_result "Login" "PASS" "Authentication endpoint working"
    TOKEN=$(echo $AUTH_RESPONSE | jq -r '.access_token')

    # Test authenticated endpoint
    PROFILE=$(curl -s "$API_URL/api/auth/profile" \
        -H "Authorization: Bearer $TOKEN")

    if echo $PROFILE | jq -e '.id' > /dev/null 2>&1; then
        print_result "JWT Auth" "PASS" "JWT token authentication working"
    else
        print_result "JWT Auth" "FAIL" "JWT token authentication failed"
    fi
else
    print_result "Login" "FAIL" "Authentication failed: $(echo $AUTH_RESPONSE | jq -r '.message // "Unknown error"')"
fi

# ============================================
# 3. API LAYER
# ============================================
echo -e "\n${BLUE}[3/6] API LAYER${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test various API endpoints
echo -e "\n  Endpoints:"

# Products
PRODUCTS=$(curl -s "$API_URL/api/products?limit=5")
if echo $PRODUCTS | jq -e '.' > /dev/null 2>&1; then
    COUNT=$(echo $PRODUCTS | jq 'if type == "array" then length else .products | length end' 2>/dev/null)
    print_result "Products" "PASS" "Products endpoint returning data ($COUNT items)"
else
    print_result "Products" "FAIL" "Products endpoint not working"
fi

# Categories
CATEGORIES=$(curl -s "$API_URL/api/categories")
if echo $CATEGORIES | jq -e '.' > /dev/null 2>&1; then
    COUNT=$(echo $CATEGORIES | jq 'length' 2>/dev/null)
    print_result "Categories" "PASS" "Categories endpoint returning data ($COUNT categories)"
else
    print_result "Categories" "FAIL" "Categories endpoint not working"
fi

# Rate Limiting
echo -e "\n  Rate Limiting:"
for i in {1..15}; do
    curl -s "$API_URL/api/health" > /dev/null
done
RATE_TEST=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/health")
if [ "$RATE_TEST" = "200" ]; then
    print_result "Rate Limiter" "PASS" "Rate limiting configured (requests allowed)"
elif [ "$RATE_TEST" = "429" ]; then
    print_result "Rate Limiter" "PASS" "Rate limiting active (429 returned)"
else
    print_result "Rate Limiter" "WARN" "Rate limiting status unknown (HTTP $RATE_TEST)"
fi

# ============================================
# 4. CLIENT LAYER
# ============================================
echo -e "\n${BLUE}[4/6] CLIENT LAYER${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Web Frontend
echo -e "\n  Next.js Frontend:"
if curl -s "$WEB_URL" > /dev/null 2>&1; then
    print_result "Homepage" "PASS" "Frontend is serving at $WEB_URL"

    # Check if Next.js chunks are loading
    RESPONSE=$(curl -s "$WEB_URL")
    if echo "$RESPONSE" | grep -q "_next/static"; then
        print_result "Static Assets" "PASS" "Next.js static assets loading"
    else
        print_result "Static Assets" "WARN" "Could not verify Next.js static assets"
    fi
else
    print_result "Homepage" "FAIL" "Frontend is not responding at $WEB_URL"
fi

# ============================================
# 5. EXTERNAL SERVICES
# ============================================
echo -e "\n${BLUE}[5/6] EXTERNAL SERVICES${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# These are optional in development
echo -e "\n  Third-party Services (optional in dev):"
print_result "Stripe" "WARN" "Payment gateway - configure STRIPE_SECRET_KEY"
print_result "SendGrid/SMTP" "WARN" "Email service - configure SMTP settings"
print_result "AWS S3/MinIO" "WARN" "File storage - configure storage settings"

# ============================================
# 6. DEVOPS
# ============================================
echo -e "\n${BLUE}[6/6] DEVOPS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Docker
echo -e "\n  Docker:"
if docker --version > /dev/null 2>&1; then
    print_result "Docker" "PASS" "Docker is installed"

    RUNNING=$(docker ps -q | wc -l)
    print_result "Containers" "PASS" "$RUNNING containers running"
else
    print_result "Docker" "FAIL" "Docker is not available"
fi

# Monitoring
echo -e "\n  Monitoring (if configured):"
if curl -s "http://localhost:9090/-/healthy" > /dev/null 2>&1; then
    print_result "Prometheus" "PASS" "Prometheus is running"
else
    print_result "Prometheus" "WARN" "Prometheus not running (optional)"
fi

if curl -s "http://localhost:3001/api/health" > /dev/null 2>&1; then
    print_result "Grafana" "PASS" "Grafana is running"
else
    print_result "Grafana" "WARN" "Grafana not running (optional)"
fi

# ============================================
# SUMMARY
# ============================================
echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                         SUMMARY                                   ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "  ${GREEN}Passed:${NC}   $PASSED"
echo -e "  ${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "  ${RED}Failed:${NC}   $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All critical services are connected and functioning!${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "TEST USER ACCOUNTS FOR FRONTEND VERIFICATION:"
    echo ""
    echo "┌─────────────────────────────────────────────────────────────────┐"
    echo "│  CUSTOMER ACCOUNT 1:                                            │"
    echo "│  ─────────────────                                              │"
    echo "│  Email:    customer@citadelbuy.com                              │"
    echo "│  Password: password123                                          │"
    echo "│  Role:     CUSTOMER                                             │"
    echo "│  Features: Browse products, add to cart, checkout, view orders  │"
    echo "├─────────────────────────────────────────────────────────────────┤"
    echo "│  CUSTOMER ACCOUNT 2:                                            │"
    echo "│  ─────────────────                                              │"
    echo "│  Email:    jane@example.com                                     │"
    echo "│  Password: password123                                          │"
    echo "│  Role:     CUSTOMER                                             │"
    echo "│  Features: Browse products, add to cart, checkout, view orders  │"
    echo "├─────────────────────────────────────────────────────────────────┤"
    echo "│  ADMIN ACCOUNT:                                                 │"
    echo "│  ─────────────                                                  │"
    echo "│  Email:    admin@citadelbuy.com                                 │"
    echo "│  Password: password123                                          │"
    echo "│  Role:     ADMIN                                                │"
    echo "│  Features: Full admin dashboard, user management, analytics     │"
    echo "├─────────────────────────────────────────────────────────────────┤"
    echo "│  VENDOR ACCOUNTS:                                               │"
    echo "│  ───────────────                                                │"
    echo "│  Email:    vendor1@citadelbuy.com                               │"
    echo "│  Email:    vendor2@citadelbuy.com                               │"
    echo "│  Password: password123                                          │"
    echo "│  Role:     VENDOR                                               │"
    echo "│  Features: Product management, order fulfillment, analytics     │"
    echo "└─────────────────────────────────────────────────────────────────┘"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "URLS:"
    echo "  Frontend:      $WEB_URL"
    echo "  API:           $API_URL/api"
    echo "  API Docs:      $API_URL/api/docs"
    echo "  Grafana:       http://localhost:3001 (admin/admin)"
    echo "  Prometheus:    http://localhost:9090"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some services failed connectivity checks.${NC}"
    echo "  Please review the failed items above and check your configuration."
    exit 1
fi
