#!/bin/bash

################################################################################
# Broxiva Database Migration Script
#
# Purpose: Safely apply pending database migrations with automatic backup,
#          verification, and rollback capabilities
#
# Usage:
#   ./apply-migrations.sh [options]
#
# Options:
#   --dry-run          Show what would be done without executing
#   --skip-backup      Skip database backup (NOT RECOMMENDED)
#   --auto-approve     Skip confirmation prompts
#   --environment ENV  Specify environment (dev, staging, production)
#
# Author: Broxiva Platform Team
# Version: 1.0.0
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
API_DIR="$PROJECT_ROOT/apps/api"
BACKUP_DIR="$PROJECT_ROOT/backups/migrations"
LOG_DIR="$PROJECT_ROOT/logs/migrations"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/migration_${TIMESTAMP}.log"

# Default options
DRY_RUN=false
SKIP_BACKUP=false
AUTO_APPROVE=false
ENVIRONMENT=${ENVIRONMENT:-"development"}

# Migration tracking
MIGRATIONS_APPLIED=0
MIGRATIONS_FAILED=0
BACKUP_FILE=""

################################################################################
# Helper Functions
################################################################################

# Print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Print section header
print_header() {
    echo "" | tee -a "$LOG_FILE"
    echo "========================================" | tee -a "$LOG_FILE"
    echo "$1" | tee -a "$LOG_FILE"
    echo "========================================" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
}

# Confirm action
confirm() {
    if [ "$AUTO_APPROVE" = true ]; then
        return 0
    fi

    read -p "$(echo -e ${YELLOW}$1${NC}) [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return 1
    fi
    return 0
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Cleanup function
cleanup() {
    local exit_code=$?

    if [ $exit_code -ne 0 ]; then
        print_error "Migration script failed with exit code $exit_code"

        if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
            print_warning "Backup file available at: $BACKUP_FILE"
            print_info "To rollback, run: psql \$DATABASE_URL < $BACKUP_FILE"
        fi
    fi

    print_info "Migration log saved to: $LOG_FILE"
    exit $exit_code
}

trap cleanup EXIT

################################################################################
# Pre-flight Checks
################################################################################

preflight_checks() {
    print_header "Running Pre-flight Checks"

    # Check required commands
    local required_commands=("psql" "pg_dump" "node" "npx")
    for cmd in "${required_commands[@]}"; do
        if ! command_exists "$cmd"; then
            print_error "Required command not found: $cmd"
            exit 1
        fi
        print_success "Found command: $cmd"
    done

    # Check if we're in the correct directory
    if [ ! -d "$API_DIR" ]; then
        print_error "API directory not found: $API_DIR"
        exit 1
    fi
    print_success "API directory found"

    # Check if prisma schema exists
    if [ ! -f "$API_DIR/prisma/schema.prisma" ]; then
        print_error "Prisma schema not found at: $API_DIR/prisma/schema.prisma"
        exit 1
    fi
    print_success "Prisma schema found"

    # Check DATABASE_URL
    if [ -z "${DATABASE_URL:-}" ]; then
        print_error "DATABASE_URL environment variable not set"
        print_info "Please set DATABASE_URL or load .env file"
        exit 1
    fi
    print_success "DATABASE_URL is set"

    # Test database connection
    if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        print_success "Database connection successful"
    else
        print_error "Cannot connect to database"
        exit 1
    fi

    # Check disk space (require at least 5GB free)
    local available_space=$(df -BG "$BACKUP_DIR" | tail -1 | awk '{print $4}' | sed 's/G//')
    if [ "$available_space" -lt 5 ]; then
        print_warning "Low disk space: ${available_space}GB available"
        if ! confirm "Continue with low disk space?"; then
            exit 1
        fi
    else
        print_success "Sufficient disk space: ${available_space}GB available"
    fi

    # Create necessary directories
    mkdir -p "$BACKUP_DIR" "$LOG_DIR"
    print_success "Backup and log directories ready"
}

################################################################################
# Database Information
################################################################################

get_database_info() {
    print_header "Database Information"

    # Get database name
    local db_name=$(psql "$DATABASE_URL" -t -c "SELECT current_database();")
    print_info "Database: $db_name"

    # Get database size
    local db_size=$(psql "$DATABASE_URL" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));")
    print_info "Database Size: $db_size"

    # Get table count
    local table_count=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
    print_info "Table Count: $table_count"

    # Get migration status
    print_info "Migration Status:"
    cd "$API_DIR"
    npx prisma migrate status 2>&1 | tee -a "$LOG_FILE"
}

################################################################################
# Backup Functions
################################################################################

