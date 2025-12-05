"""
Supplier Reliability Scorer
AI system to evaluate and predict supplier performance
"""

import numpy as np
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class RiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class SupplierScore:
    """Supplier scoring result"""
    supplier_id: str
    overall_score: float
    reliability_score: float
    quality_score: float
    delivery_score: float
    communication_score: float
    price_score: float
    risk_level: RiskLevel
    recommendation: str
    issues: List[str]
    strengths: List[str]


class SupplierReliabilityScorer:
    """
    AI-powered supplier reliability scoring system.

    Evaluates suppliers on:
    - Order fulfillment rate
    - Delivery time accuracy
    - Product quality (return rate, reviews)
    - Communication responsiveness
    - Price stability
    - Dispute resolution
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.weights = {
            'reliability': 0.30,
            'quality': 0.25,
            'delivery': 0.25,
            'communication': 0.10,
            'price': 0.10,
        }

    async def score_supplier(
        self,
        supplier: Dict[str, Any],
        order_history: Optional[List[Dict[str, Any]]] = None,
        reviews: Optional[List[Dict[str, Any]]] = None,
    ) -> SupplierScore:
        """
        Calculate comprehensive supplier score.

        Args:
            supplier: Supplier profile data
            order_history: Historical order data with this supplier
            reviews: Customer reviews for products from this supplier

        Returns:
            SupplierScore with detailed analysis
        """
        # Calculate individual scores
        reliability_score = self._calculate_reliability(supplier, order_history)
        quality_score = self._calculate_quality(supplier, reviews, order_history)
        delivery_score = self._calculate_delivery(supplier, order_history)
        communication_score = self._calculate_communication(supplier)
        price_score = self._calculate_price_stability(supplier, order_history)

        # Calculate weighted overall score
        overall_score = (
            reliability_score * self.weights['reliability'] +
            quality_score * self.weights['quality'] +
            delivery_score * self.weights['delivery'] +
            communication_score * self.weights['communication'] +
            price_score * self.weights['price']
        ) * 100

        # Determine risk level
        risk_level = self._determine_risk_level(overall_score, reliability_score, delivery_score)

        # Generate recommendation and insights
        issues = self._identify_issues(
            reliability_score, quality_score, delivery_score,
            communication_score, price_score
        )
        strengths = self._identify_strengths(
            reliability_score, quality_score, delivery_score,
            communication_score, price_score
        )
        recommendation = self._generate_recommendation(overall_score, risk_level, issues)

        return SupplierScore(
            supplier_id=supplier.get('id', ''),
            overall_score=round(overall_score, 2),
            reliability_score=round(reliability_score * 100, 2),
            quality_score=round(quality_score * 100, 2),
            delivery_score=round(delivery_score * 100, 2),
            communication_score=round(communication_score * 100, 2),
            price_score=round(price_score * 100, 2),
            risk_level=risk_level,
            recommendation=recommendation,
            issues=issues,
            strengths=strengths,
        )

    async def compare_suppliers(
        self,
        suppliers: List[Dict[str, Any]],
        order_histories: Optional[Dict[str, List[Dict]]] = None,
    ) -> List[SupplierScore]:
        """Compare multiple suppliers."""
        scores = []

        for supplier in suppliers:
            supplier_id = supplier.get('id', '')
            order_history = order_histories.get(supplier_id) if order_histories else None

            score = await self.score_supplier(supplier, order_history)
            scores.append(score)

        # Sort by overall score
        scores.sort(key=lambda x: x.overall_score, reverse=True)
        return scores

    async def predict_supplier_issues(
        self,
        supplier: Dict[str, Any],
        order_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Predict potential issues with a supplier."""
        predictions = {
            'delay_probability': 0.0,
            'quality_issue_probability': 0.0,
            'stock_out_probability': 0.0,
            'price_increase_probability': 0.0,
            'overall_risk': 'low',
        }

        if not order_history:
            return predictions

        # Analyze recent trends
        recent_orders = [
            o for o in order_history
            if self._parse_date(o.get('created_at')) > datetime.now() - timedelta(days=30)
        ]

        if recent_orders:
            # Delay probability
            delayed = sum(1 for o in recent_orders if o.get('was_delayed', False))
            predictions['delay_probability'] = delayed / len(recent_orders)

            # Quality issues
            quality_issues = sum(1 for o in recent_orders if o.get('had_quality_issue', False))
            predictions['quality_issue_probability'] = quality_issues / len(recent_orders)

            # Stock outs
            stock_outs = sum(1 for o in recent_orders if o.get('was_out_of_stock', False))
            predictions['stock_out_probability'] = stock_outs / len(recent_orders)

        # Price trend analysis
        if len(order_history) >= 5:
            recent_prices = [o.get('unit_cost', 0) for o in order_history[-5:]]
            if recent_prices[0] > 0:
                price_change = (recent_prices[-1] - recent_prices[0]) / recent_prices[0]
                if price_change > 0.05:
                    predictions['price_increase_probability'] = min(price_change * 2, 1.0)

        # Overall risk
        avg_risk = (
            predictions['delay_probability'] * 0.3 +
            predictions['quality_issue_probability'] * 0.4 +
            predictions['stock_out_probability'] * 0.2 +
            predictions['price_increase_probability'] * 0.1
        )

        if avg_risk > 0.5:
            predictions['overall_risk'] = 'high'
        elif avg_risk > 0.25:
            predictions['overall_risk'] = 'medium'
        else:
            predictions['overall_risk'] = 'low'

        return predictions

    def _calculate_reliability(
        self,
        supplier: Dict[str, Any],
        order_history: Optional[List[Dict]]
    ) -> float:
        """Calculate reliability score based on fulfillment rate."""
        score = 0.5  # Base score

        # From supplier metrics
        success_rate = supplier.get('successful_orders', 0)
        total_orders = supplier.get('total_orders', 0)

        if total_orders > 0:
            fulfillment_rate = success_rate / total_orders
            score = fulfillment_rate * 0.8 + 0.2  # 20% base + 80% performance

        # From order history
        if order_history:
            recent_success = sum(
                1 for o in order_history[-20:]
                if o.get('status') in ['DELIVERED', 'SHIPPED']
            )
            recent_rate = recent_success / min(len(order_history), 20)
            score = (score + recent_rate) / 2

        # Dispute rate penalty
        dispute_rate = supplier.get('dispute_rate', 0)
        score -= dispute_rate * 0.5

        return max(min(score, 1.0), 0.0)

    def _calculate_quality(
        self,
        supplier: Dict[str, Any],
        reviews: Optional[List[Dict]],
        order_history: Optional[List[Dict]]
    ) -> float:
        """Calculate quality score based on returns and reviews."""
        score = 0.5

        # Return rate (lower is better)
        return_rate = supplier.get('return_rate', 0.05)
        score += (1 - return_rate) * 0.3

        # Quality score from supplier
        quality = supplier.get('quality_score', 0)
        if quality > 0:
            score = (score + quality) / 2

        # From reviews
        if reviews:
            avg_rating = sum(r.get('rating', 3) for r in reviews) / len(reviews)
            score = (score + avg_rating / 5) / 2

            # Check for quality complaints
            quality_keywords = ['defective', 'broken', 'poor quality', 'fake', 'not as described']
            complaints = sum(
                1 for r in reviews
                if any(kw in r.get('text', '').lower() for kw in quality_keywords)
            )
            if len(reviews) > 0:
                complaint_rate = complaints / len(reviews)
                score -= complaint_rate * 0.2

        return max(min(score, 1.0), 0.0)

    def _calculate_delivery(
        self,
        supplier: Dict[str, Any],
        order_history: Optional[List[Dict]]
    ) -> float:
        """Calculate delivery performance score."""
        score = 0.5

        # On-time delivery rate
        on_time_rate = supplier.get('on_time_delivery_rate', 80) / 100
        score = on_time_rate * 0.6 + 0.4

        # Shipping speed
        avg_days = supplier.get('average_shipping_days', 14)
        if avg_days <= 7:
            score += 0.2
        elif avg_days <= 14:
            score += 0.1
        elif avg_days > 21:
            score -= 0.15

        # From order history
        if order_history:
            on_time = sum(
                1 for o in order_history[-20:]
                if o.get('delivered_on_time', False)
            )
            recent_rate = on_time / min(len(order_history), 20)
            score = (score + recent_rate) / 2

        return max(min(score, 1.0), 0.0)

    def _calculate_communication(self, supplier: Dict[str, Any]) -> float:
        """Calculate communication responsiveness score."""
        score = 0.5

        # Response time
        response_score = supplier.get('response_time_score', 0.5)
        score = (score + response_score) / 2

        # Has active support
        if supplier.get('has_support_chat'):
            score += 0.15
        if supplier.get('has_phone_support'):
            score += 0.1

        # English proficiency
        if supplier.get('english_support'):
            score += 0.1

        return max(min(score, 1.0), 0.0)

    def _calculate_price_stability(
        self,
        supplier: Dict[str, Any],
        order_history: Optional[List[Dict]]
    ) -> float:
        """Calculate price stability score."""
        score = 0.7  # Default reasonable

        if not order_history or len(order_history) < 3:
            return score

        # Analyze price variance
        prices = [o.get('unit_cost', 0) for o in order_history if o.get('unit_cost')]

        if len(prices) >= 3:
            avg_price = np.mean(prices)
            std_price = np.std(prices)

            # Low variance is good
            if avg_price > 0:
                cv = std_price / avg_price  # Coefficient of variation
                if cv < 0.05:
                    score = 0.95
                elif cv < 0.1:
                    score = 0.8
                elif cv < 0.2:
                    score = 0.6
                else:
                    score = 0.4

        return score

    def _determine_risk_level(
        self,
        overall: float,
        reliability: float,
        delivery: float
    ) -> RiskLevel:
        """Determine supplier risk level."""
        if overall < 40 or reliability < 0.5 or delivery < 0.5:
            return RiskLevel.CRITICAL
        elif overall < 60:
            return RiskLevel.HIGH
        elif overall < 75:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW

    def _identify_issues(
        self,
        reliability: float,
        quality: float,
        delivery: float,
        communication: float,
        price: float
    ) -> List[str]:
        """Identify potential issues with supplier."""
        issues = []

        if reliability < 0.6:
            issues.append("Low order fulfillment rate")
        if quality < 0.6:
            issues.append("Product quality concerns")
        if delivery < 0.6:
            issues.append("Frequent delivery delays")
        if communication < 0.5:
            issues.append("Poor communication")
        if price < 0.5:
            issues.append("Unstable pricing")

        return issues

    def _identify_strengths(
        self,
        reliability: float,
        quality: float,
        delivery: float,
        communication: float,
        price: float
    ) -> List[str]:
        """Identify supplier strengths."""
        strengths = []

        if reliability > 0.85:
            strengths.append("Excellent fulfillment rate")
        if quality > 0.85:
            strengths.append("High product quality")
        if delivery > 0.85:
            strengths.append("Fast and reliable shipping")
        if communication > 0.8:
            strengths.append("Responsive support")
        if price > 0.8:
            strengths.append("Stable pricing")

        return strengths

    def _generate_recommendation(
        self,
        score: float,
        risk: RiskLevel,
        issues: List[str]
    ) -> str:
        """Generate supplier recommendation."""
        if risk == RiskLevel.CRITICAL:
            return "AVOID - Critical reliability issues. Find alternative supplier."
        elif risk == RiskLevel.HIGH:
            return f"CAUTION - Address issues: {', '.join(issues[:2])}"
        elif risk == RiskLevel.MEDIUM:
            if issues:
                return f"ACCEPTABLE - Monitor: {issues[0]}"
            return "ACCEPTABLE - Good for non-critical products"
        else:
            return "RECOMMENDED - Reliable supplier for dropshipping"

    def _parse_date(self, date_str: Any) -> datetime:
        """Parse date string to datetime."""
        if isinstance(date_str, datetime):
            return date_str
        if isinstance(date_str, str):
            try:
                return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            except:
                return datetime.now()
        return datetime.now()
