# Dynamic Pricing Service

## Overview

The Dynamic Pricing Service provides AI-powered pricing optimization and demand-based pricing for the CitadelBuy platform. It uses machine learning models to optimize prices based on demand, competition, inventory levels, and market conditions to maximize revenue and profit margins.

## Key Features

### Price Optimization
- **Dynamic Pricing**: Real-time price adjustments based on market conditions
- **Demand-based Pricing**: Optimize prices based on predicted demand
- **Competitive Pricing**: Monitor and respond to competitor prices
- **Inventory-aware Pricing**: Adjust prices based on stock levels

### Pricing Strategies
- **Profit Maximization**: Optimize for maximum profit margins
- **Volume Maximization**: Optimize for sales volume
- **Competitive Strategy**: Stay competitive with market prices
- **Psychological Pricing**: Use .99 endings and price anchoring
- **Penetration Pricing**: Aggressive pricing for market entry
- **Premium Pricing**: Position as premium product

### Analytics & Intelligence
- **Price Elasticity**: Calculate demand sensitivity to price changes
- **Competitor Analysis**: Track and analyze competitor pricing
- **Demand Forecasting**: Predict future demand trends
- **Promotion Optimization**: AI-recommended promotion strategies
- **A/B Testing**: Test pricing strategies with controlled experiments

## Environment Variables

```bash
# Service Configuration
LOG_LEVEL=INFO
PORT=8006

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/citadelbuy

# Redis Cache
REDIS_URL=redis://localhost:6379/6
REDIS_PASSWORD=your_redis_password
CACHE_TTL=300

# Machine Learning
MODEL_PATH=/app/models
ELASTICITY_MODEL_VERSION=v1.0.0
DEMAND_MODEL_VERSION=v1.0.0

# Pricing Configuration
MIN_MARGIN_PERCENT=10.0
MAX_DISCOUNT_PERCENT=50.0
PRICE_UPDATE_FREQUENCY=3600
ENABLE_DYNAMIC_PRICING=true

# Competition Monitoring
ENABLE_COMPETITOR_TRACKING=true
COMPETITOR_CHECK_INTERVAL=1800
PRICE_MATCH_THRESHOLD=0.95

# Optimization
DEFAULT_STRATEGY=profit_maximize
OPTIMIZATION_SOLVER=cvxpy
MAX_OPTIMIZATION_TIME=5

# A/B Testing
ENABLE_AB_TESTING=true
MIN_SAMPLE_SIZE=1000
CONFIDENCE_LEVEL=0.95

# Performance
MAX_CONCURRENT_OPTIMIZATIONS=50
BATCH_SIZE=100

# Feature Flags
ENABLE_BULK_OPTIMIZATION=true
ENABLE_PROMOTION_OPTIMIZER=true
ENABLE_ELASTICITY_CALCULATION=true
```

## API Endpoints

### Price Optimization
- `POST /optimize` - Get AI-optimized price for a product
- `POST /optimize/bulk` - Optimize prices for multiple products
- `GET /current/{product_id}` - Get current optimized price

### Promotions
- `POST /promotion/recommend` - Get AI-recommended promotion strategy
- `POST /promotion/create` - Create promotional pricing
- `GET /promotion/{promotion_id}` - Get promotion details

### Analytics
- `GET /elasticity/{product_id}` - Get price elasticity
- `POST /competitor/analyze` - Analyze competitor pricing
- `GET /demand/forecast/{product_id}` - Forecast demand

### Pricing Rules
- `POST /rules/create` - Create pricing rule
- `GET /rules` - List all pricing rules
- `PUT /rules/{rule_id}` - Update pricing rule
- `DELETE /rules/{rule_id}` - Delete pricing rule

### A/B Testing
- `POST /ab-test/create` - Create pricing A/B test
- `GET /ab-test/{test_id}` - Get A/B test results
- `POST /ab-test/{test_id}/stop` - Stop A/B test

### Health & Monitoring
- `GET /health` - Service health check
- `GET /metrics` - Prometheus metrics

## Dependencies

### Core Framework
- FastAPI 0.109.0 - Async web framework
- Uvicorn 0.27.0 - ASGI server
- Pydantic 2.5.3 - Data validation

### Database & Caching
- SQLAlchemy 2.0.25 - ORM
- AsyncPG 0.29.0 - PostgreSQL driver
- Redis 5.0.1 - Caching
- Hiredis 2.3.2 - Redis client

### Machine Learning
- NumPy 1.26.3 - Numerical computing
- Pandas 2.1.4 - Data manipulation
- Scikit-learn 1.4.0 - ML algorithms
- SciPy 1.11.4 - Scientific computing

### Optimization
- CVXPY 1.4.2 - Convex optimization

