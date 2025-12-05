# Workflow 05: Implementation Checklist

## CitadelBuy Customer Feedback & Review Collection - Go-Live Checklist

**Workflow**: Workflow 05 - Feedback & Reviews
**Target Go-Live**: [DATE]
**Owner**: Platform Engineering Team

---

## Pre-Implementation (Week -2)

### Documentation Review
- [ ] Review README-workflow-05.md (complete setup guide)
- [ ] Review WORKFLOW-05-QUICKSTART.md (quick reference)
- [ ] Review WORKFLOW-05-DIAGRAM.md (visual flow)
- [ ] Review WORKFLOW-05-SUMMARY.md (executive summary)
- [ ] Review test-payloads-workflow-05.json (test scenarios)

### Team Alignment
- [ ] Present workflow to stakeholders
- [ ] Get approval from Customer Success team
- [ ] Get approval from Marketing team
- [ ] Schedule training session for Support team
- [ ] Define success metrics and KPIs

---

## Infrastructure Setup (Week -1)

### n8n Configuration
- [ ] Verify n8n instance is running (https://n8n.citadelbuy.com)
- [ ] Import workflow-05-feedback-reviews.json
- [ ] Verify workflow appears in n8n dashboard
- [ ] Check workflow has no errors on import
- [ ] Set workflow to inactive (until ready)

### Credentials Setup

#### Required Credentials (MUST HAVE)
- [ ] **SendGrid API Key**
  - [ ] Create API key with Mail Send permissions
  - [ ] Add to n8n as `sendgrid-citadelbuy`
  - [ ] Test with sample email send
  - [ ] Verify sender email (reviews@citadelbuy.com) is verified

- [ ] **CitadelBuy API Key**
  - [ ] Generate API key in CitadelBuy admin
  - [ ] Add to n8n as `citadelbuy-api-key` (HTTP Header Auth)
  - [ ] Test GET /v1/orders endpoint
  - [ ] Test GET /v1/users endpoint

- [ ] **OpenAI API Key**
  - [ ] Create API key at platform.openai.com
  - [ ] Verify GPT-4 access (or use GPT-3.5-turbo)
  - [ ] Add to n8n as `openai-citadelbuy`
  - [ ] Test with sample sentiment analysis

#### Optional Credentials (RECOMMENDED)
- [ ] **Klaviyo API Key**
  - [ ] Get Private API Key from Klaviyo
  - [ ] Add to n8n as `klaviyo-citadelbuy`
  - [ ] Test event tracking

- [ ] **Zendesk API Token**
  - [ ] Generate API token in Zendesk
  - [ ] Add to n8n as `zendesk-citadelbuy`
  - [ ] Test ticket creation

- [ ] **Slack Webhook**
  - [ ] Create incoming webhook for #customer-support
  - [ ] Add to n8n as `slack-citadelbuy`
  - [ ] Test message posting

- [ ] **Mixpanel Project Token**
  - [ ] Get project token from Mixpanel
  - [ ] Add to n8n as `mixpanel-citadelbuy`
  - [ ] Test event tracking

---

## SendGrid Template Setup

### Template 1: Review Request
- [ ] Create template in SendGrid
- [ ] Set Template ID: `d-citadelbuy-review-request-v2`
- [ ] Add subject line: "How was your CitadelBuy experience?"
- [ ] Copy HTML from README-workflow-05.md (Template 1)
- [ ] Add dynamic fields:
  - [ ] `{{customer_name}}`
  - [ ] `{{order_number}}`
  - [ ] `{{products}}`
  - [ ] `{{review_url}}`
  - [ ] `{{google_review_url}}`
  - [ ] `{{trustpilot_url}}`
  - [ ] `{{star_1_url}}` through `{{star_5_url}}`
  - [ ] `{{delivery_date}}`
  - [ ] `{{tracking_number}}`
- [ ] Test template with sample data
- [ ] Send test email to team
- [ ] Verify all links work
- [ ] Verify images load correctly

### Template 2: Thank You Email
- [ ] Create template in SendGrid
- [ ] Set Template ID: `d-citadelbuy-review-thank-you`
- [ ] Add subject line: "Thank you for your amazing review!"
- [ ] Copy HTML from README-workflow-05.md (Template 2)
- [ ] Add dynamic fields:
  - [ ] `{{customer_name}}`
  - [ ] `{{rating}}`
  - [ ] `{{referral_url}}`
  - [ ] `{{discount_code}}`
- [ ] Test template with sample data
- [ ] Verify referral link works
- [ ] Verify discount code is applied

### Template 3: NPS Survey
- [ ] Create template in SendGrid
- [ ] Set Template ID: `d-citadelbuy-nps-survey`
- [ ] Add subject line: "How likely are you to recommend CitadelBuy?"
- [ ] Copy HTML from README-workflow-05.md (Template 3)
- [ ] Add dynamic fields:
  - [ ] `{{customer_name}}`
  - [ ] `{{order_number}}`
  - [ ] `{{order_total}}`
  - [ ] `{{nps_url}}`
- [ ] Test template with sample data
- [ ] Verify all 11 score buttons work (0-10)

---

## CitadelBuy API Updates

### Required API Endpoints

#### Create/Update Endpoints
- [ ] **GET /v1/orders/{order_id}**
  - [ ] Returns order details with items array
  - [ ] Includes total_amount, delivered_at, tracking_number
  - [ ] Test with valid order ID
  - [ ] Test with invalid order ID (should return 404)

- [ ] **GET /v1/users/{user_id}**
  - [ ] Returns customer email, name, first_name, last_name
  - [ ] Test with valid user ID
  - [ ] Test with invalid user ID (should return 404)

- [ ] **POST /v1/reviews/requests**
  - [ ] Accepts order_id, customer_id, review_token
  - [ ] Saves review request with status "sent"
  - [ ] Returns created record with reminder_scheduled_at
  - [ ] Test creation

- [ ] **GET /v1/reviews/requests/{token}/status**
  - [ ] Returns status (pending/completed)
  - [ ] Returns sent_at timestamp
  - [ ] Returns completed_at if status is completed
  - [ ] Test with pending request
  - [ ] Test with completed request

- [ ] **POST /v1/reviews**
  - [ ] Accepts rating, review_text, sentiment_score, themes, etc.
  - [ ] Saves review with all sentiment data
  - [ ] Returns created review with ID
  - [ ] Test creation

- [ ] **GET /v1/reviews/quick-rate**
  - [ ] Accepts token and rating (1-5) as query params
  - [ ] Saves quick rating to database
  - [ ] Triggers review-submitted webhook to n8n
  - [ ] Redirects to thank you page
  - [ ] Test all ratings (1-5)

- [ ] **POST /v1/nps/responses**
  - [ ] Accepts customer_id, order_id, score, feedback
  - [ ] Saves NPS response
  - [ ] Returns created record
  - [ ] Test with promoter (9-10)
  - [ ] Test with passive (7-8)
  - [ ] Test with detractor (0-6)

- [ ] **POST /v1/referrals/invitations**
  - [ ] Accepts customer_id, trigger, discount_code
  - [ ] Creates referral invitation
  - [ ] Generates unique referral link
  - [ ] Returns referral URL
  - [ ] Test creation

- [ ] **POST /v1/analytics/aggregate-scores**
  - [ ] Triggers background job to calculate scores
  - [ ] Accepts metric_type (daily_nps, weekly_nps, etc.)
  - [ ] Returns job ID
  - [ ] Test job triggering

### Database Schema Updates
- [ ] Create `review_requests` table
  - [ ] id (primary key)
  - [ ] order_id (foreign key)
  - [ ] customer_id (foreign key)
  - [ ] review_token (unique, indexed)
  - [ ] status (enum: sent, pending, completed)
  - [ ] email_sent_at (timestamp)
  - [ ] reminder_scheduled_at (timestamp)
  - [ ] reminder_sent_at (timestamp, nullable)
  - [ ] completed_at (timestamp, nullable)
  - [ ] created_at, updated_at

- [ ] Update `reviews` table (add sentiment fields)
  - [ ] sentiment_score (integer 0-100)
  - [ ] themes (json array)
  - [ ] emotional_tone (varchar)
  - [ ] category (varchar)
  - [ ] action_items (json array)

- [ ] Create `nps_responses` table
  - [ ] id (primary key)
  - [ ] customer_id (foreign key)
  - [ ] order_id (foreign key)
  - [ ] score (integer 0-10)
  - [ ] category (enum: promoter, passive, detractor)
  - [ ] feedback (text, nullable)
  - [ ] submitted_at (timestamp)
  - [ ] created_at, updated_at

- [ ] Create indexes
  - [ ] review_requests.review_token (unique)
  - [ ] review_requests.status
  - [ ] reviews.sentiment_score
  - [ ] nps_responses.score
  - [ ] nps_responses.category

---

## Klaviyo Configuration

### Create Reminder Flow
- [ ] Login to Klaviyo
- [ ] Create new Flow: "Review Reminder"
- [ ] Set trigger: API Event = "Review Reminder"
- [ ] Add email action:
  - [ ] Subject: "Quick reminder: Share your thoughts on order #{{ order_number }}"
  - [ ] Copy email template from README-workflow-05.md (Klaviyo section)
  - [ ] Add dynamic fields: first_name, order_number, review_url
- [ ] Test flow with sample data
- [ ] Activate flow

---

## ShipStation Integration

### Configure Webhook
- [ ] Login to ShipStation
- [ ] Go to Account → Settings → API Settings
- [ ] Click "Add Custom Store"
- [ ] Enter details:
  - [ ] Store Name: CitadelBuy Reviews
  - [ ] Webhook URL: `https://n8n.citadelbuy.com/webhook/shipment-delivered`
  - [ ] Events: Select `shipment_notify` (delivery confirmation)
- [ ] Save configuration
- [ ] Test with sample shipment

---

## Frontend Updates

### Review Submission Form
- [ ] Create/update review submission form at citadelbuy.com/review/[token]
- [ ] Form should collect:
  - [ ] Rating (1-5 stars)
  - [ ] Review text (optional)
  - [ ] Product-specific ratings (optional)
- [ ] On submit, call CitadelBuy API POST /v1/reviews
- [ ] After API call, trigger n8n webhook:
  ```javascript
  await axios.post('https://n8n.citadelbuy.com/webhook/review-submitted', {
    review_id: review.id,
    order_id: review.order_id,
    customer_id: review.customer_id,
    customer_email: review.customer_email,
    customer_name: review.customer_name,
    rating: review.rating,
    review: review.text,
    product_ids: review.product_ids
  });
  ```
- [ ] Show thank you message after submission
- [ ] Test form submission

### NPS Survey Page
- [ ] Create NPS survey page at citadelbuy.com/nps-survey/[token]
- [ ] Display 0-10 scale with buttons
- [ ] Optional feedback textarea
- [ ] On submit, call CitadelBuy API POST /v1/nps/responses
- [ ] After API call, trigger n8n webhook:
  ```javascript
  await axios.post('https://n8n.citadelbuy.com/webhook/nps-response', {
    customer_id: decoded.customer_id,
    customer_email: decoded.customer_email,
    order_id: decoded.order_id,
    score: score,
    feedback: feedback
  });
  ```
- [ ] Show thank you message after submission
- [ ] Test survey submission

### Quick Rating Handler
- [ ] Create endpoint: GET /api/v1/reviews/quick-rate
- [ ] Accept query params: token, rating (1-5)
- [ ] Decode token to get order/customer info
- [ ] Save rating to database
- [ ] Trigger n8n review-submitted webhook
- [ ] Redirect to thank you page
- [ ] Test all ratings (1-5)

---

## Testing (Week 0)

### Unit Tests

#### Test 1: Shipment Delivered Webhook
- [ ] Send test payload to webhook endpoint
- [ ] Verify workflow execution starts
- [ ] Verify order details are fetched
- [ ] Verify customer details are fetched
- [ ] Verify wait node is activated (5 days)
- [ ] Manually resume wait node
- [ ] Verify review request email is sent
- [ ] Verify email contains correct data

#### Test 2: Positive Review (5 stars)
- [ ] Submit 5-star review via webhook
- [ ] Verify sentiment analysis runs
- [ ] Verify thank you email is sent
- [ ] Verify referral invitation is created
- [ ] Verify Mixpanel event is tracked
- [ ] Verify review saved to database with sentiment

#### Test 3: Negative Review (1 star)
- [ ] Submit 1-star review via webhook
- [ ] Verify support email alert is sent
- [ ] Verify Zendesk ticket is created (urgent priority)
- [ ] Verify Slack notification is sent
- [ ] Verify sentiment analysis runs
- [ ] Verify Mixpanel event is tracked

#### Test 4: NPS Survey (High-Value Order)
- [ ] Send shipment delivered for order > $200
- [ ] Verify both review request AND NPS survey are sent
- [ ] Submit NPS score 9 (Promoter)
- [ ] Verify NPS response is saved
- [ ] Verify Mixpanel event is tracked
- [ ] Verify aggregation job is triggered

#### Test 5: No Response Reminder
- [ ] Send shipment delivered webhook
- [ ] Skip initial wait (manually resume)
- [ ] Verify review request is sent
- [ ] Skip reminder wait (manually resume after 3 days)
- [ ] Verify review status check returns "pending"
- [ ] Verify Klaviyo reminder is sent

#### Test 6: Quick Rating
- [ ] Click 5-star link in email
- [ ] Verify quick rating is saved
- [ ] Verify thank you page is shown
- [ ] Verify thank you email is sent

### Integration Tests

- [ ] Test complete flow end-to-end (delivery → request → review → follow-up)
- [ ] Test with real customer data (1 order)
- [ ] Test with high-value order (> $200)
- [ ] Test with low-value order (< $200)
- [ ] Test error scenarios (invalid order ID, email failure, etc.)
- [ ] Test all email templates render correctly
- [ ] Test all links in emails work
- [ ] Test unsubscribe link works

### Load Tests

- [ ] Test with 10 simultaneous shipment webhooks
- [ ] Test with 50 review submissions at once
- [ ] Verify n8n handles queue properly
- [ ] Verify no data loss
- [ ] Check execution times are within limits

---

## Monitoring Setup

### Mixpanel Dashboards

#### Dashboard 1: Review Performance
- [ ] Create new dashboard: "Review Performance"
- [ ] Add chart: Daily review volume (line chart)
- [ ] Add chart: Response rate trend (line chart)
- [ ] Add chart: Average rating over time (line chart)
- [ ] Add chart: Rating distribution (bar chart)
- [ ] Add chart: Platform breakdown (pie chart)

#### Dashboard 2: NPS Tracking
- [ ] Create new dashboard: "NPS Tracking"
- [ ] Add chart: Current NPS score (single value)
- [ ] Add chart: NPS trend (line chart)
- [ ] Add chart: Promoter/Passive/Detractor split (pie chart)
- [ ] Add chart: NPS by order value (bar chart)

#### Dashboard 3: Sentiment Analysis
- [ ] Create new dashboard: "Sentiment Analysis"
- [ ] Add chart: Sentiment score distribution (histogram)
- [ ] Add chart: Top positive themes (bar chart)
- [ ] Add chart: Top negative themes (bar chart)
- [ ] Add chart: Category breakdown (pie chart)

### Alerts

#### Critical Alerts (Slack #platform-engineering)
- [ ] n8n workflow execution failure
- [ ] SendGrid API failure
- [ ] OpenAI API failure
- [ ] CitadelBuy API failure

#### Warning Alerts (Slack #customer-support)
- [ ] Negative review received (≤2 stars)
- [ ] NPS detractor response (0-6)
- [ ] Review response rate < 20%

#### Daily Digest (Email to team)
- [ ] Total reviews submitted (yesterday)
- [ ] Average rating (yesterday)
- [ ] NPS score (yesterday)
- [ ] Top themes/issues
- [ ] Negative reviews requiring follow-up

### Error Monitoring

- [ ] Set up n8n error workflow
- [ ] Configure error logging to database
- [ ] Set up daily error report
- [ ] Define escalation process for critical errors

---

## Go-Live (Week 1)

### Pre-Launch Checklist (Day -1)
- [ ] All credentials configured and tested
- [ ] All SendGrid templates created and tested
- [ ] All API endpoints tested and working
- [ ] Frontend pages (review form, NPS survey) tested
- [ ] ShipStation webhook configured
- [ ] Klaviyo flow created and tested
- [ ] Mixpanel dashboards created
- [ ] Alerts configured
- [ ] Team trained on workflow
- [ ] Support team ready to respond to negative reviews

### Launch Day (Day 0)
- [ ] **Morning**:
  - [ ] Final verification of all systems
  - [ ] Activate workflow in n8n
  - [ ] Send test order through complete flow
  - [ ] Monitor first execution in n8n dashboard

- [ ] **Afternoon**:
  - [ ] Verify first real shipment triggers workflow
  - [ ] Monitor email delivery in SendGrid
  - [ ] Monitor Mixpanel events
  - [ ] Check for errors in n8n logs

- [ ] **Evening**:
  - [ ] Review day 0 metrics
  - [ ] Address any issues that arose
  - [ ] Prepare status update for stakeholders

### Week 1 Monitoring
- [ ] Daily check of n8n execution logs
- [ ] Daily review of email delivery rates
- [ ] Daily review of review submission volume
- [ ] Daily check for negative reviews requiring follow-up
- [ ] Daily review of error logs

---

## Post-Launch (Week 2-4)

### Week 2: Optimization
- [ ] Analyze response rates
- [ ] A/B test email subject lines
- [ ] Adjust wait times if needed (5-day delay)
- [ ] Review sentiment analysis accuracy
- [ ] Gather feedback from support team

### Week 3: Scaling
- [ ] Increase volume if pilot went well
- [ ] Roll out to all customers (if limited initially)
- [ ] Monitor cost (OpenAI, SendGrid)
- [ ] Review API rate limits
- [ ] Optimize workflow for performance

### Week 4: Reporting
- [ ] Create executive summary report
- [ ] Present metrics to stakeholders
- [ ] Identify areas for improvement
- [ ] Plan next phase enhancements
- [ ] Document lessons learned

---

## Success Criteria

### Must-Have (Week 1)
- [ ] ✅ 100% of delivery confirmations trigger workflow
- [ ] ✅ 90%+ email delivery rate
- [ ] ✅ 0 critical errors
- [ ] ✅ All negative reviews receive response within 24h

### Target Goals (Week 4)
- [ ] 📊 20%+ review response rate
- [ ] 📊 4.2+ average rating
- [ ] 📊 40+ NPS score
- [ ] 📊 95%+ sentiment analysis accuracy

### Stretch Goals (Month 3)
- [ ] 🎯 30%+ review response rate
- [ ] 🎯 4.5+ average rating
- [ ] 🎯 60+ NPS score
- [ ] 🎯 10%+ referral conversion rate

---

## Rollback Plan

### If Critical Issues Arise

#### Immediate Actions
1. [ ] Deactivate workflow in n8n
2. [ ] Alert team via Slack
3. [ ] Identify root cause
4. [ ] Fix issue in staging environment
5. [ ] Test fix thoroughly
6. [ ] Re-activate workflow

#### Communication
- [ ] Notify stakeholders of issue
- [ ] Provide ETA for fix
- [ ] Send update when resolved

---

## Sign-Off

### Team Approvals

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Platform Engineering Lead | | | |
| Customer Success Manager | | | |
| Marketing Manager | | | |
| VP of Product | | | |

---

## Notes & Comments

**Implementation Notes**:
[Space for team to add notes during implementation]

**Issues Encountered**:
[Log any issues and resolutions here]

**Lessons Learned**:
[Document learnings for future workflow implementations]

---

**Checklist Created**: 2025-12-03
**Last Updated**: 2025-12-03
**Version**: 1.0.0
**Owner**: Platform Engineering Team
