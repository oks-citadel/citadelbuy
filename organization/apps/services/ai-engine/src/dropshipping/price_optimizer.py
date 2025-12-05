"""
Dynamic Price Optimizer
AI-powered pricing engine for dropshipping products
"""

import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class PricingStrategy(Enum):
    """Available pricing strategies"""
    COMPETITIVE = "competitive"         # Match or beat competitors
    PREMIUM = "premium"                  # Higher price, perceived value
    PENETRATION = "penetration"          # Low price for market entry
    SKIMMING = "skimming"                # High initial, reduce over time
    PSYCHOLOGICAL = "psychological"      # End in .99, .97, etc.
    DYNAMIC = "dynamic"                  # AI-driven real-time pricing
    VALUE_BASED = "value_based"          # Price based on perceived value


@dataclass
class PriceRecommendation:
    """Price recommendation result"""
    product_id: str
    recommended_price: float
    minimum_price: float
    maximum_price: float
    current_margin: float
    projected_margin: float
    strategy_used: str
    competitor_price: Optional[float]
    price_elasticity: float
    confidence: float
    reasoning: str


class DynamicPriceOptimizer:
    """
    AI-powered dynamic pricing optimizer for dropshipping.

    Features:
    - Real-time price optimization
    - Competitor price monitoring
    - Demand-based pricing
    - Margin protection
    - A/B price testing support
    - Seasonal adjustments
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.min_margin = config.get('min_margin', 0.15)  # 15% minimum margin
        self.max_margin = config.get('max_margin', 0.60)  # 60% maximum margin
        self.target_margin = config.get('target_margin', 0.35)  # 35% target

    async def optimize_price(
        self,
        product: Dict[str, Any],
        strategy: PricingStrategy = PricingStrategy.DYNAMIC,
        competitor_data: Optional[List[Dict[str, Any]]] = None,
        demand_data: Optional[Dict[str, Any]] = None,
    ) -> PriceRecommendation:
        """
        Calculate optimal price for a product.

        Args:
            product: Product data including cost, current price
            strategy: Pricing strategy to use
            competitor_data: Competitor pricing information
            demand_data: Demand signals and elasticity data

        Returns:
            PriceRecommendation with optimal pricing
        """
        # Get base costs
        supplier_cost = product.get('supplier_cost', product.get('price', 0))
        shipping_cost = product.get('shipping_cost', 0)
        total_cost = supplier_cost + shipping_cost

        # Platform fees (approximate)
        platform_fee_rate = 0.05  # 5% platform fee
        payment_fee_rate = 0.029  # 2.9% + $0.30 Stripe

        # Calculate minimum viable price
        min_price = self._calculate_min_price(total_cost, platform_fee_rate, payment_fee_rate)

        # Calculate price based on strategy
        if strategy == PricingStrategy.DYNAMIC:
            price, reasoning = await self._dynamic_pricing(
                product, total_cost, competitor_data, demand_data
            )
        elif strategy == PricingStrategy.COMPETITIVE:
            price, reasoning = self._competitive_pricing(
                total_cost, competitor_data
            )
        elif strategy == PricingStrategy.PREMIUM:
            price, reasoning = self._premium_pricing(total_cost, product)
        elif strategy == PricingStrategy.PENETRATION:
            price, reasoning = self._penetration_pricing(total_cost)
        elif strategy == PricingStrategy.PSYCHOLOGICAL:
            price, reasoning = self._psychological_pricing(total_cost)
        elif strategy == PricingStrategy.VALUE_BASED:
            price, reasoning = self._value_based_pricing(product, total_cost)
        else:
            price = total_cost / (1 - self.target_margin)
            reasoning = "Default margin-based pricing"

        # Apply psychological pricing
        price = self._apply_psychological_pricing(price)

        # Ensure minimum margin
        price = max(price, min_price)

        # Calculate margins
        current_price = product.get('retail_price', price)
        current_margin = self._calculate_margin(current_price, total_cost, platform_fee_rate, payment_fee_rate)
        projected_margin = self._calculate_margin(price, total_cost, platform_fee_rate, payment_fee_rate)

        # Get competitor reference
        competitor_price = None
        if competitor_data:
            prices = [c.get('price', 0) for c in competitor_data if c.get('price')]
            if prices:
                competitor_price = sum(prices) / len(prices)

        # Calculate price elasticity
        elasticity = self._estimate_elasticity(product, demand_data)

        # Calculate confidence
        confidence = self._calculate_confidence(
            competitor_data, demand_data, product
        )

        return PriceRecommendation(
            product_id=product.get('id', ''),
            recommended_price=round(price, 2),
            minimum_price=round(min_price, 2),
            maximum_price=round(total_cost / (1 - self.max_margin), 2),
            current_margin=round(current_margin * 100, 2),
            projected_margin=round(projected_margin * 100, 2),
            strategy_used=strategy.value,
            competitor_price=round(competitor_price, 2) if competitor_price else None,
            price_elasticity=round(elasticity, 2),
            confidence=round(confidence, 2),
            reasoning=reasoning,
        )

    async def batch_optimize(
        self,
        products: List[Dict[str, Any]],
        strategy: PricingStrategy = PricingStrategy.DYNAMIC,
    ) -> List[PriceRecommendation]:
        """Optimize prices for multiple products."""
        recommendations = []

        for product in products:
            try:
                rec = await self.optimize_price(product, strategy)
                recommendations.append(rec)
            except Exception as e:
                logger.error(f"Failed to optimize price for {product.get('id')}: {e}")

        return recommendations

    def _calculate_min_price(
        self,
        total_cost: float,
        platform_fee: float,
        payment_fee: float
    ) -> float:
        """Calculate minimum viable price with minimum margin."""
        # price = cost / (1 - margin - platform_fee - payment_fee)
        return total_cost / (1 - self.min_margin - platform_fee - payment_fee)

    def _calculate_margin(
        self,
        price: float,
        cost: float,
        platform_fee: float,
        payment_fee: float
    ) -> float:
        """Calculate actual margin after fees."""
        if price <= 0:
            return 0
        revenue = price * (1 - platform_fee) - 0.30  # Minus fixed payment fee
        revenue = revenue * (1 - payment_fee)
        profit = revenue - cost
        return profit / price

    async def _dynamic_pricing(
        self,
        product: Dict[str, Any],
        cost: float,
        competitor_data: Optional[List[Dict[str, Any]]],
        demand_data: Optional[Dict[str, Any]]
    ) -> Tuple[float, str]:
        """AI-driven dynamic pricing."""
        base_price = cost / (1 - self.target_margin)
        adjustments = []

        # Demand adjustment
        if demand_data:
            demand_level = demand_data.get('demand_level', 'medium')
            if demand_level == 'high':
                base_price *= 1.1
                adjustments.append("+10% high demand")
            elif demand_level == 'low':
                base_price *= 0.95
                adjustments.append("-5% low demand")

            # Trend adjustment
            trend = demand_data.get('trend', 'stable')
            if trend == 'rising':
                base_price *= 1.05
                adjustments.append("+5% rising trend")

        # Competitor adjustment
        if competitor_data:
            avg_competitor = sum(c.get('price', 0) for c in competitor_data) / len(competitor_data)
            if avg_competitor > 0:
                if base_price > avg_competitor * 1.2:
                    # Too expensive, reduce
                    base_price = avg_competitor * 1.1
                    adjustments.append("Adjusted to competitor +10%")
                elif base_price < avg_competitor * 0.8:
                    # Room to increase
                    base_price = avg_competitor * 0.95
                    adjustments.append("Raised to competitor -5%")

        # Inventory adjustment
        stock = product.get('stock_quantity', 100)
        if stock < 10:
            base_price *= 1.15  # Scarcity premium
            adjustments.append("+15% low stock")

        # Time-based adjustment
        hour = datetime.now().hour
        if 20 <= hour or hour <= 6:
            # Evening/night shopping - slight discount
            base_price *= 0.98
            adjustments.append("-2% off-peak hours")

        reasoning = "Dynamic AI pricing: " + ", ".join(adjustments) if adjustments else "Standard margin"
        return base_price, reasoning

    def _competitive_pricing(
        self,
        cost: float,
        competitor_data: Optional[List[Dict[str, Any]]]
    ) -> Tuple[float, str]:
        """Price competitively against market."""
        if not competitor_data:
            return cost / (1 - self.target_margin), "No competitor data, using target margin"

        competitor_prices = [c.get('price', 0) for c in competitor_data if c.get('price', 0) > 0]
        if not competitor_prices:
            return cost / (1 - self.target_margin), "No valid competitor prices"

        avg_price = sum(competitor_prices) / len(competitor_prices)
        min_competitor = min(competitor_prices)

        # Price slightly below average
        price = avg_price * 0.95

        # But ensure minimum margin
        min_price = cost / (1 - self.min_margin)
        if price < min_price:
            price = min_price
            reasoning = f"Competitive but margin-protected at ${price:.2f}"
        else:
            reasoning = f"5% below avg competitor (${avg_price:.2f})"

        return price, reasoning

    def _premium_pricing(
        self,
        cost: float,
        product: Dict[str, Any]
    ) -> Tuple[float, str]:
        """Premium pricing for perceived value."""
        # Higher markup for premium positioning
        premium_margin = min(self.target_margin + 0.15, self.max_margin)
        price = cost / (1 - premium_margin)

        # Additional premium for quality signals
        rating = product.get('rating', 0)
        if rating >= 4.5:
            price *= 1.1
            reasoning = "Premium + high rating bonus"
        else:
            reasoning = "Premium positioning"

        return price, reasoning

    def _penetration_pricing(self, cost: float) -> Tuple[float, str]:
        """Low price for market entry."""
        # Just above minimum margin
        margin = self.min_margin + 0.05
        price = cost / (1 - margin)
        return price, "Penetration pricing for market entry"

    def _psychological_pricing(self, cost: float) -> Tuple[float, str]:
        """Psychological pricing focus."""
        base_price = cost / (1 - self.target_margin)
        price = self._apply_psychological_pricing(base_price)
        return price, f"Psychological pricing (charm pricing)"

    def _value_based_pricing(
        self,
        product: Dict[str, Any],
        cost: float
    ) -> Tuple[float, str]:
        """Price based on perceived value."""
        base_price = cost / (1 - self.target_margin)

        # Value adjustments
        multiplier = 1.0

        # Quality signals
        rating = product.get('rating', 0)
        if rating >= 4.5:
            multiplier += 0.15
        elif rating >= 4.0:
            multiplier += 0.08

        # Brand presence
        brand = product.get('brand')
        if brand:
            multiplier += 0.1

        # Feature count
        features = product.get('attributes', {})
        if len(features) > 5:
            multiplier += 0.05

        price = base_price * multiplier
        return price, f"Value-based ({multiplier:.0%} of base)"

    def _apply_psychological_pricing(self, price: float) -> float:
        """Apply psychological pricing patterns."""
        if price < 10:
            # Round to .99
            return round(price) - 0.01
        elif price < 100:
            # Round to .99 or .97
            rounded = round(price)
            if rounded % 10 == 0:
                return rounded - 0.03  # $49.97 instead of $50
            return rounded - 0.01
        else:
            # Round to nearest $5 then -.01
            rounded = round(price / 5) * 5
            return rounded - 0.01

    def _estimate_elasticity(
        self,
        product: Dict[str, Any],
        demand_data: Optional[Dict[str, Any]]
    ) -> float:
        """Estimate price elasticity of demand."""
        # Base elasticity
        elasticity = 1.0  # Unit elastic

        if demand_data and 'elasticity' in demand_data:
            return demand_data['elasticity']

        # Category-based estimates
        category = product.get('category', '').lower()
        elastic_categories = ['electronics', 'fashion', 'accessories']
        inelastic_categories = ['health', 'baby', 'pet', 'hobby']

        if any(cat in category for cat in elastic_categories):
            elasticity = 1.5  # More price sensitive
        elif any(cat in category for cat in inelastic_categories):
            elasticity = 0.7  # Less price sensitive

        # Luxury items are more elastic
        price = product.get('price', 0)
        if price > 100:
            elasticity += 0.3

        return elasticity

    def _calculate_confidence(
        self,
        competitor_data: Optional[List[Dict[str, Any]]],
        demand_data: Optional[Dict[str, Any]],
        product: Dict[str, Any]
    ) -> float:
        """Calculate confidence in price recommendation."""
        confidence = 0.5

        if competitor_data and len(competitor_data) >= 3:
            confidence += 0.2
        elif competitor_data:
            confidence += 0.1

        if demand_data:
            confidence += 0.15

        # More product data = more confidence
        data_fields = ['rating', 'review_count', 'sales_count', 'brand']
        for field in data_fields:
            if product.get(field):
                confidence += 0.05

        return min(confidence, 1.0)


class PriceMonitor:
    """Monitor and auto-adjust prices."""

    def __init__(self, optimizer: DynamicPriceOptimizer):
        self.optimizer = optimizer
        self.price_history: Dict[str, List[Dict]] = {}

    async def check_and_adjust(
        self,
        product: Dict[str, Any],
        current_price: float,
        competitor_data: Optional[List[Dict]] = None
    ) -> Optional[PriceRecommendation]:
        """Check if price adjustment is needed."""
        rec = await self.optimizer.optimize_price(
            product,
            PricingStrategy.DYNAMIC,
            competitor_data
        )

        # Only recommend change if significant (>5% difference)
        price_diff = abs(rec.recommended_price - current_price) / current_price
        if price_diff > 0.05:
            self._record_price_change(product.get('id'), current_price, rec.recommended_price)
            return rec

        return None

    def _record_price_change(
        self,
        product_id: str,
        old_price: float,
        new_price: float
    ):
        """Record price change for analysis."""
        if product_id not in self.price_history:
            self.price_history[product_id] = []

        self.price_history[product_id].append({
            'timestamp': datetime.now().isoformat(),
            'old_price': old_price,
            'new_price': new_price,
            'change_pct': (new_price - old_price) / old_price * 100
        })