### Utilities
- Python-dotenv 1.0.0 - Environment management
- HTTPX 0.26.0 - HTTP client
- PyJWT 2.8.0 - JWT tokens

## Local Development Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 14+
- Redis 7+

### Installation

```bash
# Navigate to service directory
cd organization/apps/services/pricing

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
python scripts/init_db.py

# Train pricing models
python scripts/train_models.py

# Start the service
uvicorn src.api:app --reload --port 8006
```

### Development Workflow

```bash
# Run with auto-reload
uvicorn src.api:app --reload --port 8006

# Run tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html

# Test pricing optimization
python tests/optimization/test_price_optimizer.py
```

## Docker Usage

### Build Image

```bash
# Build the Docker image
docker build -t citadelbuy/pricing:latest .

# Build with specific version
docker build -t citadelbuy/pricing:v2.0.0 .
```

### Run Container

```bash
# Run standalone
docker run -d \
  --name pricing \
  -p 8006:8006 \
  --env-file .env \
  -v $(pwd)/models:/app/models \
  citadelbuy/pricing:latest

# Run with Docker Compose
docker-compose up pricing

# View logs
docker logs -f pricing

# Shell access
docker exec -it pricing bash
```

### Docker Compose Example

```yaml
services:
  pricing:
    build: ./organization/apps/services/pricing
    ports:
      - "8006:8006"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/citadelbuy
      - REDIS_URL=redis://redis:6379/6
      - MODEL_PATH=/app/models
    depends_on:
      - db
      - redis
    volumes:
      - ./models:/app/models
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8006/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Testing Instructions

### Unit Tests

```bash
# Run all unit tests
pytest tests/unit/ -v

# Test specific module
pytest tests/unit/test_price_optimizer.py -v

# Run with markers
pytest -m "not slow" -v
```

### Integration Tests

```bash
# Run integration tests
pytest tests/integration/ -v

# Test with live services
pytest tests/integration/ --live
```

### Optimization Tests

```bash
# Test pricing algorithms
python tests/optimization/test_algorithms.py

# Benchmark optimization performance
python tests/benchmark/optimization_benchmark.py

# Validate elasticity calculations
python tests/validation/test_elasticity.py
```

## Usage Examples

### Optimize Single Product Price

```bash
curl -X POST http://localhost:8006/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "prod_123",
    "base_price": 99.99,
    "cost": 50.00,
    "category": "electronics",
    "inventory_level": 45,
    "competitor_prices": [95.99, 109.99, 89.99]
  }'
```

Response:
```json
{
  "product_id": "prod_123",
  "base_price": 99.99,
  "optimized_price": 94.99,
  "confidence": 0.92,
  "factors": [
    {"factor": "competitor_prices", "impact": "high", "value": "Below average"},
    {"factor": "inventory_level", "impact": "medium", "value": "Good stock"},
    {"factor": "demand_forecast", "impact": "high", "value": "Increasing"}
  ],
  "valid_until": "2025-12-04T18:00:00Z"
}
```

### Bulk Price Optimization

```bash
curl -X POST http://localhost:8006/optimize/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "products": [
      {"product_id": "prod_1", "base_price": 99.99, "cost": 50.00, ...},
      {"product_id": "prod_2", "base_price": 149.99, "cost": 75.00, ...}
    ],
    "strategy": "profit_maximize"
  }'
```

### Get Price Elasticity

```bash
curl http://localhost:8006/elasticity/prod_123
```

Response:
```json
{
  "product_id": "prod_123",
  "elasticity": -1.8,
  "interpretation": "elastic",
  "confidence": 0.88,
  "recommendation": "Price decreases will increase total revenue"
}
```

## Pricing Strategies

### Profit Maximization

```python
from optimization.price_optimizer import PriceOptimizer

optimizer = PriceOptimizer()
result = optimizer.optimize(
    base_price=100.0,
    cost=50.0,
    demand_forecast={"weekly": 1000},
    elasticity=-1.5,
    strategy="profit_maximize"
)
```

### Competitive Pricing

```python
result = optimizer.optimize(
    base_price=100.0,
    cost=50.0,
    competitor_prices=[95.0, 105.0, 99.0],
    strategy="competitive"
)
```

### Dynamic Pricing

```python
# Automatic price adjustments
result = optimizer.dynamic_price(
    product_id="prod_123",
    current_inventory=45,
    recent_sales={"7d": 150, "30d": 600},
    market_demand="high"
)
```

## Promotion Optimization

### Recommend Promotion Strategy

```bash
curl -X POST http://localhost:8006/promotion/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "product_ids": ["prod_1", "prod_2", "prod_3"],
    "target_metric": "revenue",
    "budget": 5000.0,
    "duration_days": 7
  }'
