# Abandoned Cart Recovery Workflow - Testing Guide

## Pre-Testing Setup

### 1. Environment Variables

Create a `.env` file for testing:

```bash
# CitadelBuy API
CITADELBUY_API_KEY=test_api_key_xxxxxxxxxx
CITADELBUY_API_BASE=https://api-staging.citadelbuy.com/v1

# Klaviyo
KLAVIYO_PUBLIC_API_KEY=pk_test_xxxxxxxxxx
KLAVIYO_PRIVATE_API_KEY=pk_test_xxxxxxxxxx
KLAVIYO_SUPPRESSION_LIST_ID=TEST_LIST_ID

# Algolia
ALGOLIA_APP_ID=TEST_APP_ID
ALGOLIA_API_KEY=test_search_key_xxxxxxxxxx

# Zendesk
ZENDESK_SUBDOMAIN=citadelbuy-sandbox
ZENDESK_EMAIL=test@citadelbuy.com
ZENDESK_API_TOKEN=test_token_xxxxxxxxxx

# Mixpanel
MIXPANEL_PROJECT_TOKEN=test_xxxxxxxxxx
```

### 2. Test Data Setup

#### Create Test Abandoned Cart

```bash
curl -X POST https://api-staging.citadelbuy.com/v1/carts/test \
  -H "Authorization: Bearer ${CITADELBUY_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "cart_id": "test_cart_001",
    "customer_id": "test_cust_001",
    "customer_email": "your.test.email@example.com",
    "customer_first_name": "TestUser",
    "created_at": "2024-01-15T08:00:00Z",
    "updated_at": "2024-01-15T08:00:00Z",
    "total_value": 149.99,
    "item_count": 3,
    "recovery_stage": 0,
    "items": [
      {
        "sku": "CB-PROD-001",
        "name": "Premium Widget",
        "image_url": "https://cdn.citadelbuy.com/products/widget.jpg",
        "price": 49.99,
        "quantity": 2,
        "category": "widgets"
      },
      {
        "sku": "CB-PROD-002",
        "name": "Deluxe Gadget",
        "image_url": "https://cdn.citadelbuy.com/products/gadget.jpg",
        "price": 50.01,
        "quantity": 1,
        "category": "gadgets"
      }
    ]
  }'
```

#### Create Multiple Test Scenarios

```javascript
// Test Scenario 1: Fresh cart (Stage 0, 2 hours old)
const testCart1 = {
  cart_id: "test_cart_001",
  customer_email: "test1@example.com",
  updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  recovery_stage: 0,
  total_value: 99.99
};

// Test Scenario 2: Stage 1 cart (25 hours old, should trigger Stage 2)
const testCart2 = {
  cart_id: "test_cart_002",
  customer_email: "test2@example.com",
  updated_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
  recovery_stage: 1,
  total_value: 199.99
};

// Test Scenario 3: Stage 2 cart (73 hours old, should trigger Stage 3)
const testCart3 = {
  cart_id: "test_cart_003",
  customer_email: "test3@example.com",
  updated_at: new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString(),
  recovery_stage: 2,
  total_value: 299.99
};

// Test Scenario 4: Stage 3 cart (169 hours old, should trigger Stage 4)
const testCart4 = {
  cart_id: "test_cart_004",
  customer_email: "test4@example.com",
  updated_at: new Date(Date.now() - 169 * 60 * 60 * 1000).toISOString(),
  recovery_stage: 3,
  total_value: 399.99
};

// Test Scenario 5: Completed recovery (Stage 4, should be skipped)
const testCart5 = {
  cart_id: "test_cart_005",
  customer_email: "test5@example.com",
  updated_at: new Date(Date.now() - 200 * 60 * 60 * 1000).toISOString(),
  recovery_stage: 4,
  total_value: 149.99
};
```

---

## Test Cases

### Test Case 1: Stage Calculation Logic

**Objective:** Verify correct stage determination based on timing

**Steps:**
1. Import workflow into n8n
2. Manually trigger workflow
3. Check `Calculate Recovery Stage` node output

**Expected Results:**
```javascript
{
  cart_id: "test_cart_001",
  _metadata: {
    hoursSinceUpdate: 2,
    daysSinceUpdate: 0.083,
    shouldSendEmail: true,
    emailStage: 1,
    stageName: "reminder",
    discountCode: null,
    urgencyMessage: "Your cart is waiting for you!",
    currentRecoveryStage: 0
  }
}
```

