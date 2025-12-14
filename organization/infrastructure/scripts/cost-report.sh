#!/bin/bash
# Broxiva Cost Report Generator
# Generates comprehensive cost reports and analysis

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_DIR="${SCRIPT_DIR}/../reports"
PERIOD="daily"
EMAIL=""
FORMAT="text"
SEND_EMAIL=false

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Usage
usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Generate cost reports for Broxiva Azure resources.

OPTIONS:
    -p, --period PERIOD       Report period: daily, weekly, monthly (default: daily)
    -e, --email EMAIL         Email address to send report
    -f, --format FORMAT       Output format: text, html, json, csv (default: text)
    -o, --output FILE         Save report to file
    -h, --help                Show this help message

EXAMPLES:
    # Generate daily cost report
    $0 --period daily

    # Generate weekly report and email
    $0 --period weekly --email finops@broxiva.com

    # Generate monthly report in HTML
    $0 --period monthly --format html --output monthly-report.html

EOF
    exit 0
}

# Parse arguments
OUTPUT_FILE=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--period)
            PERIOD="$2"
            shift 2
            ;;
        -e|--email)
            EMAIL="$2"
            SEND_EMAIL=true
            shift 2
            ;;
        -f|--format)
            FORMAT="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            ;;
    esac
done

# Verify Azure CLI login
if ! az account show &>/dev/null; then
    echo -e "${RED}Not logged into Azure. Please run 'az login' first.${NC}"
    exit 1
fi

# Create reports directory
mkdir -p "$REPORT_DIR"

# Set default output file if not specified
if [ -z "$OUTPUT_FILE" ]; then
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    if [ "$FORMAT" = "html" ]; then
        OUTPUT_FILE="${REPORT_DIR}/cost-report-${PERIOD}-${TIMESTAMP}.html"
    elif [ "$FORMAT" = "json" ]; then
        OUTPUT_FILE="${REPORT_DIR}/cost-report-${PERIOD}-${TIMESTAMP}.json"
    elif [ "$FORMAT" = "csv" ]; then
        OUTPUT_FILE="${REPORT_DIR}/cost-report-${PERIOD}-${TIMESTAMP}.csv"
    else
        OUTPUT_FILE="${REPORT_DIR}/cost-report-${PERIOD}-${TIMESTAMP}.txt"
    fi
fi

# Calculate date ranges based on period
case $PERIOD in
    daily)
        START_DATE=$(date -d "yesterday" +%Y-%m-%d)
        END_DATE=$(date +%Y-%m-%d)
        TITLE="Daily Cost Report - $(date -d "yesterday" +%Y-%m-%d)"
        ;;
    weekly)
        START_DATE=$(date -d "7 days ago" +%Y-%m-%d)
        END_DATE=$(date +%Y-%m-%d)
        TITLE="Weekly Cost Report - Last 7 Days"
        ;;
    monthly)
        START_DATE=$(date -d "$(date +%Y-%m-01)" +%Y-%m-%d)
        END_DATE=$(date +%Y-%m-%d)
        TITLE="Monthly Cost Report - $(date +%B %Y)"
        ;;
    *)
        echo -e "${RED}Invalid period: $PERIOD${NC}"
        usage
        ;;
esac

echo -e "${BLUE}========================================${NC}"
echo -e "${BOLD}  Broxiva Cost Report Generator${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Period: $PERIOD"
echo "Date Range: $START_DATE to $END_DATE"
echo "Format: $FORMAT"
echo "Output: $OUTPUT_FILE"
echo -e "${BLUE}========================================${NC}"

# Get subscription info
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)

# Function to get cost data
get_cost_data() {
    local start=$1
    local end=$2
    local granularity=$3

    az consumption usage list \
        --start-date "$start" \
        --end-date "$end" \
        --query "[].{Date:usageEnd, Resource:instanceName, ResourceGroup:resourceGroup, Service:consumedService, Cost:pretaxCost, Currency:currency}" \
        -o json
}

