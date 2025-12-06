# Elasticsearch Production Deployment Checklist

Use this checklist to ensure a successful Elasticsearch production deployment.

---

## Pre-Deployment

### 1. Infrastructure Preparation

- [ ] **Hardware Provisioned**
  - [ ] 3+ nodes with minimum 8GB RAM each
  - [ ] SSD storage (100GB+ per node)
  - [ ] 4+ CPU cores per node
  - [ ] 1 Gbps network connectivity

- [ ] **Operating System Configuration**
  ```bash
  # Set vm.max_map_count
  sudo sysctl -w vm.max_map_count=262144
  echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf

  # Disable swap
  sudo swapoff -a

  # Set file descriptor limits
  ulimit -n 65536
  ```

- [ ] **Network & Firewall**
  - [ ] Ports 9200, 9300 accessible between nodes
  - [ ] Port 9200 accessible from application servers
  - [ ] Port 5601 accessible for Kibana (admin only)
  - [ ] Firewall rules configured
  - [ ] Load balancer configured (if using)

### 2. Security Setup

- [ ] **SSL Certificates Generated**
  ```bash
  cd organization
  ./scripts/setup-elasticsearch-certs.sh
  ```
  - [ ] CA certificate created
  - [ ] Node certificates generated
  - [ ] HTTP certificate created
  - [ ] Certificates verified
  - [ ] Certificates backed up securely

- [ ] **Passwords Generated**
  ```bash
  # Generate Elasticsearch password
  ELASTICSEARCH_PASSWORD=$(openssl rand -base64 32)
  echo "Save this: $ELASTICSEARCH_PASSWORD"

  # Generate Kibana encryption keys
  KIBANA_ENCRYPTION_KEY=$(openssl rand -base64 32)
  KIBANA_REPORTING_KEY=$(openssl rand -base64 32)
  ```
  - [ ] Elasticsearch password saved in vault
  - [ ] Kibana encryption keys saved
  - [ ] Passwords stored in secure secrets manager
  - [ ] Passwords NOT committed to version control

- [ ] **Environment Variables Configured**
  - [ ] `.env.production` created from template
  - [ ] `ELASTICSEARCH_PASSWORD` set
  - [ ] `ELASTICSEARCH_NODE` set (HTTPS URL)
  - [ ] `ELASTICSEARCH_USERNAME` set
  - [ ] `ELASTICSEARCH_INDEX_PREFIX` set
  - [ ] SSL certificate paths configured
  - [ ] All secrets properly secured

### 3. Docker Configuration

- [ ] **Docker Compose Ready**
  - [ ] `docker-compose.elasticsearch-prod.yml` reviewed
  - [ ] Volume paths configured
  - [ ] Resource limits set appropriately
  - [ ] Health checks configured
  - [ ] Certificate volume mounts verified

- [ ] **Docker Resources**
  - [ ] Docker memory limit: 8GB+ per node
  - [ ] Docker CPU limit appropriate
  - [ ] Docker storage driver configured
  - [ ] Docker logging configured

---

## Deployment

### 4. Elasticsearch Cluster Setup

- [ ] **Start Cluster**
  ```bash
  cd infrastructure/docker
  docker-compose -f docker-compose.elasticsearch-prod.yml up -d
  ```
  - [ ] All 3 nodes started successfully
  - [ ] No error messages in logs
  - [ ] Containers are healthy

- [ ] **Wait for Cluster Formation**
  ```bash
  # Wait 2-3 minutes
  docker logs -f citadelbuy-elasticsearch-01
  ```
  - [ ] Cluster formed successfully
  - [ ] All nodes joined cluster
  - [ ] No split-brain errors

- [ ] **Setup Built-in User Passwords**
  ```bash
  docker exec citadelbuy-elasticsearch-01 \
    bin/elasticsearch-setup-passwords auto
  ```
  - [ ] Passwords generated successfully
  - [ ] All passwords recorded securely
  - [ ] elastic user password saved
  - [ ] kibana_system password saved

