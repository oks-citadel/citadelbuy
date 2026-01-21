# Broxiva Rollback Procedures

**Version:** 1.0.0
**Last Updated:** 2026-01-05
**Owner:** Platform Engineering Team

---

## Overview

This document provides step-by-step procedures for rolling back deployments on the Broxiva E-Commerce Platform. Rollbacks can be performed automatically (on failure) or manually (for any reason).

---

## Quick Reference

### Emergency Rollback Commands

```bash
# Immediate rollback to previous version (Production)
./organization/infrastructure/scripts/rollback-release.sh prod previous

# Rollback to specific revision
./organization/infrastructure/scripts/rollback-release.sh prod revision-3

# Rollback to specific version tag
./organization/infrastructure/scripts/rollback-release.sh prod v2.1.5

# Direct kubectl rollback (API service)
kubectl rollout undo deployment/broxiva-api -n broxiva
```

---

## 1. Rollback Decision Matrix

| Scenario | Recommended Action | Urgency |
|----------|-------------------|---------|
| Health check failure | Automatic rollback | Immediate |
| 5xx error spike (>1%) | Manual rollback | High |
| Performance degradation (>50% latency) | Manual rollback | High |
| Business logic bug | Manual rollback | Medium |
| Security vulnerability | Manual rollback | Critical |
| Feature issue (non-critical) | Hotfix forward | Low |

---

## 2. Automatic Rollback

### 2.1 How It Works

The CI/CD pipeline includes automatic rollback triggers:

```yaml
# From buildspec-deploy.yml
if [ "$DEPLOYMENT_STATUS" != "SUCCESS" ]; then
  echo "Deployment failed. Rolling back..."
  for SERVICE in $NODEJS_SERVICES; do
    DEPLOYMENT_NAME="${PROJECT_NAME}-${SERVICE}"
    kubectl rollout undo deployment/$DEPLOYMENT_NAME -n $KUBERNETES_NAMESPACE || true
  done
  exit 1
fi
```

### 2.2 Automatic Rollback Triggers

1. **Deployment timeout** - Rollout exceeds 300 seconds
2. **Health check failure** - Pods fail readiness/liveness probes
3. **Container crash** - CrashLoopBackOff detected
4. **Image pull failure** - Container image not found

### 2.3 Monitoring Automatic Rollbacks

```bash
# Check recent events
kubectl get events -n broxiva --sort-by='.lastTimestamp' | head -20

# Check deployment status
kubectl rollout status deployment/broxiva-api -n broxiva

# View rollback history
kubectl rollout history deployment/broxiva-api -n broxiva
```

---

## 3. Manual Rollback Procedures

### 3.1 Using the Rollback Script

The official rollback script provides a guided, safe rollback process.

**Location:** `organization/infrastructure/scripts/rollback-release.sh`

**Prerequisites:**
- kubectl configured for cluster access
- Azure CLI authenticated (for AKS) or AWS CLI (for EKS)
- jq installed

#### Step 1: Review Current State

```bash
# View deployment history
kubectl rollout history deployment/broxiva-api -n broxiva

# Check current image
kubectl get deployment broxiva-api -n broxiva -o jsonpath='{.spec.template.spec.containers[0].image}'

# View recent pods
kubectl get pods -n broxiva -l app=broxiva-api
```

#### Step 2: Execute Rollback

```bash
# Navigate to scripts directory
cd organization/infrastructure/scripts

# Run rollback script
./rollback-release.sh prod previous
```

#### Step 3: Confirm Rollback

For production, you must type: `ROLLBACK PRODUCTION`

The script will:
1. Create a backup of current state
2. Show deployment history
3. Confirm target version
4. Execute rollback
5. Wait for rollout completion
6. Run health checks
7. Create incident report

#### Step 4: Verify

```bash
# Check new deployment status
kubectl get deployments -n broxiva

# Verify pods are healthy
kubectl get pods -n broxiva -o wide

# Check application health
curl https://api.broxiva.com/health
```

