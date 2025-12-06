# CitadelBuy Order Processing & Fulfillment Automation - Workflow 01

## Overview

This n8n workflow automates the complete order processing and fulfillment pipeline for CitadelBuy's e-commerce platform. It handles webhook events, validates orders, manages inventory checks, routes orders based on business rules, and integrates with multiple external services.

## Workflow Diagram

```
Webhook Trigger → HMAC Verification → Data Validation → Inventory Check
                                                              ↓
                                                        Order Routing
                                                              ↓
                                                    Notion Task Creation
                                                              ↓
                                                    SendGrid Email
                                                              ↓
                                                    Update Order Status
                                                              ↓
                                                    Slack Notifications
                                                              ↓
                                                    Audit Logging
                                                              ↓
                                                    Success Response
```

## Features

### 1. Security
- **HMAC-SHA256 signature verification** for webhook authenticity
- Timing-safe signature comparison to prevent timing attacks
- Automatic rejection of invalid signatures with 401 response

### 2. Data Validation
- Comprehensive order data structure validation
- Required field checks (order_id, customer, shipping_address, etc.)
- Line item validation
- Shipping address validation
- Total amount validation

### 3. Intelligent Order Routing
Orders are automatically routed based on:
- **High-Value Orders** (>$500): Priority queue + #priority-orders Slack channel
- **VIP Customers** (Gold/Platinum tier): VIP queue with high priority
- **International Orders**: Routed to #international-fulfillment
- **Express Shipping**: Expedited queue with urgent priority

### 4. Multi-Channel Notifications
- **Slack**: Real-time notifications to relevant channels
- **Email**: Automated order confirmation via SendGrid
- **Notion**: Fulfillment task creation for team tracking

### 5. Audit Trail
Complete audit logging of all order processing events with metadata

### 6. Error Handling
- Comprehensive error catching and logging
- Automatic Slack alerts for errors
- Retry logic on transient failures
- Graceful degradation

## Prerequisites

### 1. n8n Installation
```bash
# Docker installation (recommended)
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### 2. Required Credentials

#### CitadelBuy API
- **Name**: `citadelBuyApi`
- **Type**: Header Auth
- **Configuration**:
  - Header Name: `Authorization`
  - Header Value: `Bearer YOUR_API_TOKEN`

#### Slack OAuth2
- **Name**: `slackApi`
- **Type**: OAuth2
- **Scopes needed**:
  - `chat:write`
  - `channels:read`
  - `channels:write`

#### SendGrid API
- **Name**: `sendGridApi`
- **Type**: Header Auth
- **Configuration**:
  - Header Name: `Authorization`
  - Header Value: `Bearer YOUR_SENDGRID_API_KEY`

#### Notion API
- **Name**: `notionApi`
- **Type**: Header Auth
- **Configuration**:
  - Header Name: `Authorization`
  - Header Value: `Bearer YOUR_NOTION_INTEGRATION_TOKEN`
  - Additional Header: `Notion-Version: 2022-06-28`

### 3. Environment Variables

Set these in n8n settings or `.env` file:

```bash
# Webhook Security
CITADELBUY_WEBHOOK_SECRET=your-webhook-secret-key-min-32-chars

# SendGrid Configuration
SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID=d-1234567890abcdef

# Notion Configuration
NOTION_FULFILLMENT_DB_ID=your-notion-database-id
```

## Setup Instructions

### Step 1: Import Workflow

1. Open n8n interface (default: http://localhost:5678)
2. Click **Workflows** → **Import from File**
3. Select `workflow-01-order-processing.json`
4. Click **Import**

### Step 2: Configure Credentials

1. Click on each node that requires credentials
2. Select **Create New** credential
3. Fill in the required information (see Prerequisites section)
4. Click **Save**

### Step 3: Set Environment Variables

**Option A: Via n8n UI**
1. Go to **Settings** → **Environments**
2. Add each variable listed above
3. Save changes

**Option B: Via Docker**
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e CITADELBUY_WEBHOOK_SECRET=your-secret \
  -e SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID=d-xxx \
  -e NOTION_FULFILLMENT_DB_ID=your-db-id \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### Step 4: Configure Webhook Secret in CitadelBuy

Generate a secure webhook secret:
```bash
openssl rand -hex 32
```

Then set it in both:
1. CitadelBuy backend configuration
2. n8n environment variable `CITADELBUY_WEBHOOK_SECRET`

### Step 5: Get Webhook URL

1. Open the workflow in n8n
2. Click on **Webhook - Order Created** node
3. Copy the **Production URL** (e.g., `https://your-n8n.com/webhook/citadelbuy-order-webhook`)
4. Configure this URL in CitadelBuy admin panel

