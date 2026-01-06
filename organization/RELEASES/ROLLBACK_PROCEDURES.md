# Broxiva Platform Rollback Procedures

**Document Version:** 1.0
**Last Updated:** January 5, 2026
**Applies To:** All production deployments

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Rollback Decision Matrix](#rollback-decision-matrix)
3. [Automatic Rollback](#automatic-rollback)
4. [Manual Rollback Procedures](#manual-rollback-procedures)
5. [Database Rollback](#database-rollback)
6. [Service-Specific Rollback](#service-specific-rollback)
7. [Post-Rollback Actions](#post-rollback-actions)
8. [Testing Rollback](#testing-rollback)

---

## Quick Reference

### Emergency Rollback Commands

```bash
# FASTEST: Rollback all core services to previous version
kubectl rollout undo deployment/broxiva-api -n broxiva-production
kubectl rollout undo deployment/broxiva-web -n broxiva-production

# Using rollback script (recommended)
./infrastructure/scripts/rollback-release.sh production previous

# Rollback specific microservice
kubectl rollout undo deployment/broxiva-<service-name> -n broxiva-production

# Blue-Green switch back to Blue
kubectl patch service broxiva-api -n broxiva-production \
  -p '{"spec":{"selector":{"color":"blue"}}}'
kubectl patch service broxiva-web -n broxiva-production \
  -p '{"spec":{"selector":{"color":"blue"}}}'
```

### Emergency Contacts

| Role | Contact |
|------|---------|
| On-Call Engineer | oncall@broxiva.com |
| DevOps Lead | devops@broxiva.com |
| Incident Channel | #incidents (Slack) |

---

## Rollback Decision Matrix

### When to Rollback

| Condition | Severity | Action |
|-----------|----------|--------|
| API returning 5xx errors >5% | CRITICAL | Immediate rollback |
| Database connection failures | CRITICAL | Immediate rollback |
| Payment processing failures | CRITICAL | Immediate rollback |
| Response time >3x baseline | HIGH | Rollback within 10 min |
| Memory/CPU >90% sustained | HIGH | Rollback within 10 min |
| Functional regression found | MEDIUM | Evaluate, rollback if blocking |
| Minor UI issues | LOW | No rollback, hotfix |

### Rollback Authority

| Severity | Can Authorize Rollback |
|----------|----------------------|
| CRITICAL | Any engineer on call |
| HIGH | Team lead or above |
| MEDIUM | Engineering manager |

---

## Automatic Rollback

The CI/CD pipeline includes automatic rollback for certain failure scenarios:

### Deployment Failures

When a deployment fails to complete:

1. Kubernetes automatically keeps previous ReplicaSet running
2. Failed pods do not receive traffic
3. Deployment status shows failure in GitHub Actions
4. Alert sent to Slack #incidents channel

### Health Check Failures

When health checks fail after deployment:

1. Kubernetes stops routing traffic to unhealthy pods
2. If >50% pods unhealthy, rollback triggers
3. Previous ReplicaSet scales up
4. Alert sent to monitoring channels

### Smoke Test Failures

When post-deployment smoke tests fail:

1. CI/CD pipeline marks deployment as failed
2. Manual intervention required for rollback decision
3. Team notified via Slack

---

## Manual Rollback Procedures

### Procedure 1: Kubernetes Rollout Undo (Fastest)

**Use when:** Need immediate rollback to previous deployment

```bash
# Step 1: Connect to cluster
aws eks update-kubeconfig --name broxiva-prod-eks --region us-east-1

# Step 2: Check current deployment status
kubectl get deployments -n broxiva-production

# Step 3: View rollout history
kubectl rollout history deployment/broxiva-api -n broxiva-production

# Step 4: Execute rollback
kubectl rollout undo deployment/broxiva-api -n broxiva-production
kubectl rollout undo deployment/broxiva-web -n broxiva-production

# Step 5: Monitor rollback progress
kubectl rollout status deployment/broxiva-api -n broxiva-production
kubectl rollout status deployment/broxiva-web -n broxiva-production

# Step 6: Verify health
curl https://api.broxiva.com/health
curl https://broxiva.com
```

**Expected Duration:** 2-5 minutes

### Procedure 2: Rollback to Specific Revision

**Use when:** Need to rollback multiple versions

```bash
# Step 1: List available revisions
kubectl rollout history deployment/broxiva-api -n broxiva-production

# Step 2: View specific revision details
kubectl rollout history deployment/broxiva-api -n broxiva-production --revision=3

# Step 3: Rollback to specific revision
kubectl rollout undo deployment/broxiva-api -n broxiva-production --to-revision=3
kubectl rollout undo deployment/broxiva-web -n broxiva-production --to-revision=3

# Step 4: Verify
kubectl rollout status deployment/broxiva-api -n broxiva-production
```

### Procedure 3: Blue-Green Traffic Switch

**Use when:** Blue-Green deployment in progress

```bash
# Step 1: Check current traffic routing
kubectl get service broxiva-api -n broxiva-production \
  -o jsonpath='{.spec.selector.color}'

# Step 2: Switch traffic to Blue (previous version)
kubectl patch service broxiva-api -n broxiva-production \
  -p '{"spec":{"selector":{"color":"blue"}}}'
kubectl patch service broxiva-web -n broxiva-production \
  -p '{"spec":{"selector":{"color":"blue"}}}'

# Step 3: Verify traffic switch
kubectl describe service broxiva-api -n broxiva-production | grep Selector

# Step 4: Scale down Green deployment (optional)
kubectl scale deployment/broxiva-api-green --replicas=0 -n broxiva-production
```

### Procedure 4: Using Rollback Script

**Use when:** Standard rollback with logging

```bash
# Rollback to previous version
./infrastructure/scripts/rollback-release.sh production previous

# Rollback to specific version tag
./infrastructure/scripts/rollback-release.sh production v1.9.5

# Dry run (shows what would happen)
./infrastructure/scripts/rollback-release.sh production previous --dry-run
```

---

## Database Rollback

### Prisma Migration Rollback

**WARNING:** Database rollbacks can cause data loss. Proceed with caution.

```bash
# Step 1: Check migration status
cd organization/apps/api
npx prisma migrate status

# Step 2: View migration history
npx prisma migrate history

# Step 3: Mark migration as rolled back
npx prisma migrate resolve --rolled-back "MIGRATION_NAME"

# Step 4: Apply rollback SQL (if available)
npx prisma db execute --file ./prisma/rollback/MIGRATION_NAME_down.sql
```

### Full Database Restore

**Use when:** Severe data corruption or migration failure

```bash
# Step 1: Contact DBA team
# Email: dba@broxiva.com
# Slack: #database-ops

# Step 2: Identify backup to restore
aws rds describe-db-snapshots \
  --db-instance-identifier broxiva-prod-db

# Step 3: DBA team will:
# - Create new RDS instance from snapshot
# - Validate data integrity
# - Update connection strings
# - Switch traffic to restored database
```

---

## Service-Specific Rollback

### API Service

```bash
kubectl rollout undo deployment/broxiva-api -n broxiva-production
kubectl rollout status deployment/broxiva-api -n broxiva-production

# Verify
curl -f https://api.broxiva.com/health
```

### Web Application

```bash
kubectl rollout undo deployment/broxiva-web -n broxiva-production
kubectl rollout status deployment/broxiva-web -n broxiva-production

# Verify
curl -f https://broxiva.com
```

### Microservices

```bash
# Available microservices
SERVICES=(
  "ai-agents"
  "ai-engine"
  "analytics"
  "chatbot"
  "fraud-detection"
  "inventory"
  "media"
  "notification"
  "personalization"
  "pricing"
  "recommendation"
  "search"
  "supplier-integration"
)

# Rollback specific service
SERVICE="recommendation"
kubectl rollout undo deployment/broxiva-${SERVICE} -n broxiva-production

# Rollback all microservices
for SERVICE in "${SERVICES[@]}"; do
  kubectl rollout undo deployment/broxiva-${SERVICE} -n broxiva-production
done
```

---

## Post-Rollback Actions

### Immediate Actions (Within 15 minutes)

1. **Verify Health**
   ```bash
   # Check all pod status
   kubectl get pods -n broxiva-production

   # Check service endpoints
   kubectl get endpoints -n broxiva-production

   # Test health endpoints
   curl https://api.broxiva.com/health
   curl https://api.broxiva.com/health/ready
   ```

2. **Notify Stakeholders**
   - Post to #incidents Slack channel
   - Send email to engineering@broxiva.com
   - Update status page (if customer-facing impact)

3. **Monitor Metrics**
   - Open Grafana dashboards
   - Watch error rates for 30 minutes
   - Monitor response times

### Short-Term Actions (Within 2 hours)

1. **Create Incident Report**
   - Document timeline of events
   - Capture relevant logs
   - Identify root cause (if known)

2. **Preserve Evidence**
   ```bash
   # Export logs from failed deployment
   kubectl logs deployment/broxiva-api -n broxiva-production \
     --since=2h > rollback-api-logs.txt

   # Export events
   kubectl get events -n broxiva-production \
     --sort-by='.lastTimestamp' > rollback-events.txt
   ```

3. **Schedule Post-Mortem**
   - Within 48 hours of incident
   - Include all relevant team members
   - Focus on prevention, not blame

### Long-Term Actions (Within 1 week)

1. **Complete Root Cause Analysis**
2. **Update Runbooks** with lessons learned
3. **Implement Preventive Measures**
4. **Test Fixes in Staging**
5. **Schedule Re-deployment**

---

## Testing Rollback

### Staging Environment Test

Before any production release, test rollback in staging:

```bash
# 1. Deploy new version to staging
# (via CI/CD or manual)

# 2. Verify deployment
kubectl get pods -n broxiva-staging

# 3. Execute rollback
kubectl rollout undo deployment/broxiva-api -n broxiva-staging
kubectl rollout undo deployment/broxiva-web -n broxiva-staging

# 4. Verify rollback
kubectl rollout status deployment/broxiva-api -n broxiva-staging

# 5. Test application
curl https://api-staging.broxiva.com/health

# 6. Document results
# Record rollback time, any issues encountered
```

### Rollback Drill Schedule

| Frequency | Environment | Scope |
|-----------|-------------|-------|
| Weekly | Development | Full rollback test |
| Bi-weekly | Staging | Full rollback test |
| Monthly | Production (off-peak) | Limited scope test |

---

## Troubleshooting

### Rollback Stuck

```bash
# Check rollout status
kubectl describe deployment/broxiva-api -n broxiva-production

# Check for stuck pods
kubectl get pods -n broxiva-production | grep -v Running

# Force delete stuck pods
kubectl delete pod <pod-name> -n broxiva-production --force --grace-period=0

# If still stuck, scale down and up
kubectl scale deployment/broxiva-api --replicas=0 -n broxiva-production
kubectl scale deployment/broxiva-api --replicas=5 -n broxiva-production
```

### No Previous Revision Available

```bash
# Check if revisionHistoryLimit is set
kubectl get deployment/broxiva-api -n broxiva-production \
  -o jsonpath='{.spec.revisionHistoryLimit}'

# If no history, deploy specific image tag
kubectl set image deployment/broxiva-api \
  api=<ECR_REGISTRY>/broxiva/api:<previous-sha> \
  -n broxiva-production
```

### Database Migration Conflicts

Contact DBA team immediately:
- Email: dba@broxiva.com
- Slack: #database-ops
- Phone: Emergency contact list

---

**Remember:** The goal of rollback is to restore service quickly. Root cause analysis can happen after stability is restored.