### 5. Cluster Verification

- [ ] **Check Cluster Health**
  ```bash
  curl -u elastic:PASSWORD https://localhost:9200/_cluster/health?pretty
  ```
  - [ ] Status is "green" or "yellow" (yellow acceptable for initial setup)
  - [ ] Number of nodes: 3
  - [ ] All data nodes present

- [ ] **Verify Nodes**
  ```bash
  curl -u elastic:PASSWORD https://localhost:9200/_cat/nodes?v
  ```
  - [ ] All 3 nodes listed
  - [ ] Master nodes identified
  - [ ] JVM heap size appropriate (50% of RAM)

- [ ] **Test Authentication**
  - [ ] Cannot access without credentials
  - [ ] Can access with valid credentials
  - [ ] User roles working correctly

### 6. Initialize Indices

- [ ] **Run Setup Script**
  ```bash
  cd organization
  export ELASTICSEARCH_PASSWORD=your_password
  ./scripts/setup-elasticsearch.sh
  ```
  - [ ] ILM policies created
  - [ ] Index templates created
  - [ ] Indices created successfully
  - [ ] Aliases configured
  - [ ] Security roles created

- [ ] **Verify Indices**
  ```bash
  curl -u elastic:PASSWORD https://localhost:9200/_cat/indices?v
  ```
  - [ ] Products index exists
  - [ ] Orders index exists
  - [ ] Analytics index exists
  - [ ] All indices are green

### 7. Kibana Setup

- [ ] **Access Kibana**
  - [ ] Navigate to http://localhost:5601
  - [ ] Login with elastic credentials
  - [ ] No connection errors

- [ ] **Configure Kibana**
  - [ ] Stack Monitoring enabled
  - [ ] Index patterns created
  - [ ] Dashboards imported (if any)
  - [ ] Discover page working

---

## Application Integration

### 8. Application Configuration

- [ ] **Update Application Environment**
  ```bash
  # In apps/api/.env.production
  SEARCH_PROVIDER=elasticsearch
  ELASTICSEARCH_NODE=https://elasticsearch-01:9200
  ELASTICSEARCH_USERNAME=citadelbuy_app_user
  ELASTICSEARCH_PASSWORD=your_app_user_password
  ELASTICSEARCH_INDEX_PREFIX=citadelbuy
  ```
  - [ ] Environment variables set
  - [ ] Application can connect to ES
  - [ ] SSL verification working

- [ ] **Import Initial Data**
  ```bash
  cd apps/api
  NODE_ENV=production npm run cli search:index
  ```
  - [ ] Products indexed successfully
  - [ ] No indexing errors
  - [ ] Document count matches database

- [ ] **Test Search Functionality**
  - [ ] Search API endpoint working
  - [ ] Autocomplete working
  - [ ] Facets returning results
  - [ ] Sorting working correctly
  - [ ] Pagination working

---

## Backup & Recovery

### 9. Snapshot Repository Configuration

- [ ] **S3 Repository (Recommended)**
  ```bash
  # Install S3 plugin
  docker exec citadelbuy-elasticsearch-01 \
    bin/elasticsearch-plugin install repository-s3

  # Configure credentials
  docker exec citadelbuy-elasticsearch-01 \
    bin/elasticsearch-keystore add s3.client.default.access_key
  docker exec citadelbuy-elasticsearch-01 \
    bin/elasticsearch-keystore add s3.client.default.secret_key

  # Create repository
  curl -u elastic:PASSWORD -X PUT "https://localhost:9200/_snapshot/s3_backup" \
    -H 'Content-Type: application/json' -d'
  {
    "type": "s3",
    "settings": {
      "bucket": "citadelbuy-elasticsearch-backups",
      "region": "us-east-1",
      "compress": true
    }
  }'
  ```
  - [ ] S3 plugin installed
  - [ ] Credentials configured
  - [ ] Repository created
  - [ ] Bucket exists and accessible

