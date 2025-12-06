#!/bin/bash

##############################################################################
# CitadelBuy Load Test Runner
#
# This script orchestrates k6 load tests with configurable scenarios,
# generates HTML reports, compares against thresholds, and outputs summaries.
#
# Usage:
#   ./scripts/run-load-tests.sh [OPTIONS]
#
# Options:
#   -s, --scenario <name>     Specific scenario to run (auth, checkout, search, etc.)
#   -a, --all                 Run all test scenarios sequentially
#   -d, --duration <time>     Override test duration (e.g., 5m, 30s)
#   -v, --vus <number>        Override virtual users count
#   -e, --env <environment>   Environment (local, staging, production)
#   -o, --output <dir>        Output directory for reports (default: test-results)
#   -t, --type <type>         Test type (smoke, load, stress, spike, soak)
#   -r, --report              Generate HTML report
#   -c, --compare             Compare against baseline thresholds
#   -h, --help                Show this help message
#
# Examples:
#   ./scripts/run-load-tests.sh --scenario auth --duration 2m --vus 10
#   ./scripts/run-load-tests.sh --all --env staging --report
#   ./scripts/run-load-tests.sh --scenario checkout --type stress
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
SCENARIO=""
RUN_ALL=false
DURATION=""
VUS=""
ENVIRONMENT="local"
OUTPUT_DIR="test-results"
TEST_TYPE=""
GENERATE_REPORT=false
COMPARE_BASELINE=false
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Available scenarios
SCENARIOS=(
  "auth"
  "checkout"
  "search"
  "api-stress"
  "product-browse"
  "user-registration"
  "order-history"
  "admin-operations"
)

# Base directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOAD_TESTS_DIR="$PROJECT_ROOT/tests/load"
SCENARIOS_DIR="$LOAD_TESTS_DIR/scenarios"

##############################################################################
# Helper Functions
##############################################################################

print_header() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║${NC}  CitadelBuy Load Testing Suite                            ${BLUE}║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

print_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
  head -n 35 "$0" | tail -n 30
  exit 0
}

check_dependencies() {
  print_info "Checking dependencies..."

  if ! command -v k6 &> /dev/null; then
    print_error "k6 is not installed. Please install k6 first."
    echo ""
    echo "Install k6:"
    echo "  macOS:   brew install k6"
    echo "  Windows: choco install k6"
    echo "  Linux:   See https://k6.io/docs/getting-started/installation"
    exit 1
  fi

  K6_VERSION=$(k6 version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  print_success "k6 version $K6_VERSION found"
}

setup_environment() {
  print_info "Setting up environment: $ENVIRONMENT"

  case $ENVIRONMENT in
    local)
      export BASE_URL="http://localhost:3000"
      export API_URL="http://localhost:4000"
      ;;
    staging)
      export BASE_URL="${STAGING_BASE_URL:-https://staging.citadelbuy.com}"
      export API_URL="${STAGING_API_URL:-https://api-staging.citadelbuy.com}"
      ;;
    production)
      print_warning "Running load tests against production!"
      read -p "Are you sure you want to continue? (yes/no): " confirm
      if [ "$confirm" != "yes" ]; then
        print_info "Load test cancelled."
        exit 0
      fi
      export BASE_URL="${PROD_BASE_URL:-https://citadelbuy.com}"
      export API_URL="${PROD_API_URL:-https://api.citadelbuy.com}"
      ;;
    *)
      print_error "Unknown environment: $ENVIRONMENT"
      exit 1
      ;;
  esac

  print_info "Base URL: $BASE_URL"
  print_info "API URL: $API_URL"
}

create_output_dir() {
  mkdir -p "$OUTPUT_DIR"
  mkdir -p "$OUTPUT_DIR/$TIMESTAMP"
  print_info "Output directory: $OUTPUT_DIR/$TIMESTAMP"
}

