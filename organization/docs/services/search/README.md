# Search Service

## Overview

The Search Service is CitadelBuy's advanced AI-powered search engine that provides semantic search, visual search, and voice search capabilities. Built on Elasticsearch with machine learning enhancements, it delivers highly relevant search results and intelligent query understanding.

## Key Features

### Search Capabilities
- **Semantic Search**: AI-powered understanding of search intent and context
- **Keyword Search**: Traditional full-text search with advanced ranking
- **Hybrid Search**: Combines keyword and semantic approaches for best results
- **Fuzzy Matching**: Handles typos and spelling variations

### Advanced Search
- **Visual Search**: Search products using images
- **Voice Search**: Speech-to-text with semantic understanding
- **Autocomplete**: Real-time search suggestions
- **Spell Correction**: Automatic query correction and suggestions

### Search Intelligence
- **Query Understanding**: Natural language processing for better intent detection
- **Faceted Search**: Dynamic filtering by category, price, brand, etc.
- **Personalized Ranking**: User-specific result ordering
- **Search Analytics**: Track queries, clicks, and conversions

### Product Indexing
- **Real-time Indexing**: Instant product updates in search index
- **Bulk Indexing**: Efficient batch product import
- **Smart Relevance**: ML-based ranking and boosting
- **Multi-language Support**: Search in multiple languages

## Environment Variables

```bash
# Service Configuration
LOG_LEVEL=INFO
PORT=8002

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/citadelbuy

# Redis Cache
REDIS_URL=redis://localhost:6379/3
REDIS_PASSWORD=your_redis_password

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your_elastic_password
ELASTICSEARCH_INDEX=products
ELASTICSEARCH_TIMEOUT=30

# Machine Learning
SENTENCE_TRANSFORMER_MODEL=all-MiniLM-L6-v2
VISUAL_MODEL=resnet50
ENABLE_GPU=false
MODEL_CACHE_DIR=/app/models

# Search Configuration
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100
MIN_RELEVANCE_SCORE=0.3
ENABLE_FUZZY_SEARCH=true
FUZZY_DISTANCE=2

# Voice Search
SPEECH_TO_TEXT_ENGINE=whisper
SUPPORTED_LANGUAGES=en,es,fr,de

# Performance
CACHE_TTL=300
SEARCH_TIMEOUT=5000
MAX_CONCURRENT_SEARCHES=50

# Feature Flags
ENABLE_SEMANTIC_SEARCH=true
ENABLE_VISUAL_SEARCH=true
ENABLE_VOICE_SEARCH=true
ENABLE_AUTOCOMPLETE=true
ENABLE_SPELL_CHECK=true
```

## API Endpoints

### Core Search
- `POST /search` - Search products with various strategies
- `POST /autocomplete` - Get autocomplete suggestions
- `POST /spell-correct` - Get spelling corrections

### Advanced Search
- `POST /visual-search` - Search using uploaded image
- `POST /voice-search` - Search using voice input
- `GET /suggestions/{query}` - Get query suggestions

### Product Indexing
- `POST /index/product` - Index a single product
- `POST /index/bulk` - Bulk index multiple products
- `DELETE /index/product/{id}` - Remove product from index
- `PUT /index/product/{id}` - Update product in index

### Analytics
- `POST /track/search` - Track search query
- `POST /track/click` - Track search result click
- `GET /analytics/top-queries` - Get top search queries
- `GET /analytics/no-results` - Get queries with no results

### Health & Monitoring
- `GET /health` - Service health check
- `GET /metrics` - Prometheus metrics
- `GET /index/stats` - Index statistics

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

### Search Engine
- Elasticsearch 8.11.1 - Search and analytics engine

### Machine Learning & AI
- NumPy 1.26.3 - Numerical computing
- Pandas 2.1.4 - Data manipulation
- Sentence-Transformers 2.2.2 - Semantic embeddings
- Transformers 4.36.2 - NLP models
- PyTorch 2.1.2 - Deep learning framework

### Image Processing
- Pillow 10.2.0 - Image manipulation
- OpenCV 4.9.0 - Computer vision

### Audio Processing
- Librosa 0.10.1 - Audio analysis
- SoundFile 0.12.1 - Audio file I/O
- PyDub 0.25.1 - Audio processing

### Utilities
- Python-dotenv 1.0.0 - Environment management
- HTTPX 0.26.0 - HTTP client
- PyJWT 2.8.0 - JWT tokens