---

### 3.2 Direct Kubernetes Rollback

For immediate rollback without the script:

#### Rollback to Previous Revision

```bash
# Rollback API
kubectl rollout undo deployment/broxiva-api -n broxiva

# Rollback Web
kubectl rollout undo deployment/broxiva-web -n broxiva

# Rollback specific microservice
kubectl rollout undo deployment/broxiva-inventory -n broxiva
```

#### Rollback to Specific Revision

```bash
# View available revisions
kubectl rollout history deployment/broxiva-api -n broxiva

# Rollback to revision 3
kubectl rollout undo deployment/broxiva-api -n broxiva --to-revision=3
```

#### Rollback to Specific Image

```bash
# Set specific image tag
kubectl set image deployment/broxiva-api \
  api=<ECR_REGISTRY>/broxiva/api:<PREVIOUS_SHA> \
  -n broxiva

# Wait for rollout
kubectl rollout status deployment/broxiva-api -n broxiva
```

---

### 3.3 Rolling Back All Services

For platform-wide rollback:

```bash
# Get list of all broxiva deployments
DEPLOYMENTS=$(kubectl get deployments -n broxiva -o name | grep broxiva-)

# Rollback each deployment
for DEPLOY in $DEPLOYMENTS; do
  echo "Rolling back $DEPLOY..."
  kubectl rollout undo $DEPLOY -n broxiva
done

# Wait for all rollouts
for DEPLOY in $DEPLOYMENTS; do
  kubectl rollout status $DEPLOY -n broxiva --timeout=180s
done
```

---

## 4. Environment-Specific Procedures

### 4.1 Production Rollback

