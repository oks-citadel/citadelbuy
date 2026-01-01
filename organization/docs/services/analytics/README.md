# Analytics Service

## Overview

The Analytics Service provides real-time and batch analytics with ML-powered insights for the Broxiva platform. It tracks user behavior, monitors business metrics, performs cohort analysis, generates forecasts, and detects anomalies to drive data-driven decision making.

## Key Features

### Real-time Analytics
- **Live Dashboard Metrics**: Active users, sessions, orders, and revenue
- **Event Streaming**: Real-time event processing and aggregation
- **Active Monitoring**: Track current platform activity
- **Instant Insights**: Sub-second metric updates

### Batch Analytics
- **Historical Analysis**: Trend analysis over custom time periods
- **Multi-dimensional Metrics**: Analyze by various dimensions (category, region, etc.)
- **Custom Dashboards**: Build personalized metric dashboards
- **Data Aggregation**: Efficient processing of large datasets

### Machine Learning Insights
- **Forecasting**: Predict future trends using Prophet and time series models
- **Anomaly Detection**: Identify unusual patterns in metrics
- **Cohort Analysis**: User retention and behavior analysis
- **Funnel Analysis**: Conversion funnel optimization

### User Journey Analytics
- **Touchpoint Tracking**: Monitor all user interactions
- **Journey Mapping**: Visualize customer paths
- **Engagement Scoring**: Measure user engagement levels
- **Conversion Probability**: Predict likelihood to convert

## Environment Variables

```bash
# Service Configuration
LOG_LEVEL=INFO
PORT=8005

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/broxiva
ANALYTICS_DATABASE_URL=postgresql://user:password@localhost:5432/analytics

# Redis Cache
REDIS_URL=redis://localhost:6379/4
REDIS_PASSWORD=your_redis_password

# Event Processing
EVENT_BATCH_SIZE=1000
EVENT_FLUSH_INTERVAL=5
MAX_EVENT_AGE_DAYS=90

# Time Series Database (Optional)
TIMESCALE_ENABLED=true
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=your_influxdb_token

# Machine Learning
ENABLE_FORECASTING=true
ENABLE_ANOMALY_DETECTION=true
FORECAST_HORIZON_DAYS=30
ANOMALY_SENSITIVITY=0.95

# Real-time Processing
REALTIME_WINDOW_SECONDS=60
ACTIVE_USER_TIMEOUT=1800
SESSION_TIMEOUT=3600

# Performance
WORKER_THREADS=4
MAX_CONCURRENT_QUERIES=100
QUERY_TIMEOUT=30

# Feature Flags
ENABLE_REALTIME_ANALYTICS=true
ENABLE_COHORT_ANALYSIS=true
ENABLE_FUNNEL_ANALYSIS=true
ENABLE_USER_JOURNEY=true
```

## API Endpoints

### Event Tracking
- `POST /events/track` - Track a single event
- `POST /events/batch` - Track multiple events in batch
- `GET /events/{event_id}` - Get event details

### Real-time Analytics
- `GET /realtime/overview` - Get real-time overview metrics
- `GET /realtime/active-users` - Get active users count
- `GET /realtime/sessions` - Get active sessions
- `GET /realtime/conversions` - Get real-time conversion metrics

### Dashboard Metrics
- `POST /dashboard/metrics` - Get metrics for dashboard
- `GET /dashboard/revenue` - Get revenue metrics
- `GET /dashboard/orders` - Get order metrics
- `GET /dashboard/users` - Get user metrics

### Machine Learning
- `POST /ml/forecast` - Generate ML-based forecast
- `GET /ml/anomalies` - Detect anomalies in metrics
- `GET /ml/trends` - Get trend analysis

### Advanced Analytics
- `GET /cohort/analysis` - Perform cohort analysis
- `GET /funnel/analysis` - Analyze conversion funnel
- `GET /user/{user_id}/journey` - Get user journey

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
- Redis 5.0.1 - Caching and real-time aggregation
- Hiredis 2.3.2 - High-performance Redis

### Analytics & ML
- NumPy 1.26.3 - Numerical computing
- Pandas 2.1.4 - Data manipulation
- Scikit-learn 1.4.0 - ML algorithms
- SciPy 1.11.4 - Scientific computing

### Time Series
- Statsmodels 0.14.1 - Statistical models
- Prophet 1.1.5 - Time series forecasting

### Anomaly Detection
- PyOD 1.1.3 - Outlier detection

