# Broxiva Customer Feedback & Review Collection Workflow

## Overview

**Workflow ID:** 05
**File:** `workflow-05-feedback-reviews.json`
**Purpose:** Automated customer feedback and review collection system with sentiment analysis, NPS surveys, and intelligent follow-ups

## Features

### Core Functionality
- **Automated Review Requests**: Triggered 5 days after delivery confirmation
- **Multi-Platform Reviews**: Links to Broxiva, Google Business, and Trustpilot
- **1-Click Star Ratings**: Quick rating URLs (1-5 stars) for easy feedback
- **Smart Follow-ups**:
  - No response after 3 days → Gentle reminder via Klaviyo
  - Positive reviews (≥4 stars) → Thank you email + referral invitation
  - Negative reviews (≤2 stars) → Support alert + Zendesk ticket creation
- **AI Sentiment Analysis**: OpenAI-powered analysis of review text
- **NPS Surveys**: Automatic NPS survey for orders > $200
- **Analytics Integration**: Track all metrics in Mixpanel

### Workflow Triggers

1. **Shipment Delivered Webhook**
   - URL: `https://n8n.broxiva.com/webhook/shipment-delivered`
   - Method: POST
   - Source: ShipStation or Broxiva API

2. **Review Submitted Webhook**
   - URL: `https://n8n.broxiva.com/webhook/review-submitted`
   - Method: POST
   - Source: Broxiva Review System

3. **NPS Response Webhook**
   - URL: `https://n8n.broxiva.com/webhook/nps-response`
   - Method: POST
   - Source: Broxiva NPS Survey Form

## Setup Instructions

### Prerequisites

1. **n8n Instance**
   - Version: 1.0.0 or higher
   - Running on: `https://n8n.broxiva.com`

2. **Required Integrations**
   - SendGrid account with API key
   - OpenAI API key (GPT-4 recommended)
   - Klaviyo account with API key
   - Zendesk account with API credentials
   - Mixpanel project token
   - Slack workspace with webhook URL
   - Broxiva API access

### Step 1: Import Workflow

```bash
# Navigate to n8n workflows directory
cd /path/to/n8n/workflows

# Copy workflow file
cp workflow-05-feedback-reviews.json /path/to/n8n/workflows/

# Restart n8n
npm run start
```

Or import via n8n UI:
1. Navigate to n8n dashboard
2. Click "Import from File"
3. Select `workflow-05-feedback-reviews.json`
4. Click "Import"

### Step 2: Configure Credentials

#### SendGrid API Key
1. Go to SendGrid → Settings → API Keys
2. Create new API key with "Mail Send" permissions
3. In n8n: Credentials → Add Credential → SendGrid API
4. Name: `sendgrid-broxiva`
5. Paste API key

#### OpenAI API Key
1. Visit https://platform.openai.com/api-keys
2. Create new API key
3. In n8n: Credentials → Add Credential → OpenAI API
4. Name: `openai-broxiva`
5. Paste API key

#### Klaviyo API Key
1. Klaviyo → Account → Settings → API Keys
2. Create Private API Key
3. In n8n: Credentials → Add Credential → Klaviyo API
4. Name: `klaviyo-broxiva`
5. Enter API key

#### Zendesk API Credentials
1. Zendesk → Admin → Channels → API
2. Enable Token Access
3. Create new API token
4. In n8n: Credentials → Add Credential → Zendesk API
5. Name: `zendesk-broxiva`
6. Enter:
   - Subdomain: `broxiva`
   - Email: `api@broxiva.com`
   - API Token: [your token]

#### Mixpanel Project Token
1. Mixpanel → Settings → Project Settings
2. Copy Project Token
3. In n8n: Credentials → Add Credential → HTTP Header Auth
4. Name: `mixpanel-broxiva`
5. Header Name: `Authorization`
6. Header Value: `Basic [base64 of project_token:]`

#### Slack Webhook
1. Slack → Apps → Incoming Webhooks
2. Add to Workspace
3. Select #customer-support channel
4. Copy Webhook URL
5. In n8n: Credentials → Add Credential → Slack API
6. Name: `slack-broxiva`
7. Paste webhook URL

