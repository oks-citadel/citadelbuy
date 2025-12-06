# Docker Security Guide for CitadelBuy

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Environment Variables](#environment-variables)
4. [Network Security](#network-security)
5. [Container Security](#container-security)
6. [Database Security](#database-security)
7. [Secrets Management](#secrets-management)
8. [TLS/SSL Configuration](#tlsssl-configuration)
9. [Volume Security](#volume-security)
10. [Monitoring & Auditing](#monitoring--auditing)
11. [Production Deployment](#production-deployment)
12. [Security Checklist](#security-checklist)
13. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides comprehensive security recommendations for deploying CitadelBuy using Docker and Docker Compose. It covers both development and production environments, with specific focus on:

- Secure credential management
- Network isolation
- Container hardening
- Data encryption
- Access control
- Security monitoring

### Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimal permissions for all components
3. **Secure by Default**: Security enabled out of the box
4. **Zero Trust**: Verify everything, trust nothing
5. **Regular Updates**: Keep all components current

---

## Quick Start

### Development Environment

```bash
# 1. Copy environment template
cp .env.docker.example .env

# 2. Generate secure passwords
export POSTGRES_PASSWORD=$(openssl rand -base64 32)
export REDIS_PASSWORD=$(openssl rand -base64 32)
export JWT_SECRET=$(openssl rand -base64 64)

# 3. Update .env file with generated passwords

# 4. Start development environment
docker-compose -f infrastructure/docker/docker-compose-dev-secure.yml up -d
```

### Production Environment

```bash
# 1. Use secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
# DO NOT use .env files in production

# 2. Deploy using production-secure configuration
docker-compose -f infrastructure/docker/docker-compose.production-secure.yml up -d

# 3. Verify security settings
./scripts/security-audit.sh
```

---

## Environment Variables

### Required Variables

All sensitive data MUST be provided via environment variables. Never hardcode credentials.

#### Database Credentials

```bash
# PostgreSQL
POSTGRES_USER=citadelbuy
POSTGRES_PASSWORD=<generate-with: openssl rand -base64 32>
POSTGRES_DB=citadelbuy_prod

# MongoDB
MONGO_USER=citadelbuy
MONGO_PASSWORD=<generate-with: openssl rand -base64 32>

# Redis
REDIS_PASSWORD=<generate-with: openssl rand -base64 32>

# Elasticsearch
ELASTICSEARCH_PASSWORD=<generate-with: openssl rand -base64 32>
```

#### Application Secrets

```bash
# JWT Authentication
JWT_SECRET=<generate-with: openssl rand -base64 64>
JWT_REFRESH_SECRET=<generate-with: openssl rand -base64 64>

# Data Encryption (AES-256)
ENCRYPTION_KEY=<generate-with: openssl rand -hex 32>
```

#### Message Queue

```bash
# RabbitMQ
RABBITMQ_USER=citadelbuy
RABBITMQ_PASSWORD=<generate-with: openssl rand -base64 32>
```

#### Monitoring

```bash
# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<generate-with: openssl rand -base64 32>
```

### Password Requirements

- **Minimum Length**: 32 characters
- **Complexity**: Use `openssl rand` for cryptographically secure passwords
- **Uniqueness**: Different passwords for each service
- **Rotation**: Change passwords every 90 days in production

### Environment Variable Management

#### Development

```bash
# Use .env file (NOT committed to git)
cp .env.docker.example .env
# Edit .env with secure values
```

#### Production

**DO NOT use .env files in production!** Use one of these methods:

1. **AWS Secrets Manager**
   ```bash
   aws secretsmanager get-secret-value --secret-id citadelbuy/prod/postgres
   ```

2. **HashiCorp Vault**
   ```bash
   vault kv get secret/citadelbuy/prod/database
   ```

3. **Docker Secrets** (Swarm mode)
   ```bash
   echo "my-secret-password" | docker secret create postgres_password -
   ```

4. **Kubernetes Secrets**
   ```yaml
   apiVersion: v1
   kind: Secret
   metadata:
     name: citadelbuy-secrets
   type: Opaque
   data:
     postgres-password: <base64-encoded-password>
   ```

---

## Network Security

### Network Segmentation

The Docker Compose configurations use multiple networks to isolate services:

```yaml
networks:
  citadelbuy-network:    # Application services
  monitoring-network:     # Monitoring services
```

### Port Binding

#### Production: Bind to Localhost

```yaml
ports:
  - '127.0.0.1:5432:5432'  # PostgreSQL - localhost only
  - '127.0.0.1:6379:6379'  # Redis - localhost only
  - '127.0.0.1:9200:9200'  # Elasticsearch - localhost only
```

This ensures services are NOT accessible from outside the host.

#### Development: All Interfaces

```yaml
ports:
  - '5432:5432'  # Accessible from host machine
```

### Firewall Rules

Configure host firewall to restrict access:

```bash
# UFW (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# iptables
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -j DROP
```

### Network Isolation

For maximum security, use internal networks:

```yaml
networks:
  backend-network:
    internal: true  # No external access
  frontend-network:
    internal: false # External access via NGINX only
```

---

## Container Security

### User Permissions

**Always run containers as non-root users:**

```yaml
# PostgreSQL
postgres:
  user: postgres

# Redis
redis:
  user: redis

# NGINX
nginx:
  user: "101:101"  # nginx user

# Elasticsearch
elasticsearch:
  user: "1000:1000"  # elasticsearch user
```

### Capability Dropping

Remove unnecessary Linux capabilities:

```yaml
backend:
  cap_drop:
    - ALL
  cap_add:
    - NET_BIND_SERVICE  # Only if binding to ports < 1024
```

### Read-Only Root Filesystem

Prevent modifications to container filesystem:

```yaml
frontend:
  read_only: true
  tmpfs:
    - /tmp
    - /app/.next/cache  # Allow writes to cache only
```

### Security Scanning

Scan images for vulnerabilities:

```bash
# Trivy
trivy image citadelplatforms/citadelbuy-ecommerce:backend-latest

# Snyk
snyk container test citadelplatforms/citadelbuy-ecommerce:backend-latest

# Docker Scout
docker scout cves citadelplatforms/citadelbuy-ecommerce:backend-latest
```

### Image Best Practices

1. **Use Official Base Images**: `node:20-alpine`, `postgres:16-alpine`
2. **Specify Versions**: Never use `latest` tag
3. **Minimize Layers**: Combine RUN commands
4. **Remove Build Dependencies**: Multi-stage builds
5. **Scan Regularly**: Automate vulnerability scanning

---

## Database Security

### PostgreSQL

#### Authentication

```yaml
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Password required}
```

#### Connection Logging

```yaml
command:
  - "postgres"
  - "-c"
  - "log_connections=on"
  - "-c"
  - "log_disconnections=on"
  - "-c"
  - "log_duration=on"
```

#### SSL/TLS Encryption

For production, enable SSL:

```bash
# Generate certificates
openssl req -new -x509 -days 365 -nodes -text \
  -out server.crt -keyout server.key

# Configure PostgreSQL
docker run -v $(pwd)/server.crt:/var/lib/postgresql/server.crt:ro \
           -v $(pwd)/server.key:/var/lib/postgresql/server.key:ro \
           -e POSTGRES_SSL_MODE=require \
           postgres:16-alpine
```

### MongoDB

#### Authentication

```yaml
environment:
  MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
  MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD:?Password required}
```

#### Access Control

Create application-specific users:

```javascript
// init.js
db.createUser({
  user: "citadelbuy_app",
  pwd: "secure-password",
  roles: [
    { role: "readWrite", db: "citadelbuy" }
  ]
});
```

### Redis

#### Password Authentication

```yaml
command: redis-server --requirepass "${REDIS_PASSWORD}"
```

#### Dangerous Command Protection

Rename or disable dangerous commands:

```yaml
command: >
  redis-server --requirepass "${REDIS_PASSWORD}"
  --rename-command CONFIG ""
  --rename-command DEBUG ""
  --rename-command FLUSHALL ""
  --rename-command FLUSHDB ""
```

### Elasticsearch

#### X-Pack Security

```yaml
environment:
  - xpack.security.enabled=true
  - ELASTIC_PASSWORD=${ELASTICSEARCH_PASSWORD}
```

#### TLS Configuration

For production, enable TLS:

```yaml
environment:
  - xpack.security.http.ssl.enabled=true
  - xpack.security.http.ssl.keystore.path=/usr/share/elasticsearch/config/elastic-certificates.p12
  - xpack.security.transport.ssl.enabled=true
```

---

## Secrets Management

### Development

Use `.env` files (excluded from git):

```bash
# .gitignore
.env
.env.local
.env.production
*.key
*.pem
```

### Production

**Use a secrets manager:**

#### AWS Secrets Manager

```bash
# Store secret
aws secretsmanager create-secret \
  --name citadelbuy/prod/postgres-password \
  --secret-string "your-secure-password"

# Retrieve secret in application
aws secretsmanager get-secret-value \
  --secret-id citadelbuy/prod/postgres-password \
  --query SecretString \
  --output text
```

#### HashiCorp Vault

```bash
# Store secret
vault kv put secret/citadelbuy/prod/database \
  password="your-secure-password"

# Retrieve secret
vault kv get -field=password secret/citadelbuy/prod/database
```

#### Docker Secrets (Swarm)

```bash
# Create secret
echo "my-secret" | docker secret create db_password -

# Use in service
docker service create \
  --name postgres \
  --secret db_password \
  postgres:16-alpine
```

### Secret Rotation

Implement regular secret rotation:

```bash
# Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# Update database
ALTER USER citadelbuy WITH PASSWORD 'new-password';

# Update secrets manager
aws secretsmanager update-secret \
  --secret-id citadelbuy/prod/postgres-password \
  --secret-string "$NEW_PASSWORD"

# Restart services
docker-compose restart backend
```

---

## TLS/SSL Configuration

### NGINX SSL Termination

#### Generate Certificates

**For development (self-signed):**

```bash
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout nginx/ssl/server.key \
  -out nginx/ssl/server.crt
```

**For production (Let's Encrypt):**

```bash
certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com
```

#### NGINX Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/server.crt;
    ssl_certificate_key /etc/nginx/ssl/server.key;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers on;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### Elasticsearch TLS

```bash
# Generate certificates
bin/elasticsearch-certutil cert --out elastic-certificates.p12 --pass ""

# Configure in docker-compose
elasticsearch:
  environment:
    - xpack.security.http.ssl.enabled=true
    - xpack.security.http.ssl.keystore.path=elastic-certificates.p12
  volumes:
    - ./elastic-certificates.p12:/usr/share/elasticsearch/config/elastic-certificates.p12:ro
```

### Redis TLS

```yaml
redis:
  command: >
    redis-server --tls-port 6379 --port 0
    --tls-cert-file /etc/redis/ssl/redis.crt
    --tls-key-file /etc/redis/ssl/redis.key
    --tls-ca-cert-file /etc/redis/ssl/ca.crt
  volumes:
    - ./ssl/redis.crt:/etc/redis/ssl/redis.crt:ro
    - ./ssl/redis.key:/etc/redis/ssl/redis.key:ro
    - ./ssl/ca.crt:/etc/redis/ssl/ca.crt:ro
```

---

## Volume Security

### Volume Permissions

Set appropriate permissions on mounted volumes:

```bash
# PostgreSQL data
chmod 700 postgres-data/
chown 999:999 postgres-data/  # postgres user

# Redis data
chmod 755 redis-data/
chown 999:999 redis-data/  # redis user
```

### Sensitive File Protection

```yaml
volumes:
  # Read-only configuration files
  - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
  - ./redis/redis.conf:/usr/local/etc/redis/redis.conf:ro

  # SSL certificates (read-only, restricted permissions)
  - ./nginx/ssl:/etc/nginx/ssl:ro
```

### Backup Security

Encrypt backups:

```bash
# PostgreSQL backup with encryption
docker exec citadelbuy-postgres pg_dump -U citadelbuy citadelbuy_prod | \
  openssl enc -aes-256-cbc -salt -out backup.sql.enc

# Restore from encrypted backup
openssl enc -aes-256-cbc -d -in backup.sql.enc | \
  docker exec -i citadelbuy-postgres psql -U citadelbuy citadelbuy_prod
```

### Volume Cleanup

Remove unused volumes:

```bash
# List volumes
docker volume ls

# Remove unused volumes
docker volume prune

# Remove specific volume
docker volume rm citadelbuy_postgres-data
```

---

## Monitoring & Auditing

### Logging

#### Centralized Logging

Configure log aggregation:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
    labels: "service,environment"
```

#### ELK Stack

```bash
# Elasticsearch, Logstash, Kibana for log analysis
docker-compose -f monitoring/elk-stack.yml up -d
```

### Security Monitoring

#### Prometheus Alerts

```yaml
# prometheus/alerts/security.yml
groups:
  - name: security
    rules:
      - alert: HighFailedLoginAttempts
        expr: rate(failed_login_attempts[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High number of failed login attempts"
```

#### Container Monitoring

```bash
# cAdvisor for container metrics
docker run -d \
  --name=cadvisor \
  --volume=/:/rootfs:ro \
  --volume=/var/run:/var/run:ro \
  --volume=/sys:/sys:ro \
  --volume=/var/lib/docker/:/var/lib/docker:ro \
  --publish=8080:8080 \
  google/cadvisor:latest
```

### Audit Logging

Enable audit logs for critical operations:

```yaml
# PostgreSQL audit logging
postgres:
  command:
    - "postgres"
    - "-c"
    - "log_statement=all"
    - "-c"
    - "log_line_prefix=%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h "
```

### Security Scanning

Automate security scans:

```bash
#!/bin/bash
# security-scan.sh

# Scan all running containers
for container in $(docker ps --format '{{.Names}}'); do
  echo "Scanning $container..."
  trivy image $(docker inspect --format='{{.Config.Image}}' $container)
done

# Check for outdated images
docker images --format "{{.Repository}}:{{.Tag}}" | \
  xargs -I {} sh -c 'echo "Checking {}"; docker pull {} >/dev/null 2>&1'
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Secrets stored in secrets manager
- [ ] SSL certificates installed and valid
- [ ] Firewall rules configured
- [ ] Database authentication enabled
- [ ] Redis password set
- [ ] Elasticsearch X-Pack enabled
- [ ] All services running as non-root
- [ ] Resource limits configured
- [ ] Health checks enabled
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan documented

### Deployment Steps

1. **Prepare Secrets**
   ```bash
   # Store all secrets in secrets manager
   ./scripts/setup-secrets.sh production
   ```

2. **Pull Latest Images**
   ```bash
   docker-compose -f docker-compose.production-secure.yml pull
   ```

3. **Run Security Audit**
   ```bash
   ./scripts/security-audit.sh
   ```

4. **Deploy Services**
   ```bash
   docker-compose -f docker-compose.production-secure.yml up -d
   ```

5. **Verify Deployment**
   ```bash
   ./scripts/verify-deployment.sh
   ```

6. **Enable Monitoring**
   ```bash
   # Check all services are healthy
   docker-compose ps

   # Verify metrics endpoint
   curl http://localhost:9090/metrics
   ```

### High Availability

For production, consider:

1. **Load Balancing**: Multiple backend replicas
2. **Database Replication**: Primary-replica setup
3. **Redis Cluster**: For high availability
4. **Elasticsearch Cluster**: 3+ nodes
5. **Container Orchestration**: Kubernetes or Docker Swarm

### Disaster Recovery

1. **Automated Backups**
   ```bash
   # Daily backup script
   #!/bin/bash
   DATE=$(date +%Y%m%d)
   docker exec citadelbuy-postgres pg_dump -U citadelbuy citadelbuy_prod | \
     gzip > backups/postgres-$DATE.sql.gz
   ```

2. **Backup Retention**
   - Daily backups: Keep for 7 days
   - Weekly backups: Keep for 4 weeks
   - Monthly backups: Keep for 12 months

3. **Recovery Testing**
   - Test backups monthly
   - Document recovery procedures
   - Maintain recovery time objectives (RTO)

---

## Security Checklist

### Essential Security Measures

- [ ] **Passwords**: All passwords are strong and unique
- [ ] **Environment Variables**: No hardcoded secrets
- [ ] **Secrets Manager**: Production secrets stored securely
- [ ] **TLS/SSL**: Enabled for all external communications
- [ ] **Authentication**: Enabled for all databases
- [ ] **Firewall**: Host firewall configured
- [ ] **Network Isolation**: Services on isolated networks
- [ ] **User Permissions**: All containers run as non-root
- [ ] **Resource Limits**: CPU and memory limits set
- [ ] **Health Checks**: Configured for all services
- [ ] **Logging**: Centralized logging enabled
- [ ] **Monitoring**: Metrics and alerting configured
- [ ] **Backups**: Automated backups running
- [ ] **Updates**: Regular security updates scheduled
- [ ] **Scanning**: Vulnerability scanning automated

### Advanced Security Measures

- [ ] **WAF**: Web Application Firewall configured
- [ ] **IDS/IPS**: Intrusion detection/prevention
- [ ] **Rate Limiting**: API rate limiting enabled
- [ ] **DDoS Protection**: CloudFlare or similar
- [ ] **Secret Rotation**: Automated secret rotation
- [ ] **Audit Logging**: Comprehensive audit trails
- [ ] **Penetration Testing**: Regular security assessments
- [ ] **Compliance**: GDPR, PCI-DSS, SOC2 compliance
- [ ] **Incident Response**: Plan documented and tested
- [ ] **Security Training**: Team trained on security

---

## Troubleshooting

### Common Issues

#### 1. Container Won't Start - Permission Denied

**Problem**: Container fails with permission errors

**Solution**:
```bash
# Check volume permissions
ls -la /var/lib/docker/volumes/

# Fix permissions
docker run --rm -v postgres-data:/data alpine chown -R 999:999 /data
```

#### 2. Database Connection Refused

**Problem**: Application can't connect to database

**Solution**:
```bash
# Check if container is running
docker ps | grep postgres

# Check logs
docker logs citadelbuy-postgres

# Verify network connectivity
docker exec citadelbuy-backend ping postgres
```

#### 3. Redis AUTH Failed

**Problem**: Redis authentication errors

**Solution**:
```bash
# Verify password is set
docker exec citadelbuy-redis redis-cli -a "$REDIS_PASSWORD" ping

# Check environment variable
docker exec citadelbuy-backend env | grep REDIS_PASSWORD
```

#### 4. SSL Certificate Errors

**Problem**: SSL/TLS errors

**Solution**:
```bash
# Verify certificate validity
openssl x509 -in nginx/ssl/server.crt -text -noout

# Test SSL configuration
curl -vvI https://yourdomain.com

# Check NGINX configuration
docker exec citadelbuy-nginx nginx -t
```

### Security Incident Response

If you suspect a security breach:

1. **Isolate**: Disconnect affected containers
   ```bash
   docker network disconnect citadelbuy-network affected-container
   ```

2. **Investigate**: Check logs for suspicious activity
   ```bash
   docker logs --since 24h citadelbuy-backend | grep -i "error\|unauthorized"
   ```

3. **Rotate Secrets**: Change all passwords and keys
   ```bash
   ./scripts/rotate-all-secrets.sh
   ```

4. **Update**: Apply security patches
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

5. **Document**: Record incident details and response

---

## Additional Resources

### Documentation

- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)

### Tools

- **Trivy**: Vulnerability scanner
- **Docker Bench**: Security audit tool
- **Falco**: Runtime security
- **Vault**: Secrets management
- **Snyk**: Vulnerability scanning

### Commands Reference

```bash
# Generate secure password
openssl rand -base64 32

# Generate JWT secret
openssl rand -base64 64

# Generate encryption key
openssl rand -hex 32

# Check container security
docker run --rm -it --net host --pid host --cap-add audit_control \
  -v /var/lib:/var/lib -v /var/run/docker.sock:/var/run/docker.sock \
  -v /etc:/etc --label docker_bench_security \
  docker/docker-bench-security

# Scan image for vulnerabilities
trivy image citadelplatforms/citadelbuy-ecommerce:latest

# Check for secrets in image
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  trufflesecurity/trufflehog:latest docker --image citadelplatforms/citadelbuy-ecommerce:latest
```

---

## Support

For security issues or questions:

- **Email**: security@citadelbuy.com
- **Security Issues**: Please report via private disclosure
- **Documentation**: See `/docs` directory
- **Community**: GitHub Discussions

---

**Last Updated**: 2024-12-03
**Version**: 2.1.0
**Maintained By**: CitadelBuy Security Team
