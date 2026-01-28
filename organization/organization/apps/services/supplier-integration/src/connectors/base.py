"""
Base Supplier Connector
Abstract base class for all supplier integrations
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
import aiohttp
import asyncio
import logging
from functools import wraps
import time

logger = logging.getLogger(__name__)


class SupplierType(str, Enum):
    """Supported supplier types"""
    ALIEXPRESS = "ALIEXPRESS"
    ALIBABA = "ALIBABA"
    TEMU = "TEMU"
    BANGGOOD = "BANGGOOD"
    SPOCKET = "SPOCKET"
    SYNCEE = "SYNCEE"
    MODALYST = "MODALYST"
    WHOLESALE2B = "WHOLESALE2B"
    PRINTFUL = "PRINTFUL"
    PRINTIFY = "PRINTIFY"
    GELATO = "GELATO"
    AOPPLUS = "AOPPLUS"
    SPRING = "SPRING"
    CJDROPSHIPPING = "CJDROPSHIPPING"
    ZENDROP = "ZENDROP"
    AUTODS = "AUTODS"
    INVENTORY_SOURCE = "INVENTORY_SOURCE"
    DROPIFIED = "DROPIFIED"
    JUMIA = "JUMIA"
    KONGA = "KONGA"
    TAKEALOT = "TAKEALOT"
    SHOPAMAGIC = "SHOPAMAGIC"
    EXPERTNAIRE = "EXPERTNAIRE"
    CUSTOM_API = "CUSTOM_API"


@dataclass
class SupplierProduct:
    """Standardized product data structure"""
    external_id: str
    title: str
    description: Optional[str]
    price: float
    original_price: Optional[float]
    currency: str
    stock_quantity: int
    images: List[str]
    videos: List[str]
    category: Optional[str]
    subcategory: Optional[str]
    brand: Optional[str]
    sku: Optional[str]
    weight: Optional[float]
    weight_unit: Optional[str]
    dimensions: Optional[Dict[str, float]]
    shipping_cost: Optional[float]
    shipping_time_min: Optional[int]
    shipping_time_max: Optional[int]
    variants: List[Dict[str, Any]]
    attributes: Dict[str, Any]
    rating: Optional[float]
    review_count: Optional[int]
    sales_count: Optional[int]
    url: Optional[str]
    is_pod: bool = False
    pod_template: Optional[Dict[str, Any]] = None


@dataclass
class SupplierOrder:
    """Standardized order data structure"""
    external_order_id: str
    status: str
    items: List[Dict[str, Any]]
    shipping_address: Dict[str, str]
    shipping_method: Optional[str]
    shipping_cost: float
    total_cost: float
    currency: str
    tracking_number: Optional[str]
    tracking_carrier: Optional[str]
    tracking_url: Optional[str]
    estimated_delivery: Optional[datetime]
    created_at: datetime
    updated_at: datetime


@dataclass
class InventoryUpdate:
    """Inventory update data structure"""
    external_id: str
    sku: Optional[str]
    quantity: int
    is_in_stock: bool
    warehouse_id: Optional[str]
    warehouse_location: Optional[str]


@dataclass
class TrackingEvent:
    """Tracking event data structure"""
    timestamp: datetime
    status: str
    description: str
    location: Optional[str]


def rate_limited(max_calls: int, period: int = 60):
    """Rate limiting decorator"""
    calls = []

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            now = time.time()
            # Remove old calls
            calls[:] = [c for c in calls if c > now - period]

            if len(calls) >= max_calls:
                sleep_time = period - (now - calls[0])
                logger.warning(f"Rate limit reached, sleeping for {sleep_time:.2f}s")
                await asyncio.sleep(sleep_time)

            calls.append(time.time())
            return await func(*args, **kwargs)
        return wrapper
    return decorator


class BaseSupplierConnector(ABC):
    """
    Abstract base class for all supplier connectors.
    Each supplier must implement these methods.
    """

    def __init__(
        self,
        supplier_type: SupplierType,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        access_token: Optional[str] = None,
        base_url: Optional[str] = None,
        rate_limit: int = 100,
    ):
        self.supplier_type = supplier_type
        self.api_key = api_key
        self.api_secret = api_secret
        self.access_token = access_token
        self.base_url = base_url
        self.rate_limit = rate_limit
        self._session: Optional[aiohttp.ClientSession] = None
        self._last_request_time = 0
        self._request_count = 0

    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.disconnect()

    async def connect(self):
        """Initialize connection"""
        if not self._session:
            self._session = aiohttp.ClientSession(
                headers=self._get_default_headers()
            )
        logger.info(f"Connected to {self.supplier_type.value}")

    async def disconnect(self):
        """Close connection"""
        if self._session:
            await self._session.close()
            self._session = None
        logger.info(f"Disconnected from {self.supplier_type.value}")

    def _get_default_headers(self) -> Dict[str, str]:
        """Get default HTTP headers"""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        data: Optional[Dict] = None,
        headers: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Make HTTP request with retry logic"""
        if not self._session:
            await self.connect()

        url = f"{self.base_url}{endpoint}"
        request_headers = {**self._get_default_headers(), **(headers or {})}

        for attempt in range(3):
            try:
                async with self._session.request(
                    method,
                    url,
                    params=params,
                    json=data,
                    headers=request_headers,
                ) as response:
                    response_data = await response.json()

                    if response.status >= 400:
                        raise Exception(f"API error: {response.status} - {response_data}")

                    return response_data

            except aiohttp.ClientError as e:
                logger.error(f"Request failed (attempt {attempt + 1}): {e}")
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)
                else:
                    raise

    # ============================================
    # ABSTRACT METHODS - Must be implemented
    # ============================================

    @abstractmethod
    async def authenticate(self) -> bool:
        """Authenticate with the supplier API"""
        pass

    @abstractmethod
    async def refresh_token(self) -> Optional[str]:
        """Refresh authentication token if needed"""
        pass

    @abstractmethod
    async def search_products(
        self,
        query: str,
        category: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
        **filters
    ) -> List[SupplierProduct]:
        """Search for products"""
        pass

    @abstractmethod
    async def get_product(self, product_id: str) -> Optional[SupplierProduct]:
        """Get product details"""
        pass

    @abstractmethod
    async def get_product_variants(self, product_id: str) -> List[Dict[str, Any]]:
        """Get product variants"""
        pass

    @abstractmethod
    async def get_inventory(self, product_ids: List[str]) -> List[InventoryUpdate]:
        """Get inventory levels for products"""
        pass

    @abstractmethod
    async def get_shipping_methods(
        self,
        product_id: str,
        country: str,
        quantity: int = 1
    ) -> List[Dict[str, Any]]:
        """Get available shipping methods"""
        pass

    @abstractmethod
    async def calculate_shipping(
        self,
        product_id: str,
        country: str,
        quantity: int,
        shipping_method: str
    ) -> Dict[str, Any]:
        """Calculate shipping cost"""
        pass

    @abstractmethod
    async def place_order(
        self,
        items: List[Dict[str, Any]],
        shipping_address: Dict[str, str],
        shipping_method: str,
    ) -> SupplierOrder:
        """Place an order with the supplier"""
        pass

    @abstractmethod
    async def get_order(self, order_id: str) -> Optional[SupplierOrder]:
        """Get order details"""
        pass

    @abstractmethod
    async def cancel_order(self, order_id: str) -> bool:
        """Cancel an order"""
        pass

    @abstractmethod
    async def get_tracking(self, order_id: str) -> List[TrackingEvent]:
        """Get tracking information"""
        pass

    @abstractmethod
    async def get_categories(self) -> List[Dict[str, Any]]:
        """Get product categories"""
        pass

    # ============================================
    # OPTIONAL METHODS - Override if supported
    # ============================================

    async def get_trending_products(
        self,
        category: Optional[str] = None,
        limit: int = 50
    ) -> List[SupplierProduct]:
        """Get trending/hot products"""
        raise NotImplementedError("Trending products not supported")

    async def get_warehouses(self) -> List[Dict[str, Any]]:
        """Get warehouse locations"""
        return []

    async def order_sample(
        self,
        product_id: str,
        variant_id: Optional[str],
        shipping_address: Dict[str, str]
    ) -> SupplierOrder:
        """Order a product sample"""
        raise NotImplementedError("Sample ordering not supported")

    # ============================================
    # POD SPECIFIC - Override for POD suppliers
    # ============================================

    async def get_pod_products(self) -> List[Dict[str, Any]]:
        """Get available POD base products"""
        raise NotImplementedError("POD not supported")

    async def get_pod_templates(self, product_id: str) -> List[Dict[str, Any]]:
        """Get POD templates for a product"""
        raise NotImplementedError("POD not supported")

    async def create_pod_mockup(
        self,
        product_id: str,
        design_url: str,
        options: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create POD mockup"""
        raise NotImplementedError("POD not supported")

    async def submit_pod_design(
        self,
        product_id: str,
        design_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Submit POD design for production"""
        raise NotImplementedError("POD not supported")

    # ============================================
    # WEBHOOK HANDLING
    # ============================================

    async def verify_webhook(
        self,
        payload: bytes,
        signature: str
    ) -> bool:
        """Verify webhook signature"""
        return True  # Override in subclass

    async def process_webhook(
        self,
        event_type: str,
        payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process incoming webhook"""
        logger.info(f"Processing webhook: {event_type}")
        return {"status": "processed"}
