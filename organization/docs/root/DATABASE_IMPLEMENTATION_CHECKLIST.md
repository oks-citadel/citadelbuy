# Database Performance & Backup Implementation Checklist

## Overview

This checklist ensures proper implementation and verification of the database performance optimizations and backup strategies for CitadelBuy.

---

## Pre-Implementation Checklist

### 1. Documentation Review ✅

- [ ] Read `DATABASE_PERFORMANCE_SUMMARY.md`
- [ ] Review `docs/DATABASE_BACKUP_STRATEGY.md`
- [ ] Review `docs/DATABASE_MAINTENANCE.md`
- [ ] Review `apps/api/prisma/INDEX_STRATEGY.md`
- [ ] Review `apps/api/prisma/migrations/add_performance_indexes/README.md`

### 2. Environment Preparation

- [ ] Verify PostgreSQL version (14+ recommended)
- [ ] Check available disk space (need 15% extra)
- [ ] Verify backup storage configured (S3/Azure/GCP)
- [ ] Ensure low-traffic time window scheduled
- [ ] Notify team of maintenance window

### 3. Backup Current State

- [ ] Full database backup
  ```bash
  pg_dump citadelbuy > citadelbuy_backup_$(date +%Y%m%d).sql
  ```
- [ ] Verify backup integrity
  ```bash
  pg_restore --list citadelbuy_backup_*.sql
  ```
- [ ] Upload backup to cloud storage
  ```bash
  aws s3 cp citadelbuy_backup_*.sql s3://citadelbuy-backups/pre-migration/
  ```
- [ ] Document current performance metrics
  ```sql
  SELECT COUNT(*) FROM pg_indexes;
  SELECT pg_size_pretty(pg_database_size('citadelbuy'));
  ```

---

## Phase 1: Performance Indexes Migration

### 1.1 Pre-Migration Checks

- [ ] Database connection verified
- [ ] No active long-running queries
  ```sql
  SELECT pid, state, query_start, query
  FROM pg_stat_activity
  WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';
  ```
- [ ] Autovacuum running normally
  ```sql
  SELECT * FROM pg_stat_activity WHERE query LIKE '%autovacuum%';
  ```

### 1.2 Apply Migration

- [ ] Navigate to API directory
  ```bash
  cd organization/apps/api
  ```
- [ ] Apply migration
  ```bash
  npx prisma migrate deploy
  ```
- [ ] Monitor migration progress
  ```bash
  tail -f /var/log/postgresql/postgresql-14-main.log
  ```
- [ ] Verify completion (no errors)

### 1.3 Post-Migration Verification

- [ ] Check indexes created
  ```sql
  SELECT COUNT(*) FROM pg_indexes WHERE indexname LIKE 'idx_%';
  -- Expected: 150+
  ```
- [ ] Verify index sizes
  ```sql
  SELECT pg_size_pretty(SUM(pg_relation_size(indexrelid)))
  FROM pg_stat_user_indexes;
  ```
- [ ] Update table statistics
  ```sql
  ANALYZE;
  ```
- [ ] No missing indexes reported
  ```sql
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename NOT IN (SELECT tablename FROM pg_indexes);
  ```

### 1.4 Performance Testing

- [ ] Run test queries with EXPLAIN ANALYZE
  ```sql
  EXPLAIN ANALYZE SELECT * FROM products WHERE vendor_id = '...' LIMIT 20;
  EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = '...' LIMIT 10;
  ```
- [ ] Verify index usage (should show "Index Scan")
- [ ] Compare query times before/after
- [ ] Run application smoke tests
- [ ] Monitor application logs for errors

---

## Phase 2: Backup Strategy Implementation

### 2.1 WAL Archiving Setup

- [ ] Configure PostgreSQL
  ```bash
  sudo nano /etc/postgresql/14/main/postgresql.conf
  ```
  Add:
  ```conf
  wal_level = replica
  archive_mode = on
  archive_command = '/usr/local/bin/wal_archive.sh %p %f'
  archive_timeout = 300
  ```
- [ ] Create WAL archive script
  ```bash
  sudo cp /path/to/wal_archive.sh /usr/local/bin/
  sudo chmod +x /usr/local/bin/wal_archive.sh
  ```
- [ ] Test WAL archiving
  ```sql
  SELECT pg_switch_wal();
  ```
- [ ] Verify WAL files in archive location
  ```bash
  ls -lh /backups/wal/
  aws s3 ls s3://citadelbuy-backups/wal/
  ```

### 2.2 Automated Backup Scripts

- [ ] Copy backup scripts to `/usr/local/bin/`
  - [ ] `full_backup.sh`
  - [ ] `incremental_backup.sh`
  - [ ] `tables_backup.sh`
  - [ ] `verify_backups.sh`
  - [ ] `cleanup_backups.sh`
- [ ] Make scripts executable
  ```bash
  sudo chmod +x /usr/local/bin/*_backup.sh
  ```
