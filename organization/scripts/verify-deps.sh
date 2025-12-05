#!/bin/bash

# =============================================================================
# CitadelBuy Dependency Verification Script
# =============================================================================
# This comprehensive script verifies all dependencies, checks for issues,
# and ensures the project is ready for build and deployment.
#
# Usage:
#   ./scripts/verify-deps.sh [--fix] [--skip-audit] [--skip-build]
#
# Options:
#   --fix          Attempt to automatically fix issues
#   --skip-audit   Skip security audit (faster)
#   --skip-build   Skip build verification
#
# Exit Codes:
#   0 - All checks passed
#   1 - Warnings found (non-critical)
#   2 - Errors found (critical)
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Report file with timestamp
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
REPORT_FILE="$PROJECT_ROOT/dependency-verification-report-$TIMESTAMP.txt"

# Parse arguments
FIX_ISSUES=false
SKIP_AUDIT=false
SKIP_BUILD=false

for arg in "$@"; do
  case $arg in
    --fix)
      FIX_ISSUES=true
      ;;
    --skip-audit)
      SKIP_AUDIT=true
      ;;
    --skip-build)
      SKIP_BUILD=true
      ;;
  esac
done

# Initialize counters
WARNINGS=0
ERRORS=0
CHECKS_PASSED=0
TOTAL_CHECKS=0

# =============================================================================
# Utility Functions
# =============================================================================

print_header() {
    echo -e "\n${BLUE}${BOLD}========================================${NC}"
    echo -e "${BLUE}${BOLD}$1${NC}"
    echo -e "${BLUE}${BOLD}========================================${NC}\n"
}

print_section() {
    echo -e "\n${CYAN}>>> $1${NC}\n"
    echo -e "\n$1\n" >> "$REPORT_FILE"
    echo "----------------------------------------" >> "$REPORT_FILE"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    echo "[PASS] $1" >> "$REPORT_FILE"
    ((CHECKS_PASSED++))
    ((TOTAL_CHECKS++))
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
    echo "[WARN] $1" >> "$REPORT_FILE"
    ((WARNINGS++))
    ((TOTAL_CHECKS++))
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    echo "[ERROR] $1" >> "$REPORT_FILE"
    ((ERRORS++))
    ((TOTAL_CHECKS++))
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
    echo "[INFO] $1" >> "$REPORT_FILE"
}

# =============================================================================
# Check Functions
# =============================================================================

check_prerequisites() {
    print_section "Checking Prerequisites"

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        echo "Please install Node.js version 20.0.0 or higher"
        exit 2
    else
        NODE_VERSION=$(node --version)
        print_success "Node.js is installed: $NODE_VERSION"

        # Check Node version
        REQUIRED_NODE_MAJOR=20
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
            print_error "Node.js version $REQUIRED_NODE_MAJOR or higher is required (found: $NODE_VERSION)"
            exit 2
        fi
    fi

    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm is not installed"
        echo "Please install pnpm: npm install -g pnpm"
        exit 2
    else
        PNPM_VERSION=$(pnpm --version)
        print_success "pnpm is installed: $PNPM_VERSION"

        # Check pnpm version
        REQUIRED_PNPM_MAJOR=10
        PNPM_MAJOR=$(echo $PNPM_VERSION | cut -d'.' -f1)
        if [ "$PNPM_MAJOR" -lt "$REQUIRED_PNPM_MAJOR" ]; then
            print_warning "pnpm version $REQUIRED_PNPM_MAJOR or higher is recommended (found: $PNPM_VERSION)"
        fi
    fi

    # Check if node_modules exists
    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        print_warning "node_modules not found - will need to install dependencies"
    else
        print_success "node_modules directory exists"
    fi
}

check_package_json_validity() {
    print_section "Validating package.json Files"

    cd "$PROJECT_ROOT"

    # Find all package.json files
    mapfile -t PACKAGE_JSONS < <(find . -name "package.json" -not -path "*/node_modules/*" -not -path "*/.next/*")

    for pkg in "${PACKAGE_JSONS[@]}"; do
        if node -e "JSON.parse(require('fs').readFileSync('$pkg', 'utf8'))" 2>/dev/null; then
            print_success "Valid JSON: $pkg"
        else
            print_error "Invalid JSON: $pkg"
        fi
    done
}

