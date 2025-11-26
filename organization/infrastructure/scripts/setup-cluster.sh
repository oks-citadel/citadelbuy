#!/bin/bash
# CitadelBuy AKS Cluster Setup Script

set -e

RESOURCE_GROUP=${1:-citadelbuy-rg}
CLUSTER_NAME=${2:-citadelbuy-aks}
LOCATION=${3:-eastus}

echo "🔧 Setting up Azure AKS Cluster..."

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create AKS cluster
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --node-count 3 \
  --enable-addons monitoring \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME

echo "✅ AKS Cluster setup complete!"
