"""
LLM Client for OpenAI and Anthropic with Rate Limiting and Retry Logic
"""

from typing import Optional, Dict, Any, List
import logging
import os
import asyncio
from datetime import datetime, timedelta
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)
import anthropic
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic

logger = logging.getLogger(__name__)


class RateLimiter:
    """Token bucket rate limiter for API calls."""

    def __init__(self, requests_per_minute: int = 60, requests_per_hour: int = 1000):
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.minute_tokens = requests_per_minute
        self.hour_tokens = requests_per_hour
        self.last_minute_refill = datetime.now()
        self.last_hour_refill = datetime.now()
        self._lock = asyncio.Lock()

    async def acquire(self):
        """Acquire a token, waiting if necessary."""
        async with self._lock:
            await self._refill_tokens()

            # Wait if we're out of tokens
            while self.minute_tokens <= 0 or self.hour_tokens <= 0:
                await asyncio.sleep(0.1)
                await self._refill_tokens()

            self.minute_tokens -= 1
            self.hour_tokens -= 1

    async def _refill_tokens(self):
        """Refill tokens based on elapsed time."""
        now = datetime.now()

        # Refill minute tokens
        if (now - self.last_minute_refill).total_seconds() >= 60:
            self.minute_tokens = self.requests_per_minute
            self.last_minute_refill = now

        # Refill hour tokens
        if (now - self.last_hour_refill).total_seconds() >= 3600:
            self.hour_tokens = self.requests_per_hour
            self.last_hour_refill = now