install_dependencies() {
    print_section "Installing Dependencies"

    cd "$PROJECT_ROOT"

    if [ "$FIX_ISSUES" = true ]; then
        print_info "Running pnpm install..."
        if pnpm install >> "$REPORT_FILE" 2>&1; then
            print_success "Dependencies installed successfully"
        else
            print_error "Failed to install dependencies"
            echo "See report file for details: $REPORT_FILE"
            return 1
        fi
    else
        # Just check if install is needed
        if pnpm install --frozen-lockfile --dry-run >> "$REPORT_FILE" 2>&1; then
            print_success "Dependencies are in sync with lockfile"
        else
            print_warning "Dependencies may need to be installed (use --fix to install)"
        fi
    fi
}

check_missing_dependencies() {
    print_section "Checking for Missing Dependencies"

    cd "$PROJECT_ROOT"

    # Known imports that need Bull package
    print_info "Checking for bull queue dependencies..."

    cd "$PROJECT_ROOT/apps/api"
    if grep -r "from 'bull'" src/ 2>/dev/null | grep -q .; then
        if pnpm list bull 2>&1 | grep -q "bull"; then
            print_success "Bull queue package is installed"
        else
            print_error "Bull queue is imported but not in package.json"
            if [ "$FIX_ISSUES" = true ]; then
                print_info "Adding bull to dependencies..."
                pnpm add bull @types/bull
            fi
        fi
    fi

    cd "$PROJECT_ROOT"
}

check_peer_dependencies() {
    print_section "Checking Peer Dependencies"

    cd "$PROJECT_ROOT"

    # Check for peer dependency warnings
    if pnpm list --depth 0 2>&1 | grep -i "peer" >> "$REPORT_FILE"; then
        print_warning "Peer dependency warnings found - see report"
    else
        print_success "No peer dependency issues"
    fi
}

check_version_conflicts() {
    print_section "Checking Version Conflicts"

    cd "$PROJECT_ROOT"

    # Check React versions across workspaces
    print_info "Checking React version consistency..."

    WEB_REACT=$(cd apps/web && pnpm list react --depth 0 2>/dev/null | grep "react@" | head -1)
    MOBILE_REACT=$(cd apps/mobile && pnpm list react --depth 0 2>/dev/null | grep "react@" | head -1)

    if [ -n "$WEB_REACT" ] && [ -n "$MOBILE_REACT" ]; then
        echo "Web: $WEB_REACT" >> "$REPORT_FILE"
        echo "Mobile: $MOBILE_REACT" >> "$REPORT_FILE"
        print_success "React versions documented in report"
    fi

    # Check TypeScript versions
    print_info "Checking TypeScript version consistency..."

    ROOT_TS=$(pnpm list typescript --depth 0 2>/dev/null | grep "typescript@" | head -1)
    echo "Root: $ROOT_TS" >> "$REPORT_FILE"
    print_success "TypeScript versions documented in report"
}

check_outdated_packages() {
    print_section "Checking for Outdated Packages"

    cd "$PROJECT_ROOT"

    if pnpm outdated >> "$REPORT_FILE" 2>&1; then
        print_success "All packages are up to date"
    else
        print_warning "Some packages have updates available - see report"
        echo -e "\nTo update packages:" >> "$REPORT_FILE"
        echo "  - Patch updates: pnpm update" >> "$REPORT_FILE"
        echo "  - Minor updates: pnpm update --latest" >> "$REPORT_FILE"
        echo "  - Check specific: pnpm outdated <package>" >> "$REPORT_FILE"
    fi
}

