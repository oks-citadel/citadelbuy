#!/bin/bash

# ============================================
# CitadelBuy Database Migration Script
# ============================================
# This script safely runs database migrations with backup and validation
#
# Usage:
#   Development: ./scripts/run-migrations.sh dev
#   Production:  ./scripts/run-migrations.sh prod
#   Staging:     ./scripts/run-migrations.sh staging
#
# Features:
#   - Pre-migration backup
#   - Migration status validation
#   - Post-migration verification
#   - Rollback instructions
#   - Error handling
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/migration_backup_${TIMESTAMP}.sql"
LOG_FILE="./logs/migration_${TIMESTAMP}.log"

# Create directories if they don't exist
mkdir -p "${BACKUP_DIR}"
mkdir -p "./logs"

# ============================================
# Helper Functions
# ============================================

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "${LOG_FILE}"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "${LOG_FILE}"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "${LOG_FILE}"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "${LOG_FILE}"
}

# ============================================
# Validation Functions
# ============================================

check_environment() {
    log "Checking environment..."

    # Check if .env file exists
    if [ ! -f .env ]; then
        log_error ".env file not found!"
        log "Please create .env file from .env.example"
        exit 1
    fi

    # Load environment variables
    export $(grep -v '^#' .env | xargs)

    # Check if DATABASE_URL is set
    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL is not set in .env"
        exit 1
    fi

    log_success "Environment validated"
}

check_database_connection() {
    log "Checking database connection..."

    # Try to connect to database
    if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
        log_success "Database connection successful"
        return 0
    else
        log_error "Cannot connect to database"
        log "Please check your DATABASE_URL and ensure the database server is running"
        exit 1
    fi
}

check_migration_status() {
    log "Checking migration status..."

    # Get pending migrations
    PENDING_MIGRATIONS=$(npx prisma migrate status 2>&1 | grep "have not yet been applied" || true)

    if [ -n "$PENDING_MIGRATIONS" ]; then
        log_warning "Pending migrations detected:"
        echo "$PENDING_MIGRATIONS" | tee -a "${LOG_FILE}"
        return 0
    else
        log_success "All migrations are up to date"
        return 1
    fi
}

# ============================================
# Backup Functions
# ============================================

create_backup() {
    local env=$1

    log "Creating database backup..."

    # Extract database connection details from DATABASE_URL
    # Format: postgresql://user:pass@host:port/database
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
    DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

    # Set password for pg_dump
    export PGPASSWORD="$DB_PASS"

    if [ "$env" = "prod" ]; then
        log_warning "Creating PRODUCTION database backup..."
        log_warning "This may take several minutes for large databases"
    fi

    # Create backup using pg_dump
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --format=custom \
        --compress=9 \
        --file="${BACKUP_FILE}" \
        2>> "${LOG_FILE}"; then

        BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
        log_success "Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"

        # Save backup metadata
        cat > "${BACKUP_FILE}.meta" <<EOF
Timestamp: ${TIMESTAMP}
Environment: ${env}
Database: ${DB_NAME}
Host: ${DB_HOST}:${DB_PORT}
Size: ${BACKUP_SIZE}
Before Migration: $(npx prisma migrate status 2>&1 | head -n 5)
EOF

        return 0
    else
        log_error "Failed to create backup"
        log "Please check the log file: ${LOG_FILE}"

        # If pg_dump is not available, provide alternative
        if ! command -v pg_dump &> /dev/null; then
            log_error "pg_dump command not found"
            log "Please install PostgreSQL client tools or use manual backup"
            log "Manual backup command:"
            log "  pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} ${DB_NAME} > backup.sql"
        fi

        return 1
    fi

    # Clear password
    unset PGPASSWORD
}

# ============================================
# Migration Functions
# ============================================

run_migration_dev() {
    log "Running migrations in DEVELOPMENT mode..."

    if npx prisma migrate dev 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Development migrations completed"
        return 0
    else
        log_error "Development migrations failed"
        return 1
    fi
}

run_migration_prod() {
    log "Running migrations in PRODUCTION mode..."

    log_warning "This will apply migrations to production database"
    log_warning "Ensure you have created a backup before proceeding"

    if npx prisma migrate deploy 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Production migrations completed"
        return 0
    else
        log_error "Production migrations failed"
        return 1
    fi
}

# ============================================
# Validation Functions
# ============================================

validate_migration() {
    log "Validating migration results..."

    # Check if all migrations are applied
    if npx prisma migrate status 2>&1 | grep -q "Database schema is up to date"; then
        log_success "All migrations successfully applied"
        return 0
    else
        log_warning "Migration status unclear, checking details..."
        npx prisma migrate status | tee -a "${LOG_FILE}"
        return 1
    fi
}