### Step 6: Set Up Notion Database

Create a Notion database with these properties:

| Property Name | Type | Options |
|--------------|------|---------|
| Order ID | Title | - |
| Customer | Rich Text | - |
| Email | Email | - |
| Total | Number | Currency: USD |
| Priority | Select | normal, high, urgent |
| Queue | Select | standard, priority, vip, expedited |
| Status | Select | Pending, Processing, Fulfilled, Cancelled |
| SLA Deadline | Date | Include time |
| Tags | Multi-select | high-value, vip, international, express-shipping, etc. |

### Step 7: Configure Slack Channels

Create these Slack channels:
- `#fulfillment` - Main fulfillment notifications
- `#priority-orders` - High-value and VIP orders
- `#international-fulfillment` - International shipping
- `#alerts` - Error alerts

Invite the n8n bot to all channels.

### Step 8: Configure SendGrid Template

Create a SendGrid Dynamic Template with these variables:
- `{{ order_number }}`
- `{{ order_id }}`
- `{{ customer_name }}`
- `{{ total }}`
- `{{ items }}` (array)
- `{{ shipping_address }}`
- `{{ estimated_delivery }}`
- `{{ tracking_link }}`

### Step 9: Test the Workflow

**Test Payload:**
```bash
curl -X POST https://your-n8n.com/webhook/citadelbuy-order-webhook \
  -H "Content-Type: application/json" \
  -H "X-CitadelBuy-Signature: CALCULATED_HMAC_SIGNATURE" \
  -d '{
    "event": "order.created",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "order_id": "ORD-CB-12345",
      "order_number": "#CB1234",
      "status": "pending",
      "customer": {
        "id": "cust_abc123",
        "email": "test@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "phone": "+1-555-123-4567",
        "tier": "gold",
        "total_orders": 15,
        "total_spent": 2450.00
      },
      "shipping_address": {
        "address1": "123 Main St",
        "city": "New York",
        "state": "NY",
        "zip": "10001",
        "country": "US"
      },
      "line_items": [
        {
          "sku": "PROD-001",
          "name": "Test Product",
          "quantity": 2,
          "price": 50.00
        }
      ],
      "total": 118.72,
      "payment_status": "paid",
      "shipping_method": "standard"
    }
  }'
```

**Calculate HMAC Signature (Node.js):**
```javascript
const crypto = require('crypto');
const payload = JSON.stringify(webhookData);
const secret = 'your-webhook-secret';
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
console.log('X-CitadelBuy-Signature:', signature);
```

### Step 10: Activate Workflow

1. Click the **Inactive** toggle at top right
2. Workflow status should change to **Active**
3. Monitor the **Executions** tab for incoming webhooks

## Business Rules Configuration

### Priority Levels

| Priority | SLA (hours) | Triggers |
|----------|-------------|----------|
| Urgent | 4 | Express shipping |
| High | 12 | High-value orders (>$500), VIP customers |
| Normal | 24 | Standard orders |

### Queue Assignment

| Queue | Criteria |
|-------|----------|
| Expedited | Express shipping method |
| VIP | Gold or Platinum tier customers |
| Priority | Orders >$500 |
| Standard | All other orders |

### Notification Routing

| Condition | Slack Channel |
|-----------|---------------|
| All orders | #fulfillment |
| Value >$500 OR VIP | #priority-orders |
| International | #international-fulfillment |
| Errors | #alerts |

## Monitoring & Troubleshooting

### View Execution History
1. Go to **Executions** tab
2. Filter by status (Success, Error, Waiting)
3. Click on execution to see detailed logs

### Common Issues

#### 1. Invalid HMAC Signature
**Symptom**: 401 responses from webhook
**Solution**:
- Verify `CITADELBUY_WEBHOOK_SECRET` matches backend
- Check that signature is sent in `X-CitadelBuy-Signature` header
- Ensure raw body is used for signature calculation