**Pass Criteria:**
- ✅ `shouldSendEmail` is `true`
- ✅ `emailStage` is `1`
- ✅ `stageName` is `"reminder"`
- ✅ No discount code at Stage 1

---

### Test Case 2: Exclusion Rules - Recent Order

**Objective:** Verify carts are excluded if customer placed recent order

**Setup:**
```bash
# Create test order for customer
curl -X POST https://api-staging.citadelbuy.com/v1/orders \
  -H "Authorization: Bearer ${CITADELBUY_API_KEY}" \
  -d '{
    "customer_id": "test_cust_001",
    "created_at": "2024-01-15T10:00:00Z",
    "total": 149.99
  }'
```

**Steps:**
1. Trigger workflow with test cart
2. Check `Check Recent Orders` node output
3. Verify `Merge Exclusion Checks` node

**Expected Results:**
```javascript
{
  _exclusionChecks: {
    hasRecentOrder: true,
    isSuppressed: false,
    hasOpenTicket: false,
    shouldExclude: true,
    exclusionReason: "recent_order"
  }
}
```

**Pass Criteria:**
- ✅ `shouldExclude` is `true`
- ✅ `exclusionReason` is `"recent_order"`
- ✅ Email is NOT sent
- ✅ Exclusion tracked in Mixpanel

---

### Test Case 3: Exclusion Rules - Klaviyo Suppression

**Objective:** Verify suppressed emails are excluded

**Setup:**
1. Add test email to Klaviyo suppression list
2. Wait for API sync (may take a few minutes)

**Steps:**
1. Trigger workflow with suppressed email
2. Check `Check Klaviyo Suppression` node output

**Expected Results:**
```javascript
{
  records: [
    {
      email: "test1@example.com",
      suppressed: true,
      reason: "unsubscribe"
    }
  ]
}
```

**Pass Criteria:**
- ✅ `isSuppressed` is `true`
- ✅ Email is NOT sent
- ✅ Logged as "suppression_list"

---

### Test Case 4: Exclusion Rules - Open Support Ticket

**Objective:** Verify carts with open tickets are excluded

**Setup:**
```bash
# Create open Zendesk ticket
curl -X POST https://citadelbuy-sandbox.zendesk.com/api/v2/tickets \
  -H "Authorization: Basic $(echo -n 'test@citadelbuy.com/token:${ZENDESK_API_TOKEN}' | base64)" \
  -d '{
    "ticket": {
      "subject": "Test ticket",
      "requester": {"email": "test1@example.com"},
      "status": "open"
    }
  }'
```

**Steps:**
1. Trigger workflow
2. Check `Check Zendesk Tickets` node

**Expected Results:**
```javascript
{
  results: [
    {
      id: 12345,
      status: "open",
      requester_email: "test1@example.com"
    }
  ]
}
```

**Pass Criteria:**
- ✅ `hasOpenTicket` is `true`
- ✅ Email is NOT sent
- ✅ Logged as "open_support_ticket"

---

### Test Case 5: Algolia Product Recommendations

**Objective:** Verify related products are fetched correctly

**Steps:**
1. Trigger workflow for Stage 2 or 4 cart
2. Check `Get Related Products (Algolia)` node output

**Expected Results:**
```javascript
{
  hits: [
    {
      objectID: "prod_123",
      name: "Similar Widget Pro",
      sku: "CB-PROD-010",
      image_url: "https://cdn.citadelbuy.com/products/similar-widget.jpg",
      price: 54.99,
      category: "widgets",
      slug: "similar-widget-pro"
    },
    // ... 3 more products
  ],
  nbHits: 4
}
```

**Pass Criteria:**
- ✅ Returns 4 related products
- ✅ Same category as cart items
- ✅ Excludes items already in cart
- ✅ All products have valid image URLs

---

### Test Case 6: Email Personalization

**Objective:** Verify email data is correctly personalized

**Steps:**
1. Trigger workflow
2. Check `Prepare Email Data` node output

