"""
Supplier Connectors Package
Provides unified access to 25+ global dropshipping suppliers
"""

from typing import Dict, Any, Optional
from .base import (
    BaseSupplierConnector,
    SupplierType,
    SupplierProduct,
    SupplierOrder,
    InventoryUpdate,
    TrackingEvent,
)
from .aliexpress import AliExpressConnector
from .printful import PrintfulConnector
from .cjdropshipping import CJDropshippingConnector
# Import other connectors as they're implemented
# from .alibaba import AlibabaConnector
# from .temu import TemuConnector
# from .spocket import SpocketConnector
# etc.


class SupplierConnectorFactory:
    """
    Factory for creating supplier connectors.
    Provides a unified interface to all supported suppliers.
    """

    _connectors: Dict[SupplierType, type] = {
        SupplierType.ALIEXPRESS: AliExpressConnector,
        SupplierType.PRINTFUL: PrintfulConnector,
        SupplierType.CJDROPSHIPPING: CJDropshippingConnector,
        # Add more as implemented
    }

    @classmethod
    def get_connector(
        cls,
        supplier_type: SupplierType,
        credentials: Dict[str, Any]
    ) -> Optional[BaseSupplierConnector]:
        """
        Create a connector instance for the specified supplier type.

        Args:
            supplier_type: The type of supplier
            credentials: API credentials for the supplier

        Returns:
            Configured connector instance or None if not supported
        """
        connector_class = cls._connectors.get(supplier_type)

        if not connector_class:
            return None

        # Map credentials to connector parameters
        if supplier_type == SupplierType.ALIEXPRESS:
            return AliExpressConnector(
                app_key=credentials.get("api_key"),
                app_secret=credentials.get("api_secret"),
                access_token=credentials.get("access_token"),
                refresh_token=credentials.get("refresh_token"),
            )

        elif supplier_type == SupplierType.PRINTFUL:
            return PrintfulConnector(
                api_key=credentials.get("api_key"),
            )

        elif supplier_type == SupplierType.CJDROPSHIPPING:
            return CJDropshippingConnector(
                api_key=credentials.get("api_key"),
                email=credentials.get("email"),
            )

        # Generic fallback
        return connector_class(**credentials)

    @classmethod
    def get_supported_suppliers(cls) -> list:
        """Get list of all supported supplier types"""
        return list(cls._connectors.keys())

    @classmethod
    def is_supported(cls, supplier_type: SupplierType) -> bool:
        """Check if a supplier type is supported"""
        return supplier_type in cls._connectors

    @classmethod
    def register_connector(
        cls,
        supplier_type: SupplierType,
        connector_class: type
    ):
        """Register a new connector class"""
        cls._connectors[supplier_type] = connector_class


# Export all
__all__ = [
    "BaseSupplierConnector",
    "SupplierType",
    "SupplierProduct",
    "SupplierOrder",
    "InventoryUpdate",
    "TrackingEvent",
    "SupplierConnectorFactory",
    "AliExpressConnector",
    "PrintfulConnector",
    "CJDropshippingConnector",
]


# ============================================
# SUPPLIER IMPLEMENTATION STATUS
# ============================================
#
# FULLY IMPLEMENTED:
# ✅ AliExpress/DSers - China + Global
# ✅ Printful - POD (Print on Demand)
# ✅ CJDropshipping - China + Global warehouses
#
# TO BE IMPLEMENTED (stubs available):
# 🔲 Alibaba Wholesale
# 🔲 Temu/Pinduoduo
# 🔲 Banggood
# 🔲 Spocket (US/EU fast shipping)
# 🔲 Syncee
# 🔲 Modalyst
# 🔲 Wholesale2B
# 🔲 Printify (POD)
# 🔲 Gelato (POD)
# 🔲 AOP+ (POD)
# 🔲 TeeSpring/Spring (POD)
# 🔲 Zendrop
# 🔲 AutoDS
# 🔲 Inventory Source
# 🔲 Dropified
# 🔲 Jumia (Africa)
# 🔲 Konga (Africa)
# 🔲 Takealot (Africa)
# 🔲 ShopaMagic
# 🔲 Expertnaire/Digistem
#
# Each connector follows the same BaseSupplierConnector interface,
# making them interchangeable and easy to aggregate.
# ============================================
