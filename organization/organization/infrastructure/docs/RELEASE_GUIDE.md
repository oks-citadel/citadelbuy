# Broxiva Release Guide

## Table of Contents
- [Environment Matrix](#environment-matrix)
- [Release Flow](#release-flow)
- [Pipeline Readiness Checklist](#pipeline-readiness-checklist)
- [Rollback Procedures](#rollback-procedures)
- [DNS Configuration](#dns-configuration)
- [Secrets Management](#secrets-management)
- [Best Practices](#best-practices)

---

## Environment Matrix

### Overview
Broxiva maintains three distinct Kubernetes environments for controlled, progressive deployments:

| Environment | Namespace | AKS Cluster | Branch | Domain | Purpose |
|------------|-----------|-------------|--------|--------|---------|
| **Development** | `broxiva-development` | `broxiva-dev-aks` | `develop` | `dev.broxiva.com` | Feature development & testing |
| **Staging** | `broxiva-staging` | `broxiva-staging-aks` | `staging` | `staging.broxiva.com` | Pre-production validation |
| **Production** | `broxiva-production` | `broxiva-prod-aks` | `main` | `broxiva.com` | Live customer-facing environment |

### Environment Details

#### Development Environment
```yaml
Cluster: broxiva-dev-aks
Resource Group: broxiva-dev-rg
Location: East US
Node Count: 2-4 (auto-scaling)
Node Size: Standard_D2s_v3
Registry: ghcr.io/broxiva

Domains:
  - API: https://api-dev.broxiva.com
  - Web: https://dev.broxiva.com
  - Admin: https://admin-dev.broxiva.com

Resources:
  API Pods: 1 replica
  Web Pods: 1 replica
  Workers: 1 replica each

Resource Limits:
  API: 512Mi RAM, 500m CPU
  Web: 256Mi RAM, 250m CPU

Features:
  - Debug mode enabled
  - Detailed logging
  - Mock payment gateways
  - Local email (MailHog)
  - Rate limiting disabled
```

#### Staging Environment
```yaml
Cluster: broxiva-staging-aks
Resource Group: broxiva-staging-rg
Location: East US
Node Count: 3-6 (auto-scaling)
Node Size: Standard_D4s_v3
Registry: ghcr.io/broxiva

Domains:
  - API: https://api-staging.broxiva.com
  - Web: https://staging.broxiva.com
  - Admin: https://admin-staging.broxiva.com

Resources:
  API Pods: 2 replicas
  Web Pods: 2 replicas
  Workers: 1-2 replicas each

Resource Limits:
  API: 1Gi RAM, 1000m CPU
  Web: 768Mi RAM, 500m CPU

Features:
  - Production-like configuration
  - Test payment gateways (sandbox mode)
  - Real email (SendGrid test)
  - Rate limiting enabled
  - Full monitoring & tracing
```

#### Production Environment
```yaml
Cluster: broxiva-prod-aks
Resource Group: broxiva-prod-rg
Location: East US (Multi-region ready)
Node Count: 5-15 (auto-scaling)
Node Size: Standard_D8s_v3
Registry: ghcr.io/broxiva

Domains:
  - API: https://api.broxiva.com
  - Web: https://broxiva.com
  - Admin: https://admin.broxiva.com
  - CDN: https://cdn.broxiva.com

Resources:
  API Pods: 5 replicas (HPA: 3-10)
  Web Pods: 5 replicas (HPA: 3-10)
  Workers: 2-5 replicas each (HPA enabled)

Resource Limits:
  API: 2Gi RAM, 2000m CPU
  Web: 1536Mi RAM, 1000m CPU

Features:
  - Live payment processing
  - Multi-region CDN
  - Full security hardening
  - Advanced rate limiting
  - Comprehensive monitoring
  - Blue-Green deployment
  - Auto-scaling enabled
```

---

## Release Flow

### Development Release (Continuous)
```bash
# Triggered on push to develop branch
1. Developer pushes to develop branch
2. CI runs tests and builds
3. Docker images tagged as dev-{git-sha}
4. Auto-deploy to Development environment
5. Smoke tests execute
6. Slack notification sent
```

**Workflow File:** `.github/workflows/cd-dev.yml`

**Trigger:**
- Push to `develop` branch
- Manual workflow dispatch

**Steps:**
1. Build and test code
2. Run Prisma migrations
3. Deploy to `broxiva-development` namespace
4. Execute health checks
5. Run smoke tests
6. Notify team

**Expected Duration:** 8-12 minutes

### Staging Release (Daily/On-Demand)
```bash
# Triggered on push to staging branch or manual promotion
1. Merge develop -> staging (or manual trigger)
2. CI runs full test suite
3. Docker images tagged as staging-{version}
4. Manual approval required
5. Deploy to Staging environment
6. Database migrations executed
7. Integration tests run
8. Load testing (optional)
9. QA validation
10. Slack notification sent
```

**Workflow File:** `.github/workflows/cd-staging.yml`

**Trigger:**
- Push to `staging` branch
- Manual workflow dispatch with image tag

**Steps:**
1. Pre-deployment validation
2. Manual approval checkpoint
3. Run database migrations
4. Deploy to `broxiva-staging` namespace
5. Health checks
6. Smoke tests
7. Integration tests
8. Notify team

**Expected Duration:** 15-20 minutes

### Production Release (Weekly/On-Demand)
```bash
# Blue-Green deployment strategy
1. Create release candidate from staging
2. Tag version (e.g., v2.1.0)
3. Manual approval required (2 approvers)
4. Deploy to Green environment
5. Run smoke tests on Green
6. Run integration tests on Green
7. Performance validation
8. Manual traffic switch approval
9. Switch traffic from Blue to Green
10. Monitor for 10 minutes
11. Scale down Blue environment
12. Slack notification sent
```

**Workflow File:** `.github/workflows/cd-prod.yml`

**Trigger:**
- Push to `main` branch
- Manual workflow dispatch with image tag from staging

**Steps:**
1. Pre-deployment validation
2. Verify image from staging
3. Security scanning
4. Production approval (required)
5. Deploy to Green environment
6. Run database migrations
7. Execute comprehensive tests
8. Traffic switch approval
9. Switch traffic to Green
10. Monitor for errors
11. Cleanup Blue environment

**Expected Duration:** 30-45 minutes

**Deployment Strategy:** Blue-Green or Rolling Update

---

## Pipeline Readiness Checklist

### Pre-Release Checklist

#### Development Environment
- [ ] All unit tests passing
- [ ] Code review completed
- [ ] No critical SonarQube issues
- [ ] Dependencies up to date
- [ ] Environment variables configured
- [ ] Database migrations tested locally

#### Staging Environment
- [ ] All integration tests passing
- [ ] Load tests completed successfully
- [ ] Security scans passed (SAST, DAST)
- [ ] Database backup verified
- [ ] Rollback plan documented
- [ ] Staging approval obtained
- [ ] Feature flags configured
- [ ] Third-party integrations tested

#### Production Environment
- [ ] Staging deployment successful (72h+ uptime)
- [ ] All tests passing in staging
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Database migration plan reviewed
- [ ] Rollback procedure tested in staging
- [ ] Production approval obtained (2+ approvers)
- [ ] Change request ticket created
- [ ] Customer support team notified
- [ ] Monitoring dashboards ready
- [ ] On-call engineer identified
- [ ] Maintenance window scheduled (if needed)
- [ ] Blue-Green deployment verified
- [ ] Traffic routing rules configured

### Required Secrets

All environments require the following secrets configured in GitHub:

```bash
# Azure Authentication
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID

# Database Credentials
DEV_DATABASE_URL
STAGING_DATABASE_URL
PROD_DATABASE_URL

# API Keys
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
SENDGRID_API_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN

# Session & Security
SESSION_SECRET
JWT_SECRET
ENCRYPTION_KEY

# Monitoring
SLACK_WEBHOOK_URL
DATADOG_API_KEY (optional)
SENTRY_DSN

# Test Users
STAGING_TEST_USER_EMAIL
STAGING_TEST_USER_PASSWORD
```

### Infrastructure Requirements

#### Kubernetes Clusters
- [ ] AKS clusters provisioned for all environments
- [ ] Node pools configured with auto-scaling
- [ ] Network policies applied
- [ ] RBAC configured
- [ ] Ingress controllers installed
- [ ] Cert-manager configured for TLS
- [ ] External DNS configured

#### Monitoring & Observability
- [ ] Prometheus installed
- [ ] Grafana dashboards configured
- [ ] Alert rules defined
- [ ] Log aggregation (ELK/Loki) configured
- [ ] APM tracing enabled
- [ ] Uptime monitors configured

#### Security
- [ ] Pod security policies enabled
- [ ] Network policies enforced
- [ ] Secrets encryption at rest
- [ ] External Secrets Operator configured
- [ ] Image scanning enabled
- [ ] Vulnerability scanning scheduled

---

## Rollback Procedures

### Automatic Rollback

The CI/CD pipelines include automatic rollback on failure:

**Development:**
```bash
# Automatic on deployment failure
kubectl rollout undo deployment/broxiva-api -n broxiva-development
kubectl rollout undo deployment/broxiva-web -n broxiva-development
```

**Staging:**
```bash
# Automatic on health check failure
kubectl rollout undo deployment/broxiva-api -n broxiva-staging
kubectl rollout undo deployment/broxiva-web -n broxiva-staging
```

### Manual Rollback - Production

#### Using Rollback Script
```bash
# Recommended approach
./infrastructure/scripts/rollback-release.sh production

# With specific deployment
./infrastructure/scripts/rollback-release.sh production previous

# To specific version
./infrastructure/scripts/rollback-release.sh production v2.0.5
```

#### Blue-Green Rollback
```bash
# Switch traffic back to Blue environment
kubectl patch service broxiva-api -n broxiva-production \
  -p '{"spec":{"selector":{"color":"blue"}}}'

kubectl patch service broxiva-web -n broxiva-production \
  -p '{"spec":{"selector":{"color":"blue"}}}'

# Verify traffic routing
kubectl get service broxiva-api -n broxiva-production \
  -o jsonpath='{.spec.selector.color}'
```

#### Rollback to Previous Deployment
```bash
# Using kubectl
kubectl rollout undo deployment/broxiva-api -n broxiva-production
kubectl rollout undo deployment/broxiva-web -n broxiva-production

# To specific revision
kubectl rollout undo deployment/broxiva-api \
  -n broxiva-production --to-revision=3

# Check rollout status
kubectl rollout status deployment/broxiva-api -n broxiva-production
```

#### Database Rollback
```bash
# Restore from backup
cd apps/api

# List available migrations
npx prisma migrate status

# Rollback specific migration
npx prisma migrate resolve --rolled-back "20240101000000_migration_name"

# Restore from backup (if needed)
# Contact DBA team for database restoration
```

### Rollback Verification

After rollback, verify:

1. **Application Health**
```bash
# Check pod status
kubectl get pods -n broxiva-production

# Check logs
kubectl logs -n broxiva-production deployment/broxiva-api --tail=100

# Test health endpoints
curl https://api.broxiva.com/api/health/live
curl https://api.broxiva.com/api/health/ready
```

2. **Traffic Routing**
```bash
# Verify service selectors
kubectl describe service broxiva-api -n broxiva-production
kubectl describe service broxiva-web -n broxiva-production
```

3. **Monitoring**
- Check Grafana dashboards for errors
- Verify error rates in APM
- Monitor customer support tickets

### Post-Rollback Actions

1. Create incident report
2. Notify stakeholders
3. Schedule postmortem meeting
4. Update rollback documentation
5. Create tickets for fixes

---

## DNS Configuration

### DNS Records

All DNS records should be configured in your DNS provider (e.g., Cloudflare, Route53):

#### Development
```
Type  | Name                 | Value                          | TTL
------|---------------------|--------------------------------|-----
A     | dev.broxiva.com     | <ingress-ip-dev>              | 300
A     | api-dev.broxiva.com | <ingress-ip-dev>              | 300
A     | *.dev.broxiva.com   | <ingress-ip-dev>              | 300
```

#### Staging
```
Type  | Name                     | Value                          | TTL
------|-------------------------|--------------------------------|-----
A     | staging.broxiva.com     | <ingress-ip-staging>          | 300
A     | api-staging.broxiva.com | <ingress-ip-staging>          | 300
A     | *.staging.broxiva.com   | <ingress-ip-staging>          | 300
```

#### Production
```
Type  | Name                | Value                          | TTL
------|--------------------|---------------------------------|-----
A     | broxiva.com        | <ingress-ip-prod>              | 300
A     | www.broxiva.com    | <ingress-ip-prod>              | 300
A     | api.broxiva.com    | <ingress-ip-prod>              | 300
CNAME | cdn.broxiva.com    | cloudfront-dist.amazonaws.com  | 3600
TXT   | broxiva.com        | "v=spf1 include:sendgrid.net"  | 3600
```

### Ingress Configuration

Each environment has its own ingress controller configuration in:
- `infrastructure/kubernetes/overlays/development/`
- `infrastructure/kubernetes/overlays/staging/`
- `infrastructure/kubernetes/overlays/production/`

### SSL/TLS Certificates

Certificates are managed by cert-manager using Let's Encrypt:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: broxiva-tls
spec:
  secretName: broxiva-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - broxiva.com
    - www.broxiva.com
    - api.broxiva.com
```

---

## Secrets Management

### Azure Key Vault Integration

Secrets are managed using External Secrets Operator:

1. Secrets stored in Azure Key Vault
2. External Secrets Operator syncs to Kubernetes
3. Pods consume secrets as environment variables or mounted volumes

### Secret Rotation

Production secrets should be rotated every 90 days:

```bash
# Trigger secret rotation workflow
gh workflow run secret-rotation.yml \
  --ref main \
  -f environment=production
```

---

## Best Practices

### Deployment Best Practices

1. **Always deploy to Development first**
   - Validate changes in dev before promoting

2. **Staging should mirror Production**
   - Use production-like data volumes
   - Test with production configuration

3. **Use feature flags for risky changes**
   - Enable gradual rollout
   - Quick rollback without deployment

4. **Schedule production deployments during low-traffic periods**
   - Typically Tuesday-Thursday, 10 AM - 2 PM EST
   - Avoid Fridays and weekends

5. **Monitor deployments actively**
   - Watch Grafana dashboards
   - Monitor error rates
   - Check customer support channels

6. **Communicate proactively**
   - Notify team before deployment
   - Update status page if needed
   - Document changes in changelog

### Versioning Strategy

Follow Semantic Versioning (SemVer):

- **MAJOR.MINOR.PATCH** (e.g., v2.1.3)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

Git tagging convention:
```bash
# Production releases
v2.1.0, v2.1.1, v2.2.0

# Release candidates
v2.1.0-rc.1, v2.1.0-rc.2

# Staging releases
staging-2024-01-15, staging-abc123
```

### Monitoring During Deployments

Key metrics to watch:

1. **Error Rates**
   - HTTP 5xx errors
   - Application exceptions
   - Failed requests

2. **Performance**
   - Response time (p50, p95, p99)
   - Database query time
   - Cache hit rate

3. **Resource Usage**
   - CPU utilization
   - Memory usage
   - Pod restart count

4. **Business Metrics**
   - Order completion rate
   - User registration rate
   - Payment success rate

### Emergency Contacts

- **DevOps Lead:** devops@broxiva.com
- **Engineering Manager:** engineering@broxiva.com
- **On-Call Engineer:** oncall@broxiva.com
- **Incident Channel:** #incidents (Slack)

---

## Appendix

### Useful Commands

```bash
# Check deployment history
kubectl rollout history deployment/broxiva-api -n broxiva-production

# Scale deployment
kubectl scale deployment/broxiva-api -n broxiva-production --replicas=10

# View logs
kubectl logs -f deployment/broxiva-api -n broxiva-production

# Execute command in pod
kubectl exec -it <pod-name> -n broxiva-production -- /bin/sh

# Port forward for debugging
kubectl port-forward service/broxiva-api 8080:4000 -n broxiva-production

# View resource usage
kubectl top pods -n broxiva-production
kubectl top nodes

# Describe deployment
kubectl describe deployment/broxiva-api -n broxiva-production
```

### Related Documentation

- [Kubernetes Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Security Architecture](./SECURITY-ARCHITECTURE.md)
- [Terraform Workflows](./README-TERRAFORM-WORKFLOWS.md)
- [AKS Deployment README](./AKS_DEPLOYMENT_README.md)

---

**Last Updated:** 2024-12-13
**Version:** 1.0.0
**Maintained By:** DevOps Team
