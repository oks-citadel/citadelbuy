"""
AI Engine Service
FastAPI microservice for dropshipping AI predictions and optimizations
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import logging
import os

# Import AI modules
from src.dropshipping import (
    WinningProductPredictor,
    DynamicPriceOptimizer,
    SupplierReliabilityScorer,
    DemandForecaster,
    DropshippingFraudDetector,
    ConversionPredictor,
    PricingStrategy,
    create_dropshipping_ai_suite,
)

# Configure logging
logging.basicConfig(level=os.getenv('LOG_LEVEL', 'INFO'))
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="CitadelBuy AI Engine",
    description="AI-powered predictions and optimizations for dropshipping operations",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI services
ai_suite = create_dropshipping_ai_suite()
product_predictor = ai_suite['product_predictor']
price_optimizer = ai_suite['price_optimizer']
supplier_scorer = ai_suite['supplier_scorer']
demand_forecaster = ai_suite['demand_forecaster']
fraud_detector = ai_suite['fraud_detector']
conversion_predictor = ai_suite['conversion_predictor']


# ============================================
# Request/Response Models
# ============================================

class ProductData(BaseModel):
    id: str
    name: Optional[str] = None
    title: Optional[str] = None
    category: Optional[str] = None
    price: float
    supplier_cost: Optional[float] = None
    shipping_cost: Optional[float] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    sales_count: Optional[int] = None
    stock_quantity: Optional[int] = None
    shipping_time_max: Optional[int] = None
    images: Optional[List[str]] = None
    description: Optional[str] = None
    brand: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None


class SupplierData(BaseModel):
    id: str
    name: str
    type: Optional[str] = None
    rating: Optional[float] = None
    total_orders: Optional[int] = None
    successful_orders: Optional[int] = None
    dispute_rate: Optional[float] = None
    return_rate: Optional[float] = None
    on_time_delivery_rate: Optional[float] = None
    average_shipping_days: Optional[int] = None
    response_time_score: Optional[float] = None
    has_support_chat: Optional[bool] = None
    english_support: Optional[bool] = None


class OrderData(BaseModel):
    id: str
    total: float
    items: List[Dict[str, Any]]
    shipping_address: Dict[str, Any]
    is_gift: Optional[bool] = None
    promo_codes_used: Optional[List[str]] = None


class CustomerData(BaseModel):
    id: str
    email: str
    country: Optional[str] = None
    account_age_days: Optional[int] = None
    order_count: Optional[int] = None
    total_spent: Optional[float] = None


class PaymentData(BaseModel):
    cvv_match: Optional[bool] = None
    avs_match: Optional[bool] = None
    card_country: Optional[str] = None
    is_prepaid_card: Optional[bool] = None
    failed_attempts: Optional[int] = None
    cardholder_name: Optional[str] = None
    last_four: Optional[str] = None
    billing_address: Optional[Dict[str, Any]] = None


class PriceOptimizationRequest(BaseModel):
    product: ProductData
    strategy: Optional[str] = "dynamic"
    competitor_data: Optional[List[Dict[str, Any]]] = None
    demand_data: Optional[Dict[str, Any]] = None


class FraudAssessmentRequest(BaseModel):
    order: OrderData
    customer: CustomerData
    payment: PaymentData
    device_info: Optional[Dict[str, Any]] = None
    order_history: Optional[List[Dict[str, Any]]] = None


# ============================================
# Health Endpoints
# ============================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "ai-engine",
        "version": "1.0.0",
    }


@app.get("/ready")
async def readiness_check():
    """Readiness check endpoint."""
    return {
        "status": "ready",
        "services": {
            "product_predictor": "available",
            "price_optimizer": "available",
            "supplier_scorer": "available",
            "demand_forecaster": "available",
            "fraud_detector": "available",
            "conversion_predictor": "available",
        }
    }


# ============================================
# Product Prediction Endpoints
# ============================================

@app.post("/api/v1/ai/products/predict")
async def predict_winning_product(product: ProductData):
    """Predict winning potential for a product."""
    try:
        result = await product_predictor.predict(product.model_dump())
        return {
            "success": True,
            "data": {
                "product_id": result.product_id,
                "overall_score": result.overall_score,
                "demand_score": result.demand_score,
                "profitability_score": result.profitability_score,
                "competition_score": result.competition_score,
                "trend_score": result.trend_score,
                "supplier_score": result.supplier_score,
                "recommendation": result.recommendation,
                "confidence": result.confidence,
            }
        }
    except Exception as e:
        logger.error(f"Product prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/ai/products/batch-predict")
async def batch_predict_products(products: List[ProductData]):
    """Batch predict winning scores for multiple products."""
    try:
        product_dicts = [p.model_dump() for p in products]
        results = await product_predictor.batch_predict(product_dicts)
        return {
            "success": True,
            "count": len(results),
            "data": [
                {
                    "product_id": r.product_id,
                    "overall_score": r.overall_score,
                    "recommendation": r.recommendation,
                    "confidence": r.confidence,
                }
                for r in results
            ]
        }
    except Exception as e:
        logger.error(f"Batch prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Price Optimization Endpoints
# ============================================

@app.post("/api/v1/ai/pricing/optimize")
async def optimize_price(request: PriceOptimizationRequest):
    """Optimize price for a product."""
    try:
        strategy_map = {
            "dynamic": PricingStrategy.DYNAMIC,
            "competitive": PricingStrategy.COMPETITIVE,
            "premium": PricingStrategy.PREMIUM,
            "penetration": PricingStrategy.PENETRATION,
            "psychological": PricingStrategy.PSYCHOLOGICAL,
            "value_based": PricingStrategy.VALUE_BASED,
        }
        strategy = strategy_map.get(request.strategy, PricingStrategy.DYNAMIC)

        result = await price_optimizer.optimize_price(
            request.product.model_dump(),
            strategy,
            request.competitor_data,
            request.demand_data,
        )

        return {
            "success": True,
            "data": {
                "product_id": result.product_id,
                "recommended_price": result.recommended_price,
                "minimum_price": result.minimum_price,
                "maximum_price": result.maximum_price,
                "current_margin": result.current_margin,
                "projected_margin": result.projected_margin,
                "strategy_used": result.strategy_used,
                "competitor_price": result.competitor_price,
                "price_elasticity": result.price_elasticity,
                "confidence": result.confidence,
                "reasoning": result.reasoning,
            }
        }
    except Exception as e:
        logger.error(f"Price optimization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/ai/pricing/batch-optimize")
async def batch_optimize_prices(products: List[ProductData], strategy: str = "dynamic"):
    """Batch optimize prices for multiple products."""
    try:
        strategy_map = {
            "dynamic": PricingStrategy.DYNAMIC,
            "competitive": PricingStrategy.COMPETITIVE,
            "premium": PricingStrategy.PREMIUM,
        }
        pricing_strategy = strategy_map.get(strategy, PricingStrategy.DYNAMIC)

        product_dicts = [p.model_dump() for p in products]
        results = await price_optimizer.batch_optimize(product_dicts, pricing_strategy)

        return {
            "success": True,
            "count": len(results),
            "data": [
                {
                    "product_id": r.product_id,
                    "recommended_price": r.recommended_price,
                    "projected_margin": r.projected_margin,
                    "reasoning": r.reasoning,
                }
                for r in results
            ]
        }
    except Exception as e:
        logger.error(f"Batch price optimization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Supplier Scoring Endpoints
# ============================================

@app.post("/api/v1/ai/suppliers/score")
async def score_supplier(
    supplier: SupplierData,
    order_history: Optional[List[Dict[str, Any]]] = None,
    reviews: Optional[List[Dict[str, Any]]] = None,
):
    """Score a supplier's reliability."""
    try:
        result = await supplier_scorer.score_supplier(
            supplier.model_dump(),
            order_history,
            reviews,
        )

        return {
            "success": True,
            "data": {
                "supplier_id": result.supplier_id,
                "overall_score": result.overall_score,
                "reliability_score": result.reliability_score,
                "quality_score": result.quality_score,
                "delivery_score": result.delivery_score,
                "communication_score": result.communication_score,
                "price_score": result.price_score,
                "risk_level": result.risk_level.value,
                "recommendation": result.recommendation,
                "issues": result.issues,
                "strengths": result.strengths,
            }
        }
    except Exception as e:
        logger.error(f"Supplier scoring failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/ai/suppliers/compare")
