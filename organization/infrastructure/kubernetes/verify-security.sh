#!/bin/bash
# Security Verification Script for CitadelBuy Kubernetes Infrastructure
# This script validates that security hardening has been properly applied

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

NAMESPACE="citadelbuy"
PASSED=0
FAILED=0
WARNINGS=0

echo "=========================================="
echo "CitadelBuy Security Verification Script"
echo "=========================================="
echo ""

# Function to print test result
print_result() {
    local test_name=$1
    local result=$2
    local message=$3

    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name: PASSED"
        ((PASSED++))
    elif [ "$result" = "FAIL" ]; then
        echo -e "${RED}✗${NC} $test_name: FAILED - $message"
        ((FAILED++))
    elif [ "$result" = "WARN" ]; then
        echo -e "${YELLOW}⚠${NC} $test_name: WARNING - $message"
        ((WARNINGS++))
    fi
}

echo "1. Checking Namespaces..."
echo "----------------------------"

# Check if namespace exists
if kubectl get namespace $NAMESPACE &> /dev/null; then
    print_result "Namespace exists" "PASS"
else
    print_result "Namespace exists" "FAIL" "Namespace $NAMESPACE not found"
fi

# Check Pod Security Standards labels
PSS_ENFORCE=$(kubectl get namespace $NAMESPACE -o jsonpath='{.metadata.labels.pod-security\.kubernetes\.io/enforce}' 2>/dev/null || echo "")
if [ "$PSS_ENFORCE" = "restricted" ]; then
    print_result "Pod Security Standards enforced" "PASS"
else
    print_result "Pod Security Standards enforced" "WARN" "PSS not set to 'restricted', found: $PSS_ENFORCE"
fi

echo ""
echo "2. Checking Network Policies..."
echo "--------------------------------"

# Check if network policies exist
NP_COUNT=$(kubectl get networkpolicies -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
if [ "$NP_COUNT" -gt 0 ]; then
    print_result "Network policies configured" "PASS" "Found $NP_COUNT policies"
else
    print_result "Network policies configured" "FAIL" "No network policies found"
fi

# Check for default deny policies
if kubectl get networkpolicy default-deny-ingress -n $NAMESPACE &> /dev/null; then
    print_result "Default deny ingress policy" "PASS"
else
    print_result "Default deny ingress policy" "FAIL" "Policy not found"
fi

if kubectl get networkpolicy default-deny-egress -n $NAMESPACE &> /dev/null; then
    print_result "Default deny egress policy" "PASS"
else
    print_result "Default deny egress policy" "FAIL" "Policy not found"
fi

echo ""
echo "3. Checking RBAC Configuration..."
echo "----------------------------------"

# Check service accounts
REQUIRED_SA=("citadelbuy-api" "citadelbuy-web" "postgres" "redis" "elasticsearch")
for sa in "${REQUIRED_SA[@]}"; do
    if kubectl get serviceaccount $sa -n $NAMESPACE &> /dev/null; then
        print_result "ServiceAccount: $sa" "PASS"
    else
        print_result "ServiceAccount: $sa" "FAIL" "Not found"
    fi
done

# Check roles
REQUIRED_ROLES=("citadelbuy-api-role" "citadelbuy-web-role" "monitoring-exporter-role")
for role in "${REQUIRED_ROLES[@]}"; do
    if kubectl get role $role -n $NAMESPACE &> /dev/null; then
        print_result "Role: $role" "PASS"
    else
        print_result "Role: $role" "FAIL" "Not found"
    fi
done

echo ""
echo "4. Checking Pod Security Contexts..."
echo "--------------------------------------"

# Check API deployment security context
API_RUN_AS_NONROOT=$(kubectl get deployment citadelbuy-api -n $NAMESPACE -o jsonpath='{.spec.template.spec.securityContext.runAsNonRoot}' 2>/dev/null || echo "false")
if [ "$API_RUN_AS_NONROOT" = "true" ]; then
    print_result "API runs as non-root" "PASS"
else
    print_result "API runs as non-root" "FAIL" "runAsNonRoot not set to true"
fi

API_PRIVILEGE_ESC=$(kubectl get deployment citadelbuy-api -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].securityContext.allowPrivilegeEscalation}' 2>/dev/null || echo "true")
if [ "$API_PRIVILEGE_ESC" = "false" ]; then
    print_result "API privilege escalation disabled" "PASS"
else
    print_result "API privilege escalation disabled" "FAIL" "allowPrivilegeEscalation not set to false"
fi

API_READONLY_FS=$(kubectl get deployment citadelbuy-api -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].securityContext.readOnlyRootFilesystem}' 2>/dev/null || echo "false")
if [ "$API_READONLY_FS" = "true" ]; then
    print_result "API read-only root filesystem" "PASS"
else
    print_result "API read-only root filesystem" "WARN" "readOnlyRootFilesystem not set to true"
fi

echo ""
echo "5. Checking Resource Limits..."
echo "-------------------------------"

