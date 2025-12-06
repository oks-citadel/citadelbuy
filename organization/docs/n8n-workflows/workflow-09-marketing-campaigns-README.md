# CitadelBuy Marketing Campaign Automation - Workflow 9

## Overview

This n8n workflow provides comprehensive marketing campaign automation for CitadelBuy, including customer segmentation, AI-powered personalization, multi-channel orchestration, and performance tracking.

## Features

### 1. Customer Segmentation
- **New Customers**: First purchase within 30 days
- **VIP Customers**: Gold/Platinum tier OR top 10% LTV
- **At-Risk Customers**: No purchase in 60+ days
- **Category Affinity**: Customers grouped by preferred product categories
- **Geographic Segments**: Location-based targeting
- **Birthday Customers**: Daily birthday detection

### 2. Campaign Types
- **Welcome Series**: 5 emails over 14 days for new customers
- **Win-Back Series**: 3 emails with escalating discounts (15%, 20%, 25%)
- **VIP Exclusive**: Premium offers for top-tier customers
- **Product Launch**: Announcements for new arrivals
- **Seasonal Promotions**: Black Friday, Cyber Monday, Holiday, New Year, Valentine's, Summer
- **Birthday Rewards**: 15% discount on customer birthdays

### 3. AI Personalization (OpenAI GPT-4)
- Product recommendations based on purchase history
- Dynamic email subject lines
- Personalized content blocks
- Optimal send time prediction
- Category affinity analysis

### 4. Multi-Channel Orchestration
- **Email** (Klaviyo) - Primary channel
- **SMS** (Twilio) - Follow-up for non-openers after 2 days
- **Facebook Ads** - Retargeting audiences
- **Google Ads** - Retargeting audiences

### 5. Performance Tracking (Mixpanel)
- Campaign sent, opened, clicked, converted metrics
- Revenue attribution per campaign
- A/B test analysis and recommendations
- 6-hour sync interval

## Architecture

### Triggers
1. **Daily Segmentation Trigger** - 9:00 AM daily (cron: `0 9 * * *`)
2. **Webhook Campaign Trigger** - Event-based campaigns
3. **Weekly VIP Campaign** - Monday 10:00 AM (cron: `0 10 * * 1`)
4. **Daily Birthday Check** - 8:00 AM daily (cron: `0 8 * * *`)
5. **Performance Sync** - Every 6 hours (cron: `0 */6 * * *`)

### Workflow Flow

```
Trigger → Segmentation → Purchase History → AI Personalization → Campaign Switch →
Campaign Execution → Profile Update → Wait 2 Days → Engagement Check →
Multi-Channel Follow-up → Performance Tracking
```

## Setup Instructions

### Prerequisites
- n8n instance (self-hosted or cloud)
- CitadelBuy API access
- Klaviyo account and API key
- Segment CDP account
- OpenAI API key (GPT-4 access)
- Twilio account (for SMS)
- Facebook Ads account
- Google Ads account
- Mixpanel account

### Step 1: Environment Variables

Set the following environment variables in n8n:

```bash
# CitadelBuy API
CITADELBUY_API_KEY=your_api_key
CITADELBUY_API_BASE=https://api.citadelbuy.com/v1

# Klaviyo
KLAVIYO_API_KEY=your_klaviyo_api_key
KLAVIYO_NEW_CUSTOMERS_LIST=list_id_new_customers
KLAVIYO_AT_RISK_LIST=list_id_at_risk
KLAVIYO_VIP_LIST=list_id_vip
KLAVIYO_BIRTHDAY_LIST=list_id_birthday
KLAVIYO_ALL_CUSTOMERS_LIST=list_id_all_customers

# Klaviyo Templates
KLAVIYO_WELCOME_TEMPLATE=template_id_welcome
KLAVIYO_WINBACK_TEMPLATE=template_id_winback
KLAVIYO_VIP_TEMPLATE=template_id_vip
KLAVIYO_BIRTHDAY_TEMPLATE=template_id_birthday
KLAVIYO_PRODUCT_LAUNCH_TEMPLATE=template_id_product_launch
KLAVIYO_BLACK_FRIDAY_TEMPLATE=template_id_black_friday
KLAVIYO_CYBER_MONDAY_TEMPLATE=template_id_cyber_monday
KLAVIYO_HOLIDAY_TEMPLATE=template_id_holiday
KLAVIYO_NEW_YEAR_TEMPLATE=template_id_new_year
KLAVIYO_VALENTINES_TEMPLATE=template_id_valentines
KLAVIYO_SUMMER_TEMPLATE=template_id_summer

# Segment CDP
SEGMENT_WRITE_KEY=your_segment_write_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Facebook
FACEBOOK_AD_ACCOUNT_ID=act_123456789
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token

# Google Ads
GOOGLE_ADS_CUSTOMER_ID=123-456-7890
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_ACCESS_TOKEN=your_access_token

# Mixpanel
MIXPANEL_TOKEN=your_mixpanel_project_token
```

