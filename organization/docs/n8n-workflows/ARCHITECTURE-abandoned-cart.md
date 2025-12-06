# Abandoned Cart Recovery - Workflow Architecture

## Overview

This document provides a detailed technical architecture of the n8n abandoned cart recovery workflow, including data flow, decision points, and integration patterns.

---

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     TRIGGER & DATA INGESTION                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐      ┌────────────────────────────────┐      │
│  │   Schedule   │─────▶│  Fetch Abandoned Carts API     │      │
│  │   (30 min)   │      │  GET /carts/abandoned          │      │
│  └──────────────┘      └────────────────────────────────┘      │
│                                      │                           │
│                                      ▼                           │
│                        ┌─────────────────────────┐              │
│                        │  Split Carts into       │              │
│                        │  Individual Items       │              │
│                        └─────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FILTERING & VALIDATION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────┐        │
│  │  Filter Valid Carts                                 │        │
│  │  • Has customer_email                               │        │
│  │  • recovery_stage < 4                               │        │
│  └─────────────────────────────────────────────────────┘        │
│                          │                                       │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────┐        │
│  │  Calculate Recovery Stage                           │        │
│  │  • Compute hours since update                       │        │
│  │  • Determine next stage to send                     │        │
│  │  • Set urgency message                              │        │
│  │  • Assign discount code (if Stage 3)                │        │
│  └─────────────────────────────────────────────────────┘        │
│                          │                                       │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────┐        │
│  │  Should Send Email?                                 │        │
│  │  Filter: shouldSendEmail = true                     │        │
│  └─────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXCLUSION RULE CHECKS                         │
│                        (Parallel)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Check Recent     │  │ Check Klaviyo    │  │ Check Open   │  │
│  │ Orders           │  │ Suppression      │  │ Zendesk      │  │
│  │                  │  │ List             │  │ Tickets      │  │
│  │ GET /orders?     │  │ GET /list/       │  │ GET /search  │  │
│  │  customer_id     │  │  members?email   │  │  ?query=...  │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │
│           │                     │                    │           │
│           └─────────────────────┴────────────────────┘           │
│                                 │                                │
│                                 ▼                                │
│                  ┌──────────────────────────────┐               │
│                  │  Merge Exclusion Checks      │               │
│                  │  • Combine all API results   │               │
│                  │  • Set shouldExclude flag    │               │
│                  │  • Log exclusion reason      │               │
│                  └──────────────────────────────┘               │
│                                 │                                │
│                      ┌──────────┴──────────┐                    │
│                      ▼                     ▼                     │
│          ┌──────────────────┐   ┌────────────────────┐          │
│          │ Filter Excluded  │   │ Track Exclusion    │          │
│          │ shouldExclude =  │   │ (Mixpanel)         │          │
│          │ false            │   │                    │          │
│          └──────────────────┘   └────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PERSONALIZATION & ENRICHMENT                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────┐        │
│  │  Get Related Products (Algolia)                     │        │
│  │  POST /1/indexes/citadelbuy_products/query          │        │
│  │  • Filter by category                               │        │
│  │  • Exclude cart items                               │        │
│  │  • Return top 4 results                             │        │
│  └─────────────────────────────────────────────────────┘        │
│                          │                                       │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────┐        │
│  │  Prepare Email Data                                 │        │
│  │  • Format customer info                             │        │
│  │  • Calculate prices                                 │        │
│  │  • Build product arrays                             │        │
│  │  • Generate URLs                                    │        │
│  │  • Set campaign metadata                            │        │
│  └─────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EMAIL SENDING & TRACKING                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────┐        │
│  │  Send Email via Klaviyo                             │        │
│  │  POST /api/v1/track                                 │        │
│  │  Event: "Abandoned Cart Email"                      │        │
│  │  Template: abandoned_cart_stage_{N}                 │        │
│  └─────────────────────────────────────────────────────┘        │
│                          │                                       │
│                ┌─────────┴─────────┐                             │
│                ▼                   ▼                             │
│  ┌──────────────────────┐ ┌───────────────────────┐            │
│  │ Update Cart          │ │ Track Email Sent      │            │
│  │ Recovery Stage       │ │ (Mixpanel)            │            │
│  │                      │ │                       │            │
│  │ PATCH /carts/{id}    │ │ Event:                │            │
│  │ • recovery_stage++   │ │ "Abandoned Cart       │            │
│  │ • timestamp          │ │  Email Sent"          │            │
│  │ • campaign name      │ │                       │            │
│  └──────────────────────┘ └───────────────────────┘            │
│                ▼                   ▼                             │
│                └─────────┬─────────┘                             │
│                          │                                       │
│                          ▼                                       │
│              ┌───────────────────────┐                          │
│              │  Execution Summary    │                          │
│              │  • Count emails sent  │                          │
│              │  • Count exclusions   │                          │
│              │  • Log metrics        │                          │
│              └───────────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Node-by-Node Architecture

