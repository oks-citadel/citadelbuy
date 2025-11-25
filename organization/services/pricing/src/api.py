"""
Dynamic Pricing Service
AI-powered pricing optimization and demand-based pricing
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import logging

app = FastAPI(
    title="CitadelBuy Dynamic Pricing Service",
    description="AI-powered pricing optimization",
    version="1.0.0"
)

logger = logging.getLogger(__name__)


class PriceRequest(BaseModel):
    product_id: str
    base_price: float
    cost: float
    category: str
    inventory_level: int
    competitor_prices: Optional[List[float]] = None


class PriceResponse(BaseModel):
    product_id: str
    base_price: float
    optimized_price: float
    confidence: float
    factors: List[Dict]
    valid_until: datetime


class BulkPriceRequest(BaseModel):
    products: List[PriceRequest]
    strategy: str = "profit_maximize"  # profit_maximize, volume_maximize, competitive


class PromotionRequest(BaseModel):
    product_ids: List[str]
    target_metric: str  # revenue, units, margin
    budget: Optional[float] = None
    duration_days: int = 7


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "pricing"}


@app.post("/optimize", response_model=PriceResponse)
async def optimize_price(request: PriceRequest):
    """
    Get AI-optimized price for a single product.
    """
    try:
        from optimization.price_optimizer import PriceOptimizer
        from models.demand_model import DemandModel
        from models.elasticity_model import ElasticityModel

        # Get demand forecast
        demand_model = DemandModel()
        demand_forecast = demand_model.forecast(
            product_id=request.product_id,
            current_price=request.base_price
        )

        # Calculate price elasticity
        elasticity_model = ElasticityModel()
        elasticity = elasticity_model.calculate(
            product_id=request.product_id,
            category=request.category
        )

        # Optimize price
        optimizer = PriceOptimizer()
        result = optimizer.optimize(
            base_price=request.base_price,
            cost=request.cost,
            demand_forecast=demand_forecast,
            elasticity=elasticity,
            inventory_level=request.inventory_level,
            competitor_prices=request.competitor_prices
        )

        return PriceResponse(
            product_id=request.product_id,
            base_price=request.base_price,
            optimized_price=result['price'],
            confidence=result['confidence'],
            factors=result['factors'],
            valid_until=result['valid_until']
        )
    except Exception as e:
        logger.error(f"Price optimization error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/optimize/bulk")
async def optimize_bulk_prices(request: BulkPriceRequest):
    """
    Optimize prices for multiple products.
    """
    try:
        from optimization.bulk_optimizer import BulkPriceOptimizer

        optimizer = BulkPriceOptimizer()
        results = optimizer.optimize(
            products=request.products,
            strategy=request.strategy
        )

        return {
            "optimized_count": len(results),
            "strategy": request.strategy,
            "results": results
        }
    except Exception as e:
        logger.error(f"Bulk optimization error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/promotion/recommend")
async def recommend_promotion(request: PromotionRequest):
    """
    Get AI-recommended promotion strategy.
    """
    try:
        from optimization.promotion_optimizer import PromotionOptimizer

        optimizer = PromotionOptimizer()
        recommendations = optimizer.recommend(
            product_ids=request.product_ids,
            target_metric=request.target_metric,
            budget=request.budget,
            duration_days=request.duration_days
        )

        return {
            "recommendations": recommendations['promotions'],
            "expected_impact": recommendations['impact'],
            "roi_estimate": recommendations['roi']
        }
    except Exception as e:
        logger.error(f"Promotion recommendation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/elasticity/{product_id}")
async def get_price_elasticity(product_id: str):
    """
    Get price elasticity for a product.
    """
    try:
        from models.elasticity_model import ElasticityModel

        model = ElasticityModel()
        elasticity = model.get_elasticity(product_id)

        return {
            "product_id": product_id,
            "elasticity": elasticity['value'],
            "interpretation": elasticity['interpretation'],
            "confidence": elasticity['confidence']
        }
    except Exception as e:
        logger.error(f"Elasticity calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/competitor/analyze")
async def analyze_competitor_prices(product_id: str, competitor_prices: List[Dict]):
    """
    Analyze competitor pricing and recommend strategy.
    """
    try:
        from analysis.competitor_analyzer import CompetitorAnalyzer

        analyzer = CompetitorAnalyzer()
        analysis = analyzer.analyze(
            product_id=product_id,
            competitor_prices=competitor_prices
        )

        return {
            "product_id": product_id,
            "market_position": analysis['position'],
            "price_index": analysis['price_index'],
            "recommendation": analysis['recommendation'],
            "opportunity_score": analysis['opportunity']
        }
    except Exception as e:
        logger.error(f"Competitor analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/demand/forecast/{product_id}")
async def forecast_demand(product_id: str, days: int = 30):
    """
    Get demand forecast for a product.
    """
    try:
        from models.demand_model import DemandModel

        model = DemandModel()
        forecast = model.forecast(product_id=product_id, days=days)

        return {
            "product_id": product_id,
            "forecast": forecast['predictions'],
            "confidence_intervals": forecast['confidence'],
            "seasonality": forecast['seasonality'],
            "trend": forecast['trend']
        }
    except Exception as e:
        logger.error(f"Demand forecast error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/rules/create")
async def create_pricing_rule(rule: Dict):
    """
    Create a pricing rule.
    """
    try:
        from rules.rule_manager import PricingRuleManager

        manager = PricingRuleManager()
        created_rule = manager.create(rule)

        return {"status": "created", "rule_id": created_rule['id']}
    except Exception as e:
        logger.error(f"Rule creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ab-test/{test_id}")
async def get_ab_test_results(test_id: str):
    """
    Get A/B test results for pricing experiment.
    """
    try:
        from experiments.ab_testing import ABTestManager

        manager = ABTestManager()
        results = manager.get_results(test_id)

        return {
            "test_id": test_id,
            "status": results['status'],
            "variants": results['variants'],
            "winner": results.get('winner'),
            "confidence": results.get('confidence'),
            "metrics": results['metrics']
        }
    except Exception as e:
        logger.error(f"A/B test results error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)
