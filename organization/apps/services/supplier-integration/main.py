"""
Global Supplier Integration Service
FastAPI microservice for connecting to 25+ dropshipping providers
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from typing import Optional

from src.config import settings
from src.api import (
    suppliers_router,
    products_router,
    orders_router,
    inventory_router,
    tracking_router,
    sync_router,
    webhooks_router,
    pod_router,
)
from src.services.sync_scheduler import SyncScheduler
from src.database import init_db, close_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Scheduler instance
sync_scheduler: Optional[SyncScheduler] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    global sync_scheduler

    # Startup
    logger.info("Starting Supplier Integration Service...")
    await init_db()

    # Initialize sync scheduler
    sync_scheduler = SyncScheduler()
    await sync_scheduler.start()

    logger.info("Supplier Integration Service started successfully")

    yield

    # Shutdown
    logger.info("Shutting down Supplier Integration Service...")
    if sync_scheduler:
        await sync_scheduler.stop()
    await close_db()
    logger.info("Supplier Integration Service stopped")


# Create FastAPI app
app = FastAPI(
    title="Global Supplier Integration Service",
    description="""
    Unified API for connecting to 25+ global dropshipping suppliers.

    ## Supported Suppliers

    ### China + Global
    - AliExpress + DSers
    - Alibaba Wholesale
    - Temu/Pinduoduo
    - Banggood

    ### US/EU Fast Shipping
    - Spocket
    - Syncee
    - Modalyst
    - Wholesale2B

    ### Print on Demand (POD)
    - Printful
    - Printify
    - Gelato
    - AOP+
    - TeeSpring/Spring

    ### Automation / Multi-Source
    - CJdropshipping
    - Zendrop
    - AutoDS
    - Inventory Source
    - Dropified

    ### Africa & International
    - Jumia Marketplace
    - Konga Marketplace
    - Takealot
    - ShopaMagic
    - Expertnaire/Digistem
    """,
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(suppliers_router, prefix="/api/v1/suppliers", tags=["Suppliers"])
app.include_router(products_router, prefix="/api/v1/products", tags=["Products"])
app.include_router(orders_router, prefix="/api/v1/orders", tags=["Orders"])
app.include_router(inventory_router, prefix="/api/v1/inventory", tags=["Inventory"])
app.include_router(tracking_router, prefix="/api/v1/tracking", tags=["Tracking"])
app.include_router(sync_router, prefix="/api/v1/sync", tags=["Sync"])
app.include_router(webhooks_router, prefix="/api/v1/webhooks", tags=["Webhooks"])
app.include_router(pod_router, prefix="/api/v1/pod", tags=["Print on Demand"])


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "supplier-integration",
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Global Supplier Integration Service",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8010,
        reload=settings.DEBUG
    )
