#!/bin/bash
# Kubernetes Production Manifests Validation Script
# This script validates the production manifests before deployment

set -e

NAMESPACE="broxiva-production"
PRODUCTION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================"
echo "Validating Production Kubernetes Manifests"
echo "============================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track errors
ERRORS=0

echo "📂 Checking required files..."
REQUIRED_FILES=(
    "namespace.yaml"
    "configmap.yaml"
    "api-deployment.yaml"
    "web-deployment.yaml"
    "worker-deployment.yaml"
    "ingress.yaml"
    "hpa.yaml"
    "kustomization.yaml"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$PRODUCTION_DIR/$file" ]; then
        echo -e "${GREEN}✓${NC} $file exists"
    else
        echo -e "${RED}✗${NC} $file is missing"
        ((ERRORS++))
    fi
done

echo ""
echo "🔍 Validating YAML syntax..."
for file in "$PRODUCTION_DIR"/*.yaml; do
    filename=$(basename "$file")
    if kubectl apply --dry-run=client -f "$file" &>/dev/null; then
        echo -e "${GREEN}✓${NC} $filename is valid"
    else
        echo -e "${RED}✗${NC} $filename has syntax errors"
        ((ERRORS++))
    fi
done

echo ""
echo "🔧 Testing Kustomize build..."
if kubectl kustomize "$PRODUCTION_DIR" > /dev/null; then
    echo -e "${GREEN}✓${NC} Kustomize build successful"

    # Count resources
    RESOURCE_COUNT=$(kubectl kustomize "$PRODUCTION_DIR" | grep -c "^kind:")
    echo "  📦 Total resources: $RESOURCE_COUNT"
else
    echo -e "${RED}✗${NC} Kustomize build failed"
    ((ERRORS++))
fi

echo ""
echo "🔐 Checking security configurations..."

# Check for non-root users
if kubectl kustomize "$PRODUCTION_DIR" | grep -q "runAsNonRoot: true"; then
    echo -e "${GREEN}✓${NC} Non-root user configured"
else
    echo -e "${YELLOW}⚠${NC} Non-root user not configured"
fi

# Check for read-only root filesystem
if kubectl kustomize "$PRODUCTION_DIR" | grep -q "readOnlyRootFilesystem: true"; then
    echo -e "${GREEN}✓${NC} Read-only root filesystem configured"
else
    echo -e "${YELLOW}⚠${NC} Read-only root filesystem not configured"
fi

# Check for seccomp profile
if kubectl kustomize "$PRODUCTION_DIR" | grep -q "seccompProfile"; then
    echo -e "${GREEN}✓${NC} Seccomp profile configured"
else
    echo -e "${YELLOW}⚠${NC} Seccomp profile not configured"
fi

echo ""
echo "⚡ Checking resource limits..."

# Check for resource requests
if kubectl kustomize "$PRODUCTION_DIR" | grep -q "requests:"; then
    echo -e "${GREEN}✓${NC} Resource requests defined"
else
    echo -e "${RED}✗${NC} Resource requests not defined"
    ((ERRORS++))
fi

# Check for resource limits
if kubectl kustomize "$PRODUCTION_DIR" | grep -q "limits:"; then
    echo -e "${GREEN}✓${NC} Resource limits defined"
else
    echo -e "${RED}✗${NC} Resource limits not defined"
    ((ERRORS++))
fi

echo ""
echo "🏥 Checking health probes..."

# Check for liveness probes
if kubectl kustomize "$PRODUCTION_DIR" | grep -q "livenessProbe:"; then
    echo -e "${GREEN}✓${NC} Liveness probes configured"
else
    echo -e "${YELLOW}⚠${NC} Liveness probes not configured"
fi

# Check for readiness probes
if kubectl kustomize "$PRODUCTION_DIR" | grep -q "readinessProbe:"; then
    echo -e "${GREEN}✓${NC} Readiness probes configured"
else
    echo -e "${YELLOW}⚠${NC} Readiness probes not configured"
fi

echo ""
echo "🔄 Checking high availability..."

# Check for anti-affinity
if kubectl kustomize "$PRODUCTION_DIR" | grep -q "podAntiAffinity"; then
    echo -e "${GREEN}✓${NC} Pod anti-affinity configured"
else
    echo -e "${YELLOW}⚠${NC} Pod anti-affinity not configured"
fi

# Check for PDB
if kubectl kustomize "$PRODUCTION_DIR" | grep -q "PodDisruptionBudget"; then
    echo -e "${GREEN}✓${NC} Pod Disruption Budget configured"
else
    echo -e "${YELLOW}⚠${NC} Pod Disruption Budget not configured"
fi

# Check for HPA
if kubectl kustomize "$PRODUCTION_DIR" | grep -q "HorizontalPodAutoscaler"; then
    echo -e "${GREEN}✓${NC} Horizontal Pod Autoscaler configured"
else
    echo -e "${YELLOW}⚠${NC} Horizontal Pod Autoscaler not configured"
fi

echo ""
echo "🌐 Checking ingress configuration..."

# Check for TLS
if kubectl kustomize "$PRODUCTION_DIR" | grep -q "tls:"; then
    echo -e "${GREEN}✓${NC} TLS configured"
else
    echo -e "${RED}✗${NC} TLS not configured"
    ((ERRORS++))
fi

# Check for cert-manager
if kubectl kustomize "$PRODUCTION_DIR" | grep -q "cert-manager.io"; then
    echo -e "${GREEN}✓${NC} Cert-manager annotations present"
else
    echo -e "${YELLOW}⚠${NC} Cert-manager annotations not found"
fi

echo ""
echo "📊 Checking monitoring setup..."

# Check for Prometheus annotations
if kubectl kustomize "$PRODUCTION_DIR" | grep -q "prometheus.io/scrape"; then
    echo -e "${GREEN}✓${NC} Prometheus scraping configured"
else
    echo -e "${YELLOW}⚠${NC} Prometheus scraping not configured"
fi

echo ""
echo "🔒 Checking for secrets..."

# Check if secrets are properly referenced
if kubectl kustomize "$PRODUCTION_DIR" | grep -q "secretKeyRef"; then
    echo -e "${GREEN}✓${NC} Secrets referenced in deployments"
else
    echo -e "${RED}✗${NC} No secrets referenced"
    ((ERRORS++))
fi

# Warn about hardcoded secrets
if kubectl kustomize "$PRODUCTION_DIR" | grep -q "password:"; then
    echo -e "${RED}✗${NC} WARNING: Possible hardcoded password found!"
    ((ERRORS++))
fi

echo ""
echo "🏷️  Checking labels and selectors..."

# Basic label check
if kubectl kustomize "$PRODUCTION_DIR" | grep -q "app:"; then
    echo -e "${GREEN}✓${NC} App labels present"
else
    echo -e "${YELLOW}⚠${NC} App labels not found"
fi

if kubectl kustomize "$PRODUCTION_DIR" | grep -q "environment: production"; then
    echo -e "${GREEN}✓${NC} Environment labels present"
else
    echo -e "${YELLOW}⚠${NC} Environment labels not found"
fi

echo ""
echo "============================================"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All validations passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review the generated manifests:"
    echo "   kubectl kustomize $PRODUCTION_DIR | less"
    echo ""
    echo "2. Ensure secrets are created:"
    echo "   kubectl get secret broxiva-secrets -n $NAMESPACE"
    echo ""
    echo "3. Deploy to production:"
    echo "   kubectl apply -k $PRODUCTION_DIR"
    echo ""
    echo "4. Watch the deployment:"
    echo "   kubectl get pods -n $NAMESPACE -w"
    exit 0
else
    echo -e "${RED}✗ Found $ERRORS error(s)${NC}"
    echo ""
    echo "Please fix the errors before deploying to production."
    exit 1
fi