### Step 2: Configure API Credentials in n8n

Create the following credentials in n8n:

1. **CitadelBuy API** (HTTP Header Auth)
   - Name: `citadelbuy-api`
   - Header: `Authorization`
   - Value: `Bearer ${CITADELBUY_API_KEY}`

2. **Klaviyo API** (HTTP Header Auth)
   - Name: `klaviyo-api`
   - Header: `Authorization`
   - Value: `Klaviyo-API-Key ${KLAVIYO_API_KEY}`

3. **Segment API** (HTTP Header Auth)
   - Name: `segment-api`
   - Header: `Authorization`
   - Value: `Basic ${base64(SEGMENT_WRITE_KEY:)}`

4. **OpenAI API** (HTTP Header Auth)
   - Name: `openai-api`
   - Header: `Authorization`
   - Value: `Bearer ${OPENAI_API_KEY}`

5. **Twilio API** (HTTP Header Auth)
   - Name: `twilio-api`
   - Use Basic Auth with Account SID and Auth Token

6. **Facebook API** (HTTP Header Auth)
   - Name: `facebook-api`
   - Header: `Authorization`
   - Value: `Bearer ${FACEBOOK_ACCESS_TOKEN}`

7. **Google Ads API** (OAuth2)
   - Name: `google-ads-api`
   - Follow Google Ads OAuth setup

8. **Mixpanel API** (HTTP Header Auth)
   - Name: `mixpanel-api`
   - Use token in request body

### Step 3: Import Workflow

1. Open n8n
2. Click "Import from File"
3. Select `workflow-09-marketing-campaigns.json`
4. Verify all credentials are properly linked
5. Test each node individually
6. Activate workflow

### Step 4: Set Up Klaviyo Email Templates

Create the following email templates in Klaviyo:

#### Welcome Series Template
```html
Subject: Welcome to CitadelBuy, {{ first_name }}!

Hi {{ first_name }},

Welcome to the CitadelBuy family! We're thrilled to have you.

{{ email_opening }}

Here are some products we think you'll love:
{% for product in recommended_products %}
  - {{ product.name }}: {{ product.reason }}
{% endfor %}

Use code WELCOME10 for 10% off your next purchase!

Best regards,
The CitadelBuy Team
```

#### Win-Back Template
```html
Subject: {{ subject_line }}

Hi {{ first_name }},

We've noticed you haven't shopped with us in a while, and we miss you!

Here's {{ discount_percent }}% OFF your next purchase with code {{ coupon_code }}.

This offer expires in 7 days, so don't wait!

Shop now: [Browse Products]

Best,
CitadelBuy Team
```

#### VIP Template
```html
Subject: Exclusive VIP Offer for {{ first_name }}

Dear {{ first_name }},

As one of our valued {{ customer_tier }} members, you get first access to:

{{ email_opening }}

Personalized recommendations just for you:
{{ recommended_products }}

Your VIP benefits include:
- Free shipping on all orders
- Early access to sales
- Dedicated support

Shop VIP Exclusives: [Shop Now]

With appreciation,
CitadelBuy VIP Team
```

#### Birthday Template
```html
Subject: Happy Birthday {{ first_name }}! 🎉

Happy Birthday, {{ first_name }}!

We're celebrating YOU today with an exclusive gift:
15% OFF your entire purchase with code {{ coupon_code }}!

This special offer is valid for the next 30 days.

Treat yourself: [Shop Now]

Wishing you a fantastic day!

The CitadelBuy Team
```

