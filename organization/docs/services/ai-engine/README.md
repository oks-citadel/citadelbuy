# AI Engine Service

## Overview

The AI Engine is Broxiva's core machine learning microservice that powers AI-driven predictions and optimizations for dropshipping operations. Built with FastAPI and Python, it provides intelligent capabilities for product selection, pricing optimization, supplier evaluation, demand forecasting, fraud detection, and conversion prediction.

## Key Features

### Product Intelligence
- **Winning Product Predictor**: AI-powered prediction of product success potential
- **Batch Product Analysis**: Analyze multiple products simultaneously for scalability
- **Multi-factor Scoring**: Demand, profitability, competition, trends, and supplier quality

### Dynamic Pricing
- **Multiple Pricing Strategies**: Dynamic, competitive, premium, penetration, psychological, and value-based
- **Price Optimization**: AI-driven price recommendations with margin projection
- **Competitor Analysis**: Market positioning and competitive pricing intelligence
- **Price Elasticity**: Demand-based pricing adjustments

### Supplier Intelligence
- **Reliability Scoring**: Comprehensive supplier evaluation across multiple dimensions
- **Risk Assessment**: Automated risk level detection (low, medium, high, critical)
- **Supplier Comparison**: Side-by-side comparison of multiple suppliers
- **Performance Tracking**: Quality, delivery, communication, and pricing metrics

### Demand Forecasting
- **Time-based Forecasts**: 7-day, 30-day, and 90-day demand predictions
- **Seasonal Pattern Detection**: Automatic identification of seasonal trends
- **Stock Recommendations**: Optimal inventory levels and reorder points
- **Category Trends**: Market-wide demand analysis by category

### Fraud Detection
- **Order Risk Assessment**: Real-time fraud detection for transactions
- **Supplier Fraud Detection**: Identify fraudulent or unreliable suppliers
- **Multi-factor Analysis**: Payment, device, customer, and behavioral signals
- **Action Recommendations**: Approve, review, or reject with confidence scores

### Conversion Optimization
- **Conversion Rate Prediction**: AI-powered conversion rate forecasting
- **Funnel Analysis**: Identify drop-off points in the customer journey
- **A/B Test Suggestions**: Data-driven testing recommendations
- **Optimization Insights**: Actionable improvements for product listings

## Environment Variables

```bash
# Service Configuration
LOG_LEVEL=INFO
PORT=8002

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/broxiva

# Redis Cache
REDIS_URL=redis://localhost:6379/0
REDIS_PASSWORD=your_redis_password

# OpenAI (for GPT-powered features)
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4

# Model Configuration
MODEL_PATH=/app/models
ENABLE_GPU=false

# Performance
WORKERS=2
MAX_CONCURRENT_REQUESTS=100

# Feature Flags
ENABLE_DEEP_LEARNING=false
ENABLE_ADVANCED_FORECASTING=true
```

## API Endpoints

### Health & Status
- `GET /health` - Health check
- `GET /ready` - Readiness check with service status

### Product Prediction
- `POST /api/v1/ai/products/predict` - Predict winning potential for a product
- `POST /api/v1/ai/products/batch-predict` - Batch predict multiple products

### Pricing Optimization
- `POST /api/v1/ai/pricing/optimize` - Optimize price for a product
- `POST /api/v1/ai/pricing/batch-optimize` - Batch optimize multiple products

### Supplier Scoring
- `POST /api/v1/ai/suppliers/score` - Score supplier reliability
- `POST /api/v1/ai/suppliers/compare` - Compare multiple suppliers

### Demand Forecasting
- `POST /api/v1/ai/demand/forecast` - Forecast product demand
- `POST /api/v1/ai/demand/category-trends` - Get category demand trends

### Fraud Detection
- `POST /api/v1/ai/fraud/assess-order` - Assess order fraud risk
- `POST /api/v1/ai/fraud/assess-supplier` - Assess supplier fraud risk

### Conversion Prediction
- `POST /api/v1/ai/conversion/predict` - Predict conversion rate
- `POST /api/v1/ai/conversion/analyze-funnel` - Analyze conversion funnel

## Dependencies

### Core Framework
- FastAPI 0.109.0 - Modern async web framework
- Uvicorn 0.27.0 - ASGI server
- Pydantic 2.5.3 - Data validation

### Database & Caching
- AsyncPG 0.29.0 - PostgreSQL async driver
- SQLAlchemy 2.0.25 - ORM
- Redis 5.0.1 - Caching and rate limiting

### Machine Learning
- NumPy 1.26.3 - Numerical computing
- Pandas 2.1.4 - Data manipulation
- Scikit-learn 1.3.2 - ML algorithms
- SciPy 1.11.4 - Scientific computing
- Statsmodels 0.14.1 - Statistical models
- Prophet 1.1.5 - Time series forecasting
- FeatureTools 1.28.0 - Feature engineering

