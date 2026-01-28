"""
Dropshipping Fraud Detector
AI system to detect fraudulent orders, suppliers, and activities
"""

import numpy as np
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import logging
import hashlib
import re

logger = logging.getLogger(__name__)


class FraudType(Enum):
    """Types of fraud detected"""
    ORDER_FRAUD = "order_fraud"
    SUPPLIER_FRAUD = "supplier_fraud"
    PAYMENT_FRAUD = "payment_fraud"
    ACCOUNT_FRAUD = "account_fraud"
    RETURN_FRAUD = "return_fraud"
    PROMO_ABUSE = "promo_abuse"
    TRIANGULATION_FRAUD = "triangulation_fraud"
    IDENTITY_FRAUD = "identity_fraud"


class RiskLevel(Enum):
    """Risk assessment levels"""
    VERY_LOW = "very_low"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RecommendedAction(Enum):
    """Recommended actions for fraud cases"""
    APPROVE = "approve"
    REVIEW = "manual_review"
    HOLD = "hold_order"
    DECLINE = "decline"
    BLOCK = "block_account"
    ALERT = "alert_security"


@dataclass
class FraudAssessment:
    """Fraud assessment result"""
    entity_id: str
    entity_type: str  # 'order', 'supplier', 'customer', 'vendor'
    risk_level: RiskLevel
    risk_score: float  # 0-100
    fraud_types_detected: List[FraudType]
    risk_factors: List[Dict[str, Any]]
    recommended_action: RecommendedAction
    confidence: float
    explanation: str
    requires_verification: bool