### Step 5: Configure CitadelBuy API Endpoints

Ensure your CitadelBuy API has the following endpoints:

#### Segmentation Endpoints
```
GET /v1/customers/segments
Query params: type, days, tier
Response: Array of customer objects with segmentation data

GET /v1/customers/birthdays
Query params: today
Response: Array of customers with birthdays

GET /v1/customers/{customerId}/purchase-history
Query params: limit
Response: Array of past orders
```

#### Coupon Endpoints
```
POST /v1/coupons/generate
Body: { code, type, value, customerId, expiresAt, usage, description }
Response: Generated coupon object
```

#### Analytics Endpoints
```
POST /v1/analytics/campaigns
Body: Campaign performance data
Response: Success confirmation

POST /v1/customers/{customerId}/tags
Body: { tags: Array }
Response: Success confirmation
```

## Customer Segmentation Guide

### Segment Definitions

#### 1. New Customers
**Criteria**: First purchase within 30 days
**Campaign**: Welcome Series (5 emails)
**Frequency**: Daily check at 9 AM
**Goal**: Increase second purchase rate

**Segment Query**:
```sql
SELECT * FROM customers
WHERE DATE_DIFF(NOW(), first_purchase_date, DAY) <= 30
AND total_orders = 1
```

#### 2. VIP Customers
**Criteria**: Gold/Platinum tier OR top 10% LTV
**Campaign**: Exclusive VIP offers
**Frequency**: Weekly (Monday 10 AM)
**Goal**: Increase lifetime value and retention

**Segment Query**:
```sql
SELECT * FROM customers
WHERE tier IN ('gold', 'platinum')
OR lifetime_value >= (
  SELECT PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY lifetime_value)
  FROM customers
)
```

#### 3. At-Risk Customers
**Criteria**: No purchase in 60+ days
**Campaign**: Win-Back Series (3 emails)
**Frequency**: Daily check at 9 AM
**Goal**: Re-engage dormant customers

**Segment Query**:
```sql
SELECT * FROM customers
WHERE DATE_DIFF(NOW(), last_purchase_date, DAY) >= 60
AND total_orders > 0
AND unsubscribed = false
```

#### 4. Category Affinity Segments
**Criteria**: 60%+ of purchases in a category
**Campaign**: Targeted product launches
**Frequency**: Event-based
**Goal**: Increase category penetration

**Categories**:
- Electronics
- Fashion
- Home & Garden
- Sports & Outdoors
- Beauty & Personal Care

**Segment Query**:
```sql
SELECT
  customer_id,
  category,
  COUNT(*) as category_purchases,
  COUNT(*) / total_orders as affinity_score
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN products p ON oi.product_id = p.id
GROUP BY customer_id, category
HAVING affinity_score >= 0.6
```

#### 5. Geographic Segments
**Criteria**: Location data
**Campaign**: Regional promotions, shipping offers
**Frequency**: Event-based
**Goal**: Optimize delivery and promotions

**Regions**:
- North America
- Europe
- Asia Pacific
- Latin America
- Middle East & Africa

#### 6. Birthday Customers
**Criteria**: Birthday = today
**Campaign**: Birthday reward (15% off)
**Frequency**: Daily check at 8 AM
**Goal**: Increase customer delight and purchases

**Segment Query**:
```sql
SELECT * FROM customers
WHERE MONTH(birthdate) = MONTH(NOW())
AND DAY(birthdate) = DAY(NOW())
AND email_verified = true
```

## Campaign Setup Guide

### Welcome Series (5 Emails over 14 Days)

**Email 1: Welcome** (Day 0)
- Subject: Welcome to CitadelBuy!
- Content: Brand introduction, first purchase offer
- CTA: Browse products, use WELCOME10 code

**Email 2: Best Sellers** (Day 2)
- Subject: Our customers love these products
- Content: Top-rated products
- CTA: Shop best sellers

**Email 3: Personalized Picks** (Day 5)
- Subject: Picked just for you
- Content: AI-recommended products based on browsing
- CTA: View recommendations

**Email 4: Customer Stories** (Day 9)
- Subject: See what others are saying
- Content: Testimonials, reviews, social proof
- CTA: Join the community