## Local Development Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 14+
- Redis 7+
- Elasticsearch 8.x

### Installation

```bash
# Navigate to service directory
cd organization/apps/services/search

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start Elasticsearch (Docker)
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  elasticsearch:8.11.1

# Initialize search index
python scripts/init_index.py

# Download ML models
python scripts/download_models.py

# Start the service
uvicorn src.api:app --reload --port 8002
```

### Development Workflow

```bash
# Run with auto-reload
uvicorn src.api:app --reload --port 8002

# Run tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html

# Test search quality
python tests/quality/test_search_relevance.py

# Benchmark search performance
python tests/benchmark/benchmark_search.py
```

## Docker Usage

### Build Image

```bash
# Build the Docker image
docker build -t citadelbuy/search:latest .

# Build with specific version
docker build -t citadelbuy/search:v2.0.0 .
```

### Run Container

```bash
# Run standalone
docker run -d \
  --name search \
  -p 8002:8002 \
  --env-file .env \
  -v $(pwd)/models:/app/models \
  citadelbuy/search:latest

# Run with Docker Compose
docker-compose up search

# View logs
docker logs -f search

# Shell access
docker exec -it search bash
```

### Docker Compose Example

```yaml
services:
  search:
    build: ./organization/apps/services/search
    ports:
      - "8002:8002"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/citadelbuy
      - REDIS_URL=redis://redis:6379/3
      - ELASTICSEARCH_URL=http://elasticsearch:9200
    depends_on:
      - db
      - redis
      - elasticsearch
    volumes:
      - ./models:/app/models
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8002/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  elasticsearch:
    image: elasticsearch:8.11.1
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

volumes:
  elasticsearch_data:
```

## Testing Instructions

### Unit Tests

```bash
# Run all unit tests
pytest tests/unit/ -v

# Test specific module
pytest tests/unit/test_semantic_search.py -v

# Run with markers
pytest -m "not slow" -v
```

### Integration Tests

```bash
# Run integration tests (requires Elasticsearch)
docker-compose up -d elasticsearch
pytest tests/integration/ -v

# Test indexing pipeline
pytest tests/integration/test_indexing.py -v
```

### Search Quality Tests

```bash
# Test search relevance
python tests/quality/test_relevance.py

# Test with benchmark queries
python tests/quality/benchmark_queries.py --queries test_queries.json

# Evaluate ranking quality
python tests/quality/evaluate_ranking.py
```

### Performance Tests

```bash
# Load test search endpoint
locust -f tests/load/search_load.py --host=http://localhost:8002

# Benchmark query performance
python tests/benchmark/query_performance.py

# Stress test indexing
python tests/benchmark/indexing_stress.py
```

## Search Configuration

### Elasticsearch Index Mapping

```json
{
  "mappings": {
    "properties": {
      "id": {"type": "keyword"},
      "name": {"type": "text", "analyzer": "standard"},
      "description": {"type": "text", "analyzer": "english"},
      "category": {"type": "keyword"},
      "price": {"type": "float"},
      "brand": {"type": "keyword"},
      "tags": {"type": "keyword"},
      "embedding": {"type": "dense_vector", "dims": 384}
    }
  }
}
```

### Custom Analyzers

```python
# Configure custom analyzers for better search
analyzers = {
    "product_analyzer": {
        "type": "custom",
        "tokenizer": "standard",
        "filter": ["lowercase", "stop", "snowball"]
    }
}
```

## Visual Search

### Image Upload

```bash
curl -X POST http://localhost:8002/visual-search \
  -F "image=@product.jpg" \
  -F "category=electronics" \
  -F "limit=20"
```

### Image Feature Extraction

```python
from visual.feature_extractor import FeatureExtractor

extractor = FeatureExtractor()
features = extractor.extract(image_bytes)
```

## Voice Search

### Audio Upload

```bash
curl -X POST http://localhost:8002/voice-search \
  -F "audio=@query.wav" \
  -F "language=en"
```

### Speech-to-Text

```python
from voice.speech_to_text import SpeechToText

stt = SpeechToText()
transcription = stt.transcribe(audio_bytes, language="en")
```

## Indexing Pipeline

### Index Single Product

