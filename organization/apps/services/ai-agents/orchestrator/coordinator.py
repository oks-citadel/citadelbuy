"""
Agent Coordinator - Multi-agent orchestration and coordination
Manages agent selection, task routing, and result aggregation
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
import logging
import uuid

logger = logging.getLogger(__name__)


class AgentCoordinator:
    """Coordinates multiple agents for complex tasks."""

    def __init__(self, agents_registry: Dict, shared_memory):
        self.agents = agents_registry
        self.shared_memory = shared_memory
        self.active_tasks: Dict[str, Dict] = {}

    async def coordinate_task(
        self,
        task_description: str,
        context: Dict[str, Any],
        required_agents: Optional[List[str]] = None,
        execution_mode: str = "sequential"
    ) -> Dict[str, Any]:
        """
        Coordinate a multi-agent task.

        Args:
            task_description: Description of the overall task
            context: Task context and input data
            required_agents: List of agent names to use (auto-detect if None)
            execution_mode: 'sequential' or 'parallel'

        Returns:
            Aggregated results from all agents
        """
        coordination_id = str(uuid.uuid4())
        logger.info(f"Starting coordination {coordination_id}: {task_description}")

        # Auto-detect agents if not specified
        if not required_agents:
            required_agents = await self._select_agents(task_description, context)

        # Store coordination task
        coordination_task = {
            "coordination_id": coordination_id,
            "task": task_description,
            "agents": required_agents,
            "mode": execution_mode,
            "started_at": datetime.utcnow().isoformat(),
            "status": "running"
        }
        self.active_tasks[coordination_id] = coordination_task

        try:
            # Execute based on mode
            if execution_mode == "parallel":
                results = await self._execute_parallel(required_agents, task_description, context)
            else:
                results = await self._execute_sequential(required_agents, task_description, context)

            # Aggregate results
            aggregated = await self._aggregate_results(results, task_description)

            # Update coordination status
            coordination_task["status"] = "completed"
            coordination_task["completed_at"] = datetime.utcnow().isoformat()
            coordination_task["results"] = aggregated

            return aggregated

        except Exception as e:
            logger.error(f"Coordination {coordination_id} failed: {e}")
            coordination_task["status"] = "failed"
            coordination_task["error"] = str(e)
            raise

    async def _select_agents(self, task: str, context: Dict[str, Any]) -> List[str]:
        """Auto-select appropriate agents for a task."""
        selected = []

        task_lower = task.lower()

        # Task keyword to agent mapping
        if any(kw in task_lower for kw in ["market", "campaign", "advertis"]):
            selected.append("marketing")

        if any(kw in task_lower for kw in ["trade", "export", "import", "customs"]):
            selected.append("trade")

        if any(kw in task_lower for kw in ["price", "pricing", "margin", "profitability"]):
            selected.append("pricing")

        if any(kw in task_lower for kw in ["deal", "sales", "forecast"]):
            selected.append("sales")

        if any(kw in task_lower for kw in ["vendor", "supplier", "verification", "kyb"]):
            selected.append("vendor")

        if any(kw in task_lower for kw in ["compliance", "regulatory", "gdpr"]):
            selected.append("compliance")

        if any(kw in task_lower for kw in ["fraud", "risk", "security"]):
            selected.append("fraud")

        if any(kw in task_lower for kw in ["logistic", "shipping", "delivery"]):
            selected.append("logistics")

        if any(kw in task_lower for kw in ["competitor", "market intelligence"]):
            selected.append("competitor")

        if any(kw in task_lower for kw in ["content", "writing", "copy"]):
            selected.append("content")

        if any(kw in task_lower for kw in ["translation", "localization"]):
            selected.append("localization")

        if any(kw in task_lower for kw in ["conversion", "optimization", "ab test"]):
            selected.append("conversion")

        # Default to general agents if nothing specific matched
        if not selected:
            selected = ["marketing", "pricing"]

        logger.info(f"Auto-selected agents: {selected}")
        return selected

    async def _execute_sequential(
        self,
        agents: List[str],
        task: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute agents sequentially, passing context between them."""
        results = {}
        running_context = context.copy()

        for agent_name in agents:
            if agent_name not in self.agents:
                logger.warning(f"Agent {agent_name} not found, skipping")
                continue

            agent = self.agents[agent_name]
            logger.info(f"Executing agent: {agent_name}")

            try:
                result = await agent.execute_task(task, running_context, priority="medium")
                results[agent_name] = result

                # Update context for next agent with this agent's results
                if "result" in result:
                    running_context[f"{agent_name}_output"] = result["result"]

            except Exception as e:
                logger.error(f"Agent {agent_name} failed: {e}")
                results[agent_name] = {
                    "status": "failed",
                    "error": str(e)
                }

        return results

    async def _execute_parallel(
        self,
        agents: List[str],
        task: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute agents in parallel."""
        import asyncio

        async def execute_agent(agent_name: str):
            if agent_name not in self.agents:
                return None

            agent = self.agents[agent_name]
            try:
                result = await agent.execute_task(task, context, priority="medium")
                return (agent_name, result)
            except Exception as e:
                logger.error(f"Agent {agent_name} failed: {e}")
                return (agent_name, {"status": "failed", "error": str(e)})

        # Execute all agents concurrently
        tasks = [execute_agent(name) for name in agents]
        completed = await asyncio.gather(*tasks)

        # Collect results
        results = {}
        for item in completed:
            if item:
                agent_name, result = item
                results[agent_name] = result

        return results

    async def _aggregate_results(
        self,
        results: Dict[str, Any],
        task: str
    ) -> Dict[str, Any]:
        """Aggregate results from multiple agents."""
        # Calculate overall confidence
        confidences = []
        for agent_result in results.values():
            if isinstance(agent_result, dict) and "confidence" in agent_result:
                confidences.append(agent_result["confidence"])

        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.5

        # Collect all recommendations
        all_recommendations = []
        for agent_name, agent_result in results.items():
            if isinstance(agent_result, dict) and "recommendations" in agent_result:
                for rec in agent_result["recommendations"]:
                    all_recommendations.append(f"[{agent_name}] {rec}")

        # Collect all next actions
        all_actions = []
        for agent_name, agent_result in results.items():
            if isinstance(agent_result, dict) and "next_actions" in agent_result:
                for action in agent_result["next_actions"]:
                    all_actions.append(f"[{agent_name}] {action}")

        return {
            "coordination_successful": True,
            "agents_executed": list(results.keys()),
            "agent_results": results,
            "overall_confidence": round(avg_confidence, 3),
            "consolidated_recommendations": all_recommendations[:10],  # Top 10
            "consolidated_actions": all_actions[:10],  # Top 10
            "summary": self._generate_summary(results),
            "timestamp": datetime.utcnow().isoformat()
        }

    def _generate_summary(self, results: Dict[str, Any]) -> str:
        """Generate a summary of coordinated results."""
        successful = sum(1 for r in results.values() if isinstance(r, dict) and r.get("status") == "completed")
        total = len(results)

        summary = f"Coordinated {total} agents, {successful} completed successfully. "

        # Extract key insights
        insights = []
        for agent_name, result in results.items():
            if isinstance(result, dict) and "reasoning" in result:
                insights.append(f"{agent_name}: {result['reasoning'][:100]}")

        if insights:
            summary += "Key insights: " + "; ".join(insights[:3])

        return summary

    async def get_coordination_status(self, coordination_id: str) -> Optional[Dict]:
        """Get status of a coordination task."""
        return self.active_tasks.get(coordination_id)

    def get_active_coordinations(self) -> List[Dict]:
        """Get list of active coordinations."""
        return [
            {
                "coordination_id": cid,
                "task": task["task"],
                "status": task["status"],
                "agents": task["agents"]
            }
            for cid, task in self.active_tasks.items()
            if task.get("status") == "running"
        ]
