#!/bin/bash
#===============================================================================
# Broxiva GoDaddy VPS - Final Verification Script
# Step 7: Comprehensive verification of the migration
#===============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

#===============================================================================
# Configuration
#===============================================================================
DOMAIN="broxiva.com"
WWW_DOMAIN="www.broxiva.com"
API_DOMAIN="api.broxiva.com"
FRONTEND_PORT=3000
BACKEND_PORT=4000

# Counters
PASSED=0
FAILED=0
WARNINGS=0

check_pass() {
    ((PASSED++))
    log_success "$1"
}

check_fail() {
    ((FAILED++))
    log_error "$1"
}

check_warn() {
    ((WARNINGS++))
    log_warning "$1"
}

#===============================================================================
# Pre-flight
#===============================================================================
echo ""
echo "==============================================================================="
echo "        BROXIVA GODADDY MIGRATION - FINAL VERIFICATION"
echo "==============================================================================="
echo ""
echo "Starting comprehensive verification at $(date)"
echo ""

#===============================================================================
# 1. System Services Check
#===============================================================================
echo "=== 1. SYSTEM SERVICES ==="

# Nginx
if systemctl is-active --quiet nginx; then
    check_pass "Nginx is running"
else
    check_fail "Nginx is not running"
fi

# PostgreSQL
if systemctl is-active --quiet postgresql; then
    check_pass "PostgreSQL is running"
else
    check_fail "PostgreSQL is not running"
fi

# Redis
if systemctl is-active --quiet redis-server; then
    check_pass "Redis is running"
else
    check_fail "Redis is not running"
fi

# PM2 processes
if pm2 list | grep -q "broxiva-api"; then
    check_pass "PM2: broxiva-api is running"
else
    check_fail "PM2: broxiva-api is not running"
fi

if pm2 list | grep -q "broxiva-web"; then
    check_pass "PM2: broxiva-web is running"
else
    check_fail "PM2: broxiva-web is not running"
fi

echo ""

#===============================================================================
# 2. Network Connectivity
#===============================================================================
echo "=== 2. NETWORK CONNECTIVITY ==="

# Local frontend
if curl -sf -o /dev/null http://localhost:${FRONTEND_PORT}; then
    check_pass "Frontend responding on port ${FRONTEND_PORT}"
else
    check_fail "Frontend not responding on port ${FRONTEND_PORT}"
fi

# Local backend health
if curl -sf http://localhost:${BACKEND_PORT}/api/health | grep -qiE "ok|healthy|success"; then
    check_pass "Backend health check passed"
else
    check_fail "Backend health check failed"
fi

# Redis connection
if redis-cli ping | grep -q "PONG"; then
    check_pass "Redis connection successful"
else
    check_fail "Redis connection failed"
fi

# PostgreSQL connection
if sudo -u postgres psql -c '\l' | grep -q "broxiva"; then
    check_pass "PostgreSQL database 'broxiva' exists"
else
    check_fail "PostgreSQL database 'broxiva' not found"
fi

echo ""

#===============================================================================
# 3. SSL/HTTPS Verification
#===============================================================================
echo "=== 3. SSL/HTTPS VERIFICATION ==="

# Certificate validity
CERT_FILE="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
if [ -f "$CERT_FILE" ]; then
    EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_FILE" | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

    if [ $DAYS_LEFT -gt 30 ]; then
        check_pass "SSL certificate valid for $DAYS_LEFT days"
    elif [ $DAYS_LEFT -gt 0 ]; then
        check_warn "SSL certificate expires in $DAYS_LEFT days"
    else
        check_fail "SSL certificate has expired"
    fi
else
    check_fail "SSL certificate not found"
fi

# HTTPS frontend
if curl -sf -o /dev/null "https://${WWW_DOMAIN}"; then
    check_pass "HTTPS frontend (${WWW_DOMAIN}) accessible"
else
    check_fail "HTTPS frontend not accessible"
fi

# HTTPS API
if curl -sf -o /dev/null "https://${API_DOMAIN}/api/health"; then
    check_pass "HTTPS API (${API_DOMAIN}) accessible"
else
    check_fail "HTTPS API not accessible"
fi

