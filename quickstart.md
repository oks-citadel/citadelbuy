# Quick Start Guide

Get your Cross-Border Commerce Platform up and running in minutes!

## Prerequisites

Before you begin, ensure you have:

- ✅ Docker 24.x or higher
- ✅ Docker Compose 2.x or higher  
- ✅ Git
- ✅ 8GB+ RAM available
- ✅ 50GB+ free disk space

## 🚀 Quick Start (Development)

### 1. Clone the Repository

```bash
git clone https://github.com/yourorg/commerce-platform.git
cd commerce-platform
```

### 2. Set Up Environment

```bash
# Copy environment template
cp .env.dev .env.dev.local

# Optional: Edit environment variables
nano .env.dev.local
```

### 3. Start the Platform

```bash
# Using Make (recommended)
make dev

# OR using Docker Compose directly
docker-compose -f docker-compose.dev.yml up -d
```

### 4. Wait for Services to Start

```bash
# Watch the logs
docker-compose -f docker-compose.dev.yml logs -f

# Check service status
docker-compose -f docker-compose.dev.yml ps
```

### 5. Access the Platform

Once all services are running (green status), access:

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | N/A |
| **Backend API** | http://localhost:8080 | N/A |
| **API Docs (Swagger)** | http://localhost:8080/swagger | N/A |
| **pgAdmin** | http://localhost:5050 | admin@admin.com / admin |
| **Grafana** | http://localhost:3001 | admin / admin |
| **Prometheus** | http://localhost:9090 | N/A |
| **MailHog** | http://localhost:8025 | N/A |

### 6. Test the API

```bash
# Check backend health
curl http://localhost:8080/health

# Get products (should return empty array initially)
curl http://localhost:8080/api/v1/products
```

### 7. Seed Sample Data (Optional)

```bash
# Seed the database with sample data
make db-seed

# OR
docker-compose -f docker-compose.dev.yml exec backend go run cmd/api/main.go seed
```

## 🔥 One-Command Setup

If you want everything automated:

```bash
# Clone, setup, and start everything
git clone https://github.com/yourorg/commerce-platform.git && \
cd commerce-platform && \
cp .env.dev .env.dev.local && \
make dev && \
sleep 30 && \
make db-seed
```

## 📱 First Steps After Setup

### Create Your First User

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

### Login

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

This returns a JWT token. Use it in subsequent requests:

```bash
TOKEN="your-jwt-token-here"

curl http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### Create Your First Product

```bash
curl -X POST http://localhost:8080/api/v1/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "PROD-001",
    "name": "Premium Wireless Headphones",
    "description": "High-quality wireless headphones with noise cancellation",
    "price_usd": 299.99,
    "stock_quantity": 100,
    "status": "active"
  }'
```

## 🛠️ Common Development Commands

### Using Make

```bash
# View all available commands
make help

# Start development environment
make dev

# View logs
make logs

# Stop everything
make dev-down

# Restart services
make dev-restart

# Access PostgreSQL shell
make shell-db

# Access backend container shell
make shell-backend

# Run backend tests
make test-backend

# Backup database
make db-backup

# Clean up everything
make clean
```

### Direct Docker Compose

```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# Stop services
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Rebuild a service
docker-compose -f docker-compose.dev.yml up -d --build backend

# Execute command in container
docker-compose -f docker-compose.dev.yml exec backend sh
```

## 🧪 Running Tests

```bash
# Run all tests
make test

# Run only backend tests
make test-backend

# Run only frontend tests
make test-frontend

# Run integration tests
make test-integration

# Generate coverage report
make test-coverage
```

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check Docker is running
docker info

# Check available disk space
df -h

# Check Docker logs
docker-compose -f docker-compose.dev.yml logs

# Restart Docker Desktop (if on Mac/Windows)
```

### Port Already in Use

```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change the port in docker-compose.dev.yml
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.dev.yml ps postgres

# View PostgreSQL logs
docker-compose -f docker-compose.dev.yml logs postgres

# Restart PostgreSQL
docker-compose -f docker-compose.dev.yml restart postgres

# Test connection
docker-compose -f docker-compose.dev.yml exec postgres \
  psql -U admin -d commerce_dev -c "SELECT 1;"
```

