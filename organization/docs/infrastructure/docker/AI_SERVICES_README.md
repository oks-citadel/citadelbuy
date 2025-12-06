# CitadelBuy AI Services - Docker Compose Setup

## Overview

The `docker-compose.ai.yml` file provides a complete Docker stack for running all AI/ML services in the CitadelBuy platform. This stack includes 300+ AI capabilities across 7 specialized microservices.

## Services Included

### 1. AI Engine Service (Port 8002)
- **Purpose**: Core AI/ML capabilities for dropshipping operations
- **Capabilities**:
  - Winning product prediction
  - Dynamic price optimization
  - Supplier reliability scoring
  - Demand forecasting
  - Fraud detection
  - Conversion rate prediction
- **Technology**: Python/FastAPI
- **Location**: `apps/services/ai-engine`

### 2. Recommendation Service (Port 8001)
- **Purpose**: Personalized product recommendations
- **Capabilities**:
  - Collaborative filtering
  - Content-based recommendations
  - Hybrid recommendation strategies
  - Similar product detection
  - Trending products analysis
- **Technology**: Python/FastAPI with ML models
- **Location**: `apps/services/recommendation`

### 3. Search Service (Port 8007)
- **Purpose**: Intelligent search capabilities
- **Capabilities**:
  - Semantic search with AI understanding
  - Visual search (image-based)
  - Voice search (audio-to-text)
  - Autocomplete and spell correction
  - Search result ranking
- **Technology**: Python/FastAPI with Elasticsearch
- **Location**: `apps/services/search`

### 4. Fraud Detection Service (Port 8003)
- **Purpose**: AI-powered fraud prevention
- **Capabilities**:
  - Transaction risk scoring
  - Device fingerprinting
  - Velocity checking
  - Anomaly detection
  - Real-time fraud assessment
- **Technology**: Python/FastAPI with ML classifiers
- **Location**: `apps/services/fraud-detection`

### 5. Chatbot Service (Port 8004)
- **Purpose**: Conversational AI for customer support
- **Capabilities**:
  - Intent classification
  - Entity extraction
  - Dialogue management
  - Multi-language support
  - WebSocket real-time chat
- **Technology**: Python/FastAPI with NLP models
- **Location**: `apps/services/chatbot`

### 6. Analytics Service (Port 8005)
- **Purpose**: Real-time analytics with ML insights
- **Capabilities**:
  - Event tracking and processing
  - Real-time metrics aggregation
  - ML-based forecasting
  - Anomaly detection
  - Cohort analysis
  - Funnel analysis
- **Technology**: Python/FastAPI with time-series models
- **Location**: `apps/services/analytics`

### 7. Pricing Service (Port 8006)
- **Purpose**: Dynamic pricing optimization
- **Capabilities**:
  - Price elasticity calculation
  - Demand-based pricing
  - Competitor analysis
  - Promotion optimization
  - A/B testing for pricing
- **Technology**: Python/FastAPI with optimization algorithms
- **Location**: `apps/services/pricing`

## Infrastructure Services

### PostgreSQL (Port 5433)
- **Purpose**: Database for AI services
- **Version**: PostgreSQL 16 Alpine
- **Container**: `citadelbuy-postgres-ai`

### Redis (Port 6380)
- **Purpose**: Caching and session management
- **Version**: Redis 7 Alpine
- **Container**: `citadelbuy-redis-ai`
- **Configuration**: 2GB max memory with LRU eviction

## Quick Start

### Prerequisites
1. Docker and Docker Compose installed
2. Environment variables configured (see below)

### Environment Variables

Create a `.env` file in the `organization/` directory with the following variables:

```bash
# Required
POSTGRES_PASSWORD=<your-secure-password>
DATABASE_URL=postgresql://citadelbuy:${POSTGRES_PASSWORD}@postgres:5432/citadelbuy_ai
REDIS_URL=redis://redis:6379
OPENAI_API_KEY=<your-openai-api-key>

# Optional
LOG_LEVEL=INFO
SERVICE_ENV=development
POSTGRES_USER=citadelbuy
POSTGRES_DB=citadelbuy_ai

# Service-specific (optional with defaults)
RECOMMENDATION_STRATEGY=hybrid
MIN_CONFIDENCE_THRESHOLD=0.5
FRAUD_THRESHOLD=75
REVIEW_THRESHOLD=50
DEFAULT_LANGUAGE=en
ANALYTICS_RETENTION_DAYS=90
DEFAULT_STRATEGY=profit_maximize
MIN_MARGIN_PERCENT=10
```

### Starting the AI Services

