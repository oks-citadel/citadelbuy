# CitadelBuy Feedback & Review Collection - Quick Start Guide

## 5-Minute Setup

### 1. Import Workflow
```bash
# In n8n UI: Workflows → Import from File → Select workflow-05-feedback-reviews.json
```

### 2. Configure Credentials (Minimum Required)

#### SendGrid API Key
```
Credentials → Add → SendGrid API
Name: sendgrid-citadelbuy
API Key: [Your SendGrid API key]
```

#### CitadelBuy API Key
```
Credentials → Add → HTTP Header Auth
Name: citadelbuy-api-key
Header Name: X-API-Key
Header Value: [Your CitadelBuy API key]
```

#### OpenAI API Key
```
Credentials → Add → OpenAI API
Name: openai-citadelbuy
API Key: [Your OpenAI API key]
```

### 3. Activate Workflow
- Click "Activate" toggle in workflow editor

### 4. Get Webhook URLs
Copy these three webhook URLs:
1. **Shipment Delivered**: `https://n8n.citadelbuy.com/webhook/shipment-delivered`
2. **Review Submitted**: `https://n8n.citadelbuy.com/webhook/review-submitted`
3. **NPS Response**: `https://n8n.citadelbuy.com/webhook/nps-response`

### 5. Test with Sample Payload

```bash
# Test shipment delivered
curl -X POST https://n8n.citadelbuy.com/webhook/shipment-delivered \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ORD-TEST-001",
    "user_id": "USR-TEST-001"
  }'
```

## Workflow Flow Diagram

```
Shipment Delivered Webhook
    ↓
Get Order & Customer Details
    ↓
Wait 5 Days
    ↓
Send Review Request Email (SendGrid)
    ↓
Log Review Request
    ↓
Wait 3 Days
    ↓
Check Review Status
    ↓
[No Response] → Send Reminder (Klaviyo)

─────────────────────────────────────────

Review Submitted Webhook
    ↓
Parse Review Data
    ↓
├─ [Positive ≥4] → Thank You + Referral Invitation
├─ [Negative ≤2] → Alert Support + Create Zendesk Ticket
└─ [All] → Sentiment Analysis (OpenAI)
    ↓
Save Review with Sentiment
    ↓
Track in Mixpanel

─────────────────────────────────────────

NPS Response Webhook
    ↓
Process NPS Score
    ↓
Save to Database
    ↓
Track in Mixpanel
    ↓
Trigger Score Aggregation
```

## Key Features at a Glance

| Feature | Description | Timing |
|---------|-------------|--------|
| **Initial Request** | Personalized email with product images | 5 days after delivery |
| **1-Click Rating** | Quick star rating (1-5) | Immediate |
| **Reminder** | Gentle follow-up via Klaviyo | 3 days if no response |
| **Positive Follow-up** | Thank you + referral invite | On ≥4 stars |
| **Negative Alert** | Support email + Zendesk ticket | On ≤2 stars |
| **Sentiment Analysis** | OpenAI analysis of review text | On every review |
| **NPS Survey** | For orders > $200 | 5 days after delivery |
| **Analytics** | All events tracked in Mixpanel | Real-time |

## Configuration Checklist

- [ ] Import workflow to n8n
- [ ] Configure SendGrid credentials
- [ ] Configure CitadelBuy API credentials
- [ ] Configure OpenAI credentials
- [ ] Configure Klaviyo credentials (optional for reminders)
- [ ] Configure Zendesk credentials (optional for tickets)
- [ ] Configure Mixpanel credentials (optional for analytics)
- [ ] Configure Slack credentials (optional for alerts)
- [ ] Create SendGrid email templates (3 templates)
- [ ] Activate workflow
- [ ] Test with sample payloads
- [ ] Configure ShipStation webhook
- [ ] Update CitadelBuy review submission handler
- [ ] Create NPS survey landing page
- [ ] Set up Mixpanel dashboards

## Sample Webhook Payloads

### Shipment Delivered
```json
{
  "order_id": "ORD-123456",
  "user_id": "USR-789",
  "tracking_number": "1Z999AA10123456784",
  "carrier": "UPS",
  "delivered_at": "2025-12-03T10:00:00Z"
}
```

### Review Submitted
```json
{
  "review_id": "REV-001",
  "order_id": "ORD-123456",
  "customer_id": "USR-789",
  "customer_email": "customer@example.com",
  "customer_name": "Jane Doe",
  "rating": 5,
  "review": "Excellent product and service!",
  "product_ids": ["PROD-123", "PROD-456"]
}
```

### NPS Response
```json
{
  "customer_id": "USR-789",
  "customer_email": "customer@example.com",
  "order_id": "ORD-123456",
  "score": 9,
  "feedback": "Great experience overall!"
}
```

## Common Customizations

### Change Wait Times
1. Open workflow
2. Click "Wait 5 Days" node
3. Change amount/unit
4. Save

### Adjust NPS Threshold
1. Find "IF: Order > $200" node
2. Edit condition value
3. Save

### Modify Rating Thresholds
1. Find "IF: Positive Review" node (currently ≥4)
2. Find "IF: Negative Review" node (currently ≤2)
3. Edit condition values
4. Save

## Troubleshooting

### Workflow not triggering?
- Check workflow is activated
- Verify webhook URL is correct
- Test with curl command

### Emails not sending?
- Verify SendGrid API key
- Check template IDs exist
- Review SendGrid activity logs

### OpenAI failing?
- Check API key is valid
- Verify you have GPT-4 access (or change to GPT-3.5)
- Check API usage limits

## Required API Endpoints

Your CitadelBuy API must support:

```
GET  /v1/orders/{order_id}
GET  /v1/users/{user_id}
POST /v1/reviews/requests
GET  /v1/reviews/requests/{token}/status
POST /v1/reviews
GET  /v1/reviews/quick-rate?token={token}&rating={1-5}
POST /v1/nps/responses
POST /v1/referrals/invitations
POST /v1/analytics/aggregate-scores
```

## Next Steps

1. **Week 1**: Test with small group of orders
2. **Week 2**: Monitor response rates and adjust timing
3. **Week 3**: A/B test email templates
4. **Week 4**: Full rollout to all customers

## Performance Metrics to Track

- **Response Rate**: % of customers who leave reviews
- **Average Rating**: Mean star rating
- **NPS Score**: Net Promoter Score
- **Time to Review**: Days from delivery to review
- **Sentiment Score**: AI-calculated sentiment
- **Platform Distribution**: Reviews across CitadelBuy/Google/Trustpilot

## Support

- **Documentation**: README-workflow-05.md
- **Email**: dev@citadelbuy.com
- **Slack**: #platform-engineering

---

**Quick Reference Version**: 1.0.0
**Last Updated**: 2025-12-03
