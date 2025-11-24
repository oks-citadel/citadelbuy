#!/bin/bash
# CitadelBuy Database Migration Script
# Manages Prisma database migrations

set -e

# Configuration
BACKEND_DIR="${BACKEND_DIR:-/opt/citadelbuy/backend}"
DB_URL="${DATABASE_URL}"
MIGRATION_NAME="$1"
ACTION="${2:-deploy}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    log_error "Backend directory not found: $BACKEND_DIR"
    exit 1
fi

# Change to backend directory
cd "$BACKEND_DIR"

# Display usage
if [ "$ACTION" = "help" ] || [ -z "$ACTION" ]; then
    echo "Usage: $0 [migration_name] [action]"
    echo ""
    echo "Actions:"
    echo "  deploy    - Deploy pending migrations (default)"
    echo "  dev       - Create and apply a new migration in development"
    echo "  status    - Show migration status"
    echo "  reset     - Reset database (DANGEROUS)"
    echo "  generate  - Generate Prisma Client"
    echo "  studio    - Open Prisma Studio"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 deploy                    # Deploy all pending migrations"
    echo "  $0 add_user_preferences dev  # Create new migration in development"
    echo "  $0 status                    # Check migration status"
    exit 0
fi

case "$ACTION" in
    deploy)
        log_step "Deploying pending migrations..."
        log_info "Checking database connection..."

        # Test database connection
        if ! npx prisma db execute --stdin <<< "SELECT 1;" &> /dev/null; then
            log_error "Cannot connect to database"
            exit 1
        fi

        log_info "Database connection successful"
        log_info "Running migrations..."

        # Deploy migrations
        npx prisma migrate deploy

        log_info "Generating Prisma Client..."
        npx prisma generate

        log_info "✓ Migrations deployed successfully"
        ;;

    dev)
        if [ -z "$MIGRATION_NAME" ]; then
            log_error "Migration name required for dev action"
            echo "Usage: $0 <migration_name> dev"
            exit 1
        fi

        log_step "Creating new migration: $MIGRATION_NAME"
        log_warn "This will modify your development database"

        # Create and apply migration
        npx prisma migrate dev --name "$MIGRATION_NAME"

        log_info "✓ Migration created and applied"
        ;;

    status)
        log_step "Checking migration status..."

        # Show migration status
        npx prisma migrate status

        # Show last applied migration
        echo ""
        log_info "Database information:"
        npx prisma db execute --stdin <<< "
            SELECT
                migration_name,
                started_at,
                finished_at,
                applied_steps_count
            FROM _prisma_migrations
            ORDER BY finished_at DESC
            LIMIT 5;
        " 2>/dev/null || log_warn "Could not fetch migration history"
        ;;

    reset)
        log_warn "⚠️  WARNING: This will DELETE ALL DATA and reset the database!"
        read -p "Are you sure you want to continue? (type 'yes' to confirm): " -r

        if [[ $REPLY = "yes" ]]; then
            log_step "Resetting database..."
            npx prisma migrate reset --force
            log_info "✓ Database reset complete"
        else
            log_info "Reset cancelled"
        fi
        ;;

    generate)
        log_step "Generating Prisma Client..."
        npx prisma generate
        log_info "✓ Prisma Client generated"
        ;;

    studio)
        log_step "Opening Prisma Studio..."
        log_info "Prisma Studio will be available at http://localhost:5555"
        npx prisma studio
        ;;

    *)
        log_error "Unknown action: $ACTION"
        log_info "Run '$0 help' for usage information"
        exit 1
        ;;
esac
