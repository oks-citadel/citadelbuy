# Elasticsearch Quick Start Guide

## TL;DR - Get Started in 5 Minutes

This is a quick reference for getting Elasticsearch up and running. For detailed production setup, see [ELASTICSEARCH_SETUP.md](./ELASTICSEARCH_SETUP.md).

---

## Development Setup (Single Node)

### 1. Start Elasticsearch with Docker

```bash
cd organization

# Start Elasticsearch (development mode - no security)
docker-compose -f apps/api/docker-compose.elasticsearch.yml up -d

# Wait for Elasticsearch to be ready (30 seconds)
docker logs -f citadelbuy-elasticsearch

# Check cluster health
curl http://localhost:9200/_cluster/health?pretty
```

### 2. Configure Application

```bash
# In apps/api/.env
SEARCH_PROVIDER=elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
ELASTICSEARCH_INDEX_PREFIX=citadelbuy
```

### 3. Create Indices and Import Data

```bash
cd apps/api

# Initialize Elasticsearch indices
npm run cli search:initialize

# Import all products
npm run cli search:index

# Verify
curl http://localhost:9200/citadelbuy-development-products/_count
```

### 4. Test Search

```bash
# Search for products
curl -X POST http://localhost:9200/citadelbuy-development-products/_search \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "match": {
        "name": "laptop"
      }
    }
  }'

# Or use the API
curl http://localhost:4000/api/search/products?query=laptop
```

---

## Production Setup (3-Node Cluster)

### 1. Generate SSL Certificates

```bash
cd organization
./scripts/setup-elasticsearch-certs.sh
```

### 2. Configure Environment

```bash
# Set password
export ELASTICSEARCH_PASSWORD=$(openssl rand -base64 32)

# Save this password securely!
echo "ELASTICSEARCH_PASSWORD=$ELASTICSEARCH_PASSWORD" >> .env.production
```

### 3. Start Production Cluster

```bash
# Start 3-node cluster with security
docker-compose -f infrastructure/docker/docker-compose.elasticsearch-prod.yml up -d

# Wait for cluster to be healthy (2-3 minutes)
docker logs -f citadelbuy-elasticsearch-01

# Setup passwords
docker exec citadelbuy-elasticsearch-01 \
  bin/elasticsearch-setup-passwords auto

# IMPORTANT: Save all generated passwords!
```

### 4. Initialize Production Indices

```bash
cd organization
ELASTICSEARCH_PASSWORD=your_password ./scripts/setup-elasticsearch.sh
```

### 5. Configure Application

```bash
# In .env.production
SEARCH_PROVIDER=elasticsearch
ELASTICSEARCH_NODE=https://elasticsearch-01:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your_generated_password
ELASTICSEARCH_INDEX_PREFIX=citadelbuy
```

### 6. Import Production Data

```bash
cd apps/api
NODE_ENV=production npm run cli search:index
```

---

## Common Commands

### Index Management

```bash
# List all indices
curl -u elastic:PASSWORD http://localhost:9200/_cat/indices?v

# Get index stats
curl -u elastic:PASSWORD http://localhost:9200/citadelbuy-*/_stats?pretty

# Delete an index
curl -u elastic:PASSWORD -X DELETE http://localhost:9200/citadelbuy-dev-products

# Refresh index (make recent changes searchable)
curl -u elastic:PASSWORD -X POST http://localhost:9200/citadelbuy-*/_refresh
```

### Cluster Health

```bash
# Check cluster health
curl -u elastic:PASSWORD http://localhost:9200/_cluster/health?pretty

# Check node stats
curl -u elastic:PASSWORD http://localhost:9200/_nodes/stats?pretty

# Check cluster settings
curl -u elastic:PASSWORD http://localhost:9200/_cluster/settings?pretty
```

### Data Operations

```bash
# Count documents
curl -u elastic:PASSWORD http://localhost:9200/citadelbuy-*/_count?pretty

# Search all products
curl -u elastic:PASSWORD -X GET http://localhost:9200/citadelbuy-*-products/_search?pretty

# Delete all documents (keep index structure)
curl -u elastic:PASSWORD -X POST http://localhost:9200/citadelbuy-*-products/_delete_by_query \
  -H 'Content-Type: application/json' -d '{"query": {"match_all": {}}}'
```

