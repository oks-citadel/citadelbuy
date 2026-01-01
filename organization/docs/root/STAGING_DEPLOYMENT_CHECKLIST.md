# Broxiva Staging Deployment Checklist

Use this checklist to ensure successful staging deployments.

## Pre-Deployment Checklist

### Code Quality
- [ ] All unit tests passing locally
- [ ] All integration tests passing
- [ ] Linting passed (no errors)
- [ ] Type checking passed
- [ ] Code review completed and approved
- [ ] No known critical bugs

### Environment Setup
- [ ] kubectl configured with staging context
- [ ] Docker daemon running
- [ ] Container registry authenticated (ghcr.io)
- [ ] Environment variables exported
- [ ] Kubernetes secrets exist in cluster
- [ ] DNS records configured correctly

### Infrastructure
- [ ] Staging namespace exists
- [ ] Resource quotas configured
- [ ] Persistent volumes available
- [ ] Ingress controller running
- [ ] TLS certificates valid
- [ ] Load balancer provisioned

### Database
- [ ] Database migrations reviewed
- [ ] Backup of current staging database created
- [ ] Migration rollback plan documented
- [ ] Seed data prepared (if needed)
- [ ] Database credentials verified

### Dependencies
- [ ] All required images built
- [ ] External services accessible (Stripe, SendGrid, etc.)
- [ ] Third-party API keys valid
- [ ] Feature flags configured
- [ ] Environment-specific configs updated

### Team Coordination
- [ ] Team notified of deployment window
- [ ] On-call engineer available
- [ ] Deployment scheduled (business hours preferred)
- [ ] Rollback person designated
- [ ] Communication channels open (#staging-deployments)

## Deployment Execution Checklist

### Initial Steps
- [ ] Pull latest code from repository
- [ ] Verify git commit hash
- [ ] Review deployment script
- [ ] Check staging environment status
- [ ] Verify no ongoing deployments

### Automated Deployment
- [ ] Run `./scripts/deploy-staging.sh`
- [ ] Monitor script output for errors
- [ ] Verify prerequisites check passed
- [ ] Confirm deployment when prompted
- [ ] Watch Docker image build progress
- [ ] Verify images pushed to registry

### Kubernetes Deployment
- [ ] Namespace created/verified
- [ ] ConfigMaps applied
- [ ] Secrets verified
- [ ] Database services deployed
- [ ] Application services deployed
- [ ] Ingress resources created
- [ ] HPA configured

### Rollout Monitoring
- [ ] API deployment rolling out
- [ ] Web deployment rolling out
- [ ] Old pods terminating gracefully
- [ ] New pods starting successfully
- [ ] Health checks passing
- [ ] No restart loops observed

### Database Migration
- [ ] API pod identified
- [ ] Migrations executed successfully
- [ ] Migration status verified
- [ ] No migration errors in logs
- [ ] Database schema updated correctly

### Health Verification
- [ ] All pods in "Running" state
- [ ] All pods ready (X/X ready replicas)
- [ ] Services have endpoints
- [ ] Ingress has IP/hostname
- [ ] Load balancer responding
- [ ] No error events in namespace

## Post-Deployment Checklist

### Smoke Tests
- [ ] Run `./scripts/smoke-tests.sh`
- [ ] All health checks passing
- [ ] API endpoints responding
- [ ] Database connectivity verified
- [ ] Redis connectivity verified
- [ ] Authentication working
- [ ] Product operations functional
- [ ] Cart operations functional
- [ ] Admin panel protected
- [ ] Response times acceptable
- [ ] Web frontend accessible

### Manual Verification
- [ ] Test homepage loads
- [ ] Test user registration
- [ ] Test user login
- [ ] Test product browsing
- [ ] Test search functionality
- [ ] Test add to cart
- [ ] Test checkout flow (mock payment)
- [ ] Test admin login
- [ ] Test vendor features
- [ ] Test mobile responsiveness

### Performance Check
- [ ] API response times < 2s
- [ ] Health check response < 500ms
- [ ] Database query times acceptable
- [ ] Cache hit rate healthy
- [ ] No memory leaks detected
- [ ] CPU usage normal
- [ ] No resource throttling

### Monitoring & Logs
- [ ] No error spikes in logs
- [ ] Application logs accessible
- [ ] Database logs normal
- [ ] Prometheus metrics available
- [ ] No alert triggers
- [ ] Resource usage within limits
- [ ] No OOM kills

### Integration Testing
- [ ] Stripe test payments working
- [ ] Email delivery functional (SendGrid)
- [ ] File uploads working
- [ ] Image processing functional
- [ ] Search indexing working (Elasticsearch)
- [ ] Cache working (Redis)
- [ ] Webhooks receiving events

### Security Verification
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] CORS configured correctly
- [ ] Rate limiting active
- [ ] Authentication required on protected routes
- [ ] No exposed secrets in logs
- [ ] No security vulnerabilities detected

