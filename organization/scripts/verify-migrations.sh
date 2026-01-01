#!/bin/bash

################################################################################
# Broxiva Migration Verification Script
#
# Purpose: Verify that all database migrations were applied successfully
#          and check database integrity after migration
#
# Usage:
#   ./verify-migrations.sh [options]
#
# Options:
#   --detailed     Show detailed verification results
#   --fix          Attempt to fix minor issues automatically
#   --quiet        Suppress non-error output
#
# Exit Codes:
#   0 - All verifications passed
#   1 - Verification failed
#   2 - Critical issues found
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

# Options
DETAILED=false
FIX_ISSUES=false
QUIET=false

# Verification results
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0
CRITICAL_ISSUES=()

################################################################################
# Helper Functions
################################################################################

print_info() {
    if [ "$QUIET" = false ]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    CHECKS_WARNING=$((CHECKS_WARNING + 1))
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
}

print_critical() {
    echo -e "${RED}[CRITICAL]${NC} $1"
    CRITICAL_ISSUES+=("$1")
}

print_header() {
    if [ "$QUIET" = false ]; then
        echo ""
        echo "========================================="
        echo "$1"
        echo "========================================="
    fi
}

################################################################################
# Database Connection Test
################################################################################

test_database_connection() {
    print_header "Testing Database Connection"

    if [ -z "${DATABASE_URL:-}" ]; then
        print_error "DATABASE_URL environment variable not set"
        return 1
    fi

    if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        print_success "Database connection successful"
        return 0
    else
        print_critical "Cannot connect to database"
        return 1
    fi
}

################################################################################
# Migration Status Verification
################################################################################