class LLMResponse:
    """Standardized LLM response."""

    def __init__(
        self,
        content: str,
        model: str,
        usage: Dict[str, int],
        finish_reason: str = "stop",
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.content = content
        self.model = model
        self.usage = usage
        self.finish_reason = finish_reason
        self.metadata = metadata or {}
        self.timestamp = datetime.now().isoformat()


class LLMClient:
    """Client for interacting with Large Language Models."""

    def __init__(
        self,
        provider: str = "anthropic",
        fallback_provider: str = "openai",
        requests_per_minute: int = 60,
        requests_per_hour: int = 1000
    ):
        """
        Initialize LLM client.

        Args:
            provider: Primary provider ("anthropic" or "openai")
            fallback_provider: Fallback provider if primary fails
            requests_per_minute: Rate limit per minute
            requests_per_hour: Rate limit per hour
        """
        self.provider = provider
        self.fallback_provider = fallback_provider
        self.rate_limiter = RateLimiter(requests_per_minute, requests_per_hour)

        # Initialize clients
        self.anthropic_client = None
        self.openai_client = None

        self._initialize_clients()

        # Statistics
        self.stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "anthropic_requests": 0,
            "openai_requests": 0,
            "total_tokens": 0,
            "fallback_used": 0
        }

    def _initialize_clients(self):
        """Initialize API clients for both providers."""
        # Initialize Anthropic
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        if anthropic_key:
            try:
                self.anthropic_client = AsyncAnthropic(api_key=anthropic_key)
                logger.info("Anthropic client initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize Anthropic client: {e}")
        else:
            logger.warning("ANTHROPIC_API_KEY not found")

        # Initialize OpenAI
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            try:
                self.openai_client = AsyncOpenAI(api_key=openai_key)
                logger.info("OpenAI client initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAI client: {e}")
        else:
            logger.warning("OPENAI_API_KEY not found")

    async def generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        system_prompt: Optional[str] = None,
        use_fallback: bool = True
    ) -> LLMResponse:
        """
        Generate text using the LLM.

        Args:
            prompt: The user prompt
            model: Model to use (default from env)
            temperature: Sampling temperature (0.0-1.0)
            max_tokens: Maximum tokens to generate
            system_prompt: Optional system prompt
            use_fallback: Whether to use fallback provider on failure

        Returns:
            LLMResponse object

        Raises:
            Exception: If both primary and fallback providers fail
        """
        await self.rate_limiter.acquire()
        self.stats["total_requests"] += 1

        try:
            # Try primary provider
            response = await self._generate_with_provider(
                provider=self.provider,
                prompt=prompt,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                system_prompt=system_prompt
            )
            self.stats["successful_requests"] += 1
            return response

        except Exception as primary_error:
            logger.warning(f"Primary provider ({self.provider}) failed: {primary_error}")

            if use_fallback and self.fallback_provider != self.provider:
                try:
                    logger.info(f"Attempting fallback to {self.fallback_provider}")
                    self.stats["fallback_used"] += 1

                    response = await self._generate_with_provider(
                        provider=self.fallback_provider,
                        prompt=prompt,
                        model=model,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        system_prompt=system_prompt
                    )
                    self.stats["successful_requests"] += 1
                    return response

                except Exception as fallback_error:
                    logger.error(f"Fallback provider ({self.fallback_provider}) also failed: {fallback_error}")
                    self.stats["failed_requests"] += 1
                    raise Exception(f"Both providers failed. Primary: {primary_error}, Fallback: {fallback_error}")
            else:
                self.stats["failed_requests"] += 1
                raise

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((anthropic.RateLimitError, anthropic.APIConnectionError))
    )
    async def _generate_with_provider(
        self,
        provider: str,
        prompt: str,
        model: Optional[str],
        temperature: float,
        max_tokens: int,
        system_prompt: Optional[str]
    ) -> LLMResponse:
        """Generate with specified provider with retry logic."""
        if provider == "anthropic":
            return await self._generate_anthropic(
                prompt, model, temperature, max_tokens, system_prompt
            )
        elif provider == "openai":
            return await self._generate_openai(
                prompt, model, temperature, max_tokens, system_prompt
            )
        else:
            raise ValueError(f"Unknown provider: {provider}")

    async def _generate_anthropic(
        self,
        prompt: str,
        model: Optional[str],
        temperature: float,
        max_tokens: int,
        system_prompt: Optional[str]
    ) -> LLMResponse:
        """Generate using Anthropic Claude."""
        if not self.anthropic_client:
            raise Exception("Anthropic client not initialized")

        model = model or os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")

        # Clamp temperature to Anthropic's range (0-1)
        temperature = max(0.0, min(1.0, temperature))

        try:
            message = await self.anthropic_client.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt or "You are a helpful AI assistant for the Broxiva e-commerce platform.",
                messages=[{"role": "user", "content": prompt}]
            )

            self.stats["anthropic_requests"] += 1
            self.stats["total_tokens"] += message.usage.input_tokens + message.usage.output_tokens

            content = message.content[0].text if message.content else ""

            return LLMResponse(
                content=content,
                model=model,
                usage={
                    "prompt_tokens": message.usage.input_tokens,
                    "completion_tokens": message.usage.output_tokens,
                    "total_tokens": message.usage.input_tokens + message.usage.output_tokens
                },
                finish_reason=message.stop_reason or "stop",
                metadata={
                    "provider": "anthropic",
                    "message_id": message.id
                }
            )

        except anthropic.RateLimitError as e:
            logger.warning(f"Anthropic rate limit hit: {e}")
            raise
        except anthropic.APIConnectionError as e:
            logger.error(f"Anthropic connection error: {e}")
            raise
        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            raise

    async def _generate_openai(
        self,
        prompt: str,
        model: Optional[str],
        temperature: float,
        max_tokens: int,
        system_prompt: Optional[str]
    ) -> LLMResponse:
        """Generate using OpenAI."""
        if not self.openai_client:
            raise Exception("OpenAI client not initialized")

        model = model or os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")

        # Clamp temperature to OpenAI's range (0-2)
        temperature = max(0.0, min(2.0, temperature))

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            response = await self.openai_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )

            self.stats["openai_requests"] += 1
            if response.usage:
                self.stats["total_tokens"] += response.usage.total_tokens

            content = response.choices[0].message.content or ""

            return LLMResponse(
                content=content,
                model=model,
                usage={
                    "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                    "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                    "total_tokens": response.usage.total_tokens if response.usage else 0
                },
                finish_reason=response.choices[0].finish_reason or "stop",
                metadata={
                    "provider": "openai",
                    "message_id": response.id
                }
            )

        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise

    async def generate_structured(
        self,
        prompt: str,
        output_schema: Dict[str, Any],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate structured output conforming to a schema.

        Args:
            prompt: The user prompt
            output_schema: JSON schema for the expected output
            model: Model to use
            temperature: Sampling temperature
            max_tokens: Maximum tokens
            system_prompt: Optional system prompt

        Returns:
            Parsed structured output
        """
        import json

        # Add schema to system prompt
        schema_prompt = f"\n\nYou must respond with valid JSON that conforms to this schema:\n{json.dumps(output_schema, indent=2)}"
        full_system_prompt = (system_prompt or "") + schema_prompt

        response = await self.generate(
            prompt=prompt,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            system_prompt=full_system_prompt
        )

        try:
            # Parse JSON from response
            return json.loads(response.content)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            # Try to extract JSON from markdown code blocks
            import re
            json_match = re.search(r'```json\s*(.*?)\s*```', response.content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))
            raise

    async def batch_generate(
        self,
        prompts: List[str],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        system_prompt: Optional[str] = None
    ) -> List[LLMResponse]:
        """
        Generate responses for multiple prompts concurrently.

        Args:
            prompts: List of prompts
            model: Model to use
            temperature: Sampling temperature
            max_tokens: Maximum tokens per response
            system_prompt: Optional system prompt

        Returns:
            List of LLMResponse objects
        """
        tasks = [
            self.generate(
                prompt=prompt,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                system_prompt=system_prompt
            )
            for prompt in prompts
        ]

        return await asyncio.gather(*tasks, return_exceptions=True)

    def count_tokens(self, text: str, model: str = "gpt-4") -> int:
        """
        Estimate token count for text.

        Args:
            text: Text to count tokens for
            model: Model name (for provider-specific counting)

        Returns:
            Estimated token count
        """
        try:
            import tiktoken

            # Use tiktoken for accurate OpenAI token counting
            if "gpt" in model.lower():
                encoding = tiktoken.encoding_for_model(model)
                return len(encoding.encode(text))
            # Claude uses similar tokenization
            else:
                encoding = tiktoken.get_encoding("cl100k_base")
                return len(encoding.encode(text))
        except Exception as e:
            logger.warning(f"Token counting failed, using approximation: {e}")
            # Fallback to rough estimation: ~4 characters per token
            return len(text) // 4

    def truncate_to_tokens(self, text: str, max_tokens: int, model: str = "gpt-4") -> str:
        """
        Truncate text to fit within token limit.

        Args:
            text: Text to truncate
            max_tokens: Maximum token count
            model: Model name

        Returns:
            Truncated text
        """
        current_tokens = self.count_tokens(text, model)

        if current_tokens <= max_tokens:
            return text

        # Estimate character count to truncate
        ratio = max_tokens / current_tokens
        target_chars = int(len(text) * ratio * 0.95)  # 95% to be safe

        truncated = text[:target_chars]

        # Verify token count and adjust if needed
        while self.count_tokens(truncated, model) > max_tokens:
            truncated = truncated[:-100]  # Remove 100 chars at a time

        return truncated + "..."

    def get_stats(self) -> Dict[str, Any]:
        """Get usage statistics."""
        return {
            **self.stats,
            "success_rate": (
                self.stats["successful_requests"] / self.stats["total_requests"]
                if self.stats["total_requests"] > 0 else 0
            ),
            "fallback_rate": (
                self.stats["fallback_used"] / self.stats["total_requests"]
                if self.stats["total_requests"] > 0 else 0
            )
        }

    def reset_stats(self):
        """Reset usage statistics."""
        for key in self.stats:
            self.stats[key] = 0
