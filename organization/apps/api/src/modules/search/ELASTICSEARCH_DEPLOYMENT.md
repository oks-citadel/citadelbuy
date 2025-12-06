# Elasticsearch Deployment Guide

Complete guide for deploying Elasticsearch search integration to production.

## Prerequisites

- Elasticsearch 8.x or higher
- Node.js 18+ with NestJS
- PostgreSQL database with product data
- Sufficient memory (minimum 4GB for Elasticsearch)

## Installation

### 1. Install Elasticsearch

#### Using Docker (Recommended for Development)
```bash
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  -e "ES_JAVA_OPTS=-Xms2g -Xmx2g" \
  docker.elastic.co/elasticsearch/elasticsearch:8.11.0
```

#### Using Docker Compose
```yaml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: elasticsearch
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
      - xpack.security.enabled=false
    ports:
      - 9200:9200
      - 9300:9300
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - citadelbuy

volumes:
  elasticsearch_data:
    driver: local

networks:
  citadelbuy:
    driver: bridge
```

#### Production Installation (Linux)
```bash
# Install Elasticsearch via package manager
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
echo "deb https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list
sudo apt-get update && sudo apt-get install elasticsearch

# Start Elasticsearch
sudo systemctl start elasticsearch
sudo systemctl enable elasticsearch
```

### 2. Configure Elasticsearch

#### elasticsearch.yml (Production Settings)
```yaml
cluster.name: citadelbuy-cluster
node.name: citadelbuy-node-1

# Network
network.host: 0.0.0.0
http.port: 9200

# Memory
bootstrap.memory_lock: true

# Paths
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch

# Discovery (for single node)
discovery.type: single-node

# Security
xpack.security.enabled: true
xpack.security.enrollment.enabled: true

# Monitoring
xpack.monitoring.collection.enabled: true
```

#### JVM Options (elasticsearch.jvm.options)
```
# Heap size (50% of available RAM, max 32GB)
-Xms4g
-Xmx4g

# GC settings for better performance
-XX:+UseConcMarkSweepGC
-XX:CMSInitiatingOccupancyFraction=75
-XX:+UseCMSInitiatingOccupancyOnly
```

### 3. Configure Application

#### .env Configuration
```bash
# Elasticsearch Connection
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your_secure_password
ELASTICSEARCH_REQUEST_TIMEOUT=30000
ELASTICSEARCH_BULK_SIZE=1000
ELASTICSEARCH_INDEX_PREFIX=citadelbuy

# Search Provider
SEARCH_PROVIDER=elasticsearch

# Auto-sync
DISABLE_SEARCH_AUTO_SYNC=false
```

#### Production .env
```bash
# Elasticsearch Connection (Cluster)
ELASTICSEARCH_NODE=https://es-cluster.example.com:9200
ELASTICSEARCH_USERNAME=citadelbuy_search_user
ELASTICSEARCH_PASSWORD=${ES_PASSWORD}  # Use secrets manager
ELASTICSEARCH_REQUEST_TIMEOUT=60000
ELASTICSEARCH_BULK_SIZE=2000
ELASTICSEARCH_INDEX_PREFIX=citadelbuy-prod

# Search Provider
SEARCH_PROVIDER=elasticsearch

# Auto-sync (disabled for manual control)
DISABLE_SEARCH_AUTO_SYNC=true
```

## Initial Setup

### 1. Verify Elasticsearch Connection
```bash
curl http://localhost:9200
```

Expected response:
```json
{
  "name" : "citadelbuy-node-1",
  "cluster_name" : "citadelbuy-cluster",
  "version" : {
    "number" : "8.11.0"
  }
}
```

### 2. Start Application
```bash
cd organization/apps/api
npm install
npm run build
npm run start:prod
```

### 3. Create Indices

The indices will be created automatically on first use, or manually:

```bash
# Using API endpoint
curl -X POST http://localhost:3000/admin/search/index/rebuild-all?deleteFirst=true \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 4. Initial Data Indexing

```bash
# Option 1: Using API endpoint
curl -X POST http://localhost:3000/admin/search/index/products/rebuild \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Option 2: Using admin dashboard
# Navigate to Admin > Search > Rebuild Index
```

### 5. Verify Indexing

```bash
# Check index health
curl http://localhost:3000/admin/search/health \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Expected response:
{
  "healthy": true,
  "databaseCount": 5000,
  "indexCount": 5000,
  "difference": 0
}
```

## Production Deployment

### 1. Elasticsearch Cluster Setup

#### Multi-Node Configuration
```yaml
# Node 1 (Master + Data)
cluster.name: citadelbuy-prod
node.name: citadelbuy-prod-1
node.roles: [ master, data ]
network.host: 10.0.1.10
discovery.seed_hosts: ["10.0.1.10", "10.0.1.11", "10.0.1.12"]
cluster.initial_master_nodes: ["citadelbuy-prod-1"]

# Node 2 (Data)
cluster.name: citadelbuy-prod
node.name: citadelbuy-prod-2
node.roles: [ data ]
network.host: 10.0.1.11
discovery.seed_hosts: ["10.0.1.10", "10.0.1.11", "10.0.1.12"]

# Node 3 (Data)
cluster.name: citadelbuy-prod
node.name: citadelbuy-prod-3
node.roles: [ data ]
network.host: 10.0.1.12
discovery.seed_hosts: ["10.0.1.10", "10.0.1.11", "10.0.1.12"]
```

### 2. Security Configuration

#### Enable X-Pack Security
```bash
# Generate passwords
/usr/share/elasticsearch/bin/elasticsearch-setup-passwords auto

# Create application user
curl -X POST "localhost:9200/_security/user/citadelbuy_search_user" \
  -H "Content-Type: application/json" \
  -u elastic:${ELASTIC_PASSWORD} \
  -d '{
    "password": "secure_password_here",
    "roles": ["citadelbuy_search_role"],
    "full_name": "CitadelBuy Search User"
  }'

# Create role
curl -X POST "localhost:9200/_security/role/citadelbuy_search_role" \
  -H "Content-Type: application/json" \
  -u elastic:${ELASTIC_PASSWORD} \
  -d '{
    "indices": [{
      "names": ["citadelbuy-prod-*"],
      "privileges": ["all"]
    }]
  }'
```

#### SSL/TLS Configuration
```yaml
# elasticsearch.yml
xpack.security.http.ssl.enabled: true
xpack.security.http.ssl.keystore.path: certs/http.p12
xpack.security.transport.ssl.enabled: true
xpack.security.transport.ssl.keystore.path: certs/transport.p12
```

### 3. Index Lifecycle Management

#### Create ILM Policy
```bash
curl -X PUT "localhost:9200/_ilm/policy/citadelbuy-products-policy" \
  -H "Content-Type: application/json" \
  -d '{
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
        "delete": {
          "min_age": "180d",
          "actions": {
            "delete": {}
          }
        }
      }
    }
  }'
```

### 4. Monitoring Setup

#### Enable Monitoring
```yaml
# elasticsearch.yml
xpack.monitoring.collection.enabled: true
xpack.monitoring.elasticsearch.collection.enabled: true
```

#### Set Up Alerts
```bash
# Watch for index health
curl -X PUT "localhost:9200/_watcher/watch/index-health-check" \
  -H "Content-Type: application/json" \
  -d '{
    "trigger": {
      "schedule": {
        "interval": "5m"
      }
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
        "ctx.payload.status": {
          "not_eq": "green"
        }
      }
    },
    "actions": {
      "email_admin": {
        "email": {
          "to": "admin@citadelbuy.com",
          "subject": "Elasticsearch Cluster Health Warning",
          "body": "Cluster status is {{ctx.payload.status}}"
        }
      }
    }
  }'
```

### 5. Backup and Restore

#### Configure Snapshot Repository
```bash
# Create snapshot repository
curl -X PUT "localhost:9200/_snapshot/citadelbuy_backup" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "fs",
    "settings": {
      "location": "/backup/elasticsearch",
      "compress": true
    }
  }'

# Create snapshot
curl -X PUT "localhost:9200/_snapshot/citadelbuy_backup/snapshot_1?wait_for_completion=true"