### 1. Schedule Trigger
**Type:** Cron Trigger
**Interval:** Every 30 minutes
**Purpose:** Initiate workflow execution

```javascript
Config: {
  rule: {
    interval: [{ field: "minutes", minutesInterval: 30 }]
  }
}
```

**Output:** Empty trigger event

---

### 2. Fetch Abandoned Carts
**Type:** HTTP Request
**Method:** GET
**Endpoint:** `/carts/abandoned`

**Request:**
```http
GET https://api.citadelbuy.com/v1/carts/abandoned
Authorization: Bearer {API_KEY}
Content-Type: application/json
```

**Response Schema:**
```typescript
interface AbandonedCartsResponse {
  carts: Array<{
    cart_id: string;
    customer_id: string;
    customer_email: string;
    customer_first_name?: string;
    created_at: string;
    updated_at: string;
    total_value: number;
    item_count: number;
    recovery_stage: number;
    items: Array<{
      sku: string;
      name: string;
      image_url: string;
      price: number;
      quantity: number;
      category?: string;
    }>;
  }>;
}
```

**Output:** Array of abandoned carts

---

### 3. Split Carts
**Type:** Split Out
**Field:** `carts`

**Purpose:** Convert cart array into individual items for processing

**Input:**
```json
{ "carts": [cart1, cart2, cart3] }
```

**Output:**
```json
cart1
cart2
cart3
```

---

### 4. Filter Valid Carts
**Type:** Filter
**Conditions:**
- `customer_email` is not empty
- `recovery_stage` < 4

**Logic:**
```javascript
if (
  $json.customer_email &&
  $json.recovery_stage < 4
) {
  return true; // Pass through
}
return false; // Filter out
```

**Purpose:** Remove invalid/completed carts early

---

### 5. Calculate Recovery Stage
**Type:** Code (JavaScript)
**Purpose:** Determine if email should be sent and which stage

**Algorithm:**
```javascript
const updatedAt = new Date($json.updated_at);
const now = new Date();
const hoursSinceUpdate = (now - updatedAt) / (1000 * 60 * 60);
const recoveryStage = $json.recovery_stage || 0;

let shouldSendEmail = false;
let emailStage = 0;
let stageName = '';
let discountCode = null;

// Stage 1: 1 hour threshold
if (recoveryStage === 0 && hoursSinceUpdate >= 1) {
  shouldSendEmail = true;
  emailStage = 1;
  stageName = 'reminder';
}

// Stage 2: 24 hour threshold
if (recoveryStage === 1 && hoursSinceUpdate >= 24) {
  shouldSendEmail = true;
  emailStage = 2;
  stageName = 'urgency';
}

// Stage 3: 72 hour threshold
if (recoveryStage === 2 && hoursSinceUpdate >= 72) {
  shouldSendEmail = true;
  emailStage = 3;
  stageName = 'discount';
  discountCode = 'COMEBACK10';
}

// Stage 4: 168 hour threshold
if (recoveryStage === 3 && hoursSinceUpdate >= 168) {
  shouldSendEmail = true;
  emailStage = 4;
  stageName = 'final';
}

return {
  ...($json),
  _metadata: {
    shouldSendEmail,
    emailStage,
    stageName,
    discountCode,
    hoursSinceUpdate
  }
};
```

