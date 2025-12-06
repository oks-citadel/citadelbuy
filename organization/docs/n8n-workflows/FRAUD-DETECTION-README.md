# CitadelBuy Fraud Detection & Prevention Workflow

## Overview

The Fraud Detection & Prevention workflow is a comprehensive real-time fraud monitoring system that analyzes orders using a multi-factor risk scoring algorithm. It runs in parallel with the Order Processing workflow and automatically routes orders based on their fraud risk level.

**Workflow File:** `workflow-10-fraud-detection.json`

## Features

- **Real-time Risk Scoring:** Calculates fraud risk score (0-100) using 11+ fraud indicators
- **Stripe Radar Integration:** Leverages Stripe's ML-based fraud detection
- **Automated Risk Routing:** Routes orders to appropriate channels based on risk level
- **Multi-channel Notifications:** Slack alerts, email notifications, Zendesk tickets
- **Automatic Actions:** Auto-cancels critical risk orders and blocks fraudulent customers
- **Comprehensive Audit Logging:** Tracks all fraud decisions for compliance and analysis
- **Error Handling:** Robust error handling with fallback notifications

## Trigger

**Event:** `order.created` webhook
**Endpoint:** `https://n8n.citadelbuy.com/webhook/fraud-detection`
**Method:** POST
**Runs:** In parallel with Order Processing workflow

## Risk Scoring Algorithm

### Score Ranges & Actions

| Risk Level | Score Range | Color | Action | Notifications |
|------------|-------------|-------|--------|---------------|
| **LOW** | 0-30 | Green | Process normally → Fulfillment | None (audit log only) |
| **MEDIUM** | 31-60 | Yellow | Hold for review | Slack #fraud-review + Customer email |
| **HIGH** | 61-85 | Orange | Manual review required | Slack #fraud-alerts (urgent) + Zendesk ticket |
| **CRITICAL** | 86-100 | Red | Auto-cancel + Block customer | Slack #fraud-alerts + Customer email + Audit |

### Risk Factors & Point Values

#### 1. New Customer (First Order)
- **Points:** +15
- **Logic:** `customerHistory.totalOrders === 0`
- **Rationale:** First-time customers have higher fraud risk

#### 2. Billing/Shipping Address Mismatch
- **Points:** +20
- **Logic:** Country or postal code mismatch
- **Rationale:** Fraudsters often use stolen cards with different shipping addresses

#### 3. High-Value Order
- **Points:** +5 to +25 (scaled)
- **Logic:** Orders >$500
  - $500-$700: +5 points
  - $701-$900: +10 points
  - $901-$1,100: +15 points
  - $1,101+: +20-25 points (capped at 25)
- **Formula:** `Math.min(25, 5 + Math.floor((orderTotal - 500) / 200))`
- **Rationale:** Higher value orders are more attractive to fraudsters

#### 4. Multiple Failed Payment Attempts
- **Points:** +10 per attempt (max +30)
- **Logic:** Checks failed payment history for customer
- **Rationale:** Card testing and fraud attempts often result in failures

#### 5. IP Geolocation vs Shipping Country Mismatch
- **Points:** +15
- **Logic:** IP country ≠ Shipping country
- **Rationale:** Suspicious when order comes from different country than shipping destination

#### 6. Order Velocity (Multiple Orders in 24h)
- **Points:** +25
- **Logic:** >2 orders in past 24 hours
- **Rationale:** Rapid ordering patterns indicate potential fraud or account takeover

#### 7. Free Email Domain
- **Points:** +5
- **Logic:** Email domain in free provider list
- **Domains:** gmail.com, yahoo.com, hotmail.com, outlook.com, aol.com, icloud.com, mail.com, protonmail.com
- **Rationale:** Professional fraudsters use throwaway free emails

#### 8. High-Risk Shipping Country
- **Points:** +20
- **Logic:** Shipping country in high-risk list
- **Countries:**
  - **West Africa:** NG (Nigeria), GH (Ghana), CI (Ivory Coast), CM (Cameroon), BJ (Benin)
  - **Asia:** ID (Indonesia), PK (Pakistan), BD (Bangladesh), VN (Vietnam)
  - **Eastern Europe:** RU (Russia), UA (Ukraine), BY (Belarus), MD (Moldova)
  - **South America:** VE (Venezuela), CO (Colombia), BO (Bolivia)
  - **North Africa:** EG (Egypt), MA (Morocco), DZ (Algeria)
