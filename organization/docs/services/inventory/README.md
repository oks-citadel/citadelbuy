# Inventory Management Service

## Overview

The Inventory Management Service handles real-time inventory tracking, stock level management, warehouse operations, and automated reordering for the CitadelBuy platform. It provides accurate inventory counts across multiple warehouses and prevents overselling.

## Key Features

### Inventory Tracking
- **Real-time Inventory**: Live stock level monitoring
- **Multi-warehouse Support**: Track inventory across multiple locations
- **Reservation System**: Reserve inventory during checkout
- **Stock Adjustments**: Manual and automated stock updates

### Warehouse Management
- **Warehouse Operations**: Manage multiple warehouse locations
- **Stock Transfers**: Transfer inventory between warehouses
- **Bin Location Tracking**: Track products by warehouse bin/shelf
- **Receiving & Putaway**: Process incoming inventory

### Automation
- **Auto-reordering**: Automatic purchase orders when stock is low
- **Low Stock Alerts**: Notifications for low inventory levels
- **Stock Forecasting**: Predict future inventory needs
- **ABC Analysis**: Categorize products by importance

### Reporting
- **Inventory Reports**: Stock levels, turnover, aging reports
- **Valuation**: Inventory value calculations
- **Audit Trails**: Complete history of inventory changes
- **Analytics**: Inventory performance metrics

## Environment Variables

```bash
# Service Configuration
LOG_LEVEL=INFO
PORT=8007

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/citadelbuy

# Redis Cache
REDIS_URL=redis://localhost:6379/8
REDIS_PASSWORD=your_redis_password

# Inventory Configuration
RESERVATION_TIMEOUT_MINUTES=15
LOW_STOCK_THRESHOLD=10
AUTO_REORDER_ENABLED=true
REORDER_POINT_MULTIPLIER=1.5

# Warehouse Settings
DEFAULT_WAREHOUSE_ID=warehouse_1
ENABLE_MULTI_WAREHOUSE=true

# Feature Flags
ENABLE_STOCK_FORECASTING=true
ENABLE_AUTO_REORDER=true
ENABLE_BIN_TRACKING=false
```

## API Endpoints

### Inventory
- `GET /api/v1/inventory` - List all inventory
- `GET /api/v1/inventory/{product_id}` - Get product inventory
- `POST /api/v1/inventory/adjust` - Adjust stock levels
- `POST /api/v1/inventory/reserve` - Reserve inventory
- `POST /api/v1/inventory/release` - Release reserved inventory

### Warehouses
- `GET /api/v1/warehouses` - List warehouses
- `GET /api/v1/warehouses/{warehouse_id}/inventory` - Get warehouse inventory
- `POST /api/v1/warehouses/{warehouse_id}/transfer` - Transfer stock

### Reordering
- `GET /api/v1/reorder/suggestions` - Get reorder suggestions
- `POST /api/v1/reorder/create` - Create purchase order
- `GET /api/v1/reorder/orders` - List purchase orders

### Health & Monitoring
- `GET /health` - Service health check
- `GET /metrics` - Prometheus metrics

## Dependencies

- FastAPI 0.109.0
- SQLAlchemy 2.0.25
- Redis 5.0.1
- AsyncPG 0.29.0

## Local Development Setup

```bash
cd organization/apps/services/inventory
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8007
```

## Docker Usage

```bash
docker build -t citadelbuy/inventory:latest .
docker run -p 8007:8007 --env-file .env citadelbuy/inventory:latest
```

## Testing

```bash
pytest tests/ -v
pytest tests/ --cov=src --cov-report=html
```

## API Documentation

- Swagger UI: http://localhost:8007/docs
- ReDoc: http://localhost:8007/redoc

## Support

- Internal Slack: #inventory-support
- Email: ops@citadelbuy.com