create_backup() {
    if [ "$SKIP_BACKUP" = true ]; then
        print_warning "Skipping backup (--skip-backup flag set)"
        return 0
    fi

    print_header "Creating Database Backup"

    BACKUP_FILE="$BACKUP_DIR/broxiva_pre_migration_${TIMESTAMP}.sql"

    print_info "Backing up database to: $BACKUP_FILE"

    if [ "$DRY_RUN" = true ]; then
        print_info "[DRY RUN] Would create backup: $BACKUP_FILE"
        return 0
    fi

    # Create compressed backup
    if pg_dump "$DATABASE_URL" | gzip > "${BACKUP_FILE}.gz"; then
        BACKUP_FILE="${BACKUP_FILE}.gz"
        local backup_size=$(du -h "$BACKUP_FILE" | cut -f1)
        print_success "Backup created successfully: $backup_size"

        # Verify backup
        if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
            print_success "Backup verification passed"
        else
            print_error "Backup verification failed"
            return 1
        fi
    else
        print_error "Backup creation failed"
        return 1
    fi
}

################################################################################
# Migration Functions
################################################################################

check_pending_migrations() {
    print_header "Checking Pending Migrations"

    cd "$API_DIR"

    # Get migration status
    local status_output=$(npx prisma migrate status 2>&1)

    echo "$status_output" | tee -a "$LOG_FILE"

    # Count pending migrations
    local pending_count=$(echo "$status_output" | grep -c "have not yet been applied" || echo "0")

    if [ "$pending_count" -eq 0 ]; then
        print_success "No pending migrations found"
        return 1
    fi

    print_info "Found $pending_count pending migration(s)"
    return 0
}

apply_migrations() {
    print_header "Applying Migrations"

    if [ "$DRY_RUN" = true ]; then
        print_info "[DRY RUN] Would apply migrations now"
        return 0
    fi

    if ! confirm "Apply all pending migrations?"; then
        print_warning "Migration cancelled by user"
        exit 1
    fi

    cd "$API_DIR"

    print_info "Starting migration process..."

    # Run migrations with detailed output
    if npx prisma migrate deploy 2>&1 | tee -a "$LOG_FILE"; then
        print_success "Migrations applied successfully"
        MIGRATIONS_APPLIED=1
        return 0
    else
        print_error "Migration failed"
        MIGRATIONS_FAILED=1
        return 1
    fi
}

################################################################################
# Verification Functions
################################################################################

