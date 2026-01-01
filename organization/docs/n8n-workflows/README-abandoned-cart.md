# Broxiva Abandoned Cart Recovery Workflow

## Overview

This n8n workflow implements a sophisticated multi-stage abandoned cart recovery system for Broxiva, integrating with Klaviyo for email marketing, Algolia for product recommendations, and Mixpanel for analytics tracking.

## Workflow Architecture

### Flow Diagram

```
Schedule Trigger (30min)
  ↓
Fetch Abandoned Carts API
  ↓
Split & Filter Valid Carts
  ↓
Calculate Recovery Stage
  ↓
Exclusion Rule Checks (Parallel)
  ├─ Recent Orders Check
  ├─ Klaviyo Suppression List
  └─ Zendesk Open Tickets
  ↓
Get Related Products (Algolia)
  ↓
Prepare Personalized Email
  ↓
Send via Klaviyo
  ↓
Update Cart + Track Analytics
```

## Recovery Sequence Timing

### Stage 1: Initial Reminder (1 Hour)
- **Trigger:** 1 hour after cart abandonment
- **Subject:** "You left something behind, [FirstName]!"
- **Content:**
  - Friendly reminder about cart contents
  - Product images and names
  - Clear CTA: "Complete Your Purchase"
- **No discount offered**
- **Expected conversion:** 20-30%

### Stage 2: Urgency + Recommendations (24 Hours)
- **Trigger:** 24 hours after abandonment
- **Subject:** "Still thinking? These items won't last long!"
- **Content:**
  - Urgency messaging (popularity, low stock)
  - AI-powered product recommendations (via Algolia)
  - Social proof elements
  - Cart details with pricing
- **No discount offered**
- **Expected conversion:** 10-15%

### Stage 3: Discount Incentive (72 Hours)
- **Trigger:** 72 hours (3 days) after abandonment
- **Subject:** "Special offer just for you: 10% off your cart!"
- **Content:**
  - **Discount Code: COMEBACK10**
  - Limited-time offer messaging
  - Cart details with original and discounted prices
  - Urgency timer (24-hour expiration)
- **Expected conversion:** 15-20%

### Stage 4: Final Attempt (7 Days)
- **Trigger:** 168 hours (7 days) after abandonment
- **Subject:** "Last chance! Alternative products you might love"
- **Content:**
  - "We miss you" messaging
  - Alternative product recommendations
  - Cross-sell opportunities
  - Final CTA before removing from sequence
- **No additional discount**
- **Expected conversion:** 5-10%

## Exclusion Rules

The workflow automatically excludes carts from recovery emails when:

### 1. Recent Order Placed
- **Check:** API call to `/orders` endpoint
- **Condition:** Customer has placed an order since cart creation
- **Reason:** Customer already converted

### 2. Klaviyo Suppression List
- **Check:** Query Klaviyo suppression list
- **Condition:** Email appears in suppression list
- **Reason:** Unsubscribed, bounced, or marked as spam

### 3. Open Support Ticket
- **Check:** Zendesk API query for open tickets
- **Condition:** Customer has unsolved ticket
- **Reason:** May have issue preventing purchase; avoid pressure

### 4. Maximum Stages Reached
- **Check:** `recovery_stage` field in cart
- **Condition:** Stage >= 4
- **Reason:** Customer has received all recovery emails

## Configuration

### Environment Variables Required

```bash
# Broxiva API
BROXIVA_API_KEY=your_api_key_here
BROXIVA_API_BASE=https://api.broxiva.com/v1

# Klaviyo
KLAVIYO_PUBLIC_API_KEY=pk_xxxxxx
KLAVIYO_PRIVATE_API_KEY=pk_xxxxxx
KLAVIYO_SUPPRESSION_LIST_ID=list_xxxxxx

# Algolia
ALGOLIA_APP_ID=your_app_id
ALGOLIA_API_KEY=your_search_api_key

# Zendesk
ZENDESK_SUBDOMAIN=broxiva
ZENDESK_EMAIL=support@broxiva.com
ZENDESK_API_TOKEN=your_zendesk_token

# Mixpanel
MIXPANEL_PROJECT_TOKEN=your_project_token
```

### Credentials Setup in n8n

#### 1. Broxiva API Key (HTTP Header Auth)
- **Credential Name:** Broxiva API Key
- **Header Name:** `Authorization`
- **Header Value:** `Bearer YOUR_API_KEY`

#### 2. Klaviyo API Key (HTTP Header Auth)
- **Credential Name:** Klaviyo API Key
- **Header Name:** `Authorization`
- **Header Value:** `Klaviyo-API-Key YOUR_PRIVATE_KEY`