**Email 5: Special Offer** (Day 14)
- Subject: Here's an exclusive offer for you
- Content: 15% off code, urgency messaging
- CTA: Claim your discount

**n8n Configuration**:
```javascript
// In Klaviyo, set up a Flow with these steps
Flow: Welcome Series
Trigger: Customer added to "New Customers" list
Steps:
  1. Wait 0 days → Send Email 1
  2. Wait 2 days → Send Email 2
  3. Wait 3 days → Send Email 3
  4. Wait 4 days → Send Email 4
  5. Wait 5 days → Send Email 5
```

### Win-Back Series (3 Emails with Increasing Discounts)

**Email 1: We Miss You** (Day 0 - 60 days inactive)
- Subject: We miss you at CitadelBuy!
- Discount: 15%
- Coupon: WINBACK15
- CTA: Come back and save

**Email 2: Still Thinking** (Day 7 - if email 1 not opened)
- Subject: Still thinking about you! 20% off inside
- Discount: 20%
- Coupon: WINBACK20
- CTA: Don't miss out

**Email 3: Last Chance** (Day 14 - if email 2 not opened)
- Subject: Last chance: 25% off your next purchase
- Discount: 25%
- Coupon: WINBACK25
- CTA: Final opportunity
- Note: After this, customer tagged as "winback_completed"

**n8n Logic**:
The workflow automatically handles the series progression:
1. Checks if previous email was opened
2. Increments discount percentage
3. Generates new coupon code
4. Stops after 3rd attempt or successful engagement

### VIP Campaign

**Frequency**: Weekly (Monday 10 AM)
**Audience**: Gold/Platinum tier + Top 10% LTV
**Benefits**:
- Early access to sales (24h before general public)
- Free shipping on all orders
- Exclusive products
- Dedicated support
- Birthday gifts

**Email Structure**:
```
Subject: [AI-Generated based on customer preferences]
Content:
  - Personalized greeting with tier acknowledgment
  - AI-recommended products
  - VIP-only deals
  - Early access announcements
  - Account summary (orders, savings, tier progress)
CTA: Shop VIP exclusives
```

### Product Launch Campaign

**Trigger**: Webhook when new products added
**Audience**: All customers + category affinity targeting
**Timing**: Within 24 hours of product addition

**Segmentation**:
- Send to category affinity customers first
- Wait 24 hours
- Send to remaining customers

**Email Content**:
```
Subject: Just Arrived: [Product Name] and More!
Content:
  - Hero image of new product
  - Key features and benefits
  - Limited-time launch offer (10% off)
  - Related products
CTA: Shop new arrivals
```

### Seasonal Campaigns

#### Black Friday (Last Friday of November)
- **Discount**: 40%
- **Duration**: Friday - Sunday
- **Segments**: All customers
- **Email timing**: Thursday 6 PM, Friday 9 AM, Sunday 3 PM

#### Cyber Monday (Monday after Thanksgiving)
- **Discount**: 35%
- **Duration**: Monday only
- **Segments**: Electronics affinity, previous online shoppers
- **Email timing**: Monday 6 AM

#### Holiday Season (December 1-25)
- **Theme**: Gift Guide
- **Discount**: 25%
- **Segments**: All customers, gifting preferences
- **Email timing**: Weekly emails + last-minute reminders

#### New Year (January 1-7)
- **Theme**: New Year, New You
- **Discount**: 30%
- **Segments**: Health, fitness, self-improvement categories
- **Email timing**: December 31 (6 PM), January 2, January 5

#### Valentine's Day (February 10-14)
- **Discount**: 20%
- **Segments**: Gift buyers, jewelry/flowers affinity
- **Email timing**: February 10, February 12, February 14 (morning)

#### Summer Sale (July)
- **Theme**: Clearance
- **Discount**: 30%
- **Segments**: All customers
- **Email timing**: Weekly throughout July

**Seasonal Detection Logic**:
The workflow automatically detects seasonal campaigns based on date:
```javascript
// Example from workflow
if (month === 11 && day >= 22 && day <= 28) {
  campaign = 'black_friday';
  discount = 40;
}
```

### Birthday Campaign

