# Broxiva Database Backup Strategy

## Table of Contents

1. [Overview](#overview)
2. [Backup Types](#backup-types)
3. [Automated Backup Procedures](#automated-backup-procedures)
4. [Point-in-Time Recovery (PITR)](#point-in-time-recovery-pitr)
5. [Backup Retention Policies](#backup-retention-policies)
6. [Disaster Recovery Procedures](#disaster-recovery-procedures)
7. [Backup Verification & Testing](#backup-verification--testing)
8. [Cloud Provider Specific Instructions](#cloud-provider-specific-instructions)
9. [Monitoring & Alerting](#monitoring--alerting)
10. [Security & Compliance](#security--compliance)

---

## Overview

This document outlines the comprehensive database backup and recovery strategy for Broxiva's PostgreSQL database infrastructure. The strategy is designed to:

- **Minimize data loss** through automated, frequent backups
- **Enable rapid recovery** from various failure scenarios
- **Ensure compliance** with data protection regulations
- **Maintain business continuity** during disaster events

### Recovery Objectives

- **RPO (Recovery Point Objective)**: ≤ 15 minutes
- **RTO (Recovery Time Objective)**: ≤ 1 hour for critical systems
- **Data Retention**: Minimum 90 days, extended for compliance

---

## Backup Types

### 1. Full Backups (pg_dump)

Full logical backups capture the entire database schema and data.

**Frequency**: Daily at 2:00 AM UTC
**Retention**: 7 days

**Command**:
```bash
#!/bin/bash
# Full database backup script

BACKUP_DIR="/backups/full"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="broxiva"
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_full_${DATE}.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Perform backup with compression
pg_dump -h localhost -U postgres -d $DB_NAME \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="$BACKUP_FILE" \
  2>&1 | tee "$BACKUP_DIR/backup_${DATE}.log"

# Verify backup integrity
pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✓ Backup completed successfully: $BACKUP_FILE"
    # Upload to cloud storage
    aws s3 cp "$BACKUP_FILE" "s3://broxiva-backups/full/" --storage-class STANDARD_IA
else
    echo "✗ Backup verification failed!"
    exit 1
fi
```

### 2. Incremental Backups (pg_basebackup)

Physical backups for faster recovery and PITR capability.

**Frequency**: Every 6 hours
**Retention**: 3 days

**Command**:
```bash
#!/bin/bash
# Incremental physical backup script

BACKUP_DIR="/backups/base"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/base_${DATE}"

mkdir -p "$BACKUP_PATH"

# Create base backup
pg_basebackup -h localhost -U postgres \
  -D "$BACKUP_PATH" \
  --format=tar \
  --gzip \
  --compress=9 \
  --progress \
  --checkpoint=fast \
  --wal-method=fetch \
  --verbose

# Compress and upload
tar -czf "${BACKUP_PATH}.tar.gz" -C "$BACKUP_DIR" "base_${DATE}"
aws s3 cp "${BACKUP_PATH}.tar.gz" "s3://broxiva-backups/base/"

# Clean up local files older than 3 days
find "$BACKUP_DIR" -type f -mtime +3 -delete
```

### 3. WAL (Write-Ahead Log) Archiving

Continuous archiving for point-in-time recovery.

**Frequency**: Continuous (every WAL segment)
**Retention**: 7 days

**PostgreSQL Configuration** (`postgresql.conf`):
```conf
# WAL Configuration
wal_level = replica
archive_mode = on
archive_command = '/usr/local/bin/wal_archive.sh %p %f'
archive_timeout = 300  # Archive every 5 minutes
max_wal_senders = 10
wal_keep_size = 1GB

# Checkpoint Configuration
checkpoint_timeout = 15min
checkpoint_completion_target = 0.9
```

**WAL Archive Script** (`/usr/local/bin/wal_archive.sh`):
```bash
#!/bin/bash
# WAL archiving script
# Parameters: $1 = path to WAL file, $2 = WAL filename

WAL_PATH=$1
WAL_FILE=$2
ARCHIVE_DIR="/backups/wal"
S3_BUCKET="s3://broxiva-backups/wal"

# Create archive directory
mkdir -p "$ARCHIVE_DIR"

# Copy WAL file locally
cp "$WAL_PATH" "$ARCHIVE_DIR/$WAL_FILE"

# Upload to S3 with error handling
if aws s3 cp "$ARCHIVE_DIR/$WAL_FILE" "$S3_BUCKET/$WAL_FILE" --storage-class STANDARD_IA; then
    echo "$(date): WAL archived successfully: $WAL_FILE" >> /var/log/postgresql/wal_archive.log
    exit 0
else
    echo "$(date): WAL archive failed: $WAL_FILE" >> /var/log/postgresql/wal_archive.log
    exit 1
fi
```

### 4. Table-Specific Backups

Critical tables backed up more frequently.

**Frequency**: Hourly for critical tables (orders, transactions)
**Retention**: 24 hours

**Command**:
```bash
#!/bin/bash
# Critical tables backup

TABLES=("orders" "order_items" "payments" "gift_card_transactions" "store_credit_transactions")
BACKUP_DIR="/backups/tables"
DATE=$(date +%Y%m%d_%H%M%S)

for TABLE in "${TABLES[@]}"; do
    pg_dump -h localhost -U postgres -d broxiva \
      --table=$TABLE \
      --format=custom \
      --compress=9 \
      --file="$BACKUP_DIR/${TABLE}_${DATE}.dump"

    aws s3 cp "$BACKUP_DIR/${TABLE}_${DATE}.dump" \
      "s3://broxiva-backups/tables/$TABLE/"
done
```

---

## Automated Backup Procedures

### Cron Schedule

Add to `/etc/crontab` or use systemd timers:

```cron
# Full database backup - Daily at 2:00 AM UTC
0 2 * * * postgres /usr/local/bin/full_backup.sh

# Incremental backup - Every 6 hours
0 */6 * * * postgres /usr/local/bin/incremental_backup.sh

# Critical tables - Hourly
0 * * * * postgres /usr/local/bin/tables_backup.sh

# Backup verification - Daily at 3:00 AM UTC
0 3 * * * postgres /usr/local/bin/verify_backups.sh

# Cleanup old backups - Daily at 4:00 AM UTC
0 4 * * * postgres /usr/local/bin/cleanup_backups.sh
```

### Systemd Timer (Alternative)

**Service file** (`/etc/systemd/system/postgres-backup.service`):
```ini
[Unit]
Description=PostgreSQL Full Backup
After=postgresql.service

[Service]
Type=oneshot
User=postgres
ExecStart=/usr/local/bin/full_backup.sh
StandardOutput=journal
StandardError=journal
```

**Timer file** (`/etc/systemd/system/postgres-backup.timer`):
```ini
[Unit]
Description=Daily PostgreSQL Backup Timer

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable timer:
```bash
sudo systemctl enable postgres-backup.timer
sudo systemctl start postgres-backup.timer
```

---

## Point-in-Time Recovery (PITR)

### Setup WAL Archiving

1. **Configure PostgreSQL** for continuous archiving (see WAL Configuration above)

2. **Create recovery configuration template** (`recovery.conf.template`):
```conf
restore_command = '/usr/local/bin/wal_restore.sh %f %p'
recovery_target_time = '2025-12-03 14:30:00 UTC'
recovery_target_action = 'promote'
```

### WAL Restore Script

**File**: `/usr/local/bin/wal_restore.sh`
```bash
#!/bin/bash
# WAL restore script for PITR
# Parameters: $1 = WAL filename, $2 = target path

WAL_FILE=$1
TARGET_PATH=$2
S3_BUCKET="s3://broxiva-backups/wal"
LOCAL_ARCHIVE="/backups/wal"

# Try local archive first
if [ -f "$LOCAL_ARCHIVE/$WAL_FILE" ]; then
    cp "$LOCAL_ARCHIVE/$WAL_FILE" "$TARGET_PATH"
    exit 0
fi

# Download from S3
if aws s3 cp "$S3_BUCKET/$WAL_FILE" "$TARGET_PATH"; then
    exit 0
else
    exit 1
fi
```

### Performing PITR

```bash
#!/bin/bash
# Point-in-time recovery procedure

# 1. Stop PostgreSQL
sudo systemctl stop postgresql

# 2. Backup current data directory
sudo mv /var/lib/postgresql/14/main /var/lib/postgresql/14/main.old

# 3. Extract base backup
BACKUP_DATE="20251203_020000"
sudo tar -xzf /backups/base/base_${BACKUP_DATE}.tar.gz -C /var/lib/postgresql/14/

# 4. Create recovery.conf
cat > /var/lib/postgresql/14/main/recovery.conf <<EOF
restore_command = '/usr/local/bin/wal_restore.sh %f %p'
recovery_target_time = '2025-12-03 14:30:00 UTC'
recovery_target_action = 'promote'
EOF

# 5. Set permissions
sudo chown -R postgres:postgres /var/lib/postgresql/14/main

# 6. Start PostgreSQL (it will enter recovery mode)
sudo systemctl start postgresql

# 7. Monitor recovery progress
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### Recovery Validation

```sql
-- Check recovery status
SELECT pg_is_in_recovery();

-- Check last WAL received/replayed
SELECT pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn();

-- Verify data integrity
SELECT COUNT(*) FROM orders WHERE created_at <= '2025-12-03 14:30:00';
```

---

## Backup Retention Policies

### Retention Schedule

| Backup Type | Frequency | Local Retention | S3 Standard | S3 Glacier | Total Retention |
|-------------|-----------|-----------------|-------------|------------|-----------------|
| Full Backups | Daily | 7 days | 30 days | 60 days | 90 days |
| Incremental | 6 hours | 3 days | 7 days | - | 7 days |
| WAL Archives | Continuous | 1 day | 7 days | - | 7 days |
| Table Backups | Hourly | 24 hours | 7 days | - | 7 days |
| Monthly Snapshots | Monthly | - | 90 days | 365 days | 1 year |

### S3 Lifecycle Policy

**AWS S3 Lifecycle Configuration**:
```json
{
  "Rules": [
    {
      "Id": "full-backup-lifecycle",
      "Status": "Enabled",
      "Prefix": "full/",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 60,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 90
      }
    },
    {
      "Id": "wal-lifecycle",
      "Status": "Enabled",
      "Prefix": "wal/",
      "Expiration": {
        "Days": 7
      }
    },
    {
      "Id": "monthly-snapshots",
      "Status": "Enabled",
      "Prefix": "monthly/",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER_DEEP_ARCHIVE"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

### Cleanup Script

```bash
#!/bin/bash
# Cleanup old backups according to retention policy

BACKUP_BASE="/backups"

# Local cleanup
find "$BACKUP_BASE/full" -type f -mtime +7 -delete
find "$BACKUP_BASE/base" -type f -mtime +3 -delete
find "$BACKUP_BASE/wal" -type f -mtime +1 -delete
find "$BACKUP_BASE/tables" -type f -mtime +1 -delete

# S3 cleanup (handled by lifecycle policies)
echo "✓ Local backups cleaned up. S3 cleanup handled by lifecycle policies."
```

---

## Disaster Recovery Procedures

### Scenario 1: Database Corruption

**Symptoms**: Queries failing, data inconsistencies
**Recovery Time**: 30-60 minutes

**Steps**:
```bash
# 1. Assess damage
psql -c "SELECT * FROM pg_stat_database_conflicts;"

# 2. Stop application
docker-compose stop api

# 3. Create backup of corrupted database
pg_dump broxiva > /tmp/corrupted_$(date +%Y%m%d).sql

# 4. Restore from latest full backup
dropdb broxiva
createdb broxiva
pg_restore -d broxiva /backups/full/broxiva_full_latest.sql.gz

# 5. Verify integrity
psql -d broxiva -c "SELECT COUNT(*) FROM orders;"

# 6. Restart application
docker-compose start api
```

### Scenario 2: Complete Server Failure

**Symptoms**: Server hardware failure, complete data loss
**Recovery Time**: 2-4 hours

**Steps**:
```bash
# 1. Provision new server
# (Use infrastructure as code - Terraform/CloudFormation)

# 2. Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql-14

# 3. Download latest base backup from S3
aws s3 cp s3://broxiva-backups/base/latest.tar.gz /tmp/

# 4. Extract backup
sudo systemctl stop postgresql
sudo rm -rf /var/lib/postgresql/14/main
sudo tar -xzf /tmp/latest.tar.gz -C /var/lib/postgresql/14/

# 5. Configure recovery
cat > /var/lib/postgresql/14/main/recovery.conf <<EOF
restore_command = 'aws s3 cp s3://broxiva-backups/wal/%f %p'
recovery_target_timeline = 'latest'
EOF

# 6. Start PostgreSQL
sudo systemctl start postgresql

# 7. Wait for recovery to complete
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# 8. Promote to master
psql -c "SELECT pg_wal_replay_resume();"
```

### Scenario 3: Accidental Data Deletion

**Symptoms**: Critical data deleted by user error
**Recovery Time**: 15-30 minutes

**Steps**:
```bash
# 1. Identify deletion time
psql -c "SELECT txid_current();"

# 2. Perform PITR to just before deletion
# (See PITR section above)

# 3. Export deleted data
pg_dump -t deleted_table --data-only > /tmp/recovered_data.sql

# 4. Import into production (if PITR was on separate server)
psql broxiva < /tmp/recovered_data.sql

# 5. Verify recovery
psql -c "SELECT COUNT(*) FROM deleted_table WHERE id IN (...);"
```

### Scenario 4: Ransomware Attack

**Symptoms**: Database encrypted, ransom demand
**Recovery Time**: 4-8 hours

**Steps**:
```bash
# 1. Isolate infected systems
sudo iptables -A INPUT -j DROP
sudo systemctl stop postgresql

# 2. Scan for malware
sudo clamscan -r /var/lib/postgresql/

# 3. Provision clean server in isolated network

# 4. Restore from backup (assume backups are encrypted and stored securely)
aws s3 cp s3://broxiva-backups/full/pre-attack-backup.sql.gz /tmp/
pg_restore -d broxiva /tmp/pre-attack-backup.sql.gz

# 5. Security audit and patching
# - Update all passwords
# - Review audit logs
# - Apply security patches
# - Implement additional security measures

# 6. Gradual service restoration with monitoring
```

---

## Backup Verification & Testing

### Automated Verification

**Verification Script** (`/usr/local/bin/verify_backups.sh`):
```bash
#!/bin/bash
# Automated backup verification

BACKUP_DIR="/backups/full"
LATEST_BACKUP=$(ls -t $BACKUP_DIR/*.sql.gz | head -1)
TEST_DB="broxiva_verify"
VERIFICATION_LOG="/var/log/postgresql/backup_verification.log"

echo "$(date): Starting backup verification for $LATEST_BACKUP" >> $VERIFICATION_LOG

# Drop test database if exists
dropdb --if-exists $TEST_DB

# Create test database
createdb $TEST_DB

# Restore backup
if pg_restore -d $TEST_DB "$LATEST_BACKUP" 2>&1 | tee -a $VERIFICATION_LOG; then
    echo "✓ Backup restore successful" >> $VERIFICATION_LOG
else
    echo "✗ Backup restore failed!" >> $VERIFICATION_LOG
    # Send alert
    /usr/local/bin/send_alert.sh "CRITICAL: Backup verification failed"
    exit 1
fi

# Run integrity checks
psql -d $TEST_DB -c "
    SELECT
        'orders' AS table_name, COUNT(*) AS row_count
    FROM orders
    UNION ALL
    SELECT 'users', COUNT(*) FROM users
    UNION ALL
    SELECT 'products', COUNT(*) FROM products;
" >> $VERIFICATION_LOG

# Calculate checksums
psql -d $TEST_DB -c "
    SELECT
        md5(string_agg(id::text, '' ORDER BY id)) AS checksum
    FROM orders;
" >> $VERIFICATION_LOG

# Clean up test database
dropdb $TEST_DB

echo "$(date): Verification completed successfully" >> $VERIFICATION_LOG
```

### Monthly Disaster Recovery Drill

**Schedule**: First Sunday of each month
**Duration**: 4 hours
**Participants**: DevOps team, DBA, Engineering lead

**Drill Procedure**:
1. Select random backup from previous month
2. Provision isolated test environment
3. Perform full restore
4. Verify data integrity (checksums, row counts)
5. Test application connectivity
6. Simulate point-in-time recovery
7. Document results and lessons learned
8. Update runbooks based on findings

**Success Criteria**:
- ✓ Restore completed within RTO (1 hour)
- ✓ Data integrity validated (100% match)
- ✓ Application functional tests pass
- ✓ Team can execute without referring to documentation

---

## Cloud Provider Specific Instructions

### AWS RDS

**Automated Backups**:
```bash
# Enable automated backups
aws rds modify-db-instance \
  --db-instance-identifier broxiva-prod \
  --backup-retention-period 7 \
  --preferred-backup-window "02:00-03:00" \
  --apply-immediately

# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier broxiva-prod \
  --db-snapshot-identifier broxiva-manual-$(date +%Y%m%d)

# Enable PITR
aws rds modify-db-instance \
  --db-instance-identifier broxiva-prod \
  --backup-retention-period 7 \
  --apply-immediately
```

**Point-in-Time Restore**:
```bash
# Restore to specific time
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier broxiva-prod \
  --target-db-instance-identifier broxiva-pitr-restore \
  --restore-time "2025-12-03T14:30:00Z"
```

**Cross-Region Backup**:
```bash
# Copy snapshot to another region
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier arn:aws:rds:us-east-1:123456789012:snapshot:broxiva-snapshot \
  --target-db-snapshot-identifier broxiva-dr-snapshot \
  --region us-west-2
```

### Azure Database for PostgreSQL

**Automated Backups**:
```bash
# Configure backup retention
az postgres server update \
  --resource-group broxiva-rg \
  --name broxiva-prod \
  --backup-retention 7 \
  --geo-redundant-backup Enabled

# Create manual backup
az postgres server backup create \
  --resource-group broxiva-rg \
  --server-name broxiva-prod \
  --backup-name broxiva-manual-$(date +%Y%m%d)
```

**Point-in-Time Restore**:
```bash
# Restore to point in time
az postgres server restore \
  --resource-group broxiva-rg \
  --name broxiva-pitr-restore \
  --source-server broxiva-prod \
  --restore-point-in-time "2025-12-03T14:30:00Z"
```

**Geo-Replication**:
```bash
# Create read replica in different region
az postgres server replica create \
  --resource-group broxiva-rg \
  --name broxiva-replica-westus \
  --source-server broxiva-prod \
  --location westus
```

### Google Cloud SQL

**Automated Backups**:
```bash
# Enable automated backups
gcloud sql instances patch broxiva-prod \
  --backup-start-time=02:00 \
  --retained-backups-count=7 \
  --enable-point-in-time-recovery

# Create on-demand backup
gcloud sql backups create \
  --instance=broxiva-prod \
  --description="Manual backup $(date +%Y%m%d)"
```

**Point-in-Time Recovery**:
```bash
# Clone instance to specific time
gcloud sql instances clone broxiva-prod broxiva-pitr-restore \
  --point-in-time '2025-12-03T14:30:00.000Z'
```

**Cross-Region Backup**:
```bash
# Export to Cloud Storage
gcloud sql export sql broxiva-prod gs://broxiva-backups/export-$(date +%Y%m%d).sql \
  --database=broxiva

# Import in different region
gcloud sql import sql broxiva-dr-instance gs://broxiva-backups/export-20251203.sql \
  --database=broxiva
```

---

## Monitoring & Alerting

### Backup Monitoring

**Prometheus Metrics**:
```yaml
# /etc/prometheus/postgres_exporter.yml
metrics:
  - pg_stat_archiver:
      query: "SELECT * FROM pg_stat_archiver"
      metrics:
        - archived_count:
            usage: "COUNTER"
            description: "Number of WAL files archived"
        - failed_count:
            usage: "COUNTER"
            description: "Number of failed WAL archive attempts"

  - backup_age:
      query: "SELECT EXTRACT(epoch FROM (NOW() - MAX(backup_time))) as age FROM backups"
      metrics:
        - age:
            usage: "GAUGE"
            description: "Age of last backup in seconds"
```

**Alerting Rules**:
```yaml
# /etc/prometheus/rules/backup_alerts.yml
groups:
  - name: backup_alerts
    rules:
      - alert: BackupTooOld
        expr: backup_age > 86400  # 24 hours
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: "Database backup is too old"
          description: "Last backup was {{ $value }} seconds ago"

      - alert: WALArchiveFailure
        expr: rate(pg_stat_archiver_failed_count[5m]) > 0
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "WAL archiving is failing"
          description: "{{ $value }} WAL files failed to archive in last 5 minutes"

      - alert: BackupVerificationFailed
        expr: backup_verification_status == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Backup verification failed"
          description: "Latest backup failed integrity check"
```

### Alert Notification

**Slack Webhook** (`/usr/local/bin/send_alert.sh`):
```bash
#!/bin/bash
# Send alert to Slack

MESSAGE=$1
WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"🚨 BACKUP ALERT: $MESSAGE\"}" \
  $WEBHOOK_URL
```

**Email Alert**:
```bash
#!/bin/bash
# Send email alert

MESSAGE=$1
TO="devops@broxiva.com"
SUBJECT="[CRITICAL] Database Backup Alert"

echo "$MESSAGE" | mail -s "$SUBJECT" "$TO"
```

---

## Security & Compliance

### Encryption

**Encryption at Rest**:
```bash
# PostgreSQL data encryption with LUKS
sudo cryptsetup luksFormat /dev/sdb
sudo cryptsetup luksOpen /dev/sdb pgdata
sudo mkfs.ext4 /dev/mapper/pgdata
sudo mount /dev/mapper/pgdata /var/lib/postgresql
```

**Backup Encryption**:
```bash
#!/bin/bash
# Encrypted backup with GPG

GPG_RECIPIENT="backup@broxiva.com"
BACKUP_FILE="broxiva_$(date +%Y%m%d).sql"

# Create encrypted backup
pg_dump broxiva | gzip | gpg --encrypt --recipient $GPG_RECIPIENT > "$BACKUP_FILE.gpg"

# Upload to S3
aws s3 cp "$BACKUP_FILE.gpg" s3://broxiva-backups/encrypted/
```

**S3 Encryption**:
```bash
# Enable S3 bucket encryption
aws s3api put-bucket-encryption \
  --bucket broxiva-backups \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### Access Control

**IAM Policy for Backups**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BackupWrite",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::broxiva-backups/*"
    },
    {
      "Sid": "BackupRead",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::broxiva-backups",
        "arn:aws:s3:::broxiva-backups/*"
      ]
    }
  ]
}
```

### Compliance

**Audit Logging**:
```sql
-- Enable PostgreSQL audit logging
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_line_prefix = '%t [%p]: user=%u,db=%d,app=%a,client=%h ';

-- Reload configuration
SELECT pg_reload_conf();
```

**Backup Audit Trail**:
```bash
#!/bin/bash
# Log backup operations for compliance

AUDIT_LOG="/var/log/backup_audit.log"

log_backup_event() {
    local ACTION=$1
    local STATUS=$2
    local DETAILS=$3

    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | USER=$(whoami) | ACTION=$ACTION | STATUS=$STATUS | DETAILS=$DETAILS" >> $AUDIT_LOG
}

# Example usage
log_backup_event "FULL_BACKUP" "SUCCESS" "broxiva_full_20251203.sql.gz"
```

---

## Appendix

### Backup Checklist

- [ ] Automated backups configured and running
- [ ] WAL archiving enabled and tested
- [ ] Backup verification automated
- [ ] Disaster recovery plan documented
- [ ] Monthly DR drills scheduled
- [ ] Monitoring and alerting configured
- [ ] Backup encryption enabled
- [ ] Access controls implemented
- [ ] Compliance requirements met
- [ ] Team trained on recovery procedures

### Contact Information

**Primary DBA**: dba@broxiva.com
**DevOps On-Call**: oncall@broxiva.com
**Emergency Hotline**: +1-XXX-XXX-XXXX

### References

- [PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html)
- [AWS RDS Backup Guide](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_CommonTasks.BackupRestore.html)
- [Azure PostgreSQL Backup](https://docs.microsoft.com/en-us/azure/postgresql/)
- [Google Cloud SQL Backup](https://cloud.google.com/sql/docs/postgres/backup-recovery/)

---

**Document Version**: 1.0
**Last Updated**: December 2025
**Next Review**: March 2026
