"""
AliExpress/DSers Supplier Connector
Handles integration with AliExpress dropshipping API
"""

import hashlib
import hmac
import time
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

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


class AliExpressConnector(BaseSupplierConnector):
    """
    AliExpress Dropshipping API Connector

    Supports:
    - Product search and import
    - Real-time inventory sync
    - Automated order placement
    - Order tracking
    - DSers integration
    """

    BASE_URL = "https://api-sg.aliexpress.com/sync"
    GATEWAY_URL = "https://eco.aliexpress.com/api"

    def __init__(
        self,
        app_key: str,
        app_secret: str,
        access_token: Optional[str] = None,
        refresh_token: Optional[str] = None,
    ):
        super().__init__(
            supplier_type=SupplierType.ALIEXPRESS,
            api_key=app_key,
            api_secret=app_secret,
            access_token=access_token,
            base_url=self.BASE_URL,
            rate_limit=50,
        )
        self.app_key = app_key
        self.app_secret = app_secret
        self.refresh_token = refresh_token

    def _generate_signature(self, params: Dict[str, Any]) -> str:
        """Generate API signature"""
        sorted_params = sorted(params.items())
        sign_str = self.app_secret
        for key, value in sorted_params:
            sign_str += f"{key}{value}"
        sign_str += self.app_secret
        return hashlib.md5(sign_str.encode()).hexdigest().upper()

    def _build_request_params(
        self,
        method: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Build request parameters with signature"""
        system_params = {
            "app_key": self.app_key,
            "timestamp": str(int(time.time() * 1000)),
            "sign_method": "md5",
            "method": method,
        }

        if self.access_token:
            system_params["session"] = self.access_token

        all_params = {**system_params, **params}
        all_params["sign"] = self._generate_signature(all_params)

        return all_params

    async def authenticate(self) -> bool:
        """Authenticate with AliExpress API"""
        try:
            # Test API connection
            params = self._build_request_params(
                "aliexpress.affiliate.link.generate",
                {"promotion_link_type": "0", "source_values": "https://www.aliexpress.com"}
            )
            response = await self._make_request("POST", "", params=params)
            return "error_response" not in response
        except Exception as e:
            logger.error(f"Authentication failed: {e}")
            return False

    async def refresh_token(self) -> Optional[str]:
        """Refresh access token"""
        if not self.refresh_token:
            return None

        try:
            params = {
                "client_id": self.app_key,
                "client_secret": self.app_secret,
                "grant_type": "refresh_token",
                "refresh_token": self.refresh_token,
            }

            response = await self._make_request(
                "POST",
                "/token/refresh",
                data=params
            )

            if "access_token" in response:
                self.access_token = response["access_token"]
                return self.access_token

        except Exception as e:
            logger.error(f"Token refresh failed: {e}")

        return None

    @rate_limited(max_calls=50, period=60)
    async def search_products(
        self,
        query: str,
        category: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
        **filters
    ) -> List[SupplierProduct]:
        """Search AliExpress products"""
        params = self._build_request_params(
            "aliexpress.affiliate.product.query",
            {
                "keywords": query,
                "page_no": page,
                "page_size": min(limit, 50),
                "target_currency": filters.get("currency", "USD"),
                "target_language": filters.get("language", "EN"),
                "sort": filters.get("sort", "SALE_PRICE_ASC"),
                "ship_to_country": filters.get("country", "US"),
            }
        )

        if category:
            params["category_ids"] = category

        # Price filters
        if "min_price" in filters:
            params["min_sale_price"] = filters["min_price"]
        if "max_price" in filters:
            params["max_sale_price"] = filters["max_price"]

        try:
            response = await self._make_request("POST", "", params=params)
            result = response.get("aliexpress_affiliate_product_query_response", {})
            products_data = result.get("resp_result", {}).get("result", {}).get("products", {}).get("product", [])

            products = []
            for item in products_data:
                product = self._parse_product(item)
                if product:
                    products.append(product)

            return products

        except Exception as e:
            logger.error(f"Product search failed: {e}")
            return []

    def _parse_product(self, data: Dict[str, Any]) -> Optional[SupplierProduct]:
        """Parse AliExpress product data to standard format"""
        try:
            images = []
            if "product_main_image_url" in data:
                images.append(data["product_main_image_url"])
            if "product_small_image_urls" in data:
                small_images = data["product_small_image_urls"].get("string", [])
                images.extend(small_images if isinstance(small_images, list) else [small_images])

            return SupplierProduct(
                external_id=str(data.get("product_id", "")),
                title=data.get("product_title", ""),
                description=data.get("product_detail_url", ""),
                price=float(data.get("target_sale_price", 0)),
                original_price=float(data.get("target_original_price", 0)) if data.get("target_original_price") else None,
                currency=data.get("target_sale_price_currency", "USD"),
                stock_quantity=100,  # AliExpress doesn't always provide stock
                images=images,
                videos=[],
                category=data.get("first_level_category_name"),
                subcategory=data.get("second_level_category_name"),
                brand=None,
                sku=None,
                weight=None,
                weight_unit="kg",
                dimensions=None,
                shipping_cost=None,
                shipping_time_min=data.get("ship_to_days_min"),
                shipping_time_max=data.get("ship_to_days_max"),
                variants=[],
                attributes={
                    "discount": data.get("discount"),
                    "commission_rate": data.get("commission_rate"),
                    "hot_product_commission_rate": data.get("hot_product_commission_rate"),
                    "lastest_volume": data.get("lastest_volume"),
                },
                rating=float(data.get("evaluate_rate", "0").replace("%", "")) / 20 if data.get("evaluate_rate") else None,
                review_count=None,
                sales_count=data.get("lastest_volume"),
                url=data.get("product_detail_url"),
            )
        except Exception as e:
            logger.error(f"Failed to parse product: {e}")
            return None

    @rate_limited(max_calls=50, period=60)
    async def get_product(self, product_id: str) -> Optional[SupplierProduct]:
        """Get detailed product information"""
        params = self._build_request_params(
            "aliexpress.affiliate.productdetail.get",
            {
                "product_ids": product_id,
                "target_currency": "USD",
                "target_language": "EN",
            }
        )

        try:
            response = await self._make_request("POST", "", params=params)
            result = response.get("aliexpress_affiliate_productdetail_get_response", {})
            products = result.get("resp_result", {}).get("result", {}).get("products", {}).get("product", [])

            if products:
                return self._parse_product(products[0])

        except Exception as e:
            logger.error(f"Get product failed: {e}")

        return None

    async def get_product_variants(self, product_id: str) -> List[Dict[str, Any]]:
        """Get product variants/SKUs"""
        params = self._build_request_params(
            "aliexpress.ds.product.get",
            {"product_id": product_id}
        )

        try:
            response = await self._make_request("POST", "", params=params)
            result = response.get("aliexpress_ds_product_get_response", {})
            sku_list = result.get("result", {}).get("ae_item_sku_info_dtos", {}).get("ae_item_sku_info_dto", [])

            variants = []
            for sku in sku_list:
                variant = {
                    "id": sku.get("sku_id"),
                    "sku": sku.get("sku_code"),
                    "price": float(sku.get("sku_price", 0)),
                    "stock": int(sku.get("sku_stock", 0)),
                    "options": {},
                }

                # Parse SKU attributes
                attrs = sku.get("ae_sku_property_dtos", {}).get("ae_sku_property_dto", [])
                for attr in attrs:
                    variant["options"][attr.get("sku_property_name", "")] = attr.get("sku_property_value", "")

                variants.append(variant)

            return variants

        except Exception as e:
            logger.error(f"Get variants failed: {e}")
            return []

    async def get_inventory(self, product_ids: List[str]) -> List[InventoryUpdate]:
        """Get inventory levels for multiple products"""
        inventory_updates = []

        for product_id in product_ids:
            try:
                variants = await self.get_product_variants(product_id)
                total_stock = sum(v.get("stock", 0) for v in variants)

                inventory_updates.append(InventoryUpdate(
                    external_id=product_id,
                    sku=None,
                    quantity=total_stock,
                    is_in_stock=total_stock > 0,
                    warehouse_id=None,
                    warehouse_location="China",
                ))

            except Exception as e:
                logger.error(f"Failed to get inventory for {product_id}: {e}")

        return inventory_updates

    async def get_shipping_methods(
        self,
        product_id: str,
        country: str,
        quantity: int = 1
    ) -> List[Dict[str, Any]]:
        """Get available shipping methods"""
        params = self._build_request_params(
            "aliexpress.logistics.buyer.freight.calculate",
            {
                "product_id": product_id,
                "country_code": country,
                "send_goods_country_code": "CN",
                "product_num": quantity,
            }
        )

        try:
            response = await self._make_request("POST", "", params=params)
            result = response.get("aliexpress_logistics_buyer_freight_calculate_response", {})
            freights = result.get("result", {}).get("aeop_freight_calculate_result_for_buyer_d_t_o_list", {})
            freight_list = freights.get("aeop_freight_calculate_result_for_buyer_dto", [])

            methods = []
            for freight in freight_list:
                methods.append({
                    "method": freight.get("service_name"),
                    "code": freight.get("service_name"),
                    "price": float(freight.get("freight", {}).get("amount", 0)),
                    "currency": freight.get("freight", {}).get("currency_code", "USD"),
                    "estimated_days_min": freight.get("estimated_delivery_time"),
                    "estimated_days_max": freight.get("estimated_delivery_time"),
                    "tracking_available": freight.get("tracking_available", False),
                })

            return methods

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
        """Calculate shipping cost for specific method"""
        methods = await self.get_shipping_methods(product_id, country, quantity)

        for method in methods:
            if method["method"] == shipping_method or method["code"] == shipping_method:
                return method

        return {"error": "Shipping method not found"}

    async def place_order(
        self,
        items: List[Dict[str, Any]],
        shipping_address: Dict[str, str],
        shipping_method: str,
    ) -> SupplierOrder:
        """Place order on AliExpress"""
        params = self._build_request_params(
            "aliexpress.ds.order.create",
            {
                "param_place_order_request4_open_api_d_t_o": json.dumps({
                    "product_items": items,
                    "logistics_address": {
                        "address": shipping_address.get("address1", ""),
                        "address2": shipping_address.get("address2", ""),
                        "city": shipping_address.get("city", ""),
                        "contact_person": shipping_address.get("name", ""),
                        "country": shipping_address.get("country", ""),
                        "full_name": shipping_address.get("name", ""),
                        "mobile_no": shipping_address.get("phone", ""),
                        "phone_country": shipping_address.get("phone_country", "+1"),
                        "province": shipping_address.get("state", ""),
                        "zip": shipping_address.get("postal_code", ""),
                    }
                })
            }
        )

        try:
            response = await self._make_request("POST", "", params=params)
            result = response.get("aliexpress_ds_order_create_response", {})
            order_data = result.get("result", {})

            if order_data.get("is_success"):
                return SupplierOrder(
                    external_order_id=str(order_data.get("order_list", [{}])[0].get("order_id", "")),
                    status="PENDING",
                    items=items,
                    shipping_address=shipping_address,
                    shipping_method=shipping_method,
                    shipping_cost=0,
                    total_cost=0,
                    currency="USD",
                    tracking_number=None,
                    tracking_carrier=None,
                    tracking_url=None,
                    estimated_delivery=None,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
            else:
                raise Exception(f"Order failed: {order_data.get('error_msg', 'Unknown error')}")

        except Exception as e:
            logger.error(f"Place order failed: {e}")
            raise

    async def get_order(self, order_id: str) -> Optional[SupplierOrder]:
        """Get order details"""
        params = self._build_request_params(
            "aliexpress.ds.order.get",
            {"order_id": order_id}
        )

        try:
            response = await self._make_request("POST", "", params=params)
            result = response.get("aliexpress_ds_order_get_response", {})
            order_data = result.get("result", {})

            if order_data:
                # Map AliExpress status to standard status
                status_map = {
                    "PLACE_ORDER_SUCCESS": "SUBMITTED",
                    "IN_CANCEL": "CANCELLED",
                    "WAIT_SELLER_SEND_GOODS": "PROCESSING",
                    "SELLER_PART_SEND_GOODS": "PROCESSING",
                    "WAIT_BUYER_ACCEPT_GOODS": "SHIPPED",
                    "FINISH": "DELIVERED",
                }

                return SupplierOrder(
                    external_order_id=order_id,
                    status=status_map.get(order_data.get("order_status"), "PENDING"),
                    items=[],
                    shipping_address={},
                    shipping_method=order_data.get("logistics_service_name"),
                    shipping_cost=float(order_data.get("logistics_amount", {}).get("amount", 0)),
                    total_cost=float(order_data.get("order_amount", {}).get("amount", 0)),
                    currency=order_data.get("order_amount", {}).get("currency_code", "USD"),
                    tracking_number=order_data.get("logistics_info_list", [{}])[0].get("logistics_no") if order_data.get("logistics_info_list") else None,
                    tracking_carrier=order_data.get("logistics_info_list", [{}])[0].get("logistics_service") if order_data.get("logistics_info_list") else None,
                    tracking_url=None,
                    estimated_delivery=None,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )

        except Exception as e:
            logger.error(f"Get order failed: {e}")

        return None

    async def cancel_order(self, order_id: str) -> bool:
        """Cancel an order"""
        # Note: AliExpress has limited cancellation support
        logger.warning(f"Order cancellation requested for {order_id}")
        return False

    async def get_tracking(self, order_id: str) -> List[TrackingEvent]:
        """Get tracking events for order"""
        params = self._build_request_params(
            "aliexpress.logistics.ds.trackinginfo.query",
            {"order_id": order_id}
        )

        try:
            response = await self._make_request("POST", "", params=params)
            result = response.get("aliexpress_logistics_ds_trackinginfo_query_response", {})
            tracking_data = result.get("result", {}).get("details", {}).get("detail", [])

            events = []
            for event in tracking_data:
                events.append(TrackingEvent(
                    timestamp=datetime.strptime(event.get("event_date", ""), "%Y-%m-%d %H:%M:%S") if event.get("event_date") else datetime.utcnow(),
                    status=event.get("event_desc", ""),
                    description=event.get("event_desc", ""),
                    location=event.get("address"),
                ))

            return events

        except Exception as e:
            logger.error(f"Get tracking failed: {e}")
            return []

    async def get_categories(self) -> List[Dict[str, Any]]:
        """Get AliExpress categories"""
        params = self._build_request_params(
            "aliexpress.affiliate.category.get",
            {}
        )

        try:
            response = await self._make_request("POST", "", params=params)
            result = response.get("aliexpress_affiliate_category_get_response", {})
            categories = result.get("resp_result", {}).get("result", {}).get("categories", {}).get("category", [])

            return [
                {
                    "id": cat.get("category_id"),
                    "name": cat.get("category_name"),
                    "parent_id": cat.get("parent_category_id"),
                }
                for cat in categories
            ]

        except Exception as e:
            logger.error(f"Get categories failed: {e}")
            return []

    async def get_trending_products(
        self,
        category: Optional[str] = None,
        limit: int = 50
    ) -> List[SupplierProduct]:
        """Get hot selling products"""
        params = self._build_request_params(
            "aliexpress.affiliate.hotproduct.query",
            {
                "page_no": 1,
                "page_size": min(limit, 50),
                "target_currency": "USD",
                "target_language": "EN",
                "sort": "LAST_VOLUME_DESC",
            }
        )

        if category:
            params["category_ids"] = category

        try:
            response = await self._make_request("POST", "", params=params)
            result = response.get("aliexpress_affiliate_hotproduct_query_response", {})
            products_data = result.get("resp_result", {}).get("result", {}).get("products", {}).get("product", [])

            products = []
            for item in products_data:
                product = self._parse_product(item)
                if product:
                    products.append(product)

            return products

        except Exception as e:
            logger.error(f"Get trending products failed: {e}")
            return []
