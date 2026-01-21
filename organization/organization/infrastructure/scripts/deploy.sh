#!/bin/bash
# Broxiva Deployment Script

set -e

ENVIRONMENT=${1:-staging}
NAMESPACE="broxiva"

echo "🚀 Deploying Broxiva to $ENVIRONMENT..."

# Apply Kubernetes manifests
kubectl apply -k ../kubernetes/overlays/$ENVIRONMENT

# Wait for deployments
echo "⏳ Waiting for deployments to be ready..."
kubectl rollout status deployment/broxiva-api -n $NAMESPACE
kubectl rollout status deployment/broxiva-web -n $NAMESPACE

echo "✅ Deployment complete!"
