"""
Configuration for Supplier Integration Service
"""

from pydantic_settings import BaseSettings
from typing import List, Optional
import os


class Settings(BaseSettings):
    """Application settings"""

    # Service
    DEBUG: bool = False
    SERVICE_NAME: str = "supplier-integration"
    API_VERSION: str = "v1"

    # Database
    DATABASE_URL: str = "postgresql://citadelbuy:citadelbuy123@localhost:5432/citadelbuy_dev"
    REDIS_URL: str = "redis://localhost:6379"

    # Message Queue
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672/"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:4000"]

    # Encryption
    ENCRYPTION_KEY: str = "your-encryption-key-32-bytes-here"

    # ============================================
    # SUPPLIER API CREDENTIALS
    # ============================================

    # AliExpress
    ALIEXPRESS_APP_KEY: Optional[str] = None
    ALIEXPRESS_APP_SECRET: Optional[str] = None
    ALIEXPRESS_ACCESS_TOKEN: Optional[str] = None

    # Alibaba
    ALIBABA_APP_KEY: Optional[str] = None
    ALIBABA_APP_SECRET: Optional[str] = None

    # Temu/Pinduoduo
    TEMU_CLIENT_ID: Optional[str] = None
    TEMU_CLIENT_SECRET: Optional[str] = None

    # Banggood
    BANGGOOD_APP_ID: Optional[str] = None
    BANGGOOD_APP_SECRET: Optional[str] = None

    # Spocket
    SPOCKET_API_KEY: Optional[str] = None

    # Syncee
    SYNCEE_API_KEY: Optional[str] = None

    # Modalyst
    MODALYST_API_KEY: Optional[str] = None

    # Wholesale2B
    WHOLESALE2B_API_KEY: Optional[str] = None

    # Printful
    PRINTFUL_API_KEY: Optional[str] = None

    # Printify
    PRINTIFY_API_KEY: Optional[str] = None

    # Gelato
    GELATO_API_KEY: Optional[str] = None

    # AOP+
    AOPPLUS_API_KEY: Optional[str] = None

    # TeeSpring/Spring
    SPRING_API_KEY: Optional[str] = None

    # CJdropshipping
    CJDROPSHIPPING_API_KEY: Optional[str] = None
    CJDROPSHIPPING_EMAIL: Optional[str] = None

    # Zendrop
    ZENDROP_API_KEY: Optional[str] = None

    # AutoDS
    AUTODS_API_KEY: Optional[str] = None

    # Inventory Source
    INVENTORY_SOURCE_API_KEY: Optional[str] = None

    # Dropified
    DROPIFIED_API_KEY: Optional[str] = None

    # Jumia
    JUMIA_API_KEY: Optional[str] = None
    JUMIA_SELLER_ID: Optional[str] = None

    # Konga
    KONGA_API_KEY: Optional[str] = None

    # Takealot
    TAKEALOT_API_KEY: Optional[str] = None

    # ============================================
    # SYNC SETTINGS
    # ============================================

    INVENTORY_SYNC_INTERVAL_MINUTES: int = 30
    PRICE_SYNC_INTERVAL_MINUTES: int = 60
    CATALOG_SYNC_INTERVAL_HOURS: int = 24
    TRACKING_SYNC_INTERVAL_MINUTES: int = 15

    # Rate Limiting
    DEFAULT_RATE_LIMIT: int = 100  # requests per minute
    RATE_LIMIT_WINDOW: int = 60  # seconds

    # Retry Settings
    MAX_RETRIES: int = 3
    RETRY_DELAY_SECONDS: int = 5

    # ============================================
    # AI SERVICE
    # ============================================

    AI_SERVICE_URL: str = "http://localhost:8001"
    OPENAI_API_KEY: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
