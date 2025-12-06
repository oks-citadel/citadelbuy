# Docker Security Quick Start Guide

## TL;DR - Essential Commands

```bash
# 1. Generate all required passwords
export POSTGRES_PASSWORD=$(openssl rand -base64 32)
export REDIS_PASSWORD=$(openssl rand -base64 32)
export ELASTICSEARCH_PASSWORD=$(openssl rand -base64 32)
export MONGO_PASSWORD=$(openssl rand -base64 32)
export RABBITMQ_PASSWORD=$(openssl rand -base64 32)
export GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 32)
export JWT_SECRET=$(openssl rand -base64 64)
export JWT_REFRESH_SECRET=$(openssl rand -base64 64)
export ENCRYPTION_KEY=$(openssl rand -hex 32)

# 2. Create .env file
cat > .env << EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
ELASTICSEARCH_PASSWORD=$ELASTICSEARCH_PASSWORD
MONGO_PASSWORD=$MONGO_PASSWORD
RABBITMQ_PASSWORD=$RABBITMQ_PASSWORD
GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
EOF

# 3. Start development environment
docker-compose -f infrastructure/docker/docker-compose-dev-secure.yml up -d

# 4. Start production environment (after setting up secrets manager)
docker-compose -f infrastructure/docker/docker-compose.production-secure.yml up -d
```

---

## What Changed?

### ✅ Elasticsearch Now Requires Password
```bash
# Before: No password
curl http://localhost:9200

# After: Password required
curl -u elastic:$ELASTICSEARCH_PASSWORD http://localhost:9200
```

### ✅ Redis Now Requires Password
```bash
# Before: No password
redis-cli ping

# After: Password required
redis-cli -a "$REDIS_PASSWORD" ping
```

### ✅ Production Ports Bound to Localhost
```bash
# Before: Accessible from anywhere
ports: - '5432:5432'

# After: Localhost only
ports: - '127.0.0.1:5432:5432'
```

### ✅ All Services Run as Non-Root
```bash
# Check user
docker exec citadelbuy-postgres-prod whoami
# Output: postgres (not root)
```

---

## Configuration Files

### Development
```bash
# Use this for local development
infrastructure/docker/docker-compose-dev-secure.yml

# Features:
# - Simplified security
# - All interfaces (0.0.0.0)
# - Management tools included
# - Hot reload enabled
```

### Production
```bash
# Use this for production deployment
infrastructure/docker/docker-compose.production-secure.yml

# Features:
# - Maximum security
# - Localhost binding
# - Non-root users
# - Resource limits
# - Read-only filesystems
```

---

## Environment Variables

### Required for All Environments
```bash
POSTGRES_PASSWORD=     # openssl rand -base64 32
REDIS_PASSWORD=        # openssl rand -base64 32
JWT_SECRET=            # openssl rand -base64 64
JWT_REFRESH_SECRET=    # openssl rand -base64 64
ENCRYPTION_KEY=        # openssl rand -hex 32
```

### Required for Production
```bash
ELASTICSEARCH_PASSWORD=  # openssl rand -base64 32
MONGO_PASSWORD=         # openssl rand -base64 32
RABBITMQ_PASSWORD=      # openssl rand -base64 32
GRAFANA_ADMIN_PASSWORD= # openssl rand -base64 32
```

---

## Common Tasks

### Start Services
```bash
# Development
docker-compose -f infrastructure/docker/docker-compose-dev-secure.yml up -d

# Production
docker-compose -f infrastructure/docker/docker-compose.production-secure.yml up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

### Restart Service
```bash
docker-compose restart backend
```

### Check Service Health
```bash
docker-compose ps
```

### Access Database
```bash
# PostgreSQL
docker exec -it citadelbuy-postgres-prod psql -U citadelbuy -d citadelbuy_prod

# Redis
docker exec -it citadelbuy-redis-prod redis-cli -a "$REDIS_PASSWORD"

# MongoDB
docker exec -it citadelbuy-mongodb-prod mongosh -u citadelbuy -p "$MONGO_PASSWORD"
```

---

## Application Configuration Updates

### Backend Environment Variables

Update these in your backend `.env` or deployment config:

```bash
# Elasticsearch with authentication
ELASTICSEARCH_NODE=http://elastic:${ELASTICSEARCH_PASSWORD}@elasticsearch:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=${ELASTICSEARCH_PASSWORD}

# Redis with password
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# Database
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
```

### Health Check Updates

If you have custom health checks:

```javascript
// Elasticsearch
const client = new Client({
  node: process.env.ELASTICSEARCH_NODE,
  auth: {
    username: 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD
  }
});

// Redis
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});
```

---

## Troubleshooting

### "Connection Refused" Errors

```bash
# Check if service is running
docker ps | grep postgres

# Check logs
docker logs citadelbuy-postgres-prod

# Verify network
docker network inspect citadelbuy-network
```

### "Authentication Failed" Errors

```bash
# Verify password is set
echo $REDIS_PASSWORD

# Test connection
docker exec citadelbuy-redis-prod redis-cli -a "$REDIS_PASSWORD" ping

# Check backend environment
docker exec citadelbuy-backend-prod env | grep REDIS_PASSWORD
```

### "Permission Denied" Errors

```bash
# Check container user
docker exec citadelbuy-postgres-prod whoami

# Fix volume permissions
docker run --rm -v postgres-data:/data alpine chown -R 999:999 /data
```

---

## Security Checklist

### Before First Run
- [ ] Generated all passwords with `openssl rand`
- [ ] Created `.env` file (not committed to git)
- [ ] Reviewed `.env.docker.example` for all required variables
- [ ] Different passwords for dev and production

### After Deployment
- [ ] All services started successfully
- [ ] Health checks are passing (`docker-compose ps`)
- [ ] Can access application
- [ ] Logs show no authentication errors
- [ ] Monitoring is collecting metrics

### Production Only
- [ ] Secrets stored in secrets manager (not `.env` file)
- [ ] SSL/TLS certificates installed
- [ ] Firewall rules configured
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting enabled

---

## Where to Find More Information

| Topic | File |
|-------|------|
| Complete Security Guide | `docs/DOCKER_SECURITY.md` |
| All Changes Summary | `DOCKER_SECURITY_UPDATES.md` |
| Environment Variables | `.env.docker.example` |
| Production Config | `infrastructure/docker/docker-compose.production-secure.yml` |
| Development Config | `infrastructure/docker/docker-compose-dev-secure.yml` |
| Redis Config | `infrastructure/docker/redis/redis-production.conf` |

---

## Getting Help

### Error Messages
1. Check logs: `docker-compose logs -f <service>`
2. Check health: `docker-compose ps`
3. See troubleshooting section in `docs/DOCKER_SECURITY.md`

### Security Questions
- Review `docs/DOCKER_SECURITY.md`
- Check `DOCKER_SECURITY_UPDATES.md`
- Create GitHub issue for clarification

### Urgent Security Issues
- Report via private disclosure
- Do not post publicly

---

**Quick Reference Version**: 1.0
**Last Updated**: December 3, 2024
**For Detailed Information**: See `docs/DOCKER_SECURITY.md`
