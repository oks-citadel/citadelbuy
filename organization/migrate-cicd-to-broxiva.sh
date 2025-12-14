#!/bin/bash

################################################################################
# CI/CD Migration Script: CitadelBuy → Broxiva
#
# This script automates the migration of all CI/CD pipelines from CitadelBuy
# to Broxiva branding. It performs bulk replacements across all workflow files.
#
# Usage:
#   ./migrate-cicd-to-broxiva.sh [--dry-run] [--backup]
#
# Options:
#   --dry-run    Show what would be changed without making changes
#   --backup     Create backup before making changes (recommended)
#   --help       Show this help message
#
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKFLOWS_DIR="${SCRIPT_DIR}/.github/workflows"

# Parse command line arguments
DRY_RUN=false
CREATE_BACKUP=false

for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --backup)
      CREATE_BACKUP=true
      shift
      ;;
    --help)
      head -n 20 "$0" | tail -n +2 | sed 's/^# //'
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $arg${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

################################################################################
# Functions
################################################################################

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

create_backup() {
  local backup_dir=".github-workflows-backup-$(date +%Y%m%d-%H%M%S)"

  log_info "Creating backup directory: $backup_dir"

  mkdir -p "$SCRIPT_DIR/$backup_dir"
  cp -r "$WORKFLOWS_DIR"/*.yml "$SCRIPT_DIR/$backup_dir/" 2>/dev/null || true

  log_success "Backup created at: $backup_dir"
  echo "$SCRIPT_DIR/$backup_dir" > "$SCRIPT_DIR/.last-backup-location"
}

replace_in_files() {
  local pattern="$1"
  local replacement="$2"
  local files="$3"

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] Would replace '$pattern' with '$replacement' in $files"
    grep -l "$pattern" $files 2>/dev/null || true
  else
    log_info "Replacing '$pattern' with '$replacement' in $files"
    find "$WORKFLOWS_DIR" -name "*.yml" -type f -exec sed -i "s/${pattern}/${replacement}/g" {} +
  fi
}

count_occurrences() {
  local pattern="$1"
  local count=$(grep -r "$pattern" "$WORKFLOWS_DIR" 2>/dev/null | wc -l)
  echo "$count"
}

################################################################################
# Main Script
################################################################################

echo "================================================================================"
echo "  CI/CD Pipeline Migration: CitadelBuy → Broxiva"
echo "================================================================================"
echo ""

# Check if workflows directory exists
if [ ! -d "$WORKFLOWS_DIR" ]; then
  log_error "Workflows directory not found: $WORKFLOWS_DIR"
  exit 1
fi

# Count workflow files
WORKFLOW_COUNT=$(find "$WORKFLOWS_DIR" -name "*.yml" -type f | wc -l)
log_info "Found $WORKFLOW_COUNT workflow files to process"

# Show current state
log_info "Current state:"
echo "  - citadelbuy occurrences: $(count_occurrences 'citadelbuy')"
echo "  - CitadelBuy occurrences: $(count_occurrences 'CitadelBuy')"
echo "  - citadelplatforms occurrences: $(count_occurrences 'citadelplatforms')"
echo ""

# Create backup if requested
if [ "$CREATE_BACKUP" = true ]; then
  create_backup
  echo ""
fi

if [ "$DRY_RUN" = true ]; then
  log_warning "DRY RUN MODE - No changes will be made"
  echo ""
fi

################################################################################
# Perform Replacements
################################################################################

log_info "Starting replacements..."
echo ""

# 1. Replace lowercase citadelbuy with broxiva
log_info "Step 1/10: Replacing lowercase 'citadelbuy' → 'broxiva'"
replace_in_files "citadelbuy" "broxiva" "${WORKFLOWS_DIR}/*.yml"

# 2. Replace title case CitadelBuy with Broxiva
log_info "Step 2/10: Replacing title case 'CitadelBuy' → 'Broxiva'"
replace_in_files "CitadelBuy" "Broxiva" "${WORKFLOWS_DIR}/*.yml"

# 3. Replace citadelplatforms with broxiva (for container registry)
log_info "Step 3/10: Replacing 'citadelplatforms' → 'broxiva'"
replace_in_files "citadelplatforms" "broxiva" "${WORKFLOWS_DIR}/*.yml"

# 4. Update ACR registry names
log_info "Step 4/10: Updating Azure Container Registry references"
replace_in_files "citadelbuyacr\\.azurecr\\.io" "broxivaacr.azurecr.io" "${WORKFLOWS_DIR}/*.yml"

# 5. Update terraform state references
log_info "Step 5/10: Updating Terraform state backend references"
replace_in_files "citadelbuytfstate" "broxivatfstate" "${WORKFLOWS_DIR}/*.yml"

# 6. Update resource group references
log_info "Step 6/10: Updating resource group names"
# These are already covered by the general citadelbuy → broxiva replacement

# 7. Update deployment URLs
log_info "Step 7/10: Updating deployment URLs"
replace_in_files "citadelbuy\\.com" "broxiva.com" "${WORKFLOWS_DIR}/*.yml"

# 8. Update database names
log_info "Step 8/10: Updating database references"
# These are already covered by the general citadelbuy → broxiva replacement

# 9. Update AKS cluster names
log_info "Step 9/10: Updating AKS cluster names"
# These are already covered by the general citadelbuy → broxiva replacement

# 10. Update container image references
log_info "Step 10/10: Updating container image references"
replace_in_files "ghcr\\.io/citadelplatforms" "ghcr.io/broxiva" "${WORKFLOWS_DIR}/*.yml"

echo ""
log_success "All replacements completed!"
echo ""

################################################################################
# Summary
################################################################################

log_info "Post-migration state:"
if [ "$DRY_RUN" = false ]; then
  echo "  - citadelbuy occurrences: $(count_occurrences 'citadelbuy')"
  echo "  - CitadelBuy occurrences: $(count_occurrences 'CitadelBuy')"
  echo "  - broxiva occurrences: $(count_occurrences 'broxiva')"
  echo "  - Broxiva occurrences: $(count_occurrences 'Broxiva')"
else
  log_warning "Dry run completed - no files were modified"
fi

echo ""

################################################################################
# Next Steps
################################################################################

if [ "$DRY_RUN" = false ]; then
  log_success "Migration completed successfully!"
  echo ""
  echo "Next steps:"
  echo "  1. Review changes: git diff .github/workflows/"
  echo "  2. Test workflows in development environment"
  echo "  3. Create git commit:"
  echo "     git add .github/workflows/"
  echo "     git commit -m 'ci: migrate CI/CD pipelines from CitadelBuy to Broxiva'"
  echo "  4. Push to feature branch:"
  echo "     git checkout -b cicd/migrate-to-broxiva"
  echo "     git push origin cicd/migrate-to-broxiva"
  echo "  5. Create pull request for review"
  echo ""

  if [ "$CREATE_BACKUP" = true ]; then
    BACKUP_LOC=$(cat "$SCRIPT_DIR/.last-backup-location")
    log_info "Backup location: $BACKUP_LOC"
    echo "  To rollback: cp -r ${BACKUP_LOC}/* .github/workflows/"
  fi
else
  echo "To perform actual migration, run:"
  echo "  $0 --backup"
  echo ""
  echo "For a backup before migration, use:"
  echo "  $0 --backup"
fi

echo ""
echo "================================================================================"
echo "  Migration Script Completed"
echo "================================================================================"
