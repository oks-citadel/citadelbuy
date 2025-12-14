"""
Configuration Management for AI Agents Service
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings."""

    # Service Settings
    PORT: int = 8020
    LOG_LEVEL: str = "INFO"
    ENVIRONMENT: str = "development"

    # OpenAI Configuration
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4"
    OPENAI_MAX_TOKENS: int = 2000
    OPENAI_TEMPERATURE: float = 0.7

    # Anthropic Configuration
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-3-opus-20240229"
    ANTHROPIC_MAX_TOKENS: int = 4000

    # Redis Configuration
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    REDIS_SSL: bool = False

    # Database Configuration
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/broxiva"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10

    # Vector Store Configuration
    CHROMADB_HOST: str = "localhost"
    CHROMADB_PORT: int = 8000
    CHROMADB_COLLECTION: str = "ai_agents"

    # External Services
    FRAUD_DETECTION_SERVICE_URL: str = "http://localhost:8003"
    PRICING_SERVICE_URL: str = "http://localhost:8006"
    ANALYTICS_SERVICE_URL: str = "http://localhost:8007"

    # API Keys for External Services
    GOOGLE_TRANSLATE_API_KEY: Optional[str] = None
    DEEPL_API_KEY: Optional[str] = None

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000

    # Monitoring
    SENTRY_DSN: Optional[str] = None
    PROMETHEUS_ENABLED: bool = True

    # Feature Flags
    ENABLE_ASYNC_EXECUTION: bool = True
    ENABLE_CACHING: bool = True
    CACHE_TTL_SECONDS: int = 3600

    # Agent Configuration
    MAX_CONCURRENT_AGENTS: int = 5
    AGENT_TIMEOUT_SECONDS: int = 300
    ENABLE_AGENT_LOGGING: bool = True

    # Security
    API_KEY_HEADER: str = "X-API-Key"
    REQUIRE_API_KEY: bool = False  # Set to True in production
    ALLOWED_ORIGINS: str = "http://localhost:3000,https://broxiva.com"

    # Workflow Configuration
    DEFAULT_EXECUTION_MODE: str = "sequential"
    MAX_WORKFLOW_DURATION_SECONDS: int = 600

    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