# Schedule daily snapshots (using cron)
0 2 * * * curl -X PUT "localhost:9200/_snapshot/citadelbuy_backup/snapshot_$(date +\%Y\%m\%d)?wait_for_completion=true"
```

#### Restore from Snapshot
```bash
# Close index
curl -X POST "localhost:9200/citadelbuy-prod-products/_close"

# Restore snapshot
curl -X POST "localhost:9200/_snapshot/citadelbuy_backup/snapshot_20240101/_restore" \
  -H "Content-Type: application/json" \
  -d '{
    "indices": "citadelbuy-prod-products"
  }'

# Open index
curl -X POST "localhost:9200/citadelbuy-prod-products/_open"
```

## Performance Tuning

### 1. Index Settings
```bash
curl -X PUT "localhost:9200/citadelbuy-prod-products/_settings" \
  -H "Content-Type: application/json" \
  -d '{
    "index": {
      "refresh_interval": "30s",
      "number_of_replicas": 2,
      "max_result_window": 10000,
      "codec": "best_compression"
    }
  }'
```

### 2. Query Optimization
- Use filter context for exact matches (cached)
- Use query context for relevance scoring
- Limit aggregation sizes
- Use pagination instead of large result sets

### 3. Hardware Recommendations

#### Small Deployment (< 100K products)
- 3 nodes
- 8GB RAM per node
- 4 CPU cores per node
- 100GB SSD per node

#### Medium Deployment (100K - 1M products)
- 5 nodes
- 16GB RAM per node
- 8 CPU cores per node
- 500GB SSD per node

#### Large Deployment (> 1M products)
- 10+ nodes
- 32GB RAM per node
- 16 CPU cores per node
- 1TB SSD per node

## Maintenance

### Daily Tasks
- Monitor cluster health
- Check index size and growth
- Review slow query logs
- Verify backup completion

### Weekly Tasks
- Optimize indices (forcemerge)
- Review and update mappings if needed
- Analyze search analytics
- Clean up old snapshots

### Monthly Tasks
- Update Elasticsearch version
- Review and adjust ILM policies
- Performance tuning based on metrics
- Capacity planning

## Troubleshooting

### Common Issues

#### 1. Out of Memory
```bash
# Increase heap size in jvm.options
-Xms8g
-Xmx8g

# Or reduce indexing batch size
ELASTICSEARCH_BULK_SIZE=500
```

#### 2. Slow Queries
```bash
# Enable slow log
curl -X PUT "localhost:9200/citadelbuy-prod-products/_settings" \
  -H "Content-Type: application/json" \
  -d '{
    "index.search.slowlog.threshold.query.warn": "10s",
    "index.search.slowlog.threshold.query.info": "5s"
  }'

# Check slow logs
tail -f /var/log/elasticsearch/citadelbuy-cluster_index_search_slowlog.log
```

#### 3. Index Corruption
```bash
# Check index health
curl "localhost:9200/_cat/indices?v"

# Repair corrupted shards
curl -X POST "localhost:9200/_cluster/reroute?retry_failed=true"
```

#### 4. Connection Timeouts
```bash
# Increase timeout
ELASTICSEARCH_REQUEST_TIMEOUT=60000

# Check network connectivity
curl -v http://elasticsearch:9200
```

## Monitoring and Alerts

### Key Metrics to Monitor
- Cluster health status
- Index size and document count
- Search latency (p95, p99)
- Indexing rate
- CPU and memory usage
- Disk I/O
- Network throughput

### Recommended Tools
- Elasticsearch Monitoring (X-Pack)
- Kibana for visualization
- Prometheus + Grafana
- Custom dashboards using search analytics

## Disaster Recovery

### Recovery Plan
1. Verify backup availability
2. Restore from most recent snapshot
3. Reindex missing data from database
4. Verify index health
5. Resume normal operations

### RTO/RPO
- Recovery Time Objective: < 1 hour
- Recovery Point Objective: < 5 minutes (with incremental sync)

## Support and Resources

- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [NestJS Elasticsearch Integration](https://docs.nestjs.com/recipes/elasticsearch)
- [Performance Tuning Guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/tune-for-search-speed.html)
- Internal Wiki: [Search Documentation](link-to-internal-docs)

## Contact

For production issues:
- On-call: search-oncall@citadelbuy.com
- Slack: #search-alerts
- PagerDuty: search-team
