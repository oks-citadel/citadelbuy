#!/bin/bash
# ==========================================
# Broxiva Platform - Docker Image Build Script
# Bash version for Linux/macOS/Git Bash
# ==========================================

set -e  # Exit on error

echo "========================================"
echo "Broxiva Platform - Docker Image Builder"
echo "========================================"
echo ""

# Define base directory
BASE_DIR="C:/Users/Dell/OneDrive/Documents/Citadelbuy/CitadelBuy/organization"
cd "$BASE_DIR"

# Azure Container Registry details
ACR_NAME="broxivaacr.azurecr.io"
VERSION="latest"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_info() {
    echo -e "${CYAN}$1${NC}"
}

print_error() {
    echo -e "${RED}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}$1${NC}"
}

# Step 1: Check Docker installation
print_info "Step 1: Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

DOCKER_VERSION=$(docker --version)
print_success "Docker is installed: $DOCKER_VERSION"

if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running. Please start Docker."
    exit 1
fi
print_success "Docker daemon is running"
echo ""

# Step 2: Build main application images
print_info "Step 2: Building main application images..."
echo ""

# Build Web Application (Next.js)
print_info "Building broxiva-web..."
if docker build -f "$BASE_DIR/apps/web/Dockerfile.production" \
    -t "broxiva-web:$VERSION" \
    -t "$ACR_NAME/broxiva-web:$VERSION" \
    --build-arg NEXT_PUBLIC_API_URL="https://api.broxiva.com" \
    --build-arg NEXT_PUBLIC_APP_NAME="Broxiva" \
    "$BASE_DIR/apps/web"; then
    print_success "broxiva-web built successfully"
else
    print_error "Failed to build broxiva-web"
fi
echo ""

# Build API Application (NestJS)
print_info "Building broxiva-api..."
if docker build -f "$BASE_DIR/apps/api/Dockerfile.production" \
    -t "broxiva-api:$VERSION" \
    -t "$ACR_NAME/broxiva-api:$VERSION" \
    "$BASE_DIR/apps/api"; then
    print_success "broxiva-api built successfully"
else
    print_error "Failed to build broxiva-api"
fi
echo ""

# Step 3: Build microservices
print_info "Step 3: Building microservices..."
echo ""

# Define all microservices
declare -A services=(
    ["ai-agents"]="8020"
    ["ai-engine"]="8010"
    ["analytics"]="8005"
    ["chatbot"]="8009"
    ["fraud-detection"]="8008"
    ["inventory"]="8004"
    ["media"]="8006"
    ["notification"]="8003"
    ["personalization"]="8002"
    ["pricing"]="8011"
    ["recommendation"]="8001"
    ["search"]="8007"
    ["supplier-integration"]="8012"
)

for service_name in "${!services[@]}"; do
    service_dir="$BASE_DIR/apps/services/$service_name"

    print_info "Building broxiva-$service_name..."

    if [ -f "$service_dir/Dockerfile" ]; then
        if docker build -f "$service_dir/Dockerfile" \
            -t "broxiva-$service_name:$VERSION" \
            -t "$ACR_NAME/broxiva-$service_name:$VERSION" \
            "$service_dir"; then
            print_success "broxiva-$service_name built successfully"
        else
            print_error "Failed to build broxiva-$service_name"
        fi
    else
        print_warning "Dockerfile not found for $service_name at $service_dir"
    fi

    echo ""
done

# Step 4: List all built images
print_info "Step 4: Listing all Broxiva images..."
echo ""

docker images | grep broxiva || print_warning "No Broxiva images found"

echo ""

# Step 5: Display summary
print_info "========================================"
print_info "Build Summary"
print_info "========================================"

IMAGE_COUNT=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep -c "broxiva" || echo "0")
print_success "Total Broxiva images built: $IMAGE_COUNT"
echo ""

print_info "Main Applications:"
echo "  - broxiva-web:$VERSION"
echo "  - broxiva-api:$VERSION"
echo ""

print_info "Microservices:"
for service_name in "${!services[@]}"; do
    echo "  - broxiva-$service_name:$VERSION"
done | sort

echo ""
print_info "========================================"
print_info "Next Steps:"
print_info "========================================"
echo "1. Login to Azure Container Registry:"
echo "   az acr login --name broxivaacr"
echo ""
echo "2. Push images to ACR:"
echo "   docker push $ACR_NAME/broxiva-web:$VERSION"
echo "   docker push $ACR_NAME/broxiva-api:$VERSION"
echo "   # ... and all microservices"
echo ""
echo "3. Or use docker-compose to push all images:"
echo "   docker-compose -f docker-compose.production.yml push"
echo ""

print_success "Build script completed!"
