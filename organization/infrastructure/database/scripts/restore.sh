#!/bin/bash
# CitadelBuy Database Restore Script
# Restores PostgreSQL database from backup

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/citadelbuy/backups}"
DB_NAME="${POSTGRES_DB:-citadelbuy_prod}"
DB_USER="${POSTGRES_USER:-citadelbuy}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
BACKUP_FILE="$1"
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

# Check if backup file is provided
if [ -z "$BACKUP_FILE" ]; then
    log_error "Usage: $0 <backup_file>"
    log_info "Available backups:"
    ls -lh "$BACKUP_DIR"/${DB_NAME}_*.{sql.gz,dump} 2>/dev/null || echo "No backups found"
    exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

log_warn "WARNING: This will replace the current database: $DB_NAME"
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log_info "Restore cancelled"
    exit 0
fi

# Decrypt backup if needed
if [ "$ENCRYPTION_ENABLED" = "true" ] && [[ "$BACKUP_FILE" == *.enc ]]; then
    log_info "Decrypting backup..."
    DECRYPTED_FILE="${BACKUP_FILE%.enc}"
    if openssl enc -aes-256-cbc -d -in "$BACKUP_FILE" -out "$DECRYPTED_FILE" -k "$ENCRYPTION_KEY"; then
        BACKUP_FILE="$DECRYPTED_FILE"
        log_info "Backup decrypted successfully"
    else
        log_error "Decryption failed"
        exit 1
    fi
fi

# Determine backup format
if [[ "$BACKUP_FILE" == *.sql.gz ]]; then
    BACKUP_TYPE="sql"
elif [[ "$BACKUP_FILE" == *.dump ]]; then
    BACKUP_TYPE="custom"
else
    log_error "Unknown backup format: $BACKUP_FILE"
    exit 1
fi

log_info "Starting database restore from $BACKUP_FILE"

# Create a backup of current database before restore
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SAFETY_BACKUP="${BACKUP_DIR}/${DB_NAME}_before_restore_${TIMESTAMP}.dump"
log_info "Creating safety backup of current database..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -F c \
    -f "$SAFETY_BACKUP"
log_info "Safety backup created: $SAFETY_BACKUP"

# Terminate existing connections
log_info "Terminating existing database connections..."
PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"

# Drop and recreate database
log_info "Dropping and recreating database..."
PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d postgres \
    -c "DROP DATABASE IF EXISTS $DB_NAME;"

PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d postgres \
    -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Restore based on backup type
if [ "$BACKUP_TYPE" = "sql" ]; then
    log_info "Restoring from SQL backup..."
    if gunzip -c "$BACKUP_FILE" | PGPASSWORD="$POSTGRES_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME"; then
        log_info "SQL restore completed successfully"
    else
        log_error "SQL restore failed"
        log_info "Safety backup available at: $SAFETY_BACKUP"
        exit 1
    fi
elif [ "$BACKUP_TYPE" = "custom" ]; then
    log_info "Restoring from custom format backup..."
    if PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-owner \
        --no-acl \
        "$BACKUP_FILE"; then
        log_info "Custom format restore completed successfully"
    else
        log_error "Custom format restore failed"
        log_info "Safety backup available at: $SAFETY_BACKUP"
        exit 1
    fi
fi

# Run migrations if needed
if [ -f "/opt/citadelbuy/backend/prisma/schema.prisma" ]; then
    log_info "Running database migrations..."
    cd /opt/citadelbuy/backend
    npm run prisma:migrate:deploy
    log_info "Migrations completed"
fi

# Clean up decrypted file if it was created
if [ "$ENCRYPTION_ENABLED" = "true" ] && [ -f "$DECRYPTED_FILE" ]; then
    rm -f "$DECRYPTED_FILE"
    log_info "Cleaned up decrypted backup file"
fi

log_info "Database restore completed successfully"
log_info "Safety backup retained at: $SAFETY_BACKUP"
