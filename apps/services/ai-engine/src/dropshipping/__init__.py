"""
Dropshipping AI Module
Provides AI-powered predictions and optimizations for dropshipping operations
"""

from .winning_product import WinningProductPredictor, ProductScorer, ProductScore
from .price_optimizer import DynamicPriceOptimizer, PriceMonitor, PricingStrategy, PriceRecommendation
from .supplier_scorer import SupplierReliabilityScorer, SupplierScore, RiskLevel as SupplierRiskLevel
from .demand_forecaster import DemandForecaster, InventoryPlanner, DemandForecast, SeasonalPattern, DemandLevel
from .fraud_detector import DropshippingFraudDetector, FraudAssessment, FraudType, RiskLevel, RecommendedAction
from .conversion_predictor import ConversionPredictor, ConversionPrediction, ConversionFactor

__all__ = [
    # Winning Product
    'WinningProductPredictor',
    'ProductScorer',
    'ProductScore',

    # Price Optimization
    'DynamicPriceOptimizer',
    'PriceMonitor',
    'PricingStrategy',
    'PriceRecommendation',

    # Supplier Scoring
    'SupplierReliabilityScorer',
    'SupplierScore',
    'SupplierRiskLevel',

    # Demand Forecasting
    'DemandForecaster',
    'InventoryPlanner',
    'DemandForecast',
    'SeasonalPattern',
    'DemandLevel',

    # Fraud Detection
    'DropshippingFraudDetector',
    'FraudAssessment',
    'FraudType',
    'RiskLevel',
    'RecommendedAction',

    # Conversion Prediction
    'ConversionPredictor',
    'ConversionPrediction',
    'ConversionFactor',
]


# Convenience factory functions
def create_dropshipping_ai_suite(config: dict = None):
    """Create a complete suite of dropshipping AI tools."""
    config = config or {}

    return {
        'product_predictor': WinningProductPredictor(config.get('product', {})),
        'price_optimizer': DynamicPriceOptimizer(config.get('pricing', {})),
        'supplier_scorer': SupplierReliabilityScorer(config.get('supplier', {})),
        'demand_forecaster': DemandForecaster(config.get('demand', {})),
        'fraud_detector': DropshippingFraudDetector(config.get('fraud', {})),
        'conversion_predictor': ConversionPredictor(config.get('conversion', {})),
    }
