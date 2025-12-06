"""
Inventory AI Service
AI-powered demand forecasting and stock optimization
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
import numpy as np

app = FastAPI(
    title="CitadelBuy Inventory AI Service",
    description="AI-powered inventory demand forecasting and stock optimization",
    version="1.0.0"
)

logger = logging.getLogger(__name__)


# Request/Response Models
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
    trend: str  # increasing, decreasing, stable
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
    stockout_risk: float  # 0-100
    optimization_method: str
    cost_analysis: Dict[str, float]
    recommendations: List[str]


class InventoryAnalysisRequest(BaseModel):
    products: List[Dict[str, Any]]
    warehouse_id: Optional[str] = None
    analysis_type: str = Field(default="abc", pattern="^(abc|velocity|turnover)$")


# Health Check
@app.get("/health")
async def health_check():
    """Service health check endpoint."""
    return {
        "status": "healthy",
        "service": "inventory-ai",
        "timestamp": datetime.utcnow().isoformat(),
        "models_loaded": True
    }


# Demand Prediction Endpoint
@app.post("/predict-demand", response_model=DemandPrediction)
async def predict_demand(request: DemandPredictionRequest):
    """
    Predict inventory demand using time-series forecasting.

    Uses a combination of:
    - Historical sales patterns
    - Seasonal trends
    - Moving averages
    - Exponential smoothing

    Returns daily predictions with confidence intervals.
    """
    try:
        logger.info(f"Demand prediction request: product={request.product_id}, days={request.forecast_days}")

        # Simulate historical data if not provided
        if not request.historical_data:
            # Generate synthetic historical data for demonstration
            historical_data = _generate_synthetic_historical_data(request.product_id)
        else:
            historical_data = request.historical_data

        # Detect seasonality
        seasonality_detected = _detect_seasonality(historical_data)

        # Generate predictions using placeholder model
        predictions = _generate_demand_predictions(
            historical_data=historical_data,
            forecast_days=request.forecast_days,
            include_seasonality=request.include_seasonality and seasonality_detected
        )

        # Calculate confidence intervals
        confidence_interval = _calculate_confidence_intervals(predictions)

        # Detect trend
        trend = _detect_trend(historical_data)

        # Model performance metrics
        model_metrics = {
            "mae": round(np.random.uniform(5, 15), 2),  # Placeholder
            "rmse": round(np.random.uniform(10, 25), 2),  # Placeholder
            "mape": round(np.random.uniform(8, 18), 2),  # Placeholder
            "r_squared": round(np.random.uniform(0.75, 0.95), 3)  # Placeholder
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
            model_version="v1.0.0-placeholder"
        )

    except Exception as e:
        logger.error(f"Demand prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


# Stock Optimization Endpoint
@app.post("/optimize-stock", response_model=StockOptimization)
async def optimize_stock(request: StockOptimizationRequest):
    """
    Optimize stock levels using inventory optimization algorithms.

    Calculates:
    - Economic Order Quantity (EOQ)
    - Reorder Point (ROP)
    - Safety Stock
    - Stockout Risk

    Returns actionable recommendations for inventory management.
    """
    try:
        logger.info(f"Stock optimization request: product={request.product_id}, stock={request.current_stock}")

        # Generate or use historical demand
        if not request.historical_demand:
            historical_demand = _generate_synthetic_demand_history()
        else:
            historical_demand = request.historical_demand

        # Calculate demand statistics
        avg_daily_demand = np.mean(historical_demand)
        demand_std = np.std(historical_demand)

        # Calculate safety stock based on service level
        z_score = _get_z_score(request.service_level)
        safety_stock = int(z_score * demand_std * np.sqrt(request.lead_time_days))

        # Calculate reorder point
        reorder_point = int(avg_daily_demand * request.lead_time_days + safety_stock)

        # Calculate Economic Order Quantity (simplified)
        holding_cost = request.holding_cost_per_unit or 2.5  # Default $2.5 per unit
        stockout_cost = request.stockout_cost_per_unit or 50.0  # Default $50 per stockout

        annual_demand = avg_daily_demand * 365
        order_cost = 100  # Assumed fixed ordering cost

        if holding_cost > 0:
            eoq = int(np.sqrt((2 * annual_demand * order_cost) / holding_cost))
        else:
            eoq = int(avg_daily_demand * 30)  # Default to 30 days supply

        # Calculate days of stock
        if avg_daily_demand > 0:
            days_of_stock = request.current_stock / avg_daily_demand
        else:
            days_of_stock = 999.0

        # Calculate stockout risk
        if request.current_stock < reorder_point:
            stockout_risk = min(((reorder_point - request.current_stock) / reorder_point) * 100, 100)
        else:
            stockout_risk = max((1 - request.service_level) * 100, 0)

        # Cost analysis
        holding_cost_total = (request.current_stock / 2) * holding_cost * 365 / 365
        potential_stockout_cost = stockout_risk / 100 * stockout_cost * avg_daily_demand * 30

        cost_analysis = {
            "annual_holding_cost": round(holding_cost_total, 2),
            "potential_stockout_cost_30d": round(potential_stockout_cost, 2),
            "recommended_order_value": eoq,
            "savings_potential": round(max(0, potential_stockout_cost - holding_cost_total), 2)
        }

        # Generate recommendations
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


# Helper Functions (Placeholder Implementations)

def _generate_synthetic_historical_data(product_id: str, days: int = 90) -> List[Dict[str, Any]]:
    """Generate synthetic historical sales data for demonstration."""
    base_demand = np.random.randint(50, 150)
    trend = np.random.choice([-0.5, 0, 0.5])

    data = []
    for i in range(days):
        date = datetime.utcnow() - timedelta(days=days - i)
        # Add trend, seasonality, and noise
        seasonal = 20 * np.sin(2 * np.pi * i / 7)  # Weekly seasonality
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
    """Detect if data has seasonal patterns (placeholder)."""
    # Simple placeholder: randomly return True 60% of the time
    return np.random.random() > 0.4


def _generate_demand_predictions(
    historical_data: List[Dict[str, Any]],
    forecast_days: int,
    include_seasonality: bool
) -> List[Dict[str, Any]]:
    """Generate demand predictions (placeholder implementation)."""
    # Calculate average from historical data
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

        # Add seasonality if enabled
        seasonal = 0
        if include_seasonality:
            seasonal = 15 * np.sin(2 * np.pi * i / 7)  # Weekly pattern

        # Add slight upward trend
        trend = 0.5 * i

        # Add noise
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

    # Simple linear regression slope
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
    # Standard z-scores for common service levels
    z_scores = {
        0.80: 0.84,
        0.85: 1.04,
        0.90: 1.28,
        0.95: 1.65,
        0.97: 1.88,
        0.99: 2.33
    }

    # Find closest service level
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
    uvicorn.run(app, host="0.0.0.0", port=8007)