```bash
curl -X POST http://localhost:8002/index/product \
  -H "Content-Type: application/json" \
  -d '{
    "id": "prod_123",
    "name": "Wireless Headphones",
    "description": "High-quality Bluetooth headphones",
    "price": 99.99,
    "category": "electronics"
  }'
```

### Bulk Indexing

```bash
# Index from CSV file
python scripts/bulk_index.py --file products.csv

# Index from database
python scripts/index_from_db.py --batch-size 1000
```

### Reindexing

```bash
# Full reindex
python scripts/reindex.py --index products

# Reindex with zero downtime
python scripts/reindex_safe.py --source products --target products_v2
```

## Search Analytics

### Track Search Events

```python
# Track search query
POST /track/search
{
  "query": "wireless headphones",
  "user_id": "user_123",
  "results_count": 42
}

# Track click
POST /track/click
{
  "query": "wireless headphones",
  "product_id": "prod_456",
  "position": 3
}
```

### Analytics Queries

```bash
# Top search queries
GET /analytics/top-queries?days=7&limit=50

# Queries with no results
GET /analytics/no-results?days=7

# Search conversion rate
GET /analytics/conversion-rate?days=30
```

## Performance Optimization

### Caching Strategy

```python
# Cache search results
@cache(ttl=300)
def search(query: str, filters: dict):
    return elasticsearch.search(query, filters)
```

### Query Optimization

```python
# Use filters instead of queries where possible
# Use bool queries for complex logic
# Limit result size
# Use pagination
```

### Index Optimization

```bash
# Optimize index for search performance
curl -X POST "localhost:9200/products/_forcemerge?max_num_segments=1"

# Refresh index
curl -X POST "localhost:9200/products/_refresh"
```

## Monitoring & Metrics

### Key Metrics

- **Query Latency**: p50, p95, p99 response times
- **Query Volume**: Searches per second
- **No Results Rate**: Percentage of queries with zero results
- **Click-Through Rate**: Percentage of searches resulting in clicks
- **Conversion Rate**: Percentage leading to purchases

### Prometheus Metrics

```
# Search metrics
search_queries_total{type="semantic"} 50000
search_duration_seconds{quantile="0.95"} 0.2
search_results_count{query_type="keyword"} avg=15

# Index metrics
index_size_bytes 1.5e9
index_documents_total 100000
```

## Architecture

```
search/
├── src/
│   ├── indexing/              # Product indexing
│   │   ├── elasticsearch_client.py
│   │   └── product_indexer.py
│   ├── query/                 # Query processing
│   │   ├── semantic_search.py
│   │   ├── query_processor.py
│   │   ├── autocomplete.py
│   │   └── spell_checker.py
│   ├── ranking/               # Result ranking
│   ├── visual_search/         # Visual search
│   │   ├── image_search.py
│   │   └── feature_extractor.py
│   ├── voice_search/          # Voice search
│   │   └── speech_to_text.py
│   ├── api/                   # API routers
│   └── utils/                 # Utilities
├── data/                      # Training data
├── models/                    # ML models
├── notebooks/                 # Analysis notebooks
├── tests/                     # Test suite
├── scripts/                   # Utility scripts
└── Dockerfile                 # Container definition
```

## Best Practices

### Search Quality
1. Regularly analyze no-result queries
2. A/B test ranking algorithms
3. Monitor and improve relevance metrics
4. Handle synonyms and common misspellings

### Performance
1. Cache frequently searched queries
2. Use Elasticsearch filters for better performance
3. Implement query result pagination
4. Optimize index settings

### User Experience
1. Provide autocomplete suggestions
2. Show spell corrections
3. Display facets for filtering
4. Track and analyze user behavior

## Troubleshooting

### Common Issues

**Slow Search Performance**
- Check Elasticsearch cluster health
- Optimize index settings
- Enable query caching
- Review query complexity

**Poor Search Results**
- Review index mapping
- Check analyzer configuration
- Tune relevance scoring
- Add synonyms and stop words

**Elasticsearch Connection Issues**
- Verify Elasticsearch is running
- Check network connectivity
- Validate credentials
- Review firewall rules

## API Documentation

Interactive API documentation:
- Swagger UI: http://localhost:8002/docs
- ReDoc: http://localhost:8002/redoc

## Contributing

See [Contributing Guide](../../../CONTRIBUTING.md) for development guidelines.

## License

Proprietary - CitadelBuy Platform

## Support

For issues and questions:
- Internal Slack: #search-support
- Email: dev@citadelbuy.com