**Trigger**: Daily check at 8 AM
**Audience**: Customers with birthday = today
**Reward**: 15% off (valid 30 days)

**Process**:
1. Query customers with today's birthday
2. Generate unique coupon code: BIRTHDAY{customerId}
3. Send personalized email
4. Track in Mixpanel
5. SMS follow-up if email not opened (2 days)

## AI Personalization Details

### OpenAI Integration

The workflow uses GPT-4 to generate:

1. **Product Recommendations**
   - Analyzes purchase history
   - Considers category affinity
   - Evaluates customer tier
   - Returns 5 products with reasoning

2. **Subject Lines**
   - Optimized for customer segment
   - A/B testable variants
   - Personalized with customer data

3. **Email Opening Paragraph**
   - Resonates with customer interests
   - References past purchases
   - Builds on brand relationship

4. **Optimal Send Time**
   - Based on past engagement
   - Timezone-aware
   - Open rate optimization

**Example AI Prompt**:
```
Customer Profile:
Name: John Doe
Tier: Gold
Purchase History: [
  { product: "Gaming Laptop", category: "Electronics", date: "2024-11-15" },
  { product: "Wireless Mouse", category: "Electronics", date: "2024-11-20" }
]
Category Affinity: { "Electronics": 85%, "Gaming": 60% }
Segment: VIP

Generate:
1. 5 personalized product recommendations with reasons
2. Subject line for VIP email campaign
3. Opening paragraph that resonates with their interests
4. Optimal send time based on past engagement

Return as JSON with keys: recommendations, subjectLine, opening, sendTime
```

**Example AI Response**:
```json
{
  "recommendations": [
    {
      "product": "Gaming Headset Pro X",
      "reason": "Complements your gaming laptop setup"
    },
    {
      "product": "RGB Mechanical Keyboard",
      "reason": "Popular among customers with similar gaming preferences"
    },
    {
      "product": "Laptop Cooling Pad",
      "reason": "Extends gaming laptop lifespan"
    },
    {
      "product": "External SSD 1TB",
      "reason": "Extra storage for games and media"
    },
    {
      "product": "Gaming Chair Ergonomic",
      "reason": "Comfort for extended gaming sessions"
    }
  ],
  "subjectLine": "John, New Gaming Gear Just for You!",
  "opening": "Hey John! We noticed you're building an amazing gaming setup. As a valued Gold member, we wanted to share some exclusive gear that'll take your experience to the next level.",
  "sendTime": "18:00"
}
```

## Multi-Channel Orchestration

### Channel Flow

```
Email (Klaviyo)
    ↓
Wait 2 Days
    ↓
Check Engagement
    ↓
If NOT Opened:
    ├─→ SMS (Twilio)
    ├─→ Facebook Retargeting Audience
    └─→ Google Ads Retargeting Audience
```

### SMS Follow-up

**Trigger**: Email not opened after 2 days
**Provider**: Twilio
**Message Template**:
```
Hi {firstName}! We noticed you haven't opened our email.
Don't miss out on exclusive offers! Visit: citadelbuy.com/offers
```

**Best Practices**:
- Keep under 160 characters
- Include personalization
- Clear CTA with short link
- Respect opt-out preferences

### Facebook Retargeting

**Audience Creation**:
- Name: `CitadelBuy - Email Non-Openers - {date}`
- Type: Custom Audience
- Source: Customer file (email/phone)
- Retention: 30 days

**Ad Campaign**:
- Objective: Conversions
- Budget: $50/day
- Placement: Facebook + Instagram Feed
- Creative: Dynamic product ads from email

### Google Ads Retargeting

**Audience Creation**:
- Name: `CitadelBuy - Email Non-Openers - {date}`
- Type: Customer Match
- Source: First-party data
- Membership: 30 days

**Ad Campaign**:
- Objective: Shopping
- Budget: $75/day
- Network: Search + Display
- Creative: Responsive display ads

## Performance Tracking

### Mixpanel Events

#### 1. Campaign Sent
```json
{
  "event": "Campaign Sent",
  "properties": {
    "distinct_id": "customer_123",
    "campaign_type": "vip_exclusive",
    "campaign_name": "VIP Exclusive - John Doe",
    "channel": "email",
    "subject_line": "John, New Gaming Gear Just for You!",
    "send_time": "2025-12-03T18:00:00Z",
    "customer_tier": "gold",
    "lifetime_value": 2500,
    "personalized": true,
    "ai_generated": true
  }
}
```

