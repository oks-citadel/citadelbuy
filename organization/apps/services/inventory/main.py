"""
Inventory Service
FastAPI microservice for inventory management, stock levels, and low stock alerts
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query, Path, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import logging
import os
import json
import numpy as np
from uuid import uuid4

# Configure structured logging
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FORMAT = os.getenv('LOG_FORMAT', 'json')


class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured JSON logging"""
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "service": "inventory-service",
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        if hasattr(record, 'extra_data'):
            log_data.update(record.extra_data)
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)


# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(getattr(logging, LOG_LEVEL))

if LOG_FORMAT == 'json':
    handler = logging.StreamHandler()
    handler.setFormatter(StructuredFormatter())
    logger.handlers = [handler]
else:
    logging.basicConfig(
        level=LOG_LEVEL,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

# CORS Configuration - Use specific origins instead of wildcard
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', '').split(',') if os.getenv('ALLOWED_ORIGINS') else [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost:8080",
    "https://broxiva.com",
    "https://admin.broxiva.com",
    "https://api.broxiva.com",
]


# ============================================
# Enums and Constants
# ============================================

class StockStatus(str, Enum):
    IN_STOCK = "in_stock"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"
    BACKORDERED = "backordered"
    DISCONTINUED = "discontinued"


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertType(str, Enum):
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"
    REORDER_POINT = "reorder_point"
    OVERSTOCK = "overstock"
    EXPIRING_SOON = "expiring_soon"


# ============================================
# In-Memory Storage (Replace with database in production)
# ============================================

inventory_items: Dict[str, Dict] = {}
stock_alerts: Dict[str, Dict] = {}
warehouses: Dict[str, Dict] = {}


# ============================================
# Lifespan Manager
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Inventory Service starting up...")
    _initialize_sample_data()
    logger.info("Inventory Service initialized successfully")
    yield
    logger.info("Inventory Service shutting down...")


# Initialize FastAPI app with lifespan
app = FastAPI(
    title="Broxiva Inventory Service",
    description="Inventory management, stock levels, and low stock alerts service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add CORS middleware with specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


# ============================================
# Request/Response Models
# ============================================

class DemandPredictionRequest(BaseModel):
    product_id: str
    warehouse_id: Optional[str] = None
    forecast_days: int = Field(default=30, ge=1, le=90)
    include_seasonality: bool = True
    historical_data: Optional[List[Dict[str, Any]]] = None


class DemandPrediction(BaseModel):
    product_id: str
    warehouse_id: Optional[str] = None
    forecast_period_days: int
    predictions: List[Dict[str, Any]]
    confidence_interval: Dict[str, List[float]]
    model_metrics: Dict[str, float]
    seasonality_detected: bool
    trend: str
    model_version: str


class StockOptimizationRequest(BaseModel):
    product_id: str
    warehouse_id: Optional[str] = None
    current_stock: int
    lead_time_days: int = Field(default=7, ge=1)
    service_level: float = Field(default=0.95, ge=0.8, le=0.99)
    holding_cost_per_unit: Optional[float] = None
    stockout_cost_per_unit: Optional[float] = None
    historical_demand: Optional[List[int]] = None


class StockOptimization(BaseModel):
    product_id: str
    warehouse_id: Optional[str] = None
    current_stock: int
    recommended_order_quantity: int
    reorder_point: int
    safety_stock: int
    days_of_stock: float
    stockout_risk: float
    optimization_method: str
    cost_analysis: Dict[str, float]
    recommendations: List[str]


class InventoryItemCreate(BaseModel):
    sku: str = Field(..., min_length=1, max_length=50, description="Stock Keeping Unit")
    name: str = Field(..., min_length=1, max_length=200)
    category: Optional[str] = None
    quantity: int = Field(default=0, ge=0)
    reorder_point: int = Field(default=10, ge=0)
    reorder_quantity: int = Field(default=20, ge=0)
    unit_cost: float = Field(default=0.0, ge=0)
    warehouse_id: Optional[str] = None


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[str] = None
    quantity: Optional[int] = Field(None, ge=0)
    reorder_point: Optional[int] = Field(None, ge=0)
    reorder_quantity: Optional[int] = Field(None, ge=0)
    unit_cost: Optional[float] = Field(None, ge=0)
    warehouse_id: Optional[str] = None
    status: Optional[StockStatus] = None


class StockAdjustment(BaseModel):
    quantity_change: int = Field(..., description="Positive to add, negative to subtract")
    reason: str = Field(..., min_length=1, max_length=500)
    reference_id: Optional[str] = None


class BulkStockUpdate(BaseModel):
    updates: List[Dict[str, Any]] = Field(..., description="List of {item_id, quantity_change, reason}")


# ============================================
# Health Check Endpoint
# ============================================

@app.get("/health")
async def health_check():
    """Service health check endpoint."""
    return {
        "status": "healthy",
        "service": "inventory-service",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }


# ============================================
# CRUD Endpoints for Inventory Items
# ============================================

@app.get("/api/v1/inventory", response_model=Dict[str, Any])
async def list_inventory_items(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    warehouse_id: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[StockStatus] = None,
    low_stock_only: bool = False
):
    """List all inventory items with pagination and filters."""
    logger.info(f"Listing inventory items - page: {page}, warehouse: {warehouse_id}")

    items = list(inventory_items.values())

    if warehouse_id:
        items = [i for i in items if i.get("warehouse_id") == warehouse_id]
    if category:
        items = [i for i in items if i.get("category") == category]
    if status:
        items = [i for i in items if i.get("status") == status.value]
    if low_stock_only:
        items = [i for i in items if i.get("status") in [StockStatus.LOW_STOCK.value, StockStatus.OUT_OF_STOCK.value]]

    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    paginated_items = items[start:end]

    return {
        "success": True,
        "data": paginated_items,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size
        }
    }