### AI & NLP
- OpenAI 1.6.1 - GPT integration
- TikToken 0.5.2 - Token counting

### Monitoring & Testing
- StructLog 24.1.0 - Structured logging
- Prometheus Client 0.19.0 - Metrics
- Pytest 7.4.4 - Testing framework

## Local Development Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 14+
- Redis 7+

### Installation

```bash
# Navigate to service directory
cd organization/apps/services/ai-engine

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations (if applicable)
# python migrations/migrate.py

# Start the service
python main.py
```

### Development Mode

```bash
# Run with auto-reload
uvicorn main:app --reload --port 8002

# Run tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html

# Type checking
mypy src/

# Code formatting
black src/
isort src/
```

## Docker Usage

### Build Image

```bash
# Build the Docker image
docker build -t broxiva/ai-engine:latest .

# Build with specific Python version
docker build --build-arg PYTHON_VERSION=3.11 -t broxiva/ai-engine:latest .
```

### Run Container

```bash
# Run standalone
docker run -d \
  --name ai-engine \
  -p 8002:8002 \
  --env-file .env \
  broxiva/ai-engine:latest

# Run with Docker Compose
docker-compose up ai-engine

# View logs
docker logs -f ai-engine

# Shell access
docker exec -it ai-engine bash
```

### Docker Compose

```yaml
services:
  ai-engine:
    build: ./organization/apps/services/ai-engine
    ports:
      - "8002:8002"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/broxiva
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
    volumes:
      - ./models:/app/models
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Testing Instructions

### Unit Tests

```bash
# Run all unit tests
pytest tests/unit/ -v

# Run specific test file
pytest tests/unit/test_product_predictor.py -v

# Run with markers
pytest -m "not slow" -v
```

### Integration Tests

```bash
# Run integration tests (requires services)
pytest tests/integration/ -v

# Run with test database
DATABASE_URL=postgresql://test:test@localhost:5432/test_db pytest tests/integration/
```

### API Tests

```bash
# Test endpoints
pytest tests/api/ -v

# Test with actual HTTP calls
pytest tests/api/ --api-url=http://localhost:8002
```

### Load Testing

```bash
# Install locust
pip install locust

# Run load tests
locust -f tests/load/test_ai_engine.py --host=http://localhost:8002
```

## Model Management

### Model Training

```bash
# Train product predictor model
python src/pipelines/train_product_predictor.py

# Train price optimizer model
python src/pipelines/train_price_optimizer.py

# Train fraud detection model
python src/pipelines/train_fraud_detector.py
```

### Model Deployment

```bash
# Export trained model
python src/utils/export_model.py --model product_predictor --output models/

# Load model in service
# Models are automatically loaded from /app/models on startup
```

## API Documentation

Once running, access interactive API documentation at:

- Swagger UI: http://localhost:8002/docs
- ReDoc: http://localhost:8002/redoc

## Performance Considerations

- **Caching**: All predictions are cached in Redis for 5 minutes
- **Batch Processing**: Use batch endpoints for better performance
- **Rate Limiting**: 100 requests per minute per API key
- **Async Operations**: All I/O operations are non-blocking
- **Model Optimization**: Models are loaded once at startup

## Architecture

```
ai-engine/
├── src/
│   ├── dropshipping/          # Dropshipping AI modules
│   │   ├── winning_product.py
│   │   ├── price_optimizer.py
│   │   ├── supplier_scorer.py
│   │   ├── demand_forecaster.py
│   │   ├── fraud_detector.py
│   │   └── conversion_predictor.py
│   ├── models/                # ML model implementations
│   ├── pipelines/             # Training pipelines
│   ├── feature_store/         # Feature engineering
│   ├── serving/               # Model serving logic
│   └── utils/                 # Utilities
├── data/                      # Training data
├── notebooks/                 # Jupyter notebooks
├── tests/                     # Test suite
├── models/                    # Trained model artifacts
├── main.py                    # FastAPI application
├── requirements.txt           # Python dependencies
└── Dockerfile                # Container definition
```

## Troubleshooting

### Common Issues

1. **Model Loading Errors**: Ensure models directory exists and contains trained models
2. **Out of Memory**: Reduce batch size or disable deep learning features
3. **Slow Predictions**: Enable Redis caching and use batch endpoints
4. **GPU Not Detected**: Set ENABLE_GPU=false for CPU-only mode

### Logs

```bash
# View application logs
docker logs ai-engine

# Follow logs in real-time
docker logs -f ai-engine

# View specific log level
docker logs ai-engine 2>&1 | grep ERROR
```

## Contributing

See the main [Contributing Guide](../../../CONTRIBUTING.md) for development guidelines.

## License

Proprietary - Broxiva Platform

## Support

For issues and questions:
- Internal Slack: #ai-engine-support
- Email: dev@broxiva.com
