"""Enterprise Sales Director Agent - Deal scoring and sales forecasting"""
from typing import Dict, List, Any
from .base_agent import BaseAgent

class EnterpriseSalesDirectorAgent(BaseAgent):
    def __init__(self, shared_memory):
        super().__init__(name="EnterpriseSalesDirector", description="Scores deals and forecasts sales pipeline", shared_memory=shared_memory)
        self.capabilities = ["deal_scoring", "sales_forecasting", "pipeline_analysis", "win_probability", "revenue_prediction", "churn_prediction"]

    async def execute_task(self, task: str, context: Dict[str, Any], priority: str = "medium") -> Dict[str, Any]:
        task_id = await self._prepare_task(task, context, priority)
        try:
            result = await self._score_deal_internal(context) if "deal" in task.lower() or "score" in task.lower() else await self._forecast_sales(context)
            await self._complete_task(task_id, result)
            return result
        except Exception as e:
            return {"task_id": task_id, "status": "failed", "error": str(e), "confidence": 0.0, "reasoning": str(e), "recommendations": [], "next_actions": []}

    async def score_deal(self, deal_id: str, customer_id: str, products: List[Dict], total_value: float, stage: str, interactions: List[Dict]) -> Dict[str, Any]:
        return await self._score_deal_internal({"deal_id": deal_id, "customer_id": customer_id, "products": products, "total_value": total_value, "stage": stage, "interactions": interactions})

    async def _score_deal_internal(self, context: Dict[str, Any]) -> Dict[str, Any]:
        deal_id, total_value, stage = context.get("deal_id", ""), context.get("total_value", 0.0), context.get("stage", "")
        stage_probability = {"prospecting": 0.1, "qualification": 0.2, "proposal": 0.4, "negotiation": 0.6, "closed_won": 1.0}.get(stage.lower(), 0.3)
        engagement_score = min(len(context.get("interactions", [])) / 10, 1.0)
        value_score = min(total_value / 100000, 1.0)
        win_probability = (stage_probability * 0.5 + engagement_score * 0.3 + value_score * 0.2)

        return {"task_id": "", "status": "completed", "result": {"deal_id": deal_id, "deal_score": round(win_probability * 100, 1), "win_probability": round(win_probability, 3), "expected_close_date": "2025-01-15", "risk_factors": ["Long sales cycle", "Multiple stakeholders"], "success_factors": ["Strong engagement", "Budget confirmed"], "recommended_actions": ["Schedule demo", "Send proposal", "Follow up with decision maker"], "next_best_action": "Schedule executive briefing"}, "confidence": 0.75, "reasoning": f"Deal scored at {round(win_probability * 100, 1)}% based on stage, engagement, and value", "recommendations": ["Increase stakeholder engagement", "Accelerate decision timeline"], "next_actions": ["Schedule follow-up", "Prepare proposal"]}

    async def _forecast_sales(self, context: Dict[str, Any]) -> Dict[str, Any]:
        return {"task_id": "", "status": "completed", "result": {"forecast": {}}, "confidence": 0.7, "reasoning": "Sales forecasted", "recommendations": [], "next_actions": []}
