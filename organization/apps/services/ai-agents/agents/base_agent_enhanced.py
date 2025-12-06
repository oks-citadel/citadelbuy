"""
Enhanced Base Agent Class with LLM Integration
Foundation for all AI agents in the CitadelBuy ecosystem
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid
import logging
import json
from enum import Enum

logger = logging.getLogger(__name__)


class AgentStatus(Enum):
    """Agent execution status."""
    IDLE = "idle"
    THINKING = "thinking"
    EXECUTING = "executing"
    WAITING = "waiting"
    COMPLETED = "completed"
    FAILED = "failed"


class Priority(Enum):
    """Task priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class BaseAgent(ABC):
    """Base class for all AI agents with LLM integration."""

    def __init__(self, name: str, description: str, shared_memory):
        self.name = name
        self.description = description
        self.shared_memory = shared_memory
        self.status = AgentStatus.IDLE
        self.capabilities: List[str] = []
        self.task_history: List[Dict[str, Any]] = []
        self.logger = logging.getLogger(f"agent.{name}")
        self._llm_client = None

    def _get_llm_client(self):
        """Lazy load LLM client."""
        if self._llm_client is None:
            from ..utils.llm_client import LLMClient
            self._llm_client = LLMClient(
                provider="anthropic",
                fallback_provider="openai"
            )
        return self._llm_client

    @abstractmethod
    async def execute_task(
        self,
        task: str,
        context: Dict[str, Any],
        priority: str = "medium"
    ) -> Dict[str, Any]:
        """
        Execute a task. Must be implemented by subclasses.

        Args:
            task: Task description
            context: Task context and input data
            priority: Task priority level

        Returns:
            Dict containing task results
        """
        pass

    async def _prepare_task(self, task: str, context: Dict[str, Any], priority: str) -> str:
        """Prepare task for execution."""
        task_id = str(uuid.uuid4())
        self.status = AgentStatus.THINKING

        # Store task in history
        task_record = {
            "task_id": task_id,
            "task": task,
            "context": context,
            "priority": priority,
            "started_at": datetime.utcnow().isoformat(),
            "status": "started"
        }
        self.task_history.append(task_record)

        # Store in shared memory for coordination
        await self.shared_memory.store_task(task_id, task_record)

        self.logger.info(f"Task {task_id} started: {task}")
        return task_id

    async def _complete_task(
        self,
        task_id: str,
        result: Dict[str, Any],
        status: str = "completed"
    ):
        """Mark task as completed."""
        self.status = AgentStatus.COMPLETED

        # Update task history
        for task in self.task_history:
            if task["task_id"] == task_id:
                task["status"] = status
                task["completed_at"] = datetime.utcnow().isoformat()
                task["result"] = result
                break

        # Update shared memory
        await self.shared_memory.update_task(task_id, {
            "status": status,
            "completed_at": datetime.utcnow().isoformat(),
            "result": result
        })

        self.logger.info(f"Task {task_id} {status}")

    async def _call_llm(
        self,
        prompt: str,
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        system_prompt: Optional[str] = None,
        use_fallback: bool = True
    ) -> Dict[str, Any]:
        """
        Call LLM (Anthropic/OpenAI) for AI reasoning.

        Args:
            prompt: User prompt
            model: Model name (defaults to env config)
            temperature: Sampling temperature
            max_tokens: Maximum tokens
            system_prompt: System prompt for context
            use_fallback: Whether to use fallback provider

        Returns:
            Dict with 'content', 'usage', 'model', 'metadata'
        """
        client = self._get_llm_client()

        try:
            response = await client.generate(
                prompt=prompt,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                system_prompt=system_prompt,
                use_fallback=use_fallback
            )

            return {
                "content": response.content,
                "usage": response.usage,
                "model": response.model,
                "metadata": response.metadata
            }

        except Exception as e:
            self.logger.error(f"LLM call failed: {e}")
            raise

    async def _call_llm_structured(
        self,
        prompt: str,
        output_schema: Dict[str, Any],
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Call LLM with structured JSON output.

        Args:
            prompt: User prompt
            output_schema: Expected JSON schema
            model: Model name
            temperature: Sampling temperature
            max_tokens: Maximum tokens
            system_prompt: System prompt

        Returns:
            Parsed JSON response
        """
        client = self._get_llm_client()

        try:
            result = await client.generate_structured(
                prompt=prompt,
                output_schema=output_schema,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                system_prompt=system_prompt
            )

            return result

        except Exception as e:
            self.logger.error(f"Structured LLM call failed: {e}")
            raise

    async def _parse_llm_response(
        self,
        response: Dict[str, Any],
        expected_keys: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Parse and validate LLM response.

        Args:
            response: LLM response dict
            expected_keys: Required keys in the response

        Returns:
            Validated response content
        """
        try:
            content = response.get("content", "")

            # Try to parse as JSON
            try:
                parsed = json.loads(content)

                # Validate expected keys
                if expected_keys:
                    missing_keys = [k for k in expected_keys if k not in parsed]
                    if missing_keys:
                        self.logger.warning(f"Missing expected keys in response: {missing_keys}")

                return parsed

            except json.JSONDecodeError:
                # Not JSON, return as text
                return {"content": content}

        except Exception as e:
            self.logger.error(f"Failed to parse LLM response: {e}")
            raise

    async def _retry_with_error_handling(
        self,
        func,
        max_retries: int = 3,
        *args,
        **kwargs
    ) -> Any:
        """
        Retry a function with exponential backoff.

        Args:
            func: Function to retry
            max_retries: Maximum number of retries
            *args: Function arguments
            **kwargs: Function keyword arguments

        Returns:
            Function result
        """
        import asyncio

        last_error = None

        for attempt in range(max_retries):
            try:
                return await func(*args, **kwargs)

            except Exception as e:
                last_error = e
                self.logger.warning(f"Attempt {attempt + 1}/{max_retries} failed: {e}")

                if attempt < max_retries - 1:
                    # Exponential backoff: 2^attempt seconds
                    wait_time = 2 ** attempt
                    self.logger.info(f"Retrying in {wait_time} seconds...")
                    await asyncio.sleep(wait_time)

        # All retries failed
        self.logger.error(f"All {max_retries} attempts failed")
        raise last_error

    async def _retrieve_context(self, context_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve context from shared memory."""
        return await self.shared_memory.get_context(context_id)

    async def _store_context(self, context_id: str, data: Dict[str, Any]):
        """Store context in shared memory."""
        await self.shared_memory.store_context(context_id, data)

    def _calculate_confidence(self, factors: Dict[str, float]) -> float:
        """Calculate confidence score based on multiple factors."""
        if not factors:
            return 0.5

        weights = {
            "data_quality": 0.3,
            "model_certainty": 0.3,
            "historical_accuracy": 0.2,
            "context_completeness": 0.2
        }

        confidence = 0.0
        for factor, value in factors.items():
            weight = weights.get(factor, 0.1)
            confidence += value * weight

        return min(max(confidence, 0.0), 1.0)

    def _format_error_response(
        self,
        task_id: str,
        error: Exception,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Format a standardized error response.

        Args:
            task_id: Task identifier
            error: Exception that occurred
            context: Additional context

        Returns:
            Standardized error response dict
        """
        return {
            "task_id": task_id,
            "status": "failed",
            "error": str(error),
            "error_type": type(error).__name__,
            "confidence": 0.0,
            "reasoning": f"Task failed due to: {str(error)}",
            "recommendations": ["Review error and retry", "Check input data"],
            "next_actions": ["Investigate error", "Contact support if issue persists"],
            "context": context or {}
        }

    def get_status(self) -> Dict[str, Any]:
        """Get current agent status."""
        llm_stats = {}
        if self._llm_client:
            llm_stats = self._llm_client.get_stats()

        return {
            "name": self.name,
            "status": self.status.value,
            "description": self.description,
            "capabilities": self.capabilities,
            "tasks_completed": len([t for t in self.task_history if t.get("status") == "completed"]),
            "tasks_failed": len([t for t in self.task_history if t.get("status") == "failed"]),
            "last_active": self.task_history[-1]["started_at"] if self.task_history else None,
            "llm_stats": llm_stats
        }

    def get_llm_stats(self) -> Dict[str, Any]:
        """Get LLM usage statistics."""
        if self._llm_client:
            return self._llm_client.get_stats()
        return {}
