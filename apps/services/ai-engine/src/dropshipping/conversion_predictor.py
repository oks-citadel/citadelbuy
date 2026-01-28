"""
Conversion Predictor
AI system to predict and optimize product conversion rates
"""

import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ConversionFactor(Enum):
    """Factors affecting conversion"""
    PRICE = "price"
    IMAGES = "images"
    REVIEWS = "reviews"
    SHIPPING = "shipping"
    TITLE = "title"
    DESCRIPTION = "description"
    TRUST = "trust"
    URGENCY = "urgency"
    SOCIAL_PROOF = "social_proof"
    MOBILE_UX = "mobile_ux"


@dataclass
class ConversionPrediction:
    """Conversion prediction result"""
    product_id: str
    predicted_rate: float  # 0-100
    current_rate: Optional[float]
    potential_rate: float  # With optimizations
    improvement_potential: float  # Percentage improvement possible
    key_factors: List[Dict[str, Any]]
    optimizations: List[Dict[str, Any]]
    a_b_test_suggestions: List[Dict[str, Any]]
    confidence: float


class ConversionPredictor:
    """
    AI-powered conversion rate prediction and optimization for dropshipping.

    Capabilities:
    - Predict conversion rates for products
    - Identify conversion blockers
    - Suggest optimizations
    - A/B test recommendations
    - Personalized conversion tactics
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}

        # Industry benchmarks
        self.benchmarks = {
            'electronics': 2.5,
            'fashion': 2.0,
            'home': 3.0,
            'beauty': 3.5,
            'sports': 2.8,
            'toys': 4.0,
            'pet': 3.2,
            'jewelry': 1.5,
            'default': 2.5,
        }

        # Factor weights for conversion
        self.factor_weights = {
            ConversionFactor.PRICE: 0.20,
            ConversionFactor.IMAGES: 0.15,
            ConversionFactor.REVIEWS: 0.15,
            ConversionFactor.SHIPPING: 0.15,
            ConversionFactor.TITLE: 0.08,
            ConversionFactor.DESCRIPTION: 0.07,
            ConversionFactor.TRUST: 0.10,
            ConversionFactor.URGENCY: 0.05,
            ConversionFactor.SOCIAL_PROOF: 0.03,
            ConversionFactor.MOBILE_UX: 0.02,
        }

    async def predict(
        self,
        product: Dict[str, Any],
        listing_data: Optional[Dict[str, Any]] = None,
        traffic_data: Optional[Dict[str, Any]] = None,
        competitor_data: Optional[List[Dict[str, Any]]] = None,
    ) -> ConversionPrediction:
        """
        Predict conversion rate for a product.

        Args:
            product: Product data
            listing_data: Listing quality metrics
            traffic_data: Traffic and engagement data
            competitor_data: Competitor listings

        Returns:
            ConversionPrediction with analysis and recommendations
        """
        # Analyze each conversion factor
        factor_scores = {}
        key_factors = []

        # Price analysis
        price_analysis = self._analyze_price_factor(product, competitor_data)
        factor_scores[ConversionFactor.PRICE] = price_analysis['score']
        key_factors.append({
            'factor': ConversionFactor.PRICE.value,
            'score': price_analysis['score'],
            'impact': 'high',
            'details': price_analysis['details'],
        })

        # Image analysis
        image_analysis = self._analyze_images(listing_data or product)
        factor_scores[ConversionFactor.IMAGES] = image_analysis['score']
        key_factors.append({
            'factor': ConversionFactor.IMAGES.value,
            'score': image_analysis['score'],
            'impact': 'high',
            'details': image_analysis['details'],
        })

        # Reviews analysis
        review_analysis = self._analyze_reviews(product)
        factor_scores[ConversionFactor.REVIEWS] = review_analysis['score']
        key_factors.append({
            'factor': ConversionFactor.REVIEWS.value,
            'score': review_analysis['score'],
            'impact': 'high',
            'details': review_analysis['details'],
        })

        # Shipping analysis
        shipping_analysis = self._analyze_shipping(product)
        factor_scores[ConversionFactor.SHIPPING] = shipping_analysis['score']
        key_factors.append({
            'factor': ConversionFactor.SHIPPING.value,
            'score': shipping_analysis['score'],
            'impact': 'high',
            'details': shipping_analysis['details'],
        })

        # Title analysis
        title_analysis = self._analyze_title(product)
        factor_scores[ConversionFactor.TITLE] = title_analysis['score']
        key_factors.append({
            'factor': ConversionFactor.TITLE.value,
            'score': title_analysis['score'],
            'impact': 'medium',
            'details': title_analysis['details'],
        })

        # Description analysis
        desc_analysis = self._analyze_description(product)
        factor_scores[ConversionFactor.DESCRIPTION] = desc_analysis['score']
        key_factors.append({
            'factor': ConversionFactor.DESCRIPTION.value,
            'score': desc_analysis['score'],
            'impact': 'medium',
            'details': desc_analysis['details'],
        })

        # Trust signals
        trust_analysis = self._analyze_trust_signals(product, listing_data)
        factor_scores[ConversionFactor.TRUST] = trust_analysis['score']
        key_factors.append({
            'factor': ConversionFactor.TRUST.value,
            'score': trust_analysis['score'],
            'impact': 'medium',
            'details': trust_analysis['details'],
        })

        # Calculate predicted conversion rate
        predicted_rate = self._calculate_predicted_rate(
            factor_scores, product.get('category', '')
        )

        # Get current rate if available
        current_rate = traffic_data.get('conversion_rate') if traffic_data else None

        # Calculate potential rate with optimizations
        potential_rate = self._calculate_potential_rate(factor_scores, product)

        # Generate optimizations
        optimizations = self._generate_optimizations(
            factor_scores, product, listing_data
        )

        # Generate A/B test suggestions
        ab_tests = self._generate_ab_tests(
            factor_scores, product, current_rate
        )

        # Calculate confidence
        confidence = self._calculate_confidence(
            listing_data, traffic_data, competitor_data
        )

        # Calculate improvement potential
        improvement_potential = 0.0
        if current_rate and current_rate > 0:
            improvement_potential = ((potential_rate - current_rate) / current_rate) * 100
        elif predicted_rate > 0:
            improvement_potential = ((potential_rate - predicted_rate) / predicted_rate) * 100

        return ConversionPrediction(
            product_id=product.get('id', ''),
            predicted_rate=round(predicted_rate, 2),
            current_rate=round(current_rate, 2) if current_rate else None,
            potential_rate=round(potential_rate, 2),
            improvement_potential=round(max(improvement_potential, 0), 1),
            key_factors=sorted(key_factors, key=lambda x: x['score']),
            optimizations=optimizations,
            a_b_test_suggestions=ab_tests,
            confidence=round(confidence, 2),
        )

    async def batch_predict(
        self,
        products: List[Dict[str, Any]],
    ) -> List[ConversionPrediction]:
        """Predict conversion for multiple products."""
        predictions = []

        for product in products:
            try:
                prediction = await self.predict(product)
                predictions.append(prediction)
            except Exception as e:
                logger.error(f"Prediction failed for {product.get('id')}: {e}")

        # Sort by improvement potential
        predictions.sort(key=lambda x: x.improvement_potential, reverse=True)
        return predictions

    async def analyze_conversion_funnel(
        self,
        product: Dict[str, Any],
        funnel_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Analyze conversion funnel for drop-off points."""
        analysis = {
            'product_id': product.get('id', ''),
            'funnel_stages': [],
            'biggest_drop': None,
            'recommendations': [],
        }

        stages = [
            ('impressions', 'clicks', 'CTR'),
            ('clicks', 'product_views', 'View Rate'),
            ('product_views', 'add_to_cart', 'ATC Rate'),
            ('add_to_cart', 'checkout_initiated', 'Checkout Rate'),
            ('checkout_initiated', 'purchases', 'Purchase Rate'),
        ]

        max_drop = 0
        max_drop_stage = None

        for start, end, name in stages:
            start_count = funnel_data.get(start, 0)
            end_count = funnel_data.get(end, 0)

            rate = (end_count / start_count * 100) if start_count > 0 else 0
            drop = 100 - rate

            stage_data = {
                'from': start,
                'to': end,
                'name': name,
                'rate': round(rate, 2),
                'drop_off': round(drop, 2),
                'start_count': start_count,
                'end_count': end_count,
            }
            analysis['funnel_stages'].append(stage_data)

            if drop > max_drop:
                max_drop = drop
                max_drop_stage = stage_data

        analysis['biggest_drop'] = max_drop_stage

        # Generate recommendations based on biggest drop
        if max_drop_stage:
            analysis['recommendations'] = self._get_funnel_recommendations(
                max_drop_stage['from'], max_drop_stage['to']
            )

        return analysis

    async def get_personalization_factors(
        self,
        customer: Dict[str, Any],
        product: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Get personalization factors to improve conversion."""
        factors = {
            'customer_segment': self._determine_segment(customer),
            'messaging': [],
            'urgency_tactics': [],
            'social_proof': [],
            'price_sensitivity': 'medium',
        }

        # Determine price sensitivity
        order_history = customer.get('order_history', [])
        if order_history:
            avg_order = sum(o.get('total', 0) for o in order_history) / len(order_history)
            product_price = product.get('price', 0)

            if product_price > avg_order * 1.5:
                factors['price_sensitivity'] = 'high'
                factors['messaging'].append("Highlight value and quality")
                factors['messaging'].append("Offer payment plans if available")
            elif product_price < avg_order * 0.5:
                factors['price_sensitivity'] = 'low'
                factors['messaging'].append("Suggest complementary products")

        # Segment-based messaging
        segment = factors['customer_segment']
        if segment == 'new':
            factors['messaging'].append("Highlight satisfaction guarantee")
            factors['urgency_tactics'].append("First-time buyer discount")
        elif segment == 'returning':
            factors['messaging'].append("Personalized recommendation")
            factors['social_proof'].append("Show similar customers' purchases")
        elif segment == 'vip':
            factors['messaging'].append("Exclusive VIP pricing")
            factors['urgency_tactics'].append("Early access to new products")

        # Product-based urgency
        stock = product.get('stock_quantity', 100)
        if stock < 10:
            factors['urgency_tactics'].append(f"Only {stock} left in stock")

        return factors

    def _analyze_price_factor(
        self,
        product: Dict[str, Any],
        competitor_data: Optional[List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """Analyze price impact on conversion."""
        score = 0.5
        details = []

        price = product.get('price', 0)

        # Price point analysis
        if price <= 20:
            score += 0.2
            details.append("Impulse buy price point")
        elif price <= 50:
            score += 0.1
            details.append("Moderate price point")
        elif price > 100:
            score -= 0.1
            details.append("Higher price may reduce impulse purchases")

        # Competitor comparison
        if competitor_data:
            competitor_prices = [c.get('price', 0) for c in competitor_data if c.get('price')]
            if competitor_prices:
                avg_competitor = sum(competitor_prices) / len(competitor_prices)

                if price < avg_competitor * 0.9:
                    score += 0.2
                    details.append(f"Priced {((avg_competitor - price) / avg_competitor * 100):.0f}% below competitors")
                elif price > avg_competitor * 1.1:
                    score -= 0.15
                    details.append("Priced above competitors")

        # Has sale price
        if product.get('compare_at_price') and product.get('compare_at_price') > price:
            score += 0.15
            discount = ((product['compare_at_price'] - price) / product['compare_at_price']) * 100
            details.append(f"{discount:.0f}% discount displayed")

        return {
            'score': max(min(score, 1.0), 0.0),
            'details': details,
        }

    def _analyze_images(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze image quality impact on conversion."""
        score = 0.5
        details = []

        images = data.get('images', [])
        image_count = len(images) if isinstance(images, list) else data.get('image_count', 0)

        # Image quantity
        if image_count >= 5:
            score += 0.25
            details.append(f"{image_count} product images")
        elif image_count >= 3:
            score += 0.15
            details.append(f"{image_count} product images")
        elif image_count == 1:
            score -= 0.2
            details.append("Only 1 image - add more")
        elif image_count == 0:
            score -= 0.4
            details.append("No images - critical issue")

        # Has video
        if data.get('has_video'):
            score += 0.15
            details.append("Product video available")

        # Image quality indicators
        if data.get('has_lifestyle_images'):
            score += 0.1
            details.append("Lifestyle images present")

        if data.get('has_size_chart') and data.get('category', '').lower() in ['fashion', 'clothing', 'apparel']:
            score += 0.1
            details.append("Size chart available")

        return {
            'score': max(min(score, 1.0), 0.0),
            'details': details,
        }

    def _analyze_reviews(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze reviews impact on conversion."""
        score = 0.5
        details = []

        rating = product.get('rating', 0)
        review_count = product.get('review_count', 0)

        # Rating impact
        if rating >= 4.5:
            score += 0.25
            details.append(f"Excellent rating: {rating}")
        elif rating >= 4.0:
            score += 0.15
            details.append(f"Good rating: {rating}")
        elif rating >= 3.5:
            score += 0.05
            details.append(f"Average rating: {rating}")
        elif rating > 0:
            score -= 0.2
            details.append(f"Low rating: {rating}")
        else:
            score -= 0.15
            details.append("No ratings yet")

        # Review count impact
        if review_count >= 100:
            score += 0.2
            details.append(f"{review_count} reviews (strong social proof)")
        elif review_count >= 20:
            score += 0.1
            details.append(f"{review_count} reviews")
        elif review_count >= 5:
            score += 0.05
            details.append(f"{review_count} reviews")
        elif review_count == 0:
            score -= 0.1
            details.append("No reviews yet")

        return {
            'score': max(min(score, 1.0), 0.0),
            'details': details,
        }

    def _analyze_shipping(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze shipping impact on conversion."""
        score = 0.5
        details = []

        shipping_days = product.get('shipping_time_max', 30)
        shipping_cost = product.get('shipping_cost', 0)

        # Shipping speed
        if shipping_days <= 3:
            score += 0.25
            details.append(f"Fast shipping: {shipping_days} days")
        elif shipping_days <= 7:
            score += 0.15
            details.append(f"Standard shipping: {shipping_days} days")
        elif shipping_days <= 14:
            score += 0.05
            details.append(f"Shipping: {shipping_days} days")
        else:
            score -= 0.2
            details.append(f"Slow shipping: {shipping_days}+ days")

        # Shipping cost
        if shipping_cost == 0 or product.get('free_shipping'):
            score += 0.2
            details.append("Free shipping")
        elif shipping_cost < 5:
            score += 0.1
            details.append(f"Low shipping cost: ${shipping_cost}")
        elif shipping_cost > 10:
            score -= 0.1
            details.append(f"High shipping cost: ${shipping_cost}")

        # Has tracking
        if product.get('has_tracking', True):
            score += 0.05
            details.append("Tracking available")

        return {
            'score': max(min(score, 1.0), 0.0),
            'details': details,
        }

    def _analyze_title(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze title quality."""
        score = 0.5
        details = []

        title = product.get('title', '') or product.get('name', '')

        if not title:
            return {'score': 0.2, 'details': ['Missing title']}

        # Length check
        if 40 <= len(title) <= 80:
            score += 0.2
            details.append("Optimal title length")
        elif len(title) < 20:
            score -= 0.1
            details.append("Title too short")
        elif len(title) > 150:
            score -= 0.1
            details.append("Title too long")

        # Contains key elements
        title_lower = title.lower()

        # Brand presence
        if product.get('brand') and product.get('brand').lower() in title_lower:
            score += 0.1
            details.append("Brand in title")

        # Keyword richness (simple check)
        word_count = len(title.split())
        if 5 <= word_count <= 12:
            score += 0.1
            details.append("Good keyword density")

        # Avoid spam indicators
        spam_indicators = ['!!!', 'buy now', 'best price', 'free gift']
        if any(spam in title_lower for spam in spam_indicators):
            score -= 0.15
            details.append("Spammy language in title")

        return {
            'score': max(min(score, 1.0), 0.0),
            'details': details,
        }

    def _analyze_description(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze description quality."""
        score = 0.5
        details = []

        description = product.get('description', '')

        if not description:
            return {'score': 0.2, 'details': ['Missing description']}

        # Length check
        desc_length = len(description)
        if desc_length >= 500:
            score += 0.2
            details.append("Detailed description")
        elif desc_length >= 200:
            score += 0.1
            details.append("Adequate description")
        else:
            score -= 0.1
            details.append("Description too short")

        # Has bullet points / formatting
        if '<li>' in description or '•' in description or '\n-' in description:
            score += 0.1
            details.append("Formatted with bullet points")

        # Has specifications
        if product.get('specifications') or product.get('attributes'):
            score += 0.1
            details.append("Product specifications available")

        return {
            'score': max(min(score, 1.0), 0.0),
            'details': details,
        }

    def _analyze_trust_signals(
        self,
        product: Dict[str, Any],
        listing_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze trust signals."""
        score = 0.5
        details = []

        # Return policy
        if product.get('has_return_policy') or (listing_data and listing_data.get('return_policy')):
            score += 0.15
            details.append("Return policy displayed")

        # Warranty
        if product.get('warranty'):
            score += 0.1
            details.append("Warranty offered")

        # Secure badges
        if listing_data and listing_data.get('trust_badges'):
            score += 0.1
            details.append("Trust badges displayed")

        # Verified seller
        if product.get('verified_seller'):
            score += 0.1
            details.append("Verified seller")

        # Customer Q&A
        if product.get('qa_count', 0) > 0:
            score += 0.05
            details.append("Customer Q&A available")

        return {
            'score': max(min(score, 1.0), 0.0),
            'details': details,
        }

    def _calculate_predicted_rate(
        self,
        factor_scores: Dict[ConversionFactor, float],
        category: str
    ) -> float:
        """Calculate predicted conversion rate."""
        # Get category benchmark
        category_lower = category.lower()
        benchmark = self.benchmarks.get('default')

        for cat, bench in self.benchmarks.items():
            if cat in category_lower:
                benchmark = bench
                break

        # Calculate weighted score
        weighted_score = 0.0
        for factor, weight in self.factor_weights.items():
            score = factor_scores.get(factor, 0.5)
            weighted_score += score * weight

        # Apply to benchmark
        # Score of 0.5 = benchmark, 1.0 = 2x benchmark, 0.0 = 0.25x benchmark
        multiplier = 0.25 + (weighted_score * 1.75)
        predicted = benchmark * multiplier

        return max(min(predicted, 15.0), 0.1)  # Cap at 15%, min 0.1%

    def _calculate_potential_rate(
        self,
        factor_scores: Dict[ConversionFactor, float],
        product: Dict[str, Any]
    ) -> float:
        """Calculate potential rate with optimizations."""
        # Assume all factors can reach 0.85
        optimized_scores = {}
        for factor, score in factor_scores.items():
            optimized_scores[factor] = max(score, 0.85)

        return self._calculate_predicted_rate(
            optimized_scores, product.get('category', '')
        )

    def _generate_optimizations(
        self,
        factor_scores: Dict[ConversionFactor, float],
        product: Dict[str, Any],
        listing_data: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Generate optimization recommendations."""
        optimizations = []

        # Sort factors by score (lowest first = biggest opportunities)
        sorted_factors = sorted(
            factor_scores.items(),
            key=lambda x: x[1]
        )

        for factor, score in sorted_factors:
            if score < 0.7:  # Room for improvement
                opt = self._get_optimization_for_factor(
                    factor, score, product, listing_data
                )
                if opt:
                    optimizations.append(opt)

        # Limit to top 5 most impactful
        return optimizations[:5]

    def _get_optimization_for_factor(
        self,
        factor: ConversionFactor,
        score: float,
        product: Dict[str, Any],
        listing_data: Optional[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """Get specific optimization for a factor."""
        impact = 'high' if score < 0.4 else 'medium'

        if factor == ConversionFactor.PRICE:
            return {
                'factor': factor.value,
                'priority': 1 if score < 0.4 else 2,
                'impact': impact,
                'action': 'Optimize pricing strategy',
                'details': [
                    'A/B test different price points',
                    'Add compare-at price for perceived discount',
                    'Consider bundle pricing',
                ],
                'estimated_lift': '10-25%',
            }

        elif factor == ConversionFactor.IMAGES:
            image_count = len(product.get('images', []))
            return {
                'factor': factor.value,
                'priority': 1,
                'impact': impact,
                'action': 'Improve product images',
                'details': [
                    f'Add more images (currently {image_count})',
                    'Include lifestyle/in-use photos',
                    'Add product video',
                    'Ensure high resolution and zoom capability',
                ],
                'estimated_lift': '15-30%',
            }

        elif factor == ConversionFactor.REVIEWS:
            return {
                'factor': factor.value,
                'priority': 2,
                'impact': impact,
                'action': 'Build social proof',
                'details': [
                    'Implement post-purchase review requests',
                    'Offer incentive for reviews',
                    'Display photo reviews prominently',
                    'Respond to negative reviews',
                ],
                'estimated_lift': '10-20%',
            }

        elif factor == ConversionFactor.SHIPPING:
            return {
                'factor': factor.value,
                'priority': 1,
                'impact': impact,
                'action': 'Improve shipping offer',
                'details': [
                    'Consider free shipping threshold',
                    'Find faster shipping suppliers',
                    'Display estimated delivery date',
                    'Add order tracking visibility',
                ],
                'estimated_lift': '15-35%',
            }

        elif factor == ConversionFactor.TITLE:
            return {
                'factor': factor.value,
                'priority': 3,
                'impact': 'medium',
                'action': 'Optimize product title',
                'details': [
                    'Include primary keyword',
                    'Add key product attributes',
                    'Keep under 80 characters',
                    'Test different title formats',
                ],
                'estimated_lift': '5-10%',
            }

        elif factor == ConversionFactor.DESCRIPTION:
            return {
                'factor': factor.value,
                'priority': 3,
                'impact': 'medium',
                'action': 'Enhance product description',
                'details': [
                    'Add benefit-focused bullet points',
                    'Include specifications table',
                    'Address common questions',
                    'Add comparison with alternatives',
                ],
                'estimated_lift': '5-15%',
            }

        elif factor == ConversionFactor.TRUST:
            return {
                'factor': factor.value,
                'priority': 2,
                'impact': impact,
                'action': 'Add trust signals',
                'details': [
                    'Display money-back guarantee',
                    'Add security badges',
                    'Show customer testimonials',
                    'Display seller verification',
                ],
                'estimated_lift': '10-20%',
            }

        return None

    def _generate_ab_tests(
        self,
        factor_scores: Dict[ConversionFactor, float],
        product: Dict[str, Any],
        current_rate: Optional[float]
    ) -> List[Dict[str, Any]]:
        """Generate A/B test suggestions."""
        tests = []

        # Price test
        if factor_scores.get(ConversionFactor.PRICE, 1) < 0.7:
            price = product.get('price', 0)
            tests.append({
                'name': 'Price Point Test',
                'hypothesis': 'A lower price point will increase conversion',
                'variant_a': f'Current price: ${price}',
                'variant_b': f'Test price: ${price * 0.9:.2f}',
                'metric': 'Conversion rate and revenue',
                'duration': '2 weeks',
                'traffic_split': '50/50',
            })

        # Shipping test
        if factor_scores.get(ConversionFactor.SHIPPING, 1) < 0.7:
            tests.append({
                'name': 'Free Shipping Threshold',
                'hypothesis': 'Free shipping offer increases conversion and AOV',
                'variant_a': 'Current shipping policy',
                'variant_b': 'Free shipping on orders over $35',
                'metric': 'Conversion rate and average order value',
                'duration': '2 weeks',
                'traffic_split': '50/50',
            })

        # Image test
        if factor_scores.get(ConversionFactor.IMAGES, 1) < 0.6:
            tests.append({
                'name': 'Hero Image Test',
                'hypothesis': 'Lifestyle hero image increases engagement',
                'variant_a': 'Product-only hero image',
                'variant_b': 'Lifestyle/in-use hero image',
                'metric': 'Click-through rate and conversion',
                'duration': '1 week',
                'traffic_split': '50/50',
            })

        # Title test
        tests.append({
            'name': 'Title Format Test',
            'hypothesis': 'Benefit-led title increases clicks',
            'variant_a': product.get('title', 'Current title'),
            'variant_b': 'Benefit-focused title variant',
            'metric': 'Click-through rate',
            'duration': '1 week',
            'traffic_split': '50/50',
        })

        return tests[:3]  # Return top 3 suggestions

    def _get_funnel_recommendations(
        self,
        from_stage: str,
        to_stage: str
    ) -> List[str]:
        """Get recommendations for funnel drop-off."""
        recommendations = {
            ('impressions', 'clicks'): [
                'Improve ad creative and copy',
                'Test different images',
                'Refine audience targeting',
                'Adjust bidding strategy',
            ],
            ('clicks', 'product_views'): [
                'Improve landing page load speed',
                'Ensure mobile responsiveness',
                'Match ad promise to landing page',
                'Simplify navigation',
            ],
            ('product_views', 'add_to_cart'): [
                'Improve product images',
                'Add urgency elements',
                'Display trust badges',
                'Simplify variant selection',
                'Show clear pricing',
            ],
            ('add_to_cart', 'checkout_initiated'): [
                'Add cart abandonment reminders',
                'Show shipping estimate in cart',
                'Offer guest checkout',
                'Display security badges',
            ],
            ('checkout_initiated', 'purchases'): [
                'Simplify checkout process',
                'Offer multiple payment options',
                'Display order summary clearly',
                'Add exit-intent offers',
                'Implement abandoned checkout emails',
            ],
        }

        return recommendations.get((from_stage, to_stage), [
            'Analyze user behavior at this stage',
            'A/B test different approaches',
            'Gather user feedback',
        ])

    def _determine_segment(self, customer: Dict[str, Any]) -> str:
        """Determine customer segment."""
        order_count = customer.get('order_count', 0)
        total_spent = customer.get('total_spent', 0)

        if order_count == 0:
            return 'new'
        elif order_count >= 5 or total_spent >= 500:
            return 'vip'
        else:
            return 'returning'

    def _calculate_confidence(
        self,
        listing_data: Optional[Dict[str, Any]],
        traffic_data: Optional[Dict[str, Any]],
        competitor_data: Optional[List[Dict[str, Any]]]
    ) -> float:
        """Calculate prediction confidence."""
        confidence = 0.5

        if listing_data:
            confidence += 0.15

        if traffic_data:
            confidence += 0.2
            if traffic_data.get('sample_size', 0) > 1000:
                confidence += 0.1

        if competitor_data and len(competitor_data) >= 3:
            confidence += 0.1

        return min(confidence, 1.0)