# Function to get cost by environment
get_cost_by_environment() {
    echo -e "\n${CYAN}Getting costs by environment...${NC}"

    # Get all resource groups with env tag
    mapfile -t RGS < <(az group list --query "[].{Name:name, Env:tags.env}" -o json | jq -r '.[] | select(.Env != null) | "\(.Env):\(.Name)"')

    declare -A ENV_COSTS
    ENV_COSTS["production"]=0
    ENV_COSTS["staging"]=0
    ENV_COSTS["development"]=0
    ENV_COSTS["untagged"]=0

    # Query costs for each resource group
    for rg_info in "${RGS[@]}"; do
        ENV="${rg_info%%:*}"
        RG="${rg_info#*:}"

        # Get cost for this RG
        COST=$(az consumption usage list \
            --start-date "$START_DATE" \
            --end-date "$END_DATE" \
            --query "[?resourceGroup=='$RG'].pretaxCost" \
            -o tsv | awk '{s+=$1} END {print s}')

        if [ -n "$COST" ] && [ "$COST" != "0" ]; then
            ENV_COSTS["$ENV"]=$(echo "${ENV_COSTS[$ENV]} + $COST" | bc)
        fi
    done

    # Output environment costs
    for env in "${!ENV_COSTS[@]}"; do
        echo "$env:${ENV_COSTS[$env]}"
    done
}

# Function to get top cost drivers
get_top_cost_drivers() {
    local limit=${1:-10}

    az consumption usage list \
        --start-date "$START_DATE" \
        --end-date "$END_DATE" \
        --query "[].{Resource:instanceName, Service:consumedService, Cost:pretaxCost}" \
        -o json | jq -r 'group_by(.Resource) | map({Resource: .[0].Resource, Service: .[0].Service, TotalCost: (map(.Cost | tonumber) | add)}) | sort_by(-.TotalCost) | .[:'"$limit"'] | .[]' | jq -s '.'
}

# Function to generate text report
generate_text_report() {
    local output=$1

    {
        echo "========================================"
        echo "$TITLE"
        echo "========================================"
        echo "Generated: $(date)"
        echo "Subscription: $SUBSCRIPTION_NAME ($SUBSCRIPTION_ID)"
        echo "Date Range: $START_DATE to $END_DATE"
        echo ""

        # Total Cost
        echo "----------------------------------------"
        echo "TOTAL COST"
        echo "----------------------------------------"
        TOTAL_COST=$(az consumption usage list \
            --start-date "$START_DATE" \
            --end-date "$END_DATE" \
            --query "sum([].pretaxCost)" \
            -o tsv 2>/dev/null || echo "0")
        printf "Total: \$%.2f USD\n" "${TOTAL_COST:-0}"
        echo ""

        # Cost by Environment
        echo "----------------------------------------"
        echo "COST BY ENVIRONMENT"
        echo "----------------------------------------"
        while IFS=: read -r env cost; do
            printf "%-15s \$%.2f\n" "$env" "$cost"
        done < <(get_cost_by_environment | grep -v "Getting")
        echo ""

        # Top Cost Drivers
        echo "----------------------------------------"
        echo "TOP 10 COST DRIVERS"
        echo "----------------------------------------"
        printf "%-40s %-30s %s\n" "Resource" "Service" "Cost"
        echo "----------------------------------------"

        TOP_COSTS=$(get_top_cost_drivers 10)
        echo "$TOP_COSTS" | jq -r '.[] | "\(.Resource)|\(.Service)|\(.TotalCost)"' | while IFS='|' read -r resource service cost; do
            printf "%-40s %-30s \$%.2f\n" "${resource:0:40}" "${service:0:30}" "$cost"
        done
        echo ""

        # Cost by Service
        echo "----------------------------------------"
        echo "COST BY SERVICE TYPE"
        echo "----------------------------------------"
        az consumption usage list \
            --start-date "$START_DATE" \
            --end-date "$END_DATE" \
            --query "[].{Service:consumedService, Cost:pretaxCost}" \
            -o json | jq -r 'group_by(.Service) | map({Service: .[0].Service, TotalCost: (map(.Cost | tonumber) | add)}) | sort_by(-.TotalCost) | .[:10] | .[] | "\(.Service)|\(.TotalCost)"' | while IFS='|' read -r service cost; do
            printf "%-50s \$%.2f\n" "${service:0:50}" "$cost"
        done
        echo ""

        # Cost Trend (if weekly or monthly)
        if [ "$PERIOD" != "daily" ]; then
            echo "----------------------------------------"
            echo "COST TREND (DAILY)"
            echo "----------------------------------------"
            printf "%-12s %s\n" "Date" "Cost"
            echo "----------------------------------------"

            # Generate daily breakdown
            CURRENT_DATE="$START_DATE"
            while [[ "$CURRENT_DATE" < "$END_DATE" ]]; do
                NEXT_DATE=$(date -d "$CURRENT_DATE + 1 day" +%Y-%m-%d)
                DAILY_COST=$(az consumption usage list \
                    --start-date "$CURRENT_DATE" \
                    --end-date "$NEXT_DATE" \
                    --query "sum([].pretaxCost)" \
                    -o tsv 2>/dev/null || echo "0")
                printf "%-12s \$%.2f\n" "$CURRENT_DATE" "${DAILY_COST:-0}"
                CURRENT_DATE="$NEXT_DATE"
            done
            echo ""
        fi

        # Recommendations
        echo "----------------------------------------"
        echo "COST OPTIMIZATION RECOMMENDATIONS"
        echo "----------------------------------------"
        echo "1. Review resources with autoShutdown=true tag compliance"
        echo "2. Check for untagged resources and proper environment classification"
        echo "3. Verify non-production resources are shutdown outside business hours"
        echo "4. Consider Reserved Instances for consistent production workloads"
        echo "5. Review and right-size over-provisioned resources"
        echo ""

        # Budget Status
        echo "----------------------------------------"
        echo "BUDGET STATUS"
        echo "----------------------------------------"
        MONTHLY_BUDGET=5000  # Should be parameterized or read from config
        BUDGET_USED=$(echo "scale=2; $TOTAL_COST / $MONTHLY_BUDGET * 100" | bc)
        printf "Monthly Budget: \$%.2f\n" "$MONTHLY_BUDGET"
        printf "Current Spend:  \$%.2f\n" "$TOTAL_COST"
        printf "Budget Used:    %.1f%%\n" "$BUDGET_USED"

        if (( $(echo "$BUDGET_USED > 90" | bc -l) )); then
            echo -e "${RED}WARNING: Budget usage exceeds 90%${NC}"
        elif (( $(echo "$BUDGET_USED > 75" | bc -l) )); then
            echo -e "${YELLOW}CAUTION: Budget usage exceeds 75%${NC}"
        fi
        echo ""

        echo "========================================"
        echo "End of Report"
        echo "========================================"
    } > "$output"
}

