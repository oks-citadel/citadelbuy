"""
Demand Forecaster
AI system to predict product demand and seasonal trends for dropshipping
"""

import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class SeasonalPattern(Enum):
    """Seasonal demand patterns"""
    EVERGREEN = "evergreen"           # Consistent year-round
    SUMMER = "summer"                 # Peak in summer months
    WINTER = "winter"                 # Peak in winter months
    HOLIDAY = "holiday"               # Q4 holiday peak
    BACK_TO_SCHOOL = "back_to_school" # Aug-Sep peak
    VALENTINES = "valentines"         # Feb peak
    MOTHERS_DAY = "mothers_day"       # May peak
    TRENDING = "trending"             # Viral/trending product


class DemandLevel(Enum):
    """Demand level classification"""
    VERY_LOW = "very_low"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    VERY_HIGH = "very_high"
    EXPLOSIVE = "explosive"


@dataclass
class DemandForecast:
    """Demand forecast result"""
    product_id: str
    current_demand: DemandLevel
    forecast_7d: float
    forecast_30d: float
    forecast_90d: float
    seasonal_pattern: SeasonalPattern
    trend_direction: str  # 'up', 'down', 'stable'
    trend_strength: float  # 0-1
    peak_season_months: List[int]
    recommended_stock_level: int
    reorder_point: int
    confidence: float
    insights: List[str]