async def compare_suppliers(
    suppliers: List[SupplierData],
    order_histories: Optional[Dict[str, List[Dict]]] = None,
):
    """Compare multiple suppliers."""
    try:
        supplier_dicts = [s.model_dump() for s in suppliers]
        results = await supplier_scorer.compare_suppliers(supplier_dicts, order_histories)

        return {
            "success": True,
            "count": len(results),
            "data": [
                {
                    "supplier_id": r.supplier_id,
                    "overall_score": r.overall_score,
                    "risk_level": r.risk_level.value,
                    "recommendation": r.recommendation,
                }
                for r in results
            ]
        }
    except Exception as e:
        logger.error(f"Supplier comparison failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Demand Forecasting Endpoints
# ============================================

@app.post("/api/v1/ai/demand/forecast")
async def forecast_demand(
    product: ProductData,
    sales_history: Optional[List[Dict[str, Any]]] = None,
    market_signals: Optional[Dict[str, Any]] = None,
):
    """Forecast demand for a product."""
    try:
        result = await demand_forecaster.forecast(
            product.model_dump(),
            sales_history,
            market_signals,
        )

        return {
            "success": True,
            "data": {
                "product_id": result.product_id,
                "current_demand": result.current_demand.value,
                "forecast_7d": result.forecast_7d,
                "forecast_30d": result.forecast_30d,
                "forecast_90d": result.forecast_90d,
                "seasonal_pattern": result.seasonal_pattern.value,
                "trend_direction": result.trend_direction,
                "trend_strength": result.trend_strength,
                "peak_season_months": result.peak_season_months,
                "recommended_stock_level": result.recommended_stock_level,
                "reorder_point": result.reorder_point,
                "confidence": result.confidence,
                "insights": result.insights,
            }
        }
    except Exception as e:
        logger.error(f"Demand forecast failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/ai/demand/category-trends")
async def get_category_trends(
    category: str,
    market_data: Optional[Dict[str, Any]] = None,
):
    """Get demand trends for a product category."""
    try:
        result = await demand_forecaster.get_category_trends(category, market_data)
        return {
            "success": True,
            "data": result,
        }
    except Exception as e:
        logger.error(f"Category trends failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Fraud Detection Endpoints
# ============================================

@app.post("/api/v1/ai/fraud/assess-order")
async def assess_order_fraud(request: FraudAssessmentRequest):
    """Assess fraud risk for an order."""
    try:
        result = await fraud_detector.assess_order(
            request.order.model_dump(),
            request.customer.model_dump(),
            request.payment.model_dump(),
            request.device_info,
            request.order_history,
        )

        return {
            "success": True,
            "data": {
                "entity_id": result.entity_id,
                "entity_type": result.entity_type,
                "risk_level": result.risk_level.value,
                "risk_score": result.risk_score,
                "fraud_types_detected": [ft.value for ft in result.fraud_types_detected],
                "risk_factors": result.risk_factors,
                "recommended_action": result.recommended_action.value,
                "confidence": result.confidence,
                "explanation": result.explanation,
                "requires_verification": result.requires_verification,
            }
        }
    except Exception as e:
        logger.error(f"Fraud assessment failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/ai/fraud/assess-supplier")
async def assess_supplier_fraud(
    supplier: SupplierData,
    order_history: Optional[List[Dict[str, Any]]] = None,
    reviews: Optional[List[Dict[str, Any]]] = None,
):
    """Assess fraud risk for a supplier."""
    try:
        result = await fraud_detector.assess_supplier(
            supplier.model_dump(),
            order_history,
            reviews,
        )

        return {
            "success": True,
            "data": {
                "entity_id": result.entity_id,
                "entity_type": result.entity_type,
                "risk_level": result.risk_level.value,
                "risk_score": result.risk_score,
                "fraud_types_detected": [ft.value for ft in result.fraud_types_detected],
                "recommended_action": result.recommended_action.value,
                "explanation": result.explanation,
            }
        }
    except Exception as e:
        logger.error(f"Supplier fraud assessment failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Conversion Prediction Endpoints
# ============================================

@app.post("/api/v1/ai/conversion/predict")
async def predict_conversion(
    product: ProductData,
    listing_data: Optional[Dict[str, Any]] = None,
    traffic_data: Optional[Dict[str, Any]] = None,
    competitor_data: Optional[List[Dict[str, Any]]] = None,
):
    """Predict conversion rate for a product."""
    try:
        result = await conversion_predictor.predict(
            product.model_dump(),
            listing_data,
            traffic_data,
            competitor_data,
        )

        return {
            "success": True,
            "data": {
                "product_id": result.product_id,
                "predicted_rate": result.predicted_rate,
                "current_rate": result.current_rate,
                "potential_rate": result.potential_rate,
                "improvement_potential": result.improvement_potential,
                "key_factors": result.key_factors,
                "optimizations": result.optimizations,
                "a_b_test_suggestions": result.a_b_test_suggestions,
                "confidence": result.confidence,
            }
        }
    except Exception as e:
        logger.error(f"Conversion prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/ai/conversion/analyze-funnel")
async def analyze_conversion_funnel(
    product: ProductData,
    funnel_data: Dict[str, Any],
):
    """Analyze conversion funnel for drop-off points."""
    try:
        result = await conversion_predictor.analyze_conversion_funnel(
            product.model_dump(),
            funnel_data,
        )
        return {
            "success": True,
            "data": result,
        }
    except Exception as e:
        logger.error(f"Funnel analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Startup/Shutdown Events
# ============================================

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("AI Engine starting up...")
    logger.info("All AI services initialized successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("AI Engine shutting down...")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