**Checklist before rollback:**
- [ ] Incident documented in tracking system
- [ ] Stakeholders notified (Slack: #incidents)
- [ ] Root cause identified (if possible)
- [ ] Backup created by rollback script

**Command:**
```bash
./organization/infrastructure/scripts/rollback-release.sh prod previous
```

**Confirmation required:** Type `ROLLBACK PRODUCTION`

**Post-rollback:**
- [ ] Health checks passing
- [ ] Error rates normalized
- [ ] Customer-facing functionality verified
- [ ] Incident report completed

### 4.2 Staging Rollback

**Command:**
```bash
./organization/infrastructure/scripts/rollback-release.sh staging previous
```

**Confirmation required:** Type `ROLLBACK`

### 4.3 Development Rollback

**Command:**
```bash
./organization/infrastructure/scripts/rollback-release.sh dev previous
```

**Confirmation required:** Type `ROLLBACK`

---

## 5. Database Rollback Considerations

### 5.1 Schema Changes

If the deployment included database migrations:

1. **Check if migration is reversible:**
   ```bash
   # List recent migrations
   npx prisma migrate status
   ```

2. **For reversible migrations:**
   ```bash
   # Revert last migration (if safe)
   npx prisma migrate reset --skip-seed
   ```

3. **For irreversible migrations:**
   - Contact DBA team immediately
   - May require point-in-time database restore
   - Application rollback may be blocked

### 5.2 Data Compatibility

Before rollback, verify:
- Previous version compatible with current data
- No required columns added in rolled-back version
- Enum values are backward compatible

---

## 6. Monitoring During Rollback

### 6.1 Key Metrics to Watch

During and after rollback, monitor:

| Metric | Normal Range | Alert Threshold |
|--------|--------------|-----------------|
| Error rate (5xx) | < 0.1% | > 1% |
| Response time (p99) | < 500ms | > 2000ms |
| Pod restarts | 0 | > 3 per minute |
| Request throughput | Baseline | < 50% baseline |

### 6.2 Monitoring Commands

```bash
# Watch pod status
watch kubectl get pods -n broxiva

# Tail application logs
kubectl logs -f deployment/broxiva-api -n broxiva

# Check events
kubectl get events -n broxiva --watch

# View resource usage
kubectl top pods -n broxiva
```

### 6.3 Dashboard Links

- Grafana: `https://grafana.broxiva.internal/d/deployments`
- CloudWatch: AWS Console > CloudWatch > Dashboards > Broxiva-Prod
- Sentry: `https://sentry.io/organizations/broxiva/projects/api/`

---

## 7. Rollback Verification

### 7.1 Health Checks

```bash
# API health
curl -f https://api.broxiva.com/health/live
curl -f https://api.broxiva.com/health/ready

# Web health
curl -f https://www.broxiva.com/api/health
```

### 7.2 Functional Verification

After rollback, verify core functionality:

- [ ] User login/logout
- [ ] Product browsing
- [ ] Add to cart
- [ ] Checkout initiation
- [ ] Order history access
- [ ] Admin panel access

### 7.3 Smoke Test Script

```bash
# Run automated smoke tests
cd organization
./scripts/smoke-tests.sh production
```

---

## 8. Incident Documentation

### 8.1 Auto-Generated Report

The rollback script creates an incident report at:
```
organization/incidents/rollback-YYYYMMDD-HHMMSS.md
```

### 8.2 Required Information

Complete the incident report with:
- Reason for rollback
- Root cause (if known)
- Impact assessment
- Timeline of events
- Follow-up actions

### 8.3 Post-Incident Review

Schedule within 48 hours:
- Blameless post-mortem meeting
- Action items for prevention
- Runbook updates if needed

---

## 9. Troubleshooting

### 9.1 Rollback Stuck

**Symptom:** `kubectl rollout status` hangs

**Resolution:**
```bash
# Check pod status
kubectl get pods -n broxiva -l app=broxiva-api

# Check events for issues
kubectl describe deployment/broxiva-api -n broxiva

# Force delete stuck pods
kubectl delete pods -l app=broxiva-api -n broxiva --force
```

### 9.2 Image Not Found

**Symptom:** `ImagePullBackOff` error

**Resolution:**
1. Verify image exists in ECR:
   ```bash
   aws ecr describe-images --repository-name broxiva/api
   ```
2. Check ECR authentication:
   ```bash
   aws ecr get-login-password | docker login --username AWS --password-stdin <ECR_REGISTRY>
   ```
3. Use a known working image tag

### 9.3 Insufficient Resources

**Symptom:** Pods pending due to resource constraints

**Resolution:**
```bash
# Check resource usage
kubectl describe nodes

# Scale down non-critical services temporarily
kubectl scale deployment/broxiva-recommendation --replicas=1 -n broxiva

# Retry rollback
kubectl rollout restart deployment/broxiva-api -n broxiva
```

### 9.4 Database Connection Issues

**Symptom:** Application fails after rollback with DB errors

**Resolution:**
1. Check database connectivity
2. Verify connection string in secrets
3. May require DBA assistance for schema compatibility

---

## 10. Contact Information

### Escalation Path

| Level | Contact | When |
|-------|---------|------|
| L1 | On-call Engineer | First responder |
| L2 | Platform Engineering Lead | Complex issues |
| L3 | SRE Team Lead | Infrastructure issues |
| L4 | VP Engineering | Business impact |

### Communication Channels

- **Slack:** #incidents, #platform-engineering
- **PagerDuty:** Broxiva Platform Service
- **Email:** platform-team@broxiva.com

---

## Appendix A: Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-05 | 1.0.0 | Initial version |

---

## Appendix B: Related Documents

- [Deployment Policy](../../SECURITY/deployment-policy.md)
- [CI/CD Governance Audit](../../VERIFICATION/cicd-governance-audit.md)
- [Incident Response Plan](../../organization/docs/root/INCIDENT_RESPONSE.md)
- [Kubernetes Deployment Guide](../../organization/infrastructure/kubernetes/DEPLOYMENT_GUIDE.md)
