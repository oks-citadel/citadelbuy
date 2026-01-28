# Abandoned Cart Recovery Sequence - Quick Reference

## Recovery Timeline Visualization

```
Cart Abandoned (T=0)
    │
    ├─── 1 Hour ────────────────► Stage 1: Initial Reminder
    │                              └─ "You left something behind"
    │                              └─ No discount
    │                              └─ Expected: 20-30% conversion
    │
    ├─── 24 Hours (1 Day) ─────────► Stage 2: Urgency + AI Recommendations
    │                              └─ "Still thinking? Won't last long"
    │                              └─ No discount
    │                              └─ AI product recommendations
    │                              └─ Expected: 10-15% conversion
    │
    ├─── 72 Hours (3 Days) ────────► Stage 3: Discount Incentive
    │                              └─ "10% OFF - Code: COMEBACK10"
    │                              └─ 24-hour expiry countdown
    │                              └─ Expected: 15-20% conversion
    │
    └─── 168 Hours (7 Days) ───────► Stage 4: Final Attempt
                                   └─ "Last chance! Alternatives"
                                   └─ No additional discount
                                   └─ Alternative product suggestions
                                   └─ Expected: 5-10% conversion
```

## Stage Breakdown

### Stage 1: Initial Reminder (1 Hour)

**Timing:** 1 hour after cart abandonment
**Goal:** Gentle reminder - customer may have been interrupted

**Email Content:**
```
Subject: You left something behind, [FirstName]!

Hi [FirstName],

Your cart is waiting for you!

[Cart Items with Images]
- Product Name x Quantity - $Price
- Product Name x Quantity - $Price

Total: $149.99

[Complete Your Purchase Button → Checkout]

Need help? Reply to this email or chat with us.
```

**Key Features:**
- ✅ Personal greeting with first name
- ✅ Clear cart summary with product images
- ✅ Single, prominent CTA button
- ✅ Customer support option
- ❌ No discount offered
- ❌ No urgency language
- ❌ No product recommendations

**Expected Outcomes:**
- Open Rate: 40-50%
- Click Rate: 15-20%
- Conversion Rate: 20-30%
- Best for: Impulse purchases, interrupted sessions

---

### Stage 2: Urgency + Recommendations (24 Hours)

**Timing:** 24 hours after cart abandonment
**Goal:** Create FOMO with urgency and show alternatives

**Email Content:**
```
Subject: Still thinking? These items won't last long!

Hi [FirstName],

We noticed you haven't checked out yet. These items are popular
and may sell out soon!

Your Cart:
[Cart Items with Stock Indicators]
- Product Name - $Price [Only 3 left!]

Total: $149.99

[Checkout Now Button]

You Might Also Like:
[4 AI-Recommended Products based on cart contents]
- Related Product 1 - $XX.XX
- Related Product 2 - $XX.XX
```

**Key Features:**
- ✅ Urgency messaging (popularity, low stock)
- ✅ AI-powered product recommendations via Algolia
- ✅ Social proof elements
- ✅ Expanded product discovery
- ❌ No discount offered (yet)

**Expected Outcomes:**
- Open Rate: 30-40%
- Click Rate: 10-15%
- Conversion Rate: 10-15%
- Best for: Comparison shoppers, indecisive customers

---

### Stage 3: Discount Incentive (72 Hours / 3 Days)

**Timing:** 72 hours after cart abandonment
**Goal:** Provide financial incentive to close the sale

**Email Content:**
```
Subject: Special offer just for you: 10% off your cart!

Hi [FirstName],

🎉 We're offering you an exclusive 10% discount!

Use code: COMEBACK10
⏰ Valid for 24 hours only!

Your Cart:
[Cart Items with Original + Discounted Prices]
- Product Name - $49.99 → $44.99 (Save $5.00)

Original Total: $149.99
Your Price: $134.99
You Save: $15.00

[Claim Your 10% Discount Button → Checkout with code applied]

Offer expires: [Tomorrow at this time]
```

**Key Features:**
- ✅ Clear discount code: **COMEBACK10**
- ✅ 10% off entire cart
- ✅ 24-hour urgency timer
- ✅ Price comparison (original vs. discounted)
- ✅ Automatic code application on checkout
- ✅ Expiration countdown

**Expected Outcomes:**
- Open Rate: 35-45%
- Click Rate: 20-30%
- Conversion Rate: 15-20%
- Best for: Price-sensitive shoppers, fence-sitters

**Discount Implementation:**
```javascript
// Auto-apply discount code
checkout_url: `https://broxiva.com/checkout/${cart_id}?discount=COMEBACK10`

// Or manual entry
"Enter code COMEBACK10 at checkout"
```

---

### Stage 4: Final Attempt (168 Hours / 7 Days)

**Timing:** 7 days after cart abandonment
**Goal:** Last touchpoint before giving up; suggest alternatives

**Email Content:**
```
Subject: We miss you! Alternative products you might love

