# CitadelBuy Kubernetes Infrastructure

Comprehensive Kubernetes deployment configuration for the CitadelBuy e-commerce platform with Helm chart support.

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Base Resources](#base-resources)
- [Services](#services)
- [Helm Chart](#helm-chart)
- [Deployment Guide](#deployment-guide)
- [Scaling](#scaling)
- [Monitoring](#monitoring)
- [Security](#security)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

This Kubernetes infrastructure provides production-ready deployment configurations with:
- **Multi-namespace support**: dev, staging, production environments
- **High availability**: Multiple replicas with pod anti-affinity
- **Auto-scaling**: Horizontal Pod Autoscaler (HPA) based on CPU and memory
- **Secure ingress**: NGINX Ingress Controller with Let's Encrypt SSL
- **Persistent storage**: Stateful data with PersistentVolumeClaims
- **Helm packaging**: Configurable deployment with Helm charts
- **Health checks**: Liveness and readiness probes
- **Resource management**: CPU and memory limits/requests

### Architecture

```
Internet
    │
    └─── Ingress (NGINX + Let's Encrypt)
             ├─── citadelbuy.com → Frontend Service
             │                         └─── Frontend Pods (2-10 replicas)
             └─── api.citadelbuy.com → Backend Service
                                           └─── Backend Pods (2-10 replicas)
                                                    ├─── PostgreSQL StatefulSet
                                                    └─── Redis StatefulSet
```

## Directory Structure

```
kubernetes/
├── base/
│   ├── namespace.yml          # Namespace definitions (dev, staging, prod)
│   ├── configmap.yml          # Application configuration
│   ├── secrets.yml            # Sensitive data (base64 encoded)
│   └── persistent-volumes.yml # Persistent Volume Claims
├── services/
│   ├── postgres-deployment.yml    # PostgreSQL StatefulSet
│   ├── redis-deployment.yml       # Redis StatefulSet
│   ├── backend-deployment.yml     # Backend Deployment + HPA
│   ├── frontend-deployment.yml    # Frontend Deployment + HPA
│   └── ingress.yml               # Ingress + ClusterIssuer
├── helm/
│   └── citadelbuy/
│       ├── Chart.yaml        # Helm chart metadata
│       ├── values.yaml       # Default configuration values
│       ├── values-dev.yaml   # Development overrides
│       ├── values-staging.yaml  # Staging overrides
│       ├── values-prod.yaml  # Production overrides
│       └── templates/        # Kubernetes resource templates
└── monitoring/
    ├── prometheus/          # Prometheus configuration
    └── grafana/            # Grafana dashboards
```

## Prerequisites

### Required Tools

1. **kubectl** >= 1.24
   ```bash
   # Install kubectl
   curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
   chmod +x kubectl
   sudo mv kubectl /usr/local/bin/

   # Verify installation
   kubectl version --client
   ```

2. **Helm** >= 3.10
   ```bash
   # Install Helm
   curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

   # Verify installation
   helm version
   ```

3. **Kubernetes Cluster**
   - Azure AKS, AWS EKS, GKE, or local Minikube
   - Kubernetes version 1.24+
   - At least 3 worker nodes for production
   - Minimum 8GB RAM per node

### Required Components

1. **NGINX Ingress Controller**
   ```bash
   helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
   helm repo update
   helm install nginx-ingress ingress-nginx/ingress-nginx \
     --namespace ingress-nginx \
     --create-namespace
   ```

2. **cert-manager** (for Let's Encrypt SSL)
   ```bash
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
   ```

3. **Metrics Server** (for HPA)
   ```bash
   kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
   ```

## Quick Start

### Method 1: Using kubectl (Raw Manifests)

**1. Create namespace:**
```bash
kubectl apply -f base/namespace.yml
```

**2. Create secrets and config:**
```bash
# Encode secrets first
echo -n "your-database-url" | base64
echo -n "your-jwt-secret" | base64

# Edit secrets.yml with your base64 values
kubectl apply -f base/secrets.yml
kubectl apply -f base/configmap.yml
```

**3. Create persistent volumes:**
```bash
kubectl apply -f base/persistent-volumes.yml
```

**4. Deploy databases:**
```bash
kubectl apply -f services/postgres-deployment.yml
kubectl apply -f services/redis-deployment.yml
```

**5. Wait for databases to be ready:**
```bash
kubectl wait --for=condition=ready pod -l app=postgres -n citadelbuy --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n citadelbuy --timeout=300s
```

**6. Deploy applications:**
```bash
kubectl apply -f services/backend-deployment.yml
kubectl apply -f services/frontend-deployment.yml
```

**7. Deploy ingress:**
```bash
kubectl apply -f services/ingress.yml
```

**8. Verify deployment:**
```bash
kubectl get all -n citadelbuy
kubectl get ingress -n citadelbuy
```

### Method 2: Using Helm (Recommended)

**1. Add Helm dependencies:**
```bash
cd helm/citadelbuy
helm dependency update
```

**2. Create namespace:**
```bash
kubectl create namespace citadelbuy
```

**3. Create secrets:**
```bash
kubectl create secret generic citadelbuy-secrets \
  --from-literal=DATABASE_URL=postgresql://user:password@postgres:5432/citadelbuy_prod \
  --from-literal=REDIS_PASSWORD=your-redis-password \
  --from-literal=JWT_SECRET=your-jwt-secret-min-32-chars \
  -n citadelbuy
```

**4. Install chart:**
```bash
# Development
helm install citadelbuy . -f values-dev.yaml -n citadelbuy

# Staging
helm install citadelbuy . -f values-staging.yaml -n citadelbuy-staging

# Production
helm install citadelbuy . -f values-prod.yaml -n citadelbuy
```

**5. Verify installation:**
```bash
helm status citadelbuy -n citadelbuy
kubectl get all -n citadelbuy
```

## Base Resources

### Namespaces

**File:** `base/namespace.yml`

Creates three namespaces for environment separation:
- `citadelbuy` - Production environment
- `citadelbuy-staging` - Staging environment
- `citadelbuy-dev` - Development environment

**Labels:**
```yaml
environment: production | staging | development
app: citadelbuy
```

### ConfigMap

**File:** `base/configmap.yml`

Non-sensitive configuration data:
```yaml
NODE_ENV: production
PORT: "4000"
REDIS_HOST: citadelbuy-redis
REDIS_PORT: "6379"
JWT_EXPIRES_IN: 7d
FRONTEND_URL: https://citadelbuy.com
BACKEND_URL: https://api.citadelbuy.com
LOG_LEVEL: info
```

**Usage:**
```bash
# View ConfigMap
kubectl describe configmap citadelbuy-config -n citadelbuy

# Update ConfigMap
kubectl edit configmap citadelbuy-config -n citadelbuy

# Trigger pod restart after ConfigMap update
kubectl rollout restart deployment/citadelbuy-backend -n citadelbuy
```

### Secrets

**File:** `base/secrets.yml`

Sensitive data (base64 encoded):
```yaml
DATABASE_URL: <base64-encoded-connection-string>
REDIS_PASSWORD: <base64-encoded-password>
JWT_SECRET: <base64-encoded-jwt-secret>
JWT_REFRESH_SECRET: <base64-encoded-refresh-secret>
STRIPE_SECRET_KEY: <base64-encoded-stripe-key>
AWS_ACCESS_KEY_ID: <base64-encoded-aws-key>
AWS_SECRET_ACCESS_KEY: <base64-encoded-aws-secret>
```

**Creating secrets:**
```bash
# Base64 encode a value
echo -n "mypassword" | base64

# Create secret from literal values
kubectl create secret generic citadelbuy-secrets \
  --from-literal=DATABASE_URL=postgresql://... \
  --from-literal=REDIS_PASSWORD=password123 \
  -n citadelbuy

# Create secret from file
kubectl create secret generic citadelbuy-secrets \
  --from-env-file=.env.production \
  -n citadelbuy
```

**Security best practices:**
- Use external secret managers (Azure Key Vault, AWS Secrets Manager, HashiCorp Vault)
- Enable encryption at rest in Kubernetes
- Rotate secrets regularly
- Use RBAC to limit secret access

### Persistent Volumes

**File:** `base/persistent-volumes.yml`

Storage for stateful data:

**1. PostgreSQL Data:**
```yaml
citadelbuy-postgres-pvc:
  size: 50Gi
  accessMode: ReadWriteOnce
  storageClass: citadelbuy-storage
```

**2. Redis Data:**
```yaml
citadelbuy-redis-pvc:
  size: 10Gi
  accessMode: ReadWriteOnce
  storageClass: citadelbuy-storage
```

**3. Application Uploads:**
```yaml
citadelbuy-uploads-pvc:
  size: 100Gi
  accessMode: ReadWriteMany  # Shared across pods
  storageClass: citadelbuy-storage
```

**Storage Classes:**
```bash
# List available storage classes
kubectl get storageclass

# Azure AKS
storageClassName: managed-premium

# AWS EKS
storageClassName: gp3

# GKE
storageClassName: standard-rwo
```

## Services

### PostgreSQL Deployment

**File:** `services/postgres-deployment.yml`

**Configuration:**
- **Type:** StatefulSet (ordered, stable pod identities)
- **Replicas:** 1 (primary)
- **Storage:** 50Gi persistent volume
- **Resources:** 500m CPU / 1Gi RAM (requests), 2 CPU / 4Gi RAM (limits)

**Features:**
- Persistent storage with PVC
- Resource limits and requests
- Liveness and readiness probes
- ConfigMap and Secret integration
- Pod anti-affinity for HA

**Service:**
```yaml
Service Type: ClusterIP
Port: 5432
Selector: app=postgres
```

**Access:**
```bash
# Connect to PostgreSQL
kubectl exec -it postgres-0 -n citadelbuy -- psql -U citadelbuy -d citadelbuy_prod

# Port forward for local access
kubectl port-forward svc/citadelbuy-postgres 5432:5432 -n citadelbuy
```

### Redis Deployment

**File:** `services/redis-deployment.yml`

**Configuration:**
- **Type:** StatefulSet
- **Replicas:** 1 (master)
- **Storage:** 10Gi persistent volume
- **Resources:** 100m CPU / 256Mi RAM (requests), 1 CPU / 2Gi RAM (limits)

**Features:**
- AOF persistence enabled
- Password authentication
- Resource management
- Health checks

**Service:**
```yaml
Service Type: ClusterIP
Port: 6379
Selector: app=redis
```

**Access:**
```bash
# Connect to Redis
kubectl exec -it redis-0 -n citadelbuy -- redis-cli -a $(kubectl get secret citadelbuy-secrets -n citadelbuy -o jsonpath='{.data.REDIS_PASSWORD}' | base64 -d)

# Port forward
kubectl port-forward svc/citadelbuy-redis 6379:6379 -n citadelbuy
```

### Backend Deployment

**File:** `services/backend-deployment.yml`

**Configuration:**
- **Type:** Deployment
- **Replicas:** 3 (minimum 2, maximum 10 with HPA)
- **Image:** citadelplatforms/citadelbuy-ecommerce:backend-stable
- **Resources:** 250m CPU / 512Mi RAM (requests), 2 CPU / 2Gi RAM (limits)

**Features:**
- Rolling updates (maxSurge: 1, maxUnavailable: 1)
- ConfigMap/Secret environment variables
- Volume mounts for uploads
- Health checks (liveness + readiness)
- Horizontal Pod Autoscaler

**HPA Configuration:**
```yaml
minReplicas: 2
maxReplicas: 10
Metrics:
  - CPU: 70%
  - Memory: 80%
```

**Service:**
```yaml
Service Type: ClusterIP
Port: 4000
Selector: component=backend
```

**Health Checks:**
```yaml
Liveness Probe:
  path: /health
  initialDelay: 60s
  period: 30s

Readiness Probe:
  path: /health
  initialDelay: 30s
  period: 10s
```

### Frontend Deployment

**File:** `services/frontend-deployment.yml`

**Configuration:**
- **Type:** Deployment
- **Replicas:** 3 (minimum 2, maximum 10 with HPA)
- **Image:** citadelplatforms/citadelbuy-ecommerce:frontend-stable
- **Resources:** 100m CPU / 256Mi RAM (requests), 1 CPU / 1Gi RAM (limits)

**Features:**
- SSR support with Next.js
- Auto-scaling based on traffic
- Resource optimization
- Health checks

**Service:**
```yaml
Service Type: ClusterIP
Port: 3000
Selector: component=frontend
```

### Ingress Configuration

**File:** `services/ingress.yml`

**Features:**
- **Controller:** NGINX Ingress
- **TLS:** Let's Encrypt SSL certificates
- **Rate Limiting:** 100 requests/second
- **CORS:** Configured origins
- **Domains:**
  - citadelbuy.com → Frontend
  - www.citadelbuy.com → Frontend
  - api.citadelbuy.com → Backend

**Annotations:**
```yaml
cert-manager.io/cluster-issuer: letsencrypt-prod
nginx.ingress.kubernetes.io/ssl-redirect: "true"
nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
nginx.ingress.kubernetes.io/proxy-body-size: "50m"
nginx.ingress.kubernetes.io/rate-limit: "100"
nginx.ingress.kubernetes.io/enable-cors: "true"
```

**ClusterIssuer:**
- ACME server: Let's Encrypt production
- Challenge: HTTP-01
- Email: admin@citadelbuy.com

**Verification:**
```bash
# Check ingress
kubectl get ingress -n citadelbuy

# Check certificate status
kubectl get certificate -n citadelbuy

# Describe certificate
kubectl describe certificate citadelbuy-tls -n citadelbuy
```

## Helm Chart

### Chart.yaml

**Metadata:**
```yaml
name: citadelbuy
version: 2.0.0
appVersion: 2.0.0
type: application
```

**Dependencies:**
- **postgresql** (Bitnami) - version 12.x.x
- **redis** (Bitnami) - version 17.x.x

**Installing dependencies:**
```bash
cd helm/citadelbuy
helm dependency update
helm dependency list
```

### values.yaml

**Key Configuration:**

**Image Configuration:**
```yaml
image:
  registry: docker.io
  repository: citadelplatforms/citadelbuy-ecommerce
  pullPolicy: Always
  backend:
    tag: backend-stable
  frontend:
    tag: frontend-stable
```

**Replica Configuration:**
```yaml
replicaCount:
  backend: 3
  frontend: 3
```

**Autoscaling:**
```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80
```

**Resources:**
```yaml
resources:
  backend:
    requests:
      cpu: 250m
      memory: 512Mi
    limits:
      cpu: 2000m
      memory: 2Gi
  frontend:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 1Gi
```

**Persistence:**
```yaml
persistence:
  enabled: true
  uploads:
    size: 100Gi
    storageClass: citadelbuy-storage
    accessMode: ReadWriteMany
```

**PostgreSQL:**
```yaml
postgresql:
  enabled: true
  auth:
    username: citadelbuy
    database: citadelbuy_prod
  primary:
    persistence:
      size: 50Gi
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: 2000m
        memory: 4Gi
```

**Redis:**
```yaml
redis:
  enabled: true
  auth:
    enabled: true
  master:
    persistence:
      size: 10Gi
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 1000m
        memory: 2Gi
```

### Environment-Specific Values

**Development (values-dev.yaml):**
```yaml
global:
  environment: development
  domain: dev.citadelbuy.local

replicaCount:
  backend: 1
  frontend: 1

autoscaling:
  enabled: false

resources:
  backend:
    requests:
      cpu: 100m
      memory: 256Mi
```

**Staging (values-staging.yaml):**
```yaml
global:
  environment: staging
  domain: staging.citadelbuy.com

replicaCount:
  backend: 2
  frontend: 2

autoscaling:
  minReplicas: 2
  maxReplicas: 5
```

**Production (values-prod.yaml):**
```yaml
global:
  environment: production
  domain: citadelbuy.com

replicaCount:
  backend: 3
  frontend: 3

autoscaling:
  minReplicas: 2
  maxReplicas: 10

affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          topologyKey: kubernetes.io/hostname
```

## Deployment Guide

### Initial Deployment

**1. Prepare cluster:**
```bash
# Set context
kubectl config use-context your-cluster-context

# Verify cluster
kubectl cluster-info
kubectl get nodes
```

**2. Install prerequisites:**
```bash
# NGINX Ingress
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Metrics Server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

**3. Create namespace:**
```bash
kubectl create namespace citadelbuy
```

**4. Create secrets:**
```bash
kubectl create secret generic citadelbuy-secrets \
  --from-literal=DATABASE_URL="postgresql://citadelbuy:password@citadelbuy-postgresql:5432/citadelbuy_prod" \
  --from-literal=REDIS_PASSWORD="your-redis-password" \
  --from-literal=JWT_SECRET="your-jwt-secret-min-32-characters" \
  --from-literal=JWT_REFRESH_SECRET="your-refresh-secret-min-32-characters" \
  --from-literal=STRIPE_SECRET_KEY="sk_live_..." \
  --from-literal=AWS_ACCESS_KEY_ID="your-aws-key" \
  --from-literal=AWS_SECRET_ACCESS_KEY="your-aws-secret" \
  -n citadelbuy
```

**5. Deploy using Helm:**
```bash
cd helm/citadelbuy
helm dependency update
helm install citadelbuy . -f values-prod.yaml -n citadelbuy
```

**6. Verify deployment:**
```bash
# Check all resources
kubectl get all -n citadelbuy

# Check pods
kubectl get pods -n citadelbuy -w

# Check services
kubectl get svc -n citadelbuy

# Check ingress
kubectl get ingress -n citadelbuy

# Check HPA
kubectl get hpa -n citadelbuy
```

**7. Wait for pods to be ready:**
```bash
kubectl wait --for=condition=ready pod --all -n citadelbuy --timeout=600s
```

**8. Run database migrations:**
```bash
# Get backend pod name
BACKEND_POD=$(kubectl get pods -n citadelbuy -l component=backend -o jsonpath='{.items[0].metadata.name}')

# Run migrations
kubectl exec -it $BACKEND_POD -n citadelbuy -- npm run migrate:deploy

# Generate Prisma client
kubectl exec -it $BACKEND_POD -n citadelbuy -- npx prisma generate
```

**9. Configure DNS:**
```bash
# Get ingress external IP
kubectl get ingress citadelbuy-ingress -n citadelbuy

# Add DNS A records:
# citadelbuy.com → EXTERNAL-IP
# www.citadelbuy.com → EXTERNAL-IP
# api.citadelbuy.com → EXTERNAL-IP
```

**10. Verify SSL certificates:**
```bash
# Check certificate
kubectl get certificate -n citadelbuy

# Wait for certificate to be ready
kubectl wait --for=condition=ready certificate/citadelbuy-tls -n citadelbuy --timeout=300s

# Test HTTPS
curl -I https://citadelbuy.com
curl -I https://api.citadelbuy.com
```

### Updating Deployment

**Update image tag:**
```bash
# Using Helm
helm upgrade citadelbuy . \
  --set image.backend.tag=backend-v2.1.0 \
  --set image.frontend.tag=frontend-v2.1.0 \
  -n citadelbuy

# Using kubectl
kubectl set image deployment/citadelbuy-backend \
  backend=citadelplatforms/citadelbuy-ecommerce:backend-v2.1.0 \
  -n citadelbuy
```

**Update configuration:**
```bash
# Update values file and upgrade
helm upgrade citadelbuy . -f values-prod.yaml -n citadelbuy

# Force recreation
helm upgrade citadelbuy . -f values-prod.yaml -n citadelbuy --force
```

**Rolling update:**
```bash
# Restart deployment
kubectl rollout restart deployment/citadelbuy-backend -n citadelbuy

# Check rollout status
kubectl rollout status deployment/citadelbuy-backend -n citadelbuy

# Rollback if needed
kubectl rollout undo deployment/citadelbuy-backend -n citadelbuy
```

### Uninstalling

**Using Helm:**
```bash
helm uninstall citadelbuy -n citadelbuy
```

**Using kubectl:**
```bash
kubectl delete -f services/ -n citadelbuy
kubectl delete -f base/ -n citadelbuy
kubectl delete namespace citadelbuy
```

## Scaling

### Manual Scaling

**Scale deployment:**
```bash
# Backend
kubectl scale deployment citadelbuy-backend --replicas=5 -n citadelbuy

# Frontend
kubectl scale deployment citadelbuy-frontend --replicas=5 -n citadelbuy

# Verify scaling
kubectl get deployment -n citadelbuy
```

### Horizontal Pod Autoscaler (HPA)

**View HPA status:**
```bash
kubectl get hpa -n citadelbuy
kubectl describe hpa citadelbuy-backend-hpa -n citadelbuy
```

**Configuration:**
```yaml
minReplicas: 2
maxReplicas: 10
Metrics:
  CPU: 70%
  Memory: 80%
```

**Behavior:**
- Scales up when CPU or memory exceeds thresholds
- Scales down when usage decreases
- 5-minute stabilization window

**Test autoscaling:**
```bash
# Generate load
kubectl run -it --rm load-generator \
  --image=busybox \
  --restart=Never \
  -- /bin/sh -c "while sleep 0.01; do wget -q -O- http://citadelbuy-backend:4000; done"

# Watch HPA
kubectl get hpa -n citadelbuy --watch
```

### Cluster Auto scaling

**Azure AKS:**
```bash
az aks update \
  --resource-group citadelbuy-prod-rg \
  --name citadelbuy-prod-aks \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 10
```

**AWS EKS:**
```bash
eksctl scale nodegroup \
  --cluster=citadelbuy-prod \
  --name=ng-1 \
  --nodes=5 \
  --nodes-min=3 \
  --nodes-max=10
```

## Monitoring

### Pod Monitoring

**View logs:**
```bash
# All pods
kubectl logs -f -l app=citadelbuy -n citadelbuy

# Specific pod
kubectl logs -f citadelbuy-backend-xxxxx -n citadelbuy

# Previous pod instance
kubectl logs -p citadelbuy-backend-xxxxx -n citadelbuy

# Multiple containers in pod
kubectl logs -f citadelbuy-backend-xxxxx -c backend -n citadelbuy
```

**Resource usage:**
```bash
# Top pods
kubectl top pods -n citadelbuy

# Top nodes
kubectl top nodes

# Detailed pod metrics
kubectl describe pod citadelbuy-backend-xxxxx -n citadelbuy
```

### Events

```bash
# All events
kubectl get events -n citadelbuy --sort-by='.lastTimestamp'

# Watch events
kubectl get events -n citadelbuy --watch

# Filter by type
kubectl get events -n citadelbuy --field-selector type=Warning
```

### Health Checks

```bash
# Check pod readiness
kubectl get pods -n citadelbuy

# Test health endpoint
kubectl exec -it citadelbuy-backend-xxxxx -n citadelbuy -- curl localhost:4000/health

# Check liveness probe
kubectl describe pod citadelbuy-backend-xxxxx -n citadelbuy | grep -A5 Liveness
```

### Prometheus & Grafana

**Install Prometheus Stack:**
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

**Access Grafana:**
```bash
# Port forward
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring

# Get admin password
kubectl get secret prometheus-grafana -n monitoring -o jsonpath="{.data.admin-password}" | base64 -d
```

**ServiceMonitor:**
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: citadelbuy-backend
  namespace: citadelbuy
spec:
  selector:
    matchLabels:
      component: backend
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

## Security

### RBAC Configuration

**ServiceAccount:**
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: citadelbuy-sa
  namespace: citadelbuy
```

**Role:**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: citadelbuy-role
  namespace: citadelbuy
rules:
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list"]
```

**RoleBinding:**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: citadelbuy-rolebinding
  namespace: citadelbuy
subjects:
  - kind: ServiceAccount
    name: citadelbuy-sa
roleRef:
  kind: Role
  name: citadelbuy-role
  apiGroup: rbac.authorization.k8s.io
```

### Pod Security

**Security Context:**
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 2000
  capabilities:
    drop:
      - ALL
  readOnlyRootFilesystem: false
```

**Network Policies:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: citadelbuy-network-policy
  namespace: citadelbuy
spec:
  podSelector:
    matchLabels:
      app: citadelbuy
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: citadelbuy
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: citadelbuy
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 53  # DNS
```

### Secret Management

**Using External Secrets Operator:**
```bash
# Install
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace
```

**Azure Key Vault Integration:**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: azure-backend
  namespace: citadelbuy
spec:
  provider:
    azurekv:
      authType: ManagedIdentity
      vaultUrl: https://citadelbuy-kv.vault.azure.net
```

## Backup & Recovery

### Database Backup

**CronJob for automated backups:**
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: citadelbuy
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: postgres:16-alpine
              command:
                - /bin/sh
                - -c
                - |
                  pg_dump -h citadelbuy-postgresql -U citadelbuy citadelbuy_prod | \
                  gzip > /backup/backup-$(date +%Y%m%d-%H%M%S).sql.gz
              volumeMounts:
                - name: backup-volume
                  mountPath: /backup
          volumes:
            - name: backup-volume
              persistentVolumeClaim:
                claimName: postgres-backup-pvc
          restartPolicy: OnFailure
```

**Manual backup:**
```bash
# Backup
kubectl exec -it postgres-0 -n citadelbuy -- \
  pg_dump -U citadelbuy citadelbuy_prod > backup.sql

# Restore
kubectl exec -i postgres-0 -n citadelbuy -- \
  psql -U citadelbuy citadelbuy_prod < backup.sql
```

### Disaster Recovery

**Velero for cluster backup:**
```bash
# Install Velero
velero install \
  --provider azure \
  --plugins velero/velero-plugin-for-microsoft-azure:v1.8.0 \
  --bucket citadelbuy-backups \
  --secret-file ./credentials-velero

# Backup namespace
velero backup create citadelbuy-backup --include-namespaces citadelbuy

# Restore
velero restore create --from-backup citadelbuy-backup
```

## Troubleshooting

### Common Issues

**1. Pods not starting:**
```bash
# Check pod status
kubectl get pods -n citadelbuy

# Describe pod
kubectl describe pod citadelbuy-backend-xxxxx -n citadelbuy

# Check logs
kubectl logs citadelbuy-backend-xxxxx -n citadelbuy

# Check events
kubectl get events -n citadelbuy --sort-by='.lastTimestamp'
```

**2. ImagePullBackOff:**
```bash
# Check image pull secrets
kubectl get pods citadelbuy-backend-xxxxx -n citadelbuy -o yaml | grep imagePullSecrets

# Create image pull secret
kubectl create secret docker-registry regcred \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=username \
  --docker-password=password \
  -n citadelbuy
```

**3. CrashLoopBackOff:**
```bash
# Check logs of crashed container
kubectl logs --previous citadelbuy-backend-xxxxx -n citadelbuy

# Check resource limits
kubectl describe pod citadelbuy-backend-xxxxx -n citadelbuy | grep -A5 Limits

# Increase resources if needed
kubectl set resources deployment citadelbuy-backend \
  --limits=cpu=2,memory=2Gi \
  --requests=cpu=500m,memory=512Mi \
  -n citadelbuy
```

**4. Pending pods:**
```bash
# Check pod events
kubectl describe pod citadelbuy-backend-xxxxx -n citadelbuy

# Check node resources
kubectl top nodes

# Check PVC status
kubectl get pvc -n citadelbuy
```

**5. Ingress not working:**
```bash
# Check ingress
kubectl describe ingress citadelbuy-ingress -n citadelbuy

# Check ingress controller
kubectl get pods -n ingress-nginx

# Check certificate
kubectl get certificate -n citadelbuy
kubectl describe certificate citadelbuy-tls -n citadelbuy

# Test from inside cluster
kubectl run test-pod --image=curlimages/curl --rm -it -- \
  curl http://citadelbuy-backend:4000/health
```

**6. Database connection issues:**
```bash
# Check database pod
kubectl get pods -l app=postgres -n citadelbuy

# Test connection
kubectl exec -it citadelbuy-backend-xxxxx -n citadelbuy -- \
  psql $DATABASE_URL -c "SELECT 1"

# Check service
kubectl get svc citadelbuy-postgresql -n citadelbuy

# Check endpoints
kubectl get endpoints citadelbuy-postgresql -n citadelbuy
```

**7. HPA not scaling:**
```bash
# Check metrics server
kubectl get deployment metrics-server -n kube-system

# Check HPA status
kubectl describe hpa citadelbuy-backend-hpa -n citadelbuy

# Check pod metrics
kubectl top pods -n citadelbuy

# Test HPA
kubectl run -it load-generator --image=busybox --restart=Never -- \
  /bin/sh -c "while true; do wget -q -O- http://citadelbuy-backend:4000; done"
```

### Debugging Commands

```bash
# Shell into pod
kubectl exec -it citadelbuy-backend-xxxxx -n citadelbuy -- /bin/sh

# Copy files from pod
kubectl cp citadelbuy/citadelbuy-backend-xxxxx:/app/logs ./logs

# Port forward
kubectl port-forward svc/citadelbuy-backend 4000:4000 -n citadelbuy

# Run debug pod
kubectl run debug --image=busybox --rm -it --restart=Never -n citadelbuy

# Check DNS resolution
kubectl run -it dns-test --image=busybox --rm --restart=Never -n citadelbuy -- \
  nslookup citadelbuy-backend

# Network debugging
kubectl run -it netshoot --image=nicolaka/netshoot --rm --restart=Never -n citadelbuy
```

## Best Practices

### Resource Management

1. **Always set resource requests and limits:**
   ```yaml
   resources:
     requests:
       cpu: 250m
       memory: 512Mi
     limits:
       cpu: 2000m
       memory: 2Gi
   ```

2. **Use Quality of Service (QoS) classes:**
   - **Guaranteed:** requests = limits
   - **Burstable:** requests < limits
   - **BestEffort:** no requests/limits (avoid in production)

3. **Monitor resource usage:**
   ```bash
   kubectl top pods -n citadelbuy
   kubectl describe node
   ```

### High Availability

1. **Use multiple replicas:**
   ```yaml
   replicas: 3  # Minimum for HA
   ```

2. **Configure pod anti-affinity:**
   ```yaml
   affinity:
     podAntiAffinity:
       preferredDuringSchedulingIgnoredDuringExecution:
         - weight: 100
           podAffinityTerm:
             topologyKey: kubernetes.io/hostname
   ```

3. **Set PodDisruptionBudget:**
   ```yaml
   apiVersion: policy/v1
   kind: PodDisruptionBudget
   metadata:
     name: citadelbuy-backend-pdb
   spec:
     minAvailable: 2
     selector:
       matchLabels:
         component: backend
   ```

### Deployment Strategy

1. **Use rolling updates:**
   ```yaml
   strategy:
     type: RollingUpdate
     rollingUpdate:
       maxSurge: 1
       maxUnavailable: 1
   ```

2. **Health checks are mandatory:**
   ```yaml
   livenessProbe:
     httpGet:
       path: /health
       port: 4000
     initialDelaySeconds: 60
     periodSeconds: 30

   readinessProbe:
     httpGet:
       path: /health
       port: 4000
     initialDelaySeconds: 30
     periodSeconds: 10
   ```

3. **Use image tags, not `latest`:**
   ```yaml
   image: citadelplatforms/citadelbuy-ecommerce:backend-v2.0.0
   ```

### Security

1. **Use namespaces for isolation**
2. **Implement RBAC**
3. **Use secrets for sensitive data**
4. **Run as non-root user**
5. **Enable network policies**
6. **Regular security scanning:**
   ```bash
   kubectl kube-bench
   ```

### Monitoring

1. **Centralized logging (ELK, Fluentd)**
2. **Metrics collection (Prometheus)**
3. **Alerting (Grafana, AlertManager)**
4. **Distributed tracing (Jaeger, Zipkin)**

### Cost Optimization

1. **Right-size resources**
2. **Use HPA for auto-scaling**
3. **Use cluster autoscaler**
4. **Delete unused resources**
5. **Use spot instances for non-critical workloads**

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [Prometheus Operator](https://prometheus-operator.dev/)

## Support

For issues or questions:
- Check logs: `kubectl logs -f pod-name -n citadelbuy`
- Review events: `kubectl get events -n citadelbuy`
- GitHub issues: https://github.com/oks-citadel/citadelbuy/issues
- Contact: dev@citadelbuy.com

## License

Copyright (c) 2024 CitadelBuy. All rights reserved.