class DropshippingFraudDetector:
    """
    AI-powered fraud detection for dropshipping operations.

    Detects:
    - Order fraud (stolen cards, fake orders)
    - Supplier fraud (scam suppliers, fake tracking)
    - Return abuse (serial returners, wardrobing)
    - Triangulation fraud (credit card scheme)
    - Promo abuse (coupon stacking, multiple accounts)
    - Account fraud (fake accounts, takeover)
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.risk_weights = {
            'payment': 0.25,
            'behavior': 0.20,
            'velocity': 0.20,
            'device': 0.15,
            'address': 0.10,
            'history': 0.10,
        }

        # Fraud indicators
        self.high_risk_emails = {'tempmail', 'guerrillamail', 'mailinator', '10minutemail'}
        self.high_risk_countries = {'NG', 'GH', 'PK', 'VN', 'ID'}  # High fraud rate
        self.proxy_indicators = {'datacenter', 'vpn', 'tor', 'proxy'}

    async def assess_order(
        self,
        order: Dict[str, Any],
        customer: Dict[str, Any],
        payment: Dict[str, Any],
        device_info: Optional[Dict[str, Any]] = None,
        order_history: Optional[List[Dict[str, Any]]] = None,
    ) -> FraudAssessment:
        """
        Assess fraud risk for an order.

        Args:
            order: Order details
            customer: Customer information
            payment: Payment details
            device_info: Device/browser fingerprint data
            order_history: Previous orders from this customer

        Returns:
            FraudAssessment with risk analysis
        """
        risk_factors = []
        fraud_types = []

        # Payment risk assessment
        payment_risk = self._assess_payment_risk(payment, customer)
        risk_factors.extend(payment_risk['factors'])
        if payment_risk['fraud_detected']:
            fraud_types.append(FraudType.PAYMENT_FRAUD)

        # Behavioral risk assessment
        behavior_risk = self._assess_behavior_risk(
            order, customer, order_history
        )
        risk_factors.extend(behavior_risk['factors'])
        if behavior_risk['promo_abuse']:
            fraud_types.append(FraudType.PROMO_ABUSE)

        # Velocity checks
        velocity_risk = self._assess_velocity(
            customer, order, order_history
        )
        risk_factors.extend(velocity_risk['factors'])
        if velocity_risk['velocity_abuse']:
            fraud_types.append(FraudType.ORDER_FRAUD)

        # Device/fingerprint analysis
        device_risk = self._assess_device_risk(device_info)
        risk_factors.extend(device_risk['factors'])

        # Address verification
        address_risk = self._assess_address_risk(
            order.get('shipping_address', {}),
            payment.get('billing_address', {})
        )
        risk_factors.extend(address_risk['factors'])

        # Check for triangulation fraud
        triangulation = self._check_triangulation_fraud(order, payment)
        if triangulation['detected']:
            fraud_types.append(FraudType.TRIANGULATION_FRAUD)
            risk_factors.extend(triangulation['factors'])

        # Calculate overall risk score
        risk_score = self._calculate_risk_score({
            'payment': payment_risk['score'],
            'behavior': behavior_risk['score'],
            'velocity': velocity_risk['score'],
            'device': device_risk['score'],
            'address': address_risk['score'],
            'history': self._get_history_score(order_history),
        })

        # Determine risk level and action
        risk_level = self._determine_risk_level(risk_score)
        recommended_action = self._determine_action(
            risk_level, fraud_types, order
        )

        # Generate explanation
        explanation = self._generate_explanation(
            risk_level, risk_factors, fraud_types
        )

        return FraudAssessment(
            entity_id=order.get('id', ''),
            entity_type='order',
            risk_level=risk_level,
            risk_score=round(risk_score, 2),
            fraud_types_detected=fraud_types,
            risk_factors=risk_factors,
            recommended_action=recommended_action,
            confidence=self._calculate_confidence(risk_factors),
            explanation=explanation,
            requires_verification=risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL],
        )

    async def assess_supplier(
        self,
        supplier: Dict[str, Any],
        order_history: Optional[List[Dict[str, Any]]] = None,
        reviews: Optional[List[Dict[str, Any]]] = None,
    ) -> FraudAssessment:
        """Assess fraud risk for a supplier."""
        risk_factors = []
        fraud_types = []

        # Check supplier legitimacy
        legitimacy = self._check_supplier_legitimacy(supplier)
        risk_factors.extend(legitimacy['factors'])
        if legitimacy['suspicious']:
            fraud_types.append(FraudType.SUPPLIER_FRAUD)

        # Analyze order fulfillment patterns
        if order_history:
            fulfillment = self._analyze_fulfillment_patterns(order_history)
            risk_factors.extend(fulfillment['factors'])
            if fulfillment['fraud_indicators']:
                fraud_types.append(FraudType.SUPPLIER_FRAUD)

        # Analyze reviews for fake patterns
        if reviews:
            review_analysis = self._analyze_review_authenticity(reviews)
            risk_factors.extend(review_analysis['factors'])

        # Calculate risk score
        risk_score = sum(f.get('score', 0) for f in risk_factors) / max(len(risk_factors), 1)
        risk_score = min(risk_score * 100, 100)

        risk_level = self._determine_risk_level(risk_score)

        return FraudAssessment(
            entity_id=supplier.get('id', ''),
            entity_type='supplier',
            risk_level=risk_level,
            risk_score=round(risk_score, 2),
            fraud_types_detected=fraud_types,
            risk_factors=risk_factors,
            recommended_action=self._determine_supplier_action(risk_level),
            confidence=0.7 if order_history else 0.5,
            explanation=self._generate_supplier_explanation(risk_factors),
            requires_verification=risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL],
        )

    async def assess_return(
        self,
        return_request: Dict[str, Any],
        customer: Dict[str, Any],
        return_history: Optional[List[Dict[str, Any]]] = None,
    ) -> FraudAssessment:
        """Assess return fraud risk."""
        risk_factors = []
        fraud_types = []

        # Return rate analysis
        if return_history:
            return_rate = len(return_history) / max(customer.get('order_count', 1), 1)

            if return_rate > 0.5:
                risk_factors.append({
                    'type': 'high_return_rate',
                    'description': f'Return rate: {return_rate:.0%}',
                    'score': 0.8,
                })
                fraud_types.append(FraudType.RETURN_FRAUD)
            elif return_rate > 0.3:
                risk_factors.append({
                    'type': 'elevated_return_rate',
                    'description': f'Return rate: {return_rate:.0%}',
                    'score': 0.4,
                })

        # Wardrobing detection (return after use)
        reason = return_request.get('reason', '').lower()
        wardrobing_indicators = ['didnt fit', 'changed mind', 'not as expected', 'wrong size']
        if any(ind in reason for ind in wardrobing_indicators):
            days_since_delivery = return_request.get('days_since_delivery', 0)
            if days_since_delivery > 20:
                risk_factors.append({
                    'type': 'potential_wardrobing',
                    'description': 'Late return after extended period',
                    'score': 0.6,
                })
                fraud_types.append(FraudType.RETURN_FRAUD)

        # Serial returner check
        if return_history and len(return_history) > 5:
            recent_returns = [
                r for r in return_history
                if self._parse_date(r.get('created_at')) > datetime.now() - timedelta(days=90)
            ]
            if len(recent_returns) > 3:
                risk_factors.append({
                    'type': 'serial_returner',
                    'description': f'{len(recent_returns)} returns in 90 days',
                    'score': 0.7,
                })
                fraud_types.append(FraudType.RETURN_FRAUD)

        # Calculate score
        risk_score = sum(f.get('score', 0) for f in risk_factors) / max(len(risk_factors), 1)
        risk_score = min(risk_score * 100, 100)

        risk_level = self._determine_risk_level(risk_score)

        return FraudAssessment(
            entity_id=return_request.get('id', ''),
            entity_type='return',
            risk_level=risk_level,
            risk_score=round(risk_score, 2),
            fraud_types_detected=fraud_types,
            risk_factors=risk_factors,
            recommended_action=self._determine_return_action(risk_level, return_request),
            confidence=0.65,
            explanation=self._generate_return_explanation(risk_factors),
            requires_verification=risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL],
        )

    async def batch_screen_orders(
        self,
        orders: List[Dict[str, Any]],
    ) -> List[FraudAssessment]:
        """Screen multiple orders for fraud."""
        results = []

        for order in orders:
            try:
                assessment = await self.assess_order(
                    order,
                    order.get('customer', {}),
                    order.get('payment', {}),
                    order.get('device_info'),
                )
                results.append(assessment)
            except Exception as e:
                logger.error(f"Failed to assess order {order.get('id')}: {e}")

        return results

    def _assess_payment_risk(
        self,
        payment: Dict[str, Any],
        customer: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Assess payment-related fraud risk."""
        factors = []
        score = 0.0
        fraud_detected = False

        # Card verification
        if not payment.get('cvv_match'):
            factors.append({
                'type': 'cvv_mismatch',
                'description': 'CVV verification failed',
                'score': 0.8,
            })
            score += 0.3

        if not payment.get('avs_match'):
            factors.append({
                'type': 'avs_mismatch',
                'description': 'Address verification failed',
                'score': 0.6,
            })
            score += 0.2

        # Card BIN analysis
        card_country = payment.get('card_country', '')
        customer_country = customer.get('country', '')
        if card_country and customer_country and card_country != customer_country:
            factors.append({
                'type': 'country_mismatch',
                'description': f'Card from {card_country}, customer in {customer_country}',
                'score': 0.5,
            })
            score += 0.15

        # High-risk payment patterns
        if payment.get('is_prepaid_card'):
            factors.append({
                'type': 'prepaid_card',
                'description': 'Prepaid card used',
                'score': 0.3,
            })
            score += 0.1

        # Multiple failed attempts
        failed_attempts = payment.get('failed_attempts', 0)
        if failed_attempts >= 3:
            factors.append({
                'type': 'multiple_failures',
                'description': f'{failed_attempts} failed payment attempts',
                'score': 0.7,
            })
            score += 0.25
            fraud_detected = True

        return {
            'score': min(score, 1.0),
            'factors': factors,
            'fraud_detected': fraud_detected,
        }

    def _assess_behavior_risk(
        self,
        order: Dict[str, Any],
        customer: Dict[str, Any],
        order_history: Optional[List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """Assess behavioral fraud indicators."""
        factors = []
        score = 0.0
        promo_abuse = False

        # New account large order
        account_age_days = customer.get('account_age_days', 0)
        order_total = order.get('total', 0)

        if account_age_days < 7 and order_total > 500:
            factors.append({
                'type': 'new_account_large_order',
                'description': f'New account ({account_age_days} days) with ${order_total} order',
                'score': 0.6,
            })
            score += 0.2

        # Email domain check
        email = customer.get('email', '')
        email_domain = email.split('@')[-1].lower() if '@' in email else ''
        if any(temp in email_domain for temp in self.high_risk_emails):
            factors.append({
                'type': 'disposable_email',
                'description': 'Disposable email service detected',
                'score': 0.7,
            })
            score += 0.25

        # Promo code abuse
        promo_codes = order.get('promo_codes_used', [])
        if len(promo_codes) > 1:
            factors.append({
                'type': 'multiple_promos',
                'description': f'{len(promo_codes)} promo codes used',
                'score': 0.4,
            })
            score += 0.1
            promo_abuse = True

        # First order with promo
        if account_age_days < 1 and promo_codes:
            factors.append({
                'type': 'new_account_promo',
                'description': 'New account using promo code',
                'score': 0.3,
            })
            score += 0.1

        # Unusual quantity
        max_quantity = max([item.get('quantity', 1) for item in order.get('items', [])], default=1)
        if max_quantity > 10:
            factors.append({
                'type': 'high_quantity',
                'description': f'High quantity order ({max_quantity} items)',
                'score': 0.4,
            })
            score += 0.15

        return {
            'score': min(score, 1.0),
            'factors': factors,
            'promo_abuse': promo_abuse,
        }

    def _assess_velocity(
        self,
        customer: Dict[str, Any],
        order: Dict[str, Any],
        order_history: Optional[List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """Assess velocity-based fraud indicators."""
        factors = []
        score = 0.0
        velocity_abuse = False

        if not order_history:
            return {'score': 0.0, 'factors': [], 'velocity_abuse': False}

        # Orders in last 24 hours
        now = datetime.now()
        recent_orders = [
            o for o in order_history
            if self._parse_date(o.get('created_at')) > now - timedelta(hours=24)
        ]

        if len(recent_orders) >= 5:
            factors.append({
                'type': 'high_velocity',
                'description': f'{len(recent_orders)} orders in 24 hours',
                'score': 0.8,
            })
            score += 0.35
            velocity_abuse = True
        elif len(recent_orders) >= 3:
            factors.append({
                'type': 'elevated_velocity',
                'description': f'{len(recent_orders)} orders in 24 hours',
                'score': 0.5,
            })
            score += 0.2

        # Shipping address velocity
        shipping_address = order.get('shipping_address', {})
        address_hash = self._hash_address(shipping_address)

        different_addresses = len(set(
            self._hash_address(o.get('shipping_address', {}))
            for o in order_history[-10:]
        ))

        if different_addresses > 5:
            factors.append({
                'type': 'multiple_addresses',
                'description': f'{different_addresses} different shipping addresses recently',
                'score': 0.6,
            })
            score += 0.25

        # Payment method velocity
        payment_methods = len(set(
            o.get('payment', {}).get('last_four', '')
            for o in order_history[-10:]
            if o.get('payment', {}).get('last_four')
        ))

        if payment_methods > 3:
            factors.append({
                'type': 'multiple_cards',
                'description': f'{payment_methods} different payment methods',
                'score': 0.7,
            })
            score += 0.3
            velocity_abuse = True

        return {
            'score': min(score, 1.0),
            'factors': factors,
            'velocity_abuse': velocity_abuse,
        }

    def _assess_device_risk(
        self,
        device_info: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Assess device/fingerprint risk."""
        factors = []
        score = 0.0

        if not device_info:
            return {'score': 0.2, 'factors': [{
                'type': 'no_device_info',
                'description': 'Device fingerprint unavailable',
                'score': 0.2,
            }]}

        # Proxy/VPN detection
        ip_type = device_info.get('ip_type', '').lower()
        if any(proxy in ip_type for proxy in self.proxy_indicators):
            factors.append({
                'type': 'proxy_detected',
                'description': f'Connection via {ip_type}',
                'score': 0.6,
            })
            score += 0.25

        # Geographic mismatch
        ip_country = device_info.get('ip_country', '')
        browser_timezone = device_info.get('timezone', '')
        if ip_country and browser_timezone:
            # Simple timezone mismatch check
            us_timezones = ['America/', 'US/']
            if ip_country == 'US' and not any(tz in browser_timezone for tz in us_timezones):
                factors.append({
                    'type': 'timezone_mismatch',
                    'description': 'IP location doesn\'t match browser timezone',
                    'score': 0.5,
                })
                score += 0.2

        # Known bad fingerprint
        if device_info.get('is_known_fraud_device'):
            factors.append({
                'type': 'known_fraud_device',
                'description': 'Device associated with previous fraud',
                'score': 1.0,
            })
            score += 0.5

        # Headless browser detection
        if device_info.get('is_headless'):
            factors.append({
                'type': 'headless_browser',
                'description': 'Automated browser detected',
                'score': 0.8,
            })
            score += 0.35

        return {
            'score': min(score, 1.0),
            'factors': factors,
        }

    def _assess_address_risk(
        self,
        shipping: Dict[str, Any],
        billing: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Assess address-related risk."""
        factors = []
        score = 0.0

        # Shipping/billing mismatch
        if shipping and billing:
            ship_country = shipping.get('country', '')
            bill_country = billing.get('country', '')

            if ship_country and bill_country and ship_country != bill_country:
                factors.append({
                    'type': 'country_mismatch',
                    'description': f'Shipping to {ship_country}, billing in {bill_country}',
                    'score': 0.5,
                })
                score += 0.2

        # High-risk destination
        ship_country = shipping.get('country', '')
        if ship_country in self.high_risk_countries:
            factors.append({
                'type': 'high_risk_country',
                'description': f'Shipping to high-risk country: {ship_country}',
                'score': 0.6,
            })
            score += 0.25

        # PO Box / freight forwarder
        address_line = shipping.get('address1', '').lower()
        if 'p.o. box' in address_line or 'po box' in address_line:
            factors.append({
                'type': 'po_box',
                'description': 'Shipping to PO Box',
                'score': 0.3,
            })
            score += 0.1

        # Freight forwarder patterns
        forwarder_patterns = ['shipito', 'myus', 'planet express', 'stackry']
        if any(pattern in address_line for pattern in forwarder_patterns):
            factors.append({
                'type': 'freight_forwarder',
                'description': 'Freight forwarder address detected',
                'score': 0.5,
            })
            score += 0.2

        return {
            'score': min(score, 1.0),
            'factors': factors,
        }

    def _check_triangulation_fraud(
        self,
        order: Dict[str, Any],
        payment: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check for triangulation fraud indicators."""
        factors = []
        detected = False

        # Different ship-to name than cardholder
        ship_name = order.get('shipping_address', {}).get('name', '').lower()
        card_name = payment.get('cardholder_name', '').lower()

        if ship_name and card_name and ship_name != card_name:
            # Check if it's substantially different (not just formatting)
            ship_parts = set(ship_name.split())
            card_parts = set(card_name.split())

            overlap = len(ship_parts & card_parts)
            if overlap == 0:
                factors.append({
                    'type': 'name_mismatch',
                    'description': 'Shipping name differs completely from cardholder',
                    'score': 0.7,
                })
                detected = True

        # Gift order patterns
        if order.get('is_gift') and order.get('total', 0) > 200:
            factors.append({
                'type': 'high_value_gift',
                'description': 'High-value order marked as gift',
                'score': 0.4,
            })

        return {
            'detected': detected,
            'factors': factors,
        }

    def _check_supplier_legitimacy(
        self,
        supplier: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check supplier legitimacy indicators."""
        factors = []
        suspicious = False

        # Account age
        created_at = supplier.get('created_at')
        if created_at:
            age_days = (datetime.now() - self._parse_date(created_at)).days
            if age_days < 30:
                factors.append({
                    'type': 'new_supplier',
                    'description': f'Supplier account only {age_days} days old',
                    'score': 0.5,
                })

        # Verification status
        if not supplier.get('is_verified'):
            factors.append({
                'type': 'unverified',
                'description': 'Supplier not verified',
                'score': 0.4,
            })

        # Contact information
        if not supplier.get('phone') and not supplier.get('verified_email'):
            factors.append({
                'type': 'missing_contact',
                'description': 'No verified contact information',
                'score': 0.6,
            })
            suspicious = True

        # Low ratings with high volume claims
        rating = supplier.get('rating', 0)
        claimed_orders = supplier.get('total_orders', 0)

        if rating < 3.5 and claimed_orders > 1000:
            factors.append({
                'type': 'rating_mismatch',
                'description': f'Low rating ({rating}) despite high order claims',
                'score': 0.5,
            })

        # Prices too good to be true
        if supplier.get('avg_discount_rate', 0) > 0.8:
            factors.append({
                'type': 'extreme_pricing',
                'description': 'Prices significantly below market',
                'score': 0.7,
            })
            suspicious = True

        return {
            'factors': factors,
            'suspicious': suspicious,
        }

    def _analyze_fulfillment_patterns(
        self,
        order_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze supplier fulfillment patterns for fraud."""
        factors = []
        fraud_indicators = False

        if not order_history:
            return {'factors': [], 'fraud_indicators': False}

        # Fake tracking numbers
        tracking_issues = sum(
            1 for o in order_history
            if o.get('tracking_invalid') or o.get('tracking_no_updates')
        )

        if tracking_issues > len(order_history) * 0.3:
            factors.append({
                'type': 'tracking_issues',
                'description': f'{tracking_issues} orders with tracking problems',
                'score': 0.7,
            })
            fraud_indicators = True

        # Non-delivery rate
        non_delivered = sum(
            1 for o in order_history
            if o.get('status') in ['LOST', 'NOT_RECEIVED', 'DISPUTED']
        )

        if non_delivered > len(order_history) * 0.2:
            factors.append({
                'type': 'high_nondelivery',
                'description': f'{non_delivered} orders not delivered',
                'score': 0.8,
            })
            fraud_indicators = True

        # Wrong items sent
        wrong_items = sum(1 for o in order_history if o.get('wrong_item_sent'))
        if wrong_items > len(order_history) * 0.15:
            factors.append({
                'type': 'wrong_items',
                'description': f'{wrong_items} orders received wrong items',
                'score': 0.6,
            })

        return {
            'factors': factors,
            'fraud_indicators': fraud_indicators,
        }

    def _analyze_review_authenticity(
        self,
        reviews: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze reviews for fake patterns."""
        factors = []

        if not reviews or len(reviews) < 5:
            return {'factors': []}

        # Review timing clusters
        review_dates = [
            self._parse_date(r.get('created_at'))
            for r in reviews if r.get('created_at')
        ]

        if review_dates:
            # Check for suspiciously clustered reviews
            review_dates.sort()
            clusters = 0
            for i in range(1, len(review_dates)):
                if (review_dates[i] - review_dates[i-1]).days < 1:
                    clusters += 1

            if clusters > len(review_dates) * 0.5:
                factors.append({
                    'type': 'clustered_reviews',
                    'description': 'Reviews suspiciously clustered in time',
                    'score': 0.6,
                })

        # All 5-star reviews
        ratings = [r.get('rating', 0) for r in reviews]
        if all(r == 5 for r in ratings):
            factors.append({
                'type': 'all_perfect_ratings',
                'description': 'All reviews are 5 stars',
                'score': 0.5,
            })

        # Similar review text
        texts = [r.get('text', '') for r in reviews if r.get('text')]
        if texts:
            # Simple similarity check
            avg_length = sum(len(t) for t in texts) / len(texts)
            if avg_length < 50:
                factors.append({
                    'type': 'short_reviews',
                    'description': 'Reviews are unusually short',
                    'score': 0.3,
                })

        return {'factors': factors}

    def _calculate_risk_score(
        self,
        component_scores: Dict[str, float]
    ) -> float:
        """Calculate weighted overall risk score."""
        total = 0.0

        for component, weight in self.risk_weights.items():
            score = component_scores.get(component, 0)
            total += score * weight

        return min(total * 100, 100)

    def _get_history_score(
        self,
        order_history: Optional[List[Dict[str, Any]]]
    ) -> float:
        """Get risk score from order history."""
        if not order_history:
            return 0.3  # Unknown history is slightly risky

        if len(order_history) == 0:
            return 0.3

        # Good history reduces risk
        successful = sum(
            1 for o in order_history
            if o.get('status') in ['DELIVERED', 'COMPLETED']
        )

        chargebacks = sum(1 for o in order_history if o.get('chargeback'))

        if chargebacks > 0:
            return 0.8 + (chargebacks * 0.1)

        success_rate = successful / len(order_history)

        if success_rate > 0.9:
            return 0.1  # Very low risk
        elif success_rate > 0.7:
            return 0.3
        else:
            return 0.5

    def _determine_risk_level(self, score: float) -> RiskLevel:
        """Determine risk level from score."""
        if score >= 80:
            return RiskLevel.CRITICAL
        elif score >= 60:
            return RiskLevel.HIGH
        elif score >= 40:
            return RiskLevel.MEDIUM
        elif score >= 20:
            return RiskLevel.LOW
        else:
            return RiskLevel.VERY_LOW

    def _determine_action(
        self,
        risk_level: RiskLevel,
        fraud_types: List[FraudType],
        order: Dict[str, Any]
    ) -> RecommendedAction:
        """Determine recommended action."""
        if risk_level == RiskLevel.CRITICAL:
            return RecommendedAction.DECLINE
        elif risk_level == RiskLevel.HIGH:
            if FraudType.PAYMENT_FRAUD in fraud_types:
                return RecommendedAction.DECLINE
            return RecommendedAction.HOLD
        elif risk_level == RiskLevel.MEDIUM:
            return RecommendedAction.REVIEW
        else:
            return RecommendedAction.APPROVE

    def _determine_supplier_action(
        self,
        risk_level: RiskLevel
    ) -> RecommendedAction:
        """Determine action for supplier risk."""
        if risk_level == RiskLevel.CRITICAL:
            return RecommendedAction.BLOCK
        elif risk_level == RiskLevel.HIGH:
            return RecommendedAction.ALERT
        elif risk_level == RiskLevel.MEDIUM:
            return RecommendedAction.REVIEW
        else:
            return RecommendedAction.APPROVE

    def _determine_return_action(
        self,
        risk_level: RiskLevel,
        return_request: Dict[str, Any]
    ) -> RecommendedAction:
        """Determine action for return request."""
        if risk_level == RiskLevel.CRITICAL:
            return RecommendedAction.DECLINE
        elif risk_level == RiskLevel.HIGH:
            return RecommendedAction.REVIEW
        else:
            return RecommendedAction.APPROVE

    def _calculate_confidence(
        self,
        risk_factors: List[Dict[str, Any]]
    ) -> float:
        """Calculate confidence in the assessment."""
        if not risk_factors:
            return 0.5

        # More factors = higher confidence
        base = 0.5
        factor_boost = min(len(risk_factors) * 0.1, 0.4)

        # High-score factors increase confidence
        high_score_factors = sum(1 for f in risk_factors if f.get('score', 0) > 0.6)
        high_score_boost = min(high_score_factors * 0.05, 0.1)

        return min(base + factor_boost + high_score_boost, 1.0)

    def _generate_explanation(
        self,
        risk_level: RiskLevel,
        risk_factors: List[Dict[str, Any]],
        fraud_types: List[FraudType]
    ) -> str:
        """Generate human-readable explanation."""
        if risk_level == RiskLevel.VERY_LOW:
            return "Low risk order. No significant fraud indicators detected."

        parts = [f"Risk Level: {risk_level.value.upper()}."]

        if fraud_types:
            types_str = ', '.join(ft.value.replace('_', ' ') for ft in fraud_types)
            parts.append(f"Potential fraud types: {types_str}.")

        # Top risk factors
        top_factors = sorted(risk_factors, key=lambda x: x.get('score', 0), reverse=True)[:3]
        if top_factors:
            factors_str = '; '.join(f['description'] for f in top_factors)
            parts.append(f"Key factors: {factors_str}.")

        return ' '.join(parts)

    def _generate_supplier_explanation(
        self,
        risk_factors: List[Dict[str, Any]]
    ) -> str:
        """Generate supplier risk explanation."""
        if not risk_factors:
            return "No significant risk factors identified for this supplier."

        factors_str = '; '.join(f['description'] for f in risk_factors[:3])
        return f"Supplier risk factors: {factors_str}."

    def _generate_return_explanation(
        self,
        risk_factors: List[Dict[str, Any]]
    ) -> str:
        """Generate return fraud explanation."""
        if not risk_factors:
            return "Return request appears legitimate."

        factors_str = '; '.join(f['description'] for f in risk_factors[:3])
        return f"Return risk factors: {factors_str}."

    def _hash_address(self, address: Dict[str, Any]) -> str:
        """Create hash of address for comparison."""
        addr_str = f"{address.get('address1', '')}{address.get('city', '')}{address.get('postal_code', '')}"
        return hashlib.md5(addr_str.lower().encode()).hexdigest()

    def _parse_date(self, date_val: Any) -> datetime:
        """Parse date value to datetime."""
        if isinstance(date_val, datetime):
            return date_val
        if isinstance(date_val, str):
            try:
                return datetime.fromisoformat(date_val.replace('Z', '+00:00'))
            except:
                return datetime.now()
        return datetime.now()