run_scenario() {
  local scenario=$1
  local scenario_file="$SCENARIOS_DIR/${scenario}.js"

  if [ ! -f "$scenario_file" ]; then
    print_error "Scenario file not found: $scenario_file"
    return 1
  fi

  print_info "Running scenario: $scenario"

  # Build k6 command
  local k6_cmd="k6 run"

  # Add duration if specified
  if [ -n "$DURATION" ]; then
    k6_cmd="$k6_cmd --duration $DURATION"
  fi

  # Add VUs if specified
  if [ -n "$VUS" ]; then
    k6_cmd="$k6_cmd --vus $VUS"
  fi

  # Add test type scenario if specified
  if [ -n "$TEST_TYPE" ]; then
    k6_cmd="$k6_cmd --scenario $TEST_TYPE"
  fi

  # Output formats
  local output_file="$OUTPUT_DIR/$TIMESTAMP/${scenario}"
  k6_cmd="$k6_cmd --out json=${output_file}.json"
  k6_cmd="$k6_cmd --out csv=${output_file}.csv"

  # Add summary export
  k6_cmd="$k6_cmd --summary-export=${output_file}-summary.json"

  # Add scenario file
  k6_cmd="$k6_cmd $scenario_file"

  print_info "Executing: $k6_cmd"
  echo ""

  # Run k6 and capture exit code
  if eval "$k6_cmd"; then
    print_success "Scenario '$scenario' completed successfully"
    echo "$scenario:PASS" >> "$OUTPUT_DIR/$TIMESTAMP/results.txt"
    return 0
  else
    print_error "Scenario '$scenario' failed"
    echo "$scenario:FAIL" >> "$OUTPUT_DIR/$TIMESTAMP/results.txt"
    return 1
  fi
}

generate_html_report() {
  local scenario=$1
  local json_file="$OUTPUT_DIR/$TIMESTAMP/${scenario}.json"
  local html_file="$OUTPUT_DIR/$TIMESTAMP/${scenario}.html"

  if [ ! -f "$json_file" ]; then
    print_warning "JSON file not found for HTML report: $json_file"
    return 1
  fi

  print_info "Generating HTML report for: $scenario"

  # Create simple HTML report from JSON
  cat > "$html_file" << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>k6 Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid #7d64ff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .metric { background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #7d64ff; border-radius: 4px; }
    .metric-name { font-weight: bold; color: #333; margin-bottom: 5px; }
    .metric-value { color: #666; font-size: 14px; }
    .pass { color: #28a745; font-weight: bold; }
    .fail { color: #dc3545; font-weight: bold; }
    .warning { color: #ffc107; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #7d64ff; color: white; }
    tr:hover { background: #f5f5f5; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .summary-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .summary-card h3 { margin: 0 0 10px 0; font-size: 14px; opacity: 0.9; }
    .summary-card .value { font-size: 28px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>k6 Load Test Report</h1>
    <p><strong>Scenario:</strong> SCENARIO_NAME</p>
    <p><strong>Timestamp:</strong> TIMESTAMP</p>
    <p><strong>Environment:</strong> ENVIRONMENT</p>

    <div class="summary">
      <div class="summary-card">
        <h3>Virtual Users</h3>
        <div class="value">VUS_VALUE</div>
      </div>
      <div class="summary-card">
        <h3>Total Requests</h3>
        <div class="value">REQUESTS_VALUE</div>
      </div>
      <div class="summary-card">
        <h3>Success Rate</h3>
        <div class="value">SUCCESS_RATE%</div>
      </div>
      <div class="summary-card">
        <h3>Avg Response Time</h3>
        <div class="value">AVG_TIME ms</div>
      </div>
    </div>

    <h2>Test Summary</h2>
    <div id="summary">
      <p>Report generated from k6 JSON output. Open the JSON file for detailed metrics.</p>
      <p><strong>JSON File:</strong> <code>SCENARIO_NAME.json</code></p>
      <p><strong>CSV File:</strong> <code>SCENARIO_NAME.csv</code></p>
    </div>

    <h2>Quick Analysis</h2>
    <div class="metric">
      <div class="metric-name">Status</div>
      <div class="metric-value">Test completed. Review detailed metrics in JSON/CSV files.</div>
    </div>

    <h2>Files Generated</h2>
    <ul>
      <li><code>SCENARIO_NAME.json</code> - Detailed metrics in JSON format</li>
      <li><code>SCENARIO_NAME.csv</code> - Time-series data in CSV format</li>
      <li><code>SCENARIO_NAME-summary.json</code> - Test summary</li>
      <li><code>SCENARIO_NAME.html</code> - This HTML report</li>
    </ul>

    <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px;">
      Generated by CitadelBuy Load Test Runner • Powered by k6
    </p>
  </div>
</body>
</html>
EOF

  # Replace placeholders
  sed -i "s/SCENARIO_NAME/$scenario/g" "$html_file" 2>/dev/null || sed -i '' "s/SCENARIO_NAME/$scenario/g" "$html_file"
  sed -i "s/TIMESTAMP/$TIMESTAMP/g" "$html_file" 2>/dev/null || sed -i '' "s/TIMESTAMP/$TIMESTAMP/g" "$html_file"
  sed -i "s/ENVIRONMENT/$ENVIRONMENT/g" "$html_file" 2>/dev/null || sed -i '' "s/ENVIRONMENT/$ENVIRONMENT/g" "$html_file"

  print_success "HTML report generated: $html_file"
}

compare_with_baseline() {
  print_info "Comparing results with baseline thresholds..."

  local results_file="$OUTPUT_DIR/$TIMESTAMP/results.txt"

  if [ ! -f "$results_file" ]; then
    print_warning "No results file found for comparison"
    return
  fi

  local total=$(wc -l < "$results_file")
  local passed=$(grep -c ":PASS" "$results_file" || echo 0)
  local failed=$(grep -c ":FAIL" "$results_file" || echo 0)

  echo ""
  print_info "═══════════════════════════════════════════════════════════"
  print_info "                    COMPARISON RESULTS                      "
  print_info "═══════════════════════════════════════════════════════════"
  echo ""
  echo -e "  Total scenarios:  $total"
  echo -e "  ${GREEN}Passed:${NC}           $passed"
  echo -e "  ${RED}Failed:${NC}           $failed"
  echo ""

  if [ $failed -eq 0 ]; then
    print_success "All scenarios passed! ✓"
  else
    print_warning "Some scenarios failed. Review the reports for details."
  fi
}

generate_summary() {
  print_info "Generating test summary..."

  local summary_file="$OUTPUT_DIR/$TIMESTAMP/summary.txt"

  {
    echo "═══════════════════════════════════════════════════════════"
    echo "          CitadelBuy Load Test Summary"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "Timestamp:    $TIMESTAMP"
    echo "Environment:  $ENVIRONMENT"
    echo "Base URL:     $BASE_URL"
    echo "API URL:      $API_URL"
    echo ""

    if [ -n "$DURATION" ]; then
      echo "Duration:     $DURATION"
    fi

    if [ -n "$VUS" ]; then
      echo "Virtual Users: $VUS"
    fi

    if [ -n "$TEST_TYPE" ]; then
      echo "Test Type:    $TEST_TYPE"
    fi

    echo ""
    echo "Scenarios Run:"
    echo "─────────────────────────────────────────────────────────"

    if [ -f "$OUTPUT_DIR/$TIMESTAMP/results.txt" ]; then
      cat "$OUTPUT_DIR/$TIMESTAMP/results.txt"
    fi

    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "Output Directory: $OUTPUT_DIR/$TIMESTAMP"
    echo "═══════════════════════════════════════════════════════════"
  } | tee "$summary_file"

  print_success "Summary saved to: $summary_file"
}

##############################################################################
# Main Script
##############################################################################

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -s|--scenario)
      SCENARIO="$2"
      shift 2
      ;;
    -a|--all)
      RUN_ALL=true
      shift
      ;;
    -d|--duration)
      DURATION="$2"
      shift 2
      ;;
    -v|--vus)
      VUS="$2"
      shift 2
      ;;
    -e|--env)
      ENVIRONMENT="$2"
      shift 2
      ;;
    -o|--output)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    -t|--type)
      TEST_TYPE="$2"
      shift 2
      ;;
    -r|--report)
      GENERATE_REPORT=true
      shift
      ;;
    -c|--compare)
      COMPARE_BASELINE=true
      shift
      ;;
    -h|--help)
      show_help
      ;;
    *)
      print_error "Unknown option: $1"
      show_help
      ;;
  esac
