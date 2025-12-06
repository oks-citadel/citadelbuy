# CitadelBuy Disaster Recovery Plan

**Version:** 1.0.0
**Last Updated:** December 4, 2025
**Owner:** Platform Engineering & SRE Team
**Classification:** Confidential

---

## Table of Contents

1. [Overview](#overview)
2. [Recovery Objectives](#recovery-objectives)
3. [Disaster Scenarios](#disaster-scenarios)
4. [Backup Procedures](#backup-procedures)
5. [Recovery Procedures](#recovery-procedures)
6. [Backup Verification](#backup-verification)
7. [Disaster Response Team](#disaster-response-team)
8. [Testing Schedule](#testing-schedule)
9. [Emergency Contacts](#emergency-contacts)

---

## Overview

This Disaster Recovery (DR) plan provides comprehensive procedures for recovering CitadelBuy services from catastrophic failures. The plan ensures minimal data loss and rapid service restoration.

### Scope

This plan covers:
- Complete datacenter failure
- Database corruption or loss
- Application server failure
- Infrastructure compromise
- Cyber attacks
- Natural disasters affecting primary region

### Recovery Strategy

CitadelBuy uses a multi-region active-passive disaster recovery strategy with:
- **Primary Region**: East US (Production)
- **Secondary Region**: West US (DR Site)
- **Backup Storage**: Geo-redundant storage (GRS)

---

## Recovery Objectives

### Service Level Objectives

| Metric | Target | Maximum Acceptable |
|--------|--------|-------------------|
| **RPO (Recovery Point Objective)** | 15 minutes | 1 hour |
| **RTO (Recovery Time Objective)** | 1 hour | 4 hours |
| **Data Loss** | < 0.1% | < 1% |
| **Uptime SLA** | 99.9% | 99.5% |

### Component-Specific Objectives

| Component | RPO | RTO | Priority |
|-----------|-----|-----|----------|
| **Database (PostgreSQL)** | 15 min | 30 min | Critical |
| **Redis Cache** | 5 min | 15 min | High |
| **File Storage (S3)** | 1 hour | 2 hours | Medium |
| **Application State** | 0 (stateless) | 15 min | Critical |
| **Logs** | 24 hours | N/A | Low |

---

## Disaster Scenarios

### Scenario 1: Complete Region Failure

**Impact**: Total loss of primary region (East US)
**Probability**: Low (once every 5-10 years)
**Recovery**: Failover to West US region

**Response Steps**:
1. Declare disaster event
2. Activate DR team
3. Verify backup availability in West US
4. Update DNS to point to West US endpoints
5. Restore latest database backup
6. Start application services in West US
7. Verify service functionality
8. Monitor for 24 hours

**Estimated Recovery Time**: 2-4 hours

### Scenario 2: Database Corruption

**Impact**: PostgreSQL database corrupted or compromised
**Probability**: Medium (once every 1-2 years)
**Recovery**: Restore from backup

**Response Steps**:
1. Stop all write operations
2. Identify last known good backup
3. Restore database from backup
4. Apply WAL logs for point-in-time recovery
5. Verify data integrity
6. Resume operations

**Estimated Recovery Time**: 30-60 minutes

### Scenario 3: Ransomware Attack

**Impact**: Systems encrypted, data held hostage
**Probability**: Medium (increasing threat)
**Recovery**: Restore from offline backups

**Response Steps**:
1. Isolate affected systems immediately
2. Activate security incident response team
3. Assess scope of compromise
4. Restore from offline/immutable backups
5. Rebuild infrastructure from scratch
6. Implement enhanced security measures
7. Notify affected parties

**Estimated Recovery Time**: 4-8 hours

### Scenario 4: Kubernetes Cluster Failure

**Impact**: AKS cluster completely unavailable
**Probability**: Low-Medium
**Recovery**: Rebuild cluster and redeploy

**Response Steps**:
1. Provision new AKS cluster
2. Restore cluster configuration from Git
3. Deploy applications from container registry
4. Restore stateful data from backups
5. Update DNS/load balancer
6. Verify functionality

**Estimated Recovery Time**: 1-2 hours

### Scenario 5: Data Deletion (Accidental or Malicious)

**Impact**: Critical data deleted
**Probability**: Medium
**Recovery**: Point-in-time recovery

**Response Steps**:
1. Identify scope of deletion
2. Determine recovery point (before deletion)
3. Restore specific tables/data from backup
4. Verify restored data
5. Implement additional safeguards

**Estimated Recovery Time**: 30-90 minutes

---

## Backup Procedures

### 1. Database Backups

#### Full Backups (Daily)

```bash
#!/bin/bash
# Daily full PostgreSQL backup script
# Location: /scripts/backup-database-full.sh

set -e

BACKUP_DIR="/backups/postgres/full"
DATE=$(date +%Y%m%d_%H%M%S)
DB_HOST="citadelbuy-prod.postgres.database.azure.com"
DB_NAME="citadelbuy"
DB_USER="citadelbuy_admin"
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_full_${DATE}.dump"
LOG_FILE="${BACKUP_DIR}/backup_${DATE}.log"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting full database backup..." | tee -a "$LOG_FILE"

# Perform backup
PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h "$DB_HOST" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="$BACKUP_FILE" \
  2>&1 | tee -a "$LOG_FILE"

# Verify backup
PGPASSWORD="${DB_PASSWORD}" pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "[$(date)] Backup completed successfully: $BACKUP_FILE" | tee -a "$LOG_FILE"

    # Upload to Azure Blob Storage
    az storage blob upload \
      --account-name citadelbuybak \
      --container-name database-backups \
      --name "full/$(basename $BACKUP_FILE)" \
      --file "$BACKUP_FILE" \
      --tier Cool

    # Upload to secondary region
    az storage blob copy start \
      --account-name citadelbuybakwest \
      --destination-container database-backups \
      --destination-blob "full/$(basename $BACKUP_FILE)" \
      --source-uri "$(az storage blob url --account-name citadelbuybak --container-name database-backups --name full/$(basename $BACKUP_FILE) --output tsv)"

    # Send success notification
    curl -X POST "${SLACK_WEBHOOK}" \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\"Database backup completed: $(basename $BACKUP_FILE)\"}"
else
    echo "[$(date)] Backup verification failed!" | tee -a "$LOG_FILE"

    # Send failure notification
    curl -X POST "${SLACK_WEBHOOK}" \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\":warning: Database backup FAILED! Check logs immediately.\"}"

    exit 1
fi

# Clean up local backups older than 7 days
find "$BACKUP_DIR" -name "*.dump" -mtime +7 -delete
echo "[$(date)] Cleanup completed" | tee -a "$LOG_FILE"
```

**Schedule**: Daily at 2:00 AM UTC
**Retention**:
- Local: 7 days
- Azure Blob (Primary): 90 days
- Azure Blob (Secondary): 365 days

#### Incremental Backups (Every 6 hours)

```bash
#!/bin/bash
# Incremental backup script using pg_basebackup
# Location: /scripts/backup-database-incremental.sh

set -e

BACKUP_DIR="/backups/postgres/incremental"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/base_${DATE}"

mkdir -p "$BACKUP_PATH"

echo "[$(date)] Starting incremental backup..."

PGPASSWORD="${DB_PASSWORD}" pg_basebackup \
  -h "$DB_HOST" \
  -U "$DB_USER" \
  -D "$BACKUP_PATH" \
  --format=tar \
  --gzip \
  --compress=9 \
  --progress \
  --checkpoint=fast \
  --wal-method=fetch \
  --verbose

# Create archive
tar -czf "${BACKUP_PATH}.tar.gz" -C "$BACKUP_DIR" "base_${DATE}"

# Upload to cloud
az storage blob upload \
  --account-name citadelbuybak \
  --container-name database-backups \
  --name "incremental/$(basename ${BACKUP_PATH}.tar.gz)" \
  --file "${BACKUP_PATH}.tar.gz"

# Clean up local files older than 3 days
find "$BACKUP_DIR" -type f -mtime +3 -delete

echo "[$(date)] Incremental backup completed"
```

**Schedule**: Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)
**Retention**:
- Local: 3 days
- Azure Blob: 30 days

#### WAL (Write-Ahead Log) Archiving (Continuous)

```bash
#!/bin/bash
# WAL archiving script
# Location: /scripts/wal-archive.sh
# Called by PostgreSQL: archive_command = '/scripts/wal-archive.sh %p %f'

WAL_PATH=$1
WAL_FILE=$2
ARCHIVE_DIR="/backups/postgres/wal"
S3_BUCKET="citadelbuy-backups-wal"

mkdir -p "$ARCHIVE_DIR"

# Copy locally
cp "$WAL_PATH" "$ARCHIVE_DIR/$WAL_FILE"

# Upload to primary storage
aws s3 cp "$ARCHIVE_DIR/$WAL_FILE" "s3://${S3_BUCKET}/$WAL_FILE" --storage-class STANDARD_IA

# Upload to secondary region
aws s3 cp "$ARCHIVE_DIR/$WAL_FILE" "s3://${S3_BUCKET}-west/$WAL_FILE" --storage-class STANDARD_IA --region us-west-2

if [ $? -eq 0 ]; then
    echo "$(date): WAL archived: $WAL_FILE" >> /var/log/postgres/wal_archive.log
    exit 0
else
    echo "$(date): WAL archive failed: $WAL_FILE" >> /var/log/postgres/wal_archive.log
    exit 1
fi
```

**PostgreSQL Configuration**:
```conf
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = '/scripts/wal-archive.sh %p %f'
archive_timeout = 300  # 5 minutes
max_wal_senders = 10
wal_keep_size = 1GB
```

**Retention**: 7 days

### 2. Application State Backups

#### Kubernetes Configuration

```bash
#!/bin/bash
# Backup Kubernetes cluster configuration
# Location: /scripts/backup-kubernetes.sh

BACKUP_DIR="/backups/kubernetes"
DATE=$(date +%Y%m%d_%H%M%S)
NAMESPACE="citadelbuy-prod"

mkdir -p "$BACKUP_DIR"

# Export all resources
kubectl get all --namespace=$NAMESPACE -o yaml > "${BACKUP_DIR}/all-resources_${DATE}.yaml"

# Export secrets (encrypted)
kubectl get secrets --namespace=$NAMESPACE -o yaml | \
  gpg --encrypt --recipient devops@citadelbuy.com > "${BACKUP_DIR}/secrets_${DATE}.yaml.gpg"

# Export configmaps
kubectl get configmaps --namespace=$NAMESPACE -o yaml > "${BACKUP_DIR}/configmaps_${DATE}.yaml"

# Export ingress
kubectl get ingress --namespace=$NAMESPACE -o yaml > "${BACKUP_DIR}/ingress_${DATE}.yaml"

# Export persistent volume claims
kubectl get pvc --namespace=$NAMESPACE -o yaml > "${BACKUP_DIR}/pvc_${DATE}.yaml"

# Create tarball
tar -czf "${BACKUP_DIR}/k8s-backup_${DATE}.tar.gz" "${BACKUP_DIR}"/*_${DATE}.yaml*

# Upload to storage
az storage blob upload \
  --account-name citadelbuybak \
  --container-name kubernetes-backups \
  --name "$(basename ${BACKUP_DIR}/k8s-backup_${DATE}.tar.gz)" \
  --file "${BACKUP_DIR}/k8s-backup_${DATE}.tar.gz"

# Clean up old backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
```

**Schedule**: Daily at 1:00 AM UTC
**Retention**: 90 days

### 3. File Storage Backups

```bash
#!/bin/bash
# Backup S3/Blob storage
# Location: /scripts/backup-storage.sh

SOURCE_BUCKET="citadelbuy-prod-assets"
DEST_BUCKET="citadelbuy-backup-assets"
DATE=$(date +%Y%m%d)

# Sync to backup bucket
aws s3 sync "s3://${SOURCE_BUCKET}" "s3://${DEST_BUCKET}/${DATE}/" \
  --storage-class GLACIER_IR \
  --exclude "*.tmp" \
  --exclude "cache/*"

# Create backup manifest
aws s3 ls "s3://${DEST_BUCKET}/${DATE}/" --recursive > "/backups/storage/manifest_${DATE}.txt"

echo "Storage backup completed: ${DEST_BUCKET}/${DATE}/"
```

**Schedule**: Daily at 3:00 AM UTC
**Retention**:
- Hot backup: 30 days
- Cold backup (Glacier): 365 days

### 4. Redis Backup

```bash
#!/bin/bash
# Backup Redis data
# Location: /scripts/backup-redis.sh

BACKUP_DIR="/backups/redis"
DATE=$(date +%Y%m%d_%H%M%S)
REDIS_HOST="citadelbuy-prod.redis.cache.windows.net"

mkdir -p "$BACKUP_DIR"

# Trigger Redis BGSAVE
redis-cli -h "$REDIS_HOST" -p 6380 --tls -a "$REDIS_PASSWORD" BGSAVE

# Wait for save to complete
while [ $(redis-cli -h "$REDIS_HOST" -p 6380 --tls -a "$REDIS_PASSWORD" LASTSAVE) -eq 0 ]; do
    sleep 5
done

# Copy RDB file
redis-cli -h "$REDIS_HOST" -p 6380 --tls -a "$REDIS_PASSWORD" --rdb "${BACKUP_DIR}/redis_${DATE}.rdb"

# Upload to storage
az storage blob upload \
  --account-name citadelbuybak \
  --container-name redis-backups \
  --name "redis_${DATE}.rdb" \
  --file "${BACKUP_DIR}/redis_${DATE}.rdb"

# Clean up
find "$BACKUP_DIR" -name "*.rdb" -mtime +7 -delete
```

**Schedule**: Every 6 hours
**Retention**: 7 days

### 5. Backup Automation (Cron Jobs)

```cron
# /etc/crontab - Backup schedule

# Daily full database backup at 2:00 AM UTC
0 2 * * * root /scripts/backup-database-full.sh

# Incremental backups every 6 hours
0 */6 * * * root /scripts/backup-database-incremental.sh

# Kubernetes configuration daily at 1:00 AM UTC
0 1 * * * root /scripts/backup-kubernetes.sh

# Storage backup daily at 3:00 AM UTC
0 3 * * * root /scripts/backup-storage.sh

# Redis backup every 6 hours
0 */6 * * * root /scripts/backup-redis.sh

# Backup verification daily at 4:00 AM UTC
0 4 * * * root /scripts/verify-backups.sh

# Clean up old logs daily at 5:00 AM UTC
0 5 * * * root /scripts/cleanup-logs.sh
```

---

## Recovery Procedures

### 1. Database Recovery

#### Full Database Restore

```bash
#!/bin/bash
# Restore PostgreSQL database from full backup
# Location: /scripts/restore-database-full.sh

set -e

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <backup-file>"
    echo "Example: $0 citadelbuy_full_20251204_020000.dump"
    exit 1
fi

BACKUP_FILE=$1
DB_HOST="citadelbuy-prod.postgres.database.azure.com"
DB_NAME="citadelbuy"
DB_USER="citadelbuy_admin"

echo "WARNING: This will replace the current database!"
echo "Backup file: $BACKUP_FILE"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled"
    exit 1
fi

# Stop application to prevent writes
echo "Stopping application services..."
kubectl scale deployment/citadelbuy-api -n citadelbuy-prod --replicas=0
kubectl scale deployment/citadelbuy-worker -n citadelbuy-prod --replicas=0

# Wait for pods to terminate
sleep 30

# Download backup if not local
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Downloading backup from Azure..."
    az storage blob download \
      --account-name citadelbuybak \
      --container-name database-backups \
      --name "full/$BACKUP_FILE" \
      --file "/tmp/$BACKUP_FILE"
    BACKUP_FILE="/tmp/$BACKUP_FILE"
fi

# Create restore database
echo "Creating restore point..."
PGPASSWORD="${DB_PASSWORD}" createdb -h "$DB_HOST" -U "$DB_USER" "${DB_NAME}_restore"

# Restore backup
echo "Restoring database..."
PGPASSWORD="${DB_PASSWORD}" pg_restore \
  -h "$DB_HOST" \
  -U "$DB_USER" \
  -d "${DB_NAME}_restore" \
  --verbose \
  --no-owner \
  --no-acl \
  "$BACKUP_FILE"

# Verify restore
echo "Verifying restore..."
ROW_COUNT=$(PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -U "$DB_USER" -d "${DB_NAME}_restore" -t -c "SELECT COUNT(*) FROM \"User\";")
echo "User count: $ROW_COUNT"

# Swap databases
echo "Swapping databases..."
PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -U "$DB_USER" -d postgres <<EOF
ALTER DATABASE "$DB_NAME" RENAME TO "${DB_NAME}_old";
ALTER DATABASE "${DB_NAME}_restore" RENAME TO "$DB_NAME";
EOF

# Restart application
echo "Restarting application services..."
kubectl scale deployment/citadelbuy-api -n citadelbuy-prod --replicas=3
kubectl scale deployment/citadelbuy-worker -n citadelbuy-prod --replicas=2

# Verify application
sleep 60
curl -f https://api.citadelbuy.com/api/health

echo "Database restore completed successfully!"
echo "Old database backed up as: ${DB_NAME}_old"
echo "You can drop it after verification: DROP DATABASE ${DB_NAME}_old;"
```

#### Point-in-Time Recovery (PITR)

```bash
#!/bin/bash
# Point-in-time recovery using WAL logs
# Location: /scripts/restore-database-pitr.sh

set -e

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <base-backup> <recovery-time>"
    echo "Example: $0 base_20251204_000000 '2025-12-04 14:30:00 UTC'"
    exit 1
fi

BASE_BACKUP=$1
RECOVERY_TIME=$2
PGDATA="/var/lib/postgresql/data"

echo "Point-in-Time Recovery"
echo "Base backup: $BASE_BACKUP"
echo "Recovery time: $RECOVERY_TIME"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Recovery cancelled"
    exit 1
fi

# Stop PostgreSQL
systemctl stop postgresql

# Clear data directory
rm -rf "$PGDATA"/*

# Extract base backup
echo "Restoring base backup..."
tar -xzf "/backups/postgres/incremental/${BASE_BACKUP}.tar.gz" -C "$PGDATA"

# Download WAL files
echo "Downloading WAL files..."
mkdir -p "$PGDATA/pg_wal"
aws s3 sync "s3://citadelbuy-backups-wal/" "$PGDATA/pg_wal/"

# Create recovery configuration
cat > "$PGDATA/recovery.conf" <<EOF
restore_command = 'cp /var/lib/postgresql/data/pg_wal/%f %p'
recovery_target_time = '$RECOVERY_TIME'
recovery_target_action = 'promote'
EOF

# Start PostgreSQL in recovery mode
echo "Starting PostgreSQL in recovery mode..."
systemctl start postgresql

# Wait for recovery to complete
echo "Waiting for recovery to complete..."
while ! pg_isready; do
    sleep 5
done

# Verify recovery
echo "Verifying recovery..."
psql -c "SELECT pg_last_wal_replay_lsn(), pg_is_in_recovery();"

echo "Point-in-time recovery completed!"
```

### 2. Kubernetes Cluster Recovery

```bash
#!/bin/bash
# Restore Kubernetes cluster from backup
# Location: /scripts/restore-kubernetes.sh

set -e

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <backup-date>"
    echo "Example: $0 20251204"
    exit 1
fi

BACKUP_DATE=$1
BACKUP_FILE="k8s-backup_${BACKUP_DATE}.tar.gz"
NAMESPACE="citadelbuy-prod"

# Download backup
echo "Downloading Kubernetes backup..."
az storage blob download \
  --account-name citadelbuybak \
  --container-name kubernetes-backups \
  --name "$BACKUP_FILE" \
  --file "/tmp/$BACKUP_FILE"

# Extract backup
mkdir -p "/tmp/k8s-restore"
tar -xzf "/tmp/$BACKUP_FILE" -C "/tmp/k8s-restore"

# Recreate namespace
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Restore secrets (decrypt first)
gpg --decrypt "/tmp/k8s-restore/secrets_${BACKUP_DATE}.yaml.gpg" | \
  kubectl apply -f - --namespace=$NAMESPACE

# Restore configmaps
kubectl apply -f "/tmp/k8s-restore/configmaps_${BACKUP_DATE}.yaml" --namespace=$NAMESPACE

# Restore PVCs
kubectl apply -f "/tmp/k8s-restore/pvc_${BACKUP_DATE}.yaml" --namespace=$NAMESPACE

# Restore ingress
kubectl apply -f "/tmp/k8s-restore/ingress_${BACKUP_DATE}.yaml" --namespace=$NAMESPACE

# Restore deployments, services, etc.
kubectl apply -f "/tmp/k8s-restore/all-resources_${BACKUP_DATE}.yaml" --namespace=$NAMESPACE

echo "Kubernetes restore completed!"
```

### 3. Regional Failover Procedure

```bash
#!/bin/bash
# Failover to secondary region (West US)
# Location: /scripts/failover-region.sh

set -e

echo "=== DISASTER RECOVERY: REGIONAL FAILOVER ==="
echo "This will failover from East US to West US"
echo "Current time: $(date)"
read -p "Confirm failover? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Failover cancelled"
    exit 1
fi

# 1. Verify West US infrastructure
echo "Step 1: Verifying West US infrastructure..."
az aks get-credentials \
  --resource-group citadelbuy-dr-rg \
  --name citadelbuy-dr-aks \
  --overwrite-existing

kubectl cluster-info

# 2. Restore latest database backup
echo "Step 2: Restoring database in West US..."
LATEST_BACKUP=$(az storage blob list \
  --account-name citadelbuybakwest \
  --container-name database-backups \
  --prefix full/ \
  --query "reverse(sort_by([].{name:name, time:properties.lastModified}, &time))[0].name" \
  --output tsv)

echo "Latest backup: $LATEST_BACKUP"
/scripts/restore-database-full.sh "$LATEST_BACKUP"

# 3. Deploy applications
echo "Step 3: Deploying applications in West US..."
kubectl apply -f /infrastructure/kubernetes/dr/ -n citadelbuy-prod

# Wait for deployments
kubectl rollout status deployment/citadelbuy-api -n citadelbuy-prod --timeout=600s
kubectl rollout status deployment/citadelbuy-web -n citadelbuy-prod --timeout=600s

# 4. Update DNS
echo "Step 4: Updating DNS to West US..."
az network dns record-set cname set-record \
  --resource-group citadelbuy-dns-rg \
  --zone-name citadelbuy.com \
  --record-set-name @ \
  --cname citadelbuy-dr.westus.cloudapp.azure.com

# 5. Verify services
echo "Step 5: Verifying services..."
sleep 60
curl -f https://api.citadelbuy.com/api/health

# 6. Send notifications
echo "Step 6: Sending notifications..."
curl -X POST "${SLACK_WEBHOOK}" \
  -H 'Content-Type: application/json' \
  -d '{"text":"🚨 FAILOVER COMPLETED: Services now running in West US"}'

echo "=== FAILOVER COMPLETED SUCCESSFULLY ==="
echo "Primary region: West US"
echo "Monitor services closely for next 24 hours"
```

---

## Backup Verification

### Daily Verification Script

```bash
#!/bin/bash
# Verify all backups are working
# Location: /scripts/verify-backups.sh

set -e

REPORT_FILE="/var/log/backup-verification-$(date +%Y%m%d).log"

echo "=== Backup Verification Report ===" > "$REPORT_FILE"
echo "Date: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 1. Verify database backup
echo "1. Database Backup Verification" >> "$REPORT_FILE"
LATEST_DB_BACKUP=$(find /backups/postgres/full -name "*.dump" -type f -mtime -1 | head -n 1)

if [ -n "$LATEST_DB_BACKUP" ]; then
    pg_restore --list "$LATEST_DB_BACKUP" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "  ✓ Database backup valid: $(basename $LATEST_DB_BACKUP)" >> "$REPORT_FILE"
    else
        echo "  ✗ Database backup INVALID!" >> "$REPORT_FILE"
    fi
else
    echo "  ✗ No recent database backup found!" >> "$REPORT_FILE"
fi

# 2. Verify WAL archiving
echo "" >> "$REPORT_FILE"
echo "2. WAL Archive Verification" >> "$REPORT_FILE"
WAL_COUNT=$(aws s3 ls s3://citadelbuy-backups-wal/ | wc -l)
echo "  WAL files in archive: $WAL_COUNT" >> "$REPORT_FILE"

if [ $WAL_COUNT -gt 100 ]; then
    echo "  ✓ WAL archiving working" >> "$REPORT_FILE"
else
    echo "  ✗ WAL archive may be incomplete!" >> "$REPORT_FILE"
fi

# 3. Verify cloud backup replication
echo "" >> "$REPORT_FILE"
echo "3. Cloud Backup Replication" >> "$REPORT_FILE"

PRIMARY_COUNT=$(az storage blob list \
  --account-name citadelbuybak \
  --container-name database-backups \
  --query "length([?properties.lastModified >= '$(date -d '7 days ago' -I)'])" \
  --output tsv)

SECONDARY_COUNT=$(az storage blob list \
  --account-name citadelbuybakwest \
  --container-name database-backups \
  --query "length([?properties.lastModified >= '$(date -d '7 days ago' -I)'])" \
  --output tsv)

echo "  Primary region backups (7 days): $PRIMARY_COUNT" >> "$REPORT_FILE"
echo "  Secondary region backups (7 days): $SECONDARY_COUNT" >> "$REPORT_FILE"

if [ $PRIMARY_COUNT -eq $SECONDARY_COUNT ]; then
    echo "  ✓ Backup replication in sync" >> "$REPORT_FILE"
else
    echo "  ✗ Backup replication OUT OF SYNC!" >> "$REPORT_FILE"
fi

# 4. Test restore (monthly)
if [ $(date +%d) -eq "01" ]; then
    echo "" >> "$REPORT_FILE"
    echo "4. Monthly Restore Test" >> "$REPORT_FILE"

    # Restore to test database
    /scripts/restore-database-full.sh "$LATEST_DB_BACKUP" --test-mode

    if [ $? -eq 0 ]; then
        echo "  ✓ Restore test PASSED" >> "$REPORT_FILE"
    else
        echo "  ✗ Restore test FAILED!" >> "$REPORT_FILE"
    fi
fi

# Send report
cat "$REPORT_FILE"
cat "$REPORT_FILE" | mail -s "Backup Verification Report" devops@citadelbuy.com

# Alert on failures
if grep -q "✗" "$REPORT_FILE"; then
    curl -X POST "${SLACK_WEBHOOK}" \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\":warning: Backup verification FAILED! Check $REPORT_FILE\"}"
fi
```

**Schedule**: Daily at 4:00 AM UTC

---

## Disaster Response Team

### Team Structure

| Role | Name | Primary Responsibility | Contact |
|------|------|----------------------|---------|
| **Disaster Coordinator** | [Name] | Overall incident command | +1-XXX-XXX-XXXX |
| **Database Lead** | [Name] | Database recovery | +1-XXX-XXX-XXXX |
| **Infrastructure Lead** | [Name] | Infrastructure restoration | +1-XXX-XXX-XXXX |
| **Application Lead** | [Name] | Application deployment | +1-XXX-XXX-XXXX |
| **Security Lead** | [Name] | Security assessment | +1-XXX-XXX-XXXX |
| **Communications Lead** | [Name] | Stakeholder updates | +1-XXX-XXX-XXXX |

### Escalation Chain

1. **On-Call Engineer** (First responder)
2. **Disaster Coordinator** (Declares disaster event)
3. **Engineering Manager** (Resource allocation)
4. **CTO** (Executive decisions)
5. **CEO** (Public communications)

---

## Testing Schedule

### Quarterly DR Tests

| Quarter | Test Type | Scope |
|---------|-----------|-------|
| **Q1** | Database restore | Full database recovery |
| **Q2** | Regional failover | Complete failover to West US |
| **Q3** | Ransomware simulation | Restore from offline backups |
| **Q4** | Full disaster drill | All systems recovery |

### Test Documentation Template

```markdown
# DR Test Report

**Date**: [Date]
**Test Type**: [Database/Regional/Full]
**Conducted By**: [Name]

## Objectives
- [ ] Objective 1
- [ ] Objective 2

## Results
- RTO Actual: [Time]
- RPO Actual: [Time]
- Data Loss: [Percentage]

## Issues Encountered
1. [Issue description]

## Improvements Needed
1. [Improvement]

## Sign-off
- Tested By: [Name]
- Reviewed By: [Name]
- Date: [Date]
```

---

## Emergency Contacts

### Internal Team

- **Emergency Hotline**: +1-XXX-XXX-XXXX
- **DevOps Team**: devops@citadelbuy.com
- **Security Team**: security@citadelbuy.com
- **Executive Team**: exec@citadelbuy.com

### External Vendors

| Vendor | Support Contact | Phone | Priority Level |
|--------|----------------|-------|----------------|
| **Microsoft Azure** | azure.com/support | +1-800-642-7676 | Business Critical |
| **AWS** | aws.amazon.com/support | Via console | Business |
| **SendGrid** | support.sendgrid.com | Via dashboard | High |
| **Stripe** | support.stripe.com | Via dashboard | Critical |

### Communication Channels

- **Status Page**: status.citadelbuy.com
- **Slack**: #disaster-recovery
- **Email**: dr-team@citadelbuy.com
- **Emergency Phone**: PagerDuty

---

**Document Classification**: Confidential
**Access Level**: DR Team, Engineering Leadership
**Review Frequency**: Quarterly
**Last Tested**: [Date]

---

**Document Version History:**

- v1.0.0 (December 4, 2025): Initial disaster recovery plan
