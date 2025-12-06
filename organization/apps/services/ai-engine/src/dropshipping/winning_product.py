"""
Winning Product Predictor
AI system to identify high-potential dropshipping products
"""

import numpy as np
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


@dataclass
class ProductScore:
    """Product scoring result"""
    product_id: str
    overall_score: float
    demand_score: float
    profitability_score: float
    competition_score: float
    trend_score: float
    supplier_score: float
    recommendation: str
    confidence: float


class WinningProductPredictor:
    """
    AI-powered winning product predictor for dropshipping.

    Uses multiple signals to predict product success:
    - Demand signals (search volume, social mentions, trends)
    - Profitability metrics (margin, price point, shipping cost)
    - Competition analysis (saturation, competing sellers)
    - Supplier reliability (ratings, delivery times, stock levels)
    - Trend analysis (seasonal, viral potential, category growth)
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.weights = {
            'demand': 0.25,
            'profitability': 0.25,
            'competition': 0.15,
            'trend': 0.20,
            'supplier': 0.15,
        }

    async def predict(
        self,
        product_data: Dict[str, Any],
        market_data: Optional[Dict[str, Any]] = None,
    ) -> ProductScore:
        """
        Predict winning potential for a product.

        Args:
            product_data: Product information from supplier
            market_data: Optional market research data

        Returns:
            ProductScore with detailed analysis
        """
        # Calculate individual scores
        demand_score = self._calculate_demand_score(product_data, market_data)
        profitability_score = self._calculate_profitability_score(product_data)
        competition_score = self._calculate_competition_score(product_data, market_data)
        trend_score = self._calculate_trend_score(product_data, market_data)
        supplier_score = self._calculate_supplier_score(product_data)

        # Calculate weighted overall score
        overall_score = (
            demand_score * self.weights['demand'] +
            profitability_score * self.weights['profitability'] +
            competition_score * self.weights['competition'] +
            trend_score * self.weights['trend'] +
            supplier_score * self.weights['supplier']
        ) * 100

        # Generate recommendation
        recommendation = self._generate_recommendation(
            overall_score, demand_score, profitability_score, competition_score
        )

        # Calculate confidence based on data quality
        confidence = self._calculate_confidence(product_data, market_data)

        return ProductScore(
            product_id=product_data.get('id', ''),
            overall_score=round(overall_score, 2),
            demand_score=round(demand_score * 100, 2),
            profitability_score=round(profitability_score * 100, 2),
            competition_score=round(competition_score * 100, 2),
            trend_score=round(trend_score * 100, 2),
            supplier_score=round(supplier_score * 100, 2),
            recommendation=recommendation,
            confidence=round(confidence, 2),
        )

    async def batch_predict(
        self,
        products: List[Dict[str, Any]],
        market_data: Optional[Dict[str, Any]] = None,
    ) -> List[ProductScore]:
        """Predict winning scores for multiple products."""
        scores = []
        for product in products:
            try:
                score = await self.predict(product, market_data)
                scores.append(score)
            except Exception as e:
                logger.error(f"Failed to score product {product.get('id')}: {e}")

        # Sort by overall score
        scores.sort(key=lambda x: x.overall_score, reverse=True)
        return scores

    def _calculate_demand_score(
        self,
        product: Dict[str, Any],
        market_data: Optional[Dict[str, Any]]
    ) -> float:
        """Calculate demand score based on multiple signals."""
        score = 0.5  # Base score

        # Sales velocity
        sales_count = product.get('sales_count', 0)
        if sales_count > 10000:
            score += 0.3
        elif sales_count > 1000:
            score += 0.2
        elif sales_count > 100:
            score += 0.1

        # Review count (social proof)
        review_count = product.get('review_count', 0)
        if review_count > 1000:
            score += 0.1
        elif review_count > 100:
            score += 0.05

        # Search volume from market data
        if market_data:
            search_volume = market_data.get('search_volume', 0)
            if search_volume > 100000:
                score += 0.1
            elif search_volume > 10000:
                score += 0.05

        return min(score, 1.0)

    def _calculate_profitability_score(self, product: Dict[str, Any]) -> float:
        """Calculate profitability potential."""
        score = 0.5

        cost = product.get('price', 0)
        shipping = product.get('shipping_cost', 0)
        total_cost = cost + shipping

        # Ideal price range for dropshipping ($15-$100)
        if 15 <= total_cost <= 100:
            score += 0.2
        elif 10 <= total_cost <= 150:
            score += 0.1

        # Margin potential (assuming 2-3x markup)
        suggested_retail = total_cost * 2.5
        if suggested_retail <= 50:
            score += 0.15  # Impulse buy range
        elif suggested_retail <= 100:
            score += 0.1

        # Weight consideration (affects shipping)
        weight = product.get('weight', 0)
        if weight and weight < 500:  # grams
            score += 0.1
        elif weight and weight < 1000:
            score += 0.05

        return min(score, 1.0)

    def _calculate_competition_score(
        self,
        product: Dict[str, Any],
        market_data: Optional[Dict[str, Any]]
    ) -> float:
        """Calculate competition level (lower competition = higher score)."""
        score = 0.5

        # Unique/niche products score higher
        category = product.get('category', '').lower()
        niche_categories = ['hobby', 'pet', 'garden', 'craft', 'outdoor']
        saturated_categories = ['phone case', 'jewelry', 'clothing']

        if any(niche in category for niche in niche_categories):
            score += 0.2
        elif any(sat in category for sat in saturated_categories):
            score -= 0.2

        # Competitor count from market data
        if market_data:
            competitor_count = market_data.get('competitor_count', 50)
            if competitor_count < 10:
                score += 0.3
            elif competitor_count < 50:
                score += 0.15
            elif competitor_count > 200:
                score -= 0.2

        return max(min(score, 1.0), 0.0)

    def _calculate_trend_score(
        self,
        product: Dict[str, Any],
        market_data: Optional[Dict[str, Any]]
    ) -> float:
        """Calculate trend/timing score."""
        score = 0.5

        # Trend direction
        if market_data:
            trend = market_data.get('trend_direction', 'stable')
            if trend == 'up':
                score += 0.3
            elif trend == 'down':
                score -= 0.2

            # Viral potential
            viral_score = market_data.get('viral_potential', 0)
            score += viral_score * 0.2

        # Seasonal consideration
        current_month = datetime.now().month
        category = product.get('category', '').lower()

        seasonal_boost = self._get_seasonal_boost(category, current_month)
        score += seasonal_boost

        return max(min(score, 1.0), 0.0)

    def _calculate_supplier_score(self, product: Dict[str, Any]) -> float:
        """Calculate supplier reliability score."""
        score = 0.5

        # Rating
        rating = product.get('rating', 0)
        if rating >= 4.5:
            score += 0.25
        elif rating >= 4.0:
            score += 0.15
        elif rating >= 3.5:
            score += 0.05
        elif rating < 3.0:
            score -= 0.2

        # Shipping time
        shipping_days = product.get('shipping_time_max', 30)
        if shipping_days <= 7:
            score += 0.15
        elif shipping_days <= 14:
            score += 0.1
        elif shipping_days > 30:
            score -= 0.15

        # Stock availability
        stock = product.get('stock_quantity', 0)
        if stock > 1000:
            score += 0.1
        elif stock > 100:
            score += 0.05
        elif stock < 10:
            score -= 0.1

        return max(min(score, 1.0), 0.0)

    def _get_seasonal_boost(self, category: str, month: int) -> float:
        """Get seasonal boost for category/month combination."""
        seasonal_map = {
            # Q4 products
            ('christmas', 'gift', 'holiday'): {10: 0.1, 11: 0.2, 12: 0.3},
            # Summer products
            ('outdoor', 'beach', 'pool', 'garden'): {5: 0.1, 6: 0.2, 7: 0.2, 8: 0.1},
            # Back to school
            ('school', 'office', 'stationery'): {7: 0.1, 8: 0.2, 9: 0.1},
            # Valentine's
            ('romantic', 'couple', 'love'): {1: 0.1, 2: 0.3},
        }

        for keywords, months in seasonal_map.items():
            if any(kw in category for kw in keywords):
                return months.get(month, 0)

        return 0

    def _generate_recommendation(
        self,
        overall: float,
        demand: float,
        profit: float,
        competition: float
    ) -> str:
        """Generate actionable recommendation."""
        if overall >= 80:
            return "HIGHLY RECOMMENDED - Strong winning potential"
        elif overall >= 65:
            if demand > 0.7:
                return "RECOMMENDED - High demand, consider quick launch"
            elif profit > 0.7:
                return "RECOMMENDED - Good margins, optimize pricing"
            else:
                return "RECOMMENDED - Solid overall potential"
        elif overall >= 50:
            if competition > 0.7:
                return "CONSIDER - Low competition niche"
            else:
                return "CONSIDER - Test with small order first"
        elif overall >= 35:
            return "CAUTION - Limited potential, research further"
        else:
            return "NOT RECOMMENDED - High risk, low reward"

    def _calculate_confidence(
        self,
        product: Dict[str, Any],
        market_data: Optional[Dict[str, Any]]
    ) -> float:
        """Calculate confidence level based on data quality."""
        confidence = 0.5

        # More data = higher confidence
        data_points = [
            'sales_count', 'review_count', 'rating',
            'shipping_time_min', 'shipping_time_max', 'stock_quantity'
        ]

        for point in data_points:
            if product.get(point) is not None:
                confidence += 0.05

        if market_data:
            confidence += 0.2

        return min(confidence, 1.0)


class ProductScorer:
    """Batch product scoring with caching."""

    def __init__(self):
        self.predictor = WinningProductPredictor()
        self._cache: Dict[str, ProductScore] = {}
        self._cache_ttl = timedelta(hours=24)

    async def score_products(
        self,
        products: List[Dict[str, Any]],
        force_refresh: bool = False
    ) -> List[ProductScore]:
        """Score products with caching."""
        results = []

        for product in products:
            product_id = product.get('id', '')
            cache_key = f"{product_id}_{hash(str(product))}"

            if not force_refresh and cache_key in self._cache:
                results.append(self._cache[cache_key])
            else:
                score = await self.predictor.predict(product)
                self._cache[cache_key] = score
                results.append(score)

        return sorted(results, key=lambda x: x.overall_score, reverse=True)

    async def get_top_winners(
        self,
        products: List[Dict[str, Any]],
        top_n: int = 20
    ) -> List[ProductScore]:
        """Get top N winning products."""
        all_scores = await self.score_products(products)
        return all_scores[:top_n]