#### 3. Zendesk API Token (HTTP Header Auth)
- **Credential Name:** Zendesk API Token
- **Header Name:** `Authorization`
- **Header Value:** `Basic BASE64(email/token:api_token)`

## Klaviyo Email Templates

You need to create 4 email templates in Klaviyo for each recovery stage:

### Template 1: Initial Reminder
**Template ID:** `abandoned_cart_stage_1`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>You left something behind</title>
</head>
<body>
    <h1>Hi {{ customer_first_name }},</h1>

    <p>{{ urgency_message }}</p>

    <h2>Your Cart</h2>
    {% for item in cart_items %}
    <div class="cart-item">
        <img src="{{ item.image_url }}" alt="{{ item.name }}" width="150">
        <h3>{{ item.name }}</h3>
        <p>Quantity: {{ item.quantity }}</p>
        <p>Price: ${{ item.price }}</p>
    </div>
    {% endfor %}

    <p><strong>Total: ${{ cart_total }}</strong></p>

    <a href="{{ checkout_url }}" class="cta-button">Complete Your Purchase</a>
</body>
</html>
```

### Template 2: Urgency + Recommendations
**Template ID:** `abandoned_cart_stage_2`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Still thinking?</title>
</head>
<body>
    <h1>Hi {{ customer_first_name }},</h1>

    <p>{{ urgency_message }}</p>

    <h2>Your Cart</h2>
    {% for item in cart_items %}
    <div class="cart-item">
        <img src="{{ item.image_url }}" alt="{{ item.name }}" width="150">
        <h3>{{ item.name }}</h3>
        <p>${{ item.subtotal }}</p>
    </div>
    {% endfor %}

    <p><strong>Total: ${{ cart_total }}</strong></p>

    <a href="{{ checkout_url }}" class="cta-button">Checkout Now</a>

    <h2>You Might Also Like</h2>
    {% for product in related_products %}
    <div class="recommended-product">
        <img src="{{ product.image_url }}" alt="{{ product.name }}" width="150">
        <h3>{{ product.name }}</h3>
        <p>${{ product.price }}</p>
        <a href="{{ product.url }}">View Product</a>
    </div>
    {% endfor %}
</body>
</html>
```

### Template 3: Discount Offer
**Template ID:** `abandoned_cart_stage_3`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Special Offer: 10% Off!</title>
</head>
<body>
    <h1>Hi {{ customer_first_name }},</h1>

    <p style="font-size: 24px; color: #e74c3c;">{{ urgency_message }}</p>

    <div class="discount-banner">
        <h2>Use code: {{ discount_code }}</h2>
        <p>Save 10% on your cart - Valid for 24 hours only!</p>
    </div>

    <h2>Your Cart</h2>
    {% for item in cart_items %}
    <div class="cart-item">
        <img src="{{ item.image_url }}" alt="{{ item.name }}" width="150">
        <h3>{{ item.name }}</h3>
        <p style="text-decoration: line-through;">${{ item.subtotal }}</p>
        <p style="color: #27ae60; font-weight: bold;">${{ item.subtotal|multiply:0.9|round:2 }}</p>
    </div>
    {% endfor %}

    <p style="text-decoration: line-through;">Original Total: ${{ cart_total }}</p>
    <p style="color: #27ae60; font-size: 24px; font-weight: bold;">
        Your Price: ${{ cart_total|multiply:0.9|round:2 }}
    </p>

    <a href="{{ checkout_url }}?discount={{ discount_code }}" class="cta-button">
        Claim Your 10% Discount
    </a>

    <p style="color: #7f8c8d; font-size: 12px;">
        Offer expires in 24 hours. Discount automatically applied at checkout.
    </p>
</body>
</html>
```

### Template 4: Final Attempt
**Template ID:** `abandoned_cart_stage_4`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>We miss you!</title>
</head>
<body>
    <h1>Hi {{ customer_first_name }},</h1>

    <p>We noticed you haven't completed your purchase. That's okay!</p>

    <p>{{ urgency_message }}</p>

    <h2>Your Original Cart</h2>
    {% for item in cart_items %}
    <div class="cart-item">
        <img src="{{ item.image_url }}" alt="{{ item.name }}" width="100">
        <h4>{{ item.name }}</h4>
        <p>${{ item.price }}</p>
    </div>
    {% endfor %}

    <a href="{{ cart_url }}" class="cta-button secondary">View Your Cart</a>

    <h2>Or Browse These Alternatives</h2>
    {% for product in related_products %}
    <div class="recommended-product">
        <img src="{{ product.image_url }}" alt="{{ product.name }}" width="150">
        <h3>{{ product.name }}</h3>
        <p>${{ product.price }}</p>
        <a href="{{ product.url }}">Shop Now</a>
    </div>
    {% endfor %}

    <p style="color: #7f8c8d; font-size: 12px;">
        This is our final reminder about your cart. We hope to see you again soon!
    </p>
</body>
</html>
```

