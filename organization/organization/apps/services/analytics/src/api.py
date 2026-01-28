"""
Analytics Service
Real-time and batch analytics with ML insights
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import logging
import os

# CORS Configuration - Use specific origins for security
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', '').split(',') if os.getenv('ALLOWED_ORIGINS') else [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost:8080",
    "https://broxiva.com",
    "https://admin.broxiva.com",
    "https://api.broxiva.com",
]

app = FastAPI(
    title="Broxiva Analytics Service",
    description="Real-time and batch analytics with ML insights",
    version="1.0.0"
)

# Add CORS middleware with secure configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

logger = logging.getLogger(__name__)


class EventRequest(BaseModel):
    event_type: str
    user_id: Optional[str] = None
    session_id: str
    properties: Dict
    timestamp: Optional[datetime] = None


class DashboardRequest(BaseModel):
    start_date: datetime
    end_date: datetime
    metrics: List[str]
    dimensions: Optional[List[str]] = None
    filters: Optional[Dict] = None


class ForecastRequest(BaseModel):
    metric: str
    horizon_days: int = 30
    granularity: str = "daily"  # hourly, daily, weekly


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "analytics"}


@app.post("/events/track")
async def track_event(request: EventRequest):
    """
    Track a user event for analytics.
    """
    try:
        from realtime.event_processor import EventProcessor
        from storage.event_store import EventStore

        processor = EventProcessor()
        processed_event = processor.process(request.dict())

        store = EventStore()
        await store.insert(processed_event)

        return {"status": "tracked", "event_id": processed_event['id']}
    except Exception as e:
        logger.error(f"Event tracking error: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred while tracking the event")


@app.post("/events/batch")
async def track_batch_events(events: List[EventRequest]):
    """
    Track multiple events in batch.
    """
    try:
        from realtime.event_processor import EventProcessor
        from storage.event_store import EventStore

        processor = EventProcessor()
        store = EventStore()

        processed = []
        for event in events:
            processed_event = processor.process(event.dict())
            processed.append(processed_event)

        await store.bulk_insert(processed)

        return {"status": "tracked", "count": len(processed)}
    except Exception as e:
        logger.error(f"Batch tracking error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/dashboard/metrics")
async def get_dashboard_metrics(request: DashboardRequest):
    """
    Get metrics for dashboard display.
    """
    try:
        from batch.metrics_calculator import MetricsCalculator

        calculator = MetricsCalculator()
        results = calculator.calculate(
            metrics=request.metrics,
            start_date=request.start_date,
            end_date=request.end_date,
            dimensions=request.dimensions,
            filters=request.filters
        )

        return {
            "period": {
                "start": request.start_date.isoformat(),
                "end": request.end_date.isoformat()
            },
            "metrics": results
        }
    except Exception as e:
        logger.error(f"Dashboard metrics error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/realtime/overview")
async def get_realtime_overview():
    """
    Get real-time analytics overview.
    """
    try:
        from realtime.realtime_aggregator import RealtimeAggregator

        aggregator = RealtimeAggregator()
        overview = aggregator.get_overview()

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "active_users": overview['active_users'],
            "active_sessions": overview['active_sessions'],
            "orders_today": overview['orders_today'],
            "revenue_today": overview['revenue_today'],
            "cart_value_avg": overview['cart_value_avg'],
            "conversion_rate": overview['conversion_rate']
        }
    except Exception as e:
        logger.error(f"Realtime overview error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ml/forecast")
async def forecast_metric(request: ForecastRequest):
    """
    Generate ML-based forecast for a metric.
    """
    try:
        from ml.forecaster import MetricForecaster

        forecaster = MetricForecaster()
        forecast = forecaster.forecast(
            metric=request.metric,
            horizon_days=request.horizon_days,
            granularity=request.granularity
        )

        return {
            "metric": request.metric,
            "forecast": forecast['predictions'],
            "confidence_intervals": forecast['confidence'],
            "model_accuracy": forecast['accuracy'],
            "generated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Forecast error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ml/anomalies")
async def detect_anomalies(metric: str, lookback_hours: int = 24):
    """
    Detect anomalies in metric data.
    """
    try:
        from ml.anomaly_detector import AnomalyDetector

        detector = AnomalyDetector()
        anomalies = detector.detect(
            metric=metric,
            lookback_hours=lookback_hours
        )

        return {
            "metric": metric,
            "anomalies": anomalies,
            "detection_time": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Anomaly detection error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/cohort/analysis")
async def cohort_analysis(
    start_date: datetime,
    cohort_type: str = "acquisition_month",
    metric: str = "retention"
):
    """
    Perform cohort analysis.
    """
    try:
        from ml.cohort_analyzer import CohortAnalyzer

        analyzer = CohortAnalyzer()
        analysis = analyzer.analyze(
            start_date=start_date,
            cohort_type=cohort_type,
            metric=metric
        )

        return {
            "cohort_type": cohort_type,
            "metric": metric,
            "cohorts": analysis['cohorts'],
            "summary": analysis['summary']
        }
    except Exception as e:
        logger.error(f"Cohort analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/funnel/analysis")
async def funnel_analysis(
    funnel_name: str,
    start_date: datetime,
    end_date: datetime
):
    """
    Analyze conversion funnel.
    """
    try:
        from ml.funnel_analyzer import FunnelAnalyzer

        analyzer = FunnelAnalyzer()
        funnel = analyzer.analyze(
            funnel_name=funnel_name,
            start_date=start_date,
            end_date=end_date
        )

        return {
            "funnel": funnel_name,
            "stages": funnel['stages'],
            "conversion_rates": funnel['conversions'],
            "drop_off_points": funnel['drop_offs'],
            "recommendations": funnel['recommendations']
        }
    except Exception as e:
        logger.error(f"Funnel analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/user/{user_id}/journey")
async def get_user_journey(user_id: str, days: int = 30):
    """
    Get user journey and behavior analysis.
    """
    try:
        from ml.user_journey import UserJourneyAnalyzer

        analyzer = UserJourneyAnalyzer()
        journey = analyzer.analyze(user_id=user_id, days=days)

        return {
            "user_id": user_id,
            "touchpoints": journey['touchpoints'],
            "journey_stage": journey['current_stage'],
            "engagement_score": journey['engagement_score'],
            "likelihood_to_convert": journey['conversion_probability'],
            "recommended_actions": journey['recommendations']
        }
    except Exception as e:
        logger.error(f"User journey error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