```

Response:
```json
{
  "recommendations": [
    {
      "type": "percentage_discount",
      "discount": 15,
      "products": ["prod_1", "prod_2"],
      "expected_lift": "25% increase in sales"
    },
    {
      "type": "buy_one_get_one",
      "products": ["prod_3"],
      "expected_lift": "40% increase in units"
    }
  ],
  "expected_impact": {
    "revenue_increase": 12500.0,
    "units_increase": 450
  },
  "roi_estimate": 2.5
}
```

## A/B Testing

### Create Price Test

```python
# Create A/B test
POST /ab-test/create
{
  "name": "Price Point Test - Product 123",
  "product_id": "prod_123",
  "variants": [
    {"name": "control", "price": 99.99},
    {"name": "variant_a", "price": 94.99},
    {"name": "variant_b", "price": 89.99}
  ],
  "duration_days": 14,
  "traffic_split": [0.4, 0.3, 0.3]
}
```

### Get Test Results

```bash
curl http://localhost:8006/ab-test/test_456
```

Response:
```json
{
  "test_id": "test_456",
  "status": "completed",
  "variants": [
    {
      "name": "control",
      "price": 99.99,
      "conversions": 245,
      "revenue": 24497.55,
      "conversion_rate": 0.0245
    },
    {
      "name": "variant_a",
      "price": 94.99,
      "conversions": 312,
      "revenue": 29636.88,
      "conversion_rate": 0.0312
    }
  ],
  "winner": "variant_a",
  "confidence": 0.96,
  "recommendation": "Implement variant_a pricing"
}
```

## Model Training

### Train Elasticity Model

```bash
# Train price elasticity model
python src/models/train_elasticity.py --data sales_history.csv

# Evaluate model
python src/models/evaluate_elasticity.py
```

### Train Demand Model

```bash
# Train demand forecasting model
python src/models/train_demand.py

# Validate predictions
python src/models/validate_demand.py
```

## Monitoring & Metrics

### Key Metrics

- **Optimization Success Rate**: Percentage of successful optimizations
- **Price Change Impact**: Revenue/margin changes after price updates
- **Elasticity Accuracy**: Prediction accuracy of elasticity models
- **Competitor Price Gap**: Average difference from competitor prices
- **Promotion ROI**: Return on investment for promotions

### Prometheus Metrics

```
# Pricing metrics
pricing_optimizations_total 50000
pricing_optimization_duration_seconds{quantile="0.95"} 1.2

# Business metrics
pricing_revenue_impact_total 125000.50
pricing_margin_improvement_percent 8.5
```

## Architecture

```
pricing/
├── src/
│   ├── optimization/          # Price optimization
│   │   ├── price_optimizer.py
│   │   ├── bulk_optimizer.py
│   │   └── promotion_optimizer.py
│   ├── models/                # ML models
│   │   ├── demand_model.py
│   │   ├── elasticity_model.py
│   │   └── train_*.py
│   ├── rules/                 # Pricing rules
│   │   ├── rule_manager.py
│   │   └── rule_engine.py
│   ├── experiments/           # A/B testing
│   │   └── ab_testing.py
│   ├── api/                   # API routers
│   └── utils/                 # Utilities
├── models/                    # Trained models
├── data/                      # Historical data
├── tests/                     # Test suite
├── scripts/                   # Utility scripts
└── Dockerfile                 # Container definition
```

## Best Practices

### Pricing Strategy
1. Set minimum margin thresholds
2. Monitor competitor prices regularly
3. Test price changes with A/B tests
4. Consider customer price sensitivity
5. Adjust for seasonal demand

### Performance
1. Cache elasticity calculations
2. Batch optimize where possible
3. Use async operations
4. Pre-compute common scenarios

### Safety
1. Set maximum discount limits
2. Implement price change caps
3. Human approval for large changes
4. Monitor for pricing errors

## Troubleshooting

### Common Issues

**Optimization Taking Too Long**
- Reduce optimization complexity
- Use simpler solver
- Enable caching
- Batch similar products

**Unrealistic Price Recommendations**
- Check margin constraints
- Validate cost data
- Review competitor prices
- Adjust elasticity model

**Low Confidence Scores**
- Gather more historical data
- Retrain models
- Verify input data quality
- Check market volatility

## API Documentation

Interactive API documentation:
- Swagger UI: http://localhost:8006/docs
- ReDoc: http://localhost:8006/redoc

## Contributing

See [Contributing Guide](../../../CONTRIBUTING.md) for development guidelines.

## License

Proprietary - CitadelBuy Platform

## Support

For issues and questions:
- Internal Slack: #pricing-support
- Email: pricing@citadelbuy.com
