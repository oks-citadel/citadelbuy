# Kubernetes Security Hardening Guide for CitadelBuy

This document provides a comprehensive overview of the security hardening implemented for the CitadelBuy Kubernetes infrastructure.

## Table of Contents
1. [Overview](#overview)
2. [Network Policies](#network-policies)
3. [Pod Security Standards](#pod-security-standards)
4. [Resource Limits](#resource-limits)
5. [RBAC Configuration](#rbac-configuration)
6. [External Secrets Management](#external-secrets-management)
7. [Health Checks](#health-checks)
8. [Deployment Instructions](#deployment-instructions)
9. [Security Best Practices](#security-best-practices)
10. [Troubleshooting](#troubleshooting)

## Overview

The CitadelBuy platform has been hardened following Kubernetes security best practices and industry standards including:
- **CIS Kubernetes Benchmark**
- **NIST SP 800-190** (Application Container Security Guide)
- **NSA/CISA Kubernetes Hardening Guide**
- **OWASP Kubernetes Security Cheat Sheet**

### Security Objectives
- ✅ Zero-trust network architecture with default deny policies
- ✅ Least privilege access control (RBAC)
- ✅ Secure container configurations (Pod Security Standards)
- ✅ Resource quotas and limits to prevent DoS
- ✅ Encrypted secrets management
- ✅ Comprehensive health monitoring
- ✅ Database isolation and access control

## Network Policies

**Location**: `base/network-policies.yaml`

### Default Deny Policies
All namespaces have default deny policies for both ingress and egress traffic, implementing a zero-trust network model.

```yaml
# Default deny all ingress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
spec:
  podSelector: {}
  policyTypes:
    - Ingress
```

### Allow Policies
Explicit allow policies are defined for:
- **Web → API**: Frontend can communicate with backend API
- **API → Databases**: Backend can access PostgreSQL, Redis, Elasticsearch
- **Ingress → Web**: External traffic can reach frontend
- **Exporters → Services**: Monitoring exporters can scrape metrics
- **API → External**: API can reach external services (payment gateways, email, etc.)

### Database Isolation
Databases are completely isolated from external access:
- ✅ Only accessible from API pods
- ✅ No direct internet access
- ✅ Monitoring exporters have read-only access

### Key Features
- DNS resolution allowed for all pods (required for Kubernetes DNS)
- Prometheus metrics scraping enabled
- Minimal required connectivity only

## Pod Security Standards

**Location**: `base/pod-security.yaml`

### Namespace-Level Enforcement
All namespaces enforce Pod Security Standards:
- **citadelbuy**: `restricted` profile
- **citadelbuy-ai**: `restricted` profile
- **citadelbuy-monitoring**: `baseline` profile

### Security Context Requirements

#### Application Pods (API, Web)
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 3000
  fsGroup: 2000
  seccompProfile:
    type: RuntimeDefault
```

**Container-level:**
- ✅ `allowPrivilegeEscalation: false`
- ✅ `readOnlyRootFilesystem: true`
- ✅ All capabilities dropped, only `NET_BIND_SERVICE` added
- ✅ Seccomp profile: RuntimeDefault

#### Database Pods (PostgreSQL, Redis, Elasticsearch)
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 999  # Database-specific user
  fsGroup: 999
  seccompProfile:
    type: RuntimeDefault
```

**Container-level:**
- ✅ `allowPrivilegeEscalation: false`
- ✅ Minimal capabilities: `CHOWN`, `SETGID`, `SETUID`
- ✅ Read-only filesystem where possible

### Pod Disruption Budgets
Ensures high availability during voluntary disruptions:
- **API**: Minimum 2 pods available
- **Web**: Minimum 2 pods available
- **Databases**: Minimum 1 pod available

### Resource Limits and Quotas

#### LimitRange (per container/pod)
```yaml
Container Limits:
  Max: 4 CPU, 8Gi memory
  Min: 100m CPU, 128Mi memory
  Default: 500m CPU, 512Mi memory

Pod Limits:
  Max: 8 CPU, 16Gi memory
  Min: 100m CPU, 128Mi memory
```

#### Namespace ResourceQuota
```yaml
Requests: 50 CPU, 100Gi memory
Limits: 100 CPU, 200Gi memory
PVCs: 20 maximum
LoadBalancers: 2 maximum
NodePorts: 5 maximum
```

## Resource Limits

All deployments have been updated with proper resource requests and limits:

### API Backend
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Web Frontend
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "200m"
  limits:
    memory: "512Mi"
    cpu: "400m"
```

### PostgreSQL
```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "2000m"
```

### Redis
```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "2Gi"
    cpu: "1000m"
```

### Elasticsearch
```yaml
resources:
  requests:
    memory: "2Gi"
    cpu: "1000m"
  limits:
    memory: "4Gi"
    cpu: "2000m"
```

### Monitoring Exporters
```yaml
resources:
  requests:
    memory: "64Mi"
    cpu: "50m"
  limits:
    memory: "128Mi"
    cpu: "200m"
```

## RBAC Configuration

**Location**: `base/rbac.yaml`

### Service Accounts
Dedicated service accounts for each component with minimal permissions:
- `citadelbuy-api` - API backend
- `citadelbuy-web` - Web frontend
- `postgres`, `redis`, `elasticsearch` - Database services
- `postgres-exporter`, `redis-exporter`, `elasticsearch-exporter` - Monitoring
- `external-secrets` - Secrets management
- `prometheus` - Metrics collection

### Roles and Permissions

#### API Backend Role
```yaml
Permissions:
  - Get/List/Watch: configmaps (citadelbuy-config only)
  - Get/List/Watch: secrets (citadelbuy-secrets only)
  - Get/List: pods, services
```

#### Web Frontend Role
```yaml
Permissions:
  - Get/List/Watch: configmaps (citadelbuy-config only)
  - Get/List: pods, services
```

#### Monitoring Exporters Role
```yaml
Permissions:
  - Get/List: secrets, services, endpoints
```

#### External Secrets Role
```yaml
Permissions:
  - Full access to secrets (for sync operations)
  - Get/List/Watch: secretstores, externalsecrets
  - Update status fields
```

### ClusterRoles
- `citadelbuy-metrics-reader` - For Prometheus to scrape metrics
- `citadelbuy-psp-restricted` - For application pod security policies
- `citadelbuy-psp-database` - For database pod security policies

### Service Account Token Auto-mounting
- **Disabled** for database pods (not needed)
- **Enabled** for application and monitoring pods (required for API access)

## External Secrets Management

**Location**: `base/external-secrets.yaml`

### Supported Providers
1. **AWS Secrets Manager** (recommended for EKS)
2. **HashiCorp Vault**
3. **Azure Key Vault** (recommended for AKS)
4. **Google Secret Manager** (recommended for GKE)

### Secret Types Managed
- Database credentials (PostgreSQL, Redis, Elasticsearch)
- Application secrets (JWT, API keys)
- OAuth/Social login credentials
- Payment gateway credentials (Stripe, PayPal)
- Email service credentials (SendGrid, SMTP)
- AI service API keys (OpenAI, Anthropic)

### Key Features
- ✅ Automatic secret synchronization (1-hour refresh interval)
- ✅ Secret rotation support
- ✅ Templating for derived secrets (e.g., connection strings)
- ✅ Merge strategy to combine multiple secret sources
- ✅ Workload identity support (IRSA, AAD Pod Identity)

### Setup Example (AWS)
```bash
# 1. Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  -n external-secrets-system --create-namespace

# 2. Create secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name citadelbuy/database \
  --secret-string '{"password":"YOUR_SECURE_PASSWORD"}'

# 3. Annotate service account with IAM role (IRSA)
kubectl annotate serviceaccount external-secrets \
  -n citadelbuy \
  eks.amazonaws.com/role-arn=arn:aws:iam::ACCOUNT:role/citadelbuy-secrets

# 4. Apply external secrets configuration
kubectl apply -f base/external-secrets.yaml
```

## Health Checks

All services have comprehensive health checks implemented:

### Liveness Probes
Ensure containers are restarted if unhealthy:
- **API/Web**: HTTP GET /health endpoint
- **PostgreSQL**: `pg_isready` command
- **Redis**: `redis-cli ping` command
- **Elasticsearch**: HTTP GET /_cluster/health

### Readiness Probes
Ensure traffic only routes to ready containers:
- Same endpoints as liveness probes
- Shorter initial delay (5s vs 30s)
- More frequent checks

### Startup Probes
Give slow-starting containers time to initialize:
- **API/Web**: Up to 150 seconds (30 failures × 5s)
- **PostgreSQL/Redis**: Up to 150 seconds
- **Elasticsearch**: Up to 300 seconds (30 failures × 10s)

### Configuration Example
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3

startupProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 0
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 30
```

## Deployment Instructions

### Prerequisites
1. Kubernetes cluster (1.25+ for Pod Security Standards)
2. kubectl configured with cluster access
3. External Secrets Operator installed (for secrets management)
4. Network policy support enabled in cluster

### Initial Deployment

```bash
# 1. Navigate to Kubernetes directory
cd organization/infrastructure/kubernetes

# 2. Create namespaces
kubectl apply -f base/namespace.yaml

# 3. Apply Pod Security Standards
kubectl apply -f base/pod-security.yaml

# 4. Create RBAC resources
kubectl apply -f base/rbac.yaml

# 5. Apply network policies
kubectl apply -f base/network-policies.yaml

# 6. Configure external secrets (optional but recommended)
# Edit base/external-secrets.yaml with your provider details
kubectl apply -f base/external-secrets.yaml

# 7. Create ConfigMaps
kubectl apply -f base/configmap.yaml

# 8. Deploy databases
kubectl apply -f base/postgres-deployment.yaml
kubectl apply -f base/redis-deployment.yaml
kubectl apply -f base/elasticsearch-deployment.yaml

# 9. Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n citadelbuy --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n citadelbuy --timeout=300s
kubectl wait --for=condition=ready pod -l app=elasticsearch -n citadelbuy --timeout=600s

# 10. Deploy applications
kubectl apply -f apps/api-deployment.yaml
kubectl apply -f apps/web-deployment.yaml

# 11. Verify deployments
kubectl get all -n citadelbuy
kubectl get networkpolicies -n citadelbuy
kubectl get externalsecrets -n citadelbuy
```

### Verification

```bash
# Check pod security contexts
kubectl get pods -n citadelbuy -o json | \
  jq '.items[] | {name: .metadata.name, securityContext: .spec.securityContext}'

# Verify network policies
kubectl describe networkpolicy -n citadelbuy

# Check resource limits
kubectl describe resourcequota -n citadelbuy
kubectl describe limitrange -n citadelbuy

# Verify RBAC
kubectl get serviceaccounts -n citadelbuy
kubectl get roles,rolebindings -n citadelbuy

# Check external secrets sync status
kubectl get externalsecrets -n citadelbuy
kubectl describe externalsecret citadelbuy-database-credentials -n citadelbuy

# Test health checks
kubectl get pods -n citadelbuy -w
kubectl describe pod <pod-name> -n citadelbuy | grep -A 10 Conditions
```

## Security Best Practices

### 1. Container Security
- ✅ Use minimal base images (Alpine, Distroless)
- ✅ Scan images for vulnerabilities regularly
- ✅ Use specific image tags, avoid `:latest`
- ✅ Sign images and verify signatures
- ✅ Run containers as non-root users
- ✅ Use read-only root filesystems where possible

### 2. Network Security
- ✅ Implement zero-trust networking (default deny)
- ✅ Use NetworkPolicies to control traffic flow
- ✅ Isolate sensitive workloads (databases)
- ✅ Enable encryption in transit (TLS/mTLS)
- ✅ Use service mesh for advanced traffic management

### 3. Secrets Management
- ✅ Never commit secrets to version control
- ✅ Use external secret management systems
- ✅ Rotate secrets regularly
- ✅ Use workload identity instead of static credentials
- ✅ Enable audit logging for secret access
- ✅ Encrypt secrets at rest (etcd encryption)

### 4. Access Control
- ✅ Implement least privilege RBAC
- ✅ Use dedicated service accounts per workload
- ✅ Disable service account token auto-mounting when not needed
- ✅ Enable audit logging
- ✅ Use admission controllers (OPA, Kyverno)

### 5. Monitoring and Logging
- ✅ Enable audit logging
- ✅ Monitor security events
- ✅ Set up alerts for policy violations
- ✅ Implement centralized logging
- ✅ Regular security scanning

### 6. Cluster Hardening
- ✅ Keep Kubernetes up to date
- ✅ Enable Pod Security Standards/Admission
- ✅ Use dedicated node pools for sensitive workloads
- ✅ Enable node OS security features (AppArmor, SELinux)
- ✅ Restrict API server access
- ✅ Enable etcd encryption

## Troubleshooting

### Pod Security Policy Violations
```bash
# Check pod events for PSP errors
kubectl describe pod <pod-name> -n citadelbuy

# Common issues:
# - runAsNonRoot violation: Add securityContext with runAsUser
# - Privileged container: Remove privileged: true
# - Host path volume: Use emptyDir or PVC instead
```

### Network Policy Issues
```bash
# Test connectivity between pods
kubectl run -it --rm debug --image=nicolaka/netshoot -n citadelbuy -- /bin/bash

# Inside debug pod, test connectivity:
curl http://citadelbuy-api
curl http://postgres:5432
curl http://redis:6379

# Check network policy logs (if using Calico)
kubectl logs -n kube-system -l k8s-app=calico-node
```

### RBAC Permission Denied
```bash
# Check service account permissions
kubectl auth can-i list pods --as=system:serviceaccount:citadelbuy:citadelbuy-api

# View effective permissions
kubectl describe role citadelbuy-api-role -n citadelbuy
kubectl describe rolebinding citadelbuy-api-rolebinding -n citadelbuy
```

### External Secrets Sync Issues
```bash
# Check ExternalSecret status
kubectl describe externalsecret citadelbuy-database-credentials -n citadelbuy

# View External Secrets Operator logs
kubectl logs -n external-secrets-system deployment/external-secrets

# Verify SecretStore connectivity
kubectl describe secretstore aws-secrets-manager -n citadelbuy

# Common issues:
# - Invalid credentials: Check service account annotations (IRSA)
# - Secret not found: Verify secret exists in provider
# - Permission denied: Check IAM/RBAC permissions
```

### Resource Limit Issues
```bash
# Check if pods are being OOMKilled
kubectl get pods -n citadelbuy | grep OOMKilled

# View pod resource usage
kubectl top pods -n citadelbuy

# Check resource quotas
kubectl describe resourcequota citadelbuy-quota -n citadelbuy

# Solution: Increase memory limits or optimize application
```

### Health Check Failures
```bash
# Check probe configuration
kubectl describe pod <pod-name> -n citadelbuy | grep -A 5 Liveness
kubectl describe pod <pod-name> -n citadelbuy | grep -A 5 Readiness

# View container logs
kubectl logs <pod-name> -n citadelbuy
kubectl logs <pod-name> -n citadelbuy --previous  # For crashed containers

# Common issues:
# - Timeout too short: Increase timeoutSeconds
# - Initial delay too short: Increase initialDelaySeconds
# - Application startup slow: Add/configure startup probe
```

## Additional Resources

### Official Documentation
- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/)
- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [External Secrets Operator](https://external-secrets.io/)

### Security Guides
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
- [NSA/CISA Kubernetes Hardening Guide](https://www.nsa.gov/Press-Room/News-Highlights/Article/Article/2716980/nsa-cisa-release-kubernetes-hardening-guidance/)
- [NIST SP 800-190](https://csrc.nist.gov/publications/detail/sp/800-190/final)
- [OWASP Kubernetes Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Kubernetes_Security_Cheat_Sheet.html)

### Tools
- [kubescape](https://github.com/kubescape/kubescape) - K8s security scanning
- [kube-bench](https://github.com/aquasecurity/kube-bench) - CIS benchmark testing
- [trivy](https://github.com/aquasecurity/trivy) - Container vulnerability scanning
- [OPA Gatekeeper](https://github.com/open-policy-agent/gatekeeper) - Policy enforcement
- [Falco](https://falco.org/) - Runtime security monitoring

## Compliance

This security hardening addresses requirements from:
- ✅ SOC 2 Type II
- ✅ PCI-DSS
- ✅ HIPAA (when handling healthcare data)
- ✅ GDPR (data protection)
- ✅ ISO 27001

## Support

For security issues or questions:
1. Review this documentation
2. Check the troubleshooting section
3. Review Kubernetes events and logs
4. Contact the DevOps/Security team

---

**Last Updated**: December 2025
**Version**: 1.0
**Maintained by**: CitadelBuy DevOps Team