#### Broxiva API Key
1. Broxiva Admin → Settings → API Keys
2. Generate new API key
3. In n8n: Credentials → Add Credential → HTTP Header Auth
4. Name: `broxiva-api-key`
5. Header Name: `X-API-Key`
6. Header Value: [your API key]

### Step 3: Configure SendGrid Email Templates

Create the following templates in SendGrid:

#### Template 1: Review Request (d-broxiva-review-request-v2)

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
        .header { background: #1a1a1a; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .product { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px; }
        .product img { max-width: 100px; height: auto; }
        .stars { font-size: 32px; text-align: center; margin: 20px 0; }
        .stars a { color: #FFD700; text-decoration: none; margin: 0 5px; }
        .review-links { text-align: center; margin: 30px 0; }
        .review-links a { display: inline-block; margin: 10px; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>How was your experience?</h1>
    </div>

    <div class="content">
        <p>Hi {{customer_name}},</p>

        <p>We hope you're enjoying your recent order #{{order_number}}!</p>

        <p>Your feedback means the world to us. Could you take a moment to rate your experience?</p>

        <div class="stars">
            <p><strong>Quick Rating (click a star):</strong></p>
            <a href="{{star_1_url}}">⭐</a>
            <a href="{{star_2_url}}">⭐⭐</a>
            <a href="{{star_3_url}}">⭐⭐⭐</a>
            <a href="{{star_4_url}}">⭐⭐⭐⭐</a>
            <a href="{{star_5_url}}">⭐⭐⭐⭐⭐</a>
        </div>

        <h3>Your Products:</h3>
        {{#each products}}
        <div class="product">
            <img src="{{this.image}}" alt="{{this.name}}">
            <h4>{{this.name}}</h4>
            <p>Quantity: {{this.quantity}} | Price: ${{this.price}}</p>
        </div>
        {{/each}}

        <div class="review-links">
            <p><strong>Or leave a detailed review on:</strong></p>
            <a href="{{review_url}}">Broxiva</a>
            <a href="{{google_review_url}}">Google</a>
            <a href="{{trustpilot_url}}">Trustpilot</a>
        </div>

        <p><small>Delivered on {{delivery_date}} | Tracking: {{tracking_number}}</small></p>
    </div>

    <div class="footer">
        <p>Thank you for choosing Broxiva!</p>
        <p>Questions? Contact us at support@broxiva.com</p>
    </div>
</body>
</html>
```

#### Template 2: Thank You for Review (d-broxiva-review-thank-you)

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .discount { background: #fff3cd; border: 2px dashed #ffc107; padding: 20px; text-align: center; margin: 20px 0; }
        .discount-code { font-size: 24px; font-weight: bold; color: #856404; }
        .referral { background: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Thank You! 🎉</h1>
    </div>

    <div class="content">
        <p>Hi {{customer_name}},</p>

        <p>Thank you so much for your {{rating}}-star review! Your feedback helps us continue to improve.</p>

        <div class="discount">
            <h3>Here's a special thank you gift!</h3>
            <p class="discount-code">{{discount_code}}</p>
            <p>15% off your next purchase</p>
        </div>

        <div class="referral">
            <h3>Love Broxiva? Refer a Friend!</h3>
            <p>Share Broxiva with friends and you'll both get $10 off your next order.</p>
            <p><a href="{{referral_url}}" style="color: #0c5460; font-weight: bold;">Get Your Referral Link →</a></p>
        </div>

        <p>We can't wait to serve you again!</p>

        <p>Best regards,<br>The Broxiva Team</p>
    </div>
</body>
</html>
```

#### Template 3: NPS Survey (d-broxiva-nps-survey)

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
        .header { background: #6f42c1; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .nps-scale { display: flex; justify-content: space-between; margin: 30px 0; }
        .nps-scale a { display: inline-block; width: 40px; height: 40px; line-height: 40px; text-align: center; background: #e9ecef; color: #495057; text-decoration: none; border-radius: 4px; font-weight: bold; }
        .nps-scale a:hover { background: #6f42c1; color: white; }
    </style>
</head>
<body>
    <div class="header">
        <h1>We Value Your Opinion</h1>
    </div>

    <div class="content">
        <p>Hi {{customer_name}},</p>

        <p>Thank you for your recent order #{{order_number}} totaling ${{order_total}}.</p>

        <p><strong>How likely are you to recommend Broxiva to a friend or colleague?</strong></p>

        <p style="text-align: center;">
            <small>Not likely</small>
            <span style="float: right;"><small>Very likely</small></span>
        </p>

        <div class="nps-scale">
            <a href="{{nps_url}}?score=0">0</a>
            <a href="{{nps_url}}?score=1">1</a>
            <a href="{{nps_url}}?score=2">2</a>
            <a href="{{nps_url}}?score=3">3</a>
            <a href="{{nps_url}}?score=4">4</a>
            <a href="{{nps_url}}?score=5">5</a>
            <a href="{{nps_url}}?score=6">6</a>
            <a href="{{nps_url}}?score=7">7</a>
            <a href="{{nps_url}}?score=8">8</a>
            <a href="{{nps_url}}?score=9">9</a>
            <a href="{{nps_url}}?score=10">10</a>
        </div>

        <p style="text-align: center;">
            <a href="{{nps_url}}" style="display: inline-block; padding: 12px 24px; background: #6f42c1; color: white; text-decoration: none; border-radius: 4px;">Take Survey (2 minutes)</a>
        </p>

        <p>Your feedback helps us serve you better!</p>
    </div>
</body>
</html>
```

### Step 4: Configure Klaviyo Flow

1. **Create Reminder Flow in Klaviyo**:
   - Go to Klaviyo → Flows
   - Create "Review Reminder Flow"
   - Trigger: API Event = "Review Reminder"
   - Wait: 0 minutes (immediate)
   - Action: Send email with template:

```
Subject: Quick reminder: Share your thoughts on order #{{ order_number }}

Hi {{ first_name }},

We noticed you haven't had a chance to review your recent order yet.

It only takes a moment: {{ review_url }}

Your feedback helps us improve and helps other shoppers make informed decisions.

Thanks for being an amazing customer!

- The Broxiva Team
```

### Step 5: Activate Workflow

1. Open workflow in n8n
2. Click "Activate" toggle in top-right
3. Verify webhook URLs are accessible:

```bash
# Test webhook endpoints
curl -X POST https://n8n.broxiva.com/webhook/shipment-delivered \
  -H "Content-Type: application/json" \
  -d '{"order_id": "test-123", "status": "delivered"}'
```

### Step 6: Configure ShipStation Webhook

1. ShipStation → Account → Settings → API Settings
2. Add Custom Store:
   - Store Name: Broxiva Reviews
   - Webhook URL: `https://n8n.broxiva.com/webhook/shipment-delivered`
   - Events: `shipment_notify` (delivery confirmation)
3. Save configuration

### Step 7: Update Broxiva Review System

Add webhook calls to your Broxiva review submission handler:

```javascript
// In your review submission endpoint
async function submitReview(reviewData) {
  // Save review to database
  const review = await db.reviews.create(reviewData);

  // Trigger n8n workflow
  await axios.post('https://n8n.broxiva.com/webhook/review-submitted', {
    review_id: review.id,
    order_id: review.order_id,
    customer_id: review.customer_id,
    customer_email: review.customer_email,
    customer_name: review.customer_name,
    rating: review.rating,
    review: review.text,
    product_ids: review.product_ids,
    submitted_at: review.created_at
  });

  return review;
}
```

### Step 8: Configure NPS Survey Page

Create a landing page at `https://broxiva.com/nps-survey/[token]`:

```javascript
// NPS Survey submission handler
async function submitNPSResponse(token, score, feedback) {
  // Decode token to get order/customer info
  const decoded = decodeToken(token);

  // Trigger n8n workflow
  await axios.post('https://n8n.broxiva.com/webhook/nps-response', {
    customer_id: decoded.customer_id,
    customer_email: decoded.customer_email,
    order_id: decoded.order_id,
    score: score,
    feedback: feedback,
    token: token
  });

  return { success: true };
}
```

## Workflow Configuration

### Adjustable Parameters

#### Wait Times
- **Initial delay**: 5 days (configurable in "Wait 5 Days" node)
- **Reminder delay**: 3 days (configurable in "Wait 3 Days for Response" node)

To change wait times:
1. Open workflow
2. Click on Wait node
3. Adjust "Amount" and "Unit" fields
4. Save workflow

#### NPS Threshold
- **Current**: Orders > $200
- **Change in**: "IF: Order > $200 (NPS Eligible)" node
- Update condition value as needed

#### Review Rating Thresholds
- **Positive**: ≥4 stars
- **Negative**: ≤2 stars
- **Modify in**: IF condition nodes

### Error Handling

The workflow includes automatic error handling:
- Failed API calls: Retry 3 times with exponential backoff
- Invalid data: Skip and log error
- Email failures: Queue for retry
- All errors logged to: `error-handler-workflow`

## Testing

### Test Shipment Delivered Webhook

```bash
curl -X POST https://n8n.broxiva.com/webhook/shipment-delivered \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ORD-123456",
    "user_id": "USR-789",
    "tracking_number": "1Z999AA10123456784",
    "carrier": "UPS",
    "delivered_at": "2025-12-03T10:00:00Z"
  }'
```

### Test Review Submission

```bash
curl -X POST https://n8n.broxiva.com/webhook/review-submitted \
  -H "Content-Type: application/json" \
  -d '{
    "review_id": "REV-001",
    "order_id": "ORD-123456",
    "customer_id": "USR-789",
    "customer_email": "test@example.com",
    "customer_name": "John Doe",
    "rating": 5,
    "review": "Amazing product! Fast shipping and great quality.",
    "product_ids": ["PROD-123"]
  }'
```

### Test NPS Response

```bash
curl -X POST https://n8n.broxiva.com/webhook/nps-response \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "USR-789",
    "customer_email": "test@example.com",
    "order_id": "ORD-123456",
    "score": 9,
    "feedback": "Great service overall!"
  }'
```

## Monitoring & Analytics

### Key Metrics in Mixpanel

The workflow tracks:
- **Review Submitted**: Total reviews received
- **NPS Survey Completed**: NPS responses
- **Review Response Rate**: % of customers who leave reviews
- **NPS Score**: Calculated from responses
- **Sentiment Scores**: AI-analyzed sentiment data

### Dashboards

Create Mixpanel dashboards to monitor:
1. **Daily Review Volume**: Track reviews per day
2. **Rating Distribution**: 1-5 star breakdown
3. **NPS Trends**: Track NPS over time
4. **Sentiment Analysis**: Themes and emotions
5. **Response Rates**: Review request → review submitted conversion

### Alerts

Configure alerts for:
- NPS drops below 50
- Negative review rate > 10%
- Review response rate < 20%

## Troubleshooting

### Common Issues

#### 1. Emails Not Sending

**Symptom**: SendGrid node fails
**Solution**:
- Verify API key is valid
- Check SendGrid sending limits
- Verify template IDs exist
- Check email addresses are valid

#### 2. OpenAI Sentiment Analysis Failing

**Symptom**: Sentiment node times out
**Solution**:
- Check OpenAI API key
- Verify GPT-4 access (or switch to GPT-3.5)
- Increase timeout in node settings
- Check API rate limits

#### 3. Webhooks Not Triggering

**Symptom**: Workflow doesn't start
**Solution**:
- Verify webhook URLs are accessible
- Check workflow is activated
- Test with curl command
- Review n8n logs: `/root/.n8n/logs/`

#### 4. Wait Nodes Not Resuming

**Symptom**: Workflow stops at wait node
**Solution**:
- Ensure n8n has persistent storage configured
- Check database connection
- Verify webhook IDs are unique
- Review n8n execution logs

### Debug Mode

Enable debug logging:
1. Open workflow
2. Click Settings → Executions
3. Enable "Save execution progress"
4. Enable "Save data of executions"
5. Run test and review execution details

## API Endpoints Required

Ensure these Broxiva API endpoints exist:

### Orders
- `GET /v1/orders/{order_id}` - Get order details
- `GET /v1/users/{user_id}` - Get customer details

### Reviews
- `POST /v1/reviews/requests` - Log review request
- `GET /v1/reviews/requests/{token}/status` - Check review status
- `POST /v1/reviews` - Save review with sentiment
- `GET /v1/reviews/quick-rate` - Handle 1-click ratings

### NPS
- `POST /v1/nps/responses` - Save NPS response

### Referrals
- `POST /v1/referrals/invitations` - Create referral invitation

### Analytics
- `POST /v1/analytics/aggregate-scores` - Trigger score aggregation

## Best Practices

### 1. Timing
- Wait 5-7 days after delivery before requesting review
- Send reminders 3 days after initial request
- Don't send more than 2 review requests per order

### 2. Personalization
- Use customer's first name
- Include product images
- Reference order number and delivery date

### 3. Response Handling
- Respond to negative reviews within 24 hours
- Thank customers for positive reviews
- Use sentiment analysis to prioritize responses

### 4. Incentives
- Offer discount for leaving review (check local laws)
- Referral bonus for positive reviewers
- Don't incentivize positive reviews specifically

### 5. Multi-Channel
- Collect reviews on multiple platforms
- Link to Google, Trustpilot, etc.
- Aggregate scores across platforms

## Performance Optimization

### Caching
- Cache customer data for 1 hour
- Cache product images for 24 hours
- Use Redis for review status checks

### Batch Processing
- Process review requests in batches of 100
- Send emails in batches to avoid rate limits
- Aggregate analytics hourly instead of real-time

### Rate Limiting
- SendGrid: Max 100 emails/hour on free tier
- OpenAI: 3 RPM on free tier, 3500 RPM on paid
- Klaviyo: Based on plan tier
- Mixpanel: No hard limits

## Security Considerations

### API Keys
- Store all API keys in n8n credentials manager
- Never commit keys to version control
- Rotate keys every 90 days
- Use different keys for staging/production

### Webhooks
- Validate webhook signatures
- Use HTTPS only
- Whitelist IP addresses if possible
- Rate limit webhook endpoints

### Customer Data
- Encrypt sensitive data in transit and at rest
- Comply with GDPR/CCPA requirements
- Allow customers to opt-out of emails
- Delete customer data on request

## Maintenance

### Weekly Tasks
- Review error logs
- Check email delivery rates
- Monitor API usage/costs
- Review negative feedback

### Monthly Tasks
- Analyze review trends
- Update email templates based on A/B tests
- Review sentiment analysis accuracy
- Optimize wait times based on response rates

### Quarterly Tasks
- Audit API key access
- Review and update documentation
- Analyze ROI of review collection
- Update OpenAI prompts for better sentiment analysis

## Support & Resources

- **n8n Documentation**: https://docs.n8n.io
- **SendGrid API**: https://docs.sendgrid.com
- **OpenAI API**: https://platform.openai.com/docs
- **Klaviyo API**: https://developers.klaviyo.com
- **Zendesk API**: https://developer.zendesk.com
- **Mixpanel API**: https://developer.mixpanel.com

## License

This workflow is proprietary to Broxiva. Unauthorized use or distribution is prohibited.

## Version History

- **v1.0.0** (2025-12-03): Initial release
  - Basic review collection
  - Sentiment analysis
  - NPS surveys
  - Multi-channel integration

## Contact

For questions or support, contact:
- **Email**: dev@broxiva.com
- **Slack**: #platform-engineering
- **GitHub**: https://github.com/broxiva/platform

---

**Last Updated**: 2025-12-03
**Maintained By**: Broxiva Platform Team
