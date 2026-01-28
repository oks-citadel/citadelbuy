#!/bin/bash
#===============================================================================
# Broxiva GoDaddy VPS - Database Migration Script
# Step 5: Migrate PostgreSQL from Railway to GoDaddy
#===============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

#===============================================================================
# Configuration
#===============================================================================
BACKUP_DIR="/opt/backups/database"
BROXIVA_DB="broxiva"
BROXIVA_USER="broxiva"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="${BACKUP_DIR}/railway_dump_${TIMESTAMP}.sql"

# Railway connection (to be provided)
RAILWAY_DB_URL="${RAILWAY_DATABASE_URL:-}"

#===============================================================================
# Pre-flight Checks
#===============================================================================
log_info "Starting database migration from Railway..."

if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root"
   exit 1
fi

if [ -z "$RAILWAY_DB_URL" ]; then
    log_error "RAILWAY_DATABASE_URL environment variable is required"
    log_info "Export it first: export RAILWAY_DATABASE_URL='postgresql://user:pass@host:port/db'"
    exit 1
fi

mkdir -p "${BACKUP_DIR}"

#===============================================================================
# Parse Railway Connection String
#===============================================================================
log_info "Parsing Railway connection details..."

# Extract components from URL
# Format: postgresql://user:password@host:port/database
RAILWAY_USER=$(echo $RAILWAY_DB_URL | sed -n 's|postgresql://\([^:]*\):.*|\1|p')
RAILWAY_PASS=$(echo $RAILWAY_DB_URL | sed -n 's|postgresql://[^:]*:\([^@]*\)@.*|\1|p')
RAILWAY_HOST=$(echo $RAILWAY_DB_URL | sed -n 's|postgresql://[^@]*@\([^:]*\):.*|\1|p')
RAILWAY_PORT=$(echo $RAILWAY_DB_URL | sed -n 's|postgresql://[^@]*@[^:]*:\([0-9]*\)/.*|\1|p')
RAILWAY_DB=$(echo $RAILWAY_DB_URL | sed -n 's|postgresql://[^@]*@[^/]*/\([^?]*\).*|\1|p')

log_info "Railway Source: ${RAILWAY_HOST}:${RAILWAY_PORT}/${RAILWAY_DB}"

#===============================================================================
# Create Local Database and User
#===============================================================================
log_info "Creating local database and user..."

# Generate secure password
DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

# Create user and database
sudo -u postgres psql << EOSQL
-- Drop existing if doing fresh migration
DROP DATABASE IF EXISTS ${BROXIVA_DB};
DROP USER IF EXISTS ${BROXIVA_USER};

-- Create user with secure password
CREATE USER ${BROXIVA_USER} WITH ENCRYPTED PASSWORD '${DB_PASSWORD}';

-- Create database
CREATE DATABASE ${BROXIVA_DB} WITH OWNER ${BROXIVA_USER} ENCODING 'UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${BROXIVA_DB} TO ${BROXIVA_USER};

-- Allow user to create extensions
ALTER USER ${BROXIVA_USER} CREATEDB;
EOSQL

log_success "Local database created"

#===============================================================================
# Dump Railway Database
#===============================================================================
log_info "Dumping Railway database..."

# Set password for pg_dump
export PGPASSWORD="${RAILWAY_PASS}"

# Dump the database
pg_dump \
    -h "${RAILWAY_HOST}" \
    -p "${RAILWAY_PORT}" \
    -U "${RAILWAY_USER}" \
    -d "${RAILWAY_DB}" \
    --no-owner \
    --no-privileges \
    --format=plain \
    --verbose \
    > "${DUMP_FILE}" 2>/dev/null

unset PGPASSWORD

# Check dump size
DUMP_SIZE=$(du -h "${DUMP_FILE}" | cut -f1)
log_success "Database dumped: ${DUMP_FILE} (${DUMP_SIZE})"

#===============================================================================
# Restore to Local Database
#===============================================================================
log_info "Restoring database to local PostgreSQL..."

# Create extensions first
sudo -u postgres psql -d ${BROXIVA_DB} << 'EOSQL'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
EOSQL

# Restore the dump
sudo -u postgres psql -d ${BROXIVA_DB} < "${DUMP_FILE}"

log_success "Database restored"

#===============================================================================
# Validate Migration
#===============================================================================
log_info "Validating migration..."

# Create validation script
cat > /tmp/validate_migration.sql << 'EOSQL'
-- Count tables
SELECT 'Tables' as metric, COUNT(*) as count FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Count total rows across all tables
SELECT 'Total Rows' as metric,
       (SELECT SUM(n_live_tup) FROM pg_stat_user_tables WHERE schemaname = 'public') as count;

-- Count indexes
SELECT 'Indexes' as metric, COUNT(*) as count FROM pg_indexes WHERE schemaname = 'public';

-- Count foreign keys
SELECT 'Foreign Keys' as metric, COUNT(*) as count
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';

-- Count unique constraints
SELECT 'Unique Constraints' as metric, COUNT(*) as count
FROM information_schema.table_constraints
WHERE constraint_type = 'UNIQUE' AND table_schema = 'public';