- **Rationale:** Higher fraud rates from certain regions

#### 9. Express Shipping on First Order
- **Points:** +10
- **Logic:** First order + shipping method contains "express" or "overnight"
- **Rationale:** Fraudsters want goods quickly before fraud is detected

#### 10. Disposable Email Domain
- **Points:** +30
- **Logic:** Email domain in disposable provider list
- **Domains:**
  - mailinator.com
  - tempmail.com
  - guerrillamail.com
  - 10minutemail.com
  - throwaway.email
  - temp-mail.org
  - sharklasers.com
  - yopmail.com
  - maildrop.cc
  - getnada.com
  - trashmail.com
  - fakeinbox.com
- **Rationale:** Strong fraud indicator; legitimate customers don't use temp emails

#### 11. Stripe Radar Risk Level
- **Points:**
  - Normal: 0 points
  - Elevated: +15 points
  - Highest: +30 points
- **Logic:** Uses Stripe's ML-based fraud detection
- **Rationale:** Leverages Stripe's extensive fraud database and ML models

#### 12. Stripe Radar Risk Score
- **Points:** Variable (based on Stripe score)
- **Logic:** If Stripe risk score >75, add `(score - 75) / 5` points
- **Example:** Score of 85 = +2 points
- **Rationale:** Additional signal from Stripe's proprietary scoring

## Workflow Architecture

### Node Flow

```
1. Order Created Webhook (Trigger)
   ↓
2. Parse Order Data
   ↓
3. Parallel Data Gathering:
   ├─→ Get Customer History
   ├─→ Check Order Velocity
   ├─→ Get Payment Failures
   ├─→ Get IP Geolocation
   └─→ Stripe Radar Check
   ↓
4. Calculate Risk Score (Function Node)
   ↓
5. Risk Level Router (Switch Node)
   ├─→ LOW (0-30)
   │   ↓
   │   Update Order → Audit Log → Response
   │
   ├─→ MEDIUM (31-60)
   │   ↓
   │   Update Order → Slack Alert → Email Customer → Audit Log → Response
   │
   ├─→ HIGH (61-85)
   │   ↓
   │   Update Order → [Slack Alert + Zendesk Ticket] → Audit Log → Response
   │
   └─→ CRITICAL (86-100)
       ↓
       [Cancel Order + Block Customer] → Slack Alert → Email Customer → Audit Log → Response
```

### Error Handling Flow

```
Any Node Error
   ↓
Error Handler (Function)
   ↓
Slack Error Alert
   ↓
Log Error to Database
   ↓
Error Response (500)
```

## API Endpoints Used

### CitadelBuy API

1. **Get Customer History**
   - `GET /v1/customers/{customerId}`
   - Returns: Total orders, account age, verification status

2. **Check Order Velocity**
   - `GET /v1/orders?customerId={id}&timeframe=24h`
   - Returns: Orders in past 24 hours

3. **Get Payment Failures**
   - `GET /v1/payments/failed-attempts?customerId={id}`
   - Returns: Count and details of failed payment attempts

4. **Update Order Status**
   - `PUT /v1/orders/{orderId}/status`
   - Body: `{ status, fraudCheckPassed, riskScore, holdReason }`

5. **Cancel Order**
   - `DELETE /v1/orders/{orderId}`
   - Body: `{ reason: 'fraud_detected', riskScore, autoRefund: true }`

6. **Block Customer**
   - `POST /v1/customers/{customerId}/block`
   - Body: `{ reason: 'fraud_detected', riskScore, blockType: 'permanent' }`

7. **Audit Logging**
   - `POST /v1/audit/fraud-decisions`
   - Body: Full fraud decision record

8. **Error Logging**
   - `POST /v1/audit/workflow-errors`
   - Body: Workflow error details

### External APIs

1. **IP Geolocation**
   - `GET http://ip-api.com/json/{ipAddress}`
   - Free tier: 45 requests/minute
   - Returns: Country, region, city, ISP, lat/lng