# Check if deployments have resource limits
check_resources() {
    local deployment=$1
    local mem_request=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.requests.memory}' 2>/dev/null || echo "")
    local mem_limit=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.limits.memory}' 2>/dev/null || echo "")
    local cpu_request=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.requests.cpu}' 2>/dev/null || echo "")
    local cpu_limit=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.limits.cpu}' 2>/dev/null || echo "")

    if [ -n "$mem_request" ] && [ -n "$mem_limit" ] && [ -n "$cpu_request" ] && [ -n "$cpu_limit" ]; then
        print_result "$deployment has resource limits" "PASS"
    else
        print_result "$deployment has resource limits" "FAIL" "Missing resource requests/limits"
    fi
}

check_resources "citadelbuy-api"
check_resources "citadelbuy-web"

# Check StatefulSets
check_statefulset_resources() {
    local sts=$1
    local mem_limit=$(kubectl get statefulset $sts -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.limits.memory}' 2>/dev/null || echo "")
    local cpu_limit=$(kubectl get statefulset $sts -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].resources.limits.cpu}' 2>/dev/null || echo "")

    if [ -n "$mem_limit" ] && [ -n "$cpu_limit" ]; then
        print_result "$sts has resource limits" "PASS"
    else
        print_result "$sts has resource limits" "FAIL" "Missing resource limits"
    fi
}

check_statefulset_resources "postgres"
check_statefulset_resources "redis"
check_statefulset_resources "elasticsearch"

echo ""
echo "6. Checking Health Probes..."
echo "-----------------------------"

# Check if deployments have health probes
check_probes() {
    local deployment=$1
    local liveness=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].livenessProbe}' 2>/dev/null || echo "")
    local readiness=$(kubectl get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].readinessProbe}' 2>/dev/null || echo "")

    if [ -n "$liveness" ] && [ -n "$readiness" ]; then
        print_result "$deployment has health probes" "PASS"
    else
        print_result "$deployment has health probes" "FAIL" "Missing liveness or readiness probe"
    fi
}

check_probes "citadelbuy-api"
check_probes "citadelbuy-web"

echo ""
echo "7. Checking Pod Disruption Budgets..."
echo "---------------------------------------"

REQUIRED_PDB=("citadelbuy-api-pdb" "citadelbuy-web-pdb" "postgres-pdb" "redis-pdb" "elasticsearch-pdb")
for pdb in "${REQUIRED_PDB[@]}"; do
    if kubectl get pdb $pdb -n $NAMESPACE &> /dev/null; then
        print_result "PodDisruptionBudget: $pdb" "PASS"
    else
        print_result "PodDisruptionBudget: $pdb" "WARN" "Not found"
    fi
done

echo ""
echo "8. Checking External Secrets (if configured)..."
echo "------------------------------------------------"

# Check if External Secrets Operator is installed
if kubectl get crd externalsecrets.external-secrets.io &> /dev/null; then
    print_result "External Secrets Operator installed" "PASS"

    # Check for ExternalSecrets
    ES_COUNT=$(kubectl get externalsecrets -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
    if [ "$ES_COUNT" -gt 0 ]; then
        print_result "ExternalSecrets configured" "PASS" "Found $ES_COUNT ExternalSecrets"
    else
        print_result "ExternalSecrets configured" "WARN" "No ExternalSecrets found (may be using static secrets)"
    fi
else
    print_result "External Secrets Operator installed" "WARN" "Not installed (consider using for production)"
fi

echo ""
echo "9. Checking Resource Quotas..."
echo "-------------------------------"

if kubectl get resourcequota citadelbuy-quota -n $NAMESPACE &> /dev/null; then
    print_result "ResourceQuota configured" "PASS"
else
    print_result "ResourceQuota configured" "WARN" "Not found"
fi

if kubectl get limitrange citadelbuy-limitrange -n $NAMESPACE &> /dev/null; then
    print_result "LimitRange configured" "PASS"
else
    print_result "LimitRange configured" "WARN" "Not found"
fi

echo ""
echo "10. Checking Running Pods..."
echo "-----------------------------"

# Check pod status
PODS_NOT_RUNNING=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | grep -v "Running\|Completed" | wc -l)
if [ "$PODS_NOT_RUNNING" -eq 0 ]; then
    print_result "All pods running" "PASS"
else
    print_result "All pods running" "WARN" "$PODS_NOT_RUNNING pods not in Running state"
    kubectl get pods -n $NAMESPACE | grep -v "Running\|Completed" || true
fi

# Check for pods running as root
echo ""
echo "11. Checking for Pods Running as Root..."
echo "------------------------------------------"

PODS=$(kubectl get pods -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")
ROOT_PODS=0
for pod in $PODS; do
    RUN_AS_USER=$(kubectl get pod $pod -n $NAMESPACE -o jsonpath='{.spec.securityContext.runAsUser}' 2>/dev/null || echo "0")
    if [ "$RUN_AS_USER" = "0" ] || [ -z "$RUN_AS_USER" ]; then
        ((ROOT_PODS++))
    fi
done

if [ "$ROOT_PODS" -eq 0 ]; then
    print_result "No pods running as root" "PASS"
else
    print_result "No pods running as root" "WARN" "$ROOT_PODS pods may be running as root"
fi

echo ""
echo "=========================================="
echo "Security Verification Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}⚠ Security verification failed. Please review and fix the issues above.${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ Security verification passed with warnings. Consider addressing the warnings for production deployment.${NC}"
    exit 0
else
    echo -e "${GREEN}✓ Security verification passed! Your cluster meets the security requirements.${NC}"
    exit 0
fi