```bash
# Start all AI services
npm run docker:ai

# Or directly with docker-compose
cd organization
docker-compose -f infrastructure/docker/docker-compose.ai.yml up -d

# View logs
docker-compose -f infrastructure/docker/docker-compose.ai.yml logs -f

# Stop services
docker-compose -f infrastructure/docker/docker-compose.ai.yml down

# Stop and remove volumes
docker-compose -f infrastructure/docker/docker-compose.ai.yml down -v
```

### Building Services

```bash
# Build all services
docker-compose -f infrastructure/docker/docker-compose.ai.yml build

# Build specific service
docker-compose -f infrastructure/docker/docker-compose.ai.yml build ai-engine

# Rebuild without cache
docker-compose -f infrastructure/docker/docker-compose.ai.yml build --no-cache
```

### Checking Service Health

```bash
# Check all service health
for port in 8001 8002 8003 8004 8005 8006 8007; do
  echo "Port $port: $(curl -s http://localhost:$port/health | jq -r '.status')"
done
```

## Service Integration

All AI services are designed to be called from the main API or directly from the frontend:

### From NestJS API
```typescript
// Example: Call AI Engine for product prediction
const response = await this.httpService.post(
  'http://ai-engine:8002/api/v1/ai/products/predict',
  { product: productData }
);
```

### From Next.js Frontend
```typescript
// Example: Call Recommendation Service
const recommendations = await fetch(
  '/api/recommendations',
  { method: 'POST', body: JSON.stringify({ user_id: userId }) }
);
```

## Volumes

The following Docker volumes persist data:

- `postgres-ai-data`: PostgreSQL database data
- `redis-ai-data`: Redis cache data
- `ai-models`: ML models for AI engine
- `fraud-models`: Fraud detection models
- `pricing-models`: Pricing optimization models
- `chatbot-sessions`: Chatbot session data
- `analytics-data`: Analytics aggregated data
- Various log volumes for debugging

## Network Configuration

All services run on the `citadelbuy-ai-network` bridge network with subnet `172.21.0.0/16`.

Services can communicate with each other using their container names:
- `ai-engine:8002`
- `recommendation:8001`
- `search:8007`
- `fraud-detection:8003`
- `chatbot:8004`
- `analytics:8005`
- `pricing:8006`

## Monitoring and Debugging

### View Service Logs
```bash
# All services
docker-compose -f infrastructure/docker/docker-compose.ai.yml logs -f

# Specific service
docker-compose -f infrastructure/docker/docker-compose.ai.yml logs -f ai-engine
```

### Check Resource Usage
```bash
docker stats $(docker ps --filter "label=com.citadelbuy.service" --format "{{.Names}}")
```

### Access Service Shell
```bash
docker exec -it citadelbuy-ai-engine /bin/sh
```

## Production Considerations

For production deployments:

1. **Use External Databases**: Point `DATABASE_URL` to production PostgreSQL
2. **Redis Cluster**: Use Redis Cluster for high availability
3. **Load Balancing**: Put services behind a load balancer
4. **SSL/TLS**: Enable HTTPS for all services
5. **Monitoring**: Integrate with Prometheus/Grafana
6. **Secrets Management**: Use Docker secrets or external secret managers
7. **Resource Limits**: Add CPU/memory limits to each service
8. **Replicas**: Run multiple instances of each service

## Troubleshooting

### Service Won't Start
1. Check logs: `docker-compose logs <service-name>`
2. Verify environment variables are set
3. Ensure ports are not already in use
4. Check Docker daemon is running

### Database Connection Issues
1. Verify PostgreSQL is healthy: `docker-compose ps postgres`
2. Check DATABASE_URL format
3. Ensure network connectivity between services

### Out of Memory
1. Increase Docker memory limit
2. Reduce number of workers per service
3. Clear Redis cache: `docker exec citadelbuy-redis-ai redis-cli FLUSHALL`

## API Documentation

Each service provides interactive API documentation:

- AI Engine: http://localhost:8002/docs
- Recommendation: http://localhost:8001/docs
- Search: http://localhost:8007/docs
- Fraud Detection: http://localhost:8003/docs
- Chatbot: http://localhost:8004/docs
- Analytics: http://localhost:8005/docs
- Pricing: http://localhost:8006/docs

## Next Steps

1. Configure environment variables in `.env` file
2. Start services with `npm run docker:ai`
3. Verify all services are healthy
4. Test individual service endpoints
5. Integrate with main API and frontend
6. Monitor performance and logs
7. Scale services as needed

## Support

For issues or questions:
1. Check service logs for errors
2. Review API documentation
3. Verify environment configuration
4. Check Docker resource allocation
5. Consult individual service README files
