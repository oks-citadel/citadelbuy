# Broxiva Returns & Refunds Automation - Workflow 6

## Overview

This n8n workflow automates the complete returns and refunds process for Broxiva, from initial request validation through refund processing and post-return surveys.

## Workflow Architecture

### Trigger 1: Return Request (`return.requested`)

**Webhook Endpoint:** `/broxiva-returns`

**Process Flow:**
1. Parse and validate return request
2. Check customer return history
3. Analyze eligibility based on business rules
4. Route to auto-approval or manual review
5. Generate shipping label (if approved)
6. Send return instructions or review notification

### Trigger 2: Return Received (`return.received`)

**Webhook Endpoint:** `/broxiva-return-received`

**Process Flow:**
1. Fetch complete return details
2. Update inventory by SKU and condition
3. Process Stripe refund
4. Mark return as completed
5. Send refund confirmation email
6. Wait 7 days
7. Send post-return survey

## Eligibility Rules

### Auto-Approval Criteria (ALL must be true)

✅ **Timeline:**
- Return request within 30 days of delivery date

✅ **Product Eligibility:**
- No non-returnable SKU patterns in order

✅ **Order Value:**
- Total refund amount ≤ $200

✅ **Return Reason:**
- Must be one of: `didnt_fit`, `changed_mind`, `ordered_wrong`, `color_not_as_expected`

✅ **Customer History:**
- Fewer than 3 returns in last 90 days

### Non-Returnable SKU Patterns

The following SKU prefixes are **NEVER** eligible for returns:

| Pattern | Category | Example |
|---------|----------|---------|
| `CB-DIGITAL-` | Digital goods | CB-DIGITAL-EBOOK-001 |
| `CB-FINAL-` | Final sale items | CB-FINAL-CLEARANCE-123 |
| `CB-PERSONAL-` | Personal care | CB-PERSONAL-COSMETIC-456 |
| `CB-FOOD-` | Consumable food | CB-FOOD-SUPPLEMENT-789 |
| `CB-SOFTWARE-` | Software licenses | CB-SOFTWARE-LICENSE-012 |

### Manual Review Triggers

Returns are flagged for manual review if ANY of these conditions are met:

⚠️ **High-Value Return:**
- Total refund amount > $200
- Priority: `high`

⚠️ **Damage/Defect Claim:**
- Return reason: `damaged`, `defective`, or `not_as_described`
- Requires physical inspection
- Priority: `high`

⚠️ **Frequent Returner:**
- 3 or more returns in last 90 days
- Priority: `normal`

⚠️ **Outside Policy Window:**
- More than 30 days since delivery
- Priority: `normal`

⚠️ **Non-Standard Reason:**
- Reason not in standard list
- Priority: `normal`

## Return Conditions & Inventory Impact

### Condition Classification

| Condition | Inventory Action | Restockable |
|-----------|-----------------|-------------|
| `unopened` | Restock to available inventory | Yes |
| `opened` | Move to open-box inventory | Yes (discounted) |
| `damaged` | Move to damaged inventory | No |
| `defective` | Move to defective inventory | No |

### Inventory Update Process

```json
POST /v1/inventory/adjust
{
  "sku": "CB-PROD-001",
  "quantity": 1,
  "type": "return",
  "condition": "unopened",
  "location": "returns_processing",
  "reference_id": "RET-001234",
  "notes": "Return received for order ORD-CB-12345"
}
```

## Refund Processing

### Stripe Refund Parameters

```javascript
{
  "charge": "ch_3ABC123xyz",           // Original charge ID
  "amount": 4999,                       // Amount in cents ($49.99)
  "reason": "requested_by_customer",
  "metadata": {
    "return_id": "RET-001234",
    "order_id": "ORD-CB-12345"
  }
}
```

### Refund Timeline

| Payment Method | Processing Time | Customer Visibility |
|----------------|-----------------|---------------------|
| Credit/Debit Card | 5-10 business days | "5-10 business days" |
| PayPal | 3-5 business days | "3-5 business days" |
| Store Credit | Immediate | "Immediately available" |

## Email Templates Required

### 1. Return Instructions Email (`return-instructions`)

**Sent:** After auto-approval and label generation

**Variables:**
- `customer_name`
- `return_id`
- `order_id`
- `items[]`
- `total_refund`
- `tracking_number`
- `label_url` (PDF)
- `return_deadline` (14 days from label generation)
- `instructions[]`