**Output Schema:**
```typescript
interface CartWithMetadata extends Cart {
  _metadata: {
    shouldSendEmail: boolean;
    emailStage: number;
    stageName: string;
    discountCode: string | null;
    urgencyMessage: string;
    hoursSinceUpdate: number;
  }
}
```

---

### 6. Should Send Email?
**Type:** Filter
**Condition:** `_metadata.shouldSendEmail === true`

**Purpose:** Only proceed with carts that meet timing criteria

---

### 7-9. Exclusion Checks (Parallel)

#### 7. Check Recent Orders
**Type:** HTTP Request
**Method:** GET
**Endpoint:** `/orders?customer_id={id}&created_after={timestamp}`

**Logic:**
```javascript
if (response.orders && response.orders.length > 0) {
  // Customer ordered after cart creation
  exclude = true;
}
```

#### 8. Check Klaviyo Suppression
**Type:** HTTP Request
**Method:** GET
**Endpoint:** `/api/v2/list/{list_id}/members?emails={email}`

**Logic:**
```javascript
if (response.records && response.records.length > 0) {
  // Email is suppressed
  exclude = true;
}
```

#### 9. Check Zendesk Tickets
**Type:** HTTP Request
**Method:** GET
**Endpoint:** `/api/v2/search.json?query=type:ticket requester:{email} status<solved`

**Logic:**
```javascript
if (response.results && response.results.length > 0) {
  // Customer has open ticket
  exclude = true;
}
```

---

### 10. Merge Exclusion Checks
**Type:** Code (JavaScript)
**Purpose:** Combine results from parallel exclusion checks

**Input:** 4 items (original cart + 3 API responses)

**Logic:**
```javascript
const cartData = $input.first().json;
const orderCheck = $input.all()[0].json;
const klaviyoCheck = $input.all()[1].json;
const zendeskCheck = $input.all()[2].json;

const hasRecentOrder = orderCheck.orders?.length > 0;
const isSuppressed = klaviyoCheck.records?.length > 0;
const hasOpenTicket = zendeskCheck.results?.length > 0;

const shouldExclude = hasRecentOrder || isSuppressed || hasOpenTicket;

return {
  ...cartData,
  _exclusionChecks: {
    hasRecentOrder,
    isSuppressed,
    hasOpenTicket,
    shouldExclude,
    exclusionReason: hasRecentOrder ? 'recent_order' :
                     isSuppressed ? 'suppression_list' :
                     hasOpenTicket ? 'open_support_ticket' : null
  }
};
```

---

### 11. Filter Excluded Carts
**Type:** Filter
**Condition:** `_exclusionChecks.shouldExclude === false`

**Branching:**
- **True Path:** Continue to email sending
- **False Path:** Track exclusion in Mixpanel

---

### 12. Get Related Products (Algolia)
**Type:** HTTP Request
**Method:** POST
**Endpoint:** `/1/indexes/citadelbuy_products/query`

**Request Body:**
```json
{
  "query": "",
  "filters": "category:{cart_category} AND NOT sku:{cart_sku}",
  "hitsPerPage": 4
}
```

**Purpose:** Fetch AI-recommended products for Stages 2 & 4

**Output:**
```json
{
  "hits": [
    {
      "name": "Related Product",
      "sku": "CB-XXX",
      "price": 49.99,
      "image_url": "https://...",
      "slug": "product-slug"
    }
  ]
}
```

---