### Frontend Not Loading

```bash
# Check frontend logs
docker-compose -f docker-compose.dev.yml logs frontend

# Rebuild frontend
docker-compose -f docker-compose.dev.yml up -d --build frontend

# Clear browser cache
# Open DevTools > Application > Clear Storage
```

### Backend API Errors

```bash
# Check backend logs
docker-compose -f docker-compose.dev.yml logs backend

# Verify environment variables
docker-compose -f docker-compose.dev.yml exec backend env

# Check backend health
curl http://localhost:8080/health
```

### Redis Connection Issues

```bash
# Check Redis is running
docker-compose -f docker-compose.dev.yml ps redis

# Test Redis connection
docker-compose -f docker-compose.dev.yml exec redis \
  redis-cli -a dev_redis_pass ping

# Flush Redis cache
docker-compose -f docker-compose.dev.yml exec redis \
  redis-cli -a dev_redis_pass FLUSHALL
```

### Complete Reset

If nothing works, try a complete reset:

```bash
# Stop and remove everything
docker-compose -f docker-compose.dev.yml down -v

# Remove Docker images
docker-compose -f docker-compose.dev.yml down --rmi all

# Clean Docker system
docker system prune -af

# Restart from scratch
make dev
```

## 📊 Monitoring Your Platform

### View Metrics in Grafana

1. Open http://localhost:3001
2. Login with `admin` / `admin`
3. Navigate to Dashboards
4. View pre-configured dashboards

### Query Metrics in Prometheus

1. Open http://localhost:9090
2. Try some queries:
   ```
   # Request rate
   rate(http_requests_total[5m])
   
   # Response time (95th percentile)
   histogram_quantile(0.95, http_request_duration_seconds_bucket)
   
   # Error rate
   rate(http_requests_total{status=~"5.."}[5m])
   ```

### View Emails (Development)

1. Open http://localhost:8025
2. All emails sent by the platform appear here
3. Useful for testing registration, order confirmations, etc.

## 🚢 Moving to Production

Once you're ready to deploy to production:

1. **Review Configuration**
   ```bash
   # Copy production template
   cp .env.prod .env.prod.local
   
   # Update all CHANGE_ME values
   nano .env.prod.local
   ```

2. **Get SSL Certificates**
   ```bash
   # For Let's Encrypt
   sudo certbot certonly --standalone -d yourplatform.com
   
   # Or use self-signed for testing
   make ssl-generate
   ```

3. **Deploy**
   ```bash
   # Build production images
   make prod-build
   
   # Start production environment
   make prod
   ```

4. **Verify Deployment**
   ```bash
   # Check all services
   make health
   
   # Run smoke tests
   ./scripts/smoke-test.sh
   
   # Monitor logs
   make prod-logs
   ```

For detailed production deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## 📚 Next Steps

- **Customize**: Modify the frontend UI in `/frontend`
- **Add Features**: Extend backend API in `/backend`
- **Configure Integrations**: Set up payment gateways, shipping APIs
- **Set Up CI/CD**: Configure GitHub Actions workflows
- **Scale**: Deploy to cloud (AWS, GCP, Azure)
- **Monitor**: Set up alerts in Prometheus/Grafana

## 🆘 Getting Help

- 📖 Read the [full README](README.md)
- 🚀 Check [DEPLOYMENT.md](DEPLOYMENT.md) for deployment
- 🏗️ See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for architecture
- 💬 Open an issue on GitHub
- 📧 Email: support@yourplatform.com

## ⚡ Performance Tips

1. **Enable Caching**
   - Redis is already configured
   - Cache frequently accessed data

2. **Database Optimization**
   - Add indexes for your queries
   - Use connection pooling
   - Run `ANALYZE` regularly

3. **Frontend Optimization**
   - Enable CDN for static assets
   - Use image optimization
   - Implement lazy loading

4. **API Optimization**
   - Enable response compression
   - Use pagination
   - Implement rate limiting

## 🎉 You're Ready!

You now have a fully functional e-commerce platform running locally. Happy coding! 🚀