2. **Stripe Radar**
   - Stripe SDK: `stripe.charges.retrieve(chargeId)`
   - Returns: Risk level, risk score, fraud signals

## Installation & Setup

### 1. Import Workflow

```bash
# Import via n8n UI
1. Go to Workflows → Import from File
2. Select: workflow-10-fraud-detection.json
3. Activate workflow
```

### 2. Configure Credentials

#### CitadelBuy API Credentials
```
Name: citadelBuyApi
Type: Header Auth
Header Name: Authorization
Header Value: Bearer YOUR_API_KEY
```

#### Stripe Credentials
```
Name: stripeOAuth2
Type: OAuth2
Grant Type: Client Credentials
Client ID: [From Stripe Dashboard]
Client Secret: [From Stripe Dashboard]
```

#### Slack Credentials
```
Name: slackApi
Type: OAuth2
Scopes: chat:write, chat:write.public
Token: xoxb-YOUR-SLACK-BOT-TOKEN
```

#### Zendesk Credentials
```
Name: zendeskApi
Type: API Token
Subdomain: your-subdomain
Email: your-email@company.com
API Token: YOUR_ZENDESK_TOKEN
```

### 3. Configure Webhook

```bash
# Set webhook URL in your order processing system
WEBHOOK_URL="https://n8n.citadelbuy.com/webhook/fraud-detection"

# Test webhook
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-12345",
    "customerId": "CUST-67890",
    "customerEmail": "customer@example.com",
    "total": 599.99,
    "billingAddress": {
      "country": "US",
      "postalCode": "10001"
    },
    "shippingAddress": {
      "country": "US",
      "postalCode": "10001"
    },
    "shippingMethod": "standard",
    "ipAddress": "192.168.1.1",
    "paymentMethod": "stripe",
    "stripeChargeId": "ch_xxxxxxxxxxxxx",
    "createdAt": "2025-12-03T10:00:00Z"
  }'
```

### 4. Create Slack Channels

```bash
# Create required Slack channels
/create-channel #fraud-alerts
/create-channel #fraud-review

# Invite bot to channels
/invite @n8n-bot to #fraud-alerts
/invite @n8n-bot to #fraud-review

# Set channel topics
/topic #fraud-alerts "Critical and high-risk fraud alerts - immediate attention required"
/topic #fraud-review "Medium-risk orders requiring manual review"
```

### 5. Configure Zendesk Custom Fields

Create custom ticket fields in Zendesk:

```
Field 1:
  Name: Order ID
  Field ID: 360001234567
  Type: Text

Field 2:
  Name: Risk Score
  Field ID: 360001234568
  Type: Number
```

## Configuration & Customization

### Adjusting Risk Thresholds

Edit the "Calculate Risk Score" function node to adjust point values:

```javascript
// Example: Increase points for new customers
if (orderCount === 0) {
  riskScore += 20; // Changed from 15
  riskFactors.push({ factor: 'New Customer', points: 20 });
}

// Example: Add country-specific logic
if (shippingCountry === 'US' && orderTotal > 1000) {
  riskScore += 10;
  riskFactors.push({ factor: 'High-value US order', points: 10 });
}
```

### Modifying Risk Levels

Edit the "Risk Level Router" switch node:

```javascript
// Current thresholds:
LOW: 0-30
MEDIUM: 31-60
HIGH: 61-85
CRITICAL: 86-100

// To make more strict:
LOW: 0-20
MEDIUM: 21-50
HIGH: 51-75
CRITICAL: 76-100
```

### Adding New Risk Factors

Add to "Calculate Risk Score" function:

```javascript
// Example: Check for suspicious phone numbers
const phoneNumber = orderData.phoneNumber;
if (phoneNumber && phoneNumber.startsWith('+1234567')) {
  riskScore += 25;
  riskFactors.push({ factor: 'Suspicious Phone Pattern', points: 25 });
}

// Example: Check delivery time preference
const deliveryTime = orderData.preferredDeliveryTime;
if (deliveryTime === 'night' && orderCount === 0) {
  riskScore += 10;
  riskFactors.push({ factor: 'Night Delivery (First Order)', points: 10 });
}
```

