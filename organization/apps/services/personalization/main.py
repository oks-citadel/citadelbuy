"""
Personalization Service - FastAPI Application

This service provides personalization capabilities including:
- User preferences management
- Product recommendations
- Content personalization
- User behavior tracking
- A/B testing support
"""

import os
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, List, Dict, Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query, Path, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# Configure structured logging
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FORMAT = os.getenv('LOG_FORMAT', 'json')


class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured JSON logging"""
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "service": "personalization-service",
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        if hasattr(record, 'extra_data'):
            log_data.update(record.extra_data)
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)


# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(getattr(logging, LOG_LEVEL))

if LOG_FORMAT == 'json':
    handler = logging.StreamHandler()
    handler.setFormatter(StructuredFormatter())
    logger.handlers = [handler]
else:
    logging.basicConfig(
        level=LOG_LEVEL,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

# CORS Configuration - Use specific origins instead of wildcard
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', '').split(',') if os.getenv('ALLOWED_ORIGINS') else [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost:8080",
    "https://broxiva.com",
    "https://admin.broxiva.com",
    "https://api.broxiva.com",
]

# In-memory storage (replace with database in production)
user_preferences: Dict[str, Dict] = {}
user_interactions: Dict[str, List[Dict]] = {}
recommendations_cache: Dict[str, Dict] = {}
experiments: Dict[str, Dict] = {}

# Sample product data for recommendations
SAMPLE_PRODUCTS = [
    {"id": "P001", "name": "Wireless Earbuds", "category": "electronics", "price": 79.99, "features": [1, 0, 1, 0, 1]},
    {"id": "P002", "name": "Phone Case", "category": "electronics", "price": 29.99, "features": [1, 1, 0, 0, 0]},
    {"id": "P003", "name": "Running Shoes", "category": "sports", "price": 129.99, "features": [0, 0, 1, 1, 0]},
    {"id": "P004", "name": "Yoga Mat", "category": "sports", "price": 39.99, "features": [0, 0, 1, 1, 1]},
    {"id": "P005", "name": "Kitchen Scale", "category": "home", "price": 24.99, "features": [0, 1, 0, 0, 1]},
    {"id": "P006", "name": "Coffee Maker", "category": "home", "price": 89.99, "features": [0, 1, 1, 0, 0]},
    {"id": "P007", "name": "Laptop Stand", "category": "electronics", "price": 49.99, "features": [1, 1, 0, 1, 0]},
    {"id": "P008", "name": "Fitness Tracker", "category": "sports", "price": 149.99, "features": [1, 0, 1, 1, 1]},
]


# ============================================
# Enums and Constants
# ============================================

class InteractionType(str, Enum):
    VIEW = "view"
    CLICK = "click"
    PURCHASE = "purchase"
    CART_ADD = "cart_add"
    WISHLIST = "wishlist"
    SEARCH = "search"
    RATING = "rating"


class RecommendationType(str, Enum):
    SIMILAR_PRODUCTS = "similar_products"
    FREQUENTLY_BOUGHT = "frequently_bought"
    PERSONALIZED = "personalized"
    TRENDING = "trending"
    NEW_ARRIVALS = "new_arrivals"


class ContentType(str, Enum):
    HOMEPAGE_BANNER = "homepage_banner"
    PRODUCT_PAGE = "product_page"
    EMAIL_CONTENT = "email_content"
    SEARCH_RESULTS = "search_results"


# ============================================
# Lifespan Manager
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Personalization Service starting up...")
    _initialize_sample_data()
    logger.info("Personalization Service initialized successfully")
    yield
    logger.info("Personalization Service shutting down...")


# Initialize FastAPI app with lifespan
app = FastAPI(
    title="Broxiva Personalization Service",
    description="User preferences, recommendations, and personalization service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add CORS middleware with specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


# ============================================
# Pydantic Models
# ============================================

class UserPreferencesCreate(BaseModel):
    user_id: str = Field(..., description="User ID")
    categories: Optional[List[str]] = Field(None, description="Preferred categories")
    price_range: Optional[Dict[str, float]] = Field(None, description="Price range {min, max}")
    brands: Optional[List[str]] = Field(None, description="Preferred brands")
    communication_preferences: Optional[Dict[str, bool]] = Field(None, description="Email, SMS, Push preferences")
    personalization_enabled: bool = Field(True, description="Enable personalization")
    metadata: Optional[Dict[str, Any]] = None


class UserPreferencesUpdate(BaseModel):
    categories: Optional[List[str]] = None
    price_range: Optional[Dict[str, float]] = None
    brands: Optional[List[str]] = None
    communication_preferences: Optional[Dict[str, bool]] = None
    personalization_enabled: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None


class UserInteraction(BaseModel):
    user_id: str = Field(..., description="User ID")
    product_id: str = Field(..., description="Product ID")
    interaction_type: InteractionType
    timestamp: Optional[str] = None
    duration_seconds: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


class RecommendationRequest(BaseModel):
    user_id: str = Field(..., description="User ID")
    product_id: Optional[str] = Field(None, description="Product ID for similar products")
    recommendation_type: RecommendationType = RecommendationType.PERSONALIZED
    limit: int = Field(10, ge=1, le=50)
    exclude_purchased: bool = True
    category_filter: Optional[str] = None


class ContentPersonalizationRequest(BaseModel):
    user_id: str
    content_type: ContentType
    context: Optional[Dict[str, Any]] = None


class ExperimentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    variants: List[Dict[str, Any]] = Field(..., description="List of experiment variants")
    traffic_split: Dict[str, float] = Field(..., description="Traffic split per variant")
    start_date: Optional[str] = None
    end_date: Optional[str] = None


# ============================================
# Health Check Endpoint
# ============================================

@app.get("/health")
async def health_check():
    """Service health check endpoint."""
    return {
        "status": "healthy",
        "service": "personalization-service",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }


# ============================================
# User Preferences Endpoints
# ============================================

@app.post("/api/v1/preferences", response_model=Dict[str, Any], status_code=201)
async def create_preferences(preferences: UserPreferencesCreate):
    """Create or update user preferences."""
    user_id = preferences.user_id

    preference_record = {
        "user_id": user_id,
        "categories": preferences.categories or [],
        "price_range": preferences.price_range or {"min": 0, "max": 10000},
        "brands": preferences.brands or [],
        "communication_preferences": preferences.communication_preferences or {
            "email": True,
            "sms": False,
            "push": True
        },
        "personalization_enabled": preferences.personalization_enabled,
        "metadata": preferences.metadata or {},
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }

    user_preferences[user_id] = preference_record

    logger.info(f"Preferences created/updated for user: {user_id}")

    return {
        "success": True,
        "message": "Preferences saved successfully",
        "data": preference_record
    }


@app.get("/api/v1/preferences/{user_id}", response_model=Dict[str, Any])
async def get_preferences(user_id: str = Path(..., description="User ID")):
    """Get user preferences."""
    if user_id not in user_preferences:
        # Return default preferences for new users
        return {
            "success": True,
            "data": {
                "user_id": user_id,
                "categories": [],
                "price_range": {"min": 0, "max": 10000},
                "brands": [],
                "communication_preferences": {"email": True, "sms": False, "push": True},
                "personalization_enabled": True,
                "metadata": {},
                "is_default": True
            }
        }

    return {
        "success": True,
        "data": user_preferences[user_id]
    }


@app.put("/api/v1/preferences/{user_id}", response_model=Dict[str, Any])
async def update_preferences(
    user_id: str = Path(..., description="User ID"),
    update: UserPreferencesUpdate = None
):
    """Update user preferences."""
    if user_id not in user_preferences:
        user_preferences[user_id] = {
            "user_id": user_id,
            "categories": [],
            "price_range": {"min": 0, "max": 10000},
            "brands": [],
            "communication_preferences": {"email": True, "sms": False, "push": True},
            "personalization_enabled": True,
            "metadata": {},
            "created_at": datetime.utcnow().isoformat()
        }

    prefs = user_preferences[user_id]

    if update.categories is not None:
        prefs["categories"] = update.categories
    if update.price_range is not None:
        prefs["price_range"] = update.price_range
    if update.brands is not None:
        prefs["brands"] = update.brands
    if update.communication_preferences is not None:
        prefs["communication_preferences"].update(update.communication_preferences)
    if update.personalization_enabled is not None:
        prefs["personalization_enabled"] = update.personalization_enabled
    if update.metadata is not None:
        prefs["metadata"].update(update.metadata)

    prefs["updated_at"] = datetime.utcnow().isoformat()

    logger.info(f"Preferences updated for user: {user_id}")

    return {
        "success": True,
        "message": "Preferences updated successfully",
        "data": prefs
    }


@app.delete("/api/v1/preferences/{user_id}", response_model=Dict[str, Any])
async def delete_preferences(user_id: str = Path(..., description="User ID")):
    """Delete user preferences (GDPR compliance)."""
    if user_id in user_preferences:
        del user_preferences[user_id]

    if user_id in user_interactions:
        del user_interactions[user_id]

    if user_id in recommendations_cache:
        del recommendations_cache[user_id]

    logger.info(f"Preferences and data deleted for user: {user_id}")

    return {
        "success": True,
        "message": "User data deleted successfully",
        "data": {"user_id": user_id}
    }


# ============================================
# User Interactions Endpoints
# ============================================

@app.post("/api/v1/interactions", response_model=Dict[str, Any], status_code=201)
async def track_interaction(
    interaction: UserInteraction,
    background_tasks: BackgroundTasks
):
    """Track a user interaction with a product."""
    user_id = interaction.user_id

    if user_id not in user_interactions:
        user_interactions[user_id] = []

    interaction_record = {
        "id": str(uuid4()),
        "user_id": user_id,
        "product_id": interaction.product_id,
        "interaction_type": interaction.interaction_type.value,
        "timestamp": interaction.timestamp or datetime.utcnow().isoformat(),
        "duration_seconds": interaction.duration_seconds,
        "metadata": interaction.metadata or {}
    }

    user_interactions[user_id].append(interaction_record)

    # Keep only last 1000 interactions per user
    if len(user_interactions[user_id]) > 1000:
        user_interactions[user_id] = user_interactions[user_id][-1000:]

    # Invalidate recommendations cache
    if user_id in recommendations_cache:
        del recommendations_cache[user_id]

    logger.info(f"Interaction tracked: user={user_id}, product={interaction.product_id}, type={interaction.interaction_type.value}")

    return {
        "success": True,
        "message": "Interaction tracked successfully",
        "data": interaction_record
    }


@app.get("/api/v1/interactions/{user_id}", response_model=Dict[str, Any])
async def get_user_interactions(
    user_id: str = Path(..., description="User ID"),
    interaction_type: Optional[InteractionType] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """Get user interaction history."""
    interactions = user_interactions.get(user_id, [])

    if interaction_type:
        interactions = [i for i in interactions if i.get("interaction_type") == interaction_type.value]

    # Sort by timestamp descending
    interactions.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

    total = len(interactions)
    paginated = interactions[offset:offset + limit]

    return {
        "success": True,
        "data": paginated,
        "pagination": {
            "total": total,
            "limit": limit,
            "offset": offset
        }
    }


# ============================================
# Recommendations Endpoints
# ============================================

@app.post("/api/v1/recommendations", response_model=Dict[str, Any])
async def get_recommendations(request: RecommendationRequest):
    """Get personalized product recommendations."""
    user_id = request.user_id

    # Check cache (valid for 5 minutes)
    cache_key = f"{user_id}_{request.recommendation_type.value}_{request.product_id}"
    if cache_key in recommendations_cache:
        cached = recommendations_cache[cache_key]
        if datetime.fromisoformat(cached["cached_at"]) > datetime.utcnow() - timedelta(minutes=5):
            return {
                "success": True,
                "data": cached["recommendations"],
                "recommendation_type": request.recommendation_type.value,
                "cached": True
            }

    recommendations = []

    if request.recommendation_type == RecommendationType.SIMILAR_PRODUCTS and request.product_id:
        recommendations = _get_similar_products(request.product_id, request.limit)
    elif request.recommendation_type == RecommendationType.PERSONALIZED:
        recommendations = _get_personalized_recommendations(user_id, request.limit)
    elif request.recommendation_type == RecommendationType.TRENDING:
        recommendations = _get_trending_products(request.limit)
    else:
        recommendations = SAMPLE_PRODUCTS[:request.limit]

    # Apply category filter if specified
    if request.category_filter:
        recommendations = [r for r in recommendations if r.get("category") == request.category_filter]

    # Cache recommendations
    recommendations_cache[cache_key] = {
        "recommendations": recommendations,
        "cached_at": datetime.utcnow().isoformat()
    }

    logger.info(f"Recommendations generated: user={user_id}, type={request.recommendation_type.value}, count={len(recommendations)}")

    return {
        "success": True,
        "data": recommendations,
        "recommendation_type": request.recommendation_type.value,
        "user_id": user_id,
        "cached": False
    }


@app.get("/api/v1/recommendations/similar/{product_id}", response_model=Dict[str, Any])
async def get_similar_products(
    product_id: str = Path(..., description="Product ID"),
    limit: int = Query(10, ge=1, le=50)
):
    """Get products similar to a given product."""
    recommendations = _get_similar_products(product_id, limit)

    return {
        "success": True,
        "data": recommendations,
        "product_id": product_id,
        "recommendation_type": "similar_products"
    }


@app.get("/api/v1/recommendations/trending", response_model=Dict[str, Any])
async def get_trending(
    category: Optional[str] = None,
    limit: int = Query(10, ge=1, le=50)
):
    """Get trending products."""
    recommendations = _get_trending_products(limit)

    if category:
        recommendations = [r for r in recommendations if r.get("category") == category]

    return {
        "success": True,
        "data": recommendations,
        "category": category,
        "recommendation_type": "trending"
    }


# ============================================
# Content Personalization Endpoints
# ============================================

@app.post("/api/v1/personalize/content", response_model=Dict[str, Any])
async def personalize_content(request: ContentPersonalizationRequest):
    """Get personalized content for a user."""
    user_id = request.user_id
    prefs = user_preferences.get(user_id, {})

    personalized_content = {
        "user_id": user_id,
        "content_type": request.content_type.value,
        "personalization_applied": prefs.get("personalization_enabled", True),
        "generated_at": datetime.utcnow().isoformat()
    }

    if request.content_type == ContentType.HOMEPAGE_BANNER:
        personalized_content["content"] = _personalize_homepage(user_id, prefs)
    elif request.content_type == ContentType.PRODUCT_PAGE:
        personalized_content["content"] = _personalize_product_page(user_id, prefs, request.context)
    elif request.content_type == ContentType.EMAIL_CONTENT:
        personalized_content["content"] = _personalize_email(user_id, prefs)
    else:
        personalized_content["content"] = {"message": "Default content"}

    logger.info(f"Content personalized: user={user_id}, type={request.content_type.value}")

    return {
        "success": True,
        "data": personalized_content
    }


# ============================================
# A/B Testing Endpoints
# ============================================

@app.post("/api/v1/experiments", response_model=Dict[str, Any], status_code=201)
async def create_experiment(experiment: ExperimentCreate):
    """Create a new A/B test experiment."""
    experiment_id = str(uuid4())

    experiment_record = {
        "id": experiment_id,
        "name": experiment.name,
        "description": experiment.description,
        "variants": experiment.variants,
        "traffic_split": experiment.traffic_split,
        "start_date": experiment.start_date or datetime.utcnow().isoformat(),
        "end_date": experiment.end_date,
        "status": "active",
        "results": {},
        "created_at": datetime.utcnow().isoformat()
    }

    experiments[experiment_id] = experiment_record

    logger.info(f"Experiment created: {experiment_id}, name: {experiment.name}")

    return {
        "success": True,
        "message": "Experiment created successfully",
        "data": experiment_record
    }


@app.get("/api/v1/experiments", response_model=Dict[str, Any])
async def list_experiments(
    status: Optional[str] = None
):
    """List all experiments."""
    items = list(experiments.values())

    if status:
        items = [e for e in items if e.get("status") == status]

    return {
        "success": True,
        "data": items,
        "total": len(items)
    }


@app.get("/api/v1/experiments/{experiment_id}/assign", response_model=Dict[str, Any])
async def assign_experiment_variant(
    experiment_id: str = Path(..., description="Experiment ID"),
    user_id: str = Query(..., description="User ID")
):
    """Assign a user to an experiment variant."""
    if experiment_id not in experiments:
        raise HTTPException(status_code=404, detail="Experiment not found")

    exp = experiments[experiment_id]

    if exp.get("status") != "active":
        return {
            "success": False,
            "message": "Experiment is not active",
            "data": None
        }

    # Deterministic assignment based on user_id hash
    import hashlib
    hash_input = f"{experiment_id}_{user_id}"
    hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16) % 100

    cumulative = 0
    assigned_variant = None
    for variant_name, split in exp["traffic_split"].items():
        cumulative += split * 100
        if hash_value < cumulative:
            assigned_variant = variant_name
            break

    if not assigned_variant:
        assigned_variant = list(exp["traffic_split"].keys())[0]

    variant_config = None
    for v in exp["variants"]:
        if v.get("name") == assigned_variant:
            variant_config = v
            break

    return {
        "success": True,
        "data": {
            "experiment_id": experiment_id,
            "experiment_name": exp["name"],
            "user_id": user_id,
            "variant": assigned_variant,
            "variant_config": variant_config
        }
    }


# ============================================
# User Profile and Insights
# ============================================

@app.get("/api/v1/profile/{user_id}", response_model=Dict[str, Any])
async def get_user_profile(user_id: str = Path(..., description="User ID")):
    """Get a comprehensive user profile with inferred preferences."""
    prefs = user_preferences.get(user_id, {})
    interactions = user_interactions.get(user_id, [])

    # Calculate inferred preferences from interactions
    category_counts = {}
    interaction_counts = {}
    recent_products = []

    for interaction in interactions[-100:]:  # Last 100 interactions
        category = interaction.get("metadata", {}).get("category", "unknown")
        category_counts[category] = category_counts.get(category, 0) + 1

        itype = interaction.get("interaction_type")
        interaction_counts[itype] = interaction_counts.get(itype, 0) + 1

        if interaction.get("product_id") not in [p.get("product_id") for p in recent_products]:
            recent_products.append({
                "product_id": interaction.get("product_id"),
                "interaction_type": itype,
                "timestamp": interaction.get("timestamp")
            })

    profile = {
        "user_id": user_id,
        "explicit_preferences": prefs,
        "inferred_preferences": {
            "top_categories": sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:5],
            "engagement_level": _calculate_engagement_level(interaction_counts),
            "preferred_time": _get_preferred_shopping_time(interactions)
        },
        "interaction_summary": interaction_counts,
        "recent_products": recent_products[:10],
        "total_interactions": len(interactions),
        "profile_completeness": _calculate_profile_completeness(prefs),
        "generated_at": datetime.utcnow().isoformat()
    }

    return {
        "success": True,
        "data": profile
    }


# ============================================
# Root Endpoint
# ============================================

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Broxiva Personalization Service",
        "version": "1.0.0",
        "description": "User preferences, recommendations, and personalization service",
        "endpoints": {
            "health": "/health",
            "preferences": "/api/v1/preferences",
            "interactions": "/api/v1/interactions",
            "recommendations": "/api/v1/recommendations",
            "personalize": "/api/v1/personalize/content",
            "experiments": "/api/v1/experiments",
            "profile": "/api/v1/profile",
            "docs": "/docs"
        }
    }


# ============================================
# Helper Functions
# ============================================

def _initialize_sample_data():
    """Initialize sample data for demonstration."""
    # Sample user preferences
    user_preferences["user_001"] = {
        "user_id": "user_001",
        "categories": ["electronics", "sports"],
        "price_range": {"min": 20, "max": 200},
        "brands": ["Nike", "Apple"],
        "communication_preferences": {"email": True, "sms": False, "push": True},
        "personalization_enabled": True,
        "metadata": {},
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }


def _get_similar_products(product_id: str, limit: int) -> List[Dict]:
    """Get products similar to the given product using cosine similarity."""
    # Find the source product
    source_product = None
    for product in SAMPLE_PRODUCTS:
        if product["id"] == product_id:
            source_product = product
            break

    if not source_product:
        return SAMPLE_PRODUCTS[:limit]

    # Calculate similarities
    source_features = np.array(source_product["features"]).reshape(1, -1)
    similarities = []

    for product in SAMPLE_PRODUCTS:
        if product["id"] != product_id:
            features = np.array(product["features"]).reshape(1, -1)
            similarity = cosine_similarity(source_features, features)[0][0]
            similarities.append((product, similarity))

    # Sort by similarity
    similarities.sort(key=lambda x: x[1], reverse=True)

    return [p[0] for p in similarities[:limit]]


def _get_personalized_recommendations(user_id: str, limit: int) -> List[Dict]:
    """Get personalized recommendations based on user preferences and history."""
    prefs = user_preferences.get(user_id, {})
    interactions = user_interactions.get(user_id, [])

    # Get user's preferred categories
    preferred_categories = prefs.get("categories", [])

    # Get recently interacted products
    recent_products = set()
    for interaction in interactions[-20:]:
        recent_products.add(interaction.get("product_id"))

    # Filter and score products
    scored_products = []
    for product in SAMPLE_PRODUCTS:
        score = 0

        # Category match bonus
        if product["category"] in preferred_categories:
            score += 10

        # Price range bonus
        price_range = prefs.get("price_range", {})
        if price_range:
            if price_range.get("min", 0) <= product["price"] <= price_range.get("max", 10000):
                score += 5

        # Penalize recently viewed
        if product["id"] in recent_products:
            score -= 3

        scored_products.append((product, score))

    # Sort by score
    scored_products.sort(key=lambda x: x[1], reverse=True)

    return [p[0] for p in scored_products[:limit]]


def _get_trending_products(limit: int) -> List[Dict]:
    """Get trending products based on recent interactions."""
    product_counts = {}

    for user_id, interactions in user_interactions.items():
        for interaction in interactions:
            pid = interaction.get("product_id")
            if interaction.get("interaction_type") in ["view", "purchase", "cart_add"]:
                product_counts[pid] = product_counts.get(pid, 0) + 1

    # Add some randomness for demo
    import random
    for product in SAMPLE_PRODUCTS:
        if product["id"] not in product_counts:
            product_counts[product["id"]] = random.randint(1, 50)

    # Sort by count
    sorted_products = sorted(product_counts.items(), key=lambda x: x[1], reverse=True)

    result = []
    for pid, count in sorted_products[:limit]:
        for product in SAMPLE_PRODUCTS:
            if product["id"] == pid:
                result.append({**product, "trending_score": count})
                break

    return result


def _personalize_homepage(user_id: str, prefs: Dict) -> Dict:
    """Generate personalized homepage content."""
    categories = prefs.get("categories", ["electronics", "sports"])

    return {
        "hero_banner": {
            "title": f"Welcome back!" if prefs else "Welcome to Broxiva!",
            "subtitle": f"Check out our latest {categories[0] if categories else 'products'}",
            "cta": "Shop Now"
        },
        "featured_categories": categories[:3] if categories else ["electronics", "home", "sports"],
        "personalized_sections": [
            {"type": "recommendations", "title": "Recommended for You"},
            {"type": "recently_viewed", "title": "Continue Shopping"},
            {"type": "deals", "title": "Deals You'll Love"}
        ]
    }


def _personalize_product_page(user_id: str, prefs: Dict, context: Optional[Dict]) -> Dict:
    """Generate personalized product page content."""
    return {
        "show_similar_products": True,
        "show_frequently_bought": True,
        "show_reviews": True,
        "highlight_features": prefs.get("categories", []),
        "price_sensitivity": "high" if prefs.get("price_range", {}).get("max", 10000) < 100 else "normal"
    }


def _personalize_email(user_id: str, prefs: Dict) -> Dict:
    """Generate personalized email content."""
    return {
        "subject_line": "Products picked just for you!",
        "greeting": "Hi there!",
        "recommended_products": 4,
        "include_deals": True,
        "categories_to_highlight": prefs.get("categories", [])[:2]
    }


def _calculate_engagement_level(interaction_counts: Dict) -> str:
    """Calculate user engagement level."""
    total = sum(interaction_counts.values())
    purchases = interaction_counts.get("purchase", 0)

    if total > 100 and purchases > 5:
        return "high"
    elif total > 30 or purchases > 1:
        return "medium"
    else:
        return "low"


def _get_preferred_shopping_time(interactions: List[Dict]) -> str:
    """Determine user's preferred shopping time."""
    # Simple implementation - in production would analyze timestamps
    return "evening"


def _calculate_profile_completeness(prefs: Dict) -> float:
    """Calculate how complete a user's profile is."""
    if not prefs:
        return 0.0

    fields = ["categories", "price_range", "brands", "communication_preferences"]
    filled = sum(1 for f in fields if prefs.get(f))

    return round(filled / len(fields) * 100, 1)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8010"))
    uvicorn.run(app, host="0.0.0.0", port=port)