**Key Content:**
- Prepaid shipping label (PDF attachment)
- Return deadline (14 days)
- Packing instructions
- FedEx drop-off locations link

### 2. Return Under Review Email (`return-under-review`)

**Sent:** When return flagged for manual review

**Variables:**
- `customer_name`
- `return_id`
- `order_id`
- `review_timeframe` ("1-2 business days")
- `support_email`

**Key Content:**
- Review is in progress
- Expected response time
- Contact information for questions

### 3. Refund Processed Email (`refund-processed`)

**Sent:** After successful Stripe refund

**Variables:**
- `customer_name`
- `return_id`
- `order_id`
- `refund_amount`
- `refund_method` ("Original payment method")
- `processing_time` ("5-10 business days")
- `items[]`

**Key Content:**
- Refund confirmation
- Amount and timeline
- Items returned
- Thank you message

### 4. Post-Return Survey Email (`post-return-survey`)

**Sent:** 7 days after refund processed

**Variables:**
- `customer_name`
- `return_id`
- `order_id`
- `survey_url`
- `questions[]`

**Survey Questions:**
1. How easy was the return process? (1-5 stars)
2. How satisfied are you with the refund timeline? (1-5 stars)
3. Would you shop with us again? (Yes/No)
4. Any suggestions for improvement? (Free text)

## ShipStation Integration

### Return Label Generation

**Endpoint:** `POST https://ssapi.shipstation.com/shipments/createlabel`

**Return Address (Ship To):**
```json
{
  "name": "Broxiva Returns",
  "company": "Broxiva Inc",
  "street1": "500 Returns Pkwy",
  "city": "Commerce",
  "state": "CA",
  "postalCode": "90040",
  "country": "US",
  "phone": "888-555-0100"
}
```

**Default Carrier Settings:**
- Carrier: FedEx
- Service: FedEx Ground
- Package: Standard Package
- Weight: 5 lbs (default, adjust per product)
- Confirmation: None

## Zendesk Ticket Fields

### Custom Fields Required

| Field ID | Field Name | Type | Purpose |
|----------|-----------|------|---------|
| 360001 | Return ID | Text | Links ticket to return |
| 360002 | Order ID | Text | Links ticket to order |
| 360003 | Refund Amount | Decimal | Displays refund value |

### Ticket Tags

- `return-review` (all manual reviews)
- `returns` (category)
- `high-value` (if >$200)
- `frequent-returner` (if ≥3 returns/90d)

### Priority Levels

- **High:** High-value returns (>$200) or damage claims
- **Normal:** All other manual reviews

## API Endpoints Used

### Broxiva API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/customers/{id}/returns/history` | GET | Fetch customer return history |
| `/v1/returns/{id}/approve` | POST | Auto-approve return |
| `/v1/returns/{id}/update` | POST | Update return status |
| `/v1/returns/{id}` | GET | Get return details |
| `/v1/returns/{id}/complete` | POST | Mark return completed |
| `/v1/inventory/adjust` | POST | Update inventory |
| `/v1/emails/send` | POST | Send templated emails |

### External APIs

- **ShipStation API:** Label generation
- **Stripe API:** Refund processing
- **Zendesk API:** Ticket creation

## Configuration Requirements

### Environment Variables

```bash
# ShipStation
SHIPSTATION_API_KEY=your_api_key
SHIPSTATION_API_SECRET=your_api_secret

# Stripe
STRIPE_SECRET_KEY=sk_live_...

# Zendesk
ZENDESK_SUBDOMAIN=broxiva
ZENDESK_EMAIL=admin@broxiva.com
ZENDESK_API_TOKEN=your_token

# Broxiva API
BROXIVA_API_KEY=your_api_key
BROXIVA_API_URL=https://api.broxiva.com/v1
```

### n8n Credentials Required

1. **broxivaBuyApi** - HTTP Header Auth
2. **shipStationApi** - Basic Auth
3. **stripeApi** - Header Auth (Bearer)
4. **zendeskApi** - Basic Auth

## Testing

### Test Scenario 1: Auto-Approval

```bash
curl -X POST https://n8n.broxiva.com/webhook/broxiva-returns \
  -H "Content-Type: application/json" \
  -d '{
    "event": "return.requested",
    "data": {
      "return_id": "RET-TEST-001",
      "order_id": "ORD-CB-TEST-001",
      "customer_id": "cust_test123",
      "customer_email": "test@example.com",
      "items": [{
        "sku": "CB-PROD-001",
        "name": "Test Widget",
        "quantity": 1,
        "price": 49.99,
        "reason": "didnt_fit",
        "condition": "unopened"
      }],
      "total_refund": 49.99,
      "preferred_resolution": "refund",
      "order_date": "2024-11-01",
      "delivery_date": "2024-11-05"
    }
  }'
```