**Expected Results:**
```javascript
{
  customer_email: "test1@example.com",
  customer_first_name: "TestUser",
  cart_items: [
    {
      name: "Premium Widget",
      sku: "CB-PROD-001",
      image_url: "https://cdn.citadelbuy.com/products/widget.jpg",
      price: "49.99",
      quantity: 2,
      subtotal: "99.98"
    }
  ],
  cart_total: "149.99",
  item_count: 3,
  email_stage: 1,
  stage_name: "reminder",
  urgency_message: "Your cart is waiting for you!",
  discount_code: null,
  related_products: [],
  cart_url: "https://citadelbuy.com/cart/test_cart_001",
  checkout_url: "https://citadelbuy.com/checkout/test_cart_001",
  campaign_name: "abandoned_cart_stage_1"
}
```

**Pass Criteria:**
- ✅ All prices formatted to 2 decimals
- ✅ First name not empty
- ✅ Cart URL is valid
- ✅ Campaign name matches stage

---

### Test Case 7: Klaviyo Email Sending

**Objective:** Verify email event is sent to Klaviyo

**Steps:**
1. Trigger workflow with valid test cart
2. Check `Send Email via Klaviyo` node response
3. Verify email received in inbox

**Expected Results:**
```javascript
{
  status: 200,
  success: true,
  message: "Event tracked successfully"
}
```

**Pass Criteria:**
- ✅ HTTP 200 response from Klaviyo
- ✅ Email appears in Klaviyo dashboard
- ✅ Email delivered to inbox
- ✅ All personalization tokens populated
- ✅ Images load correctly
- ✅ CTA button links to correct checkout URL

---

### Test Case 8: Cart Recovery Stage Update

**Objective:** Verify cart recovery_stage is updated after email

**Steps:**
1. Note initial `recovery_stage` (e.g., 0)
2. Trigger workflow
3. Check `Update Cart Recovery Stage` node
4. Query cart API to verify update

**Expected Results:**
```javascript
// Before
{ cart_id: "test_cart_001", recovery_stage: 0 }

// After
{
  cart_id: "test_cart_001",
  recovery_stage: 1,
  last_recovery_email_sent: "2024-01-15T12:30:00Z",
  recovery_campaign: "abandoned_cart_stage_1"
}
```

**Pass Criteria:**
- ✅ `recovery_stage` incremented to 1
- ✅ `last_recovery_email_sent` timestamp is recent
- ✅ `recovery_campaign` matches expected value

---

### Test Case 9: Mixpanel Event Tracking

**Objective:** Verify events are tracked in Mixpanel

**Steps:**
1. Trigger workflow
2. Check `Track Email Sent (Mixpanel)` node
3. Verify event in Mixpanel dashboard

**Expected Results:**
```javascript
{
  status: 1,
  error: null
}
```

**In Mixpanel Dashboard:**
- Event: "Abandoned Cart Email Sent"
- Properties:
  - `distinct_id`: "test_cust_001"
  - `email`: "test1@example.com"
  - `cart_id`: "test_cart_001"
  - `email_stage`: 1
  - `stage_name`: "reminder"
  - `cart_value`: 149.99
  - `item_count`: 3

**Pass Criteria:**
- ✅ Event appears in Mixpanel within 5 minutes
- ✅ All properties populated correctly
- ✅ No errors in Mixpanel API response

---

### Test Case 10: Stage 3 Discount Code

**Objective:** Verify discount code is included in Stage 3 emails

**Setup:**
```bash
# Create cart 73 hours old at Stage 2
curl -X POST https://api-staging.citadelbuy.com/v1/carts/test \
  -d '{
    "cart_id": "test_cart_discount",
    "updated_at": "'$(date -d '73 hours ago' -Iseconds)'",
    "recovery_stage": 2
  }'
```

**Steps:**
1. Trigger workflow
2. Check email data preparation
3. Verify email content

**Expected Results:**
```javascript
{
  email_stage: 3,
  stage_name: "discount",
  discount_code: "COMEBACK10",
  urgency_message: "Special offer just for you! Get 10% off your cart."
}
```

**Pass Criteria:**
- ✅ `discount_code` is "COMEBACK10"
- ✅ Email subject includes "10% off"
- ✅ Discount prominently displayed in email
- ✅ Checkout URL includes auto-applied code
- ✅ Expiration timer shown

---

### Test Case 11: Full Sequence End-to-End

**Objective:** Test entire 4-stage recovery sequence

**Setup:**
Enable bypass timing for testing:

```javascript
// In Calculate Recovery Stage node
// Temporarily change all timing checks to >= 0
if (recoveryStage === 0 && hoursSinceUpdate >= 0) { // Stage 1
if (recoveryStage === 1 && hoursSinceUpdate >= 0) { // Stage 2
if (recoveryStage === 2 && hoursSinceUpdate >= 0) { // Stage 3
if (recoveryStage === 3 && hoursSinceUpdate >= 0) { // Stage 4
```

**Steps:**
1. Create cart with `recovery_stage: 0`
2. Trigger workflow → Should send Stage 1
3. Update cart to `recovery_stage: 1`
4. Trigger workflow → Should send Stage 2
5. Update cart to `recovery_stage: 2`
6. Trigger workflow → Should send Stage 3
7. Update cart to `recovery_stage: 3`
8. Trigger workflow → Should send Stage 4
9. Update cart to `recovery_stage: 4`
10. Trigger workflow → Should skip (max stages)

**Pass Criteria:**
- ✅ 4 emails received in sequence
- ✅ Each email has correct stage content
- ✅ Stage 3 includes discount code
- ✅ Stages 2 & 4 include product recommendations
- ✅ Stage 5 triggers no email

---

### Test Case 12: Error Handling - API Failure

**Objective:** Verify workflow handles API failures gracefully

**Setup:**
Use invalid API credentials temporarily

**Steps:**
1. Set `CITADELBUY_API_KEY` to invalid value
2. Trigger workflow
3. Check error handling

**Expected Results:**
- ⚠️ Workflow execution shows error
- ⚠️ Error logged to n8n console
- ⚠️ Execution doesn't crash
- ⚠️ Error notification sent (if configured)

**Pass Criteria:**
- ✅ Graceful error handling
- ✅ Clear error message
- ✅ No data corruption
- ✅ Can retry manually

---

### Test Case 13: Performance - Batch Processing

**Objective:** Test workflow with multiple carts

**Setup:**
```bash
# Create 10 test carts
for i in {1..10}; do
  curl -X POST https://api-staging.citadelbuy.com/v1/carts/test \
    -d "{\"cart_id\": \"batch_test_$i\", \"recovery_stage\": 0}"
done
```

**Steps:**
1. Trigger workflow
2. Monitor execution time
3. Check all carts processed

**Expected Results:**
- 10 carts fetched
- All carts processed individually
- Execution time < 2 minutes for 10 carts

**Pass Criteria:**
- ✅ All 10 carts processed
- ✅ No timeouts
- ✅ Correct emails sent for each
- ✅ All stages updated

---

### Test Case 14: Execution Summary

**Objective:** Verify summary statistics are accurate

**Steps:**
1. Process mix of valid/excluded carts
2. Check `Execution Summary` node output

**Expected Results:**
```javascript
{
  execution_time: "2024-01-15T12:30:45.000Z",
  total_carts_processed: 10,
  emails_sent: 7,
  excluded_carts: 3,
  by_stage: {
    stage_1: 3,
    stage_2: 2,
    stage_3: 1,
    stage_4: 1
  },
  exclusion_reasons: {
    recent_order: 1,
    suppression_list: 1,
    open_ticket: 1
  },
  total_cart_value: "1499.90"
}
```

**Pass Criteria:**
- ✅ Counts are accurate
- ✅ Breakdown by stage correct
- ✅ Exclusion reasons logged
- ✅ Total value calculated correctly

---

## Automated Testing Script

Create `test-workflow.js`:

```javascript
const axios = require('axios');

const N8N_API_BASE = 'http://localhost:5678/api/v1';
const N8N_API_KEY = 'your_n8n_api_key';

async function runTest(testName, workflowId, testData) {
  console.log(`\n🧪 Running Test: ${testName}`);

  try {
    // Trigger workflow execution
    const response = await axios.post(
      `${N8N_API_BASE}/workflows/${workflowId}/execute`,
      { data: testData },
      { headers: { 'X-N8N-API-KEY': N8N_API_KEY } }
    );

    console.log(`✅ ${testName} PASSED`);
    return response.data;
  } catch (error) {
    console.log(`❌ ${testName} FAILED:`, error.message);
    return null;
  }
}

async function runAllTests() {
  const workflowId = 'your_workflow_id';

  // Test 1: Stage 1 Email
  await runTest('Stage 1 Email', workflowId, {
    cart_id: 'test_001',
    recovery_stage: 0,
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  });

  // Test 2: Recent Order Exclusion
  await runTest('Recent Order Exclusion', workflowId, {
    cart_id: 'test_002',
    recovery_stage: 0,
    customer_id: 'customer_with_recent_order'
  });

  // Test 3: Stage 3 Discount
  await runTest('Stage 3 Discount', workflowId, {
    cart_id: 'test_003',
    recovery_stage: 2,
    updated_at: new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString()
  });

  console.log('\n✅ All tests completed');
}

runAllTests();
```

