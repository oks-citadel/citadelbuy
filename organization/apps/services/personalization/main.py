"""
Personalization AI Service
FastAPI application for personalized content and recommendations
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import logging
import uvicorn
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Personalization AI Service",
    description="AI-powered personalization and recommendation service for Citadel Buy",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models
class UserInteraction(BaseModel):
    user_id: str
    product_id: str
    interaction_type: str = Field(..., description="view, click, purchase, cart_add, wishlist")
    timestamp: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


class UserProfile(BaseModel):
    user_id: str
    preferences: Dict[str, float] = Field(default_factory=dict)
    categories: List[str] = Field(default_factory=list)
    brands: List[str] = Field(default_factory=list)
    price_range: Optional[Dict[str, float]] = None
    interactions: List[UserInteraction] = Field(default_factory=list)


class Product(BaseModel):
    product_id: str
    name: str
    category: str
    brand: Optional[str] = None
    price: float
    features: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    popularity_score: Optional[float] = 0.0


class PersonalizeHomepageRequest(BaseModel):
    user_id: str
    available_products: List[Product]
    layout_sections: List[str] = Field(
        default=["hero", "trending", "recommended", "categories", "deals"],
        description="Sections to personalize"
    )
    max_items_per_section: int = Field(default=10, ge=1, le=50)


class PersonalizeHomepageResponse(BaseModel):
    user_id: str
    personalized_sections: Dict[str, List[Product]]
    personalization_score: float = Field(ge=0.0, le=1.0)
    strategy_used: str
    timestamp: datetime


class RecommendationRequest(BaseModel):
    user_id: str
    context: Optional[str] = Field(default="general", description="homepage, product_page, cart, checkout")
    current_product_id: Optional[str] = None
    available_products: List[Product]
    num_recommendations: int = Field(default=10, ge=1, le=50)
    filters: Optional[Dict[str, Any]] = None


class RecommendationResponse(BaseModel):
    user_id: str
    recommendations: List[Product]
    scores: List[float]
    strategy: str
    context: str
    timestamp: datetime


class UpdateUserProfileRequest(BaseModel):
    user_id: str
    interactions: Optional[List[UserInteraction]] = None
    explicit_preferences: Optional[Dict[str, float]] = None
    categories: Optional[List[str]] = None
    brands: Optional[List[str]] = None


class UpdateUserProfileResponse(BaseModel):
    user_id: str
    profile: UserProfile
    updated_at: datetime
    insights: Dict[str, Any]


class ABTestRequest(BaseModel):
    user_id: str
    test_name: str
    strategies: List[str] = Field(..., description="List of strategy names to test")
    products: List[Product]
    num_recommendations: int = Field(default=10, ge=1, le=50)


class ABTestResponse(BaseModel):
    user_id: str
    test_name: str
    variants: Dict[str, List[Product]]
    assigned_variant: str
    timestamp: datetime


# In-memory storage (replace with database in production)
user_profiles: Dict[str, UserProfile] = {}
interaction_history: Dict[str, List[UserInteraction]] = {}


# Personalization Engine Class
class PersonalizationEngine:
    """Placeholder ML implementation for personalization"""

    def __init__(self):
        self.category_weights = {}
        self.brand_weights = {}

    def build_user_vector(self, profile: UserProfile) -> np.ndarray:
        """Build user preference vector from profile"""
        # Placeholder: Create a simple feature vector
        vector = []

        # Category preferences (top 10 categories)
        categories = profile.categories[:10] if profile.categories else []
        for i in range(10):
            vector.append(1.0 if i < len(categories) else 0.0)

        # Brand preferences (top 5 brands)
        brands = profile.brands[:5] if profile.brands else []
        for i in range(5):
            vector.append(1.0 if i < len(brands) else 0.0)

        # Price preference
        if profile.price_range:
            vector.append(profile.price_range.get("min", 0.0) / 1000.0)
            vector.append(profile.price_range.get("max", 1000.0) / 1000.0)
        else:
            vector.extend([0.0, 1.0])

        return np.array(vector)

    def build_product_vector(self, product: Product) -> np.ndarray:
        """Build product feature vector"""
        # Placeholder: Create a simple feature vector
        vector = []

        # Category encoding (simplified)
        categories = ["Electronics", "Clothing", "Home", "Sports", "Books",
                     "Toys", "Beauty", "Food", "Automotive", "Other"]
        for cat in categories:
            vector.append(1.0 if product.category == cat else 0.0)

        # Brand encoding (simplified)
        common_brands = ["Samsung", "Apple", "Nike", "Adidas", "Sony"]
        for brand in common_brands:
            vector.append(1.0 if product.brand == brand else 0.0)

        # Price normalization
        vector.append(product.price / 1000.0)
        vector.append(min(product.popularity_score or 0.0, 1.0))

        return np.array(vector)

    def calculate_relevance_score(self, user_vector: np.ndarray, product_vector: np.ndarray) -> float:
        """Calculate relevance score between user and product"""
        # Ensure vectors have the same length
        if len(user_vector) != len(product_vector):
            # Pad the shorter vector
            max_len = max(len(user_vector), len(product_vector))
            user_vector = np.pad(user_vector, (0, max_len - len(user_vector)))
            product_vector = np.pad(product_vector, (0, max_len - len(product_vector)))

        # Calculate cosine similarity
        similarity = cosine_similarity(
            user_vector.reshape(1, -1),
            product_vector.reshape(1, -1)
        )[0][0]

        return float(max(0.0, min(1.0, similarity)))

    def rank_products(self, user_id: str, products: List[Product]) -> List[tuple]:
        """Rank products based on user preferences"""
        if user_id not in user_profiles:
            # Cold start: use popularity
            return [(p, p.popularity_score or 0.5) for p in products]

        profile = user_profiles[user_id]
        user_vector = self.build_user_vector(profile)

        scored_products = []
        for product in products:
            product_vector = self.build_product_vector(product)
            score = self.calculate_relevance_score(user_vector, product_vector)

            # Boost score based on category/brand match
            if product.category in profile.categories:
                score *= 1.2
            if product.brand and product.brand in profile.brands:
                score *= 1.15

            # Add some diversity with popularity
            final_score = 0.7 * score + 0.3 * (product.popularity_score or 0.5)
            scored_products.append((product, final_score))

        return sorted(scored_products, key=lambda x: x[1], reverse=True)

    def diversify_recommendations(self, ranked_products: List[tuple], diversity_factor: float = 0.3) -> List[tuple]:
        """Add diversity to recommendations"""
        if not ranked_products:
            return []

        diverse_list = []
        categories_used = set()

        # First pass: add top items with category diversity
        for product, score in ranked_products:
            if product.category not in categories_used or len(diverse_list) >= len(ranked_products) * 0.7:
                diverse_list.append((product, score))
                categories_used.add(product.category)

        # Second pass: fill remaining slots
        for product, score in ranked_products:
            if (product, score) not in diverse_list:
                diverse_list.append((product, score))

        return diverse_list


# Initialize engine
personalization_engine = PersonalizationEngine()


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "personalization-ai",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }


@app.post("/personalize-homepage", response_model=PersonalizeHomepageResponse)
async def personalize_homepage(request: PersonalizeHomepageRequest):
    """
    Personalize homepage content based on user preferences
    """
    try:
        logger.info(f"Personalizing homepage for user: {request.user_id}")

        # Get user profile or use default
        profile = user_profiles.get(request.user_id, UserProfile(user_id=request.user_id))

        # Rank all products
        ranked_products = personalization_engine.rank_products(
            request.user_id,
            request.available_products
        )

        # Diversify recommendations
        diverse_products = personalization_engine.diversify_recommendations(ranked_products)

        # Organize into sections
        personalized_sections = {}
        product_pool = [p for p, s in diverse_products]

        for section in request.layout_sections:
            if section == "hero":
                # Top personalized items for hero section
                personalized_sections[section] = product_pool[:3]
            elif section == "trending":
                # Popular items with some personalization
                trending = sorted(
                    request.available_products,
                    key=lambda p: p.popularity_score or 0.0,
                    reverse=True
                )[:request.max_items_per_section]
                personalized_sections[section] = trending
            elif section == "recommended":
                # Highly personalized recommendations
                personalized_sections[section] = product_pool[:request.max_items_per_section]
            elif section == "categories":
                # Category-based recommendations
                if profile.categories:
                    category_products = [
                        p for p in product_pool
                        if p.category in profile.categories
                    ][:request.max_items_per_section]
                    personalized_sections[section] = category_products
                else:
                    personalized_sections[section] = product_pool[:request.max_items_per_section]
            elif section == "deals":
                # Price-conscious recommendations
                deals = sorted(
                    product_pool,
                    key=lambda p: p.price
                )[:request.max_items_per_section]
                personalized_sections[section] = deals
            else:
                personalized_sections[section] = product_pool[:request.max_items_per_section]

        # Calculate overall personalization score
        personalization_score = 0.8 if request.user_id in user_profiles else 0.3

        return PersonalizeHomepageResponse(
            user_id=request.user_id,
            personalized_sections=personalized_sections,
            personalization_score=personalization_score,
            strategy_used="collaborative_filtering" if request.user_id in user_profiles else "popularity_based",
            timestamp=datetime.now()
        )

    except Exception as e:
        logger.error(f"Error personalizing homepage: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to personalize homepage: {str(e)}"
        )


@app.post("/personalize-recommendations", response_model=RecommendationResponse)
async def get_personalized_recommendations(request: RecommendationRequest):
    """
    Get personalized product recommendations
    """
    try:
        logger.info(f"Generating recommendations for user: {request.user_id}, context: {request.context}")

        # Filter products based on filters
        filtered_products = request.available_products
        if request.filters:
            if "category" in request.filters:
                filtered_products = [
                    p for p in filtered_products
                    if p.category == request.filters["category"]
                ]
            if "max_price" in request.filters:
                filtered_products = [
                    p for p in filtered_products
                    if p.price <= request.filters["max_price"]
                ]
            if "min_price" in request.filters:
                filtered_products = [
                    p for p in filtered_products
                    if p.price >= request.filters["min_price"]
                ]

        # Context-specific logic
        if request.context == "product_page" and request.current_product_id:
            # Similar products
            current_product = next(
                (p for p in request.available_products if p.product_id == request.current_product_id),
                None
            )
            if current_product:
                # Filter by same category
                filtered_products = [
                    p for p in filtered_products
                    if p.category == current_product.category and p.product_id != request.current_product_id
                ]

        # Rank products
        ranked_products = personalization_engine.rank_products(request.user_id, filtered_products)

        # Diversify and get top N
        diverse_products = personalization_engine.diversify_recommendations(ranked_products)
        top_recommendations = diverse_products[:request.num_recommendations]

        recommendations = [p for p, s in top_recommendations]
        scores = [s for p, s in top_recommendations]

        strategy = "personalized" if request.user_id in user_profiles else "popularity"

        return RecommendationResponse(
            user_id=request.user_id,
            recommendations=recommendations,
            scores=scores,
            strategy=strategy,
            context=request.context,
            timestamp=datetime.now()
        )

    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate recommendations: {str(e)}"
        )


@app.post("/user-profile", response_model=UpdateUserProfileResponse)
async def update_user_profile(request: UpdateUserProfileRequest):
    """
    Build or update user preference profile
    """
    try:
        logger.info(f"Updating profile for user: {request.user_id}")

        # Get or create profile
        if request.user_id in user_profiles:
            profile = user_profiles[request.user_id]
        else:
            profile = UserProfile(user_id=request.user_id)
            user_profiles[request.user_id] = profile

        # Update interactions
        if request.interactions:
            profile.interactions.extend(request.interactions)

            # Store in interaction history
            if request.user_id not in interaction_history:
                interaction_history[request.user_id] = []
            interaction_history[request.user_id].extend(request.interactions)

            # Analyze interactions to update preferences
            category_counts = {}
            brand_counts = {}

            for interaction in profile.interactions:
                # Weight interactions by type
                weight = {
                    "purchase": 5.0,
                    "cart_add": 3.0,
                    "wishlist": 2.5,
                    "click": 1.5,
                    "view": 1.0
                }.get(interaction.interaction_type, 1.0)

                # Update category counts (would need product lookup in production)
                if interaction.metadata and "category" in interaction.metadata:
                    category = interaction.metadata["category"]
                    category_counts[category] = category_counts.get(category, 0) + weight

                if interaction.metadata and "brand" in interaction.metadata:
                    brand = interaction.metadata["brand"]
                    brand_counts[brand] = brand_counts.get(brand, 0) + weight

            # Update profile with top categories and brands
            profile.categories = sorted(
                category_counts.keys(),
                key=lambda k: category_counts[k],
                reverse=True
            )[:10]

            profile.brands = sorted(
                brand_counts.keys(),
                key=lambda k: brand_counts[k],
                reverse=True
            )[:5]

        # Update explicit preferences
        if request.explicit_preferences:
            profile.preferences.update(request.explicit_preferences)

        # Update categories
        if request.categories:
            profile.categories = request.categories

        # Update brands
        if request.brands:
            profile.brands = request.brands

        # Generate insights
        insights = {
            "total_interactions": len(profile.interactions),
            "top_categories": profile.categories[:3],
            "top_brands": profile.brands[:3],
            "profile_completeness": min(
                1.0,
                (len(profile.categories) * 0.3 +
                 len(profile.brands) * 0.2 +
                 len(profile.interactions) * 0.01) / 1.5
            )
        }

        return UpdateUserProfileResponse(
            user_id=request.user_id,
            profile=profile,
            updated_at=datetime.now(),
            insights=insights
        )

    except Exception as e:
        logger.error(f"Error updating user profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user profile: {str(e)}"
        )


@app.post("/ab-test", response_model=ABTestResponse)
async def ab_test_personalization(request: ABTestRequest):
    """
    A/B testing for different personalization strategies
    """
    try:
        logger.info(f"Running A/B test '{request.test_name}' for user: {request.user_id}")

        # Simple hash-based assignment
        user_hash = hash(request.user_id) % len(request.strategies)
        assigned_variant = request.strategies[user_hash]

        variants = {}

        for strategy in request.strategies:
            if strategy == "popularity":
                # Sort by popularity
                sorted_products = sorted(
                    request.products,
                    key=lambda p: p.popularity_score or 0.0,
                    reverse=True
                )[:request.num_recommendations]
                variants[strategy] = sorted_products

            elif strategy == "personalized":
                # Use personalization engine
                ranked_products = personalization_engine.rank_products(
                    request.user_id,
                    request.products
                )
                variants[strategy] = [p for p, s in ranked_products[:request.num_recommendations]]

            elif strategy == "random":
                # Random selection
                indices = np.random.choice(
                    len(request.products),
                    min(request.num_recommendations, len(request.products)),
                    replace=False
                )
                variants[strategy] = [request.products[i] for i in indices]

            elif strategy == "price_asc":
                # Sort by price ascending
                sorted_products = sorted(
                    request.products,
                    key=lambda p: p.price
                )[:request.num_recommendations]
                variants[strategy] = sorted_products

            elif strategy == "price_desc":
                # Sort by price descending
                sorted_products = sorted(
                    request.products,
                    key=lambda p: p.price,
                    reverse=True
                )[:request.num_recommendations]
                variants[strategy] = sorted_products

            else:
                # Default to personalized
                ranked_products = personalization_engine.rank_products(
                    request.user_id,
                    request.products
                )
                variants[strategy] = [p for p, s in ranked_products[:request.num_recommendations]]

        return ABTestResponse(
            user_id=request.user_id,
            test_name=request.test_name,
            variants=variants,
            assigned_variant=assigned_variant,
            timestamp=datetime.now()
        )

    except Exception as e:
        logger.error(f"Error running A/B test: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to run A/B test: {str(e)}"
        )


if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", "8010"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
