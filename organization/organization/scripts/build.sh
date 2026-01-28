#!/bin/bash

# Broxiva Platform Build Script
# This script builds all applications for production

set -e

echo "🏗️  Broxiva Production Build"
echo "================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Parse arguments
BUILD_API=true
BUILD_WEB=true
BUILD_MOBILE=false
DOCKER_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --api-only)
            BUILD_WEB=false
            BUILD_MOBILE=false
            shift
            ;;
        --web-only)
            BUILD_API=false
            BUILD_MOBILE=false
            shift
            ;;
        --mobile)
            BUILD_MOBILE=true
            shift
            ;;
        --docker)
            DOCKER_BUILD=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Build shared packages first
echo ""
echo "📚 Building shared packages..."
pnpm --filter "@broxiva/types" build
pnpm --filter "@broxiva/utils" build
pnpm --filter "@broxiva/ui" build
pnpm --filter "@broxiva/ai-sdk" build
echo -e "${GREEN}✓ Shared packages built${NC}"

# Type check
echo ""
echo "🔍 Running type checks..."
pnpm type-check
echo -e "${GREEN}✓ Type checks passed${NC}"

# Build API
if [ "$BUILD_API" = true ]; then
    echo ""
    echo "🔧 Building API..."
    cd apps/api
    pnpm build
    cd ../..
    echo -e "${GREEN}✓ API built${NC}"

    if [ "$DOCKER_BUILD" = true ]; then
        echo "🐳 Building API Docker image..."
        docker build -t broxiva/api:latest -t broxiva/api:$(date +%Y%m%d) ./apps/api
        echo -e "${GREEN}✓ API Docker image built${NC}"
    fi
fi

# Build Web
if [ "$BUILD_WEB" = true ]; then
    echo ""
    echo "🌐 Building Web app..."
    cd apps/web
    pnpm build
    cd ../..
    echo -e "${GREEN}✓ Web app built${NC}"

    if [ "$DOCKER_BUILD" = true ]; then
        echo "🐳 Building Web Docker image..."
        docker build -t broxiva/web:latest -t broxiva/web:$(date +%Y%m%d) ./apps/web
        echo -e "${GREEN}✓ Web Docker image built${NC}"
    fi
fi

# Build Mobile
if [ "$BUILD_MOBILE" = true ]; then
    echo ""
    echo "📱 Building Mobile app..."
    cd apps/mobile

    # Check for EAS CLI
    if command -v eas &> /dev/null; then
        echo "Building with EAS..."
        eas build --platform all --profile production --non-interactive
    else
        echo "Building with Expo..."
        npx expo export
    fi
    cd ../..
    echo -e "${GREEN}✓ Mobile app built${NC}"
fi

echo ""
echo "================================"
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""

if [ "$DOCKER_BUILD" = true ]; then
    echo "Docker images created:"
    docker images | grep broxiva
fi

echo ""
echo "Build artifacts:"
echo "  - API: apps/api/dist/"
echo "  - Web: apps/web/.next/"
if [ "$BUILD_MOBILE" = true ]; then
    echo "  - Mobile: apps/mobile/dist/"
fi