check_security_audit() {
    if [ "$SKIP_AUDIT" = true ]; then
        print_info "Skipping security audit (--skip-audit flag)"
        return 0
    fi

    print_section "Running Security Audit"

    cd "$PROJECT_ROOT"

    # Run audit
    if pnpm audit --audit-level=high >> "$REPORT_FILE" 2>&1; then
        print_success "No high/critical vulnerabilities found"
    else
        EXIT_CODE=$?

        # Check if there are fixable issues
        if [ "$EXIT_CODE" -eq 1 ]; then
            print_warning "Security vulnerabilities found - see report"

            if [ "$FIX_ISSUES" = true ]; then
                print_info "Attempting to fix vulnerabilities..."
                if pnpm audit --fix >> "$REPORT_FILE" 2>&1; then
                    print_success "Vulnerabilities fixed"
                else
                    print_warning "Some vulnerabilities could not be auto-fixed"
                fi
            else
                echo -e "\nTo fix vulnerabilities:" >> "$REPORT_FILE"
                echo "  pnpm audit --fix" >> "$REPORT_FILE"
            fi
        fi
    fi
}

verify_typescript_compilation() {
    print_section "Verifying TypeScript Compilation"

    cd "$PROJECT_ROOT"

    # Check API
    print_info "Checking API TypeScript..."
    cd "$PROJECT_ROOT/apps/api"
    if npx tsc --noEmit >> "$REPORT_FILE" 2>&1; then
        print_success "API TypeScript compilation check passed"
    else
        print_error "API has TypeScript compilation errors - see report"
    fi

    # Check Web
    print_info "Checking Web TypeScript..."
    cd "$PROJECT_ROOT/apps/web"
    if npx tsc --noEmit >> "$REPORT_FILE" 2>&1; then
        print_success "Web TypeScript compilation check passed"
    else
        print_error "Web has TypeScript compilation errors - see report"
    fi

    cd "$PROJECT_ROOT"
}

