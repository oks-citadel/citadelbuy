"""
Printful POD (Print on Demand) Connector
Handles integration with Printful API for custom product printing
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
import base64

from .base import (
    BaseSupplierConnector,
    SupplierType,
    SupplierProduct,
    SupplierOrder,
    InventoryUpdate,
    TrackingEvent,
    rate_limited,
)

logger = logging.getLogger(__name__)


class PrintfulConnector(BaseSupplierConnector):
    """
    Printful POD API Connector

    Supports:
    - POD product catalog
    - Design file upload
    - Mockup generation
    - Order placement with custom designs
    - Real-time order tracking
    - Warehouse selection (US, EU, etc.)
    """

    BASE_URL = "https://api.printful.com"

    def __init__(self, api_key: str):
        super().__init__(
            supplier_type=SupplierType.PRINTFUL,
            api_key=api_key,
            base_url=self.BASE_URL,
            rate_limit=120,
        )
        self.api_key = api_key

    def _get_default_headers(self) -> Dict[str, str]:
        """Get headers with Basic auth"""
        auth_string = base64.b64encode(f"{self.api_key}:".encode()).decode()
        return {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Basic {auth_string}",
        }

    async def authenticate(self) -> bool:
        """Verify API key is valid"""
        try:
            response = await self._make_request("GET", "/store")
            return "result" in response
        except Exception as e:
            logger.error(f"Authentication failed: {e}")
            return False

    async def refresh_token(self) -> Optional[str]:
        """Printful uses API keys, no refresh needed"""
        return self.api_key

    @rate_limited(max_calls=120, period=60)
    async def search_products(
        self,
        query: str,
        category: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
        **filters
    ) -> List[SupplierProduct]:
        """Search Printful catalog products"""
        try:
            response = await self._make_request("GET", "/products")
            products_data = response.get("result", [])

            # Filter by query
            query_lower = query.lower()
            filtered_products = [
                p for p in products_data
                if query_lower in p.get("title", "").lower()
                or query_lower in p.get("description", "").lower()
            ]

            # Filter by category
            if category:
                filtered_products = [
                    p for p in filtered_products
                    if p.get("type_name", "").lower() == category.lower()
                ]

            # Pagination
            start = (page - 1) * limit
            end = start + limit
            paginated = filtered_products[start:end]

            products = []
            for item in paginated:
                product = await self._parse_catalog_product(item)
                if product:
                    products.append(product)

            return products

        except Exception as e:
            logger.error(f"Product search failed: {e}")
            return []

    async def _parse_catalog_product(self, data: Dict[str, Any]) -> Optional[SupplierProduct]:
        """Parse Printful catalog product"""
        try:
            # Get product variants for pricing
            variants_response = await self._make_request(
                "GET", f"/products/{data.get('id')}"
            )
            variants = variants_response.get("result", {}).get("variants", [])

            # Get price range
            prices = [float(v.get("price", 0)) for v in variants if v.get("price")]
            min_price = min(prices) if prices else 0

            return SupplierProduct(
                external_id=str(data.get("id", "")),
                title=data.get("title", ""),
                description=data.get("description", ""),
                price=min_price,
                original_price=None,
                currency="USD",
                stock_quantity=999999,  # POD - always available
                images=[data.get("image", "")],
                videos=[],
                category=data.get("type_name"),
                subcategory=None,
                brand="Printful",
                sku=None,
                weight=None,
                weight_unit="oz",
                dimensions=None,
                shipping_cost=None,
                shipping_time_min=3,
                shipping_time_max=7,
                variants=[
                    {
                        "id": v.get("id"),
                        "name": v.get("name"),
                        "size": v.get("size"),
                        "color": v.get("color"),
                        "color_code": v.get("color_code"),
                        "price": float(v.get("price", 0)),
                        "in_stock": v.get("in_stock", True),
                    }
                    for v in variants
                ],
                attributes={
                    "model": data.get("model"),
                    "brand": data.get("brand"),
                    "origin_country": data.get("origin_country"),
                    "is_discontinued": data.get("is_discontinued", False),
                },
                rating=None,
                review_count=None,
                sales_count=None,
                url=f"https://www.printful.com/custom-products/{data.get('id')}",
                is_pod=True,
                pod_template={
                    "print_files": data.get("files", []),
                    "options": data.get("options", []),
                },
            )
        except Exception as e:
            logger.error(f"Failed to parse product: {e}")
            return None

    async def get_product(self, product_id: str) -> Optional[SupplierProduct]:
        """Get detailed product information"""
        try:
            response = await self._make_request("GET", f"/products/{product_id}")
            product_data = response.get("result", {}).get("product", {})
            variants = response.get("result", {}).get("variants", [])

            if product_data:
                prices = [float(v.get("price", 0)) for v in variants]
                min_price = min(prices) if prices else 0

                return SupplierProduct(
                    external_id=str(product_data.get("id", "")),
                    title=product_data.get("title", ""),
                    description=product_data.get("description", ""),
                    price=min_price,
                    original_price=None,
                    currency="USD",
                    stock_quantity=999999,
                    images=[product_data.get("image", "")],
                    videos=[],
                    category=product_data.get("type_name"),
                    subcategory=None,
                    brand="Printful",
                    sku=None,
                    weight=None,
                    weight_unit="oz",
                    dimensions=None,
                    shipping_cost=None,
                    shipping_time_min=3,
                    shipping_time_max=7,
                    variants=[
                        {
                            "id": v.get("id"),
                            "name": v.get("name"),
                            "size": v.get("size"),
                            "color": v.get("color"),
                            "price": float(v.get("price", 0)),
                        }
                        for v in variants
                    ],
                    attributes={},
                    rating=None,
                    review_count=None,
                    sales_count=None,
                    url=f"https://www.printful.com/custom-products/{product_id}",
                    is_pod=True,
                )

        except Exception as e:
            logger.error(f"Get product failed: {e}")

        return None

    async def get_product_variants(self, product_id: str) -> List[Dict[str, Any]]:
        """Get product variants"""
        try:
            response = await self._make_request("GET", f"/products/{product_id}")
            variants = response.get("result", {}).get("variants", [])

            return [
                {
                    "id": v.get("id"),
                    "external_id": str(v.get("id")),
                    "name": v.get("name"),
                    "size": v.get("size"),
                    "color": v.get("color"),
                    "color_code": v.get("color_code"),
                    "price": float(v.get("price", 0)),
                    "in_stock": v.get("in_stock", True),
                    "options": {
                        "size": v.get("size"),
                        "color": v.get("color"),
                    },
                }
                for v in variants
            ]

        except Exception as e:
            logger.error(f"Get variants failed: {e}")
            return []

    async def get_inventory(self, product_ids: List[str]) -> List[InventoryUpdate]:
        """POD products are always available"""
        return [
            InventoryUpdate(
                external_id=pid,
                sku=None,
                quantity=999999,
                is_in_stock=True,
                warehouse_id=None,
                warehouse_location="Multiple",
            )
            for pid in product_ids
        ]

    async def get_shipping_methods(
        self,
        product_id: str,
        country: str,
        quantity: int = 1
    ) -> List[Dict[str, Any]]:
        """Get shipping rates"""
        try:
            # Get variant for shipping calculation
            variants = await self.get_product_variants(product_id)
            if not variants:
                return []

            variant_id = variants[0]["id"]

            response = await self._make_request(
                "POST",
                "/shipping/rates",
                data={
                    "recipient": {
                        "country_code": country,
                    },
                    "items": [
                        {
                            "variant_id": variant_id,
                            "quantity": quantity,
                        }
                    ],
                }
            )

            rates = response.get("result", [])
            return [
                {
                    "method": rate.get("name"),
                    "code": rate.get("id"),
                    "price": float(rate.get("rate", 0)),
                    "currency": rate.get("currency", "USD"),
                    "estimated_days_min": rate.get("minDeliveryDays"),
                    "estimated_days_max": rate.get("maxDeliveryDays"),
                }
                for rate in rates
            ]

        except Exception as e:
            logger.error(f"Get shipping methods failed: {e}")
            return []

    async def calculate_shipping(
        self,
        product_id: str,
        country: str,
        quantity: int,
        shipping_method: str
    ) -> Dict[str, Any]:
        """Calculate shipping for specific method"""
        methods = await self.get_shipping_methods(product_id, country, quantity)

        for method in methods:
            if method["code"] == shipping_method or method["method"] == shipping_method:
                return method

        return {"error": "Shipping method not found"}

    async def place_order(
        self,
        items: List[Dict[str, Any]],
        shipping_address: Dict[str, str],
        shipping_method: str,
    ) -> SupplierOrder:
        """Place POD order"""
        order_items = []
        for item in items:
            order_item = {
                "variant_id": item.get("variant_id"),
                "quantity": item.get("quantity", 1),
                "files": item.get("files", []),  # Design files
            }

            # Add print files if provided
            if "design_url" in item:
                order_item["files"] = [
                    {
                        "url": item["design_url"],
                        "type": item.get("print_area", "front"),
                    }
                ]

            order_items.append(order_item)

        order_data = {
            "recipient": {
                "name": shipping_address.get("name", ""),
                "address1": shipping_address.get("address1", ""),
                "address2": shipping_address.get("address2", ""),
                "city": shipping_address.get("city", ""),
                "state_code": shipping_address.get("state", ""),
                "country_code": shipping_address.get("country", ""),
                "zip": shipping_address.get("postal_code", ""),
                "phone": shipping_address.get("phone", ""),
                "email": shipping_address.get("email", ""),
            },
            "items": order_items,
        }

        try:
            response = await self._make_request("POST", "/orders", data=order_data)
            result = response.get("result", {})

            return SupplierOrder(
                external_order_id=str(result.get("id", "")),
                status="PENDING",
                items=items,
                shipping_address=shipping_address,
                shipping_method=shipping_method,
                shipping_cost=float(result.get("costs", {}).get("shipping", 0)),
                total_cost=float(result.get("costs", {}).get("total", 0)),
                currency="USD",
                tracking_number=None,
                tracking_carrier=None,
                tracking_url=None,
                estimated_delivery=None,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )

        except Exception as e:
            logger.error(f"Place order failed: {e}")
            raise

    async def get_order(self, order_id: str) -> Optional[SupplierOrder]:
        """Get order details"""
        try:
            response = await self._make_request("GET", f"/orders/{order_id}")
            result = response.get("result", {})

            if result:
                # Map Printful status to standard
                status_map = {
                    "draft": "PENDING",
                    "pending": "SUBMITTED",
                    "failed": "FAILED",
                    "canceled": "CANCELLED",
                    "inprocess": "PROCESSING",
                    "onhold": "PROCESSING",
                    "partial": "PROCESSING",
                    "fulfilled": "SHIPPED",
                }

                shipments = result.get("shipments", [])
                tracking = shipments[0] if shipments else {}

                return SupplierOrder(
                    external_order_id=str(result.get("id", "")),
                    status=status_map.get(result.get("status"), "PENDING"),
                    items=[],
                    shipping_address=result.get("recipient", {}),
                    shipping_method=result.get("shipping"),
                    shipping_cost=float(result.get("costs", {}).get("shipping", 0)),
                    total_cost=float(result.get("costs", {}).get("total", 0)),
                    currency="USD",
                    tracking_number=tracking.get("tracking_number"),
                    tracking_carrier=tracking.get("carrier"),
                    tracking_url=tracking.get("tracking_url"),
                    estimated_delivery=None,
                    created_at=datetime.fromisoformat(result.get("created", datetime.utcnow().isoformat()).replace("Z", "+00:00")),
                    updated_at=datetime.fromisoformat(result.get("updated", datetime.utcnow().isoformat()).replace("Z", "+00:00")),
                )

        except Exception as e:
            logger.error(f"Get order failed: {e}")

        return None

    async def cancel_order(self, order_id: str) -> bool:
        """Cancel an order"""
        try:
            response = await self._make_request("DELETE", f"/orders/{order_id}")
            return response.get("code") == 200
        except Exception as e:
            logger.error(f"Cancel order failed: {e}")
            return False

    async def get_tracking(self, order_id: str) -> List[TrackingEvent]:
        """Get tracking events"""
        order = await self.get_order(order_id)
        if not order or not order.tracking_number:
            return []

        # Printful doesn't provide detailed tracking events via API
        # Return basic status
        return [
            TrackingEvent(
                timestamp=order.updated_at,
                status=order.status,
                description=f"Order status: {order.status}",
                location=None,
            )
        ]

    async def get_categories(self) -> List[Dict[str, Any]]:
        """Get product categories"""
        try:
            response = await self._make_request("GET", "/categories")
            categories = response.get("result", [])

            return [
                {
                    "id": cat.get("id"),
                    "name": cat.get("title"),
                    "parent_id": cat.get("parent_id"),
                    "image": cat.get("image_url"),
                }
                for cat in categories
            ]

        except Exception as e:
            logger.error(f"Get categories failed: {e}")
            return []

    # ============================================
    # POD-SPECIFIC METHODS
    # ============================================

    async def get_pod_products(self) -> List[Dict[str, Any]]:
        """Get all POD base products"""
        try:
            response = await self._make_request("GET", "/products")
            return response.get("result", [])
        except Exception as e:
            logger.error(f"Get POD products failed: {e}")
            return []

    async def get_pod_templates(self, product_id: str) -> List[Dict[str, Any]]:
        """Get print file templates for a product"""
        try:
            response = await self._make_request(
                "GET", f"/mockup-generator/templates/{product_id}"
            )
            return response.get("result", {}).get("templates", [])
        except Exception as e:
            logger.error(f"Get POD templates failed: {e}")
            return []

    async def create_pod_mockup(
        self,
        product_id: str,
        design_url: str,
        options: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate product mockup with design"""
        try:
            # Get variant ID
            variant_ids = options.get("variant_ids", [])
            if not variant_ids:
                variants = await self.get_product_variants(product_id)
                variant_ids = [v["id"] for v in variants[:3]]  # First 3 variants

            response = await self._make_request(
                "POST",
                "/mockup-generator/create-task/{product_id}",
                data={
                    "variant_ids": variant_ids,
                    "files": [
                        {
                            "placement": options.get("placement", "front"),
                            "image_url": design_url,
                            "position": options.get("position", {
                                "area_width": 1800,
                                "area_height": 2400,
                                "width": 1800,
                                "height": 1800,
                                "top": 300,
                                "left": 0,
                            }),
                        }
                    ],
                }
            )

            task_key = response.get("result", {}).get("task_key")

            # Poll for result
            import asyncio
            for _ in range(30):  # Max 30 attempts
                await asyncio.sleep(2)
                result = await self._make_request(
                    "GET", f"/mockup-generator/task?task_key={task_key}"
                )

                if result.get("result", {}).get("status") == "completed":
                    return {
                        "status": "completed",
                        "mockups": result.get("result", {}).get("mockups", []),
                    }
                elif result.get("result", {}).get("status") == "failed":
                    return {"status": "failed", "error": result.get("result", {}).get("error")}

            return {"status": "timeout"}

        except Exception as e:
            logger.error(f"Create mockup failed: {e}")
            return {"status": "error", "error": str(e)}

    async def submit_pod_design(
        self,
        product_id: str,
        design_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Submit design for production (creates sync product)"""
        try:
            response = await self._make_request(
                "POST",
                "/store/products",
                data={
                    "sync_product": {
                        "name": design_data.get("name", "Custom Product"),
                        "thumbnail": design_data.get("thumbnail_url"),
                    },
                    "sync_variants": [
                        {
                            "variant_id": v.get("variant_id"),
                            "retail_price": v.get("retail_price"),
                            "files": [
                                {
                                    "url": design_data.get("design_url"),
                                    "type": design_data.get("print_area", "front"),
                                }
                            ],
                        }
                        for v in design_data.get("variants", [])
                    ],
                }
            )

            return response.get("result", {})

        except Exception as e:
            logger.error(f"Submit POD design failed: {e}")
            return {"error": str(e)}

    async def get_warehouses(self) -> List[Dict[str, Any]]:
        """Get Printful warehouse locations"""
        return [
            {
                "id": "US",
                "name": "United States",
                "country": "US",
                "supports_fast_shipping": True,
            },
            {
                "id": "EU",
                "name": "Europe (Latvia)",
                "country": "LV",
                "supports_fast_shipping": True,
            },
            {
                "id": "AU",
                "name": "Australia",
                "country": "AU",
                "supports_fast_shipping": True,
            },
            {
                "id": "JP",
                "name": "Japan",
                "country": "JP",
                "supports_fast_shipping": True,
            },
        ]

    async def get_print_files(self, order_id: str) -> List[Dict[str, Any]]:
        """Get print files for an order"""
        try:
            response = await self._make_request(
                "GET", f"/orders/{order_id}/print-files"
            )
            return response.get("result", [])
        except Exception as e:
            logger.error(f"Get print files failed: {e}")
            return []
