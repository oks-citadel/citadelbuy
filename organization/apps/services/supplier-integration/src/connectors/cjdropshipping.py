"""
CJDropshipping Connector
Handles integration with CJDropshipping API - one of the most popular dropshipping platforms
"""

import hashlib
import time
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


class CJDropshippingConnector(BaseSupplierConnector):
    """
    CJDropshipping API Connector

    Features:
    - Product sourcing from China & worldwide warehouses
    - Real-time inventory sync
    - Automated order fulfillment
    - Global tracking integration
    - Product sourcing requests
    - Sample ordering
    - Private label/custom packaging
    """

    BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1"

    def __init__(self, api_key: str, email: Optional[str] = None):
        super().__init__(
            supplier_type=SupplierType.CJDROPSHIPPING,
            api_key=api_key,
            base_url=self.BASE_URL,
            rate_limit=60,
        )
        self.email = email
        self._access_token: Optional[str] = None

    def _get_default_headers(self) -> Dict[str, str]:
        """Get headers with CJ auth"""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "CJ-Access-Token": self._access_token or self.api_key,
        }
        return headers

    async def authenticate(self) -> bool:
        """Get access token from CJ"""
        try:
            response = await self._make_request(
                "POST",
                "/authentication/getAccessToken",
                data={"email": self.email, "password": self.api_key}
            )

            if response.get("result"):
                self._access_token = response.get("data", {}).get("accessToken")
                return True
            return False

        except Exception as e:
            logger.error(f"Authentication failed: {e}")
            return False

    async def refresh_token(self) -> Optional[str]:
        """Refresh access token"""
        try:
            response = await self._make_request(
                "POST",
                "/authentication/refreshToken",
                data={"refreshToken": self._access_token}
            )

            if response.get("result"):
                self._access_token = response.get("data", {}).get("accessToken")
                return self._access_token

        except Exception as e:
            logger.error(f"Token refresh failed: {e}")

        return None

    @rate_limited(max_calls=60, period=60)
    async def search_products(
        self,
        query: str,
        category: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
        **filters
    ) -> List[SupplierProduct]:
        """Search CJ products"""
        params = {
            "productNameEn": query,
            "pageNum": page,
            "pageSize": min(limit, 200),
        }

        if category:
            params["categoryId"] = category

        # Price filters
        if "min_price" in filters:
            params["startPrice"] = filters["min_price"]
        if "max_price" in filters:
            params["endPrice"] = filters["max_price"]

        try:
            response = await self._make_request(
                "GET",
                "/product/list",
                params=params
            )

            products_data = response.get("data", {}).get("list", [])

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
        """Parse CJ product data"""
        try:
            images = []
            if data.get("productImage"):
                images.append(data["productImage"])
            if data.get("productImageSet"):
                images.extend(data["productImageSet"])

            return SupplierProduct(
                external_id=data.get("pid", ""),
                title=data.get("productNameEn", ""),
                description=data.get("description", ""),
                price=float(data.get("sellPrice", 0)),
                original_price=float(data.get("productPrice", 0)) if data.get("productPrice") else None,
                currency="USD",
                stock_quantity=int(data.get("productStock", 0)),
                images=images,
                videos=[data.get("productVideo")] if data.get("productVideo") else [],
                category=data.get("categoryName"),
                subcategory=None,
                brand=None,
                sku=data.get("productSku"),
                weight=float(data.get("productWeight", 0)) if data.get("productWeight") else None,
                weight_unit="g",
                dimensions={
                    "length": float(data.get("packingLength", 0)),
                    "width": float(data.get("packingWidth", 0)),
                    "height": float(data.get("packingHeight", 0)),
                } if data.get("packingLength") else None,
                shipping_cost=None,
                shipping_time_min=data.get("deliveryDays"),
                shipping_time_max=None,
                variants=[],
                attributes={
                    "material": data.get("materialEn"),
                    "color": data.get("color"),
                    "size": data.get("size"),
                    "listedNum": data.get("listedNum"),
                },
                rating=None,
                review_count=None,
                sales_count=data.get("listedNum"),
                url=data.get("productUrl"),
            )
        except Exception as e:
            logger.error(f"Failed to parse product: {e}")
            return None

    async def get_product(self, product_id: str) -> Optional[SupplierProduct]:
        """Get detailed product info"""
        try:
            response = await self._make_request(
                "GET",
                "/product/query",
                params={"pid": product_id}
            )

            product_data = response.get("data")
            if product_data:
                return self._parse_product(product_data)

        except Exception as e:
            logger.error(f"Get product failed: {e}")

        return None

    async def get_product_variants(self, product_id: str) -> List[Dict[str, Any]]:
        """Get product variants"""
        try:
            response = await self._make_request(
                "GET",
                "/product/variant/query",
                params={"pid": product_id}
            )

            variants_data = response.get("data", [])

            return [
                {
                    "id": v.get("vid"),
                    "sku": v.get("variantSku"),
                    "name": v.get("variantNameEn"),
                    "price": float(v.get("variantSellPrice", 0)),
                    "stock": int(v.get("variantStock", 0)),
                    "weight": float(v.get("variantWeight", 0)) if v.get("variantWeight") else None,
                    "image": v.get("variantImage"),
                    "options": {
                        "color": v.get("variantColor"),
                        "size": v.get("variantSize"),
                    },
                    "in_stock": int(v.get("variantStock", 0)) > 0,
                }
                for v in variants_data
            ]

        except Exception as e:
            logger.error(f"Get variants failed: {e}")
            return []

    async def get_inventory(self, product_ids: List[str]) -> List[InventoryUpdate]:
        """Get inventory for multiple products"""
        inventory_updates = []

        for pid in product_ids:
            try:
                response = await self._make_request(
                    "GET",
                    "/product/stock",
                    params={"pid": pid}
                )

                stock_data = response.get("data", {})
                inventory_updates.append(InventoryUpdate(
                    external_id=pid,
                    sku=stock_data.get("productSku"),
                    quantity=int(stock_data.get("stock", 0)),
                    is_in_stock=int(stock_data.get("stock", 0)) > 0,
                    warehouse_id=stock_data.get("warehouseId"),
                    warehouse_location=stock_data.get("warehouseLocation"),
                ))

            except Exception as e:
                logger.error(f"Failed to get inventory for {pid}: {e}")

        return inventory_updates

    async def get_shipping_methods(
        self,
        product_id: str,
        country: str,
        quantity: int = 1
    ) -> List[Dict[str, Any]]:
        """Get shipping methods from CJ"""
        try:
            # Get product weight first
            product = await self.get_product(product_id)
            weight = product.weight if product and product.weight else 100  # Default 100g

            response = await self._make_request(
                "POST",
                "/logistic/freightCalculate",
                data={
                    "startCountryCode": "CN",
                    "endCountryCode": country,
                    "productWeight": weight * quantity,
                    "productVolume": 0,
                }
            )

            logistics = response.get("data", [])

            return [
                {
                    "method": l.get("logisticName"),
                    "code": l.get("logisticId"),
                    "price": float(l.get("logisticPrice", 0)),
                    "currency": "USD",
                    "estimated_days_min": l.get("logisticAging"),
                    "estimated_days_max": l.get("logisticAging"),
                    "tracking_available": l.get("isTracked", False),
                    "warehouse": l.get("warehouseId"),
                }
                for l in logistics
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
        """Calculate specific shipping cost"""
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
        """Place order on CJ"""
        order_products = []
        for item in items:
            order_products.append({
                "vid": item.get("variant_id"),
                "quantity": item.get("quantity", 1),
            })

        order_data = {
            "orderNumber": f"CB-{int(time.time())}",
            "shippingZip": shipping_address.get("postal_code", ""),
            "shippingCountryCode": shipping_address.get("country", ""),
            "shippingCountry": shipping_address.get("country_name", ""),
            "shippingProvince": shipping_address.get("state", ""),
            "shippingCity": shipping_address.get("city", ""),
            "shippingAddress": shipping_address.get("address1", ""),
            "shippingAddress2": shipping_address.get("address2", ""),
            "shippingCustomerName": shipping_address.get("name", ""),
            "shippingPhone": shipping_address.get("phone", ""),
            "logisticName": shipping_method,
            "products": order_products,
        }

        try:
            response = await self._make_request(
                "POST",
                "/shopping/order/createOrder",
                data=order_data
            )

            result = response.get("data", {})

            if response.get("result"):
                return SupplierOrder(
                    external_order_id=str(result.get("orderId", "")),
                    status="SUBMITTED",
                    items=items,
                    shipping_address=shipping_address,
                    shipping_method=shipping_method,
                    shipping_cost=float(result.get("shippingCost", 0)),
                    total_cost=float(result.get("orderAmount", 0)),
                    currency="USD",
                    tracking_number=None,
                    tracking_carrier=None,
                    tracking_url=None,
                    estimated_delivery=None,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
            else:
                raise Exception(f"Order failed: {response.get('message', 'Unknown error')}")

        except Exception as e:
            logger.error(f"Place order failed: {e}")
            raise

    async def get_order(self, order_id: str) -> Optional[SupplierOrder]:
        """Get order details"""
        try:
            response = await self._make_request(
                "GET",
                "/shopping/order/getOrderDetail",
                params={"orderId": order_id}
            )

            data = response.get("data", {})

            if data:
                status_map = {
                    "0": "PENDING",
                    "1": "PROCESSING",
                    "2": "SHIPPED",
                    "3": "DELIVERED",
                    "-1": "CANCELLED",
                }

                return SupplierOrder(
                    external_order_id=str(data.get("orderId", "")),
                    status=status_map.get(str(data.get("orderStatus")), "PENDING"),
                    items=[],
                    shipping_address={},
                    shipping_method=data.get("logisticName"),
                    shipping_cost=float(data.get("shippingCost", 0)),
                    total_cost=float(data.get("orderAmount", 0)),
                    currency="USD",
                    tracking_number=data.get("trackNumber"),
                    tracking_carrier=data.get("logisticName"),
                    tracking_url=data.get("trackUrl"),
                    estimated_delivery=None,
                    created_at=datetime.fromisoformat(data.get("createDate", datetime.utcnow().isoformat())) if data.get("createDate") else datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )

        except Exception as e:
            logger.error(f"Get order failed: {e}")

        return None

    async def cancel_order(self, order_id: str) -> bool:
        """Cancel an order"""
        try:
            response = await self._make_request(
                "POST",
                "/shopping/order/cancelOrder",
                data={"orderId": order_id}
            )
            return response.get("result", False)
        except Exception as e:
            logger.error(f"Cancel order failed: {e}")
            return False

    async def get_tracking(self, order_id: str) -> List[TrackingEvent]:
        """Get tracking events"""
        try:
            response = await self._make_request(
                "GET",
                "/logistic/getTrackInfo",
                params={"orderId": order_id}
            )

            tracking_data = response.get("data", {}).get("trackInfo", [])

            events = []
            for event in tracking_data:
                events.append(TrackingEvent(
                    timestamp=datetime.fromisoformat(event.get("date", datetime.utcnow().isoformat())),
                    status=event.get("status", ""),
                    description=event.get("content", ""),
                    location=event.get("location"),
                ))

            return events

        except Exception as e:
            logger.error(f"Get tracking failed: {e}")
            return []

    async def get_categories(self) -> List[Dict[str, Any]]:
        """Get product categories"""
        try:
            response = await self._make_request(
                "GET",
                "/product/getCategory"
            )

            categories = response.get("data", [])

            return [
                {
                    "id": cat.get("categoryId"),
                    "name": cat.get("categoryNameEn"),
                    "parent_id": cat.get("parentId"),
                    "level": cat.get("level"),
                }
                for cat in categories
            ]

        except Exception as e:
            logger.error(f"Get categories failed: {e}")
            return []

    async def get_warehouses(self) -> List[Dict[str, Any]]:
        """Get CJ warehouse locations"""
        try:
            response = await self._make_request(
                "GET",
                "/logistic/getWarehouseList"
            )

            warehouses = response.get("data", [])

            return [
                {
                    "id": w.get("warehouseId"),
                    "name": w.get("warehouseName"),
                    "country": w.get("warehouseCountry"),
                    "country_code": w.get("warehouseCountryCode"),
                    "supports_fast_shipping": w.get("isFastShipping", False),
                }
                for w in warehouses
            ]

        except Exception as e:
            logger.error(f"Get warehouses failed: {e}")
            return []

    async def get_trending_products(
        self,
        category: Optional[str] = None,
        limit: int = 50
    ) -> List[SupplierProduct]:
        """Get trending/hot products"""
        params = {
            "pageNum": 1,
            "pageSize": min(limit, 200),
            "sortBy": "listedNum",  # Sort by sales
            "sortType": "desc",
        }

        if category:
            params["categoryId"] = category

        try:
            response = await self._make_request(
                "GET",
                "/product/list",
                params=params
            )

            products_data = response.get("data", {}).get("list", [])

            products = []
            for item in products_data:
                product = self._parse_product(item)
                if product:
                    products.append(product)

            return products

        except Exception as e:
            logger.error(f"Get trending products failed: {e}")
            return []

    async def order_sample(
        self,
        product_id: str,
        variant_id: Optional[str],
        shipping_address: Dict[str, str]
    ) -> SupplierOrder:
        """Order a product sample"""
        items = [
            {
                "variant_id": variant_id or product_id,
                "quantity": 1,
            }
        ]

        # Use cheapest shipping for samples
        methods = await self.get_shipping_methods(
            product_id,
            shipping_address.get("country", "US"),
            1
        )

        if methods:
            cheapest = min(methods, key=lambda x: x.get("price", float("inf")))
            return await self.place_order(items, shipping_address, cheapest["code"])

        raise Exception("No shipping methods available")

    async def source_product(
        self,
        product_url: str,
        quantity: int = 1
    ) -> Dict[str, Any]:
        """Request product sourcing (for products not in CJ catalog)"""
        try:
            response = await self._make_request(
                "POST",
                "/product/createSourcingRequest",
                data={
                    "productUrl": product_url,
                    "quantity": quantity,
                }
            )

            return response.get("data", {})

        except Exception as e:
            logger.error(f"Product sourcing request failed: {e}")
            return {"error": str(e)}

    async def get_private_label_options(self, product_id: str) -> Dict[str, Any]:
        """Get private label/custom packaging options"""
        try:
            response = await self._make_request(
                "GET",
                "/product/getCustomPackageOptions",
                params={"pid": product_id}
            )

            return response.get("data", {})

        except Exception as e:
            logger.error(f"Get private label options failed: {e}")
            return {}
