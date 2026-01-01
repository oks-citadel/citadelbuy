# Fraud Detection Service

## Overview

The Fraud Detection Service is an AI-powered microservice that provides real-time fraud detection and prevention for the Broxiva platform. It combines machine learning models with rule-based engines to identify fraudulent transactions, suspicious device activity, and risky supplier behavior.

## Key Features

### Transaction Analysis
- **Real-time Fraud Scoring**: Instant risk assessment for all transactions (0-100 scale)
- **Multi-factor Detection**: Payment, shipping, device, and behavioral analysis
- **Risk Classification**: Low, medium, high, and critical risk levels
- **Automated Recommendations**: Approve, review, or reject actions

### Device Intelligence
- **Device Fingerprinting**: Track and analyze device patterns
- **Trust Scoring**: Device reliability and history analysis
- **Anomaly Detection**: Identify suspicious device behavior
- **Multi-device Tracking**: Link devices to user accounts

### Velocity Checking
- **Transaction Velocity**: Monitor transaction frequency patterns
- **Amount Velocity**: Track spending patterns over time
- **IP-based Velocity**: Detect unusual activity from specific IPs
- **Card Velocity**: Monitor card usage across multiple accounts

### Machine Learning
- **Hybrid Approach**: Combines ML models with rule-based systems
- **Model Training**: Continuous learning from fraud feedback
- **Feature Engineering**: Advanced feature extraction from transaction data
- **Ensemble Methods**: XGBoost and LightGBM for high accuracy

## Environment Variables

```bash
# Service Configuration
LOG_LEVEL=INFO
PORT=8003

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/broxiva

# Redis Cache
REDIS_URL=redis://localhost:6379/1
REDIS_PASSWORD=your_redis_password

# Machine Learning
MODEL_PATH=/app/models
MODEL_VERSION=v2.0.0
FRAUD_THRESHOLD=75.0
REVIEW_THRESHOLD=50.0

# Velocity Limits
MAX_TRANSACTIONS_1H=10
MAX_TRANSACTIONS_24H=50
MAX_AMOUNT_1H=5000.0
MAX_AMOUNT_24H=20000.0

# Feature Flags
ENABLE_DEVICE_TRACKING=true
ENABLE_VELOCITY_CHECKING=true
ENABLE_ML_MODEL=true
ENABLE_RULE_ENGINE=true

# Monitoring
ENABLE_FRAUD_ALERTS=true
ALERT_WEBHOOK_URL=https://alerts.broxiva.com/fraud
```

## API Endpoints

### Core Fraud Detection
- `POST /analyze` - Analyze transaction for fraud risk
- `POST /device/analyze` - Analyze device fingerprint
- `POST /velocity/check` - Check transaction velocity

### Feedback & Training
- `POST /report/fraud` - Report confirmed fraud case
- `POST /feedback` - Submit feedback on fraud decision

### Analytics
- `GET /stats` - Get fraud detection statistics
- `GET /stats/devices` - Get device analysis statistics
- `GET /stats/velocity` - Get velocity check statistics

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
- Redis 5.0.1 - Caching and velocity tracking
- Hiredis 2.3.2 - High-performance Redis client

### Machine Learning
- NumPy 1.26.3 - Numerical computing
- Pandas 2.1.4 - Data manipulation
- Scikit-learn 1.4.0 - ML algorithms
- XGBoost 2.0.3 - Gradient boosting
- LightGBM 4.2.0 - Fast gradient boosting
- Imbalanced-learn 0.11.0 - Handle imbalanced datasets

### Utilities
- Python-dotenv 1.0.0 - Environment management
- HTTPX 0.26.0 - HTTP client
- PyJWT 2.8.0 - JWT token handling

## Local Development Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 14+
- Redis 7+

### Installation

```bash
# Navigate to service directory
cd organization/apps/services/fraud-detection

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

# Train initial models
python scripts/train_models.py

# Start the service
python -m uvicorn src.api:app --reload --port 8003
```

### Development Workflow

```bash
# Run with auto-reload
uvicorn src.api:app --reload --port 8003

# Run tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html

# Lint code
flake8 src/
pylint src/

# Format code
black src/
isort src/
```

## Docker Usage

### Build Image

```bash
# Build the Docker image
docker build -t broxiva/fraud-detection:latest .

# Build with custom tag
docker build -t broxiva/fraud-detection:v2.0.0 .
```

### Run Container

```bash
# Run standalone
docker run -d \
  --name fraud-detection \
  -p 8003:8003 \
  --env-file .env \
  -v $(pwd)/models:/app/models \
  broxiva/fraud-detection:latest

# Run with Docker Compose
docker-compose up fraud-detection

# View logs
docker logs -f fraud-detection

# Execute commands in container
docker exec -it fraud-detection bash
```

### Docker Compose Example

```yaml
services:
  fraud-detection:
    build: ./organization/apps/services/fraud-detection
    ports:
      - "8003:8003"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/broxiva
      - REDIS_URL=redis://redis:6379/1
      - MODEL_PATH=/app/models
    depends_on:
      - db
      - redis
    volumes:
      - ./models:/app/models
      - ./data:/app/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8003/health"]
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
pytest tests/unit/test_fraud_classifier.py -v

# Run with markers
pytest -m "not integration" -v
```

