# Production Deployment Security Checklist

**Project**: CitadelBuy E-Commerce Platform
**Version**: 2.1.0
**Date**: _______________
**Deployed By**: _______________
**Reviewed By**: _______________

---

## Pre-Deployment Checklist

### 1. Secrets Management
- [ ] All passwords generated using `openssl rand -base64 32` (minimum 32 characters)
- [ ] JWT secrets generated using `openssl rand -base64 64` (minimum 64 characters)
- [ ] Encryption key generated using `openssl rand -hex 32` (exactly 64 hex characters)
- [ ] Secrets stored in secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
- [ ] NO secrets in `.env` files or version control
- [ ] Different credentials from development/staging
- [ ] Secret rotation schedule documented

**Required Secrets**:
- [ ] `POSTGRES_PASSWORD`
- [ ] `MONGO_PASSWORD`
- [ ] `REDIS_PASSWORD`
- [ ] `ELASTICSEARCH_PASSWORD`
- [ ] `RABBITMQ_PASSWORD`
- [ ] `JWT_SECRET`
- [ ] `JWT_REFRESH_SECRET`
- [ ] `ENCRYPTION_KEY`
- [ ] `GRAFANA_ADMIN_PASSWORD`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `AWS_SECRET_ACCESS_KEY`

### 2. SSL/TLS Certificates
- [ ] SSL certificates obtained (Let's Encrypt or commercial CA)
- [ ] Certificates installed in `infrastructure/docker/nginx/ssl/`
- [ ] Certificate expiration monitoring configured
- [ ] Auto-renewal configured (if using Let's Encrypt)
- [ ] HTTPS redirect configured in NGINX
- [ ] HSTS header enabled
- [ ] Certificate chain complete

### 3. Network Configuration
- [ ] Firewall rules configured on host
- [ ] Only ports 80, 443 exposed to public
- [ ] Database ports bound to localhost (127.0.0.1)
- [ ] SSH access restricted to authorized IPs
- [ ] DDoS protection configured (CloudFlare, AWS Shield, etc.)
- [ ] Rate limiting enabled on API endpoints
- [ ] Internal networks configured for service-to-service communication

### 4. Docker Configuration
- [ ] Using `docker-compose.production-secure.yml`
- [ ] Docker version is latest stable
- [ ] Docker Compose version is latest stable
- [ ] Docker daemon configured securely
- [ ] Non-root users for all containers
- [ ] Resource limits set for all services
- [ ] Health checks configured for all services
- [ ] Restart policies set to `unless-stopped` or `always`

### 5. Database Security
- [ ] PostgreSQL password authentication enabled
- [ ] PostgreSQL connection logging enabled
- [ ] PostgreSQL SSL/TLS configured (if required)
- [ ] MongoDB authentication enabled
- [ ] MongoDB users have minimal required permissions
- [ ] Redis password authentication enabled
- [ ] Redis dangerous commands renamed/disabled
- [ ] Elasticsearch X-Pack security enabled
- [ ] Elasticsearch password authentication enabled
- [ ] All databases bound to localhost or internal network

### 6. Application Configuration
- [ ] Backend configured with all required environment variables
- [ ] Frontend built with production settings
- [ ] CORS configured correctly for production domain
- [ ] API rate limiting enabled
- [ ] File upload limits configured
- [ ] Session timeout configured appropriately
- [ ] Error messages don't leak sensitive information
- [ ] Debug mode disabled

### 7. Monitoring & Logging
- [ ] Prometheus configured and accessible
- [ ] Grafana dashboards configured
- [ ] Alert rules configured for critical metrics
- [ ] Log aggregation configured (ELK, CloudWatch, etc.)
- [ ] Log retention policy defined
- [ ] Security event logging enabled
- [ ] Uptime monitoring configured (UptimeRobot, Pingdom, etc.)
- [ ] Performance monitoring configured (New Relic, DataDog, etc.)

### 8. Backup Strategy
- [ ] Automated daily backups configured
- [ ] Backup encryption enabled
- [ ] Backup retention policy defined (7 daily, 4 weekly, 12 monthly)
- [ ] Backup storage location documented
- [ ] Backup restoration procedure tested
- [ ] Recovery Time Objective (RTO) documented
- [ ] Recovery Point Objective (RPO) documented
- [ ] Backup monitoring and alerts configured

### 9. Security Scanning
- [ ] Container images scanned with Trivy or Snyk
- [ ] No critical vulnerabilities in images
- [ ] Docker Bench security test passed
- [ ] Application dependencies up to date
- [ ] Automated security scanning configured in CI/CD
- [ ] Vulnerability disclosure process documented

### 10. Documentation
- [ ] Deployment runbook created/updated
- [ ] Architecture diagram current
- [ ] Emergency contact list updated
- [ ] Incident response plan documented
- [ ] Disaster recovery plan documented
- [ ] Password rotation schedule documented
- [ ] Monitoring and alert documentation current

---

## Deployment Steps

### Phase 1: Pre-Deployment Verification (1 day before)

#### Infrastructure
- [ ] Server resources adequate (CPU, RAM, Disk)
- [ ] Docker and Docker Compose installed
- [ ] Firewall configured
- [ ] SSL certificates ready
- [ ] DNS records configured
- [ ] Backup system ready

#### Code & Configuration
- [ ] Latest code pulled from repository
- [ ] All migrations tested
- [ ] Configuration files reviewed
- [ ] Environment variables prepared
- [ ] Secrets verified in secrets manager

#### Testing
- [ ] Staging environment fully tested
- [ ] Load testing completed
- [ ] Security testing completed
- [ ] Backup restoration tested
- [ ] Rollback procedure tested

### Phase 2: Deployment (Deployment Day)

#### Pre-Deployment
- [ ] Team notified of deployment window
- [ ] Maintenance page ready (if needed)
- [ ] Backup of current production completed
- [ ] Rollback plan confirmed

#### Deployment
- [ ] Pull latest Docker images
  ```bash
  docker-compose -f infrastructure/docker/docker-compose.production-secure.yml pull
  ```
- [ ] Stop old containers (if updating)
  ```bash
  docker-compose down
  ```
- [ ] Run database migrations (if needed)
  ```bash
  docker-compose run --rm backend npm run migrate
  ```
- [ ] Start new containers
  ```bash
  docker-compose -f infrastructure/docker/docker-compose.production-secure.yml up -d
  ```
- [ ] Verify all containers started
  ```bash
  docker-compose ps
  ```
- [ ] Check container logs for errors
  ```bash
  docker-compose logs --tail=100
  ```

#### Post-Deployment Verification
- [ ] All services health checks passing
- [ ] Application accessible via HTTPS
- [ ] SSL certificate valid
- [ ] Database connections working
- [ ] Redis connections working
- [ ] Elasticsearch connections working
- [ ] Authentication working
- [ ] Payment processing working (test mode)
- [ ] Email sending working
- [ ] File uploads working
- [ ] API endpoints responding correctly
- [ ] Frontend loading correctly
- [ ] No errors in logs

### Phase 3: Post-Deployment (Within 24 hours)

#### Monitoring
- [ ] All monitoring dashboards showing green
- [ ] No critical alerts triggered
- [ ] Response times acceptable
- [ ] Error rates normal
- [ ] Resource usage within limits

#### Security
- [ ] Security scan passed
- [ ] No unauthorized access attempts
- [ ] All authentication working
- [ ] SSL/TLS working correctly

#### Performance
- [ ] Response times < 500ms (p95)
- [ ] Database queries optimized
- [ ] Cache hit rates acceptable
- [ ] No memory leaks detected

#### Documentation
- [ ] Deployment notes documented
- [ ] Any issues encountered documented
- [ ] Configuration changes documented
- [ ] Team notified of successful deployment

---

## Security Verification Commands

### Test Elasticsearch Authentication
```bash
# Should require password
curl http://localhost:9200
# Should work with password
curl -u elastic:${ELASTICSEARCH_PASSWORD} http://localhost:9200
```

### Test Redis Authentication
```bash
# Should require password
docker exec citadelbuy-redis-prod redis-cli ping
# Should work with password
docker exec citadelbuy-redis-prod redis-cli -a "$REDIS_PASSWORD" ping
```

### Test Database Connections
```bash
# PostgreSQL
docker exec citadelbuy-postgres-prod psql -U citadelbuy -d citadelbuy_prod -c "SELECT version();"

# MongoDB
docker exec citadelbuy-mongodb-prod mongosh -u citadelbuy -p "$MONGO_PASSWORD" --eval "db.version()"
```

### Verify Non-Root Users
```bash
# Check all containers are not running as root
docker exec citadelbuy-postgres-prod whoami  # Should be: postgres
docker exec citadelbuy-redis-prod whoami     # Should be: redis
docker exec citadelbuy-nginx-prod whoami     # Should be: nginx
```

### Check Port Bindings
```bash
# Verify databases are bound to localhost only
netstat -tlnp | grep 5432   # PostgreSQL - should show 127.0.0.1
netstat -tlnp | grep 6379   # Redis - should show 127.0.0.1
netstat -tlnp | grep 9200   # Elasticsearch - should show 127.0.0.1
```

### Test SSL/TLS
```bash
# Verify SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Test SSL labs rating (after deployment)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com
```

### Security Scan
```bash
# Scan all running containers
for container in $(docker ps --format '{{.Names}}'); do
  echo "Scanning $container..."
  trivy image $(docker inspect --format='{{.Config.Image}}' $container)
done
```

---

## Rollback Procedure

If deployment fails or critical issues are discovered:

### Immediate Rollback
```bash
# 1. Stop new containers
docker-compose down

# 2. Start previous version
docker-compose -f docker-compose.production-backup.yml up -d

# 3. Restore database if needed
docker exec citadelbuy-postgres-prod psql -U citadelbuy -d citadelbuy_prod < backup.sql

# 4. Verify rollback
./scripts/verify-deployment.sh

# 5. Notify team
# Send notification that rollback was performed
```

### Post-Rollback
- [ ] Incident report created
- [ ] Root cause analysis initiated
- [ ] Fix identified and tested
- [ ] Re-deployment plan created

---

## Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| DevOps Lead | __________ | __________ | __________ |
| Security Lead | __________ | __________ | __________ |
| Backend Lead | __________ | __________ | __________ |
| CTO | __________ | __________ | __________ |
| On-Call Engineer | __________ | __________ | __________ |

---

## Post-Deployment Review

### Metrics to Track (First 7 Days)
- [ ] Uptime: ______%
- [ ] Average response time: ______ ms
- [ ] Error rate: ______%
- [ ] Security incidents: ______
- [ ] Resource utilization: CPU ___%, RAM ___%, Disk ____%

### Issues Encountered
| Issue | Severity | Resolution | Time to Resolve |
|-------|----------|------------|-----------------|
|       |          |            |                 |
|       |          |            |                 |
|       |          |            |                 |

### Improvements for Next Deployment
-
-
-

---

## Sign-Off

### Deployment Team
- [ ] DevOps Engineer: _________________ Date: _______
- [ ] Security Engineer: _________________ Date: _______
- [ ] Backend Lead: _________________ Date: _______

### Management Approval
- [ ] CTO/Technical Director: _________________ Date: _______

---

## Additional Resources

- **Security Guide**: `docs/DOCKER_SECURITY.md`
- **Quick Start**: `DOCKER_SECURITY_QUICKSTART.md`
- **Changes Summary**: `DOCKER_SECURITY_UPDATES.md`
- **Production Config**: `infrastructure/docker/docker-compose.production-secure.yml`

---

**Document Version**: 1.0
**Last Updated**: December 3, 2024
**Next Review Date**: _______________