done

# Main execution
print_header
check_dependencies
setup_environment
create_output_dir

echo ""
print_info "═══════════════════════════════════════════════════════════"
print_info "                  Starting Load Tests                       "
print_info "═══════════════════════════════════════════════════════════"
echo ""

# Run scenarios
if [ "$RUN_ALL" = true ]; then
  print_info "Running all scenarios..."
  for scenario in "${SCENARIOS[@]}"; do
    echo ""
    run_scenario "$scenario"

    if [ "$GENERATE_REPORT" = true ]; then
      generate_html_report "$scenario"
    fi

    # Brief pause between scenarios
    sleep 2
  done
elif [ -n "$SCENARIO" ]; then
  run_scenario "$SCENARIO"

  if [ "$GENERATE_REPORT" = true ]; then
    generate_html_report "$SCENARIO"
  fi
else
  print_error "No scenario specified. Use --scenario <name> or --all"
  show_help
fi

echo ""
print_info "═══════════════════════════════════════════════════════════"
print_info "                  Load Tests Completed                      "
print_info "═══════════════════════════════════════════════════════════"
echo ""

# Generate summary
generate_summary

# Compare with baseline if requested
if [ "$COMPARE_BASELINE" = true ]; then
  compare_with_baseline
fi

echo ""
print_success "All tests completed!"
print_info "Results available in: $OUTPUT_DIR/$TIMESTAMP"
echo ""

exit 0