Hi [FirstName],

We noticed you haven't completed your purchase. That's okay!

Your Original Cart:
[Compact cart summary]

[View Your Cart Button]

Or Browse These Alternatives:
We found some similar products you might prefer:

[4 Alternative Products - Similar category/price]
- Alternative 1 - $XX.XX [Shop Now]
- Alternative 2 - $XX.XX [Shop Now]

This is our final reminder about your cart.
We hope to see you again soon!

[Browse All Products] | [Contact Support]
```

**Key Features:**
- ✅ Graceful exit messaging ("That's okay!")
- ✅ Alternative product suggestions
- ✅ Cross-sell opportunities
- ✅ Final notice transparency
- ✅ Multiple CTAs (cart, alternatives, browse)
- ❌ No additional discount (already offered in Stage 3)

**Expected Outcomes:**
- Open Rate: 20-30%
- Click Rate: 8-12%
- Conversion Rate: 5-10%
- Best for: Last-chance recoveries, product discovery

---

## Exclusion Rules (Applied Before Each Email)

### 1. Recent Order Placed ✋
**Check:** Has customer ordered since cart creation?
**Action:** SKIP - Customer already converted
**Tracking:** Log as "converted_before_email"

### 2. Klaviyo Suppression List ✋
**Check:** Is email in suppression list?
**Reasons:** Unsubscribed, hard bounce, spam complaint
**Action:** SKIP - Respect unsubscribe/bounce
**Tracking:** Log as "suppression_list"

### 3. Open Support Ticket ✋
**Check:** Does customer have open Zendesk ticket?
**Reason:** May have issue preventing purchase
**Action:** SKIP - Avoid pressure during support
**Tracking:** Log as "open_support_ticket"

### 4. Maximum Stages Reached ✋
**Check:** Has cart received all 4 emails?
**Action:** STOP - End recovery sequence
**Tracking:** Log as "sequence_completed"

---

## Personalization Elements

### Customer Data
- ✅ First name in subject and greeting
- ✅ Customer ID for tracking
- ✅ Email address for targeting

### Cart Details
- ✅ Product names and SKUs
- ✅ Product images from CDN
- ✅ Quantities and prices
- ✅ Total cart value
- ✅ Item count

### AI Recommendations (Stages 2 & 4)
- ✅ Related products via Algolia
- ✅ Same category filtering
- ✅ Price similarity matching
- ✅ In-stock items only
- ✅ Excludes items already in cart

### Dynamic Content
- ✅ Stock levels (if available)
- ✅ Urgency indicators
- ✅ Social proof ("X customers bought this")
- ✅ Discount calculations
- ✅ Expiration timers

---

## Timing Customization

### Modify Delays in Workflow

Edit the `Calculate Recovery Stage` code node:

```javascript
// STAGE 1: Initial Reminder
// DEFAULT: 1 hour
if (recoveryStage === 0 && hoursSinceUpdate >= 1) {
  // For faster: >= 0.5 (30 minutes)
  // For slower: >= 2 (2 hours)
}

// STAGE 2: Urgency + Recommendations
// DEFAULT: 24 hours
if (recoveryStage === 1 && hoursSinceUpdate >= 24) {
  // For faster: >= 12 (12 hours)
  // For slower: >= 48 (2 days)
}

// STAGE 3: Discount Offer
// DEFAULT: 72 hours (3 days)
if (recoveryStage === 2 && hoursSinceUpdate >= 72) {
  // For faster: >= 48 (2 days)
  // For slower: >= 96 (4 days)
}

// STAGE 4: Final Attempt
// DEFAULT: 168 hours (7 days)
if (recoveryStage === 3 && hoursSinceUpdate >= 168) {
  // For faster: >= 120 (5 days)
  // For slower: >= 240 (10 days)
}
```

### Industry Best Practices

**Fast Fashion / Flash Sales:**
- Stage 1: 30 minutes
- Stage 2: 6 hours
- Stage 3: 24 hours
- Stage 4: 3 days

**High-Ticket Items ($500+):**
- Stage 1: 2 hours
- Stage 2: 48 hours
- Stage 3: 5 days
- Stage 4: 10 days

**Subscription Products:**
- Stage 1: 1 hour
- Stage 2: 12 hours
- Stage 3: 2 days
- Stage 4: 7 days

---

## Discount Strategy

### Current Configuration
- **Code:** COMEBACK10
- **Value:** 10% off
- **Expiry:** 24 hours
- **Stage:** 3 only

### Alternative Strategies

#### Progressive Discounts
```
Stage 1: No discount
Stage 2: 5% off (code: SAVE5)
Stage 3: 10% off (code: SAVE10)
Stage 4: 15% off (code: FINAL15)
```

#### Cart Value-Based
```
Cart < $50:   No discount
Cart $50-100: 10% off
Cart $100+:   15% off
```

#### Free Shipping Instead
```
Stage 3: "Free shipping code: SHIPFREE"
Minimum: $50 cart value
```

#### Bundle Discounts
```
"Add one more item, get 15% off your entire order"
Encourages upselling
```

---

## Performance Benchmarks

### Expected Overall Recovery Rate
**Target: 40-50% of abandoned carts recovered**

| Stage | Email Open | Click-Through | Conversion | Revenue Share |
|-------|-----------|---------------|------------|---------------|
| 1     | 45%       | 18%           | 25%        | 50%           |
| 2     | 35%       | 12%           | 12%        | 20%           |
| 3     | 40%       | 25%           | 18%        | 25%           |
| 4     | 25%       | 10%           | 7%         | 5%            |

### Revenue Impact Calculation

```
Total Abandoned Carts/Month: 1,000
Average Cart Value: $150

