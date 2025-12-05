# Monitoring Setup Checklist

Use this checklist to complete the monitoring setup for CitadelBuy.

## ✅ Initial Setup

### Sentry Account Setup
- [ ] Create Sentry account at https://sentry.io
- [ ] Create project: `citadelbuy-backend-production`
- [ ] Create project: `citadelbuy-backend-staging`
- [ ] Create project: `citadelbuy-web-production`
- [ ] Create project: `citadelbuy-web-staging`
- [ ] Copy DSN from each project

### Backend Configuration
- [ ] Add `SENTRY_DSN` to `apps/api/.env`
- [ ] Update `apps/api/src/app.module.ts`:
  ```typescript
  import { SentryModule } from './common/monitoring/sentry.module';
  import { MetricsModule } from './common/monitoring/metrics.module';

  @Module({
    imports: [
      // ... existing imports
      SentryModule,
      MetricsModule,
    ],
  })
  ```
- [ ] Update `apps/api/src/main.ts` to initialize Sentry early
- [ ] Restart backend server
- [ ] Verify logs show "Sentry initialized successfully"

### Frontend Configuration
- [ ] Add `NEXT_PUBLIC_SENTRY_DSN` to `apps/web/.env`
- [ ] Restart frontend server
- [ ] Verify no Sentry errors in browser console

## 🧪 Testing

### Backend Testing
- [ ] Test health endpoint: `curl http://localhost:4000/api/health`
- [ ] Test metrics endpoint: `curl http://localhost:4000/api/metrics`
- [ ] Trigger a test error and verify it appears in Sentry
- [ ] Verify metrics are being collected
- [ ] Check Sentry dashboard shows error

### Frontend Testing
- [ ] Open browser dev tools
- [ ] Run: `throw new Error('Test error')`
- [ ] Verify error appears in Sentry dashboard
- [ ] Check error includes browser context
- [ ] Verify user context is captured (if logged in)

### Metrics Testing
- [ ] Make API requests
- [ ] Check `/api/metrics` shows:
  - `http_requests_total` incrementing
  - `http_request_duration_seconds` recording
  - No errors in metric names
- [ ] Create test order and verify `orders_total` increments
- [ ] Process test payment and verify `payments_total` increments

## 📊 Monitoring Tools Setup (Optional)

### Prometheus
- [ ] Create `prometheus.yml` configuration
- [ ] Start Prometheus:
  ```bash
  docker run -d --name prometheus -p 9090:9090 \
    -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
    prom/prometheus
  ```
- [ ] Access: http://localhost:9090
- [ ] Verify CitadelBuy API target is up
- [ ] Test query: `rate(http_requests_total[5m])`

### Grafana
- [ ] Start Grafana:
  ```bash
  docker run -d --name grafana -p 3001:3000 grafana/grafana
  ```
- [ ] Access: http://localhost:3001 (admin/admin)
- [ ] Add Prometheus data source
- [ ] Import dashboard or create custom dashboard
- [ ] Create panels for key metrics:
  - Request rate
  - Error rate
  - Response time
  - Order count
  - Revenue

## 🚨 Alerting Setup

### Sentry Alerts
- [ ] Configure alert for new production errors
- [ ] Configure alert for high error rate (>10/min)
- [ ] Configure alert for payment failures
- [ ] Set up Slack integration
- [ ] Set up email notifications
- [ ] Test alerts by triggering errors

### Prometheus Alerts (if using)
- [ ] Create `alerts.yml` file
- [ ] Configure high error rate alert
- [ ] Configure high response time alert
- [ ] Configure payment failure alert
- [ ] Set up Alertmanager
- [ ] Configure notification channels
- [ ] Test alerts

## 📝 Documentation

- [ ] Review [MONITORING_SETUP.md](./docs/MONITORING_SETUP.md)
- [ ] Review [MONITORING_QUICK_START.md](./docs/MONITORING_QUICK_START.md)
- [ ] Create team runbooks for common issues
- [ ] Document alert response procedures
- [ ] Share documentation with team

## 🔐 Security

### Data Sanitization
- [ ] Verify passwords are not logged
- [ ] Verify API keys are redacted in Sentry
- [ ] Verify credit card numbers never logged
- [ ] Check PII handling compliance
- [ ] Review log retention policies

### Access Control
- [ ] Restrict `/api/metrics` to internal network only
- [ ] Set up Sentry project permissions
- [ ] Configure proper IAM roles (if using cloud)
- [ ] Enable 2FA for monitoring accounts
- [ ] Document access procedures

## 👥 Team Setup

- [ ] Add team members to Sentry organization
- [ ] Assign appropriate roles (admin, member, viewer)
- [ ] Set up on-call rotation
- [ ] Create Slack channel (#monitoring)
- [ ] Schedule weekly metrics review meeting
- [ ] Document escalation procedures

## 🎯 Production Readiness

### Pre-deployment
- [ ] All tests passing
- [ ] Sentry reporting correctly
- [ ] Metrics endpoint accessible
- [ ] Alerts configured
- [ ] Dashboards created
- [ ] Team trained on monitoring tools
- [ ] Runbooks created

### Post-deployment
- [ ] Verify production errors appear in Sentry
- [ ] Verify metrics are being scraped
- [ ] Verify alerts are triggering correctly
- [ ] Monitor for false positives
- [ ] Adjust sampling rates if needed
- [ ] Review and tune alert thresholds

## 🔄 Ongoing Maintenance

### Weekly
- [ ] Review error trends in Sentry
- [ ] Check dashboard metrics
- [ ] Review new errors
- [ ] Update alert thresholds if needed
- [ ] Check monitoring costs

### Monthly
- [ ] Review and close resolved issues
- [ ] Update runbooks based on incidents
- [ ] Review team access
- [ ] Check storage/retention settings
- [ ] Update documentation

### Quarterly
- [ ] Review overall monitoring strategy
- [ ] Evaluate new monitoring tools
- [ ] Update SLOs/SLAs
- [ ] Conduct team training
- [ ] Review and optimize costs

## 🆘 Troubleshooting

### Sentry Not Working
- [ ] Check DSN is set correctly
- [ ] Verify Sentry SDK is initialized
- [ ] Check network connectivity
- [ ] Review browser/server console for errors
- [ ] Check Sentry project settings

### Metrics Not Showing
- [ ] Verify `/api/metrics` endpoint is accessible
- [ ] Check MetricsModule is imported
- [ ] Verify metrics service is injected correctly
- [ ] Check Prometheus configuration
- [ ] Review Prometheus targets page

### Frontend Errors Not Tracked
- [ ] Check `NEXT_PUBLIC_SENTRY_DSN` is set
- [ ] Verify Sentry config files exist
- [ ] Check browser console for Sentry errors
- [ ] Disable ad blockers
- [ ] Check Content Security Policy

## 📋 Final Checklist

Before marking as complete:

- [ ] Backend Sentry working ✅
- [ ] Frontend Sentry working ✅
- [ ] Prometheus metrics accessible ✅
- [ ] Grafana dashboards created ✅
- [ ] Alerts configured ✅
- [ ] Team trained ✅
- [ ] Documentation complete ✅
- [ ] Production tested ✅

---

## Status

**Last Updated**: _____________
**Completed By**: _____________
**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Complete

---

## Notes

_Add any notes, issues, or observations here:_

---

## Support

Need help? Check:
- [MONITORING_SETUP.md](./docs/MONITORING_SETUP.md)
- [MONITORING_QUICK_START.md](./docs/MONITORING_QUICK_START.md)
- Slack: #monitoring
- Email: devops@citadelbuy.com
