#!/bin/bash
#===============================================================================
# Broxiva Disk Monitoring Script
# Monitors disk usage and cleans up old files
#===============================================================================

set -euo pipefail

# Configuration
ALERT_THRESHOLD=80
CRITICAL_THRESHOLD=90
LOG_DIR="/var/log/broxiva"
BACKUP_DIR="/opt/backups"
TMP_CLEANUP_DAYS=7
LOG_CLEANUP_DAYS=30
ALERT_EMAIL="${ALERT_EMAIL:-admin@broxiva.com}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

get_disk_usage() {
    df / | awk 'NR==2 {gsub(/%/,""); print $5}'
}

cleanup_logs() {
    log "Cleaning up old log files..."

    # Clean PM2 logs
    pm2 flush 2>/dev/null || true

    # Clean old application logs
    find "$LOG_DIR" -name "*.log" -mtime +$LOG_CLEANUP_DAYS -delete 2>/dev/null || true
    find "$LOG_DIR" -name "*.log.*" -mtime +$LOG_CLEANUP_DAYS -delete 2>/dev/null || true

    # Clean old Nginx logs (handled by logrotate, but safety cleanup)
    find /var/log/nginx -name "*.log.*.gz" -mtime +$LOG_CLEANUP_DAYS -delete 2>/dev/null || true

    # Clean journal logs older than 7 days
    journalctl --vacuum-time=7d 2>/dev/null || true

    log "Log cleanup complete"
}

cleanup_temp() {
    log "Cleaning up temporary files..."

    # Clean /tmp
    find /tmp -type f -mtime +$TMP_CLEANUP_DAYS -delete 2>/dev/null || true

    # Clean npm cache
    npm cache clean --force 2>/dev/null || true

    # Clean pnpm cache (keep recent)
    pnpm store prune 2>/dev/null || true

    # Clean apt cache
    apt-get clean 2>/dev/null || true

    log "Temp cleanup complete"
}

cleanup_docker() {
    log "Cleaning up Docker..."

    # Remove unused Docker resources
    docker system prune -f 2>/dev/null || true

    # Remove old images
    docker image prune -a -f --filter "until=168h" 2>/dev/null || true

    log "Docker cleanup complete"
}

send_alert() {
    local level=$1
    local usage=$2
    local subject="[$level] Broxiva Disk Usage Alert"
    local body="Disk usage is at ${usage}%\n\nServer: $(hostname)\nTime: $(date)\n\nTop directories:\n$(du -h /opt --max-depth=2 | sort -hr | head -10)"

    if command -v mail &> /dev/null; then
        echo -e "$body" | mail -s "$subject" "$ALERT_EMAIL"
    fi

    log "Alert sent: $level - Disk at ${usage}%"
}

# ============================================================================
# Main
# ============================================================================

echo ""
echo "==============================================================================="
echo "BROXIVA DISK MONITOR - $(date)"
echo "==============================================================================="
echo ""

# Get current usage
CURRENT_USAGE=$(get_disk_usage)
log "Current disk usage: ${CURRENT_USAGE}%"

# Display disk info
echo "=== Disk Usage ==="
df -h /
echo ""

# Display largest directories
echo "=== Largest Directories ==="
du -h /opt --max-depth=2 2>/dev/null | sort -hr | head -10
echo ""

# Check thresholds and take action
if [ "$CURRENT_USAGE" -ge "$CRITICAL_THRESHOLD" ]; then
    echo -e "${RED}CRITICAL: Disk usage at ${CURRENT_USAGE}%${NC}"
    log "CRITICAL: Disk usage at ${CURRENT_USAGE}%"

    # Aggressive cleanup
    cleanup_logs
    cleanup_temp
    cleanup_docker

    # Check again
    NEW_USAGE=$(get_disk_usage)
    log "After cleanup: ${NEW_USAGE}%"

    if [ "$NEW_USAGE" -ge "$CRITICAL_THRESHOLD" ]; then
        send_alert "CRITICAL" "$NEW_USAGE"
    fi

elif [ "$CURRENT_USAGE" -ge "$ALERT_THRESHOLD" ]; then
    echo -e "${YELLOW}WARNING: Disk usage at ${CURRENT_USAGE}%${NC}"
    log "WARNING: Disk usage at ${CURRENT_USAGE}%"

    # Normal cleanup
    cleanup_logs
    cleanup_temp

    NEW_USAGE=$(get_disk_usage)
    log "After cleanup: ${NEW_USAGE}%"

    if [ "$NEW_USAGE" -ge "$ALERT_THRESHOLD" ]; then
        send_alert "WARNING" "$NEW_USAGE"
    fi

else
    echo -e "${GREEN}OK: Disk usage at ${CURRENT_USAGE}%${NC}"
    log "OK: Disk usage at ${CURRENT_USAGE}%"
fi

echo ""
echo "=== After Cleanup ==="
df -h /
echo ""

echo "==============================================================================="
log "Disk monitoring complete"
