# Global Supplier Integration Service

## Overview

The Global Supplier Integration Service provides a unified API for connecting to 25+ global dropshipping suppliers. It abstracts the complexity of different supplier APIs, handles product syncing, order placement, inventory tracking, and provides a consistent interface for all supplier operations.

## Supported Suppliers (25+)

### China + Global Suppliers
- **AliExpress + DSers** - Leading Chinese marketplace
- **Alibaba Wholesale** - B2B wholesale platform
- **Temu/Pinduoduo** - Fast-growing Chinese marketplace
- **Banggood** - Electronics and gadgets

### US/EU Fast Shipping
- **Spocket** - US/EU suppliers with fast shipping
- **Syncee** - European and US suppliers
- **Modalyst** - Premium US suppliers
- **Wholesale2B** - US dropshipping suppliers

### Print on Demand (POD)
- **Printful** - Custom print products
- **Printify** - Print-on-demand network
- **Gelato** - Global POD network
- **AOP+** - All-over-print products
- **TeeSpring/Spring** - Creator-focused POD

### Automation / Multi-Source
- **CJdropshipping** - Automated fulfillment
- **Zendrop** - Dropshipping automation
- **AutoDS** - Auto dropshipping platform
- **Inventory Source** - Multi-supplier inventory
- **Dropified** - Dropshipping automation

### Africa & International
- **Jumia Marketplace** - African e-commerce
- **Konga Marketplace** - Nigerian marketplace
- **Takealot** - South African marketplace
- **ShopaMagic** - African dropshipping
- **Expertnaire/Digistem** - Digital products

## Key Features

### Product Management
- **Product Import**: Import products from any supplier
- **Product Sync**: Automated product data synchronization
- **Bulk Operations**: Import thousands of products efficiently
- **Product Mapping**: Map supplier products to platform products

### Order Management
- **Unified Ordering**: Place orders across all suppliers
- **Order Tracking**: Real-time tracking from all suppliers
- **Status Updates**: Automated order status synchronization
- **Bulk Ordering**: Process multiple orders efficiently

### Inventory Management
- **Real-time Inventory**: Live stock level monitoring
- **Auto-sync**: Automated inventory synchronization
- **Low Stock Alerts**: Notifications for low inventory
- **Multi-location**: Track inventory across warehouses

### Integration Features
- **Webhooks**: Receive real-time supplier updates
- **Rate Limiting**: Respect supplier API limits
- **Error Handling**: Robust retry and error recovery
- **Authentication**: Secure supplier credential management

## Environment Variables

```bash
# Service Configuration
LOG_LEVEL=INFO
PORT=8010
DEBUG=false

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/citadelbuy

# Redis Cache
REDIS_URL=redis://localhost:6379/7
REDIS_PASSWORD=your_redis_password
CACHE_TTL=3600

# Sync Configuration
AUTO_SYNC_ENABLED=true
SYNC_INTERVAL_MINUTES=60
PRODUCT_SYNC_BATCH_SIZE=100
INVENTORY_SYNC_INTERVAL_MINUTES=15

# CORS
CORS_ORIGINS=["http://localhost:3000", "https://citadelbuy.com"]

# Supplier API Keys (examples)
# AliExpress
ALIEXPRESS_API_KEY=your_aliexpress_key
ALIEXPRESS_API_SECRET=your_aliexpress_secret

# Printful
PRINTFUL_API_KEY=your_printful_key

# Spocket
SPOCKET_API_KEY=your_spocket_key

# CJdropshipping
CJ_API_KEY=your_cj_key
CJ_API_SECRET=your_cj_secret

# Webhook URLs
WEBHOOK_SECRET=your_webhook_secret
WEBHOOK_BASE_URL=https://api.citadelbuy.com

# Performance
MAX_CONCURRENT_REQUESTS=50
REQUEST_TIMEOUT=30
MAX_RETRIES=3

# Feature Flags
ENABLE_PRODUCT_AUTO_SYNC=true
ENABLE_INVENTORY_AUTO_SYNC=true
ENABLE_WEBHOOKS=true
ENABLE_POD_INTEGRATION=true
```

## API Endpoints

### Suppliers
- `GET /api/v1/suppliers` - List all connected suppliers
- `GET /api/v1/suppliers/{supplier_id}` - Get supplier details
- `POST /api/v1/suppliers/{supplier_id}/connect` - Connect supplier
- `DELETE /api/v1/suppliers/{supplier_id}/disconnect` - Disconnect supplier

### Products
- `GET /api/v1/products` - List products from all suppliers
- `GET /api/v1/products/{product_id}` - Get product details
- `POST /api/v1/products/import` - Import product from supplier
- `POST /api/v1/products/import/bulk` - Bulk import products
- `PUT /api/v1/products/{product_id}/sync` - Sync product data

### Orders
- `POST /api/v1/orders` - Place order with supplier
- `GET /api/v1/orders/{order_id}` - Get order status
- `GET /api/v1/orders` - List all orders
- `POST /api/v1/orders/bulk` - Place bulk orders