verify_imports_resolve() {
    print_section "Verifying Import Resolution"

    cd "$PROJECT_ROOT"

    # This is a basic check - in production you'd want more comprehensive checks
    print_info "Checking for common import issues..."

    # Check for imports of bull
    if find apps/api/src -name "*.ts" -exec grep -l "from 'bull'" {} \; 2>/dev/null | grep -q .; then
        if [ -f "apps/api/node_modules/bull/package.json" ]; then
            print_success "Bull imports can be resolved"
        else
            print_error "Bull is imported but not installed"
        fi
    fi

    # Check for workspace dependencies
    if grep -r "workspace:\*" apps/*/package.json 2>/dev/null | grep -q .; then
        print_success "Workspace dependencies are configured"
    fi
}

verify_build() {
    if [ "$SKIP_BUILD" = true ]; then
        print_info "Skipping build verification (--skip-build flag)"
        return 0
    fi

    print_section "Verifying Build"

    cd "$PROJECT_ROOT"

    print_info "Testing build process (this may take a few minutes)..."

    # Try building packages first
    if pnpm run build:packages >> "$REPORT_FILE" 2>&1; then
        print_success "Packages built successfully"
    else
        print_error "Package build failed - see report"
    fi

    # Try building API
    print_info "Building API..."
    if pnpm run build:api >> "$REPORT_FILE" 2>&1; then
        print_success "API built successfully"
    else
        print_error "API build failed - see report"
    fi

    # Try building Web
    print_info "Building Web..."
    if pnpm run build:web >> "$REPORT_FILE" 2>&1; then
        print_success "Web built successfully"
    else
        print_error "Web build failed - see report"
    fi
}

check_lockfile_integrity() {
    print_section "Checking Lockfile Integrity"

    cd "$PROJECT_ROOT"

    if [ -f "pnpm-lock.yaml" ]; then
        print_success "pnpm-lock.yaml exists"

        # Check if lockfile is up to date
        if pnpm install --frozen-lockfile --dry-run >> "$REPORT_FILE" 2>&1; then
            print_success "Lockfile is up to date"
        else
            print_warning "Lockfile may be out of sync with package.json"
            if [ "$FIX_ISSUES" = true ]; then
                print_info "Updating lockfile..."
                pnpm install --no-frozen-lockfile >> "$REPORT_FILE" 2>&1
            fi
        fi
    else
        print_error "pnpm-lock.yaml not found"
    fi
}

check_deprecated_packages() {
    print_section "Checking for Deprecated Packages"

    cd "$PROJECT_ROOT"

    if pnpm list --depth 0 2>&1 | grep -i "deprecated" >> "$REPORT_FILE"; then
        print_warning "Deprecated packages found - see report"
    else
        print_success "No deprecated packages"
    fi
}

# =============================================================================
# Report Generation
# =============================================================================

generate_summary() {
    print_section "Summary"

    echo -e "\n${BOLD}Dependency Verification Summary${NC}\n"
    echo "================================" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"

    echo -e "Total Checks: ${BOLD}$TOTAL_CHECKS${NC}" | tee -a "$REPORT_FILE"
    echo -e "Passed: ${GREEN}$CHECKS_PASSED${NC}" | tee -a "$REPORT_FILE"
    echo -e "Warnings: ${YELLOW}$WARNINGS${NC}" | tee -a "$REPORT_FILE"
    echo -e "Errors: ${RED}$ERRORS${NC}" | tee -a "$REPORT_FILE"

    echo "" >> "$REPORT_FILE"

    if [ $ERRORS -gt 0 ]; then
        echo -e "\n${RED}${BOLD}Status: FAILED${NC}" | tee -a "$REPORT_FILE"
        echo -e "${RED}Critical errors found. Please review the report.${NC}\n"
        return 2
    elif [ $WARNINGS -gt 0 ]; then
        echo -e "\n${YELLOW}${BOLD}Status: PASSED WITH WARNINGS${NC}" | tee -a "$REPORT_FILE"
        echo -e "${YELLOW}Some warnings found. Review recommended.${NC}\n"
        return 1
    else
        echo -e "\n${GREEN}${BOLD}Status: PASSED${NC}" | tee -a "$REPORT_FILE"
        echo -e "${GREEN}All dependency checks passed!${NC}\n"
        return 0
    fi
}

provide_next_steps() {
    print_section "Next Steps"

    cat >> "$REPORT_FILE" << 'EOF'

Recommended Actions:
-------------------

If you had ERRORS:
1. Review the specific errors in this report
2. Run with --fix flag to attempt automatic fixes
3. Manually fix any remaining issues
4. Re-run this script to verify fixes

If you had WARNINGS:
1. Review outdated packages and plan updates
2. Check security vulnerabilities
3. Consider updating dependencies in a separate PR
4. Run tests after any updates

For Production Deployment:
1. Ensure all checks pass without errors
2. Run full test suite: pnpm test
3. Run E2E tests: pnpm test:e2e
4. Verify build: pnpm build
5. Review security audit results
6. Document any known issues

Useful Commands:
---------------
  pnpm install                    # Install dependencies
  pnpm audit                      # Full security audit
  pnpm audit --fix                # Fix vulnerabilities
  pnpm outdated                   # Check for updates
  pnpm update                     # Update to latest patch
  pnpm update --latest            # Update to latest minor
  pnpm build                      # Build all workspaces
  pnpm type-check                 # Check TypeScript
  pnpm test                       # Run tests

For more information, see docs/DEPENDENCY_INSTALLATION.md

EOF

    tail -n 25 "$REPORT_FILE"
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    # Initialize report
    cat > "$REPORT_FILE" << EOF
CitadelBuy Dependency Verification Report
=========================================
Generated: $(date '+%Y-%m-%d %H:%M:%S')
Project Root: $PROJECT_ROOT
Node Version: $(node --version)
pnpm Version: $(pnpm --version)

Options:
  Fix Issues: $FIX_ISSUES
  Skip Audit: $SKIP_AUDIT
  Skip Build: $SKIP_BUILD

EOF

    print_header "CitadelBuy Dependency Verification"

    # Run all checks
    check_prerequisites
    check_package_json_validity
    check_lockfile_integrity
    install_dependencies
    check_missing_dependencies
    check_peer_dependencies
    check_version_conflicts
    check_outdated_packages
    check_deprecated_packages
    check_security_audit
    verify_imports_resolve
    verify_typescript_compilation
    verify_build

    # Generate summary and get exit code
    generate_summary
    SUMMARY_EXIT=$?

    # Provide next steps
    provide_next_steps

    # Final output
    print_header "Report Location"
    echo -e "${CYAN}Full report saved to:${NC}"
    echo -e "${BOLD}$REPORT_FILE${NC}\n"

    # Exit with appropriate code
    exit $SUMMARY_EXIT
}

# Run main function
main "$@"