### Updating High-Risk Countries

Edit the HIGH_RISK_COUNTRIES array:

```javascript
const HIGH_RISK_COUNTRIES = [
  'NG', 'GH', 'CI', 'CM', 'BJ', // West Africa
  'ID', 'PK', 'BD', 'VN',       // Asia
  'RU', 'UA', 'BY', 'MD',       // Eastern Europe
  'VE', 'CO', 'BO',             // South America
  'EG', 'MA', 'DZ',             // North Africa
  // Add more as needed:
  'KE', 'TZ', 'ZA'              // East/South Africa
];
```

### Updating Disposable Email Domains

```javascript
const DISPOSABLE_DOMAINS = [
  'mailinator.com', 'tempmail.com', 'guerrillamail.com',
  // Add new domains as they appear:
  'temp-inbox.com', 'throwawaymail.com', 'burnermail.io'
];
```

## Notification Templates

### Slack Alert Templates

#### Medium Risk
```
⚠️ Medium Risk Order Detected

*Order ID:* ORD-12345
*Risk Score:* 45/100
*Customer:* customer@example.com
*Order Total:* $599.99

*Risk Factors:*
• New Customer: +15 points
• High Value Order ($599.99): +10 points
• Address Mismatch: +20 points

*Action Required:* Review order in admin panel
<https://admin.citadelbuy.com/orders/ORD-12345|View Order>
```

#### High Risk
```
🚨 HIGH RISK ORDER - URGENT REVIEW REQUIRED

*Order ID:* ORD-12345
*Risk Score:* 75/100 (HIGH)
*Customer:* customer@example.com
*Order Total:* $1,299.99
*IP Country:* RU
*Shipping Country:* US

*Risk Factors:*
• New Customer: +15 points
• Address Mismatch: +20 points
• High Value Order ($1,299.99): +25 points
• IP/Shipping Country Mismatch: +15 points
• Stripe Radar: Elevated Risk: +15 points

*Stripe Radar:* elevated

*Action Required:* URGENT manual review required
<https://admin.citadelbuy.com/orders/ORD-12345|View Order> | <https://admin.citadelbuy.com/fraud/review/ORD-12345|Fraud Review Panel>

@fraud-team @security-team
```

#### Critical Risk
```
🚫 CRITICAL RISK - ORDER AUTO-CANCELLED

*Order ID:* ORD-12345
*Risk Score:* 95/100 (CRITICAL)
*Customer:* scammer@tempmail.com (BLOCKED)
*Customer ID:* CUST-67890
*Order Total:* $2,499.99

*Risk Factors:*
• Disposable Email: +30 points
• New Customer: +15 points
• High-Risk Country (NG): +20 points
• Address Mismatch: +20 points
• Express Shipping (First Order): +10 points
• Stripe Radar: Highest Risk: +30 points

*Actions Taken:*
• Order automatically cancelled
• Payment refunded
• Customer account blocked
• Added to fraud blacklist

<https://admin.citadelbuy.com/fraud/case/ORD-12345|View Fraud Case>

@fraud-team @security-team @management
```

### Customer Email Templates

#### Order Hold Email
```
Subject: Your CitadelBuy Order Requires Verification

Dear [Customer Name],

Thank you for your order (Order #ORD-12345).

As part of our security measures to protect our customers, we need to verify
some information before processing your order.

Our team will review your order and contact you within 24 hours. If you have
any questions, please contact our support team at support@citadelbuy.com.

Order Details:
- Order Number: ORD-12345
- Order Total: $599.99
- Status: Pending Verification

Thank you for your patience and understanding.

Best regards,
CitadelBuy Security Team
```

#### Order Cancelled Email
```
Subject: Your CitadelBuy Order Has Been Cancelled

Dear [Customer Name],

We regret to inform you that we were unable to process your order (Order #ORD-12345)
due to security concerns.

Your payment has been refunded and should appear in your account within 5-10 business days.

If you believe this was an error, please contact our support team at
support@citadelbuy.com with your order number.

Order Details:
- Order Number: ORD-12345
- Order Total: $2,499.99
- Refund Amount: $2,499.99
- Status: Cancelled

Thank you for your understanding.

Best regards,
CitadelBuy Security Team
```