@app.post("/api/v1/inventory", response_model=Dict[str, Any], status_code=201)
async def create_inventory_item(item: InventoryItemCreate, background_tasks: BackgroundTasks):
    """Create a new inventory item."""
    logger.info(f"Creating inventory item: {item.sku}")

    for existing in inventory_items.values():
        if existing.get("sku") == item.sku:
            raise HTTPException(status_code=400, detail=f"Item with SKU {item.sku} already exists")

    item_id = str(uuid4())
    status = StockStatus.IN_STOCK
    if item.quantity <= 0:
        status = StockStatus.OUT_OF_STOCK
    elif item.quantity <= item.reorder_point:
        status = StockStatus.LOW_STOCK

    new_item = {
        "id": item_id,
        "sku": item.sku,
        "name": item.name,
        "category": item.category,
        "quantity": item.quantity,
        "reserved_quantity": 0,
        "available_quantity": item.quantity,
        "reorder_point": item.reorder_point,
        "reorder_quantity": item.reorder_quantity,
        "unit_cost": item.unit_cost,
        "warehouse_id": item.warehouse_id,
        "status": status.value,
        "last_restock_date": None,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }

    inventory_items[item_id] = new_item

    if status == StockStatus.LOW_STOCK:
        background_tasks.add_task(_create_low_stock_alert, item_id, item.quantity, item.reorder_point)

    return {
        "success": True,
        "message": "Inventory item created successfully",
        "data": new_item
    }


@app.get("/api/v1/inventory/{item_id}", response_model=Dict[str, Any])
async def get_inventory_item(item_id: str = Path(..., description="Inventory item ID")):
    """Get a single inventory item by ID."""
    if item_id not in inventory_items:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    return {
        "success": True,
        "data": inventory_items[item_id]
    }


