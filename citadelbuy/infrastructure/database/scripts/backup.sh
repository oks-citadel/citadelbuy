#!/bin/bash
# CitadelBuy Database Backup Script
# Performs PostgreSQL database backups with compression and retention

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/citadelbuy/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="${POSTGRES_DB:-citadelbuy_prod}"
DB_USER="${POSTGRES_USER:-citadelbuy}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
S3_BUCKET="${S3_BUCKET:-}"
ENCRYPTION_ENABLED="${ENCRYPTION_ENABLED:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup filename
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
BACKUP_CUSTOM="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump"

log_info "Starting database backup for ${DB_NAME}"

# Perform SQL backup
log_info "Creating SQL backup..."
if PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --no-owner \
    --no-acl | gzip > "$BACKUP_FILE"; then
    log_info "SQL backup created successfully: $BACKUP_FILE"
else
    log_error "SQL backup failed"
    exit 1
fi

# Perform custom format backup (for faster restore)
log_info "Creating custom format backup..."
if PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -F c \
    -f "$BACKUP_CUSTOM"; then
    log_info "Custom format backup created successfully: $BACKUP_CUSTOM"
else
    log_error "Custom format backup failed"
    exit 1
fi

# Encrypt backup if enabled
if [ "$ENCRYPTION_ENABLED" = "true" ]; then
    log_info "Encrypting backups..."
    if command -v openssl &> /dev/null; then
        openssl enc -aes-256-cbc -salt -in "$BACKUP_FILE" -out "${BACKUP_FILE}.enc" -k "$ENCRYPTION_KEY"
        openssl enc -aes-256-cbc -salt -in "$BACKUP_CUSTOM" -out "${BACKUP_CUSTOM}.enc" -k "$ENCRYPTION_KEY"
        rm "$BACKUP_FILE" "$BACKUP_CUSTOM"
        BACKUP_FILE="${BACKUP_FILE}.enc"
        BACKUP_CUSTOM="${BACKUP_CUSTOM}.enc"
        log_info "Backups encrypted successfully"
    else
        log_warn "OpenSSL not found, skipping encryption"
    fi
fi

# Upload to S3 if configured
if [ -n "$S3_BUCKET" ]; then
    log_info "Uploading backup to S3..."
    if command -v aws &> /dev/null; then
        aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET}/backups/$(basename $BACKUP_FILE)"
        aws s3 cp "$BACKUP_CUSTOM" "s3://${S3_BUCKET}/backups/$(basename $BACKUP_CUSTOM)"
        log_info "Backup uploaded to S3 successfully"
    else
        log_warn "AWS CLI not found, skipping S3 upload"
    fi
fi

# Get backup file sizes
SQL_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
CUSTOM_SIZE=$(du -h "$BACKUP_CUSTOM" | cut -f1)

log_info "Backup sizes - SQL: $SQL_SIZE, Custom: $CUSTOM_SIZE"

# Clean up old backups
log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz*" -type f -mtime +${RETENTION_DAYS} -delete
find "$BACKUP_DIR" -name "${DB_NAME}_*.dump*" -type f -mtime +${RETENTION_DAYS} -delete

log_info "Backup completed successfully"

# Create backup manifest
cat > "${BACKUP_DIR}/latest_backup.json" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "database": "${DB_NAME}",
  "sql_backup": "$(basename $BACKUP_FILE)",
  "custom_backup": "$(basename $BACKUP_CUSTOM)",
  "sql_size": "${SQL_SIZE}",
  "custom_size": "${CUSTOM_SIZE}",
  "encrypted": ${ENCRYPTION_ENABLED},
  "s3_uploaded": $([ -n "$S3_BUCKET" ] && echo "true" || echo "false")
}
EOF

log_info "Backup manifest created: ${BACKUP_DIR}/latest_backup.json"