- [ ] Test each script manually
  ```bash
  /usr/local/bin/full_backup.sh
  /usr/local/bin/incremental_backup.sh
  ```
- [ ] Verify backups created
  ```bash
  ls -lh /backups/full/
  ls -lh /backups/base/
  ```

### 2.3 Cron Schedule

- [ ] Configure cron jobs
  ```bash
  sudo crontab -e
  ```
  Add:
  ```cron
  0 2 * * * /usr/local/bin/full_backup.sh
  0 */6 * * * /usr/local/bin/incremental_backup.sh
  0 * * * * /usr/local/bin/tables_backup.sh
  0 3 * * * /usr/local/bin/verify_backups.sh
  0 4 * * * /usr/local/bin/cleanup_backups.sh
  ```
- [ ] Verify cron schedule
  ```bash
  sudo crontab -l
  ```
- [ ] Test cron execution
  ```bash
  sudo run-parts /etc/cron.daily --report
  ```

### 2.4 Cloud Storage Setup

**AWS S3:**
- [ ] Create S3 bucket
  ```bash
  aws s3 mb s3://citadelbuy-backups
  ```
- [ ] Configure lifecycle policies
- [ ] Enable versioning
- [ ] Enable encryption (AES-256)
- [ ] Set up IAM policies

**Azure Blob Storage:**
- [ ] Create storage account
- [ ] Create containers (full, incremental, wal)
- [ ] Configure access policies
- [ ] Enable encryption

**Google Cloud Storage:**
- [ ] Create GCS bucket
- [ ] Configure lifecycle management
- [ ] Set up service account
- [ ] Enable encryption

### 2.5 Backup Verification

- [ ] Run manual verification
  ```bash
  /usr/local/bin/verify_backups.sh
  ```
- [ ] Test restore on separate server
  ```bash
  createdb citadelbuy_test
  pg_restore -d citadelbuy_test /backups/full/latest.sql.gz
  ```
- [ ] Verify data integrity
  ```sql
  SELECT COUNT(*) FROM orders;
  SELECT COUNT(*) FROM products;
  SELECT COUNT(*) FROM users;
  ```
- [ ] Drop test database
  ```bash
  dropdb citadelbuy_test
  ```

---

## Phase 3: Connection Pooling (PgBouncer)

### 3.1 Installation

- [ ] Install PgBouncer
  ```bash
  sudo apt-get install pgbouncer
  ```
- [ ] Verify installation
  ```bash
  pgbouncer --version
  ```

### 3.2 Configuration

- [ ] Configure pgbouncer.ini
  ```bash
  sudo nano /etc/pgbouncer/pgbouncer.ini
  ```
- [ ] Configure userlist.txt
  ```bash
  sudo nano /etc/pgbouncer/userlist.txt
  ```
- [ ] Set correct permissions
  ```bash
  sudo chown postgres:postgres /etc/pgbouncer/userlist.txt
  sudo chmod 640 /etc/pgbouncer/userlist.txt
  ```

### 3.3 Start & Test

- [ ] Start PgBouncer
  ```bash
  sudo systemctl start pgbouncer
  sudo systemctl enable pgbouncer
  ```
- [ ] Check status
  ```bash
  sudo systemctl status pgbouncer
  ```
- [ ] Test connection
  ```bash
  psql -h localhost -p 6432 -U citadelbuy_app citadelbuy
  ```
- [ ] Check pools
  ```sql
  psql -p 6432 -U postgres pgbouncer -c "SHOW POOLS;"
  ```

### 3.4 Application Configuration

- [ ] Update DATABASE_URL in `.env`
  ```
  DATABASE_URL="postgresql://user:pass@localhost:6432/citadelbuy?pgbouncer=true"
  ```
- [ ] Update Prisma configuration
- [ ] Restart application
  ```bash
  docker-compose restart api
  ```
- [ ] Verify application connectivity
- [ ] Monitor connection pool usage

---

## Phase 4: Monitoring & Alerting

### 4.1 PostgreSQL Extensions