### Monitoring

```bash
# Access Kibana
# Open browser: http://localhost:5601
# Login with elastic / your_password

# View slow queries
docker exec citadelbuy-elasticsearch-01 \
  tail -f /usr/share/elasticsearch/logs/*_index_search_slowlog.json
```

---

## Troubleshooting

### Elasticsearch won't start

```bash
# Check logs
docker logs citadelbuy-elasticsearch-01

# Common fixes:
# 1. Increase vm.max_map_count (Linux)
sudo sysctl -w vm.max_map_count=262144

# 2. Check disk space
df -h

# 3. Check Docker resources (increase memory to 4GB+)
```

### Cluster status is YELLOW or RED

```bash
# Check unassigned shards
curl -u elastic:PASSWORD http://localhost:9200/_cat/shards?v | grep UNASSIGNED

# Try to reroute
curl -u elastic:PASSWORD -X POST http://localhost:9200/_cluster/reroute?retry_failed=true

# For development (single node), yellow is normal
# Set replicas to 0 for dev:
curl -u elastic:PASSWORD -X PUT http://localhost:9200/citadelbuy-*/_settings \
  -H 'Content-Type: application/json' -d '{"number_of_replicas": 0}'
```

### Search returns no results

```bash
# 1. Check if index exists
curl -u elastic:PASSWORD http://localhost:9200/_cat/indices?v

# 2. Check document count
curl -u elastic:PASSWORD http://localhost:9200/citadelbuy-*/_count?pretty

# 3. Re-index products
cd apps/api
npm run cli search:index --rebuild

# 4. Check application logs
docker logs citadelbuy-backend
```

### Out of Memory

```bash
# Increase JVM heap size in docker-compose.yml
# Set to 50% of available RAM (max 32GB)
environment:
  - "ES_JAVA_OPTS=-Xms4g -Xmx4g"

# Restart container
docker-compose restart elasticsearch
```

---

## Performance Tips

### Development

```yaml
# docker-compose.yml optimizations
environment:
  - number_of_shards=1
  - number_of_replicas=0
  - refresh_interval=30s
  - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
```

### Production

```yaml
# docker-compose.yml optimizations
environment:
  - number_of_shards=3
  - number_of_replicas=2
  - refresh_interval=30s
  - codec=best_compression
  - "ES_JAVA_OPTS=-Xms4g -Xmx4g"
```

---

## API Integration

### Search Products

```typescript
// Using the API
const response = await fetch('http://localhost:4000/api/search/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'laptop',
    filters: {
      priceMin: 500,
      priceMax: 2000,
      inStock: true
    },
    sortBy: 'price',
    sortOrder: 'asc',
    page: 1,
    limit: 20
  })
});

const { products, total, facets } = await response.json();
```

### Autocomplete

```typescript
const response = await fetch(
  'http://localhost:4000/api/search/autocomplete?query=lap&limit=10'
);

const { suggestions, products } = await response.json();
```

---

## Next Steps

- [ ] Read [ELASTICSEARCH_SETUP.md](./ELASTICSEARCH_SETUP.md) for production configuration
- [ ] Set up automated backups (snapshots)
- [ ] Configure monitoring and alerting
- [ ] Tune performance based on your data size
- [ ] Implement Index Lifecycle Management (ILM)
- [ ] Set up SSL/TLS for production

---

## Resources

- **Elasticsearch Docs**: https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html
- **Kibana**: http://localhost:5601 (after starting)
- **API Docs**: http://localhost:4000/api/docs (when running)
- **Search Module README**: `apps/api/src/modules/search/README.md`

---

## Support

For issues:
1. Check logs: `docker logs citadelbuy-elasticsearch-01`
2. Check cluster health: `curl http://localhost:9200/_cluster/health`
3. Review application logs: `docker logs citadelbuy-backend`
4. See [Troubleshooting](#troubleshooting) section above