### Utilities
- Python-dotenv 1.0.0 - Environment management
- HTTPX 0.26.0 - HTTP client
- PyJWT 2.8.0 - JWT tokens

## Local Development Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 14+ (with TimescaleDB extension recommended)
- Redis 7+

### Installation

```bash
# Navigate to service directory
cd organization/apps/services/analytics

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize analytics database
python scripts/init_db.py

# Create TimescaleDB hypertables (optional)
python scripts/setup_timescale.py

# Start the service
uvicorn src.api:app --reload --port 8005
```

### Development Workflow

```bash
# Run with auto-reload
uvicorn src.api:app --reload --port 8005

# Run tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html

# Test analytics pipelines
python tests/pipelines/test_analytics_pipeline.py
```

## Docker Usage

### Build Image

```bash
# Build the Docker image
docker build -t broxiva/analytics:latest .

# Build with specific version
docker build -t broxiva/analytics:v2.0.0 .
```

### Run Container

```bash
# Run standalone
docker run -d \
  --name analytics \
  -p 8005:8005 \
  --env-file .env \
  broxiva/analytics:latest

# Run with Docker Compose
docker-compose up analytics

# View logs
docker logs -f analytics

# Shell access
docker exec -it analytics bash
```

### Docker Compose Example

```yaml
services:
  analytics:
    build: ./organization/apps/services/analytics
    ports:
      - "8005:8005"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/broxiva
      - ANALYTICS_DATABASE_URL=postgresql://postgres:password@timescaledb:5432/analytics
      - REDIS_URL=redis://redis:6379/4
    depends_on:
      - db
      - redis
      - timescaledb
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8005/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  timescaledb:
    image: timescale/timescaledb:latest-pg14
    environment:
      - POSTGRES_PASSWORD=password
    ports:
      - "5433:5432"
    volumes:
      - timescale_data:/var/lib/postgresql/data

volumes:
  timescale_data:
```

## Testing Instructions

### Unit Tests

```bash
# Run all unit tests
pytest tests/unit/ -v

# Test specific module
pytest tests/unit/test_event_processor.py -v

# Run with markers
pytest -m "not slow" -v
```

### Integration Tests

```bash
# Run integration tests
pytest tests/integration/ -v

# Test analytics pipeline
pytest tests/integration/test_analytics_pipeline.py -v

# Test with live database
pytest tests/integration/ --live-db
```

### Performance Tests

```bash
# Load test event tracking
locust -f tests/load/event_tracking.py --host=http://localhost:8005

# Benchmark metric calculations
python tests/benchmark/metrics_benchmark.py

# Stress test real-time aggregation
python tests/benchmark/realtime_stress.py
```

## Event Tracking

### Track Events

```python
# Track single event
POST /events/track
{
  "event_type": "page_view",
  "user_id": "user_123",
  "session_id": "sess_456",
  "properties": {
    "page": "/products/wireless-headphones",
    "referrer": "google.com"
  }
}

# Track batch events
POST /events/batch
[
  {"event_type": "product_view", ...},
  {"event_type": "add_to_cart", ...},
  {"event_type": "purchase", ...}
]
```

### Event Types

Common event types:
- `page_view` - Page visits
- `product_view` - Product detail views
- `add_to_cart` - Add to cart actions
- `remove_from_cart` - Remove from cart
- `checkout_start` - Checkout initiated
- `purchase` - Order completed
- `search` - Search queries
- `filter` - Filter applied

## Real-time Analytics

### Get Real-time Overview

```bash
curl http://localhost:8005/realtime/overview
```

Response:
```json
{
  "timestamp": "2025-12-04T10:30:00Z",
  "active_users": 1247,
  "active_sessions": 892,
  "orders_today": 156,
  "revenue_today": 15420.50,
  "cart_value_avg": 85.30,
  "conversion_rate": 3.2
}
```

## Dashboard Metrics

### Custom Metrics Query

```python
POST /dashboard/metrics
{
  "start_date": "2025-11-01T00:00:00Z",
  "end_date": "2025-12-01T00:00:00Z",
  "metrics": ["revenue", "orders", "conversion_rate"],
  "dimensions": ["category", "region"],
  "filters": {
    "category": "electronics"
  }
}
```

## Machine Learning Features

### Forecasting

```bash
# Forecast revenue for next 30 days
POST /ml/forecast
{
  "metric": "revenue",
  "horizon_days": 30,
  "granularity": "daily"
}
```