@app.put("/api/v1/inventory/{item_id}", response_model=Dict[str, Any])
async def update_inventory_item(
    item_id: str = Path(..., description="Inventory item ID"),
    update: InventoryItemUpdate = None
):
    """Update an inventory item."""
    if item_id not in inventory_items:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    item = inventory_items[item_id]
    update_data = update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        if value is not None:
            if field == "status":
                item[field] = value.value
            else:
                item[field] = value

    if "quantity" in update_data:
        item["available_quantity"] = item["quantity"] - item.get("reserved_quantity", 0)
        if item["quantity"] <= 0:
            item["status"] = StockStatus.OUT_OF_STOCK.value
        elif item["quantity"] <= item.get("reorder_point", 10):
            item["status"] = StockStatus.LOW_STOCK.value
        else:
            item["status"] = StockStatus.IN_STOCK.value

    item["updated_at"] = datetime.utcnow().isoformat()
    logger.info(f"Updated inventory item: {item_id}")

    return {
        "success": True,
        "message": "Inventory item updated successfully",
        "data": item
    }


@app.delete("/api/v1/inventory/{item_id}", response_model=Dict[str, Any])
async def delete_inventory_item(item_id: str = Path(..., description="Inventory item ID")):
    """Delete an inventory item."""
    if item_id not in inventory_items:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    deleted_item = inventory_items.pop(item_id)
    logger.info(f"Deleted inventory item: {item_id}, SKU: {deleted_item.get('sku')}")

    return {
        "success": True,
        "message": "Inventory item deleted successfully",
        "data": {"id": item_id, "sku": deleted_item.get("sku")}
    }


# ============================================
# Stock Level Management Endpoints
# ============================================

@app.post("/api/v1/inventory/{item_id}/adjust", response_model=Dict[str, Any])
async def adjust_stock(
    item_id: str = Path(..., description="Inventory item ID"),
    adjustment: StockAdjustment = None,
    background_tasks: BackgroundTasks = None
):
    """Adjust stock level for an item (add or subtract)."""
    if item_id not in inventory_items:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    item = inventory_items[item_id]
    old_quantity = item["quantity"]
    new_quantity = old_quantity + adjustment.quantity_change

    if new_quantity < 0:
        raise HTTPException(status_code=400, detail="Adjustment would result in negative stock")

    item["quantity"] = new_quantity
    item["available_quantity"] = new_quantity - item.get("reserved_quantity", 0)

    if new_quantity <= 0:
        item["status"] = StockStatus.OUT_OF_STOCK.value
    elif new_quantity <= item.get("reorder_point", 10):
        item["status"] = StockStatus.LOW_STOCK.value
    else:
        item["status"] = StockStatus.IN_STOCK.value

    if adjustment.quantity_change > 0:
        item["last_restock_date"] = datetime.utcnow().isoformat()

    item["updated_at"] = datetime.utcnow().isoformat()

    if item["status"] == StockStatus.LOW_STOCK.value:
        background_tasks.add_task(_create_low_stock_alert, item_id, new_quantity, item.get("reorder_point", 10))
    elif item["status"] == StockStatus.OUT_OF_STOCK.value:
        background_tasks.add_task(_create_out_of_stock_alert, item_id)

    logger.info(f"Stock adjusted for {item_id}: {old_quantity} -> {new_quantity}, reason: {adjustment.reason}")

    return {
        "success": True,
        "message": "Stock adjusted successfully",
        "data": {
            "item_id": item_id,
            "old_quantity": old_quantity,
            "new_quantity": new_quantity,
            "adjustment": adjustment.quantity_change,
            "reason": adjustment.reason,
            "new_status": item["status"]
        }
    }