### 13. Prepare Email Data
**Type:** Code (JavaScript)
**Purpose:** Format all data for email template

**Transformations:**
1. Format prices to 2 decimals
2. Calculate subtotals
3. Build product arrays
4. Generate URLs
5. Set campaign metadata

**Output Schema:**
```typescript
interface EmailData {
  customer_email: string;
  customer_first_name: string;
  cart_id: string;
  customer_id: string;

  cart_items: Array<{
    name: string;
    sku: string;
    image_url: string;
    price: string; // Formatted
    quantity: number;
    subtotal: string; // Formatted
  }>;

  cart_total: string; // Formatted
  item_count: number;

  email_stage: number;
  stage_name: string;
  urgency_message: string;
  discount_code: string | null;

  related_products: Array<{
    name: string;
    sku: string;
    image_url: string;
    price: string;
    url: string;
  }>;

  cart_url: string;
  checkout_url: string;
  campaign_name: string;
}
```

---

### 14. Send Email via Klaviyo
**Type:** HTTP Request
**Method:** POST
**Endpoint:** `/api/v1/track`

**Request Body:**
```json
{
  "token": "{KLAVIYO_PUBLIC_KEY}",
  "event": "Abandoned Cart Email",
  "customer_properties": {
    "$email": "customer@email.com",
    "$first_name": "John",
    "customer_id": "cust_123"
  },
  "properties": {
    "stage": 1,
    "stage_name": "reminder",
    "cart_id": "cart_xyz",
    "cart_total": "149.99",
    "cart_items": [...],
    "related_products": [...]
  }
}
```

**Klaviyo Flow:**
1. Event received
2. Flow triggered (based on `stage` property)
3. Email template selected
4. Personalization applied
5. Email sent

---

### 15. Update Cart Recovery Stage
**Type:** HTTP Request
**Method:** PATCH
**Endpoint:** `/carts/{cart_id}`

**Request Body:**
```json
{
  "recovery_stage": 1,
  "last_recovery_email_sent": "2024-01-15T12:30:00Z",
  "recovery_campaign": "abandoned_cart_stage_1"
}
```

**Purpose:** Prevent duplicate emails in future runs

---

### 16. Track Email Sent (Mixpanel)
**Type:** HTTP Request
**Method:** POST
**Endpoint:** `/track`

**Event:**
```json
{
  "event": "Abandoned Cart Email Sent",
  "properties": {
    "token": "{MIXPANEL_TOKEN}",
    "distinct_id": "cust_123",
    "email": "customer@email.com",
    "cart_id": "cart_xyz",
    "email_stage": 1,
    "stage_name": "reminder",
    "cart_value": 149.99,
    "item_count": 3,
    "discount_offered": null,
    "campaign": "abandoned_cart_stage_1"
  }
}
```

---

### 17. Track Exclusion (Mixpanel)
**Type:** HTTP Request
**Method:** POST
**Endpoint:** `/track`

**Event:**
```json
{
  "event": "Cart Excluded from Recovery",
  "properties": {
    "distinct_id": "cust_123",
    "cart_id": "cart_xyz",
    "exclusion_reason": "recent_order",
    "cart_value": 149.99
  }
}
```

---

### 18. Execution Summary
**Type:** Code (JavaScript)
**Purpose:** Aggregate execution statistics

**Output:**
```json
{
  "execution_time": "2024-01-15T12:30:00Z",
  "total_carts_processed": 100,
  "emails_sent": 75,
  "excluded_carts": 25,
  "by_stage": {
    "stage_1": 30,
    "stage_2": 20,
    "stage_3": 15,
    "stage_4": 10
  },
  "exclusion_reasons": {
    "recent_order": 10,
    "suppression_list": 8,
    "open_ticket": 7
  },
  "total_cart_value": "11,249.25"
}
```

---

## Data Flow Example

### Example Cart Journey

