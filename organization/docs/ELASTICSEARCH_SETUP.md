# Elasticsearch Production Setup Guide

## Overview

This guide covers the production deployment, configuration, and management of Elasticsearch for the CitadelBuy e-commerce platform. Elasticsearch provides powerful full-text search, faceting, autocomplete, and analytics capabilities.

## Table of Contents

1. [Architecture](#architecture)
2. [Requirements](#requirements)
3. [Installation & Setup](#installation--setup)
4. [Security Configuration](#security-configuration)
5. [Index Management](#index-management)
6. [Performance Tuning](#performance-tuning)
7. [Backup & Restore](#backup--restore)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance](#maintenance)

---

## Architecture

### Cluster Configuration

**Production Cluster Setup (3-node minimum):**

```
┌────────────────────────────────────────────┐
│          Load Balancer / Nginx             │
└──────────┬──────────────┬──────────────────┘
           │              │
    ┌──────▼──────┐ ┌────▼──────┐ ┌──────────┐
    │  ES Node 1  │ │ ES Node 2 │ │ES Node 3 │
    │ Master+Data │ │Master+Data│ │   Data   │
    └─────────────┘ └───────────┘ └──────────┘
```

### Node Roles

- **Master Nodes (2)**: Cluster coordination, index management
- **Data Nodes (1-3)**: Store data and handle search/indexing
- **Ingest Nodes**: Pre-process documents before indexing (optional)

### Index Structure

```
citadelbuy-production-products       # Product search
citadelbuy-production-orders         # Order search
citadelbuy-production-search-analytics # Search tracking
```

---

## Requirements

### System Requirements

**Per Node:**
- **CPU**: 4-8 cores (minimum 2 cores)
- **RAM**: 8-16 GB (minimum 4 GB)
- **Disk**: 100+ GB SSD (RAID 10 recommended)
- **Network**: 1 Gbps+

### Software Requirements

- **Elasticsearch**: 8.11.0+
- **Kibana**: 8.11.0 (same version as Elasticsearch)
- **Docker**: 20.10+ (if using containers)
- **Java**: Bundled with Elasticsearch

### OS Requirements

**Linux (Recommended):**
```bash
# Set vm.max_map_count
sudo sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf

# Disable swap
sudo swapoff -a

# Set file descriptor limits
ulimit -n 65536
```

---

## Installation & Setup

### Option 1: Docker Compose (Recommended)

#### Step 1: Generate SSL Certificates

```bash
cd infrastructure/docker
./scripts/setup-elasticsearch-certs.sh
```

#### Step 2: Configure Environment Variables

```bash
# Create .env file
cat > .env << EOF
# Elasticsearch Cluster
ELASTICSEARCH_PASSWORD=$(openssl rand -base64 32)
CLUSTER_NAME=citadelbuy-production
NODE_NAME=es-node-01

# Kibana
KIBANA_ENCRYPTION_KEY=$(openssl rand -base64 32)
KIBANA_REPORTING_ENCRYPTION_KEY=$(openssl rand -base64 32)
EOF

# IMPORTANT: Save these passwords securely!
```

#### Step 3: Start Elasticsearch Cluster

```bash
# Start 3-node cluster
docker-compose -f docker-compose.elasticsearch-prod.yml up -d

# Wait for cluster to be healthy (2-3 minutes)
docker logs -f citadelbuy-elasticsearch-01
```

#### Step 4: Setup Passwords

```bash
# Auto-generate passwords for built-in users
docker exec citadelbuy-elasticsearch-01 \
  bin/elasticsearch-setup-passwords auto

# Save all generated passwords securely!
```

#### Step 5: Verify Cluster Health

```bash
# Check cluster health
curl -u elastic:YOUR_PASSWORD http://localhost:9200/_cluster/health?pretty

# Expected output:
{
  "cluster_name" : "citadelbuy-production",
  "status" : "green",
  "number_of_nodes" : 3,
  "number_of_data_nodes" : 3
}
```

### Option 2: Native Installation

#### Ubuntu/Debian

```bash
# Import Elasticsearch GPG Key
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg

# Add repository
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list

# Install Elasticsearch
sudo apt-get update && sudo apt-get install elasticsearch

# Start and enable service
sudo systemctl enable elasticsearch
sudo systemctl start elasticsearch
```

---

## Security Configuration

### 1. Enable X-Pack Security

Edit `/etc/elasticsearch/elasticsearch.yml`:

```yaml
xpack.security.enabled: true
xpack.security.enrollment.enabled: true

# Transport SSL/TLS
xpack.security.transport.ssl.enabled: true
xpack.security.transport.ssl.verification_mode: certificate

# HTTP SSL/TLS (Production)
xpack.security.http.ssl.enabled: true
xpack.security.http.ssl.key: /path/to/cert.key
xpack.security.http.ssl.certificate: /path/to/cert.crt
xpack.security.http.ssl.certificate_authorities: /path/to/ca.crt
```

### 2. User Management

```bash
# Create application user
curl -u elastic:PASSWORD -X POST "localhost:9200/_security/user/citadelbuy_user" \
  -H 'Content-Type: application/json' -d'
{
  "password" : "STRONG_PASSWORD_HERE",
  "roles" : [ "superuser" ],
  "full_name" : "CitadelBuy Application",
  "email" : "admin@citadelbuy.com"
}
'

# Create read-only user for monitoring
curl -u elastic:PASSWORD -X POST "localhost:9200/_security/user/citadelbuy_readonly" \
  -H 'Content-Type: application/json' -d'
{
  "password" : "STRONG_PASSWORD_HERE",
  "roles" : [ "monitoring_user", "viewer" ],
  "full_name" : "CitadelBuy ReadOnly"
}
'
```

### 3. Role-Based Access Control

```bash
# Create custom role for application
curl -u elastic:PASSWORD -X POST "localhost:9200/_security/role/citadelbuy_app_role" \
  -H 'Content-Type: application/json' -d'
{
  "cluster": ["monitor", "manage_index_templates"],
  "indices": [
    {
      "names": [ "citadelbuy-*" ],
      "privileges": [ "all" ]
    }
  ]
}
'
```

### 4. IP Filtering (Optional)

```yaml
# In elasticsearch.yml
xpack.security.transport.filter.allow: ["192.168.1.0/24"]
xpack.security.http.filter.allow: ["192.168.1.0/24", "10.0.0.0/8"]
```

### 5. Audit Logging

```yaml
# In elasticsearch.yml
xpack.security.audit.enabled: true
xpack.security.audit.logfile.events.include:
  - access_denied
  - access_granted
  - authentication_failed
```

---

## Index Management

### 1. Create Indices

```bash
# Run the initialization script
cd apps/api
npm run setup:elasticsearch

# Or manually create indices
curl -u elastic:PASSWORD -X PUT "localhost:9200/citadelbuy-production-products" \
  -H 'Content-Type: application/json' \
  -d @src/modules/search/config/products-index.json
```

### 2. Index Templates

Create index templates for automatic configuration:

```bash
curl -u elastic:PASSWORD -X PUT "localhost:9200/_index_template/citadelbuy-products-template" \
  -H 'Content-Type: application/json' -d'
{
  "index_patterns": ["citadelbuy-*-products"],
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 2,
      "refresh_interval": "30s"
    }
  },
  "priority": 500
}
'
```

### 3. Index Lifecycle Management (ILM)

Configure automatic index lifecycle:

```bash
# Create ILM policy
curl -u elastic:PASSWORD -X PUT "localhost:9200/_ilm/policy/citadelbuy-products-policy" \
  -H 'Content-Type: application/json' -d'
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_age": "30d",
            "max_size": "50gb"
          }
        }
      },
      "warm": {
        "min_age": "30d",
        "actions": {
          "shrink": {
            "number_of_shards": 1
          },
          "forcemerge": {
            "max_num_segments": 1
          }
        }
      },
      "cold": {
        "min_age": "90d",
        "actions": {
          "freeze": {}
        }
      },
      "delete": {
        "min_age": "180d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
'
```

### 4. Reindexing

When updating mappings:

```bash
# Create new index with updated mappings
curl -u elastic:PASSWORD -X PUT "localhost:9200/citadelbuy-production-products-v2"

# Reindex from old to new
curl -u elastic:PASSWORD -X POST "localhost:9200/_reindex" \
  -H 'Content-Type: application/json' -d'
{
  "source": {
    "index": "citadelbuy-production-products"
  },
  "dest": {
    "index": "citadelbuy-production-products-v2"
  }
}
'

# Update alias
curl -u elastic:PASSWORD -X POST "localhost:9200/_aliases" \
  -H 'Content-Type: application/json' -d'
{
  "actions": [
    { "remove": { "index": "citadelbuy-production-products", "alias": "citadelbuy-products" }},
    { "add": { "index": "citadelbuy-production-products-v2", "alias": "citadelbuy-products" }}
  ]
}
'
```

### 5. Initial Data Import

```bash
# From application
cd apps/api
npm run cli search:index --rebuild

# Or using Elasticsearch bulk API
curl -u elastic:PASSWORD -X POST "localhost:9200/_bulk" \
  -H 'Content-Type: application/x-ndjson' \
  --data-binary @products-bulk.ndjson
```

---

## Performance Tuning

### 1. JVM Heap Size

**Rule of thumb: Set heap to 50% of available RAM, max 32GB**

```bash
# In docker-compose.yml
environment:
  - "ES_JAVA_OPTS=-Xms4g -Xmx4g"

# Or in /etc/elasticsearch/jvm.options
-Xms4g
-Xmx4g
```

### 2. Index Settings

```json
{
  "settings": {
    "refresh_interval": "30s",              // Increase for faster indexing
    "number_of_replicas": 2,                // Balance availability vs resources
    "codec": "best_compression",            // Save storage
    "index.queries.cache.enabled": true,
    "index.requests.cache.enable": true,
    "indices.memory.index_buffer_size": "30%"
  }
}
```

### 3. Circuit Breakers

```yaml
# In elasticsearch.yml
indices.breaker.total.limit: 70%
indices.breaker.fielddata.limit: 40%
indices.breaker.request.limit: 40%
```

### 4. Thread Pools

```yaml
thread_pool.write.queue_size: 1000
thread_pool.search.queue_size: 1000
```

### 5. Slow Query Logging

```bash
curl -u elastic:PASSWORD -X PUT "localhost:9200/citadelbuy-*/_settings" \
  -H 'Content-Type: application/json' -d'
{
  "index.search.slowlog.threshold.query.warn": "10s",
  "index.search.slowlog.threshold.query.info": "5s",
  "index.search.slowlog.threshold.fetch.warn": "1s"
}
'
```

---

## Backup & Restore

### 1. Snapshot Repository Configuration

#### S3 Repository

```bash
# Install S3 plugin
docker exec citadelbuy-elasticsearch-01 \
  bin/elasticsearch-plugin install repository-s3

# Configure S3 credentials
docker exec citadelbuy-elasticsearch-01 \
  bin/elasticsearch-keystore add s3.client.default.access_key
docker exec citadelbuy-elasticsearch-01 \
  bin/elasticsearch-keystore add s3.client.default.secret_key

# Restart nodes
docker-compose restart

# Create snapshot repository
curl -u elastic:PASSWORD -X PUT "localhost:9200/_snapshot/s3_backup" \
  -H 'Content-Type: application/json' -d'
{
  "type": "s3",
  "settings": {
    "bucket": "citadelbuy-elasticsearch-backups",
    "region": "us-east-1",
    "base_path": "production",
    "compress": true
  }
}
'
```

#### Azure Blob Repository

```bash
# Install Azure plugin
docker exec citadelbuy-elasticsearch-01 \
  bin/elasticsearch-plugin install repository-azure

# Configure Azure credentials
docker exec citadelbuy-elasticsearch-01 \
  bin/elasticsearch-keystore add azure.client.default.account
docker exec citadelbuy-elasticsearch-01 \
  bin/elasticsearch-keystore add azure.client.default.key

# Create repository
curl -u elastic:PASSWORD -X PUT "localhost:9200/_snapshot/azure_backup" \
  -H 'Content-Type: application/json' -d'
{
  "type": "azure",
  "settings": {
    "container": "elasticsearch-backups",
    "base_path": "citadelbuy-production",
    "compress": true
  }
}
'
```

### 2. Create Snapshots

```bash
# Manual snapshot
curl -u elastic:PASSWORD -X PUT "localhost:9200/_snapshot/s3_backup/snapshot_$(date +%Y%m%d_%H%M%S)" \
  -H 'Content-Type: application/json' -d'
{
  "indices": "citadelbuy-*",
  "ignore_unavailable": true,
  "include_global_state": false
}
'

# Check snapshot status
curl -u elastic:PASSWORD "localhost:9200/_snapshot/s3_backup/_all?pretty"
```

### 3. Automated Snapshots

Create snapshot lifecycle policy:

```bash
curl -u elastic:PASSWORD -X PUT "localhost:9200/_slm/policy/daily-snapshots" \
  -H 'Content-Type: application/json' -d'
{
  "schedule": "0 1 * * *",
  "name": "<daily-snapshot-{now/d}>",
  "repository": "s3_backup",
  "config": {
    "indices": ["citadelbuy-*"],
    "ignore_unavailable": false,
    "include_global_state": false
  },
  "retention": {
    "expire_after": "30d",
    "min_count": 7,
    "max_count": 50
  }
}
'
```

### 4. Restore Snapshots

```bash
# List available snapshots
curl -u elastic:PASSWORD "localhost:9200/_snapshot/s3_backup/_all?pretty"

# Restore specific snapshot
curl -u elastic:PASSWORD -X POST "localhost:9200/_snapshot/s3_backup/snapshot_20240101/_restore" \
  -H 'Content-Type: application/json' -d'
{
  "indices": "citadelbuy-production-products",
  "ignore_unavailable": true,
  "include_global_state": false,
  "rename_pattern": "(.+)",
  "rename_replacement": "restored-$1"
}
'
```

---

## Monitoring

### 1. Cluster Health

```bash
# Overall health
curl -u elastic:PASSWORD "localhost:9200/_cluster/health?pretty"

# Node stats
curl -u elastic:PASSWORD "localhost:9200/_nodes/stats?pretty"

# Index stats
curl -u elastic:PASSWORD "localhost:9200/citadelbuy-*/_stats?pretty"
```

### 2. Kibana Monitoring

Access Kibana at `http://localhost:5601`

**Key Dashboards:**
- Stack Monitoring → Elasticsearch
- Index Management
- Dev Tools (Console)

### 3. Performance Metrics

```bash
# Query performance
curl -u elastic:PASSWORD "localhost:9200/_nodes/stats/indices/search?pretty"

# Indexing performance
curl -u elastic:PASSWORD "localhost:9200/_nodes/stats/indices/indexing?pretty"

# JVM memory
curl -u elastic:PASSWORD "localhost:9200/_nodes/stats/jvm?pretty"
```

### 4. Alerting (Watcher)

```bash
# Create watch for cluster health
curl -u elastic:PASSWORD -X PUT "localhost:9200/_watcher/watch/cluster_health_watch" \
  -H 'Content-Type: application/json' -d'
{
  "trigger": {
    "schedule": { "interval": "1m" }
  },
  "input": {
    "http": {
      "request": {
        "host": "localhost",
        "port": 9200,
        "path": "/_cluster/health"
      }
    }
  },
  "condition": {
    "compare": {
      "ctx.payload.status": { "not_eq": "green" }
    }
  },
  "actions": {
    "send_email": {
      "email": {
        "to": "admin@citadelbuy.com",
        "subject": "Elasticsearch Cluster Alert",
        "body": "Cluster status is {{ctx.payload.status}}"
      }
    }
  }
}
'
```

---

## Troubleshooting

### Common Issues

#### 1. Cluster Status Yellow/Red

```bash
# Check unassigned shards
curl -u elastic:PASSWORD "localhost:9200/_cat/shards?v&h=index,shard,prirep,state,unassigned.reason"

# Reroute unassigned shards
curl -u elastic:PASSWORD -X POST "localhost:9200/_cluster/reroute?retry_failed=true"
```

#### 2. High Memory Usage

```bash
# Clear field data cache
curl -u elastic:PASSWORD -X POST "localhost:9200/_cache/clear?fielddata=true"

# Clear request cache
curl -u elastic:PASSWORD -X POST "localhost:9200/_cache/clear?request=true"
```

#### 3. Slow Queries

```bash
# Check slow log
docker exec citadelbuy-elasticsearch-01 cat /usr/share/elasticsearch/logs/citadelbuy-production_index_search_slowlog.json

# Analyze query
curl -u elastic:PASSWORD -X GET "localhost:9200/citadelbuy-*/_search?explain=true"
```

#### 4. Index Corruption

```bash
# Check index health
curl -u elastic:PASSWORD "localhost:9200/_cat/indices?v&health=red"

# Close and reopen index
curl -u elastic:PASSWORD -X POST "localhost:9200/problem-index/_close"
curl -u elastic:PASSWORD -X POST "localhost:9200/problem-index/_open"
```

---

## Maintenance

### Daily Tasks

- Monitor cluster health
- Check disk space
- Review slow query logs
- Verify backups completed

### Weekly Tasks

- Review index sizes and optimize
- Check and clear old indices
- Analyze search analytics
- Review security audit logs

### Monthly Tasks

- Full cluster backup
- Performance optimization review
- Update plugins and Elasticsearch version
- Capacity planning review

### Scripts

```bash
# Check cluster status script
#!/bin/bash
HEALTH=$(curl -s -u elastic:$ES_PASSWORD localhost:9200/_cluster/health | jq -r '.status')
if [ "$HEALTH" != "green" ]; then
  echo "ALERT: Cluster health is $HEALTH" | mail -s "ES Alert" admin@citadelbuy.com
fi

# Cleanup old indices script
#!/bin/bash
# Delete indices older than 90 days
curator_cli --host localhost --http_auth elastic:$ES_PASSWORD \
  delete_indices --filter_list '[{"filtertype":"age","source":"name","direction":"older","timestring":"%Y.%m.%d","unit":"days","unit_count":90}]'
```

---

## Production Checklist

### Pre-Deployment

- [ ] Hardware provisioned (CPU, RAM, Disk)
- [ ] SSL certificates generated
- [ ] Passwords generated and stored securely
- [ ] Firewall rules configured
- [ ] Backup repository configured
- [ ] Monitoring dashboards set up
- [ ] Alerting configured

### Post-Deployment

- [ ] Cluster health is green
- [ ] All nodes are connected
- [ ] Indices created successfully
- [ ] Initial data imported
- [ ] Backup tested and verified
- [ ] Performance benchmarks completed
- [ ] Documentation updated

---

## Support & Resources

- **Official Docs**: https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html
- **Kibana**: http://localhost:5601
- **API Reference**: https://www.elastic.co/guide/en/elasticsearch/reference/current/rest-apis.html
- **Best Practices**: https://www.elastic.co/guide/en/elasticsearch/reference/current/tune-for-search-speed.html

---

## Contact

For issues or questions:
- Email: devops@citadelbuy.com
- Slack: #elasticsearch-support
- On-call: Refer to PagerDuty