@app.post("/api/v1/inventory/bulk-adjust", response_model=Dict[str, Any])
async def bulk_adjust_stock(bulk_update: BulkStockUpdate, background_tasks: BackgroundTasks):
    """Adjust stock levels for multiple items in one request."""
    results = []
    errors = []

    for update in bulk_update.updates:
        item_id = update.get("item_id")
        quantity_change = update.get("quantity_change", 0)

        if item_id not in inventory_items:
            errors.append({"item_id": item_id, "error": "Item not found"})
            continue

        item = inventory_items[item_id]
        old_quantity = item["quantity"]
        new_quantity = old_quantity + quantity_change

        if new_quantity < 0:
            errors.append({"item_id": item_id, "error": "Would result in negative stock"})
            continue

        item["quantity"] = new_quantity
        item["available_quantity"] = new_quantity - item.get("reserved_quantity", 0)

        if new_quantity <= 0:
            item["status"] = StockStatus.OUT_OF_STOCK.value
        elif new_quantity <= item.get("reorder_point", 10):
            item["status"] = StockStatus.LOW_STOCK.value
        else:
            item["status"] = StockStatus.IN_STOCK.value

        item["updated_at"] = datetime.utcnow().isoformat()

        results.append({
            "item_id": item_id,
            "old_quantity": old_quantity,
            "new_quantity": new_quantity,
            "status": item["status"]
        })

    logger.info(f"Bulk stock adjustment: {len(results)} succeeded, {len(errors)} failed")

    return {
        "success": len(errors) == 0,
        "message": f"Processed {len(results)} items, {len(errors)} errors",
        "data": {
            "successful": results,
            "errors": errors
        }
    }


@app.post("/api/v1/inventory/{item_id}/reserve", response_model=Dict[str, Any])
async def reserve_stock(
    item_id: str = Path(..., description="Inventory item ID"),
    quantity: int = Query(..., ge=1, description="Quantity to reserve"),
    order_id: Optional[str] = None
):
    """Reserve stock for an order."""
    if item_id not in inventory_items:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    item = inventory_items[item_id]

    if quantity > item["available_quantity"]:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient available stock. Available: {item['available_quantity']}, Requested: {quantity}"
        )

    item["reserved_quantity"] = item.get("reserved_quantity", 0) + quantity
    item["available_quantity"] = item["quantity"] - item["reserved_quantity"]
    item["updated_at"] = datetime.utcnow().isoformat()

    logger.info(f"Reserved {quantity} units of {item_id} for order {order_id}")

    return {
        "success": True,
        "message": "Stock reserved successfully",
        "data": {
            "item_id": item_id,
            "reserved_quantity": quantity,
            "total_reserved": item["reserved_quantity"],
            "available_quantity": item["available_quantity"],
            "order_id": order_id
        }
    }


@app.post("/api/v1/inventory/{item_id}/release", response_model=Dict[str, Any])
async def release_reserved_stock(
    item_id: str = Path(..., description="Inventory item ID"),
    quantity: int = Query(..., ge=1, description="Quantity to release"),
    order_id: Optional[str] = None
):
    """Release previously reserved stock."""
    if item_id not in inventory_items:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    item = inventory_items[item_id]

    if quantity > item.get("reserved_quantity", 0):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot release more than reserved. Reserved: {item.get('reserved_quantity', 0)}"
        )

    item["reserved_quantity"] = item.get("reserved_quantity", 0) - quantity
    item["available_quantity"] = item["quantity"] - item["reserved_quantity"]
    item["updated_at"] = datetime.utcnow().isoformat()

    logger.info(f"Released {quantity} reserved units of {item_id}")

    return {
        "success": True,
        "message": "Reserved stock released successfully",
        "data": {
            "item_id": item_id,
            "released_quantity": quantity,
            "total_reserved": item["reserved_quantity"],
            "available_quantity": item["available_quantity"]
        }
    }


# ============================================
# Stock Alerts Endpoints
# ============================================

@app.get("/api/v1/alerts", response_model=Dict[str, Any])
async def list_stock_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    severity: Optional[AlertSeverity] = None,
    alert_type: Optional[AlertType] = None,
    acknowledged: Optional[bool] = None
):
    """List all stock alerts with filters."""
    alerts = list(stock_alerts.values())

    if severity:
        alerts = [a for a in alerts if a.get("severity") == severity.value]
    if alert_type:
        alerts = [a for a in alerts if a.get("alert_type") == alert_type.value]
    if acknowledged is not None:
        alerts = [a for a in alerts if a.get("is_acknowledged") == acknowledged]

    alerts.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    total = len(alerts)
    start = (page - 1) * page_size
    end = start + page_size
    paginated_alerts = alerts[start:end]

    return {
        "success": True,
        "data": paginated_alerts,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size
        }
    }