verify_migrations() {
    print_header "Verifying Migrations"

    cd "$API_DIR"

    # Check migration status again
    print_info "Checking migration status..."
    npx prisma migrate status 2>&1 | tee -a "$LOG_FILE"

    # Verify database integrity
    print_info "Verifying database integrity..."

    # Check for constraint violations
    local constraint_violations=$(psql "$DATABASE_URL" -t -c "
        SELECT count(*)
        FROM pg_constraint
        WHERE contype = 'f' AND convalidated = false;
    ")

    if [ "$constraint_violations" -eq 0 ]; then
        print_success "No constraint violations found"
    else
        print_error "Found $constraint_violations constraint violations"
        return 1
    fi

    # Check for missing indexes on foreign keys
    print_info "Checking for missing indexes on foreign keys..."
    local missing_indexes=$(psql "$DATABASE_URL" -t -c "
        SELECT count(*)
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.contype = 'f'
          AND NOT EXISTS (
            SELECT 1 FROM pg_index i
            WHERE i.indrelid = c.conrelid
              AND a.attnum = ANY(i.indkey)
          );
    ")

    if [ "$missing_indexes" -eq 0 ]; then
        print_success "All foreign keys have indexes"
    else
        print_warning "Found $missing_indexes foreign keys without indexes"
    fi

    # Update table statistics
    print_info "Updating table statistics..."
    psql "$DATABASE_URL" -c "ANALYZE;" >/dev/null 2>&1
    print_success "Table statistics updated"

    # Get final database info
    print_info "Final database state:"
    local table_count=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
    local index_count=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';")
    local fk_count=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY';")

    print_info "  Tables: $table_count"
    print_info "  Indexes: $index_count"
    print_info "  Foreign Keys: $fk_count"
}

################################################################################
# Rollback Functions
################################################################################

offer_rollback() {
    print_header "Migration Failed - Rollback Options"

    print_error "Migrations failed to apply"

    if [ -z "$BACKUP_FILE" ]; then
        print_error "No backup available for rollback"
        return 1
    fi

    print_info "Backup available at: $BACKUP_FILE"

    if confirm "Do you want to rollback to the backup?"; then
        rollback_from_backup
    else
        print_warning "Rollback cancelled"
        print_info "To manually rollback later, run:"
        print_info "  gunzip -c $BACKUP_FILE | psql \$DATABASE_URL"
    fi
}

rollback_from_backup() {
    print_header "Rolling Back Database"

    if [ ! -f "$BACKUP_FILE" ]; then
        print_error "Backup file not found: $BACKUP_FILE"
        return 1
    fi

    print_warning "This will restore the database to pre-migration state"
    print_warning "All changes made during migration will be lost"

    if ! confirm "Are you absolutely sure you want to rollback?"; then
        print_info "Rollback cancelled"
        return 1
    fi

    print_info "Dropping and recreating database..."

    # Get database name
    local db_name=$(psql "$DATABASE_URL" -t -c "SELECT current_database();")

    # Terminate existing connections
    psql "$DATABASE_URL" -c "
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND pid <> pg_backend_pid();
    " >/dev/null 2>&1

    # Drop and recreate database
    local base_url=$(echo "$DATABASE_URL" | sed "s|/$db_name||")
    psql "$base_url/postgres" -c "DROP DATABASE IF EXISTS $db_name;"
    psql "$base_url/postgres" -c "CREATE DATABASE $db_name;"

    # Restore from backup
    print_info "Restoring from backup..."
    if [ "${BACKUP_FILE: -3}" == ".gz" ]; then
        gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
    else
        psql "$DATABASE_URL" < "$BACKUP_FILE"
    fi

    print_success "Database restored successfully"
}

################################################################################
# Report Generation
################################################################################

generate_report() {
    print_header "Migration Report"

    local report_file="$LOG_DIR/migration_report_${TIMESTAMP}.txt"

    {
        echo "Broxiva Database Migration Report"
        echo "===================================="
        echo ""
        echo "Timestamp: $(date)"
        echo "Environment: $ENVIRONMENT"
        echo "Operator: $(whoami)"
        echo ""
        echo "Results:"
        echo "--------"
        echo "Migrations Applied: $MIGRATIONS_APPLIED"
        echo "Migrations Failed: $MIGRATIONS_FAILED"
        echo ""
        if [ -n "$BACKUP_FILE" ]; then
            echo "Backup Location: $BACKUP_FILE"
            echo "Backup Size: $(du -h "$BACKUP_FILE" | cut -f1)"
        fi
        echo ""
        echo "Log File: $LOG_FILE"
        echo ""

        # Get final database statistics
        echo "Database Statistics:"
        echo "-------------------"
        psql "$DATABASE_URL" -t -c "
            SELECT
                'Tables: ' || count(*) as stat
            FROM information_schema.tables
            WHERE table_schema = 'public'
            UNION ALL
            SELECT
                'Indexes: ' || count(*) as stat
            FROM pg_indexes
            WHERE schemaname = 'public'
            UNION ALL
            SELECT
                'Foreign Keys: ' || count(*) as stat
            FROM information_schema.table_constraints
            WHERE constraint_type = 'FOREIGN KEY';
        "

    } > "$report_file"

    cat "$report_file" | tee -a "$LOG_FILE"

    print_info "Report saved to: $report_file"
}

################################################################################
# Main Execution
################################################################################

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --auto-approve)
                AUTO_APPROVE=true
                shift
                ;;
            --environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --help)
                cat << EOF
Usage: $0 [options]

Options:
  --dry-run          Show what would be done without executing
  --skip-backup      Skip database backup (NOT RECOMMENDED)
  --auto-approve     Skip confirmation prompts
  --environment ENV  Specify environment (dev, staging, production)
  --help            Show this help message

Examples:
  # Dry run to see what would happen
  $0 --dry-run

  # Apply migrations with auto-approval (CI/CD)
  $0 --auto-approve --environment production

  # Apply migrations without backup (development only)
  $0 --skip-backup --environment dev
EOF
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

main() {
    print_header "Broxiva Database Migration Script"

    print_info "Environment: $ENVIRONMENT"
    print_info "Dry Run: $DRY_RUN"
    print_info "Skip Backup: $SKIP_BACKUP"
    print_info "Auto Approve: $AUTO_APPROVE"

    # Run pre-flight checks
    preflight_checks

    # Display database information
    get_database_info

    # Check for pending migrations
    if ! check_pending_migrations; then
        print_success "Database is up to date. No migrations needed."
        exit 0
    fi

    # Create backup
    if ! create_backup; then
        print_error "Backup creation failed. Aborting migration."
        exit 1
    fi

    # Apply migrations
    if apply_migrations; then
        # Verify migrations
        verify_migrations

        print_success "Migration completed successfully!"
    else
        # Offer rollback on failure
        offer_rollback
        exit 1
    fi

    # Generate report
    generate_report

    print_header "Migration Complete"
    print_success "All migrations have been applied successfully"
    print_info "Next steps:"
    print_info "  1. Run smoke tests: ./scripts/smoke-tests.sh"
    print_info "  2. Monitor application logs"
    print_info "  3. Verify critical functionality"
    print_info "  4. Update team on completion"
}

# Parse command line arguments
parse_arguments "$@"

# Run main function
main

exit 0
