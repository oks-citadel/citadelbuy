"""LLM Client for OpenAI and Anthropic"""

from typing import Optional
import logging
import os

logger = logging.getLogger(__name__)


class LLMClient:
    """Client for interacting with Large Language Models."""

    def __init__(self, provider: str = "openai"):
        self.provider = provider
        self.api_key = self._get_api_key()
        self.client = self._initialize_client()

    def _get_api_key(self) -> str:
        """Get API key for the provider."""
        if self.provider == "openai":
            return os.getenv("OPENAI_API_KEY", "")
        elif self.provider == "anthropic":
            return os.getenv("ANTHROPIC_API_KEY", "")
        else:
            raise ValueError(f"Unknown provider: {self.provider}")

    def _initialize_client(self):
        """Initialize the LLM client."""
        try:
            if self.provider == "openai":
                import openai
                openai.api_key = self.api_key
                return openai
            elif self.provider == "anthropic":
                import anthropic
                return anthropic.Anthropic(api_key=self.api_key)
        except Exception as e:
            logger.warning(f"Failed to initialize {self.provider} client: {e}")
            return None

    async def generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Generate text using the LLM.

        Args:
            prompt: The user prompt
            model: Model to use (default from env)
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            system_prompt: Optional system prompt

        Returns:
            Generated text
        """
        if not self.client:
            logger.warning("LLM client not initialized, returning placeholder")
            return f"[LLM Response Placeholder] Prompt: {prompt[:100]}..."

        try:
            if self.provider == "openai":
                return await self._generate_openai(prompt, model, temperature, max_tokens, system_prompt)
            elif self.provider == "anthropic":
                return await self._generate_anthropic(prompt, model, temperature, max_tokens, system_prompt)
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            return f"Error generating response: {str(e)}"

    async def _generate_openai(
        self,
        prompt: str,
        model: Optional[str],
        temperature: float,
        max_tokens: int,
        system_prompt: Optional[str]
    ) -> str:
        """Generate using OpenAI."""
        model = model or os.getenv("OPENAI_MODEL", "gpt-4")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            response = await self.client.ChatCompletion.acreate(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise

    async def _generate_anthropic(
        self,
        prompt: str,
        model: Optional[str],
        temperature: float,
        max_tokens: int,
        system_prompt: Optional[str]
    ) -> str:
        """Generate using Anthropic Claude."""
        model = model or os.getenv("ANTHROPIC_MODEL", "claude-3-opus-20240229")

        try:
            message = await self.client.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt or "",
                messages=[{"role": "user", "content": prompt}]
            )
            return message.content[0].text
        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            raise

    def count_tokens(self, text: str) -> int:
        """Estimate token count for text."""
        # Rough estimation: ~4 characters per token
        return len(text) // 4

    def truncate_to_tokens(self, text: str, max_tokens: int) -> str:
        """Truncate text to fit within token limit."""
        estimated_tokens = self.count_tokens(text)
        if estimated_tokens <= max_tokens:
            return text

        # Truncate to approximately the right length
        chars_to_keep = max_tokens * 4
        return text[:chars_to_keep] + "..."