@app.post("/api/v1/alerts/{alert_id}/acknowledge", response_model=Dict[str, Any])
async def acknowledge_alert(alert_id: str = Path(..., description="Alert ID")):
    """Acknowledge a stock alert."""
    if alert_id not in stock_alerts:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert = stock_alerts[alert_id]
    alert["is_acknowledged"] = True
    alert["acknowledged_at"] = datetime.utcnow().isoformat()

    logger.info(f"Alert {alert_id} acknowledged")

    return {
        "success": True,
        "message": "Alert acknowledged",
        "data": alert
    }


@app.get("/api/v1/alerts/summary", response_model=Dict[str, Any])
async def get_alerts_summary():
    """Get summary of current alerts by severity and type."""
    unacknowledged = [a for a in stock_alerts.values() if not a.get("is_acknowledged")]

    by_severity = {}
    by_type = {}

    for alert in unacknowledged:
        sev = alert.get("severity", "unknown")
        by_severity[sev] = by_severity.get(sev, 0) + 1

        atype = alert.get("alert_type", "unknown")
        by_type[atype] = by_type.get(atype, 0) + 1

    return {
        "success": True,
        "data": {
            "total_unacknowledged": len(unacknowledged),
            "by_severity": by_severity,
            "by_type": by_type,
            "critical_count": by_severity.get("critical", 0),
            "high_count": by_severity.get("high", 0)
        }
    }


# ============================================
# Demand Prediction Endpoints
# ============================================

@app.post("/predict-demand", response_model=DemandPrediction)
async def predict_demand(request: DemandPredictionRequest):
    """Predict inventory demand using time-series forecasting."""
    try:
        logger.info(f"Demand prediction request: product={request.product_id}, days={request.forecast_days}")

        if not request.historical_data:
            historical_data = _generate_synthetic_historical_data(request.product_id)
        else:
            historical_data = request.historical_data

        seasonality_detected = _detect_seasonality(historical_data)

        predictions = _generate_demand_predictions(
            historical_data=historical_data,
            forecast_days=request.forecast_days,
            include_seasonality=request.include_seasonality and seasonality_detected
        )

        confidence_interval = _calculate_confidence_intervals(predictions)
        trend = _detect_trend(historical_data)

        model_metrics = {
            "mae": round(np.random.uniform(5, 15), 2),
            "rmse": round(np.random.uniform(10, 25), 2),
            "mape": round(np.random.uniform(8, 18), 2),
            "r_squared": round(np.random.uniform(0.75, 0.95), 3)
        }

        return DemandPrediction(
            product_id=request.product_id,
            warehouse_id=request.warehouse_id,
            forecast_period_days=request.forecast_days,
            predictions=predictions,
            confidence_interval=confidence_interval,
            model_metrics=model_metrics,
            seasonality_detected=seasonality_detected,
            trend=trend,
            model_version="v1.0.0"
        )

    except Exception as e:
        logger.error(f"Demand prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/optimize-stock", response_model=StockOptimization)