### Anomaly Detection

```bash
# Detect anomalies in order volume
GET /ml/anomalies?metric=orders&lookback_hours=24
```

### Cohort Analysis

```bash
# Retention cohort analysis
GET /cohort/analysis?start_date=2025-01-01&cohort_type=acquisition_month&metric=retention
```

### Funnel Analysis

```bash
# Checkout funnel analysis
GET /funnel/analysis?funnel_name=checkout&start_date=2025-11-01&end_date=2025-12-01
```

## Data Pipeline

### Event Processing Pipeline

```
Events → Kafka/Redis → Event Processor → Database
                                ↓
                         Real-time Aggregator
                                ↓
                         Redis Cache → API
```

### Batch Processing

```bash
# Run daily aggregation
python scripts/daily_aggregation.py --date 2025-12-03

# Run monthly reports
python scripts/monthly_reports.py --month 2025-12

# Export analytics data
python scripts/export_analytics.py --format csv --output data/
```

## Analytics Dashboards

### Grafana Integration

```yaml
# grafana_dashboard.json
{
  "dashboard": {
    "title": "Broxiva Analytics",
    "panels": [
      {
        "title": "Revenue Trend",
        "targets": [
          {
            "datasource": "PostgreSQL",
            "rawSql": "SELECT time, revenue FROM daily_metrics"
          }
        ]
      }
    ]
  }
}
```

### Custom Reports

```python
# Generate custom report
from batch.report_generator import ReportGenerator

generator = ReportGenerator()
report = generator.generate(
    report_type="sales_summary",
    start_date="2025-11-01",
    end_date="2025-11-30",
    format="pdf"
)
```

## Monitoring & Metrics

### Key Metrics

- **Event Processing Rate**: Events processed per second
- **Query Latency**: p50, p95, p99 response times
- **Data Freshness**: Time lag for real-time metrics
- **Pipeline Health**: Success/failure rates
- **Storage Growth**: Database size trends

### Prometheus Metrics

```
# Event metrics
analytics_events_total{type="page_view"} 1000000
analytics_events_processed_per_second 450

# Query metrics
analytics_query_duration_seconds{quantile="0.95"} 0.5
analytics_queries_total 50000

# Pipeline metrics
analytics_pipeline_lag_seconds 2.5
```

## Architecture

```
analytics/
├── src/
│   ├── realtime/              # Real-time processing
│   │   ├── event_processor.py
│   │   └── realtime_aggregator.py
│   ├── batch/                 # Batch analytics
│   │   ├── metrics_calculator.py
│   │   └── report_generator.py
│   ├── ml_insights/           # ML features
│   │   ├── forecaster.py
│   │   ├── anomaly_detector.py
│   │   ├── cohort_analyzer.py
│   │   └── funnel_analyzer.py
│   ├── api/                   # API routers
│   └── utils/                 # Utilities
├── data/                      # Analytics data
├── notebooks/                 # Analysis notebooks
├── tests/                     # Test suite
├── scripts/                   # Utility scripts
└── Dockerfile                 # Container definition
```

## Best Practices

### Event Tracking
1. Use consistent event naming conventions
2. Include essential context in event properties
3. Batch events when possible for better performance
4. Set appropriate event retention policies

### Performance
1. Use TimescaleDB for time-series data
2. Implement efficient data retention policies
3. Cache frequently accessed metrics
4. Use materialized views for complex aggregations

### Data Quality
1. Validate event data on ingestion
2. Handle missing or malformed data gracefully
3. Monitor data quality metrics
4. Regular data audits and cleanup

## Troubleshooting

### Common Issues

**High Event Processing Lag**
- Increase worker threads
- Enable batch processing
- Optimize database queries
- Scale horizontally

**Slow Query Performance**
- Add database indexes
- Enable query caching
- Use materialized views
- Partition large tables

**Memory Issues**
- Reduce batch sizes
- Implement streaming processing
- Optimize data structures
- Add memory limits

## API Documentation

Interactive API documentation:
- Swagger UI: http://localhost:8005/docs
- ReDoc: http://localhost:8005/redoc

## Contributing

See [Contributing Guide](../../../CONTRIBUTING.md) for development guidelines.

## License

Proprietary - Broxiva Platform

## Support

For issues and questions:
- Internal Slack: #analytics-support
- Email: data@broxiva.com
