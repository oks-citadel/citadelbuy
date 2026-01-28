#!/bin/bash
#===============================================================================
# Broxiva Health Check Script
# Monitors all services and sends alerts on failures
#===============================================================================

set -euo pipefail

# Configuration
DOMAIN="www.broxiva.com"
API_DOMAIN="api.broxiva.com"
FRONTEND_PORT=3000
BACKEND_PORT=4000
ALERT_EMAIL="${ALERT_EMAIL:-admin@broxiva.com}"
LOG_FILE="/var/log/broxiva/healthcheck.log"
STATUS_FILE="/tmp/broxiva_health_status"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Initialize status
HEALTHY=true
ISSUES=()

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_service() {
    local service=$1
    if systemctl is-active --quiet "$service"; then
        echo -e "${GREEN}✓${NC} $service"
        return 0
    else
        echo -e "${RED}✗${NC} $service"
        ISSUES+=("$service is not running")
        HEALTHY=false
        return 1
    fi
}

check_url() {
    local url=$1
    local name=$2
    local expected_code=${3:-200}

    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")

    if [[ "$code" == "$expected_code" ]] || [[ "$code" =~ ^2 ]] || [[ "$code" =~ ^3 ]]; then
        echo -e "${GREEN}✓${NC} $name (HTTP $code)"
        return 0
    else
        echo -e "${RED}✗${NC} $name (HTTP $code, expected $expected_code)"
        ISSUES+=("$name returned HTTP $code")
        HEALTHY=false
        return 1
    fi
}

check_port() {
    local port=$1
    local name=$2

    if ss -tuln | grep -q ":$port "; then
        echo -e "${GREEN}✓${NC} $name (port $port)"
        return 0
    else
        echo -e "${RED}✗${NC} $name (port $port not listening)"
        ISSUES+=("$name not listening on port $port")
        HEALTHY=false
        return 1
    fi
}

check_disk() {
    local threshold=${1:-85}
    local usage=$(df / | awk 'NR==2 {gsub(/%/,""); print $5}')

    if [ "$usage" -lt "$threshold" ]; then
        echo -e "${GREEN}✓${NC} Disk usage: ${usage}%"
        return 0
    else
        echo -e "${YELLOW}!${NC} Disk usage: ${usage}% (threshold: ${threshold}%)"
        ISSUES+=("Disk usage at ${usage}%")
        return 1
    fi
}

check_memory() {
    local threshold=${1:-90}
    local usage=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')

    if [ "$usage" -lt "$threshold" ]; then
        echo -e "${GREEN}✓${NC} Memory usage: ${usage}%"
        return 0
    else
        echo -e "${YELLOW}!${NC} Memory usage: ${usage}% (threshold: ${threshold}%)"
        ISSUES+=("Memory usage at ${usage}%")
        return 1
    fi
}

check_pm2() {
    local process=$1

    if pm2 list 2>/dev/null | grep -q "$process.*online"; then
        echo -e "${GREEN}✓${NC} PM2: $process"
        return 0
    else
        echo -e "${RED}✗${NC} PM2: $process not running"
        ISSUES+=("PM2 process $process not running")
        HEALTHY=false
        return 1
    fi
}

send_alert() {
    local subject="[ALERT] Broxiva Health Check Failed"
    local body="Health check failed at $(date)\n\nIssues:\n"

    for issue in "${ISSUES[@]}"; do
        body+="- $issue\n"
    done

    body+="\nServer: $(hostname)\nIP: $(curl -s ifconfig.me)"

    # Send email (requires mailutils)
    if command -v mail &> /dev/null; then
        echo -e "$body" | mail -s "$subject" "$ALERT_EMAIL"
    fi

    # Or use a webhook (Slack, Discord, etc.)
    # curl -X POST -H 'Content-type: application/json' \
    #     --data "{\"text\":\"$body\"}" \
    #     "$SLACK_WEBHOOK_URL"

    log "Alert sent: ${#ISSUES[@]} issues found"
}

# ============================================================================
# Main Health Check
# ============================================================================

echo ""
echo "==============================================================================="
echo "BROXIVA HEALTH CHECK - $(date)"
echo "==============================================================================="
echo ""

echo "=== System Services ==="
check_service nginx
check_service postgresql
check_service redis-server
echo ""

echo "=== PM2 Processes ==="
check_pm2 broxiva-api
check_pm2 broxiva-web
echo ""

echo "=== Local Ports ==="
check_port $FRONTEND_PORT "Frontend"
check_port $BACKEND_PORT "Backend"
check_port 5432 "PostgreSQL"
check_port 6379 "Redis"
echo ""

echo "=== HTTP Endpoints ==="
check_url "http://localhost:$FRONTEND_PORT" "Frontend (local)"
check_url "http://localhost:$BACKEND_PORT/api/health" "Backend Health (local)"
check_url "https://$DOMAIN" "Frontend (HTTPS)"
check_url "https://$API_DOMAIN/api/health" "API Health (HTTPS)"
echo ""

echo "=== Resources ==="
check_disk 85
check_memory 90
echo ""

echo "=== Database ==="
if sudo -u postgres psql -d broxiva -c "SELECT 1" &>/dev/null; then
    echo -e "${GREEN}✓${NC} PostgreSQL connection"
else
    echo -e "${RED}✗${NC} PostgreSQL connection failed"
    ISSUES+=("PostgreSQL connection failed")
    HEALTHY=false
fi

if redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo -e "${GREEN}✓${NC} Redis connection"
else
    echo -e "${RED}✗${NC} Redis connection failed"
    ISSUES+=("Redis connection failed")
    HEALTHY=false
fi
echo ""

# ============================================================================
# Summary
# ============================================================================

echo "==============================================================================="
if $HEALTHY; then
    echo -e "${GREEN}STATUS: HEALTHY${NC}"
    echo "healthy" > "$STATUS_FILE"
else
    echo -e "${RED}STATUS: UNHEALTHY${NC}"
    echo ""
    echo "Issues found:"
    for issue in "${ISSUES[@]}"; do
        echo "  - $issue"
    done

    # Send alert
    send_alert

    echo "unhealthy" > "$STATUS_FILE"
fi
echo "==============================================================================="

# Exit with appropriate code
$HEALTHY && exit 0 || exit 1