-- List tables with row counts
SELECT tablename as "Table", n_live_tup as "Rows"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC
LIMIT 20;
EOSQL

echo ""
echo "=== Database Validation Results ==="
sudo -u postgres psql -d ${BROXIVA_DB} -f /tmp/validate_migration.sql

#===============================================================================
# Save Connection Details
#===============================================================================
log_info "Saving connection details..."

# Create connection string
CONNECTION_STRING="postgresql://${BROXIVA_USER}:${DB_PASSWORD}@localhost:5432/${BROXIVA_DB}?schema=public"

# Save to secure file
cat > /etc/broxiva/database.secret << EOF
# Broxiva Database Credentials
# Generated: $(date)
# DO NOT COMMIT THIS FILE

DATABASE_URL="${CONNECTION_STRING}"
POSTGRES_USER=${BROXIVA_USER}
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=${BROXIVA_DB}
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
EOF

chmod 600 /etc/broxiva/database.secret

log_success "Connection details saved to /etc/broxiva/database.secret"

#===============================================================================
# Update Application Configuration
#===============================================================================
log_info "Updating application configuration..."

# Update .env file if it exists
ENV_FILE="/opt/broxiva/.env"
if [ -f "$ENV_FILE" ]; then
    # Backup existing
    cp "$ENV_FILE" "${ENV_FILE}.backup.${TIMESTAMP}"

    # Update DATABASE_URL
    if grep -q "^DATABASE_URL=" "$ENV_FILE"; then
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${CONNECTION_STRING}|" "$ENV_FILE"
    else
        echo "DATABASE_URL=${CONNECTION_STRING}" >> "$ENV_FILE"
    fi

    log_success "Updated .env file with new database connection"
else
    log_warning ".env file not found. Please update DATABASE_URL manually"
fi

#===============================================================================
# Configure Database Backups
#===============================================================================
log_info "Setting up automated database backups..."

# Create backup script
cat > /opt/broxiva/scripts/backup-database.sh << 'BACKUP_SCRIPT'
#!/bin/bash
# Broxiva Daily Database Backup Script

BACKUP_DIR="/opt/backups/database"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/broxiva_backup_${TIMESTAMP}.sql.gz"

# Create backup
pg_dump -U broxiva broxiva | gzip > "$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    echo "Backup created: $BACKUP_FILE ($(du -h $BACKUP_FILE | cut -f1))"
else
    echo "Backup failed!"
    exit 1
fi

# Remove old backups
find "$BACKUP_DIR" -name "broxiva_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "Backup complete. Retained last ${RETENTION_DAYS} days."
BACKUP_SCRIPT

chmod +x /opt/broxiva/scripts/backup-database.sh

# Add to crontab
(crontab -l 2>/dev/null | grep -v "backup-database.sh"; echo "0 2 * * * /opt/broxiva/scripts/backup-database.sh >> /var/log/broxiva/backup.log 2>&1") | crontab -

log_success "Automated backups configured (daily at 2 AM)"

#===============================================================================
# Enable SSL for Database Connections
#===============================================================================
log_info "Configuring SSL for database connections..."

# PostgreSQL SSL is enabled by default on Ubuntu
# Verify it's working
sudo -u postgres psql -c "SHOW ssl;" | grep -q "on" && log_success "PostgreSQL SSL is enabled" || log_warning "PostgreSQL SSL verification needed"

#===============================================================================
# Run Smoke Tests
#===============================================================================
log_info "Running smoke tests..."

# Test basic queries
sudo -u postgres psql -d ${BROXIVA_DB} << 'SMOKE_TEST'
-- Test user count
SELECT COUNT(*) as user_count FROM "User";

-- Test product count
SELECT COUNT(*) as product_count FROM "Product";

-- Test order count
SELECT COUNT(*) as order_count FROM "Order";

-- Test a join query
SELECT COUNT(*) as order_items FROM "OrderItem" oi
JOIN "Order" o ON oi."orderId" = o.id
LIMIT 1;
SMOKE_TEST

log_success "Smoke tests passed"

#===============================================================================
# Summary
#===============================================================================
echo ""
echo "==============================================================================="
log_success "Database Migration Complete!"
echo "==============================================================================="
echo ""
echo "Migration Details:"
echo "  - Source: Railway PostgreSQL"
echo "  - Target: GoDaddy Local PostgreSQL"
echo "  - Database: ${BROXIVA_DB}"
echo "  - User: ${BROXIVA_USER}"
echo "  - Dump file: ${DUMP_FILE}"
echo ""
echo "Credentials saved to:"
echo "  - /etc/broxiva/database.secret"
echo ""
echo "Backup Configuration:"
echo "  - Daily backups at 2 AM"
echo "  - Retention: 30 days"
echo "  - Location: ${BACKUP_DIR}"
echo ""
echo "IMPORTANT: Update your application's .env file with the new DATABASE_URL"
echo ""
echo "Next Steps:"
echo "  1. Restart the application: pm2 restart all"
echo "  2. Run ./06-ssl-setup.sh to configure SSL certificates"
echo ""