## Monitoring & Analytics

### Key Metrics to Track

1. **Fraud Detection Rate**
   - Total orders scanned
   - Orders by risk level (Low/Medium/High/Critical)
   - False positive rate
   - False negative rate

2. **Response Times**
   - Average workflow execution time
   - Time to manual review
   - Time to resolution

3. **Financial Impact**
   - Total value of blocked fraudulent orders
   - Chargebacks prevented
   - False positive cost (legitimate orders blocked)

4. **Risk Score Distribution**
   - Histogram of risk scores
   - Trend analysis over time
   - Risk factor frequency

### Query Audit Logs

```bash
# Get fraud decisions for date range
curl -X GET "https://api.citadelbuy.com/v1/audit/fraud-decisions?startDate=2025-12-01&endDate=2025-12-03" \
  -H "Authorization: Bearer YOUR_API_KEY"

# Get blocked customers
curl -X GET "https://api.citadelbuy.com/v1/customers/blocked?reason=fraud_detected" \
  -H "Authorization: Bearer YOUR_API_KEY"

# Get high-risk orders
curl -X GET "https://api.citadelbuy.com/v1/orders?status=fraud_review&riskLevel=high" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Testing

### Test Scenarios

#### 1. Low Risk Order (Score: 15)
```json
{
  "orderId": "TEST-LOW-001",
  "customerId": "CUST-EXISTING",
  "customerEmail": "john@company.com",
  "total": 99.99,
  "billingAddress": {"country": "US", "postalCode": "10001"},
  "shippingAddress": {"country": "US", "postalCode": "10001"},
  "shippingMethod": "standard",
  "ipAddress": "192.168.1.1",
  "stripeChargeId": "ch_test_low"
}
```
**Expected:** Score ~15, Status: Approved

#### 2. Medium Risk Order (Score: 45)
```json
{
  "orderId": "TEST-MED-001",
  "customerId": "CUST-NEW",
  "customerEmail": "customer@gmail.com",
  "total": 599.99,
  "billingAddress": {"country": "US", "postalCode": "10001"},
  "shippingAddress": {"country": "CA", "postalCode": "M5H2N2"},
  "shippingMethod": "standard",
  "ipAddress": "192.168.1.1",
  "stripeChargeId": "ch_test_medium"
}
```
**Expected:** Score ~45, Status: Hold, Slack alert to #fraud-review

#### 3. High Risk Order (Score: 75)
```json
{
  "orderId": "TEST-HIGH-001",
  "customerId": "CUST-NEW",
  "customerEmail": "buyer@yahoo.com",
  "total": 1299.99,
  "billingAddress": {"country": "US", "postalCode": "10001"},
  "shippingAddress": {"country": "NG", "postalCode": "100001"},
  "shippingMethod": "express",
  "ipAddress": "41.203.x.x",
  "stripeChargeId": "ch_test_high"
}
```
**Expected:** Score ~75, Status: Manual Review, Zendesk ticket + Slack #fraud-alerts

#### 4. Critical Risk Order (Score: 95)
```json
{
  "orderId": "TEST-CRIT-001",
  "customerId": "CUST-FRAUD",
  "customerEmail": "test@tempmail.com",
  "total": 2499.99,
  "billingAddress": {"country": "US", "postalCode": "10001"},
  "shippingAddress": {"country": "NG", "postalCode": "100001"},
  "shippingMethod": "overnight",
  "ipAddress": "41.203.x.x",
  "stripeChargeId": "ch_test_critical"
}
```
**Expected:** Score ~95, Status: Cancelled, Customer blocked, Slack urgent alert

### Manual Testing

```bash
# Test webhook endpoint
./test-fraud-workflow.sh

# Monitor execution in n8n
# Go to Executions → Filter by workflow name → View details

# Check Slack channels
# Verify alerts appear in #fraud-alerts and #fraud-review

