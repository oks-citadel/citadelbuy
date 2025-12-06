# CitadelBuy Monitoring and Alerting Guide

**Version:** 1.0.0
**Last Updated:** December 4, 2025
**Owner:** Platform Engineering & SRE Team

---

## Table of Contents

1. [Overview](#overview)
2. [Monitoring Stack](#monitoring-stack)
3. [Metrics to Monitor](#metrics-to-monitor)
4. [Alert Thresholds](#alert-thresholds)
5. [Alert Configuration](#alert-configuration)
6. [Dashboards](#dashboards)
7. [On-Call Procedures](#on-call-procedures)
8. [Incident Response](#incident-response)
9. [Log Management](#log-management)
10. [Performance Monitoring](#performance-monitoring)

---

## Overview

This document outlines the comprehensive monitoring and alerting strategy for CitadelBuy's production environment. Our monitoring philosophy follows the principles of:

- **Observability**: Understand system behavior through metrics, logs, and traces
- **Proactive Detection**: Identify issues before they impact users
- **Actionable Alerts**: Every alert must be actionable and require human intervention
- **Reduce Noise**: Minimize false positives through proper thresholds

### Monitoring Objectives

- **Uptime**: 99.9% service availability
- **Performance**: P95 response time < 500ms
- **Error Rate**: < 0.1% of requests
- **Alert Response**: < 5 minutes acknowledgment
- **MTTR**: < 30 minutes mean time to recovery

---

## Monitoring Stack

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   MONITORING ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐    │
│  │   API    │   │   Web    │   │  Worker  │   │PostgreSQL│    │
│  │  Pods    │   │  Pods    │   │  Pods    │   │          │    │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘    │
│       │              │              │              │            │
│       └──────────────┴──────────────┴──────────────┘            │
│                      │                                           │
│              ┌───────▼────────┐                                 │
│              │  Prometheus    │                                 │
│              │   (Metrics)    │                                 │
│              └───────┬────────┘                                 │
│                      │                                           │
│       ┌──────────────┼──────────────┐                           │
│       │              │              │                           │
│  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐                     │
│  │ Grafana  │  │AlertMgr  │  │ Sentry   │                     │
│  │(Visualize)  │(Alerts)  │  │ (Errors) │                     │
│  └──────────┘  └────┬─────┘  └──────────┘                     │
│                      │                                           │
│              ┌───────▼────────┐                                 │
│              │   PagerDuty    │                                 │
│              │  Slack  Email  │                                 │
│              └────────────────┘                                 │
│                                                                  │
│  ┌──────────────────────────────────────┐                       │
│  │         Log Aggregation              │                       │
│  │  Fluentd → Elasticsearch → Kibana    │                       │
│  │         Azure Log Analytics          │                       │
│  └──────────────────────────────────────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Purpose | Access URL |
|-----------|---------|------------|
| **Prometheus** | Metrics collection | https://prometheus.citadelbuy.com |
| **Grafana** | Visualization & dashboards | https://grafana.citadelbuy.com |
| **Alert Manager** | Alert routing | Internal |
| **Sentry** | Error tracking | https://sentry.io/citadelbuy |
| **Kibana** | Log exploration | https://kibana.citadelbuy.com |
| **Azure Monitor** | Cloud resource monitoring | portal.azure.com |
| **PagerDuty** | On-call management | https://citadelbuy.pagerduty.com |

---

## Metrics to Monitor

### 1. Application Metrics

#### API Performance Metrics

```yaml
# Metric name: http_request_duration_seconds
# Type: Histogram
# Labels: method, route, status_code
# Description: HTTP request duration in seconds

http_request_duration_seconds_bucket{
  method="GET",
  route="/api/products",
  status_code="200",
  le="0.5"
} 950

# Alert on P95 > 500ms
# Thresholds:
#   - Warning: P95 > 500ms
#   - Critical: P95 > 1000ms
```

```yaml
# Metric name: http_requests_total
# Type: Counter
# Labels: method, route, status_code
# Description: Total HTTP requests

http_requests_total{
  method="POST",
  route="/api/orders",
  status_code="201"
} 15234

# Alert on error rate > 1%
# Thresholds:
#   - Warning: 5xx errors > 1%
#   - Critical: 5xx errors > 5%
```

#### Business Metrics

```yaml
# Orders per minute
orders_created_total 1523

# Revenue per hour (in cents)
revenue_total_cents 4562340

# Active users (last 5 minutes)
active_users_count 234

# Cart abandonment rate
cart_abandonment_rate 0.65

# Payment success rate
payment_success_rate 0.982

# Average order value (in cents)
average_order_value_cents 8950
```

### 2. Infrastructure Metrics

#### Kubernetes Metrics

```yaml
# Pod resource usage
container_cpu_usage_seconds_total
container_memory_usage_bytes
container_network_receive_bytes_total
container_network_transmit_bytes_total

# Pod status
kube_pod_status_phase{phase="Running"}
kube_pod_container_status_restarts_total

# Node metrics
kube_node_status_condition{condition="Ready"}
kube_node_status_capacity_cpu_cores
kube_node_status_capacity_memory_bytes

# HPA metrics
kube_horizontalpodautoscaler_status_current_replicas
kube_horizontalpodautoscaler_status_desired_replicas
```

#### Database Metrics (PostgreSQL)

```yaml
# Connection pool
pg_stat_database_numbackends
pg_stat_database_xact_commit
pg_stat_database_xact_rollback

# Performance
pg_stat_database_blks_read
pg_stat_database_blks_hit
pg_stat_database_tup_returned
pg_stat_database_tup_fetched

# Replication lag
pg_replication_lag_seconds

# Slow queries
pg_slow_queries_total
```

#### Redis Metrics

```yaml
# Memory
redis_memory_used_bytes
redis_memory_max_bytes

# Performance
redis_commands_processed_total
redis_keyspace_hits_total
redis_keyspace_misses_total

# Connections
redis_connected_clients
redis_blocked_clients

# Cache hit rate
(redis_keyspace_hits_total /
 (redis_keyspace_hits_total + redis_keyspace_misses_total)) * 100
```

### 3. External Service Metrics

```yaml
# Stripe API calls
stripe_api_calls_total{status="success"}
stripe_api_duration_seconds

# SendGrid email delivery
sendgrid_emails_sent_total
sendgrid_emails_delivered_total
sendgrid_emails_bounced_total

# S3 operations
s3_operations_total{operation="PutObject"}
s3_operation_duration_seconds

# Elasticsearch queries
elasticsearch_query_duration_seconds
elasticsearch_index_docs_total
```

---

## Alert Thresholds

### Critical Alerts (P1)

| Metric | Threshold | Duration | Action |
|--------|-----------|----------|--------|
| **API Down** | Health check failing | 2 minutes | Page on-call immediately |
| **Database Down** | Cannot connect | 1 minute | Page on-call + DBA |
| **Error Rate High** | > 5% 5xx errors | 5 minutes | Page on-call |
| **Response Time Critical** | P95 > 2 seconds | 10 minutes | Page on-call |
| **Pod Crash Loop** | Restart count > 5 | 5 minutes | Page on-call |
| **Disk Space Critical** | > 90% used | 5 minutes | Page on-call |
| **Payment Failures** | Success rate < 90% | 5 minutes | Page on-call + notify payments team |

### High Priority Alerts (P2)

| Metric | Threshold | Duration | Action |
|--------|-----------|----------|--------|
| **High Error Rate** | > 1% 5xx errors | 10 minutes | Slack + email |
| **Slow Response Time** | P95 > 500ms | 15 minutes | Slack + email |
| **High CPU Usage** | > 80% | 15 minutes | Slack |
| **High Memory Usage** | > 85% | 15 minutes | Slack |
| **Database Connections High** | > 80% of pool | 10 minutes | Slack |
| **Redis Memory High** | > 85% | 10 minutes | Slack |
| **Queue Backlog** | > 1000 jobs | 30 minutes | Slack |

### Warning Alerts (P3)

| Metric | Threshold | Duration | Action |
|--------|-----------|----------|--------|
| **Moderate Error Rate** | > 0.5% 5xx errors | 30 minutes | Email |
| **Increased Response Time** | P95 > 300ms | 30 minutes | Email |
| **Resource Usage** | CPU/Memory > 70% | 30 minutes | Email |
| **Disk Space Warning** | > 80% used | 1 hour | Email |
| **Backup Failed** | Last backup > 25 hours | N/A | Email |
| **Certificate Expiring** | < 30 days | Daily | Email |

---

## Alert Configuration

### Prometheus Alert Rules

```yaml
# alerts/api-alerts.yaml
groups:
  - name: api-health
    interval: 30s
    rules:
      # Critical: API Down
      - alert: APIDown
        expr: up{job="citadelbuy-api"} == 0
        for: 2m
        labels:
          severity: critical
          priority: P1
        annotations:
          summary: "API service is down"
          description: "API service {{ $labels.instance }} has been down for 2 minutes"
          runbook: "https://docs.citadelbuy.com/runbooks/api-down"

      # Critical: High Error Rate
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status_code=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) * 100 > 5
        for: 5m
        labels:
          severity: critical
          priority: P1
        annotations:
          summary: "High 5xx error rate"
          description: "Error rate is {{ $value | humanizePercentage }} over last 5 minutes"
          runbook: "https://docs.citadelbuy.com/runbooks/high-error-rate"

      # High Priority: Slow Response Time
      - alert: SlowResponseTime
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[15m])) by (le, route)
          ) > 0.5
        for: 15m
        labels:
          severity: high
          priority: P2
        annotations:
          summary: "Slow API response time"
          description: "P95 response time for {{ $labels.route }} is {{ $value | humanizeDuration }}"
          runbook: "https://docs.citadelbuy.com/runbooks/slow-response"

      # High Priority: High Request Rate
      - alert: HighRequestRate
        expr: |
          sum(rate(http_requests_total[5m])) > 1000
        for: 10m
        labels:
          severity: high
          priority: P2
        annotations:
          summary: "Unusually high request rate"
          description: "Request rate is {{ $value }} req/sec (possible DDoS)"
          runbook: "https://docs.citadelbuy.com/runbooks/high-traffic"
```

```yaml
# alerts/database-alerts.yaml
groups:
  - name: database-health
    interval: 30s
    rules:
      # Critical: Database Down
      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
          priority: P1
        annotations:
          summary: "PostgreSQL database is down"
          description: "Database {{ $labels.instance }} has been down for 1 minute"
          runbook: "https://docs.citadelbuy.com/runbooks/database-down"

      # Critical: High Connection Usage
      - alert: DatabaseConnectionsHigh
        expr: |
          (
            pg_stat_database_numbackends
            /
            pg_settings_max_connections
          ) * 100 > 80
        for: 10m
        labels:
          severity: critical
          priority: P1
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "{{ $value | humanizePercentage }} of connections in use"
          runbook: "https://docs.citadelbuy.com/runbooks/db-connections"

      # High Priority: Slow Queries
      - alert: SlowQueries
        expr: |
          rate(pg_slow_queries_total[5m]) > 10
        for: 15m
        labels:
          severity: high
          priority: P2
        annotations:
          summary: "High rate of slow queries"
          description: "{{ $value }} slow queries per second"
          runbook: "https://docs.citadelbuy.com/runbooks/slow-queries"

      # High Priority: Replication Lag
      - alert: ReplicationLag
        expr: pg_replication_lag_seconds > 300
        for: 10m
        labels:
          severity: high
          priority: P2
        annotations:
          summary: "Database replication lag is high"
          description: "Replication lag is {{ $value | humanizeDuration }}"
          runbook: "https://docs.citadelbuy.com/runbooks/replication-lag"
```

```yaml
# alerts/kubernetes-alerts.yaml
groups:
  - name: kubernetes-health
    interval: 30s
    rules:
      # Critical: Pod Crash Loop
      - alert: PodCrashLoop
        expr: |
          rate(kube_pod_container_status_restarts_total[15m]) > 0.3
        for: 5m
        labels:
          severity: critical
          priority: P1
        annotations:
          summary: "Pod {{ $labels.pod }} is crash looping"
          description: "Pod has restarted {{ $value }} times in last 15 minutes"
          runbook: "https://docs.citadelbuy.com/runbooks/pod-crash"

      # Critical: Node Not Ready
      - alert: NodeNotReady
        expr: kube_node_status_condition{condition="Ready",status="true"} == 0
        for: 5m
        labels:
          severity: critical
          priority: P1
        annotations:
          summary: "Kubernetes node {{ $labels.node }} is not ready"
          description: "Node has been not ready for 5 minutes"
          runbook: "https://docs.citadelbuy.com/runbooks/node-not-ready"

      # High Priority: High CPU Usage
      - alert: HighCPUUsage
        expr: |
          (
            sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) by (pod)
            /
            sum(kube_pod_container_resource_limits{resource="cpu"}) by (pod)
          ) * 100 > 80
        for: 15m
        labels:
          severity: high
          priority: P2
        annotations:
          summary: "Pod {{ $labels.pod }} has high CPU usage"
          description: "CPU usage is {{ $value | humanizePercentage }}"
          runbook: "https://docs.citadelbuy.com/runbooks/high-cpu"

      # High Priority: High Memory Usage
      - alert: HighMemoryUsage
        expr: |
          (
            sum(container_memory_usage_bytes{container!=""}) by (pod)
            /
            sum(kube_pod_container_resource_limits{resource="memory"}) by (pod)
          ) * 100 > 85
        for: 15m
        labels:
          severity: high
          priority: P2
        annotations:
          summary: "Pod {{ $labels.pod }} has high memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"
          runbook: "https://docs.citadelbuy.com/runbooks/high-memory"
```

### Alert Manager Configuration

```yaml
# alertmanager.yaml
global:
  resolve_timeout: 5m
  slack_api_url: ${SLACK_WEBHOOK_URL}
  pagerduty_url: https://events.pagerduty.com/v2/enqueue

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'

  routes:
    # Critical alerts go to PagerDuty
    - match:
        priority: P1
      receiver: 'pagerduty-critical'
      continue: true

    # High priority to Slack
    - match:
        priority: P2
      receiver: 'slack-high-priority'
      continue: true

    # Warnings to email
    - match:
        priority: P3
      receiver: 'email-team'

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: ${PAGERDUTY_SERVICE_KEY}
        severity: critical
        description: '{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}'
        details:
          firing: '{{ .Alerts.Firing | len }}'
          resolved: '{{ .Alerts.Resolved | len }}'

    slack_configs:
      - channel: '#incidents'
        color: 'danger'
        title: ':rotating_light: CRITICAL ALERT'
        text: |
          *Alert:* {{ .GroupLabels.alertname }}
          *Summary:* {{ .CommonAnnotations.summary }}
          *Runbook:* {{ .CommonAnnotations.runbook }}

  - name: 'slack-high-priority'
    slack_configs:
      - channel: '#alerts'
        color: 'warning'
        title: ':warning: High Priority Alert'
        text: |
          *Alert:* {{ .GroupLabels.alertname }}
          *Summary:* {{ .CommonAnnotations.summary }}
          *Description:* {{ .CommonAnnotations.description }}

  - name: 'email-team'
    email_configs:
      - to: 'devops@citadelbuy.com'
        from: 'alerts@citadelbuy.com'
        smarthost: 'smtp.sendgrid.net:587'
        auth_username: 'apikey'
        auth_password: ${SENDGRID_API_KEY}
        headers:
          Subject: '[CitadelBuy Alert] {{ .GroupLabels.alertname }}'

inhibit_rules:
  # Inhibit warning if critical is firing
  - source_match:
      priority: 'P1'
    target_match:
      priority: 'P2'
    equal: ['alertname', 'instance']
```

---

## Dashboards

### Grafana Dashboard URLs

| Dashboard | Purpose | URL |
|-----------|---------|-----|
| **Main Overview** | High-level system health | /d/main-overview |
| **API Performance** | API metrics and latency | /d/api-performance |
| **Database** | PostgreSQL metrics | /d/database-metrics |
| **Kubernetes** | Pod and node metrics | /d/kubernetes-cluster |
| **Business Metrics** | Orders, revenue, users | /d/business-metrics |
| **Error Tracking** | Error rates and types | /d/error-tracking |

### Main Overview Dashboard

```json
{
  "dashboard": {
    "title": "CitadelBuy Main Overview",
    "panels": [
      {
        "title": "Service Health",
        "targets": [
          {
            "expr": "up{job=\"citadelbuy-api\"}",
            "legendFormat": "API"
          },
          {
            "expr": "up{job=\"postgres\"}",
            "legendFormat": "Database"
          },
          {
            "expr": "up{job=\"redis\"}",
            "legendFormat": "Redis"
          }
        ]
      },
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m]))",
            "legendFormat": "Requests/sec"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status_code=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100",
            "legendFormat": "5xx Error %"
          }
        ]
      },
      {
        "title": "Response Time (P95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "P95 Latency"
          }
        ]
      },
      {
        "title": "Active Users",
        "targets": [
          {
            "expr": "active_users_count",
            "legendFormat": "Active Users"
          }
        ]
      },
      {
        "title": "Orders per Minute",
        "targets": [
          {
            "expr": "rate(orders_created_total[1m]) * 60",
            "legendFormat": "Orders/min"
          }
        ]
      }
    ]
  }
}
```

---

## On-Call Procedures

### On-Call Schedule

- **Rotation**: Weekly (Monday 9:00 AM to Monday 9:00 AM)
- **Coverage**: 24/7 including weekends and holidays
- **Handoff**: Monday morning standup
- **Backup**: Secondary on-call for escalation

### On-Call Responsibilities

#### During Business Hours (9 AM - 6 PM)

- Respond to alerts within 5 minutes
- Monitor #alerts Slack channel
- Participate in incident response
- Handle urgent production issues
- Coordinate with team on fixes

#### After Hours (6 PM - 9 AM) & Weekends

- Respond to P1/P2 alerts within 15 minutes
- Be available by phone and laptop
- Escalate if needed
- Document all actions taken

### Alert Response Process

1. **Acknowledge** (< 5 min)
   - Acknowledge in PagerDuty
   - Post in #incidents Slack channel
   - Assess severity

2. **Investigate** (5-15 min)
   - Check Grafana dashboards
   - Review recent deployments
   - Check error logs in Sentry/Kibana
   - Identify root cause

3. **Communicate** (15-30 min)
   - Update #incidents with findings
   - Escalate if needed
   - Provide ETAs for resolution

4. **Resolve** (Variable)
   - Implement fix or mitigation
   - Verify resolution
   - Continue monitoring

5. **Post-Mortem** (24-48 hours)
   - Document incident
   - Identify improvements
   - Update runbooks

---

## Incident Response

See [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) for detailed procedures.

### Quick Response Guide

| Alert | First Steps | Escalation |
|-------|-------------|------------|
| **API Down** | Check pod status, review logs, restart if needed | Platform Lead (15 min) |
| **Database Down** | Check connection, verify credentials, check disk space | DBA + Platform Lead (5 min) |
| **High Error Rate** | Check recent deployments, review error logs | Platform Lead (30 min) |
| **Slow Response** | Check resource usage, database queries, cache | Platform Lead (30 min) |
| **Payment Failure** | Check Stripe status, review webhook logs | Payments Team + Platform Lead (15 min) |

---

## Log Management

### Log Collection

```yaml
# fluentd-config.yaml
<source>
  @type tail
  path /var/log/containers/*.log
  pos_file /var/log/fluentd-containers.log.pos
  tag kubernetes.*
  read_from_head true
  <parse>
    @type json
    time_format %Y-%m-%dT%H:%M:%S.%NZ
  </parse>
</source>

<filter kubernetes.**>
  @type kubernetes_metadata
  @id filter_kube_metadata
</filter>

<match kubernetes.**>
  @type elasticsearch
  host elasticsearch.citadelbuy.svc.cluster.local
  port 9200
  logstash_format true
  logstash_prefix citadelbuy
  <buffer>
    @type file
    path /var/log/fluentd-buffers/kubernetes.system.buffer
    flush_mode interval
    retry_type exponential_backoff
    flush_interval 5s
    retry_max_interval 30s
    chunk_limit_size 2M
    queue_limit_length 8
    overflow_action block
  </buffer>
</match>
```

### Log Retention

| Log Type | Retention | Storage |
|----------|-----------|---------|
| **Application Logs** | 30 days | Elasticsearch |
| **System Logs** | 90 days | Azure Log Analytics |
| **Audit Logs** | 365 days | Azure Blob Storage (immutable) |
| **Security Logs** | 365 days | Azure Blob Storage (immutable) |

---

## Performance Monitoring

### Synthetic Monitoring

```bash
# Uptime checks every 1 minute
*/1 * * * * curl -f https://api.citadelbuy.com/api/health || echo "Health check failed"

# Critical user flows every 5 minutes
*/5 * * * * /scripts/synthetic-tests.sh
```

### Real User Monitoring (RUM)

Track actual user experience metrics:
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)
- Time to Interactive (TTI)

---

**Document Version History:**

- v1.0.0 (December 4, 2025): Initial monitoring and alerting guide
