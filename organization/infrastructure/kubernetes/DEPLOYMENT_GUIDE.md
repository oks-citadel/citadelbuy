# Broxiva Kubernetes Deployment Guide

Complete guide for deploying Broxiva e-commerce platform to Kubernetes clusters.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Deployment Environments](#deployment-environments)
4. [Staging Deployment](#staging-deployment)
5. [Production Deployment](#production-deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring & Observability](#monitoring--observability)
8. [Troubleshooting](#troubleshooting)
9. [Security Considerations](#security-considerations)
10. [Disaster Recovery](#disaster-recovery)

## Prerequisites

### Required Tools

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install kustomize
curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh"  | bash

# Verify installations
kubectl version --client
helm version
kustomize version
```

### Cluster Requirements

**Minimum Specifications:**
- Kubernetes version: 1.26+
- Node count: 3+ for staging, 5+ for production
- Node types:
  - Staging: 2 vCPUs, 8GB RAM per node
  - Production: 4 vCPUs, 16GB RAM per node
- Storage: Dynamic provisioning with StorageClass support
- Ingress Controller: nginx-ingress or similar
- Cert Manager: For automated TLS certificate management

### Cloud Provider Setup

#### AWS EKS

```bash
# Install eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# Create cluster (example)
eksctl create cluster \
  --name broxiva-production \
  --version 1.28 \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.xlarge \
  --nodes 5 \
  --nodes-min 3 \
  --nodes-max 10 \
  --managed
```

#### GCP GKE

```bash
# Create cluster (example)
gcloud container clusters create broxiva-production \
  --zone us-central1-a \
  --num-nodes 5 \
  --machine-type n2-standard-4 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10 \
  --enable-autorepair \
  --enable-autoupgrade
```

#### Azure AKS

```bash
# Create cluster (example)
az aks create \
  --resource-group broxiva-rg \
  --name broxiva-production \
  --node-count 5 \
  --node-vm-size Standard_D4s_v3 \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 10 \
  --generate-ssh-keys
```

## Infrastructure Setup

### 1. Install Ingress Controller

```bash
# Add nginx-ingress Helm repository
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install nginx-ingress
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --set controller.metrics.enabled=true
```

### 2. Install Cert Manager

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Verify installation
kubectl get pods -n cert-manager
```

### 3. Install External Secrets Operator (Production)

```bash
# Add External Secrets Helm repository
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install External Secrets Operator
helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace
```

### 4. Install Prometheus & Grafana (Production)

```bash
# Add Prometheus community Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install kube-prometheus-stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false
```

## Deployment Environments

### Directory Structure

```
organization/infrastructure/kubernetes/
├── base/                    # Base configurations
│   ├── configmap.yaml
│   ├── namespace.yaml
│   ├── rbac.yaml
│   ├── network-policies.yaml
│   ├── pod-security.yaml
│   └── external-secrets.yaml
├── staging/                 # Staging environment
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── rbac.yaml
│   ├── network-policies.yaml
│   ├── pvc.yaml
│   ├── api-deployment.yaml
│   ├── web-deployment.yaml
│   ├── postgres-deployment.yaml
│   ├── redis-deployment.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   └── kustomization.yaml
└── production/              # Production environment
    ├── namespace.yaml
    ├── configmap.yaml
    ├── secrets.yaml
    ├── rbac.yaml
    ├── network-policies.yaml
    ├── pvc.yaml
    ├── api-deployment.yaml
    ├── web-deployment.yaml
    ├── worker-deployment.yaml
    ├── ingress.yaml
    ├── hpa.yaml
    ├── servicemonitor.yaml
    └── kustomization.yaml
```

## Staging Deployment

### Step 1: Configure Secrets

**IMPORTANT:** Never commit actual secrets to version control.

```bash
# Option 1: Create secrets from file
kubectl create secret generic broxiva-secrets \
  --namespace=broxiva-staging \
  --from-env-file=.env.staging \
  --dry-run=client -o yaml | kubectl apply -f -

# Option 2: Create secrets manually
kubectl create secret generic broxiva-secrets \
  --namespace=broxiva-staging \
  --from-literal=DATABASE_URL='postgresql://user:pass@postgres:5432/broxiva_staging' \
  --from-literal=JWT_SECRET='your-jwt-secret-min-32-chars' \
  --from-literal=STRIPE_SECRET_KEY='sk_test_...' \
  --from-literal=SENDGRID_API_KEY='SG....'
```

### Step 2: Deploy to Staging

```bash
# Navigate to staging directory
cd organization/infrastructure/kubernetes/staging

# Apply namespace and RBAC first
kubectl apply -f namespace.yaml
kubectl apply -f rbac.yaml

# Apply ConfigMaps
kubectl apply -f configmap.yaml

# Apply secrets (after creating them)
kubectl apply -f secrets.yaml

# Apply Network Policies
kubectl apply -f network-policies.yaml

# Apply PVCs
kubectl apply -f pvc.yaml

# Deploy databases
kubectl apply -f postgres-deployment.yaml
kubectl apply -f redis-deployment.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n broxiva-staging --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n broxiva-staging --timeout=300s

# Deploy application
kubectl apply -f api-deployment.yaml
kubectl apply -f web-deployment.yaml

# Apply Ingress
kubectl apply -f ingress.yaml

# Apply HPA
kubectl apply -f hpa.yaml
```

### Step 3: Verify Staging Deployment

```bash
# Check pod status
kubectl get pods -n broxiva-staging

# Check services
kubectl get svc -n broxiva-staging

# Check ingress
kubectl get ingress -n broxiva-staging

# View logs
kubectl logs -f deployment/broxiva-api -n broxiva-staging
kubectl logs -f deployment/broxiva-web -n broxiva-staging

# Port forward for local testing
kubectl port-forward svc/broxiva-api 4000:4000 -n broxiva-staging
kubectl port-forward svc/broxiva-web 3000:3000 -n broxiva-staging
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] All staging tests passed
- [ ] Database backups verified
- [ ] DNS records configured
- [ ] TLS certificates ready
- [ ] Monitoring alerts configured
- [ ] Runbooks updated
- [ ] On-call team notified
- [ ] Rollback plan prepared

### Step 1: Configure External Secrets (Recommended)

```bash
# Create AWS Secrets Manager secrets
aws secretsmanager create-secret \
  --name broxiva/production/database \
  --secret-string '{"password":"SECURE_PASSWORD"}'

aws secretsmanager create-secret \
  --name broxiva/production/jwt \
  --secret-string '{"secret":"SECURE_JWT_SECRET","refresh_secret":"SECURE_REFRESH_SECRET"}'

# Apply External Secrets configuration
kubectl apply -f ../base/external-secrets.yaml
```

### Step 2: Deploy to Production

```bash
# Navigate to production directory
cd organization/infrastructure/kubernetes/production

# Apply in correct order
kubectl apply -f namespace.yaml
kubectl apply -f rbac.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml  # Or use External Secrets
kubectl apply -f network-policies.yaml
kubectl apply -f pvc.yaml

# Deploy databases (or use managed services)
# For production, consider using managed databases:
# - AWS RDS for PostgreSQL
# - AWS ElastiCache for Redis
# - AWS OpenSearch for Elasticsearch

# Deploy application
kubectl apply -f api-deployment.yaml
kubectl apply -f web-deployment.yaml
kubectl apply -f worker-deployment.yaml

# Apply Ingress and HPA
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml

# Apply monitoring
kubectl apply -f servicemonitor.yaml
```

### Step 3: Canary Deployment (Optional but Recommended)

```bash
# Deploy canary with limited traffic
kubectl apply -f api-deployment-canary.yaml

# Monitor canary metrics for 15-30 minutes
# If successful, proceed with full rollout
kubectl set image deployment/broxiva-api \
  api=ghcr.io/broxivaplatforms/broxiva-api:production-latest \
  -n broxiva-production

# Monitor rollout
kubectl rollout status deployment/broxiva-api -n broxiva-production
```

### Step 4: DNS Configuration

```bash
# Get LoadBalancer IP/hostname
kubectl get ingress -n broxiva-production

# Configure DNS A/CNAME records:
# - api.broxiva.com -> LoadBalancer IP
# - broxiva.com -> LoadBalancer IP
# - www.broxiva.com -> LoadBalancer IP
```

## Post-Deployment Verification

### Health Checks

```bash
# Check all pods are running
kubectl get pods -n broxiva-production -o wide

# Check pod health
kubectl describe pod <pod-name> -n broxiva-production

# Test API health endpoint
curl https://api.broxiva.com/api/health

# Test web application
curl https://broxiva.com/api/health

# Check database connectivity
kubectl exec -it deployment/broxiva-api -n broxiva-production -- \
  node -e "require('./dist/utils/db').testConnection()"
```

### Performance Testing

```bash
# Load test with k6 or similar
k6 run --vus 100 --duration 5m load-test.js

# Monitor metrics during load test
kubectl top pods -n broxiva-production
kubectl top nodes
```

## Monitoring & Observability

### Access Grafana Dashboard

```bash
# Port forward Grafana
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring

# Login at http://localhost:3000
# Default credentials: admin/prom-operator
```

### Key Metrics to Monitor

1. **Application Metrics**
   - Request rate (requests/sec)
   - Error rate (%)
   - Response time (p50, p95, p99)
   - Active connections

2. **Infrastructure Metrics**
   - CPU usage per pod
   - Memory usage per pod
   - Disk I/O
   - Network throughput

3. **Business Metrics**
   - Orders per minute
   - Revenue tracking
   - User registrations
   - Cart abandonment rate

### Configure Alerts

```bash
# View current alerts
kubectl get prometheusrules -n broxiva-production

# Configure alert destinations (Slack, PagerDuty, etc.)
kubectl edit alertmanagerconfigs -n monitoring
```

## Troubleshooting

### Common Issues

#### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n broxiva-production

# Common causes:
# - ImagePullBackOff: Check image name and registry credentials
# - CrashLoopBackOff: Check application logs
# - Pending: Check resource availability and node selectors
```

#### Database Connection Issues

```bash
# Test database connectivity
kubectl exec -it deployment/broxiva-api -n broxiva-production -- \
  psql $DATABASE_URL -c "SELECT version();"

# Check network policies
kubectl get networkpolicies -n broxiva-production
```

#### High Memory Usage

```bash
# Identify memory-hungry pods
kubectl top pods -n broxiva-production --sort-by=memory

# Check for memory leaks in application
kubectl exec -it <pod-name> -n broxiva-production -- node --inspect

# Adjust resource limits if needed
kubectl set resources deployment/broxiva-api \
  --limits=memory=2Gi \
  -n broxiva-production
```

### Emergency Procedures

#### Rollback Deployment

```bash
# View rollout history
kubectl rollout history deployment/broxiva-api -n broxiva-production

# Rollback to previous version
kubectl rollout undo deployment/broxiva-api -n broxiva-production

# Rollback to specific revision
kubectl rollout undo deployment/broxiva-api --to-revision=3 -n broxiva-production
```

#### Scale Pods Manually

```bash
# Scale up for high traffic
kubectl scale deployment/broxiva-api --replicas=10 -n broxiva-production

# Scale down for maintenance
kubectl scale deployment/broxiva-api --replicas=3 -n broxiva-production
```

## Security Considerations

### Security Hardening Checklist

- [ ] All images scanned for vulnerabilities
- [ ] Secrets managed via External Secrets Operator
- [ ] Network policies enforced
- [ ] Pod Security Standards applied
- [ ] RBAC configured with least privilege
- [ ] TLS enabled for all ingress
- [ ] Database encryption at rest enabled
- [ ] Audit logging enabled
- [ ] Security scanning in CI/CD pipeline

### Regular Security Tasks

```bash
# Scan images for vulnerabilities
trivy image ghcr.io/broxivaplatforms/broxiva-api:latest

# Audit Kubernetes resources
kubectl-score audit deployment/broxiva-api -n broxiva-production

# Review RBAC permissions
kubectl auth can-i --list --as=system:serviceaccount:broxiva-production:broxiva-api
```

## Disaster Recovery

### Backup Procedures

```bash
# Backup PostgreSQL
kubectl exec -it postgres-0 -n broxiva-production -- \
  pg_dump -U broxiva broxiva_production > backup-$(date +%Y%m%d).sql

# Backup Kubernetes resources
kubectl get all,configmap,secret,pvc -n broxiva-production -o yaml > k8s-backup-$(date +%Y%m%d).yaml

# Create volume snapshots
kubectl apply -f - <<EOF
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-backup-$(date +%Y%m%d)
  namespace: broxiva-production
spec:
  volumeSnapshotClassName: csi-aws-vsc
  source:
    persistentVolumeClaimName: postgres-primary-pvc
EOF
```

### Restore Procedures

```bash
# Restore database from backup
kubectl exec -it postgres-0 -n broxiva-production -- \
  psql -U broxiva broxiva_production < backup-20240101.sql

# Restore from volume snapshot
kubectl apply -f restore-from-snapshot.yaml
```

## Maintenance Windows

### Planned Maintenance

1. Schedule during low-traffic periods
2. Notify users via status page
3. Enable maintenance mode
4. Perform updates
5. Verify functionality
6. Disable maintenance mode

```bash
# Enable maintenance mode
kubectl set env deployment/broxiva-web MAINTENANCE_MODE=true -n broxiva-production

# Perform updates
kubectl apply -f updated-deployment.yaml

# Disable maintenance mode
kubectl set env deployment/broxiva-web MAINTENANCE_MODE=false -n broxiva-production
```

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [Broxiva Architecture Documentation](../../../docs/architecture/)
- [Runbooks](../../../docs/runbooks/)
- [Incident Response Plan](../../../docs/incident-response.md)

## Support

For deployment assistance, contact:
- DevOps Team: devops@broxiva.com
- On-call: Use PagerDuty escalation
- Documentation: https://docs.broxiva.com