class DemandForecaster:
    """
    AI-powered demand forecasting for dropshipping products.

    Capabilities:
    - Time series demand prediction
    - Seasonal pattern detection
    - Trend analysis
    - Stock level recommendations
    - Market signal integration
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.lookback_days = config.get('lookback_days', 90)
        self.safety_stock_multiplier = config.get('safety_stock_multiplier', 1.5)

    async def forecast(
        self,
        product: Dict[str, Any],
        sales_history: Optional[List[Dict[str, Any]]] = None,
        market_signals: Optional[Dict[str, Any]] = None,
    ) -> DemandForecast:
        """
        Generate demand forecast for a product.

        Args:
            product: Product data
            sales_history: Historical sales data
            market_signals: External market indicators

        Returns:
            DemandForecast with predictions and recommendations
        """
        # Analyze historical demand
        historical_analysis = self._analyze_history(sales_history)

        # Detect seasonal pattern
        seasonal_pattern = self._detect_seasonal_pattern(
            product, sales_history, market_signals
        )

        # Calculate trend
        trend_direction, trend_strength = self._calculate_trend(sales_history)

        # Generate forecasts
        base_demand = historical_analysis.get('avg_daily_sales', 1)

        forecast_7d = self._forecast_period(
            base_demand, 7, seasonal_pattern, trend_direction, trend_strength
        )
        forecast_30d = self._forecast_period(
            base_demand, 30, seasonal_pattern, trend_direction, trend_strength
        )
        forecast_90d = self._forecast_period(
            base_demand, 90, seasonal_pattern, trend_direction, trend_strength
        )

        # Determine current demand level
        current_demand = self._classify_demand_level(
            historical_analysis.get('recent_daily_avg', base_demand),
            product.get('category', '')
        )

        # Calculate stock recommendations
        lead_time = product.get('supplier_lead_time', 14)  # days
        recommended_stock = self._calculate_recommended_stock(
            forecast_30d, lead_time
        )
        reorder_point = self._calculate_reorder_point(
            base_demand, lead_time
        )

        # Get peak months
        peak_months = self._get_peak_months(seasonal_pattern)

        # Calculate confidence
        confidence = self._calculate_confidence(sales_history, market_signals)

        # Generate insights
        insights = self._generate_insights(
            current_demand, trend_direction, seasonal_pattern,
            forecast_30d, base_demand
        )

        return DemandForecast(
            product_id=product.get('id', ''),
            current_demand=current_demand,
            forecast_7d=round(forecast_7d, 1),
            forecast_30d=round(forecast_30d, 1),
            forecast_90d=round(forecast_90d, 1),
            seasonal_pattern=seasonal_pattern,
            trend_direction=trend_direction,
            trend_strength=round(trend_strength, 2),
            peak_season_months=peak_months,
            recommended_stock_level=recommended_stock,
            reorder_point=reorder_point,
            confidence=round(confidence, 2),
            insights=insights,
        )

    async def batch_forecast(
        self,
        products: List[Dict[str, Any]],
        sales_histories: Optional[Dict[str, List[Dict]]] = None,
    ) -> List[DemandForecast]:
        """Forecast demand for multiple products."""
        forecasts = []

        for product in products:
            product_id = product.get('id', '')
            history = sales_histories.get(product_id) if sales_histories else None

            try:
                forecast = await self.forecast(product, history)
                forecasts.append(forecast)
            except Exception as e:
                logger.error(f"Forecast failed for {product_id}: {e}")

        return forecasts

    async def detect_demand_anomalies(
        self,
        product: Dict[str, Any],
        sales_history: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Detect unusual demand patterns (spikes, drops)."""
        anomalies = {
            'has_anomalies': False,
            'spikes': [],
            'drops': [],
            'recommendation': '',
        }

        if not sales_history or len(sales_history) < 7:
            return anomalies

        # Calculate baseline statistics
        sales = [s.get('quantity', 0) for s in sales_history]
        mean_sales = np.mean(sales)
        std_sales = np.std(sales)

        if std_sales == 0:
            return anomalies

        # Detect anomalies (>2 standard deviations)
        for i, sale in enumerate(sales_history):
            quantity = sale.get('quantity', 0)
            z_score = (quantity - mean_sales) / std_sales

            if z_score > 2:
                anomalies['spikes'].append({
                    'date': sale.get('date'),
                    'quantity': quantity,
                    'z_score': round(z_score, 2),
                })
            elif z_score < -2:
                anomalies['drops'].append({
                    'date': sale.get('date'),
                    'quantity': quantity,
                    'z_score': round(z_score, 2),
                })

        anomalies['has_anomalies'] = len(anomalies['spikes']) > 0 or len(anomalies['drops']) > 0

        # Generate recommendation
        if anomalies['spikes']:
            anomalies['recommendation'] = "Demand spikes detected. Consider increasing stock and investigating cause (viral content, promotion, etc.)"
        elif anomalies['drops']:
            anomalies['recommendation'] = "Demand drops detected. Review product listing, pricing, and competitor activity."

        return anomalies

    async def get_category_trends(
        self,
        category: str,
        market_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Get demand trends for a product category."""
        trends = {
            'category': category,
            'overall_trend': 'stable',
            'growth_rate': 0.0,
            'market_size': 'unknown',
            'competition_level': 'moderate',
            'seasonality': 'evergreen',
            'recommendations': [],
        }

        # Category trend mappings (would be ML-driven in production)
        category_lower = category.lower()

        # High growth categories
        high_growth = ['smart home', 'fitness', 'sustainable', 'pet', 'outdoor']
        if any(cat in category_lower for cat in high_growth):
            trends['overall_trend'] = 'up'
            trends['growth_rate'] = 0.15
            trends['recommendations'].append("Growing category - consider expanding product range")

        # Declining categories
        declining = ['dvd', 'cd', 'landline', 'fax']
        if any(cat in category_lower for cat in declining):
            trends['overall_trend'] = 'down'
            trends['growth_rate'] = -0.10
            trends['recommendations'].append("Declining category - focus on niche audiences")

        # Seasonal categories
        seasonal_map = {
            'outdoor': SeasonalPattern.SUMMER,
            'beach': SeasonalPattern.SUMMER,
            'christmas': SeasonalPattern.HOLIDAY,
            'gift': SeasonalPattern.HOLIDAY,
            'school': SeasonalPattern.BACK_TO_SCHOOL,
            'winter': SeasonalPattern.WINTER,
        }

        for keyword, pattern in seasonal_map.items():
            if keyword in category_lower:
                trends['seasonality'] = pattern.value
                trends['recommendations'].append(f"Seasonal category - plan inventory for {pattern.value} peak")
                break

        # Competition assessment
        saturated = ['phone case', 'jewelry', 't-shirt', 'mug']
        niche = ['hobby', 'craft', 'specialty', 'professional']

        if any(cat in category_lower for cat in saturated):
            trends['competition_level'] = 'high'
            trends['recommendations'].append("Highly competitive - differentiate with unique designs or niches")
        elif any(cat in category_lower for cat in niche):
            trends['competition_level'] = 'low'
            trends['recommendations'].append("Lower competition - opportunity for market leadership")

        return trends

    def _analyze_history(
        self,
        sales_history: Optional[List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """Analyze historical sales data."""
        if not sales_history:
            return {
                'avg_daily_sales': 1,
                'recent_daily_avg': 1,
                'total_sales': 0,
                'days_with_sales': 0,
            }

        # Calculate metrics
        total_sales = sum(s.get('quantity', 0) for s in sales_history)
        days = len(sales_history)
        avg_daily = total_sales / days if days > 0 else 0

        # Recent average (last 7 days)
        recent = sales_history[-7:] if len(sales_history) >= 7 else sales_history
        recent_total = sum(s.get('quantity', 0) for s in recent)
        recent_avg = recent_total / len(recent) if recent else 0

        return {
            'avg_daily_sales': avg_daily,
            'recent_daily_avg': recent_avg,
            'total_sales': total_sales,
            'days_with_sales': days,
        }

    def _detect_seasonal_pattern(
        self,
        product: Dict[str, Any],
        sales_history: Optional[List[Dict[str, Any]]],
        market_signals: Optional[Dict[str, Any]],
    ) -> SeasonalPattern:
        """Detect the seasonal pattern for a product."""
        category = product.get('category', '').lower()

        # Category-based detection
        seasonal_keywords = {
            SeasonalPattern.SUMMER: ['outdoor', 'beach', 'pool', 'garden', 'camping', 'sunglasses'],
            SeasonalPattern.WINTER: ['winter', 'snow', 'warm', 'heated', 'christmas tree'],
            SeasonalPattern.HOLIDAY: ['christmas', 'gift', 'holiday', 'decoration', 'ornament'],
            SeasonalPattern.BACK_TO_SCHOOL: ['school', 'student', 'office', 'stationery', 'backpack'],
            SeasonalPattern.VALENTINES: ['romantic', 'valentine', 'love', 'couple', 'heart'],
            SeasonalPattern.MOTHERS_DAY: ['mother', 'mom', 'floral', 'jewelry'],
        }

        for pattern, keywords in seasonal_keywords.items():
            if any(kw in category for kw in keywords):
                return pattern

        # Market signals
        if market_signals and market_signals.get('is_trending'):
            return SeasonalPattern.TRENDING

        # Analyze sales history for patterns
        if sales_history and len(sales_history) >= 90:
            # Would implement time series analysis here
            pass

        return SeasonalPattern.EVERGREEN

    def _calculate_trend(
        self,
        sales_history: Optional[List[Dict[str, Any]]]
    ) -> Tuple[str, float]:
        """Calculate demand trend direction and strength."""
        if not sales_history or len(sales_history) < 14:
            return 'stable', 0.0

        # Compare recent vs earlier period
        mid_point = len(sales_history) // 2
        early = sales_history[:mid_point]
        late = sales_history[mid_point:]

        early_avg = sum(s.get('quantity', 0) for s in early) / len(early)
        late_avg = sum(s.get('quantity', 0) for s in late) / len(late)

        if early_avg == 0:
            return 'stable', 0.0

        change_pct = (late_avg - early_avg) / early_avg

        if change_pct > 0.20:
            return 'up', min(abs(change_pct), 1.0)
        elif change_pct < -0.20:
            return 'down', min(abs(change_pct), 1.0)
        else:
            return 'stable', abs(change_pct)

    def _forecast_period(
        self,
        base_demand: float,
        days: int,
        seasonal: SeasonalPattern,
        trend_direction: str,
        trend_strength: float,
    ) -> float:
        """Forecast demand for a specific period."""
        # Base forecast
        forecast = base_demand * days

        # Apply trend adjustment
        if trend_direction == 'up':
            trend_multiplier = 1 + (trend_strength * 0.3 * (days / 30))
            forecast *= trend_multiplier
        elif trend_direction == 'down':
            trend_multiplier = 1 - (trend_strength * 0.2 * (days / 30))
            forecast *= max(trend_multiplier, 0.5)

        # Apply seasonal adjustment
        seasonal_factor = self._get_seasonal_factor(seasonal, days)
        forecast *= seasonal_factor

        return max(forecast, 0)

    def _get_seasonal_factor(
        self,
        pattern: SeasonalPattern,
        forecast_days: int
    ) -> float:
        """Get seasonal adjustment factor."""
        current_month = datetime.now().month

        # Seasonal peak months mapping
        peak_months = {
            SeasonalPattern.SUMMER: [6, 7, 8],
            SeasonalPattern.WINTER: [12, 1, 2],
            SeasonalPattern.HOLIDAY: [11, 12],
            SeasonalPattern.BACK_TO_SCHOOL: [8, 9],
            SeasonalPattern.VALENTINES: [2],
            SeasonalPattern.MOTHERS_DAY: [5],
            SeasonalPattern.TRENDING: list(range(1, 13)),  # All months
            SeasonalPattern.EVERGREEN: list(range(1, 13)),
        }

        peaks = peak_months.get(pattern, [])

        if pattern == SeasonalPattern.EVERGREEN:
            return 1.0

        if current_month in peaks:
            return 1.3  # 30% boost during peak

        # Approaching peak (1-2 months before)
        approaching_peak = any((current_month + i) % 12 + 1 in peaks for i in range(1, 3))
        if approaching_peak:
            return 1.15

        return 0.85  # Off-season reduction

    def _classify_demand_level(
        self,
        daily_sales: float,
        category: str
    ) -> DemandLevel:
        """Classify the demand level."""
        # Category-specific thresholds
        high_volume_categories = ['electronics', 'fashion', 'home']

        multiplier = 1.5 if any(cat in category.lower() for cat in high_volume_categories) else 1.0

        if daily_sales >= 100 * multiplier:
            return DemandLevel.EXPLOSIVE
        elif daily_sales >= 50 * multiplier:
            return DemandLevel.VERY_HIGH
        elif daily_sales >= 20 * multiplier:
            return DemandLevel.HIGH
        elif daily_sales >= 5 * multiplier:
            return DemandLevel.MODERATE
        elif daily_sales >= 1 * multiplier:
            return DemandLevel.LOW
        else:
            return DemandLevel.VERY_LOW

    def _calculate_recommended_stock(
        self,
        forecast_30d: float,
        lead_time: int
    ) -> int:
        """Calculate recommended stock level."""
        # Daily demand
        daily_demand = forecast_30d / 30

        # Lead time demand
        lead_time_demand = daily_demand * lead_time

        # Safety stock
        safety_stock = lead_time_demand * self.safety_stock_multiplier

        # Total recommended
        recommended = lead_time_demand + safety_stock

        return max(int(np.ceil(recommended)), 1)

    def _calculate_reorder_point(
        self,
        avg_daily_demand: float,
        lead_time: int
    ) -> int:
        """Calculate reorder point."""
        # Reorder when stock reaches this level
        lead_time_demand = avg_daily_demand * lead_time
        safety_buffer = avg_daily_demand * 3  # 3 days safety buffer

        return max(int(np.ceil(lead_time_demand + safety_buffer)), 1)

    def _get_peak_months(self, pattern: SeasonalPattern) -> List[int]:
        """Get peak months for a seasonal pattern."""
        mapping = {
            SeasonalPattern.SUMMER: [6, 7, 8],
            SeasonalPattern.WINTER: [12, 1, 2],
            SeasonalPattern.HOLIDAY: [11, 12],
            SeasonalPattern.BACK_TO_SCHOOL: [8, 9],
            SeasonalPattern.VALENTINES: [2],
            SeasonalPattern.MOTHERS_DAY: [5],
            SeasonalPattern.TRENDING: [],
            SeasonalPattern.EVERGREEN: [],
        }
        return mapping.get(pattern, [])

    def _calculate_confidence(
        self,
        sales_history: Optional[List[Dict[str, Any]]],
        market_signals: Optional[Dict[str, Any]],
    ) -> float:
        """Calculate forecast confidence level."""
        confidence = 0.4  # Base confidence

        if sales_history:
            # More history = higher confidence
            days = len(sales_history)
            if days >= 90:
                confidence += 0.3
            elif days >= 30:
                confidence += 0.2
            elif days >= 7:
                confidence += 0.1

        if market_signals:
            confidence += 0.15

            if market_signals.get('search_volume'):
                confidence += 0.05
            if market_signals.get('competitor_data'):
                confidence += 0.1

        return min(confidence, 1.0)

    def _generate_insights(
        self,
        demand_level: DemandLevel,
        trend: str,
        seasonal: SeasonalPattern,
        forecast_30d: float,
        base_demand: float,
    ) -> List[str]:
        """Generate actionable insights."""
        insights = []

        # Demand level insight
        if demand_level in [DemandLevel.EXPLOSIVE, DemandLevel.VERY_HIGH]:
            insights.append("High demand product - prioritize stock availability")
        elif demand_level == DemandLevel.VERY_LOW:
            insights.append("Low demand - consider discontinuing or niche marketing")

        # Trend insight
        if trend == 'up':
            insights.append("Growing demand trend - good time to scale marketing")
        elif trend == 'down':
            insights.append("Declining demand - review product positioning and pricing")

        # Seasonal insight
        if seasonal != SeasonalPattern.EVERGREEN:
            peak_months = self._get_peak_months(seasonal)
            current_month = datetime.now().month

            if current_month in peak_months:
                insights.append(f"Currently in peak season - maximize marketing spend")
            elif any((current_month + 1) % 12 + 1 == m for m in peak_months):
                insights.append(f"Peak season approaching - prepare inventory")

        # Forecast vs current
        if forecast_30d > base_demand * 30 * 1.2:
            insights.append("Forecast shows significant demand increase ahead")
        elif forecast_30d < base_demand * 30 * 0.8:
            insights.append("Forecast shows demand decrease - plan accordingly")

        return insights


class InventoryPlanner:
    """Plan inventory based on demand forecasts."""

    def __init__(self, forecaster: DemandForecaster):
        self.forecaster = forecaster

    async def generate_restock_plan(
        self,
        products: List[Dict[str, Any]],
        current_inventory: Dict[str, int],
        sales_histories: Optional[Dict[str, List[Dict]]] = None,
    ) -> List[Dict[str, Any]]:
        """Generate restock plan for products."""
        plan = []

        for product in products:
            product_id = product.get('id', '')
            current_stock = current_inventory.get(product_id, 0)
            history = sales_histories.get(product_id) if sales_histories else None

            forecast = await self.forecaster.forecast(product, history)

            # Check if restock needed
            if current_stock <= forecast.reorder_point:
                restock_quantity = forecast.recommended_stock_level - current_stock

                plan.append({
                    'product_id': product_id,
                    'product_name': product.get('name', ''),
                    'current_stock': current_stock,
                    'reorder_point': forecast.reorder_point,
                    'recommended_stock': forecast.recommended_stock_level,
                    'restock_quantity': max(restock_quantity, 0),
                    'urgency': 'high' if current_stock < forecast.reorder_point * 0.5 else 'normal',
                    'forecast_30d': forecast.forecast_30d,
                    'days_of_stock': round(current_stock / (forecast.forecast_30d / 30), 1) if forecast.forecast_30d > 0 else 999,
                })

        # Sort by urgency
        plan.sort(key=lambda x: (
            0 if x['urgency'] == 'high' else 1,
            x['days_of_stock']
        ))

        return plan
