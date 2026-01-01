#!/bin/bash

# Broxiva Fraud Detection Workflow Test Script
# Tests all risk levels with sample data

WEBHOOK_URL="${N8N_WEBHOOK_URL:-https://n8n.broxiva.com/webhook/fraud-detection}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "========================================"
echo "Broxiva Fraud Detection Test Suite"
echo "========================================"
echo "Webhook URL: $WEBHOOK_URL"
echo "Timestamp: $TIMESTAMP"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
ORANGE='\033[0;33m'
NC='\033[0m' # No Color

# Test 1: Low Risk Order
echo -e "${GREEN}Test 1: Low Risk Order (Expected Score: ~15)${NC}"
echo "Description: Existing customer, corporate email, matching addresses, normal order"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST-LOW-001",
    "customerId": "CUST-EXISTING-12345",
    "customerEmail": "john.doe@company.com",
    "total": 149.99,
    "billingAddress": {
      "country": "US",
      "postalCode": "10001",
      "city": "New York",
      "state": "NY"
    },
    "shippingAddress": {
      "country": "US",
      "postalCode": "10001",
      "city": "New York",
      "state": "NY"
    },
    "shippingMethod": "standard",
    "ipAddress": "192.168.1.100",
    "paymentMethod": "stripe",
    "stripeChargeId": "ch_test_low_risk",
    "createdAt": "'$TIMESTAMP'"
  }' \
  -s | jq '.'
echo ""
sleep 2

# Test 2: Medium Risk Order
echo -e "${YELLOW}Test 2: Medium Risk Order (Expected Score: 40-50)${NC}"
echo "Description: New customer, free email, high value, address mismatch"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST-MEDIUM-001",
    "customerId": "CUST-NEW-67890",
    "customerEmail": "customer123@gmail.com",
    "total": 749.99,
    "billingAddress": {
      "country": "US",
      "postalCode": "10001",
      "city": "New York",
      "state": "NY"
    },
    "shippingAddress": {
      "country": "CA",
      "postalCode": "M5H2N2",
      "city": "Toronto",
      "state": "ON"
    },
    "shippingMethod": "standard",
    "ipAddress": "192.168.1.100",
    "paymentMethod": "stripe",
    "stripeChargeId": "ch_test_medium_risk",
    "createdAt": "'$TIMESTAMP'"
  }' \
  -s | jq '.'
echo ""
sleep 2

# Test 3: High Risk Order
echo -e "${ORANGE}Test 3: High Risk Order (Expected Score: 70-80)${NC}"
echo "Description: New customer, high value, high-risk country, express shipping, IP mismatch"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST-HIGH-001",
    "customerId": "CUST-NEW-11111",
    "customerEmail": "buyer@yahoo.com",
    "total": 1299.99,
    "billingAddress": {
      "country": "US",
      "postalCode": "10001",
      "city": "New York",
      "state": "NY"
    },
    "shippingAddress": {
      "country": "NG",
      "postalCode": "100001",
      "city": "Lagos",
      "state": "Lagos"
    },
    "shippingMethod": "express",
    "ipAddress": "41.203.100.50",
    "paymentMethod": "stripe",
    "stripeChargeId": "ch_test_high_risk",
    "createdAt": "'$TIMESTAMP'"
  }' \
  -s | jq '.'
echo ""
sleep 2

# Test 4: Critical Risk Order
echo -e "${RED}Test 4: Critical Risk Order (Expected Score: 90-100)${NC}"
echo "Description: Disposable email, high value, high-risk country, express shipping, multiple risk factors"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST-CRITICAL-001",
    "customerId": "CUST-FRAUD-99999",
    "customerEmail": "scammer@tempmail.com",
    "total": 2499.99,
    "billingAddress": {
      "country": "US",
      "postalCode": "10001",
      "city": "New York",
      "state": "NY"
    },
    "shippingAddress": {
      "country": "NG",
      "postalCode": "100001",
      "city": "Lagos",
      "state": "Lagos"
    },
    "shippingMethod": "overnight",
    "ipAddress": "41.203.100.50",
    "paymentMethod": "stripe",
    "stripeChargeId": "ch_test_critical_risk",
    "createdAt": "'$TIMESTAMP'"
  }' \
  -s | jq '.'
echo ""
sleep 2

# Test 5: Edge Case - Multiple Failed Payments
echo -e "${YELLOW}Test 5: Edge Case - Customer with Failed Payment History${NC}"
echo "Description: Testing failed payment attempt detection"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST-EDGE-001",
    "customerId": "CUST-FAILED-PAYMENTS",
    "customerEmail": "customer@gmail.com",
    "total": 399.99,
    "billingAddress": {
      "country": "US",
      "postalCode": "10001",
      "city": "New York",
      "state": "NY"
    },
    "shippingAddress": {
      "country": "US",
      "postalCode": "10001",
      "city": "New York",
      "state": "NY"
    },
    "shippingMethod": "standard",
    "ipAddress": "192.168.1.100",
    "paymentMethod": "stripe",
    "stripeChargeId": "ch_test_failed_payments",
    "createdAt": "'$TIMESTAMP'"
  }' \
  -s | jq '.'
echo ""
sleep 2

# Test 6: Edge Case - Order Velocity
echo -e "${YELLOW}Test 6: Edge Case - High Order Velocity${NC}"
echo "Description: Testing order velocity detection (3rd order in 24h)"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST-VELOCITY-003",
    "customerId": "CUST-VELOCITY-TEST",
    "customerEmail": "frequent@buyer.com",
    "total": 199.99,
    "billingAddress": {
      "country": "US",
      "postalCode": "10001",
      "city": "New York",
      "state": "NY"
    },
    "shippingAddress": {
      "country": "US",
      "postalCode": "10001",
      "city": "New York",
      "state": "NY"
    },
    "shippingMethod": "standard",
    "ipAddress": "192.168.1.100",
    "paymentMethod": "stripe",
    "stripeChargeId": "ch_test_velocity",
    "createdAt": "'$TIMESTAMP'"
  }' \
  -s | jq '.'
echo ""

echo "========================================"
echo "Test Suite Complete"
echo "========================================"
echo ""
echo "Next Steps:"
echo "1. Check Slack channels #fraud-review and #fraud-alerts for notifications"
echo "2. Review Zendesk tickets for high-risk orders"
echo "3. Verify order statuses in admin panel"
echo "4. Check audit logs: GET /v1/audit/fraud-decisions"
echo ""
echo "Expected Results:"
echo "- TEST-LOW-001:      Auto-approved (no alerts)"
echo "- TEST-MEDIUM-001:   Held for review (Slack #fraud-review)"
echo "- TEST-HIGH-001:     Manual review (Slack urgent + Zendesk)"
echo "- TEST-CRITICAL-001: Auto-cancelled + blocked (Slack critical)"
echo "- TEST-EDGE-001:     Depends on failed payment history"
echo "- TEST-VELOCITY-003: +25 points for velocity if >2 orders found"
echo ""