#### 2. Notion Task Creation Fails
**Symptom**: Error at "Create Notion Fulfillment Task" node
**Solution**:
- Verify Notion database ID is correct
- Check that all required properties exist in database
- Ensure n8n integration has access to the database

#### 3. SendGrid Email Not Sent
**Symptom**: No confirmation emails received
**Solution**:
- Verify SendGrid API key is valid
- Check template ID is correct
- Review SendGrid activity feed for delivery status
- Verify sender email is verified in SendGrid

#### 4. Slack Notifications Missing
**Symptom**: No Slack messages posted
**Solution**:
- Check bot is invited to target channels
- Verify OAuth scopes include `chat:write`
- Test with a simple message first

### Debugging Tips

1. **Enable Save Execution Data**: Settings → Save Data → Always
2. **Use Test Webhook**: Click "Listen for Test Event" on webhook node
3. **Check Error Output**: Click on red error nodes to see details
4. **Review Audit Logs**: Check CitadelBuy API audit endpoint

## Performance Optimization

### Expected Performance
- **Processing Time**: 2-5 seconds per order
- **Throughput**: 100+ orders/minute
- **Success Rate**: >99.9%

### Optimization Tips
1. **Enable Queue Mode**: For high-volume scenarios
2. **Batch Operations**: Group Slack notifications if needed
3. **Caching**: Cache Notion database schema
4. **Parallel Execution**: Enable where possible

## API Endpoints Used

### CitadelBuy API
- `GET /v1/inventory/check?order_id={id}` - Check inventory
- `PATCH /v1/orders/{id}` - Update order status
- `POST /v1/audit-log` - Log events

### SendGrid API
- `POST /v3/mail/send` - Send emails

### Notion API
- `POST /v1/pages` - Create database entries

### Slack API
- `POST /api/chat.postMessage` - Send messages (via OAuth)

## Security Considerations

### 1. Webhook Security
- Always validate HMAC signatures
- Use HTTPS for webhook endpoints
- Rotate webhook secrets regularly (quarterly)
- Never log webhook secrets

### 2. Credential Management
- Store all credentials in n8n credential store
- Never commit credentials to version control
- Use environment variables for sensitive data
- Enable credential encryption in n8n

### 3. Access Control
- Limit n8n access to authorized personnel
- Use role-based access control (RBAC)
- Enable audit logging for workflow changes
- Require MFA for n8n admin accounts

### 4. Data Privacy
- Mask sensitive customer data in logs
- Comply with GDPR/CCPA requirements
- Implement data retention policies
- Encrypt data at rest and in transit

## Maintenance

### Regular Tasks
- **Weekly**: Review error logs and execution metrics
- **Monthly**: Update credentials and rotate secrets
- **Quarterly**: Performance audit and optimization
- **Annually**: Security audit and compliance review

### Backup Strategy
1. **Workflow Backup**: Export JSON weekly
2. **Credential Backup**: Document in secure vault
3. **Execution Data**: Retain for 90 days
4. **Version Control**: Track workflow changes in Git

## Extending the Workflow

### Add New Integrations
1. Add new node after existing steps
2. Configure credentials
3. Test thoroughly before activating
4. Document changes in this README

### Custom Routing Rules
Edit the **Route Order** node code block:
```javascript
// Add custom routing logic
if (orderData.custom_condition) {
  routing.queue = 'custom';
  routing.slackChannels.push('#custom-channel');
}
```

### Additional Notifications
1. Duplicate existing Slack node
2. Configure new channel
3. Add condition node to control when it fires
4. Connect to main flow

## Support & Resources

### Documentation
- [n8n Documentation](https://docs.n8n.io)
- [CitadelBuy API Docs](https://api.citadelbuy.com/docs)
- [SendGrid API Reference](https://docs.sendgrid.com/api-reference)
- [Notion API Reference](https://developers.notion.com)
- [Slack API Reference](https://api.slack.com)

### Contact
- **Engineering Team**: engineering@citadelbuy.com
- **DevOps Support**: devops@citadelbuy.com
- **Emergency Hotline**: +1-XXX-XXX-XXXX

## Changelog

### Version 1.0.0 (2024-01-15)
- Initial release
- HMAC signature verification
- Order validation and routing
- Notion, SendGrid, Slack integrations
- Comprehensive error handling
- Audit logging

## License

Copyright (c) 2024 CitadelBuy. All rights reserved.

Internal use only. Do not distribute.