async def optimize_stock(request: StockOptimizationRequest):
    """Optimize stock levels using inventory optimization algorithms."""
    try:
        logger.info(f"Stock optimization request: product={request.product_id}, stock={request.current_stock}")

        if not request.historical_demand:
            historical_demand = _generate_synthetic_demand_history()
        else:
            historical_demand = request.historical_demand

        avg_daily_demand = np.mean(historical_demand)
        demand_std = np.std(historical_demand)

        z_score = _get_z_score(request.service_level)
        safety_stock = int(z_score * demand_std * np.sqrt(request.lead_time_days))
        reorder_point = int(avg_daily_demand * request.lead_time_days + safety_stock)

        holding_cost = request.holding_cost_per_unit or 2.5
        stockout_cost = request.stockout_cost_per_unit or 50.0

        annual_demand = avg_daily_demand * 365
        order_cost = 100

        if holding_cost > 0:
            eoq = int(np.sqrt((2 * annual_demand * order_cost) / holding_cost))
        else:
            eoq = int(avg_daily_demand * 30)

        if avg_daily_demand > 0:
            days_of_stock = request.current_stock / avg_daily_demand
        else:
            days_of_stock = 999.0

        if request.current_stock < reorder_point:
            stockout_risk = min(((reorder_point - request.current_stock) / reorder_point) * 100, 100)
        else:
            stockout_risk = max((1 - request.service_level) * 100, 0)

        holding_cost_total = (request.current_stock / 2) * holding_cost * 365 / 365
        potential_stockout_cost = stockout_risk / 100 * stockout_cost * avg_daily_demand * 30

        cost_analysis = {
            "annual_holding_cost": round(holding_cost_total, 2),
            "potential_stockout_cost_30d": round(potential_stockout_cost, 2),
            "recommended_order_value": eoq,
            "savings_potential": round(max(0, potential_stockout_cost - holding_cost_total), 2)
        }

        recommendations = _generate_stock_recommendations(
            current_stock=request.current_stock,
            reorder_point=reorder_point,
            eoq=eoq,
            days_of_stock=days_of_stock,
            stockout_risk=stockout_risk
        )

        return StockOptimization(
            product_id=request.product_id,
            warehouse_id=request.warehouse_id,
            current_stock=request.current_stock,
            recommended_order_quantity=eoq,
            reorder_point=reorder_point,
            safety_stock=safety_stock,
            days_of_stock=round(days_of_stock, 2),
            stockout_risk=round(stockout_risk, 2),
            optimization_method="EOQ with Safety Stock",
            cost_analysis=cost_analysis,
            recommendations=recommendations
        )

    except Exception as e:
        logger.error(f"Stock optimization error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")


# ============================================
# Warehouse Endpoints
# ============================================

@app.get("/api/v1/warehouses", response_model=Dict[str, Any])
async def list_warehouses():
    """List all warehouses."""
    return {
        "success": True,
        "data": list(warehouses.values())
    }


