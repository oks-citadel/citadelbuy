# Broxiva E-Commerce Platform - SLI/SLO Definitions

**Document Version:** 1.0
**Last Updated:** 2026-01-05
**Owner:** Site Reliability Engineering Team
**Review Cycle:** Quarterly

---

## Overview

This document defines the Service Level Indicators (SLIs) and Service Level Objectives (SLOs) for the Broxiva E-Commerce Platform. These metrics are critical for measuring system reliability and ensuring we meet customer expectations.

### Terminology

| Term | Definition |
|------|------------|
| **SLI** (Service Level Indicator) | A quantitative measure of service quality |
| **SLO** (Service Level Objective) | Target value or range for an SLI |
| **SLA** (Service Level Agreement) | A contract defining consequences of meeting/missing SLOs |
| **Error Budget** | The allowed amount of unreliability (100% - SLO) |

---

## Critical User Journeys

### 1. Product Discovery
- Browse product catalog
- Search for products
- View product details
- Filter and sort results

### 2. Shopping Cart
- Add items to cart
- Update cart quantities
- Apply coupons/discounts
- Calculate shipping

### 3. Checkout Flow
- User authentication
- Address management
- Payment processing
- Order confirmation

### 4. Order Management
- View order history
- Track shipments
- Process returns
- Customer support

---

## SLI/SLO Definitions by Service

### 1. API Service (Backend)

#### 1.1 Availability SLI/SLO

| SLI | Description | SLO Target | Error Budget (Monthly) |
|-----|-------------|------------|------------------------|
| API Availability | Percentage of successful HTTP responses (non-5xx) | 99.9% | 43.2 minutes |

**Prometheus Query:**
```promql
# Availability SLI
sum(rate(http_requests_total{status!~"5.."}[30d]))
/
sum(rate(http_requests_total[30d])) * 100
```

**Alert Thresholds:**
- Warning: Availability < 99.95% (over 1 hour)
- Critical: Availability < 99.9% (over 15 minutes)

#### 1.2 Latency SLI/SLO

| SLI | Description | SLO Target | Measurement |
|-----|-------------|------------|-------------|
| API Response Time (P50) | Median response time | < 200ms | 50th percentile |
| API Response Time (P95) | 95th percentile response time | < 500ms | 95th percentile |
| API Response Time (P99) | 99th percentile response time | < 1000ms | 99th percentile |

**Prometheus Queries:**
```promql
# P50 Latency
histogram_quantile(0.50,
  sum(rate(http_request_duration_seconds_bucket{job="backend"}[5m])) by (le)
)

# P95 Latency
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket{job="backend"}[5m])) by (le)
)

# P99 Latency
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket{job="backend"}[5m])) by (le)
)
```

**Alert Thresholds:**
- Warning: P95 > 500ms for 10 minutes
- Critical: P95 > 1000ms for 5 minutes

#### 1.3 Error Rate SLI/SLO

| SLI | Description | SLO Target |
|-----|-------------|------------|
| 5xx Error Rate | Percentage of server errors | < 0.1% |
| 4xx Error Rate | Percentage of client errors | < 5% (informational) |

**Prometheus Query:**
```promql
# 5xx Error Rate
sum(rate(http_requests_total{status=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m])) * 100
```

#### 1.4 Throughput SLI

| SLI | Description | Baseline |
|-----|-------------|----------|
| Request Rate | Requests per second | Varies by time of day |

**Prometheus Query:**
```promql
sum(rate(http_requests_total[5m]))
```

---

### 2. Database (PostgreSQL)

#### 2.1 Availability SLI/SLO

| SLI | Description | SLO Target |
|-----|-------------|------------|
| Database Availability | Database responds to health checks | 99.95% |

**Prometheus Query:**
```promql
avg_over_time(pg_up[30d]) * 100
```

#### 2.2 Query Performance SLI/SLO

| SLI | Description | SLO Target |
|-----|-------------|------------|
| Query Latency (P95) | 95th percentile query time | < 100ms |
| Slow Query Rate | Queries exceeding 1s | < 0.1% |

**Prometheus Queries:**
```promql
# Query latency
histogram_quantile(0.95,
  sum(rate(database_query_duration_seconds_bucket[5m])) by (le)
)

# Connection utilization
sum(pg_stat_activity_count) / pg_settings_max_connections * 100
```

#### 2.3 Connection Pool SLI/SLO

| SLI | Description | SLO Target |
|-----|-------------|------------|
| Connection Pool Utilization | Percentage of connections in use | < 80% |
| Connection Wait Time | Time waiting for connection | < 10ms P95 |

---

### 3. Cache (Redis)

#### 3.1 Availability SLI/SLO

| SLI | Description | SLO Target |
|-----|-------------|------------|
| Redis Availability | Redis responds to health checks | 99.95% |

**Prometheus Query:**
```promql
avg_over_time(redis_up[30d]) * 100
```

#### 3.2 Performance SLI/SLO

| SLI | Description | SLO Target |
|-----|-------------|------------|
| Cache Hit Rate | Percentage of cache hits | > 80% |
| Cache Latency (P95) | 95th percentile cache operation | < 5ms |

**Prometheus Queries:**
```promql
# Cache Hit Rate
rate(redis_keyspace_hits_total[5m])
/
(rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m])) * 100
```

#### 3.3 Memory SLI/SLO

| SLI | Description | SLO Target |
|-----|-------------|------------|
| Memory Utilization | Redis memory usage | < 85% |
| Eviction Rate | Keys evicted per second | < 10/s |

---