**Initial State (T=0):**
```json
{
  "cart_id": "cart_abc123",
  "customer_id": "cust_xyz789",
  "customer_email": "john@example.com",
  "customer_first_name": "John",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z",
  "total_value": 149.99,
  "item_count": 2,
  "recovery_stage": 0,
  "items": [...]
}
```

**After 1 Hour (T+1h):**
```
Workflow executes
→ Calculate Recovery Stage: hoursSinceUpdate = 1
→ shouldSendEmail = true, emailStage = 1
→ Exclusion checks: All pass
→ Email sent: "You left something behind"
→ Cart updated: recovery_stage = 1
```

**After 25 Hours (T+25h):**
```
Workflow executes
→ Calculate Recovery Stage: hoursSinceUpdate = 25
→ shouldSendEmail = true, emailStage = 2
→ Algolia: Fetch 4 related products
→ Email sent: "Still thinking?" + recommendations
→ Cart updated: recovery_stage = 2
```

**After 73 Hours (T+73h):**
```
Workflow executes
→ Calculate Recovery Stage: hoursSinceUpdate = 73
→ shouldSendEmail = true, emailStage = 3
→ discountCode = "COMEBACK10"
→ Email sent: "10% off!" + discount code
→ Cart updated: recovery_stage = 3
```

**After 169 Hours (T+169h):**
```
Workflow executes
→ Calculate Recovery Stage: hoursSinceUpdate = 169
→ shouldSendEmail = true, emailStage = 4
→ Algolia: Fetch alternative products
→ Email sent: "Last chance!" + alternatives
→ Cart updated: recovery_stage = 4
```

**After 200 Hours (T+200h):**
```
Workflow executes
→ Filter Valid Carts: recovery_stage = 4
→ FILTERED OUT (max stages reached)
→ No email sent
```

---

## Error Handling Strategy

### API Failures

```javascript
// All HTTP requests configured with:
options: {
  response: {
    response: {
      neverError: true  // Don't fail workflow on API errors
    }
  }
}
```

**Behavior:**
- API errors logged but don't stop workflow
- Other carts continue processing
- Failed cart skipped for this run
- Will retry on next scheduled execution

### Validation Failures

```javascript
// Early filtering prevents invalid data from propagating
Filter Valid Carts → Remove carts without email
Calculate Recovery Stage → Skip carts not ready for email
```

### Mixpanel Tracking Failures

- Non-blocking: Workflow continues even if tracking fails
- Logged for later review
- Does not affect email sending

---

## Performance Characteristics

### Execution Time

**Per Cart:**
- Exclusion checks (parallel): ~500ms
- Algolia query: ~200ms
- Email sending: ~300ms
- Updates & tracking: ~400ms
- **Total:** ~1.5 seconds per cart

**For 100 Carts:**
- Sequential: ~150 seconds (2.5 minutes)
- With parallel processing: ~60 seconds (1 minute)

### API Rate Limits

| Service | Limit | Current Usage | Headroom |
|---------|-------|---------------|----------|
| CitadelBuy | 1000/min | ~200/min | 80% |
| Klaviyo | 300/min | ~100/min | 67% |
| Algolia | 10,000/min | ~100/min | 99% |
| Zendesk | 700/min | ~100/min | 86% |
| Mixpanel | Unlimited | ~200/min | N/A |

---

## Integration Patterns

### CitadelBuy API
**Pattern:** REST API with Bearer token
**Auth:** `Authorization: Bearer {token}`
**Endpoints Used:**
- GET `/carts/abandoned` - Fetch carts
- GET `/orders` - Check recent orders
- PATCH `/carts/{id}` - Update recovery stage

### Klaviyo
**Pattern:** Event tracking with templated flows
**Auth:** API key in header
**Flow:**
1. n8n sends event via `/track` endpoint
2. Klaviyo flow listens for "Abandoned Cart Email" event
3. Flow branches based on `stage` property
4. Email sent using template `abandoned_cart_stage_{N}`