- [ ] **Test Snapshot**
  ```bash
  curl -u elastic:PASSWORD -X PUT \
    "https://localhost:9200/_snapshot/s3_backup/test_snapshot?wait_for_completion=true"
  ```
  - [ ] Snapshot created successfully
  - [ ] Snapshot visible in S3
  - [ ] Snapshot can be restored

- [ ] **Automated Snapshot Schedule**
  ```bash
  curl -u elastic:PASSWORD -X PUT "https://localhost:9200/_slm/policy/daily-snapshots" \
    -H 'Content-Type: application/json' -d'
  {
    "schedule": "0 1 * * *",
    "name": "<daily-snapshot-{now/d}>",
    "repository": "s3_backup",
    "config": {
      "indices": ["citadelbuy-*"]
    },
    "retention": {
      "expire_after": "30d",
      "min_count": 7
    }
  }'
  ```
  - [ ] SLM policy created
  - [ ] Schedule configured (1 AM daily)
  - [ ] Retention policy set (30 days)

---

## Monitoring & Alerting

### 10. Monitoring Setup

- [ ] **Kibana Stack Monitoring**
  - [ ] Monitoring data collection enabled
  - [ ] Cluster metrics visible
  - [ ] Node metrics visible
  - [ ] Index metrics visible

- [ ] **Custom Monitoring** (Optional)
  - [ ] Prometheus exporter configured
  - [ ] Grafana dashboards imported
  - [ ] Metrics endpoint accessible

- [ ] **Health Checks**
  ```bash
  # Add to monitoring system
  curl -u elastic:PASSWORD https://localhost:9200/_cluster/health
  ```
  - [ ] Health check script created
  - [ ] Automated health checks running
  - [ ] Alerts configured for non-green status

### 11. Alerting Configuration

- [ ] **Critical Alerts**
  - [ ] Cluster status RED
  - [ ] Cluster status YELLOW for >30 min
  - [ ] Node offline
  - [ ] Disk space >80%
  - [ ] JVM memory >90%
  - [ ] Circuit breakers triggered

- [ ] **Warning Alerts**
  - [ ] Slow queries (>5s)
  - [ ] High indexing latency
  - [ ] Unassigned shards
  - [ ] Snapshot failures

- [ ] **Alert Channels**
  - [ ] Email notifications configured
  - [ ] Slack/Teams webhook set up
  - [ ] PagerDuty integration (if used)
  - [ ] SMS alerts for critical issues

---

## Performance Optimization

### 12. Performance Tuning

- [ ] **JVM Heap Size**
  ```yaml
  # In docker-compose.yml
  ES_JAVA_OPTS=-Xms4g -Xmx4g  # 50% of node RAM
  ```
  - [ ] Heap size set to 50% of RAM
  - [ ] Max heap not exceeding 32GB
  - [ ] Same value for min and max

- [ ] **Index Settings Optimized**
  - [ ] Shard count appropriate for data size
  - [ ] Replica count set to 2
  - [ ] Refresh interval set to 30s
  - [ ] Compression enabled

- [ ] **Circuit Breakers Configured**
  - [ ] Total limit: 70%
  - [ ] Fielddata limit: 40%
  - [ ] Request limit: 40%

### 13. Performance Testing

- [ ] **Load Testing**
  - [ ] Bulk indexing tested
  - [ ] Search query performance measured
  - [ ] Concurrent user testing completed
  - [ ] No performance degradation observed

- [ ] **Benchmark Results**
  - [ ] Search queries: <50ms average
  - [ ] Autocomplete: <10ms average
  - [ ] Bulk indexing: >500 docs/sec
  - [ ] CPU usage: <70% average
  - [ ] Memory usage: stable

---

## Security Hardening

