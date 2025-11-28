#!/bin/bash

# CitadelBuy Platform Deployment Script
# This script deploys the application to production

set -e

echo "🚀 CitadelBuy Production Deployment"
echo "===================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
REGISTRY="citadelplatforms"
API_IMAGE="citadelbuy-ecommerce"
WEB_IMAGE="citadelbuy-ecommerce"
VERSION=${VERSION:-$(date +%Y%m%d-%H%M%S)}

# Parse arguments
DEPLOY_TARGET=""
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --docker)
            DEPLOY_TARGET="docker"
            shift
            ;;
        --kubernetes|--k8s)
            DEPLOY_TARGET="kubernetes"
            shift
            ;;
        --railway)
            DEPLOY_TARGET="railway"
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --version)
            VERSION=$2
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo ""
            echo "Usage: ./deploy.sh [--docker|--kubernetes|--railway] [--skip-build] [--version VERSION]"
            exit 1
            ;;
    esac
done

if [ -z "$DEPLOY_TARGET" ]; then
    echo "Please specify a deployment target:"
    echo "  --docker      Deploy with Docker Compose"
    echo "  --kubernetes  Deploy to Kubernetes cluster"
    echo "  --railway     Deploy to Railway"
    exit 1
fi

echo "Deployment target: $DEPLOY_TARGET"
echo "Version: $VERSION"
echo ""

# Build if not skipping
if [ "$SKIP_BUILD" = false ]; then
    echo "📦 Building production images..."
    ./scripts/build.sh --docker
fi

# Deploy based on target
case $DEPLOY_TARGET in
    docker)
        echo ""
        echo "🐳 Deploying with Docker Compose..."

        # Tag images
        docker tag citadelbuy/api:latest $REGISTRY/$API_IMAGE:backend-$VERSION
        docker tag citadelbuy/web:latest $REGISTRY/$WEB_IMAGE:frontend-$VERSION

        # Push images
        echo "Pushing images to registry..."
        docker push $REGISTRY/$API_IMAGE:backend-$VERSION
        docker push $REGISTRY/$WEB_IMAGE:frontend-$VERSION
        docker push $REGISTRY/$API_IMAGE:backend-latest
        docker push $REGISTRY/$WEB_IMAGE:frontend-latest

        # Deploy
        docker compose -f infrastructure/docker/docker-compose.prod.yml pull
        docker compose -f infrastructure/docker/docker-compose.prod.yml up -d

        echo -e "${GREEN}✓ Docker deployment complete${NC}"
        ;;

    kubernetes)
        echo ""
        echo "☸️  Deploying to Kubernetes..."

        # Check kubectl
        if ! command -v kubectl &> /dev/null; then
            echo -e "${RED}Error: kubectl not found${NC}"
            exit 1
        fi

        # Update image tags in manifests
        cd infrastructure/k8s

        # Apply configurations
        kubectl apply -f namespace.yaml
        kubectl apply -f configmap.yaml
        kubectl apply -f secrets.yaml
        kubectl apply -f deployments/
        kubectl apply -f services/
        kubectl apply -f ingress.yaml

        # Wait for rollout
        kubectl rollout status deployment/citadelbuy-api -n citadelbuy
        kubectl rollout status deployment/citadelbuy-web -n citadelbuy

        cd ../..
        echo -e "${GREEN}✓ Kubernetes deployment complete${NC}"
        ;;

    railway)
        echo ""
        echo "🚂 Deploying to Railway..."

        # Check Railway CLI
        if ! command -v railway &> /dev/null; then
            echo -e "${YELLOW}Installing Railway CLI...${NC}"
            npm install -g @railway/cli
        fi

        # Deploy API
        echo "Deploying API..."
        cd apps/api
        railway up --detach
        cd ../..

        # Deploy Web
        echo "Deploying Web..."
        cd apps/web
        railway up --detach
        cd ../..

        echo -e "${GREEN}✓ Railway deployment complete${NC}"
        ;;
esac

echo ""
echo "===================================="
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Version deployed: $VERSION"
echo ""

# Health check
echo "Running health checks..."
sleep 10

if [ "$DEPLOY_TARGET" = "docker" ]; then
    curl -sf http://localhost:4000/api/health && echo -e "${GREEN}✓ API is healthy${NC}" || echo -e "${RED}✗ API health check failed${NC}"
    curl -sf http://localhost:3000 > /dev/null && echo -e "${GREEN}✓ Web is healthy${NC}" || echo -e "${RED}✗ Web health check failed${NC}"
fi
