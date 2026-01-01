# Monitoring Quick Start Guide

Fast setup guide for Broxiva monitoring and error tracking.

## 🚀 Quick Setup (5 minutes)

### 1. Get Sentry DSN

1. Go to [https://sentry.io](https://sentry.io)
2. Create account (free tier available)
3. Create projects:
   - `broxiva-backend-production`
   - `broxiva-web-production`
4. Copy the DSN from each project settings

### 2. Configure Backend

Edit `apps/api/.env`:

```env
SENTRY_DSN=https://your-key@o0000000.ingest.sentry.io/0000000
```

Restart backend:
```bash
cd apps/api
npm run dev
```

### 3. Configure Frontend

Edit `apps/web/.env`:

```env
NEXT_PUBLIC_SENTRY_DSN=https://your-key@o0000000.ingest.sentry.io/0000000
```

Restart frontend:
```bash
cd apps/web
npm run dev
```

### 4. Test Error Tracking

**Backend Test:**
```bash
curl http://localhost:4000/api/test-error
```

**Frontend Test:**
Open browser console:
```javascript
throw new Error('Test error from frontend');
```

Check Sentry dashboard - errors should appear within seconds!

### 5. View Metrics

Access Prometheus metrics:
```bash
curl http://localhost:4000/api/metrics
```

## 📊 Monitoring Endpoints

| Service | Endpoint | Description |
|---------|----------|-------------|
| API Health | `http://localhost:4000/api/health` | Health check |
| API Metrics | `http://localhost:4000/api/metrics` | Prometheus metrics |
| API Docs | `http://localhost:4000/api/docs` | Swagger documentation |
| Sentry | `https://sentry.io` | Error tracking dashboard |

## 🔍 Common Tasks

### Track Custom Business Event

```typescript
// Backend
import { MetricsService } from '@/common/monitoring/metrics.service';

constructor(private metrics: MetricsService) {}

// Track order
this.metrics.trackOrder('completed', 'stripe', 99.99);

// Track user registration
this.metrics.trackUserRegistration('email');
```

### Log Custom Error Context

```typescript
// Backend
import { SentryService } from '@/common/monitoring/sentry.service';

constructor(private sentry: SentryService) {}

this.sentry.setContext('payment', {
  provider: 'stripe',
  amount: 99.99,
});

this.sentry.captureException(error);
```

### Frontend Error Tracking

```typescript
import * as Sentry from '@sentry/nextjs';

try {
  // risky operation
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: 'checkout' },
    extra: { cartTotal: 99.99 },
  });
}
```

## 🎯 Key Metrics to Watch

### Business Metrics
- `orders_total` - Total orders created
- `orders_value_total` - Total revenue
- `payments_failed_total` - Failed payment attempts
- `cart_abandonments_total` - Cart abandonment rate

### Performance Metrics
- `http_request_duration_seconds` - API response time
- `database_query_duration_seconds` - DB query performance
- `cache_hits_total` / `cache_misses_total` - Cache efficiency

### System Metrics
- `http_requests_total` - Request volume
- `errors_total` - Error count
- `http_requests_in_progress` - Current load

## 🚨 Setting Up Alerts

### Sentry Alerts

1. Go to Sentry project settings
2. Navigate to **Alerts** → **Create Alert**
3. Choose trigger:
   - Issue frequency (e.g., >10 events/hour)
   - Issue state change (new, regression)
4. Set action:
   - Send to Slack
   - Send email
   - Create PagerDuty incident

### Recommended Alerts

**Critical:**
- New errors in production
- Error rate >10/min
- Payment processing failures

**Warning:**
- API response time >2s
- Database query timeout
- Cache hit rate <50%

## 📈 Grafana Setup (Optional)

### Quick Start with Docker

```bash
# Start Prometheus
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Start Grafana
docker run -d \
  --name grafana \
  -p 3001:3000 \
  grafana/grafana
```

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'broxiva-api'
    static_configs:
      - targets: ['host.docker.internal:4000']
    metrics_path: '/api/metrics'
```

Access Grafana: http://localhost:3001 (admin/admin)

## 🐛 Troubleshooting

### Sentry Not Reporting Errors

1. Check DSN is set: `echo $SENTRY_DSN`
2. Check logs for Sentry initialization message
3. Verify DSN is valid in Sentry dashboard
4. Test with manual error: `Sentry.captureMessage('test')`

### Metrics Not Showing

1. Verify metrics endpoint: `curl http://localhost:4000/api/metrics`
2. Check MetricsModule is imported in app.module.ts
3. Restart the application

### Frontend Errors Not Tracked

1. Check browser console for Sentry errors
2. Verify `NEXT_PUBLIC_SENTRY_DSN` is set
3. Check Sentry config files are loaded
4. Disable ad blockers (may block Sentry)

## 📚 Full Documentation

For detailed setup and advanced features:
- [MONITORING_SETUP.md](./MONITORING_SETUP.md) - Complete monitoring guide
- [Sentry Docs](https://docs.sentry.io)
- [Prometheus Docs](https://prometheus.io/docs)

## 💡 Tips

1. **Use meaningful tags**: Add context to errors and metrics
2. **Set sampling rates**: Don't track 100% in production (expensive!)
3. **Review regularly**: Check dashboards weekly, adjust alerts monthly
4. **Document incidents**: Learn from errors, improve monitoring
5. **Sanitize data**: Never log passwords, tokens, or PII

## 🆘 Need Help?

- **Slack**: `#monitoring` channel
- **Email**: devops@broxiva.com
- **Docs**: `/docs/MONITORING_SETUP.md`

---

**Ready to monitor!** 🎉

Check your Sentry dashboard and Prometheus metrics to verify everything is working.