Potential Lost Revenue: 1,000 × $150 = $150,000

With 45% Recovery Rate:
Recovered Revenue: $150,000 × 0.45 = $67,500

Stage 3 Discount Cost (18% of recoveries):
$67,500 × 0.25 × 0.10 = $1,688

Net Revenue Recovery: $67,500 - $1,688 = $65,812
```

---

## A/B Testing Ideas

### Subject Lines
**Stage 1:**
- A: "You left something behind, [Name]!"
- B: "[Name], your cart is waiting"
- C: "Forgot something? Complete your order"

**Stage 3:**
- A: "Special offer: 10% off your cart!"
- B: "We saved you $15 on your order"
- C: "Your exclusive 10% discount is ready"

### Discount Amounts
- Test: 10% vs. 15% vs. $15 flat
- Measure: Conversion rate vs. profit margin

### Send Times
- Morning (9 AM): Higher open rates
- Afternoon (2 PM): Moderate engagement
- Evening (7 PM): Higher conversion rates

---

## Troubleshooting

### Low Open Rates
**Solutions:**
- ✅ Test different subject lines
- ✅ Verify sender reputation
- ✅ Check spam folder placement
- ✅ Clean email list regularly

### Low Click Rates
**Solutions:**
- ✅ Make CTA buttons more prominent
- ✅ Improve product images
- ✅ Add more urgency language
- ✅ Simplify email layout

### Low Conversion Rates
**Solutions:**
- ✅ Increase discount amount
- ✅ Reduce checkout friction
- ✅ Add trust signals (reviews, guarantees)
- ✅ Offer multiple payment options

### High Exclusion Rate
**Solutions:**
- ✅ Review exclusion rules (may be too strict)
- ✅ Check API connectivity
- ✅ Verify suppression list accuracy
- ✅ Monitor support ticket volume

---

## Quick Commands

### Import Workflow
```bash
# Via n8n CLI
n8n import:workflow --input=workflow-04-abandoned-cart.json

# Via UI
# Settings → Import from file → workflow-04-abandoned-cart.json
```

### Test Single Stage
```bash
# Modify timing to 0 hours for immediate testing
# In Calculate Recovery Stage node, change:
hoursSinceUpdate >= 0  # Instead of >= 1, >= 24, etc.
```

### Monitor Execution
```bash
# Check n8n execution logs
n8n executions:list --workflow="Broxiva Abandoned Cart Recovery"

# View specific execution
n8n execution:get --id=EXECUTION_ID
```

### Check Metrics
```bash
# Mixpanel query
curl -X POST https://mixpanel.com/api/2.0/segmentation \
  -d project_id=YOUR_PROJECT_ID \
  -d event='["Abandoned Cart Email Sent"]' \
  -d type=general
```

---

## Support Resources

- **Full Documentation:** `README-abandoned-cart.md`
- **Configuration:** `config-abandoned-cart.json`
- **Workflow JSON:** `workflow-04-abandoned-cart.json`
- **API Docs:** https://docs.broxiva.com/api
- **Klaviyo Templates:** https://www.klaviyo.com/templates
- **Support:** devops@broxiva.com

---

## Checklist Before Going Live

- [ ] All environment variables configured
- [ ] Broxiva API credentials valid
- [ ] Klaviyo account connected
- [ ] All 4 email templates created in Klaviyo
- [ ] Algolia index populated with products
- [ ] Zendesk integration tested
- [ ] Mixpanel project created
- [ ] Test workflow with sample cart
- [ ] Verify exclusion rules work
- [ ] Check email deliverability
- [ ] Configure error notifications
- [ ] Set up monitoring dashboard
- [ ] Document discount code in promo system
- [ ] Train support team on recovery sequence
- [ ] Schedule review meeting in 30 days

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0
**Maintained By:** Broxiva DevOps Team