# Function to generate HTML report
generate_html_report() {
    local output=$1

    TOTAL_COST=$(az consumption usage list \
        --start-date "$START_DATE" \
        --end-date "$END_DATE" \
        --query "sum([].pretaxCost)" \
        -o tsv 2>/dev/null || echo "0")

    TOP_COSTS=$(get_top_cost_drivers 10)

    cat > "$output" <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>$TITLE</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #0078d4;
            border-bottom: 3px solid #0078d4;
            padding-bottom: 10px;
        }
        h2 {
            color: #333;
            margin-top: 30px;
            border-left: 4px solid #0078d4;
            padding-left: 10px;
        }
        .metric-card {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            margin: 10px;
            border-radius: 8px;
            min-width: 200px;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
        }
        .metric-label {
            font-size: 0.9em;
            opacity: 0.9;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #0078d4;
            color: white;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
        .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 15px 0;
        }
        .success {
            background-color: #d4edda;
            border-left: 4px solid #28a745;
            padding: 15px;
            margin: 15px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>$TITLE</h1>
        <p><strong>Generated:</strong> $(date)</p>
        <p><strong>Subscription:</strong> $SUBSCRIPTION_NAME</p>
        <p><strong>Date Range:</strong> $START_DATE to $END_DATE</p>

        <h2>Overview</h2>
        <div class="metric-card">
            <div class="metric-label">Total Cost</div>
            <div class="metric-value">\$$(printf "%.2f" "$TOTAL_COST")</div>
        </div>

        <h2>Top 10 Cost Drivers</h2>
        <table>
            <thead>
                <tr>
                    <th>Resource</th>
                    <th>Service</th>
                    <th>Cost (USD)</th>
                </tr>
            </thead>
            <tbody>
$(echo "$TOP_COSTS" | jq -r '.[] | "<tr><td>\(.Resource)</td><td>\(.Service)</td><td>$\(.TotalCost | tonumber | . * 100 | round / 100)</td></tr>"')
            </tbody>
        </table>

        <h2>Recommendations</h2>
        <div class="warning">
            <strong>Cost Optimization Opportunities:</strong>
            <ul>
                <li>Review resources with autoShutdown=true tag compliance</li>
                <li>Check for untagged resources</li>
                <li>Verify non-production shutdown schedules</li>
                <li>Consider Reserved Instances for production</li>
                <li>Right-size over-provisioned resources</li>
            </ul>
        </div>

        <div class="footer">
            <p>Broxiva FinOps Team | Generated by cost-report.sh</p>
        </div>
    </div>
</body>
</html>
EOF
}

