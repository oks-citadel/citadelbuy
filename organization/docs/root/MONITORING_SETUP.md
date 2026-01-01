# Broxiva Monitoring & Observability Setup

Comprehensive guide for setting up error tracking, performance monitoring, and observability for the Broxiva platform.

## Table of Contents

- [Overview](#overview)
- [Sentry Error Tracking](#sentry-error-tracking)
- [Prometheus Metrics](#prometheus-metrics)
- [Performance Monitoring](#performance-monitoring)
- [Log Aggregation](#log-aggregation)
- [Application Performance Monitoring (APM)](#application-performance-monitoring-apm)
- [Alerting & Notifications](#alerting--notifications)
- [Best Practices](#best-practices)

---

## Overview

Broxiva uses a multi-layered monitoring approach:

1. **Error Tracking**: Sentry for real-time error tracking and crash reporting
2. **Metrics**: Prometheus for business and system metrics
3. **Logging**: Structured logging with support for ELK, CloudWatch, and DataDog
4. **APM**: Application Performance Monitoring for distributed tracing
5. **Synthetic Monitoring**: Uptime and availability checks

---

## Sentry Error Tracking

### Setup

#### 1. Create Sentry Account

1. Sign up at [https://sentry.io](https://sentry.io)
2. Create a new project for each environment:
   - `broxiva-backend-production`
   - `broxiva-backend-staging`
   - `broxiva-web-production`
   - `broxiva-web-staging`

#### 2. Get Your DSN

Each project will have a unique DSN (Data Source Name):

```
https://<public_key>@<organization>.ingest.sentry.io/<project_id>
```

#### 3. Configure Backend

Add to `apps/api/.env`:

```env
SENTRY_DSN=https://your-public-key@o0000000.ingest.sentry.io/0000000
NODE_ENV=production
```

The backend is already configured with:
- Automatic error tracking
- Performance monitoring (10% sampling in production)
- User context tracking
- Request/response context
- Custom tags and breadcrumbs

#### 4. Configure Frontend

Add to `apps/web/.env`:

```env
NEXT_PUBLIC_SENTRY_DSN=https://your-public-key@o0000000.ingest.sentry.io/0000000
```

The frontend includes:
- Error boundary integration
- Session replay (10% sampling)
- Performance monitoring
- User feedback collection
- Source map upload for better stack traces

### Features

#### Error Filtering

Errors are automatically filtered to reduce noise:

**Backend:**
- 400 validation errors (not reported)
- 401 authentication errors (not reported)
- 500+ server errors (always reported)

**Frontend:**
- ResizeObserver errors (ignored)
- Chunk loading errors (ignored)
- Network errors (optionally ignored)

#### User Context

Automatically tracks:
- User ID
- User email
- IP address
- Browser/device information
- Session data

#### Custom Tags

```typescript
// Backend
import { SentryService } from '@/common/monitoring/sentry.service';

constructor(private sentry: SentryService) {}

// Add custom context
this.sentry.setContext('payment', {
  provider: 'stripe',
  amount: 99.99,
  currency: 'USD',
});

// Add breadcrumb
this.sentry.addBreadcrumb({
  category: 'order',
  message: 'Order created',
  level: 'info',
  data: { orderId: '12345' },
});
```

```typescript
// Frontend
import * as Sentry from '@sentry/nextjs';

Sentry.setTag('feature', 'checkout');
Sentry.setContext('cart', {
  items: 5,
  total: 199.99,
});
```

### Alerts

Configure alerts in Sentry dashboard:

1. **High Priority** (Immediate notification):
   - New production errors
   - Error rate spike (>10 errors/min)
   - Payment processing failures

2. **Medium Priority** (Hourly digest):
   - Authentication errors
   - Database query timeouts
   - External API failures

3. **Low Priority** (Daily digest):
   - Deprecation warnings
   - Performance degradations

### Performance Monitoring

Sentry automatically tracks:
- HTTP request duration
- Database query performance
- External API calls
- Frontend page load times
- Web vitals (LCP, FID, CLS)

**Sample Rate Configuration:**

```typescript
// Production: 10% of transactions
tracesSampleRate: 0.1

// Staging/Dev: 100% of transactions
tracesSampleRate: 1.0
```

### Release Tracking

Track deployments and correlate errors with releases:

```bash
# Backend
cd apps/api
npm version patch
export SENTRY_RELEASE=$(node -p "require('./package.json').version")
sentry-cli releases new $SENTRY_RELEASE
sentry-cli releases set-commits $SENTRY_RELEASE --auto

# Frontend
cd apps/web
npm version patch
next build
sentry-cli sourcemaps upload --release=$SENTRY_RELEASE .next
```

---

## Prometheus Metrics

### Setup

#### 1. Access Metrics Endpoint

Metrics are exposed at:

```
http://localhost:4000/api/metrics
```

#### 2. Configure Prometheus

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'broxiva-api'
    static_configs:
      - targets: ['localhost:4000']
    metrics_path: '/api/metrics'
    scrape_interval: 10s
```

Start Prometheus:

```bash
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

#### 3. Set Up Grafana

```bash
docker run -d \
  --name grafana \
  -p 3001:3000 \
  grafana/grafana
```

Access: http://localhost:3001 (admin/admin)

Add Prometheus data source:
- URL: http://prometheus:9090

### Available Metrics

#### HTTP Metrics

```prometheus
# Total HTTP requests
http_requests_total{method="GET", route="/api/products", status_code="200"}

# Request duration
http_request_duration_seconds{method="POST", route="/api/orders"}

# Requests in progress
http_requests_in_progress{method="GET", route="/api/products"}
```

#### Business Metrics - Orders

```prometheus
# Total orders
orders_total{status="completed", payment_method="stripe"}

# Order value
orders_value_total{status="completed", payment_method="stripe"}

# Failed orders
orders_failed_total{reason="payment_declined"}
```

#### Business Metrics - Payments

```prometheus
# Total payments
payments_total{provider="stripe", status="succeeded", method="card"}

# Payment value
payments_value_total{provider="stripe", status="succeeded"}

# Failed payments
payments_failed_total{provider="stripe", reason="card_declined"}
```

#### Business Metrics - Products

```prometheus
# Product views
product_views_total{category="electronics"}

# Product searches
product_searches_total{search_provider="elasticsearch"}

# Cart operations
cart_additions_total
cart_abandonments_total
```

#### Business Metrics - Users

```prometheus
# User registrations
user_registrations_total{method="email"}

# User logins
user_logins_total{method="password"}

# Login failures
user_logins_failed_total{reason="invalid_credentials"}
```

#### System Metrics

```prometheus
# Errors
errors_total{type="database", severity="error"}

# Database queries
database_query_duration_seconds{operation="select", table="products"}

# Cache operations
cache_hits_total{cache_name="redis"}
cache_misses_total{cache_name="redis"}
```

### Usage Examples

#### Track Business Events

```typescript
import { MetricsService } from '@/common/monitoring/metrics.service';

constructor(private metrics: MetricsService) {}

// Track order
await this.createOrder(orderData);
this.metrics.trackOrder('completed', 'stripe', orderTotal);

// Track payment
const result = await this.processPayment(payment);
this.metrics.trackPayment('stripe', 'succeeded', 'card', amount);

// Track product view
this.metrics.trackProductView('electronics');

// Track user registration
this.metrics.trackUserRegistration('email');
```

### Grafana Dashboards

#### Import Pre-built Dashboards

1. **Broxiva Overview**
   - Request rate and latency
   - Error rates
   - Active users
   - Business KPIs

2. **Orders & Payments**
   - Order creation rate
   - Payment success rate
   - Revenue metrics
   - Failed transactions

3. **System Health**
   - CPU, memory, disk usage
   - Database performance
   - Cache hit rate
   - API response times

#### Sample Queries

```prometheus
# Request rate per minute
rate(http_requests_total[1m])

# Error rate
rate(errors_total[5m])

# Average response time
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# Orders per hour
increase(orders_total[1h])

# Revenue per day
increase(orders_value_total[1d])

# Cache hit rate
rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
```

---

## Performance Monitoring

### Frontend Performance

#### Web Vitals Tracking

Automatically tracked by Sentry:

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **TTFB (Time to First Byte)**: < 600ms

#### Custom Performance Marks

```typescript
// Mark important moments
performance.mark('checkout-start');
// ... checkout logic ...
performance.mark('checkout-end');
performance.measure('checkout-duration', 'checkout-start', 'checkout-end');
```

### Backend Performance

#### Transaction Tracing

```typescript
import { SentryService } from '@/common/monitoring/sentry.service';

const transaction = this.sentry.startTransaction({
  op: 'order.create',
  name: 'Create Order',
});

const span = transaction.startChild({
  op: 'db.query',
  description: 'Insert order into database',
});

// ... database operation ...

span.finish();
transaction.finish();
```

#### Database Query Performance

```typescript
const startTime = Date.now();
const result = await this.prisma.product.findMany();
const duration = (Date.now() - startTime) / 1000;

this.metrics.trackDatabaseQuery('select', 'products', duration);
```

---

## Log Aggregation

### Recommended Solutions

#### 1. ELK Stack (Elasticsearch, Logstash, Kibana)

**Setup:**

```yaml
# docker-compose.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5000:5000"
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
```

**Logstash Configuration:**

```ruby
# logstash.conf
input {
  tcp {
    port => 5000
    codec => json
  }
}

filter {
  if [level] == "error" {
    mutate {
      add_tag => ["error"]
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "broxiva-logs-%{+YYYY.MM.dd}"
  }
}
```

**Backend Integration:**

```typescript
// Configure Winston logger to send to Logstash
import * as winston from 'winston';
import 'winston-logstash';

const logger = winston.createLogger({
  transports: [
    new winston.transports.Logstash({
      port: 5000,
      host: 'localhost',
      node_name: 'broxiva-api',
    }),
  ],
});
```

#### 2. AWS CloudWatch

**Setup:**

```typescript
// Install AWS SDK
npm install @aws-sdk/client-cloudwatch-logs

// Configure CloudWatch logger
import { CloudWatchLogsClient, PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

const client = new CloudWatchLogsClient({ region: 'us-east-1' });

async function sendToCloudWatch(message: string, level: string) {
  await client.send(new PutLogEventsCommand({
    logGroupName: '/broxiva/api',
    logStreamName: 'production',
    logEvents: [{
      message,
      timestamp: Date.now(),
    }],
  }));
}
```

**Infrastructure as Code (Terraform):**

```hcl
resource "aws_cloudwatch_log_group" "broxiva_api" {
  name              = "/broxiva/api"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_stream" "production" {
  name           = "production"
  log_group_name = aws_cloudwatch_log_group.broxiva_api.name
}
```

#### 3. DataDog

**Setup:**

```bash
# Install DataDog agent
DD_API_KEY=<your-api-key> DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"
```

**Backend Integration:**

```typescript
import { datadogLogs } from '@datadog/browser-logs';

datadogLogs.init({
  clientToken: process.env.DD_CLIENT_TOKEN,
  site: 'datadoghq.com',
  forwardErrorsToLogs: true,
  sampleRate: 100,
});

datadogLogs.logger.info('Order created', {
  orderId: '12345',
  amount: 99.99,
  customerId: 'cust_123',
});
```

### Log Structure

Use structured JSON logging:

```json
{
  "timestamp": "2025-12-03T10:30:00.000Z",
  "level": "info",
  "message": "Order created successfully",
  "service": "broxiva-api",
  "environment": "production",
  "context": {
    "orderId": "order_123",
    "userId": "user_456",
    "amount": 99.99,
    "paymentMethod": "stripe"
  },
  "trace": {
    "traceId": "abc123",
    "spanId": "def456"
  }
}
```

---

## Application Performance Monitoring (APM)

### Recommended Solutions

#### 1. New Relic

**Setup:**

```bash
npm install newrelic
```

**Configuration:**

```javascript
// newrelic.js
exports.config = {
  app_name: ['Broxiva API'],
  license_key: 'your-license-key',
  distributed_tracing: {
    enabled: true,
  },
  transaction_tracer: {
    enabled: true,
    transaction_threshold: 'apdex_f',
  },
};
```

**Integration:**

```typescript
// main.ts
require('newrelic');
```

#### 2. DataDog APM

**Setup:**

```bash
npm install dd-trace
```

**Configuration:**

```typescript
// tracer.ts
import tracer from 'dd-trace';

tracer.init({
  service: 'broxiva-api',
  env: process.env.NODE_ENV,
  version: process.env.npm_package_version,
  logInjection: true,
});

export default tracer;
```

**Integration:**

```typescript
// main.ts
import './tracer';
```

#### 3. Sentry Performance

Already integrated! Sentry provides:
- Transaction tracing
- Database query monitoring
- External API call tracking
- Custom instrumentation

---

## Alerting & Notifications

### Alert Channels

Configure multiple channels for different severities:

1. **Critical Alerts** (PagerDuty, Phone):
   - API downtime
   - Payment processing failures
   - Data loss

2. **High Priority** (Slack, Email):
   - Error rate spike
   - Database connection issues
   - High response times (>2s)

3. **Medium Priority** (Email):
   - Cart abandonment increase
   - Search failures
   - Cache misses spike

4. **Low Priority** (Dashboard only):
   - Slow queries
   - Deprecation warnings

### Alert Rules

#### Prometheus Alert Rules

```yaml
# alerts.yml
groups:
  - name: broxiva
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"

      # High response time
      - alert: HighResponseTime
        expr: |
          rate(http_request_duration_seconds_sum[5m])
          / rate(http_request_duration_seconds_count[5m]) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API response time"
          description: "Average response time is {{ $value }}s"

      # Low cache hit rate
      - alert: LowCacheHitRate
        expr: |
          rate(cache_hits_total[5m])
          / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m])) < 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value }}"

      # Payment failures
      - alert: HighPaymentFailureRate
        expr: |
          rate(payments_failed_total[5m])
          / rate(payments_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High payment failure rate"
          description: "{{ $value }}% of payments are failing"
```

#### Sentry Alert Rules

Configure in Sentry dashboard:

1. **Issue Alerts**:
   - First seen in production
   - Regression (previously resolved)
   - High volume (>100 events/hour)

2. **Metric Alerts**:
   - Error rate > 1% of all transactions
   - Transaction duration > 2s for p95
   - Apdex score < 0.8

### Notification Templates

#### Slack Notification

```json
{
  "text": "🚨 Critical Alert: High Error Rate",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Environment:* Production\n*Severity:* Critical\n*Metric:* Error Rate\n*Value:* 15 errors/sec\n*Threshold:* 10 errors/sec"
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "View in Sentry" },
          "url": "https://sentry.io/..."
        }
      ]
    }
  ]
}
```

---

## Best Practices

### 1. Error Handling

**Do:**
- ✅ Catch and log all errors
- ✅ Add relevant context
- ✅ Use appropriate log levels
- ✅ Include stack traces for errors
- ✅ Sanitize sensitive data

**Don't:**
- ❌ Swallow errors silently
- ❌ Log passwords or tokens
- ❌ Use generic error messages
- ❌ Report non-errors as errors

### 2. Performance Monitoring

**Do:**
- ✅ Monitor critical user journeys
- ✅ Set performance budgets
- ✅ Track slow database queries
- ✅ Monitor external API latency
- ✅ Optimize based on data

**Don't:**
- ❌ Monitor everything (sample instead)
- ❌ Ignore frontend performance
- ❌ Set unrealistic SLAs
- ❌ Forget mobile performance

### 3. Metrics Collection

**Do:**
- ✅ Use meaningful metric names
- ✅ Add relevant labels/tags
- ✅ Track business KPIs
- ✅ Set up dashboards
- ✅ Review metrics regularly

**Don't:**
- ❌ Create too many metrics (cardinality explosion)
- ❌ Use high-cardinality labels (user IDs, etc.)
- ❌ Ignore metric storage costs
- ❌ Forget to document metrics

### 4. Alerting

**Do:**
- ✅ Set actionable alerts
- ✅ Tune thresholds based on data
- ✅ Route to appropriate channels
- ✅ Include runbooks in alerts
- ✅ Review and adjust regularly

**Don't:**
- ❌ Create too many alerts (alert fatigue)
- ❌ Alert on symptoms, not root causes
- ❌ Ignore alert storm detection
- ❌ Forget to acknowledge and resolve

### 5. Security & Privacy

**Do:**
- ✅ Sanitize PII from logs
- ✅ Encrypt logs in transit and at rest
- ✅ Set appropriate retention policies
- ✅ Comply with GDPR/CCPA
- ✅ Audit access to monitoring data

**Don't:**
- ❌ Log credit card numbers
- ❌ Log full request/response bodies
- ❌ Keep logs forever
- ❌ Grant broad access to logs

---

## Monitoring Checklist

### Initial Setup
- [ ] Sentry account created and configured
- [ ] Prometheus installed and scraping metrics
- [ ] Grafana dashboards created
- [ ] Log aggregation set up (ELK/CloudWatch/DataDog)
- [ ] Alert rules configured
- [ ] Notification channels set up
- [ ] On-call rotation established

### Development
- [ ] Errors reported to Sentry
- [ ] Business metrics tracked
- [ ] Structured logging implemented
- [ ] Performance instrumentation added
- [ ] Tests include monitoring validation

### Production
- [ ] All services reporting to monitoring
- [ ] Dashboards visible to team
- [ ] Alerts configured and tested
- [ ] Runbooks created for common issues
- [ ] Regular review of metrics and alerts
- [ ] Post-incident reviews conducted
- [ ] Continuous improvement process

---

## Resources

### Documentation
- [Sentry Documentation](https://docs.sentry.io/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [OpenTelemetry](https://opentelemetry.io/)

### Tools
- [Sentry CLI](https://docs.sentry.io/product/cli/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Alerting](https://grafana.com/docs/grafana/latest/alerting/)

### Best Practices
- [Google SRE Book](https://sre.google/books/)
- [The Art of Monitoring](https://artofmonitoring.com/)
- [Observability Engineering](https://www.oreilly.com/library/view/observability-engineering/9781492076438/)

---

## Support

For monitoring-related questions or issues:

- **Documentation**: `docs/MONITORING_SETUP.md`
- **Team Channel**: `#monitoring` on Slack
- **Runbooks**: `docs/runbooks/`
- **Dashboards**: Grafana at `https://grafana.broxiva.com`

---

**Last Updated**: December 2025
**Maintained By**: DevOps Team
**Version**: 1.0.0