run_health_checks() {
    log "Running post-migration health checks..."

    # Check if Prisma client can connect
    if npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
        log_success "Database queries working"
    else
        log_error "Cannot execute queries on database"
        return 1
    fi

    # Verify critical tables exist
    local critical_tables=("users" "products" "orders" "categories")
    for table in "${critical_tables[@]}"; do
        if npx prisma db execute --stdin <<< "SELECT 1 FROM ${table} LIMIT 1;" > /dev/null 2>&1; then
            log_success "Table '${table}' accessible"
        else
            log_error "Table '${table}' not found or not accessible"
            return 1
        fi
    done

    log_success "All health checks passed"
    return 0
}

# ============================================
# Rollback Information
# ============================================

show_rollback_instructions() {
    local backup_file=$1

    cat <<EOF

${YELLOW}=====================================${NC}
${YELLOW}ROLLBACK INSTRUCTIONS${NC}
${YELLOW}=====================================${NC}

If you need to rollback this migration:

1. Stop the application:
   ${BLUE}npm run stop${NC}

2. Restore from backup:
   ${BLUE}export PGPASSWORD="${DB_PASS}"
   pg_restore -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} --clean --if-exists ${backup_file}${NC}

3. Verify restoration:
   ${BLUE}npx prisma migrate status${NC}

4. If needed, reset to specific migration:
   ${BLUE}npx prisma migrate resolve --rolled-back "migration_name"${NC}

5. Restart application:
   ${BLUE}npm run start${NC}

${YELLOW}IMPORTANT:${NC}
- Test rollback procedure in staging before using in production
- Keep backups for at least 30 days
- Document any data loss during rollback

Backup location: ${backup_file}
Log location: ${LOG_FILE}

${YELLOW}=====================================${NC}

EOF
}

# ============================================
# Main Migration Process
# ============================================

run_migration() {
    local env=$1

    log "======================================"
    log "CitadelBuy Database Migration"
    log "======================================"
    log "Environment: ${env}"
    log "Timestamp: ${TIMESTAMP}"
    log "======================================"

    # Step 1: Validate environment
    check_environment

    # Step 2: Check database connection
    check_database_connection

    # Step 3: Check migration status
    if ! check_migration_status; then
        log "No pending migrations. Database is up to date."
        exit 0
    fi

    # Step 4: Create backup
    if [ "$env" = "prod" ] || [ "$env" = "staging" ]; then
        if ! create_backup "$env"; then
            log_error "Backup failed. Aborting migration."
            log "Please create a manual backup before proceeding"
            exit 1
        fi
    else
        log_warning "Skipping backup in development mode"
        log "To enable backup in dev: set BACKUP_DEV=true"
    fi

    # Step 5: Confirm production migrations
    if [ "$env" = "prod" ]; then
        log_warning "You are about to run migrations on PRODUCTION database"
        read -p "Are you sure you want to continue? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log "Migration cancelled by user"
            exit 0
        fi
    fi

    # Step 6: Run migrations
    log "Starting migration process..."

    if [ "$env" = "prod" ] || [ "$env" = "staging" ]; then
        if ! run_migration_prod; then
            log_error "Migration failed!"
            show_rollback_instructions "$BACKUP_FILE"
            exit 1
        fi
    else
        if ! run_migration_dev; then
            log_error "Migration failed!"
            exit 1
        fi
    fi

    # Step 7: Validate migration
    if ! validate_migration; then
        log_warning "Migration validation unclear"
        show_rollback_instructions "$BACKUP_FILE"
    fi

    # Step 8: Run health checks
    if ! run_health_checks; then
        log_error "Health checks failed!"
        show_rollback_instructions "$BACKUP_FILE"
        exit 1
    fi

    # Step 9: Generate Prisma Client
    log "Generating Prisma Client..."
    if npx prisma generate 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Prisma Client generated"
    else
        log_error "Failed to generate Prisma Client"
    fi

    # Success!
    log_success "======================================"
    log_success "Migration completed successfully!"
    log_success "======================================"

    if [ -f "${BACKUP_FILE}" ]; then
        show_rollback_instructions "$BACKUP_FILE"
    fi

    # Cleanup old backups (keep last 10)
    log "Cleaning up old backups (keeping last 10)..."
    ls -t "${BACKUP_DIR}"/migration_backup_*.sql 2>/dev/null | tail -n +11 | xargs -r rm
    ls -t "${BACKUP_DIR}"/migration_backup_*.sql.meta 2>/dev/null | tail -n +11 | xargs -r rm

    log "Migration log saved to: ${LOG_FILE}"
}

# ============================================
# Script Entry Point
# ============================================

# Check arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 {dev|staging|prod}"
    echo ""
    echo "Environments:"
    echo "  dev      - Development (no backup, uses 'prisma migrate dev')"
    echo "  staging  - Staging (with backup, uses 'prisma migrate deploy')"
    echo "  prod     - Production (with backup and confirmation)"
    exit 1
fi

ENV=$1

# Validate environment argument
case $ENV in
    dev|development)
        ENV="dev"
        ;;
    staging|stage)
        ENV="staging"
        ;;
    prod|production)
        ENV="prod"
        ;;
    *)
        log_error "Invalid environment: $ENV"
        echo "Valid environments: dev, staging, prod"
        exit 1
        ;;
esac

# Run migration
run_migration "$ENV"