### Algolia
**Pattern:** Search API with filtering
**Auth:** App ID + API key in headers
**Query Strategy:**
- Filter by same category
- Exclude items already in cart
- Prioritize in-stock items
- Return top 4 matches

### Zendesk
**Pattern:** Search API with query syntax
**Auth:** Basic auth (email/token)
**Query:** `type:ticket requester:{email} status<solved`

### Mixpanel
**Pattern:** Event tracking API
**Auth:** Project token in event body
**Events:**
- `Abandoned Cart Email Sent` - Track sends
- `Cart Excluded from Recovery` - Track exclusions

---

## Scalability Considerations

### Current Capacity
- **Carts per execution:** 100-200
- **Executions per day:** 48 (every 30 min)
- **Daily capacity:** 4,800-9,600 carts

### Scaling Strategies

**Option 1: Increase Frequency**
- Change to 15-minute intervals
- Double capacity to 9,600-19,200 carts/day

**Option 2: Batch Processing**
- Process carts in chunks
- Use n8n's built-in batching

**Option 3: Parallel Workflows**
- Create separate workflows per stage
- Distribute load across multiple n8n instances

**Option 4: Queue-Based Processing**
- Use Redis queue
- Worker processes consume from queue
- Better for high-volume stores (10,000+ carts/day)

---

## Security Architecture

### Credential Management
- All API keys stored in n8n credentials vault
- Environment variables for configuration
- No hardcoded secrets in workflow

### Data Privacy
- Customer emails not logged in execution logs
- PII handled in-memory only
- Comply with GDPR/CCPA requirements

### API Security
- HTTPS for all external calls
- Bearer token authentication
- Rate limiting respected

---

## Monitoring & Observability

### Key Metrics

```javascript
// Tracked in Mixpanel
- Emails sent per stage
- Exclusion rate by reason
- Cart recovery rate
- Revenue recovered
- Email open/click rates (via Klaviyo)
```

### Alerts

```javascript
// Configure in n8n or external monitoring
- Zero carts processed (API issue)
- High exclusion rate (>50%)
- Low conversion rate (<5%)
- API errors increasing
- Execution time exceeding threshold
```

### Dashboards

**Mixpanel Dashboard:**
- Recovery funnel by stage
- Revenue impact over time
- Exclusion reasons breakdown

**n8n Dashboard:**
- Execution success/failure rate
- Average execution time
- Daily cart volume processed

---

## Version Control & Deployment

### Workflow Versioning

```bash
# Export workflow
n8n export:workflow --id={ID} --output=workflow-v1.1.0.json

# Commit to git
git add workflow-04-abandoned-cart.json
git commit -m "feat: Add SMS notification for Stage 3"
git tag v1.1.0
git push origin main --tags
```

### Deployment Process

1. **Staging Environment:**
   - Import workflow to staging n8n
   - Test with sample data
   - Verify email delivery

2. **Production Deployment:**
   - Export from staging
   - Import to production
   - Activate workflow
   - Monitor first execution

3. **Rollback Plan:**
   - Keep previous version exported
   - Can import quickly if issues arise

---

## Future Enhancements

### Planned Features
- [ ] SMS notifications for high-value carts (Stage 3)
- [ ] Push notifications via OneSignal
- [ ] A/B testing framework for subject lines
- [ ] Machine learning for optimal send times
- [ ] Dynamic discount amounts based on cart value
- [ ] Multi-language support
- [ ] WhatsApp Business integration

### Architecture Improvements
- [ ] Move to queue-based processing (Redis)
- [ ] Implement circuit breaker pattern
- [ ] Add caching layer for Algolia results
- [ ] Distributed tracing with OpenTelemetry
- [ ] Real-time dashboard with WebSocket updates

---

**Document Version:** 1.0.0
**Last Updated:** 2024-01-15
**Maintained By:** CitadelBuy DevOps Team