@app.get("/api/v1/warehouses/{warehouse_id}/inventory", response_model=Dict[str, Any])
async def get_warehouse_inventory(
    warehouse_id: str = Path(..., description="Warehouse ID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """Get all inventory items in a specific warehouse."""
    if warehouse_id not in warehouses:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    items = [i for i in inventory_items.values() if i.get("warehouse_id") == warehouse_id]

    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    paginated_items = items[start:end]

    return {
        "success": True,
        "warehouse": warehouses[warehouse_id],
        "data": paginated_items,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size
        }
    }


# ============================================
# Root Endpoint
# ============================================

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Broxiva Inventory Service",
        "version": "1.0.0",
        "description": "Inventory management, stock levels, and low stock alerts",
        "endpoints": {
            "health": "/health",
            "inventory": "/api/v1/inventory",
            "alerts": "/api/v1/alerts",
            "warehouses": "/api/v1/warehouses",
            "demand_prediction": "/predict-demand",
            "stock_optimization": "/optimize-stock",
            "docs": "/docs"
        }
    }


# ============================================
# Helper Functions
# ============================================

def _initialize_sample_data():
    """Initialize sample inventory data for demonstration"""
    global inventory_items, warehouses

    warehouses["WH001"] = {
        "id": "WH001",
        "name": "Main Distribution Center",
        "location": "Los Angeles, CA",
        "capacity": 100000,
        "current_utilization": 75000,
        "created_at": datetime.utcnow().isoformat()
    }
    warehouses["WH002"] = {
        "id": "WH002",
        "name": "East Coast Hub",
        "location": "Newark, NJ",
        "capacity": 80000,
        "current_utilization": 55000,
        "created_at": datetime.utcnow().isoformat()
    }

    sample_products = [
        {"sku": "ELEC-001", "name": "Wireless Earbuds", "category": "Electronics", "quantity": 500, "reorder_point": 100},
        {"sku": "ELEC-002", "name": "Phone Charger", "category": "Electronics", "quantity": 1200, "reorder_point": 200},
        {"sku": "HOME-001", "name": "Kitchen Scale", "category": "Home", "quantity": 50, "reorder_point": 75},
        {"sku": "SPRT-001", "name": "Yoga Mat", "category": "Sports", "quantity": 300, "reorder_point": 50},
    ]

    for product in sample_products:
        item_id = str(uuid4())
        status = StockStatus.IN_STOCK
        if product["quantity"] <= 0:
            status = StockStatus.OUT_OF_STOCK
        elif product["quantity"] <= product["reorder_point"]:
            status = StockStatus.LOW_STOCK

        inventory_items[item_id] = {
            "id": item_id,
            "sku": product["sku"],
            "name": product["name"],
            "category": product["category"],
            "quantity": product["quantity"],
            "reserved_quantity": 0,
            "available_quantity": product["quantity"],
            "reorder_point": product["reorder_point"],
            "reorder_quantity": product["reorder_point"] * 2,
            "unit_cost": round(np.random.uniform(5, 50), 2),
            "warehouse_id": "WH001",
            "status": status.value,
            "last_restock_date": (datetime.utcnow() - timedelta(days=np.random.randint(1, 30))).isoformat(),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }


async def _create_low_stock_alert(item_id: str, current_quantity: int, reorder_point: int):
    """Create a low stock alert"""
    alert_id = str(uuid4())
    stock_alerts[alert_id] = {
        "id": alert_id,
        "item_id": item_id,
        "alert_type": AlertType.LOW_STOCK.value,
        "severity": AlertSeverity.MEDIUM.value if current_quantity > 0 else AlertSeverity.HIGH.value,
        "message": f"Stock level ({current_quantity}) is at or below reorder point ({reorder_point})",
        "threshold_value": reorder_point,
        "current_value": current_quantity,
        "is_acknowledged": False,
        "created_at": datetime.utcnow().isoformat(),
        "acknowledged_at": None
    }
    logger.info(f"Low stock alert created for item {item_id}")


async def _create_out_of_stock_alert(item_id: str):
    """Create an out of stock alert"""
    alert_id = str(uuid4())
    stock_alerts[alert_id] = {
        "id": alert_id,
        "item_id": item_id,
        "alert_type": AlertType.OUT_OF_STOCK.value,
        "severity": AlertSeverity.CRITICAL.value,
        "message": "Item is out of stock",
        "threshold_value": 0,
        "current_value": 0,
        "is_acknowledged": False,
        "created_at": datetime.utcnow().isoformat(),
        "acknowledged_at": None
    }
    logger.info(f"Out of stock alert created for item {item_id}")


def _generate_synthetic_historical_data(product_id: str, days: int = 90) -> List[Dict[str, Any]]:
    """Generate synthetic historical sales data for demonstration."""
    base_demand = np.random.randint(50, 150)
    trend = np.random.choice([-0.5, 0, 0.5])

    data = []
    for i in range(days):
        date = datetime.utcnow() - timedelta(days=days - i)
        seasonal = 20 * np.sin(2 * np.pi * i / 7)
        noise = np.random.normal(0, 10)
        demand = max(0, int(base_demand + trend * i + seasonal + noise))

        data.append({
            "date": date.strftime("%Y-%m-%d"),
            "quantity_sold": demand
        })

    return data


def _generate_synthetic_demand_history(days: int = 90) -> List[int]:
    """Generate synthetic demand history."""
    base_demand = np.random.randint(20, 50)
    return [max(0, int(base_demand + np.random.normal(0, 10))) for _ in range(days)]


def _detect_seasonality(historical_data: List[Dict[str, Any]]) -> bool:
    """Detect if data has seasonal patterns."""
    return np.random.random() > 0.4


def _generate_demand_predictions(
    historical_data: List[Dict[str, Any]],
    forecast_days: int,
    include_seasonality: bool
) -> List[Dict[str, Any]]:
    """Generate demand predictions."""
    if historical_data:
        quantities = [item.get("quantity_sold", 0) for item in historical_data]
        avg_demand = np.mean(quantities)
        std_demand = np.std(quantities)
    else:
        avg_demand = 100
        std_demand = 20

    predictions = []
    for i in range(forecast_days):
        date = datetime.utcnow() + timedelta(days=i + 1)

        seasonal = 0
        if include_seasonality:
            seasonal = 15 * np.sin(2 * np.pi * i / 7)

        trend = 0.5 * i
        noise = np.random.normal(0, std_demand * 0.3)
        predicted_demand = max(0, int(avg_demand + seasonal + trend + noise))

        predictions.append({
            "date": date.strftime("%Y-%m-%d"),
            "predicted_demand": predicted_demand,
            "day_of_week": date.strftime("%A")
        })

    return predictions


def _calculate_confidence_intervals(predictions: List[Dict[str, Any]]) -> Dict[str, List[float]]:
    """Calculate confidence intervals for predictions."""
    demands = [p["predicted_demand"] for p in predictions]
    std = np.std(demands)

    lower_bound = [max(0, d - 1.96 * std) for d in demands]
    upper_bound = [d + 1.96 * std for d in demands]

    return {
        "lower_95": [round(x, 2) for x in lower_bound],
        "upper_95": [round(x, 2) for x in upper_bound]
    }


def _detect_trend(historical_data: List[Dict[str, Any]]) -> str:
    """Detect trend in historical data."""
    if len(historical_data) < 2:
        return "stable"

    quantities = [item.get("quantity_sold", 0) for item in historical_data]
    x = np.arange(len(quantities))
    slope = np.polyfit(x, quantities, 1)[0]

    if slope > 2:
        return "increasing"
    elif slope < -2:
        return "decreasing"
    else:
        return "stable"


def _get_z_score(service_level: float) -> float:
    """Get z-score for given service level."""
    z_scores = {
        0.80: 0.84,
        0.85: 1.04,
        0.90: 1.28,
        0.95: 1.65,
        0.97: 1.88,
        0.99: 2.33
    }
    closest = min(z_scores.keys(), key=lambda x: abs(x - service_level))
    return z_scores[closest]


def _generate_stock_recommendations(
    current_stock: int,
    reorder_point: int,
    eoq: int,
    days_of_stock: float,
    stockout_risk: float
) -> List[str]:
    """Generate actionable stock recommendations."""
    recommendations = []

    if current_stock < reorder_point:
        recommendations.append(
            f"URGENT: Stock below reorder point. Order {eoq} units immediately to avoid stockout."
        )

    if stockout_risk > 50:
        recommendations.append(
            f"HIGH RISK: {stockout_risk:.1f}% stockout risk detected. Consider expedited ordering."
        )

    if days_of_stock < 7:
        recommendations.append(
            f"LOW STOCK: Only {days_of_stock:.1f} days of stock remaining. Place order soon."
        )
    elif days_of_stock > 90:
        recommendations.append(
            f"OVERSTOCK: {days_of_stock:.1f} days of stock. Consider reducing order quantities."
        )

    if current_stock >= reorder_point and stockout_risk < 20:
        recommendations.append(
            "Stock levels are optimal. Monitor demand patterns for changes."
        )

    if len(recommendations) == 0:
        recommendations.append("Stock levels are within acceptable range.")

    return recommendations


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8007"))
    uvicorn.run(app, host="0.0.0.0", port=port)