### Inventory
- `GET /api/v1/inventory` - Get inventory levels
- `GET /api/v1/inventory/{product_id}` - Get product inventory
- `POST /api/v1/inventory/sync` - Sync inventory
- `POST /api/v1/inventory/sync/bulk` - Bulk sync inventory

### Tracking
- `GET /api/v1/tracking/{order_id}` - Get tracking information
- `GET /api/v1/tracking` - List all trackings
- `POST /api/v1/tracking/update` - Update tracking manually

### Sync
- `POST /api/v1/sync/products` - Trigger product sync
- `POST /api/v1/sync/inventory` - Trigger inventory sync
- `POST /api/v1/sync/orders` - Trigger order sync
- `GET /api/v1/sync/status` - Get sync status

### Webhooks
- `POST /api/v1/webhooks/inventory` - Inventory webhook
- `POST /api/v1/webhooks/order` - Order status webhook
- `POST /api/v1/webhooks/tracking` - Tracking webhook

### Print on Demand (POD)
- `POST /api/v1/pod/design/upload` - Upload design
- `POST /api/v1/pod/product/create` - Create POD product
- `GET /api/v1/pod/products` - List POD products
- `POST /api/v1/pod/order` - Place POD order

### Health & Monitoring
- `GET /health` - Service health check
- `GET /metrics` - Prometheus metrics

## Dependencies

### Core Framework
- FastAPI 0.109.0 - Async web framework
- Uvicorn 0.27.0 - ASGI server
- Pydantic 2.5.3 - Data validation
- Pydantic-settings 2.1.0 - Settings management

### Database & Caching
- SQLAlchemy 2.0.25 - ORM
- AsyncPG 0.29.0 - PostgreSQL driver
- Alembic 1.13.1 - Database migrations
- Redis 5.0.1 - Caching
- AIORedis 2.0.1 - Async Redis client

### HTTP Clients
- HTTPX 0.26.0 - Async HTTP client
- AIOHttp 3.9.1 - Alternative HTTP client

### Security
- Python-jose 3.3.0 - JWT handling
- Passlib 1.7.4 - Password hashing
- Cryptography 41.0.7 - Encryption

### Utilities
- Python-dotenv 1.0.0 - Environment management
- Tenacity 8.2.3 - Retry logic
- ORJson 3.9.10 - Fast JSON parsing
- XMLtodict 0.13.0 - XML parsing
- Pandas 2.1.4 - Data processing

### Monitoring
- StructLog 24.1.0 - Structured logging
- Python-json-logger 2.0.7 - JSON logging
- Prometheus-client 0.19.0 - Metrics

## Local Development Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 14+
- Redis 7+
- Supplier API credentials

### Installation

```bash
# Navigate to service directory
cd organization/apps/services/supplier-integration

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your supplier API keys

# Run database migrations
alembic upgrade head

# Start the service
uvicorn main:app --reload --port 8010
```

### Development Workflow

```bash
# Run with auto-reload
uvicorn main:app --reload --port 8010

# Run tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html

# Test supplier integration
python tests/suppliers/test_aliexpress.py
```

## Docker Usage

### Build Image

```bash
# Build the Docker image
docker build -t citadelbuy/supplier-integration:latest .

# Build with specific version
docker build -t citadelbuy/supplier-integration:v1.0.0 .
```

### Run Container

```bash
# Run standalone
docker run -d \
  --name supplier-integration \
  -p 8010:8010 \
  --env-file .env \
  citadelbuy/supplier-integration:latest

# Run with Docker Compose
docker-compose up supplier-integration

# View logs
docker logs -f supplier-integration

# Shell access
docker exec -it supplier-integration bash
```

### Docker Compose Example

```yaml
services:
  supplier-integration:
    build: ./organization/apps/services/supplier-integration
    ports:
      - "8010:8010"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/citadelbuy
      - REDIS_URL=redis://redis:6379/7
      - AUTO_SYNC_ENABLED=true
    depends_on:
      - db
      - redis
    env_file:
      - .env.suppliers  # Supplier API keys
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8010/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Testing Instructions

### Unit Tests

```bash
# Run all unit tests
pytest tests/unit/ -v

# Test specific supplier
pytest tests/unit/test_aliexpress_client.py -v

# Run with markers
pytest -m "not integration" -v
```

### Integration Tests

```bash
# Run integration tests (requires API keys)
pytest tests/integration/ -v

# Test specific supplier integration
pytest tests/integration/test_printful_integration.py -v
```

### End-to-End Tests

```bash
# Test full product import flow
python tests/e2e/test_product_import.py

# Test order placement flow
python tests/e2e/test_order_placement.py
```

## Usage Examples

### Import Product from AliExpress

```bash
curl -X POST http://localhost:8010/api/v1/products/import \
  -H "Content-Type: application/json" \
  -d '{
    "supplier": "aliexpress",
    "product_url": "https://www.aliexpress.com/item/123456.html",
    "auto_sync": true
  }'