### Integration Tests

```bash
# Run integration tests
pytest tests/integration/ -v

# Test with live services
docker-compose up -d
pytest tests/integration/ --live-services
```

### Performance Tests

```bash
# Load test with locust
pip install locust
locust -f tests/load/fraud_detection_load.py --host=http://localhost:8003

# Benchmark fraud analysis
python tests/benchmark/benchmark_analysis.py
```

### Model Tests

```bash
# Test model accuracy
pytest tests/models/test_model_accuracy.py

# Test model performance
pytest tests/models/test_model_performance.py

# Evaluate on test dataset
python scripts/evaluate_model.py --dataset data/test_transactions.csv
```

## Machine Learning Models

### Training

```bash
# Train fraud classifier
python src/models/train_fraud_classifier.py

# Train with custom dataset
python src/models/train_fraud_classifier.py --data data/fraud_data.csv

# Hyperparameter tuning
python src/models/tune_hyperparameters.py
```

### Model Evaluation

```bash
# Evaluate model performance
python scripts/evaluate_model.py

# Generate confusion matrix
python scripts/confusion_matrix.py

# ROC curve analysis
python scripts/roc_analysis.py
```

### Model Deployment

Models are automatically loaded from the `MODEL_PATH` directory on startup. To deploy a new model:

1. Train and validate the new model
2. Save to `models/` directory
3. Update `MODEL_VERSION` in environment
4. Restart the service

## Rule Engine

### Custom Rules

Define fraud detection rules in `src/rules/`:

```python
# Example: High-value transaction rule
class HighValueTransactionRule(FraudRule):
    def evaluate(self, transaction):
        if transaction.amount > 5000:
            return RuleResult(
                triggered=True,
                score=30,
                reason="High-value transaction"
            )
        return RuleResult(triggered=False)
```

### Rule Management

```bash
# List active rules
python scripts/list_rules.py

# Enable/disable rules
python scripts/manage_rules.py --enable high_value_transaction

# Test rule on sample data
python scripts/test_rule.py --rule velocity_check --data sample.json
```

## Monitoring & Alerts

### Metrics

The service exposes Prometheus metrics at `/metrics`:

- `fraud_checks_total` - Total fraud checks performed
- `fraud_detected_total` - Total fraud cases detected
- `fraud_check_duration_seconds` - Analysis duration
- `model_prediction_score` - Model prediction distribution

### Alerting

Configure alerts in `config/alerts.yaml`:

```yaml
alerts:
  - name: high_fraud_rate
    condition: fraud_rate > 0.1
    severity: critical
    notification: slack, email

  - name: model_degradation
    condition: model_accuracy < 0.85
    severity: warning
    notification: email
```

## API Documentation

Interactive API documentation available at:

- Swagger UI: http://localhost:8003/docs
- ReDoc: http://localhost:8003/redoc

## Architecture

```
fraud-detection/
├── src/
│   ├── api/                   # API routers
│   ├── detection/             # Core fraud detection
│   ├── models/                # ML models
│   │   ├── fraud_classifier.py
│   │   ├── device_analyzer.py
│   │   └── train_*.py
│   ├── rules/                 # Rule engine
│   │   ├── rule_engine.py
│   │   ├── velocity_checker.py
│   │   └── rules/
│   ├── features/              # Feature engineering
│   └── utils/                 # Utilities
├── data/                      # Training data
├── models/                    # Trained models
├── notebooks/                 # Analysis notebooks
├── tests/                     # Test suite
├── scripts/                   # Utility scripts
└── Dockerfile                 # Container definition
```

## Best Practices

### Transaction Analysis
1. Always analyze transactions before payment processing
2. Log all fraud decisions for audit trail
3. Implement manual review queue for medium/high risk
4. Regularly update fraud patterns

### Model Maintenance
1. Retrain models monthly with new fraud cases
2. Monitor model performance metrics
3. A/B test new models before deployment
4. Keep historical model versions

### Performance
1. Cache device fingerprints in Redis
2. Use batch processing for bulk analysis
3. Index transaction database for fast lookups
4. Implement rate limiting per API client

## Troubleshooting

### Common Issues

**High False Positive Rate**
- Review rule thresholds
- Retrain model with recent data
- Analyze feature importance

**Slow Analysis**
- Enable Redis caching
- Optimize database queries
- Reduce feature extraction complexity

**Model Loading Errors**
- Verify MODEL_PATH is correct
- Check model file integrity
- Ensure compatible scikit-learn version

## Security Considerations

- Store sensitive fraud data encrypted at rest
- Use secure connections (TLS) for all API calls
- Implement API authentication and rate limiting
- Audit log all fraud decisions
- Regular security assessments

## Contributing

See [Contributing Guide](../../../CONTRIBUTING.md) for development guidelines.

## License

Proprietary - Broxiva Platform

## Support

For issues and questions:
- Internal Slack: #fraud-detection-support
- Email: security@broxiva.com