## Customization Options

### Adjusting Timing Intervals

Edit the `Calculate Recovery Stage` code node to modify timing:

```javascript
// Stage 1: Change from 1 hour to 2 hours
if (recoveryStage === 0 && hoursSinceUpdate >= 2) {
  // ...
}

// Stage 2: Change from 24 hours to 12 hours
if (recoveryStage === 1 && hoursSinceUpdate >= 12) {
  // ...
}

// Stage 3: Change from 72 hours to 48 hours
if (recoveryStage === 2 && hoursSinceUpdate >= 48) {
  // ...
}

// Stage 4: Change from 7 days to 5 days
if (recoveryStage === 3 && hoursSinceUpdate >= 120) {
  // ...
}
```

### Modifying Discount Codes

Edit the `Calculate Recovery Stage` node:

```javascript
// Stage 3: Custom discount
if (recoveryStage === 2 && hoursSinceUpdate >= 72) {
  shouldSendEmail = true;
  emailStage = 3;
  stageName = 'discount';
  discountCode = 'WELCOME15';  // Changed from COMEBACK10
  urgencyMessage = 'Special offer just for you! Get 15% off your cart.';
}
```

### Adding Additional Exclusions

Add new exclusion checks after `Check Zendesk Tickets` node:

```javascript
// Example: Skip high-value customers
{
  "parameters": {
    "conditions": {
      "conditions": [
        {
          "leftValue": "={{ $json.total_value }}",
          "rightValue": 500,
          "operator": {
            "type": "number",
            "operation": "smaller"
          }
        }
      ]
    }
  },
  "name": "Exclude High-Value Carts",
  "type": "n8n-nodes-base.filter"
}
```

## Monitoring & Analytics

### Mixpanel Events Tracked

1. **Abandoned Cart Email Sent**
   - Properties: `email_stage`, `stage_name`, `cart_value`, `item_count`, `discount_offered`

2. **Cart Excluded from Recovery**
   - Properties: `exclusion_reason`, `has_recent_order`, `is_suppressed`, `has_open_ticket`

### Key Metrics to Monitor

- **Email Delivery Rate:** % of emails successfully delivered
- **Open Rate by Stage:** Track which stage performs best
- **Click-Through Rate:** % clicking checkout CTA
- **Recovery Rate by Stage:** % of carts recovered at each stage
- **Revenue Recovery:** Total $ recovered through workflow
- **Exclusion Rate:** % of carts excluded and why

### Mixpanel Dashboard Queries

```javascript
// Recovery rate by stage
mixpanel.query({
  event: "Abandoned Cart Email Sent",
  groupBy: "stage_name",
  aggregate: "count"
});

// Total revenue recovered
mixpanel.query({
  event: "Order Completed",
  filter: "campaign = 'abandoned_cart_*'",
  aggregate: "sum",
  property: "order_value"
});

// Exclusion reasons breakdown
mixpanel.query({
  event: "Cart Excluded from Recovery",
  groupBy: "exclusion_reason",
  aggregate: "count"
});
```

## API Endpoints Used

### Broxiva API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/carts/abandoned` | GET | Fetch all abandoned carts |
| `/carts/{cart_id}` | PATCH | Update recovery stage |
| `/orders` | GET | Check for recent orders |

### Klaviyo API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/track` | POST | Send email event |
| `/api/v2/list/{list_id}/members` | GET | Check suppression list |

### Algolia API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/1/indexes/{index}/query` | POST | Get related products |

### Zendesk API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v2/search.json` | GET | Check open tickets |

### Mixpanel API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/track` | POST | Track events |

## Testing the Workflow

### 1. Test Individual Stages

Use n8n's "Execute Node" feature to test each stage:

```bash
# Create test cart via API
curl -X POST https://api.broxiva.com/v1/carts/test \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "customer_email": "test@example.com",
    "customer_first_name": "Test",
    "items": [{"sku": "CB-PROD-001", "quantity": 1}]
  }'
```

### 2. Bypass Timing for Testing

Temporarily modify timing in `Calculate Recovery Stage`:

```javascript
// Testing: Send all stages immediately
if (recoveryStage === 0 && hoursSinceUpdate >= 0) { // Changed from >= 1
  shouldSendEmail = true;
  emailStage = 1;
  // ...
}
```

### 3. Test Exclusion Rules

Create test data that triggers each exclusion:

```bash
# Test recent order exclusion
curl -X POST https://api.broxiva.com/v1/orders/test \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"customer_id": "test_customer"}'

# Test Klaviyo suppression
# Manually add email to suppression list in Klaviyo UI

# Test Zendesk ticket exclusion
# Create open ticket for test customer
```

## Troubleshooting

### Common Issues

#### 1. Emails Not Sending
**Check:**
- Klaviyo API credentials are valid
- Email templates exist with correct IDs
- Customer email is valid format
- Not in suppression list

#### 2. Stage Not Updating
**Check:**
- Broxiva API PATCH request succeeds
- `cart_id` is correctly passed
- API has write permissions

#### 3. Exclusion Checks Failing
**Check:**
- All API credentials are configured
- Endpoints return 200 status
- Network connectivity from n8n instance

#### 4. Related Products Empty
**Check:**
- Algolia credentials valid
- Product index exists
- Category field present in cart items

### Debug Mode

Enable verbose logging in n8n settings and check execution logs for:

```
Execution Summary {
  "emails_sent": 5,
  "excluded_carts": 2,
  "by_stage": {
    "stage_1": 2,
    "stage_2": 1,
    "stage_3": 2,
    "stage_4": 0
  }
}
```

## Performance Optimization

### For High-Volume Stores (>1000 carts/day)

1. **Increase Check Frequency:**
   - Change schedule from 30 minutes to 15 minutes
   - Process smaller batches more frequently

2. **Batch API Calls:**
   - Modify to bulk update cart stages
   - Use Klaviyo batch tracking endpoint

3. **Cache Related Products:**
   - Store Algolia results in Redis
   - Reuse for similar product categories

4. **Parallel Processing:**
   - Enable n8n's concurrent execution
   - Process multiple carts simultaneously

## Compliance & Privacy

### GDPR Compliance
- Respect unsubscribe requests (Klaviyo suppression list)
- Include unsubscribe link in all emails
- Clear data retention policy in email footer

### CAN-SPAM Compliance
- Include physical mailing address
- Honor opt-out requests within 10 business days
- Clear sender identification

### Data Handling
- Do not log customer emails in n8n execution logs
- Use secure credential storage
- Encrypt API keys in environment variables

## Integration with Broxiva Backend

### Cart Schema Requirements

Your cart model must include:

```typescript
interface AbandonedCart {
  cart_id: string;
  customer_id: string;
  customer_email: string;
  customer_first_name?: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  total_value: number;
  item_count: number;
  recovery_stage: number; // 0-4
  last_recovery_email_sent?: string;
  recovery_campaign?: string;
  items: CartItem[];
}

interface CartItem {
  sku: string;
  name: string;
  image_url: string;
  price: number;
  quantity: number;
  category?: string; // For Algolia recommendations
}
```

### API Implementation Example

```typescript
// GET /carts/abandoned
app.get('/carts/abandoned', async (req, res) => {
  const abandonedCarts = await prisma.cart.findMany({
    where: {
      status: 'abandoned',
      updated_at: {
        lt: new Date(Date.now() - 60 * 60 * 1000) // At least 1 hour old
      },
      recovery_stage: {
        lt: 4 // Not fully processed
      }
    },
    include: {
      items: {
        include: {
          product: true
        }
      },
      customer: true
    }
  });

  res.json({ carts: abandonedCarts });
});

// PATCH /carts/:id
app.patch('/carts/:id', async (req, res) => {
  const { recovery_stage, last_recovery_email_sent } = req.body;

  const cart = await prisma.cart.update({
    where: { cart_id: req.params.id },
    data: {
      recovery_stage,
      last_recovery_email_sent: new Date(last_recovery_email_sent)
    }
  });

  res.json(cart);
});
```

## Version History

- **v1.0.0** (2024-01-15): Initial workflow with 4-stage recovery sequence
- **v1.1.0** (TBD): Add SMS notifications for stage 3
- **v1.2.0** (TBD): Implement machine learning for optimal send times

## Support

For issues or questions:
- **Email:** devops@broxiva.com
- **Slack:** #n8n-workflows
- **Documentation:** https://docs.broxiva.com/automation/abandoned-cart

## License

Internal use only - Broxiva E-commerce Platform