```

### Place Order with Supplier

```bash
curl -X POST http://localhost:8010/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "supplier_id": "spocket",
    "products": [
      {
        "product_id": "prod_123",
        "quantity": 2,
        "variant_id": "var_456"
      }
    ],
    "shipping_address": {
      "name": "John Doe",
      "address1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001",
      "country": "US"
    }
  }'
```

### Get Order Tracking

```bash
curl http://localhost:8010/api/v1/tracking/order_789
```

Response:
```json
{
  "order_id": "order_789",
  "supplier": "cjdropshipping",
  "tracking_number": "1Z999AA10123456784",
  "carrier": "UPS",
  "status": "in_transit",
  "estimated_delivery": "2025-12-10",
  "events": [
    {
      "timestamp": "2025-12-04T10:00:00Z",
      "status": "picked_up",
      "location": "Shenzhen, China"
    },
    {
      "timestamp": "2025-12-05T15:30:00Z",
      "status": "in_transit",
      "location": "Hong Kong"
    }
  ]
}
```

## Supplier Integration Guide

### Adding a New Supplier

1. Create supplier client in `src/suppliers/`:

```python
# src/suppliers/newsupplier_client.py
from src.suppliers.base import BaseSupplierClient

class NewSupplierClient(BaseSupplierClient):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.newsupplier.com"

    async def get_product(self, product_id: str):
        # Implement product fetching
        pass

    async def place_order(self, order_data: dict):
        # Implement order placement
        pass
```

2. Register in supplier registry
3. Add configuration to `.env`
4. Write tests
5. Update documentation

### Sync Scheduler

The service includes an automated sync scheduler:

```python
# Runs every hour
- Product data sync
- Inventory sync
- Order status updates
- Tracking updates
```

Configure sync intervals in environment variables.

## Monitoring & Metrics

### Key Metrics

- **Sync Success Rate**: Percentage of successful syncs
- **API Response Time**: Latency per supplier
- **Order Success Rate**: Successful order placements
- **Inventory Accuracy**: Stock level accuracy
- **Webhook Processing**: Webhook handling performance

### Prometheus Metrics

```
# Supplier metrics
supplier_requests_total{supplier="aliexpress"} 50000
supplier_request_duration_seconds{supplier="printful",quantile="0.95"} 1.5

# Sync metrics
sync_duration_seconds{type="product"} 45.2
sync_success_total{type="inventory"} 1000

# Order metrics
orders_placed_total{supplier="spocket"} 500
orders_failed_total{supplier="cjdropshipping"} 5
```

## Architecture

```
supplier-integration/
├── src/
│   ├── api/                   # API routers
│   │   ├── suppliers.py
│   │   ├── products.py
│   │   ├── orders.py
│   │   ├── inventory.py
│   │   ├── tracking.py
│   │   ├── sync.py
│   │   ├── webhooks.py
│   │   └── pod.py
│   ├── suppliers/             # Supplier clients
│   │   ├── base.py
│   │   ├── aliexpress.py
│   │   ├── printful.py
│   │   ├── spocket.py
│   │   └── ...
│   ├── services/              # Business logic
│   │   ├── sync_scheduler.py
│   │   ├── product_service.py
│   │   ├── order_service.py
│   │   └── inventory_service.py
│   ├── database/              # Database models
│   ├── config.py              # Configuration
│   └── utils/                 # Utilities
├── tests/                     # Test suite
├── alembic/                   # Database migrations
├── main.py                    # Application entry
├── requirements.txt           # Dependencies
└── Dockerfile                 # Container definition
```

## Best Practices

### Supplier Integration
1. Implement proper error handling and retries
2. Respect rate limits for each supplier
3. Cache frequently accessed data
4. Log all supplier interactions

### Performance
1. Use async operations for all I/O
2. Batch operations when possible
3. Implement connection pooling
4. Cache authentication tokens

### Reliability
1. Implement circuit breakers
2. Handle partial failures gracefully
3. Queue failed operations for retry
4. Monitor supplier health

## Troubleshooting

### Common Issues

**Supplier API Connection Failures**
- Verify API credentials
- Check network connectivity
- Review rate limiting
- Check supplier API status

**Product Sync Issues**
- Verify product mappings
- Check data format compatibility
- Review error logs
- Test with smaller batches

**Order Placement Failures**
- Validate order data
- Check inventory availability
- Verify shipping address format
- Review supplier requirements

## API Documentation

Interactive API documentation:
- Swagger UI: http://localhost:8010/docs
- ReDoc: http://localhost:8010/redoc

## Contributing

See [Contributing Guide](../../../CONTRIBUTING.md) for development guidelines.

## License

Proprietary - CitadelBuy Platform

## Support

For issues and questions:
- Internal Slack: #supplier-integration-support
- Email: integrations@citadelbuy.com