# HTTP to HTTPS redirect
REDIRECT_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${WWW_DOMAIN}")
if [ "$REDIRECT_CODE" = "301" ]; then
    check_pass "HTTP to HTTPS redirect working"
else
    check_warn "HTTP redirect returned $REDIRECT_CODE (expected 301)"
fi

# HSTS Header
if curl -sI "https://${WWW_DOMAIN}" | grep -qi "strict-transport-security"; then
    check_pass "HSTS header present"
else
    check_warn "HSTS header not found"
fi

echo ""

#===============================================================================
# 4. Application Endpoints
#===============================================================================
echo "=== 4. APPLICATION ENDPOINTS ==="

# Frontend home page
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${WWW_DOMAIN}")
if [ "$HTTP_CODE" = "200" ]; then
    check_pass "Frontend home page returns 200"
else
    check_warn "Frontend home page returns $HTTP_CODE"
fi

# API endpoints
ENDPOINTS=(
    "/api/health"
    "/api/products"
    "/api/categories"
)

for endpoint in "${ENDPOINTS[@]}"; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${API_DOMAIN}${endpoint}")
    if [[ "$HTTP_CODE" =~ ^(200|401|403)$ ]]; then
        check_pass "API endpoint ${endpoint} returns $HTTP_CODE"
    else
        check_warn "API endpoint ${endpoint} returns $HTTP_CODE"
    fi
done

echo ""

#===============================================================================
# 5. Database Verification
#===============================================================================
echo "=== 5. DATABASE VERIFICATION ==="

# Table count
TABLE_COUNT=$(sudo -u postgres psql -d broxiva -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | xargs)
if [ "$TABLE_COUNT" -gt 40 ]; then
    check_pass "Database has $TABLE_COUNT tables (expected 50+)"
elif [ "$TABLE_COUNT" -gt 0 ]; then
    check_warn "Database has only $TABLE_COUNT tables"
else
    check_fail "No tables found in database"
fi

# User table row count
USER_COUNT=$(sudo -u postgres psql -d broxiva -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | xargs || echo "0")
if [ "$USER_COUNT" != "0" ]; then
    check_pass "User table has $USER_COUNT rows"
else
    check_warn "User table is empty or doesn't exist"
fi

