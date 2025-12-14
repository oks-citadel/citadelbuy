"""
Fraud Detection Service
AI-powered fraud detection and prevention
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import logging

app = FastAPI(
    title="Broxiva Fraud Detection Service",
    description="AI-powered fraud detection and prevention",
    version="1.0.0"
)

logger = logging.getLogger(__name__)


class TransactionRequest(BaseModel):
    transaction_id: str
    user_id: str
    amount: float
    currency: str = "USD"
    payment_method: str
    card_last_four: Optional[str] = None
    billing_address: Dict
    shipping_address: Dict
    device_fingerprint: Optional[str] = None
    ip_address: str
    user_agent: str
    items: List[Dict]


class FraudScore(BaseModel):
    transaction_id: str
    risk_score: float  # 0-100
    risk_level: str  # low, medium, high, critical
    factors: List[Dict]
    recommendation: str  # approve, review, reject
    model_version: str


class DeviceRequest(BaseModel):
    user_id: str
    device_fingerprint: str
    ip_address: str
    user_agent: str
    screen_resolution: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "fraud-detection"}


@app.post("/analyze", response_model=FraudScore)
async def analyze_transaction(request: TransactionRequest):
    """
    Analyze a transaction for potential fraud.

    Returns a risk score and recommendation.
    """
    try:
        from models.fraud_classifier import FraudClassifier
        from rules.rule_engine import RuleEngine
        from features.transaction_features import extract_features

        # Extract features from transaction
        features = extract_features(request.dict())

        # Run ML model
        classifier = FraudClassifier()
        ml_score = classifier.predict(features)

        # Run rule-based checks
        rule_engine = RuleEngine()
        rule_results = rule_engine.evaluate(request.dict())

        # Combine scores
        final_score = _combine_scores(ml_score, rule_results)

        # Determine risk level and recommendation
        risk_level, recommendation = _get_recommendation(final_score)

        # Log for model improvement
        logger.info(f"Fraud analysis: tx={request.transaction_id}, score={final_score}")

        return FraudScore(
            transaction_id=request.transaction_id,
            risk_score=final_score,
            risk_level=risk_level,
            factors=rule_results.get('triggered_rules', []),
            recommendation=recommendation,
            model_version="v2.0.0"
        )
    except Exception as e:
        logger.error(f"Fraud analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def _combine_scores(ml_score: float, rule_results: Dict) -> float:
    """Combine ML and rule-based scores."""
    rule_score = rule_results.get('score', 0)
    # Weighted combination
    return 0.6 * ml_score + 0.4 * rule_score


def _get_recommendation(score: float) -> tuple:
    """Get risk level and recommendation based on score."""
    if score < 20:
        return "low", "approve"
    elif score < 50:
        return "medium", "approve"
    elif score < 75:
        return "high", "review"
    else:
        return "critical", "reject"


@app.post("/device/analyze")
async def analyze_device(request: DeviceRequest):
    """
    Analyze device fingerprint for suspicious activity.
    """
    try:
        from models.device_analyzer import DeviceAnalyzer

        analyzer = DeviceAnalyzer()
        result = analyzer.analyze(
            user_id=request.user_id,
            device_fingerprint=request.device_fingerprint,
            ip_address=request.ip_address,
            user_agent=request.user_agent
        )

        return {
            "user_id": request.user_id,
            "device_trust_score": result['trust_score'],
            "is_known_device": result['is_known'],
            "device_age_days": result.get('device_age', 0),
            "suspicious_signals": result.get('signals', [])
        }
    except Exception as e:
        logger.error(f"Device analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/velocity/check")
async def check_velocity(user_id: str, ip_address: str, card_last_four: Optional[str] = None):
    """
    Check transaction velocity for suspicious patterns.
    """
    try:
        from rules.velocity_checker import VelocityChecker

        checker = VelocityChecker()
        result = checker.check(
            user_id=user_id,
            ip_address=ip_address,
            card_last_four=card_last_four
        )

        return {
            "user_id": user_id,
            "transactions_1h": result['tx_count_1h'],
            "transactions_24h": result['tx_count_24h'],
            "amount_1h": result['amount_1h'],
            "amount_24h": result['amount_24h'],
            "velocity_score": result['score'],
            "exceeded_limits": result['exceeded_limits']
        }
    except Exception as e:
        logger.error(f"Velocity check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/report/fraud")
async def report_fraud(transaction_id: str, fraud_type: str, details: Optional[str] = None):
    """
    Report a confirmed fraud case for model training.
    """
    try:
        from training.feedback_collector import FeedbackCollector

        collector = FeedbackCollector()
        await collector.record_fraud(
            transaction_id=transaction_id,
            fraud_type=fraud_type,
            details=details,
            reported_at=datetime.utcnow()
        )

        return {"status": "recorded", "transaction_id": transaction_id}
    except Exception as e:
        logger.error(f"Fraud report error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats")
async def get_fraud_stats(days: int = 7):
    """Get fraud detection statistics."""
    from analytics.fraud_stats import FraudStatistics

    stats = FraudStatistics()
    return stats.get_summary(days=days)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