**Expected Result:** Auto-approved, label generated, email sent

### Test Scenario 2: Manual Review (High Value)

```bash
curl -X POST https://n8n.broxiva.com/webhook/broxiva-returns \
  -H "Content-Type: application/json" \
  -d '{
    "event": "return.requested",
    "data": {
      "return_id": "RET-TEST-002",
      "order_id": "ORD-CB-TEST-002",
      "customer_id": "cust_test456",
      "customer_email": "test2@example.com",
      "items": [{
        "sku": "CB-PROD-PREMIUM-001",
        "name": "Premium Widget",
        "quantity": 1,
        "price": 299.99,
        "reason": "didnt_fit",
        "condition": "unopened"
      }],
      "total_refund": 299.99,
      "preferred_resolution": "refund",
      "order_date": "2024-11-01",
      "delivery_date": "2024-11-05"
    }
  }'
```

**Expected Result:** Zendesk ticket created, review email sent

### Test Scenario 3: Return Received

```bash
curl -X POST https://n8n.broxiva.com/webhook/broxiva-return-received \
  -H "Content-Type: application/json" \
  -d '{
    "return_id": "RET-TEST-001",
    "received_at": "2024-11-20T10:30:00Z",
    "inspected_by": "warehouse_user_123"
  }'
```

**Expected Result:** Inventory updated, refund processed, confirmation email sent, survey scheduled

## Monitoring & Analytics

### Key Metrics to Track

1. **Auto-Approval Rate**
   - Target: >70%
   - Formula: Auto-approved / Total requests

2. **Average Processing Time**
   - Target: <2 hours for auto-approval
   - Target: <24 hours for manual review

3. **Return Rate by Category**
   - Track SKU patterns
   - Identify product quality issues

4. **Frequent Returner Rate**
   - Percentage of customers with ≥3 returns/90d
   - Target: <5%

5. **Refund Processing Time**
   - From return received to refund initiated
   - Target: <1 hour

### Workflow Execution Logs

Monitor these node outputs:
- `Route by Approval`: Track auto vs. manual split
- `Generate Return Label`: Label generation success rate
- `Process Stripe Refund`: Refund success/failure
- `Send Post-Return Survey`: Survey delivery rate

## Troubleshooting

### Common Issues

**Issue:** ShipStation label generation fails
- **Cause:** Invalid customer address
- **Solution:** Validate address format, use address verification API

**Issue:** Stripe refund fails
- **Cause:** Charge already refunded or charge ID not found
- **Solution:** Check return record for duplicate processing

**Issue:** Customer receives multiple survey emails
- **Cause:** Wait node triggered multiple times
- **Solution:** Add execution ID check to prevent duplicates

**Issue:** Inventory not updating
- **Cause:** SKU mismatch between order and inventory system
- **Solution:** Validate SKU format, check inventory API logs

## Business Rules Summary

### Return Window
- **Standard:** 30 days from delivery date
- **Extended (Holiday):** 60 days (Nov 1 - Dec 31 purchases)
- **Final Sale:** No returns

### Restocking Fees
- **Unopened:** No fee
- **Opened (Non-Defective):** 15% restocking fee
- **Opened (Defective):** No fee

### Shipping Costs
- **Defective/Error:** Free return shipping
- **Customer Preference:** Customer pays return shipping
- **Auto-Approved:** Free prepaid label
- **Manual Review:** Determined case-by-case

## Support Contacts

- **Returns Portal:** https://broxiva.com/returns
- **Support Email:** returns@broxiva.com
- **Support Phone:** 888-555-0100
- **Hours:** Mon-Fri 9AM-6PM PST

## Changelog

### Version 1.0.0 (2024-12-03)
- Initial workflow creation
- Auto-approval logic implementation
- Manual review routing
- ShipStation integration
- Stripe refund processing
- Post-return survey automation

## Related Documentation

- [Broxiva Returns Policy](https://broxiva.com/returns-policy)
- [ShipStation API Documentation](https://www.shipstation.com/docs/api/)
- [Stripe Refunds API](https://stripe.com/docs/api/refunds)
- [Zendesk API Documentation](https://developer.zendesk.com/api-reference/)