verify_migration_status() {
    print_header "Verifying Migration Status"

    cd "$API_DIR"

    # Get migration status
    local status_output=$(npx prisma migrate status 2>&1)

    # Check if all migrations are applied
    if echo "$status_output" | grep -q "No pending migrations"; then
        print_success "All migrations applied"
    elif echo "$status_output" | grep -q "Database schema is up to date"; then
        print_success "Database schema is up to date"
    else
        print_error "Pending migrations found"
        if [ "$DETAILED" = true ]; then
            echo "$status_output"
        fi
        return 1
    fi

    # Count applied migrations
    local migration_count=$(psql "$DATABASE_URL" -t -c "
        SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL;
    " 2>/dev/null || echo "0")

    print_info "Applied migrations: $migration_count"

    # Expected: 7 migrations
    if [ "$migration_count" -ge 7 ]; then
        print_success "Migration count matches expected (7+ migrations)"
    else
        print_warning "Expected at least 7 migrations, found $migration_count"
    fi
}

################################################################################
# Table Count Verification
################################################################################

verify_table_count() {
    print_header "Verifying Table Count"

    local table_count=$(psql "$DATABASE_URL" -t -c "
        SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
    ")

    print_info "Total tables: $table_count"

    # Expected: 110+ tables after all migrations
    if [ "$table_count" -ge 110 ]; then
        print_success "Table count within expected range (110+ tables)"
    elif [ "$table_count" -ge 50 ]; then
        print_warning "Table count lower than expected: $table_count (expected 110+)"
    else
        print_error "Table count too low: $table_count (expected 110+)"
        return 1
    fi
}

################################################################################
# ENUM Type Verification
################################################################################

verify_enum_types() {
    print_header "Verifying ENUM Types"

    local enum_count=$(psql "$DATABASE_URL" -t -c "
        SELECT count(*) FROM pg_type WHERE typtype = 'e';
    ")

    print_info "ENUM types: $enum_count"

    # Expected: 30+ ENUM types
    if [ "$enum_count" -ge 30 ]; then
        print_success "ENUM type count within expected range (30+ types)"
    else
        print_warning "ENUM type count lower than expected: $enum_count (expected 30+)"
    fi

    if [ "$DETAILED" = true ]; then
        print_info "ENUM types:"
        psql "$DATABASE_URL" -c "
            SELECT typname FROM pg_type WHERE typtype = 'e' ORDER BY typname;
        "
    fi
}

################################################################################
# Index Verification
################################################################################

verify_indexes() {
    print_header "Verifying Indexes"

    local index_count=$(psql "$DATABASE_URL" -t -c "
        SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';
    ")

    print_info "Total indexes: $index_count"

    # Expected: 320+ indexes after performance migration
    if [ "$index_count" -ge 320 ]; then
        print_success "Index count within expected range (320+ indexes)"
    elif [ "$index_count" -ge 100 ]; then
        print_warning "Index count lower than expected: $index_count (expected 320+)"
        print_info "Performance indexes may not be fully applied"
    else
        print_error "Index count too low: $index_count (expected 320+)"
        return 1
    fi

    # Check for invalid indexes
    local invalid_indexes=$(psql "$DATABASE_URL" -t -c "
        SELECT count(*) FROM pg_index WHERE NOT indisvalid;
    ")

    if [ "$invalid_indexes" -eq 0 ]; then
        print_success "No invalid indexes found"
    else
        print_error "Found $invalid_indexes invalid indexes"
        if [ "$DETAILED" = true ]; then
            psql "$DATABASE_URL" -c "
                SELECT
                    schemaname,
                    tablename,
                    indexname
                FROM pg_indexes
                WHERE schemaname = 'public'
                  AND indexrelid IN (
                    SELECT indexrelid FROM pg_index WHERE NOT indisvalid
                  );
            "
        fi
        return 1
    fi
}

################################################################################
# Foreign Key Verification
################################################################################

verify_foreign_keys() {
    print_header "Verifying Foreign Keys"

    local fk_count=$(psql "$DATABASE_URL" -t -c "
        SELECT count(*) FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY';
    ")

    print_info "Total foreign keys: $fk_count"

    # Expected: 150+ foreign keys
    if [ "$fk_count" -ge 150 ]; then
        print_success "Foreign key count within expected range (150+ keys)"
    else
        print_warning "Foreign key count lower than expected: $fk_count (expected 150+)"
    fi

    # Check for constraint violations
    local violated_constraints=$(psql "$DATABASE_URL" -t -c "
        SELECT count(*) FROM pg_constraint
        WHERE contype = 'f' AND convalidated = false;
    ")

    if [ "$violated_constraints" -eq 0 ]; then
        print_success "No foreign key constraint violations"
    else
        print_critical "Found $violated_constraints violated foreign key constraints"
        if [ "$DETAILED" = true ]; then
            psql "$DATABASE_URL" -c "
                SELECT
                    conname,
                    conrelid::regclass AS table_name,
                    pg_get_constraintdef(oid) AS definition
                FROM pg_constraint
                WHERE contype = 'f' AND convalidated = false;
            "
        fi
        return 1
    fi
}

################################################################################
# Core Table Verification
################################################################################

verify_core_tables() {
    print_header "Verifying Core Tables"

    # List of essential tables that must exist
    local core_tables=(
        "users"
        "products"
        "orders"
        "order_items"
        "categories"
        "reviews"
        "password_resets"
        "vendor_profiles"
        "organizations"
        "organization_members"
    )

    local missing_tables=0

    for table in "${core_tables[@]}"; do
        local exists=$(psql "$DATABASE_URL" -t -c "
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = '$table'
            );
        " | tr -d '[:space:]')

        if [ "$exists" = "t" ]; then
            print_success "Table exists: $table"
        else
            print_error "Missing core table: $table"
            missing_tables=$((missing_tables + 1))
        fi
    done

    if [ $missing_tables -gt 0 ]; then
        print_critical "$missing_tables core tables are missing"
        return 1
    fi
}

################################################################################
# Privacy Tables Verification
################################################################################

verify_privacy_tables() {
    print_header "Verifying Privacy & Compliance Tables"

    local privacy_tables=(
        "ConsentLog"
        "DataDeletionRequest"
        "DataExportRequest"
        "AgreedTerms"
    )

    local missing=0

    for table in "${privacy_tables[@]}"; do
        local exists=$(psql "$DATABASE_URL" -t -c "
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = '$table'
            );
        " | tr -d '[:space:]')

        if [ "$exists" = "t" ]; then
            print_success "Privacy table exists: $table"
        else
            print_warning "Privacy table missing: $table"
            missing=$((missing + 1))
        fi
    done

    # Check if users table has privacy columns
    local has_deleted_at=$(psql "$DATABASE_URL" -t -c "
        SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'users'
            AND column_name = 'deletedAt'
        );
    " | tr -d '[:space:]')

    if [ "$has_deleted_at" = "t" ]; then
        print_success "Users table has privacy columns"
    else
        print_warning "Users table missing privacy columns (deletedAt)"
    fi

    if [ $missing -gt 0 ]; then
        print_warning "Some privacy tables are missing - privacy migration may not be fully applied"
    fi
}

################################################################################
# Organization Module Verification
################################################################################

verify_organization_module() {
    print_header "Verifying Organization Module"

    local org_tables=(
        "organizations"
        "organization_members"
        "organization_roles"
        "permissions"
        "role_permissions"
        "departments"
        "teams"
        "kyc_applications"
        "organization_billing"
    )

    local missing=0

    for table in "${org_tables[@]}"; do
        local exists=$(psql "$DATABASE_URL" -t -c "
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = '$table'
            );
        " | tr -d '[:space:]')

        if [ "$exists" = "t" ]; then
            print_success "Organization table exists: $table"
        else
            print_error "Organization table missing: $table"
            missing=$((missing + 1))
        fi
    done

    if [ $missing -gt 0 ]; then
        print_critical "$missing organization tables are missing"
        return 1
    fi

    # Check if organizations.ownerId foreign key exists
    local has_owner_fk=$(psql "$DATABASE_URL" -t -c "
        SELECT EXISTS (
            SELECT FROM information_schema.table_constraints tc
            WHERE tc.table_name = 'organizations'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND EXISTS (
                SELECT FROM information_schema.key_column_usage kcu
                WHERE kcu.constraint_name = tc.constraint_name
                AND kcu.column_name = 'ownerId'
            )
        );
    " | tr -d '[:space:]')

    if [ "$has_owner_fk" = "t" ]; then
        print_success "Organization owner relationship configured"
    else
        print_warning "Organization owner foreign key missing"
    fi
}

################################################################################
# Performance Index Verification
################################################################################

verify_performance_indexes() {
    print_header "Verifying Performance Indexes"

    # Check for specific performance indexes
    local performance_indexes=(
        "idx_products_status"
        "idx_orders_user_status_created"
        "idx_reviews_product_status_created"
        "idx_vendor_profiles_status_verified"
        "idx_organizations_slug_idx"
    )

    local missing=0

    for index in "${performance_indexes[@]}"; do
        local exists=$(psql "$DATABASE_URL" -t -c "
            SELECT EXISTS (
                SELECT FROM pg_indexes
                WHERE schemaname = 'public'
                AND indexname = '$index'
            );
        " | tr -d '[:space:]')

        if [ "$exists" = "t" ]; then
            print_success "Performance index exists: $index"
        else
            print_warning "Performance index missing: $index"
            missing=$((missing + 1))
        fi
    done

    if [ $missing -gt 0 ]; then
        print_warning "$missing sample performance indexes missing - full performance migration may not be applied"
    fi
}

################################################################################
# Data Integrity Checks
################################################################################

verify_data_integrity() {
    print_header "Verifying Data Integrity"

    # Check for orphaned records
    print_info "Checking for orphaned records..."

    # Check orphaned order_items
    local orphaned_order_items=$(psql "$DATABASE_URL" -t -c "
        SELECT count(*) FROM order_items oi
        WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = oi.\"orderId\");
    " 2>/dev/null || echo "N/A")

    if [ "$orphaned_order_items" = "N/A" ]; then
        print_info "Skipping order_items check (table may not exist)"
    elif [ "$orphaned_order_items" -eq 0 ]; then
        print_success "No orphaned order_items"
    else
        print_error "Found $orphaned_order_items orphaned order_items"
    fi

    # Check orphaned products
    local orphaned_products=$(psql "$DATABASE_URL" -t -c "
        SELECT count(*) FROM products p
        WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.\"vendorId\")
        OR NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = p.\"categoryId\");
    " 2>/dev/null || echo "N/A")

    if [ "$orphaned_products" = "N/A" ]; then
        print_info "Skipping products check (table may not exist)"
    elif [ "$orphaned_products" -eq 0 ]; then
        print_success "No orphaned products"
    else
        print_error "Found $orphaned_products orphaned products"
    fi

    # Check duplicate indexes
    print_info "Checking for duplicate indexes..."
    local duplicate_indexes=$(psql "$DATABASE_URL" -t -c "
        SELECT count(*) FROM (
            SELECT tablename, string_agg(indexname, ', ') as index_names, indexdef
            FROM pg_indexes
            WHERE schemaname = 'public'
            GROUP BY tablename, indexdef
            HAVING count(*) > 1
        ) AS duplicates;
    ")

    if [ "$duplicate_indexes" -eq 0 ]; then
        print_success "No duplicate indexes found"
    else
        print_warning "Found $duplicate_indexes sets of duplicate indexes"
        if [ "$DETAILED" = true ]; then
            psql "$DATABASE_URL" -c "
                SELECT tablename, string_agg(indexname, ', ') as index_names, indexdef
                FROM pg_indexes
                WHERE schemaname = 'public'
                GROUP BY tablename, indexdef
                HAVING count(*) > 1;
            "
        fi
    fi
}

################################################################################
# Database Statistics
################################################################################

show_database_statistics() {
    if [ "$DETAILED" = true ]; then
        print_header "Database Statistics"

        # Database size
        local db_size=$(psql "$DATABASE_URL" -t -c "
            SELECT pg_size_pretty(pg_database_size(current_database()));
        ")
        print_info "Database size: $db_size"

        # Top 10 largest tables
        print_info "Top 10 largest tables:"
        psql "$DATABASE_URL" -c "
            SELECT
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            LIMIT 10;
        "

        # Index usage summary
        print_info "Index usage summary (top 10):"
        psql "$DATABASE_URL" -c "
            SELECT
                schemaname,
                tablename,
                indexname,
                idx_scan,
                pg_size_pretty(pg_relation_size(indexrelid)) as size
            FROM pg_stat_user_indexes
            WHERE schemaname = 'public'
            ORDER BY idx_scan DESC
            LIMIT 10;
        "
    fi
}

################################################################################
# Fix Issues (if --fix flag provided)
################################################################################

fix_issues() {
    if [ "$FIX_ISSUES" = false ]; then
        return 0
    fi

    print_header "Attempting to Fix Issues"

    # Update table statistics
    print_info "Updating table statistics..."
    psql "$DATABASE_URL" -c "ANALYZE;" >/dev/null 2>&1
    print_success "Table statistics updated"

    # Reindex invalid indexes
    local invalid_count=$(psql "$DATABASE_URL" -t -c "
        SELECT count(*) FROM pg_index WHERE NOT indisvalid;
    ")

    if [ "$invalid_count" -gt 0 ]; then
        print_info "Reindexing invalid indexes..."
        psql "$DATABASE_URL" -c "REINDEX DATABASE CONCURRENTLY;" >/dev/null 2>&1 || true
        print_success "Reindex attempted"
    fi
}

################################################################################
# Summary Report
################################################################################

print_summary() {
    print_header "Verification Summary"

    local total_checks=$((CHECKS_PASSED + CHECKS_FAILED + CHECKS_WARNING))

    echo ""
    echo -e "${GREEN}Passed:${NC}  $CHECKS_PASSED / $total_checks"
    echo -e "${YELLOW}Warnings:${NC} $CHECKS_WARNING / $total_checks"
    echo -e "${RED}Failed:${NC}  $CHECKS_FAILED / $total_checks"
    echo ""

    if [ ${#CRITICAL_ISSUES[@]} -gt 0 ]; then
        echo -e "${RED}CRITICAL ISSUES:${NC}"
        for issue in "${CRITICAL_ISSUES[@]}"; do
            echo "  - $issue"
        done
        echo ""
    fi

    if [ $CHECKS_FAILED -eq 0 ] && [ ${#CRITICAL_ISSUES[@]} -eq 0 ]; then
        echo -e "${GREEN}✓ All verifications passed!${NC}"
        echo ""
        echo "Database migrations have been successfully applied and verified."
        echo ""
        return 0
    elif [ ${#CRITICAL_ISSUES[@]} -gt 0 ]; then
        echo -e "${RED}✗ CRITICAL ISSUES FOUND${NC}"
        echo ""
        echo "Database has critical issues that require immediate attention."
        echo "Please review the errors above and consult the migration guide."
        echo ""
        return 2
    else
        echo -e "${YELLOW}⚠ Verification completed with warnings${NC}"
        echo ""
        echo "Database migrations appear successful but some checks failed."
        echo "Review the warnings and failures above to ensure everything is correct."
        echo ""
        return 1
    fi
}

################################################################################
# Main Execution
################################################################################

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --detailed)
                DETAILED=true
                shift
                ;;
            --fix)
                FIX_ISSUES=true
                shift
                ;;
            --quiet)
                QUIET=true
                shift
                ;;
            --help)
                cat << EOF
Usage: $0 [options]

Options:
  --detailed    Show detailed verification results
  --fix         Attempt to fix minor issues automatically
  --quiet       Suppress non-error output
  --help        Show this help message

Examples:
  # Basic verification
  $0

  # Detailed verification with statistics
  $0 --detailed

  # Verify and attempt to fix issues
  $0 --fix --detailed
EOF
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done
}

main() {
    print_header "Broxiva Migration Verification"

    # Test database connection
    test_database_connection || exit 2

    # Run verification checks
    verify_migration_status
    verify_table_count
    verify_enum_types
    verify_indexes
    verify_foreign_keys
    verify_core_tables
    verify_privacy_tables
    verify_organization_module
    verify_performance_indexes
    verify_data_integrity

    # Show detailed statistics if requested
    show_database_statistics

    # Attempt fixes if requested
    fix_issues

    # Print summary and exit
    print_summary
    exit $?
}

# Parse command line arguments
parse_arguments "$@"

# Run main function
main