Run tests:
```bash
node test-workflow.js
```

---

## Manual Testing Checklist

### Pre-Launch Checklist

- [ ] **Environment Setup**
  - [ ] All API credentials configured
  - [ ] Test environment accessible
  - [ ] n8n instance running
  - [ ] Workflow imported successfully

- [ ] **Data Setup**
  - [ ] Test carts created for all scenarios
  - [ ] Test customer profiles created
  - [ ] Algolia index populated
  - [ ] Klaviyo templates created

- [ ] **Functional Tests**
  - [ ] Stage 1 email sends correctly
  - [ ] Stage 2 email sends with recommendations
  - [ ] Stage 3 email sends with discount code
  - [ ] Stage 4 email sends with alternatives
  - [ ] Recent order exclusion works
  - [ ] Klaviyo suppression works
  - [ ] Zendesk ticket exclusion works
  - [ ] Maximum stages exclusion works

- [ ] **Email Quality**
  - [ ] Subject lines personalized
  - [ ] First name appears correctly
  - [ ] Product images load
  - [ ] Prices formatted correctly
  - [ ] CTA buttons work
  - [ ] Discount code correct (Stage 3)
  - [ ] Unsubscribe link present
  - [ ] Mobile responsive

- [ ] **Tracking & Analytics**
  - [ ] Klaviyo events tracked
  - [ ] Mixpanel events tracked
  - [ ] Cart recovery_stage updates
  - [ ] Exclusions logged
  - [ ] Execution summary accurate

- [ ] **Performance**
  - [ ] Workflow completes in < 2 minutes
  - [ ] No timeouts
  - [ ] Batch processing works
  - [ ] Error handling graceful

- [ ] **Documentation**
  - [ ] README reviewed
  - [ ] Configuration documented
  - [ ] Runbook created
  - [ ] Team trained

---

## Monitoring After Launch

### Week 1: Daily Checks

```bash
# Check execution logs
n8n executions:list --workflow="CitadelBuy Abandoned Cart Recovery" --status=success

# Check error rate
n8n executions:list --workflow="CitadelBuy Abandoned Cart Recovery" --status=error

# Check Mixpanel dashboard
# View: Abandoned Cart Email Sent (last 24 hours)
```

### Week 2-4: Weekly Reviews

- Review conversion rates by stage
- Analyze exclusion reasons
- Check email deliverability
- Monitor API error rates
- Review customer feedback

### Monthly: Optimization

- A/B test subject lines
- Adjust timing intervals
- Review discount strategy
- Update product recommendations
- Clean suppression list

---

## Rollback Plan

If issues occur in production:

```bash
# 1. Disable workflow
n8n workflow:deactivate --id=WORKFLOW_ID

# 2. Review last successful execution
n8n execution:get --id=LAST_SUCCESS_ID

# 3. Export current state
n8n export:workflow --id=WORKFLOW_ID --output=backup.json

# 4. Restore previous version
n8n import:workflow --input=workflow-04-abandoned-cart-v1.0.0.json

# 5. Re-enable with monitoring
n8n workflow:activate --id=WORKFLOW_ID
```

---

## Support & Debugging

### Enable Debug Logging

In workflow settings:
```json
{
  "settings": {
    "executionOrder": "v1",
    "saveManualExecutions": true,
    "saveExecutionProgress": true,
    "executionTimeout": 300
  }
}
```

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| No emails sent | Klaviyo credentials invalid | Check API key in settings |
| Wrong stage triggered | Timing calculation error | Verify `hoursSinceUpdate` logic |
| Missing recommendations | Algolia index empty | Populate product index |
| High exclusion rate | Suppression list too broad | Review list criteria |
| Slow execution | Too many carts at once | Reduce batch size |

---

**Testing Completed By:** _________________
**Date:** _________________
**Version Tested:** v1.0.0
**Environment:** Production / Staging
**Notes:** _________________________________________________