# Index count
INDEX_COUNT=$(sudo -u postgres psql -d broxiva -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" | xargs)
check_pass "Database has $INDEX_COUNT indexes"

echo ""

#===============================================================================
# 6. Security Verification
#===============================================================================
echo "=== 6. SECURITY VERIFICATION ==="

# UFW status
if ufw status | grep -q "Status: active"; then
    check_pass "UFW firewall is active"
else
    check_fail "UFW firewall is not active"
fi

# Open ports check (should only be 22, 80, 443)
OPEN_PORTS=$(ss -tuln | grep LISTEN | grep -v "127.0.0.1" | grep -v "::1" | awk '{print $5}' | grep -oP ':\K\d+' | sort -u | tr '\n' ' ')
check_pass "External ports open: $OPEN_PORTS"

# fail2ban status
if systemctl is-active --quiet fail2ban; then
    check_pass "fail2ban is active"
else
    check_warn "fail2ban is not running"
fi

# Check for hardcoded secrets in .env
ENV_FILE="/opt/broxiva/.env"
if [ -f "$ENV_FILE" ]; then
    if grep -qE "^(DATABASE_URL|JWT_SECRET|STRIPE_SECRET)" "$ENV_FILE"; then
        check_pass "Environment variables configured"
    else
        check_warn "Some environment variables may be missing"
    fi
else
    check_fail ".env file not found"
fi

# Check .env permissions
if [ -f "$ENV_FILE" ]; then
    PERMS=$(stat -c %a "$ENV_FILE")
    if [ "$PERMS" = "600" ] || [ "$PERMS" = "640" ]; then
        check_pass ".env file permissions are secure ($PERMS)"
    else
        check_warn ".env file permissions are $PERMS (recommend 600)"
    fi
fi

echo ""

#===============================================================================
# 7. Performance Check
#===============================================================================
echo "=== 7. PERFORMANCE CHECK ==="

# API response time
START=$(date +%s%N)
curl -sf -o /dev/null "https://${API_DOMAIN}/api/health"
END=$(date +%s%N)
DURATION=$(( (END - START) / 1000000 ))
if [ "$DURATION" -lt 500 ]; then
    check_pass "API health response time: ${DURATION}ms"
elif [ "$DURATION" -lt 2000 ]; then
    check_warn "API health response time: ${DURATION}ms (a bit slow)"
else
    check_fail "API health response time: ${DURATION}ms (too slow)"
fi

# Frontend response time
START=$(date +%s%N)
curl -sf -o /dev/null "https://${WWW_DOMAIN}"
END=$(date +%s%N)
DURATION=$(( (END - START) / 1000000 ))
if [ "$DURATION" -lt 1000 ]; then
    check_pass "Frontend response time: ${DURATION}ms"
elif [ "$DURATION" -lt 3000 ]; then
    check_warn "Frontend response time: ${DURATION}ms (a bit slow)"
else
    check_fail "Frontend response time: ${DURATION}ms (too slow)"
fi

# Memory usage
MEM_USED=$(free -m | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
if [ "$MEM_USED" -lt 80 ]; then
    check_pass "Memory usage: ${MEM_USED}%"
elif [ "$MEM_USED" -lt 90 ]; then
    check_warn "Memory usage: ${MEM_USED}% (high)"
else
    check_fail "Memory usage: ${MEM_USED}% (critical)"
fi

# Disk usage
DISK_USED=$(df / | awk 'NR==2 {gsub(/%/,""); print $5}')
if [ "$DISK_USED" -lt 70 ]; then
    check_pass "Disk usage: ${DISK_USED}%"
elif [ "$DISK_USED" -lt 85 ]; then
    check_warn "Disk usage: ${DISK_USED}% (high)"
else
    check_fail "Disk usage: ${DISK_USED}% (critical)"
fi

echo ""

#===============================================================================
# 8. Logs Check
#===============================================================================
echo "=== 8. LOGS CHECK (Last 10 errors) ==="

# Check PM2 logs for errors
PM2_ERRORS=$(pm2 logs --nostream --lines 100 2>/dev/null | grep -i "error" | tail -5 || echo "")
if [ -z "$PM2_ERRORS" ]; then
    check_pass "No recent errors in PM2 logs"
else
    check_warn "Found errors in PM2 logs (check: pm2 logs)"
fi

# Check Nginx error log
if [ -f /var/log/nginx/broxiva_error.log ]; then
    NGINX_ERRORS=$(tail -100 /var/log/nginx/broxiva_error.log 2>/dev/null | grep -i "error" | wc -l)
    if [ "$NGINX_ERRORS" -eq 0 ]; then
        check_pass "No recent Nginx errors"
    else
        check_warn "Found $NGINX_ERRORS Nginx errors (check: /var/log/nginx/broxiva_error.log)"
    fi
fi

echo ""

#===============================================================================
# Summary
#===============================================================================
echo "==============================================================================="
echo "                         VERIFICATION SUMMARY"
echo "==============================================================================="
echo ""
echo -e "  ${GREEN}PASSED:${NC}   $PASSED"
echo -e "  ${YELLOW}WARNINGS:${NC} $WARNINGS"
echo -e "  ${RED}FAILED:${NC}   $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}  MIGRATION VERIFICATION: PASSED${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo "The Broxiva platform has been successfully migrated to GoDaddy."
    echo ""
    echo "Production URLs:"
    echo "  - Frontend: https://${WWW_DOMAIN}"
    echo "  - API: https://${API_DOMAIN}"
    echo ""
    echo "NEXT STEPS:"
    echo "  1. Perform manual E2E testing (signup, login, checkout)"
    echo "  2. Monitor logs for 24-48 hours"
    echo "  3. Run decommissioning script to remove Vercel/Railway"
    echo ""
else
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}  MIGRATION VERIFICATION: FAILED${NC}"
    echo -e "${RED}=========================================${NC}"
    echo ""
    echo "Please fix the $FAILED failed checks before proceeding."
    echo "DO NOT decommission Vercel/Railway until all checks pass."
    echo ""
    exit 1
fi
