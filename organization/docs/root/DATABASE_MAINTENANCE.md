# Broxiva Database Maintenance Guide

## Table of Contents

1. [Overview](#overview)
2. [Vacuum Procedures](#vacuum-procedures)
3. [Index Maintenance](#index-maintenance)
4. [Query Performance Monitoring](#query-performance-monitoring)
5. [Connection Pooling](#connection-pooling)
6. [Scaling Strategies](#scaling-strategies)
7. [Routine Maintenance Schedule](#routine-maintenance-schedule)
8. [Performance Tuning](#performance-tuning)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides comprehensive database maintenance procedures for Broxiva's PostgreSQL database. Regular maintenance ensures optimal performance, prevents disk bloat, and maintains query efficiency.

### Maintenance Objectives

- **Prevent table bloat** through regular vacuuming
- **Maintain index efficiency** with reindexing and cleanup
- **Optimize query performance** through monitoring and analysis
- **Ensure connection stability** with proper pooling
- **Enable horizontal scaling** for growing data volumes

---

## Vacuum Procedures

### Understanding VACUUM

PostgreSQL uses Multi-Version Concurrency Control (MVCC), which creates dead tuples. VACUUM reclaims storage and prevents transaction ID wraparound.

### Manual VACUUM

**Standard VACUUM**:
```sql
-- Vacuum a specific table
VACUUM orders;

-- Vacuum with verbose output
VACUUM VERBOSE orders;

-- Vacuum all tables in database
VACUUM;

-- Analyze table statistics (used by query planner)
VACUUM ANALYZE orders;
```

**VACUUM FULL**:
```sql
-- Full vacuum (locks table, reclaims maximum space)
-- WARNING: This locks the table exclusively
VACUUM FULL orders;

-- Full vacuum with analyze
VACUUM FULL ANALYZE orders;
```

**When to use VACUUM FULL**:
- Severe table bloat (>50% dead tuples)
- After major bulk deletes
- During maintenance windows only
- Not recommended for production use

### Automated VACUUM (autovacuum)

**PostgreSQL Configuration** (`postgresql.conf`):
```conf
# Enable autovacuum (default is on)
autovacuum = on

# Autovacuum tuning
autovacuum_max_workers = 3
autovacuum_naptime = 60s  # Time between autovacuum runs

# Threshold settings
autovacuum_vacuum_threshold = 50  # Min number of tuple updates
autovacuum_vacuum_scale_factor = 0.2  # Fraction of table size
autovacuum_analyze_threshold = 50
autovacuum_analyze_scale_factor = 0.1

# Performance settings
autovacuum_vacuum_cost_delay = 10ms  # Delay between vacuum operations
autovacuum_vacuum_cost_limit = 200  # Cost limit before delay

# Freeze settings (prevent transaction ID wraparound)
autovacuum_freeze_max_age = 200000000
autovacuum_multixact_freeze_max_age = 400000000
```

**Per-Table autovacuum settings**:
```sql
-- Aggressive autovacuum for high-traffic tables
ALTER TABLE orders SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05,
  autovacuum_vacuum_cost_delay = 5
);

-- Less aggressive for read-mostly tables
ALTER TABLE products SET (
  autovacuum_vacuum_scale_factor = 0.3,
  autovacuum_analyze_scale_factor = 0.2
);

-- Disable autovacuum for temporary tables
ALTER TABLE temp_import SET (
  autovacuum_enabled = false
);
```

### Monitoring VACUUM

**Check autovacuum status**:
```sql
-- View autovacuum activity
SELECT
    schemaname,
    relname,
    last_vacuum,
    last_autovacuum,
    vacuum_count,
    autovacuum_count,
    n_dead_tup,
    n_live_tup,
    round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_tuple_percent
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 20;
```

**Check table bloat**:
```sql
-- Estimate table bloat
WITH constants AS (
  SELECT current_setting('block_size')::numeric AS bs, 23 AS hdr, 4 AS ma
),
bloat_info AS (
  SELECT
    schemaname, tablename,
    (datawidth + (hdr + ma - (CASE WHEN hdr % ma = 0 THEN ma ELSE hdr % ma END)))::numeric AS datahdr,
    (maxfracsum * (nullhdr + ma - (CASE WHEN nullhdr % ma = 0 THEN ma ELSE nullhdr % ma END))) AS nullhdr2
  FROM (
    SELECT
      schemaname, tablename, hdr, ma, bs,
      SUM((1 - null_frac) * avg_width) AS datawidth,
      MAX(null_frac) AS maxfracsum,
      hdr + (
        SELECT 1 + COUNT(*) / 8
        FROM pg_stats s2
        WHERE null_frac <> 0 AND s2.schemaname = s.schemaname AND s2.tablename = s.tablename
      ) AS nullhdr
    FROM pg_stats s, constants
    GROUP BY 1, 2, 3, 4, 5
  ) AS foo
),
table_bloat AS (
  SELECT
    schemaname, tablename,
    CEIL((cc.reltuples * ((datahdr + ma - (CASE WHEN datahdr % ma = 0 THEN ma ELSE datahdr % ma END)) + nullhdr2 + 4)) / (bs - 20)) AS expected_pages,
    cc.relpages AS actual_pages
  FROM bloat_info
  JOIN pg_class cc ON cc.relname = bloat_info.tablename
  JOIN pg_namespace nn ON cc.relnamespace = nn.oid AND nn.nspname = bloat_info.schemaname AND nn.nspname <> 'information_schema'
)
SELECT
  schemaname || '.' || tablename AS table_name,
  actual_pages,
  expected_pages,
  CASE WHEN expected_pages > 0 THEN actual_pages - expected_pages ELSE 0 END AS bloat_pages,
  CASE WHEN actual_pages > 0 THEN ROUND(100 * (actual_pages - expected_pages)::numeric / actual_pages, 2) ELSE 0 END AS bloat_percent,
  pg_size_pretty((actual_pages - expected_pages) * 8192) AS bloat_size
FROM table_bloat
WHERE actual_pages > expected_pages
ORDER BY bloat_pages DESC
LIMIT 20;
```

### Vacuum Maintenance Script

**File**: `/usr/local/bin/vacuum_maintenance.sh`
```bash
#!/bin/bash
# Automated vacuum maintenance for Broxiva

LOGFILE="/var/log/postgresql/vacuum_maintenance.log"
THRESHOLD=20  # Bloat percentage threshold

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOGFILE
}

# Check tables with high dead tuple percentage
BLOATED_TABLES=$(psql -U postgres -d broxiva -t -c "
SELECT tablename
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
  AND round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) > $THRESHOLD
ORDER BY n_dead_tup DESC;
")

if [ -z "$BLOATED_TABLES" ]; then
    log "No tables require vacuuming"
    exit 0
fi

# Vacuum bloated tables
echo "$BLOATED_TABLES" | while read -r table; do
    if [ ! -z "$table" ]; then
        log "Vacuuming table: $table"
        psql -U postgres -d broxiva -c "VACUUM ANALYZE $table;" 2>&1 | tee -a $LOGFILE
    fi
done

log "Vacuum maintenance completed"
```

---

## Index Maintenance

### Index Health Monitoring

**Check index usage**:
```sql
-- Find unused indexes
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

**Check index bloat**:
```sql
-- Estimate index bloat
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    CASE
        WHEN idx_tup_read = 0 THEN 0
        ELSE round(100.0 * idx_tup_fetch / idx_tup_read, 2)
    END AS index_hit_rate
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

**Check duplicate indexes**:
```sql
-- Find duplicate/redundant indexes
SELECT
    pg_size_pretty(SUM(pg_relation_size(idx))::bigint) AS size,
    (array_agg(idx))[1] AS idx1,
    (array_agg(idx))[2] AS idx2,
    (array_agg(idx))[3] AS idx3,
    (array_agg(idx))[4] AS idx4
FROM (
    SELECT
        indexrelid::regclass AS idx,
        (indrelid::text ||E'\n'|| indclass::text ||E'\n'|| indkey::text ||E'\n'||
         COALESCE(indexprs::text,'')||E'\n' || COALESCE(indpred::text,'')) AS key
    FROM pg_index
) sub
GROUP BY key
HAVING COUNT(*) > 1
ORDER BY SUM(pg_relation_size(idx)) DESC;
```

### REINDEX Operations

**Manual reindexing**:
```sql
-- Reindex a specific index
REINDEX INDEX orders_user_id_idx;

-- Reindex all indexes on a table
REINDEX TABLE orders;

-- Reindex entire database (use during maintenance window)
REINDEX DATABASE broxiva;

-- Concurrent reindex (doesn't lock table, PostgreSQL 12+)
REINDEX INDEX CONCURRENTLY orders_user_id_idx;
```

**When to REINDEX**:
- Index bloat > 30%
- After major data modifications
- Performance degradation
- After version upgrades

### Index Rebuild Script

**File**: `/usr/local/bin/reindex_maintenance.sh`
```bash
#!/bin/bash
# Automated index maintenance

LOGFILE="/var/log/postgresql/reindex_maintenance.log"
BLOAT_THRESHOLD=30

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOGFILE
}

# Get bloated indexes
psql -U postgres -d broxiva -t -c "
SELECT indexrelname
FROM pg_stat_user_indexes pui
JOIN pg_class c ON c.oid = pui.indexrelid
WHERE c.relpages > 100  -- Only large indexes
  AND idx_scan > 100    -- Only used indexes
ORDER BY c.relpages DESC;
" | while read -r index; do
    if [ ! -z "$index" ]; then
        log "Reindexing: $index"
        psql -U postgres -d broxiva -c "REINDEX INDEX CONCURRENTLY $index;" 2>&1 | tee -a $LOGFILE
    fi
done

log "Reindex maintenance completed"
```

### Index Maintenance Best Practices

1. **Use CONCURRENTLY** when possible to avoid locking
2. **Schedule during low traffic** if CONCURRENTLY not available
3. **Monitor index size growth** over time
4. **Drop unused indexes** to reduce overhead
5. **Create covering indexes** for frequently accessed columns

```sql
-- Example: Create covering index
CREATE INDEX orders_user_status_covering
ON orders(user_id, status)
INCLUDE (total, created_at, tracking_number);
```

---

## Query Performance Monitoring

### Enable Query Logging

**PostgreSQL Configuration**:
```conf
# Log slow queries
log_min_duration_statement = 1000  # Log queries slower than 1 second
log_line_prefix = '%t [%p]: user=%u,db=%d,app=%a,client=%h '
log_statement = 'none'  # Don't log all statements
log_duration = off

# Auto-explain for slow queries
shared_preload_libraries = 'pg_stat_statements,auto_explain'
auto_explain.log_min_duration = 1000  # Log execution plans for slow queries
auto_explain.log_analyze = true
auto_explain.log_buffers = true
auto_explain.log_timing = true
auto_explain.log_triggers = true
auto_explain.log_verbose = true
```

### pg_stat_statements Extension

**Enable extension**:
```sql
-- Create extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Configure
ALTER SYSTEM SET pg_stat_statements.max = 10000;
ALTER SYSTEM SET pg_stat_statements.track = 'all';
SELECT pg_reload_conf();
```

**Query analysis**:
```sql
-- Top 10 slowest queries
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    stddev_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Most frequently executed queries
SELECT
    query,
    calls,
    total_exec_time,
    rows,
    100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) AS cache_hit_ratio
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 10;

-- Queries with poor cache hit ratio
SELECT
    query,
    calls,
    shared_blks_hit,
    shared_blks_read,
    round(100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0), 2) AS cache_hit_percent
FROM pg_stat_statements
WHERE shared_blks_read > 0
ORDER BY cache_hit_percent ASC
LIMIT 10;

-- Reset statistics
SELECT pg_stat_statements_reset();
```

### Query Analysis

**EXPLAIN ANALYZE**:
```sql
-- Analyze query execution
EXPLAIN ANALYZE
SELECT o.id, o.total, u.name
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'PENDING'
  AND o.created_at > NOW() - INTERVAL '7 days';

-- Get JSON format for visualization
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM orders WHERE user_id = '123' AND status = 'PENDING';
```

**Execution plan visualization**:
- Use [explain.dalibo.com](https://explain.dalibo.com/)
- Use [explain.depesz.com](https://explain.depesz.com/)
- Use pgAdmin built-in explain visualizer

### Performance Monitoring Dashboard

**Prometheus + Grafana Setup**:

**postgres_exporter configuration**:
```yaml
# /etc/postgres_exporter/queries.yaml
pg_stat_statements:
  query: |
    SELECT
      queryid,
      query,
      calls,
      total_exec_time,
      mean_exec_time,
      max_exec_time
    FROM pg_stat_statements
    ORDER BY mean_exec_time DESC
    LIMIT 100
  metrics:
    - queryid:
        usage: "LABEL"
    - query:
        usage: "LABEL"
    - calls:
        usage: "COUNTER"
    - total_exec_time:
        usage: "COUNTER"
    - mean_exec_time:
        usage: "GAUGE"
    - max_exec_time:
        usage: "GAUGE"
```

**Alert rules**:
```yaml
# /etc/prometheus/rules/database_performance.yml
groups:
  - name: database_performance
    rules:
      - alert: SlowQueries
        expr: pg_stat_statements_mean_exec_time_seconds > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow database queries detected"
          description: "Query {{ $labels.query }} has mean execution time of {{ $value }}s"

      - alert: HighDatabaseConnections
        expr: pg_stat_database_numbackends > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High number of database connections"
          description: "Database has {{ $value }} active connections"

      - alert: CacheHitRatioLow
        expr: pg_stat_database_blks_hit / (pg_stat_database_blks_hit + pg_stat_database_blks_read) < 0.95
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit ratio"
          description: "Cache hit ratio is {{ $value }}, should be > 0.95"
```

---

## Connection Pooling

### PgBouncer Configuration

**Install PgBouncer**:
```bash
# Ubuntu/Debian
sudo apt-get install pgbouncer

# CentOS/RHEL
sudo yum install pgbouncer
```

**PgBouncer Configuration** (`/etc/pgbouncer/pgbouncer.ini`):
```ini
[databases]
broxiva = host=localhost port=5432 dbname=broxiva

[pgbouncer]
# Connection Limits
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 5

# Pooling Mode
pool_mode = transaction  # Options: session, transaction, statement

# Timeouts
server_idle_timeout = 600
server_lifetime = 3600
server_connect_timeout = 15
query_timeout = 0
query_wait_timeout = 120
client_idle_timeout = 0

# Authentication
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
stats_period = 60

# Performance
listen_addr = 0.0.0.0
listen_port = 6432
unix_socket_dir = /var/run/postgresql

# Admin Access
admin_users = postgres
stats_users = stats_user
```

**User Authentication** (`/etc/pgbouncer/userlist.txt`):
```
"broxiva_app" "md5<hash>"
"broxiva_readonly" "md5<hash>"
```

**Generate password hash**:
```bash
# Generate MD5 hash for PgBouncer
echo -n "passwordusername" | md5sum
```

**Start PgBouncer**:
```bash
sudo systemctl enable pgbouncer
sudo systemctl start pgbouncer
sudo systemctl status pgbouncer
```

**Monitor PgBouncer**:
```sql
-- Connect to pgbouncer admin console
psql -p 6432 -U postgres pgbouncer

-- Show pools
SHOW POOLS;

-- Show stats
SHOW STATS;

-- Show databases
SHOW DATABASES;

-- Show config
SHOW CONFIG;

-- Show active connections
SHOW CLIENTS;

-- Show server connections
SHOW SERVERS;
```

### Application Configuration

**Prisma with PgBouncer**:
```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// .env
DATABASE_URL="postgresql://broxiva_app:password@localhost:6432/broxiva?pgbouncer=true&connect_timeout=10"

// Connection pool settings
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["relationJoins"]
}
```

**NestJS Connection Pool**:
```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 6432,  // PgBouncer port
      username: 'broxiva_app',
      password: process.env.DB_PASSWORD,
      database: 'broxiva',
      // Connection pool settings
      extra: {
        max: 20,  // Maximum pool size
        min: 5,   // Minimum pool size
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      },
    }),
  ],
})
export class AppModule {}
```

### Connection Pool Monitoring

```sql
-- Check current connections
SELECT
    datname,
    usename,
    application_name,
    client_addr,
    state,
    COUNT(*)
FROM pg_stat_activity
WHERE datname = 'broxiva'
GROUP BY datname, usename, application_name, client_addr, state;

-- Check connection limits
SELECT
    setting AS max_connections,
    (SELECT COUNT(*) FROM pg_stat_activity) AS current_connections,
    setting::int - (SELECT COUNT(*) FROM pg_stat_activity) AS available_connections
FROM pg_settings
WHERE name = 'max_connections';

-- Long-running queries
SELECT
    pid,
    now() - query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE state != 'idle'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC;

-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'broxiva'
  AND state = 'idle'
  AND state_change < NOW() - INTERVAL '1 hour';
```

---

## Scaling Strategies

### Vertical Scaling

**Increase PostgreSQL Resources**:
```conf
# /etc/postgresql/14/main/postgresql.conf

# Memory Settings (for 32GB RAM server)
shared_buffers = 8GB               # 25% of RAM
effective_cache_size = 24GB        # 75% of RAM
maintenance_work_mem = 2GB
work_mem = 32MB                    # (RAM / max_connections) / 2

# Parallelism
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4

# Checkpointing
checkpoint_timeout = 15min
checkpoint_completion_target = 0.9
max_wal_size = 4GB
min_wal_size = 1GB

# Planner Settings
random_page_cost = 1.1  # For SSD storage
effective_io_concurrency = 200
```

### Horizontal Scaling - Read Replicas

**Primary Server Configuration**:
```conf
# postgresql.conf on primary
wal_level = replica
max_wal_senders = 10
wal_keep_size = 1GB
hot_standby = on
```

**Create Replication User**:
```sql
-- On primary server
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'strong_password';
```

**Configure pg_hba.conf**:
```conf
# Allow replication connections
host replication replicator replica_server_ip/32 md5
```

**Setup Replica Server**:
```bash
# Stop PostgreSQL on replica
sudo systemctl stop postgresql

# Remove existing data
sudo rm -rf /var/lib/postgresql/14/main/*

# Create base backup from primary
pg_basebackup -h primary_server_ip -D /var/lib/postgresql/14/main \
  -U replicator -P -v -R -X stream -C -S replica_1

# Start replica
sudo systemctl start postgresql
```

**Application Load Balancing**:
```typescript
// database.config.ts
import { Pool } from 'pg';

// Write pool (primary)
export const writePool = new Pool({
  host: 'primary.db.broxiva.com',
  port: 5432,
  database: 'broxiva',
  user: 'broxiva_app',
  password: process.env.DB_PASSWORD,
  max: 20,
});

// Read pool (replicas with load balancing)
const readHosts = [
  'replica1.db.broxiva.com',
  'replica2.db.broxiva.com',
  'replica3.db.broxiva.com',
];

export const readPool = new Pool({
  host: readHosts[Math.floor(Math.random() * readHosts.length)],
  port: 5432,
  database: 'broxiva',
  user: 'broxiva_readonly',
  password: process.env.DB_READONLY_PASSWORD,
  max: 50,
});

// Query router
export async function query(sql: string, params: any[], isWrite = false) {
  const pool = isWrite ? writePool : readPool;
  return pool.query(sql, params);
}
```

### Partitioning Large Tables

**Time-based partitioning (orders table)**:
```sql
-- Create partitioned table
CREATE TABLE orders_partitioned (
    id UUID NOT NULL,
    user_id UUID,
    total DECIMAL(10,2),
    status VARCHAR(50),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE orders_2025_01 PARTITION OF orders_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE orders_2025_02 PARTITION OF orders_partitioned
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Create indexes on partitions
CREATE INDEX orders_2025_01_user_idx ON orders_2025_01(user_id);
CREATE INDEX orders_2025_01_status_idx ON orders_2025_01(status);

-- Automatic partition creation function
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
    partition_date DATE := date_trunc('month', NOW() + INTERVAL '1 month');
    partition_name TEXT := 'orders_' || to_char(partition_date, 'YYYY_MM');
    start_date DATE := partition_date;
    end_date DATE := partition_date + INTERVAL '1 month';
BEGIN
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF orders_partitioned FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );

    EXECUTE format('CREATE INDEX %I ON %I(user_id)', partition_name || '_user_idx', partition_name);
    EXECUTE format('CREATE INDEX %I ON %I(status)', partition_name || '_status_idx', partition_name);
END;
$$ LANGUAGE plpgsql;

-- Schedule automatic partition creation
-- (Run monthly via cron)
```

### Caching Strategy

**Redis Integration**:
```typescript
// cache.service.ts
import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: 'redis.broxiva.com',
      port: 6379,
      password: process.env.REDIS_PASSWORD,
      db: 0,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

// Usage in service
@Injectable()
export class ProductService {
  constructor(private cacheService: CacheService) {}

  async getProduct(id: string) {
    // Try cache first
    const cached = await this.cacheService.get(`product:${id}`);
    if (cached) return cached;

    // Query database
    const product = await this.prisma.product.findUnique({ where: { id } });

    // Cache result
    await this.cacheService.set(`product:${id}`, product, 3600);

    return product;
  }
}
```

---

## Routine Maintenance Schedule

### Daily Tasks

```bash
# Daily maintenance script
#!/bin/bash

# 1. Check database health
psql -c "SELECT version();"

# 2. Monitor slow queries
psql -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 5;"

# 3. Check connection count
psql -c "SELECT count(*) FROM pg_stat_activity;"

# 4. Check table bloat
psql -f /usr/local/bin/check_bloat.sql

# 5. Backup (automated)
/usr/local/bin/full_backup.sh
```

### Weekly Tasks

- Review slow query log
- Analyze query performance trends
- Check index usage statistics
- Review autovacuum statistics
- Verify backup integrity
- Update table statistics (ANALYZE)

### Monthly Tasks

- REINDEX large tables/indexes
- Review and optimize configuration
- Disaster recovery drill
- Capacity planning review
- Security audit
- Performance benchmarking

### Quarterly Tasks

- Major version upgrade planning
- Hardware capacity review
- Archival strategy review
- Complete security audit
- Documentation update

---

## Performance Tuning

### Query Optimization Checklist

1. **Add appropriate indexes**
   ```sql
   -- Before
   SELECT * FROM orders WHERE user_id = '123' AND status = 'PENDING';

   -- Add composite index
   CREATE INDEX orders_user_status_idx ON orders(user_id, status);
   ```

2. **Use EXPLAIN ANALYZE**
   ```sql
   EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
   SELECT * FROM orders WHERE user_id = '123';
   ```

3. **Avoid SELECT ***
   ```sql
   -- Instead of
   SELECT * FROM orders;

   -- Use specific columns
   SELECT id, total, status, created_at FROM orders;
   ```

4. **Use LIMIT for large result sets**
   ```sql
   SELECT * FROM orders ORDER BY created_at DESC LIMIT 100;
   ```

5. **Optimize JOINs**
   ```sql
   -- Use appropriate JOIN type
   SELECT o.id, u.name
   FROM orders o
   INNER JOIN users u ON o.user_id = u.id
   WHERE o.created_at > NOW() - INTERVAL '7 days';
   ```

### Configuration Optimization

**Calculate optimal settings**:
```bash
# Use pgtune for automatic tuning recommendations
# https://pgtune.leopard.in.ua/

# Or calculate manually
# shared_buffers = 25% of total RAM
# effective_cache_size = 75% of total RAM
# work_mem = (Total RAM - shared_buffers) / (max_connections * 3)
```

---

## Troubleshooting

### Common Issues

**High CPU Usage**:
```sql
-- Find CPU-intensive queries
SELECT
    pid,
    now() - query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

-- Kill problematic query
SELECT pg_terminate_backend(12345);
```

**High Disk I/O**:
```sql
-- Check table I/O
SELECT
    schemaname,
    tablename,
    heap_blks_read,
    heap_blks_hit,
    idx_blks_read,
    idx_blks_hit
FROM pg_statio_user_tables
ORDER BY heap_blks_read DESC;
```

**Lock Contention**:
```sql
-- View locks
SELECT
    locktype,
    database,
    relation::regclass,
    page,
    tuple,
    virtualxid,
    transactionid,
    mode,
    granted
FROM pg_locks
WHERE NOT granted;

-- View blocking queries
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

**Out of Memory**:
```sql
-- Check memory usage
SELECT
    name,
    setting,
    unit,
    context
FROM pg_settings
WHERE name IN ('shared_buffers', 'work_mem', 'maintenance_work_mem', 'effective_cache_size');

-- Reduce work_mem temporarily
SET work_mem = '16MB';
```

---

## Appendix

### Useful PostgreSQL Extensions

```sql
-- Performance monitoring
CREATE EXTENSION pg_stat_statements;

-- Advanced indexing
CREATE EXTENSION btree_gin;
CREATE EXTENSION btree_gist;

-- Full-text search
CREATE EXTENSION pg_trgm;

-- UUID generation
CREATE EXTENSION "uuid-ossp";

-- Cryptographic functions
CREATE EXTENSION pgcrypto;
```

### Monitoring Tools

- **pgAdmin**: Web-based administration
- **pg_top**: Real-time monitoring
- **pgBadger**: Log analyzer
- **Prometheus + Grafana**: Metrics dashboard
- **pgHero**: Performance dashboard
- **New Relic APM**: Application performance monitoring

### References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostgreSQL Wiki](https://wiki.postgresql.org/)
- [Use The Index, Luke](https://use-the-index-luke.com/)
- [PostgreSQL Query Optimization](https://www.postgresql.org/docs/current/performance-tips.html)

---

**Document Version**: 1.0
**Last Updated**: December 2025
**Next Review**: March 2026