# Verify database logs
# Query audit logs API to confirm all decisions are logged
```

## Troubleshooting

### Common Issues

#### 1. Workflow Not Triggering
```
Problem: Webhook not receiving orders
Solution:
- Verify webhook URL is correct
- Check firewall/network settings
- Test with curl command
- Review n8n logs
```

#### 2. Stripe Radar Errors
```
Problem: Stripe Radar node failing
Solution:
- Verify Stripe credentials are valid
- Check if charge ID exists
- Ensure charge has been processed
- Add error handling for missing charges
```

#### 3. IP Geolocation Rate Limits
```
Problem: IP-API rate limit exceeded
Solution:
- Upgrade to IP-API Pro (unlimited requests)
- Or switch to ipstack.com, ipgeolocation.io
- Add caching for repeated IPs
- Implement fallback logic
```

#### 4. False Positives
```
Problem: Too many legitimate orders blocked
Solution:
- Review and adjust risk thresholds
- Reduce points for specific factors
- Whitelist trusted customers
- Add country-specific rules
```

### Debug Mode

Enable debug logging in function nodes:

```javascript
// Add to Calculate Risk Score function
console.log('Risk Calculation Debug:', {
  orderId: orderData.orderId,
  factors: riskFactors,
  totalScore: riskScore,
  customerHistory: customerHistory,
  stripeData: stripeRadar
});
```

## Performance Optimization

### Caching Strategies

1. **Customer History Cache**
   - Cache customer data for 5 minutes
   - Reduces API calls for repeat customers

2. **IP Geolocation Cache**
   - Cache IP lookups for 24 hours
   - Saves API quota

3. **Disposable Domain Cache**
   - Store list in Redis
   - Update weekly from external source

### Parallel Execution

The workflow executes data gathering nodes in parallel for optimal performance:

```
Parse Order Data
   ├─→ Get Customer History     }
   ├─→ Check Order Velocity      } Executed
   ├─→ Get Payment Failures      } in
   ├─→ Get IP Geolocation        } Parallel
   └─→ Stripe Radar Check        }
```

Average execution time: **2-4 seconds**

## Security Considerations

1. **API Key Security**
   - Store credentials in n8n credential manager
   - Never expose in workflow JSON
   - Rotate keys regularly

2. **Webhook Security**
   - Implement webhook signature verification
   - Use HTTPS only
   - Add rate limiting

3. **Customer Data Privacy**
   - Anonymize logs after 90 days
   - Follow GDPR/CCPA requirements
   - Encrypt sensitive data

4. **Access Control**
   - Restrict workflow editing to fraud team
   - Audit all configuration changes
   - Implement approval workflow for threshold changes

## Compliance

### PCI DSS Compliance
- No card data stored in workflow
- All payment data via Stripe
- Audit logs retained for 1 year

### GDPR Compliance
- Customer can request fraud decision details
- Data deletion process for blocked customers
- Right to appeal fraud decisions

## Support & Maintenance

### Regular Maintenance Tasks

**Weekly:**
- Review false positive rate
- Update disposable email domain list
- Check Slack alert backlog

**Monthly:**
- Analyze risk score distribution
- Adjust thresholds if needed
- Review blocked customer list
- Update high-risk country list

**Quarterly:**
- Full audit of fraud detection accuracy
- Review and optimize risk factors
- Update documentation
- Train fraud team on new patterns

### Escalation Path

1. **Level 1:** Automated workflow actions
2. **Level 2:** Fraud team review (#fraud-review)
3. **Level 3:** Senior fraud analyst (Zendesk tickets)
4. **Level 4:** Security team (@security-team)
5. **Level 5:** Management (@management)

## Additional Resources

- [n8n Fraud Detection Best Practices](https://docs.n8n.io/use-cases/fraud-detection/)
- [Stripe Radar Documentation](https://stripe.com/docs/radar)
- [IP Geolocation API Docs](https://ip-api.com/docs)
- [CitadelBuy API Reference](https://api.citadelbuy.com/docs)

## Contact

For questions or support:
- **Fraud Team:** fraud@citadelbuy.com
- **Technical Support:** devops@citadelbuy.com
- **Slack:** #fraud-alerts, #fraud-review

---

**Last Updated:** 2025-12-03
**Version:** 1.0.0
**Maintained By:** CitadelBuy Security Team