#### 2. Campaign Engagement Checked
```json
{
  "event": "Campaign Engagement Checked",
  "properties": {
    "distinct_id": "customer_123",
    "campaign_name": "VIP Exclusive - John Doe",
    "email_opened": false,
    "days_since_send": 2,
    "sms_sent": true,
    "retarget_created": true
  }
}
```

#### 3. Campaign Performance Report
```json
{
  "event": "Campaign Performance Report",
  "properties": {
    "timestamp": "2025-12-03T12:00:00Z",
    "period": "last_6_hours",
    "total_sent": 1250,
    "total_opened": 425,
    "total_clicked": 180,
    "total_converted": 45,
    "total_revenue": 12500,
    "open_rate": 34.0,
    "click_rate": 14.4,
    "conversion_rate": 3.6,
    "campaigns": {
      "VIP Exclusive": {
        "sent": 250,
        "opened": 125,
        "clicked": 60,
        "converted": 20,
        "revenue": 5000,
        "open_rate": 50.0,
        "click_rate": 24.0,
        "conversion_rate": 8.0
      }
    }
  }
}
```

#### 4. AB Test Results
```json
{
  "event": "AB Test Results",
  "properties": {
    "timestamp": "2025-12-03T18:00:00Z",
    "total_tests": 3,
    "tests": [
      {
        "campaignType": "Welcome Series",
        "winner": "Welcome Series - Variant A",
        "winnerConversionRate": "5.2",
        "loser": "Welcome Series - Variant B",
        "loserConversionRate": "3.8",
        "improvement": "36.84%",
        "sampleSize": 500,
        "revenueImpact": 1250,
        "recommendation": "Use winner variant exclusively"
      }
    ]
  }
}
```

### Key Metrics Dashboard

Create a Mixpanel dashboard with:

1. **Campaign Overview**
   - Total campaigns sent (last 30 days)
   - Overall open rate
   - Overall click rate
   - Overall conversion rate
   - Total revenue attributed

2. **Segment Performance**
   - Performance by customer segment
   - LTV by segment
   - Churn rate by segment

3. **Channel Effectiveness**
   - Email vs SMS conversion
   - Retargeting ROI
   - Multi-touch attribution

4. **A/B Test Insights**
   - Active tests
   - Winner recommendations
   - Statistical significance

5. **Trend Analysis**
   - Week-over-week growth
   - Seasonal patterns
   - Customer lifecycle metrics

### Revenue Attribution

The workflow tracks revenue in two ways:

1. **Direct Attribution**: Purchases within 7 days of campaign
2. **Multi-Touch Attribution**: All touchpoints in customer journey

**Query Example**:
```sql
SELECT
  campaign_name,
  COUNT(DISTINCT customer_id) as customers_reached,
  SUM(order_total) as revenue,
  SUM(order_total) / COUNT(DISTINCT customer_id) as revenue_per_customer
FROM campaign_touches ct
JOIN orders o ON ct.customer_id = o.customer_id
WHERE o.created_at BETWEEN ct.campaign_sent_at AND DATE_ADD(ct.campaign_sent_at, INTERVAL 7 DAY)
GROUP BY campaign_name
ORDER BY revenue DESC
```

## Testing & Validation

### Pre-Launch Checklist

- [ ] All environment variables set
- [ ] All API credentials configured
- [ ] Klaviyo email templates created
- [ ] Test email sent and received
- [ ] SMS test successful (Twilio)
- [ ] Segment CDP receiving events
- [ ] OpenAI API responding
- [ ] Mixpanel tracking verified
- [ ] Facebook/Google audiences created
- [ ] Webhook endpoint accessible

### Test Campaign

Run a test campaign with a small segment:

1. Create test customer list (10-20 customers)
2. Trigger workflow manually
3. Verify each step:
   - Segmentation data correct
   - AI personalization working
   - Email sent via Klaviyo
   - Tracking in Mixpanel
   - Wait node functioning
   - SMS follow-up working
   - Retargeting audiences created

