#!/bin/bash
#===============================================================================
# Broxiva GoDaddy VPS - Decommissioning Script
# Step 8: Remove Vercel and Railway after successful migration
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
# Pre-flight Checks
#===============================================================================
echo ""
echo "==============================================================================="
echo "        BROXIVA DECOMMISSIONING - VERCEL & RAILWAY REMOVAL"
echo "==============================================================================="
echo ""

log_warning "This script will guide you through decommissioning Vercel and Railway."
log_warning "ONLY proceed if migration verification has PASSED completely."
echo ""

# Confirm verification passed
read -p "Has the final verification script (07-final-verification.sh) PASSED? (yes/no): " VERIFICATION_PASSED
if [ "$VERIFICATION_PASSED" != "yes" ]; then
    log_error "Aborting. Run 07-final-verification.sh first and ensure all checks pass."
    exit 1
fi

# Double confirmation
read -p "Are you ABSOLUTELY SURE you want to decommission Vercel and Railway? (type 'DECOMMISSION'): " CONFIRM
if [ "$CONFIRM" != "DECOMMISSION" ]; then
    log_error "Aborting. Type 'DECOMMISSION' to confirm."
    exit 1
fi

#===============================================================================
# Step 1: Create Final Backups
#===============================================================================
echo ""
log_info "Step 1: Creating final backups..."

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/decommission_${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

# Backup current database
log_info "Creating final database backup..."
sudo -u postgres pg_dump broxiva | gzip > "${BACKUP_DIR}/final_database_backup.sql.gz"
log_success "Database backup: ${BACKUP_DIR}/final_database_backup.sql.gz"

# Backup configuration
log_info "Backing up configurations..."
cp -r /etc/broxiva "${BACKUP_DIR}/etc_broxiva"
cp -r /etc/nginx/sites-available "${BACKUP_DIR}/nginx_sites"
cp /opt/broxiva/ecosystem.config.js "${BACKUP_DIR}/"
cp /opt/broxiva/.env "${BACKUP_DIR}/.env" 2>/dev/null || true
log_success "Configurations backed up"

# Backup PM2 config
sudo -u broxiva pm2 save
cp /home/broxiva/.pm2/dump.pm2 "${BACKUP_DIR}/pm2_dump.pm2" 2>/dev/null || true

log_success "Final backups created at: ${BACKUP_DIR}"

#===============================================================================
# Step 2: Vercel Decommissioning Checklist
#===============================================================================
echo ""
echo "==============================================================================="
log_info "Step 2: VERCEL DECOMMISSIONING"
echo "==============================================================================="
echo ""
echo "Manual steps required for Vercel:"
echo ""
echo "1. Go to: https://vercel.com/dashboard"
echo ""
echo "2. Remove domain from Vercel project:"
echo "   - Select the Broxiva project"
echo "   - Go to Settings → Domains"
echo "   - Remove: broxiva.com, www.broxiva.com"
echo "   - Confirm removal"
echo ""
echo "3. Delete the Vercel project:"
echo "   - Go to Settings → General"
echo "   - Scroll to 'Delete Project'"
echo "   - Type the project name to confirm"
echo "   - Click 'Delete'"
echo ""
echo "4. Cancel Vercel subscription (if applicable):"
echo "   - Go to: https://vercel.com/account/billing"
echo "   - Click 'Cancel Plan' if on a paid plan"
echo ""

read -p "Have you completed the Vercel decommissioning steps? (yes/no): " VERCEL_DONE
if [ "$VERCEL_DONE" = "yes" ]; then
    log_success "Vercel decommissioning confirmed"
    echo "VERCEL_DECOMMISSIONED=true" >> "${BACKUP_DIR}/decommission_log.txt"
    echo "VERCEL_DECOMMISSIONED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "${BACKUP_DIR}/decommission_log.txt"
else
    log_warning "Vercel decommissioning pending"
fi

#===============================================================================
# Step 3: Railway Decommissioning Checklist
#===============================================================================
echo ""
echo "==============================================================================="
log_info "Step 3: RAILWAY DECOMMISSIONING"
echo "==============================================================================="
echo ""
echo "Manual steps required for Railway:"
echo ""
echo "1. Go to: https://railway.app/dashboard"
echo ""
echo "2. Create final database backup (if not done):"
echo "   - Select the Broxiva project"
echo "   - Go to the PostgreSQL service"
echo "   - Use: railway run pg_dump > final_railway_backup.sql"
echo ""
echo "3. Stop all services:"
echo "   - Select each service"
echo "   - Click 'Settings' → 'Stop Service'"
echo ""
echo "4. Delete the Railway project:"
echo "   - Go to Project Settings"
echo "   - Click 'Danger Zone' → 'Delete Project'"
echo "   - Confirm deletion"
echo ""
echo "5. Cancel Railway subscription (if applicable):"
echo "   - Go to: https://railway.app/account/billing"
echo "   - Click 'Cancel Subscription'"
echo ""

read -p "Have you completed the Railway decommissioning steps? (yes/no): " RAILWAY_DONE
if [ "$RAILWAY_DONE" = "yes" ]; then
    log_success "Railway decommissioning confirmed"
    echo "RAILWAY_DECOMMISSIONED=true" >> "${BACKUP_DIR}/decommission_log.txt"
    echo "RAILWAY_DECOMMISSIONED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "${BACKUP_DIR}/decommission_log.txt"
else
    log_warning "Railway decommissioning pending"
fi

#===============================================================================
# Step 4: DNS Verification
#===============================================================================
echo ""
echo "==============================================================================="
log_info "Step 4: DNS VERIFICATION"
echo "==============================================================================="
echo ""

log_info "Verifying DNS records point to GoDaddy..."

SERVER_IP=$(curl -s ifconfig.me)
DOMAINS=("broxiva.com" "www.broxiva.com" "api.broxiva.com")

for domain in "${DOMAINS[@]}"; do
    RESOLVED_IP=$(dig +short $domain | head -1)
    if [ "$RESOLVED_IP" = "$SERVER_IP" ]; then
        log_success "$domain → $RESOLVED_IP (correct)"
    else
        log_warning "$domain → $RESOLVED_IP (expected $SERVER_IP)"
    fi
done

#===============================================================================
# Step 5: Lock DNS Configuration
#===============================================================================
echo ""
echo "==============================================================================="
log_info "Step 5: LOCK DNS CONFIGURATION"
echo "==============================================================================="
echo ""
echo "Final DNS configuration for GoDaddy:"
echo ""
echo "+-----------+------+------------------+--------+"
echo "| Type      | Host | Points To        | TTL    |"
echo "+-----------+------+------------------+--------+"
echo "| A         | @    | $SERVER_IP      | 1 Hour |"
echo "| A         | www  | $SERVER_IP      | 1 Hour |"
echo "| A         | api  | $SERVER_IP      | 1 Hour |"
echo "+-----------+------+------------------+--------+"
echo ""
echo "To lock DNS:"
echo "1. Go to GoDaddy DNS Management for broxiva.com"
echo "2. Verify all A records point to: $SERVER_IP"
echo "3. Increase TTL to 1 hour (3600) or higher"
echo "4. Remove any old records pointing to Vercel/Railway"
echo ""

read -p "Have you locked the DNS configuration? (yes/no): " DNS_LOCKED
if [ "$DNS_LOCKED" = "yes" ]; then
    log_success "DNS configuration locked"
    echo "DNS_LOCKED=true" >> "${BACKUP_DIR}/decommission_log.txt"
    echo "DNS_LOCKED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "${BACKUP_DIR}/decommission_log.txt"
fi

#===============================================================================
# Step 6: Update Application References
#===============================================================================
echo ""
log_info "Step 6: Cleaning up old references..."

# Remove old Vercel/Railway references from codebase
if [ -f "/opt/broxiva/source/vercel.json" ]; then
    log_info "Note: vercel.json still exists in source. Consider removing if no longer needed."
fi

if [ -f "/opt/broxiva/source/railway.json" ]; then
    log_info "Note: railway.json still exists in source. Consider removing if no longer needed."
fi

#===============================================================================
# Summary
#===============================================================================
echo ""
echo "==============================================================================="
echo "                    DECOMMISSIONING SUMMARY"
echo "==============================================================================="
echo ""
echo "Backup Location: ${BACKUP_DIR}"
echo ""
echo "Decommission Log:"
cat "${BACKUP_DIR}/decommission_log.txt" 2>/dev/null || echo "No actions logged yet"
echo ""

if [ "$VERCEL_DONE" = "yes" ] && [ "$RAILWAY_DONE" = "yes" ] && [ "$DNS_LOCKED" = "yes" ]; then
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}  DECOMMISSIONING: COMPLETE${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo "Broxiva is now running entirely on GoDaddy!"
    echo ""
    echo "Production URLs:"
    echo "  - https://www.broxiva.com (frontend)"
    echo "  - https://api.broxiva.com (API)"
    echo ""
    echo "Decommissioned Services:"
    echo "  - Vercel: REMOVED"
    echo "  - Railway: REMOVED"
    echo ""
    echo "Keep the backup at ${BACKUP_DIR} for at least 30 days."
    echo ""

    # Create completion marker
    echo "MIGRATION_COMPLETE=true" >> "${BACKUP_DIR}/decommission_log.txt"
    echo "COMPLETED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "${BACKUP_DIR}/decommission_log.txt"
else
    echo -e "${YELLOW}=========================================${NC}"
    echo -e "${YELLOW}  DECOMMISSIONING: INCOMPLETE${NC}"
    echo -e "${YELLOW}=========================================${NC}"
    echo ""
    echo "Some steps are pending. Please complete them manually:"
    [ "$VERCEL_DONE" != "yes" ] && echo "  - Complete Vercel decommissioning"
    [ "$RAILWAY_DONE" != "yes" ] && echo "  - Complete Railway decommissioning"
    [ "$DNS_LOCKED" != "yes" ] && echo "  - Lock DNS configuration"
    echo ""
fi
