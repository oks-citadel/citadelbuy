"""
Shared Memory - Context and state management across agents
Uses in-memory storage with Redis backing (production)
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import json
import logging

logger = logging.getLogger(__name__)


class SharedMemory:
    """Shared memory for agent coordination and context sharing."""

    def __init__(self, redis_client=None):
        self.redis_client = redis_client
        self.memory_store: Dict[str, Any] = {}
        self.task_store: Dict[str, Dict] = {}
        self.context_store: Dict[str, Dict] = {}
        self.agent_state: Dict[str, Dict] = {}
        self.conversation_history: Dict[str, List] = {}

    async def store_task(self, task_id: str, task_data: Dict[str, Any]):
        """Store task information."""
        self.task_store[task_id] = {
            **task_data,
            "stored_at": datetime.utcnow().isoformat()
        }

        # Store in Redis if available
        if self.redis_client:
            try:
                await self.redis_client.setex(
                    f"task:{task_id}",
                    timedelta(days=7),
                    json.dumps(task_data)
                )
            except Exception as e:
                logger.warning(f"Redis storage failed: {e}")

        logger.debug(f"Stored task {task_id}")

    async def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve task information."""
        # Try in-memory first
        if task_id in self.task_store:
            return self.task_store[task_id]

        # Try Redis
        if self.redis_client:
            try:
                data = await self.redis_client.get(f"task:{task_id}")
                if data:
                    return json.loads(data)
            except Exception as e:
                logger.warning(f"Redis retrieval failed: {e}")

        return None

    async def update_task(self, task_id: str, update_data: Dict[str, Any]):
        """Update task information."""
        if task_id in self.task_store:
            self.task_store[task_id].update(update_data)
            self.task_store[task_id]["updated_at"] = datetime.utcnow().isoformat()

        if self.redis_client:
            try:
                existing = await self.redis_client.get(f"task:{task_id}")
                if existing:
                    data = json.loads(existing)
                    data.update(update_data)
                    await self.redis_client.setex(
                        f"task:{task_id}",
                        timedelta(days=7),
                        json.dumps(data)
                    )
            except Exception as e:
                logger.warning(f"Redis update failed: {e}")

    async def store_context(self, context_id: str, context_data: Dict[str, Any]):
        """Store context information for agent coordination."""
        self.context_store[context_id] = {
            **context_data,
            "stored_at": datetime.utcnow().isoformat()
        }

        if self.redis_client:
            try:
                await self.redis_client.setex(
                    f"context:{context_id}",
                    timedelta(hours=24),
                    json.dumps(context_data)
                )
            except Exception as e:
                logger.warning(f"Redis context storage failed: {e}")

        logger.debug(f"Stored context {context_id}")

    async def get_context(self, context_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve context information."""
        # Try in-memory
        if context_id in self.context_store:
            return self.context_store[context_id]

        # Try Redis
        if self.redis_client:
            try:
                data = await self.redis_client.get(f"context:{context_id}")
                if data:
                    return json.loads(data)
            except Exception as e:
                logger.warning(f"Redis context retrieval failed: {e}")

        return None

    async def store_agent_state(self, agent_name: str, state: Dict[str, Any]):
        """Store agent state."""
        self.agent_state[agent_name] = {
            **state,
            "updated_at": datetime.utcnow().isoformat()
        }

    async def get_agent_state(self, agent_name: str) -> Optional[Dict[str, Any]]:
        """Get agent state."""
        return self.agent_state.get(agent_name)

    async def add_to_conversation(
        self,
        conversation_id: str,
        agent_name: str,
        message: str,
        metadata: Optional[Dict] = None
    ):
        """Add message to conversation history."""
        if conversation_id not in self.conversation_history:
            self.conversation_history[conversation_id] = []

        self.conversation_history[conversation_id].append({
            "agent": agent_name,
            "message": message,
            "metadata": metadata or {},
            "timestamp": datetime.utcnow().isoformat()
        })

    async def get_conversation(self, conversation_id: str, limit: int = 50) -> List[Dict]:
        """Get conversation history."""
        history = self.conversation_history.get(conversation_id, [])
        return history[-limit:] if limit else history

    async def cleanup(self):
        """Cleanup old data."""
        cutoff_time = datetime.utcnow() - timedelta(days=7)

        # Clean old tasks
        to_remove = []
        for task_id, task_data in self.task_store.items():
            stored_at = datetime.fromisoformat(task_data.get("stored_at", ""))
            if stored_at < cutoff_time:
                to_remove.append(task_id)

        for task_id in to_remove:
            del self.task_store[task_id]

        logger.info(f"Cleaned up {len(to_remove)} old tasks")

    def get_stats(self) -> Dict[str, Any]:
        """Get memory statistics."""
        return {
            "tasks_stored": len(self.task_store),
            "contexts_stored": len(self.context_store),
            "agents_tracked": len(self.agent_state),
            "conversations": len(self.conversation_history),
            "total_messages": sum(len(conv) for conv in self.conversation_history.values())
        }