### Monitoring

Set up alerts for:
- Workflow execution failures
- API rate limit warnings
- Email bounce rates > 5%
- Campaign conversion rate drops
- Unusual spending patterns

## Best Practices

### Email Marketing
- Test subject lines with A/B testing
- Keep email content concise (< 500 words)
- Use responsive design for mobile
- Include clear CTAs
- Respect unsubscribe requests immediately
- Monitor spam complaint rates

### Segmentation
- Update segments daily
- Exclude unsubscribed customers
- Respect marketing preferences
- Test segment logic with SQL queries
- Document segment definitions

### Personalization
- Don't over-personalize (feels creepy)
- Fall back to generic content if AI fails
- Review AI outputs periodically
- A/B test personalized vs generic

### Multi-Channel
- Don't spam customers across channels
- Respect channel preferences
- Track cross-channel attribution
- Optimize send times per channel

### Performance
- Review metrics weekly
- Act on A/B test results
- Optimize underperforming campaigns
- Scale successful campaigns
- Calculate ROI per campaign

## Troubleshooting

### Common Issues

**Issue**: Workflow not triggering
- Check cron expression syntax
- Verify workflow is active
- Check n8n logs for errors

**Issue**: AI personalization failing
- Verify OpenAI API key
- Check token limits
- Review prompt format
- Monitor API rate limits

**Issue**: Klaviyo emails not sending
- Verify API credentials
- Check list IDs exist
- Ensure templates published
- Review Klaviyo logs

**Issue**: SMS not sending
- Verify Twilio credentials
- Check phone number format (+1...)
- Ensure SMS opt-in collected
- Review Twilio logs

**Issue**: Mixpanel events not appearing
- Verify project token
- Check event name spelling
- Ensure distinct_id present
- Review Mixpanel debugger

### Debug Mode

Enable debug mode in n8n to see:
- Input/output of each node
- API request/response
- Execution time
- Error stack traces

## Scaling Considerations

### High Volume (100k+ customers)

1. **Batch Processing**
   - Process customers in batches of 1000
   - Add delay between batches to avoid rate limits

2. **Parallel Execution**
   - Split workflow into parallel paths
   - Use n8n sub-workflows

3. **Caching**
   - Cache API responses when possible
   - Use Redis for temporary data storage

4. **Rate Limiting**
   - Respect API rate limits (Klaviyo: 150 req/min)
   - Implement exponential backoff

5. **Database Optimization**
   - Index segmentation query fields
   - Pre-calculate segment membership
   - Use materialized views

## ROI Calculation

### Cost Analysis

**Monthly Costs**:
- n8n Cloud: $20 (or self-hosted)
- Klaviyo: $150 (up to 10k contacts)
- OpenAI API: $50 (GPT-4 usage)
- Twilio SMS: $100 (1000 SMS)
- Facebook Ads: $1500 (retargeting)
- Google Ads: $2250 (retargeting)
- Mixpanel: $25 (startup plan)
- **Total: $4,095/month**

**Expected Returns** (based on industry benchmarks):

- Email conversion rate: 3-5%
- SMS conversion rate: 10-15%
- Retargeting conversion rate: 2-4%
- Average order value: $75
- Campaigns sent/month: 50,000

**Revenue Attribution**:
- Email: 2,000 orders × $75 = $150,000
- SMS: 150 orders × $75 = $11,250
- Retargeting: 800 orders × $75 = $60,000
- **Total: $221,250/month**

**ROI**: ($221,250 - $4,095) / $4,095 = 5,303%

## Support & Resources

- **n8n Documentation**: https://docs.n8n.io
- **Klaviyo API Docs**: https://developers.klaviyo.com
- **OpenAI API Docs**: https://platform.openai.com/docs
- **Segment Docs**: https://segment.com/docs
- **Twilio Docs**: https://www.twilio.com/docs
- **Mixpanel Docs**: https://developer.mixpanel.com

## Version History

- **v1.0.0** (2025-12-03): Initial release
  - Customer segmentation (6 types)
  - 6 campaign types
  - AI personalization
  - Multi-channel orchestration
  - Performance tracking
  - A/B testing

## License

Proprietary - CitadelBuy Internal Use Only