### 4. Search Service (Elasticsearch)

#### 4.1 Availability SLI/SLO

| SLI | Description | SLO Target |
|-----|-------------|------------|
| Elasticsearch Availability | Cluster health status | 99.9% (Green/Yellow) |

**Prometheus Query:**
```promql
elasticsearch_cluster_health_status{color="green"} == 1
or
elasticsearch_cluster_health_status{color="yellow"} == 1
```

#### 4.2 Search Performance SLI/SLO

| SLI | Description | SLO Target |
|-----|-------------|------------|
| Search Latency (P95) | 95th percentile search time | < 200ms |
| Indexing Latency | Time to index new document | < 1s |

---

### 5. Critical Business Flows

#### 5.1 Checkout Flow SLI/SLO

| SLI | Description | SLO Target |
|-----|-------------|------------|
| Checkout Success Rate | Successful checkout completions | > 98% |
| Checkout Latency (P95) | Time to complete checkout | < 5s |

**Prometheus Queries:**
```promql
# Checkout Success Rate
sum(rate(orders_total{status="completed"}[1h]))
/
sum(rate(orders_total[1h])) * 100

# Payment Success Rate
sum(rate(payments_total{status="success"}[1h]))
/
sum(rate(payments_total[1h])) * 100
```

#### 5.2 Payment Processing SLI/SLO

| SLI | Description | SLO Target |
|-----|-------------|------------|
| Payment Success Rate | Successful payment transactions | > 95% |
| Payment Processing Time (P95) | Time to process payment | < 3s |

#### 5.3 Search Experience SLI/SLO

| SLI | Description | SLO Target |
|-----|-------------|------------|
| Search Availability | Search returns results | 99.9% |
| Search Relevance | Click-through rate on first page | > 40% |

---

## Error Budget Policy

### Monthly Error Budget Calculation

```
Error Budget = (100% - SLO) * Total Time
```

For 99.9% availability over 30 days:
- Error Budget = 0.1% * 43,200 minutes = 43.2 minutes

### Error Budget Consumption Actions

| Budget Remaining | Actions Required |
|------------------|------------------|
| > 50% | Normal development velocity |
| 25-50% | Increased monitoring, risk assessment for deployments |
| 10-25% | Freeze non-critical changes, focus on reliability |
| < 10% | Emergency mode: only critical fixes deployed |
| 0% | All hands incident response |

### Error Budget Alerts

```yaml
# Prometheus Alert Rule
groups:
  - name: error_budget_alerts
    rules:
      - alert: ErrorBudgetBurn
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[1h]))
          /
          sum(rate(http_requests_total[1h])) > 0.001
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Error budget is burning at elevated rate"
          description: "Current error rate exceeds SLO threshold"
```

---

## SLO Monitoring Dashboard Panels

### Required Grafana Panels

1. **Availability Over Time**
   - 30-day rolling availability
   - Current error budget remaining
   - Error budget burn rate

2. **Latency Distribution**
   - P50, P95, P99 over time
   - Latency by endpoint
   - Latency heatmap

3. **Error Rate**
   - 5xx errors over time
   - Error rate by endpoint
   - Error spike detection

4. **Business Metrics**
   - Checkout success rate
   - Payment success rate
   - Cart abandonment rate

5. **Infrastructure Health**
   - Database connection pool
   - Cache hit rate
   - Resource utilization

---

## SLO Review Process

### Weekly Review

- [ ] Review error budget consumption
- [ ] Identify top error contributors
- [ ] Assess latency trends
- [ ] Check for SLO violations

### Monthly Review

- [ ] Calculate actual vs target SLOs
- [ ] Update error budget projections
- [ ] Review incident impact on SLOs
- [ ] Adjust SLO targets if needed

### Quarterly Review

- [ ] Comprehensive SLO health assessment
- [ ] Propose SLO adjustments
- [ ] Review error budget policy effectiveness
- [ ] Stakeholder communication on reliability

---

## Appendix A: Metric Collection Configuration

### Prometheus Scrape Config

```yaml
scrape_configs:
  - job_name: 'backend'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['backend:4000']
    scrape_interval: 15s
    scrape_timeout: 10s
```

### Application Metrics Registration

Metrics are exposed via the MetricsService at `/api/metrics`:

- `http_requests_total` - Counter with labels: method, route, status_code
- `http_request_duration_seconds` - Histogram with buckets: 0.1, 0.5, 1, 2, 5, 10
- `orders_total` - Counter with labels: status, payment_method
- `payments_total` - Counter with labels: provider, status, method
- `database_query_duration_seconds` - Histogram for DB performance

---

## Appendix B: Alert Configuration Summary

| Alert Name | Condition | Severity | Action |
|------------|-----------|----------|--------|
| ServiceDown | up == 0 for 2m | Critical | Page on-call |
| HighErrorRate | 5xx > 0.1% for 5m | Warning | Slack notification |
| HighLatency | P95 > 500ms for 10m | Warning | Slack notification |
| CriticalLatency | P95 > 1000ms for 5m | Critical | Page on-call |
| DatabaseDown | pg_up == 0 for 1m | Critical | Page on-call + DBA |
| RedisDown | redis_up == 0 for 1m | Critical | Page on-call |
| LowCacheHitRate | hit_rate < 70% for 10m | Warning | Review cache strategy |
| ErrorBudgetCritical | budget < 10% | Critical | Freeze deployments |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-05 | SRE Team | Initial SLI/SLO definitions |

---

**Contact:** sre-team@broxiva.com
**Escalation:** oncall@broxiva.com