- [ ] Enable pg_stat_statements
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
  ```
- [ ] Configure auto_explain
  ```conf
  shared_preload_libraries = 'pg_stat_statements,auto_explain'
  auto_explain.log_min_duration = 1000
  ```
- [ ] Restart PostgreSQL
  ```bash
  sudo systemctl restart postgresql
  ```

### 4.2 Prometheus Exporter

- [ ] Install postgres_exporter
  ```bash
  wget https://github.com/prometheus-community/postgres_exporter/releases/download/v0.15.0/postgres_exporter-0.15.0.linux-amd64.tar.gz
  tar xvzf postgres_exporter-*.tar.gz
  sudo mv postgres_exporter /usr/local/bin/
  ```
- [ ] Configure exporter
  ```bash
  sudo nano /etc/postgres_exporter/queries.yaml
  ```
- [ ] Create systemd service
- [ ] Start exporter
  ```bash
  sudo systemctl start postgres_exporter
  ```
- [ ] Verify metrics
  ```bash
  curl http://localhost:9187/metrics
  ```

### 4.3 Grafana Dashboards

- [ ] Import PostgreSQL dashboard
- [ ] Configure data source
- [ ] Set up alert rules
- [ ] Test alerts

### 4.4 Alert Configuration

- [ ] Configure Prometheus alerts
  - [ ] BackupTooOld
  - [ ] SlowQueries
  - [ ] CacheHitRatioLow
  - [ ] ConnectionsHigh
  - [ ] WALArchiveFailure
- [ ] Configure notification channels (Slack, email)
- [ ] Test alert delivery

---

## Phase 5: Documentation & Training

### 5.1 Team Documentation

- [ ] Share documentation with team
- [ ] Create runbook for common operations
- [ ] Document emergency contacts
- [ ] Create FAQ document

### 5.2 Team Training

- [ ] Schedule training session
- [ ] Cover backup procedures
- [ ] Cover restore procedures
- [ ] Cover monitoring dashboards
- [ ] Practice DR scenarios

### 5.3 Runbook Creation

- [ ] Backup restoration procedure
- [ ] Point-in-time recovery
- [ ] Performance troubleshooting
- [ ] Common maintenance tasks

---

## Phase 6: Testing & Validation

### 6.1 Performance Testing

- [ ] Run load tests
- [ ] Measure query response times
- [ ] Monitor resource utilization
- [ ] Compare with baseline metrics
- [ ] Document improvements

### 6.2 Backup Testing

- [ ] Test full backup restore
- [ ] Test incremental restore
- [ ] Test PITR (point-in-time recovery)
- [ ] Test WAL replay
- [ ] Verify data consistency

### 6.3 Disaster Recovery Drill

- [ ] Schedule DR drill (off-hours)
- [ ] Simulate database failure
- [ ] Practice restore procedures
- [ ] Measure RTO (Recovery Time Objective)
- [ ] Document lessons learned
- [ ] Update procedures based on findings

---

## Phase 7: Ongoing Maintenance

### 7.1 Daily Tasks

- [ ] Monitor backup completion
- [ ] Check slow query log
- [ ] Review error logs
- [ ] Verify autovacuum activity
- [ ] Check disk space

### 7.2 Weekly Tasks

- [ ] Review index usage statistics
  ```sql
  SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;
  ```
- [ ] Check table/index bloat
- [ ] Review query performance trends
- [ ] Verify backup integrity
- [ ] Update table statistics
  ```sql
  ANALYZE;
  ```

### 7.3 Monthly Tasks

- [ ] REINDEX large tables (during maintenance window)
- [ ] Disaster recovery drill
- [ ] Review and optimize slow queries
- [ ] Capacity planning review
- [ ] Security audit
- [ ] Performance benchmarking

### 7.4 Quarterly Tasks

- [ ] Major version upgrade planning
- [ ] Hardware capacity review
- [ ] Complete DR test
- [ ] Documentation update
- [ ] Team training refresh

---

## Success Criteria

### Performance Metrics

- [ ] Query response time < 100ms (p95)
- [ ] Cache hit ratio > 95%
- [ ] Index usage > 90% of queries
- [ ] Connection pool efficiency > 80%

### Reliability Metrics

- [ ] Uptime > 99.95%
- [ ] Backup success rate = 100%
- [ ] RTO < 1 hour
- [ ] RPO < 15 minutes

### Scalability Metrics

- [ ] Support 10,000+ concurrent users
- [ ] Handle 1M+ transactions/day
- [ ] Query performance stable with growth
- [ ] Database growth < 20% per quarter

---

## Rollback Plan

If issues occur, follow rollback procedures:

### Rollback Indexes

- [ ] List new indexes
  ```sql
  SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_%';
  ```
- [ ] Drop indexes
  ```sql
  DROP INDEX CONCURRENTLY idx_name;
  ```
- [ ] Verify removal

### Rollback Backup Configuration

- [ ] Disable WAL archiving
- [ ] Remove cron jobs
- [ ] Restore original postgresql.conf
- [ ] Restart PostgreSQL

### Restore from Backup (if necessary)

- [ ] Stop application
- [ ] Drop current database
- [ ] Restore from pre-migration backup
- [ ] Verify data integrity
- [ ] Restart application

---

## Sign-off

### Implementation Team

- [ ] Database Administrator: _________________ Date: _______
- [ ] DevOps Engineer: _________________ Date: _______
- [ ] Backend Lead: _________________ Date: _______
- [ ] QA Lead: _________________ Date: _______

### Management Approval

- [ ] Engineering Manager: _________________ Date: _______
- [ ] CTO: _________________ Date: _______

---

## Notes & Issues

**Date**: _____________

**Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Issues Encountered**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Resolutions**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

**Checklist Version**: 1.0
**Last Updated**: December 2025
**Status**: Ready for Implementation