### Documentation
- [ ] Deployment logged in deployment history
- [ ] Changes documented
- [ ] Known issues noted
- [ ] Rollback procedure verified
- [ ] Team documentation updated

## Notification Checklist

### Immediate Notifications
- [ ] Slack notification sent (#staging-deployments)
- [ ] Deployment status posted
- [ ] Links to staging environment shared
- [ ] Test results shared
- [ ] Known issues communicated

### Post-Deployment Communication
```
✅ Staging Deployment Complete

Environment: Staging
Timestamp: [TIMESTAMP]
Commit: [COMMIT_HASH]
Deployed by: [YOUR_NAME]

Status: SUCCESS
All smoke tests passed: 15/15

URLs:
- Web: https://staging.broxiva.com
- API: https://staging-api.broxiva.com

Ready for UAT and testing.
```

## Rollback Checklist

### When to Rollback
- [ ] Smoke tests failing (>3 failed)
- [ ] Critical functionality broken
- [ ] Performance degradation (>50%)
- [ ] Database migration failure
- [ ] Security issue detected
- [ ] Production-blocking issue found

### Rollback Steps
- [ ] Stop automated deployment (if running)
- [ ] Notify team of rollback decision
- [ ] Execute: `kubectl rollout undo deployment/broxiva-api -n broxiva-staging`
- [ ] Execute: `kubectl rollout undo deployment/broxiva-web -n broxiva-staging`
- [ ] Verify old version deployed
- [ ] Run smoke tests on rolled back version
- [ ] Verify stability
- [ ] Document rollback reason
- [ ] Create incident report
- [ ] Schedule fix and re-deploy

## Post-Rollback Checklist
- [ ] Services stable on previous version
- [ ] All tests passing
- [ ] Team notified of rollback
- [ ] Root cause identified
- [ ] Fix planned
- [ ] Re-deployment scheduled

## Success Criteria

Deployment is considered successful when:
- ✅ All pods running and ready
- ✅ All smoke tests passing (15/15)
- ✅ No error spikes in logs
- ✅ Health endpoints returning 200
- ✅ Database connections stable
- ✅ Performance within thresholds
- ✅ Manual testing passes
- ✅ No critical issues identified

## Failure Criteria

Deployment should be rolled back if:
- ❌ Smoke tests failing (>3 failed)
- ❌ Pods crash looping
- ❌ Database connection failures
- ❌ Critical functionality broken
- ❌ Security vulnerabilities exposed
- ❌ Performance degraded >50%
- ❌ Production-blocking issues

## Timing Guidelines

### Ideal Deployment Window
- **Day**: Monday - Thursday
- **Time**: 9 AM - 5 PM (business hours)
- **Duration**: Allow 30-60 minutes
- **Testing**: Allow 2-4 hours post-deployment

### Avoid Deploying
- ❌ Friday afternoons (limited time to fix issues)
- ❌ Weekends (team availability)
- ❌ Holidays
- ❌ End of month (business critical time)
- ❌ During known high-traffic periods
- ❌ Without team availability

## Emergency Contacts

### On-Call Rotation
- **Primary**: [NAME] - [PHONE]
- **Secondary**: [NAME] - [PHONE]
- **DevOps Lead**: devops@broxiva.com

### Escalation Path
1. On-call engineer
2. DevOps lead
3. Engineering manager
4. CTO

### Communication Channels
- **Slack**: #staging-deployments
- **Urgent**: #incidents
- **Email**: devops@broxiva.com

## Additional Resources

- **Full Guide**: `docs/STAGING_DEPLOYMENT.md`
- **Quick Reference**: `STAGING_QUICK_REFERENCE.md`
- **Smoke Tests**: `tests/smoke/README.md`
- **Troubleshooting**: `docs/STAGING_DEPLOYMENT.md#troubleshooting`

---

**Checklist Version**: 1.0
**Last Updated**: 2025-12-04
**Next Review**: 2025-12-11
