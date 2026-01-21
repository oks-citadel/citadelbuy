"""
Enhanced Pricing & Profitability Advisor Agent with LLM Integration
Dynamic pricing, margin optimization, competitive pricing
"""

from typing import Dict, List, Any
from .base_agent_enhanced import BaseAgent
from ..utils.prompt_templates import PromptTemplates


class PricingProfitabilityAdvisorAgentEnhanced(BaseAgent):
    """AI agent for pricing optimization and profitability analysis with LLM."""

    def __init__(self, shared_memory):
        super().__init__(
            name="PricingProfitabilityAdvisorEnhanced",
            description="Optimizes pricing strategies and analyzes profitability across markets using AI",
            shared_memory=shared_memory
        )
        self.capabilities = [
            "dynamic_pricing",
            "margin_optimization",
            "competitive_pricing",
            "price_elasticity_analysis",
            "profitability_forecasting",
            "discount_optimization",
            "bundle_pricing",
            "ai_powered_recommendations"
        ]

    async def execute_task(
        self,
        task: str,
        context: Dict[str, Any],
        priority: str = "medium"
    ) -> Dict[str, Any]:
        """Execute pricing task using LLM."""
        task_id = await self._prepare_task(task, context, priority)

        try:
            # Route to appropriate handler
            if "optimize" in task.lower() or "price" in task.lower():
                result = await self._optimize_price_with_llm(context)
            elif "margin" in task.lower():
                result = await self._analyze_margin_with_llm(context)
            elif "competitive" in task.lower() or "competitor" in task.lower():
                result = await self._competitive_analysis_with_llm(context)
            else:
                result = await self._general_pricing_task_with_llm(task, context)

            await self._complete_task(task_id, result)
            return result

        except Exception as e:
            self.logger.error(f"Task execution failed: {e}")
            error_response = self._format_error_response(task_id, e, context)
            await self._complete_task(task_id, error_response, status="failed")
            return error_response

    async def _optimize_price_with_llm(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize pricing using LLM intelligence."""
        # Get prompt templates
        system_prompt, user_prompt = PromptTemplates.pricing_advisor(context)

        # Get output schema
        schema = PromptTemplates.get_structured_output_schema("pricing")

        try:
            # Call LLM with structured output
            llm_result = await self._call_llm_structured(
                prompt=user_prompt,
                output_schema=schema,
                system_prompt=system_prompt,
                temperature=0.3,  # Lower temperature for more deterministic pricing
                max_tokens=2000
            )

            # Enhance with calculated metrics
            enriched_result = await self._enrich_pricing_recommendation(llm_result, context)

            return {
                "task_id": "",
                "status": "completed",
                "result": enriched_result,
                "confidence": llm_result.get("confidence_score", 0.8),
                "reasoning": llm_result.get("reasoning", ""),
                "recommendations": llm_result.get("recommendations", []),
                "next_actions": llm_result.get("next_actions", []),
                "llm_metadata": {
                    "model_used": "AI-powered analysis",
                    "analysis_type": "structured"
                }
            }

        except Exception as e:
            self.logger.error(f"LLM pricing optimization failed: {e}")
            # Fallback to rule-based calculation
            return await self._fallback_price_optimization(context)

    async def _enrich_pricing_recommendation(
        self,
        llm_result: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Enrich LLM recommendation with calculated metrics."""
        product_id = context.get("product_id", "")
        current_price = context.get("current_price", 0.0)
        cost = context.get("cost", 0.0)
        recommended_price = llm_result.get("recommended_price", current_price)

        # Calculate additional metrics
        current_margin = (current_price - cost) / current_price if current_price > 0 else 0
        new_margin = (recommended_price - cost) / recommended_price if recommended_price > 0 else 0

        return {
            **llm_result,
            "product_id": product_id,
            "current_price": current_price,
            "recommended_price": recommended_price,
            "price_change": round(recommended_price - current_price, 2),
            "price_change_percent": round(
                ((recommended_price - current_price) / current_price * 100), 2
            ) if current_price > 0 else 0,
            "current_margin_percent": round(current_margin * 100, 2),
            "projected_margin_percent": round(new_margin * 100, 2),
            "margin_improvement": round((new_margin - current_margin) * 100, 2)
        }

    async def _analyze_margin_with_llm(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze profit margins using LLM."""
        system_prompt = """You are a pricing analyst specializing in margin optimization.
Analyze the provided cost and revenue data to identify opportunities for margin improvement."""

        user_prompt = f"""Analyze margin opportunities for this product data:
{context}

Provide:
1. Current margin analysis
2. Optimization opportunities
3. Cost reduction suggestions
4. Pricing recommendations
5. Action items

Format as JSON."""

        llm_response = await self._call_llm(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.4,
            max_tokens=1500
        )

        parsed = await self._parse_llm_response(
            llm_response,
            expected_keys=["margin_analysis", "opportunities", "recommendations"]
        )

        return {
            "task_id": "",
            "status": "completed",
            "result": parsed,
            "confidence": 0.85,
            "reasoning": "AI-powered margin analysis",
            "recommendations": parsed.get("recommendations", []),
            "next_actions": parsed.get("action_items", [])
        }

    async def _competitive_analysis_with_llm(
        self,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Perform competitive pricing analysis using LLM."""
        market_data = context.get("market_data", {})
        competitor_prices = market_data.get("competitor_prices", {})

        system_prompt = """You are a competitive pricing strategist.
Analyze competitor pricing and recommend optimal positioning."""

        user_prompt = f"""Analyze competitive landscape:

Our Price: {context.get('current_price', 0)}
Our Cost: {context.get('cost', 0)}

Competitor Prices:
{competitor_prices}

Market Data:
{market_data}

Provide competitive positioning strategy and optimal price point."""

        llm_response = await self._call_llm(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.5,
            max_tokens=1500
        )

        parsed = await self._parse_llm_response(llm_response)

        return {
            "task_id": "",
            "status": "completed",
            "result": parsed,
            "confidence": 0.8,
            "reasoning": "Competitive analysis completed",
            "recommendations": parsed.get("recommendations", []),
            "next_actions": ["Implement pricing changes", "Monitor competitor response"]
        }

    async def _general_pricing_task_with_llm(
        self,
        task: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle general pricing tasks using LLM."""
        system_prompt = PromptTemplates.get_base_system_prompt()

        user_prompt = f"""Task: {task}

Context:
{context}

Provide detailed analysis and recommendations in JSON format."""

        llm_response = await self._call_llm(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.6,
            max_tokens=2000
        )

        parsed = await self._parse_llm_response(llm_response)

        return {
            "task_id": "",
            "status": "completed",
            "result": parsed,
            "confidence": 0.75,
            "reasoning": "General pricing analysis",
            "recommendations": parsed.get("recommendations", []),
            "next_actions": parsed.get("next_actions", [])
        }

    async def _fallback_price_optimization(
        self,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Fallback rule-based pricing when LLM fails."""
        self.logger.info("Using fallback rule-based pricing")

        current_price = context.get("current_price", 0.0)
        cost = context.get("cost", 0.0)
        strategy = context.get("strategy", "dynamic")
        target_margin = context.get("target_margin", 0.30)

        # Simple rule-based calculation
        competitor_avg = context.get("market_data", {}).get("competitor_average", current_price)
        demand_factor = context.get("market_data", {}).get("demand_level", 1.0)

        if strategy == "competitive":
            optimal_price = competitor_avg * 0.95
        elif strategy == "premium":
            optimal_price = cost / (1 - 0.40)
        else:  # dynamic
            optimal_price = cost / (1 - target_margin)
            optimal_price = optimal_price * demand_factor

        return {
            "task_id": "",
            "status": "completed",
            "result": {
                "product_id": context.get("product_id", ""),
                "current_price": current_price,
                "recommended_price": round(optimal_price, 2),
                "strategy_used": f"{strategy} (fallback)",
                "note": "Using rule-based fallback due to LLM unavailability"
            },
            "confidence": 0.6,
            "reasoning": "Rule-based calculation (LLM fallback)",
            "recommendations": ["Review when LLM is available"],
            "next_actions": ["Implement price change", "Monitor performance"]
        }

    async def optimize_price(
        self,
        product_id: str,
        current_price: float,
        cost: float,
        market_data: Dict[str, Any],
        target_margin: float = None,
        strategy: str = "dynamic"
    ) -> Dict[str, Any]:
        """
        Public API for price optimization.

        Args:
            product_id: Product identifier
            current_price: Current product price
            cost: Product cost
            market_data: Market and competitor data
            target_margin: Target profit margin (0.0-1.0)
            strategy: Pricing strategy (dynamic/competitive/premium)

        Returns:
            Pricing recommendation
        """
        context = {
            "product_id": product_id,
            "current_price": current_price,
            "cost": cost,
            "market_data": market_data,
            "target_margin": target_margin or 0.30,
            "strategy": strategy
        }

        return await self.execute_task("Optimize product pricing", context)