# Function to generate JSON report
generate_json_report() {
    local output=$1

    TOTAL_COST=$(az consumption usage list \
        --start-date "$START_DATE" \
        --end-date "$END_DATE" \
        --query "sum([].pretaxCost)" \
        -o tsv 2>/dev/null || echo "0")

    TOP_COSTS=$(get_top_cost_drivers 10)
    ENV_COSTS=$(get_cost_by_environment | grep -v "Getting" | jq -R 'split(":") | {environment: .[0], cost: (.[1] | tonumber)}' | jq -s '.')

    cat > "$output" <<EOF
{
  "title": "$TITLE",
  "generated": "$(date -Iseconds)",
  "subscription": {
    "id": "$SUBSCRIPTION_ID",
    "name": "$SUBSCRIPTION_NAME"
  },
  "period": {
    "type": "$PERIOD",
    "startDate": "$START_DATE",
    "endDate": "$END_DATE"
  },
  "summary": {
    "totalCost": $TOTAL_COST,
    "currency": "USD"
  },
  "costByEnvironment": $ENV_COSTS,
  "topCostDrivers": $TOP_COSTS
}
EOF
}

# Generate report based on format
echo -e "\n${CYAN}Generating $FORMAT report...${NC}"

case $FORMAT in
    text)
        generate_text_report "$OUTPUT_FILE"
        ;;
    html)
        generate_html_report "$OUTPUT_FILE"
        ;;
    json)
        generate_json_report "$OUTPUT_FILE"
        ;;
    csv)
        # Generate CSV
        az consumption usage list \
            --start-date "$START_DATE" \
            --end-date "$END_DATE" \
            --query "[].{Date:usageEnd, Resource:instanceName, ResourceGroup:resourceGroup, Service:consumedService, Cost:pretaxCost}" \
            -o json | jq -r '(.[0] | keys_unsorted) as $keys | $keys, map([.[ $keys[] ]])[] | @csv' > "$OUTPUT_FILE"
        ;;
    *)
        echo -e "${RED}Invalid format: $FORMAT${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}Report generated successfully: $OUTPUT_FILE${NC}"

# Display report if text format
if [ "$FORMAT" = "text" ]; then
    echo -e "\n${CYAN}Report Preview:${NC}"
    cat "$OUTPUT_FILE"
fi

# Send email if requested
if [ "$SEND_EMAIL" = true ] && [ -n "$EMAIL" ]; then
    echo -e "\n${CYAN}Sending report to $EMAIL...${NC}"

    SUBJECT="Broxiva Cost Report - $PERIOD - $(date +%Y-%m-%d)"

    if [ "$FORMAT" = "html" ]; then
        # Send HTML email (requires mail tool with HTML support)
        cat "$OUTPUT_FILE" | mail -s "$(echo -e "$SUBJECT\nContent-Type: text/html")" "$EMAIL" && \
            echo -e "${GREEN}Email sent successfully${NC}" || \
            echo -e "${YELLOW}Warning: Failed to send email. Install 'mailutils' or configure email settings.${NC}"
    else
        # Send plain text email
        mail -s "$SUBJECT" "$EMAIL" < "$OUTPUT_FILE" && \
            echo -e "${GREEN}Email sent successfully${NC}" || \
            echo -e "${YELLOW}Warning: Failed to send email. Install 'mailutils' or configure email settings.${NC}"
    fi
fi

echo -e "\n${GREEN}Cost report generation complete!${NC}"
exit 0
