#!/bin/bash
# ==========================================
# Broxiva Monorepo - Affected Components Detection
# Outputs JSON list of components that need rebuilding
# ==========================================

set -e

# Configuration
BASE_BRANCH="${BASE_BRANCH:-main}"
COMPARE_SHA="${COMPARE_SHA:-HEAD}"

# Component definitions with their paths and dependencies
declare -A COMPONENTS
COMPONENTS=(
    ["api"]="apps/api"
    ["web"]="apps/web"
    ["ai-agents"]="apps/services/ai-agents"
    ["ai-engine"]="apps/services/ai-engine"
    ["analytics"]="apps/services/analytics"
    ["chatbot"]="apps/services/chatbot"
    ["fraud-detection"]="apps/services/fraud-detection"
    ["inventory"]="apps/services/inventory"
    ["media"]="apps/services/media"
    ["notification"]="apps/services/notification"
    ["personalization"]="apps/services/personalization"
    ["pricing"]="apps/services/pricing"
    ["recommendation"]="apps/services/recommendation"
    ["search"]="apps/services/search"
    ["supplier-integration"]="apps/services/supplier-integration"
)

# Shared packages that affect multiple components
SHARED_PACKAGES="packages/"

# Get list of changed files
get_changed_files() {
    if [ -n "${GITHUB_BASE_REF:-}" ]; then
        # PR context: compare against base branch
        git fetch origin "$GITHUB_BASE_REF" --depth=1 2>/dev/null || true
        git diff --name-only "origin/$GITHUB_BASE_REF"..."$COMPARE_SHA" 2>/dev/null || \
            git diff --name-only HEAD~1
    elif [ -n "${CI:-}" ]; then
        # CI context: compare against previous commit
        git diff --name-only HEAD~1 2>/dev/null || echo ""
    else
        # Local context: compare against base branch
        git diff --name-only "$BASE_BRANCH"..."$COMPARE_SHA" 2>/dev/null || \
            git diff --name-only HEAD~1 2>/dev/null || echo ""
    fi
}

# Check if shared packages changed
check_shared_packages() {
    local changed_files="$1"
    echo "$changed_files" | grep -q "^$SHARED_PACKAGES" && echo "true" || echo "false"
}

# Check if a specific component changed
check_component_changed() {
    local component_path="$1"
    local changed_files="$2"
    echo "$changed_files" | grep -q "^$component_path/" && echo "true" || echo "false"
}

# Check if Dockerfile changed
check_dockerfile_changed() {
    local component_path="$1"
    local changed_files="$2"
    echo "$changed_files" | grep -q "^$component_path/Dockerfile" && echo "true" || echo "false"
}

# Check if infrastructure changed (affects all)
check_infra_changed() {
    local changed_files="$1"
    echo "$changed_files" | grep -qE "^(infrastructure/|\.github/workflows/)" && echo "true" || echo "false"
}

# Main detection logic
main() {
    local changed_files
    changed_files=$(get_changed_files)

    if [ -z "$changed_files" ]; then
        echo '{"affected":[],"all_changed":false,"shared_changed":false}' | jq .
        exit 0
    fi

    local shared_changed
    shared_changed=$(check_shared_packages "$changed_files")

    local infra_changed
    infra_changed=$(check_infra_changed "$changed_files")

    # Build affected list
    local affected=()
    local all_changed="false"

    # If shared packages changed, all dependent components are affected
    if [ "$shared_changed" = "true" ] || [ "$infra_changed" = "true" ]; then
        all_changed="true"
    fi

    for component in "${!COMPONENTS[@]}"; do
        local component_path="${COMPONENTS[$component]}"
        local is_affected="false"

        if [ "$all_changed" = "true" ]; then
            is_affected="true"
        elif [ "$(check_component_changed "$component_path" "$changed_files")" = "true" ]; then
            is_affected="true"
        fi

        if [ "$is_affected" = "true" ]; then
            # Determine Dockerfile path
            local dockerfile="$component_path/Dockerfile"
            if [ "$component" = "api" ]; then
                dockerfile="apps/api/Dockerfile.production"
            elif [ "$component" = "web" ]; then
                dockerfile="apps/web/Dockerfile.production"
            fi

            # Determine image name
            local image_name
            if [ "$component" = "api" ] || [ "$component" = "web" ]; then
                image_name="$component"
            else
                image_name="services/$component"
            fi

            affected+=("{\"name\":\"$component\",\"path\":\"$component_path\",\"dockerfile\":\"$dockerfile\",\"image\":\"$image_name\"}")
        fi
    done

    # Build JSON output
    local affected_json
    if [ ${#affected[@]} -eq 0 ]; then
        affected_json="[]"
    else
        affected_json=$(printf '%s\n' "${affected[@]}" | jq -s '.')
    fi

    # Output result
    jq -n \
        --argjson affected "$affected_json" \
        --argjson all_changed "$all_changed" \
        --argjson shared_changed "$shared_changed" \
        '{
            affected: $affected,
            all_changed: $all_changed,
            shared_changed: $shared_changed,
            matrix: {include: $affected}
        }'
}

# Run with optional arguments
case "${1:-}" in
    --list)
        main | jq -r '.affected[].name'
        ;;
    --matrix)
        main | jq '.matrix'
        ;;
    --json)
        main
        ;;
    *)
        main
        ;;
esac
