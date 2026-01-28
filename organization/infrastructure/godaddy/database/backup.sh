#!/bin/bash
#===============================================================================
# Broxiva Database Backup Script
# Automated daily backups with retention policy
#===============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="/opt/backups/database"
DB_NAME="broxiva"
DB_USER="broxiva"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/broxiva_backup_${TIMESTAMP}.sql.gz"
LOG_FILE="/var/log/broxiva/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${GREEN}SUCCESS:${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${RED}ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

log "Starting database backup..."

# Perform backup
if pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"; then
    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_success "Backup created: $BACKUP_FILE ($BACKUP_SIZE)"
else
    log_error "Backup failed!"
    exit 1
fi

# Verify backup integrity
if gzip -t "$BACKUP_FILE" 2>/dev/null; then
    log_success "Backup integrity verified"
else
    log_error "Backup file is corrupted!"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Remove old backups
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "broxiva_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -type f)
if [ -n "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | while read -r old_file; do
        rm -f "$old_file"
        log "Removed old backup: $old_file"
    done
fi

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "broxiva_backup_*.sql.gz" -type f | wc -l)
log "Total backups retained: $BACKUP_COUNT"

# Optional: Upload to remote storage (S3, etc.)
# Uncomment and configure if needed
#
# if command -v aws &> /dev/null; then
#     log "Uploading to S3..."
#     aws s3 cp "$BACKUP_FILE" "s3://broxiva-backups/database/"
#     log_success "Uploaded to S3"
# fi

log "Backup complete"