### 14. Security Audit

- [ ] **Access Control**
  - [ ] Anonymous access disabled
  - [ ] Strong passwords enforced
  - [ ] Role-based access working
  - [ ] Least privilege principle applied

- [ ] **Network Security**
  - [ ] SSL/TLS enabled for all connections
  - [ ] Certificates valid and not self-signed
  - [ ] Inter-node encryption enabled
  - [ ] Firewall rules restrictive

- [ ] **Audit Logging**
  - [ ] Audit logs enabled
  - [ ] Failed login attempts logged
  - [ ] Access denied events logged
  - [ ] Log retention policy set

- [ ] **Compliance**
  - [ ] GDPR requirements met (if applicable)
  - [ ] Data encryption at rest enabled (if required)
  - [ ] PCI DSS compliance verified (if applicable)

---

## Documentation

### 15. Documentation Updated

- [ ] **Runbooks Created**
  - [ ] Backup and restore procedures
  - [ ] Node failure recovery
  - [ ] Index management procedures
  - [ ] Common troubleshooting steps

- [ ] **Team Training**
  - [ ] Operations team trained
  - [ ] Development team aware of changes
  - [ ] On-call procedures documented
  - [ ] Escalation path defined

- [ ] **Configuration Documentation**
  - [ ] Environment variables documented
  - [ ] Architecture diagram created
  - [ ] Dependency map updated
  - [ ] Disaster recovery plan documented

---

## Post-Deployment

### 16. Go-Live Checklist

- [ ] **Final Verification**
  - [ ] All services healthy
  - [ ] No errors in logs
  - [ ] Search working on production
  - [ ] Backups running successfully
  - [ ] Monitoring alerts working

- [ ] **Communication**
  - [ ] Team notified of deployment
  - [ ] Status page updated
  - [ ] Customers notified (if needed)

### 17. Day 1 Monitoring

- [ ] **Monitor Closely (First 24 Hours)**
  - [ ] Check cluster health every hour
  - [ ] Monitor error logs
  - [ ] Watch resource usage
  - [ ] Verify backup completion
  - [ ] Check search API metrics

### 18. Week 1 Tasks

- [ ] **Daily Checks**
  - [ ] Cluster health status
  - [ ] Disk space usage
  - [ ] Backup status
  - [ ] Search performance metrics
  - [ ] Error rate monitoring

- [ ] **Weekly Review**
  - [ ] Performance analysis
  - [ ] Slow query review
  - [ ] Capacity planning
  - [ ] Security audit log review

---

## Rollback Plan

### 19. Rollback Procedure

In case of issues:

- [ ] **Rollback Steps Documented**
  1. Switch application back to internal search
  2. Stop Elasticsearch cluster
  3. Restore previous configuration
  4. Restart application
  5. Verify functionality

- [ ] **Rollback Tested**
  - [ ] Rollback procedure tested in staging
  - [ ] Rollback time acceptable
  - [ ] Data integrity maintained

---

## Sign-Off

### 20. Deployment Approval

- [ ] **Technical Lead Approval**
  - Name: ________________
  - Date: ________________
  - Signature: ________________

- [ ] **DevOps Lead Approval**
  - Name: ________________
  - Date: ________________
  - Signature: ________________

- [ ] **Product Owner Approval**
  - Name: ________________
  - Date: ________________
  - Signature: ________________

---

## Contact Information

**Escalation Contact:**
- Primary: ________________
- Secondary: ________________
- Emergency: ________________

**Vendor Support:**
- Elastic Support: https://support.elastic.co
- Support Tier: ________________
- Account ID: ________________

---

**Deployment Date:** ________________
**Deployed By:** ________________
**Elasticsearch Version:** 8.11.0
**Status:** ☐ Pending ☐ In Progress ☐ Completed ☐ Rolled Back

---

## Notes

Use this space for deployment-specific notes:

```
[Additional notes here]
```
