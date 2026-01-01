#!/bin/bash

# Dependency Check Script for Broxiva
# This script checks for outdated packages and security vulnerabilities across all workspaces

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Report file
REPORT_FILE="$PROJECT_ROOT/dependency-check-report.txt"

# Timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Broxiva Dependency Check${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Timestamp: $TIMESTAMP\n"

# Initialize report
cat > "$REPORT_FILE" << EOF
Broxiva Dependency Check Report
===================================
Generated: $TIMESTAMP

EOF

# Function to print section header
print_section() {
    echo -e "\n${BLUE}>>> $1${NC}\n"
    echo -e "\n$1\n" >> "$REPORT_FILE"
    echo "-----------------------------------" >> "$REPORT_FILE"
}

# Function to check if pnpm is installed
check_pnpm() {
    if ! command -v pnpm &> /dev/null; then
        echo -e "${RED}Error: pnpm is not installed${NC}"
        echo "Please install pnpm: npm install -g pnpm"
        exit 1
    fi
    echo -e "${GREEN}✓ pnpm is installed: $(pnpm --version)${NC}"
}

# Function to check for outdated packages
check_outdated() {
    local workspace=$1
    local workspace_name=$2

    print_section "Checking outdated packages: $workspace_name"

    cd "$PROJECT_ROOT/$workspace"

    echo "Workspace: $workspace_name" >> "$REPORT_FILE"

    if pnpm outdated >> "$REPORT_FILE" 2>&1; then
        echo -e "${GREEN}✓ All packages are up to date in $workspace_name${NC}"
        echo "All packages are up to date" >> "$REPORT_FILE"
    else
        echo -e "${YELLOW}⚠ Some packages are outdated in $workspace_name${NC}"
        echo "See details in report file"
    fi

    cd "$PROJECT_ROOT"
}

# Function to run security audit
check_vulnerabilities() {
    local workspace=$1
    local workspace_name=$2

    print_section "Security audit: $workspace_name"

    cd "$PROJECT_ROOT/$workspace"

    echo "Workspace: $workspace_name" >> "$REPORT_FILE"

    # Run audit and capture results
    if pnpm audit --audit-level=low >> "$REPORT_FILE" 2>&1; then
        echo -e "${GREEN}✓ No vulnerabilities found in $workspace_name${NC}"
        echo "No vulnerabilities found" >> "$REPORT_FILE"
        return 0
    else
        local exit_code=$?

        # Check severity of vulnerabilities
        if pnpm audit --audit-level=high > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠ Low or moderate vulnerabilities found in $workspace_name${NC}"
            echo "Low or moderate vulnerabilities found" >> "$REPORT_FILE"
            return 1
        else
            echo -e "${RED}✗ High or critical vulnerabilities found in $workspace_name${NC}"
            echo "HIGH OR CRITICAL VULNERABILITIES FOUND!" >> "$REPORT_FILE"
            return 2
        fi
    fi

    cd "$PROJECT_ROOT"
}

# Function to generate summary
generate_summary() {
    print_section "Summary"

    local total_workspaces=3
    local vulnerable_workspaces=0
    local outdated_workspaces=0

    # Count issues
    if grep -q "outdated" "$REPORT_FILE"; then
        outdated_workspaces=$(grep -c "outdated" "$REPORT_FILE" || echo 0)
    fi

    if grep -q "vulnerabilities found" "$REPORT_FILE"; then
        vulnerable_workspaces=$(grep -c "vulnerabilities found" "$REPORT_FILE" || echo 0)
    fi

    echo "Total workspaces checked: $total_workspaces" | tee -a "$REPORT_FILE"
    echo "Workspaces with outdated packages: $outdated_workspaces" | tee -a "$REPORT_FILE"
    echo "Workspaces with vulnerabilities: $vulnerable_workspaces" | tee -a "$REPORT_FILE"

    echo -e "\n" >> "$REPORT_FILE"

    if [ $vulnerable_workspaces -eq 0 ] && [ $outdated_workspaces -eq 0 ]; then
        echo -e "${GREEN}✓ All dependencies are up to date and secure!${NC}" | tee -a "$REPORT_FILE"
        return 0
    else
        echo -e "${YELLOW}⚠ Some dependencies need attention${NC}" | tee -a "$REPORT_FILE"
        return 1
    fi
}

# Function to provide recommendations
provide_recommendations() {
    print_section "Recommendations"

    cat >> "$REPORT_FILE" << 'EOF'

To update dependencies:
-----------------------
1. For security patches:
   pnpm audit --fix

2. For outdated packages (patch versions):
   pnpm update --patch

3. For outdated packages (minor versions):
   pnpm update --minor

4. For major version updates:
   pnpm update --latest <package-name>

5. To update a specific workspace:
   cd apps/api  # or apps/web
   pnpm update

Testing requirements:
---------------------
- Always run tests after updates: pnpm test
- Run E2E tests: pnpm test:e2e
- Check types: pnpm type-check
- Verify build: pnpm build

For more information, see docs/DEPENDENCY_MANAGEMENT.md

EOF

    cat "$REPORT_FILE" | tail -n 20
}

# Main execution
main() {
    cd "$PROJECT_ROOT"

    # Check prerequisites
    check_pnpm

    # Track if we found any issues
    has_issues=0

    # Check root workspace
    check_outdated "." "Root Workspace"
    check_vulnerabilities "." "Root Workspace" || has_issues=1

    # Check API workspace
    check_outdated "apps/api" "API Workspace"
    check_vulnerabilities "apps/api" "API Workspace" || has_issues=1

    # Check Web workspace
    check_outdated "apps/web" "Web Workspace"
    check_vulnerabilities "apps/web" "Web Workspace" || has_issues=1

    # Generate summary
    generate_summary || has_issues=1

    # Provide recommendations
    provide_recommendations

    # Final output
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}Report saved to: $REPORT_FILE${NC}"
    echo -e "${BLUE}========================================${NC}\n"

    # Exit with appropriate code
    if [ $has_issues -ne 0 ]; then
        echo -e "${YELLOW}⚠ Issues found. Please review the report.${NC}\n"
        exit 1
    else
        echo -e "${GREEN}✓ All checks passed!${NC}\n"
        exit 0
    fi
}

# Run main function
main "$@"
