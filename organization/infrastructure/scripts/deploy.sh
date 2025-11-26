#!/bin/bash
# CitadelBuy Deployment Script

set -e

ENVIRONMENT=${1:-staging}
NAMESPACE="citadelbuy"

echo "🚀 Deploying CitadelBuy to $ENVIRONMENT..."

# Apply Kubernetes manifests
kubectl apply -k ../kubernetes/overlays/$ENVIRONMENT

# Wait for deployments
echo "⏳ Waiting for deployments to be ready..."
kubectl rollout status deployment/citadelbuy-api -n $NAMESPACE
kubectl rollout status deployment/citadelbuy-web -n $NAMESPACE

echo "✅ Deployment complete!"
