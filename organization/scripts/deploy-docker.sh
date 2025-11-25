#!/bin/bash

# CitadelBuy E-Commerce Platform - Docker Deployment Script
# This script builds and pushes all Docker images to Docker Hub

set -e

# Configuration
DOCKER_REGISTRY="citadelplatforms"
IMAGE_NAME="citadelbuy-ecommerce"
VERSION="v2.0-phase26"

echo "========================================="
echo "CitadelBuy Docker Deployment"
echo "Registry: $DOCKER_REGISTRY"
echo "Version: $VERSION"
echo "========================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Login to Docker Hub (if not already logged in)
echo "Checking Docker Hub authentication..."
if ! docker info | grep -q "Username:"; then
    echo "Please login to Docker Hub:"
    docker login
fi

echo ""
echo "Building Backend Image..."
echo "========================================="
cd citadelbuy/backend

# Build backend image
docker build \
    -t $DOCKER_REGISTRY/$IMAGE_NAME:backend-latest \
    -t $DOCKER_REGISTRY/$IMAGE_NAME:backend-$VERSION \
    .

echo ""
echo "Backend image built successfully!"
echo ""

cd ../..

echo "Building Frontend Image..."
echo "========================================="
cd citadelbuy/frontend

# Build frontend image
docker build \
    -t $DOCKER_REGISTRY/$IMAGE_NAME:frontend-latest \
    -t $DOCKER_REGISTRY/$IMAGE_NAME:frontend-$VERSION \
    .

echo ""
echo "Frontend image built successfully!"
echo ""

cd ../..

# Push images to Docker Hub
echo "Pushing images to Docker Hub..."
echo "========================================="

echo "Pushing backend:latest..."
docker push $DOCKER_REGISTRY/$IMAGE_NAME:backend-latest

echo "Pushing backend:$VERSION..."
docker push $DOCKER_REGISTRY/$IMAGE_NAME:backend-$VERSION

echo "Pushing frontend:latest..."
docker push $DOCKER_REGISTRY/$IMAGE_NAME:frontend-latest

echo "Pushing frontend:$VERSION..."
docker push $DOCKER_REGISTRY/$IMAGE_NAME:frontend-$VERSION

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Images pushed:"
echo "  - $DOCKER_REGISTRY/$IMAGE_NAME:backend-latest"
echo "  - $DOCKER_REGISTRY/$IMAGE_NAME:backend-$VERSION"
echo "  - $DOCKER_REGISTRY/$IMAGE_NAME:frontend-latest"
echo "  - $DOCKER_REGISTRY/$IMAGE_NAME:frontend-$VERSION"
echo ""
echo "To pull these images:"
echo "  docker pull $DOCKER_REGISTRY/$IMAGE_NAME:backend-latest"
echo "  docker pull $DOCKER_REGISTRY/$IMAGE_NAME:frontend-latest"
echo ""
