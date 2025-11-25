"""
Recommendation Service API
AI-powered product recommendation engine
"""

from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import logging

app = FastAPI(
    title="CitadelBuy Recommendation Service",
    description="AI-powered product recommendation engine",
    version="1.0.0"
)

logger = logging.getLogger(__name__)


class RecommendationRequest(BaseModel):
    user_id: str
    product_id: Optional[str] = None
    category: Optional[str] = None
    limit: int = 10
    strategy: str = "hybrid"  # collaborative, content, hybrid


class ProductRecommendation(BaseModel):
    product_id: str
    score: float
    reason: str
    category: str


class RecommendationResponse(BaseModel):
    user_id: str
    recommendations: List[ProductRecommendation]
    strategy_used: str
    model_version: str


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "recommendation"}


@app.post("/recommend", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """
    Get personalized product recommendations for a user.

    Strategies:
    - collaborative: Based on similar user behavior
    - content: Based on product attributes
    - hybrid: Combination of both approaches
    """
    try:
        # Import recommendation engines
        from algorithms.collaborative import CollaborativeFilter
        from algorithms.content_based import ContentBasedFilter
        from algorithms.hybrid import HybridRecommender

        if request.strategy == "collaborative":
            recommender = CollaborativeFilter()
        elif request.strategy == "content":
            recommender = ContentBasedFilter()
        else:
            recommender = HybridRecommender()

        recommendations = recommender.recommend(
            user_id=request.user_id,
            product_id=request.product_id,
            category=request.category,
            limit=request.limit
        )

        return RecommendationResponse(
            user_id=request.user_id,
            recommendations=recommendations,
            strategy_used=request.strategy,
            model_version="v2.0.0"
        )
    except Exception as e:
        logger.error(f"Recommendation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/similar-products")
async def get_similar_products(product_id: str, limit: int = 10):
    """Get products similar to a given product."""
    from algorithms.content_based import ContentBasedFilter

    filter = ContentBasedFilter()
    similar = filter.find_similar(product_id, limit)
    return {"product_id": product_id, "similar_products": similar}


@app.post("/trending")
async def get_trending_products(category: Optional[str] = None, limit: int = 20):
    """Get trending products based on real-time analytics."""
    from algorithms.trending import TrendingAnalyzer

    analyzer = TrendingAnalyzer()
    trending = analyzer.get_trending(category=category, limit=limit)
    return {"trending": trending, "category": category}


@app.post("/personalized-feed")
async def get_personalized_feed(user_id: str, page: int = 1, page_size: int = 20):
    """Get personalized product feed for homepage."""
    from algorithms.hybrid import HybridRecommender

    recommender = HybridRecommender()
    feed = recommender.get_personalized_feed(
        user_id=user_id,
        page=page,
        page_size=page_size
    )
    return {"user_id": user_id, "feed": feed, "page": page}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
